//! Actualizar la aplicación de una copia administrada desde la original o desde una copia donante:
//! copia de staging verificada, intercambio del directorio con respaldo y vuelta atrás si algo falla.

use super::*;

fn swap_application_directory(
    staged: &Path,
    destination: &Path,
    backup: &Path,
) -> Result<bool, String> {
    let had_previous = destination.exists();
    if backup.exists() {
        return Err("Ya existe un respaldo temporal de esta actualización.".to_string());
    }
    if had_previous {
        fs::rename(destination, backup)
            .map_err(|error| format!("No se pudo preparar la versión anterior: {error}"))?;
    }
    if let Err(error) = fs::rename(staged, destination) {
        if had_previous {
            let _ = fs::rename(backup, destination);
        }
        return Err(format!(
            "No se pudo activar la nueva versión; se restauró la anterior: {error}"
        ));
    }
    Ok(had_previous)
}

fn rollback_application_directory(
    destination: &Path,
    backup: &Path,
    had_previous: bool,
    operation_id: Uuid,
) -> Result<(), String> {
    let failed_update = destination
        .parent()
        .ok_or_else(|| "La ruta administrada no es válida.".to_string())?
        .join(format!(".application-failed-{operation_id}"));
    if destination.exists() {
        fs::rename(destination, &failed_update)
            .map_err(|error| format!("No se pudo apartar la actualización fallida: {error}"))?;
    }
    if had_previous {
        if let Err(error) = fs::rename(backup, destination) {
            let _ = fs::rename(&failed_update, destination);
            return Err(format!("No se pudo restaurar la versión anterior: {error}"));
        }
    }
    if failed_update.exists() {
        let _ = fs::remove_dir_all(failed_update);
    }
    Ok(())
}

pub(crate) fn update_instance_application_sync(app: &AppHandle, id: &str) -> Result<(), String> {
    let source = detect_provider_source().ok_or_else(|| {
        "No se encontró la instalación original de la aplicación compatible.".to_string()
    })?;
    update_instance_application_from_source_sync(app, id, &source)
}

