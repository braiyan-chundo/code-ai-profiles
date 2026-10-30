use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    collections::{HashMap, HashSet},
    env, fs,
    fs::File,
    hash::{DefaultHasher, Hash, Hasher},
    io::{Cursor, Read, Seek, SeekFrom},
    path::{Path, PathBuf},
    process::{Child, Command},
    sync::{Mutex, OnceLock},
    thread,
    time::{Duration, Instant},
};
use sysinfo::{Pid, ProcessRefreshKind, ProcessesToUpdate, RefreshKind, System, UpdateKind};
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};
use uuid::Uuid;

mod config;
mod contract;
#[cfg(target_os = "macos")]
mod macos_icon;
mod official_release;
mod original_update;
mod platform;
mod processes;
mod projects;
mod storage;
#[cfg(test)]
mod test_support;
mod versions;

use contract::*;
use platform::*;
use processes::*;
use storage::*;
use versions::*;

const ICON_MAX_BYTES: usize = 5 * 1024 * 1024;
const ICON_MAX_DIMENSION: u32 = 4096;
const ARTIFACT_EXPORT_MAX_FILES: usize = 256;
const ARTIFACT_EXPORT_MAX_BYTES: u64 = 256 * 1024 * 1024;
const MANAGED_BYTES_CACHE_TTL: Duration = Duration::from_secs(30);
#[cfg(not(target_os = "macos"))]
const DOCK_ICON_MACOS_ONLY: &str = "El icono del Dock solo se aplica en macOS.";

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
    #[serde(default, deserialize_with = "deserialize_collection_count")]
    published_artifacts: u64,
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
    artifacts: Option<HashMap<String, ArtifactMonitorEntry>>,
}

