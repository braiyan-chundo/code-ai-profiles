//! Lector de historias (HU-0025, A-3 y A-4; HU-0031, A-2 y A-5).
//!
//! Al abrir el lector se leen, completos y con tope, los documentos fijos de `hu/<carpeta>` de un
//! proyecto anclado: `hu.md`, `arquitectura.md`, `verificacion.md` y `seguimiento.md` (512 KiB cada uno)
//! y la maqueta `diseno/maqueta.html` (1 MiB), en ese orden. La ruta del proyecto sale del registro
//! (`projects.json`), nunca del frontend; la carpeta de la historia se valida de forma léxica antes de
//! tocar el disco, y todo pasa por el mismo `ReadContext` que la lectura del proyecto (symlinks que
//! salen, lista de exclusión y nube); además, ni la carpeta, ni `diseno/`, ni sus archivos pueden ser un
//! symlink a otra parte del proyecto. No se lista ninguna carpeta, no se escribe nada (tampoco
//! `lastReadAt`), no se ejecuta nada del proyecto y no se usa la red.
//!
//! También valida los enlaces externos que la persona pulsa en el Markdown: solo `http`/`https`
//! completos, y al sistema se le pasa la URL reserializada, nunca el texto tal cual. Y entrega la
//! maqueta al manejador de `.html` del sistema como URL `file://`, tras volver a resolverla con las
//! mismas defensas que la lectura (sin tope de tamaño: abrir las grandes es el objetivo).

use super::*;

/// Tope por `.md` (≤ 2 MiB por llamada con los cuatro).
pub(super) const DOCUMENT_LIMIT: u64 = 512 * KIB;
/// Tope de la maqueta que se pinta en el lector; más grande, solo se abre en el navegador.
pub(super) const MOCKUP_LIMIT: u64 = 1024 * KIB;
const FOLDER_CHARS: usize = 120;
const EXTERNAL_LINK_CHARS: usize = 2_048;

/// La maqueta, por componentes: nunca se une como `diseno/maqueta.html` (Windows separa con `\`).
const MOCKUP_PARTS: [&str; 2] = ["diseno", "maqueta.html"];

/// `(tipo, componentes bajo la carpeta de la historia, tope)`, en el orden de las pestañas.
const DOCUMENTS: [(ProjectDocumentKind, &[&str], u64); 5] = [
    (ProjectDocumentKind::Hu, &["hu.md"], DOCUMENT_LIMIT),
    (
        ProjectDocumentKind::Architecture,
        &["arquitectura.md"],
        DOCUMENT_LIMIT,
    ),
    (
        ProjectDocumentKind::Verification,
        &["verificacion.md"],
        DOCUMENT_LIMIT,
    ),
    (
        ProjectDocumentKind::Timeline,
        &["seguimiento.md"],
        DOCUMENT_LIMIT,
    ),
    (ProjectDocumentKind::Design, &MOCKUP_PARTS, MOCKUP_LIMIT),
];

const INVALID_FOLDER: &str = "La historia no es válida.";
const MISSING_FOLDER: &str = "La historia ya no está en el proyecto. Pulsa «Actualizar».";
const OUTSIDE_HISTORY: &str = "apunta fuera de la carpeta de la historia y no se lee";
const INVALID_LINK: &str =
    "El enlace no se puede abrir: solo se abren direcciones http o https completas.";
const MOCKUP_TOO_LARGE: &str = "maqueta.html pesa más de 1 MiB y no se pinta aquí.";
const MOCKUP_OUTSIDE: &str = "La maqueta apunta fuera de la carpeta de la historia y no se abre.";
const MOCKUP_MISSING: &str = "Esta historia ya no tiene maqueta. Pulsa «Actualizar».";
const MOCKUP_OPEN_FAILED: &str = "No se pudo abrir la maqueta en el navegador.";

/// `folder` llega del frontend: un solo componente `HU-####(-…)`, sin separadores, `..`, `:`,
/// caracteres de control ni `…` (el recorte de `clean_text`), y con tope de largo. No toca el disco.
pub(super) fn validate_folder(folder: &str) -> Result<(), AppError> {
    let valid = method::is_history_folder(folder)
        && folder.chars().count() <= FOLDER_CHARS
        && !folder.contains(['/', '\\', ':', '…'])
        && !folder.contains("..")
        && !folder.chars().any(char::is_control)
        && split_parts(Path::new(folder), false).is_some_and(|parts| parts == [folder]);
    if valid {
        Ok(())
    } else {
        Err(AppError::invalid_input(INVALID_FOLDER))
    }
}

