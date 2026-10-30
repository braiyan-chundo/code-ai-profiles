use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    collections::{HashMap, HashSet},
    env, fs,
    fs::File,
    hash::{DefaultHasher, Hash, Hasher},
    io::{Cursor, Read, Seek, SeekFrom},
    path::{Path, PathBuf},
    process::{Child, Command},
    sync::{Mutex, OnceLock},
    thread,
    time::{Duration, Instant},
};
use sysinfo::{Pid, ProcessRefreshKind, ProcessesToUpdate, RefreshKind, System, UpdateKind};
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};
use uuid::Uuid;

mod config;
mod contract;
#[cfg(target_os = "macos")]
mod macos_icon;
mod official_release;
mod original_update;
mod platform;
mod processes;
mod projects;
mod scan;
mod sessions;
mod storage;
#[cfg(test)]
mod test_support;
mod versions;

use contract::*;
use platform::*;
use processes::*;
use scan::*;
use sessions::*;
use storage::*;
use versions::*;

const ICON_MAX_BYTES: usize = 5 * 1024 * 1024;
const ICON_MAX_DIMENSION: u32 = 4096;
#[cfg(not(target_os = "macos"))]
const DOCK_ICON_MACOS_ONLY: &str = "El icono del Dock solo se aplica en macOS.";

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

fn copy_provider_application(source: &Path, instance_root: &Path) -> Result<PathBuf, String> {
    let application_root = instance_root.join("application");
    fs::create_dir_all(&application_root)
        .map_err(|error| format!("No se pudo crear el directorio de la aplicación: {error}"))?;

    copy_provider_bundle(source, &application_root)
}

/// A fresh copy never keeps the Finder icon of its source (HU-0020, A-4.3). Only macOS has one.
fn strip_inherited_icon_after_copy(app_path: PathBuf) -> Result<PathBuf, String> {
    #[cfg(target_os = "macos")]
    macos_icon::strip_inherited_icon(&app_path)
        .map_err(|error| format!("No se pudo quitar el icono heredado de la copia: {error}"))?;
    Ok(app_path)
}

fn instance_bundle_name(name: &str) -> String {
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

#[tauri::command]
async fn get_dashboard_state(app: AppHandle) -> Result<DashboardState, String> {
    dashboard_from_scope_async(app, RefreshScope::FULL, "La carga").await
}

#[tauri::command]
async fn check_source_update(app: AppHandle) -> Result<SourceUpdateInfo, String> {
    tauri::async_runtime::spawn_blocking(move || check_source_update_sync(&app))
        .await
        .map_err(|error| {
            format!("La comprobación de actualización terminó inesperadamente: {error}")
        })?
}

#[tauri::command]
async fn refresh_versions(app: AppHandle) -> Result<DashboardState, String> {
    invalidate_application_cache();
    dashboard_from_exact_scope_async(app, RefreshScope::VERSIONS, "El refresco de versiones").await
}

#[tauri::command]
async fn get_live_usage(
    app: AppHandle,
    instance_ids: Vec<String>,
) -> Result<Vec<UsageSnapshot>, String> {
    tauri::async_runtime::spawn_blocking(move || get_live_usage_sync(&app, instance_ids))
        .await
        .map_err(|error| format!("La lectura de uso terminó inesperadamente: {error}"))?
}

#[tauri::command]
async fn scan_system(app: AppHandle, window: WebviewWindow) -> Result<DashboardState, String> {
    tauri::async_runtime::spawn_blocking(move || {
        with_registry_operation(|| scan_system_sync(&app, &window))
    })
    .await
    .map_err(|error| format!("El escaneo terminó inesperadamente: {error}"))?
}

#[tauri::command]
async fn create_instance(
    app: AppHandle,
    request: CreateInstanceRequest,
) -> Result<DashboardState, String> {
    let worker_app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        with_registry_operation(|| create_instance_sync(&worker_app, request))
    })
    .await
    .map_err(|error| format!("La tarea de creación terminó inesperadamente: {error}"))??;
    invalidate_application_cache();
    invalidate_managed_bytes_cache();
    dashboard_from_scope_async(app, RefreshScope::VERSIONS, "La actualización del panel").await
}

