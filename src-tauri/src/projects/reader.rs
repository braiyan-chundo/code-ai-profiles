//! Lector de historias (HU-0025, A-3 y A-4).
//!
//! Al abrir el lector se leen, completos y con tope, los cuatro `.md` fijos de `hu/<carpeta>` de un
//! proyecto anclado: `hu.md`, `arquitectura.md`, `verificacion.md` y `seguimiento.md`, en ese orden.
//! La ruta del proyecto sale del registro (`projects.json`), nunca del frontend; la carpeta de la
//! historia se valida de forma léxica antes de tocar el disco, y todo pasa por el mismo `ReadContext`
//! que la lectura del proyecto (symlinks que salen, lista de exclusión y nube); además, ni la carpeta ni sus `.md`
//! pueden ser un symlink a otra parte del proyecto. No se lista la carpeta,
//! no se escribe nada (tampoco `lastReadAt`), no se ejecuta nada del proyecto y no se usa la red.
//!
//! También valida los enlaces externos que la persona pulsa en el Markdown: solo `http`/`https`
//! completos, y al sistema se le pasa la URL reserializada, nunca el texto tal cual.

use super::*;

/// Tope por archivo (≤ 2 MiB por llamada con los cuatro).
pub(super) const DOCUMENT_LIMIT: u64 = 512 * KIB;
const FOLDER_CHARS: usize = 120;
const EXTERNAL_LINK_CHARS: usize = 2_048;

const DOCUMENTS: [(ProjectDocumentKind, &str); 4] = [
    (ProjectDocumentKind::Hu, "hu.md"),
    (ProjectDocumentKind::Architecture, "arquitectura.md"),
    (ProjectDocumentKind::Verification, "verificacion.md"),
    (ProjectDocumentKind::Timeline, "seguimiento.md"),
];

const INVALID_FOLDER: &str = "La historia no es válida.";
const MISSING_FOLDER: &str = "La historia ya no está en el proyecto. Pulsa «Actualizar».";
const OUTSIDE_HISTORY: &str = "apunta fuera de la carpeta de la historia y no se lee";
const INVALID_LINK: &str =
    "El enlace no se puede abrir: solo se abren direcciones http o https completas.";

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
    let base = Path::new("hu").join(folder);
    // La carpeta y cada `.md` deben resolverse a su propia ruta: un symlink que lleva a otra parte del
    // proyecto (por ejemplo `arquitectura.md -> ../../.env`) tampoco se sigue.
    let own_base = ctx.root.join(&base);
    match ctx.resolve(&base) {
        Ok((canonical, _)) if canonical != own_base => {
            return Err(AppError::local_io(format!(
                "La carpeta de la historia {OUTSIDE_HISTORY}."
            )))
        }
        Ok((_, metadata)) if metadata.is_dir() => {}
        Ok(_) | Err(Skip::Missing) => return Err(AppError::local_io(MISSING_FOLDER)),
        Err(skip) => {
            return Err(AppError::local_io(format!(
                "La carpeta de la historia {}.",
                skip.reason()
            )))
        }
    }

    let mut documents = Vec::new();
    for (kind, file) in DOCUMENTS {
        let path = format!("hu/{folder}/{file}");
        let rel = base.join(file);
        let escapes = matches!(ctx.resolve(&rel), Ok((canonical, _)) if canonical != own_base.join(file));
        let read = if escapes {
            Err(Skip::Outside)
        } else {
            ctx.read(&rel, ReadMode::Whole(DOCUMENT_LIMIT))
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
