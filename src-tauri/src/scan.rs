//! El panel: refrescar el registro con el alcance pedido (`RefreshScope`), el estado del sistema, el
//! uso de sesión y semanal, el espacio administrado y el escaneo completo con su progreso.

use super::*;

const MANAGED_BYTES_CACHE_TTL: Duration = Duration::from_secs(30);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) struct RefreshScope {
    pub(crate) processes: bool,
    pub(crate) bundle_names: bool,
    pub(crate) versions: bool,
    pub(crate) usage: bool,
    pub(crate) sessions: bool,
    pub(crate) topology: bool,
    pub(crate) storage: bool,
    pub(crate) force_storage: bool,
}

impl RefreshScope {
    pub(crate) const FULL: Self = Self {
        processes: true,
        bundle_names: true,
        versions: true,
        usage: true,
        sessions: true,
        topology: true,
        storage: true,
        force_storage: false,
    };
    const FULL_SCAN: Self = Self {
        force_storage: true,
        ..Self::FULL
    };
    pub(crate) const LIGHT: Self = Self {
        processes: true,
        bundle_names: false,
        versions: false,
        usage: true,
        sessions: false,
        topology: false,
        storage: false,
        force_storage: false,
    };
    pub(crate) const SESSIONS: Self = Self {
        sessions: true,
        ..Self::LIGHT
    };
    pub(crate) const VERSIONS: Self = Self {
        processes: true,
        bundle_names: false,
        versions: true,
        usage: false,
        sessions: false,
        topology: true,
        storage: false,
        force_storage: false,
    };
}

#[cfg(test)]
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub(crate) struct RefreshWorkCounters {
    pub(crate) process_inventories: usize,
    pub(crate) transcript_catalogs: usize,
    pub(crate) version_refreshes: usize,
    pub(crate) usage_refreshes: usize,
    pub(crate) topology_builds: usize,
    pub(crate) storage_walks: usize,
}

#[cfg(test)]
thread_local! {
    static REFRESH_WORK_COUNTERS: std::cell::RefCell<RefreshWorkCounters> =
        std::cell::RefCell::new(RefreshWorkCounters::default());
}

#[cfg(test)]
pub(crate) fn record_refresh_work(update: impl FnOnce(&mut RefreshWorkCounters)) {
    REFRESH_WORK_COUNTERS.with(|counters| update(&mut counters.borrow_mut()));
}

#[cfg(test)]
pub(crate) fn reset_refresh_work_counters() {
    REFRESH_WORK_COUNTERS.with(|counters| *counters.borrow_mut() = RefreshWorkCounters::default());
}

#[cfg(test)]
pub(crate) fn refresh_work_counters() -> RefreshWorkCounters {
    REFRESH_WORK_COUNTERS.with(|counters| counters.borrow().clone())
}

fn read_usage(profile_path: &Path) -> Option<UsageStats> {
    let contents = fs::read_to_string(profile_path.join("plan-usage-history.json")).ok()?;
    let document: Value = serde_json::from_str(&contents).ok()?;
    let latest = document.get("samples")?.as_array()?.last()?;
    let usage = latest.get("u")?;

    let percent = |key: &str| {
        usage
            .get(key)
            .and_then(Value::as_f64)
            .map(|value| value.clamp(0.0, 100.0))
    };

    Some(UsageStats {
        session_percent: percent("fh"),
        weekly_percent: percent("sd"),
        captured_at: latest.get("t").and_then(Value::as_i64),
    })
}

fn refresh_registry_scoped(
    registry: &mut Registry,
    scope: RefreshScope,
    inventory: Option<&ProcessInventory>,
) -> Option<HashMap<String, PathBuf>> {
    if scope.processes {
        refresh_instance_statuses(
            registry,
            inventory.expect("process inventory is required by this refresh scope"),
        );
    }
    if scope.bundle_names {
        refresh_instance_bundle_names(registry);
    }
    if scope.versions {
        #[cfg(test)]
        record_refresh_work(|counters| counters.version_refreshes += 1);
        refresh_instance_versions(registry);
    }
    if scope.usage {
        #[cfg(test)]
        record_refresh_work(|counters| counters.usage_refreshes += 1);
        refresh_instance_usage(registry);
    }
    scope.sessions.then(|| {
        #[cfg(test)]
        record_refresh_work(|counters| counters.transcript_catalogs += 1);
        let transcripts = code_transcript_catalog();
        refresh_instance_code_sessions(registry, &transcripts);
        transcripts
    })
}