#[tauri::command]
async fn update_instance_application(app: AppHandle, id: String) -> Result<DashboardState, String> {
    let worker_app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        with_registry_operation(|| update_instance_application_sync(&worker_app, &id))
    })
    .await
    .map_err(|error| format!("La actualización terminó inesperadamente: {error}"))??;
    dashboard_from_scope_async(app, RefreshScope::VERSIONS, "La actualización del panel").await
}

#[tauri::command]
async fn synchronize_managed_applications(
    app: AppHandle,
    request: SynchronizeManagedApplicationsRequest,
) -> Result<SynchronizeManagedApplicationsResult, String> {
    let worker_app = app.clone();
    let results = tauri::async_runtime::spawn_blocking(move || {
        with_registry_operation(|| synchronize_managed_applications_sync(&worker_app, request))
    })
    .await
    .map_err(|error| format!("La sincronización terminó inesperadamente: {error}"))??;
    Ok(SynchronizeManagedApplicationsResult {
        dashboard: dashboard_from_scope_async(
            app,
            RefreshScope::VERSIONS,
            "La actualización del panel",
        )
        .await?,
        results,
    })
}

#[tauri::command]
async fn copy_code_session(
    app: AppHandle,
    request: CopyCodeSessionRequest,
) -> Result<SessionTransferResult, String> {
    let worker_app = app.clone();
    let artifacts = tauri::async_runtime::spawn_blocking(move || {
        with_registry_operation(|| copy_code_session_sync(&worker_app, request))
    })
    .await
    .map_err(|error| format!("La transferencia terminó inesperadamente: {error}"))??;
    invalidate_managed_bytes_cache();
    Ok(SessionTransferResult {
        dashboard: dashboard_from_scope_async(
            app,
            RefreshScope::SESSIONS,
            "La actualización del panel",
        )
        .await?,
        artifacts,
    })
}

#[tauri::command]
async fn unlink_code_session(
    app: AppHandle,
    request: UnlinkCodeSessionRequest,
) -> Result<DashboardState, String> {
    let worker_app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        with_registry_operation(|| unlink_code_session_sync(&worker_app, request))
    })
    .await
    .map_err(|error| format!("La desvinculación terminó inesperadamente: {error}"))??;
    invalidate_managed_bytes_cache();
    dashboard_from_scope_async(app, RefreshScope::SESSIONS, "La actualización del panel").await
}

fn create_instance_sync(app: &AppHandle, request: CreateInstanceRequest) -> Result<(), String> {
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

#[tauri::command]
async fn update_instance(
    app: AppHandle,
    request: UpdateInstanceRequest,
) -> Result<DashboardState, String> {
    let worker_app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        with_registry_operation(|| update_instance_sync(&worker_app, request))
    })
    .await
    .map_err(|error| format!("La edición terminó inesperadamente: {error}"))??;
    dashboard_from_scope_async(app, RefreshScope::LIGHT, "La actualización del panel").await
}

fn update_instance_sync(app: &AppHandle, request: UpdateInstanceRequest) -> Result<(), String> {
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

#[tauri::command]
async fn launch_instance(app: AppHandle, id: String) -> Result<DashboardState, String> {
    let worker_app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        with_registry_operation(|| launch_instance_sync(&worker_app, id))
    })
    .await
    .map_err(|error| format!("El inicio terminó inesperadamente: {error}"))??;
    dashboard_from_scope_async(app, RefreshScope::LIGHT, "La actualización del panel").await
}

