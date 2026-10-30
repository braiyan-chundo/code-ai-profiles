//! Versión objetivo de la original desde la publicación oficial (`RELEASES.json`) confirmada por el feed
//! (HU-0024, A-2).
//!
//! El feed preguntado con la versión instalada no ve el despliegue escalonado: puede seguir anunciando una
//! versión anterior a la publicada. La publicación oficial dice qué versión existe; el feed, preguntado con
//! esa versión, aporta su paquete (`sha256`, `size`) y solo vale si anuncia la misma versión con la **misma
//! URL**. Todo es puro salvo `fetch_published_releases`.

use super::*;
use crate::original_update::{parse_feed_package, validate_download_url, FeedPackage};

const PUBLISHED_RELEASES_LABEL: OfficialDocumentLabel = OfficialDocumentLabel {
    subject: "La publicación oficial de versiones",
    object: "la publicación oficial de versiones",
};

/// Lo que anuncia `RELEASES.json`: su `currentRelease` y la URL de su paquete (sin `sha256` ni `size`).
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct PublishedRelease {
    pub(crate) version: String,
    pub(crate) url: reqwest::Url,
}

/// La versión objetivo resuelta y, si es posterior a la instalada y se pudo verificar, su paquete.
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct OfficialResolution {
    pub(crate) latest_version: String,
    pub(crate) package: Option<FeedPackage>,
    /// Por qué no hay paquete cuando la versión resuelta es posterior a la instalada.
    pub(crate) package_error: Option<String>,
    pub(crate) source: SourceUpdateSource,
    pub(crate) warning: Option<String>,
}

/// Lee `RELEASES.json`: `currentRelease` válido, la entrada cuyo `updateTo.version` es esa y su `url` con
/// las mismas reglas que el paquete del feed. Ignora `name`, `pub_date` y `notes`.
pub(crate) fn parse_published_release(
    document: &Value,
    allowed_hosts: &[String],
) -> Result<PublishedRelease, String> {
    let current = document
        .get("currentRelease")
        .and_then(Value::as_str)
        .filter(|version| valid_release_version(version))
        .ok_or_else(|| {
            "La publicación oficial de versiones no incluyó una versión válida.".to_string()
        })?;
    let url = document
        .get("releases")
        .and_then(Value::as_array)
        .and_then(|releases| {
            releases.iter().find_map(|release| {
                let update = release.get("updateTo")?;
                (update.get("version").and_then(Value::as_str) == Some(current))
                    .then(|| update.get("url").and_then(Value::as_str))
                    .flatten()
            })
        })
        .ok_or_else(|| {
            format!("La publicación oficial de versiones no incluye el paquete de la versión {current}.")
        })?;
    Ok(PublishedRelease {
        version: current.to_string(),
        url: validate_download_url(url, allowed_hosts)?,
    })
}

/// El paquete del feed preguntado con la versión publicada: válido, de esa versión y con su misma URL.
pub(crate) fn confirm_published_package(
    feed_document: &Value,
    published: &PublishedRelease,
    allowed_hosts: &[String],
) -> Result<FeedPackage, String> {
    let package = parse_feed_package(feed_document, allowed_hosts)?;
    if package.version != published.version {
        return Err(format!(
            "El feed oficial anuncia la versión {} y no la {} publicada.",
            package.version, published.version
        ));
    }
    if package.url != published.url {
        return Err(format!(
            "El paquete del feed oficial para la versión {} no es el de la publicación oficial.",
            published.version
        ));
    }
    Ok(FeedPackage {
        source: SourceUpdateSource::OfficialRelease,
        ..package
    })
}

fn unverified_warning(version: &str) -> String {
    format!(
        "La publicación oficial anuncia la versión {version}, pero no se pudo verificar su paquete; se reintentará más tarde."
    )
}

const UNREADABLE_RELEASES_WARNING: &str =
    "No se pudo leer la publicación oficial de versiones; se reintentará más tarde.";