#[derive(Debug, Deserialize)]
struct ArtifactMonitorEntry {
    state: Option<String>,
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

fn deserialize_collection_count<'de, D>(deserializer: D) -> Result<u64, D::Error>
where
    D: serde::Deserializer<'de>,
{
    struct CollectionCountVisitor;

    impl<'de> serde::de::Visitor<'de> for CollectionCountVisitor {
        type Value = u64;

        fn expecting(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            formatter.write_str("an artifact array or object")
        }

        fn visit_none<E>(self) -> Result<Self::Value, E> {
            Ok(0)
        }

        fn visit_unit<E>(self) -> Result<Self::Value, E> {
            Ok(0)
        }

        fn visit_seq<A>(self, mut sequence: A) -> Result<Self::Value, A::Error>
        where
            A: serde::de::SeqAccess<'de>,
        {
            let mut count = 0_u64;
            while sequence.next_element::<serde::de::IgnoredAny>()?.is_some() {
                count = count.saturating_add(1);
            }
            Ok(count)
        }

        fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
        where
            A: serde::de::MapAccess<'de>,
        {
            let mut count = 0_u64;
            while map
                .next_entry::<serde::de::IgnoredAny, serde::de::IgnoredAny>()?
                .is_some()
            {
                count = count.saturating_add(1);
            }
            Ok(count)
        }
    }

    deserializer.deserialize_any(CollectionCountVisitor)
}

#[derive(Debug, PartialEq)]
struct SessionContextSnapshot {
    model: Option<String>,
    context_tokens: u64,
    context_window_tokens: Option<u64>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct RefreshScope {
    processes: bool,
    bundle_names: bool,
    versions: bool,
    usage: bool,
    sessions: bool,
    topology: bool,
    storage: bool,
    force_storage: bool,
}

impl RefreshScope {
    const FULL: Self = Self {
        processes: true,
        bundle_names: true,
        versions: true,
        usage: true,
        sessions: true,
        topology: true,
        storage: true,
        force_storage: false,
    };
    const FULL_SCAN: Self = Self {
        force_storage: true,
        ..Self::FULL
    };
    const LIGHT: Self = Self {
        processes: true,
        bundle_names: false,
        versions: false,
        usage: true,
        sessions: false,
        topology: false,
        storage: false,
        force_storage: false,
    };
    const SESSIONS: Self = Self {
        sessions: true,
        ..Self::LIGHT
    };
    const VERSIONS: Self = Self {
        processes: true,
        bundle_names: false,
        versions: true,
        usage: false,
        sessions: false,
        topology: true,
        storage: false,
        force_storage: false,
    };
}

#[cfg(test)]
#[derive(Debug, Clone, Default, PartialEq, Eq)]
struct RefreshWorkCounters {
    process_inventories: usize,
    transcript_catalogs: usize,
    version_refreshes: usize,
    usage_refreshes: usize,
    topology_builds: usize,
    storage_walks: usize,
}

#[cfg(test)]
thread_local! {
    static REFRESH_WORK_COUNTERS: std::cell::RefCell<RefreshWorkCounters> =
        std::cell::RefCell::new(RefreshWorkCounters::default());
}

#[cfg(test)]
fn record_refresh_work(update: impl FnOnce(&mut RefreshWorkCounters)) {
    REFRESH_WORK_COUNTERS.with(|counters| update(&mut counters.borrow_mut()));
}

#[cfg(test)]
fn reset_refresh_work_counters() {
    REFRESH_WORK_COUNTERS.with(|counters| *counters.borrow_mut() = RefreshWorkCounters::default());
}

#[cfg(test)]
fn refresh_work_counters() -> RefreshWorkCounters {
    REFRESH_WORK_COUNTERS.with(|counters| counters.borrow().clone())
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

fn resolve_transfer_profile(
    registry: &Registry,
    id: &str,
    inventory: &ProcessInventory,
) -> Result<TransferProfile, String> {
    if id == ORIGINAL_INSTANCE_ID {
        let profile_path = detect_original_profile().ok_or_else(|| {
            "No se encontró el perfil local de la aplicación original.".to_string()
        })?;
        return Ok(TransferProfile {
            id: ORIGINAL_INSTANCE_ID.to_string(),
            name: "Aplicación original".to_string(),
            profile_path,
            status: original_instance_status_with_inventory(inventory),
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

fn copy_provider_application(source: &Path, instance_root: &Path) -> Result<PathBuf, String> {
    let application_root = instance_root.join("application");
    fs::create_dir_all(&application_root)
        .map_err(|error| format!("No se pudo crear el directorio de la aplicación: {error}"))?;

    copy_provider_bundle(source, &application_root)
}

/// A fresh copy never keeps the Finder icon of its source (HU-0020, A-4.3). Only macOS has one.
fn strip_inherited_icon_after_copy(app_path: PathBuf) -> Result<PathBuf, String> {
    #[cfg(target_os = "macos")]
    macos_icon::strip_inherited_icon(&app_path)
        .map_err(|error| format!("No se pudo quitar el icono heredado de la copia: {error}"))?;
    Ok(app_path)
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
        published_artifact_count: document.published_artifacts,
        artifact_monitor: None,
        transfer: None,
        cli_session_id: document
            .cli_session_id
            .and_then(|value| Uuid::parse_str(value.trim()).ok())
            .map(|value| value.to_string()),
    })
}

fn clean_monitor_state(value: Option<String>) -> Option<String> {
    value.and_then(|value| {
        let normalized = value.trim().to_ascii_lowercase();
        matches!(
            normalized.as_str(),
            "armed" | "active" | "paused" | "stopped" | "error"
        )
        .then_some(normalized)
    })
}

fn latest_artifact_monitor(path: &Path) -> Option<ArtifactMonitorSummary> {
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
        if entry.is_sidechain || entry.entry_type.as_deref() != Some("artifact-comment-monitor") {
            continue;
        }
        let artifacts = entry.artifacts.unwrap_or_default();
        let mut states = artifacts
            .values()
            .filter_map(|artifact| clean_monitor_state(artifact.state.clone()))
            .collect::<HashSet<_>>();
        let state = if states.len() == 1 {
            states.drain().next()
        } else if states.len() > 1 {
            Some("mixed".to_string())
        } else {
            None
        };
        return Some(ArtifactMonitorSummary {
            monitor_type: "artifact-comment-monitor".to_string(),
            state,
            artifact_count: artifacts.len() as u64,
        });
    }
    None
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

fn contains_model_alias(model: &str, alias: &str) -> bool {
    model.match_indices(alias).any(|(start, _)| {
        let end = start + alias.len();
        (start == 0 || model.as_bytes()[start - 1] == b'-')
            && (end == model.len() || model.as_bytes()[end] == b'-')
    })
}

fn context_window_for_model(model: &str) -> Option<u64> {
    let model = model
        .to_ascii_lowercase()
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() {
                character
            } else {
                '-'
            }
        })
        .collect::<String>();
    let extended_context = [
        "fable-5",
        "mythos-5",
        "mythos-preview",
        "opus-5",
        "opus-4-8",
        "opus-4-7",
        "opus-4-6",
        "sonnet-5",
        "sonnet-4-6",
    ];
    if extended_context
        .iter()
        .any(|candidate| contains_model_alias(&model, candidate))
    {
        return Some(1_000_000);
    }
    let standard_context = [
        "opus-4-5",
        "opus-4-1",
        "opus-4-0",
        "opus-4-20250514",
        "3-opus",
        "claude-2-1",
        "claude-2-0",
        "claude-2",
        "claude-1-3",
        "claude-1-2",
        "claude-1-0",
        "claude-instant-1",
        "sonnet-4-5",
        "sonnet-4-0",
        "sonnet-4-20250514",
        "3-7-sonnet",
        "3-5-sonnet",
        "3-sonnet",
        "haiku-4-5",
        "3-5-haiku",
        "3-haiku",
    ];
    standard_context
        .iter()
        .any(|candidate| contains_model_alias(&model, candidate))
        .then_some(200_000)
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
        session.artifact_monitor = session
            .cli_session_id
            .as_ref()
            .and_then(|id| transcripts.get(id))
            .and_then(|path| latest_artifact_monitor(path));
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

fn published_artifacts(document: &Value) -> Option<Value> {
    document
        .get("publishedArtifacts")
        .filter(|value| value.is_array() || value.is_object())
        .cloned()
}

fn session_index_for_target(
    mut source_document: Value,
    target_artifacts: Option<Value>,
) -> Result<Vec<u8>, String> {
    let object = source_document
        .as_object_mut()
        .ok_or_else(|| "El índice de la sesión no tiene un formato válido.".to_string())?;
    object.remove("publishedArtifacts");
    if let Some(artifacts) = target_artifacts {
        object.insert("publishedArtifacts".to_string(), artifacts);
    }
    serde_json::to_vec_pretty(&source_document)
        .map_err(|error| format!("No se pudo preparar el índice sanitizado: {error}"))
}

fn restored_origin_artifacts(
    backup_root: &Path,
    session_id: &str,
    origin_instance_id: &str,
) -> Option<Value> {
    let mut directories = fs::read_dir(backup_root)
        .ok()?
        .flatten()
        .filter_map(|entry| {
            let path = entry.path();
            let metadata = fs::symlink_metadata(&path).ok()?;
            (metadata.is_dir() && !metadata.file_type().is_symlink()).then_some(path)
        })
        .collect::<Vec<_>>();
    directories.sort_by(|left, right| right.file_name().cmp(&left.file_name()));

    for directory in directories {
        let manifest_path = directory.join("manifest.json");
        let index_path = directory.join("source-index.json");
        let valid_file = |path: &Path| {
            fs::symlink_metadata(path)
                .ok()
                .filter(|metadata| metadata.is_file() && !metadata.file_type().is_symlink())
                .map(|metadata| metadata.len() <= 1024 * 1024)
                .unwrap_or(false)
        };
        if !valid_file(&manifest_path) || !valid_file(&index_path) {
            continue;
        }
        let Ok(manifest) =
            serde_json::from_slice::<SessionTransferManifest>(&fs::read(&manifest_path).ok()?)
        else {
            continue;
        };
        if manifest.session_id != session_id || manifest.source_instance_id != origin_instance_id {
            continue;
        }
        let Ok(document) = serde_json::from_slice::<Value>(&fs::read(index_path).ok()?) else {
            continue;
        };
        if let Some(artifacts) = published_artifacts(&document) {
            return Some(artifacts);
        }
    }
    None
}

fn artifact_export_roots(profile_path: &Path, session_id: &str) -> Vec<PathBuf> {
    [
        profile_path.join("artifacts").join(session_id),
        profile_path.join("claude-code-artifacts").join(session_id),
        profile_path
            .join("claude-code-sessions")
            .join("artifacts")
            .join(session_id),
    ]
    .into_iter()
    .filter(|path| path.exists())
    .collect()
}

fn artifact_reference_count(value: Option<&Value>) -> u64 {
    match value {
        Some(Value::Array(items)) => items.len() as u64,
        Some(Value::Object(items)) => items.len() as u64,
        _ => 0,
    }
}

fn collect_opaque_artifact_files(
    root: &Path,
    directory: &Path,
    depth: usize,
    entries_seen: &mut usize,
    files: &mut Vec<PathBuf>,
    total_bytes: &mut u64,
) -> Result<(), String> {
    if depth > 12 {
        return Err("La exportación local supera el límite de profundidad.".to_string());
    }
    *entries_seen = entries_seen.saturating_add(1);
    if *entries_seen > ARTIFACT_EXPORT_MAX_FILES * 2 {
        return Err("La exportación local supera el límite de entradas.".to_string());
    }
    let canonical_root = fs::canonicalize(root)
        .map_err(|_| "No se pudo validar el root local de artefactos.".to_string())?;
    let metadata = fs::symlink_metadata(directory)
        .map_err(|error| format!("No se pudo validar un artefacto local: {error}"))?;
    if metadata.file_type().is_symlink() {
        return Err(
            "Se omitió un artefacto local porque contiene un enlace simbólico.".to_string(),
        );
    }
    if metadata.is_file() {
        let canonical = fs::canonicalize(directory)
            .map_err(|_| "No se pudo canonicalizar un artefacto local.".to_string())?;
        if !canonical.starts_with(&canonical_root) {
            return Err("Se rechazó un artefacto local fuera del root permitido.".to_string());
        }
        if files.len() >= ARTIFACT_EXPORT_MAX_FILES {
            return Err("La exportación local supera el límite de archivos.".to_string());
        }
        *total_bytes = total_bytes.saturating_add(metadata.len());
        if *total_bytes > ARTIFACT_EXPORT_MAX_BYTES {
            return Err("La exportación local supera el límite de tamaño.".to_string());
        }
        files.push(directory.to_path_buf());
        return Ok(());
    }
    if !metadata.is_dir() {
        return Err("Se rechazó un artefacto local de tipo especial.".to_string());
    }
    for entry in fs::read_dir(directory)
        .map_err(|error| format!("No se pudo enumerar un artefacto local: {error}"))?
    {
        let entry =
            entry.map_err(|error| format!("No se pudo leer un artefacto local: {error}"))?;
        collect_opaque_artifact_files(
            root,
            &entry.path(),
            depth + 1,
            entries_seen,
            files,
            total_bytes,
        )?;
    }
    Ok(())
}

fn export_local_artifacts(
    paths: &ManagedPaths,
    profile_path: &Path,
    session_id: &str,
    transfer_id: &str,
    include: bool,
    remote_references_omitted: u64,
    monitors_omitted: u64,
) -> ArtifactTransferOutcome {
    let mut outcome = ArtifactTransferOutcome {
        remote_references_omitted,
        monitors_omitted,
        ..ArtifactTransferOutcome::default()
    };
    if !include {
        outcome
            .warnings
            .push("No se solicitaron copias locales de artefactos.".to_string());
        return outcome;
    }
    let roots = artifact_export_roots(profile_path, session_id);
    let mut files = Vec::new();
    let mut total_bytes = 0_u64;
    let mut entries_seen = 0_usize;
    for root in &roots {
        if let Err(error) = collect_opaque_artifact_files(
            root,
            root,
            0,
            &mut entries_seen,
            &mut files,
            &mut total_bytes,
        ) {
            outcome.warnings.push(error);
            return outcome;
        }
    }
    outcome.local_candidates = files.len() as u64;
    if files.is_empty() {
        if remote_references_omitted > 0 {
            outcome.warnings.push(
                "Solo se detectaron referencias remotas; deben publicarse de nuevo en el destino."
                    .to_string(),
            );
        }
        return outcome;
    }

    let staging = paths
        .artifact_exports
        .join(format!(".{transfer_id}.staging"));
    let destination = paths.artifact_exports.join(transfer_id);
    if let Err(error) = fs::create_dir_all(&staging) {
        outcome
            .warnings
            .push(format!("No se pudo preparar la exportación local: {error}"));
        return outcome;
    }
    for (root_index, root) in roots.iter().enumerate() {
        for file in files.iter().filter(|file| file.starts_with(root)) {
            let safe_to_copy = fs::symlink_metadata(file)
                .ok()
                .filter(|metadata| metadata.is_file() && !metadata.file_type().is_symlink())
                .and_then(|_| fs::canonicalize(file).ok())
                .zip(fs::canonicalize(root).ok())
                .is_some_and(|(file, root)| file.starts_with(root));
            if !safe_to_copy {
                outcome.warnings.push(
                    "Una copia local cambió durante la transferencia y fue omitida.".to_string(),
                );
                continue;
            }
            let Ok(relative) = file.strip_prefix(root) else {
                continue;
            };
            let target = staging.join(root_index.to_string()).join(relative);
            let copied = target
                .parent()
                .and_then(|parent| fs::create_dir_all(parent).ok().map(|_| ()))
                .and_then(|_| fs::copy(file, &target).ok());
            if copied.is_some() {
                outcome.copied = outcome.copied.saturating_add(1);
            } else {
                outcome.warnings.push(
                    "Una copia local no pudo preservarse; el origen no fue modificado.".to_string(),
                );
            }
        }
    }
    if outcome.copied == outcome.local_candidates {
        if let Some(parent) = destination.parent() {
            let _ = fs::create_dir_all(parent);
        }
        if fs::rename(&staging, &destination).is_ok() {
            outcome.preserved_for_manual_import = outcome.copied;
            outcome.export_path = Some(format!("artifact-exports/{transfer_id}"));
            outcome.warnings.push(
                "El schema local no está confirmado: se creó una exportación opaca para importar o publicar manualmente."
                    .to_string(),
            );
        } else {
            let _ = fs::remove_dir_all(&staging);
            outcome.copied = 0;
            outcome.warnings.push(
                "No se pudo activar la exportación local; el origen quedó intacto.".to_string(),
            );
        }
    } else {
        let _ = fs::remove_dir_all(&staging);
        outcome.copied = 0;
    }
    outcome
}

fn copy_code_session_sync(
    app: &AppHandle,
    request: CopyCodeSessionRequest,
) -> Result<ArtifactTransferOutcome, String> {
    if request.source_instance_id == request.target_instance_id {
        return Err("El origen y el destino deben ser perfiles diferentes.".to_string());
    }

    let paths = ManagedPaths::resolve(app)?;
    let mut registry = load_registry(&paths)?;
    let mut session_links = load_session_links(&paths)?;
    let inventory = ProcessInventory::capture();
    refresh_instance_statuses(&mut registry, &inventory);
    let source = resolve_transfer_profile(&registry, &request.source_instance_id, &inventory)
        .map_err(|error| format!("No se pudo usar el perfil de origen: {error}"))?;
    let target = resolve_transfer_profile(&registry, &request.target_instance_id, &inventory)
        .map_err(|error| format!("No se pudo usar el perfil de destino: {error}"))?;

    if source.status != InstanceStatus::Stopped || target.status != InstanceStatus::Stopped {
        return Err(format!(
            "Detén “{}” y “{}” antes de transferir la sesión.",
            source.name, target.name
        ));
    }

    let source_profile = source.profile_path.clone();
    let target_profile = target.profile_path.clone();
    let (source_index, _index_contents, document) =
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

    let origin_instance_id = session_links
        .links
        .iter()
        .find(|link| {
            link.session_id == session_id
                && (link.origin_instance_id == source.id
                    || link.linked_instance_id == source.id
                    || link.origin_instance_id == target.id
                    || link.linked_instance_id == target.id)
        })
        .map(|link| link.origin_instance_id.clone())
        .unwrap_or_else(|| source.id.clone());
    let existing_target_artifacts = fs::read(&target_index)
        .ok()
        .and_then(|contents| serde_json::from_slice::<Value>(&contents).ok())
        .and_then(|document| published_artifacts(&document));
    let target_owned_artifacts = existing_target_artifacts.or_else(|| {
        (target.id == origin_instance_id).then(|| {
            restored_origin_artifacts(&paths.session_backups, &session_id, &origin_instance_id)
        })?
    });
    let sanitized_index = session_index_for_target(document.clone(), target_owned_artifacts)?;

    let transfer_id = Uuid::new_v4().to_string();
    let remote_artifacts = published_artifacts(&document);
    let remote_references_omitted = artifact_reference_count(remote_artifacts.as_ref());
    let monitors_omitted = latest_artifact_monitor(&transcript)
        .map(|summary| summary.artifact_count)
        .unwrap_or(0);
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
        transfer_id: transfer_id.clone(),
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

    atomic_replace_file(&target_index, &sanitized_index)?;

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
    Ok(export_local_artifacts(
        &paths,
        &source_profile,
        &session_id,
        &transfer_id,
        request.include_local_artifacts,
        remote_references_omitted,
        monitors_omitted,
    ))
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
                include_local_artifacts: true,
            },
        )
        .map(|_| ());
    }