fn launch_instance_sync(app: &AppHandle, id: String) -> Result<(), String> {
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
        return save_registry(&paths, &registry);
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

#[tauri::command]
async fn stop_instance(app: AppHandle, id: String) -> Result<DashboardState, String> {
    let worker_app = app.clone();
    tauri::async_runtime::spawn_blocking(move || stop_instance_sync(&worker_app, &id))
        .await
        .map_err(|error| format!("El cierre terminó inesperadamente: {error}"))??;
    dashboard_from_scope_async(app, RefreshScope::LIGHT, "La actualización del panel").await
}

fn stop_instance_sync(app: &AppHandle, id: &str) -> Result<(), String> {
    let paths = ManagedPaths::resolve(&app)?;
    let running = with_registry_operation(|| {
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
            with_registry_operation(|| {
                let mut registry = load_registry(&paths)?;
                if let Some(current) = registry
                    .instances
                    .iter_mut()
                    .find(|candidate| candidate.id == id)
                {
                    current.status = InstanceStatus::Running;
                }
                save_registry(&paths, &registry)
            })?;
            return Err("La instancia sigue ejecutándose después del cierre forzado. No se cambió su estado.".to_string());
        }
    }
    with_registry_operation(|| {
        let mut registry = load_registry(&paths)?;
        let current = registry
            .instances
            .iter_mut()
            .find(|candidate| candidate.id == id)
            .ok_or_else(|| "La instancia ya no existe.".to_string())?;
        current.pid = None;
        current.process_identity = None;
        current.status = InstanceStatus::Stopped;
        save_registry(&paths, &registry)
    })
}

fn normalized_icon_png(bytes: &[u8]) -> Result<Vec<u8>, String> {
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

#[tauri::command]
async fn set_instance_icon(
    app: AppHandle,
    request: SetInstanceIconRequest,
) -> Result<DashboardState, String> {
    let worker_app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        with_registry_operation(|| set_instance_icon_sync(&worker_app, request))
    })
    .await
    .map_err(|error| format!("La personalización terminó inesperadamente: {error}"))??;
    dashboard_from_scope_async(app, RefreshScope::LIGHT, "La actualización del panel").await
}

fn set_instance_icon_sync(app: &AppHandle, request: SetInstanceIconRequest) -> Result<(), String> {
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

#[tauri::command]
async fn clear_instance_icon(app: AppHandle, id: String) -> Result<DashboardState, String> {
    let worker_app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        with_registry_operation(|| clear_instance_icon_sync(&worker_app, id))
    })
    .await
    .map_err(|error| format!("La restauración terminó inesperadamente: {error}"))??;
    dashboard_from_scope_async(app, RefreshScope::LIGHT, "La actualización del panel").await
}

fn clear_instance_icon_sync(app: &AppHandle, id: String) -> Result<(), String> {
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

#[tauri::command]
async fn reapply_instance_icon(app: AppHandle, id: String) -> Result<DashboardState, String> {
    let worker_app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        with_registry_operation(|| reapply_instance_icon_sync(&worker_app, id))
    })
    .await
    .map_err(|error| format!("El reintento del icono terminó inesperadamente: {error}"))??;
    dashboard_from_scope_async(app, RefreshScope::LIGHT, "La actualización del panel").await
}

