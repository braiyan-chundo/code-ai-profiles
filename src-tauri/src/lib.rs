use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    collections::{HashMap, HashSet},
    env, fs,
    fs::File,
    io::{Read, Seek, SeekFrom},
    path::{Path, PathBuf},
    process::Command,
};
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};
use uuid::Uuid;

const REGISTRY_VERSION: u32 = 1;
const ORIGINAL_INSTANCE_ID: &str = "__claude_original__";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Registry {
    #[serde(default = "registry_version")]
    version: u32,
    #[serde(default)]
    instances: Vec<ManagedInstance>,
}

impl Default for Registry {
    fn default() -> Self {
        Self {
            version: REGISTRY_VERSION,
            instances: Vec::new(),
        }
    }
}

fn registry_version() -> u32 {
    REGISTRY_VERSION
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ManagedInstance {
    id: String,
    name: String,
    account_label: Option<String>,
    #[serde(default)]
    avatar_url: Option<String>,
    plan: AccountPlan,
    source_version: Option<String>,
    app_path: String,
    profile_path: String,
    created_at: String,
    last_launched_at: Option<String>,
    #[serde(default)]
    pid: Option<u32>,
    #[serde(default)]
    status: InstanceStatus,
    #[serde(default)]
    usage: Option<UsageStats>,
    #[serde(default)]
    code_sessions: Vec<CodeSession>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
enum AccountPlan {
    Free,
    Pro,
    Max,
    Team,
    Enterprise,
    #[default]
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
#[serde(rename_all = "lowercase")]
enum InstanceStatus {
    Running,
    #[default]
    Stopped,
    Missing,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UsageStats {
    session_percent: Option<f64>,
    weekly_percent: Option<f64>,
    captured_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CodeSession {
    id: String,
    title: String,
    model: Option<String>,
    effort: Option<String>,
    completed_turns: u64,
    created_at: Option<i64>,
    last_activity_at: Option<i64>,
    is_archived: bool,
    context_tokens: Option<u64>,
    context_window_tokens: Option<u64>,
    context_percent: Option<f64>,
    #[serde(default)]
    transfer: Option<SessionTransferInfo>,
    #[serde(skip)]
    cli_session_id: Option<String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Default, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
enum SessionTransferMode {
    #[default]
    Copy,
    Move,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionTransferInfo {
    origin_instance_id: String,
    mode: SessionTransferMode,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CodeSessionDocument {
    session_id: Option<String>,
    cli_session_id: Option<String>,
    title: Option<String>,
    model: Option<String>,
    effort: Option<String>,
    completed_turns: Option<u64>,
    created_at: Option<i64>,
    last_activity_at: Option<i64>,
    #[serde(default)]
    is_archived: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TranscriptEntry {
    #[serde(default)]
    is_sidechain: bool,
    #[serde(rename = "type")]
    entry_type: Option<String>,
    subtype: Option<String>,
    message: Option<TranscriptMessage>,
}

#[derive(Debug, Deserialize)]
struct TranscriptMessage {
    model: Option<String>,
    usage: Option<TranscriptUsage>,
}

#[derive(Debug, Deserialize)]
struct TranscriptUsage {
    #[serde(default)]
    input_tokens: u64,
    #[serde(default)]
    cache_creation_input_tokens: u64,
    #[serde(default)]
    cache_read_input_tokens: u64,
    #[serde(default)]
    iterations: Vec<TranscriptUsageIteration>,
}

#[derive(Debug, Deserialize)]
struct TranscriptUsageIteration {
    #[serde(default)]
    input_tokens: u64,
    #[serde(default)]
    cache_creation_input_tokens: u64,
    #[serde(default)]
    cache_read_input_tokens: u64,
}

#[derive(Debug, PartialEq)]
struct SessionContextSnapshot {
    model: Option<String>,
    context_tokens: u64,
    context_window_tokens: Option<u64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SystemInfo {
    platform: String,
    source_path: Option<String>,
    source_version: Option<String>,
    original_profile_path: Option<String>,
    original_status: InstanceStatus,
    original_code_sessions: Vec<CodeSession>,
    free_bytes: Option<u64>,
    managed_bytes: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DashboardState {
    instances: Vec<ManagedInstance>,
    system: SystemInfo,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ScanProgress {
    progress: u8,
    label: &'static str,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateInstanceRequest {
    name: String,
    source_path: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateInstanceRequest {
    id: String,
    name: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CopyCodeSessionRequest {
    source_instance_id: String,
    target_instance_id: String,
    session_id: String,
    #[serde(default)]
    mode: SessionTransferMode,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UnlinkCodeSessionRequest {
    instance_id: String,
    session_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionTransferManifest {
    transfer_id: String,
    created_at: String,
    session_id: String,
    session_title: String,
    source_instance_id: String,
    source_instance_name: String,
    target_instance_id: String,
    target_instance_name: String,
    source_index: String,
    target_index: String,
    transcript: String,
    replaced_existing_target: bool,
    #[serde(default)]
    mode: SessionTransferMode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionLink {
    id: String,
    session_id: String,
    origin_instance_id: String,
    linked_instance_id: String,
    mode: SessionTransferMode,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionLinkRegistry {
    #[serde(default = "registry_version")]
    version: u32,
    #[serde(default)]
    links: Vec<SessionLink>,
}

#[derive(Debug, Clone)]
struct TransferProfile {
    id: String,
    name: String,
    profile_path: PathBuf,
    status: InstanceStatus,
}

impl Default for SessionLinkRegistry {
    fn default() -> Self {
        Self {
            version: REGISTRY_VERSION,
            links: Vec::new(),
        }
    }
}

struct ManagedPaths {
    app_data: PathBuf,
    instances: PathBuf,
    registry: PathBuf,
    session_backups: PathBuf,
    session_links: PathBuf,
}

impl ManagedPaths {
    fn resolve(app: &AppHandle) -> Result<Self, String> {
        let app_data = app
            .path()
            .app_data_dir()
            .map_err(|error| format!("No se pudo resolver el directorio de datos: {error}"))?;
        let instances = app_data.join("managed-instances");
        fs::create_dir_all(&instances)
            .map_err(|error| format!("No se pudo crear el directorio administrado: {error}"))?;
        Ok(Self {
            registry: app_data.join("instances.json"),
            session_backups: app_data.join("session-transfer-backups"),
            session_links: app_data.join("session-links.json"),
            app_data,
            instances,
        })
    }

    fn root_for(&self, id: &str) -> Result<PathBuf, String> {
        Uuid::parse_str(id)
            .map_err(|_| "El identificador de instancia no es válido.".to_string())?;
        Ok(self.instances.join(id))
    }
}

fn load_registry(paths: &ManagedPaths) -> Result<Registry, String> {
    if !paths.registry.exists() {
        return Ok(Registry::default());
    }
    let contents = fs::read_to_string(&paths.registry)
        .map_err(|error| format!("No se pudo leer el registro de instancias: {error}"))?;
    serde_json::from_str(&contents)
        .map_err(|error| format!("El registro de instancias está dañado: {error}"))
}

fn save_registry(paths: &ManagedPaths, registry: &Registry) -> Result<(), String> {
    fs::create_dir_all(&paths.app_data)
        .map_err(|error| format!("No se pudo preparar el directorio de datos: {error}"))?;
    let mut persisted = registry.clone();
    for instance in &mut persisted.instances {
        instance.code_sessions.clear();
    }
    let contents = serde_json::to_vec_pretty(&persisted)
        .map_err(|error| format!("No se pudo serializar el registro: {error}"))?;
    fs::write(&paths.registry, contents)
        .map_err(|error| format!("No se pudo guardar el registro de instancias: {error}"))
}

fn save_session_links(paths: &ManagedPaths, links: &SessionLinkRegistry) -> Result<(), String> {
    let contents = serde_json::to_vec_pretty(links)
        .map_err(|error| format!("No se pudo serializar el registro de sesiones: {error}"))?;
    atomic_replace_file(&paths.session_links, &contents)
        .map_err(|error| format!("No se pudo guardar el origen de las sesiones: {error}"))
}

fn migrate_session_links(paths: &ManagedPaths) -> SessionLinkRegistry {
    let mut manifests = fs::read_dir(&paths.session_backups)
        .into_iter()
        .flatten()
        .flatten()
        .filter_map(|entry| {
            let path = entry.path().join("manifest.json");
            let metadata = fs::metadata(&path).ok()?;
            if !metadata.is_file() || metadata.len() > 64 * 1024 {
                return None;
            }
            serde_json::from_slice::<SessionTransferManifest>(&fs::read(path).ok()?).ok()
        })
        .collect::<Vec<_>>();
    manifests.sort_by(|left, right| left.created_at.cmp(&right.created_at));

    let mut registry = SessionLinkRegistry {
        version: REGISTRY_VERSION,
        links: Vec::new(),
    };
    for manifest in manifests {
        let Some(session_id) = canonical_code_session_id(&manifest.session_id) else {
            continue;
        };
        let origin = registry
            .links
            .iter()
            .find(|link| link.session_id == session_id)
            .map(|link| link.origin_instance_id.clone())
            .unwrap_or_else(|| manifest.source_instance_id.clone());
        if manifest.target_instance_id == origin {
            continue;
        }
        if let Some(link) = registry.links.iter_mut().find(|link| {
            link.session_id == session_id && link.linked_instance_id == manifest.target_instance_id
        }) {
            link.updated_at = manifest.created_at;
            link.mode = manifest.mode;
        } else {
            registry.links.push(SessionLink {
                id: Uuid::new_v4().to_string(),
                session_id,
                origin_instance_id: origin,
                linked_instance_id: manifest.target_instance_id,
                mode: manifest.mode,
                created_at: manifest.created_at.clone(),
                updated_at: manifest.created_at,
            });
        }
    }
    registry
}

fn load_session_links(paths: &ManagedPaths) -> Result<SessionLinkRegistry, String> {
    if !paths.session_links.exists() {
        let migrated = migrate_session_links(paths);
        save_session_links(paths, &migrated)?;
        return Ok(migrated);
    }
    let contents = fs::read(&paths.session_links)
        .map_err(|error| format!("No se pudo leer el origen de las sesiones: {error}"))?;
    serde_json::from_slice(&contents)
        .map_err(|error| format!("El registro de sesiones vinculadas está dañado: {error}"))
}

fn apply_session_links(registry: &mut Registry, links: &SessionLinkRegistry) {
    for instance in &mut registry.instances {
        apply_session_links_to_profile(&mut instance.code_sessions, &instance.id, links);
    }
}

fn apply_session_links_to_profile(
    sessions: &mut [CodeSession],
    profile_id: &str,
    links: &SessionLinkRegistry,
) {
    for session in sessions {
        session.transfer = links
            .links
            .iter()
            .find(|link| link.linked_instance_id == profile_id && link.session_id == session.id)
            .map(|link| SessionTransferInfo {
                origin_instance_id: link.origin_instance_id.clone(),
                mode: link.mode,
            });
    }
}

fn validate_name(value: &str) -> Result<String, String> {
    let value = value.trim();
    if value.is_empty() {
        return Err("El nombre de la instancia es obligatorio.".to_string());
    }
    if value.chars().count() > 64 {
        return Err("El nombre no puede superar 64 caracteres.".to_string());
    }
    if value.chars().any(|character| character.is_control()) {
        return Err("El nombre contiene caracteres no permitidos.".to_string());
    }
    Ok(value.to_string())
}

fn platform_name() -> String {
    if cfg!(target_os = "macos") {
        "macos"
    } else if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "linux") {
        "linux"
    } else {
        "unknown"
    }
    .to_string()
}

fn detect_provider_source() -> Option<PathBuf> {
    #[cfg(target_os = "macos")]
    {
        let mut candidates = vec![PathBuf::from("/Applications/Claude.app")];
        if let Some(home) = dirs::home_dir() {
            candidates.push(home.join("Applications/Claude.app"));
        }
        candidates
            .into_iter()
            .find(|path| provider_executable(path).exists())
    }

    #[cfg(target_os = "windows")]
    {
        let local = env::var_os("LOCALAPPDATA").map(PathBuf::from)?;
        let candidates = [
            local.join("AnthropicClaude/Claude.exe"),
            local.join("Programs/Claude/Claude.exe"),
            local.join("Programs/claude/Claude.exe"),
            local.join("Claude/Claude.exe"),
        ];
        if let Some(found) = candidates.into_iter().find(|path| path.is_file()) {
            return Some(found);
        }

        let squirrel_root = local.join("AnthropicClaude");
        let mut versioned: Vec<PathBuf> = fs::read_dir(squirrel_root)
            .ok()?
            .flatten()
            .map(|entry| entry.path().join("Claude.exe"))
            .filter(|path| path.is_file())
            .collect();
        versioned.sort();
        versioned.pop()
    }

    #[cfg(target_os = "linux")]
    {
        let mut candidates = vec![
            PathBuf::from("/usr/bin/claude-desktop"),
            PathBuf::from("/usr/local/bin/claude-desktop"),
            PathBuf::from("/usr/lib/claude-desktop/claude-desktop"),
            PathBuf::from("/opt/claude-desktop/claude-desktop"),
        ];
        if let Some(home) = dirs::home_dir() {
            candidates.push(home.join(".local/bin/claude-desktop"));
        }
        candidates
            .into_iter()
            .find(|path| linux_provider_installation(path).is_some())
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        None
    }
}

fn detect_original_profile() -> Option<PathBuf> {
    #[cfg(target_os = "macos")]
    {
        dirs::home_dir()
            .map(|home| home.join("Library/Application Support/Claude"))
            .filter(|path| path.is_dir())
    }

    #[cfg(target_os = "windows")]
    {
        let mut candidates = Vec::new();
        if let Some(roaming) = env::var_os("APPDATA") {
            let roaming = PathBuf::from(roaming);
            candidates.push(roaming.join("Claude"));
            candidates.push(roaming.join("Anthropic Claude"));
        }
        if let Some(local) = env::var_os("LOCALAPPDATA") {
            candidates.push(PathBuf::from(local).join("Claude"));
        }
        candidates.into_iter().find(|path| path.is_dir())
    }

    #[cfg(target_os = "linux")]
    {
        let config_root = env::var_os("XDG_CONFIG_HOME")
            .map(PathBuf::from)
            .or_else(|| dirs::home_dir().map(|home| home.join(".config")))?;
        [
            config_root.join("Claude"),
            config_root.join("claude-desktop"),
            config_root.join("Anthropic Claude"),
        ]
        .into_iter()
        .find(|path| path.is_dir())
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        None
    }
}

fn original_app_is_running(source: &Path) -> bool {
    let executable = provider_executable(source);

    #[cfg(target_os = "macos")]
    {
        return Command::new("/usr/bin/pgrep")
            .arg("-f")
            .arg(executable.to_string_lossy().as_ref())
            .output()
            .map(|output| match output.status.code() {
                Some(0) => !output.stdout.is_empty(),
                Some(1) => false,
                _ => true,
            })
            .unwrap_or(true);
    }

    #[cfg(target_os = "windows")]
    {
        return Command::new("powershell.exe")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                "@(Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -eq $args[0] }).Count",
            ])
            .arg(executable)
            .output()
            .ok()
            .filter(|output| output.status.success())
            .and_then(|output| {
                String::from_utf8_lossy(&output.stdout)
                    .trim()
                    .parse::<u32>()
                    .ok()
            })
            .map(|count| count > 0)
            .unwrap_or(true);
    }

    #[cfg(target_os = "linux")]
    {
        let executable = fs::canonicalize(&executable).unwrap_or(executable);
        return Command::new("pgrep")
            .arg("-f")
            .arg(executable.to_string_lossy().as_ref())
            .output()
            .map(|output| match output.status.code() {
                Some(0) => !output.stdout.is_empty(),
                Some(1) => false,
                _ => true,
            })
            .unwrap_or(true);
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        let _ = executable;
        false
    }
}

fn original_instance_status() -> InstanceStatus {
    let Some(source) = detect_provider_source() else {
        return InstanceStatus::Missing;
    };
    if detect_original_profile().is_none() {
        return InstanceStatus::Missing;
    }
    if original_app_is_running(&source) {
        InstanceStatus::Running
    } else {
        InstanceStatus::Stopped
    }
}

fn resolve_transfer_profile(registry: &Registry, id: &str) -> Result<TransferProfile, String> {
    if id == ORIGINAL_INSTANCE_ID {
        let profile_path = detect_original_profile().ok_or_else(|| {
            "No se encontró el perfil local de la aplicación original.".to_string()
        })?;
        return Ok(TransferProfile {
            id: ORIGINAL_INSTANCE_ID.to_string(),
            name: "Aplicación original".to_string(),
            profile_path,
            status: original_instance_status(),
        });
    }

    registry
        .instances
        .iter()
        .find(|instance| instance.id == id)
        .map(|instance| TransferProfile {
            id: instance.id.clone(),
            name: instance.name.clone(),
            profile_path: PathBuf::from(&instance.profile_path),
            status: instance.status.clone(),
        })
        .ok_or_else(|| "El perfil ya no existe.".to_string())
}

fn provider_executable(app_path: &Path) -> PathBuf {
    #[cfg(target_os = "macos")]
    {
        app_path.join("Contents/MacOS/Claude")
    }
    #[cfg(not(target_os = "macos"))]
    {
        app_path.to_path_buf()
    }
}

#[cfg(any(test, target_os = "linux"))]
fn linux_provider_installation(path: &Path) -> Option<(PathBuf, PathBuf)> {
    let executable = fs::canonicalize(path).ok()?;
    if !executable.is_file()
        || executable.file_name().and_then(|value| value.to_str()) != Some("claude-desktop")
    {
        return None;
    }
    let installation_root = executable.parent()?.to_path_buf();
    let has_electron_resources = installation_root.join("resources").is_dir()
        || installation_root.join("chrome-sandbox").is_file()
        || installation_root.join("locales").is_dir();
    has_electron_resources.then_some((installation_root, executable))
}

#[cfg(any(test, target_os = "linux"))]
fn normalize_linux_version(value: &str) -> Option<String> {
    value
        .split_whitespace()
        .map(|part| {
            part.trim_matches(|character: char| {
                !character.is_ascii_alphanumeric()
                    && character != '.'
                    && character != '-'
                    && character != '+'
            })
        })
        .find(|part| {
            part.chars()
                .next()
                .is_some_and(|character| character.is_ascii_digit())
                && part.contains('.')
        })
        .map(str::to_string)
}

fn validate_source(path: &Path) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        if path.extension().and_then(|value| value.to_str()) != Some("app")
            || !provider_executable(path).is_file()
        {
            return Err(
                "La ruta no corresponde a un bundle válido de la aplicación compatible."
                    .to_string(),
            );
        }
        return Ok(());
    }

    #[cfg(target_os = "windows")]
    {
        let is_compatible_executable = path
            .file_name()
            .and_then(|value| value.to_str())
            .map(|name| name.eq_ignore_ascii_case("Claude.exe"))
            .unwrap_or(false);
        if !is_compatible_executable || !path.is_file() {
            return Err(
                "La ruta no corresponde a un ejecutable válido de la aplicación compatible."
                    .to_string(),
            );
        }
        return Ok(());
    }

    #[cfg(target_os = "linux")]
    {
        if linux_provider_installation(path).is_none() {
            return Err(
                "La ruta no corresponde a una instalación compatible para Linux.".to_string(),
            );
        }
        return Ok(());
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        let _ = path;
        Err("Esta plataforma todavía no está soportada.".to_string())
    }
}

fn source_version(source: &Path) -> Option<String> {
    #[cfg(target_os = "macos")]
    {
        let output = Command::new("/usr/bin/plutil")
            .args(["-extract", "CFBundleShortVersionString", "raw", "-o", "-"])
            .arg(source.join("Contents/Info.plist"))
            .output()
            .ok()?;
        if output.status.success() {
            let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
            return (!version.is_empty()).then_some(version);
        }
        None
    }

    #[cfg(target_os = "windows")]
    {
        let powershell = Command::new("powershell.exe")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                "(Get-Item -LiteralPath $args[0]).VersionInfo.ProductVersion",
            ])
            .arg(source)
            .output()
            .ok()
            .filter(|output| output.status.success())
            .map(|output| String::from_utf8_lossy(&output.stdout).trim().to_string())
            .filter(|version| !version.is_empty());
        powershell.or_else(|| {
            source
                .parent()?
                .file_name()?
                .to_str()?
                .strip_prefix("app-")
                .map(str::to_string)
        })
    }

    #[cfg(target_os = "linux")]
    {
        let package_version = Command::new("dpkg-query")
            .args(["-W", "-f=${Version}", "claude-desktop"])
            .output()
            .ok()
            .filter(|output| output.status.success())
            .and_then(|output| normalize_linux_version(&String::from_utf8_lossy(&output.stdout)));
        package_version.or_else(|| {
            Command::new(source)
                .arg("--version")
                .output()
                .ok()
                .filter(|output| output.status.success())
                .and_then(|output| {
                    normalize_linux_version(&String::from_utf8_lossy(&output.stdout))
                })
        })
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        let _ = source;
        None
    }
}

fn version_parts(version: &str) -> Vec<u64> {
    version
        .split(|character: char| !character.is_ascii_digit())
        .filter(|part| !part.is_empty())
        .map(|part| part.parse::<u64>().unwrap_or(u64::MAX))
        .collect()
}

fn version_is_newer(candidate: &str, current: Option<&str>) -> bool {
    let Some(current) = current else {
        return true;
    };
    let candidate_parts = version_parts(candidate);
    let current_parts = version_parts(current);
    let length = candidate_parts.len().max(current_parts.len());
    (0..length)
        .find_map(|index| {
            let candidate = candidate_parts.get(index).copied().unwrap_or(0);
            let current = current_parts.get(index).copied().unwrap_or(0);
            (candidate != current).then_some(candidate > current)
        })
        .unwrap_or(false)
}

fn copy_provider_application(source: &Path, instance_root: &Path) -> Result<PathBuf, String> {
    let application_root = instance_root.join("application");
    fs::create_dir_all(&application_root)
        .map_err(|error| format!("No se pudo crear el directorio de la aplicación: {error}"))?;

    #[cfg(target_os = "macos")]
    {
        let destination = application_root.join("Claude.app");
        let cloned = Command::new("/bin/cp")
            .args(["-cR"])
            .arg(source)
            .arg(&destination)
            .status();

        if matches!(cloned, Ok(status) if status.success()) {
            return Ok(destination);
        }

        if destination.exists() {
            fs::remove_dir_all(&destination).map_err(|error| {
                format!("Falló la copia APFS y no se pudo limpiar el destino parcial: {error}")
            })?;
        }

        let copied = Command::new("/usr/bin/ditto")
            .args(["--rsrc", "--extattr", "--acl"])
            .arg(source)
            .arg(&destination)
            .status()
            .map_err(|error| format!("No se pudo iniciar la copia de la aplicación: {error}"))?;
        if !copied.success() {
            return Err("No se pudo copiar la aplicación al directorio administrado.".to_string());
        }
        Ok(destination)
    }

    #[cfg(target_os = "windows")]
    {
        let source_dir = source
            .parent()
            .ok_or_else(|| "El ejecutable no tiene un directorio de origen válido.".to_string())?;
        let destination = application_root.join("Claude");
        fs::create_dir_all(&destination)
            .map_err(|error| format!("No se pudo crear el destino de la aplicación: {error}"))?;
        let status = Command::new("robocopy")
            .arg(source_dir)
            .arg(&destination)
            .args([
                "/E",
                "/COPY:DAT",
                "/DCOPY:DAT",
                "/R:2",
                "/W:1",
                "/NFL",
                "/NDL",
                "/NJH",
                "/NJS",
            ])
            .status()
            .map_err(|error| format!("No se pudo iniciar robocopy: {error}"))?;
        let code = status.code().unwrap_or(16);
        if code > 7 {
            return Err(format!(
                "No se pudo copiar la aplicación compatible (robocopy: {code})."
            ));
        }
        let executable_name = source.file_name().unwrap_or_default();
        Ok(destination.join(executable_name))
    }

    #[cfg(target_os = "linux")]
    {
        use std::os::unix::fs::symlink;

        let (_, canonical_executable) = linux_provider_installation(source).ok_or_else(|| {
            "No se pudo resolver la instalación compatible para Linux.".to_string()
        })?;
        let destination = application_root.join("claude-desktop");
        symlink(&canonical_executable, &destination).map_err(|error| {
            format!("No se pudo crear el lanzador administrado en Linux: {error}")
        })?;
        Ok(destination)
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        let _ = (source, instance_root, application_root);
        Err("Esta plataforma todavía no está soportada.".to_string())
    }
}

fn instance_bundle_name(name: &str) -> String {
    let safe_name = name
        .chars()
        .map(|character| match character {
            '/' | ':' => '-',
            _ => character,
        })
        .collect::<String>();
    let safe_name = safe_name.trim().trim_end_matches('.');
    format!(
        "{}.app",
        if safe_name.is_empty() {
            "Code AI Profile"
        } else {
            safe_name
        }
    )
}

fn personalize_application_path(app_path: &Path, instance_name: &str) -> Result<PathBuf, String> {
    #[cfg(target_os = "macos")]
    {
        let parent = app_path
            .parent()
            .ok_or_else(|| "La aplicación administrada no tiene una ruta válida.".to_string())?;
        let destination = parent.join(instance_bundle_name(instance_name));
        if destination == app_path {
            return Ok(destination);
        }
        if destination.exists() {
            return Err(format!(
                "Ya existe una aplicación administrada llamada {}.",
                destination
                    .file_name()
                    .and_then(|value| value.to_str())
                    .unwrap_or("perfil.app")
            ));
        }
        fs::rename(app_path, &destination)
            .map_err(|error| format!("No se pudo aplicar el nombre de la instancia: {error}"))?;
        Ok(destination)
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = instance_name;
        Ok(app_path.to_path_buf())
    }
}

fn swap_application_directory(
    staged: &Path,
    destination: &Path,
    backup: &Path,
) -> Result<bool, String> {
    let had_previous = destination.exists();
    if backup.exists() {
        return Err("Ya existe un respaldo temporal de esta actualización.".to_string());
    }
    if had_previous {
        fs::rename(destination, backup)
            .map_err(|error| format!("No se pudo preparar la versión anterior: {error}"))?;
    }
    if let Err(error) = fs::rename(staged, destination) {
        if had_previous {
            let _ = fs::rename(backup, destination);
        }
        return Err(format!(
            "No se pudo activar la nueva versión; se restauró la anterior: {error}"
        ));
    }
    Ok(had_previous)
}

fn rollback_application_directory(
    destination: &Path,
    backup: &Path,
    had_previous: bool,
    operation_id: Uuid,
) -> Result<(), String> {
    let failed_update = destination
        .parent()
        .ok_or_else(|| "La ruta administrada no es válida.".to_string())?
        .join(format!(".application-failed-{operation_id}"));
    if destination.exists() {
        fs::rename(destination, &failed_update)
            .map_err(|error| format!("No se pudo apartar la actualización fallida: {error}"))?;
    }
    if had_previous {
        if let Err(error) = fs::rename(backup, destination) {
            let _ = fs::rename(&failed_update, destination);
            return Err(format!("No se pudo restaurar la versión anterior: {error}"));
        }
    }
    if failed_update.exists() {
        let _ = fs::remove_dir_all(failed_update);
    }
    Ok(())
}

fn read_usage(profile_path: &Path) -> Option<UsageStats> {
    let contents = fs::read_to_string(profile_path.join("plan-usage-history.json")).ok()?;
    let document: Value = serde_json::from_str(&contents).ok()?;
    let latest = document.get("samples")?.as_array()?.last()?;
    let usage = latest.get("u")?;

    let percent = |key: &str| {
        usage
            .get(key)
            .and_then(Value::as_f64)
            .map(|value| value.clamp(0.0, 100.0))
    };

    Some(UsageStats {
        session_percent: percent("fh"),
        weekly_percent: percent("sd"),
        captured_at: latest.get("t").and_then(Value::as_i64),
    })
}

fn clean_session_text(value: Option<String>, max_chars: usize) -> Option<String> {
    value.and_then(|value| {
        let cleaned = value
            .trim()
            .chars()
            .filter(|character| !character.is_control())
            .take(max_chars)
            .collect::<String>();
        (!cleaned.is_empty()).then_some(cleaned)
    })
}

fn canonical_code_session_id(value: &str) -> Option<String> {
    let value = value.trim();
    let (prefix, uuid) = value
        .strip_prefix("local_")
        .map(|uuid| ("local_", uuid))
        .unwrap_or(("", value));
    Uuid::parse_str(uuid)
        .ok()
        .map(|uuid| format!("{prefix}{uuid}"))
}

fn parse_code_session(contents: &[u8], fallback_id: &str) -> Option<CodeSession> {
    let document: CodeSessionDocument = serde_json::from_slice(contents).ok()?;
    let id = clean_session_text(document.session_id, 96)
        .or_else(|| clean_session_text(Some(fallback_id.to_string()), 96))?;
    Some(CodeSession {
        id,
        title: clean_session_text(document.title, 180)
            .unwrap_or_else(|| "Sesión sin título".to_string()),
        model: clean_session_text(document.model, 80),
        effort: clean_session_text(document.effort, 40),
        completed_turns: document.completed_turns.unwrap_or(0).min(1_000_000),
        created_at: document.created_at,
        last_activity_at: document.last_activity_at,
        is_archived: document.is_archived,
        context_tokens: None,
        context_window_tokens: None,
        context_percent: None,
        transfer: None,
        cli_session_id: document
            .cli_session_id
            .and_then(|value| Uuid::parse_str(value.trim()).ok())
            .map(|value| value.to_string()),
    })
}

fn collect_code_session_files(directory: &Path, depth: usize, files: &mut Vec<PathBuf>) {
    if depth > 5 {
        return;
    }
    let Ok(entries) = fs::read_dir(directory) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        let Ok(metadata) = fs::symlink_metadata(&path) else {
            continue;
        };
        if metadata.file_type().is_symlink() {
            continue;
        }
        if metadata.is_dir() {
            collect_code_session_files(&path, depth + 1, files);
            continue;
        }
        let is_local_session = path
            .file_name()
            .and_then(|value| value.to_str())
            .map(|name| name.starts_with("local_") && name.ends_with(".json"))
            .unwrap_or(false);
        if is_local_session && metadata.len() <= 1024 * 1024 {
            files.push(path);
        }
    }
}

fn collect_code_transcripts(
    directory: &Path,
    depth: usize,
    transcripts: &mut HashMap<String, PathBuf>,
) {
    if depth > 6 {
        return;
    }
    let Ok(entries) = fs::read_dir(directory) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        let Ok(metadata) = fs::symlink_metadata(&path) else {
            continue;
        };
        if metadata.file_type().is_symlink() {
            continue;
        }
        if metadata.is_dir() {
            collect_code_transcripts(&path, depth + 1, transcripts);
            continue;
        }
        let Some(session_id) = path
            .file_stem()
            .and_then(|value| value.to_str())
            .and_then(|value| Uuid::parse_str(value).ok())
            .map(|value| value.to_string())
        else {
            continue;
        };
        if path.extension().and_then(|value| value.to_str()) == Some("jsonl") {
            transcripts.entry(session_id).or_insert(path);
        }
    }
}

fn code_transcript_catalog() -> HashMap<String, PathBuf> {
    let mut transcripts = HashMap::new();
    if let Some(root) = dirs::home_dir().map(|home| home.join(".claude/projects")) {
        collect_code_transcripts(&root, 0, &mut transcripts);
    }
    transcripts
}

fn context_window_for_model(model: &str) -> Option<u64> {
    let model = model.to_ascii_lowercase();
    let extended_context = [
        "claude-fable-5",
        "claude-mythos-5",
        "claude-mythos-preview",
        "claude-opus-4-8",
        "claude-opus-4-7",
        "claude-sonnet-5",
        "claude-sonnet-4-6",
    ];
    if extended_context
        .iter()
        .any(|candidate| model.contains(candidate))
    {
        return Some(1_000_000);
    }
    model.starts_with("claude-").then_some(200_000)
}

fn latest_transcript_context(path: &Path) -> Option<SessionContextSnapshot> {
    const MAX_TAIL_BYTES: u64 = 16 * 1024 * 1024;
    const MAX_LINE_BYTES: usize = 4 * 1024 * 1024;

    let mut file = File::open(path).ok()?;
    let length = file.metadata().ok()?.len();
    let start = length.saturating_sub(MAX_TAIL_BYTES);
    file.seek(SeekFrom::Start(start)).ok()?;
    let mut contents = Vec::with_capacity((length - start).min(MAX_TAIL_BYTES) as usize);
    file.read_to_end(&mut contents).ok()?;
    if start > 0 {
        let first_line_end = contents.iter().position(|byte| *byte == b'\n')?;
        contents.drain(..=first_line_end);
    }

    for line in contents.split(|byte| *byte == b'\n').rev() {
        if line.is_empty() || line.len() > MAX_LINE_BYTES {
            continue;
        }
        let Ok(entry) = serde_json::from_slice::<TranscriptEntry>(line) else {
            continue;
        };
        if entry.is_sidechain {
            continue;
        }
        if entry.entry_type.as_deref() == Some("system")
            && entry.subtype.as_deref() == Some("compact_boundary")
        {
            return None;
        }
        let Some(message) = entry.message else {
            continue;
        };
        let Some(usage) = message.usage else {
            continue;
        };
        let (input, cache_creation, cache_read) = usage
            .iterations
            .last()
            .map(|iteration| {
                (
                    iteration.input_tokens,
                    iteration.cache_creation_input_tokens,
                    iteration.cache_read_input_tokens,
                )
            })
            .unwrap_or((
                usage.input_tokens,
                usage.cache_creation_input_tokens,
                usage.cache_read_input_tokens,
            ));
        let context_tokens = input
            .saturating_add(cache_creation)
            .saturating_add(cache_read);
        let model = clean_session_text(message.model, 80);
        return Some(SessionContextSnapshot {
            context_window_tokens: model.as_deref().and_then(context_window_for_model),
            model,
            context_tokens,
        });
    }
    None
}

fn apply_session_context(sessions: &mut [CodeSession], transcripts: &HashMap<String, PathBuf>) {
    for session in sessions {
        let Some(snapshot) = session
            .cli_session_id
            .as_ref()
            .and_then(|id| transcripts.get(id))
            .and_then(|path| latest_transcript_context(path))
        else {
            continue;
        };
        if snapshot.model.is_some() {
            session.model = snapshot.model;
        }
        session.context_tokens = Some(snapshot.context_tokens);
        session.context_window_tokens = snapshot.context_window_tokens;
        session.context_percent = snapshot.context_window_tokens.map(|window| {
            ((snapshot.context_tokens as f64 / window as f64) * 100.0).clamp(0.0, 100.0)
        });
    }
}

fn read_code_sessions(
    profile_path: &Path,
    transcripts: &HashMap<String, PathBuf>,
) -> Vec<CodeSession> {
    let mut files = Vec::new();
    collect_code_session_files(&profile_path.join("claude-code-sessions"), 0, &mut files);

    let mut seen = HashSet::new();
    let mut sessions = files
        .into_iter()
        .filter_map(|path| {
            let fallback_id = path.file_stem()?.to_str()?.trim_start_matches("local_");
            let contents = fs::read(&path).ok()?;
            parse_code_session(&contents, fallback_id)
        })
        .filter(|session| seen.insert(session.id.clone()))
        .collect::<Vec<_>>();
    apply_session_context(&mut sessions, transcripts);
    sessions.sort_by(|left, right| {
        right
            .last_activity_at
            .or(right.created_at)
            .cmp(&left.last_activity_at.or(left.created_at))
            .then_with(|| left.title.cmp(&right.title))
    });
    sessions
}

fn find_code_session_index(
    profile_path: &Path,
    session_id: &str,
) -> Result<(PathBuf, Vec<u8>, Value), String> {
    let canonical_session_id = canonical_code_session_id(session_id)
        .ok_or_else(|| "El identificador de la sesión no es válido.".to_string())?;
    let mut files = Vec::new();
    collect_code_session_files(&profile_path.join("claude-code-sessions"), 0, &mut files);
    for path in files {
        let Ok(contents) = fs::read(&path) else {
            continue;
        };
        let Ok(document) = serde_json::from_slice::<Value>(&contents) else {
            continue;
        };
        let matches = document
            .get("sessionId")
            .and_then(Value::as_str)
            .and_then(canonical_code_session_id)
            .map(|value| value == canonical_session_id)
            .unwrap_or(false);
        if matches {
            return Ok((path, contents, document));
        }
    }
    Err("La sesión ya no existe dentro del perfil de origen.".to_string())
}

fn profile_identity(profile_path: &Path) -> Result<(String, String), String> {
    let config: Value = serde_json::from_slice(
        &fs::read(profile_path.join("config.json"))
            .map_err(|_| "El perfil destino aún no tiene una cuenta iniciada.".to_string())?,
    )
    .map_err(|_| "La configuración del perfil destino no es válida.".to_string())?;
    let account_id = config
        .get("lastKnownAccountUuid")
        .and_then(Value::as_str)
        .and_then(|value| Uuid::parse_str(value).ok())
        .map(|value| value.to_string())
        .ok_or_else(|| "No se pudo identificar la cuenta del perfil destino.".to_string())?;

    let usage: Value = serde_json::from_slice(
        &fs::read(profile_path.join("plan-usage-history.json"))
            .map_err(|_| "El perfil destino todavía no expone una organización.".to_string())?,
    )
    .map_err(|_| "El historial de uso del perfil destino no es válido.".to_string())?;
    let organization_id = usage
        .get("samples")
        .and_then(Value::as_array)
        .and_then(|samples| samples.last())
        .and_then(|sample| sample.get("org"))
        .and_then(Value::as_str)
        .and_then(|value| Uuid::parse_str(value).ok())
        .map(|value| value.to_string())
        .ok_or_else(|| "No se pudo identificar la organización del perfil destino.".to_string())?;
    Ok((account_id, organization_id))
}

fn find_file_named(directory: &Path, file_name: &str, depth: usize) -> Option<PathBuf> {
    if depth > 5 {
        return None;
    }
    for entry in fs::read_dir(directory).ok()?.flatten() {
        let path = entry.path();
        let Ok(metadata) = fs::symlink_metadata(&path) else {
            continue;
        };
        if metadata.file_type().is_symlink() {
            continue;
        }
        if metadata.is_dir() {
            if let Some(found) = find_file_named(&path, file_name, depth + 1) {
                return Some(found);
            }
        } else if metadata.is_file()
            && path.file_name().and_then(|value| value.to_str()) == Some(file_name)
        {
            return Some(path);
        }
    }
    None
}

fn atomic_replace_file(destination: &Path, contents: &[u8]) -> Result<(), String> {
    let parent = destination
        .parent()
        .ok_or_else(|| "El destino de la sesión no es válido.".to_string())?;
    fs::create_dir_all(parent)
        .map_err(|error| format!("No se pudo crear el índice de sesiones destino: {error}"))?;
    let operation_id = Uuid::new_v4();
    let temporary = parent.join(format!(".session-transfer-{operation_id}.tmp"));
    fs::write(&temporary, contents)
        .map_err(|error| format!("No se pudo preparar la copia de la sesión: {error}"))?;

    if !destination.exists() {
        return fs::rename(&temporary, destination).map_err(|error| {
            let _ = fs::remove_file(&temporary);
            format!("No se pudo activar la sesión copiada: {error}")
        });
    }

    let previous = parent.join(format!(".session-transfer-{operation_id}.previous"));
    fs::rename(destination, &previous)
        .map_err(|error| format!("No se pudo preparar el reemplazo seguro: {error}"))?;
    if let Err(error) = fs::rename(&temporary, destination) {
        let _ = fs::rename(&previous, destination);
        let _ = fs::remove_file(&temporary);
        return Err(format!(
            "No se pudo reemplazar el índice destino; se restauró la copia anterior: {error}"
        ));
    }
    let _ = fs::remove_file(previous);
    Ok(())
}

fn update_session_links_after_transfer(
    links: &mut SessionLinkRegistry,
    session_id: &str,
    source_instance_id: &str,
    target_instance_id: &str,
    mode: SessionTransferMode,
) {
    let origin_instance_id = links
        .links
        .iter()
        .find(|link| {
            link.session_id == session_id
                && (link.origin_instance_id == source_instance_id
                    || link.linked_instance_id == source_instance_id
                    || link.origin_instance_id == target_instance_id
                    || link.linked_instance_id == target_instance_id)
        })
        .map(|link| link.origin_instance_id.clone())
        .unwrap_or_else(|| source_instance_id.to_string());
    let source_was_moved = links.links.iter().any(|link| {
        link.session_id == session_id
            && link.linked_instance_id == source_instance_id
            && link.mode == SessionTransferMode::Move
    });

    if target_instance_id == origin_instance_id {
        if mode == SessionTransferMode::Move {
            links.links.retain(|link| {
                !(link.session_id == session_id && link.linked_instance_id == source_instance_id)
            });
        }
        return;
    }

    if mode == SessionTransferMode::Move && source_instance_id != origin_instance_id {
        links.links.retain(|link| {
            !(link.session_id == session_id && link.linked_instance_id == source_instance_id)
        });
    }

    let linked_mode = if mode == SessionTransferMode::Move
        && (source_instance_id == origin_instance_id || source_was_moved)
    {
        SessionTransferMode::Move
    } else {
        SessionTransferMode::Copy
    };
    let now = Utc::now().to_rfc3339();
    if let Some(link) = links
        .links
        .iter_mut()
        .find(|link| link.session_id == session_id && link.linked_instance_id == target_instance_id)
    {
        link.origin_instance_id = origin_instance_id;
        link.mode = linked_mode;
        link.updated_at = now;
    } else {
        links.links.push(SessionLink {
            id: Uuid::new_v4().to_string(),
            session_id: session_id.to_string(),
            origin_instance_id,
            linked_instance_id: target_instance_id.to_string(),
            mode: linked_mode,
            created_at: now.clone(),
            updated_at: now,
        });
    }
}

fn rollback_transfer_target(
    target_index: &Path,
    backup_root: &Path,
    replaced_existing_target: bool,
) {
    if replaced_existing_target {
        if let Ok(previous) = fs::read(backup_root.join("target-index.previous.json")) {
            let _ = atomic_replace_file(target_index, &previous);
        }
    } else if target_index.exists() {
        let _ = fs::remove_file(target_index);
    }
}

fn copy_code_session_sync(app: &AppHandle, request: CopyCodeSessionRequest) -> Result<(), String> {
    if request.source_instance_id == request.target_instance_id {
        return Err("El origen y el destino deben ser perfiles diferentes.".to_string());
    }

    let paths = ManagedPaths::resolve(app)?;
    let mut registry = load_registry(&paths)?;
    let mut session_links = load_session_links(&paths)?;
    refresh_instance_statuses(&mut registry);
    let source = resolve_transfer_profile(&registry, &request.source_instance_id)
        .map_err(|error| format!("No se pudo usar el perfil de origen: {error}"))?;
    let target = resolve_transfer_profile(&registry, &request.target_instance_id)
        .map_err(|error| format!("No se pudo usar el perfil de destino: {error}"))?;

    if source.status != InstanceStatus::Stopped || target.status != InstanceStatus::Stopped {
        return Err(format!(
            "Detén “{}” y “{}” antes de transferir la sesión.",
            source.name, target.name
        ));
    }

    let source_profile = source.profile_path.clone();
    let target_profile = target.profile_path.clone();
    let (source_index, index_contents, document) =
        find_code_session_index(&source_profile, &request.session_id)?;
    let session_id = document
        .get("sessionId")
        .and_then(Value::as_str)
        .and_then(canonical_code_session_id)
        .ok_or_else(|| "La sesión de origen no tiene un identificador válido.".to_string())?;
    let cli_session_id = document
        .get("cliSessionId")
        .and_then(Value::as_str)
        .and_then(|value| Uuid::parse_str(value).ok())
        .map(|value| value.to_string())
        .ok_or_else(|| "La sesión no tiene un transcript válido.".to_string())?;
    let session_title = document
        .get("title")
        .and_then(Value::as_str)
        .map(|value| value.to_string())
        .and_then(|value| clean_session_text(Some(value), 180))
        .unwrap_or_else(|| "Sesión sin título".to_string());

    let transcript_root = dirs::home_dir()
        .map(|home| home.join(".claude/projects"))
        .ok_or_else(|| "No se pudo resolver el almacenamiento global de sesiones.".to_string())?;
    let transcript_name = format!("{cli_session_id}.jsonl");
    let transcript = find_file_named(&transcript_root, &transcript_name, 0)
        .ok_or_else(|| "No se encontró el transcript global de esta sesión.".to_string())?;
    if fs::metadata(&transcript)
        .map(|metadata| metadata.len())
        .unwrap_or(0)
        == 0
    {
        return Err("El transcript global de esta sesión está vacío.".to_string());
    }

    let mut target_session_files = Vec::new();
    collect_code_session_files(
        &target_profile.join("claude-code-sessions"),
        0,
        &mut target_session_files,
    );
    let existing_target = target_session_files.into_iter().find(|path| {
        fs::read(path)
            .ok()
            .and_then(|contents| serde_json::from_slice::<Value>(&contents).ok())
            .and_then(|value| {
                value
                    .get("sessionId")
                    .and_then(Value::as_str)
                    .map(str::to_string)
            })
            .and_then(|value| canonical_code_session_id(&value))
            .map(|value| value == session_id)
            .unwrap_or(false)
    });
    let target_index = if let Some(existing_target) = existing_target {
        existing_target
    } else {
        let (account_id, organization_id) = profile_identity(&target_profile)?;
        let target_directory = target_profile
            .join("claude-code-sessions")
            .join(account_id)
            .join(organization_id);
        let preferred = target_directory.join(if session_id.starts_with("local_") {
            format!("{session_id}.json")
        } else {
            format!("local_{session_id}.json")
        });
        if preferred.exists() {
            target_directory.join(format!("local_import_{}.json", Uuid::new_v4()))
        } else {
            preferred
        }
    };

    let transfer_id = Uuid::new_v4().to_string();
    let backup_root = paths.session_backups.join(format!(
        "{}-{}",
        Utc::now().format("%Y%m%d-%H%M%S"),
        transfer_id
    ));
    fs::create_dir_all(&backup_root)
        .map_err(|error| format!("No se pudo crear el respaldo de la transferencia: {error}"))?;
    fs::copy(&source_index, backup_root.join("source-index.json"))
        .map_err(|error| format!("No se pudo respaldar el índice de origen: {error}"))?;
    fs::copy(&transcript, backup_root.join("transcript.jsonl"))
        .map_err(|error| format!("No se pudo respaldar el transcript: {error}"))?;
    let replaced_existing_target = target_index.exists();
    if replaced_existing_target {
        fs::copy(
            &target_index,
            backup_root.join("target-index.previous.json"),
        )
        .map_err(|error| format!("No se pudo respaldar el índice destino: {error}"))?;
    }

    let manifest = SessionTransferManifest {
        transfer_id,
        created_at: Utc::now().to_rfc3339(),
        session_id: session_id.clone(),
        session_title,
        source_instance_id: source.id.clone(),
        source_instance_name: source.name.clone(),
        target_instance_id: target.id.clone(),
        target_instance_name: target.name.clone(),
        source_index: source_index.to_string_lossy().to_string(),
        target_index: target_index.to_string_lossy().to_string(),
        transcript: transcript.to_string_lossy().to_string(),
        replaced_existing_target,
        mode: request.mode,
    };
    let manifest_contents = serde_json::to_vec_pretty(&manifest)
        .map_err(|error| format!("No se pudo preparar el manifiesto de respaldo: {error}"))?;
    fs::write(backup_root.join("manifest.json"), manifest_contents)
        .map_err(|error| format!("No se pudo guardar el manifiesto de respaldo: {error}"))?;

    atomic_replace_file(&target_index, &index_contents)?;

    let detached_source = backup_root.join("source-index.detached.json");
    if request.mode == SessionTransferMode::Move {
        if let Err(error) = fs::rename(&source_index, &detached_source) {
            rollback_transfer_target(&target_index, &backup_root, replaced_existing_target);
            return Err(format!(
                "La copia se preparó, pero no se pudo retirar del origen; se restauró el destino: {error}"
            ));
        }
    }

    update_session_links_after_transfer(
        &mut session_links,
        &session_id,
        &source.id,
        &target.id,
        request.mode,
    );
    if let Err(error) = save_session_links(&paths, &session_links) {
        if detached_source.exists() {
            let _ = fs::rename(&detached_source, &source_index);
        }
        rollback_transfer_target(&target_index, &backup_root, replaced_existing_target);
        return Err(error);
    }
    Ok(())
}

fn unlink_code_session_sync(
    app: &AppHandle,
    request: UnlinkCodeSessionRequest,
) -> Result<(), String> {
    let paths = ManagedPaths::resolve(app)?;
    let mut session_links = load_session_links(&paths)?;
    let session_id = canonical_code_session_id(&request.session_id)
        .ok_or_else(|| "El identificador de la sesión no es válido.".to_string())?;
    let link = session_links
        .links
        .iter()
        .find(|link| {
            link.session_id == session_id && link.linked_instance_id == request.instance_id
        })
        .cloned()
        .ok_or_else(|| "Esta sesión no está registrada como una copia vinculada.".to_string())?;

    if link.mode == SessionTransferMode::Move {
        return copy_code_session_sync(
            app,
            CopyCodeSessionRequest {
                source_instance_id: link.linked_instance_id,
                target_instance_id: link.origin_instance_id,
                session_id,
                mode: SessionTransferMode::Move,
            },
        );
    }

    let mut registry = load_registry(&paths)?;
    refresh_instance_statuses(&mut registry);
    let linked_instance = resolve_transfer_profile(&registry, &link.linked_instance_id)
        .map_err(|error| format!("La instancia vinculada no está disponible: {error}"))?;
    if linked_instance.status == InstanceStatus::Running {
        return Err(format!(
            "Detén “{}” antes de desvincular la sesión.",
            linked_instance.name
        ));
    }

    let linked_profile = linked_instance.profile_path.clone();
    let (linked_index, _, document) = find_code_session_index(&linked_profile, &session_id)?;
    let title = document
        .get("title")
        .and_then(Value::as_str)
        .map(str::to_string)
        .and_then(|value| clean_session_text(Some(value), 180))
        .unwrap_or_else(|| "Sesión sin título".to_string());
    let operation_id = Uuid::new_v4().to_string();
    let backup_root = paths.session_backups.join(format!(
        "{}-unlink-{}",
        Utc::now().format("%Y%m%d-%H%M%S"),
        operation_id
    ));
    fs::create_dir_all(&backup_root)
        .map_err(|error| format!("No se pudo crear el respaldo de desvinculación: {error}"))?;
    let detached = backup_root.join("linked-index.detached.json");
    fs::rename(&linked_index, &detached)
        .map_err(|error| format!("No se pudo retirar la sesión vinculada: {error}"))?;
    let manifest = serde_json::json!({
        "operationId": operation_id,
        "operation": "unlink",
        "createdAt": Utc::now().to_rfc3339(),
        "sessionId": session_id,
        "sessionTitle": title,
        "originInstanceId": link.origin_instance_id,
        "linkedInstanceId": link.linked_instance_id,
        "linkedIndex": linked_index.to_string_lossy(),
    });
    if let Err(error) = fs::write(
        backup_root.join("manifest.json"),
        serde_json::to_vec_pretty(&manifest).unwrap_or_default(),
    ) {
        let _ = fs::rename(&detached, &linked_index);
        return Err(format!(
            "No se pudo guardar el respaldo de desvinculación: {error}"
        ));
    }

    session_links
        .links
        .retain(|candidate| candidate.id != link.id);
    if let Err(error) = save_session_links(&paths, &session_links) {
        let _ = fs::rename(&detached, &linked_index);
        return Err(error);
    }
    Ok(())
}

fn path_size(path: &Path) -> u64 {
    let Ok(metadata) = fs::symlink_metadata(path) else {
        return 0;
    };
    if metadata.is_file() || metadata.file_type().is_symlink() {
        return metadata.len();
    }
    fs::read_dir(path)
        .map(|entries| {
            entries
                .flatten()
                .map(|entry| path_size(&entry.path()))
                .sum()
        })
        .unwrap_or(0)
}

fn process_is_alive(pid: u32) -> bool {
    #[cfg(unix)]
    {
        let result = unsafe { libc::kill(pid as i32, 0) };
        result == 0 || std::io::Error::last_os_error().raw_os_error() == Some(libc::EPERM)
    }

    #[cfg(target_os = "windows")]
    {
        let filter = format!("PID eq {pid}");
        Command::new("tasklist")
            .args(["/FI", &filter, "/FO", "CSV", "/NH"])
            .output()
            .map(|output| {
                output.status.success()
                    && String::from_utf8_lossy(&output.stdout).contains(&format!("\",\"{pid}\","))
            })
            .unwrap_or(false)
    }

    #[cfg(not(any(unix, target_os = "windows")))]
    {
        let _ = pid;
        false
    }
}

fn refresh_registry(registry: &mut Registry) -> HashMap<String, PathBuf> {
    refresh_instance_statuses(registry);
    refresh_instance_bundle_names(registry);
    refresh_instance_versions(registry);
    refresh_instance_usage(registry);
    let transcripts = code_transcript_catalog();
    refresh_instance_code_sessions(registry, &transcripts);
    transcripts
}

fn refresh_instance_bundle_names(registry: &mut Registry) {
    #[cfg(target_os = "macos")]
    for instance in &mut registry.instances {
        if instance.status == InstanceStatus::Running {
            continue;
        }
        let current = PathBuf::from(&instance.app_path);
        if current.extension().and_then(|value| value.to_str()) != Some("app") || !current.exists()
        {
            continue;
        }
        if let Ok(personalized) = personalize_application_path(&current, &instance.name) {
            instance.app_path = personalized.to_string_lossy().to_string();
        }
    }

    #[cfg(not(target_os = "macos"))]
    let _ = registry;
}

fn refresh_instance_statuses(registry: &mut Registry) {
    for instance in &mut registry.instances {
        let app_exists = Path::new(&instance.app_path).exists();
        instance.status = if !app_exists {
            instance.pid = None;
            InstanceStatus::Missing
        } else if instance.pid.map(process_is_alive).unwrap_or(false) {
            InstanceStatus::Running
        } else {
            instance.pid = None;
            InstanceStatus::Stopped
        };
    }
}

fn refresh_instance_versions(registry: &mut Registry) {
    for instance in &mut registry.instances {
        let app_path = Path::new(&instance.app_path);
        if app_path.exists() {
            if let Some(version) = source_version(app_path) {
                instance.source_version = Some(version);
            }
        }
    }
}

fn refresh_instance_usage(registry: &mut Registry) {
    for instance in &mut registry.instances {
        instance.usage = read_usage(Path::new(&instance.profile_path));
    }
}

fn refresh_instance_code_sessions(registry: &mut Registry, transcripts: &HashMap<String, PathBuf>) {
    for instance in &mut registry.instances {
        instance.code_sessions = read_code_sessions(Path::new(&instance.profile_path), transcripts);
    }
}

fn system_info(
    paths: &ManagedPaths,
    session_links: &SessionLinkRegistry,
    transcripts: &HashMap<String, PathBuf>,
) -> SystemInfo {
    let source = detect_provider_source();
    let original_profile = detect_original_profile();
    let mut original_code_sessions = original_profile
        .as_deref()
        .map(|profile| read_code_sessions(profile, transcripts))
        .unwrap_or_default();
    apply_session_links_to_profile(
        &mut original_code_sessions,
        ORIGINAL_INSTANCE_ID,
        session_links,
    );
    let free_bytes = fs2::available_space(&paths.app_data).ok();
    SystemInfo {
        platform: platform_name(),
        source_version: source.as_deref().and_then(source_version),
        source_path: source.map(|path| path.to_string_lossy().to_string()),
        original_profile_path: original_profile.map(|path| path.to_string_lossy().to_string()),
        original_status: original_instance_status(),
        original_code_sessions,
        free_bytes,
        managed_bytes: path_size(&paths.instances),
    }
}

fn dashboard_from(app: &AppHandle) -> Result<DashboardState, String> {
    let paths = ManagedPaths::resolve(app)?;
    let mut registry = load_registry(&paths)?;
    let transcripts = refresh_registry(&mut registry);
    let session_links = load_session_links(&paths)?;
    apply_session_links(&mut registry, &session_links);
    save_registry(&paths, &registry)?;
    Ok(DashboardState {
        instances: registry.instances,
        system: system_info(&paths, &session_links, &transcripts),
    })
}

#[tauri::command]
fn get_dashboard_state(app: AppHandle) -> Result<DashboardState, String> {
    dashboard_from(&app)
}

#[tauri::command]
fn scan_system(app: AppHandle, window: WebviewWindow) -> Result<DashboardState, String> {
    let emit_progress = |progress, label| {
        let _ = window.emit("scan-progress", ScanProgress { progress, label });
    };

    emit_progress(8, "Preparando el escaneo…");
    let paths = ManagedPaths::resolve(&app)?;

    emit_progress(22, "Cargando perfiles administrados…");
    let mut registry = load_registry(&paths)?;

    emit_progress(40, "Comprobando instancias y procesos…");
    refresh_instance_statuses(&mut registry);
    refresh_instance_bundle_names(&mut registry);
    refresh_instance_versions(&mut registry);

    emit_progress(62, "Leyendo métricas locales de uso…");
    refresh_instance_usage(&mut registry);

    emit_progress(74, "Indexando sesiones de Code…");
    let transcripts = code_transcript_catalog();
    refresh_instance_code_sessions(&mut registry, &transcripts);
    let session_links = load_session_links(&paths)?;
    apply_session_links(&mut registry, &session_links);

    emit_progress(88, "Buscando la aplicación compatible y su versión…");
    let system = system_info(&paths, &session_links, &transcripts);

    emit_progress(92, "Actualizando el registro local…");
    save_registry(&paths, &registry)?;

    emit_progress(100, "Escaneo completado");
    Ok(DashboardState {
        instances: registry.instances,
        system,
    })
}

#[tauri::command]
async fn create_instance(
    app: AppHandle,
    request: CreateInstanceRequest,
) -> Result<DashboardState, String> {
    let worker_app = app.clone();
    tauri::async_runtime::spawn_blocking(move || create_instance_sync(&worker_app, request))
        .await
        .map_err(|error| format!("La tarea de creación terminó inesperadamente: {error}"))??;
    dashboard_from(&app)
}

#[tauri::command]
async fn update_instance_application(app: AppHandle, id: String) -> Result<DashboardState, String> {
    let worker_app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        update_instance_application_sync(&worker_app, &id)
    })
    .await
    .map_err(|error| format!("La actualización terminó inesperadamente: {error}"))??;
    dashboard_from(&app)
}

fn update_instance_application_sync(app: &AppHandle, id: &str) -> Result<(), String> {
    let paths = ManagedPaths::resolve(app)?;
    let instance_root = paths.root_for(id)?;
    let source = detect_provider_source().ok_or_else(|| {
        "No se encontró la instalación original de la aplicación compatible.".to_string()
    })?;
    validate_source(&source)?;
    let latest_version = source_version(&source).ok_or_else(|| {
        "No se pudo identificar la versión original de la aplicación.".to_string()
    })?;

    let mut registry = load_registry(&paths)?;
    refresh_instance_statuses(&mut registry);
    refresh_instance_bundle_names(&mut registry);
    refresh_instance_versions(&mut registry);
    let position = registry
        .instances
        .iter()
        .position(|instance| instance.id == id)
        .ok_or_else(|| "La instancia ya no existe.".to_string())?;
    let current = registry.instances[position].clone();
    if current.status == InstanceStatus::Running {
        return Err(format!(
            "Detén “{}” antes de actualizar su aplicación.",
            current.name
        ));
    }
    if Path::new(&current.app_path).exists()
        && !version_is_newer(&latest_version, current.source_version.as_deref())
    {
        return Ok(());
    }

    let operation_id = Uuid::new_v4();
    let staging_root = instance_root.join(format!(".application-update-{operation_id}"));
    let destination_application = instance_root.join("application");
    let backup_application = instance_root.join(format!(".application-backup-{operation_id}"));
    let staged_app = match copy_provider_application(&source, &staging_root)
        .and_then(|path| personalize_application_path(&path, &current.name))
    {
        Ok(path) => path,
        Err(error) => {
            let _ = fs::remove_dir_all(&staging_root);
            return Err(error);
        }
    };
    if let Err(error) = validate_source(&staged_app) {
        let _ = fs::remove_dir_all(&staging_root);
        return Err(format!("La copia de actualización no es válida: {error}"));
    }
    let staged_application = staging_root.join("application");
    let relative_app_path = match staged_app.strip_prefix(&staged_application) {
        Ok(path) => path.to_path_buf(),
        Err(_) => {
            let _ = fs::remove_dir_all(&staging_root);
            return Err(
                "La aplicación preparada quedó fuera del directorio administrado.".to_string(),
            );
        }
    };

    let had_previous = match swap_application_directory(
        &staged_application,
        &destination_application,
        &backup_application,
    ) {
        Ok(value) => value,
        Err(error) => {
            let _ = fs::remove_dir_all(&staging_root);
            return Err(error);
        }
    };

    let updated_app_path = destination_application.join(relative_app_path);
    registry.instances[position].app_path = updated_app_path.to_string_lossy().to_string();
    registry.instances[position].source_version = Some(latest_version);
    registry.instances[position].pid = None;
    registry.instances[position].status = InstanceStatus::Stopped;

    if let Err(save_error) = save_registry(&paths, &registry) {
        let rollback = rollback_application_directory(
            &destination_application,
            &backup_application,
            had_previous,
            operation_id,
        );
        let _ = fs::remove_dir_all(&staging_root);
        return match rollback {
            Ok(()) => Err(format!(
                "No se pudo guardar la actualización y se restauró la versión anterior: {save_error}"
            )),
            Err(rollback_error) => Err(format!(
                "No se pudo guardar la actualización ({save_error}) ni completar el rollback ({rollback_error})."
            )),
        };
    }

    if backup_application.exists() {
        let _ = fs::remove_dir_all(backup_application);
    }
    if staging_root.exists() {
        let _ = fs::remove_dir_all(staging_root);
    }
    Ok(())
}

#[tauri::command]
async fn copy_code_session(
    app: AppHandle,
    request: CopyCodeSessionRequest,
) -> Result<DashboardState, String> {
    let worker_app = app.clone();
    tauri::async_runtime::spawn_blocking(move || copy_code_session_sync(&worker_app, request))
        .await
        .map_err(|error| format!("La transferencia terminó inesperadamente: {error}"))??;
    dashboard_from(&app)
}

#[tauri::command]
async fn unlink_code_session(
    app: AppHandle,
    request: UnlinkCodeSessionRequest,
) -> Result<DashboardState, String> {
    let worker_app = app.clone();
    tauri::async_runtime::spawn_blocking(move || unlink_code_session_sync(&worker_app, request))
        .await
        .map_err(|error| format!("La desvinculación terminó inesperadamente: {error}"))??;
    dashboard_from(&app)
}

fn create_instance_sync(app: &AppHandle, request: CreateInstanceRequest) -> Result<(), String> {
    let paths = ManagedPaths::resolve(app)?;
    let mut registry = load_registry(&paths)?;
    let name = validate_name(&request.name)?;

    if registry
        .instances
        .iter()
        .any(|instance| instance.name.eq_ignore_ascii_case(&name))
    {
        return Err("Ya existe una instancia con ese nombre.".to_string());
    }

    let source = request
        .source_path
        .filter(|value| !value.trim().is_empty())
        .map(PathBuf::from)
        .or_else(detect_provider_source)
        .ok_or_else(|| {
            "No se encontró una aplicación compatible. Instálala o indica su ruta manualmente."
                .to_string()
        })?;
    validate_source(&source)?;

    let id = Uuid::new_v4().to_string();
    let instance_root = paths.root_for(&id)?;
    let profile_path = instance_root.join("profile");
    fs::create_dir_all(&profile_path)
        .map_err(|error| format!("No se pudo crear el perfil independiente: {error}"))?;

    let app_path = match copy_provider_application(&source, &instance_root)
        .and_then(|path| personalize_application_path(&path, &name))
    {
        Ok(path) => path,
        Err(error) => {
            let _ = fs::remove_dir_all(&instance_root);
            return Err(error);
        }
    };

    registry.instances.push(ManagedInstance {
        id,
        name,
        account_label: None,
        avatar_url: None,
        plan: AccountPlan::Unknown,
        source_version: source_version(&source),
        app_path: app_path.to_string_lossy().to_string(),
        profile_path: profile_path.to_string_lossy().to_string(),
        created_at: Utc::now().to_rfc3339(),
        last_launched_at: None,
        pid: None,
        status: InstanceStatus::Stopped,
        usage: None,
        code_sessions: Vec::new(),
    });
    save_registry(&paths, &registry)
}

#[tauri::command]
fn update_instance(
    app: AppHandle,
    request: UpdateInstanceRequest,
) -> Result<DashboardState, String> {
    let paths = ManagedPaths::resolve(&app)?;
    let mut registry = load_registry(&paths)?;
    let name = validate_name(&request.name)?;
    if registry
        .instances
        .iter()
        .any(|instance| instance.id != request.id && instance.name.eq_ignore_ascii_case(&name))
    {
        return Err("Ya existe una instancia con ese nombre.".to_string());
    }
    refresh_instance_statuses(&mut registry);
    let instance = registry
        .instances
        .iter_mut()
        .find(|instance| instance.id == request.id)
        .ok_or_else(|| "La instancia ya no existe.".to_string())?;
    instance.name = name;
    refresh_instance_bundle_names(&mut registry);
    save_registry(&paths, &registry)?;
    dashboard_from(&app)
}

#[tauri::command]
fn launch_instance(app: AppHandle, id: String) -> Result<DashboardState, String> {
    let paths = ManagedPaths::resolve(&app)?;
    let mut registry = load_registry(&paths)?;
    refresh_registry(&mut registry);
    let instance = registry
        .instances
        .iter_mut()
        .find(|instance| instance.id == id)
        .ok_or_else(|| "La instancia ya no existe.".to_string())?;

    if instance.status == InstanceStatus::Running {
        return dashboard_from(&app);
    }
    let app_path = PathBuf::from(&instance.app_path);
    let executable = provider_executable(&app_path);
    if !executable.is_file() {
        return Err("La aplicación de esta instancia no está disponible.".to_string());
    }
    let profile_path = PathBuf::from(&instance.profile_path);
    fs::create_dir_all(&profile_path)
        .map_err(|error| format!("No se pudo preparar el perfil: {error}"))?;

    let mut command = Command::new(&executable);
    command
        .arg(format!(
            "--user-data-dir={}",
            profile_path.to_string_lossy()
        ))
        .env("CODE_AI_PROFILES_INSTANCE_ID", &instance.id);
    #[cfg(target_os = "linux")]
    {
        use std::os::unix::process::CommandExt;
        command.process_group(0);
    }
    let child = command
        .spawn()
        .map_err(|error| format!("No se pudo iniciar la aplicación: {error}"))?;

    instance.pid = Some(child.id());
    instance.status = InstanceStatus::Running;
    instance.last_launched_at = Some(Utc::now().to_rfc3339());
    save_registry(&paths, &registry)?;
    dashboard_from(&app)
}

#[tauri::command]
fn stop_instance(app: AppHandle, id: String) -> Result<DashboardState, String> {
    let paths = ManagedPaths::resolve(&app)?;
    let mut registry = load_registry(&paths)?;
    refresh_registry(&mut registry);
    let instance = registry
        .instances
        .iter_mut()
        .find(|instance| instance.id == id)
        .ok_or_else(|| "La instancia ya no existe.".to_string())?;

    if let Some(pid) = instance.pid {
        stop_process(pid)?;
    }
    instance.pid = None;
    instance.status = InstanceStatus::Stopped;
    save_registry(&paths, &registry)?;
    dashboard_from(&app)
}

fn stop_process(pid: u32) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        let group_result = unsafe { libc::kill(-(pid as i32), libc::SIGTERM) };
        if group_result == 0 {
            return Ok(());
        }
        let group_error = std::io::Error::last_os_error();
        if group_error.raw_os_error() != Some(libc::ESRCH) {
            return Err(format!(
                "No se pudo detener el grupo de procesos {pid}: {group_error}"
            ));
        }
        let process_result = unsafe { libc::kill(pid as i32, libc::SIGTERM) };
        if process_result != 0 {
            let error = std::io::Error::last_os_error();
            if error.raw_os_error() != Some(libc::ESRCH) {
                return Err(format!("No se pudo detener el proceso {pid}: {error}"));
            }
        }
        Ok(())
    }

    #[cfg(all(unix, not(target_os = "linux")))]
    {
        let result = unsafe { libc::kill(pid as i32, libc::SIGTERM) };
        if result != 0 {
            let error = std::io::Error::last_os_error();
            if error.raw_os_error() != Some(libc::ESRCH) {
                return Err(format!("No se pudo detener el proceso {pid}: {error}"));
            }
        }
        Ok(())
    }

    #[cfg(target_os = "windows")]
    {
        let status = Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T"])
            .status()
            .map_err(|error| format!("No se pudo solicitar el cierre de la aplicación: {error}"))?;
        if status.success() {
            Ok(())
        } else {
            Err(format!("Windows no pudo detener el proceso {pid}."))
        }
    }

    #[cfg(not(any(unix, target_os = "windows")))]
    {
        let _ = pid;
        Err("Detener procesos no está soportado en esta plataforma.".to_string())
    }
}

#[tauri::command]
fn open_instance_folder(app: AppHandle, id: String) -> Result<(), String> {
    let paths = ManagedPaths::resolve(&app)?;
    let registry = load_registry(&paths)?;
    let instance = registry
        .instances
        .iter()
        .find(|instance| instance.id == id)
        .ok_or_else(|| "La instancia ya no existe.".to_string())?;
    let profile = PathBuf::from(&instance.profile_path);
    if !profile.exists() {
        return Err("La carpeta del perfil ya no existe.".to_string());
    }

    #[cfg(target_os = "macos")]
    let mut command = Command::new("/usr/bin/open");
    #[cfg(target_os = "windows")]
    let mut command = Command::new("explorer.exe");
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    let mut command = Command::new("xdg-open");

    command
        .arg(profile)
        .spawn()
        .map_err(|error| format!("No se pudo abrir la carpeta: {error}"))?;
    Ok(())
}

#[tauri::command]
fn delete_instance(app: AppHandle, id: String) -> Result<DashboardState, String> {
    let paths = ManagedPaths::resolve(&app)?;
    let root = paths.root_for(&id)?;
    let mut registry = load_registry(&paths)?;
    let session_links = load_session_links(&paths)?;
    refresh_registry(&mut registry);
    let position = registry
        .instances
        .iter()
        .position(|instance| instance.id == id)
        .ok_or_else(|| "La instancia ya no existe.".to_string())?;
    if registry.instances[position].status == InstanceStatus::Running {
        return Err("Detén la instancia antes de eliminarla.".to_string());
    }
    if session_links
        .links
        .iter()
        .any(|link| link.origin_instance_id == id || link.linked_instance_id == id)
    {
        return Err(
            "Esta instancia participa en sesiones vinculadas. Desvincúlalas o devuélvelas a su origen antes de eliminarla."
                .to_string(),
        );
    }

    if root.exists() {
        fs::remove_dir_all(&root)
            .map_err(|error| format!("No se pudieron borrar los datos de la instancia: {error}"))?;
    }
    registry.instances.remove(position);
    save_registry(&paths, &registry)?;
    dashboard_from(&app)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle().clone();
            ManagedPaths::resolve(&handle).map_err(std::io::Error::other)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_dashboard_state,
            scan_system,
            create_instance,
            update_instance,
            update_instance_application,
            copy_code_session,
            unlink_code_session,
            launch_instance,
            stop_instance,
            open_instance_folder,
            delete_instance
        ])
        .run(tauri::generate_context!())
        .expect("error while running Code AI Profiles");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_instance_names() {
        assert_eq!(validate_name("  Work  ").unwrap(), "Work");
        assert!(validate_name("  ").is_err());
        assert!(validate_name(&"a".repeat(65)).is_err());
        assert!(validate_name("line\nbreak").is_err());
    }

    #[test]
    fn parses_only_safe_code_session_fields() {
        let session = parse_code_session(
            br#"{"sessionId":"session-1","title":"  Dashboard refactor  ","model":"claude-sonnet","effort":"high","completedTurns":12,"createdAt":1000,"lastActivityAt":2000,"isArchived":false,"promptSuggestion":"sensitive","remoteMcpServersConfig":{"secret":"ignored"}}"#,
            "fallback",
        )
        .expect("session should parse");
        assert_eq!(session.id, "session-1");
        assert_eq!(session.title, "Dashboard refactor");
        assert_eq!(session.completed_turns, 12);
        assert_eq!(session.last_activity_at, Some(2000));
        assert!(!session.is_archived);
    }

    #[test]
    fn reads_latest_main_context_without_exposing_transcript_content() {
        let root = env::temp_dir().join(format!("code-ai-context-test-{}", Uuid::new_v4()));
        let transcript = root.join("session.jsonl");
        fs::create_dir_all(&root).unwrap();
        fs::write(
            &transcript,
            concat!(
                "{\"isSidechain\":false,\"message\":{\"model\":\"claude-sonnet-4-6\",\"content\":\"private\",\"usage\":{\"input_tokens\":5,\"cache_creation_input_tokens\":15000,\"cache_read_input_tokens\":105000,\"iterations\":[{\"input_tokens\":5,\"cache_creation_input_tokens\":15000,\"cache_read_input_tokens\":105000}]}}}\n",
                "{\"isSidechain\":true,\"message\":{\"model\":\"claude-opus-4-8\",\"usage\":{\"input_tokens\":900000}}}\n",
                "{\"type\":\"user\",\"message\":{\"content\":\"latest private prompt\"}}\n"
            ),
        )
        .unwrap();

        let snapshot = latest_transcript_context(&transcript).unwrap();
        assert_eq!(snapshot.model.as_deref(), Some("claude-sonnet-4-6"));
        assert_eq!(snapshot.context_tokens, 120_005);
        assert_eq!(snapshot.context_window_tokens, Some(1_000_000));

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn maps_known_model_context_windows() {
        assert_eq!(context_window_for_model("claude-opus-4-8"), Some(1_000_000));
        assert_eq!(
            context_window_for_model("claude-sonnet-4-6"),
            Some(1_000_000)
        );
        assert_eq!(
            context_window_for_model("claude-haiku-4-5-20251001"),
            Some(200_000)
        );
        assert_eq!(context_window_for_model("custom-model"), None);
    }

    #[test]
    fn normalizes_linux_package_and_binary_versions() {
        assert_eq!(
            normalize_linux_version("1.22209.0-1\n").as_deref(),
            Some("1.22209.0-1")
        );
        assert_eq!(
            normalize_linux_version("Claude Desktop 1.22300.4 (stable)").as_deref(),
            Some("1.22300.4")
        );
        assert_eq!(normalize_linux_version("Claude Desktop"), None);
    }

    #[cfg(unix)]
    #[test]
    fn recognizes_the_official_linux_electron_layout_through_a_symlink() {
        use std::os::unix::fs::symlink;

        let root = env::temp_dir().join(format!("code-ai-linux-layout-{}", Uuid::new_v4()));
        let installation = root.join("usr/lib/claude-desktop");
        let executable = installation.join("claude-desktop");
        let launcher = root.join("usr/bin/claude-desktop");
        fs::create_dir_all(installation.join("resources")).unwrap();
        fs::create_dir_all(launcher.parent().unwrap()).unwrap();
        fs::write(&executable, b"electron").unwrap();
        symlink(&executable, &launcher).unwrap();

        let (detected_root, detected_executable) =
            linux_provider_installation(&launcher).expect("Linux layout should be detected");
        assert_eq!(detected_root, installation.canonicalize().unwrap());
        assert_eq!(detected_executable, executable.canonicalize().unwrap());

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn clears_context_after_compaction_until_the_next_response() {
        let root = env::temp_dir().join(format!("code-ai-compact-test-{}", Uuid::new_v4()));
        let transcript = root.join("session.jsonl");
        fs::create_dir_all(&root).unwrap();
        fs::write(
            &transcript,
            concat!(
                "{\"isSidechain\":false,\"message\":{\"model\":\"claude-opus-4-8\",\"usage\":{\"input_tokens\":5,\"cache_read_input_tokens\":820000}}}\n",
                "{\"type\":\"system\",\"subtype\":\"compact_boundary\",\"isSidechain\":false,\"compactMetadata\":{\"preTokens\":820005,\"postTokens\":12000}}\n"
            ),
        )
        .unwrap();
        assert_eq!(latest_transcript_context(&transcript), None);

        fs::write(
            &transcript,
            concat!(
                "{\"isSidechain\":false,\"message\":{\"model\":\"claude-opus-4-8\",\"usage\":{\"input_tokens\":5,\"cache_read_input_tokens\":820000}}}\n",
                "{\"type\":\"system\",\"subtype\":\"compact_boundary\",\"isSidechain\":false}\n",
                "{\"isSidechain\":false,\"message\":{\"model\":\"claude-opus-4-8\",\"usage\":{\"input_tokens\":3,\"cache_creation_input_tokens\":2000,\"cache_read_input_tokens\":18000}}}\n"
            ),
        )
        .unwrap();
        let snapshot = latest_transcript_context(&transcript).unwrap();
        assert_eq!(snapshot.context_tokens, 20_003);

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn atomically_creates_and_replaces_session_index() {
        let root = env::temp_dir().join(format!("code-ai-profiles-test-{}", Uuid::new_v4()));
        let destination = root.join("account/org/local_session.json");

        atomic_replace_file(&destination, br#"{"version":1}"#).expect("index should be created");
        assert_eq!(fs::read(&destination).unwrap(), br#"{"version":1}"#);

        atomic_replace_file(&destination, br#"{"version":2}"#).expect("index should be replaced");
        assert_eq!(fs::read(&destination).unwrap(), br#"{"version":2}"#);

        fs::remove_dir_all(root).expect("temporary test directory should be removable");
    }

    #[test]
    fn compares_provider_versions_numerically() {
        assert!(version_is_newer("1.22300.0", Some("1.22209.0")));
        assert!(version_is_newer("2.0", Some("1.99999.99")));
        assert!(version_is_newer("1.2.0", None));
        assert!(!version_is_newer("1.10.0", Some("1.10")));
        assert!(!version_is_newer("1.9.9", Some("1.10.0")));
    }

    #[test]
    fn accepts_uuid_and_local_prefixed_session_ids() {
        let uuid = "96812ba4-6864-40d5-a70a-0470f244022c";
        assert_eq!(canonical_code_session_id(uuid).as_deref(), Some(uuid));
        assert_eq!(
            canonical_code_session_id(&format!("local_{uuid}")).as_deref(),
            Some("local_96812ba4-6864-40d5-a70a-0470f244022c")
        );
        assert!(canonical_code_session_id("local_not-a-uuid").is_none());
        assert!(canonical_code_session_id("../../session").is_none());
    }

    #[test]
    fn creates_safe_instance_bundle_names() {
        assert_eq!(instance_bundle_name("Work Profile"), "Work Profile.app");
        assert_eq!(instance_bundle_name("Cliente/A: B"), "Cliente-A- B.app");
        assert_eq!(instance_bundle_name("..."), "Code AI Profile.app");
    }

    #[test]
    fn tracks_copy_move_and_return_session_lineage() {
        let mut links = SessionLinkRegistry::default();
        let session_id = "local_96812ba4-6864-40d5-a70a-0470f244022c";

        update_session_links_after_transfer(
            &mut links,
            session_id,
            "work-profile",
            "personal-profile",
            SessionTransferMode::Copy,
        );
        assert_eq!(links.links.len(), 1);
        assert_eq!(links.links[0].origin_instance_id, "work-profile");
        assert_eq!(links.links[0].mode, SessionTransferMode::Copy);

        update_session_links_after_transfer(
            &mut links,
            session_id,
            "work-profile",
            "personal-profile",
            SessionTransferMode::Move,
        );
        assert_eq!(links.links.len(), 1);
        assert_eq!(links.links[0].mode, SessionTransferMode::Move);

        update_session_links_after_transfer(
            &mut links,
            session_id,
            "personal-profile",
            "work-profile",
            SessionTransferMode::Move,
        );
        assert!(links.links.is_empty());

        update_session_links_after_transfer(
            &mut links,
            session_id,
            ORIGINAL_INSTANCE_ID,
            "work-profile",
            SessionTransferMode::Move,
        );
        assert_eq!(links.links.len(), 1);
        assert_eq!(links.links[0].origin_instance_id, ORIGINAL_INSTANCE_ID);
        assert_eq!(links.links[0].linked_instance_id, "work-profile");

        update_session_links_after_transfer(
            &mut links,
            session_id,
            "work-profile",
            ORIGINAL_INSTANCE_ID,
            SessionTransferMode::Move,
        );
        assert!(links.links.is_empty());
    }

    #[test]
    fn migrates_existing_round_trip_as_a_link_to_the_original() {
        let root = env::temp_dir().join(format!("code-ai-profiles-links-test-{}", Uuid::new_v4()));
        let backups = root.join("session-transfer-backups");
        let paths = ManagedPaths {
            app_data: root.clone(),
            instances: root.join("managed-instances"),
            registry: root.join("instances.json"),
            session_backups: backups.clone(),
            session_links: root.join("session-links.json"),
        };
        let session_id = "local_96812ba4-6864-40d5-a70a-0470f244022c";
        let manifest = |transfer_id: &str, created_at: &str, source_id: &str, target_id: &str| {
            SessionTransferManifest {
                transfer_id: transfer_id.to_string(),
                created_at: created_at.to_string(),
                session_id: session_id.to_string(),
                session_title: "QLEO-PROJECT".to_string(),
                source_instance_id: source_id.to_string(),
                source_instance_name: source_id.to_string(),
                target_instance_id: target_id.to_string(),
                target_instance_name: target_id.to_string(),
                source_index: String::new(),
                target_index: String::new(),
                transcript: String::new(),
                replaced_existing_target: false,
                mode: SessionTransferMode::Copy,
            }
        };
        let outbound = backups.join("01-outbound");
        let returned = backups.join("02-returned");
        fs::create_dir_all(&outbound).unwrap();
        fs::create_dir_all(&returned).unwrap();
        fs::write(
            outbound.join("manifest.json"),
            serde_json::to_vec(&manifest(
                "first",
                "2026-07-19T08:11:00Z",
                "work-profile",
                "personal-profile",
            ))
            .unwrap(),
        )
        .unwrap();
        fs::write(
            returned.join("manifest.json"),
            serde_json::to_vec(&manifest(
                "second",
                "2026-07-19T08:12:00Z",
                "personal-profile",
                "work-profile",
            ))
            .unwrap(),
        )
        .unwrap();

        let migrated = migrate_session_links(&paths);
        assert_eq!(migrated.links.len(), 1);
        assert_eq!(migrated.links[0].origin_instance_id, "work-profile");
        assert_eq!(migrated.links[0].linked_instance_id, "personal-profile");
        assert_eq!(migrated.links[0].mode, SessionTransferMode::Copy);

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn annotates_a_session_linked_inside_the_original_app() {
        let session_id = "local_96812ba4-6864-40d5-a70a-0470f244022c";
        let mut sessions = vec![CodeSession {
            id: session_id.to_string(),
            title: "QLEO-PROJECT".to_string(),
            model: None,
            effort: None,
            completed_turns: 0,
            created_at: None,
            last_activity_at: None,
            is_archived: false,
            context_tokens: None,
            context_window_tokens: None,
            context_percent: None,
            transfer: None,
            cli_session_id: None,
        }];
        let links = SessionLinkRegistry {
            version: REGISTRY_VERSION,
            links: vec![SessionLink {
                id: "link-1".to_string(),
                session_id: session_id.to_string(),
                origin_instance_id: "work-profile".to_string(),
                linked_instance_id: ORIGINAL_INSTANCE_ID.to_string(),
                mode: SessionTransferMode::Copy,
                created_at: "2026-07-19T08:11:00Z".to_string(),
                updated_at: "2026-07-19T08:11:00Z".to_string(),
            }],
        };

        apply_session_links_to_profile(&mut sessions, ORIGINAL_INSTANCE_ID, &links);

        let transfer = sessions[0].transfer.as_ref().unwrap();
        assert_eq!(transfer.origin_instance_id, "work-profile");
        assert_eq!(transfer.mode, SessionTransferMode::Copy);
    }

    #[test]
    fn swaps_and_rolls_back_application_directory() {
        let operation_id = Uuid::new_v4();
        let root = env::temp_dir().join(format!("code-ai-profiles-update-test-{operation_id}"));
        let destination = root.join("application");
        let staged = root.join("staged-application");
        let backup = root.join("backup-application");
        fs::create_dir_all(&destination).unwrap();
        fs::create_dir_all(&staged).unwrap();
        fs::write(destination.join("version.txt"), "old").unwrap();
        fs::write(staged.join("version.txt"), "new").unwrap();

        let had_previous = swap_application_directory(&staged, &destination, &backup).unwrap();
        assert!(had_previous);
        assert_eq!(
            fs::read_to_string(destination.join("version.txt")).unwrap(),
            "new"
        );

        rollback_application_directory(&destination, &backup, had_previous, operation_id).unwrap();
        assert_eq!(
            fs::read_to_string(destination.join("version.txt")).unwrap(),
            "old"
        );

        fs::remove_dir_all(root).unwrap();
    }
}
