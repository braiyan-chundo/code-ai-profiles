//! Los comandos IPC (`#[tauri::command]`): envoltorios finos que pasan la E/S bloqueante a
//! `spawn_blocking`, serializan con `with_registry_operation` lo que muta el registro y devuelven el
//! panel con el alcance más estrecho que sirva. La lógica vive en los módulos de dominio.

use super::*;

#[tauri::command]
pub(crate) async fn get_dashboard_state(app: AppHandle) -> Result<DashboardState, String> {
    dashboard_from_scope_async(app, RefreshScope::FULL, "La carga").await
}

#[tauri::command]
pub(crate) async fn check_source_update(app: AppHandle) -> Result<SourceUpdateInfo, String> {
    tauri::async_runtime::spawn_blocking(move || check_source_update_sync(&app))
        .await
        .map_err(|error| {
            format!("La comprobación de actualización terminó inesperadamente: {error}")
        })?
}

#[tauri::command]
pub(crate) async fn refresh_versions(app: AppHandle) -> Result<DashboardState, String> {
    invalidate_application_cache();
    dashboard_from_exact_scope_async(app, RefreshScope::VERSIONS, "El refresco de versiones").await
}

#[tauri::command]
pub(crate) async fn get_live_usage(
    app: AppHandle,
    instance_ids: Vec<String>,
) -> Result<Vec<UsageSnapshot>, String> {
    tauri::async_runtime::spawn_blocking(move || get_live_usage_sync(&app, instance_ids))
        .await
        .map_err(|error| format!("La lectura de uso terminó inesperadamente: {error}"))?
}

#[tauri::command]
pub(crate) async fn scan_system(
    app: AppHandle,
    window: WebviewWindow,
) -> Result<DashboardState, String> {
    tauri::async_runtime::spawn_blocking(move || {
        with_registry_operation(|| scan_system_sync(&app, &window))
    })
    .await
    .map_err(|error| format!("El escaneo terminó inesperadamente: {error}"))?
}

#[tauri::command]
pub(crate) async fn create_instance(
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
pub(crate) async fn update_instance_application(
    app: AppHandle,
    id: String,
) -> Result<DashboardState, String> {
    let worker_app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        with_registry_operation(|| update_instance_application_sync(&worker_app, &id))
    })
    .await
    .map_err(|error| format!("La actualización terminó inesperadamente: {error}"))??;
    dashboard_from_scope_async(app, RefreshScope::VERSIONS, "La actualización del panel").await
}

#[tauri::command]
pub(crate) async fn synchronize_managed_applications(
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
pub(crate) async fn copy_code_session(
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
pub(crate) async fn unlink_code_session(
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
pub(crate) async fn update_instance(
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
pub(crate) async fn launch_instance(app: AppHandle, id: String) -> Result<DashboardState, String> {
    let worker_app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        with_registry_operation(|| launch_instance_sync(&worker_app, id))
    })
    .await
    .map_err(|error| format!("El inicio terminó inesperadamente: {error}"))??;
    dashboard_from_scope_async(app, RefreshScope::LIGHT, "La actualización del panel").await
}

#[tauri::command]
pub(crate) async fn stop_instance(app: AppHandle, id: String) -> Result<DashboardState, String> {
    let worker_app = app.clone();
    tauri::async_runtime::spawn_blocking(move || stop_instance_sync(&worker_app, &id))
        .await
        .map_err(|error| format!("El cierre terminó inesperadamente: {error}"))??;
    dashboard_from_scope_async(app, RefreshScope::LIGHT, "La actualización del panel").await
}

#[tauri::command]
pub(crate) async fn set_instance_icon(
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
pub(crate) async fn clear_instance_icon(
    app: AppHandle,
    id: String,
) -> Result<DashboardState, String> {
    let worker_app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        with_registry_operation(|| clear_instance_icon_sync(&worker_app, id))
    })
    .await
    .map_err(|error| format!("La restauración terminó inesperadamente: {error}"))??;
    dashboard_from_scope_async(app, RefreshScope::LIGHT, "La actualización del panel").await
}

#[tauri::command]
pub(crate) async fn reapply_instance_icon(
    app: AppHandle,
    id: String,
) -> Result<DashboardState, String> {
    let worker_app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        with_registry_operation(|| reapply_instance_icon_sync(&worker_app, id))
    })
    .await
    .map_err(|error| format!("El reintento del icono terminó inesperadamente: {error}"))??;
    dashboard_from_scope_async(app, RefreshScope::LIGHT, "La actualización del panel").await
}

