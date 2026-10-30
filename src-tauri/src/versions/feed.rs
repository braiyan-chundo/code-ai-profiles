//! Comprobar si la original tiene una versión nueva: el feed oficial (y en macOS la publicación
//! oficial, `official_release.rs`), la caché de APT en Linux y la caché `source-update-cache.json`.

use super::*;

pub(crate) const UPDATE_CACHE_FRESH_MS: i64 = 6 * 60 * 60 * 1_000;

pub(crate) const UPDATE_CACHE_STALE_MS: i64 = 7 * 24 * 60 * 60 * 1_000;

/// Un resultado con aviso (una fuente falló o no se pudo verificar) solo cuenta como fresco este tiempo.
const UPDATE_CACHE_RETRY_MS: i64 = 30 * 60 * 1_000;

/// Versión del formato de `source-update-cache.json`; una caché con otra no se usa (HU-0024).
const SOURCE_UPDATE_CACHE_SCHEMA: u32 = 2;

const UPDATE_FEED_MAX_BYTES: u64 = 256 * 1_024;

const NULL_DEVICE_ID: &str = "00000000-0000-0000-0000-000000000000";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SourceUpdateCache {
    #[serde(default)]
    pub(crate) schema: u32,
    pub(crate) platform: String,
    pub(crate) installed_version: String,
    pub(crate) result: SourceUpdateInfo,
}

fn update_feed_target(platform: &str, arch: &str) -> Option<(&'static str, &'static str)> {
    match platform {
        "macos" => Some(("darwin", "universal")),
        "windows" => match arch {
            "x86_64" => Some(("win32", "x64")),
            "aarch64" => Some(("win32", "arm64")),
            _ => None,
        },
        _ => None,
    }
}

fn update_status(installed_version: &str, latest_version: &str) -> SourceUpdateStatus {
    if version_is_newer(latest_version, Some(installed_version)) {
        SourceUpdateStatus::Available
    } else {
        SourceUpdateStatus::Current
    }
}

pub(crate) fn read_source_update_cache(
    paths: &ManagedPaths,
    platform: &str,
    installed_version: &str,
    max_age_ms: i64,
) -> Option<SourceUpdateInfo> {
    let metadata = fs::symlink_metadata(&paths.source_update_cache).ok()?;
    if !metadata.is_file() || metadata.file_type().is_symlink() || metadata.len() > 64 * 1024 {
        return None;
    }
    let cache: SourceUpdateCache =
        serde_json::from_slice(&fs::read(&paths.source_update_cache).ok()?).ok()?;
    if cache.schema != SOURCE_UPDATE_CACHE_SCHEMA
        || cache.platform != platform
        || cache.installed_version != installed_version
    {
        return None;
    }
    let checked_at = cache.result.checked_at?;
    let age = Utc::now().timestamp_millis().saturating_sub(checked_at);
    if age < 0 || age > max_age_ms || cache.result.status == SourceUpdateStatus::Unavailable {
        return None;
    }
    let mut result = cache.result;
    result.stale = age > UPDATE_CACHE_FRESH_MS;
    if result.stale {
        result.status = SourceUpdateStatus::Unavailable;
    }
    Some(result)
}

/// La caché que `check_source_update_sync` da por buena sin volver a consultar: 6 h, o 30 min si el resultado
/// llevaba un aviso, para que el siguiente arranque o sondeo reintente la fuente que falló (AC-06).
fn read_fresh_source_update_cache(
    paths: &ManagedPaths,
    platform: &str,
    installed_version: &str,
) -> Option<SourceUpdateInfo> {
    let cached =
        read_source_update_cache(paths, platform, installed_version, UPDATE_CACHE_FRESH_MS)?;
    if cached.warning.is_some() {
        let age = Utc::now()
            .timestamp_millis()
            .saturating_sub(cached.checked_at?);
        if age > UPDATE_CACHE_RETRY_MS {
            return None;
        }
    }
    Some(cached)
}

pub(crate) fn save_source_update_cache(
    paths: &ManagedPaths,
    platform: &str,
    installed_version: &str,
    result: &SourceUpdateInfo,
) -> Result<(), AppError> {
    let cache = SourceUpdateCache {
        schema: SOURCE_UPDATE_CACHE_SCHEMA,
        platform: platform.to_string(),
        installed_version: installed_version.to_string(),
        result: result.clone(),
    };
    let contents = serde_json::to_vec_pretty(&cache).map_err(|error| {
        AppError::internal(format!(
            "No se pudo serializar la caché de actualización: {error}"
        ))
    })?;
    atomic_replace_file(&paths.source_update_cache, &contents)
}