pub(crate) fn refresh_instance_bundle_names(registry: &mut Registry) {
    #[cfg(target_os = "macos")]
    for instance in &mut registry.instances {
        if instance.status == InstanceStatus::Running {
            continue;
        }
        let current = PathBuf::from(&instance.app_path);
        if current.extension().and_then(|value| value.to_str()) != Some("app") || !current.exists()
        {
            continue;
        }
        if let Ok(personalized) = personalize_application_path(&current, &instance.name) {
            instance.app_path = personalized.to_string_lossy().to_string();
        }
    }

    #[cfg(not(target_os = "macos"))]
    let _ = registry;
}

pub(crate) fn refresh_instance_versions(registry: &mut Registry) {
    for instance in &mut registry.instances {
        let app_path = Path::new(&instance.app_path);
        if app_path.exists() {
            if let Some(version) = cached_source_version(app_path) {
                instance.source_version = Some(version);
            }
        }
    }
}

fn refresh_instance_usage(registry: &mut Registry) {
    for instance in &mut registry.instances {
        if let Some(usage) = read_usage(Path::new(&instance.profile_path)) {
            instance.usage = Some(usage);
        }
    }
}

fn refresh_instance_code_sessions(registry: &mut Registry, transcripts: &HashMap<String, PathBuf>) {
    for instance in &mut registry.instances {
        instance.code_sessions = read_code_sessions(Path::new(&instance.profile_path), transcripts);
    }
}

fn managed_bytes(runtime: &Mutex<RuntimeCache>, paths: &ManagedPaths, force: bool) -> u64 {
    if !force {
        if let Some(value) = runtime.lock().ok().and_then(|cache| {
            cache
                .managed_bytes
                .as_ref()
                .filter(|(root, captured, _)| {
                    root == &paths.instances && captured.elapsed() < MANAGED_BYTES_CACHE_TTL
                })
                .map(|(_, _, value)| *value)
        }) {
            return value;
        }
    }
    #[cfg(test)]
    record_refresh_work(|counters| counters.storage_walks += 1);
    let value = path_size(&paths.instances);
    if let Ok(mut cache) = runtime.lock() {
        cache.managed_bytes = Some((paths.instances.clone(), Instant::now(), value));
    }
    value
}

fn system_info_seed(previous: Option<&SystemInfo>) -> SystemInfo {
    previous.cloned().unwrap_or_else(|| SystemInfo {
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        platform: platform_name(),
        source_path: None,
        source_name: None,
        source_version: None,
        source_update: SourceUpdateInfo::default(),
        version_topology: VersionTopology {
            latest_installed_version: None,
            latest_source: None,
            stale_instance_ids: Vec::new(),
            original_behind: false,
            can_synchronize_managed: false,
            reason: Some("Pendiente de escaneo completo.".to_string()),
        },
        original_profile_path: None,
        original_status: InstanceStatus::Missing,
        original_code_sessions: Vec::new(),
        free_bytes: None,
        managed_bytes: 0,
    })
}