    let mut registry = load_registry(&paths)?;
    let inventory = ProcessInventory::capture();
    refresh_instance_statuses(&mut registry, &inventory);
    let linked_instance = resolve_transfer_profile(&registry, &link.linked_instance_id, &inventory)
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

fn refresh_registry_scoped(
    registry: &mut Registry,
    scope: RefreshScope,
    inventory: Option<&ProcessInventory>,
) -> Option<HashMap<String, PathBuf>> {
    if scope.processes {
        refresh_instance_statuses(
            registry,
            inventory.expect("process inventory is required by this refresh scope"),
        );
    }
    if scope.bundle_names {
        refresh_instance_bundle_names(registry);
    }
    if scope.versions {
        #[cfg(test)]
        record_refresh_work(|counters| counters.version_refreshes += 1);
        refresh_instance_versions(registry);
    }
    if scope.usage {
        #[cfg(test)]
        record_refresh_work(|counters| counters.usage_refreshes += 1);
        refresh_instance_usage(registry);
    }
    scope.sessions.then(|| {
        #[cfg(test)]
        record_refresh_work(|counters| counters.transcript_catalogs += 1);
        let transcripts = code_transcript_catalog();
        refresh_instance_code_sessions(registry, &transcripts);
        transcripts
    })
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

fn refresh_instance_versions(registry: &mut Registry) {
    for instance in &mut registry.instances {
        let app_path = Path::new(&instance.app_path);
        if app_path.exists() {
            if let Some(version) = cached_source_version(app_path) {
                instance.source_version = Some(version);
            }
        }
    }
}

fn refresh_instance_usage(registry: &mut Registry) {
    for instance in &mut registry.instances {
        if let Some(usage) = read_usage(Path::new(&instance.profile_path)) {
            instance.usage = Some(usage);
        }
    }
}

fn refresh_instance_code_sessions(registry: &mut Registry, transcripts: &HashMap<String, PathBuf>) {
    for instance in &mut registry.instances {
        instance.code_sessions = read_code_sessions(Path::new(&instance.profile_path), transcripts);
    }
}

fn managed_bytes(paths: &ManagedPaths, force: bool) -> u64 {
    if !force {
        if let Some(value) = runtime_cache().lock().ok().and_then(|cache| {
            cache
                .managed_bytes
                .as_ref()
                .filter(|(root, captured, _)| {
                    root == &paths.instances && captured.elapsed() < MANAGED_BYTES_CACHE_TTL
                })
                .map(|(_, _, value)| *value)
        }) {
            return value;
        }
    }
    #[cfg(test)]
    record_refresh_work(|counters| counters.storage_walks += 1);
    let value = path_size(&paths.instances);
    if let Ok(mut cache) = runtime_cache().lock() {
        cache.managed_bytes = Some((paths.instances.clone(), Instant::now(), value));
    }
    value
}

fn system_info_seed(previous: Option<&SystemInfo>) -> SystemInfo {
    previous.cloned().unwrap_or_else(|| SystemInfo {
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        platform: platform_name(),
        source_path: None,
        source_name: None,
        source_version: None,
        source_update: SourceUpdateInfo::default(),
        version_topology: VersionTopology {
            latest_installed_version: None,
            latest_source: None,
            stale_instance_ids: Vec::new(),
            original_behind: false,
            can_synchronize_managed: false,
            reason: Some("Pendiente de escaneo completo.".to_string()),
        },
        original_profile_path: None,
        original_status: InstanceStatus::Missing,
        original_code_sessions: Vec::new(),
        free_bytes: None,
        managed_bytes: 0,
    })
}

fn system_info_scoped(
    paths: &ManagedPaths,
    registry: &Registry,
    session_links: &SessionLinkRegistry,
    transcripts: Option<&HashMap<String, PathBuf>>,
    inventory: Option<&ProcessInventory>,
    scope: RefreshScope,
    previous: Option<&SystemInfo>,
) -> SystemInfo {
    let mut info = system_info_seed(previous);
    info.app_version = env!("CARGO_PKG_VERSION").to_string();

    if scope.versions || scope.topology {
        let source = detect_provider_source();
        let platform = platform_name();
        let source_version_value = source.as_deref().and_then(cached_source_version);
        info.platform = platform.clone();
        info.source_update = source_version_value
            .as_deref()
            .and_then(|installed| {
                read_source_update_cache(paths, &platform, installed, UPDATE_CACHE_STALE_MS)
            })
            .unwrap_or_default();
        info.source_name = source.as_deref().and_then(source_display_name);
        info.source_path = source
            .as_ref()
            .map(|path| path.to_string_lossy().to_string());
        info.source_version = source_version_value;
        if scope.topology {
            info.version_topology = build_version_topology(
                paths,
                registry,
                inventory.expect("process inventory is required by topology refresh"),
            );
        }
    }
    if scope.sessions {
        let original_profile = detect_original_profile();
        let mut sessions = original_profile
            .as_deref()
            .zip(transcripts)
            .map(|(profile, transcripts)| read_code_sessions(profile, transcripts))
            .unwrap_or_default();
        apply_session_links_to_profile(&mut sessions, ORIGINAL_INSTANCE_ID, session_links);
        info.original_profile_path = original_profile
            .as_ref()
            .map(|path| path.to_string_lossy().to_string());
        info.original_code_sessions = sessions;
    }
    if scope.processes {
        info.original_status = original_instance_status_with_inventory(
            inventory.expect("process inventory is required by process refresh"),
        );
    }
    if scope.storage {
        info.free_bytes = fs2::available_space(&paths.app_data).ok();
        info.managed_bytes = managed_bytes(paths, scope.force_storage);
    }
    info
}

fn dashboard_from_scope(
    app: &AppHandle,
    requested_scope: RefreshScope,
) -> Result<DashboardState, String> {
    with_registry_operation(|| dashboard_from_scope_unlocked(app, requested_scope, true))
}

fn dashboard_from_exact_scope(
    app: &AppHandle,
    requested_scope: RefreshScope,
) -> Result<DashboardState, String> {
    with_registry_operation(|| dashboard_from_scope_unlocked(app, requested_scope, false))
}

fn effective_refresh_scope(
    requested_scope: RefreshScope,
    has_previous_dashboard: bool,
    allow_full_bootstrap: bool,
) -> RefreshScope {
    if !has_previous_dashboard && allow_full_bootstrap {
        RefreshScope::FULL
    } else {
        requested_scope
    }
}

fn preserve_unrequested_instance_state(
    registry: &mut Registry,
    previous: Option<&DashboardState>,
    scope: RefreshScope,
) {
    let Some(previous) = previous else {
        return;
    };
    for instance in &mut registry.instances {
        if let Some(previous_instance) = previous
            .instances
            .iter()
            .find(|candidate| candidate.id == instance.id)
        {
            if !scope.sessions {
                instance.code_sessions = previous_instance.code_sessions.clone();
            }
            if !scope.usage {
                instance.usage = previous_instance.usage.clone();
            }
        }
    }
}

fn dashboard_from_scope_unlocked(
    app: &AppHandle,
    requested_scope: RefreshScope,
    allow_full_bootstrap: bool,
) -> Result<DashboardState, String> {
    let paths = ManagedPaths::resolve(app)?;
    let previous = runtime_cache()
        .lock()
        .ok()
        .and_then(|cache| cache.dashboard.clone());
    let scope = effective_refresh_scope(requested_scope, previous.is_some(), allow_full_bootstrap);
    let mut registry = load_registry(&paths)?;
    preserve_unrequested_instance_state(&mut registry, previous.as_ref(), scope);
    let inventory = scope.processes.then(ProcessInventory::capture);
    let transcripts = refresh_registry_scoped(&mut registry, scope, inventory.as_ref());
    let session_links = if scope.sessions {
        let links = load_session_links(&paths)?;
        apply_session_links(&mut registry, &links);
        links
    } else {
        SessionLinkRegistry::default()
    };
    save_registry(&paths, &registry)?;
    let system = system_info_scoped(
        &paths,
        &registry,
        &session_links,
        transcripts.as_ref(),
        inventory.as_ref(),
        scope,
        previous.as_ref().map(|dashboard| &dashboard.system),
    );
    let dashboard = DashboardState {
        instances: registry.instances,
        system,
    };
    if let Ok(mut cache) = runtime_cache().lock() {
        cache.dashboard = Some(dashboard.clone());
    }
    Ok(dashboard)
}

async fn dashboard_from_scope_async(
    app: AppHandle,
    scope: RefreshScope,
    operation: &'static str,
) -> Result<DashboardState, String> {
    tauri::async_runtime::spawn_blocking(move || dashboard_from_scope(&app, scope))
        .await
        .map_err(|error| format!("{operation} terminó inesperadamente: {error}"))?
}

async fn dashboard_from_exact_scope_async(
    app: AppHandle,
    scope: RefreshScope,
    operation: &'static str,
) -> Result<DashboardState, String> {
    tauri::async_runtime::spawn_blocking(move || dashboard_from_exact_scope(&app, scope))
        .await
        .map_err(|error| format!("{operation} terminó inesperadamente: {error}"))?
}

#[tauri::command]
async fn get_dashboard_state(app: AppHandle) -> Result<DashboardState, String> {
    dashboard_from_scope_async(app, RefreshScope::FULL, "La carga").await
}

#[tauri::command]
async fn check_source_update(app: AppHandle) -> Result<SourceUpdateInfo, String> {
    tauri::async_runtime::spawn_blocking(move || check_source_update_sync(&app))
        .await
        .map_err(|error| {
            format!("La comprobación de actualización terminó inesperadamente: {error}")
        })?
}

#[tauri::command]
async fn refresh_versions(app: AppHandle) -> Result<DashboardState, String> {
    invalidate_application_cache();
    dashboard_from_exact_scope_async(app, RefreshScope::VERSIONS, "El refresco de versiones").await
}

#[tauri::command]
async fn get_live_usage(
    app: AppHandle,
    instance_ids: Vec<String>,
) -> Result<Vec<UsageSnapshot>, String> {
    tauri::async_runtime::spawn_blocking(move || get_live_usage_sync(&app, instance_ids))
        .await
        .map_err(|error| format!("La lectura de uso terminó inesperadamente: {error}"))?
}

fn get_live_usage_sync(
    app: &AppHandle,
    instance_ids: Vec<String>,
) -> Result<Vec<UsageSnapshot>, String> {
    let paths = ManagedPaths::resolve(&app)?;
    let registry = load_registry(&paths)?;
    let requested = instance_ids
        .into_iter()
        .filter(|id| Uuid::parse_str(id).is_ok())
        .collect::<HashSet<_>>();
    Ok(registry
        .instances
        .iter()
        .filter(|instance| requested.contains(&instance.id))
        .filter_map(|instance| {
            read_usage(Path::new(&instance.profile_path)).map(|usage| UsageSnapshot {
                instance_id: instance.id.clone(),
                usage,
            })
        })
        .collect())
}

#[tauri::command]
async fn scan_system(app: AppHandle, window: WebviewWindow) -> Result<DashboardState, String> {
    tauri::async_runtime::spawn_blocking(move || {
        with_registry_operation(|| scan_system_sync(&app, &window))
    })
    .await
    .map_err(|error| format!("El escaneo terminó inesperadamente: {error}"))?
}

fn scan_system_sync(app: &AppHandle, window: &WebviewWindow) -> Result<DashboardState, String> {
    let emit_progress = |progress, label| {
        let _ = window.emit("scan-progress", ScanProgress { progress, label });
    };

    emit_progress(8, "Preparando el escaneo…");
    let paths = ManagedPaths::resolve(app)?;

    emit_progress(22, "Cargando perfiles administrados…");
    let mut registry = load_registry(&paths)?;

    emit_progress(40, "Comprobando instancias y procesos…");
    let inventory = ProcessInventory::capture();
    refresh_instance_statuses(&mut registry, &inventory);
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
    let previous = runtime_cache()
        .lock()
        .ok()
        .and_then(|cache| cache.dashboard.clone());
    let system = system_info_scoped(
        &paths,
        &registry,
        &session_links,
        Some(&transcripts),
        Some(&inventory),
        RefreshScope::FULL_SCAN,
        previous.as_ref().map(|dashboard| &dashboard.system),
    );

    emit_progress(92, "Actualizando el registro local…");
    save_registry(&paths, &registry)?;

    emit_progress(100, "Escaneo completado");
    let dashboard = DashboardState {
        instances: registry.instances,
        system,
    };
    if let Ok(mut cache) = runtime_cache().lock() {
        cache.dashboard = Some(dashboard.clone());
    }
    Ok(dashboard)
}

#[tauri::command]
async fn create_instance(
    app: AppHandle,
    request: CreateInstanceRequest,
) -> Result<DashboardState, String> {
    let worker_app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        with_registry_operation(|| create_instance_sync(&worker_app, request))
    })
    .await
    .map_err(|error| format!("La tarea de creación terminó inesperadamente: {error}"))??;
    invalidate_application_cache();
    invalidate_managed_bytes_cache();
    dashboard_from_scope_async(app, RefreshScope::VERSIONS, "La actualización del panel").await
}

#[tauri::command]
async fn update_instance_application(app: AppHandle, id: String) -> Result<DashboardState, String> {
    let worker_app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        with_registry_operation(|| update_instance_application_sync(&worker_app, &id))
    })
    .await
    .map_err(|error| format!("La actualización terminó inesperadamente: {error}"))??;
    dashboard_from_scope_async(app, RefreshScope::VERSIONS, "La actualización del panel").await
}

