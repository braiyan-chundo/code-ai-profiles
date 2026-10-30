//! Versiones de la aplicación compatible: comparar versiones, la huella de una instalación (clave de
//! la caché de versiones e identidades) y la validación de una copia administrada como fuente o
//! destino. Los submódulos construyen la topología, sincronizan copias, consultan el feed oficial y
//! abren el canal de actualización de la original.

use super::*;

mod feed;
mod original;
mod synchronize;
mod topology;

pub(crate) use self::feed::*;
pub(crate) use self::original::*;
pub(crate) use self::synchronize::*;
pub(crate) use self::topology::*;

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub(crate) struct ApplicationFingerprint {
    pub(crate) canonical_path: PathBuf,
    pub(crate) executable_len: u64,
    pub(crate) executable_modified_ns: u128,
    pub(crate) metadata_len: u64,
    pub(crate) metadata_modified_ns: u128,
}

fn metadata_stamp(path: &Path) -> (u64, u128) {
    fs::metadata(path)
        .ok()
        .map(|metadata| {
            let modified = metadata
                .modified()
                .ok()
                .and_then(|value| value.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|value| value.as_nanos())
                .unwrap_or_default();
            (metadata.len(), modified)
        })
        .unwrap_or_default()
}

pub(crate) fn application_fingerprint(path: &Path) -> Option<ApplicationFingerprint> {
    let canonical_path = fs::canonicalize(path).ok()?;
    let executable = provider_executable(&canonical_path);
    let (executable_len, executable_modified_ns) = metadata_stamp(&executable);
    if executable_len == 0 {
        return None;
    }
    // Keep this key bounded: it is evaluated by version/status refreshes. Provider
    // identity is still verified with the platform signature APIs before a bundle
    // can be copied. These files cover the executable, version metadata and the
    // Electron payload without recursively walking the complete application tree.
    let metadata_paths = fingerprint_metadata_paths(&canonical_path);
    let mut hasher = DefaultHasher::new();
    let mut metadata_len = 0_u64;
    let mut metadata_modified_ns = 0_u128;
    for metadata_path in metadata_paths {
        metadata_path.hash(&mut hasher);
        let stamp = metadata_stamp(&metadata_path);
        stamp.hash(&mut hasher);
        metadata_len = metadata_len.saturating_add(stamp.0);
        metadata_modified_ns = metadata_modified_ns.max(stamp.1);
    }
    Some(ApplicationFingerprint {
        canonical_path,
        executable_len,
        executable_modified_ns,
        metadata_len: metadata_len ^ hasher.finish(),
        metadata_modified_ns,
    })
}

pub(crate) fn cached_source_version(source: &Path) -> Option<String> {
    let fingerprint = application_fingerprint(source)?;
    if let Some(cached) = runtime_cache()
        .lock()
        .ok()
        .and_then(|cache| cache.versions.get(&fingerprint).cloned())
    {
        return cached;
    }
    let version = source_version(source);
    if let Ok(mut cache) = runtime_cache().lock() {
        cache.versions.insert(fingerprint, version.clone());
    }
    version
}

fn version_parts(version: &str) -> Vec<u64> {
    version
        .split(|character: char| !character.is_ascii_digit())
        .filter(|part| !part.is_empty())
        .map(|part| part.parse::<u64>().unwrap_or(u64::MAX))
        .collect()
}

pub(crate) fn version_is_newer(candidate: &str, current: Option<&str>) -> bool {
    let Some(current) = current else {
        return true;
    };
    let candidate_parts = version_parts(candidate);
    let current_parts = version_parts(current);
    let length = candidate_parts.len().max(current_parts.len());
    (0..length)
        .find_map(|index| {
            let candidate = candidate_parts.get(index).copied().unwrap_or(0);
            let current = current_parts.get(index).copied().unwrap_or(0);
            (candidate != current).then_some(candidate > current)
        })
        .unwrap_or(false)
}

pub(crate) fn versions_equal(left: &str, right: &str) -> bool {
    !version_is_newer(left, Some(right)) && !version_is_newer(right, Some(left))
}

pub(crate) fn validate_provider_identity(candidate: &Path, original: &Path) -> Result<(), String> {
    let candidate_fingerprint = application_fingerprint(candidate)
        .ok_or_else(|| "No se pudo obtener el fingerprint de la instancia.".to_string())?;
    let original_fingerprint = application_fingerprint(original)
        .ok_or_else(|| "No se pudo obtener el fingerprint de la original.".to_string())?;
    let key = (candidate_fingerprint, original_fingerprint);
    if let Some(cached) = runtime_cache()
        .lock()
        .ok()
        .and_then(|cache| cache.identities.get(&key).cloned())
    {
        return cached;
    }
    let result = validate_provider_identity_uncached(candidate, original);
    if let Ok(mut cache) = runtime_cache().lock() {
        cache.identities.insert(key, result.clone());
    }
    result
}

