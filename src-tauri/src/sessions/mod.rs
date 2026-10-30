//! Sesiones de Code de cada perfil: leer sus índices y del transcript solo los metadatos permitidos
//! (título, modelo, turnos, contexto estimado y el estado del monitor de artefactos). Nunca se leen
//! ni se devuelven prompts, respuestas ni el contenido del transcript.

use super::*;

mod links;
mod transfer;

pub(crate) use self::links::*;
pub(crate) use self::transfer::*;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CodeSessionDocument {
    pub(crate) session_id: Option<String>,
    pub(crate) cli_session_id: Option<String>,
    pub(crate) title: Option<String>,
    pub(crate) model: Option<String>,
    pub(crate) effort: Option<String>,
    pub(crate) completed_turns: Option<u64>,
    pub(crate) created_at: Option<i64>,
    pub(crate) last_activity_at: Option<i64>,
    #[serde(default)]
    pub(crate) is_archived: bool,
    #[serde(default, deserialize_with = "deserialize_collection_count")]
    pub(crate) published_artifacts: u64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TranscriptEntry {
    #[serde(default)]
    pub(crate) is_sidechain: bool,
    #[serde(rename = "type")]
    pub(crate) entry_type: Option<String>,
    pub(crate) subtype: Option<String>,
    pub(crate) message: Option<TranscriptMessage>,
    pub(crate) artifacts: Option<HashMap<String, ArtifactMonitorEntry>>,
}

#[derive(Debug, Deserialize)]
pub(crate) struct ArtifactMonitorEntry {
    pub(crate) state: Option<String>,
}

#[derive(Debug, Deserialize)]
pub(crate) struct TranscriptMessage {
    pub(crate) model: Option<String>,
    pub(crate) usage: Option<TranscriptUsage>,
}

#[derive(Debug, Deserialize)]
pub(crate) struct TranscriptUsage {
    #[serde(default)]
    pub(crate) input_tokens: u64,
    #[serde(default)]
    pub(crate) cache_creation_input_tokens: u64,
    #[serde(default)]
    pub(crate) cache_read_input_tokens: u64,
    #[serde(default)]
    pub(crate) iterations: Vec<TranscriptUsageIteration>,
}

#[derive(Debug, Deserialize)]
pub(crate) struct TranscriptUsageIteration {
    #[serde(default)]
    pub(crate) input_tokens: u64,
    #[serde(default)]
    pub(crate) cache_creation_input_tokens: u64,
    #[serde(default)]
    pub(crate) cache_read_input_tokens: u64,
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
pub(crate) struct SessionContextSnapshot {
    pub(crate) model: Option<String>,
    pub(crate) context_tokens: u64,
    pub(crate) context_window_tokens: Option<u64>,
}

pub(crate) fn clean_session_text(value: Option<String>, max_chars: usize) -> Option<String> {
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

pub(crate) fn canonical_code_session_id(value: &str) -> Option<String> {
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

pub(crate) fn latest_artifact_monitor(path: &Path) -> Option<ArtifactMonitorSummary> {
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

pub(crate) fn collect_code_session_files(directory: &Path, depth: usize, files: &mut Vec<PathBuf>) {
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

pub(crate) fn code_transcript_catalog() -> HashMap<String, PathBuf> {
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

pub(crate) fn read_code_sessions(
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

pub(crate) fn find_code_session_index(
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

#[cfg(test)]
mod tests {
    use super::*;

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
}
