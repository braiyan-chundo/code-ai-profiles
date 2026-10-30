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

mod commands;
mod config;
mod contract;
mod instances;
#[cfg(target_os = "macos")]
mod macos_icon;
mod official_release;
mod original_update;
mod platform;
mod processes;
mod project_picker;
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
use project_picker::*;
use scan::*;
use sessions::*;
use storage::*;
use versions::*;

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
            commands::get_dashboard_state,
            commands::check_source_update,
            commands::refresh_versions,
            commands::get_live_usage,
            commands::scan_system,
            commands::create_instance,
            commands::update_instance,
            commands::update_instance_application,
            commands::synchronize_managed_applications,
            commands::copy_code_session,
            commands::unlink_code_session,
            commands::launch_instance,
            commands::stop_instance,
            commands::set_instance_icon,
            commands::clear_instance_icon,
            commands::reapply_instance_icon,
            commands::open_instance_folder,
            commands::open_system_settings,
            commands::get_account_facts,
            commands::update_original_application,
            commands::install_original_update,
            commands::cancel_original_update,
            commands::delete_instance,
            commands::list_projects,
            commands::read_project,
            commands::pick_project_folder,
            commands::pin_project,
            commands::unpin_project,
            commands::open_project_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running Code AI Profiles");
}
