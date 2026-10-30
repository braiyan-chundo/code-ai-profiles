//! Lo específico de cada sistema operativo, detrás de una fachada: cada archivo de plataforma define
//! las mismas funciones con la misma firma y este módulo reexporta las del sistema que se compila.
//!
//! - `macos.rs`, `windows.rs`, `linux.rs` y `unsupported.rs` (cualquier otro) definen la detección de la
//!   aplicación y su perfil, la versión, la firma, la copia del bundle, el gestor de archivos, Ajustes del
//!   Sistema y la cuenta. Las que solo usa el código de fuera de macOS (`apply_external_icon_best_effort`,
//!   `open_update_url`) no existen en macOS, igual que sus llamadores.
//! - `unix.rs` (macOS, Linux y cualquier unix) y `windows.rs` definen las señales y los grupos de procesos;
//!   `unsupported.rs` solo cuando no es unix.
//! - Aquí queda lo portable: nombres legibles, el parseo de Linux que se prueba en todas las plataformas y
//!   `open_in_file_manager`.

use super::*;

#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "macos")]
mod macos;
#[cfg(unix)]
mod unix;
#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
mod unsupported;
#[cfg(target_os = "windows")]
mod windows;

#[cfg(target_os = "linux")]
pub(crate) use self::linux::*;
#[cfg(target_os = "macos")]
pub(crate) use self::macos::*;
#[cfg(unix)]
pub(crate) use self::unix::*;
#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
pub(crate) use self::unsupported::*;
#[cfg(target_os = "windows")]
pub(crate) use self::windows::*;

pub(crate) fn platform_name() -> String {
    PLATFORM_NAME.to_string()
}

pub(crate) fn sanitize_source_name(value: &str) -> Option<String> {
    let value = value.trim();
    (!value.is_empty() && value.chars().count() <= 80 && !value.chars().any(char::is_control))
        .then(|| value.to_string())
}

fn readable_source_stem(source: &Path) -> Option<String> {
    let stem = source.file_stem()?.to_str()?;
    let words = stem
        .split(['-', '_'])
        .filter(|word| !word.is_empty())
        .map(|word| {
            let mut characters = word.chars();
            characters
                .next()
                .map(|first| first.to_uppercase().collect::<String>() + characters.as_str())
                .unwrap_or_default()
        })
        .collect::<Vec<_>>()
        .join(" ");
    sanitize_source_name(&words)
}

pub(crate) fn source_name_from_metadata(
    preferred: Option<&str>,
    alternate: Option<&str>,
    source: &Path,
) -> Option<String> {
    preferred
        .and_then(sanitize_source_name)
        .or_else(|| alternate.and_then(sanitize_source_name))
        .or_else(|| readable_source_stem(source))
}

#[cfg(any(test, target_os = "linux"))]
pub(crate) fn linux_desktop_name(contents: &str) -> Option<String> {
    let mut in_desktop_entry = false;
    for line in contents.lines() {
        let line = line.trim();
        if line.starts_with('[') {
            in_desktop_entry = line == "[Desktop Entry]";
            continue;
        }
        if in_desktop_entry {
            if let Some(value) = line.strip_prefix("Name=") {
                return sanitize_source_name(value);
            }
        }
    }
    None
}

pub(crate) fn require_provider_source(source: Option<PathBuf>) -> Result<PathBuf, String> {
    source.ok_or_else(|| {
        "No se encontró la instalación original de la aplicación compatible.".to_string()
    })
}

#[cfg(any(test, target_os = "linux"))]
pub(crate) fn linux_provider_installation(path: &Path) -> Option<(PathBuf, PathBuf)> {
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
pub(crate) fn normalize_linux_version(value: &str) -> Option<String> {
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

/// Abre una carpeta en el gestor de archivos del sistema. La ruta la decide Rust (registro de
/// instancias o de proyectos), nunca el frontend.
pub(crate) fn open_in_file_manager(path: &Path) -> Result<(), String> {
    let mut command = Command::new(file_manager_program());

    command
        .arg(path)
        .spawn()
        .map_err(|error| format!("No se pudo abrir la carpeta: {error}"))?;
    Ok(())
}

/// Enlace fijado al compilar (`config.rs`). El frontend solo envía el panel, nunca una URL.
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
pub(crate) fn system_settings_url(panel: SystemSettingsPanel) -> &'static str {
    match panel {
        SystemSettingsPanel::AppManagement => config::macos_app_management_settings_url(),
        SystemSettingsPanel::FilesAndFolders => config::macos_files_and_folders_settings_url(),
    }
}

/// `true` si `id -Gn` lista exactamente el grupo `admin`.
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
pub(crate) fn groups_include_admin(groups: &str) -> bool {
    groups.split_whitespace().any(|group| group == "admin")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitizes_source_names_and_uses_readable_fallbacks() {
        let bundle = Path::new("/Applications/claude-desktop.app");
        assert_eq!(
            source_name_from_metadata(Some("  Claude Desktop  "), Some("Claude"), bundle)
                .as_deref(),
            Some("Claude Desktop")
        );
        assert_eq!(
            source_name_from_metadata(Some("bad\nname"), Some("Claude"), bundle).as_deref(),
            Some("Claude")
        );
        assert_eq!(
            source_name_from_metadata(None, None, bundle).as_deref(),
            Some("Claude Desktop")
        );
        assert!(sanitize_source_name(&"x".repeat(81)).is_none());
    }

    #[test]
    fn parses_only_the_main_linux_desktop_name() {
        assert_eq!(
            linux_desktop_name(
                "[Desktop Entry]\nName[es]=Claude Escritorio\nName=Claude Desktop\n"
            )
            .as_deref(),
            Some("Claude Desktop")
        );
        assert_eq!(linux_desktop_name("[Other]\nName=Ignore\n"), None);
    }

    #[test]
    fn requires_a_detected_source_before_updating_the_original_application() {
        let source = PathBuf::from("/Applications/Claude.app");
        assert_eq!(require_provider_source(Some(source.clone())), Ok(source));
        assert_eq!(
            require_provider_source(None),
            Err("No se encontró la instalación original de la aplicación compatible.".to_string())
        );
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
    fn system_settings_url_matches_each_panel() {
        assert_eq!(
            system_settings_url(SystemSettingsPanel::AppManagement),
            config::macos_app_management_settings_url()
        );
        assert_eq!(
            system_settings_url(SystemSettingsPanel::FilesAndFolders),
            config::macos_files_and_folders_settings_url()
        );
        assert!(
            system_settings_url(SystemSettingsPanel::AppManagement).ends_with("Privacy_AppBundles")
        );
        assert!(system_settings_url(SystemSettingsPanel::FilesAndFolders)
            .ends_with("Privacy_FilesAndFolders"));
    }

    #[test]
    fn groups_include_admin_matches_the_exact_group() {
        assert!(groups_include_admin("staff admin everyone"));
        assert!(groups_include_admin("admin\n"));
        assert!(!groups_include_admin("staff everyone"));
        assert!(!groups_include_admin("administrators"));
        assert!(!groups_include_admin(""));
    }
}
