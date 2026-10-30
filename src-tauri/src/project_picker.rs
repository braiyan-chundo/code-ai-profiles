//! El selector nativo de carpetas para anclar un proyecto (`tauri-plugin-dialog`, solo desde Rust).

use super::*;

/// El selector nativo de carpetas, con la ventana `main` de padre. `None` si la persona cancela.
pub(crate) fn pick_project_folder_sync(
    app: &AppHandle,
) -> Result<Option<projects::ProjectCandidate>, String> {
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
    projects::inspect_candidate_sync(app, &path).map(Some)
}
