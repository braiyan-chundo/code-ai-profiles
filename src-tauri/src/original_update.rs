//! Descarga, verificación e instalación de la aplicación original en macOS (HU-0017, ADR-0002).

use super::*;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct InstallOriginalUpdateRequest {
    pub(crate) expected_version: String,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub(crate) enum OriginalInstallPhase {
    Preparing,
    Downloading,
    Verifying,
    Installing,
    Synchronizing,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct OriginalInstallProgress {
    pub(crate) phase: OriginalInstallPhase,
    pub(crate) target_version: Option<String>,
    pub(crate) received_bytes: u64,
    pub(crate) total_bytes: u64,
    pub(crate) cancellable: bool,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub(crate) enum OriginalInstallStatus {
    Installed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct OriginalInstallResult {
    pub(crate) status: OriginalInstallStatus,
    pub(crate) previous_version: Option<String>,
    pub(crate) installed_version: Option<String>,
    pub(crate) synchronization: Vec<SynchronizationItemResult>,
    pub(crate) pending_instance_ids: Vec<String>,
    pub(crate) dashboard: DashboardState,
}

/// Lo que devuelve el flujo antes de recalcular el panel.
pub(crate) struct OriginalInstallOutcome {
    pub(crate) status: OriginalInstallStatus,
    pub(crate) previous_version: Option<String>,
    pub(crate) installed_version: Option<String>,
    pub(crate) synchronization: Vec<SynchronizationItemResult>,
    pub(crate) pending_instance_ids: Vec<String>,
}

impl OriginalInstallOutcome {
    pub(crate) fn into_result(self, dashboard: DashboardState) -> OriginalInstallResult {
        OriginalInstallResult {
            status: self.status,
            previous_version: self.previous_version,
            installed_version: self.installed_version,
            synchronization: self.synchronization,
            pending_instance_ids: self.pending_instance_ids,
            dashboard,
        }
    }
}

pub(crate) fn install_original_update_sync(
    _app: &AppHandle,
    _request: InstallOriginalUpdateRequest,
    _progress: &dyn Fn(OriginalInstallProgress),
) -> Result<OriginalInstallOutcome, String> {
    Err("La instalación directa todavía no está disponible. La original no cambió.".to_string())
}

pub(crate) fn cancel_original_update() -> bool {
    false
}
