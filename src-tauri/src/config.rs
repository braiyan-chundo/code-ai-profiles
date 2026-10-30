//! Configuración propia de la app, fijada al compilar por `build.rs` desde `.env.example` (ADR-0002).
//!
//! Es el único sitio de Rust con URLs y hosts. En ejecución no se lee ninguna variable propia: así nadie
//! puede redirigir el feed ni la descarga de la original con el entorno.

use reqwest::Url;

const UPDATE_FEED_URL: &str = env!("CAP_UPDATE_FEED_URL");
const RELEASES_URL: &str = env!("CAP_UPDATE_RELEASES_URL");
const UPDATE_DOWNLOAD_HOSTS: &str = env!("CAP_UPDATE_DOWNLOAD_HOSTS");
const WINDOWS_X64_DOWNLOAD_URL: &str = env!("CAP_WINDOWS_X64_DOWNLOAD_URL");
const WINDOWS_ARM64_DOWNLOAD_URL: &str = env!("CAP_WINDOWS_ARM64_DOWNLOAD_URL");
const LINUX_INSTALL_GUIDE_URL: &str = env!("CAP_LINUX_INSTALL_GUIDE_URL");
const MACOS_APP_MANAGEMENT_SETTINGS_URL: &str = env!("CAP_MACOS_APP_MANAGEMENT_SETTINGS_URL");
const MACOS_FILES_AND_FOLDERS_SETTINGS_URL: &str = env!("CAP_MACOS_FILES_AND_FOLDERS_SETTINGS_URL");

/// URL del feed oficial para una plataforma y arquitectura del feed (`darwin`/`universal`, `win32`/`x64`…).
pub(crate) fn feed_url(platform: &str, arch: &str) -> String {
    UPDATE_FEED_URL
        .replace("{platform}", platform)
        .replace("{arch}", arch)
}

/// URL de la publicación oficial de versiones (`RELEASES.json`) para una plataforma y arquitectura.
pub(crate) fn releases_url(platform: &str, arch: &str) -> String {
    feed_url_from(RELEASES_URL, platform, arch)
}

/// Hosts desde los que se acepta descargar el paquete oficial, en minúsculas.
pub(crate) fn download_hosts() -> Vec<String> {
    parse_hosts(UPDATE_DOWNLOAD_HOSTS)
}

pub(crate) fn windows_x64_download_url() -> &'static str {
    WINDOWS_X64_DOWNLOAD_URL
}

pub(crate) fn windows_arm64_download_url() -> &'static str {
    WINDOWS_ARM64_DOWNLOAD_URL
}

pub(crate) fn linux_install_guide_url() -> &'static str {
    LINUX_INSTALL_GUIDE_URL
}

/// Panel «Gestión de apps» de Ajustes del Sistema (macOS).
pub(crate) fn macos_app_management_settings_url() -> &'static str {
    MACOS_APP_MANAGEMENT_SETTINGS_URL
}

/// Panel «Archivos y carpetas» de Ajustes del Sistema (macOS).
pub(crate) fn macos_files_and_folders_settings_url() -> &'static str {
    MACOS_FILES_AND_FOLDERS_SETTINGS_URL
}

pub(crate) fn user_agent() -> String {
    format!("Code-AI-Profiles/{}", env!("CARGO_PKG_VERSION"))
}

/// Comprueba el formato de la configuración compilada. `setup` no abre la ventana si falla.
pub(crate) fn validate() -> Result<(), String> {
    validate_values(&ConfigValues {
        update_feed_url: UPDATE_FEED_URL,
        update_releases_url: RELEASES_URL,
        update_download_hosts: UPDATE_DOWNLOAD_HOSTS,
        windows_x64_download_url: WINDOWS_X64_DOWNLOAD_URL,
        windows_arm64_download_url: WINDOWS_ARM64_DOWNLOAD_URL,
        linux_install_guide_url: LINUX_INSTALL_GUIDE_URL,
        macos_app_management_settings_url: MACOS_APP_MANAGEMENT_SETTINGS_URL,
        macos_files_and_folders_settings_url: MACOS_FILES_AND_FOLDERS_SETTINGS_URL,
    })
}

struct ConfigValues<'a> {
    update_feed_url: &'a str,
    update_releases_url: &'a str,
    update_download_hosts: &'a str,
    windows_x64_download_url: &'a str,
    windows_arm64_download_url: &'a str,
    linux_install_guide_url: &'a str,
    macos_app_management_settings_url: &'a str,
    macos_files_and_folders_settings_url: &'a str,
}

