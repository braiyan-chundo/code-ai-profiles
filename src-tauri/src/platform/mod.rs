//! Lo específico de cada sistema operativo, detrás de una fachada: cada archivo de plataforma define
//! las mismas funciones con la misma firma y este módulo reexporta las del sistema que se compila.
//!
//! - `macos.rs`, `windows.rs`, `linux.rs` y `unsupported.rs` (cualquier otro) definen la detección de la
//!   aplicación y su perfil, la versión, la firma, la copia del bundle, el gestor de archivos, Ajustes del
//!   Sistema, la cuenta y `open_external_url` (el enlace que se pulsa en el lector de historias, HU-0025).
//!   Las que solo usa el código de fuera de macOS (`apply_external_icon_best_effort`,
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

/// HU-0028 · the `Icon=` value of the main `[Desktop Entry]`: a theme name or an absolute path, as written.
#[cfg(any(test, target_os = "linux"))]
pub(crate) fn linux_desktop_icon(contents: &str) -> Option<String> {
    let mut in_desktop_entry = false;
    for line in contents.lines() {
        let line = line.trim();
        if line.starts_with('[') {
            in_desktop_entry = line == "[Desktop Entry]";
            continue;
        }
        if in_desktop_entry {
            if let Some(value) = line.strip_prefix("Icon=") {
                let value = value.trim();
                return (!value.is_empty()
                    && value.len() <= 4096
                    && !value.chars().any(char::is_control))
                .then(|| value.to_string());
            }
        }
    }
    None
}

/// Directories an absolute `Icon=` path may point into, besides `<data>/icons/`.
#[cfg(any(test, target_os = "linux"))]
const LINUX_ICON_ROOTS: [&str; 3] = ["/usr/share/", "/usr/local/share/", "/opt/"];