#[cfg(target_os = "macos")]
fn reapply_instance_icon_sync(app: &AppHandle, id: String) -> Result<(), String> {
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
fn reapply_instance_icon_sync(app: &AppHandle, id: String) -> Result<(), String> {
    let _ = (app, id);
    Err(DOCK_ICON_MACOS_ONLY.to_string())
}

#[tauri::command]
fn open_instance_folder(app: AppHandle, id: String) -> Result<(), String> {
    let paths = ManagedPaths::resolve(&app)?;
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

// ── Proyectos anclados (HU-0023): envoltorios finos de projects.rs ──────────

#[tauri::command]
async fn list_projects(app: AppHandle) -> Result<projects::ProjectsState, String> {
    tauri::async_runtime::spawn_blocking(move || projects::list_projects_sync(&app))
        .await
        .map_err(|error| format!("La lectura de los proyectos terminó inesperadamente: {error}"))?
}

#[tauri::command]
async fn read_project(app: AppHandle, id: String) -> Result<projects::ProjectSummary, String> {
    tauri::async_runtime::spawn_blocking(move || projects::read_project_sync(&app, &id))
        .await
        .map_err(|error| format!("La lectura del proyecto terminó inesperadamente: {error}"))?
}

/// Abre el selector nativo de carpetas con la ventana `main` de padre e inspecciona la elegida sin
/// anclarla. `None` si la persona cancela.
#[tauri::command]
async fn pick_project_folder(app: AppHandle) -> Result<Option<projects::ProjectCandidate>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        use tauri_plugin_dialog::DialogExt;
        let mut dialog = app
            .dialog()
            .file()
            .set_title("Elige la carpeta del proyecto");
        if let Some(window) = app.get_webview_window("main") {
            dialog = dialog.set_parent(&window);
        }
        let Some(picked) = dialog.blocking_pick_folder() else {
            return Ok(None);
        };
        let path = picked
            .into_path()
            .map_err(|error| format!("No se pudo leer la carpeta elegida: {error}"))?;
        projects::inspect_candidate_sync(&app, &path).map(Some)
    })
    .await
    .map_err(|error| format!("El selector de carpetas terminó inesperadamente: {error}"))?
}

#[tauri::command]
async fn pin_project(app: AppHandle, path: String) -> Result<projects::ProjectSummary, String> {
    tauri::async_runtime::spawn_blocking(move || projects::pin_project_sync(&app, &path))
        .await
        .map_err(|error| format!("Anclar el proyecto terminó inesperadamente: {error}"))?
}

#[tauri::command]
async fn unpin_project(app: AppHandle, id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || projects::unpin_project_sync(&app, &id))
        .await
        .map_err(|error| format!("Desanclar el proyecto terminó inesperadamente: {error}"))?
}

#[tauri::command]
async fn open_project_folder(app: AppHandle, id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let path = projects::project_folder_sync(&app, &id)?;
        open_in_file_manager(&path)
    })
    .await
    .map_err(|error| format!("Abrir la carpeta del proyecto terminó inesperadamente: {error}"))?
}

#[tauri::command]
async fn open_system_settings(panel: SystemSettingsPanel) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || open_system_settings_sync(panel))
        .await
        .map_err(|error| {
            format!("La apertura de Ajustes del Sistema terminó inesperadamente: {error}")
        })?
}

#[tauri::command]
async fn get_account_facts() -> Result<AccountFacts, String> {
    Ok(tauri::async_runtime::spawn_blocking(account_facts_sync)
        .await
        .unwrap_or(AccountFacts { admin: None }))
}

#[tauri::command]
fn update_original_application(app: AppHandle) -> Result<OriginalApplicationUpdateResult, String> {
    if original_update::original_update_in_flight() {
        return Err(
            "Hay una actualización de la original en curso. Espera a que termine.".to_string(),
        );
    }
    let source = require_provider_source(detect_provider_source())?;

    #[cfg(target_os = "macos")]
    {
        let paths = ManagedPaths::resolve(&app)?;
        return launch_macos_original_application_with(&paths, &source, |launch| {
            let status = Command::new(launch.executable)
                .args(&launch.arguments)
                .status()
                .map_err(|error| format!("No se pudo abrir la aplicación original: {error}"))?;
            if status.success() {
                Ok(())
            } else {
                Err(format!(
                    "El sistema no pudo abrir la aplicación original (código {status})."
                ))
            }
        });
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = source;
        let _ = app;
        let platform = platform_name();
        let target = original_application_update_target(&platform, std::env::consts::ARCH)
            .ok_or_else(|| {
                "La actualización oficial no está soportada en esta plataforma.".to_string()
            })?;

        let status = open_update_url(target.url);

        let status = status.map_err(|error| {
            format!("No se pudo abrir el canal oficial de actualización: {error}")
        })?;
        if !status.success() {
            return Err(format!(
                "El sistema no pudo abrir el canal oficial de actualización (código {}).",
                status
            ));
        }

        let message = match target.action {
            OriginalApplicationUpdateAction::Download => {
                "Se abrió la descarga oficial. Ejecuta el instalador para actualizar la aplicación original; las instancias permanecen intactas."
            }
            OriginalApplicationUpdateAction::Instructions => {
                "Se abrieron las instrucciones oficiales para actualizar Claude Desktop en Linux; las instancias permanecen intactas."
            }
        };
        Ok(OriginalApplicationUpdateResult {
            action: target.action,
            message: message.to_string(),
        })
    }
}

