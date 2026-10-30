//! Persistencia local de la app: rutas administradas (`ManagedPaths`), registro de instancias,
//! escritura atómica de archivos propios y el estado compartido (`AppState`): la caché del panel y
//! el cerrojo que serializa las operaciones sobre el registro.

use super::*;

pub(crate) const REGISTRY_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Registry {
    #[serde(default = "registry_version")]
    pub(crate) version: u32,
    #[serde(default)]
    pub(crate) instances: Vec<ManagedInstance>,
}

impl Default for Registry {
    fn default() -> Self {
        Self {
            version: REGISTRY_VERSION,
            instances: Vec::new(),
        }
    }
}

pub(crate) fn registry_version() -> u32 {
    REGISTRY_VERSION
}

/// Lo que la app ya calculó y que depende de su propio estado: el último panel y los bytes del
/// espacio administrado. Vive en `AppState`.
#[derive(Default)]
pub(crate) struct RuntimeCache {
    pub(crate) dashboard: Option<DashboardState>,
    pub(crate) managed_bytes: Option<(PathBuf, Instant, u64)>,
}

/// Hechos sobre un bundle en disco (su versión y si es la aplicación compatible), indexados por
/// su huella (`ApplicationFingerprint`: ruta canónica, tamaños y fechas). Es un memo del proceso
/// y no forma parte de `AppState` porque lo consultan y lo invalidan funciones sin `AppHandle`
/// ni estado a mano (la verificación de copias de `macos_icon.rs`, la topología o la instalación
/// de la original); pasarlo por parámetro obligaría a reescribir esas cadenas. La misma huella da
/// la misma respuesta, así que compartirlo no mezcla estados distintos.
#[derive(Default)]
pub(crate) struct ApplicationCache {
    pub(crate) versions: HashMap<ApplicationFingerprint, Option<String>>,
    pub(crate) identities:
        HashMap<(ApplicationFingerprint, ApplicationFingerprint), Result<(), String>>,
}

pub(crate) fn application_cache() -> &'static Mutex<ApplicationCache> {
    static CACHE: OnceLock<Mutex<ApplicationCache>> = OnceLock::new();
    CACHE.get_or_init(|| Mutex::new(ApplicationCache::default()))
}

/// Serializa las operaciones que leen, modifican y guardan el registro de instancias.
#[derive(Default)]
pub(crate) struct RegistryLock(Mutex<()>);

impl RegistryLock {
    pub(crate) fn run<T>(
        &self,
        operation: impl FnOnce() -> Result<T, String>,
    ) -> Result<T, String> {
        let _guard = self
            .0
            .lock()
            .map_err(|_| "El coordinador local de instancias quedó bloqueado.".to_string())?;
        operation()
    }
}

/// Estado compartido de la app: se registra con `.manage(AppState::default())` en `run()` y los
/// comandos lo leen con `app.state::<AppState>()` (los envoltorios ya mueven el `AppHandle` a
/// `spawn_blocking`). Las funciones de dominio reciben la parte que necesitan, así que cada prueba
/// puede construir el suyo.
#[derive(Default)]
pub(crate) struct AppState {
    pub(crate) registry: RegistryLock,
    pub(crate) runtime: Mutex<RuntimeCache>,
}

impl AppState {
    pub(crate) fn with_registry_operation<T>(
        &self,
        operation: impl FnOnce() -> Result<T, String>,
    ) -> Result<T, String> {
        self.registry.run(operation)
    }

    pub(crate) fn previous_dashboard(&self) -> Option<DashboardState> {
        self.runtime
            .lock()
            .ok()
            .and_then(|cache| cache.dashboard.clone())
    }

    pub(crate) fn remember_dashboard(&self, dashboard: &DashboardState) {
        if let Ok(mut cache) = self.runtime.lock() {
            cache.dashboard = Some(dashboard.clone());
        }
    }

    pub(crate) fn invalidate_managed_bytes(&self) {
        if let Ok(mut cache) = self.runtime.lock() {
            cache.managed_bytes = None;
        }
    }
}

pub(crate) fn app_state(app: &AppHandle) -> tauri::State<'_, AppState> {
    app.state::<AppState>()
}