#[tauri::command]
async fn synchronize_managed_applications(
    app: AppHandle,
    request: SynchronizeManagedApplicationsRequest,
) -> Result<SynchronizeManagedApplicationsResult, String> {
    let worker_app = app.clone();
    let results = tauri::async_runtime::spawn_blocking(move || {
        with_registry_operation(|| synchronize_managed_applications_sync(&worker_app, request))
    })
    .await
    .map_err(|error| format!("La sincronización terminó inesperadamente: {error}"))??;
    Ok(SynchronizeManagedApplicationsResult {
        dashboard: dashboard_from_scope_async(
            app,
            RefreshScope::VERSIONS,
            "La actualización del panel",
        )
        .await?,
        results,
    })
}

#[tauri::command]
async fn copy_code_session(
    app: AppHandle,
    request: CopyCodeSessionRequest,
) -> Result<SessionTransferResult, String> {
    let worker_app = app.clone();
    let artifacts = tauri::async_runtime::spawn_blocking(move || {
        with_registry_operation(|| copy_code_session_sync(&worker_app, request))
    })
    .await
    .map_err(|error| format!("La transferencia terminó inesperadamente: {error}"))??;
    invalidate_managed_bytes_cache();
    Ok(SessionTransferResult {
        dashboard: dashboard_from_scope_async(
            app,
            RefreshScope::SESSIONS,
            "La actualización del panel",
        )
        .await?,
        artifacts,
    })
}

#[tauri::command]
async fn unlink_code_session(
    app: AppHandle,
    request: UnlinkCodeSessionRequest,
) -> Result<DashboardState, String> {
    let worker_app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        with_registry_operation(|| unlink_code_session_sync(&worker_app, request))
    })
    .await
    .map_err(|error| format!("La desvinculación terminó inesperadamente: {error}"))??;
    invalidate_managed_bytes_cache();
    dashboard_from_scope_async(app, RefreshScope::SESSIONS, "La actualización del panel").await
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
        .and_then(strip_inherited_icon_after_copy)
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
        source_version: cached_source_version(&source),
        app_path: app_path.to_string_lossy().to_string(),
        profile_path: profile_path.to_string_lossy().to_string(),
        created_at: Utc::now().to_rfc3339(),
        last_launched_at: None,
        pid: None,
        process_identity: None,
        launch_generation: 0,
        custom_icon: None,
        provider_provenance: None,
        status: InstanceStatus::Stopped,
        usage: None,
        code_sessions: Vec::new(),
    });
    save_registry(&paths, &registry)
}

#[tauri::command]
async fn update_instance(
    app: AppHandle,
    request: UpdateInstanceRequest,
) -> Result<DashboardState, String> {
    let worker_app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        with_registry_operation(|| update_instance_sync(&worker_app, request))
    })
    .await
    .map_err(|error| format!("La edición terminó inesperadamente: {error}"))??;
    dashboard_from_scope_async(app, RefreshScope::LIGHT, "La actualización del panel").await
}

fn update_instance_sync(app: &AppHandle, request: UpdateInstanceRequest) -> Result<(), String> {
    let paths = ManagedPaths::resolve(app)?;
    let mut registry = load_registry(&paths)?;
    let name = validate_name(&request.name)?;
    if registry
        .instances
        .iter()
        .any(|instance| instance.id != request.id && instance.name.eq_ignore_ascii_case(&name))
    {
        return Err("Ya existe una instancia con ese nombre.".to_string());
    }
    let inventory = ProcessInventory::capture();
    refresh_instance_statuses(&mut registry, &inventory);
    let instance = registry
        .instances
        .iter_mut()
        .find(|instance| instance.id == request.id)
        .ok_or_else(|| "La instancia ya no existe.".to_string())?;
    instance.name = name;
    refresh_instance_bundle_names(&mut registry);
    save_registry(&paths, &registry)
}

#[tauri::command]
async fn launch_instance(app: AppHandle, id: String) -> Result<DashboardState, String> {
    let worker_app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        with_registry_operation(|| launch_instance_sync(&worker_app, id))
    })
    .await
    .map_err(|error| format!("El inicio terminó inesperadamente: {error}"))??;
    dashboard_from_scope_async(app, RefreshScope::LIGHT, "La actualización del panel").await
}

