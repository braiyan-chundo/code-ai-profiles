//! Procesos de las instancias: el inventario del sistema, la identidad verificada de cada proceso
//! administrado (`ManagedProcessIdentity`), las señales y las esperas. Un PID solo nunca basta: se
//! comprueban la huella, la hora de inicio y el argumento del perfil antes de señalizar.

use super::*;

pub(crate) fn original_instance_status_with_inventory(
    inventory: &ProcessInventory,
) -> InstanceStatus {
    let Some(source) = detect_provider_source() else {
        return InstanceStatus::Missing;
    };
    if detect_original_profile().is_none() {
        return InstanceStatus::Missing;
    }
    if inventory.application_is_running(&source) {
        InstanceStatus::Running
    } else {
        InstanceStatus::Stopped
    }
}

pub(crate) fn process_fingerprint(app_path: &Path, profile_argument: &str) -> String {
    let executable = provider_executable(app_path);
    let canonical = fs::canonicalize(&executable).unwrap_or(executable);
    let mut hasher = DefaultHasher::new();
    canonical.hash(&mut hasher);
    profile_argument.hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}

pub(crate) struct ProcessInventoryEntry {
    pub(crate) pid: u32,
    pub(crate) start_time: u64,
    pub(crate) executable: Option<PathBuf>,
    pub(crate) command: Vec<std::ffi::OsString>,
}

pub(crate) struct ProcessInventory {
    pub(crate) entries: Vec<ProcessInventoryEntry>,
}

impl ProcessInventory {
    pub(crate) fn capture() -> Self {
        #[cfg(test)]
        record_refresh_work(|counters| counters.process_inventories += 1);
        let system = System::new_with_specifics(
            RefreshKind::nothing().with_processes(
                ProcessRefreshKind::nothing()
                    .with_cmd(UpdateKind::OnlyIfNotSet)
                    .with_exe(UpdateKind::OnlyIfNotSet)
                    .without_tasks(),
            ),
        );
        let entries = system
            .processes()
            .iter()
            .map(|(pid, process)| ProcessInventoryEntry {
                pid: pid.as_u32(),
                start_time: process.start_time(),
                executable: process.exe().map(|executable| {
                    fs::canonicalize(executable).unwrap_or_else(|_| executable.to_path_buf())
                }),
                command: process.cmd().to_vec(),
            })
            .collect();
        Self { entries }
    }

    /// Algún proceso cuyo ejecutable vive dentro del bundle (la app, sus *Helpers*, `ShipIt`…).
    pub(crate) fn any_executable_within(&self, bundle: &Path) -> bool {
        let root = fs::canonicalize(bundle).unwrap_or_else(|_| bundle.to_path_buf());
        self.entries.iter().any(|process| {
            process
                .executable
                .as_ref()
                .is_some_and(|executable| executable.starts_with(&root))
        })
    }

    fn application_is_running(&self, application: &Path) -> bool {
        let executable = provider_executable(application);
        let executable = fs::canonicalize(&executable).unwrap_or(executable);
        self.entries
            .iter()
            .any(|process| process.executable.as_ref() == Some(&executable))
    }
}

fn process_snapshot(instance: &ManagedInstance, inventory: &ProcessInventory) -> Vec<(u32, u64)> {
    let app_path = PathBuf::from(&instance.app_path);
    let app_root = fs::canonicalize(&app_path).unwrap_or_else(|_| app_path.clone());
    let executable = provider_executable(&app_path);
    let executable = fs::canonicalize(&executable).unwrap_or(executable);
    let profile_argument = format!("--user-data-dir={}", instance.profile_path);
    inventory
        .entries
        .iter()
        .filter_map(|process| {
            let profile_matches = process
                .command
                .iter()
                .any(|argument| argument.to_string_lossy() == profile_argument);
            if !profile_matches {
                return None;
            }
            let process_executable = process.executable.as_ref()?;
            let executable_matches =
                process_executable == &executable || process_executable.starts_with(&app_root);
            (executable_matches && profile_matches).then_some((process.pid, process.start_time))
        })
        .collect()
}