#[tauri::command]
pub(crate) fn open_instance_folder(app: AppHandle, id: String) -> Result<(), String> {
    open_instance_folder_sync(&app, id)
}

// ── Proyectos anclados (HU-0023): envoltorios finos de projects.rs ──────────

#[tauri::command]
pub(crate) async fn list_projects(app: AppHandle) -> Result<projects::ProjectsState, String> {
    tauri::async_runtime::spawn_blocking(move || projects::list_projects_sync(&app))
        .await
        .map_err(|error| format!("La lectura de los proyectos terminó inesperadamente: {error}"))?
}

#[tauri::command]
pub(crate) async fn read_project(
    app: AppHandle,
    id: String,
) -> Result<projects::ProjectSummary, String> {
    tauri::async_runtime::spawn_blocking(move || projects::read_project_sync(&app, &id))
        .await
        .map_err(|error| format!("La lectura del proyecto terminó inesperadamente: {error}"))?
}

/// Abre el selector nativo de carpetas con la ventana `main` de padre e inspecciona la elegida sin
/// anclarla. `None` si la persona cancela.
#[tauri::command]
pub(crate) async fn pick_project_folder(
    app: AppHandle,
) -> Result<Option<projects::ProjectCandidate>, String> {
    tauri::async_runtime::spawn_blocking(move || pick_project_folder_sync(&app))
        .await
        .map_err(|error| format!("El selector de carpetas terminó inesperadamente: {error}"))?
}

#[tauri::command]
pub(crate) async fn pin_project(
    app: AppHandle,
    path: String,
) -> Result<projects::ProjectSummary, String> {
    tauri::async_runtime::spawn_blocking(move || projects::pin_project_sync(&app, &path))
        .await
        .map_err(|error| format!("Anclar el proyecto terminó inesperadamente: {error}"))?
}

#[tauri::command]
pub(crate) async fn unpin_project(app: AppHandle, id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || projects::unpin_project_sync(&app, &id))
        .await
        .map_err(|error| format!("Desanclar el proyecto terminó inesperadamente: {error}"))?
}

#[tauri::command]
pub(crate) async fn open_project_folder(app: AppHandle, id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let path = projects::project_folder_sync(&app, &id)?;
        open_in_file_manager(&path)
    })
    .await
    .map_err(|error| format!("Abrir la carpeta del proyecto terminó inesperadamente: {error}"))?
}

#[tauri::command]
pub(crate) async fn open_system_settings(panel: SystemSettingsPanel) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || open_system_settings_sync(panel))
        .await
        .map_err(|error| {
            format!("La apertura de Ajustes del Sistema terminó inesperadamente: {error}")
        })?
}

#[tauri::command]
pub(crate) async fn get_account_facts() -> Result<AccountFacts, String> {
    Ok(tauri::async_runtime::spawn_blocking(account_facts_sync)
        .await
        .unwrap_or(AccountFacts { admin: None }))
}

#[tauri::command]
pub(crate) fn update_original_application(
    app: AppHandle,
) -> Result<OriginalApplicationUpdateResult, String> {
    update_original_application_sync(&app)
}

#[tauri::command]
pub(crate) async fn install_original_update(
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
pub(crate) fn cancel_original_update() -> bool {
    original_update::cancel_original_update()
}

#[tauri::command]
pub(crate) async fn delete_instance(app: AppHandle, id: String) -> Result<DashboardState, String> {
    let worker_app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        with_registry_operation(|| delete_instance_sync(&worker_app, id))
    })
    .await
    .map_err(|error| format!("La eliminación terminó inesperadamente: {error}"))??;
    dashboard_from_scope_async(app, RefreshScope::VERSIONS, "La actualización del panel").await
}