fn update_instance_application_from_source_sync(
    app: &AppHandle,
    id: &str,
    source: &Path,
) -> Result<(), String> {
    let paths = ManagedPaths::resolve(app)?;
    let instance_root = paths.root_for(id)?;
    validate_source(&source)?;
    let latest_version = cached_source_version(&source).ok_or_else(|| {
        "No se pudo identificar la versión original de la aplicación.".to_string()
    })?;

    let mut registry = load_registry(&paths)?;
    let inventory = ProcessInventory::capture();
    refresh_instance_statuses(&mut registry, &inventory);
    refresh_instance_bundle_names(&mut registry);
    refresh_instance_versions(&mut registry);
    let position = registry
        .instances
        .iter()
        .position(|instance| instance.id == id)
        .ok_or_else(|| "La instancia ya no existe.".to_string())?;
    let current = registry.instances[position].clone();
    if current.status == InstanceStatus::Running {
        return Err(format!(
            "Detén “{}” antes de actualizar su aplicación.",
            current.name
        ));
    }
    if Path::new(&current.app_path).exists()
        && !version_is_newer(&latest_version, current.source_version.as_deref())
    {
        return Ok(());
    }

    let operation_id = Uuid::new_v4();
    let staging_root = instance_root.join(format!(".application-update-{operation_id}"));
    let destination_application = instance_root.join("application");
    let backup_application = instance_root.join(format!(".application-backup-{operation_id}"));
    #[cfg(target_os = "macos")]
    let original = detect_provider_source().ok_or_else(|| {
        "La aplicación original no está disponible para verificar la copia.".to_string()
    })?;
    let staged_app = match copy_provider_application(&source, &staging_root)
        .and_then(|path| personalize_application_path(&path, &current.name))
        .and_then(strip_inherited_icon_after_copy)
    {
        Ok(path) => path,
        Err(error) => {
            let _ = fs::remove_dir_all(&staging_root);
            return Err(error);
        }
    };
    if let Err(error) = validate_source(&staged_app) {
        let _ = fs::remove_dir_all(&staging_root);
        return Err(format!("La copia de actualización no es válida: {error}"));
    }
    let staged_version = source_version(&staged_app).ok_or_else(|| {
        let _ = fs::remove_dir_all(&staging_root);
        "No se pudo verificar la versión de la copia preparada.".to_string()
    })?;
    if !versions_equal(&staged_version, &latest_version) {
        let _ = fs::remove_dir_all(&staging_root);
        return Err(
            "La fuente cambió durante la copia; no se aplicó la actualización.".to_string(),
        );
    }
    // HU-0020: the clean staging copy keeps `--strict` and the original's requirement before the swap.
    #[cfg(target_os = "macos")]
    if macos_icon::check_clean_against_original(&staged_app, &original).is_err() {
        let _ = fs::remove_dir_all(&staging_root);
        return Err(
            "La copia preparada no superó la verificación de firma; no se aplicó la actualización."
                .to_string(),
        );
    }
    let staged_application = staging_root.join("application");
    let relative_app_path = match staged_app.strip_prefix(&staged_application) {
        Ok(path) => path.to_path_buf(),
        Err(_) => {
            let _ = fs::remove_dir_all(&staging_root);
            return Err(
                "La aplicación preparada quedó fuera del directorio administrado.".to_string(),
            );
        }
    };

    let had_previous = match swap_application_directory(
        &staged_application,
        &destination_application,
        &backup_application,
    ) {
        Ok(value) => value,
        Err(error) => {
            let _ = fs::remove_dir_all(&staging_root);
            return Err(error);
        }
    };

    let updated_app_path = destination_application.join(relative_app_path);
    #[cfg(target_os = "macos")]
    let updated_branding = {
        match macos_icon::apply_branding_after_update(
            &paths.instances,
            &updated_app_path,
            current.custom_icon.as_ref(),
            &original,
            &current.name,
        ) {
            Ok(outcome) => outcome,
            Err(error) => {
                let rollback = rollback_application_directory(
                    &destination_application,
                    &backup_application,
                    had_previous,
                    operation_id,
                );
                let _ = fs::remove_dir_all(&staging_root);
                return Err(match rollback {
                    Ok(()) => format!("No se pudo reaplicar el branding; se restauró la versión anterior: {error}"),
                    Err(rollback_error) => format!("Falló el branding ({error}) y el rollback ({rollback_error})."),
                });
            }
        }
    };
    registry.instances[position].app_path = updated_app_path.to_string_lossy().to_string();
    registry.instances[position].source_version = Some(latest_version);
    registry.instances[position].pid = None;
    registry.instances[position].process_identity = None;
    registry.instances[position].status = InstanceStatus::Stopped;
    #[cfg(target_os = "macos")]
    {
        let target = &mut registry.instances[position];
        target.provider_provenance = updated_branding
            .as_ref()
            .map(|outcome| outcome.provenance.clone());
        if let (Some(icon), Some(outcome)) =
            (target.custom_icon.as_mut(), updated_branding.as_ref())
        {
            outcome.write_to(icon);
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        registry.instances[position].provider_provenance = None;
    }

    if let Err(save_error) = save_registry(&paths, &registry) {
        let rollback = rollback_application_directory(
            &destination_application,
            &backup_application,
            had_previous,
            operation_id,
        );
        let _ = fs::remove_dir_all(&staging_root);
        return match rollback {
            Ok(()) => Err(format!(
                "No se pudo guardar la actualización y se restauró la versión anterior: {save_error}"
            )),
            Err(rollback_error) => Err(format!(
                "No se pudo guardar la actualización ({save_error}) ni completar el rollback ({rollback_error})."
            )),
        };
    }

    if backup_application.exists() {
        let _ = fs::remove_dir_all(backup_application);
    }
    if staging_root.exists() {
        let _ = fs::remove_dir_all(staging_root);
    }
    invalidate_application_cache();
    app_state(app).invalidate_managed_bytes();
    Ok(())
}

pub(crate) fn synchronize_managed_applications_sync(
    app: &AppHandle,
    request: SynchronizeManagedApplicationsRequest,
) -> Result<Vec<SynchronizationItemResult>, String> {
    if SHARED_INSTALLATION {
        return Err(
            "Linux usa una instalación compartida y no requiere sincronización de copias."
                .to_string(),
        );
    }
    let paths = ManagedPaths::resolve(app)?;
    let mut registry = load_registry(&paths)?;
    let inventory = ProcessInventory::capture();
    refresh_instance_statuses(&mut registry, &inventory);
    refresh_instance_versions(&mut registry);
    let topology = build_version_topology(&paths, &registry, &inventory);
    if topology.latest_source.as_ref() != Some(&request.source) {
        return Err(
            "La fuente seleccionada ya no coincide con la topología validada. Vuelve a escanear."
                .to_string(),
        );
    }
    let latest_version = topology.latest_installed_version.clone().ok_or_else(|| {
        topology
            .reason
            .clone()
            .unwrap_or_else(|| "No hay una fuente válida para sincronizar.".to_string())
    })?;
    let source_path = match request.source.kind {
        VersionSourceKind::Original => detect_provider_source()
            .ok_or_else(|| "La aplicación original ya no está disponible.".to_string())?,
        VersionSourceKind::Managed => {
            let source_id = request.source.instance_id.as_deref().ok_or_else(|| {
                "La fuente administrada no incluye un identificador válido.".to_string()
            })?;
            let source = registry
                .instances
                .iter()
                .find(|instance| instance.id == source_id)
                .ok_or_else(|| "La instancia fuente ya no existe.".to_string())?;
            let original = detect_provider_source().ok_or_else(|| {
                "La aplicación original no está disponible para validar identidad.".to_string()
            })?;
            let validated = validate_managed_application_source(&paths, source, &original)?;
            if !versions_equal(&validated, &latest_version) {
                return Err("La versión de la fuente cambió durante el preflight.".to_string());
            }
            PathBuf::from(&source.app_path)
        }
    };
    let original_for_identity = detect_provider_source().ok_or_else(|| {
        "La aplicación original no está disponible para validar identidad.".to_string()
    })?;

    let mut seen = HashSet::new();
    let mut results = Vec::new();
    for target_id in request.target_instance_ids {
        if !seen.insert(target_id.clone()) {
            continue;
        }
        let Some(target) = registry
            .instances
            .iter()
            .find(|instance| instance.id == target_id)
            .cloned()
        else {
            results.push(SynchronizationItemResult {
                instance_id: target_id,
                status: SynchronizationStatus::Failed,
                from_version: None,
                to_version: Some(latest_version.clone()),
                message: "La instancia ya no existe.".to_string(),
            });
            continue;
        };
        if request.source.instance_id.as_deref() == Some(target.id.as_str()) {
            results.push(SynchronizationItemResult {
                instance_id: target.id,
                status: SynchronizationStatus::Skipped,
                from_version: target.source_version,
                to_version: Some(latest_version.clone()),
                message: "La instancia es la fuente validada.".to_string(),
            });
            continue;
        }
        if target.status != InstanceStatus::Stopped {
            results.push(SynchronizationItemResult {
                instance_id: target.id,
                status: SynchronizationStatus::Failed,
                from_version: target.source_version,
                to_version: Some(latest_version.clone()),
                message: "La instancia debe estar detenida.".to_string(),
            });
            continue;
        }
        let target_root = paths.root_for(&target.id)?;
        let target_path = Path::new(&target.app_path);
        if !target_path.exists()
            || !path_is_within(target_path, &target_root)
            || validate_source(target_path).is_err()
            || validate_managed_application(&paths, &target, &original_for_identity).is_err()
        {
            results.push(SynchronizationItemResult {
                instance_id: target.id,
                status: SynchronizationStatus::Failed,
                from_version: target.source_version,
                to_version: Some(latest_version.clone()),
                message:
                    "La ruta, firma o identidad de la instancia destino no superó el preflight."
                        .to_string(),
            });
            continue;
        }
        if target
            .source_version
            .as_deref()
            .is_some_and(|current| !version_is_newer(&latest_version, Some(current)))
        {
            results.push(SynchronizationItemResult {
                instance_id: target.id,
                status: SynchronizationStatus::Skipped,
                from_version: target.source_version,
                to_version: Some(latest_version.clone()),
                message: "La instancia ya tiene esta versión o una superior.".to_string(),
            });
            continue;
        }
        let from_version = target.source_version.clone();
        match update_instance_application_from_source_sync(app, &target.id, &source_path) {
            Ok(()) => results.push(SynchronizationItemResult {
                instance_id: target.id,
                status: SynchronizationStatus::Updated,
                from_version,
                to_version: Some(latest_version.clone()),
                message: "Aplicación sincronizada y perfil preservado.".to_string(),
            }),
            Err(error) => results.push(SynchronizationItemResult {
                instance_id: target.id,
                status: SynchronizationStatus::Failed,
                from_version,
                to_version: Some(latest_version.clone()),
                message: error,
            }),
        }
    }
    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn swaps_and_rolls_back_application_directory() {
        let operation_id = Uuid::new_v4();
        let root = env::temp_dir().join(format!("code-ai-profiles-update-test-{operation_id}"));
        let destination = root.join("application");
        let staged = root.join("staged-application");
        let backup = root.join("backup-application");
        fs::create_dir_all(&destination).unwrap();
        fs::create_dir_all(&staged).unwrap();
        fs::write(destination.join("version.txt"), "old").unwrap();
        fs::write(staged.join("version.txt"), "new").unwrap();

        let had_previous = swap_application_directory(&staged, &destination, &backup).unwrap();
        assert!(had_previous);
        assert_eq!(
            fs::read_to_string(destination.join("version.txt")).unwrap(),
            "new"
        );

        rollback_application_directory(&destination, &backup, had_previous, operation_id).unwrap();
        assert_eq!(
            fs::read_to_string(destination.join("version.txt")).unwrap(),
            "old"
        );

        fs::remove_dir_all(root).unwrap();
    }
}