pub(crate) fn system_info_scoped(
    runtime: &Mutex<RuntimeCache>,
    paths: &ManagedPaths,
    registry: &Registry,
    session_links: &SessionLinkRegistry,
    transcripts: Option<&HashMap<String, PathBuf>>,
    inventory: Option<&ProcessInventory>,
    scope: RefreshScope,
    previous: Option<&SystemInfo>,
) -> SystemInfo {
    let mut info = system_info_seed(previous);
    info.app_version = env!("CARGO_PKG_VERSION").to_string();

    if scope.versions || scope.topology {
        let source = detect_provider_source();
        let platform = platform_name();
        let source_version_value = source.as_deref().and_then(cached_source_version);
        info.platform = platform.clone();
        info.source_update = source_version_value
            .as_deref()
            .and_then(|installed| {
                read_source_update_cache(paths, &platform, installed, UPDATE_CACHE_STALE_MS)
            })
            .unwrap_or_default();
        info.source_name = source.as_deref().and_then(source_display_name);
        info.source_path = source
            .as_ref()
            .map(|path| path.to_string_lossy().to_string());
        info.source_version = source_version_value;
        if scope.topology {
            info.version_topology = build_version_topology(
                paths,
                registry,
                inventory.expect("process inventory is required by topology refresh"),
            );
        }
    }
    if scope.sessions {
        let original_profile = detect_original_profile();
        let mut sessions = original_profile
            .as_deref()
            .zip(transcripts)
            .map(|(profile, transcripts)| read_code_sessions(profile, transcripts))
            .unwrap_or_default();
        apply_session_links_to_profile(&mut sessions, ORIGINAL_INSTANCE_ID, session_links);
        info.original_profile_path = original_profile
            .as_ref()
            .map(|path| path.to_string_lossy().to_string());
        info.original_code_sessions = sessions;
    }
    if scope.processes {
        info.original_status = original_instance_status_with_inventory(
            inventory.expect("process inventory is required by process refresh"),
        );
    }
    if scope.storage {
        info.free_bytes = fs2::available_space(&paths.app_data).ok();
        info.managed_bytes = managed_bytes(runtime, paths, scope.force_storage);
    }
    info
}

fn dashboard_from_scope(
    app: &AppHandle,
    requested_scope: RefreshScope,
) -> Result<DashboardState, String> {
    let state = app_state(app);
    state.with_registry_operation(|| {
        dashboard_from_scope_unlocked(app, &state, requested_scope, true)
    })
}

fn dashboard_from_exact_scope(
    app: &AppHandle,
    requested_scope: RefreshScope,
) -> Result<DashboardState, String> {
    let state = app_state(app);
    state.with_registry_operation(|| {
        dashboard_from_scope_unlocked(app, &state, requested_scope, false)
    })
}

fn effective_refresh_scope(
    requested_scope: RefreshScope,
    has_previous_dashboard: bool,
    allow_full_bootstrap: bool,
) -> RefreshScope {
    if !has_previous_dashboard && allow_full_bootstrap {
        RefreshScope::FULL
    } else {
        requested_scope
    }
}

fn preserve_unrequested_instance_state(
    registry: &mut Registry,
    previous: Option<&DashboardState>,
    scope: RefreshScope,
) {
    let Some(previous) = previous else {
        return;
    };
    for instance in &mut registry.instances {
        if let Some(previous_instance) = previous
            .instances
            .iter()
            .find(|candidate| candidate.id == instance.id)
        {
            if !scope.sessions {
                instance.code_sessions = previous_instance.code_sessions.clone();
            }
            if !scope.usage {
                instance.usage = previous_instance.usage.clone();
            }
        }
    }
}

fn dashboard_from_scope_unlocked(
    app: &AppHandle,
    state: &AppState,
    requested_scope: RefreshScope,
    allow_full_bootstrap: bool,
) -> Result<DashboardState, String> {
    let paths = ManagedPaths::resolve(app)?;
    let previous = state.previous_dashboard();
    let scope = effective_refresh_scope(requested_scope, previous.is_some(), allow_full_bootstrap);
    let mut registry = load_registry(&paths)?;
    preserve_unrequested_instance_state(&mut registry, previous.as_ref(), scope);
    let inventory = scope.processes.then(ProcessInventory::capture);
    let transcripts = refresh_registry_scoped(&mut registry, scope, inventory.as_ref());
    let session_links = if scope.sessions {
        let links = load_session_links(&paths)?;
        apply_session_links(&mut registry, &links);
        links
    } else {
        SessionLinkRegistry::default()
    };
    save_registry(&paths, &registry)?;
    let system = system_info_scoped(
        &state.runtime,
        &paths,
        &registry,
        &session_links,
        transcripts.as_ref(),
        inventory.as_ref(),
        scope,
        previous.as_ref().map(|dashboard| &dashboard.system),
    );
    let dashboard = DashboardState {
        instances: registry.instances,
        system,
    };
    state.remember_dashboard(&dashboard);
    Ok(dashboard)
}