fn open_failure(failure: Failure) -> AppError {
    match failure.status {
        ProjectStatus::Forbidden => AppError::invalid_input(failure.message),
        _ => AppError::local_io(failure.message),
    }
}

fn unreadable(
    kind: ProjectDocumentKind,
    file: &str,
    path: String,
    message: String,
) -> ProjectDocument {
    ProjectDocument {
        kind,
        file: file.to_string(),
        path,
        status: ProjectDocumentStatus::Unreadable,
        content: None,
        message: Some(message),
    }
}

/// La carpeta de la historia `folder` dentro del proyecto abierto: `(base, own_base)`, la ruta relativa
/// (`hu/<carpeta>`) y la ruta propia esperada bajo la raíz. Tiene que ser una carpeta que se resuelva a su
/// propia ruta: un symlink hacia fuera, o hacia otra carpeta del proyecto, no se sigue.
fn history_folder(ctx: &ReadContext<'_>, folder: &str) -> Result<(PathBuf, PathBuf), AppError> {
    let base = Path::new("hu").join(folder);
    let own_base = ctx.root.join(&base);
    match ctx.resolve(&base) {
        Ok((canonical, _)) if canonical != own_base => Err(AppError::local_io(format!(
            "La carpeta de la historia {OUTSIDE_HISTORY}."
        ))),
        Ok((_, metadata)) if metadata.is_dir() => Ok((base, own_base)),
        Ok(_) | Err(Skip::Missing) => Err(AppError::local_io(MISSING_FOLDER)),
        Err(skip) => Err(AppError::local_io(format!(
            "La carpeta de la historia {}.",
            skip.reason()
        ))),
    }
}

/// Une los componentes uno a uno sobre `base` (nunca una cadena con separadores).
fn join_parts(base: &Path, parts: &[&str]) -> PathBuf {
    parts
        .iter()
        .fold(base.to_path_buf(), |path, part| path.join(part))
}

/// Lee los documentos de la historia `folder` del proyecto anclado `id`.
pub(super) fn read_project_history_at(
    app_data: &Path,
    env: &ProjectEnv,
    id: &str,
    folder: &str,
) -> Result<ProjectHistoryDocuments, AppError> {
    validate_folder(folder)?;
    let entry = find_entry(app_data, id).map_err(AppError::from)?;
    let opened = open_root(Path::new(&entry.path), env).map_err(open_failure)?;
    let ctx = &opened.ctx;
    // La carpeta y cada documento deben resolverse a su propia ruta: un symlink que lleva a otra parte
    // del proyecto (por ejemplo `arquitectura.md -> ../../.env`, o `diseno -> ../../docs`) no se sigue.
    let (base, own_base) = history_folder(ctx, folder)?;

    let mut documents = Vec::new();
    for (kind, parts, limit) in DOCUMENTS {
        let Some(&file) = parts.last() else {
            continue;
        };
        let path = format!("hu/{folder}/{}", parts.join("/"));
        let rel = join_parts(&base, parts);
        let own = join_parts(&own_base, parts);
        let escapes = matches!(ctx.resolve(&rel), Ok((canonical, _)) if canonical != own);
        let read = if escapes {
            Err(Skip::Outside)
        } else {
            ctx.read(&rel, ReadMode::Whole(limit))
        };
        let document = match read {
            Ok(text) if text.contains('\0') => unreadable(
                kind,
                file,
                path,
                format!("{file} no es un archivo de texto."),
            ),
            Ok(text) => ProjectDocument {
                kind,
                file: file.to_string(),
                path,
                status: ProjectDocumentStatus::Ok,
                content: Some(text),
                message: None,
            },
            Err(Skip::Missing) => continue,
            Err(Skip::TooLarge) if kind == ProjectDocumentKind::Design => ProjectDocument {
                kind,
                file: file.to_string(),
                path,
                status: ProjectDocumentStatus::TooLarge,
                content: None,
                message: Some(MOCKUP_TOO_LARGE.to_string()),
            },
            Err(Skip::TooLarge) => unreadable(
                kind,
                file,
                path,
                format!(
                    "{file} supera el tamaño máximo que se lee ({} KiB).",
                    DOCUMENT_LIMIT / KIB
                ),
            ),
            Err(Skip::Outside) => {
                unreadable(kind, file, path, format!("{file} {OUTSIDE_HISTORY}."))
            }
            Err(skip) => unreadable(kind, file, path, format!("{file} {}.", skip.reason())),
        };
        documents.push(document);
    }
    Ok(ProjectHistoryDocuments {
        folder: folder.to_string(),
        documents,
        read_at: now_rfc3339(),
    })
}