fn launch_instance_sync(app: &AppHandle, id: String) -> Result<(), String> {
    let paths = ManagedPaths::resolve(app)?;
    let mut registry = load_registry(&paths)?;
    let inventory = ProcessInventory::capture();
    refresh_instance_statuses(&mut registry, &inventory);
    let position = registry
        .instances
        .iter()
        .position(|instance| instance.id == id)
        .ok_or_else(|| "La instancia ya no existe.".to_string())?;

    if registry.instances[position].status == InstanceStatus::Running {
        return save_registry(&paths, &registry);
    }
    let app_path = PathBuf::from(&registry.instances[position].app_path);
    let executable = provider_executable(&app_path);
    if !executable.is_file() {
        return Err("La aplicación de esta instancia no está disponible.".to_string());
    }
    // HU-0020 (A-4.5): a copy with a custom icon is verified, and its icon reapplied, before it launches.
    #[cfg(target_os = "macos")]
    if registry.instances[position].custom_icon.is_some() {
        let original = detect_provider_source();
        if macos_icon::launch_preflight(
            &paths,
            &mut registry.instances[position],
            original.as_deref(),
        )? {
            save_registry(&paths, &registry)?;
        }
    }
    let instance = &mut registry.instances[position];
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
    isolate_process_group(&mut command);
    let mut child = command
        .spawn()
        .map_err(|error| format!("No se pudo iniciar la aplicación: {error}"))?;

    let root_pid = child.id();
    instance.launch_generation = instance.launch_generation.saturating_add(1);
    let generation = instance.launch_generation;
    let profile_argument = format!("--user-data-dir={}", profile_path.to_string_lossy());
    let start_time = process_start_time(root_pid);
    instance.pid = Some(root_pid);
    instance.process_identity = Some(ManagedProcessIdentity {
        root_pid,
        process_group_id: launched_process_group(root_pid),
        start_time,
        fingerprint: process_fingerprint(&app_path, &profile_argument),
        profile_argument,
    });
    instance.status = InstanceStatus::Running;
    instance.last_launched_at = Some(Utc::now().to_rfc3339());
    let launched_instance = instance.clone();
    if let Err(error) = save_registry(&paths, &registry) {
        if let Some(identity) = launched_instance.process_identity.as_ref() {
            // Captura fresca a propósito: el proceso acaba de nacer y el inventario previo no lo tiene.
            let _ = signal_instance_processes(
                &launched_instance,
                identity,
                true,
                &ProcessInventory::capture(),
            );
        }
        let _ = child.kill();
        let _ = child.wait();
        return Err(format!(
            "La aplicación se inició, pero no se pudo registrar; el proceso fue cerrado: {error}"
        ));
    }
    spawn_process_reaper(app.clone(), id, generation, child);
    Ok(())
}

#[tauri::command]
async fn stop_instance(app: AppHandle, id: String) -> Result<DashboardState, String> {
    let worker_app = app.clone();
    tauri::async_runtime::spawn_blocking(move || stop_instance_sync(&worker_app, &id))
        .await
        .map_err(|error| format!("El cierre terminó inesperadamente: {error}"))??;
    dashboard_from_scope_async(app, RefreshScope::LIGHT, "La actualización del panel").await
}

fn stop_instance_sync(app: &AppHandle, id: &str) -> Result<(), String> {
    let paths = ManagedPaths::resolve(&app)?;
    let running = with_registry_operation(|| {
        let mut registry = load_registry(&paths)?;
        let inventory = ProcessInventory::capture();
        refresh_instance_statuses(&mut registry, &inventory);
        let position = registry
            .instances
            .iter()
            .position(|instance| instance.id == id)
            .ok_or_else(|| "La instancia ya no existe.".to_string())?;
        if registry.instances[position].status != InstanceStatus::Running {
            registry.instances[position].pid = None;
            registry.instances[position].process_identity = None;
            registry.instances[position].status = InstanceStatus::Stopped;
            save_registry(&paths, &registry)?;
            return Ok(None);
        }
        Ok(Some((registry.instances[position].clone(), inventory)))
    })?;
    let Some((instance, stop_inventory)) = running else {
        return Ok(());
    };
    let identity = instance.process_identity.clone().ok_or_else(|| {
        "No se pudo verificar la identidad del proceso. Cierra esta instancia manualmente y vuelve a escanear.".to_string()
    })?;
    // La señal ordenada reutiliza el inventario que acaba de confirmar que la instancia corre.
    signal_instance_processes(&instance, &identity, false, &stop_inventory)?;
    if !wait_until_instance_stops(&instance, Duration::from_secs(5)) {
        // Captura fresca a propósito: pasaron hasta 5 s y el cierre forzado no puede apoyarse en
        // un inventario viejo (un PID pudo terminar o ser reutilizado).
        signal_instance_processes(&instance, &identity, true, &ProcessInventory::capture())?;
        if !wait_until_instance_stops(&instance, Duration::from_secs(2)) {
            with_registry_operation(|| {
                let mut registry = load_registry(&paths)?;
                if let Some(current) = registry
                    .instances
                    .iter_mut()
                    .find(|candidate| candidate.id == id)
                {
                    current.status = InstanceStatus::Running;
                }
                save_registry(&paths, &registry)
            })?;
            return Err("La instancia sigue ejecutándose después del cierre forzado. No se cambió su estado.".to_string());
        }
    }
    with_registry_operation(|| {
        let mut registry = load_registry(&paths)?;
        let current = registry
            .instances
            .iter_mut()
            .find(|candidate| candidate.id == id)
            .ok_or_else(|| "La instancia ya no existe.".to_string())?;
        current.pid = None;
        current.process_identity = None;
        current.status = InstanceStatus::Stopped;
        save_registry(&paths, &registry)
    })
}

fn normalized_icon_png(bytes: &[u8]) -> Result<Vec<u8>, String> {
    if bytes.is_empty() || bytes.len() > ICON_MAX_BYTES {
        return Err("El icono debe pesar entre 1 byte y 5 MiB.".to_string());
    }
    let format = image::guess_format(bytes)
        .map_err(|_| "El archivo no es una imagen PNG o JPEG válida.".to_string())?;
    if !matches!(format, image::ImageFormat::Png | image::ImageFormat::Jpeg) {
        return Err("El icono debe ser PNG o JPEG.".to_string());
    }
    let dimensions = image::ImageReader::with_format(Cursor::new(bytes), format)
        .into_dimensions()
        .map_err(|_| "No se pudo leer la cabecera del icono.".to_string())?;
    if dimensions.0 == 0
        || dimensions.1 == 0
        || dimensions.0 > ICON_MAX_DIMENSION
        || dimensions.1 > ICON_MAX_DIMENSION
    {
        return Err("Las dimensiones del icono no son válidas (máximo 4096×4096).".to_string());
    }
    let image = image::load_from_memory_with_format(bytes, format)
        .map_err(|_| "No se pudo decodificar el icono.".to_string())?;
    let normalized = image.resize_to_fill(512, 512, image::imageops::FilterType::Lanczos3);
    let mut encoded = Cursor::new(Vec::new());
    normalized
        .write_to(&mut encoded, image::ImageFormat::Png)
        .map_err(|error| format!("No se pudo normalizar el icono: {error}"))?;
    Ok(encoded.into_inner())
}

#[tauri::command]
async fn set_instance_icon(
    app: AppHandle,
    request: SetInstanceIconRequest,
) -> Result<DashboardState, String> {
    let worker_app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        with_registry_operation(|| set_instance_icon_sync(&worker_app, request))
    })
    .await
    .map_err(|error| format!("La personalización terminó inesperadamente: {error}"))??;
    dashboard_from_scope_async(app, RefreshScope::LIGHT, "La actualización del panel").await
}

fn set_instance_icon_sync(app: &AppHandle, request: SetInstanceIconRequest) -> Result<(), String> {
    let paths = ManagedPaths::resolve(app)?;
    #[cfg_attr(target_os = "macos", allow(unused_variables))]
    let root = paths.root_for(&request.id)?;
    let normalized = normalized_icon_png(&request.bytes)?;
    let mut registry = load_registry(&paths)?;
    let inventory = ProcessInventory::capture();
    refresh_instance_statuses(&mut registry, &inventory);
    let position = registry
        .instances
        .iter()
        .position(|instance| instance.id == request.id)
        .ok_or_else(|| "La instancia ya no existe.".to_string())?;
    if registry.instances[position].status != InstanceStatus::Stopped {
        return Err("Detén la instancia antes de cambiar su icono.".to_string());
    }
    #[cfg(target_os = "macos")]
    {
        let original = detect_provider_source().ok_or_else(|| {
            "No se encontró la aplicación original para verificar la copia.".to_string()
        })?;
        macos_icon::set_instance_icon(&paths, &mut registry, position, &original, &normalized)
    }
    #[cfg(not(target_os = "macos"))]
    {
        let branding = root.join("branding");
        let icon_path = branding.join("icon.png");
        let previous_icon = fs::read(&icon_path).ok();
        let revision = registry.instances[position]
            .custom_icon
            .as_ref()
            .map(|icon| icon.revision.saturating_add(1))
            .unwrap_or(1);
        fs::create_dir_all(&branding)
            .map_err(|error| format!("No se pudo preparar el icono administrado: {error}"))?;
        atomic_replace_file(&icon_path, &normalized)?;
        let (system_applied, system_message) =
            apply_external_icon_best_effort(&paths, &registry.instances[position], &icon_path);
        registry.instances[position].custom_icon = Some(CustomIcon {
            path: icon_path.to_string_lossy().to_string(),
            revision,
            system_applied,
            system_message,
            system_issue: None,
        });
        if let Err(error) = save_registry(&paths, &registry) {
            if let Some(bytes) = previous_icon.as_deref() {
                let _ = atomic_replace_file(&icon_path, bytes);
            } else {
                let _ = fs::remove_file(&icon_path);
            }
            return Err(error);
        }
        invalidate_application_cache();
        invalidate_managed_bytes_cache();
        Ok(())
    }
}

#[tauri::command]
async fn clear_instance_icon(app: AppHandle, id: String) -> Result<DashboardState, String> {
    let worker_app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        with_registry_operation(|| clear_instance_icon_sync(&worker_app, id))
    })
    .await
    .map_err(|error| format!("La restauración terminó inesperadamente: {error}"))??;
    dashboard_from_scope_async(app, RefreshScope::LIGHT, "La actualización del panel").await
}

