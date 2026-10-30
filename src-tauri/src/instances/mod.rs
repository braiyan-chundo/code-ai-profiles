//! Ciclo de vida de las instancias administradas: crear (copia de la aplicación y perfil propio),
//! renombrar, eliminar y abrir la carpeta del perfil. Lanzar y detener están en `launch.rs`; el icono, en `icons.rs`.

use super::*;

mod icons;
mod launch;

pub(crate) use self::icons::*;
pub(crate) use self::launch::*;

fn validate_name(value: &str) -> Result<String, String> {
    let value = value.trim();
    if value.is_empty() {
        return Err("El nombre de la instancia es obligatorio.".to_string());
    }
    if value.chars().count() > 64 {
        return Err("El nombre no puede superar 64 caracteres.".to_string());
    }
    if value.chars().any(|character| character.is_control()) {
        return Err("El nombre contiene caracteres no permitidos.".to_string());
    }
    Ok(value.to_string())
}

pub(crate) fn copy_provider_application(
    source: &Path,
    instance_root: &Path,
) -> Result<PathBuf, String> {
    let application_root = instance_root.join("application");
    fs::create_dir_all(&application_root)
        .map_err(|error| format!("No se pudo crear el directorio de la aplicación: {error}"))?;

    copy_provider_bundle(source, &application_root)
}

/// A fresh copy never keeps the Finder icon of its source (HU-0020, A-4.3). Only macOS has one.
pub(crate) fn strip_inherited_icon_after_copy(app_path: PathBuf) -> Result<PathBuf, String> {
    #[cfg(target_os = "macos")]
    macos_icon::strip_inherited_icon(&app_path)
        .map_err(|error| format!("No se pudo quitar el icono heredado de la copia: {error}"))?;
    Ok(app_path)
}

pub(crate) fn instance_bundle_name(name: &str) -> String {
    let safe_name = name
        .chars()
        .map(|character| match character {
            '/' | ':' => '-',
            _ => character,
        })
        .collect::<String>();
    let safe_name = safe_name.trim().trim_end_matches('.');
    format!(
        "{}.app",
        if safe_name.is_empty() {
            "Code AI Profile"
        } else {
            safe_name
        }
    )
}

pub(crate) fn create_instance_sync(
    app: &AppHandle,
    request: CreateInstanceRequest,
) -> Result<(), String> {
    let paths = ManagedPaths::resolve(app)?;
    let mut registry = load_registry(&paths)?;
    let name = validate_name(&request.name)?;

    if registry
        .instances
        .iter()
        .any(|instance| instance.name.eq_ignore_ascii_case(&name))
    {
        return Err("Ya existe una instancia con ese nombre.".to_string());
    }

    let source = request
        .source_path
        .filter(|value| !value.trim().is_empty())
        .map(PathBuf::from)
        .or_else(detect_provider_source)
        .ok_or_else(|| {
            "No se encontró una aplicación compatible. Instálala o indica su ruta manualmente."
                .to_string()
        })?;
    validate_source(&source)?;

    let id = Uuid::new_v4().to_string();
    let instance_root = paths.root_for(&id)?;
    let profile_path = instance_root.join("profile");
    fs::create_dir_all(&profile_path)
        .map_err(|error| format!("No se pudo crear el perfil independiente: {error}"))?;

    let app_path = match copy_provider_application(&source, &instance_root)
        .and_then(|path| personalize_application_path(&path, &name))
        .and_then(strip_inherited_icon_after_copy)
    {
        Ok(path) => path,
        Err(error) => {
            let _ = fs::remove_dir_all(&instance_root);
            return Err(error);
        }
    };

    registry.instances.push(ManagedInstance {
        id,
        name,
        account_label: None,
        avatar_url: None,
        plan: AccountPlan::Unknown,
        source_version: cached_source_version(&source),
        app_path: app_path.to_string_lossy().to_string(),
        profile_path: profile_path.to_string_lossy().to_string(),
        created_at: Utc::now().to_rfc3339(),
        last_launched_at: None,
        pid: None,
        process_identity: None,
        launch_generation: 0,
        custom_icon: None,
        provider_provenance: None,
        status: InstanceStatus::Stopped,
        usage: None,
        code_sessions: Vec::new(),
    });
    save_registry(&paths, &registry)
}

pub(crate) fn update_instance_sync(
    app: &AppHandle,
    request: UpdateInstanceRequest,
) -> Result<(), String> {
    let paths = ManagedPaths::resolve(app)?;
    let mut registry = load_registry(&paths)?;
    let name = validate_name(&request.name)?;
    if registry
        .instances
        .iter()
        .any(|instance| instance.id != request.id && instance.name.eq_ignore_ascii_case(&name))
    {
        return Err("Ya existe una instancia con ese nombre.".to_string());
    }
    let inventory = ProcessInventory::capture();
    refresh_instance_statuses(&mut registry, &inventory);
    let instance = registry
        .instances
        .iter_mut()
        .find(|instance| instance.id == request.id)
        .ok_or_else(|| "La instancia ya no existe.".to_string())?;
    instance.name = name;
    refresh_instance_bundle_names(&mut registry);
    save_registry(&paths, &registry)
}

pub(crate) fn delete_instance_sync(app: &AppHandle, id: String) -> Result<(), String> {
    let paths = ManagedPaths::resolve(app)?;
    let root = paths.root_for(&id)?;
    let mut registry = load_registry(&paths)?;
    let session_links = load_session_links(&paths)?;
    let inventory = ProcessInventory::capture();
    refresh_instance_statuses(&mut registry, &inventory);
    let position = registry
        .instances
        .iter()
        .position(|instance| instance.id == id)
        .ok_or_else(|| "La instancia ya no existe.".to_string())?;
    if registry.instances[position].status == InstanceStatus::Running {
        return Err("Detén la instancia antes de eliminarla.".to_string());
    }
    if session_links
        .links
        .iter()
        .any(|link| link.origin_instance_id == id || link.linked_instance_id == id)
    {
        return Err(
            "Esta instancia participa en sesiones vinculadas. Desvincúlalas o devuélvelas a su origen antes de eliminarla."
                .to_string(),
        );
    }

    if root.exists() {
        fs::remove_dir_all(&root)
            .map_err(|error| format!("No se pudieron borrar los datos de la instancia: {error}"))?;
    }
    registry.instances.remove(position);
    save_registry(&paths, &registry)?;
    invalidate_application_cache();
    invalidate_managed_bytes_cache();
    Ok(())
}

pub(crate) fn open_instance_folder_sync(app: &AppHandle, id: String) -> Result<(), String> {
    let paths = ManagedPaths::resolve(app)?;
    let registry = load_registry(&paths)?;
    let instance = registry
        .instances
        .iter()
        .find(|instance| instance.id == id)
        .ok_or_else(|| "La instancia ya no existe.".to_string())?;
    let profile = PathBuf::from(&instance.profile_path);
    if !profile.exists() {
        return Err("La carpeta del perfil ya no existe.".to_string());
    }
    open_in_file_manager(&profile)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_instance_names() {
        assert_eq!(validate_name("  Work  ").unwrap(), "Work");
        assert!(validate_name("  ").is_err());
        assert!(validate_name(&"a".repeat(65)).is_err());
        assert!(validate_name("line\nbreak").is_err());
    }

    #[test]
    fn creates_safe_instance_bundle_names() {
        assert_eq!(instance_bundle_name("Work Profile"), "Work Profile.app");
        assert_eq!(instance_bundle_name("Cliente/A: B"), "Cliente-A- B.app");
        assert_eq!(instance_bundle_name("..."), "Code AI Profile.app");
    }
}
