//! «Actualizar original»: abrir la aplicación original en macOS para que se actualice ella misma, o
//! el canal oficial de descarga o de instrucciones en Windows y Linux. La instalación desde la app
//! vive en `original_update.rs`.

use super::*;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[cfg_attr(target_os = "macos", allow(dead_code))]
pub(crate) struct OriginalApplicationUpdateTarget {
    pub(crate) action: OriginalApplicationUpdateAction,
    pub(crate) url: &'static str,
}

#[cfg(target_os = "macos")]
#[derive(Debug, PartialEq, Eq)]
pub(crate) struct MacosOriginalLaunch {
    pub(crate) executable: &'static str,
    pub(crate) arguments: Vec<std::ffi::OsString>,
}

#[cfg_attr(target_os = "macos", allow(dead_code))]
pub(crate) fn original_application_update_target(
    platform: &str,
    arch: &str,
) -> Option<OriginalApplicationUpdateTarget> {
    match (platform, arch) {
        ("windows", "x86_64") => Some(OriginalApplicationUpdateTarget {
            action: OriginalApplicationUpdateAction::Download,
            url: config::windows_x64_download_url(),
        }),
        ("windows", "aarch64") => Some(OriginalApplicationUpdateTarget {
            action: OriginalApplicationUpdateAction::Download,
            url: config::windows_arm64_download_url(),
        }),
        ("linux", _) => Some(OriginalApplicationUpdateTarget {
            action: OriginalApplicationUpdateAction::Instructions,
            url: config::linux_install_guide_url(),
        }),
        _ => None,
    }
}

#[cfg(target_os = "macos")]
pub(crate) fn launch_macos_original_application_with(
    paths: &ManagedPaths,
    detected_source: &Path,
    launch: impl FnOnce(&MacosOriginalLaunch) -> Result<(), String>,
) -> Result<OriginalApplicationUpdateResult, String> {
    let source = fs::canonicalize(detected_source)
        .map_err(|error| format!("No se pudo validar la ruta original detectada: {error}"))?;
    if path_is_within(&source, &paths.instances) {
        return Err("La ruta detectada pertenece a una instancia administrada.".to_string());
    }
    validate_source(&source)?;
    validate_provider_identity_uncached(&source, &source)?;
    launch(&MacosOriginalLaunch {
        executable: "/usr/bin/open",
        arguments: vec!["-n".into(), "-a".into(), source.into_os_string()],
    })?;
    Ok(OriginalApplicationUpdateResult {
        action: OriginalApplicationUpdateAction::Instructions,
        message: "Se abrió exclusivamente la aplicación original. En Claude, elige Claude > Check for Updates; las instancias permanecen intactas."
            .to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::*;

    #[test]
    fn selects_official_update_targets_by_platform_and_architecture() {
        assert_eq!(original_application_update_target("macos", "aarch64"), None);

        assert_eq!(
            original_application_update_target("windows", "x86_64"),
            Some(OriginalApplicationUpdateTarget {
                action: OriginalApplicationUpdateAction::Download,
                url: config::windows_x64_download_url(),
            })
        );
        assert_eq!(
            original_application_update_target("windows", "aarch64"),
            Some(OriginalApplicationUpdateTarget {
                action: OriginalApplicationUpdateAction::Download,
                url: config::windows_arm64_download_url(),
            })
        );
        assert_eq!(
            original_application_update_target("linux", "x86_64"),
            Some(OriginalApplicationUpdateTarget {
                action: OriginalApplicationUpdateAction::Instructions,
                url: config::linux_install_guide_url(),
            })
        );
        assert_eq!(
            original_application_update_target("unknown", "x86_64"),
            None
        );
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn macos_update_launcher_receives_only_the_validated_exact_original_path() {
        use std::cell::RefCell;

        let root = env::temp_dir().join(format!("code-ai-update-launch-{}", Uuid::new_v4()));
        let original = root.join("Original.app");
        fs::create_dir_all(&root).unwrap();
        write_signed_fixture_bundle(&original);
        let paths = test_managed_paths(&root);
        fs::create_dir_all(&paths.instances).unwrap();
        let launched = RefCell::new(None);

        let result = launch_macos_original_application_with(&paths, &original, |launch| {
            launched.replace(Some(MacosOriginalLaunch {
                executable: launch.executable,
                arguments: launch.arguments.clone(),
            }));
            Ok(())
        })
        .unwrap();

        assert_eq!(
            launched.into_inner(),
            Some(MacosOriginalLaunch {
                executable: "/usr/bin/open",
                arguments: vec![
                    "-n".into(),
                    "-a".into(),
                    fs::canonicalize(&original).unwrap().into_os_string(),
                ],
            })
        );
        assert_eq!(result.action, OriginalApplicationUpdateAction::Instructions);
        assert!(result.message.contains("Claude > Check for Updates"));
        fs::remove_dir_all(root).unwrap();
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn macos_update_launcher_rejects_a_managed_application_without_launching() {
        use std::cell::Cell;

        let root = env::temp_dir().join(format!("code-ai-update-managed-{}", Uuid::new_v4()));
        let paths = test_managed_paths(&root);
        let managed = paths.instances.join("fixture/application/Managed.app");
        fs::create_dir_all(managed.join("Contents/MacOS")).unwrap();
        fs::write(managed.join("Contents/MacOS/Claude"), b"fixture").unwrap();
        let launched = Cell::new(false);

        let error = launch_macos_original_application_with(&paths, &managed, |_| {
            launched.set(true);
            Ok(())
        })
        .unwrap_err();

        assert!(error.contains("instancia administrada"));
        assert!(!launched.get());
        fs::remove_dir_all(root).unwrap();
    }
}