fn clear_instance_icon_sync(app: &AppHandle, id: String) -> Result<(), String> {
    let paths = ManagedPaths::resolve(app)?;
    #[cfg_attr(target_os = "macos", allow(unused_variables))]
    let root = paths.root_for(&id)?;
    let mut registry = load_registry(&paths)?;
    let position = registry
        .instances
        .iter()
        .position(|instance| instance.id == id)
        .ok_or_else(|| "La instancia ya no existe.".to_string())?;
    let inventory = ProcessInventory::capture();
    refresh_instance_statuses(&mut registry, &inventory);
    if registry.instances[position].status != InstanceStatus::Stopped {
        return Err("Detén la instancia antes de restaurar su icono.".to_string());
    }
    #[cfg(target_os = "macos")]
    {
        let original = detect_provider_source().ok_or_else(|| {
            "No se encontró la aplicación original para restaurar el icono.".to_string()
        })?;
        macos_icon::clear_instance_icon(&paths, &mut registry, position, &original)
    }

    #[cfg(not(target_os = "macos"))]
    {
        let managed_icon = root.join("branding/icon.png");
        let previous_icon = fs::read(&managed_icon).ok();
        let launcher = root.join("launcher.desktop");
        let previous_launcher = fs::read(&launcher).ok();
        if registry.instances[position]
            .custom_icon
            .as_ref()
            .is_some_and(|icon| Path::new(&icon.path) == managed_icon)
        {
            let _ = fs::remove_file(&managed_icon);
        }
        let _ = fs::remove_file(&launcher);
        registry.instances[position].custom_icon = None;
        if let Err(error) = save_registry(&paths, &registry) {
            restore_optional_file(&managed_icon, previous_icon.as_deref());
            restore_optional_file(&launcher, previous_launcher.as_deref());
            return Err(error);
        }
        invalidate_application_cache();
        invalidate_managed_bytes_cache();
        Ok(())
    }
}

#[tauri::command]
async fn reapply_instance_icon(app: AppHandle, id: String) -> Result<DashboardState, String> {
    let worker_app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        with_registry_operation(|| reapply_instance_icon_sync(&worker_app, id))
    })
    .await
    .map_err(|error| format!("El reintento del icono terminó inesperadamente: {error}"))??;
    dashboard_from_scope_async(app, RefreshScope::LIGHT, "La actualización del panel").await
}

#[cfg(target_os = "macos")]
fn reapply_instance_icon_sync(app: &AppHandle, id: String) -> Result<(), String> {
    let paths = ManagedPaths::resolve(app)?;
    paths.root_for(&id)?;
    let mut registry = load_registry(&paths)?;
    let inventory = ProcessInventory::capture();
    refresh_instance_statuses(&mut registry, &inventory);
    let position = registry
        .instances
        .iter()
        .position(|instance| instance.id == id)
        .ok_or_else(|| "La instancia ya no existe.".to_string())?;
    if registry.instances[position].status != InstanceStatus::Stopped {
        return Err("Detén la instancia antes de reintentar el icono.".to_string());
    }
    let original = detect_provider_source().ok_or_else(|| {
        "No se encontró la aplicación original para verificar la copia.".to_string()
    })?;
    macos_icon::reapply_instance_icon(&paths, &mut registry, position, &original)
}

#[cfg(not(target_os = "macos"))]
fn reapply_instance_icon_sync(app: &AppHandle, id: String) -> Result<(), String> {
    let _ = (app, id);
    Err(DOCK_ICON_MACOS_ONLY.to_string())
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
    open_in_file_manager(&profile)
}

// ── Proyectos anclados (HU-0023): envoltorios finos de projects.rs ──────────

#[tauri::command]
async fn list_projects(app: AppHandle) -> Result<projects::ProjectsState, String> {
    tauri::async_runtime::spawn_blocking(move || projects::list_projects_sync(&app))
        .await
        .map_err(|error| format!("La lectura de los proyectos terminó inesperadamente: {error}"))?
}

#[tauri::command]
async fn read_project(app: AppHandle, id: String) -> Result<projects::ProjectSummary, String> {
    tauri::async_runtime::spawn_blocking(move || projects::read_project_sync(&app, &id))
        .await
        .map_err(|error| format!("La lectura del proyecto terminó inesperadamente: {error}"))?
}

/// Abre el selector nativo de carpetas con la ventana `main` de padre e inspecciona la elegida sin
/// anclarla. `None` si la persona cancela.
#[tauri::command]
async fn pick_project_folder(app: AppHandle) -> Result<Option<projects::ProjectCandidate>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        use tauri_plugin_dialog::DialogExt;
        let mut dialog = app
            .dialog()
            .file()
            .set_title("Elige la carpeta del proyecto");
        if let Some(window) = app.get_webview_window("main") {
            dialog = dialog.set_parent(&window);
        }
        let Some(picked) = dialog.blocking_pick_folder() else {
            return Ok(None);
        };
        let path = picked
            .into_path()
            .map_err(|error| format!("No se pudo leer la carpeta elegida: {error}"))?;
        projects::inspect_candidate_sync(&app, &path).map(Some)
    })
    .await
    .map_err(|error| format!("El selector de carpetas terminó inesperadamente: {error}"))?
}

#[tauri::command]
async fn pin_project(app: AppHandle, path: String) -> Result<projects::ProjectSummary, String> {
    tauri::async_runtime::spawn_blocking(move || projects::pin_project_sync(&app, &path))
        .await
        .map_err(|error| format!("Anclar el proyecto terminó inesperadamente: {error}"))?
}

#[tauri::command]
async fn unpin_project(app: AppHandle, id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || projects::unpin_project_sync(&app, &id))
        .await
        .map_err(|error| format!("Desanclar el proyecto terminó inesperadamente: {error}"))?
}

#[tauri::command]
async fn open_project_folder(app: AppHandle, id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let path = projects::project_folder_sync(&app, &id)?;
        open_in_file_manager(&path)
    })
    .await
    .map_err(|error| format!("Abrir la carpeta del proyecto terminó inesperadamente: {error}"))?
}

#[tauri::command]
async fn open_system_settings(panel: SystemSettingsPanel) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || open_system_settings_sync(panel))
        .await
        .map_err(|error| {
            format!("La apertura de Ajustes del Sistema terminó inesperadamente: {error}")
        })?
}

#[tauri::command]
async fn get_account_facts() -> Result<AccountFacts, String> {
    Ok(tauri::async_runtime::spawn_blocking(account_facts_sync)
        .await
        .unwrap_or(AccountFacts { admin: None }))
}

#[tauri::command]
fn update_original_application(app: AppHandle) -> Result<OriginalApplicationUpdateResult, String> {
    if original_update::original_update_in_flight() {
        return Err(
            "Hay una actualización de la original en curso. Espera a que termine.".to_string(),
        );
    }
    let source = require_provider_source(detect_provider_source())?;

    #[cfg(target_os = "macos")]
    {
        let paths = ManagedPaths::resolve(&app)?;
        return launch_macos_original_application_with(&paths, &source, |launch| {
            let status = Command::new(launch.executable)
                .args(&launch.arguments)
                .status()
                .map_err(|error| format!("No se pudo abrir la aplicación original: {error}"))?;
            if status.success() {
                Ok(())
            } else {
                Err(format!(
                    "El sistema no pudo abrir la aplicación original (código {status})."
                ))
            }
        });
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = source;
        let _ = app;
        let platform = platform_name();
        let target = original_application_update_target(&platform, std::env::consts::ARCH)
            .ok_or_else(|| {
                "La actualización oficial no está soportada en esta plataforma.".to_string()
            })?;

        let status = open_update_url(target.url);

        let status = status.map_err(|error| {
            format!("No se pudo abrir el canal oficial de actualización: {error}")
        })?;
        if !status.success() {
            return Err(format!(
                "El sistema no pudo abrir el canal oficial de actualización (código {}).",
                status
            ));
        }

        let message = match target.action {
            OriginalApplicationUpdateAction::Download => {
                "Se abrió la descarga oficial. Ejecuta el instalador para actualizar la aplicación original; las instancias permanecen intactas."
            }
            OriginalApplicationUpdateAction::Instructions => {
                "Se abrieron las instrucciones oficiales para actualizar Claude Desktop en Linux; las instancias permanecen intactas."
            }
        };
        Ok(OriginalApplicationUpdateResult {
            action: target.action,
            message: message.to_string(),
        })
    }
}

#[tauri::command]
async fn install_original_update(
    app: AppHandle,
    request: original_update::InstallOriginalUpdateRequest,
    on_progress: tauri::ipc::Channel<original_update::OriginalInstallProgress>,
) -> Result<original_update::OriginalInstallResult, String> {
    let worker_app = app.clone();
    let outcome = tauri::async_runtime::spawn_blocking(move || {
        original_update::install_original_update_sync(&worker_app, request, &|progress| {
            let _ = on_progress.send(progress);
        })
    })
    .await
    .map_err(|error| {
        format!("La actualización de la original terminó inesperadamente: {error}")
    })??;
    let dashboard =
        dashboard_from_scope_async(app, RefreshScope::VERSIONS, "La actualización del panel")
            .await?;
    Ok(outcome.into_result(dashboard))
}

#[tauri::command]
fn cancel_original_update() -> bool {
    original_update::cancel_original_update()
}

#[tauri::command]
async fn delete_instance(app: AppHandle, id: String) -> Result<DashboardState, String> {
    let worker_app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        with_registry_operation(|| delete_instance_sync(&worker_app, id))
    })
    .await
    .map_err(|error| format!("La eliminación terminó inesperadamente: {error}"))??;
    dashboard_from_scope_async(app, RefreshScope::VERSIONS, "La actualización del panel").await
}