/// Cómo se nombra en los mensajes el documento oficial que se consulta.
pub(crate) struct OfficialDocumentLabel {
    /// Al empezar una frase: «El feed oficial».
    pub(crate) subject: &'static str,
    /// Dentro de una frase: «el feed oficial».
    pub(crate) object: &'static str,
}

const OFFICIAL_FEED_LABEL: OfficialDocumentLabel = OfficialDocumentLabel {
    subject: "El feed oficial",
    object: "el feed oficial",
};

/// Un estado HTTP que no es de éxito: 5xx y 429 son de la red (se puede volver a consultar más
/// tarde); el resto es la respuesta definitiva de la fuente.
fn status_error(label: &OfficialDocumentLabel, status: reqwest::StatusCode) -> AppError {
    let message = format!("{} respondió con estado {}.", label.subject, status);
    if status.is_server_error() || status == reqwest::StatusCode::TOO_MANY_REQUESTS {
        AppError::network(message)
    } else {
        AppError::remote(message)
    }
}

/// GET de un documento JSON oficial de actualizaciones: 5 s, sin redirecciones, 256 KiB, sin cookies y con el
/// `User-Agent` propio. Solo lleva los parámetros de `query` que se le pasen. Sin conexión, sin respuesta a
/// tiempo o con la lectura cortada, el error es de red (reintentable); un documento que no se acepta es
/// definitivo. Nadie reintenta aquí.
pub(crate) fn fetch_official_json(
    url: String,
    query: &[(&str, &str)],
    label: &OfficialDocumentLabel,
) -> Result<Value, AppError> {
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|error| {
            AppError::internal(format!(
                "No se pudo preparar la consulta de actualización: {error}"
            ))
        })?;
    let mut request = client
        .get(url)
        .header(reqwest::header::USER_AGENT, config::user_agent());
    if !query.is_empty() {
        request = request.query(query);
    }
    let response = request.send().map_err(|error| {
        AppError::network(format!("No se pudo consultar {}: {error}", label.object))
    })?;
    if !response.status().is_success() {
        return Err(status_error(label, response.status()));
    }
    let too_large = || {
        AppError::remote(format!(
            "La respuesta de {} excede el límite permitido.",
            label.object
        ))
    };
    if response.content_length().unwrap_or(0) > UPDATE_FEED_MAX_BYTES {
        return Err(too_large());
    }
    let mut body = Vec::new();
    response
        .take(UPDATE_FEED_MAX_BYTES + 1)
        .read_to_end(&mut body)
        .map_err(|error| AppError::network(format!("No se pudo leer {}: {error}", label.object)))?;
    if body.len() as u64 > UPDATE_FEED_MAX_BYTES {
        return Err(too_large());
    }
    serde_json::from_slice(&body)
        .map_err(|_| AppError::remote(format!("{} devolvió metadata inválida.", label.subject)))
}

/// Consulta el feed oficial preguntando por `version` y devuelve su JSON, con `device_id` nulo.
pub(crate) fn fetch_official_feed(
    feed_platform: &str,
    feed_arch: &str,
    version: &str,
) -> Result<Value, AppError> {
    fetch_official_json(
        config::feed_url(feed_platform, feed_arch),
        &[("version", version), ("device_id", NULL_DEVICE_ID)],
        &OFFICIAL_FEED_LABEL,
    )
}

fn source_update_from_feed(
    document: &Value,
    installed_version: &str,
) -> Result<SourceUpdateInfo, AppError> {
    let latest_version = document
        .get("currentRelease")
        .and_then(Value::as_str)
        .filter(|version| valid_release_version(version))
        .map(str::to_string)
        .ok_or_else(|| AppError::remote("El feed oficial no incluyó una versión válida."))?;
    Ok(SourceUpdateInfo {
        status: update_status(installed_version, &latest_version),
        latest_version: Some(latest_version),
        checked_at: Some(Utc::now().timestamp_millis()),
        stale: false,
        source: Some(SourceUpdateSource::OfficialFeed),
        warning: None,
    })
}