fn identity_matches_instance(
    instance: &ManagedInstance,
    identity: &ManagedProcessIdentity,
    snapshots: &[(u32, u64)],
) -> bool {
    let expected_argument = format!("--user-data-dir={}", instance.profile_path);
    identity.profile_argument == expected_argument
        && identity.fingerprint
            == process_fingerprint(Path::new(&instance.app_path), &expected_argument)
        && snapshots.iter().any(|(pid, start_time)| {
            *pid == identity.root_pid
                && identity
                    .start_time
                    .map(|expected| expected == *start_time)
                    .unwrap_or(true)
        })
}

fn refresh_process_identity(instance: &mut ManagedInstance, inventory: &ProcessInventory) -> bool {
    let snapshots = process_snapshot(instance, inventory);
    if snapshots.is_empty() {
        instance.pid = None;
        instance.process_identity = None;
        return false;
    }
    if let Some(identity) = instance.process_identity.as_ref() {
        if identity_matches_instance(instance, identity, &snapshots) {
            instance.pid = Some(identity.root_pid);
            return true;
        }
    }
    let (root_pid, start_time) = snapshots[0];
    let profile_argument = format!("--user-data-dir={}", instance.profile_path);
    instance.pid = Some(root_pid);
    instance.process_identity = Some(ManagedProcessIdentity {
        root_pid,
        process_group_id: None,
        start_time: Some(start_time),
        fingerprint: process_fingerprint(Path::new(&instance.app_path), &profile_argument),
        profile_argument,
    });
    true
}

pub(crate) fn refresh_instance_statuses(registry: &mut Registry, inventory: &ProcessInventory) {
    for instance in &mut registry.instances {
        let app_exists = Path::new(&instance.app_path).exists();
        instance.status = if !app_exists {
            instance.pid = None;
            instance.process_identity = None;
            InstanceStatus::Missing
        } else if refresh_process_identity(instance, inventory) {
            InstanceStatus::Running
        } else {
            instance.pid = None;
            instance.process_identity = None;
            InstanceStatus::Stopped
        };
    }
}

/// Hora de inicio de un solo proceso recién lanzado. Refresca solo ese PID (sin enumerar todos
/// los procesos del sistema) y sin CPU, memoria, línea de comandos ni ejecutable.
pub(crate) fn process_start_time(pid: u32) -> Option<u64> {
    let pid = Pid::from_u32(pid);
    let mut system = System::new();
    system.refresh_processes_specifics(
        ProcessesToUpdate::Some(&[pid]),
        true,
        ProcessRefreshKind::nothing(),
    );
    system.process(pid).map(|process| process.start_time())
}

pub(crate) fn spawn_process_reaper(
    app: AppHandle,
    instance_id: String,
    generation: u64,
    mut child: Child,
) {
    thread::spawn(move || {
        let _ = child.wait();
        let _ = app.emit(
            "instance-process-exited",
            ProcessExitEvent {
                instance_id,
                generation,
            },
        );
    });
}

pub(crate) fn wait_until_instance_stops(instance: &ManagedInstance, timeout: Duration) -> bool {
    let deadline = Instant::now() + timeout;
    loop {
        // Recaptura a propósito: esperar a que el proceso termine exige el estado de cada instante.
        let inventory = ProcessInventory::capture();
        if process_snapshot(instance, &inventory).is_empty() {
            return true;
        }
        if Instant::now() >= deadline {
            return false;
        }
        thread::sleep(Duration::from_millis(100));
    }
}

