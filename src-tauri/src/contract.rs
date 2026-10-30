//! Tipos que cruzan el IPC con el frontend y los eventos de la ventana. Cada uno tiene su espejo
//! literal en `src/types.ts`: un cambio aquí es un cambio de contrato. `ManagedInstance` es además
//! el formato del registro persistido (`instances.json`).

use super::*;

pub(crate) const ORIGINAL_INSTANCE_ID: &str = "__claude_original__";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ManagedInstance {
    pub(crate) id: String,
    pub(crate) name: String,
    pub(crate) account_label: Option<String>,
    #[serde(default)]
    pub(crate) avatar_url: Option<String>,
    pub(crate) plan: AccountPlan,
    pub(crate) source_version: Option<String>,
    pub(crate) app_path: String,
    pub(crate) profile_path: String,
    pub(crate) created_at: String,
    pub(crate) last_launched_at: Option<String>,
    #[serde(default)]
    pub(crate) pid: Option<u32>,
    #[serde(default)]
    pub(crate) process_identity: Option<ManagedProcessIdentity>,
    #[serde(default)]
    pub(crate) launch_generation: u64,
    #[serde(default)]
    pub(crate) custom_icon: Option<CustomIcon>,
    #[serde(default)]
    pub(crate) provider_provenance: Option<ProviderProvenance>,
    #[serde(default)]
    pub(crate) status: InstanceStatus,
    #[serde(default)]
    pub(crate) usage: Option<UsageStats>,
    #[serde(default)]
    pub(crate) code_sessions: Vec<CodeSession>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProviderProvenance {
    pub(crate) bundle_identifier: String,
    pub(crate) provider_team_identifier: Option<String>,
    pub(crate) provider_version: String,
    pub(crate) provider_source_fingerprint: String,
    pub(crate) managed_fingerprint: String,
    #[serde(default)]
    pub(crate) managed_code_hash: Option<String>,
    #[serde(default)]
    pub(crate) provider_signature_preserved: bool,
    pub(crate) original_icon_file: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ManagedProcessIdentity {
    pub(crate) root_pid: u32,
    pub(crate) process_group_id: Option<u32>,
    pub(crate) start_time: Option<u64>,
    pub(crate) fingerprint: String,
    pub(crate) profile_argument: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CustomIcon {
    pub(crate) path: String,
    pub(crate) revision: u64,
    pub(crate) system_applied: bool,
    pub(crate) system_message: String,
    /// macOS only: why the copy could not receive the Finder icon. `None` unless App Management blocked it.
    #[serde(default)]
    pub(crate) system_issue: Option<CustomIconSystemIssue>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
pub(crate) enum CustomIconSystemIssue {
    AppManagement,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub(crate) enum AccountPlan {
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
pub(crate) enum InstanceStatus {
    Running,
    #[default]
    Stopped,
    Missing,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct UsageStats {
    pub(crate) session_percent: Option<f64>,
    pub(crate) weekly_percent: Option<f64>,
    pub(crate) captured_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CodeSession {
    pub(crate) id: String,
    pub(crate) title: String,
    pub(crate) model: Option<String>,
    pub(crate) effort: Option<String>,
    pub(crate) completed_turns: u64,
    pub(crate) created_at: Option<i64>,
    pub(crate) last_activity_at: Option<i64>,
    pub(crate) is_archived: bool,
    pub(crate) context_tokens: Option<u64>,
    pub(crate) context_window_tokens: Option<u64>,
    pub(crate) context_percent: Option<f64>,
    #[serde(default)]
    pub(crate) published_artifact_count: u64,
    #[serde(default)]
    pub(crate) artifact_monitor: Option<ArtifactMonitorSummary>,
    #[serde(default)]
    pub(crate) transfer: Option<SessionTransferInfo>,
    #[serde(skip)]
    pub(crate) cli_session_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ArtifactMonitorSummary {
    pub(crate) monitor_type: String,
    pub(crate) state: Option<String>,
    pub(crate) artifact_count: u64,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Default, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub(crate) enum SessionTransferMode {
    #[default]
    Copy,
    Move,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SessionTransferInfo {
    pub(crate) origin_instance_id: String,
    pub(crate) mode: SessionTransferMode,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SystemInfo {
    pub(crate) app_version: String,
    pub(crate) platform: String,
    pub(crate) source_path: Option<String>,
    pub(crate) source_name: Option<String>,
    pub(crate) source_version: Option<String>,
    pub(crate) source_update: SourceUpdateInfo,
    pub(crate) version_topology: VersionTopology,
    pub(crate) original_profile_path: Option<String>,
    pub(crate) original_status: InstanceStatus,
    pub(crate) original_code_sessions: Vec<CodeSession>,
    pub(crate) free_bytes: Option<u64>,
    pub(crate) managed_bytes: u64,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct VersionTopology {
    pub(crate) latest_installed_version: Option<String>,
    pub(crate) latest_source: Option<VersionSource>,
    pub(crate) stale_instance_ids: Vec<String>,
    pub(crate) original_behind: bool,
    pub(crate) can_synchronize_managed: bool,
    pub(crate) reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct VersionSource {
    pub(crate) kind: VersionSourceKind,
    pub(crate) instance_id: Option<String>,
    pub(crate) name: String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub(crate) enum VersionSourceKind {
    Original,
    Managed,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SourceUpdateInfo {
    pub(crate) status: SourceUpdateStatus,
    pub(crate) latest_version: Option<String>,
    pub(crate) checked_at: Option<i64>,
    pub(crate) stale: bool,
    pub(crate) source: Option<SourceUpdateSource>,
    /// Frase para la persona cuando una fuente oficial falló o no se pudo verificar (AC-06). Sin URLs ni
    /// cuerpos de respuesta.
    #[serde(default)]
    pub(crate) warning: Option<String>,
}

impl Default for SourceUpdateInfo {
    fn default() -> Self {
        Self {
            status: SourceUpdateStatus::Unavailable,
            latest_version: None,
            checked_at: None,
            stale: false,
            source: None,
            warning: None,
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub(crate) enum SourceUpdateStatus {
    Current,
    Available,
    Unavailable,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) enum SourceUpdateSource {
    OfficialFeed,
    AptCache,
    /// La versión salió de la publicación oficial (`RELEASES.json`) y el feed confirmó su paquete.
    OfficialRelease,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct UsageSnapshot {
    pub(crate) instance_id: String,
    pub(crate) usage: UsageStats,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub(crate) enum OriginalApplicationUpdateAction {
    #[cfg_attr(target_os = "macos", allow(dead_code))]
    Download,
    Instructions,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct OriginalApplicationUpdateResult {
    pub(crate) action: OriginalApplicationUpdateAction,
    pub(crate) message: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DashboardState {
    pub(crate) instances: Vec<ManagedInstance>,
    pub(crate) system: SystemInfo,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ScanProgress {
    pub(crate) progress: u8,
    pub(crate) label: &'static str,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProcessExitEvent {
    pub(crate) instance_id: String,
    pub(crate) generation: u64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CreateInstanceRequest {
    pub(crate) name: String,
    pub(crate) source_path: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct UpdateInstanceRequest {
    pub(crate) id: String,
    pub(crate) name: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CopyCodeSessionRequest {
    pub(crate) source_instance_id: String,
    pub(crate) target_instance_id: String,
    pub(crate) session_id: String,
    #[serde(default)]
    pub(crate) mode: SessionTransferMode,
    #[serde(default = "default_include_local_artifacts")]
    pub(crate) include_local_artifacts: bool,
}

fn default_include_local_artifacts() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ArtifactTransferOutcome {
    pub(crate) local_candidates: u64,
    pub(crate) copied: u64,
    pub(crate) registered: u64,
    pub(crate) preserved_for_manual_import: u64,
    pub(crate) remote_references_omitted: u64,
    pub(crate) monitors_omitted: u64,
    pub(crate) export_path: Option<String>,
    pub(crate) warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SessionTransferResult {
    pub(crate) dashboard: DashboardState,
    pub(crate) artifacts: ArtifactTransferOutcome,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SynchronizeManagedApplicationsRequest {
    pub(crate) source: VersionSource,
    pub(crate) target_instance_ids: Vec<String>,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub(crate) enum SynchronizationStatus {
    Updated,
    Skipped,
    Failed,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SynchronizationItemResult {
    pub(crate) instance_id: String,
    pub(crate) status: SynchronizationStatus,
    pub(crate) from_version: Option<String>,
    pub(crate) to_version: Option<String>,
    pub(crate) message: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SynchronizeManagedApplicationsResult {
    pub(crate) dashboard: DashboardState,
    pub(crate) results: Vec<SynchronizationItemResult>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SetInstanceIconRequest {
    pub(crate) id: String,
    pub(crate) bytes: Vec<u8>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct UnlinkCodeSessionRequest {
    pub(crate) instance_id: String,
    pub(crate) session_id: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum SystemSettingsPanel {
    AppManagement,
    FilesAndFolders,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AccountFacts {
    /// macOS: the user belongs to the `admin` group. None off macOS or when `id` fails.
    pub(crate) admin: Option<bool>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::*;

    #[test]
    fn migrates_legacy_pid_records_without_trusting_the_pid_as_identity() {
        let instance: ManagedInstance = serde_json::from_value(serde_json::json!({
            "id": "96812ba4-6864-40d5-a70a-0470f244022c",
            "name": "Legacy",
            "accountLabel": null,
            "avatarUrl": null,
            "plan": "unknown",
            "sourceVersion": "1.0.0",
            "appPath": "/managed/application.app",
            "profilePath": "/managed/profile",
            "createdAt": "2026-10-10T00:00:00Z",
            "lastLaunchedAt": null,
            "pid": 42,
            "status": "running",
            "usage": null,
            "codeSessions": []
        }))
        .unwrap();
        assert_eq!(instance.pid, Some(42));
        assert!(instance.process_identity.is_none());
        assert_eq!(instance.launch_generation, 0);
    }

    #[test]
    fn custom_icon_contract_does_not_modify_the_application_path() {
        let root = env::temp_dir().join(format!("code-ai-icon-contract-{}", Uuid::new_v4()));
        let mut instance = test_instance(&root);
        let original_app_path = instance.app_path.clone();
        instance.custom_icon = Some(CustomIcon {
            path: root.join("branding/icon.png").to_string_lossy().to_string(),
            revision: 1,
            system_applied: false,
            system_message: "UI only".to_string(),
            system_issue: None,
        });
        assert_eq!(instance.app_path, original_app_path);
        assert!(!instance.custom_icon.unwrap().system_applied);
    }

    #[test]
    fn custom_icon_without_system_issue_reads_as_none_and_serializes_camel_case() {
        let icon: CustomIcon = serde_json::from_value(serde_json::json!({
            "path": "/managed/branding/icon.png",
            "revision": 3,
            "systemApplied": false,
            "systemMessage": "UI only"
        }))
        .unwrap();
        assert_eq!(icon.system_issue, None);
        let blocked = CustomIcon {
            system_issue: Some(CustomIconSystemIssue::AppManagement),
            ..icon
        };
        let value = serde_json::to_value(&blocked).unwrap();
        assert_eq!(value["systemIssue"], "appManagement");
        let back: CustomIcon = serde_json::from_value(value).unwrap();
        assert_eq!(
            back.system_issue,
            Some(CustomIconSystemIssue::AppManagement)
        );
    }

    #[test]
    fn system_settings_panel_accepts_only_known_values() {
        assert_eq!(
            serde_json::from_str::<SystemSettingsPanel>("\"appManagement\"").unwrap(),
            SystemSettingsPanel::AppManagement
        );
        assert_eq!(
            serde_json::from_str::<SystemSettingsPanel>("\"filesAndFolders\"").unwrap(),
            SystemSettingsPanel::FilesAndFolders
        );
        assert!(serde_json::from_str::<SystemSettingsPanel>("\"fullDisk\"").is_err());
        assert!(
            serde_json::from_str::<SystemSettingsPanel>("\"x-apple.systempreferences:a\"").is_err()
        );
    }

    #[test]
    fn account_facts_serializes_admin_as_nullable() {
        assert_eq!(
            serde_json::to_string(&AccountFacts { admin: None }).unwrap(),
            "{\"admin\":null}"
        );
        assert_eq!(
            serde_json::to_string(&AccountFacts { admin: Some(true) }).unwrap(),
            "{\"admin\":true}"
        );
    }
}