/// El resultado de la detección a partir de la versión objetivo resuelta (A-2, A-3).
pub(crate) fn source_update_from_resolution(
    resolution: &official_release::OfficialResolution,
    installed_version: &str,
) -> SourceUpdateInfo {
    SourceUpdateInfo {
        status: update_status(installed_version, &resolution.latest_version),
        latest_version: Some(resolution.latest_version.clone()),
        checked_at: Some(Utc::now().timestamp_millis()),
        stale: false,
        source: Some(resolution.source),
        warning: resolution.warning.clone(),
    }
}

/// En macOS la versión objetivo sale de la publicación oficial confirmada por el feed (HU-0024, A-3); en
/// Windows, del feed preguntado con la versión instalada, como hasta ahora.
fn check_official_update_feed(
    platform: &str,
    arch: &str,
    installed_version: &str,
) -> Result<SourceUpdateInfo, AppError> {
    let (feed_platform, feed_arch) = update_feed_target(platform, arch)
        .ok_or_else(|| AppError::unsupported("No existe un feed oficial para esta plataforma."))?;
    if platform == "macos" {
        // `official_release` sigue con `String`: la clase se pierde al resolver la versión objetivo.
        let feed_for_installed =
            fetch_official_feed(feed_platform, feed_arch, installed_version).map_err(String::from);
        let published = official_release::fetch_published_releases(feed_platform, feed_arch);
        let resolution = official_release::resolve_official_target(
            installed_version,
            feed_for_installed,
            published,
            &mut |version| {
                fetch_official_feed(feed_platform, feed_arch, version).map_err(String::from)
            },
            &config::download_hosts(),
        )?;
        return Ok(source_update_from_resolution(
            &resolution,
            installed_version,
        ));
    }
    let document = fetch_official_feed(feed_platform, feed_arch, installed_version)?;
    source_update_from_feed(&document, installed_version)
}

fn parse_apt_policy(contents: &str) -> (Option<String>, Option<String>) {
    let value = |label: &str| {
        contents.lines().find_map(|line| {
            let (key, value) = line.trim().split_once(':')?;
            (key == label && value.trim() != "(none)")
                .then(|| value.trim().to_string())
                .filter(|value| valid_release_version(value))
        })
    };
    (value("Installed"), value("Candidate"))
}

fn check_apt_update(installed_version: &str) -> Result<SourceUpdateInfo, AppError> {
    let output = Command::new("apt-cache")
        .args(["policy", "claude-desktop"])
        .env("LC_ALL", "C")
        .output()
        .map_err(|error| {
            AppError::process(format!(
                "No se pudo consultar la caché local de APT: {error}"
            ))
        })?;
    if !output.status.success() {
        return Err(AppError::process(
            "APT no pudo consultar el paquete claude-desktop.",
        ));
    }
    let (_, candidate) = parse_apt_policy(&String::from_utf8_lossy(&output.stdout));
    let candidate =
        candidate.ok_or_else(|| AppError::remote("APT no tiene un candidato disponible."))?;
    let comparison = Command::new("dpkg")
        .args(["--compare-versions", &candidate, "gt", installed_version])
        .status()
        .map_err(|error| {
            AppError::process(format!(
                "No se pudieron comparar las versiones de APT: {error}"
            ))
        })?;
    Ok(SourceUpdateInfo {
        status: if comparison.success() {
            SourceUpdateStatus::Available
        } else {
            SourceUpdateStatus::Current
        },
        latest_version: Some(candidate),
        checked_at: Some(Utc::now().timestamp_millis()),
        stale: false,
        source: Some(SourceUpdateSource::AptCache),
        warning: None,
    })
}