#[tauri::command]
async fn install_original_update(
    app: AppHandle,
    request: original_update::InstallOriginalUpdateRequest,
    on_progress: tauri::ipc::Channel<original_update::OriginalInstallProgress>,
) -> Result<original_update::OriginalInstallResult, String> {
    let worker_app = app.clone();
    let outcome = tauri::async_runtime::spawn_blocking(move || {
        original_update::install_original_update_sync(&worker_app, request, &|progress| {
            let _ = on_progress.send(progress);
        })
    })
    .await
    .map_err(|error| {
        format!("La actualización de la original terminó inesperadamente: {error}")
    })??;
    let dashboard =
        dashboard_from_scope_async(app, RefreshScope::VERSIONS, "La actualización del panel")
            .await?;
    Ok(outcome.into_result(dashboard))
}

#[tauri::command]
fn cancel_original_update() -> bool {
    original_update::cancel_original_update()
}

#[tauri::command]
async fn delete_instance(app: AppHandle, id: String) -> Result<DashboardState, String> {
    let worker_app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        with_registry_operation(|| delete_instance_sync(&worker_app, id))
    })
    .await
    .map_err(|error| format!("La eliminación terminó inesperadamente: {error}"))??;
    dashboard_from_scope_async(app, RefreshScope::VERSIONS, "La actualización del panel").await
}

fn delete_instance_sync(app: &AppHandle, id: String) -> Result<(), String> {
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            config::validate().map_err(std::io::Error::other)?;
            let handle = app.handle().clone();
            let paths = ManagedPaths::resolve(&handle).map_err(std::io::Error::other)?;
            original_update::recover_original_update_leftovers(&paths);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_dashboard_state,
            check_source_update,
            refresh_versions,
            get_live_usage,
            scan_system,
            create_instance,
            update_instance,
            update_instance_application,
            synchronize_managed_applications,
            copy_code_session,
            unlink_code_session,
            launch_instance,
            stop_instance,
            set_instance_icon,
            clear_instance_icon,
            reapply_instance_icon,
            open_instance_folder,
            open_system_settings,
            get_account_facts,
            update_original_application,
            install_original_update,
            cancel_original_update,
            delete_instance,
            list_projects,
            read_project,
            pick_project_folder,
            pin_project,
            unpin_project,
            open_project_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running Code AI Profiles");
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
    fn validates_instance_names() {
        assert_eq!(validate_name("  Work  ").unwrap(), "Work");
        assert!(validate_name("  ").is_err());
        assert!(validate_name(&"a".repeat(65)).is_err());
        assert!(validate_name("line\nbreak").is_err());
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

    #[test]
    fn creates_safe_instance_bundle_names() {
        assert_eq!(instance_bundle_name("Work Profile"), "Work Profile.app");
        assert_eq!(instance_bundle_name("Cliente/A: B"), "Cliente-A- B.app");
        assert_eq!(instance_bundle_name("..."), "Code AI Profile.app");
    }
}
