//! El icono personalizado de una instancia: normalizarlo, guardarlo y aplicarlo al sistema. En macOS
//! lo aplica `macos_icon.rs` sobre la copia administrada; fuera de macOS se queda en la app (y en
//! Linux, en un lanzador `.desktop` opcional).

use super::*;

const ICON_MAX_BYTES: usize = 5 * 1024 * 1024;

const ICON_MAX_DIMENSION: u32 = 4096;

#[cfg(not(target_os = "macos"))]
const DOCK_ICON_MACOS_ONLY: &str = "El icono del Dock solo se aplica en macOS.";

pub(crate) fn normalized_icon_png(bytes: &[u8]) -> Result<Vec<u8>, String> {
    if bytes.is_empty() || bytes.len() > ICON_MAX_BYTES {
        return Err("El icono debe pesar entre 1 byte y 5 MiB.".to_string());
    }
    let format = image::guess_format(bytes)
        .map_err(|_| "El archivo no es una imagen PNG o JPEG válida.".to_string())?;
    if !matches!(format, image::ImageFormat::Png | image::ImageFormat::Jpeg) {
        return Err("El icono debe ser PNG o JPEG.".to_string());
    }
    let dimensions = image::ImageReader::with_format(Cursor::new(bytes), format)
        .into_dimensions()
        .map_err(|_| "No se pudo leer la cabecera del icono.".to_string())?;
    if dimensions.0 == 0
        || dimensions.1 == 0
        || dimensions.0 > ICON_MAX_DIMENSION
        || dimensions.1 > ICON_MAX_DIMENSION
    {
        return Err("Las dimensiones del icono no son válidas (máximo 4096×4096).".to_string());
    }
    let image = image::load_from_memory_with_format(bytes, format)
        .map_err(|_| "No se pudo decodificar el icono.".to_string())?;
    let normalized = image.resize_to_fill(512, 512, image::imageops::FilterType::Lanczos3);
    let mut encoded = Cursor::new(Vec::new());
    normalized
        .write_to(&mut encoded, image::ImageFormat::Png)
        .map_err(|error| format!("No se pudo normalizar el icono: {error}"))?;
    Ok(encoded.into_inner())
}

pub(crate) fn set_instance_icon_sync(
    app: &AppHandle,
    request: SetInstanceIconRequest,
) -> Result<(), String> {
    let paths = ManagedPaths::resolve(app)?;
    #[cfg_attr(target_os = "macos", allow(unused_variables))]
    let root = paths.root_for(&request.id)?;
    let normalized = normalized_icon_png(&request.bytes)?;
    let mut registry = load_registry(&paths)?;
    let inventory = ProcessInventory::capture();
    refresh_instance_statuses(&mut registry, &inventory);
    let position = registry
        .instances
        .iter()
        .position(|instance| instance.id == request.id)
        .ok_or_else(|| "La instancia ya no existe.".to_string())?;
    if registry.instances[position].status != InstanceStatus::Stopped {
        return Err("Detén la instancia antes de cambiar su icono.".to_string());
    }
    #[cfg(target_os = "macos")]
    {
        let original = detect_provider_source().ok_or_else(|| {
            "No se encontró la aplicación original para verificar la copia.".to_string()
        })?;
        macos_icon::set_instance_icon(&paths, &mut registry, position, &original, &normalized)
    }
    #[cfg(not(target_os = "macos"))]
    {
        let branding = root.join("branding");
        let icon_path = branding.join("icon.png");
        let previous_icon = fs::read(&icon_path).ok();
        let revision = registry.instances[position]
            .custom_icon
            .as_ref()
            .map(|icon| icon.revision.saturating_add(1))
            .unwrap_or(1);
        fs::create_dir_all(&branding)
            .map_err(|error| format!("No se pudo preparar el icono administrado: {error}"))?;
        atomic_replace_file(&icon_path, &normalized)?;
        let (system_applied, system_message) =
            apply_external_icon_best_effort(&paths, &registry.instances[position], &icon_path);
        registry.instances[position].custom_icon = Some(CustomIcon {
            path: icon_path.to_string_lossy().to_string(),
            revision,
            system_applied,
            system_message,
            system_issue: None,
        });
        if let Err(error) = save_registry(&paths, &registry) {
            if let Some(bytes) = previous_icon.as_deref() {
                let _ = atomic_replace_file(&icon_path, bytes);
            } else {
                let _ = fs::remove_file(&icon_path);
            }
            return Err(error);
        }
        invalidate_application_cache();
        invalidate_managed_bytes_cache();
        Ok(())
    }
}