/// Qué versión manda (D-1, D-2), con como mucho una consulta extra al feed (`feed_for_version`).
///
/// - `P` (publicada) posterior a la instalada y a `F` (feed con la instalada): se confirma con el feed
///   preguntado por `P`; si no se confirma, se sigue con `F` y un aviso.
/// - Si no, manda `F` (también cuando la publicación va por detrás), con aviso si no se pudo leer `P`.
/// - Sin `F`: `P` igual o anterior a la instalada ⇒ al día; si no, el error del feed.
pub(crate) fn resolve_official_target(
    installed_version: &str,
    feed_for_installed: Result<Value, String>,
    published: Result<Value, String>,
    feed_for_version: &mut dyn FnMut(&str) -> Result<Value, String>,
    allowed_hosts: &[String],
) -> Result<OfficialResolution, String> {
    let feed = feed_for_installed.and_then(|document| {
        let version = document
            .get("currentRelease")
            .and_then(Value::as_str)
            .filter(|version| valid_release_version(version))
            .map(str::to_string)
            .ok_or_else(|| "El feed oficial no incluyó una versión válida.".to_string())?;
        Ok((version, document))
    });
    let published =
        published.and_then(|document| parse_published_release(&document, allowed_hosts));
    let feed_version = feed.as_ref().ok().map(|(version, _)| version.as_str());

    let mut warning = None;
    if let Ok(release) = &published {
        if version_is_newer(&release.version, Some(installed_version))
            && version_is_newer(&release.version, feed_version)
        {
            let confirmed = feed_for_version(&release.version)
                .and_then(|document| confirm_published_package(&document, release, allowed_hosts));
            match confirmed {
                Ok(package) => {
                    return Ok(OfficialResolution {
                        latest_version: release.version.clone(),
                        package: Some(package),
                        package_error: None,
                        source: SourceUpdateSource::OfficialRelease,
                        warning: None,
                    })
                }
                Err(_) => warning = Some(unverified_warning(&release.version)),
            }
        }
    }

    match feed {
        Ok((version, document)) => {
            let (package, package_error) = if version_is_newer(&version, Some(installed_version)) {
                match parse_feed_package(&document, allowed_hosts) {
                    Ok(package) => (Some(package), None),
                    Err(error) => (None, Some(error)),
                }
            } else {
                (None, None)
            };
            if published.is_err() {
                warning.get_or_insert_with(|| UNREADABLE_RELEASES_WARNING.to_string());
            }
            Ok(OfficialResolution {
                latest_version: version,
                package,
                package_error,
                source: SourceUpdateSource::OfficialFeed,
                warning,
            })
        }
        Err(feed_error) => match published {
            Ok(release) if !version_is_newer(&release.version, Some(installed_version)) => {
                Ok(OfficialResolution {
                    latest_version: release.version,
                    package: None,
                    package_error: None,
                    source: SourceUpdateSource::OfficialRelease,
                    warning: None,
                })
            }
            _ => Err(feed_error),
        },
    }
}