pub(crate) struct ManagedPaths {
    pub(crate) app_data: PathBuf,
    pub(crate) instances: PathBuf,
    pub(crate) registry: PathBuf,
    pub(crate) session_backups: PathBuf,
    pub(crate) session_links: PathBuf,
    pub(crate) source_update_cache: PathBuf,
    pub(crate) artifact_exports: PathBuf,
    pub(crate) original_update: PathBuf,
}

impl ManagedPaths {
    pub(crate) fn resolve(app: &AppHandle) -> Result<Self, String> {
        let app_data = app
            .path()
            .app_data_dir()
            .map_err(|error| format!("No se pudo resolver el directorio de datos: {error}"))?;
        let instances = app_data.join("managed-instances");
        fs::create_dir_all(&instances)
            .map_err(|error| format!("No se pudo crear el directorio administrado: {error}"))?;
        Ok(Self {
            registry: app_data.join("instances.json"),
            session_backups: app_data.join("session-transfer-backups"),
            session_links: app_data.join("session-links.json"),
            source_update_cache: app_data.join("source-update-cache.json"),
            artifact_exports: app_data.join("artifact-exports"),
            original_update: app_data.join("original-update"),
            app_data,
            instances,
        })
    }

    pub(crate) fn root_for(&self, id: &str) -> Result<PathBuf, String> {
        Uuid::parse_str(id)
            .map_err(|_| "El identificador de instancia no es válido.".to_string())?;
        Ok(self.instances.join(id))
    }
}

pub(crate) fn load_registry(paths: &ManagedPaths) -> Result<Registry, String> {
    if !paths.registry.exists() {
        return Ok(Registry::default());
    }
    let contents = fs::read_to_string(&paths.registry)
        .map_err(|error| format!("No se pudo leer el registro de instancias: {error}"))?;
    serde_json::from_str(&contents)
        .map_err(|error| format!("El registro de instancias está dañado: {error}"))
}

pub(crate) fn save_registry(paths: &ManagedPaths, registry: &Registry) -> Result<(), String> {
    fs::create_dir_all(&paths.app_data)
        .map_err(|error| format!("No se pudo preparar el directorio de datos: {error}"))?;
    let mut persisted = registry.clone();
    for instance in &mut persisted.instances {
        instance.code_sessions.clear();
    }
    let contents = serde_json::to_vec_pretty(&persisted)
        .map_err(|error| format!("No se pudo serializar el registro: {error}"))?;
    write_file_atomic(&paths.registry, &contents, ".instances")
        .map_err(|error| format!("No se pudo guardar el registro de instancias: {error}"))
}

/// Escritura atómica de un archivo propio de la app: temporal `<prefijo>-<uuid>.tmp` en la misma
/// carpeta, `sync_all` y `rename` sobre el destino. Si algo falla, el temporal se borra y el
/// destino anterior queda intacto. La carpeta del destino debe existir.
///
/// `fs::rename` reemplaza un destino existente en las tres plataformas (en Windows usa
/// `MoveFileExW` con `MOVEFILE_REPLACE_EXISTING`). En Windows puede fallar con acceso denegado si
/// otro proceso, p. ej. un antivirus, tiene el destino abierto sin compartir borrado: en ese caso
/// se devuelve el error y el archivo anterior sigue intacto.
pub(crate) fn write_file_atomic(
    destination: &Path,
    contents: &[u8],
    temporary_prefix: &str,
) -> std::io::Result<()> {
    use std::io::Write;
    let parent = destination.parent().ok_or_else(|| {
        std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            "el destino no tiene carpeta",
        )
    })?;
    let temporary = parent.join(format!("{temporary_prefix}-{}.tmp", Uuid::new_v4()));
    let result = (|| -> std::io::Result<()> {
        let mut file = File::create(&temporary)?;
        file.write_all(contents)?;
        file.sync_all()?;
        drop(file);
        fs::rename(&temporary, destination)
    })();
    if result.is_err() {
        let _ = fs::remove_file(&temporary);
    }
    result
}

pub(crate) fn invalidate_application_cache() {
    if let Ok(mut cache) = application_cache().lock() {
        cache.versions.clear();
        cache.identities.clear();
    }
}

pub(crate) fn path_is_within(path: &Path, root: &Path) -> bool {
    let Ok(path) = fs::canonicalize(path) else {
        return false;
    };
    let Ok(root) = fs::canonicalize(root) else {
        return false;
    };
    path.starts_with(root)
}