pub(crate) fn validate_managed_application_source(
    paths: &ManagedPaths,
    instance: &ManagedInstance,
    original: &Path,
) -> Result<String, String> {
    if instance.status != InstanceStatus::Stopped {
        return Err("La instancia fuente debe estar detenida.".to_string());
    }
    if instance
        .provider_provenance
        .as_ref()
        .is_some_and(|provenance| !provenance.provider_signature_preserved)
    {
        return Err(
            "Una copia con firma ad-hoc heredada no puede usarse como fuente de sincronización."
                .to_string(),
        );
    }
    let root = paths.root_for(&instance.id)?;
    let app_path = Path::new(&instance.app_path);
    if !path_is_within(app_path, &root) {
        return Err("La aplicación fuente quedó fuera de su root administrado.".to_string());
    }
    validate_source(app_path)?;
    // Donors are security-sensitive: verify their current deep signature instead
    // of accepting a cached identity result. On macOS a donor with the Finder icon
    // passes the equivalent check of HU-0020 (A-2).
    #[cfg(target_os = "macos")]
    macos_icon::verify_managed_bundle(
        app_path,
        original,
        instance.provider_provenance.as_ref(),
        &instance.name,
    )?;
    #[cfg(not(target_os = "macos"))]
    validate_provider_identity_uncached(app_path, original)?;
    source_version(app_path)
        .filter(|version| valid_release_version(version))
        .ok_or_else(|| "No se pudo identificar la versión de la instancia fuente.".to_string())
}

pub(crate) fn validate_managed_application(
    paths: &ManagedPaths,
    instance: &ManagedInstance,
    original: &Path,
) -> Result<String, String> {
    let root = paths.root_for(&instance.id)?;
    let app_path = Path::new(&instance.app_path);
    if !path_is_within(app_path, &root) {
        return Err("La aplicación fuente quedó fuera de su root administrado.".to_string());
    }
    validate_source(app_path)?;
    // HU-0020 (R-3): on macOS a sync target is replaced whole by a staging copy that already passed
    // `--strict -R =<DR de la original>`, so the target's own signature is not a gate. Inherited ad hoc copies,
    // copies with icon leftovers and copies that changed outside the app can be recovered by syncing them.
    // Donors keep the full check in `validate_managed_application_source`.
    #[cfg(target_os = "macos")]
    let _ = original;
    #[cfg(not(target_os = "macos"))]
    validate_provider_identity(app_path, original)?;
    cached_source_version(app_path)
        .filter(|version| valid_release_version(version))
        .ok_or_else(|| "No se pudo identificar la versión de la instancia fuente.".to_string())
}

pub(crate) fn valid_release_version(version: &str) -> bool {
    !version.is_empty()
        && version.len() <= 64
        && version.chars().any(|character| character.is_ascii_digit())
        && version.chars().all(|character| {
            character.is_ascii_alphanumeric() || matches!(character, '.' | '-' | '+' | '~' | ':')
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn application_fingerprint_changes_when_managed_bytes_change() {
        let root = env::temp_dir().join(format!("code-ai-fingerprint-{}", Uuid::new_v4()));
        #[cfg(target_os = "macos")]
        let executable = root.join("Fixture.app/Contents/MacOS/Claude");
        #[cfg(not(target_os = "macos"))]
        let executable = root.join("fixture");
        fs::create_dir_all(executable.parent().unwrap()).unwrap();
        fs::write(&executable, b"one").unwrap();
        #[cfg(target_os = "macos")]
        let app = root.join("Fixture.app");
        #[cfg(not(target_os = "macos"))]
        let app = executable.clone();
        let first = application_fingerprint(&app).unwrap();
        fs::write(&executable, b"two-two").unwrap();
        let second = application_fingerprint(&app).unwrap();
        assert_ne!(first, second);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn compares_provider_versions_numerically() {
        assert!(version_is_newer("1.22300.0", Some("1.22209.0")));
        assert!(version_is_newer("2.0", Some("1.99999.99")));
        assert!(version_is_newer("1.2.0", None));
        assert!(!version_is_newer("1.10.0", Some("1.10")));
        assert!(!version_is_newer("1.9.9", Some("1.10.0")));
    }
}