/// La URL `file://` de `diseno/maqueta.html` de la historia `folder` del proyecto anclado `id`, tras
/// volver a resolverla con las defensas de la lectura: carpeta válida y propia, maqueta que se resuelve
/// a su propia ruta (ningún symlink, ni de `diseno/` ni del archivo), archivo regular y no en la nube.
/// Sin tope de tamaño. Sin efectos: solo consulta metadatos y no abre nada.
pub(super) fn history_mockup_url(
    app_data: &Path,
    env: &ProjectEnv,
    id: &str,
    folder: &str,
) -> Result<reqwest::Url, AppError> {
    validate_folder(folder)?;
    let entry = find_entry(app_data, id).map_err(AppError::from)?;
    let opened = open_root(Path::new(&entry.path), env).map_err(open_failure)?;
    let ctx = &opened.ctx;
    let (base, own_base) = history_folder(ctx, folder)?;
    let own = join_parts(&own_base, &MOCKUP_PARTS);
    let (canonical, metadata) = match ctx.resolve(&join_parts(&base, &MOCKUP_PARTS)) {
        Ok((canonical, _)) if canonical != own => {
            return Err(AppError::local_io(MOCKUP_OUTSIDE));
        }
        Ok(resolved) => resolved,
        Err(Skip::Missing) => return Err(AppError::local_io(MOCKUP_MISSING)),
        Err(Skip::Outside) => return Err(AppError::local_io(MOCKUP_OUTSIDE)),
        Err(skip) => return Err(AppError::local_io(format!("La maqueta {}.", skip.reason()))),
    };
    if !metadata.is_file() {
        return Err(AppError::local_io(format!(
            "La maqueta {}.",
            Skip::NotFile.reason()
        )));
    }
    if (ctx.env.cloud)(&canonical, &metadata) {
        return Err(AppError::local_io(format!(
            "La maqueta {}.",
            Skip::Cloud.reason()
        )));
    }
    let url = reqwest::Url::from_file_path(&canonical)
        .map_err(|()| AppError::internal(MOCKUP_OPEN_FAILED))?;
    if url.scheme() == "file" {
        Ok(url)
    } else {
        Err(AppError::internal(MOCKUP_OPEN_FAILED))
    }
}

/// Un enlace que se puede entregar al navegador del sistema: `http` o `https`, con host, sin usuario
/// ni contraseña, sin caracteres de control y con tope de largo. Puro: no abre nada.
pub(super) fn external_link(raw: &str) -> Result<reqwest::Url, AppError> {
    if raw.is_empty() || raw.len() > EXTERNAL_LINK_CHARS || raw.chars().any(char::is_control) {
        return Err(AppError::invalid_input(INVALID_LINK));
    }
    let url = reqwest::Url::parse(raw).map_err(|_| AppError::invalid_input(INVALID_LINK))?;
    let valid = matches!(url.scheme(), "http" | "https")
        && url.host_str().is_some_and(|host| !host.is_empty())
        && url.username().is_empty()
        && url.password().is_none()
        && url.as_str().len() <= EXTERNAL_LINK_CHARS;
    if valid {
        Ok(url)
    } else {
        Err(AppError::invalid_input(INVALID_LINK))
    }
}

// ── Envoltorios para los comandos (commands.rs) ─────────────────────────────

pub(crate) fn read_project_history_sync(
    app: &AppHandle,
    id: &str,
    folder: &str,
) -> Result<ProjectHistoryDocuments, String> {
    let (app_data, env) = environment(app)?;
    Ok(read_project_history_at(&app_data, &env, id, folder)?)
}

/// Abre en el navegador del sistema un enlace que la persona pulsó. Se valida aquí aunque la interfaz
/// ya lo haya hecho, y al sistema se le pasa `url.as_str()`, que siempre empieza por `http`.
pub(crate) fn open_external_link_sync(raw: &str) -> Result<(), String> {
    let url = external_link(raw)?;
    Ok(open_external_url(url.as_str())?)
}

/// Abre la maqueta de la historia en el manejador de `.html` del sistema (HU-0031, A-5). Nunca recibe una
/// ruta: la vuelve a resolver y validar aquí, y al sistema se le pasa la URL `file://` codificada, un solo
/// argumento y sin shell.
pub(crate) fn open_history_mockup_sync(
    app: &AppHandle,
    id: &str,
    folder: &str,
) -> Result<(), String> {
    let (app_data, env) = environment(app)?;
    let url = history_mockup_url(&app_data, &env, id, folder)?;
    open_external_url(url.as_str()).map_err(|_| MOCKUP_OPEN_FAILED.to_string())
}