pub(crate) fn clear_instance_icon_sync(app: &AppHandle, id: String) -> Result<(), String> {
    let paths = ManagedPaths::resolve(app)?;
    #[cfg_attr(target_os = "macos", allow(unused_variables))]
    let root = paths.root_for(&id)?;
    let mut registry = load_registry(&paths)?;
    let position = registry
        .instances
        .iter()
        .position(|instance| instance.id == id)
        .ok_or_else(|| "La instancia ya no existe.".to_string())?;
    let inventory = ProcessInventory::capture();
    refresh_instance_statuses(&mut registry, &inventory);
    if registry.instances[position].status != InstanceStatus::Stopped {
        return Err("Detén la instancia antes de restaurar su icono.".to_string());
    }
    #[cfg(target_os = "macos")]
    {
        let original = detect_provider_source().ok_or_else(|| {
            "No se encontró la aplicación original para restaurar el icono.".to_string()
        })?;
        macos_icon::clear_instance_icon(&paths, &mut registry, position, &original)
    }

    #[cfg(not(target_os = "macos"))]
    {
        let managed_icon = root.join("branding/icon.png");
        let previous_icon = fs::read(&managed_icon).ok();
        let launcher = root.join("launcher.desktop");
        let previous_launcher = fs::read(&launcher).ok();
        if registry.instances[position]
            .custom_icon
            .as_ref()
            .is_some_and(|icon| Path::new(&icon.path) == managed_icon)
        {
            let _ = fs::remove_file(&managed_icon);
        }
        let _ = fs::remove_file(&launcher);
        registry.instances[position].custom_icon = None;
        if let Err(error) = save_registry(&paths, &registry) {
            restore_optional_file(&managed_icon, previous_icon.as_deref());
            restore_optional_file(&launcher, previous_launcher.as_deref());
            return Err(error);
        }
        invalidate_application_cache();
        invalidate_managed_bytes_cache();
        Ok(())
    }
}

#[cfg(target_os = "macos")]
pub(crate) fn reapply_instance_icon_sync(app: &AppHandle, id: String) -> Result<(), String> {
    let paths = ManagedPaths::resolve(app)?;
    paths.root_for(&id)?;
    let mut registry = load_registry(&paths)?;
    let inventory = ProcessInventory::capture();
    refresh_instance_statuses(&mut registry, &inventory);
    let position = registry
        .instances
        .iter()
        .position(|instance| instance.id == id)
        .ok_or_else(|| "La instancia ya no existe.".to_string())?;
    if registry.instances[position].status != InstanceStatus::Stopped {
        return Err("Detén la instancia antes de reintentar el icono.".to_string());
    }
    let original = detect_provider_source().ok_or_else(|| {
        "No se encontró la aplicación original para verificar la copia.".to_string()
    })?;
    macos_icon::reapply_instance_icon(&paths, &mut registry, position, &original)
}