fn validate_values(values: &ConfigValues<'_>) -> Result<(), String> {
    let invalid =
        |key: &str, reason: &str| format!("La configuración {key} no es válida: {reason}");
    for (key, template) in [
        ("CAP_UPDATE_FEED_URL", values.update_feed_url),
        ("CAP_UPDATE_RELEASES_URL", values.update_releases_url),
    ] {
        if !template.contains("{platform}") || !template.contains("{arch}") {
            return Err(invalid(key, "debe incluir {platform} y {arch}."));
        }
        validate_https_url(&feed_url_from(template, "darwin", "universal"))
            .map_err(|reason| invalid(key, &reason))?;
    }
    let hosts = parse_hosts(values.update_download_hosts);
    if hosts.is_empty() {
        return Err(invalid(
            "CAP_UPDATE_DOWNLOAD_HOSTS",
            "necesita al menos un host.",
        ));
    }
    if let Some(host) = hosts.iter().find(|host| !valid_host_name(host)) {
        return Err(invalid(
            "CAP_UPDATE_DOWNLOAD_HOSTS",
            &format!("«{host}» no es un nombre de host."),
        ));
    }
    for (key, value) in [
        (
            "CAP_WINDOWS_X64_DOWNLOAD_URL",
            values.windows_x64_download_url,
        ),
        (
            "CAP_WINDOWS_ARM64_DOWNLOAD_URL",
            values.windows_arm64_download_url,
        ),
        (
            "CAP_LINUX_INSTALL_GUIDE_URL",
            values.linux_install_guide_url,
        ),
    ] {
        validate_https_url(value).map_err(|reason| invalid(key, &reason))?;
    }
    for (key, value) in [
        (
            "CAP_MACOS_APP_MANAGEMENT_SETTINGS_URL",
            values.macos_app_management_settings_url,
        ),
        (
            "CAP_MACOS_FILES_AND_FOLDERS_SETTINGS_URL",
            values.macos_files_and_folders_settings_url,
        ),
    ] {
        validate_settings_url(value).map_err(|reason| invalid(key, &reason))?;
    }
    Ok(())
}

fn feed_url_from(template: &str, platform: &str, arch: &str) -> String {
    template
        .replace("{platform}", platform)
        .replace("{arch}", arch)
}

fn validate_https_url(value: &str) -> Result<(), String> {
    let url = Url::parse(value).map_err(|_| "no es una URL.".to_string())?;
    if url.scheme() != "https" {
        return Err("debe usar https.".to_string());
    }
    if url.host_str().is_none_or(str::is_empty) {
        return Err("no tiene host.".to_string());
    }
    if !url.username().is_empty() || url.password().is_some() {
        return Err("no puede llevar usuario ni contraseña.".to_string());
    }
    Ok(())
}

/// Enlace a Ajustes del Sistema: esquema exacto y, después, solo caracteres de un ancla conocida.
fn validate_settings_url(value: &str) -> Result<(), String> {
    const PREFIX: &str = "x-apple.systempreferences:";
    let rest = value
        .strip_prefix(PREFIX)
        .ok_or_else(|| format!("debe empezar por {PREFIX}"))?;
    if rest.is_empty() {
        return Err("no indica qué panel abrir.".to_string());
    }
    if !rest
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '?' | '=' | '&' | '-'))
    {
        return Err("lleva caracteres no permitidos.".to_string());
    }
    Ok(())
}

fn parse_hosts(value: &str) -> Vec<String> {
    value
        .split(',')
        .map(|host| host.trim().to_ascii_lowercase())
        .filter(|host| !host.is_empty())
        .collect()
}