pub(crate) async fn dashboard_from_scope_async(
    app: AppHandle,
    scope: RefreshScope,
    operation: &'static str,
) -> Result<DashboardState, String> {
    tauri::async_runtime::spawn_blocking(move || dashboard_from_scope(&app, scope))
        .await
        .map_err(|error| format!("{operation} terminó inesperadamente: {error}"))?
}

pub(crate) async fn dashboard_from_exact_scope_async(
    app: AppHandle,
    scope: RefreshScope,
    operation: &'static str,
) -> Result<DashboardState, String> {
    tauri::async_runtime::spawn_blocking(move || dashboard_from_exact_scope(&app, scope))
        .await
        .map_err(|error| format!("{operation} terminó inesperadamente: {error}"))?
}

pub(crate) fn get_live_usage_sync(
    app: &AppHandle,
    instance_ids: Vec<String>,
) -> Result<Vec<UsageSnapshot>, String> {
    let paths = ManagedPaths::resolve(&app)?;
    let registry = load_registry(&paths)?;
    let requested = instance_ids
        .into_iter()
        .filter(|id| Uuid::parse_str(id).is_ok())
        .collect::<HashSet<_>>();
    Ok(registry
        .instances
        .iter()
        .filter(|instance| requested.contains(&instance.id))
        .filter_map(|instance| {
            read_usage(Path::new(&instance.profile_path)).map(|usage| UsageSnapshot {
                instance_id: instance.id.clone(),
                usage,
            })
        })
        .collect())
}

