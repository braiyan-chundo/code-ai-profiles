//! Linux: el paquete compartido `claude-desktop`, `dpkg-query`, `xdg-open` y el lanzador `.desktop`.

use super::*;

pub(crate) const PLATFORM_NAME: &str = "linux";

/// La aplicación compatible es una instalación compartida: no hay copias de bytes que sincronizar.
pub(crate) const SHARED_INSTALLATION: bool = true;

pub(crate) fn source_display_name(source: &Path) -> Option<String> {
    let mut desktop_files = vec![
        PathBuf::from("/usr/share/applications/claude-desktop.desktop"),
        PathBuf::from("/usr/local/share/applications/claude-desktop.desktop"),
    ];
    if let Some(home) = dirs::home_dir() {
        desktop_files.push(home.join(".local/share/applications/claude-desktop.desktop"));
    }
    let desktop_name = desktop_files.into_iter().find_map(|path| {
        fs::read_to_string(path)
            .ok()
            .and_then(|contents| linux_desktop_name(&contents))
    });
    source_name_from_metadata(desktop_name.as_deref(), None, source)
}

pub(crate) fn detect_provider_source() -> Option<PathBuf> {
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

pub(crate) fn detect_original_profile() -> Option<PathBuf> {
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

pub(crate) fn validate_source(path: &Path) -> Result<(), String> {
    if linux_provider_installation(path).is_none() {
        return Err("La ruta no corresponde a una instalación compatible para Linux.".to_string());
    }
    Ok(())
}

pub(crate) fn source_version(source: &Path) -> Option<String> {
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
            .and_then(|output| normalize_linux_version(&String::from_utf8_lossy(&output.stdout)))
    })
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
    Err("Linux usa la instalación compartida y no sincroniza copias de aplicación.".to_string())
}

/// Copia (o enlaza, en Linux) la aplicación compatible dentro de `application_root`, que ya existe.
pub(crate) fn copy_provider_bundle(
    source: &Path,
    application_root: &Path,
) -> Result<PathBuf, String> {
    use std::os::unix::fs::symlink;

    let (_, canonical_executable) = linux_provider_installation(source)
        .ok_or_else(|| "No se pudo resolver la instalación compatible para Linux.".to_string())?;
    let destination = application_root.join("claude-desktop");
    symlink(&canonical_executable, &destination)
        .map_err(|error| format!("No se pudo crear el lanzador administrado en Linux: {error}"))?;
    Ok(destination)
}

pub(crate) fn personalize_application_path(
    app_path: &Path,
    instance_name: &str,
) -> Result<PathBuf, String> {
    let _ = instance_name;
    Ok(app_path.to_path_buf())
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
    let Ok(root) = paths.root_for(&instance.id) else {
        return (
            false,
            "No se pudo resolver el launcher administrado.".to_string(),
        );
    };
    let executable = provider_executable(Path::new(&instance.app_path));
    let profile_argument = format!("--user-data-dir={}", instance.profile_path);
    let contents = format!(
        "[Desktop Entry]\nType=Application\nName={}\nIcon={}\nExec=\"{}\" \"{}\"\nStartupWMClass=code-ai-profiles-{}\nTerminal=false\n",
        desktop_entry_value(&instance.name),
        desktop_entry_value(&icon_path.to_string_lossy()),
        desktop_entry_value(&executable.to_string_lossy()),
        desktop_entry_value(&profile_argument),
        instance.id
    );
    match atomic_replace_file(&root.join("launcher.desktop"), contents.as_bytes()) {
        Ok(()) => (
            false,
            "Se creó un launcher opcional por instancia, pero solo se aplicará al sistema si se abre desde ese launcher; Wayland o el compositor pueden conservar el icono oficial."
                .to_string(),
        ),
        Err(error) => (false, error.into()),
    }
}

pub(crate) fn desktop_entry_value(value: &str) -> String {
    value
        .replace('\\', "\\\\")
        .replace('\n', " ")
        .replace('\r', " ")
        .replace('"', "\\\"")
}

/// Abre el canal oficial de actualización de la original (fuera de macOS).
pub(crate) fn open_update_url(url: &str) -> Result<std::process::ExitStatus, std::io::Error> {
    Command::new("xdg-open").arg(url).status()
}

/// Abre en el navegador del sistema un enlace `http`/`https` que la persona pulsó en el lector
/// (HU-0025). `url` llega ya validada y reserializada por `projects::reader::external_link`; va como
/// argumento, nunca en una cadena de shell. Distinto de `open_update_url`, que es solo del canal oficial.
pub(crate) fn open_external_url(url: &str) -> Result<(), AppError> {
    let status = Command::new("xdg-open")
        .arg(url)
        .status()
        .map_err(|error| {
            AppError::process(format!(
                "No se pudo abrir el enlace en el navegador: {error}"
            ))
        })?;
    if status.success() {
        Ok(())
    } else {
        Err(AppError::process(
            "No se pudo abrir el enlace en el navegador.",
        ))
    }
}