pub(crate) fn check_source_update_sync(app: &AppHandle) -> Result<SourceUpdateInfo, String> {
    let paths = ManagedPaths::resolve(app)?;
    let source = require_provider_source(detect_provider_source())?;
    let installed_version = cached_source_version(&source)
        .filter(|version| valid_release_version(version))
        .ok_or_else(|| "No se pudo identificar la versión instalada.".to_string())?;
    let platform = platform_name();
    if let Some(cached) = read_fresh_source_update_cache(&paths, &platform, &installed_version) {
        return Ok(cached);
    }
    let checked = match platform.as_str() {
        "macos" | "windows" => {
            check_official_update_feed(&platform, std::env::consts::ARCH, &installed_version)
        }
        "linux" => check_apt_update(&installed_version),
        _ => Err(AppError::unsupported(
            "La comprobación de actualización no está soportada.",
        )),
    };
    match checked {
        Ok(result) => {
            let _ = save_source_update_cache(&paths, &platform, &installed_version, &result);
            Ok(result)
        }
        Err(_) => Ok(read_source_update_cache(
            &paths,
            &platform,
            &installed_version,
            UPDATE_CACHE_STALE_MS,
        )
        .unwrap_or_default()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::*;

    #[test]
    fn source_update_cache_is_bound_to_installed_version_and_stale_is_unavailable() {
        let root = env::temp_dir().join(format!("code-ai-update-cache-{}", Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        let paths = test_managed_paths(&root);
        let fresh = SourceUpdateInfo {
            status: SourceUpdateStatus::Current,
            latest_version: Some("2.0.0".to_string()),
            checked_at: Some(Utc::now().timestamp_millis()),
            stale: false,
            source: Some(SourceUpdateSource::OfficialFeed),
            warning: None,
        };
        save_source_update_cache(&paths, "macos", "2.0.0", &fresh).unwrap();

        assert_eq!(
            read_source_update_cache(&paths, "macos", "2.0.0", UPDATE_CACHE_FRESH_MS)
                .unwrap()
                .status,
            SourceUpdateStatus::Current
        );
        assert!(
            read_source_update_cache(&paths, "macos", "2.0.1", UPDATE_CACHE_STALE_MS).is_none()
        );

        let stale = SourceUpdateInfo {
            status: SourceUpdateStatus::Available,
            latest_version: Some("2.1.0".to_string()),
            checked_at: Some(
                Utc::now()
                    .timestamp_millis()
                    .saturating_sub(UPDATE_CACHE_FRESH_MS + 1_000),
            ),
            stale: false,
            source: Some(SourceUpdateSource::OfficialFeed),
            warning: None,
        };
        save_source_update_cache(&paths, "macos", "2.0.0", &stale).unwrap();
        let cached =
            read_source_update_cache(&paths, "macos", "2.0.0", UPDATE_CACHE_STALE_MS).unwrap();
        assert!(cached.stale);
        assert_eq!(cached.status, SourceUpdateStatus::Unavailable);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn source_update_cache_ignores_other_schemas_even_for_painting() {
        let root = env::temp_dir().join(format!("code-ai-update-schema-{}", Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        let paths = test_managed_paths(&root);
        let result = serde_json::json!({
            "status": "current",
            "latestVersion": "2.0.0",
            "checkedAt": Utc::now().timestamp_millis(),
            "stale": false,
            "source": "officialFeed"
        });
        for schema in [None, Some(1), Some(3)] {
            let mut cache = serde_json::json!({
                "platform": "macos",
                "installedVersion": "2.0.0",
                "result": result
            });
            if let Some(schema) = schema {
                cache["schema"] = Value::from(schema);
            }
            fs::write(
                &paths.source_update_cache,
                serde_json::to_vec(&cache).unwrap(),
            )
            .unwrap();
            assert!(
                read_source_update_cache(&paths, "macos", "2.0.0", UPDATE_CACHE_STALE_MS).is_none(),
                "{schema:?}"
            );
            assert!(read_fresh_source_update_cache(&paths, "macos", "2.0.0").is_none());
        }
        // The same document with the current schema is used, and a missing warning reads as none.
        let cache = serde_json::json!({
            "schema": SOURCE_UPDATE_CACHE_SCHEMA,
            "platform": "macos",
            "installedVersion": "2.0.0",
            "result": result
        });
        fs::write(
            &paths.source_update_cache,
            serde_json::to_vec(&cache).unwrap(),
        )
        .unwrap();
        let cached = read_fresh_source_update_cache(&paths, "macos", "2.0.0").unwrap();
        assert_eq!(cached.warning, None);
        let saved = SourceUpdateInfo {
            warning: None,
            ..cached
        };
        save_source_update_cache(&paths, "macos", "2.0.0", &saved).unwrap();
        let written: Value =
            serde_json::from_slice(&fs::read(&paths.source_update_cache).unwrap()).unwrap();
        assert_eq!(written["schema"], Value::from(2));
        assert_eq!(written["result"]["warning"], Value::Null);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn source_update_with_a_warning_is_fresh_for_thirty_minutes_only() {
        let root = env::temp_dir().join(format!("code-ai-update-retry-{}", Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        let paths = test_managed_paths(&root);
        let at_age = |age_ms: i64, warning: Option<&str>| SourceUpdateInfo {
            status: SourceUpdateStatus::Current,
            latest_version: Some("2.0.0".to_string()),
            checked_at: Some(Utc::now().timestamp_millis().saturating_sub(age_ms)),
            stale: false,
            source: Some(SourceUpdateSource::OfficialFeed),
            warning: warning.map(str::to_string),
        };
        let warning =
            Some("No se pudo leer la publicación oficial de versiones; se reintentará más tarde.");

        save_source_update_cache(&paths, "macos", "2.0.0", &at_age(29 * 60 * 1_000, warning))
            .unwrap();
        assert!(read_fresh_source_update_cache(&paths, "macos", "2.0.0").is_some());

        save_source_update_cache(&paths, "macos", "2.0.0", &at_age(31 * 60 * 1_000, warning))
            .unwrap();
        assert!(read_fresh_source_update_cache(&paths, "macos", "2.0.0").is_none());
        // Still good to paint the panel (system_info_scoped), with its warning.
        let painted =
            read_source_update_cache(&paths, "macos", "2.0.0", UPDATE_CACHE_STALE_MS).unwrap();
        assert_eq!(painted.status, SourceUpdateStatus::Current);
        assert_eq!(painted.warning.as_deref(), warning);

        save_source_update_cache(&paths, "macos", "2.0.0", &at_age(5 * 60 * 60 * 1_000, None))
            .unwrap();
        assert!(read_fresh_source_update_cache(&paths, "macos", "2.0.0").is_some());
        save_source_update_cache(&paths, "macos", "2.0.0", &at_age(7 * 60 * 60 * 1_000, None))
            .unwrap();
        assert!(read_fresh_source_update_cache(&paths, "macos", "2.0.0").is_none());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn source_update_from_resolution_carries_source_and_warning() {
        let resolution = official_release::OfficialResolution {
            latest_version: "4.4212.0".to_string(),
            package: None,
            package_error: None,
            source: SourceUpdateSource::OfficialRelease,
            warning: None,
        };
        let info = source_update_from_resolution(&resolution, "4.29.0");
        assert_eq!(info.status, SourceUpdateStatus::Available);
        assert_eq!(info.latest_version.as_deref(), Some("4.4212.0"));
        assert_eq!(info.source, Some(SourceUpdateSource::OfficialRelease));
        assert!(info.checked_at.is_some());
        assert_eq!(
            serde_json::to_value(&info).unwrap()["source"],
            Value::from("officialRelease")
        );
        assert_eq!(serde_json::to_value(&info).unwrap()["warning"], Value::Null);
        let warned = official_release::OfficialResolution {
            latest_version: "4.29.0".to_string(),
            source: SourceUpdateSource::OfficialFeed,
            warning: Some("Aviso.".to_string()),
            ..resolution
        };
        let info = source_update_from_resolution(&warned, "4.29.0");
        assert_eq!(info.status, SourceUpdateStatus::Current);
        assert_eq!(info.warning.as_deref(), Some("Aviso."));
    }

    #[test]
    fn validates_update_feed_targets_versions_and_null_device_identifier() {
        assert_eq!(
            update_feed_target("macos", "aarch64"),
            Some(("darwin", "universal"))
        );
        assert_eq!(
            update_feed_target("windows", "x86_64"),
            Some(("win32", "x64"))
        );
        assert_eq!(
            update_feed_target("windows", "aarch64"),
            Some(("win32", "arm64"))
        );
        assert_eq!(update_feed_target("linux", "x86_64"), None);
        assert_eq!(NULL_DEVICE_ID, "00000000-0000-0000-0000-000000000000");
        assert!(valid_release_version("1.22300.0"));
        assert!(valid_release_version("1:1.22300.0-1~stable"));
        assert!(!valid_release_version("https://invalid.example/version"));
        assert!(!valid_release_version(""));
    }

    #[test]
    fn maps_official_feed_document_to_source_update() {
        let document = serde_json::json!({ "currentRelease": "1.22400.0", "releases": [] });
        let newer = source_update_from_feed(&document, "1.22300.0").unwrap();
        assert_eq!(newer.status, SourceUpdateStatus::Available);
        assert_eq!(newer.latest_version.as_deref(), Some("1.22400.0"));
        assert_eq!(newer.source, Some(SourceUpdateSource::OfficialFeed));
        assert!(!newer.stale);
        assert!(newer.checked_at.is_some());
        assert_eq!(
            source_update_from_feed(&document, "1.22400.0")
                .unwrap()
                .status,
            SourceUpdateStatus::Current
        );
        assert!(source_update_from_feed(&serde_json::json!({}), "1.0.0").is_err());
        assert!(source_update_from_feed(
            &serde_json::json!({ "currentRelease": "https://invalid.example" }),
            "1.0.0"
        )
        .is_err());
    }

    /// Un servidor HTTP de un solo uso en el bucle local: responde una vez con `status` y cierra. Nada sale
    /// de la máquina.
    fn serve_once(status: &'static str, body: &'static str) -> String {
        use std::io::Write;
        let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let address = listener.local_addr().unwrap();
        thread::spawn(move || {
            if let Ok((mut stream, _)) = listener.accept() {
                let mut request = [0_u8; 4096];
                let _ = stream.read(&mut request);
                let _ = write!(
                    stream,
                    "HTTP/1.1 {status}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
                    body.len()
                );
            }
        });
        format!("http://{address}/feed")
    }

    #[test]
    fn a_feed_without_connection_is_a_retryable_network_error_with_the_same_text() {
        // Un puerto local que se acaba de cerrar: la conexión se rechaza sin salir de la máquina.
        let address = std::net::TcpListener::bind("127.0.0.1:0")
            .unwrap()
            .local_addr()
            .unwrap();
        let error =
            fetch_official_json(format!("http://{address}/feed"), &[], &OFFICIAL_FEED_LABEL)
                .unwrap_err();
        assert_eq!(error.kind(), AppErrorKind::Network);
        assert!(error.is_retryable());
        assert!(
            String::from(error).starts_with("No se pudo consultar el feed oficial: "),
            "same text as before"
        );
    }

    #[test]
    fn feed_status_decides_between_retryable_and_definitive() {
        let unavailable = fetch_official_json(
            serve_once("503 Service Unavailable", ""),
            &[],
            &OFFICIAL_FEED_LABEL,
        )
        .unwrap_err();
        assert!(unavailable.is_retryable());
        assert_eq!(
            unavailable.to_string(),
            "El feed oficial respondió con estado 503 Service Unavailable."
        );

        let limited = fetch_official_json(
            serve_once("429 Too Many Requests", ""),
            &[],
            &OFFICIAL_FEED_LABEL,
        )
        .unwrap_err();
        assert!(limited.is_retryable());

        let missing =
            fetch_official_json(serve_once("404 Not Found", ""), &[], &OFFICIAL_FEED_LABEL)
                .unwrap_err();
        assert_eq!(missing.kind(), AppErrorKind::Remote);
        assert!(!missing.is_retryable());
        assert_eq!(
            String::from(missing),
            "El feed oficial respondió con estado 404 Not Found."
        );

        let invalid = fetch_official_json(
            serve_once("200 OK", "no es json"),
            &[],
            &OFFICIAL_FEED_LABEL,
        )
        .unwrap_err();
        assert_eq!(invalid.kind(), AppErrorKind::Remote);
        assert_eq!(
            invalid.to_string(),
            "El feed oficial devolvió metadata inválida."
        );

        let document = fetch_official_json(
            serve_once("200 OK", r#"{"currentRelease":"1.2.3"}"#),
            &[],
            &OFFICIAL_FEED_LABEL,
        )
        .unwrap();
        assert_eq!(document["currentRelease"], "1.2.3");
    }

    #[test]
    fn a_feed_without_a_version_is_a_definitive_remote_error() {
        let error = source_update_from_feed(&serde_json::json!({}), "1.0.0").unwrap_err();
        assert_eq!(error.kind(), AppErrorKind::Remote);
        assert_eq!(
            String::from(error),
            "El feed oficial no incluyó una versión válida."
        );
        let unsupported = check_official_update_feed("linux", "x86_64", "1.0.0").unwrap_err();
        assert_eq!(unsupported.kind(), AppErrorKind::Unsupported);
        assert_eq!(
            unsupported.to_string(),
            "No existe un feed oficial para esta plataforma."
        );
    }

    #[test]
    fn parses_apt_policy_without_treating_missing_candidates_as_updates() {
        assert_eq!(
            parse_apt_policy(
                "claude-desktop:\n  Installed: 1.22209.0-1\n  Candidate: 1.22300.0-1\n"
            ),
            (
                Some("1.22209.0-1".to_string()),
                Some("1.22300.0-1".to_string())
            )
        );
        assert_eq!(
            parse_apt_policy("Installed: (none)\nCandidate: (none)\n"),
            (None, None)
        );
    }
}