pub(crate) fn atomic_replace_file(destination: &Path, contents: &[u8]) -> Result<(), String> {
    let parent = destination
        .parent()
        .ok_or_else(|| "El destino de la sesión no es válido.".to_string())?;
    fs::create_dir_all(parent)
        .map_err(|error| format!("No se pudo crear el índice de sesiones destino: {error}"))?;
    // Temporal en la misma carpeta, `sync_all` y `rename` que reemplaza en un solo paso: si algo
    // falla o la app cae, el destino anterior sigue intacto (nunca queda sin archivo).
    write_file_atomic(destination, contents, ".session-transfer").map_err(|error| {
        format!("No se pudo reemplazar el archivo; se conservó el anterior: {error}")
    })
}

pub(crate) fn restore_optional_file(path: &Path, contents: Option<&[u8]>) {
    if let Some(contents) = contents {
        let _ = atomic_replace_file(path, contents);
    } else {
        let _ = fs::remove_file(path);
    }
}

pub(crate) fn path_size(path: &Path) -> u64 {
    let Ok(metadata) = fs::symlink_metadata(path) else {
        return 0;
    };
    if metadata.is_file() || metadata.file_type().is_symlink() {
        return metadata.len();
    }
    fs::read_dir(path)
        .map(|entries| {
            entries
                .flatten()
                .map(|entry| path_size(&entry.path()))
                .sum()
        })
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::*;

    const LOCKED_COORDINATOR: &str = "El coordinador local de instancias quedó bloqueado.";

    #[test]
    fn two_app_states_keep_their_registry_operations_apart() {
        let first = AppState::default();
        let second = AppState::default();
        let nested = first.with_registry_operation(|| {
            assert!(first.registry.0.try_lock().is_err());
            // Con un mutex estático compartido, esta llamada se bloquearía para siempre.
            second.with_registry_operation(|| Ok(second.registry.0.try_lock().is_err()))
        });
        assert_eq!(nested, Ok(true));
        assert!(first.registry.0.try_lock().is_ok());
        assert!(second.registry.0.try_lock().is_ok());
    }

    #[test]
    fn a_poisoned_registry_lock_keeps_its_message_and_spares_other_states() {
        let poisoned = AppState::default();
        let healthy = AppState::default();
        let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            let _guard = poisoned.registry.0.lock().unwrap();
            panic!("poison the registry lock");
        }));
        assert_eq!(
            poisoned.with_registry_operation(|| Ok(())),
            Err(LOCKED_COORDINATOR.to_string())
        );
        assert_eq!(healthy.with_registry_operation(|| Ok(7)), Ok(7));
    }

    #[test]
    fn atomically_creates_and_replaces_session_index() {
        let root = env::temp_dir().join(format!("code-ai-profiles-test-{}", Uuid::new_v4()));
        let destination = root.join("account/org/local_session.json");

        atomic_replace_file(&destination, br#"{"version":1}"#).expect("index should be created");
        assert_eq!(fs::read(&destination).unwrap(), br#"{"version":1}"#);

        atomic_replace_file(&destination, br#"{"version":2}"#).expect("index should be replaced");
        assert_eq!(fs::read(&destination).unwrap(), br#"{"version":2}"#);

        fs::remove_dir_all(root).expect("temporary test directory should be removable");
    }

    #[test]
    fn atomic_replace_file_leaves_no_previous_or_temporary_files() {
        let root = env::temp_dir().join(format!("code-ai-replace-{}", Uuid::new_v4()));
        let destination = root.join("account/org/local_session.json");
        let folder = destination.parent().unwrap().to_path_buf();

        atomic_replace_file(&destination, br#"{"version":1}"#).unwrap();
        atomic_replace_file(&destination, br#"{"version":2}"#).unwrap();

        assert_eq!(fs::read(&destination).unwrap(), br#"{"version":2}"#);
        let names: Vec<String> = fs::read_dir(&folder)
            .unwrap()
            .filter_map(|entry| entry.ok())
            .map(|entry| entry.file_name().to_string_lossy().to_string())
            .collect();
        assert_eq!(names, vec!["local_session.json".to_string()]);

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn atomic_replace_file_failure_keeps_previous_destination() {
        let root = env::temp_dir().join(format!("code-ai-replace-{}", Uuid::new_v4()));
        // Un directorio no vacío como destino: el rename no puede completarse en ninguna plataforma.
        let destination = root.join("index.json");
        fs::create_dir_all(&destination).unwrap();
        fs::write(destination.join("keep.txt"), "x").unwrap();

        let error = atomic_replace_file(&destination, b"{}").unwrap_err();
        assert!(error.starts_with("No se pudo reemplazar el archivo"));
        assert!(destination.join("keep.txt").exists());
        let leftovers: Vec<_> = fs::read_dir(&root)
            .unwrap()
            .filter_map(|entry| entry.ok())
            .map(|entry| entry.file_name())
            .collect();
        assert_eq!(leftovers.len(), 1);

        fs::remove_dir_all(root).unwrap();
    }

    fn temporaries_in(dir: &Path) -> Vec<String> {
        fs::read_dir(dir)
            .unwrap()
            .filter_map(|entry| entry.ok())
            .map(|entry| entry.file_name().to_string_lossy().to_string())
            .filter(|name| name.ends_with(".tmp"))
            .collect()
    }

    #[test]
    fn write_file_atomic_replaces_whole_file_without_leaving_temporaries() {
        let root = env::temp_dir().join(format!("code-ai-atomic-{}", Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        let destination = root.join("data.json");
        fs::write(
            &destination,
            "contenido anterior mucho más largo que el nuevo",
        )
        .unwrap();

        write_file_atomic(&destination, b"{}", ".data").expect("should replace");
        assert_eq!(fs::read(&destination).unwrap(), b"{}");
        assert!(temporaries_in(&root).is_empty());

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn write_file_atomic_failure_keeps_destination_and_removes_temporary() {
        let root = env::temp_dir().join(format!("code-ai-atomic-{}", Uuid::new_v4()));
        // Un directorio no vacío como destino: el rename no puede completarse en ninguna plataforma.
        let destination = root.join("data.json");
        fs::create_dir_all(&destination).unwrap();
        fs::write(destination.join("keep.txt"), "x").unwrap();

        let result = write_file_atomic(&destination, b"{}", ".data");
        assert!(result.is_err());
        assert!(destination.join("keep.txt").exists());
        assert!(temporaries_in(&root).is_empty());

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn save_registry_replaces_existing_registry_without_temporaries() {
        let root = env::temp_dir().join(format!("code-ai-registry-{}", Uuid::new_v4()));
        let paths = test_managed_paths(&root);
        let mut registry = Registry::default();
        registry.instances.push(test_instance(&root));
        registry.instances.push(test_instance(&root));
        save_registry(&paths, &registry).unwrap();
        assert_eq!(load_registry(&paths).unwrap().instances.len(), 2);

        registry.instances.truncate(1);
        save_registry(&paths, &registry).unwrap();
        assert_eq!(load_registry(&paths).unwrap().instances.len(), 1);
        assert!(temporaries_in(&root).is_empty());

        fs::remove_dir_all(root).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn save_registry_failure_keeps_previous_registry_readable() {
        use std::os::unix::fs::PermissionsExt;
        let root = env::temp_dir().join(format!("code-ai-registry-{}", Uuid::new_v4()));
        let paths = test_managed_paths(&root);
        let mut registry = Registry::default();
        registry.instances.push(test_instance(&root));
        save_registry(&paths, &registry).unwrap();

        // Carpeta de solo lectura: el temporal no se puede crear.
        fs::set_permissions(&root, fs::Permissions::from_mode(0o555)).unwrap();
        let can_still_write = File::create(root.join(".probe")).is_ok();
        registry.instances.clear();
        let result = save_registry(&paths, &registry);
        fs::set_permissions(&root, fs::Permissions::from_mode(0o755)).unwrap();
        let _ = fs::remove_file(root.join(".probe"));

        if !can_still_write {
            let message = result.expect_err("saving should fail");
            assert!(message.starts_with("No se pudo guardar el registro de instancias"));
            assert_eq!(load_registry(&paths).unwrap().instances.len(), 1);
            assert!(temporaries_in(&root).is_empty());
        }

        fs::remove_dir_all(root).unwrap();
    }
}
