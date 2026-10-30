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
mod instances;
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
use instances::*;
use platform::*;
use processes::*;
use scan::*;
use sessions::*;
use storage::*;
use versions::*;

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

#[tauri::command]
async fn stop_instance(app: AppHandle, id: String) -> Result<DashboardState, String> {
    let worker_app = app.clone();
    tauri::async_runtime::spawn_blocking(move || stop_instance_sync(&worker_app, &id))
        .await
        .map_err(|error| format!("El cierre terminó inesperadamente: {error}"))??;
    dashboard_from_scope_async(app, RefreshScope::LIGHT, "La actualización del panel").await
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
