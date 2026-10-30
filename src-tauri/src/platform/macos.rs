//! macOS: bundles `.app` en /Applications, `plutil`, `codesign`, `cp -c`/`ditto` y `open`.

use super::*;

pub(crate) const PLATFORM_NAME: &str = "macos";

/// La aplicación compatible es una instalación compartida: no hay copias de bytes que sincronizar.
pub(crate) const SHARED_INSTALLATION: bool = false;

pub(crate) fn macos_bundle_value(source: &Path, key: &str) -> Option<String> {
    let output = Command::new("/usr/bin/plutil")
        .args(["-extract", key, "raw", "-o", "-"])
        .arg(source.join("Contents/Info.plist"))
        .output()
        .ok()?;
    output
        .status
        .success()
        .then(|| String::from_utf8_lossy(&output.stdout).into_owned())
        .and_then(|value| sanitize_source_name(&value))
}

pub(crate) fn macos_provider_candidates() -> Vec<PathBuf> {
    let mut candidates = vec![PathBuf::from("/Applications/Claude.app")];
    if let Some(home) = dirs::home_dir() {
        candidates.push(home.join("Applications/Claude.app"));
    }
    candidates
}

pub(crate) fn source_display_name(source: &Path) -> Option<String> {
    let display_name = macos_bundle_value(source, "CFBundleDisplayName");
    let bundle_name = macos_bundle_value(source, "CFBundleName");
    source_name_from_metadata(display_name.as_deref(), bundle_name.as_deref(), source)
}

pub(crate) fn detect_provider_source() -> Option<PathBuf> {
    macos_provider_candidates()
        .into_iter()
        .find(|path| provider_executable(path).exists())
}

pub(crate) fn detect_original_profile() -> Option<PathBuf> {
    dirs::home_dir()
        .map(|home| home.join("Library/Application Support/Claude"))
        .filter(|path| path.is_dir())
}

pub(crate) fn validate_source(path: &Path) -> Result<(), String> {
    if path.extension().and_then(|value| value.to_str()) != Some("app")
        || !provider_executable(path).is_file()
    {
        return Err(
            "La ruta no corresponde a un bundle válido de la aplicación compatible.".to_string(),
        );
    }
    Ok(())
}

pub(crate) fn source_version(source: &Path) -> Option<String> {
    let output = Command::new("/usr/bin/plutil")
        .args(["-extract", "CFBundleShortVersionString", "raw", "-o", "-"])
        .arg(source.join("Contents/Info.plist"))
        .output()
        .ok()?;
    if output.status.success() {
        let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
        return (!version.is_empty()).then_some(version);
    }
    None
}

pub(crate) fn provider_executable(app_path: &Path) -> PathBuf {
    app_path.join("Contents/MacOS/Claude")
}

/// Archivos cuya huella (tamaño y fecha) entra en `application_fingerprint`, además del ejecutable.
pub(crate) fn fingerprint_metadata_paths(canonical_path: &Path) -> Vec<PathBuf> {
    vec![
        canonical_path.join("Contents/Info.plist"),
        canonical_path.join("Contents/Resources/app.asar"),
        canonical_path.join("Contents/_CodeSignature/CodeResources"),
    ]
}

pub(crate) fn macos_team_identifier(path: &Path) -> Option<String> {
    let output = Command::new("/usr/bin/codesign")
        .args(["-dv", "--verbose=4"])
        .arg(path)
        .output()
        .ok()?;
    let details = String::from_utf8_lossy(&output.stderr);
    details.lines().find_map(|line| {
        line.strip_prefix("TeamIdentifier=")
            .map(str::trim)
            .filter(|value| !value.is_empty() && *value != "not set")
            .map(str::to_string)
    })
}

pub(crate) fn macos_code_hash(path: &Path) -> Option<String> {
    let output = Command::new("/usr/bin/codesign")
        .args(["-dv", "--verbose=4"])
        .arg(path)
        .output()
        .ok()?;
    let details = String::from_utf8_lossy(&output.stderr);
    details.lines().find_map(|line| {
        line.strip_prefix("CDHash=")
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_string)
    })
}