pub(crate) fn signal_instance_processes(
    instance: &ManagedInstance,
    identity: &ManagedProcessIdentity,
    force: bool,
    inventory: &ProcessInventory,
) -> Result<(), String> {
    let processes = process_snapshot(instance, inventory);
    if processes.is_empty() {
        return Ok(());
    }
    let expected_argument = format!("--user-data-dir={}", instance.profile_path);
    if identity.profile_argument != expected_argument
        || identity.fingerprint
            != process_fingerprint(Path::new(&instance.app_path), &expected_argument)
    {
        return Err("La identidad del proceso cambió; no se envió ninguna señal.".to_string());
    }
    if let Some((_, root_start_time)) = processes.iter().find(|(pid, _)| *pid == identity.root_pid)
    {
        if identity
            .start_time
            .is_some_and(|expected| expected != *root_start_time)
        {
            return Err("El PID raíz fue reutilizado; no se envió ninguna señal.".to_string());
        }
    }

    signal_verified_processes(identity, processes, force)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::*;

    #[test]
    fn process_fingerprint_binds_application_and_exact_profile_argument() {
        let app = Path::new("/managed/Test.app");
        let first = process_fingerprint(app, "--user-data-dir=/profiles/a");
        assert_eq!(
            first,
            process_fingerprint(app, "--user-data-dir=/profiles/a")
        );
        assert_ne!(
            first,
            process_fingerprint(app, "--user-data-dir=/profiles/b")
        );
    }

    #[test]
    fn process_start_time_matches_full_inventory_without_enumerating_processes() {
        let own_pid = std::process::id();
        let expected = ProcessInventory::capture()
            .entries
            .iter()
            .find(|process| process.pid == own_pid)
            .map(|process| process.start_time);
        assert!(expected.is_some());

        reset_refresh_work_counters();
        assert_eq!(process_start_time(own_pid), expected);
        assert_eq!(refresh_work_counters().process_inventories, 0);
        assert_eq!(process_start_time(u32::MAX - 1), None);
    }

    #[test]
    fn signaling_reuses_the_given_inventory_instead_of_capturing_again() {
        let root = env::temp_dir().join(format!("code-ai-signal-{}", Uuid::new_v4()));
        let instance = test_instance(&root);
        let profile_argument = format!("--user-data-dir={}", instance.profile_path);
        let identity = ManagedProcessIdentity {
            root_pid: u32::MAX - 1,
            process_group_id: None,
            start_time: None,
            fingerprint: process_fingerprint(Path::new(&instance.app_path), &profile_argument),
            profile_argument,
        };
        let empty = ProcessInventory {
            entries: Vec::new(),
        };

        reset_refresh_work_counters();
        signal_instance_processes(&instance, &identity, false, &empty)
            .expect("without matching processes there is nothing to signal");
        assert_eq!(refresh_work_counters().process_inventories, 0);
    }

    #[test]
    fn detects_any_process_running_from_inside_a_bundle() {
        let root = env::temp_dir().join(format!("code-ai-inventory-{}", Uuid::new_v4()));
        let bundle = root.join("Claude.app");
        fs::create_dir_all(bundle.join("Contents/Frameworks")).unwrap();
        let canonical = fs::canonicalize(&bundle).unwrap();
        let entry = |executable: PathBuf| ProcessInventoryEntry {
            pid: 1,
            start_time: 1,
            executable: Some(executable),
            command: Vec::new(),
        };
        let helper = ProcessInventory {
            entries: vec![entry(
                canonical.join("Contents/Frameworks/Helper.app/Contents/MacOS/Helper"),
            )],
        };
        assert!(helper.any_executable_within(&bundle));
        let sibling = ProcessInventory {
            entries: vec![
                entry(root.join("Claude.app2/Contents/MacOS/Claude")),
                entry(root.join("Other.app/Contents/MacOS/Claude")),
                ProcessInventoryEntry {
                    pid: 2,
                    start_time: 2,
                    executable: None,
                    command: Vec::new(),
                },
            ],
        };
        assert!(!sibling.any_executable_within(&bundle));
        fs::remove_dir_all(root).unwrap();
    }
}
