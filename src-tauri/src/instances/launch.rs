//! Lanzar una instancia con su perfil (`--user-data-dir`) y detenerla: señal ordenada, espera con
//! plazo y solo después la forzada.

use super::*;

pub(crate) fn launch_instance_sync(app: &AppHandle, id: String) -> Result<(), String> {
    let paths = ManagedPaths::resolve(app)?;
    let mut registry = load_registry(&paths)?;
    let inventory = ProcessInventory::capture();
    refresh_instance_statuses(&mut registry, &inventory);
    let position = registry
        .instances
        .iter()
        .position(|instance| instance.id == id)
        .ok_or_else(|| "La instancia ya no existe.".to_string())?;

    if registry.instances[position].status == InstanceStatus::Running {
        return save_registry(&paths, &registry).map_err(String::from);
    }
    let app_path = PathBuf::from(&registry.instances[position].app_path);
    let executable = provider_executable(&app_path);
    if !executable.is_file() {
        return Err("La aplicación de esta instancia no está disponible.".to_string());
    }
    // HU-0020 (A-4.5): a copy with a custom icon is verified, and its icon reapplied, before it launches.
    #[cfg(target_os = "macos")]
    if registry.instances[position].custom_icon.is_some() {
        let original = detect_provider_source();
        if macos_icon::launch_preflight(
            &paths,
            &mut registry.instances[position],
            original.as_deref(),
        )? {
            save_registry(&paths, &registry)?;
        }
    }
    let instance = &mut registry.instances[position];
    let profile_path = PathBuf::from(&instance.profile_path);
    fs::create_dir_all(&profile_path)
        .map_err(|error| format!("No se pudo preparar el perfil: {error}"))?;

    let mut command = Command::new(&executable);
    command
        .arg(format!(
            "--user-data-dir={}",
            profile_path.to_string_lossy()
        ))
        .env("CODE_AI_PROFILES_INSTANCE_ID", &instance.id);
    isolate_process_group(&mut command);
    let mut child = command
        .spawn()
        .map_err(|error| format!("No se pudo iniciar la aplicación: {error}"))?;

    let root_pid = child.id();
    instance.launch_generation = instance.launch_generation.saturating_add(1);
    let generation = instance.launch_generation;
    let profile_argument = format!("--user-data-dir={}", profile_path.to_string_lossy());
    let start_time = process_start_time(root_pid);
    instance.pid = Some(root_pid);
    instance.process_identity = Some(ManagedProcessIdentity {
        root_pid,
        process_group_id: launched_process_group(root_pid),
        start_time,
        fingerprint: process_fingerprint(&app_path, &profile_argument),
        profile_argument,
    });
    instance.status = InstanceStatus::Running;
    instance.last_launched_at = Some(Utc::now().to_rfc3339());
    let launched_instance = instance.clone();
    if let Err(error) = save_registry(&paths, &registry) {
        if let Some(identity) = launched_instance.process_identity.as_ref() {
            // Captura fresca a propósito: el proceso acaba de nacer y el inventario previo no lo tiene.
            let _ = signal_instance_processes(
                &launched_instance,
                identity,
                true,
                &ProcessInventory::capture(),
            );
        }
        let _ = child.kill();
        let _ = child.wait();
        return Err(format!(
            "La aplicación se inició, pero no se pudo registrar; el proceso fue cerrado: {error}"
        ));
    }
    spawn_process_reaper(app.clone(), id, generation, child);
    Ok(())
}

pub(crate) fn stop_instance_sync(app: &AppHandle, id: &str) -> Result<(), String> {
    let paths = ManagedPaths::resolve(&app)?;
    let state = app_state(app);
    let running = state.with_registry_operation(|| {
        let mut registry = load_registry(&paths)?;
        let inventory = ProcessInventory::capture();
        refresh_instance_statuses(&mut registry, &inventory);
        let position = registry
            .instances
            .iter()
            .position(|instance| instance.id == id)
            .ok_or_else(|| "La instancia ya no existe.".to_string())?;
        if registry.instances[position].status != InstanceStatus::Running {
            registry.instances[position].pid = None;
            registry.instances[position].process_identity = None;
            registry.instances[position].status = InstanceStatus::Stopped;
            save_registry(&paths, &registry)?;
            return Ok(None);
        }
        Ok(Some((registry.instances[position].clone(), inventory)))
    })?;
    let Some((instance, stop_inventory)) = running else {
        return Ok(());
    };
    let identity = instance.process_identity.clone().ok_or_else(|| {
        "No se pudo verificar la identidad del proceso. Cierra esta instancia manualmente y vuelve a escanear.".to_string()
    })?;
    // La señal ordenada reutiliza el inventario que acaba de confirmar que la instancia corre.
    signal_instance_processes(&instance, &identity, false, &stop_inventory)?;
    if !wait_until_instance_stops(&instance, Duration::from_secs(5)) {
        // Captura fresca a propósito: pasaron hasta 5 s y el cierre forzado no puede apoyarse en
        // un inventario viejo (un PID pudo terminar o ser reutilizado).
        signal_instance_processes(&instance, &identity, true, &ProcessInventory::capture())?;
        if !wait_until_instance_stops(&instance, Duration::from_secs(2)) {
            state.with_registry_operation(|| {
                let mut registry = load_registry(&paths)?;
                if let Some(current) = registry
                    .instances
                    .iter_mut()
                    .find(|candidate| candidate.id == id)
                {
                    current.status = InstanceStatus::Running;
                }
                save_registry(&paths, &registry).map_err(String::from)
            })?;
            return Err("La instancia sigue ejecutándose después del cierre forzado. No se cambió su estado.".to_string());
        }
    }
    state.with_registry_operation(|| {
        let mut registry = load_registry(&paths)?;
        let current = registry
            .instances
            .iter_mut()
            .find(|candidate| candidate.id == id)
            .ok_or_else(|| "La instancia ya no existe.".to_string())?;
        current.pid = None;
        current.process_identity = None;
        current.status = InstanceStatus::Stopped;
        save_registry(&paths, &registry).map_err(String::from)
    })
}
