//! Cualquier otra plataforma: cada operación devuelve su error explícito o el valor neutro.

use super::*;

pub(crate) const PLATFORM_NAME: &str = "unknown";

/// La aplicación compatible es una instalación compartida: no hay copias de bytes que sincronizar.
pub(crate) const SHARED_INSTALLATION: bool = false;

pub(crate) fn source_display_name(source: &Path) -> Option<String> {
    source_name_from_metadata(None, None, source)
}

pub(crate) fn detect_provider_source() -> Option<PathBuf> {
    None
}

pub(crate) fn detect_original_profile() -> Option<PathBuf> {
    None
}

pub(crate) fn validate_source(path: &Path) -> Result<(), String> {
    let _ = path;
    Err("Esta plataforma todavía no está soportada.".to_string())
}

pub(crate) fn source_version(source: &Path) -> Option<String> {
    let _ = source;
    None
}

pub(crate) fn provider_executable(app_path: &Path) -> PathBuf {
    app_path.to_path_buf()
}

/// Archivos cuya huella (tamaño y fecha) entra en `application_fingerprint`, además del ejecutable.
pub(crate) fn fingerprint_metadata_paths(canonical_path: &Path) -> Vec<PathBuf> {
    let parent = canonical_path.parent().unwrap_or(canonical_path);
    vec![
        canonical_path.to_path_buf(),
        parent.join("resources/app.asar"),
        parent.join("resources/app-update.yml"),
    ]
}

pub(crate) fn validate_provider_identity_uncached(
    _candidate: &Path,
    _original: &Path,
) -> Result<(), String> {
    Err("La sincronización no está soportada en esta plataforma.".to_string())
}

/// Copia (o enlaza, en Linux) la aplicación compatible dentro de `application_root`, que ya existe.
pub(crate) fn copy_provider_bundle(
    source: &Path,
    application_root: &Path,
) -> Result<PathBuf, String> {
    let _ = (source, application_root);
    Err("Esta plataforma todavía no está soportada.".to_string())
}

pub(crate) fn personalize_application_path(
    app_path: &Path,
    instance_name: &str,
) -> Result<PathBuf, String> {
    let _ = instance_name;
    Ok(app_path.to_path_buf())
}

/// Envía la señal a los procesos ya verificados por `signal_instance_processes`. En unix, al grupo de
/// procesos cuando el PID raíz coincide; en Windows, `taskkill` por PID.
#[cfg(not(unix))]
pub(crate) fn signal_verified_processes(
    identity: &ManagedProcessIdentity,
    processes: Vec<(u32, u64)>,
    force: bool,
) -> Result<(), AppError> {
    let _ = (identity, processes, force);
    Err(AppError::unsupported(
        "Detener procesos no está soportado en esta plataforma.",
    ))
}

/// En unix la instancia nace en su propio grupo de procesos, para señalizarla entera.
#[cfg(not(unix))]
pub(crate) fn isolate_process_group(_command: &mut Command) {}

/// El grupo de procesos que `isolate_process_group` dio al proceso raíz, si la plataforma los tiene.
#[cfg(not(unix))]
pub(crate) fn launched_process_group(_root_pid: u32) -> Option<u32> {
    None
}

/// El gestor de archivos del sistema que abre `open_in_file_manager`.
pub(crate) fn file_manager_program() -> &'static str {
    "xdg-open"
}

pub(crate) fn open_system_settings_sync(_panel: SystemSettingsPanel) -> Result<(), String> {
    Err("Esta plataforma no tiene ese panel de ajustes.".to_string())
}

pub(crate) fn account_facts_sync() -> AccountFacts {
    AccountFacts { admin: None }
}

pub(crate) fn apply_external_icon_best_effort(
    paths: &ManagedPaths,
    instance: &ManagedInstance,
    icon_path: &Path,
) -> (bool, String) {
    let _ = (paths, instance, icon_path);
    (
        false,
        "El icono de sistema no está soportado en esta plataforma.".to_string(),
    )
}

/// Abre el canal oficial de actualización de la original (fuera de macOS).
pub(crate) fn open_update_url(_url: &str) -> Result<std::process::ExitStatus, std::io::Error> {
    unreachable!()
}