/// HU-0028 · where the PNG of an `Icon=` value may be, in lookup order. A name (`[A-Za-z0-9._-]{1,128}`) goes
/// through the hicolor theme (512, 256, 128) of `<data_home>`, `/usr/local/share` and `/usr/share`, then
/// `/usr/share/pixmaps`. An absolute path is accepted only as a `.png` under `/usr/share/`, `/usr/local/share/`,
/// `/opt/` or `<data_home>/icons/`, without `.` or `..` segments. Anything else (an SVG, a relative path) has none.
#[cfg(any(test, target_os = "linux"))]
pub(crate) fn linux_icon_candidates(icon: &str, data_home: Option<&Path>) -> Vec<PathBuf> {
    let data_home = data_home
        .map(|path| path.to_string_lossy().trim_end_matches('/').to_string())
        .filter(|path| path.starts_with('/'));
    if icon.starts_with('/') {
        let segments_are_plain = icon
            .split('/')
            .skip(1)
            .all(|segment| !segment.is_empty() && segment != "." && segment != "..");
        let is_png = icon
            .rsplit_once('.')
            .is_some_and(|(_, extension)| extension.eq_ignore_ascii_case("png"));
        let user_root = data_home.as_ref().map(|home| format!("{home}/icons/"));
        let under_allowed_root = LINUX_ICON_ROOTS.iter().any(|root| icon.starts_with(root))
            || user_root.is_some_and(|root| icon.starts_with(&root));
        return if segments_are_plain && is_png && under_allowed_root {
            vec![PathBuf::from(icon)]
        } else {
            Vec::new()
        };
    }
    let name_is_simple = (1..=128).contains(&icon.len())
        && icon.chars().all(|character| {
            character.is_ascii_alphanumeric() || matches!(character, '.' | '_' | '-')
        });
    if !name_is_simple {
        return Vec::new();
    }
    let mut data_roots = Vec::new();
    data_roots.extend(data_home);
    data_roots.push("/usr/local/share".to_string());
    data_roots.push("/usr/share".to_string());
    let mut candidates = Vec::new();
    for root in &data_roots {
        for size in ["512x512", "256x256", "128x128"] {
            candidates.push(PathBuf::from(format!(
                "{root}/icons/hicolor/{size}/apps/{icon}.png"
            )));
        }
    }
    candidates.push(PathBuf::from(format!("/usr/share/pixmaps/{icon}.png")));
    candidates
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

/// Lo que imprime la consulta de `Get-AppxPackage` en Windows (`windows.rs`), una cosa por línea: la familia
/// del paquete, su carpeta de instalación y los ejecutables relativos de su manifiesto.
#[cfg(any(test, target_os = "windows"))]
#[derive(Debug, PartialEq, Eq)]
pub(crate) struct PackagedQuery {
    pub(crate) family: String,
    pub(crate) install_location: PathBuf,
    /// Solo los que terminan en `Claude.exe`, sin `..` ni rutas absolutas.
    pub(crate) executables: Vec<String>,
}

/// `None` si no hay paquete o si la familia no es un nombre de carpeta simple (va dentro de una ruta).
#[cfg(any(test, target_os = "windows"))]
pub(crate) fn parse_packaged_query(output: &str) -> Option<PackagedQuery> {
    let mut lines = output
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty());
    let family = lines.next()?;
    let family_is_simple = family
        .chars()
        .all(|character| character.is_ascii_alphanumeric() || matches!(character, '.' | '_' | '-'))
        && !family.starts_with('.');
    if !family_is_simple {
        return None;
    }
    let install_location = lines.next()?;
    let executables = lines
        .filter(|relative| {
            let segments: Vec<&str> = relative.split(['\\', '/']).collect();
            !relative.contains(':')
                && !relative.starts_with(['\\', '/'])
                && segments.iter().all(|segment| *segment != "..")
                && segments
                    .last()
                    .is_some_and(|name| name.eq_ignore_ascii_case("Claude.exe"))
        })
        .map(str::to_string)
        .collect();
    Some(PackagedQuery {
        family: family.to_string(),
        install_location: PathBuf::from(install_location),
        executables,
    })
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
    fn parses_only_the_main_linux_desktop_icon() {
        assert_eq!(
            linux_desktop_icon("[Desktop Entry]\nName=Claude\nIcon= claude-desktop \n").as_deref(),
            Some("claude-desktop")
        );
        assert_eq!(
            linux_desktop_icon(
                "[Desktop Action new]\nIcon=other\n[Desktop Entry]\nIcon=/opt/Claude/icon.png\n"
            )
            .as_deref(),
            Some("/opt/Claude/icon.png")
        );
        assert_eq!(linux_desktop_icon("[Other]\nIcon=ignore\n"), None);
        assert_eq!(linux_desktop_icon("[Desktop Entry]\nIcon=\n"), None);
        assert_eq!(linux_desktop_icon("[Desktop Entry]\nName=Claude\n"), None);
    }

    #[test]
    fn linux_icon_names_go_through_the_hicolor_theme_and_pixmaps_in_order() {
        let candidates =
            linux_icon_candidates("claude-desktop", Some(Path::new("/home/u/.local/share/")));
        assert_eq!(candidates.len(), 10);
        assert_eq!(
            candidates[0],
            PathBuf::from("/home/u/.local/share/icons/hicolor/512x512/apps/claude-desktop.png")
        );
        assert_eq!(
            candidates[2],
            PathBuf::from("/home/u/.local/share/icons/hicolor/128x128/apps/claude-desktop.png")
        );
        assert_eq!(
            candidates[3],
            PathBuf::from("/usr/local/share/icons/hicolor/512x512/apps/claude-desktop.png")
        );
        assert_eq!(
            candidates[6],
            PathBuf::from("/usr/share/icons/hicolor/512x512/apps/claude-desktop.png")
        );
        assert_eq!(
            candidates[9],
            PathBuf::from("/usr/share/pixmaps/claude-desktop.png")
        );
        // Without a data home only the system roots are searched.
        assert_eq!(linux_icon_candidates("claude", None).len(), 7);
        assert_eq!(
            linux_icon_candidates("claude", Some(Path::new("relative"))).len(),
            7
        );
        for unsafe_name in ["", "a/b", "a b", "../x", "ícono", &"x".repeat(129)] {
            assert!(
                linux_icon_candidates(unsafe_name, None).is_empty(),
                "{unsafe_name:?}"
            );
        }
    }

    #[test]
    fn linux_absolute_icon_paths_are_only_pngs_under_known_roots() {
        let home = Some(Path::new("/home/u/.local/share"));
        for accepted in [
            "/usr/share/icons/hicolor/256x256/apps/claude.png",
            "/usr/local/share/claude/icon.PNG",
            "/opt/Claude/resources/icon.png",
            "/home/u/.local/share/icons/claude.png",
        ] {
            assert_eq!(
                linux_icon_candidates(accepted, home),
                vec![PathBuf::from(accepted)],
                "{accepted}"
            );
        }
        for refused in [
            "/usr/share/icons/claude.svg",
            "/etc/claude.png",
            "/home/u/.local/share/claude.png",
            "/usr/share/../../etc/x.png",
            "/usr/share/./x.png",
            "/usr/share//x.png",
            "/opt",
        ] {
            assert!(linux_icon_candidates(refused, home).is_empty(), "{refused}");
        }
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
    fn windows_child_processes_never_open_a_console_window() {
        let source = include_str!("windows.rs");
        assert_eq!(source.matches("Command::new(").count(), 1);
        let helper = source
            .split("fn hidden_command(")
            .nth(1)
            .and_then(|rest| rest.split("\n}\n").next())
            .expect("hidden_command helper");
        assert!(helper.contains("Command::new(program)"));
        assert!(helper.contains("creation_flags(CREATE_NO_WINDOW)"));
    }

    #[test]
    fn parses_the_windows_package_query() {
        let query = parse_packaged_query(
            "Claude_pzs8sxrjxfjjc\r\nC:\\Program Files\\WindowsApps\\Claude_4.4212.0.0_x64__pzs8sxrjxfjjc\r\napp\\claude.exe\r\n",
        )
        .expect("a package should be parsed");
        assert_eq!(query.family, "Claude_pzs8sxrjxfjjc");
        assert_eq!(
            query.install_location,
            PathBuf::from("C:\\Program Files\\WindowsApps\\Claude_4.4212.0.0_x64__pzs8sxrjxfjjc")
        );
        assert_eq!(query.executables, vec!["app\\claude.exe".to_string()]);

        let without_manifest = parse_packaged_query("Claude_x\nC:\\Apps\\Claude\n").unwrap();
        assert!(without_manifest.executables.is_empty());
    }

    #[test]
    fn rejects_unsafe_windows_package_query_values() {
        assert_eq!(parse_packaged_query(""), None);
        assert_eq!(parse_packaged_query("Claude_x\n"), None);
        assert_eq!(parse_packaged_query("..\\Roaming\nC:\\Apps\n"), None);
        assert_eq!(parse_packaged_query("Claude\\x\nC:\\Apps\n"), None);
        let query = parse_packaged_query(
            "Claude_x\nC:\\Apps\n..\\Claude.exe\nC:\\Claude.exe\n\\Claude.exe\napp\\Helper.exe\nClaude.exe\n",
        )
        .unwrap();
        assert_eq!(query.executables, vec!["Claude.exe".to_string()]);
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
