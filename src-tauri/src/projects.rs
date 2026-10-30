//! Proyectos anclados con la metodología v4 (HU-0023, ADR-0002).
//!
//! Solo lectura: de la carpeta del proyecto se leen `.metodo/config.json`, el frontmatter de cada
//! `hu/HU-*/hu.md`, `metricas.json`, la fecha de cada fila de `seguimiento.md`, los manifiestos de la
//! raíz de cada repo y, de `.git`, la rama, el SHA y la fecha del reflog. No se escribe nada en la
//! carpeta, no se ejecuta nada de ella (ningún `Command::new` aquí) y no se usa la red. Todo pasa por
//! `ReadContext`, que recorre cada ruta componente a componente sin seguir symlinks que salgan de la
//! carpeta, y exige que quede dentro de ella y fuera de la lista de exclusión (`~/.claude`, `app_data` y el perfil de la original). Lo único que se escribe es
//! `<app_data>/projects.json`, con `write_json_atomic`.

use super::*;
use chrono::{NaiveDate, NaiveDateTime, SecondsFormat};
use std::{collections::VecDeque, io::ErrorKind, path::Component};

mod git;
mod method;
mod tech;

const PROJECTS_FILE: &str = "projects.json";
const PROJECTS_VERSION: u32 = 1;
const MAX_PINNED_PROJECTS: usize = 100;
const MAX_HISTORIES: usize = 2_000;
const MAX_REPOS: usize = 32;

const KIB: u64 = 1_024;
const MIB: u64 = 1_024 * KIB;
const CONFIG_LIMIT: u64 = MIB;
const FRONTMATTER_LIMIT: u64 = 64 * KIB;
const METRICS_LIMIT: u64 = 2 * MIB;
const TIMELINE_TAIL: u64 = MIB;
const MANIFEST_LIMIT: u64 = 512 * KIB;
const JSON_MANIFEST_LIMIT: u64 = MIB;
const GIT_SMALL_LIMIT: u64 = 4 * KIB;
const PACKED_REFS_LIMIT: u64 = 8 * MIB;
const REFLOG_TAIL: u64 = 64 * KIB;

const TITLE_CHARS: usize = 200;
const SUMMARY_CHARS: usize = 1_000;
const TEXT_CHARS: usize = 120;
/// Avisos por proyecto: los primeros y uno final «y N más».
const MAX_WARNINGS: usize = 20;
const MAX_SYMLINK_HOPS: usize = 40;