pub(crate) fn validate_provider_identity_uncached(
    candidate: &Path,
    original: &Path,
) -> Result<(), String> {
    for path in [candidate, original] {
        let status = Command::new("/usr/bin/codesign")
            .args(["--verify", "--deep", "--strict"])
            .arg(path)
            .status()
            .map_err(|error| format!("No se pudo validar la firma de la aplicación: {error}"))?;
        if !status.success() {
            return Err("La firma de la aplicación compatible no es válida.".to_string());
        }
    }
    let candidate_bundle = macos_bundle_value(candidate, "CFBundleIdentifier");
    let original_bundle = macos_bundle_value(original, "CFBundleIdentifier");
    if candidate_bundle.is_none() || candidate_bundle != original_bundle {
        return Err("La identidad del bundle no coincide con la aplicación original.".to_string());
    }
    let candidate_team = macos_team_identifier(candidate);
    let original_team = macos_team_identifier(original);
    if original_team.is_some() && candidate_team != original_team {
        return Err("El firmante de la aplicación no coincide con la original.".to_string());
    }
    Ok(())
}

/// Stored as `managed_fingerprint` for compatibility; no longer a gate (HU-0020, ★ D-E). macOS only.
pub(crate) fn fingerprint_label(path: &Path) -> Result<String, String> {
    let fingerprint = application_fingerprint(path)
        .ok_or_else(|| "No se pudo calcular el fingerprint de la aplicación.".to_string())?;
    let mut hasher = DefaultHasher::new();
    fingerprint.hash(&mut hasher);
    Ok(format!("{:016x}", hasher.finish()))
}

/// Copia (o enlaza, en Linux) la aplicación compatible dentro de `application_root`, que ya existe.
pub(crate) fn copy_provider_bundle(
    source: &Path,
    application_root: &Path,
) -> Result<PathBuf, String> {
    let destination = application_root.join("Claude.app");
    let cloned = Command::new("/bin/cp")
        .args(["-cR"])
        .arg(source)
        .arg(&destination)
        .status();

    if matches!(cloned, Ok(status) if status.success()) {
        return Ok(destination);
    }

    if destination.exists() {
        fs::remove_dir_all(&destination).map_err(|error| {
            format!("Falló la copia APFS y no se pudo limpiar el destino parcial: {error}")
        })?;
    }

    let copied = Command::new("/usr/bin/ditto")
        .args(["--rsrc", "--extattr", "--acl"])
        .arg(source)
        .arg(&destination)
        .status()
        .map_err(|error| format!("No se pudo iniciar la copia de la aplicación: {error}"))?;
    if !copied.success() {
        return Err("No se pudo copiar la aplicación al directorio administrado.".to_string());
    }
    Ok(destination)
}

pub(crate) fn personalize_application_path(
    app_path: &Path,
    instance_name: &str,
) -> Result<PathBuf, String> {
    let parent = app_path
        .parent()
        .ok_or_else(|| "La aplicación administrada no tiene una ruta válida.".to_string())?;
    let destination = parent.join(instance_bundle_name(instance_name));
    if destination == app_path {
        return Ok(destination);
    }
    if destination.exists() {
        return Err(format!(
            "Ya existe una aplicación administrada llamada {}.",
            destination
                .file_name()
                .and_then(|value| value.to_str())
                .unwrap_or("perfil.app")
        ));
    }
    fs::rename(app_path, &destination)
        .map_err(|error| format!("No se pudo aplicar el nombre de la instancia: {error}"))?;
    Ok(destination)
}

/// El gestor de archivos del sistema que abre `open_in_file_manager`.
pub(crate) fn file_manager_program() -> &'static str {
    "/usr/bin/open"
}

pub(crate) fn open_system_settings_sync(panel: SystemSettingsPanel) -> Result<(), String> {
    let status = Command::new("/usr/bin/open")
        .arg(system_settings_url(panel))
        .status()
        .map_err(|error| format!("No se pudo abrir Ajustes del Sistema: {error}"))?;
    if status.success() {
        Ok(())
    } else {
        Err(format!(
            "No se pudo abrir Ajustes del Sistema: el sistema respondió {status}."
        ))
    }
}

pub(crate) fn account_facts_sync() -> AccountFacts {
    let admin = Command::new("/usr/bin/id")
        .arg("-Gn")
        .output()
        .ok()
        .filter(|output| output.status.success())
        .map(|output| groups_include_admin(&String::from_utf8_lossy(&output.stdout)));
    AccountFacts { admin }
}

/// Abre en el navegador del sistema un enlace `http`/`https` que la persona pulsó en el lector
/// (HU-0025). `url` llega ya validada y reserializada por `projects::reader::external_link`; va como
/// argumento, nunca en una cadena de shell. Distinto de `open_update_url`, que es solo del canal oficial.
pub(crate) fn open_external_url(url: &str) -> Result<(), AppError> {
    let status = Command::new("/usr/bin/open")
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