fn valid_host_name(host: &str) -> bool {
    host.len() <= 253
        && host.contains('.')
        && host.split('.').all(|label| {
            !label.is_empty()
                && label.len() <= 63
                && !label.starts_with('-')
                && !label.ends_with('-')
                && label
                    .chars()
                    .all(|character| character.is_ascii_alphanumeric() || character == '-')
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> ConfigValues<'static> {
        ConfigValues {
            update_feed_url: "https://feed.example.test/{platform}/{arch}/update",
            update_releases_url:
                "https://downloads.example.test/releases/{platform}/{arch}/RELEASES.json",
            update_download_hosts: "downloads.example.test, Mirror.Example.Test",
            windows_x64_download_url: "https://example.test/win/x64",
            windows_arm64_download_url: "https://example.test/win/arm64",
            linux_install_guide_url: "https://example.test/linux",
            macos_app_management_settings_url:
                "x-apple.systempreferences:com.apple.preference.security?Privacy_AppBundles",
            macos_files_and_folders_settings_url:
                "x-apple.systempreferences:com.apple.preference.security?Privacy_FilesAndFolders",
        }
    }

    #[test]
    fn compiled_configuration_is_valid() {
        assert_eq!(validate(), Ok(()));
        assert!(!download_hosts().is_empty());
        let feed = feed_url("darwin", "universal");
        assert!(feed.starts_with("https://"));
        assert!(!feed.contains('{'));
        let releases = releases_url("darwin", "universal");
        assert!(releases.starts_with("https://"));
        assert!(!releases.contains('{'));
        assert_eq!(
            user_agent(),
            format!("Code-AI-Profiles/{}", env!("CARGO_PKG_VERSION"))
        );
    }

    #[test]
    fn validation_accepts_sample_and_normalizes_hosts() {
        assert_eq!(validate_values(&sample()), Ok(()));
        assert_eq!(
            parse_hosts("downloads.example.test, Mirror.Example.Test,,"),
            vec!["downloads.example.test", "mirror.example.test"]
        );
        assert_eq!(
            feed_url_from(sample().update_feed_url, "win32", "arm64"),
            "https://feed.example.test/win32/arm64/update"
        );
    }

    #[test]
    fn validation_names_the_broken_key() {
        let cases: [(ConfigValues<'static>, &str); 12] = [
            (
                ConfigValues {
                    update_feed_url: "https://feed.example.test/update",
                    ..sample()
                },
                "CAP_UPDATE_FEED_URL",
            ),
            (
                ConfigValues {
                    update_feed_url: "http://feed.example.test/{platform}/{arch}",
                    ..sample()
                },
                "CAP_UPDATE_FEED_URL",
            ),
            (
                ConfigValues {
                    update_releases_url: "https://downloads.example.test/releases/RELEASES.json",
                    ..sample()
                },
                "CAP_UPDATE_RELEASES_URL",
            ),
            (
                ConfigValues {
                    update_releases_url: "https://downloads.example.test/{platform}/RELEASES.json",
                    ..sample()
                },
                "CAP_UPDATE_RELEASES_URL",
            ),
            (
                ConfigValues {
                    update_releases_url:
                        "http://downloads.example.test/{platform}/{arch}/RELEASES.json",
                    ..sample()
                },
                "CAP_UPDATE_RELEASES_URL",
            ),
            (
                ConfigValues {
                    update_download_hosts: " , ",
                    ..sample()
                },
                "CAP_UPDATE_DOWNLOAD_HOSTS",
            ),
            (
                ConfigValues {
                    update_download_hosts: "https://downloads.example.test",
                    ..sample()
                },
                "CAP_UPDATE_DOWNLOAD_HOSTS",
            ),
            (
                ConfigValues {
                    windows_x64_download_url: "not a url",
                    ..sample()
                },
                "CAP_WINDOWS_X64_DOWNLOAD_URL",
            ),
            (
                ConfigValues {
                    linux_install_guide_url: "https://user:secret@example.test/linux",
                    ..sample()
                },
                "CAP_LINUX_INSTALL_GUIDE_URL",
            ),
            (
                ConfigValues {
                    macos_app_management_settings_url: "https://example.test/settings",
                    ..sample()
                },
                "CAP_MACOS_APP_MANAGEMENT_SETTINGS_URL",
            ),
            (
                ConfigValues {
                    macos_files_and_folders_settings_url: "",
                    ..sample()
                },
                "CAP_MACOS_FILES_AND_FOLDERS_SETTINGS_URL",
            ),
            (
                ConfigValues {
                    macos_app_management_settings_url: "x-apple.systempreferences:",
                    ..sample()
                },
                "CAP_MACOS_APP_MANAGEMENT_SETTINGS_URL",
            ),
        ];
        for (values, key) in cases {
            let error = validate_values(&values).unwrap_err();
            assert!(error.contains(key), "{error}");
        }
    }

    #[test]
    fn settings_urls_accept_known_anchors_and_reject_the_rest() {
        assert!(!macos_app_management_settings_url().is_empty());
        assert!(!macos_files_and_folders_settings_url().is_empty());
        for good in [
            "x-apple.systempreferences:com.apple.preference.security?Privacy_AppBundles",
            "x-apple.systempreferences:com.apple.preference.security?Privacy_FilesAndFolders",
        ] {
            assert_eq!(validate_settings_url(good), Ok(()), "{good}");
        }
        for bad in [
            "https://example.test/x",
            "file:///etc/passwd",
            "x-apple.systempreferences",
            "x-apple.systempreferences:",
            "",
            "x-apple.systempreferences:a b",
            "x-apple.systempreferences:a\"b",
            "x-apple.systempreferences:a;b",
            "X-Apple.systempreferences:a",
        ] {
            assert!(validate_settings_url(bad).is_err(), "{bad}");
        }
    }
}