pub(crate) fn scan_system_sync(
    app: &AppHandle,
    state: &AppState,
    window: &WebviewWindow,
) -> Result<DashboardState, String> {
    let emit_progress = |progress, label| {
        let _ = window.emit("scan-progress", ScanProgress { progress, label });
    };

    emit_progress(8, "Preparando el escaneo…");
    let paths = ManagedPaths::resolve(app)?;

    emit_progress(22, "Cargando perfiles administrados…");
    let mut registry = load_registry(&paths)?;

    emit_progress(40, "Comprobando instancias y procesos…");
    let inventory = ProcessInventory::capture();
    refresh_instance_statuses(&mut registry, &inventory);
    refresh_instance_bundle_names(&mut registry);
    refresh_instance_versions(&mut registry);

    emit_progress(62, "Leyendo métricas locales de uso…");
    refresh_instance_usage(&mut registry);

    emit_progress(74, "Indexando sesiones de Code…");
    let transcripts = code_transcript_catalog();
    refresh_instance_code_sessions(&mut registry, &transcripts);
    let session_links = load_session_links(&paths)?;
    apply_session_links(&mut registry, &session_links);

    emit_progress(88, "Buscando la aplicación compatible y su versión…");
    let previous = state.previous_dashboard();
    let system = system_info_scoped(
        &state.runtime,
        &paths,
        &registry,
        &session_links,
        Some(&transcripts),
        Some(&inventory),
        RefreshScope::FULL_SCAN,
        previous.as_ref().map(|dashboard| &dashboard.system),
    );

    emit_progress(92, "Actualizando el registro local…");
    save_registry(&paths, &registry)?;

    emit_progress(100, "Escaneo completado");
    let dashboard = DashboardState {
        instances: registry.instances,
        system,
    };
    state.remember_dashboard(&dashboard);
    Ok(dashboard)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::*;

    #[test]
    fn two_app_states_keep_their_managed_bytes_apart() {
        let root = env::temp_dir().join(format!("code-ai-two-states-{}", Uuid::new_v4()));
        let paths = test_managed_paths(&root);
        fs::create_dir_all(&paths.instances).unwrap();
        fs::write(paths.instances.join("first.bin"), [0_u8; 10]).unwrap();
        let first = AppState::default();
        let second = AppState::default();

        assert_eq!(managed_bytes(&first.runtime, &paths, false), 10);
        fs::write(paths.instances.join("second.bin"), [0_u8; 5]).unwrap();
        // El primero sigue con su caché; el segundo no la comparte y mide de nuevo.
        assert_eq!(managed_bytes(&first.runtime, &paths, false), 10);
        assert_eq!(managed_bytes(&second.runtime, &paths, false), 15);
        // Invalidar uno no toca al otro.
        fs::write(paths.instances.join("third.bin"), [0_u8; 1]).unwrap();
        first.invalidate_managed_bytes();
        assert_eq!(managed_bytes(&first.runtime, &paths, false), 16);
        assert_eq!(managed_bytes(&second.runtime, &paths, false), 15);

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn each_app_state_remembers_its_own_dashboard() {
        let root = env::temp_dir().join(format!("code-ai-dashboard-{}", Uuid::new_v4()));
        let first = AppState::default();
        let second = AppState::default();
        let dashboard = DashboardState {
            instances: vec![test_instance(&root)],
            system: system_info_seed(None),
        };
        first.remember_dashboard(&dashboard);
        assert_eq!(
            first
                .previous_dashboard()
                .map(|value| value.instances.len()),
            Some(1)
        );
        assert!(second.previous_dashboard().is_none());
    }

    #[test]
    fn light_refresh_executes_one_inventory_and_skips_expensive_work() {
        let root = env::temp_dir().join(format!("code-ai-light-refresh-{}", Uuid::new_v4()));
        let mut registry = Registry {
            version: REGISTRY_VERSION,
            instances: vec![test_instance(&root)],
        };
        reset_refresh_work_counters();
        let inventory = ProcessInventory::capture();
        let transcripts =
            refresh_registry_scoped(&mut registry, RefreshScope::LIGHT, Some(&inventory));
        assert!(transcripts.is_none());
        assert_eq!(
            refresh_work_counters(),
            RefreshWorkCounters {
                process_inventories: 1,
                transcript_catalogs: 0,
                version_refreshes: 0,
                usage_refreshes: 1,
                topology_builds: 0,
                storage_walks: 0,
            }
        );
    }

    #[test]
    fn versions_refresh_preserves_sessions_and_skips_profile_and_storage_work() {
        let root = env::temp_dir().join(format!("code-ai-versions-refresh-{}", Uuid::new_v4()));
        fs::create_dir_all(root.join("managed-instances")).unwrap();
        let session = CodeSession {
            id: "local_96812ba4-6864-40d5-a70a-0470f244022c".to_string(),
            title: "Session sentinel".to_string(),
            model: None,
            effort: None,
            completed_turns: 1,
            created_at: None,
            last_activity_at: None,
            is_archived: false,
            context_tokens: None,
            context_window_tokens: None,
            context_percent: None,
            published_artifact_count: 0,
            artifact_monitor: None,
            transfer: None,
            cli_session_id: None,
        };
        let usage = UsageStats {
            session_percent: Some(11.0),
            weekly_percent: Some(22.0),
            captured_at: Some(33),
        };
        let mut previous_instance = test_instance(&root);
        previous_instance.code_sessions = vec![session.clone()];
        previous_instance.usage = Some(usage.clone());
        let previous_system = SystemInfo {
            app_version: env!("CARGO_PKG_VERSION").to_string(),
            platform: platform_name(),
            source_path: None,
            source_name: None,
            source_version: None,
            source_update: SourceUpdateInfo::default(),
            version_topology: VersionTopology {
                latest_installed_version: None,
                latest_source: None,
                stale_instance_ids: Vec::new(),
                original_behind: false,
                can_synchronize_managed: false,
                reason: None,
            },
            original_profile_path: Some("/private/not-read".to_string()),
            original_status: InstanceStatus::Stopped,
            original_code_sessions: vec![session.clone()],
            free_bytes: Some(44),
            managed_bytes: 55,
        };
        let previous = DashboardState {
            instances: vec![previous_instance.clone()],
            system: previous_system.clone(),
        };
        let mut registry = Registry {
            version: REGISTRY_VERSION,
            instances: vec![test_instance(&root)],
        };
        registry.instances[0].id = previous_instance.id.clone();
        preserve_unrequested_instance_state(&mut registry, Some(&previous), RefreshScope::VERSIONS);

        reset_refresh_work_counters();
        let inventory = ProcessInventory::capture();
        let transcripts =
            refresh_registry_scoped(&mut registry, RefreshScope::VERSIONS, Some(&inventory));
        let system = system_info_seed(Some(&previous_system));

        assert!(transcripts.is_none());
        assert_eq!(registry.instances[0].code_sessions[0].id, session.id);
        assert_eq!(
            registry.instances[0].usage.as_ref().unwrap().captured_at,
            usage.captured_at
        );
        assert_eq!(system.original_code_sessions[0].title, session.title);
        assert_eq!(
            refresh_work_counters(),
            RefreshWorkCounters {
                process_inventories: 1,
                transcript_catalogs: 0,
                version_refreshes: 1,
                usage_refreshes: 0,
                topology_builds: 0,
                storage_walks: 0,
            }
        );
        assert!(!RefreshScope::VERSIONS.bundle_names);
        assert!(!RefreshScope::VERSIONS.usage);
        assert!(!RefreshScope::VERSIONS.sessions);
        assert!(!RefreshScope::VERSIONS.storage);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn versions_refresh_never_promotes_a_cold_cache_to_full_scope() {
        assert_eq!(
            effective_refresh_scope(RefreshScope::VERSIONS, false, false),
            RefreshScope::VERSIONS
        );
        assert_eq!(
            effective_refresh_scope(RefreshScope::VERSIONS, false, true),
            RefreshScope::FULL
        );
    }

    #[test]
    fn reads_complete_usage_samples_and_rejects_partial_files() {
        let root = env::temp_dir().join(format!("code-ai-usage-test-{}", Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        let usage_path = root.join("plan-usage-history.json");
        fs::write(
            &usage_path,
            br#"{"samples":[{"t":1720000000000,"u":{"fh":42.5,"sd":77.25}}]}"#,
        )
        .unwrap();
        let usage = read_usage(&root).unwrap();
        assert_eq!(usage.session_percent, Some(42.5));
        assert_eq!(usage.weekly_percent, Some(77.25));
        assert_eq!(usage.captured_at, Some(1_720_000_000_000));

        fs::write(&usage_path, br#"{"samples":[{"t":1720,"u":"#).unwrap();
        assert!(read_usage(&root).is_none());
        fs::remove_file(&usage_path).unwrap();
        assert!(read_usage(&root).is_none());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn refresh_usage_keeps_the_last_good_snapshot_on_partial_data() {
        let root = env::temp_dir().join(format!("code-ai-usage-merge-{}", Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        fs::write(root.join("plan-usage-history.json"), b"{partial").unwrap();
        let last_good = UsageStats {
            session_percent: Some(12.0),
            weekly_percent: Some(34.0),
            captured_at: Some(56),
        };
        let mut registry = Registry {
            version: REGISTRY_VERSION,
            instances: vec![ManagedInstance {
                id: Uuid::new_v4().to_string(),
                name: "Running".to_string(),
                account_label: None,
                avatar_url: None,
                plan: AccountPlan::Unknown,
                source_version: None,
                app_path: root.join("app").to_string_lossy().to_string(),
                profile_path: root.to_string_lossy().to_string(),
                created_at: String::new(),
                last_launched_at: None,
                pid: None,
                process_identity: None,
                launch_generation: 0,
                custom_icon: None,
                provider_provenance: None,
                status: InstanceStatus::Running,
                usage: Some(last_good.clone()),
                code_sessions: Vec::new(),
            }],
        };
        refresh_instance_usage(&mut registry);
        assert_eq!(
            registry.instances[0].usage.as_ref().unwrap().captured_at,
            Some(56)
        );
        fs::remove_dir_all(root).unwrap();
    }
}