/// GET a `RELEASES.json` con los mismos límites que el feed y **sin query** ni identificadores.
pub(crate) fn fetch_published_releases(platform: &str, arch: &str) -> Result<Value, String> {
    fetch_official_json(
        config::releases_url(platform, arch),
        &[],
        &PUBLISHED_RELEASES_LABEL,
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::RefCell;

    const HOST: &str = "downloads.example.test";
    const SHA: &str = "aa66f2e3c3b8e1a4a0a1d23f1c2b5a6e7d8c9b0a1f2e3d4c5b6a7980716253ab";
    const INSTALLED: &str = "4.29.0";
    const PUBLISHED: &str = "4.4212.0";

    fn hosts() -> Vec<String> {
        vec![HOST.to_string()]
    }

    fn package_url(version: &str) -> String {
        format!("https://{HOST}/releases/darwin/universal/{version}/Claude-cbfe3c56d49c49332ad5a9588303c9dbc70a5e7f.zip")
    }

    /// `RELEASES.json` con la forma que publica hoy: sin `sha256` ni `size`.
    fn releases(current: &str, url: &str) -> Value {
        serde_json::json!({
            "currentRelease": current,
            "releases": [
                { "version": "4.28.0", "updateTo": {
                    "version": "4.28.0",
                    "pub_date": "2026-10-01T00:00:00.000Z",
                    "notes": "",
                    "name": "4.28.0",
                    "url": package_url("4.28.0")
                }},
                { "version": current, "updateTo": {
                    "version": current,
                    "pub_date": "2026-10-28T00:00:00.000Z",
                    "notes": "",
                    "name": current,
                    "url": url
                }}
            ]
        })
    }

    /// El feed con la forma de hoy: el paquete de `current` con `sha256` y `size`.
    fn feed(current: &str, url: &str) -> Value {
        serde_json::json!({
            "currentRelease": current,
            "releases": [{ "version": current, "updateTo": {
                "version": current,
                "pub_date": "2026-10-28T00:00:00.000Z",
                "notes": "",
                "name": current,
                "url": url,
                "sha256": SHA,
                "size": 378_758_916_u64
            }}]
        })
    }

    fn published_release() -> PublishedRelease {
        PublishedRelease {
            version: PUBLISHED.to_string(),
            url: reqwest::Url::parse(&package_url(PUBLISHED)).unwrap(),
        }
    }

    #[test]
    fn parses_the_published_release_of_today() {
        let release =
            parse_published_release(&releases(PUBLISHED, &package_url(PUBLISHED)), &hosts())
                .unwrap();
        assert_eq!(release, published_release());
    }

    #[test]
    fn rejects_every_malformed_published_release() {
        let with_url = |url: String| releases(PUBLISHED, &url);
        let cases = [
            serde_json::json!({}),
            serde_json::json!({ "currentRelease": "https://invalid.example", "releases": [] }),
            serde_json::json!({ "currentRelease": "", "releases": [] }),
            serde_json::json!({ "currentRelease": PUBLISHED, "releases": [] }),
            serde_json::json!({ "currentRelease": PUBLISHED, "releases": [
                { "version": PUBLISHED, "updateTo": { "version": "4.28.0", "url": package_url(PUBLISHED) } }
            ]}),
            serde_json::json!({ "currentRelease": PUBLISHED, "releases": [
                { "version": PUBLISHED, "updateTo": { "version": PUBLISHED } }
            ]}),
            with_url(format!("http://{HOST}/a.zip")),
            with_url(format!("https://other.example.test/{PUBLISHED}/Claude.zip")),
            with_url(format!("https://{HOST}.evil.example.test/a.zip")),
            with_url(format!("https://user:secret@{HOST}/a.zip")),
            with_url(format!("https://{HOST}:8443/a.zip")),
            with_url(format!("https://{HOST}/{PUBLISHED}/Claude.dmg")),
            with_url("not a url".to_string()),
        ];
        for (index, document) in cases.iter().enumerate() {
            assert!(
                parse_published_release(document, &hosts()).is_err(),
                "case {index} should be rejected"
            );
        }
    }

    #[test]
    fn confirms_only_the_same_version_and_the_same_url() {
        let release = published_release();
        let package = confirm_published_package(
            &feed(PUBLISHED, &package_url(PUBLISHED)),
            &release,
            &hosts(),
        )
        .unwrap();
        assert_eq!(package.version, PUBLISHED);
        assert_eq!(package.url, release.url);
        assert_eq!(package.sha256, SHA);
        assert_eq!(package.size, 378_758_916);
        assert_eq!(package.source, SourceUpdateSource::OfficialRelease);
        // Same URL once normalized (explicit default port, uppercase host).
        let normalized = format!(
            "https://{}:443/releases/darwin/universal/{PUBLISHED}/Claude-cbfe3c56d49c49332ad5a9588303c9dbc70a5e7f.zip",
            HOST.to_ascii_uppercase()
        );
        assert!(
            confirm_published_package(&feed(PUBLISHED, &normalized), &release, &hosts()).is_ok()
        );

        let mut no_sha = feed(PUBLISHED, &package_url(PUBLISHED));
        no_sha["releases"][0]["updateTo"]
            .as_object_mut()
            .unwrap()
            .remove("sha256");
        let mut no_size = feed(PUBLISHED, &package_url(PUBLISHED));
        no_size["releases"][0]["updateTo"]
            .as_object_mut()
            .unwrap()
            .remove("size");
        let rejected = [
            feed(INSTALLED, &package_url(INSTALLED)),
            feed("4.5000.0", &package_url(PUBLISHED)),
            feed(PUBLISHED, &format!("https://{HOST}/releases/darwin/universal/{PUBLISHED}/Claude-other.zip")),
            feed(PUBLISHED, &format!("https://{HOST}/releases/darwin/universal/{PUBLISHED}/Claude-cbfe3c56d49c49332ad5a9588303c9dbc70a5e7f.zip?x=1")),
            no_sha,
            no_size,
        ];
        for (index, document) in rejected.iter().enumerate() {
            assert!(
                confirm_published_package(document, &release, &hosts()).is_err(),
                "case {index} should be rejected"
            );
        }
    }

    struct Resolved {
        result: Result<OfficialResolution, String>,
        asked: Vec<String>,
    }

    fn resolve(
        feed_for_installed: Result<Value, String>,
        published: Result<Value, String>,
        feed_for_version: impl Fn(&str) -> Result<Value, String>,
    ) -> Resolved {
        let asked = RefCell::new(Vec::new());
        let result = resolve_official_target(
            INSTALLED,
            feed_for_installed,
            published,
            &mut |version| {
                asked.borrow_mut().push(version.to_string());
                feed_for_version(version)
            },
            &hosts(),
        );
        Resolved {
            result,
            asked: asked.into_inner(),
        }
    }

    fn offline() -> Result<Value, String> {
        Err("No se pudo consultar el feed oficial: sin red".to_string())
    }

    #[test]
    fn staged_rollout_installs_the_published_version_confirmed_by_the_feed() {
        // AC-01, AC-05: the feed asked with 4.29.0 still says 4.29.0; RELEASES.json says 4.4212.0.
        let resolved = resolve(
            Ok(feed(INSTALLED, &package_url(INSTALLED))),
            Ok(releases(PUBLISHED, &package_url(PUBLISHED))),
            |version| Ok(feed(version, &package_url(version))),
        );
        let resolution = resolved.result.unwrap();
        assert_eq!(resolution.latest_version, PUBLISHED);
        assert_eq!(resolution.source, SourceUpdateSource::OfficialRelease);
        assert_eq!(resolution.warning, None);
        let package = resolution.package.unwrap();
        assert_eq!(package.version, PUBLISHED);
        assert_eq!(package.url.as_str(), package_url(PUBLISHED));
        assert_eq!(resolved.asked, vec![PUBLISHED]);
    }

    #[test]
    fn unverifiable_published_version_falls_back_to_the_feed_with_a_warning() {
        for confirmation in [
            offline(),
            Ok(feed(
                PUBLISHED,
                &format!("https://{HOST}/releases/darwin/universal/{PUBLISHED}/Claude-echo.zip"),
            )),
            Ok(feed(INSTALLED, &package_url(INSTALLED))),
        ] {
            let resolved = resolve(
                Ok(feed("4.30.0", &package_url("4.30.0"))),
                Ok(releases(PUBLISHED, &package_url(PUBLISHED))),
                move |_| confirmation.clone(),
            );
            let resolution = resolved.result.unwrap();
            assert_eq!(resolution.latest_version, "4.30.0");
            assert_eq!(resolution.source, SourceUpdateSource::OfficialFeed);
            assert_eq!(
                resolution.package.map(|package| package.version).as_deref(),
                Some("4.30.0")
            );
            let warning = resolution.warning.unwrap();
            assert!(warning.contains(PUBLISHED), "{warning}");
            assert!(!warning.contains("https://"), "{warning}");
            assert_eq!(resolved.asked, vec![PUBLISHED]);
        }
    }

    #[test]
    fn unreadable_publication_keeps_the_feed_with_a_warning() {
        for published in [
            offline(),
            Ok(serde_json::json!({ "unexpected": true })),
            Ok(releases(
                PUBLISHED,
                &format!("https://other.example.test/{PUBLISHED}.zip"),
            )),
        ] {
            let resolved = resolve(
                Ok(feed(INSTALLED, &package_url(INSTALLED))),
                published,
                |_| panic!("no extra feed request without a published version"),
            );
            let resolution = resolved.result.unwrap();
            assert_eq!(resolution.latest_version, INSTALLED);
            assert_eq!(resolution.source, SourceUpdateSource::OfficialFeed);
            assert_eq!(resolution.package, None);
            assert_eq!(
                resolution.warning.as_deref(),
                Some(UNREADABLE_RELEASES_WARNING)
            );
        }
    }

    #[test]
    fn feed_ahead_of_the_publication_wins_without_an_extra_request() {
        // D-2: the publication lags behind the feed.
        let resolved = resolve(
            Ok(feed("4.5000.0", &package_url("4.5000.0"))),
            Ok(releases(PUBLISHED, &package_url(PUBLISHED))),
            |_| panic!("the feed already announces a newer version"),
        );
        let resolution = resolved.result.unwrap();
        assert_eq!(resolution.latest_version, "4.5000.0");
        assert_eq!(resolution.source, SourceUpdateSource::OfficialFeed);
        assert_eq!(resolution.warning, None);
        assert_eq!(resolution.package.unwrap().version, "4.5000.0");
        assert!(resolved.asked.is_empty());

        // Same version on both sides: the feed's own package, no extra request.
        let same = resolve(
            Ok(feed(PUBLISHED, &package_url(PUBLISHED))),
            Ok(releases(PUBLISHED, &package_url(PUBLISHED))),
            |_| panic!("same version, no extra request"),
        );
        let resolution = same.result.unwrap();
        assert_eq!(resolution.source, SourceUpdateSource::OfficialFeed);
        assert!(resolution.package.is_some());
    }

    #[test]
    fn feed_newer_than_installed_without_a_valid_package_keeps_the_reason() {
        let mut broken = feed("4.30.0", &package_url("4.30.0"));
        broken["releases"][0]["updateTo"]["sha256"] = Value::from("abc");
        let resolution = resolve(
            Ok(broken),
            Ok(releases(INSTALLED, &package_url(INSTALLED))),
            |_| panic!("the publication is not ahead"),
        )
        .result
        .unwrap();
        assert_eq!(resolution.latest_version, "4.30.0");
        assert_eq!(resolution.package, None);
        assert!(resolution.package_error.unwrap().contains("sha256"));
    }

    #[test]
    fn without_the_feed_only_an_equal_or_older_publication_says_up_to_date() {
        let current = resolve(
            offline(),
            Ok(releases(INSTALLED, &package_url(INSTALLED))),
            |_| panic!("not newer than installed"),
        )
        .result
        .unwrap();
        assert_eq!(current.latest_version, INSTALLED);
        assert_eq!(current.source, SourceUpdateSource::OfficialRelease);
        assert_eq!(current.package, None);
        assert_eq!(current.warning, None);

        let older = resolve(
            offline(),
            Ok(releases("4.28.0", &package_url("4.28.0"))),
            |_| panic!("not newer than installed"),
        )
        .result
        .unwrap();
        assert_eq!(older.latest_version, "4.28.0");

        // Newer publication, feed down for both questions: nothing is offered.
        let newer = resolve(
            offline(),
            Ok(releases(PUBLISHED, &package_url(PUBLISHED))),
            |_| offline(),
        );
        assert!(newer.result.is_err());
        assert_eq!(newer.asked, vec![PUBLISHED]);
    }

    #[test]
    fn newer_publication_confirmed_even_if_the_installed_feed_failed() {
        let resolved = resolve(
            offline(),
            Ok(releases(PUBLISHED, &package_url(PUBLISHED))),
            |version| Ok(feed(version, &package_url(version))),
        );
        let resolution = resolved.result.unwrap();
        assert_eq!(resolution.latest_version, PUBLISHED);
        assert_eq!(resolution.source, SourceUpdateSource::OfficialRelease);
    }

    #[test]
    fn both_sources_failing_is_an_error_with_the_feed_message() {
        let resolved = resolve(offline(), offline(), |_| panic!("nothing to confirm"));
        assert_eq!(resolved.result.unwrap_err(), offline().unwrap_err());
        let invalid_feed = resolve(
            Ok(serde_json::json!({ "currentRelease": "https://invalid.example" })),
            offline(),
            |_| panic!("nothing to confirm"),
        );
        assert!(invalid_feed.result.is_err());
    }
}