fn delete_instance_sync(app: &AppHandle, id: String) -> Result<(), String> {
    let paths = ManagedPaths::resolve(app)?;
    let root = paths.root_for(&id)?;
    let mut registry = load_registry(&paths)?;
    let session_links = load_session_links(&paths)?;
    let inventory = ProcessInventory::capture();
    refresh_instance_statuses(&mut registry, &inventory);
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
    invalidate_application_cache();
    invalidate_managed_bytes_cache();
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            config::validate().map_err(std::io::Error::other)?;
            let handle = app.handle().clone();
            let paths = ManagedPaths::resolve(&handle).map_err(std::io::Error::other)?;
            original_update::recover_original_update_leftovers(&paths);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_dashboard_state,
            check_source_update,
            refresh_versions,
            get_live_usage,
            scan_system,
            create_instance,
            update_instance,
            update_instance_application,
            synchronize_managed_applications,
            copy_code_session,
            unlink_code_session,
            launch_instance,
            stop_instance,
            set_instance_icon,
            clear_instance_icon,
            reapply_instance_icon,
            open_instance_folder,
            open_system_settings,
            get_account_facts,
            update_original_application,
            install_original_update,
            cancel_original_update,
            delete_instance,
            list_projects,
            read_project,
            pick_project_folder,
            pin_project,
            unpin_project,
            open_project_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running Code AI Profiles");
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::*;

    #[test]
    fn light_refresh_executes_one_inventory_and_skips_expensive_work() {
        let root = env::temp_dir().join(format!("code-ai-light-refresh-{}", Uuid::new_v4()));
        let mut registry = Registry {
            version: REGISTRY_VERSION,
            instances: vec![test_instance(&root)],
        };
        reset_refresh_work_counters();
        let inventory = ProcessInventory::capture();
        let transcripts =
            refresh_registry_scoped(&mut registry, RefreshScope::LIGHT, Some(&inventory));
        assert!(transcripts.is_none());
        assert_eq!(
            refresh_work_counters(),
            RefreshWorkCounters {
                process_inventories: 1,
                transcript_catalogs: 0,
                version_refreshes: 0,
                usage_refreshes: 1,
                topology_builds: 0,
                storage_walks: 0,
            }
        );
    }

    #[test]
    fn versions_refresh_preserves_sessions_and_skips_profile_and_storage_work() {
        let root = env::temp_dir().join(format!("code-ai-versions-refresh-{}", Uuid::new_v4()));
        fs::create_dir_all(root.join("managed-instances")).unwrap();
        let session = CodeSession {
            id: "local_96812ba4-6864-40d5-a70a-0470f244022c".to_string(),
            title: "Session sentinel".to_string(),
            model: None,
            effort: None,
            completed_turns: 1,
            created_at: None,
            last_activity_at: None,
            is_archived: false,
            context_tokens: None,
            context_window_tokens: None,
            context_percent: None,
            published_artifact_count: 0,
            artifact_monitor: None,
            transfer: None,
            cli_session_id: None,
        };
        let usage = UsageStats {
            session_percent: Some(11.0),
            weekly_percent: Some(22.0),
            captured_at: Some(33),
        };
        let mut previous_instance = test_instance(&root);
        previous_instance.code_sessions = vec![session.clone()];
        previous_instance.usage = Some(usage.clone());
        let previous_system = SystemInfo {
            app_version: env!("CARGO_PKG_VERSION").to_string(),
            platform: platform_name(),
            source_path: None,
            source_name: None,
            source_version: None,
            source_update: SourceUpdateInfo::default(),
            version_topology: VersionTopology {
                latest_installed_version: None,
                latest_source: None,
                stale_instance_ids: Vec::new(),
                original_behind: false,
                can_synchronize_managed: false,
                reason: None,
            },
            original_profile_path: Some("/private/not-read".to_string()),
            original_status: InstanceStatus::Stopped,
            original_code_sessions: vec![session.clone()],
            free_bytes: Some(44),
            managed_bytes: 55,
        };
        let previous = DashboardState {
            instances: vec![previous_instance.clone()],
            system: previous_system.clone(),
        };
        let mut registry = Registry {
            version: REGISTRY_VERSION,
            instances: vec![test_instance(&root)],
        };
        registry.instances[0].id = previous_instance.id.clone();
        preserve_unrequested_instance_state(&mut registry, Some(&previous), RefreshScope::VERSIONS);

        reset_refresh_work_counters();
        let inventory = ProcessInventory::capture();
        let transcripts =
            refresh_registry_scoped(&mut registry, RefreshScope::VERSIONS, Some(&inventory));
        let system = system_info_seed(Some(&previous_system));

        assert!(transcripts.is_none());
        assert_eq!(registry.instances[0].code_sessions[0].id, session.id);
        assert_eq!(
            registry.instances[0].usage.as_ref().unwrap().captured_at,
            usage.captured_at
        );
        assert_eq!(system.original_code_sessions[0].title, session.title);
        assert_eq!(
            refresh_work_counters(),
            RefreshWorkCounters {
                process_inventories: 1,
                transcript_catalogs: 0,
                version_refreshes: 1,
                usage_refreshes: 0,
                topology_builds: 0,
                storage_walks: 0,
            }
        );
        assert!(!RefreshScope::VERSIONS.bundle_names);
        assert!(!RefreshScope::VERSIONS.usage);
        assert!(!RefreshScope::VERSIONS.sessions);
        assert!(!RefreshScope::VERSIONS.storage);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn versions_refresh_never_promotes_a_cold_cache_to_full_scope() {
        assert_eq!(
            effective_refresh_scope(RefreshScope::VERSIONS, false, false),
            RefreshScope::VERSIONS
        );
        assert_eq!(
            effective_refresh_scope(RefreshScope::VERSIONS, false, true),
            RefreshScope::FULL
        );
    }

    #[cfg(target_os = "macos")]
    #[test]
    #[ignore = "visual spike: requires an explicit provider source and retained temp root"]
    fn macos_provider_clone_dock_visual_spike() {
        let source = env::var_os("CODE_AI_PROFILES_DOCK_PROVIDER_SOURCE")
            .map(PathBuf::from)
            .expect("set CODE_AI_PROFILES_DOCK_PROVIDER_SOURCE to a provider .app");
        let root = env::var_os("CODE_AI_PROFILES_DOCK_FIXTURE_DIR")
            .map(PathBuf::from)
            .expect("set CODE_AI_PROFILES_DOCK_FIXTURE_DIR to a disposable empty directory");
        assert!(
            !root.exists(),
            "the retained fixture root must not already exist"
        );
        let managed = root.join("managed/application/Provider Dock Fixture.app");
        let profile = root.join("managed/profile");
        fs::create_dir_all(&profile).unwrap();
        clone_directory(&source, &managed).unwrap();
        let baseline = macos_signature_snapshot(&managed);
        assert!(
            baseline.code_hash.is_some(),
            "the clone must expose a CDHash"
        );
        let icon_path = root.join("managed/branding/icon.png");
        fs::create_dir_all(icon_path.parent().unwrap()).unwrap();
        let icon =
            image::DynamicImage::ImageRgba8(image::ImageBuffer::from_fn(512, 512, |x, y| {
                if (x / 64 + y / 64) % 2 == 0 {
                    image::Rgba([32, 96, 255, 255])
                } else {
                    image::Rgba([255, 96, 48, 255])
                }
            }));
        let mut encoded = Cursor::new(Vec::new());
        icon.write_to(&mut encoded, image::ImageFormat::Png)
            .unwrap();
        fs::write(&icon_path, encoded.into_inner()).unwrap();
        macos_icon::set_workspace_icon(&root, &managed, Some(&icon_path)).unwrap();
        let iconized = macos_signature_snapshot(&managed);
        assert_eq!(iconized.code_hash, baseline.code_hash);
        assert_eq!(iconized.team_identifier, baseline.team_identifier);
        assert_eq!(
            iconized.designated_requirement,
            baseline.designated_requirement
        );
        assert_eq!(iconized.info_plist, baseline.info_plist);
        let launched = Command::new("/usr/bin/open")
            .args(["-n"])
            .arg(&managed)
            .arg("--args")
            .arg(format!("--user-data-dir={}", profile.display()))
            .status()
            .unwrap();
        assert!(launched.success());
        let capture_ms = env::var("CODE_AI_PROFILES_DOCK_CAPTURE_MS")
            .ok()
            .and_then(|value| value.parse::<u64>().ok())
            .unwrap_or(1_500);
        thread::sleep(Duration::from_millis(capture_ms));
        macos_icon::set_workspace_icon(&root, &managed, None).unwrap();
        let restored = macos_signature_snapshot(&managed);
        assert_eq!(
            restored, baseline,
            "setIcon(nil) must restore the exact signature baseline"
        );
        println!("DOCK_FIXTURE={}", managed.display());
        println!("DOCK_FIXTURE_PROFILE={}", profile.display());
        println!("DOCK_FIXTURE_DEEP_STATUS={:?}", baseline.deep_status);
        println!("DOCK_FIXTURE_STRICT_STATUS={:?}", baseline.strict_status);
        println!("DOCK_FIXTURE_BASELINE_RESTORED=true");
        println!("DOCK_FIXTURE_STATE=workspace icon cleared; exact signature baseline restored; app left running for Dock inspection");
    }

    #[test]
    fn validates_instance_names() {
        assert_eq!(validate_name("  Work  ").unwrap(), "Work");
        assert!(validate_name("  ").is_err());
        assert!(validate_name(&"a".repeat(65)).is_err());
        assert!(validate_name("line\nbreak").is_err());
    }

    #[test]
    fn counts_remote_artifact_arrays_and_objects_without_exposing_values() {
        let array = serde_json::json!([{"private": "one"}, {"private": "two"}]);
        let object = serde_json::json!({"secret-a": {}, "secret-b": {}, "secret-c": {}});
        assert_eq!(artifact_reference_count(Some(&array)), 2);
        assert_eq!(artifact_reference_count(Some(&object)), 3);
        assert_eq!(artifact_reference_count(Some(&Value::Null)), 0);
    }

    #[cfg(unix)]
    #[test]
    fn artifact_export_rejects_symlinks_and_depth_escapes() {
        use std::os::unix::fs::symlink;

        let root = env::temp_dir().join(format!("code-ai-artifact-safe-{}", Uuid::new_v4()));
        let outside = env::temp_dir().join(format!("code-ai-artifact-private-{}", Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        fs::write(&outside, b"opaque").unwrap();
        symlink(&outside, root.join("escape")).unwrap();
        let mut files = Vec::new();
        let mut entries = 0;
        let mut bytes = 0;
        let error =
            collect_opaque_artifact_files(&root, &root, 0, &mut entries, &mut files, &mut bytes)
                .unwrap_err();
        assert!(error.contains("enlace simbólico"));
        assert!(files.is_empty());
        fs::remove_dir_all(root).unwrap();
        fs::remove_file(outside).unwrap();
    }

    #[test]
    fn normalizes_small_png_icons_and_rejects_invalid_input() {
        let icon = image::DynamicImage::new_rgba8(4, 8);
        let mut encoded = Cursor::new(Vec::new());
        icon.write_to(&mut encoded, image::ImageFormat::Png)
            .unwrap();
        let normalized = normalized_icon_png(&encoded.into_inner()).unwrap();
        let decoded = image::load_from_memory(&normalized).unwrap();
        assert_eq!((decoded.width(), decoded.height()), (512, 512));
        assert!(normalized_icon_png(b"not-an-image").is_err());
        assert!(normalized_icon_png(&vec![0; ICON_MAX_BYTES + 1]).is_err());
    }

    #[test]
    fn parses_only_safe_code_session_fields() {
        let session = parse_code_session(
            br#"{"sessionId":"session-1","title":"  Dashboard refactor  ","model":"claude-sonnet","effort":"high","completedTurns":12,"createdAt":1000,"lastActivityAt":2000,"isArchived":false,"publishedArtifacts":{"remote-secret-id":{"title":"private","url":"https://private"}},"promptSuggestion":"sensitive","remoteMcpServersConfig":{"secret":"ignored"}}"#,
            "fallback",
        )
        .expect("session should parse");
        assert_eq!(session.id, "session-1");
        assert_eq!(session.title, "Dashboard refactor");
        assert_eq!(session.completed_turns, 12);
        assert_eq!(session.last_activity_at, Some(2000));
        assert_eq!(session.published_artifact_count, 1);
        assert!(!session.is_archived);
    }

    #[test]
    fn sanitizes_artifacts_using_only_the_target_profile_ownership() {
        let source = serde_json::json!({
            "sessionId": "local_96812ba4-6864-40d5-a70a-0470f244022c",
            "publishedArtifacts": {"source-id": {"title": "private source"}},
            "scheduledTasks": {"must": "remain ordinary session metadata"}
        });
        let target_artifacts = serde_json::json!({
            "target-id": {"title": "private target"}
        });
        let sanitized: Value = serde_json::from_slice(
            &session_index_for_target(source.clone(), Some(target_artifacts.clone())).unwrap(),
        )
        .unwrap();
        assert_eq!(sanitized.get("publishedArtifacts"), Some(&target_artifacts));
        assert_ne!(
            sanitized.get("publishedArtifacts"),
            source.get("publishedArtifacts")
        );
        assert!(sanitized.get("scheduledTasks").is_some());

        let without_target: Value =
            serde_json::from_slice(&session_index_for_target(source, None).unwrap()).unwrap();
        assert!(without_target.get("publishedArtifacts").is_none());
    }

    #[test]
    fn restores_origin_artifacts_from_the_transaction_backup() {
        let root = env::temp_dir().join(format!("code-ai-artifact-backup-{}", Uuid::new_v4()));
        let transfer = root.join("20260922-transfer");
        fs::create_dir_all(&transfer).unwrap();
        let session_id = "local_96812ba4-6864-40d5-a70a-0470f244022c";
        let manifest = SessionTransferManifest {
            transfer_id: "transfer".to_string(),
            created_at: "2026-09-22T10:00:00Z".to_string(),
            session_id: session_id.to_string(),
            session_title: "Session".to_string(),
            source_instance_id: "origin".to_string(),
            source_instance_name: "Origin".to_string(),
            target_instance_id: "target".to_string(),
            target_instance_name: "Target".to_string(),
            source_index: String::new(),
            target_index: String::new(),
            transcript: String::new(),
            replaced_existing_target: false,
            mode: SessionTransferMode::Move,
        };
        fs::write(
            transfer.join("manifest.json"),
            serde_json::to_vec(&manifest).unwrap(),
        )
        .unwrap();
        fs::write(
            transfer.join("source-index.json"),
            br#"{"publishedArtifacts":{"owned-by-origin":{"payload":"not exposed"}}}"#,
        )
        .unwrap();

        let artifacts = restored_origin_artifacts(&root, session_id, "origin").unwrap();
        assert!(artifacts.get("owned-by-origin").is_some());
        assert!(restored_origin_artifacts(&root, session_id, "other").is_none());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn summarizes_artifact_monitors_without_exposing_identifiers_or_content() {
        let root = env::temp_dir().join(format!("code-ai-monitor-test-{}", Uuid::new_v4()));
        let transcript = root.join("session.jsonl");
        fs::create_dir_all(&root).unwrap();
        fs::write(
            &transcript,
            concat!(
                "{\"type\":\"artifact-comment-monitor\",\"artifacts\":{\"secret-a\":{\"state\":\"armed\",\"title\":\"private\"},\"secret-b\":{\"state\":\"paused\",\"url\":\"private\"}}}\n",
                "{\"type\":\"user\",\"message\":{\"content\":\"private prompt\"}}\n"
            ),
        )
        .unwrap();
        let summary = latest_artifact_monitor(&transcript).unwrap();
        assert_eq!(summary.monitor_type, "artifact-comment-monitor");
        assert_eq!(summary.state.as_deref(), Some("mixed"));
        assert_eq!(summary.artifact_count, 2);
        let public = serde_json::to_string(&summary).unwrap();
        assert!(!public.contains("secret-a"));
        assert!(!public.contains("private"));
        fs::remove_dir_all(root).unwrap();
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
        for model in [
            "claude-opus-5",
            "claude-opus-4-8",
            "claude-opus-4-7",
            "claude-opus-4-6",
            "claude-sonnet-5",
            "claude-sonnet-4-6",
            "claude-fable-5",
            "claude-mythos-5",
            "claude-mythos-preview",
            "bedrock/anthropic.claude-opus-4-6-20260801-v1:0",
            "vendor/OPUS 5 preview",
        ] {
            assert_eq!(context_window_for_model(model), Some(1_000_000), "{model}");
        }
        for model in [
            "claude-sonnet-4-5-20250929",
            "claude-haiku-4-5-20251001",
            "claude-3-7-sonnet-20250219",
            "vertex/claude-3-opus@20240229",
        ] {
            assert_eq!(context_window_for_model(model), Some(200_000), "{model}");
        }
        assert_eq!(context_window_for_model("claude-unknown-model"), None);
        assert_eq!(context_window_for_model("claude-opus-50"), None);
        assert_eq!(context_window_for_model("custom-model"), None);
    }

    #[test]
    fn applies_the_latest_model_context_and_clamps_percentage() {
        let root = env::temp_dir().join(format!("code-ai-model-change-test-{}", Uuid::new_v4()));
        let transcript = root.join("session.jsonl");
        fs::create_dir_all(&root).unwrap();
        fs::write(
            &transcript,
            concat!(
                "{\"isSidechain\":false,\"message\":{\"model\":\"claude-sonnet-4-5\",\"usage\":{\"cache_read_input_tokens\":100000}}}\n",
                "{\"isSidechain\":false,\"message\":{\"model\":\"claude-opus-4-6-20260801\",\"usage\":{\"cache_read_input_tokens\":1200000}}}\n"
            ),
        )
        .unwrap();
        let mut sessions = vec![CodeSession {
            id: "session-id".to_string(),
            title: "Session".to_string(),
            model: Some("claude-sonnet-4-5".to_string()),
            effort: None,
            completed_turns: 0,
            created_at: None,
            last_activity_at: None,
            is_archived: false,
            context_tokens: None,
            context_window_tokens: None,
            context_percent: None,
            published_artifact_count: 0,
            artifact_monitor: None,
            transfer: None,
            cli_session_id: Some("cli-id".to_string()),
        }];
        let transcripts = HashMap::from([("cli-id".to_string(), transcript)]);

        apply_session_context(&mut sessions, &transcripts);

        assert_eq!(
            sessions[0].model.as_deref(),
            Some("claude-opus-4-6-20260801")
        );
        assert_eq!(sessions[0].context_tokens, Some(1_200_000));
        assert_eq!(sessions[0].context_window_tokens, Some(1_000_000));
        assert_eq!(sessions[0].context_percent, Some(100.0));

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
    fn reads_complete_usage_samples_and_rejects_partial_files() {
        let root = env::temp_dir().join(format!("code-ai-usage-test-{}", Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        let usage_path = root.join("plan-usage-history.json");
        fs::write(
            &usage_path,
            br#"{"samples":[{"t":1720000000000,"u":{"fh":42.5,"sd":77.25}}]}"#,
        )
        .unwrap();
        let usage = read_usage(&root).unwrap();
        assert_eq!(usage.session_percent, Some(42.5));
        assert_eq!(usage.weekly_percent, Some(77.25));
        assert_eq!(usage.captured_at, Some(1_720_000_000_000));

        fs::write(&usage_path, br#"{"samples":[{"t":1720,"u":"#).unwrap();
        assert!(read_usage(&root).is_none());
        fs::remove_file(&usage_path).unwrap();
        assert!(read_usage(&root).is_none());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn refresh_usage_keeps_the_last_good_snapshot_on_partial_data() {
        let root = env::temp_dir().join(format!("code-ai-usage-merge-{}", Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        fs::write(root.join("plan-usage-history.json"), b"{partial").unwrap();
        let last_good = UsageStats {
            session_percent: Some(12.0),
            weekly_percent: Some(34.0),
            captured_at: Some(56),
        };
        let mut registry = Registry {
            version: REGISTRY_VERSION,
            instances: vec![ManagedInstance {
                id: Uuid::new_v4().to_string(),
                name: "Running".to_string(),
                account_label: None,
                avatar_url: None,
                plan: AccountPlan::Unknown,
                source_version: None,
                app_path: root.join("app").to_string_lossy().to_string(),
                profile_path: root.to_string_lossy().to_string(),
                created_at: String::new(),
                last_launched_at: None,
                pid: None,
                process_identity: None,
                launch_generation: 0,
                custom_icon: None,
                provider_provenance: None,
                status: InstanceStatus::Running,
                usage: Some(last_good.clone()),
                code_sessions: Vec::new(),
            }],
        };
        refresh_instance_usage(&mut registry);
        assert_eq!(
            registry.instances[0].usage.as_ref().unwrap().captured_at,
            Some(56)
        );
        fs::remove_dir_all(root).unwrap();
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
            source_update_cache: root.join("source-update-cache.json"),
            artifact_exports: root.join("artifact-exports"),
            original_update: root.join("original-update"),
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
            published_artifact_count: 0,
            artifact_monitor: None,
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
}