// ── Contrato IPC (A-3) ──────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum ProjectStatus {
    V4,
    NotV4,
    NoConfig,
    ConfigBroken,
    NotFound,
    NotDirectory,
    PermissionDenied,
    Forbidden,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum ProjectProtectedLocation {
    Desktop,
    Documents,
    Downloads,
    Icloud,
    External,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum ProjectHistoryState {
    Waiting,
    InProgress,
    Done,
    Discarded,
    Unknown,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum ProjectRepoStatus {
    Ok,
    Missing,
    Outside,
    Forbidden,
    Unreadable,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum ProjectGitStatus {
    Ok,
    #[serde(rename = "none")]
    NoRepository,
    Unsupported,
    Unreadable,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum ProjectWarningScope {
    Config,
    History,
    Metrics,
    Timeline,
    Repo,
    Manifest,
    Git,
    Limit,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum ProjectTechnologySource {
    Pack,
    PackageManager,
    Manifest,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TokenBreakdown {
    pub(crate) input: u64,
    pub(crate) output: u64,
    pub(crate) cache_write: u64,
    pub(crate) cache_read: u64,
    pub(crate) total: u64,
}

impl TokenBreakdown {
    fn add(&mut self, other: &TokenBreakdown) {
        self.input = self.input.saturating_add(other.input);
        self.output = self.output.saturating_add(other.output);
        self.cache_write = self.cache_write.saturating_add(other.cache_write);
        self.cache_read = self.cache_read.saturating_add(other.cache_read);
        self.total = self.total.saturating_add(other.total);
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProjectWarning {
    pub(crate) scope: ProjectWarningScope,
    pub(crate) target: Option<String>,
    pub(crate) message: String,
}

impl ProjectWarning {
    fn new(scope: ProjectWarningScope, target: Option<&str>, message: impl Into<String>) -> Self {
        Self {
            scope,
            target: target.map(|target| clean_text(target, TEXT_CHARS)),
            message: message.into(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProjectCandidate {
    pub(crate) path: String,
    pub(crate) display_path: String,
    pub(crate) status: ProjectStatus,
    pub(crate) message: Option<String>,
    pub(crate) config_version: Option<i64>,
    pub(crate) name: Option<String>,
    pub(crate) profile: Option<String>,
    pub(crate) phase: Option<String>,
    pub(crate) history_count: Option<usize>,
    pub(crate) repo_count: Option<usize>,
    pub(crate) already_pinned_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProjectGit {
    pub(crate) status: ProjectGitStatus,
    pub(crate) branch: Option<String>,
    pub(crate) detached: bool,
    pub(crate) short_sha: Option<String>,
    pub(crate) moved_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProjectRepo {
    pub(crate) name: String,
    pub(crate) path: String,
    pub(crate) kind: Option<String>,
    pub(crate) status: ProjectRepoStatus,
    pub(crate) manifests: Vec<String>,
    pub(crate) git: Option<ProjectGit>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProjectTechnology {
    pub(crate) name: String,
    pub(crate) version: Option<String>,
    pub(crate) source: ProjectTechnologySource,
    pub(crate) repo: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProjectHistory {
    pub(crate) id: String,
    pub(crate) folder: String,
    pub(crate) title: String,
    pub(crate) state: ProjectHistoryState,
    pub(crate) phase: Option<String>,
    pub(crate) area: Option<String>,
    pub(crate) priority: Option<String>,
    pub(crate) created: Option<String>,
    pub(crate) minutes: Option<u64>,
    pub(crate) tokens: Option<TokenBreakdown>,
    pub(crate) counts_in_totals: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProjectRoleUsage {
    pub(crate) role: String,
    pub(crate) tokens: TokenBreakdown,
    pub(crate) approximate: bool,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProjectCounts {
    pub(crate) total: usize,
    pub(crate) waiting: usize,
    pub(crate) in_progress: usize,
    pub(crate) done: usize,
    pub(crate) discarded: usize,
    pub(crate) unknown: usize,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProjectTotals {
    pub(crate) histories: usize,
    pub(crate) minutes: u64,
    pub(crate) tokens: TokenBreakdown,
    pub(crate) by_role: Vec<ProjectRoleUsage>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProjectInfo {
    pub(crate) name: String,
    pub(crate) slug: Option<String>,
    pub(crate) summary: Option<String>,
    pub(crate) profile: Option<String>,
    pub(crate) phase: Option<String>,
    pub(crate) approver: Option<String>,
    pub(crate) package_manager: Option<String>,
    pub(crate) packs: Vec<String>,
    pub(crate) repos: Vec<ProjectRepo>,
    pub(crate) technologies: Vec<ProjectTechnology>,
    pub(crate) histories: Vec<ProjectHistory>,
    pub(crate) counts: ProjectCounts,
    pub(crate) first_created: Option<String>,
    pub(crate) last_activity: Option<String>,
    pub(crate) span_days: Option<i64>,
    pub(crate) totals: ProjectTotals,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProjectSummary {
    pub(crate) id: String,
    pub(crate) path: String,
    pub(crate) display_path: String,
    pub(crate) last_name: Option<String>,
    pub(crate) pinned_at: String,
    pub(crate) last_read_at: Option<String>,
    pub(crate) read_at: String,
    pub(crate) status: ProjectStatus,
    pub(crate) message: Option<String>,
    pub(crate) protected_location: Option<ProjectProtectedLocation>,
    pub(crate) info: Option<ProjectInfo>,
    pub(crate) warnings: Vec<ProjectWarning>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProjectsState {
    pub(crate) projects: Vec<ProjectSummary>,
    pub(crate) read_at: String,
}

// ── Registro de anclados (A-2) ──────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PinnedProject {
    id: String,
    path: String,
    last_name: Option<String>,
    pinned_at: String,
    last_read_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProjectsFile {
    version: u32,
    projects: Vec<PinnedProject>,
}

impl Default for ProjectsFile {
    fn default() -> Self {
        Self {
            version: PROJECTS_VERSION,
            projects: Vec::new(),
        }
    }
}

const DAMAGED_REGISTRY: &str = "El registro de proyectos está dañado y no se ha modificado. Revisa projects.json en los datos de Code AI Profiles o renómbralo para empezar de cero.";

fn projects_mutex() -> &'static Mutex<()> {
    static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
    LOCK.get_or_init(|| Mutex::new(()))
}

fn with_projects_lock<T>(operation: impl FnOnce() -> Result<T, String>) -> Result<T, String> {
    let _guard = projects_mutex()
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    operation()
}

fn load_projects(app_data: &Path) -> Result<ProjectsFile, String> {
    let path = app_data.join(PROJECTS_FILE);
    let bytes = match fs::read(&path) {
        Ok(bytes) => bytes,
        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(ProjectsFile::default()),
        Err(error) => return Err(format!("No se pudo leer el registro de proyectos: {error}")),
    };
    let file: ProjectsFile =
        serde_json::from_slice(&bytes).map_err(|_| DAMAGED_REGISTRY.to_string())?;
    if file.version != PROJECTS_VERSION
        || file
            .projects
            .iter()
            .any(|project| Uuid::parse_str(&project.id).is_err() || project.path.is_empty())
    {
        return Err(DAMAGED_REGISTRY.to_string());
    }
    Ok(file)
}

fn save_projects(app_data: &Path, file: &ProjectsFile) -> Result<(), String> {
    let bytes = serde_json::to_vec_pretty(file)
        .map_err(|error| format!("No se pudo preparar el registro de proyectos: {error}"))?;
    write_json_atomic(&app_data.join(PROJECTS_FILE), &bytes)
}

/// Delega en `write_file_atomic`: si algo falla, el archivo anterior queda intacto.
fn write_json_atomic(destination: &Path, contents: &[u8]) -> Result<(), String> {
    let parent = destination
        .parent()
        .ok_or_else(|| "No se pudo resolver la carpeta del registro de proyectos.".to_string())?;
    fs::create_dir_all(parent)
        .map_err(|error| format!("No se pudo crear la carpeta de datos: {error}"))?;
    write_file_atomic(destination, contents, ".projects")
        .map_err(|error| format!("No se pudo guardar el registro de proyectos: {error}"))
}

// ── Entorno de lectura ──────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy)]
pub(crate) struct Limits {
    pub(crate) max_histories: usize,
    pub(crate) max_repos: usize,
}

impl Default for Limits {
    fn default() -> Self {
        Self {
            max_histories: MAX_HISTORIES,
            max_repos: MAX_REPOS,
        }
    }
}

/// Lo que no depende del proyecto: `home` (para `~` y `protectedLocation`), la lista de exclusión y
/// los límites. Inyectable en pruebas.
pub(crate) struct ProjectEnv {
    home: Option<PathBuf>,
    deny: Vec<PathBuf>,
    limits: Limits,
    /// Detecta archivos y carpetas que solo están en la nube. Inyectable en pruebas.
    cloud: fn(&Path, &fs::Metadata) -> bool,
}

impl ProjectEnv {
    fn new(home: Option<PathBuf>, deny: Vec<PathBuf>, limits: Limits) -> Self {
        let mut normalized = Vec::new();
        for path in deny {
            normalized.push(comparable(&path));
            if let Ok(canonical) = fs::canonicalize(&path) {
                normalized.push(comparable(&canonical));
            }
        }
        Self {
            home,
            deny: normalized,
            limits,
            cloud: |_, metadata| is_cloud_placeholder(metadata),
        }
    }

    fn is_denied(&self, path: &Path) -> bool {
        let path = comparable(path);
        self.deny.iter().any(|denied| is_within(&path, denied))
    }
}

/// `deny` = `<home>/.claude`, `app_data_dir` (perfiles y copias administradas) y el perfil de la
/// aplicación original. Solo se calculan sus rutas: no se listan ni se leen.
fn environment(app: &AppHandle) -> Result<(PathBuf, ProjectEnv), String> {
    let paths = ManagedPaths::resolve(app)?;
    let home = dirs::home_dir();
    let mut deny = vec![paths.app_data.clone()];
    if let Some(home) = &home {
        deny.push(home.join(".claude"));
    }
    if let Some(profile) = detect_original_profile() {
        deny.push(profile);
    }
    let env = ProjectEnv::new(home, deny, Limits::default());
    Ok((paths.app_data, env))
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum Skip {
    Missing,
    Outside,
    Forbidden,
    NotFile,
    Cloud,
    TooLarge,
    Denied,
    Unreadable,
}

impl Skip {
    fn reason(self) -> &'static str {
        match self {
            Skip::Missing => "no existe",
            Skip::Outside => "apunta fuera de la carpeta del proyecto y no se lee",
            Skip::Forbidden => "está en datos protegidos (perfiles o Code AI Profiles) y no se lee",
            Skip::NotFile => "no es un archivo",
            Skip::Cloud => "está en la nube sin descargar y no se lee para no descargarlo",
            Skip::TooLarge => "supera el tamaño máximo que se lee",
            Skip::Denied => "el sistema no deja leerlo",
            Skip::Unreadable => "no se pudo leer",
        }
    }
}

fn io_skip(error: &std::io::Error) -> Skip {
    if error.kind() == ErrorKind::NotFound {
        return Skip::Missing;
    }
    #[cfg(unix)]
    if error.raw_os_error() == Some(libc::ENOTDIR) {
        return Skip::Missing;
    }
    if error.kind() == ErrorKind::PermissionDenied {
        return Skip::Denied;
    }
    Skip::Unreadable
}

#[derive(Debug, Clone, Copy)]
pub(crate) enum ReadMode {
    /// Todo el archivo, si no supera el límite.
    Whole(u64),
    /// Los primeros bytes, hasta el límite.
    Head(u64),
    /// Los últimos bytes, hasta el límite.
    Tail(u64),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum EntryKind {
    File,
    Directory,
    Other,
}

/// Toda lectura de la carpeta de un proyecto pasa por aquí.
pub(crate) struct ReadContext<'a> {
    root: PathBuf,
    env: &'a ProjectEnv,
}

impl<'a> ReadContext<'a> {
    /// Recorre `rel` desde la raíz componente a componente con `symlink_metadata`. Un symlink se
    /// resuelve con `read_link` y su destino se comprueba de forma léxica **antes** de tocarlo: si sale
    /// de la carpeta o cae en `deny`, no se sigue (ni siquiera un `stat` del destino). Devuelve una
    /// ruta dentro de la raíz sin symlinks y sus metadatos.
    fn resolve(&self, rel: &Path) -> Result<(PathBuf, fs::Metadata), Skip> {
        let root = &self.root;
        let mut pending: VecDeque<String> = split_parts(rel, false).ok_or(Skip::Outside)?.into();
        let mut current = root.clone();
        let mut hops = 0;
        while let Some(part) = pending.pop_front() {
            if part == ".." {
                // `current` no contiene symlinks, así que subir de forma léxica es correcto.
                if current == *root {
                    return Err(Skip::Outside);
                }
                current.pop();
                continue;
            }
            let next = current.join(&part);
            if self.env.is_denied(&next) {
                return Err(Skip::Forbidden);
            }
            let metadata = fs::symlink_metadata(&next).map_err(|error| io_skip(&error))?;
            if !metadata.file_type().is_symlink() {
                current = next;
                continue;
            }
            hops += 1;
            if hops > MAX_SYMLINK_HOPS {
                return Err(Skip::Unreadable);
            }
            let target = fs::read_link(&next).map_err(|error| io_skip(&error))?;
            let mut parts: VecDeque<String> = if target.is_absolute() || target.has_root() {
                let target = lexical_normalize(&comparable(&target));
                if self.env.is_denied(&target) {
                    return Err(Skip::Forbidden);
                }
                if !is_within(&target, &comparable(root)) {
                    return Err(Skip::Outside);
                }
                current = root.clone();
                split_parts(&relative_to(&target, &comparable(root)), false)
                    .ok_or(Skip::Unreadable)?
                    .into()
            } else {
                split_parts(&target, true).ok_or(Skip::Outside)?.into()
            };
            parts.extend(pending.drain(..));
            pending = parts;
        }
        let metadata = fs::metadata(&current).map_err(|error| io_skip(&error))?;
        Ok((current, metadata))
    }

    pub(crate) fn entry(&self, rel: &Path) -> Result<EntryKind, Skip> {
        let (_, metadata) = self.resolve(rel)?;
        Ok(if metadata.is_dir() {
            EntryKind::Directory
        } else if metadata.is_file() {
            EntryKind::File
        } else {
            EntryKind::Other
        })
    }

    pub(crate) fn list_dir(&self, rel: &Path) -> Result<Vec<String>, Skip> {
        let (canonical, metadata) = self.resolve(rel)?;
        if !metadata.is_dir() {
            return Err(Skip::NotFile);
        }
        // Listar una carpeta que solo está en la nube obliga al sistema a descargar su contenido.
        if (self.env.cloud)(&canonical, &metadata) {
            return Err(Skip::Cloud);
        }
        let entries = fs::read_dir(&canonical).map_err(|error| io_skip(&error))?;
        Ok(entries
            .filter_map(Result::ok)
            .filter_map(|entry| entry.file_name().to_str().map(str::to_string))
            .collect())
    }

    /// Lee un archivo regular con tope: UTF-8 con pérdida, sin BOM y con `\n`.
    pub(crate) fn read(&self, rel: &Path, mode: ReadMode) -> Result<String, Skip> {
        let (canonical, metadata) = self.resolve(rel)?;
        if !metadata.is_file() {
            return Err(Skip::NotFile);
        }
        if (self.env.cloud)(&canonical, &metadata) {
            return Err(Skip::Cloud);
        }
        let size = metadata.len();
        let mut file = File::open(&canonical).map_err(|error| io_skip(&error))?;
        let mut bytes = Vec::new();
        match mode {
            ReadMode::Whole(limit) => {
                if size > limit {
                    return Err(Skip::TooLarge);
                }
                file.take(limit + 1)
                    .read_to_end(&mut bytes)
                    .map_err(|error| io_skip(&error))?;
                if bytes.len() as u64 > limit {
                    return Err(Skip::TooLarge);
                }
            }
            ReadMode::Head(limit) => {
                file.take(limit)
                    .read_to_end(&mut bytes)
                    .map_err(|error| io_skip(&error))?;
            }
            ReadMode::Tail(limit) => {
                if size > limit {
                    file.seek(SeekFrom::Start(size - limit))
                        .map_err(|error| io_skip(&error))?;
                }
                file.take(limit)
                    .read_to_end(&mut bytes)
                    .map_err(|error| io_skip(&error))?;
            }
        }
        Ok(normalize_text(&bytes))
    }
}

/// iCloud (*dataless*) y OneDrive (*recall on access*): leerlos haría que el sistema los descargue.
fn is_cloud_placeholder(metadata: &fs::Metadata) -> bool {
    #[cfg(target_os = "macos")]
    {
        use std::os::macos::fs::MetadataExt;
        const SF_DATALESS: u32 = 0x4000_0000;
        metadata.st_flags() & SF_DATALESS != 0
    }
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::fs::MetadataExt;
        const FILE_ATTRIBUTE_OFFLINE: u32 = 0x0000_1000;
        const FILE_ATTRIBUTE_RECALL_ON_OPEN: u32 = 0x0004_0000;
        const FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS: u32 = 0x0040_0000;
        metadata.file_attributes()
            & (FILE_ATTRIBUTE_OFFLINE
                | FILE_ATTRIBUTE_RECALL_ON_OPEN
                | FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS)
            != 0
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let _ = metadata;
        false
    }
}

fn normalize_text(bytes: &[u8]) -> String {
    let text = String::from_utf8_lossy(bytes);
    let text = text.strip_prefix('\u{feff}').unwrap_or(&text);
    text.replace("\r\n", "\n")
}

/// Texto que llega a la UI: sin caracteres de control, recortado y con tope de caracteres.
pub(crate) fn clean_text(value: &str, max_chars: usize) -> String {
    let cleaned: String = value
        .chars()
        .map(|character| {
            if character.is_control() {
                ' '
            } else {
                character
            }
        })
        .collect();
    let trimmed = cleaned.trim();
    if trimmed.chars().count() <= max_chars {
        return trimmed.to_string();
    }
    let mut cut: String = trimmed.chars().take(max_chars.saturating_sub(1)).collect();
    cut.push('…');
    cut
}

// ── Rutas ───────────────────────────────────────────────────────────────────

/// Quita el prefijo `\\?\` (y `\\?\UNC\`) que añade `canonicalize` en Windows.
pub(crate) fn strip_verbatim(path: &str) -> String {
    if let Some(rest) = path.strip_prefix(r"\\?\UNC\") {
        return format!(r"\\{rest}");
    }
    path.strip_prefix(r"\\?\").unwrap_or(path).to_string()
}

/// En Windows quita `\\?\` para comparar y para que `/` vuelva a ser separador; en el resto, igual.
fn comparable(path: &Path) -> PathBuf {
    if cfg!(target_os = "windows") {
        PathBuf::from(strip_verbatim(&path.to_string_lossy()))
    } else {
        path.to_path_buf()
    }
}

/// Los componentes de una ruta relativa, partidos por `/` y `\`, sin `.`. `None` si es absoluta, si
/// tiene `..` y no se permite, o si en Windows un componente lleva `:` (`C:x`).
fn split_parts(rel: &Path, allow_parent: bool) -> Option<Vec<String>> {
    if rel.has_root() || rel.is_absolute() {
        return None;
    }
    let mut parts = Vec::new();
    for part in rel.to_str()?.split(['/', '\\']) {
        match part {
            "" | "." => {}
            ".." if !allow_parent => return None,
            part if cfg!(target_os = "windows") && part.contains(':') => return None,
            part => parts.push(part.to_string()),
        }
    }
    Some(parts)
}

fn component_eq(left: Component<'_>, right: Component<'_>) -> bool {
    if cfg!(any(target_os = "macos", target_os = "windows")) {
        left.as_os_str().to_string_lossy().to_lowercase()
            == right.as_os_str().to_string_lossy().to_lowercase()
    } else {
        left == right
    }
}

/// `path` está en `root` o debajo (por componentes; sin distinguir mayúsculas en macOS y Windows).
fn is_within(path: &Path, root: &Path) -> bool {
    let mut components = path.components();
    root.components().all(|expected| {
        components
            .next()
            .is_some_and(|component| component_eq(component, expected))
    })
}

/// Normaliza `.` y `..` sin tocar el disco.
fn lexical_normalize(path: &Path) -> PathBuf {
    let mut normalized = PathBuf::new();
    for component in path.components() {
        match component {
            Component::CurDir => {}
            Component::ParentDir => {
                normalized.pop();
            }
            other => normalized.push(other.as_os_str()),
        }
    }
    normalized
}

fn relative_to(path: &Path, root: &Path) -> PathBuf {
    path.components().skip(root.components().count()).collect()
}

/// Clave para reconocer la misma carpeta (sin distinguir mayúsculas en macOS y Windows).
fn path_key(path: &str) -> String {
    if cfg!(any(target_os = "macos", target_os = "windows")) {
        path.to_lowercase()
    } else {
        path.to_string()
    }
}

pub(crate) fn display_path(path: &str, home: Option<&Path>) -> String {
    let Some(home) = home else {
        return path.to_string();
    };
    let home = comparable(home);
    let target = PathBuf::from(path);
    if !is_within(&target, &home) {
        return path.to_string();
    }
    let rest = relative_to(&target, &home);
    if rest.as_os_str().is_empty() {
        "~".to_string()
    } else {
        format!("~{}{}", std::path::MAIN_SEPARATOR, rest.to_string_lossy())
    }
}

/// Carpetas que en macOS piden permiso (TCC). Se calcula por prefijo, sin listar nada.
pub(crate) fn protected_location_for(
    path: &Path,
    home: Option<&Path>,
) -> Option<ProjectProtectedLocation> {
    if let Some(home) = home {
        let home = comparable(home);
        let checks = [
            ("Desktop", ProjectProtectedLocation::Desktop),
            ("Documents", ProjectProtectedLocation::Documents),
            ("Downloads", ProjectProtectedLocation::Downloads),
            ("Library/Mobile Documents", ProjectProtectedLocation::Icloud),
        ];
        for (folder, location) in checks {
            if is_within(path, &home.join(folder)) {
                return Some(location);
            }
        }
    }
    let volumes = Path::new("/Volumes");
    if is_within(path, volumes) && path.components().count() > volumes.components().count() {
        return Some(ProjectProtectedLocation::External);
    }
    None
}

fn protected_location(path: &Path, home: Option<&Path>) -> Option<ProjectProtectedLocation> {
    if cfg!(target_os = "macos") {
        protected_location_for(path, home)
    } else {
        None
    }
}

fn now_rfc3339() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true)
}

// ── Apertura de la carpeta y de la config ───────────────────────────────────

struct Opened<'a> {
    ctx: ReadContext<'a>,
    folder_name: String,
}

struct Failure {
    status: ProjectStatus,
    message: String,
}

impl Failure {
    fn new(status: ProjectStatus, message: impl Into<String>) -> Self {
        Self {
            status,
            message: message.into(),
        }
    }
}

fn permission_message() -> String {
    if cfg!(target_os = "macos") {
        "macOS no deja leer esta carpeta. Permite el acceso en Configuración › Permisos (Archivos y carpetas) y pulsa «Reintentar».".to_string()
    } else {
        "El sistema no deja leer esta carpeta. Revisa los permisos de la carpeta y de sus archivos y pulsa «Reintentar».".to_string()
    }
}

const NOT_FOUND_MESSAGE: &str = "No se encontró la carpeta. Puede que se haya movido, renombrado o borrado. Desánclala o vuelve a anclarla desde su nueva ubicación.";
const FORBIDDEN_MESSAGE: &str = "Esta carpeta está dentro de los datos de un perfil, de ~/.claude o de Code AI Profiles, y no se lee para proteger tu privacidad.";

fn open_root<'a>(path: &Path, env: &'a ProjectEnv) -> Result<Opened<'a>, Failure> {
    if !path.is_absolute() {
        return Err(Failure::new(ProjectStatus::NotFound, NOT_FOUND_MESSAGE));
    }
    if env.is_denied(&lexical_normalize(path)) {
        return Err(Failure::new(ProjectStatus::Forbidden, FORBIDDEN_MESSAGE));
    }
    let metadata = fs::metadata(path).map_err(|error| match error.kind() {
        ErrorKind::PermissionDenied => {
            Failure::new(ProjectStatus::PermissionDenied, permission_message())
        }
        _ => Failure::new(ProjectStatus::NotFound, NOT_FOUND_MESSAGE),
    })?;
    if !metadata.is_dir() {
        return Err(Failure::new(
            ProjectStatus::NotDirectory,
            "La ruta ya no es una carpeta. Desánclala o vuelve a anclar la carpeta del proyecto.",
        ));
    }
    let root = fs::canonicalize(path)
        .map(|root| comparable(&root))
        .map_err(|error| match error.kind() {
            ErrorKind::PermissionDenied => {
                Failure::new(ProjectStatus::PermissionDenied, permission_message())
            }
            _ => Failure::new(ProjectStatus::NotFound, NOT_FOUND_MESSAGE),
        })?;
    if env.is_denied(&root) {
        return Err(Failure::new(ProjectStatus::Forbidden, FORBIDDEN_MESSAGE));
    }
    let folder_name = root
        .file_name()
        .map(|name| clean_text(&name.to_string_lossy(), TEXT_CHARS))
        .unwrap_or_else(|| clean_text(&root.to_string_lossy(), TEXT_CHARS));
    Ok(Opened {
        ctx: ReadContext { root, env },
        folder_name,
    })
}

const CONFIG_PATH: &str = ".metodo/config.json";

/// Lee y valida `.metodo/config.json`. `Ok` solo si es v4.
fn read_config(ctx: &ReadContext<'_>) -> Result<Value, (Failure, Option<i64>)> {
    let text = ctx
        .read(Path::new(CONFIG_PATH), ReadMode::Whole(CONFIG_LIMIT))
        .map_err(|skip| {
            let failure = match skip {
                Skip::Missing => Failure::new(
                    ProjectStatus::NoConfig,
                    "No es un proyecto v4: falta .metodo/config.json en la carpeta.",
                ),
                Skip::Denied => Failure::new(ProjectStatus::PermissionDenied, permission_message()),
                Skip::Forbidden => Failure::new(ProjectStatus::Forbidden, FORBIDDEN_MESSAGE),
                other => Failure::new(
                    ProjectStatus::ConfigBroken,
                    format!(
                        "La configuración del método (.metodo/config.json) {}. Corrígela y pulsa «Reintentar».",
                        other.reason()
                    ),
                ),
            };
            (failure, None)
        })?;
    let value: Value = serde_json::from_str(&text).map_err(|error| {
        (
            Failure::new(
                ProjectStatus::ConfigBroken,
                format!(
                    "La configuración del método (.metodo/config.json) no es JSON válido (línea {}, columna {}). Corrígela y pulsa «Reintentar».",
                    error.line(),
                    error.column()
                ),
            ),
            None,
        )
    })?;
    let version = value.get("version").and_then(numeric_version);
    match version {
        Some(4) => Ok(value),
        Some(other) => Err((
            Failure::new(
                ProjectStatus::NotV4,
                format!(
                    "La carpeta usa la metodología versión {other}. Solo se pueden anclar proyectos con la versión 4."
                ),
            ),
            Some(other),
        )),
        None => Err((
            Failure::new(
                ProjectStatus::NotV4,
                "La configuración del método no indica la versión 4 (campo «version»). Solo se pueden anclar proyectos con la metodología v4.",
            ),
            None,
        )),
    }
}

fn numeric_version(value: &Value) -> Option<i64> {
    if let Some(number) = value.as_i64() {
        return Some(number);
    }
    value
        .as_f64()
        .filter(|number| number.fract() == 0.0 && number.abs() < 1e12)
        .map(|number| number as i64)
}

// ── Lectura completa ────────────────────────────────────────────────────────

struct ReadOutcome {
    canonical: Option<PathBuf>,
    status: ProjectStatus,
    message: Option<String>,
    info: Option<ProjectInfo>,
    warnings: Vec<ProjectWarning>,
}

fn read_project_folder(path: &Path, env: &ProjectEnv) -> ReadOutcome {
    let opened = match open_root(path, env) {
        Ok(opened) => opened,
        Err(failure) => {
            return ReadOutcome {
                canonical: None,
                status: failure.status,
                message: Some(failure.message),
                info: None,
                warnings: Vec::new(),
            }
        }
    };
    let canonical = Some(opened.ctx.root.clone());
    let config = match read_config(&opened.ctx) {
        Ok(config) => config,
        Err((failure, _)) => {
            return ReadOutcome {
                canonical,
                status: failure.status,
                message: Some(failure.message),
                info: None,
                warnings: Vec::new(),
            }
        }
    };
    let mut warnings = Vec::new();
    let info = build_info(&opened.ctx, &config, &opened.folder_name, &mut warnings);
    cap_warnings(&mut warnings);
    ReadOutcome {
        canonical,
        status: ProjectStatus::V4,
        message: None,
        info: Some(info),
        warnings,
    }
}

/// Deja los primeros avisos y uno final «y N más», para que un proyecto muy roto no llene la página.
fn cap_warnings(warnings: &mut Vec<ProjectWarning>) {
    if warnings.len() <= MAX_WARNINGS {
        return;
    }
    let hidden = warnings.len() - (MAX_WARNINGS - 1);
    warnings.truncate(MAX_WARNINGS - 1);
    warnings.push(ProjectWarning::new(
        ProjectWarningScope::Limit,
        None,
        format!("Y {hidden} avisos más que no se muestran."),
    ));
}

fn build_info(
    ctx: &ReadContext<'_>,
    config: &Value,
    folder_name: &str,
    warnings: &mut Vec<ProjectWarning>,
) -> ProjectInfo {
    let limits = ctx.env.limits;
    let fields = method::config_fields(config, folder_name, limits.max_repos, warnings);
    let histories = method::read_histories(ctx, limits.max_histories, warnings);
    let summary = method::summarize(&histories);

    let mut repos = Vec::new();
    let mut repo_technologies = Vec::new();
    let mut package_manager_field: Option<String> = None;
    for entry in &fields.repos {
        let (status, rel) = resolve_repo(ctx, entry, warnings);
        let mut repo = ProjectRepo {
            name: entry.name.clone(),
            path: entry
                .path
                .as_deref()
                .map(|path| clean_text(path, TEXT_CHARS))
                .unwrap_or_default(),
            kind: entry.kind.clone(),
            status,
            manifests: Vec::new(),
            git: None,
        };
        if let Some(rel) = rel {
            let found = tech::read_repo(ctx, &rel, &entry.name, warnings);
            repo.manifests = found.manifests;
            repo_technologies.extend(found.technologies);
            if package_manager_field.is_none() {
                package_manager_field = found.package_manager;
            }
            repo.git = Some(git::read_git(ctx, &rel, &entry.name, warnings));
        }
        repos.push(repo);
    }

    let mut technologies = Vec::new();
    if let Some(manager) = tech::package_manager(
        fields.package_manager.as_deref(),
        package_manager_field.as_deref(),
    ) {
        technologies.push(manager);
    }
    for pack in &fields.packs {
        technologies.push(ProjectTechnology {
            name: pack.clone(),
            version: None,
            source: ProjectTechnologySource::Pack,
            repo: None,
        });
    }
    for technology in repo_technologies {
        if !technologies
            .iter()
            .any(|known| known.name == technology.name && known.repo == technology.repo)
        {
            technologies.push(technology);
        }
    }

    ProjectInfo {
        name: fields.name,
        slug: fields.slug,
        summary: fields.summary,
        profile: fields.profile,
        phase: fields.phase,
        approver: fields.approver,
        package_manager: fields.package_manager,
        packs: fields.packs,
        repos,
        technologies,
        histories: histories.into_iter().map(|read| read.history).collect(),
        counts: summary.counts,
        first_created: summary.first_created,
        last_activity: summary.last_activity,
        span_days: summary.span_days,
        totals: summary.totals,
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) enum RepoPath {
    Forbidden,
    Outside,
    /// Ruta relativa a la raíz, ya normalizada (sin `.` ni `..`).
    Inside(PathBuf),
}

/// Decide, **sin tocar el disco**, dónde cae la `ruta` de un repo. Una ruta absoluta, con raíz, UNC
/// (`\\host\share`), relativa a unidad (`C:x`) o que sube por encima de la carpeta queda fuera: así
/// nunca se abre una ruta de red (SMB), se monta un volumen ni se pide permiso por una carpeta que la
/// persona no eligió. La exclusión se mira antes, también de forma léxica.
pub(crate) fn lexical_repo_path(
    root: &Path,
    raw: &str,
    env: &ProjectEnv,
    windows: bool,
) -> RepoPath {
    let path = Path::new(raw);
    let rooted = path.is_absolute()
        || path.has_root()
        || raw.starts_with('/')
        || (windows && (raw.starts_with('\\') || raw.contains(':')));
    if rooted {
        return if env.is_denied(&lexical_normalize(path)) {
            RepoPath::Forbidden
        } else {
            RepoPath::Outside
        };
    }
    let mut joined = root.to_path_buf();
    for part in raw.split(['/', '\\']) {
        match part {
            "" | "." => {}
            ".." => {
                joined.pop();
            }
            part => joined.push(part),
        }
    }
    if env.is_denied(&joined) {
        return RepoPath::Forbidden;
    }
    let root = comparable(root);
    let joined = comparable(&joined);
    if !is_within(&joined, &root) {
        return RepoPath::Outside;
    }
    RepoPath::Inside(relative_to(&joined, &root))
}

/// Un repo se lee solo si su ruta queda dentro de la carpeta y fuera de `deny`. Lo que queda fuera
/// se decide de forma léxica; lo de dentro se recorre con `ReadContext`, sin seguir symlinks que
/// salgan.
fn resolve_repo(
    ctx: &ReadContext<'_>,
    entry: &method::RepoEntry,
    warnings: &mut Vec<ProjectWarning>,
) -> (ProjectRepoStatus, Option<PathBuf>) {
    let Some(raw) = entry.path.as_deref() else {
        warnings.push(ProjectWarning::new(
            ProjectWarningScope::Repo,
            Some(&entry.name),
            "El repo no tiene «ruta» en la configuración; no se lee.",
        ));
        return (ProjectRepoStatus::Unreadable, None);
    };
    let rel = match lexical_repo_path(&ctx.root, raw, ctx.env, cfg!(target_os = "windows")) {
        RepoPath::Forbidden => return (ProjectRepoStatus::Forbidden, None),
        RepoPath::Outside => return (ProjectRepoStatus::Outside, None),
        RepoPath::Inside(rel) => rel,
    };
    let (resolved, metadata) = match ctx.resolve(&rel) {
        Ok(resolved) => resolved,
        Err(Skip::Missing) => return (ProjectRepoStatus::Missing, None),
        Err(Skip::Outside) => return (ProjectRepoStatus::Outside, None),
        Err(Skip::Forbidden) => return (ProjectRepoStatus::Forbidden, None),
        Err(_) => {
            warnings.push(ProjectWarning::new(
                ProjectWarningScope::Repo,
                Some(&entry.name),
                "No se pudo acceder a la carpeta del repo.",
            ));
            return (ProjectRepoStatus::Unreadable, None);
        }
    };
    if !metadata.is_dir() {
        warnings.push(ProjectWarning::new(
            ProjectWarningScope::Repo,
            Some(&entry.name),
            "La ruta del repo no es una carpeta.",
        ));
        return (ProjectRepoStatus::Unreadable, None);
    }
    (
        ProjectRepoStatus::Ok,
        Some(relative_to(&comparable(&resolved), &comparable(&ctx.root))),
    )
}

// ── Operaciones (A-3) ───────────────────────────────────────────────────────

fn summary_for(
    entry: &PinnedProject,
    outcome: ReadOutcome,
    env: &ProjectEnv,
    read_at: &str,
) -> ProjectSummary {
    let path = PathBuf::from(&entry.path);
    ProjectSummary {
        id: entry.id.clone(),
        path: entry.path.clone(),
        display_path: display_path(&entry.path, env.home.as_deref()),
        last_name: entry.last_name.clone(),
        pinned_at: entry.pinned_at.clone(),
        last_read_at: entry.last_read_at.clone(),
        read_at: read_at.to_string(),
        status: outcome.status,
        message: outcome.message,
        protected_location: protected_location(&path, env.home.as_deref()),
        info: outcome.info,
        warnings: outcome.warnings,
    }
}

/// Lee los anclados fuera del mutex y, dentro, relee el registro, aplica `lastName`/`lastReadAt` de
/// las lecturas correctas y guarda solo si algo cambió.
fn read_entries(
    app_data: &Path,
    env: &ProjectEnv,
    entries: Vec<PinnedProject>,
) -> Result<Vec<ProjectSummary>, String> {
    let read_at = now_rfc3339();
    let mut summaries: Vec<ProjectSummary> = entries
        .iter()
        .map(|entry| {
            let outcome = read_project_folder(Path::new(&entry.path), env);
            summary_for(entry, outcome, env, &read_at)
        })
        .collect();
    for summary in &mut summaries {
        if let Some(info) = &summary.info {
            summary.last_name = Some(info.name.clone());
            summary.last_read_at = Some(read_at.clone());
        }
    }
    with_projects_lock(|| {
        let mut file = load_projects(app_data)?;
        let mut changed = false;
        for summary in summaries.iter().filter(|summary| summary.info.is_some()) {
            if let Some(stored) = file.projects.iter_mut().find(|item| item.id == summary.id) {
                if stored.last_name != summary.last_name
                    || stored.last_read_at != summary.last_read_at
                {
                    stored.last_name = summary.last_name.clone();
                    stored.last_read_at = summary.last_read_at.clone();
                    changed = true;
                }
            }
        }
        if changed {
            save_projects(app_data, &file)?;
        }
        Ok(())
    })?;
    Ok(summaries)
}

fn list_projects_at(app_data: &Path, env: &ProjectEnv) -> Result<ProjectsState, String> {
    let entries = with_projects_lock(|| load_projects(app_data))?.projects;
    let projects = read_entries(app_data, env, entries)?;
    Ok(ProjectsState {
        projects,
        read_at: now_rfc3339(),
    })
}

const NOT_PINNED: &str = "El proyecto ya no está anclado.";

fn find_entry(app_data: &Path, id: &str) -> Result<PinnedProject, String> {
    Uuid::parse_str(id).map_err(|_| NOT_PINNED.to_string())?;
    with_projects_lock(|| load_projects(app_data))?
        .projects
        .into_iter()
        .find(|entry| entry.id == id)
        .ok_or_else(|| NOT_PINNED.to_string())
}

fn read_project_at(app_data: &Path, env: &ProjectEnv, id: &str) -> Result<ProjectSummary, String> {
    let entry = find_entry(app_data, id)?;
    read_entries(app_data, env, vec![entry])?
        .pop()
        .ok_or_else(|| NOT_PINNED.to_string())
}

fn stored_path(canonical: &Path) -> Result<String, String> {
    canonical.to_str().map(strip_verbatim).ok_or_else(|| {
        "La ruta de la carpeta tiene caracteres que no se pueden guardar.".to_string()
    })
}

fn inspect_candidate_at(
    app_data: &Path,
    env: &ProjectEnv,
    path: &Path,
) -> Result<ProjectCandidate, String> {
    let fallback = strip_verbatim(&path.to_string_lossy());
    let mut candidate = ProjectCandidate {
        display_path: display_path(&fallback, env.home.as_deref()),
        path: fallback,
        status: ProjectStatus::NotFound,
        message: None,
        config_version: None,
        name: None,
        profile: None,
        phase: None,
        history_count: None,
        repo_count: None,
        already_pinned_id: None,
    };
    let opened = match open_root(path, env) {
        Ok(opened) => opened,
        Err(failure) => {
            candidate.status = failure.status;
            candidate.message = Some(failure.message);
            return Ok(candidate);
        }
    };
    if let Ok(stored) = stored_path(&opened.ctx.root) {
        candidate.display_path = display_path(&stored, env.home.as_deref());
        let key = path_key(&stored);
        candidate.already_pinned_id = with_projects_lock(|| load_projects(app_data))?
            .projects
            .into_iter()
            .find(|entry| path_key(&entry.path) == key)
            .map(|entry| entry.id);
        candidate.path = stored;
    }
    candidate.name = Some(opened.folder_name.clone());
    match read_config(&opened.ctx) {
        Ok(config) => {
            let mut ignored = Vec::new();
            let fields = method::config_fields(
                &config,
                &opened.folder_name,
                env.limits.max_repos,
                &mut ignored,
            );
            candidate.status = ProjectStatus::V4;
            candidate.config_version = Some(4);
            candidate.name = Some(fields.name);
            candidate.profile = fields.profile;
            candidate.phase = fields.phase;
            candidate.repo_count = Some(fields.repos.len());
            candidate.history_count = Some(
                method::history_folders(&opened.ctx, env.limits.max_histories, &mut ignored).len(),
            );
        }
        Err((failure, version)) => {
            candidate.status = failure.status;
            candidate.message = Some(failure.message);
            candidate.config_version = version;
        }
    }
    Ok(candidate)
}

fn pin_project_at(
    app_data: &Path,
    env: &ProjectEnv,
    path: &Path,
) -> Result<ProjectSummary, String> {
    if path.as_os_str().is_empty() || !path.is_absolute() {
        return Err(
            "La ruta del proyecto no es válida. Elige la carpeta con el selector.".to_string(),
        );
    }
    let outcome = read_project_folder(path, env);
    if outcome.status != ProjectStatus::V4 {
        return Err(outcome
            .message
            .unwrap_or_else(|| "No es un proyecto v4. No se ancló nada.".to_string()));
    }
    let canonical = outcome
        .canonical
        .clone()
        .ok_or_else(|| NOT_FOUND_MESSAGE.to_string())?;
    let stored = stored_path(&canonical)?;
    let name = outcome.info.as_ref().map(|info| info.name.clone());
    let read_at = now_rfc3339();
    let entry = with_projects_lock(|| {
        let mut file = load_projects(app_data)?;
        let key = path_key(&stored);
        if let Some(existing) = file
            .projects
            .iter_mut()
            .find(|entry| path_key(&entry.path) == key)
        {
            existing.last_name = name.clone();
            existing.last_read_at = Some(read_at.clone());
            let existing = existing.clone();
            save_projects(app_data, &file)?;
            return Ok(existing);
        }
        if file.projects.len() >= MAX_PINNED_PROJECTS {
            return Err(format!(
                "Ya tienes {MAX_PINNED_PROJECTS} proyectos anclados. Desancla alguno para anclar otro."
            ));
        }
        let entry = PinnedProject {
            id: Uuid::new_v4().to_string(),
            path: stored.clone(),
            last_name: name.clone(),
            pinned_at: read_at.clone(),
            last_read_at: Some(read_at.clone()),
        };
        file.projects.push(entry.clone());
        save_projects(app_data, &file)?;
        Ok(entry)
    })?;
    Ok(summary_for(&entry, outcome, env, &read_at))
}

fn unpin_project_at(app_data: &Path, id: &str) -> Result<(), String> {
    Uuid::parse_str(id).map_err(|_| NOT_PINNED.to_string())?;
    with_projects_lock(|| {
        let mut file = load_projects(app_data)?;
        let before = file.projects.len();
        file.projects.retain(|entry| entry.id != id);
        if file.projects.len() != before {
            save_projects(app_data, &file)?;
        }
        Ok(())
    })
}

/// La ruta sale del registro, nunca del frontend; debe existir y ser una carpeta.
fn project_folder_at(app_data: &Path, id: &str) -> Result<PathBuf, String> {
    let entry = find_entry(app_data, id)?;
    let path = PathBuf::from(&entry.path);
    if !path.is_absolute() || !path.is_dir() {
        return Err(
            "No se encontró la carpeta del proyecto. Puede que se haya movido o borrado."
                .to_string(),
        );
    }
    Ok(path)
}

// ── Envoltorios para los comandos (lib.rs) ──────────────────────────────────

pub(crate) fn list_projects_sync(app: &AppHandle) -> Result<ProjectsState, String> {
    let (app_data, env) = environment(app)?;
    list_projects_at(&app_data, &env)
}

pub(crate) fn read_project_sync(app: &AppHandle, id: &str) -> Result<ProjectSummary, String> {
    let (app_data, env) = environment(app)?;
    read_project_at(&app_data, &env, id)
}

pub(crate) fn inspect_candidate_sync(
    app: &AppHandle,
    path: &Path,
) -> Result<ProjectCandidate, String> {
    let (app_data, env) = environment(app)?;
    inspect_candidate_at(&app_data, &env, path)
}

pub(crate) fn pin_project_sync(app: &AppHandle, path: &str) -> Result<ProjectSummary, String> {
    let (app_data, env) = environment(app)?;
    pin_project_at(&app_data, &env, Path::new(path))
}

pub(crate) fn unpin_project_sync(app: &AppHandle, id: &str) -> Result<(), String> {
    let paths = ManagedPaths::resolve(app)?;
    unpin_project_at(&paths.app_data, id)
}

pub(crate) fn project_folder_sync(app: &AppHandle, id: &str) -> Result<PathBuf, String> {
    let paths = ManagedPaths::resolve(app)?;
    project_folder_at(&paths.app_data, id)
}

/// Fechas `AAAA-MM-DD` y `AAAA-MM-DD HH:MM` del método.
fn parse_day(value: &str) -> Option<NaiveDate> {
    NaiveDate::parse_from_str(value, "%Y-%m-%d").ok()
}

fn parse_minute(value: &str) -> Option<NaiveDateTime> {
    NaiveDateTime::parse_from_str(value, "%Y-%m-%d %H:%M").ok()
}

#[cfg(test)]
mod tests;