#[cfg(not(target_os = "macos"))]
pub(crate) fn reapply_instance_icon_sync(app: &AppHandle, id: String) -> Result<(), String> {
    let _ = (app, id);
    Err(DOCK_ICON_MACOS_ONLY.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::*;

    #[cfg(target_os = "macos")]
    #[test]
    #[ignore = "visual spike: requires an explicit provider source and retained temp root"]
    fn macos_provider_clone_dock_visual_spike() {
        let source = env::var_os("CODE_AI_PROFILES_DOCK_PROVIDER_SOURCE")
            .map(PathBuf::from)
            .expect("set CODE_AI_PROFILES_DOCK_PROVIDER_SOURCE to a provider .app");
        let root = env::var_os("CODE_AI_PROFILES_DOCK_FIXTURE_DIR")
            .map(PathBuf::from)
            .expect("set CODE_AI_PROFILES_DOCK_FIXTURE_DIR to a disposable empty directory");
        assert!(
            !root.exists(),
            "the retained fixture root must not already exist"
        );
        let managed = root.join("managed/application/Provider Dock Fixture.app");
        let profile = root.join("managed/profile");
        fs::create_dir_all(&profile).unwrap();
        clone_directory(&source, &managed).unwrap();
        let baseline = macos_signature_snapshot(&managed);
        assert!(
            baseline.code_hash.is_some(),
            "the clone must expose a CDHash"
        );
        let icon_path = root.join("managed/branding/icon.png");
        fs::create_dir_all(icon_path.parent().unwrap()).unwrap();
        let icon =
            image::DynamicImage::ImageRgba8(image::ImageBuffer::from_fn(512, 512, |x, y| {
                if (x / 64 + y / 64) % 2 == 0 {
                    image::Rgba([32, 96, 255, 255])
                } else {
                    image::Rgba([255, 96, 48, 255])
                }
            }));
        let mut encoded = Cursor::new(Vec::new());
        icon.write_to(&mut encoded, image::ImageFormat::Png)
            .unwrap();
        fs::write(&icon_path, encoded.into_inner()).unwrap();
        macos_icon::set_workspace_icon(&root, &managed, Some(&icon_path)).unwrap();
        let iconized = macos_signature_snapshot(&managed);
        assert_eq!(iconized.code_hash, baseline.code_hash);
        assert_eq!(iconized.team_identifier, baseline.team_identifier);
        assert_eq!(
            iconized.designated_requirement,
            baseline.designated_requirement
        );
        assert_eq!(iconized.info_plist, baseline.info_plist);
        let launched = Command::new("/usr/bin/open")
            .args(["-n"])
            .arg(&managed)
            .arg("--args")
            .arg(format!("--user-data-dir={}", profile.display()))
            .status()
            .unwrap();
        assert!(launched.success());
        let capture_ms = env::var("CODE_AI_PROFILES_DOCK_CAPTURE_MS")
            .ok()
            .and_then(|value| value.parse::<u64>().ok())
            .unwrap_or(1_500);
        thread::sleep(Duration::from_millis(capture_ms));
        macos_icon::set_workspace_icon(&root, &managed, None).unwrap();
        let restored = macos_signature_snapshot(&managed);
        assert_eq!(
            restored, baseline,
            "setIcon(nil) must restore the exact signature baseline"
        );
        println!("DOCK_FIXTURE={}", managed.display());
        println!("DOCK_FIXTURE_PROFILE={}", profile.display());
        println!("DOCK_FIXTURE_DEEP_STATUS={:?}", baseline.deep_status);
        println!("DOCK_FIXTURE_STRICT_STATUS={:?}", baseline.strict_status);
        println!("DOCK_FIXTURE_BASELINE_RESTORED=true");
        println!("DOCK_FIXTURE_STATE=workspace icon cleared; exact signature baseline restored; app left running for Dock inspection");
    }

    #[test]
    fn normalizes_small_png_icons_and_rejects_invalid_input() {
        let icon = image::DynamicImage::new_rgba8(4, 8);
        let mut encoded = Cursor::new(Vec::new());
        icon.write_to(&mut encoded, image::ImageFormat::Png)
            .unwrap();
        let normalized = normalized_icon_png(&encoded.into_inner()).unwrap();
        let decoded = image::load_from_memory(&normalized).unwrap();
        assert_eq!((decoded.width(), decoded.height()), (512, 512));
        assert!(normalized_icon_png(b"not-an-image").is_err());
        assert!(normalized_icon_png(&vec![0; ICON_MAX_BYTES + 1]).is_err());
    }
}
