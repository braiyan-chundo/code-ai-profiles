//! Descarga, verificación e instalación de la aplicación original en macOS (HU-0017, ADR-0002).
//!
//! Fuera de macOS el comando devuelve «no disponible» sin tocar la red; el resto del módulo compila en
//! todas las plataformas para que sus pruebas corran también en CI.
#![cfg_attr(not(target_os = "macos"), allow(dead_code))]

use super::*;
use sha2::{Digest, Sha256};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct InstallOriginalUpdateRequest {
    pub(crate) expected_version: String,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub(crate) enum OriginalInstallPhase {
    Preparing,
    Downloading,
    Verifying,
    Installing,
    Synchronizing,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct OriginalInstallProgress {
    pub(crate) phase: OriginalInstallPhase,
    pub(crate) target_version: Option<String>,
    pub(crate) received_bytes: u64,
    pub(crate) total_bytes: u64,
    pub(crate) cancellable: bool,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub(crate) enum OriginalInstallStatus {
    Installed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct OriginalInstallResult {
    pub(crate) status: OriginalInstallStatus,
    pub(crate) previous_version: Option<String>,
    pub(crate) installed_version: Option<String>,
    pub(crate) synchronization: Vec<SynchronizationItemResult>,
    pub(crate) pending_instance_ids: Vec<String>,
    pub(crate) dashboard: DashboardState,
}

/// Lo que devuelve el flujo antes de recalcular el panel.
pub(crate) struct OriginalInstallOutcome {
    pub(crate) status: OriginalInstallStatus,
    pub(crate) previous_version: Option<String>,
    pub(crate) installed_version: Option<String>,
    pub(crate) synchronization: Vec<SynchronizationItemResult>,
    pub(crate) pending_instance_ids: Vec<String>,
}

impl OriginalInstallOutcome {
    pub(crate) fn into_result(self, dashboard: DashboardState) -> OriginalInstallResult {
        OriginalInstallResult {
            status: self.status,
            previous_version: self.previous_version,
            installed_version: self.installed_version,
            synchronization: self.synchronization,
            pending_instance_ids: self.pending_instance_ids,
            dashboard,
        }
    }
}

// ---------------------------------------------------------------------------------------------------------
// Feed, red y paquete (A-8). Funciones puras: no tocan la red ni la instalación.
// ---------------------------------------------------------------------------------------------------------

const MAX_PACKAGE_BYTES: u64 = 2 * 1024 * 1024 * 1024;
const MAX_REDIRECTS: usize = 3;
const MAX_ZIP_ENTRIES: u64 = 100_000;
const MAX_UNCOMPRESSED_BYTES: u64 = 4 * 1024 * 1024 * 1024;
const DOWNLOAD_CHUNK_BYTES: usize = 64 * 1024;
const PROGRESS_INTERVAL: Duration = Duration::from_millis(200);
const PROGRESS_MIN_BYTES: u64 = 1024 * 1024;
const PROGRESS_SLOW_INTERVAL: Duration = Duration::from_secs(1);

/// El paquete oficial que anuncia el feed para su `currentRelease`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct FeedPackage {
    pub(crate) version: String,
    pub(crate) url: reqwest::Url,
    pub(crate) sha256: String,
    pub(crate) size: u64,
}

pub(crate) fn parse_feed_package(
    document: &Value,
    allowed_hosts: &[String],
) -> Result<FeedPackage, String> {
    let current = document
        .get("currentRelease")
        .and_then(Value::as_str)
        .filter(|version| valid_release_version(version))
        .ok_or_else(|| "El feed oficial no incluyó una versión válida.".to_string())?;
    let missing = || format!("El feed oficial no incluye el paquete de la versión {current}.");
    let update = document
        .get("releases")
        .and_then(Value::as_array)
        .and_then(|releases| {
            releases.iter().find_map(|release| {
                let update = release.get("updateTo")?;
                (update.get("version").and_then(Value::as_str) == Some(current)).then_some(update)
            })
        })
        .ok_or_else(missing)?;
    let url = update
        .get("url")
        .and_then(Value::as_str)
        .ok_or_else(missing)?;
    let sha256 = update
        .get("sha256")
        .and_then(Value::as_str)
        .filter(|value| value.len() == 64 && value.chars().all(|c| c.is_ascii_hexdigit()))
        .ok_or_else(|| "El feed oficial no trae un sha256 válido para el paquete.".to_string())?
        .to_ascii_lowercase();
    let size = update
        .get("size")
        .and_then(Value::as_u64)
        .filter(|size| (1..=MAX_PACKAGE_BYTES).contains(size))
        .ok_or_else(|| "El feed oficial no trae un tamaño válido para el paquete.".to_string())?;
    Ok(FeedPackage {
        version: current.to_string(),
        url: validate_download_url(url, allowed_hosts)?,
        sha256,
        size,
    })
}

fn check_https_host(url: &reqwest::Url, allowed_hosts: &[String]) -> Result<(), String> {
    if url.scheme() != "https" {
        return Err("La descarga oficial debe usar https.".to_string());
    }
    if !url.username().is_empty() || url.password().is_some() {
        return Err("La dirección de descarga no puede llevar usuario ni contraseña.".to_string());
    }
    if url.port().is_some_and(|port| port != 443) {
        return Err("La dirección de descarga usa un puerto no permitido.".to_string());
    }
    let host = url
        .host_str()
        .map(str::to_ascii_lowercase)
        .unwrap_or_default();
    if host.is_empty() || !allowed_hosts.iter().any(|allowed| *allowed == host) {
        return Err(format!(
            "La descarga apunta a un host no permitido ({}).",
            if host.is_empty() { "sin host" } else { &host }
        ));
    }
    Ok(())
}

/// La URL del paquete: `https`, sin credenciales, puerto 443, host exacto de la lista y ruta `.zip`.
pub(crate) fn validate_download_url(
    raw: &str,
    allowed_hosts: &[String],
) -> Result<reqwest::Url, String> {
    let url = reqwest::Url::parse(raw)
        .map_err(|_| "El feed oficial trae una dirección de descarga inválida.".to_string())?;
    check_https_host(&url, allowed_hosts)?;
    if !url.path().to_ascii_lowercase().ends_with(".zip") {
        return Err("El paquete del feed oficial no es un .zip.".to_string());
    }
    Ok(url)
}

/// Un salto de redirección: como mucho `MAX_REDIRECTS`, y cada uno `https` a un host permitido.
pub(crate) fn redirect_allowed(
    next: &reqwest::Url,
    redirects_so_far: usize,
    allowed_hosts: &[String],
) -> Result<(), String> {
    if redirects_so_far > MAX_REDIRECTS {
        return Err("La descarga oficial redirigió demasiadas veces.".to_string());
    }
    check_https_host(next, allowed_hosts)
}

// ---------------------------------------------------------------------------------------------------------
// Descarga a disco con hash incremental.
// ---------------------------------------------------------------------------------------------------------

#[derive(Debug, PartialEq, Eq)]
pub(crate) enum StreamError {
    Cancelled,
    Failed(String),
}

/// Copia `reader` a `destination` (que no debe existir) calculando el `sha256`. Lee como mucho `size + 1`
/// bytes y exige exactamente `size`. Comprueba la cancelación y el plazo en cada bloque. Si no termina bien,
/// borra el parcial.
pub(crate) fn stream_to_file(
    reader: impl Read,
    destination: &Path,
    size: u64,
    cancel: &AtomicBool,
    deadline: Instant,
    progress: &mut dyn FnMut(u64),
) -> Result<String, StreamError> {
    let result = stream_to_file_inner(reader, destination, size, cancel, deadline, progress);
    if result.is_err() {
        let _ = fs::remove_file(destination);
    }
    result
}

fn stream_to_file_inner(
    reader: impl Read,
    destination: &Path,
    size: u64,
    cancel: &AtomicBool,
    deadline: Instant,
    progress: &mut dyn FnMut(u64),
) -> Result<String, StreamError> {
    use std::io::Write;
    let mut file = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(destination)
        .map_err(|error| {
            StreamError::Failed(format!("No se pudo crear el paquete temporal: {error}"))
        })?;
    let mut reader = reader.take(size.saturating_add(1));
    let mut hasher = Sha256::new();
    let mut buffer = vec![0_u8; DOWNLOAD_CHUNK_BYTES];
    let mut received = 0_u64;
    loop {
        if cancel.load(Ordering::SeqCst) {
            return Err(StreamError::Cancelled);
        }
        if Instant::now() >= deadline {
            return Err(StreamError::Failed(
                "La descarga superó el tiempo máximo permitido.".to_string(),
            ));
        }
        let read = match reader.read(&mut buffer) {
            Ok(0) => break,
            Ok(read) => read,
            Err(error) if error.kind() == std::io::ErrorKind::Interrupted => continue,
            Err(error) => {
                return Err(StreamError::Failed(format!(
                    "La descarga se interrumpió: {error}"
                )))
            }
        };
        received += read as u64;
        if received > size {
            return Err(StreamError::Failed(
                "El paquete descargado es más grande de lo que anuncia el feed oficial."
                    .to_string(),
            ));
        }
        hasher.update(&buffer[..read]);
        file.write_all(&buffer[..read]).map_err(|error| {
            StreamError::Failed(format!("No se pudo guardar el paquete: {error}"))
        })?;
        progress(received);
    }
    if received != size {
        return Err(StreamError::Failed(
            "La descarga terminó antes de completar el paquete.".to_string(),
        ));
    }
    file.sync_all()
        .map_err(|error| StreamError::Failed(format!("No se pudo guardar el paquete: {error}")))?;
    Ok(hex_digest(&hasher.finalize()))
}

fn hex_digest(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

pub(crate) fn digest_matches(actual: &str, expected: &str) -> bool {
    actual.len() == 64 && actual.eq_ignore_ascii_case(expected)
}

/// Limita los avisos de progreso: nunca más de uno cada 200 ms; entre medias, espera a 1 MiB nuevo o a que
/// pase 1 s (conexiones lentas). El primero y el final siempre salen.
pub(crate) struct ProgressThrottle {
    last_at: Option<Instant>,
    last_bytes: u64,
}

impl ProgressThrottle {
    pub(crate) fn new() -> Self {
        Self {
            last_at: None,
            last_bytes: 0,
        }
    }

    pub(crate) fn should_emit(&mut self, now: Instant, received: u64, total: u64) -> bool {
        let is_final = received >= total;
        let due = match self.last_at {
            None => true,
            Some(last_at) => {
                let elapsed = now.duration_since(last_at);
                elapsed >= PROGRESS_INTERVAL
                    && (received.saturating_sub(self.last_bytes) >= PROGRESS_MIN_BYTES
                        || elapsed >= PROGRESS_SLOW_INTERVAL)
            }
        };
        if (due || is_final) && (self.last_at.is_none() || received > self.last_bytes) {
            self.last_at = Some(now);
            self.last_bytes = received;
            return true;
        }
        false
    }
}

// ---------------------------------------------------------------------------------------------------------
// Contenido del zip y del bundle.
// ---------------------------------------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct ZipListing {
    pub(crate) names: Vec<String>,
    pub(crate) entries: u64,
    pub(crate) uncompressed_bytes: u64,
}

/// Lee la línea de totales de `zipinfo -t`: «N files, M bytes uncompressed, …».
pub(crate) fn parse_zipinfo_totals(output: &str) -> Option<(u64, u64)> {
    let line = output
        .lines()
        .map(str::trim)
        .find(|line| !line.is_empty())?;
    let mut parts = line.split(',');
    let mut files = parts.next()?.split_whitespace();
    let file_count = files.next()?.parse().ok()?;
    if !matches!(files.next(), Some("files" | "file")) {
        return None;
    }
    let mut bytes = parts.next()?.split_whitespace();
    let byte_count = bytes.next()?.parse().ok()?;
    if bytes.next() != Some("bytes") || bytes.next() != Some("uncompressed") {
        return None;
    }
    Some((file_count, byte_count))
}

/// Una sola raíz `<X>.app/`, sin rutas absolutas ni `..`, dentro de los límites de entradas y de tamaño
/// descomprimido. Devuelve el nombre de la raíz.
pub(crate) fn validate_zip_listing(
    listing: &ZipListing,
    package_size: u64,
) -> Result<String, String> {
    let entries = listing.names.len() as u64;
    if entries == 0 || listing.entries == 0 {
        return Err("El paquete descargado está vacío.".to_string());
    }
    if entries > MAX_ZIP_ENTRIES || listing.entries > MAX_ZIP_ENTRIES {
        return Err("El paquete descargado tiene demasiados archivos.".to_string());
    }
    if listing.entries != entries {
        return Err("El índice del paquete descargado no es coherente.".to_string());
    }
    let limit = package_size.saturating_mul(8).min(MAX_UNCOMPRESSED_BYTES);
    if listing.uncompressed_bytes > limit {
        return Err("El paquete descargado ocupa demasiado al descomprimirlo.".to_string());
    }
    let mut root: Option<&str> = None;
    for name in &listing.names {
        if name.is_empty()
            || name.starts_with('/')
            || name.contains('\\')
            || name.contains('\0')
            || name.chars().any(char::is_control)
        {
            return Err("El paquete descargado contiene rutas no permitidas.".to_string());
        }
        let first = name.split('/').next().unwrap_or_default();
        if name
            .split('/')
            .any(|component| component == ".." || component == ".")
        {
            return Err("El paquete descargado contiene rutas no permitidas.".to_string());
        }
        if !name.contains('/') || first.is_empty() {
            return Err(
                "El paquete descargado no tiene una única aplicación en su raíz.".to_string(),
            );
        }
        match root {
            None => root = Some(first),
            Some(existing) if existing == first => {}
            Some(_) => {
                return Err(
                    "El paquete descargado no tiene una única aplicación en su raíz.".to_string(),
                )
            }
        }
    }
    let root = root.unwrap_or_default();
    if !root.ends_with(".app") || root.len() <= ".app".len() || root.starts_with('.') {
        return Err("El paquete descargado no contiene una aplicación.".to_string());
    }
    Ok(root.to_string())
}

/// Todo symlink del bundle es relativo y apunta dentro de él (por la ruta escrita y por la real). No se
/// admiten otros tipos especiales (FIFO, dispositivos…).
pub(crate) fn check_symlinks_within(bundle: &Path) -> Result<(), String> {
    let metadata = fs::symlink_metadata(bundle)
        .map_err(|error| format!("No se pudo leer la aplicación descomprimida: {error}"))?;
    if !metadata.is_dir() {
        return Err("La aplicación descomprimida no es una carpeta.".to_string());
    }
    let root = fs::canonicalize(bundle)
        .map_err(|error| format!("No se pudo leer la aplicación descomprimida: {error}"))?;
    let mut pending = vec![(root.clone(), Vec::<String>::new())];
    while let Some((directory, relative)) = pending.pop() {
        let entries = fs::read_dir(&directory)
            .map_err(|error| format!("No se pudo recorrer la aplicación descomprimida: {error}"))?;
        for entry in entries {
            let entry = entry.map_err(|error| {
                format!("No se pudo recorrer la aplicación descomprimida: {error}")
            })?;
            let path = entry.path();
            let file_type = entry.file_type().map_err(|error| {
                format!("No se pudo recorrer la aplicación descomprimida: {error}")
            })?;
            let name = entry.file_name().to_string_lossy().into_owned();
            if file_type.is_symlink() {
                let target = fs::read_link(&path).map_err(|error| {
                    format!("No se pudo leer un enlace de la aplicación: {error}")
                })?;
                if !symlink_target_stays_within(&relative, &target) {
                    return Err(
                        "La aplicación descargada contiene enlaces que salen del bundle."
                            .to_string(),
                    );
                }
                let resolved = fs::canonicalize(&path)
                    .map_err(|_| "La aplicación descargada contiene enlaces rotos.".to_string())?;
                if !resolved.starts_with(&root) {
                    return Err(
                        "La aplicación descargada contiene enlaces que salen del bundle."
                            .to_string(),
                    );
                }
            } else if file_type.is_dir() {
                let mut child = relative.clone();
                child.push(name);
                pending.push((path, child));
            } else if !file_type.is_file() {
                return Err(
                    "La aplicación descargada contiene archivos especiales no permitidos."
                        .to_string(),
                );
            }
        }
    }
    Ok(())
}

fn symlink_target_stays_within(link_parent: &[String], target: &Path) -> bool {
    use std::path::Component;
    let mut depth = link_parent.len();
    for component in target.components() {
        match component {
            Component::Normal(_) => depth += 1,
            Component::CurDir => {}
            Component::ParentDir => {
                if depth == 0 {
                    return false;
                }
                depth -= 1;
            }
            Component::RootDir | Component::Prefix(_) => return false,
        }
    }
    true
}

// ---------------------------------------------------------------------------------------------------------
// Herramientas del sistema (macOS). Capa inyectable: en pruebas se sustituye por una falsa.
// ---------------------------------------------------------------------------------------------------------

/// Lo que el flujo necesita de las herramientas de macOS. Todas reciben rutas calculadas por el flujo.
pub(crate) trait MacosTools {
    /// `zipinfo -1` (nombres) y `zipinfo -t` (totales).
    fn list_zip(&self, archive: &Path) -> Result<ZipListing, String>;
    /// `ditto -x -k <zip> <destino>`.
    fn extract_zip(&self, archive: &Path, destination: &Path) -> Result<(), String>;
    /// El *designated requirement* (`codesign -d -r-`).
    fn designated_requirement(&self, bundle: &Path) -> Result<String, String>;
    /// `codesign --verify --strict [--deep] [-R=<requisito>]`.
    fn verify_signature(
        &self,
        bundle: &Path,
        requirement: Option<&str>,
        deep: bool,
    ) -> Result<(), String>;
    /// El TeamIdentifier de la firma, si lo hay.
    fn team_identifier(&self, bundle: &Path) -> Option<String>;
    /// `spctl --assess --type execute`.
    fn assess_gatekeeper(&self, bundle: &Path) -> Result<(), String>;
    /// Un valor de `Contents/Info.plist`.
    fn bundle_value(&self, bundle: &Path, key: &str) -> Option<String>;
}

#[cfg(target_os = "macos")]
pub(crate) struct SystemMacosTools;

#[cfg(target_os = "macos")]
impl SystemMacosTools {
    fn output(
        executable: &str,
        arguments: &[&std::ffi::OsStr],
    ) -> Result<std::process::Output, String> {
        Command::new(executable)
            .args(arguments)
            .env("LC_ALL", "C")
            .output()
            .map_err(|error| format!("No se pudo ejecutar {executable}: {error}"))
    }
}

#[cfg(target_os = "macos")]
impl MacosTools for SystemMacosTools {
    fn list_zip(&self, archive: &Path) -> Result<ZipListing, String> {
        let names = Self::output("/usr/bin/zipinfo", &["-1".as_ref(), archive.as_os_str()])?;
        let totals = Self::output("/usr/bin/zipinfo", &["-t".as_ref(), archive.as_os_str()])?;
        if !names.status.success() || !totals.status.success() {
            return Err("El paquete descargado no es un zip válido.".to_string());
        }
        let (entries, uncompressed_bytes) =
            parse_zipinfo_totals(&String::from_utf8_lossy(&totals.stdout))
                .ok_or_else(|| "No se pudo leer el índice del paquete descargado.".to_string())?;
        Ok(ZipListing {
            names: String::from_utf8_lossy(&names.stdout)
                .lines()
                .filter(|line| !line.is_empty())
                .map(str::to_string)
                .collect(),
            entries,
            uncompressed_bytes,
        })
    }

    fn extract_zip(&self, archive: &Path, destination: &Path) -> Result<(), String> {
        let output = Self::output(
            "/usr/bin/ditto",
            &[
                "-x".as_ref(),
                "-k".as_ref(),
                archive.as_os_str(),
                destination.as_os_str(),
            ],
        )?;
        if !output.status.success() {
            return Err("No se pudo descomprimir el paquete descargado.".to_string());
        }
        Ok(())
    }

    fn designated_requirement(&self, bundle: &Path) -> Result<String, String> {
        let output = Self::output(
            "/usr/bin/codesign",
            &["-d".as_ref(), "-r-".as_ref(), bundle.as_os_str()],
        )?;
        if !output.status.success() {
            return Err("No se pudo leer el requisito de firma de la original.".to_string());
        }
        parse_designated_requirement(&String::from_utf8_lossy(&output.stdout))
            .ok_or_else(|| "La original no declara un requisito de firma explícito.".to_string())
    }

    fn verify_signature(
        &self,
        bundle: &Path,
        requirement: Option<&str>,
        deep: bool,
    ) -> Result<(), String> {
        let requirement = requirement.map(|value| format!("={value}"));
        let mut arguments: Vec<&std::ffi::OsStr> = vec!["--verify".as_ref(), "--strict".as_ref()];
        if deep {
            arguments.push("--deep".as_ref());
        }
        if let Some(requirement) = requirement.as_deref() {
            arguments.push("-R".as_ref());
            arguments.push(requirement.as_ref());
        }
        arguments.push(bundle.as_os_str());
        let output = Self::output("/usr/bin/codesign", &arguments)?;
        if !output.status.success() {
            return Err(
                "La firma no es válida o no cumple el requisito de la original.".to_string(),
            );
        }
        Ok(())
    }

    fn team_identifier(&self, bundle: &Path) -> Option<String> {
        macos_team_identifier(bundle)
    }

    fn assess_gatekeeper(&self, bundle: &Path) -> Result<(), String> {
        let output = Self::output(
            "/usr/sbin/spctl",
            &[
                "--assess".as_ref(),
                "--type".as_ref(),
                "execute".as_ref(),
                bundle.as_os_str(),
            ],
        )?;
        if !output.status.success() {
            return Err("Gatekeeper rechazó la aplicación.".to_string());
        }
        Ok(())
    }

    fn bundle_value(&self, bundle: &Path, key: &str) -> Option<String> {
        let plist = bundle.join("Contents/Info.plist");
        let output = Self::output(
            "/usr/bin/plutil",
            &[
                "-extract".as_ref(),
                key.as_ref(),
                "raw".as_ref(),
                "-o".as_ref(),
                "-".as_ref(),
                plist.as_os_str(),
            ],
        )
        .ok()?;
        output
            .status
            .success()
            .then(|| String::from_utf8_lossy(&output.stdout).trim().to_string())
            .filter(|value| {
                !value.is_empty() && value.len() <= 256 && !value.chars().any(char::is_control)
            })
    }
}

/// La línea `designated => …` de `codesign -d -r-`. Una línea comentada (`# designated => cdhash …`) es el
/// requisito implícito de una firma ad hoc y no sirve para reconocer una versión nueva.
pub(crate) fn parse_designated_requirement(output: &str) -> Option<String> {
    output.lines().find_map(|line| {
        line.strip_prefix("designated => ")
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_string)
    })
}

// ---------------------------------------------------------------------------------------------------------
// Identidad, verificación e intercambio (A-5 pasos 1, 3 y 4).
// ---------------------------------------------------------------------------------------------------------

const OPERATION_PREFIX: &str = ".code-ai-profiles-original-";
const OPERATION_LOCK: &str = ".lock";
const ROLLBACK_FAILED_MARKER: &str = "rollback-failed";

/// Lo que se sabe de la original instalada antes de tocar nada.
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct InstalledIdentity {
    pub(crate) requirement: String,
    pub(crate) team: String,
    pub(crate) bundle_id: String,
    pub(crate) version: String,
}

pub(crate) fn read_installed_identity(
    tools: &dyn MacosTools,
    bundle: &Path,
) -> Result<InstalledIdentity, String> {
    tools
        .verify_signature(bundle, None, true)
        .map_err(|_| "La firma de la original instalada no es válida.".to_string())?;
    let team = tools.team_identifier(bundle).ok_or_else(|| {
        "La original instalada no declara un equipo de firma; no se puede comprobar el paquete nuevo."
            .to_string()
    })?;
    let requirement = tools.designated_requirement(bundle)?;
    let bundle_id = tools
        .bundle_value(bundle, "CFBundleIdentifier")
        .ok_or_else(|| "No se pudo leer el identificador de la original instalada.".to_string())?;
    let version = tools
        .bundle_value(bundle, "CFBundleShortVersionString")
        .filter(|version| valid_release_version(version))
        .ok_or_else(|| "No se pudo leer la versión de la original instalada.".to_string())?;
    Ok(InstalledIdentity {
        requirement,
        team,
        bundle_id,
        version,
    })
}

/// La versión del feed es la que vio la persona y es posterior a la instalada.
pub(crate) fn check_expected_version(
    package: &FeedPackage,
    expected_version: &str,
    installed_version: &str,
) -> Result<(), String> {
    if package.version != expected_version.trim() {
        return Err(format!(
            "El feed oficial ya anuncia la versión {} y no la {} que se mostró. Vuelve a comprobar las actualizaciones.",
            package.version,
            expected_version.trim()
        ));
    }
    if !version_is_newer(&package.version, Some(installed_version)) {
        return Err(format!(
            "La original ya tiene la versión {installed_version}, igual o posterior a la {} del feed.",
            package.version
        ));
    }
    Ok(())
}

/// Comprobaciones del paquete descomprimido antes de tocar la original (D-1).
pub(crate) fn verify_staged_app(
    tools: &dyn MacosTools,
    staged: &Path,
    installed: &InstalledIdentity,
    package: &FeedPackage,
) -> Result<(), String> {
    tools
        .verify_signature(staged, Some(&installed.requirement), true)
        .map_err(|_| {
            "La firma del paquete descargado no es válida o no corresponde a la original."
                .to_string()
        })?;
    if tools.team_identifier(staged).as_deref() != Some(installed.team.as_str()) {
        return Err(
            "El paquete descargado no está firmado por el mismo equipo que la original."
                .to_string(),
        );
    }
    tools
        .assess_gatekeeper(staged)
        .map_err(|_| "Gatekeeper rechazó el paquete descargado.".to_string())?;
    if tools.bundle_value(staged, "CFBundleIdentifier").as_deref()
        != Some(installed.bundle_id.as_str())
    {
        return Err("El paquete descargado no es la misma aplicación que la original.".to_string());
    }
    let version = tools
        .bundle_value(staged, "CFBundleShortVersionString")
        .unwrap_or_default();
    if version != package.version {
        return Err(format!(
            "El paquete descargado declara la versión «{version}» y el feed oficial anunciaba la {}.",
            package.version
        ));
    }
    if !version_is_newer(&version, Some(&installed.version)) {
        return Err("El paquete descargado no es posterior a la versión instalada.".to_string());
    }
    Ok(())
}

/// Cómo quedó el intercambio: con `RENAME_SWAP` la anterior está ahora en la ruta del preparado; con el
/// patrón de dos `rename`, en `backup`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) enum SwapOutcome {
    Exchanged,
    Moved { backup: PathBuf },
}

#[cfg(target_os = "macos")]
fn exchange_paths(first: &Path, second: &Path) -> std::io::Result<()> {
    use std::os::unix::ffi::OsStrExt;
    let first = std::ffi::CString::new(first.as_os_str().as_bytes())
        .map_err(|_| std::io::Error::from(std::io::ErrorKind::InvalidInput))?;
    let second = std::ffi::CString::new(second.as_os_str().as_bytes())
        .map_err(|_| std::io::Error::from(std::io::ErrorKind::InvalidInput))?;
    // SAFETY: both pointers are valid NUL-terminated strings that outlive the call.
    let result = unsafe { libc::renamex_np(first.as_ptr(), second.as_ptr(), libc::RENAME_SWAP) };
    if result == 0 {
        Ok(())
    } else {
        Err(std::io::Error::last_os_error())
    }
}

#[cfg(not(target_os = "macos"))]
fn exchange_paths(_first: &Path, _second: &Path) -> std::io::Result<()> {
    Err(std::io::Error::from(std::io::ErrorKind::Unsupported))
}

fn exchange_unsupported(error: &std::io::Error) -> bool {
    #[cfg(target_os = "macos")]
    {
        matches!(error.raw_os_error(), Some(code) if code == libc::ENOTSUP || code == libc::EINVAL)
    }
    #[cfg(not(target_os = "macos"))]
    {
        error.kind() == std::io::ErrorKind::Unsupported
    }
}

/// Pone `staged` en `destination`. Primero `renamex_np(RENAME_SWAP)`; si el volumen no lo admite, el patrón
/// de `swap_application_directory` con la anterior en `<previous_dir>/<nombre>`.
pub(crate) fn swap_bundles(
    staged: &Path,
    destination: &Path,
    previous_dir: &Path,
) -> Result<SwapOutcome, String> {
    swap_bundles_with(staged, destination, previous_dir, true)
}

fn swap_bundles_with(
    staged: &Path,
    destination: &Path,
    previous_dir: &Path,
    try_exchange: bool,
) -> Result<SwapOutcome, String> {
    if try_exchange {
        match exchange_paths(staged, destination) {
            Ok(()) => return Ok(SwapOutcome::Exchanged),
            Err(error) if exchange_unsupported(&error) => {}
            Err(error) => return Err(format!("No se pudo intercambiar la aplicación: {error}")),
        }
    }
    let name = destination
        .file_name()
        .ok_or_else(|| "La ruta de la original no es válida.".to_string())?;
    fs::create_dir_all(previous_dir)
        .map_err(|error| format!("No se pudo preparar el respaldo de la original: {error}"))?;
    let backup = previous_dir.join(name);
    swap_application_directory(staged, destination, &backup)?;
    Ok(SwapOutcome::Moved { backup })
}

/// Deshace `swap_bundles`. La versión rechazada queda en `staged` (intercambio) o en `<op>/failed`.
pub(crate) fn unswap_bundles(
    outcome: &SwapOutcome,
    staged: &Path,
    destination: &Path,
    operation_dir: &Path,
) -> Result<(), String> {
    match outcome {
        SwapOutcome::Exchanged => exchange_paths(staged, destination)
            .map_err(|error| format!("No se pudo restaurar la versión anterior: {error}")),
        SwapOutcome::Moved { backup } => {
            let failed = operation_dir.join("failed");
            fs::rename(destination, &failed)
                .map_err(|error| format!("No se pudo apartar la versión rechazada: {error}"))?;
            if let Err(error) = fs::rename(backup, destination) {
                let _ = fs::rename(&failed, destination);
                return Err(format!("No se pudo restaurar la versión anterior: {error}"));
            }
            Ok(())
        }
    }
}

/// Lo mismo que `validate_source` en macOS, sin depender de la plataforma de las pruebas.
fn bundle_layout_valid(bundle: &Path) -> bool {
    #[cfg(target_os = "macos")]
    {
        validate_source(bundle).is_ok()
    }
    #[cfg(not(target_os = "macos"))]
    {
        bundle.extension().and_then(|value| value.to_str()) == Some("app")
            && bundle.join("Contents/MacOS/Claude").is_file()
    }
}

#[derive(Debug, PartialEq, Eq)]
pub(crate) enum InstallError {
    /// No se llegó a tocar la original.
    Unchanged(String),
    /// Se intercambió, falló la comprobación final y se volvió a la anterior.
    Restored(String),
    /// Falló también la vuelta atrás: el directorio de la operación se conserva.
    Stuck(String),
}

/// Intercambia y valida la nueva; si no pasa, vuelve a la anterior. `is_running` se consulta justo antes.
pub(crate) fn install_staged_app(
    tools: &dyn MacosTools,
    staged: &Path,
    destination: &Path,
    operation_dir: &Path,
    installed: &InstalledIdentity,
    package: &FeedPackage,
    app_name: &str,
    is_running: &dyn Fn(&Path) -> bool,
) -> Result<(), InstallError> {
    let destination_metadata = fs::symlink_metadata(destination)
        .map_err(|_| InstallError::Unchanged("La original ya no está en su sitio.".to_string()))?;
    if !destination_metadata.is_dir() || destination_metadata.file_type().is_symlink() {
        return Err(InstallError::Unchanged(
            "La original ya no es una aplicación válida.".to_string(),
        ));
    }
    if is_running(destination) {
        return Err(InstallError::Unchanged(format!(
            "Cierra {app_name} para actualizarla."
        )));
    }
    let outcome = swap_bundles(staged, destination, &operation_dir.join("previous"))
        .map_err(InstallError::Unchanged)?;
    let validation = if !bundle_layout_valid(destination) {
        Err("la aplicación nueva no tiene la estructura esperada".to_string())
    } else if tools
        .bundle_value(destination, "CFBundleShortVersionString")
        .as_deref()
        != Some(package.version.as_str())
    {
        Err("la versión instalada no es la del feed".to_string())
    } else if tools
        .bundle_value(destination, "CFBundleIdentifier")
        .as_deref()
        != Some(installed.bundle_id.as_str())
    {
        Err("el identificador de la aplicación cambió".to_string())
    } else if tools
        .verify_signature(destination, Some(&installed.requirement), false)
        .is_err()
    {
        Err("la firma en su ubicación final no es válida".to_string())
    } else {
        Ok(())
    };
    let Err(reason) = validation else {
        return Ok(());
    };
    match unswap_bundles(&outcome, staged, destination, operation_dir) {
        Ok(()) => Err(InstallError::Restored(format!(
            "La versión nueva no superó la comprobación final ({reason}). Se restauró la versión anterior."
        ))),
        Err(error) => Err(InstallError::Stuck(format!(
            "La versión nueva no superó la comprobación final ({reason}) y no se pudo volver a la anterior: {error} La versión anterior se conserva en {}.",
            operation_dir.display()
        ))),
    }
}

// ---------------------------------------------------------------------------------------------------------
// Directorios temporales y recuperación (A-7).
// ---------------------------------------------------------------------------------------------------------

fn operation_dir_name(id: Uuid) -> String {
    format!("{OPERATION_PREFIX}{}", id.hyphenated())
}

fn is_operation_dir_name(name: &str) -> bool {
    name.strip_prefix(OPERATION_PREFIX)
        .and_then(|suffix| Uuid::parse_str(suffix).ok())
        .is_some_and(|id| operation_dir_name(id) == name)
}

fn is_staging_dir_name(name: &str) -> bool {
    Uuid::parse_str(name).is_ok_and(|id| id.hyphenated().to_string() == name)
}

#[cfg(unix)]
fn owned_by_current_user(metadata: &fs::Metadata) -> bool {
    use std::os::unix::fs::MetadataExt;
    // SAFETY: getuid has no preconditions and cannot fail.
    metadata.uid() == unsafe { libc::getuid() }
}

#[cfg(not(unix))]
fn owned_by_current_user(_metadata: &fs::Metadata) -> bool {
    false
}

fn create_private_dir(path: &Path) -> std::io::Result<()> {
    let mut builder = fs::DirBuilder::new();
    #[cfg(unix)]
    {
        use std::os::unix::fs::DirBuilderExt;
        builder.mode(0o700);
    }
    builder.create(path)
}

/// Un directorio temporal propio con su cerrojo. Al soltarse se limpia, salvo que se pida conservarlo.
pub(crate) struct OperationDir {
    path: PathBuf,
    installation: Option<PathBuf>,
    keep: std::cell::Cell<bool>,
    _lock: File,
}

impl OperationDir {
    /// `<padre>/.code-ai-profiles-original-<uuid>/`, en el mismo volumen que la original y con modo `0700`.
    pub(crate) fn beside(installation: &Path, app_name: &str) -> Result<Self, String> {
        let parent = installation
            .parent()
            .ok_or_else(|| "La ruta de la original no es válida.".to_string())?;
        let path = parent.join(operation_dir_name(Uuid::new_v4()));
        create_private_dir(&path).map_err(|error| {
            if error.kind() == std::io::ErrorKind::PermissionDenied {
                format!(
                    "No hay permiso para escribir en {}. Code AI Profiles no pide privilegios: usa «Abrir {app_name}».",
                    parent.display()
                )
            } else {
                format!("No se pudo preparar la carpeta temporal junto a la original: {error}")
            }
        })?;
        Self::locked(path, Some(installation.to_path_buf()))
    }

    /// `<app_data>/original-update/<uuid>/` para el paquete descargado.
    pub(crate) fn staging(staging_root: &Path) -> Result<Self, String> {
        fs::create_dir_all(staging_root)
            .map_err(|error| format!("No se pudo preparar la carpeta de descarga: {error}"))?;
        let path = staging_root.join(Uuid::new_v4().hyphenated().to_string());
        create_private_dir(&path)
            .map_err(|error| format!("No se pudo preparar la carpeta de descarga: {error}"))?;
        Self::locked(path, None)
    }

    fn locked(path: PathBuf, installation: Option<PathBuf>) -> Result<Self, String> {
        let lock = File::create(path.join(OPERATION_LOCK))
            .and_then(|file| fs2::FileExt::try_lock_exclusive(&file).map(|_| file));
        match lock {
            Ok(lock) => Ok(Self {
                path,
                installation,
                keep: std::cell::Cell::new(false),
                _lock: lock,
            }),
            Err(error) => {
                let _ = fs::remove_dir_all(&path);
                Err(format!("No se pudo preparar la carpeta temporal: {error}"))
            }
        }
    }

    pub(crate) fn path(&self) -> &Path {
        &self.path
    }

    /// Conserva el directorio (la vuelta atrás falló y dentro está la versión anterior).
    pub(crate) fn keep(&self) {
        self.keep.set(true);
        let _ = fs::write(self.path.join(ROLLBACK_FAILED_MARKER), b"");
    }
}

impl Drop for OperationDir {
    fn drop(&mut self) {
        if self.keep.get() {
            return;
        }
        match &self.installation {
            Some(installation) => {
                cleanup_operation_dir(&self.path, installation);
            }
            None => {
                let _ = fs::remove_dir_all(&self.path);
            }
        }
    }
}

/// Si falta la original y su respaldo está en `previous/`, la devuelve. Borra el directorio solo si la
/// original está en su sitio y no hay marca de vuelta atrás fallida. Devuelve si lo borró.
fn cleanup_operation_dir(operation_dir: &Path, installation: &Path) -> bool {
    if operation_dir.join(ROLLBACK_FAILED_MARKER).exists() {
        return false;
    }
    if fs::symlink_metadata(installation).is_err() {
        let Some(name) = installation.file_name() else {
            return false;
        };
        let previous = operation_dir.join("previous").join(name);
        let restorable = fs::symlink_metadata(&previous)
            .is_ok_and(|metadata| metadata.is_dir() && !metadata.file_type().is_symlink());
        if !restorable || fs::rename(&previous, installation).is_err() {
            return false;
        }
    }
    fs::remove_dir_all(operation_dir).is_ok()
}

/// Un directorio de operación sin dueño vivo: el cerrojo no lo tiene otro proceso.
fn operation_is_abandoned(operation_dir: &Path) -> bool {
    match File::open(operation_dir.join(OPERATION_LOCK)) {
        Ok(file) => fs2::FileExt::try_lock_exclusive(&file).is_ok(),
        Err(error) => error.kind() == std::io::ErrorKind::NotFound,
    }
}

fn own_plain_dir(path: &Path) -> bool {
    fs::symlink_metadata(path).is_ok_and(|metadata| {
        metadata.is_dir() && !metadata.file_type().is_symlink() && owned_by_current_user(&metadata)
    })
}

/// Recupera restos de una instalación interrumpida: en el padre de cada instalación candidata (solo
/// directorios propios con el nombre exacto) y en la carpeta de descargas.
pub(crate) fn recover_leftovers_in(installations: &[PathBuf], staging_root: &Path) {
    for installation in installations {
        let Some(parent) = installation.parent() else {
            continue;
        };
        let Ok(entries) = fs::read_dir(parent) else {
            continue;
        };
        for entry in entries.flatten() {
            let name = entry.file_name();
            let Some(name) = name.to_str() else {
                continue;
            };
            let path = entry.path();
            if is_operation_dir_name(name) && own_plain_dir(&path) && operation_is_abandoned(&path)
            {
                cleanup_operation_dir(&path, installation);
            }
        }
    }
    let Ok(entries) = fs::read_dir(staging_root) else {
        return;
    };
    for entry in entries.flatten() {
        let name = entry.file_name();
        let Some(name) = name.to_str() else {
            continue;
        };
        let path = entry.path();
        if is_staging_dir_name(name) && own_plain_dir(&path) && operation_is_abandoned(&path) {
            let _ = fs::remove_dir_all(&path);
        }
    }
}

// ---------------------------------------------------------------------------------------------------------
// Vuelo único y cancelación (A-5).
// ---------------------------------------------------------------------------------------------------------

struct Flight {
    cancel: AtomicBool,
    cancellable: Mutex<bool>,
}

fn active_flight() -> std::sync::MutexGuard<'static, Option<Arc<Flight>>> {
    static ACTIVE: OnceLock<Mutex<Option<Arc<Flight>>>> = OnceLock::new();
    ACTIVE
        .get_or_init(|| Mutex::new(None))
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
}

/// La operación en curso. Al soltarse libera el vuelo, pase lo que pase.
pub(crate) struct FlightGuard {
    flight: Arc<Flight>,
}

impl FlightGuard {
    fn cancelled(&self) -> bool {
        self.flight.cancel.load(Ordering::SeqCst)
    }

    /// Deja de admitir cancelación. Devuelve `false` si ya se había cancelado: entonces no se instala.
    fn enter_uncancellable(&self) -> bool {
        let mut cancellable = self
            .flight
            .cancellable
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        if self.cancelled() {
            return false;
        }
        *cancellable = false;
        true
    }
}

impl Drop for FlightGuard {
    fn drop(&mut self) {
        let mut active = active_flight();
        if active
            .as_ref()
            .is_some_and(|current| Arc::ptr_eq(current, &self.flight))
        {
            *active = None;
        }
    }
}

pub(crate) fn begin_flight() -> Result<FlightGuard, String> {
    let mut active = active_flight();
    if active.is_some() {
        return Err("Ya hay una actualización de la original en curso.".to_string());
    }
    let flight = Arc::new(Flight {
        cancel: AtomicBool::new(false),
        cancellable: Mutex::new(true),
    });
    *active = Some(flight.clone());
    Ok(FlightGuard { flight })
}

/// `true` si había una operación en una fase cancelable (preparación, descarga o verificación).
pub(crate) fn cancel_original_update() -> bool {
    let active = active_flight();
    let Some(flight) = active.as_ref() else {
        return false;
    };
    let cancellable = flight
        .cancellable
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    if !*cancellable {
        return false;
    }
    flight.cancel.store(true, Ordering::SeqCst);
    true
}

pub(crate) fn original_update_in_flight() -> bool {
    active_flight().is_some()
}

// ---------------------------------------------------------------------------------------------------------
// Piezas del flujo.
// ---------------------------------------------------------------------------------------------------------

const DOWNLOAD_SPACE_MARGIN: u64 = 64 * 1024 * 1024;
const INSTALL_SPACE_MARGIN: u64 = 256 * 1024 * 1024;
const CONNECT_TIMEOUT: Duration = Duration::from_secs(15);
/// En `reqwest::blocking` 0.13 el `timeout` del cliente se aplica a la espera de cabeceras y a cada lectura
/// por separado: es el plazo «sin bytes». El total lo vigila `stream_to_file`.
const STALL_TIMEOUT: Duration = Duration::from_secs(60);
const TOTAL_DOWNLOAD_TIMEOUT: Duration = Duration::from_secs(30 * 60);
const UNCHANGED_SUFFIX: &str = "La original no cambió.";

fn unchanged(message: String) -> String {
    let message = message.trim_end().to_string();
    if message.ends_with(UNCHANGED_SUFFIX) {
        message
    } else {
        format!("{message} {UNCHANGED_SUFFIX}")
    }
}

fn format_gigabytes(bytes: u64) -> String {
    format!("{:.1} GB", bytes as f64 / 1_000_000_000.0)
}

/// Espacio: la descarga en los datos de la app y el preparado junto a la original (la suma si comparten
/// volumen).
pub(crate) fn check_space(
    download_free: u64,
    install_free: u64,
    same_volume: bool,
    size: u64,
) -> Result<(), String> {
    let download_need = size.saturating_add(DOWNLOAD_SPACE_MARGIN);
    let install_need = size.saturating_mul(3).saturating_add(INSTALL_SPACE_MARGIN);
    let missing = |need: u64| {
        format!(
            "No hay espacio suficiente en el disco: hacen falta unos {} libres.",
            format_gigabytes(need)
        )
    };
    if same_volume {
        let need = download_need.saturating_add(install_need);
        if install_free < need {
            return Err(missing(need));
        }
        return Ok(());
    }
    if download_free < download_need {
        return Err(missing(download_need));
    }
    if install_free < install_need {
        return Err(missing(install_need));
    }
    Ok(())
}

#[cfg(unix)]
fn same_volume(first: &Path, second: &Path) -> bool {
    use std::os::unix::fs::MetadataExt;
    match (fs::metadata(first), fs::metadata(second)) {
        (Ok(first), Ok(second)) => first.dev() == second.dev(),
        _ => true,
    }
}

#[cfg(not(unix))]
fn same_volume(_first: &Path, _second: &Path) -> bool {
    true
}

fn available_space(path: &Path) -> Result<u64, String> {
    fs2::available_space(path)
        .map_err(|error| format!("No se pudo comprobar el espacio libre: {error}"))
}

/// La original detectada, comprobada antes de escribir junto a ella: no es un enlace, no está dentro de
/// las instancias, es un bundle válido y es del usuario actual.
pub(crate) fn prepare_destination(
    detected: &Path,
    instances_root: &Path,
    app_name: &str,
) -> Result<PathBuf, String> {
    let metadata = fs::symlink_metadata(detected)
        .map_err(|_| "No se encontró la instalación original.".to_string())?;
    if metadata.file_type().is_symlink() || !metadata.is_dir() {
        return Err(format!(
            "La original no es una aplicación normal (es un enlace u otro tipo de archivo); actualízala con «Abrir {app_name}»."
        ));
    }
    let canonical = fs::canonicalize(detected)
        .map_err(|error| format!("No se pudo resolver la ruta de la original: {error}"))?;
    if fs::canonicalize(instances_root).is_ok_and(|instances| canonical.starts_with(instances)) {
        return Err("La ruta detectada pertenece a una instancia administrada.".to_string());
    }
    if !bundle_layout_valid(&canonical) {
        return Err(
            "La ruta no corresponde a un bundle válido de la aplicación compatible.".to_string(),
        );
    }
    if !owned_by_current_user(&metadata) {
        return Err(format!(
            "La original pertenece a otro usuario o al sistema; actualízala con «Abrir {app_name}»."
        ));
    }
    Ok(canonical)
}

/// Lo que se guarda en la caché del feed tras instalar: la versión nueva es la actual.
pub(crate) fn installed_update_info(version: &str, checked_at: i64) -> SourceUpdateInfo {
    SourceUpdateInfo {
        status: SourceUpdateStatus::Current,
        latest_version: Some(version.to_string()),
        checked_at: Some(checked_at),
        stale: false,
        source: Some(SourceUpdateSource::OfficialFeed),
    }
}

/// Las instancias por detrás: detenidas (se sincronizan ya) y en marcha (quedan pendientes, A-6).
pub(crate) fn split_stale_instances(
    topology: &VersionTopology,
    registry: &Registry,
) -> (Vec<String>, Vec<String>) {
    let mut targets = Vec::new();
    let mut pending = Vec::new();
    for id in &topology.stale_instance_ids {
        match registry
            .instances
            .iter()
            .find(|instance| &instance.id == id)
            .map(|instance| &instance.status)
        {
            Some(InstanceStatus::Stopped) => targets.push(id.clone()),
            Some(InstanceStatus::Running) => pending.push(id.clone()),
            _ => {}
        }
    }
    (targets, pending)
}

fn failed_items(
    targets: &[String],
    message: &str,
    version: Option<String>,
) -> Vec<SynchronizationItemResult> {
    targets
        .iter()
        .map(|id| SynchronizationItemResult {
            instance_id: id.clone(),
            status: SynchronizationStatus::Failed,
            from_version: None,
            to_version: version.clone(),
            message: message.to_string(),
        })
        .collect()
}

/// Paso 5: un fallo aquí no deshace la instalación, va en el resultado.
fn synchronize_after_install(
    app: &AppHandle,
    paths: &ManagedPaths,
) -> (Vec<SynchronizationItemResult>, Vec<String>) {
    let Ok(mut registry) = load_registry(paths) else {
        return (Vec::new(), Vec::new());
    };
    let inventory = ProcessInventory::capture();
    refresh_instance_statuses(&mut registry, &inventory);
    refresh_instance_versions(&mut registry);
    let topology = build_version_topology(paths, &registry, &inventory);
    let (targets, pending) = split_stale_instances(&topology, &registry);
    if targets.is_empty() {
        return (Vec::new(), pending);
    }
    let Some(source) = topology.latest_source.clone() else {
        let reason = topology
            .reason
            .clone()
            .unwrap_or_else(|| "No hay una fuente válida para sincronizar.".to_string());
        return (failed_items(&targets, &reason, None), pending);
    };
    let results = synchronize_managed_applications_sync(
        app,
        SynchronizeManagedApplicationsRequest {
            source,
            target_instance_ids: targets.clone(),
        },
    )
    .unwrap_or_else(|error| {
        failed_items(&targets, &error, topology.latest_installed_version.clone())
    });
    (results, pending)
}

fn download_package(
    package: &FeedPackage,
    destination: &Path,
    cancel: &AtomicBool,
    progress: &mut dyn FnMut(u64),
) -> Result<String, StreamError> {
    let hosts = config::download_hosts();
    let client = reqwest::blocking::Client::builder()
        .connect_timeout(CONNECT_TIMEOUT)
        .timeout(STALL_TIMEOUT)
        .redirect(reqwest::redirect::Policy::custom(
            move |attempt| match redirect_allowed(attempt.url(), attempt.previous().len(), &hosts) {
                Ok(()) => attempt.follow(),
                Err(message) => attempt.error(message),
            },
        ))
        .referer(false)
        .https_only(true)
        .build()
        .map_err(|error| {
            StreamError::Failed(format!("No se pudo preparar la descarga: {error}"))
        })?;
    let response = client
        .get(package.url.clone())
        .header(reqwest::header::USER_AGENT, config::user_agent())
        .send()
        .map_err(|error| {
            StreamError::Failed(format!("No se pudo descargar el paquete oficial: {error}"))
        })?;
    if !response.status().is_success() {
        return Err(StreamError::Failed(format!(
            "La descarga oficial respondió con estado {}.",
            response.status()
        )));
    }
    if response
        .content_length()
        .is_some_and(|length| length > package.size)
    {
        return Err(StreamError::Failed(
            "El paquete descargado es más grande de lo que anuncia el feed oficial.".to_string(),
        ));
    }
    stream_to_file(
        response,
        destination,
        package.size,
        cancel,
        Instant::now() + TOTAL_DOWNLOAD_TIMEOUT,
        progress,
    )
}

/// Las instalaciones que `detect_provider_source` puede devolver; sus padres son los únicos sitios donde
/// se buscan restos.
fn installation_candidates() -> Vec<PathBuf> {
    #[cfg(target_os = "macos")]
    {
        macos_provider_candidates()
    }
    #[cfg(not(target_os = "macos"))]
    {
        Vec::new()
    }
}

/// A-7. Corre en `setup` y al empezar cada instalación.
pub(crate) fn recover_original_update_leftovers(paths: &ManagedPaths) {
    recover_leftovers_in(&installation_candidates(), &paths.original_update);
}

// ---------------------------------------------------------------------------------------------------------
// El flujo completo (A-5).
// ---------------------------------------------------------------------------------------------------------

struct Prepared {
    destination: PathBuf,
    app_name: String,
    installed: InstalledIdentity,
    package: FeedPackage,
    checked_at: i64,
    staged_app: PathBuf,
    // Orden de limpieza: primero la operación junto a la original, luego la descarga.
    operation: OperationDir,
    _download: OperationDir,
}

enum PreparedStep {
    Ready(Box<Prepared>),
    Cancelled { previous_version: Option<String> },
}

fn cancelled_outcome(previous_version: Option<String>) -> OriginalInstallOutcome {
    OriginalInstallOutcome {
        status: OriginalInstallStatus::Cancelled,
        previous_version,
        installed_version: None,
        synchronization: Vec::new(),
        pending_instance_ids: Vec::new(),
    }
}

fn progress_for(
    phase: OriginalInstallPhase,
    package: Option<&FeedPackage>,
    received_bytes: u64,
    cancellable: bool,
) -> OriginalInstallProgress {
    OriginalInstallProgress {
        phase,
        target_version: package.map(|package| package.version.clone()),
        received_bytes,
        total_bytes: package.map_or(0, |package| package.size),
        cancellable,
    }
}

/// Pasos 1 a 3: nada de esto toca la original.
fn prepare_and_verify(
    paths: &ManagedPaths,
    tools: &dyn MacosTools,
    flight: &FlightGuard,
    request: &InstallOriginalUpdateRequest,
    progress: &dyn Fn(OriginalInstallProgress),
) -> Result<PreparedStep, String> {
    use OriginalInstallPhase::{Downloading, Preparing, Verifying};
    progress(progress_for(Preparing, None, 0, true));
    recover_original_update_leftovers(paths);
    let detected = require_provider_source(detect_provider_source())?;
    let app_name =
        source_display_name(&detected).unwrap_or_else(|| "la aplicación original".to_string());
    let destination = prepare_destination(&detected, &paths.instances, &app_name)?;
    let installed = read_installed_identity(tools, &destination)?;
    let cancelled = || PreparedStep::Cancelled {
        previous_version: Some(installed.version.clone()),
    };
    if ProcessInventory::capture().any_executable_within(&destination) {
        return Err(format!("Cierra {app_name} para actualizarla."));
    }
    if flight.cancelled() {
        return Ok(cancelled());
    }

    let checked_at = Utc::now().timestamp_millis();
    let document = fetch_official_feed("darwin", "universal", &installed.version)?;
    let package = parse_feed_package(&document, &config::download_hosts())?;
    check_expected_version(&package, &request.expected_version, &installed.version)?;
    progress(progress_for(Preparing, Some(&package), 0, true));
    let operation = OperationDir::beside(&destination, &app_name)?;
    let download = OperationDir::staging(&paths.original_update)?;
    check_space(
        available_space(download.path())?,
        available_space(operation.path())?,
        same_volume(download.path(), operation.path()),
        package.size,
    )?;
    if flight.cancelled() {
        return Ok(cancelled());
    }

    progress(progress_for(Downloading, Some(&package), 0, true));
    let archive = download.path().join("package.zip");
    let mut throttle = ProgressThrottle::new();
    let digest =
        match download_package(&package, &archive, &flight.flight.cancel, &mut |received| {
            if throttle.should_emit(Instant::now(), received, package.size) {
                progress(progress_for(Downloading, Some(&package), received, true));
            }
        }) {
            Ok(digest) => digest,
            Err(StreamError::Cancelled) => return Ok(cancelled()),
            Err(StreamError::Failed(message)) => return Err(message),
        };

    progress(progress_for(Verifying, Some(&package), 0, true));
    if !digest_matches(&digest, &package.sha256) {
        return Err(
            "El paquete descargado no coincide con el sha256 que publica el feed oficial."
                .to_string(),
        );
    }
    let listing = tools.list_zip(&archive)?;
    let root = validate_zip_listing(&listing, package.size)?;
    let needed = listing
        .uncompressed_bytes
        .saturating_add(INSTALL_SPACE_MARGIN);
    if available_space(operation.path())? < needed {
        return Err(format!(
            "No hay espacio suficiente en el disco: hacen falta unos {} libres.",
            format_gigabytes(needed)
        ));
    }
    if flight.cancelled() {
        return Ok(cancelled());
    }
    let staged_dir = operation.path().join("staged");
    create_private_dir(&staged_dir)
        .map_err(|error| format!("No se pudo preparar la carpeta temporal: {error}"))?;
    tools.extract_zip(&archive, &staged_dir)?;
    let _ = fs::remove_file(&archive);
    let staged_app = staged_dir.join(&root);
    check_symlinks_within(&staged_app)?;
    if flight.cancelled() {
        return Ok(cancelled());
    }
    verify_staged_app(tools, &staged_app, &installed, &package)?;
    if flight.cancelled() {
        return Ok(cancelled());
    }
    Ok(PreparedStep::Ready(Box::new(Prepared {
        destination,
        app_name,
        installed,
        package,
        checked_at,
        staged_app,
        operation,
        _download: download,
    })))
}

/// Pasos 4 y 5, dentro de `with_registry_operation`.
fn install_and_synchronize(
    app: &AppHandle,
    paths: &ManagedPaths,
    tools: &dyn MacosTools,
    prepared: &Prepared,
    progress: &dyn Fn(OriginalInstallProgress),
) -> Result<OriginalInstallOutcome, String> {
    let is_running = |bundle: &Path| ProcessInventory::capture().any_executable_within(bundle);
    match install_staged_app(
        tools,
        &prepared.staged_app,
        &prepared.destination,
        prepared.operation.path(),
        &prepared.installed,
        &prepared.package,
        &prepared.app_name,
        &is_running,
    ) {
        Ok(()) => {}
        Err(InstallError::Unchanged(message)) => return Err(unchanged(message)),
        Err(InstallError::Restored(message)) => return Err(message),
        Err(InstallError::Stuck(message)) => {
            prepared.operation.keep();
            return Err(message);
        }
    }
    invalidate_application_cache();
    let _ = save_source_update_cache(
        paths,
        &platform_name(),
        &prepared.package.version,
        &installed_update_info(&prepared.package.version, prepared.checked_at),
    );
    progress(progress_for(
        OriginalInstallPhase::Synchronizing,
        Some(&prepared.package),
        0,
        false,
    ));
    let (synchronization, pending_instance_ids) = synchronize_after_install(app, paths);
    Ok(OriginalInstallOutcome {
        status: OriginalInstallStatus::Installed,
        previous_version: Some(prepared.installed.version.clone()),
        installed_version: Some(prepared.package.version.clone()),
        synchronization,
        pending_instance_ids,
    })
}

#[cfg(target_os = "macos")]
pub(crate) fn install_original_update_sync(
    app: &AppHandle,
    request: InstallOriginalUpdateRequest,
    progress: &dyn Fn(OriginalInstallProgress),
) -> Result<OriginalInstallOutcome, String> {
    let flight = begin_flight()?;
    let paths = ManagedPaths::resolve(app).map_err(unchanged)?;
    let tools = SystemMacosTools;
    let prepared = match prepare_and_verify(&paths, &tools, &flight, &request, progress) {
        Ok(PreparedStep::Ready(prepared)) => prepared,
        Ok(PreparedStep::Cancelled { previous_version }) => {
            return Ok(cancelled_outcome(previous_version))
        }
        Err(error) => return Err(unchanged(error)),
    };
    if !flight.enter_uncancellable() {
        return Ok(cancelled_outcome(Some(prepared.installed.version.clone())));
    }
    progress(progress_for(
        OriginalInstallPhase::Installing,
        Some(&prepared.package),
        0,
        false,
    ));
    // Los temporales (`prepared`) se borran al salir, ya fuera del mutex; el vuelo se libera el último.
    with_registry_operation(|| install_and_synchronize(app, &paths, &tools, &prepared, progress))
}

#[cfg(not(target_os = "macos"))]
pub(crate) fn install_original_update_sync(
    _app: &AppHandle,
    _request: InstallOriginalUpdateRequest,
    _progress: &dyn Fn(OriginalInstallProgress),
) -> Result<OriginalInstallOutcome, String> {
    Err("La instalación directa solo está disponible en macOS.".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::Cell;
    #[cfg(unix)]
    use std::os::unix::fs::PermissionsExt;

    const HOST: &str = "downloads.example.test";
    const SHA: &str = "aa66f2e3c3b8e1a4a0a1d23f1c2b5a6e7d8c9b0a1f2e3d4c5b6a7980716253ab";

    fn hosts() -> Vec<String> {
        vec![HOST.to_string()]
    }

    fn temp_root(case: &str) -> PathBuf {
        let root = env::temp_dir().join(format!("code-ai-{case}-{}", Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        root
    }

    fn feed(update: Value) -> Value {
        serde_json::json!({
            "currentRelease": "1.5.0",
            "releases": [
                { "version": "1.4.0", "updateTo": { "version": "1.4.0", "url": format!("https://{HOST}/old.zip"), "sha256": SHA, "size": 10 } },
                { "version": "1.5.0", "updateTo": update }
            ]
        })
    }

    fn good_update() -> Value {
        serde_json::json!({
            "version": "1.5.0",
            "url": format!("https://{HOST}/releases/darwin/universal/1.5.0/App-abc.zip"),
            "sha256": SHA.to_ascii_uppercase(),
            "size": 378_072_300_u64,
            "notes": "ignored"
        })
    }

    fn with(field: &str, value: Value) -> Value {
        let mut update = good_update();
        update[field] = value;
        feed(update)
    }

    #[test]
    fn parses_the_package_for_the_current_release() {
        let package = parse_feed_package(&feed(good_update()), &hosts()).unwrap();
        assert_eq!(package.version, "1.5.0");
        assert_eq!(package.sha256, SHA);
        assert_eq!(package.size, 378_072_300);
        assert_eq!(package.url.host_str(), Some(HOST));
    }

    #[test]
    fn rejects_every_malformed_feed_package() {
        let no_update =
            serde_json::json!({ "currentRelease": "1.5.0", "releases": [{ "version": "1.5.0" }] });
        let other_version = serde_json::json!({
            "currentRelease": "1.6.0",
            "releases": [{ "version": "1.5.0", "updateTo": good_update() }]
        });
        let cases = [
            no_update,
            other_version,
            serde_json::json!({ "releases": [] }),
            with("sha256", Value::from("abc123")),
            with("sha256", Value::from("z".repeat(64))),
            with("size", Value::from(0)),
            with("size", Value::from(MAX_PACKAGE_BYTES + 1)),
            with("size", Value::from("10")),
            with("url", Value::from(format!("http://{HOST}/a.zip"))),
            with("url", Value::from(format!("https://{HOST}.evil.com/a.zip"))),
            with("url", Value::from(format!("https://{HOST}@evil.com/a.zip"))),
            with("url", Value::from(format!("https://user:pw@{HOST}/a.zip"))),
            with("url", Value::from(format!("https://{HOST}:8443/a.zip"))),
            with("url", Value::from(format!("https://{HOST}/a.dmg"))),
            with("url", Value::from("not a url")),
        ];
        for (index, document) in cases.iter().enumerate() {
            assert!(
                parse_feed_package(document, &hosts()).is_err(),
                "case {index} should be rejected"
            );
        }
    }

    #[test]
    fn download_url_accepts_explicit_default_port_and_uppercase_host() {
        assert!(validate_download_url(&format!("https://{HOST}:443/a.zip"), &hosts()).is_ok());
        assert!(validate_download_url("https://DOWNLOADS.Example.TEST/a.ZIP", &hosts()).is_ok());
        assert!(validate_download_url(&format!("https://{HOST}/a.zip"), &[]).is_err());
    }

    #[test]
    fn redirects_must_stay_on_https_allowed_hosts_and_be_few() {
        let allowed = reqwest::Url::parse(&format!("https://{HOST}/cdn/a.zip")).unwrap();
        assert!(redirect_allowed(&allowed, 1, &hosts()).is_ok());
        assert!(redirect_allowed(&allowed, 3, &hosts()).is_ok());
        assert!(redirect_allowed(&allowed, 4, &hosts()).is_err());
        let other = reqwest::Url::parse("https://evil.example.test/a.zip").unwrap();
        assert!(redirect_allowed(&other, 1, &hosts()).is_err());
        let plain = reqwest::Url::parse(&format!("http://{HOST}/a.zip")).unwrap();
        assert!(redirect_allowed(&plain, 1, &hosts()).is_err());
    }

    fn digest_of(bytes: &[u8]) -> String {
        hex_digest(&Sha256::digest(bytes))
    }

    fn far_deadline() -> Instant {
        Instant::now() + Duration::from_secs(60)
    }

    #[test]
    fn streams_exact_package_and_hashes_it() {
        let root = temp_root("stream-ok");
        let destination = root.join("package.zip");
        let data: Vec<u8> = (0..200_000_u32).map(|value| (value % 251) as u8).collect();
        let cancel = AtomicBool::new(false);
        let mut seen = Vec::new();
        let digest = stream_to_file(
            Cursor::new(data.clone()),
            &destination,
            data.len() as u64,
            &cancel,
            far_deadline(),
            &mut |received| seen.push(received),
        )
        .unwrap();
        assert_eq!(digest, digest_of(&data));
        assert!(digest_matches(&digest, &digest.to_ascii_uppercase()));
        assert!(!digest_matches(&digest, SHA));
        assert_eq!(fs::read(&destination).unwrap(), data);
        assert!(seen.windows(2).all(|pair| pair[0] < pair[1]));
        assert_eq!(seen.last().copied(), Some(data.len() as u64));
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn short_long_and_cancelled_downloads_leave_no_partial_file() {
        let root = temp_root("stream-fail");
        let destination = root.join("package.zip");
        let cancel = AtomicBool::new(false);

        let short = stream_to_file(
            Cursor::new(vec![1_u8; 10]),
            &destination,
            11,
            &cancel,
            far_deadline(),
            &mut |_| {},
        );
        assert!(matches!(short, Err(StreamError::Failed(_))));
        assert!(!destination.exists());

        struct Endless<'a>(&'a Cell<u64>);
        impl Read for Endless<'_> {
            fn read(&mut self, buffer: &mut [u8]) -> std::io::Result<usize> {
                buffer.fill(7);
                self.0.set(self.0.get() + buffer.len() as u64);
                Ok(buffer.len())
            }
        }
        let pulled = Cell::new(0);
        let long = stream_to_file(
            Endless(&pulled),
            &destination,
            100,
            &cancel,
            far_deadline(),
            &mut |_| {},
        );
        assert!(matches!(long, Err(StreamError::Failed(_))));
        assert!(!destination.exists());

        let flag = AtomicBool::new(false);
        struct CancelAfter<'a> {
            flag: &'a AtomicBool,
            reads: u32,
        }
        impl Read for CancelAfter<'_> {
            fn read(&mut self, buffer: &mut [u8]) -> std::io::Result<usize> {
                self.reads += 1;
                if self.reads == 2 {
                    self.flag.store(true, Ordering::SeqCst);
                }
                let size = buffer.len().min(1024);
                buffer[..size].fill(3);
                Ok(size)
            }
        }
        let cancelled = stream_to_file(
            CancelAfter {
                flag: &flag,
                reads: 0,
            },
            &destination,
            1024 * 1024,
            &flag,
            far_deadline(),
            &mut |_| {},
        );
        assert_eq!(cancelled, Err(StreamError::Cancelled));
        assert!(!destination.exists());

        let expired = stream_to_file(
            Cursor::new(vec![1_u8; 10]),
            &destination,
            10,
            &cancel,
            Instant::now(),
            &mut |_| {},
        );
        assert!(matches!(expired, Err(StreamError::Failed(_))));
        assert!(!destination.exists());

        fs::write(&destination, b"existing").unwrap();
        let existing = stream_to_file(
            Cursor::new(vec![1_u8; 10]),
            &destination,
            10,
            &cancel,
            far_deadline(),
            &mut |_| {},
        );
        assert!(matches!(existing, Err(StreamError::Failed(_))));
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn long_download_is_cut_at_size_plus_one() {
        let root = temp_root("stream-long");
        let destination = root.join("package.zip");
        let cancel = AtomicBool::new(false);
        struct Counting<'a>(&'a Cell<u64>);
        impl Read for Counting<'_> {
            fn read(&mut self, buffer: &mut [u8]) -> std::io::Result<usize> {
                buffer.fill(1);
                self.0.set(self.0.get() + buffer.len() as u64);
                Ok(buffer.len())
            }
        }
        let pulled = Cell::new(0);
        let mut last = 0;
        let result = stream_to_file(
            Counting(&pulled),
            &destination,
            100,
            &cancel,
            far_deadline(),
            &mut |received| last = received,
        );
        assert!(matches!(result, Err(StreamError::Failed(_))));
        assert_eq!(
            pulled.get(),
            101,
            "take() asks the reader for size + 1 bytes"
        );
        assert!(last <= 100);
        assert!(!destination.exists());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn progress_throttle_limits_rate_and_always_emits_first_and_last() {
        let start = Instant::now();
        let mut throttle = ProgressThrottle::new();
        let total = 10 * 1024 * 1024;
        assert!(throttle.should_emit(start, 0, total));
        assert!(!throttle.should_emit(start + Duration::from_millis(100), 5 * 1024 * 1024, total));
        assert!(!throttle.should_emit(start + Duration::from_millis(300), 1000, total));
        assert!(throttle.should_emit(start + Duration::from_millis(300), 2 * 1024 * 1024, total));
        assert!(throttle.should_emit(
            start + Duration::from_millis(1400),
            2 * 1024 * 1024 + 10,
            total
        ));
        assert!(throttle.should_emit(start + Duration::from_millis(1401), total, total));
        assert!(!throttle.should_emit(start + Duration::from_millis(1402), total, total));
    }

    fn listing(names: &[&str], uncompressed_bytes: u64) -> ZipListing {
        ZipListing {
            names: names.iter().map(|name| name.to_string()).collect(),
            entries: names.len() as u64,
            uncompressed_bytes,
        }
    }

    #[test]
    fn zip_listing_requires_one_app_root_and_safe_paths() {
        let ok = listing(
            &[
                "Claude.app/",
                "Claude.app/Contents/",
                "Claude.app/Contents/Info.plist",
            ],
            1000,
        );
        assert_eq!(validate_zip_listing(&ok, 1000).unwrap(), "Claude.app");
        let rejected = [
            listing(&["Claude.app/", "Claude.app/../evil"], 10),
            listing(&["Claude.app/", "../evil"], 10),
            listing(&["/Claude.app/Contents"], 10),
            listing(&["Claude.app/", "__MACOSX/Claude.app/._x"], 10),
            listing(&["Claude.app/", "Other.app/"], 10),
            listing(&["Claude.app"], 10),
            listing(&["Folder/", "Folder/file"], 10),
            listing(&["Claude.app/", "Claude.app/a\\b"], 10),
            listing(&[], 0),
        ];
        for (index, case) in rejected.iter().enumerate() {
            assert!(validate_zip_listing(case, 1000).is_err(), "case {index}");
        }
    }

    #[test]
    fn zip_listing_rejects_too_many_entries_and_bombs() {
        let mut many = listing(&["Claude.app/"], 10);
        many.entries = MAX_ZIP_ENTRIES + 1;
        assert!(validate_zip_listing(&many, 1000).is_err());
        let names: Vec<String> = (0..=MAX_ZIP_ENTRIES)
            .map(|index| format!("Claude.app/{index}"))
            .collect();
        let huge = ZipListing {
            entries: names.len() as u64,
            names,
            uncompressed_bytes: 10,
        };
        assert!(validate_zip_listing(&huge, 1000).is_err());
        assert!(validate_zip_listing(&listing(&["Claude.app/"], 8_001), 1000).is_err());
        assert!(validate_zip_listing(&listing(&["Claude.app/"], 8_000), 1000).is_ok());
        assert!(validate_zip_listing(
            &listing(&["Claude.app/"], MAX_UNCOMPRESSED_BYTES + 1),
            MAX_PACKAGE_BYTES
        )
        .is_err());
        let mut incoherent = listing(&["Claude.app/", "Claude.app/a"], 10);
        incoherent.entries = 1;
        assert!(validate_zip_listing(&incoherent, 1000).is_err());
    }

    #[test]
    fn parses_zipinfo_totals_line() {
        assert_eq!(
            parse_zipinfo_totals(
                "5202 files, 946123456 bytes uncompressed, 378072300 bytes compressed:  60.0%\n"
            ),
            Some((5202, 946_123_456))
        );
        assert_eq!(
            parse_zipinfo_totals("1 file, 12 bytes uncompressed, 10 bytes compressed:  16.7%"),
            Some((1, 12))
        );
        assert_eq!(parse_zipinfo_totals("Empty zipfile."), None);
        assert_eq!(parse_zipinfo_totals(""), None);
    }

    /// Herramientas falsas: firma, requisito, equipo, Gatekeeper e Info.plist viven en archivos `fake-*` del
    /// propio bundle de prueba, así que viajan con él en los intercambios.
    #[derive(Default)]
    struct FakeTools {
        listing: Option<ZipListing>,
        extract_from: Option<PathBuf>,
    }

    fn fake_value(bundle: &Path, name: &str) -> Option<String> {
        fs::read_to_string(bundle.join("Contents").join(format!("fake-{name}"))).ok()
    }

    impl MacosTools for FakeTools {
        fn list_zip(&self, _archive: &Path) -> Result<ZipListing, String> {
            self.listing.clone().ok_or_else(|| "no listing".to_string())
        }

        fn extract_zip(&self, _archive: &Path, destination: &Path) -> Result<(), String> {
            let source = self.extract_from.as_ref().ok_or("no fixture")?;
            copy_tree(source, &destination.join(source.file_name().unwrap()));
            Ok(())
        }

        fn designated_requirement(&self, bundle: &Path) -> Result<String, String> {
            fake_value(bundle, "requirement").ok_or_else(|| "no requirement".to_string())
        }

        fn verify_signature(
            &self,
            bundle: &Path,
            requirement: Option<&str>,
            _deep: bool,
        ) -> Result<(), String> {
            let actual = fake_value(bundle, "requirement").ok_or("unsigned")?;
            if requirement.is_some_and(|required| required != actual) {
                return Err("requirement not satisfied".to_string());
            }
            Ok(())
        }

        fn team_identifier(&self, bundle: &Path) -> Option<String> {
            fake_value(bundle, "team")
        }

        fn assess_gatekeeper(&self, bundle: &Path) -> Result<(), String> {
            fake_value(bundle, "gatekeeper")
                .map(|_| ())
                .ok_or_else(|| "rejected".to_string())
        }

        fn bundle_value(&self, bundle: &Path, key: &str) -> Option<String> {
            fake_value(bundle, key)
        }
    }

    fn copy_tree(source: &Path, destination: &Path) {
        fs::create_dir_all(destination).unwrap();
        for entry in fs::read_dir(source).unwrap() {
            let entry = entry.unwrap();
            let target = destination.join(entry.file_name());
            let file_type = entry.file_type().unwrap();
            if file_type.is_dir() {
                copy_tree(&entry.path(), &target);
            } else if file_type.is_symlink() {
                #[cfg(unix)]
                std::os::unix::fs::symlink(fs::read_link(entry.path()).unwrap(), &target).unwrap();
            } else {
                fs::copy(entry.path(), &target).unwrap();
            }
        }
    }

    struct FakeBundle<'a> {
        id: &'a str,
        version: &'a str,
        team: Option<&'a str>,
        requirement: Option<&'a str>,
        gatekeeper: bool,
    }

    const REQUIREMENT: &str = "identifier \"com.example.fixture\" and anchor apple generic";

    fn signed(version: &str) -> FakeBundle<'_> {
        FakeBundle {
            id: "com.example.fixture",
            version,
            team: Some("TEAM123456"),
            requirement: Some(REQUIREMENT),
            gatekeeper: true,
        }
    }

    fn write_fake_bundle(path: &Path, bundle: &FakeBundle<'_>) {
        let contents = path.join("Contents");
        fs::create_dir_all(contents.join("MacOS")).unwrap();
        fs::write(contents.join("MacOS/Claude"), b"#!/bin/sh\n").unwrap();
        fs::write(contents.join("fake-CFBundleIdentifier"), bundle.id).unwrap();
        fs::write(
            contents.join("fake-CFBundleShortVersionString"),
            bundle.version,
        )
        .unwrap();
        if let Some(team) = bundle.team {
            fs::write(contents.join("fake-team"), team).unwrap();
        }
        if let Some(requirement) = bundle.requirement {
            fs::write(contents.join("fake-requirement"), requirement).unwrap();
        }
        if bundle.gatekeeper {
            fs::write(contents.join("fake-gatekeeper"), "ok").unwrap();
        }
    }

    #[test]
    fn parses_designated_requirement_and_ignores_implicit_ones() {
        assert_eq!(
            parse_designated_requirement(
                "designated => identifier \"com.example\" and anchor apple generic /* exists */\n"
            )
            .as_deref(),
            Some("identifier \"com.example\" and anchor apple generic /* exists */")
        );
        assert_eq!(
            parse_designated_requirement("# designated => cdhash H\"00\"\n"),
            None
        );
        assert_eq!(parse_designated_requirement(""), None);
    }

    #[test]
    fn fake_tools_read_identity_from_the_fixture() {
        let root = temp_root("fake-tools");
        let bundle = root.join("Claude.app");
        write_fake_bundle(&bundle, &signed("1.0.0"));
        let tools = FakeTools::default();
        assert_eq!(
            tools.verify_signature(&bundle, Some(REQUIREMENT), true),
            Ok(())
        );
        assert!(tools
            .verify_signature(&bundle, Some("other"), true)
            .is_err());
        assert_eq!(
            tools.team_identifier(&bundle).as_deref(),
            Some("TEAM123456")
        );
        assert_eq!(
            tools
                .bundle_value(&bundle, "CFBundleShortVersionString")
                .as_deref(),
            Some("1.0.0")
        );
        fs::remove_dir_all(root).unwrap();
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn system_tools_handle_a_real_ditto_zip_of_a_minimal_bundle() {
        let root = temp_root("ditto-zip");
        let bundle = root.join("source/Fixture.app");
        let contents = bundle.join("Contents");
        fs::create_dir_all(contents.join("MacOS")).unwrap();
        fs::create_dir_all(contents.join("Resources/data-v1")).unwrap();
        fs::write(contents.join("Resources/data-v1/value.txt"), b"fixture").unwrap();
        std::os::unix::fs::symlink("data-v1", contents.join("Resources/current")).unwrap();
        fs::write(contents.join("MacOS/Claude"), b"#!/bin/sh\nexit 0\n").unwrap();
        fs::write(
            contents.join("Info.plist"),
            br#"<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict>
<key>CFBundleExecutable</key><string>Claude</string>
<key>CFBundleIdentifier</key><string>com.example.codeai.fixture</string>
<key>CFBundleShortVersionString</key><string>1.2.0</string>
</dict></plist>
"#,
        )
        .unwrap();
        let status = Command::new("/bin/chmod")
            .arg("755")
            .arg(contents.join("MacOS/Claude"))
            .status()
            .unwrap();
        assert!(status.success());
        let signed = Command::new("/usr/bin/codesign")
            .args(["--force", "--sign", "-"])
            .arg(&bundle)
            .output()
            .unwrap();
        assert!(
            signed.status.success(),
            "{}",
            String::from_utf8_lossy(&signed.stderr)
        );
        let archive = root.join("package.zip");
        let zipped = Command::new("/usr/bin/ditto")
            .args(["-c", "-k", "--keepParent"])
            .arg(&bundle)
            .arg(&archive)
            .status()
            .unwrap();
        assert!(zipped.success());

        let tools = SystemMacosTools;
        let listing = tools.list_zip(&archive).unwrap();
        assert_eq!(listing.entries, listing.names.len() as u64);
        let package_size = fs::metadata(&archive).unwrap().len();
        assert_eq!(
            validate_zip_listing(&listing, package_size).unwrap(),
            "Fixture.app"
        );
        let staged = root.join("staged");
        fs::create_dir_all(&staged).unwrap();
        tools.extract_zip(&archive, &staged).unwrap();
        let extracted = staged.join("Fixture.app");
        assert_eq!(check_symlinks_within(&extracted), Ok(()));
        assert_eq!(tools.verify_signature(&extracted, None, true), Ok(()));
        assert!(tools
            .verify_signature(&extracted, Some("identifier \"com.example.other\""), true)
            .is_err());
        assert!(
            tools.designated_requirement(&extracted).is_err(),
            "ad hoc has no explicit DR"
        );
        assert_eq!(tools.team_identifier(&extracted), None);
        assert_eq!(
            tools
                .bundle_value(&extracted, "CFBundleIdentifier")
                .as_deref(),
            Some("com.example.codeai.fixture")
        );
        assert_eq!(
            tools
                .bundle_value(&extracted, "CFBundleShortVersionString")
                .as_deref(),
            Some("1.2.0")
        );
        assert!(tools.list_zip(&root.join("missing.zip")).is_err());
        fs::remove_dir_all(root).unwrap();
    }

    fn installed_identity() -> InstalledIdentity {
        InstalledIdentity {
            requirement: REQUIREMENT.to_string(),
            team: "TEAM123456".to_string(),
            bundle_id: "com.example.fixture".to_string(),
            version: "1.0.0".to_string(),
        }
    }

    fn package(version: &str) -> FeedPackage {
        FeedPackage {
            version: version.to_string(),
            url: reqwest::Url::parse(&format!("https://{HOST}/a.zip")).unwrap(),
            sha256: SHA.to_string(),
            size: 10,
        }
    }

    fn version_of(bundle: &Path) -> String {
        fake_value(bundle, "CFBundleShortVersionString").unwrap()
    }

    #[test]
    fn reads_installed_identity_and_requires_a_team() {
        let root = temp_root("installed-identity");
        let bundle = root.join("Claude.app");
        write_fake_bundle(&bundle, &signed("1.0.0"));
        assert_eq!(
            read_installed_identity(&FakeTools::default(), &bundle),
            Ok(installed_identity())
        );
        let teamless = root.join("Teamless.app");
        write_fake_bundle(
            &teamless,
            &FakeBundle {
                team: None,
                ..signed("1.0.0")
            },
        );
        assert!(read_installed_identity(&FakeTools::default(), &teamless).is_err());
        let unsigned = root.join("Unsigned.app");
        write_fake_bundle(
            &unsigned,
            &FakeBundle {
                requirement: None,
                ..signed("1.0.0")
            },
        );
        assert!(read_installed_identity(&FakeTools::default(), &unsigned).is_err());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn expected_version_must_match_feed_and_be_newer() {
        assert_eq!(
            check_expected_version(&package("1.5.0"), "1.5.0", "1.0.0"),
            Ok(())
        );
        assert!(check_expected_version(&package("1.6.0"), "1.5.0", "1.0.0").is_err());
        assert!(check_expected_version(&package("1.5.0"), "1.5.0", "1.5.0").is_err());
        assert!(check_expected_version(&package("1.5.0"), "1.5.0", "2.0.0").is_err());
    }

    #[test]
    fn verifies_staged_app_against_installed_identity() {
        let root = temp_root("verify-staged");
        let tools = FakeTools::default();
        let installed = installed_identity();
        let check = |name: &str, bundle: FakeBundle<'_>, feed_version: &str| {
            let path = root.join(format!("{name}.app"));
            write_fake_bundle(&path, &bundle);
            verify_staged_app(&tools, &path, &installed, &package(feed_version))
        };
        assert_eq!(check("ok", signed("1.5.0"), "1.5.0"), Ok(()));
        let failures = [
            check(
                "requirement",
                FakeBundle {
                    requirement: Some("identifier \"evil\""),
                    ..signed("1.5.0")
                },
                "1.5.0",
            ),
            check(
                "unsigned",
                FakeBundle {
                    requirement: None,
                    ..signed("1.5.0")
                },
                "1.5.0",
            ),
            check(
                "team",
                FakeBundle {
                    team: Some("OTHERTEAM1"),
                    ..signed("1.5.0")
                },
                "1.5.0",
            ),
            check(
                "noteam",
                FakeBundle {
                    team: None,
                    ..signed("1.5.0")
                },
                "1.5.0",
            ),
            check(
                "gatekeeper",
                FakeBundle {
                    gatekeeper: false,
                    ..signed("1.5.0")
                },
                "1.5.0",
            ),
            check(
                "bundle-id",
                FakeBundle {
                    id: "com.example.other",
                    ..signed("1.5.0")
                },
                "1.5.0",
            ),
            check("version", signed("1.4.9"), "1.5.0"),
            check("older", signed("0.9.0"), "0.9.0"),
            check("same", signed("1.0.0"), "1.0.0"),
        ];
        for (index, failure) in failures.iter().enumerate() {
            assert!(failure.is_err(), "case {index}");
        }
        fs::remove_dir_all(root).unwrap();
    }

    struct InstallFixture {
        root: PathBuf,
        destination: PathBuf,
        operation: OperationDir,
        staged: PathBuf,
    }

    fn install_fixture(case: &str, staged_bundle: FakeBundle<'_>) -> InstallFixture {
        let root = temp_root(case);
        let destination = root.join("Applications/Claude.app");
        write_fake_bundle(&destination, &signed("1.0.0"));
        fs::write(destination.join("Contents/marker"), b"old").unwrap();
        let operation = OperationDir::beside(&destination, "Claude").unwrap();
        let staged = operation.path().join("staged/Claude.app");
        write_fake_bundle(&staged, &staged_bundle);
        InstallFixture {
            root,
            destination,
            operation,
            staged,
        }
    }

    #[test]
    fn installs_staged_app_and_cleans_the_operation() {
        let fixture = install_fixture("install-ok", signed("1.5.0"));
        let operation_path = fixture.operation.path().to_path_buf();
        #[cfg(unix)]
        assert_eq!(
            fs::metadata(&operation_path).unwrap().permissions().mode() & 0o777,
            0o700
        );
        install_staged_app(
            &FakeTools::default(),
            &fixture.staged,
            &fixture.destination,
            &operation_path,
            &installed_identity(),
            &package("1.5.0"),
            "Claude",
            &|_| false,
        )
        .unwrap();
        assert_eq!(version_of(&fixture.destination), "1.5.0");
        assert!(!fixture.destination.join("Contents/marker").exists());
        drop(fixture.operation);
        assert!(!operation_path.exists());
        assert!(fixture.destination.is_dir());
        fs::remove_dir_all(fixture.root).unwrap();
    }

    #[test]
    fn failed_final_check_restores_the_previous_version() {
        // Passes the pre-swap checks in the fixture but carries the wrong version for the feed.
        let fixture = install_fixture("install-rollback", signed("1.4.0"));
        let operation_path = fixture.operation.path().to_path_buf();
        let result = install_staged_app(
            &FakeTools::default(),
            &fixture.staged,
            &fixture.destination,
            &operation_path,
            &installed_identity(),
            &package("1.5.0"),
            "Claude",
            &|_| false,
        );
        assert!(
            matches!(result, Err(InstallError::Restored(ref message)) if message.ends_with("Se restauró la versión anterior."))
        );
        assert_eq!(version_of(&fixture.destination), "1.0.0");
        assert!(fixture.destination.join("Contents/marker").exists());
        drop(fixture.operation);
        assert!(!operation_path.exists());
        fs::remove_dir_all(fixture.root).unwrap();
    }

    #[test]
    fn running_original_is_never_touched() {
        let fixture = install_fixture("install-running", signed("1.5.0"));
        let operation_path = fixture.operation.path().to_path_buf();
        let checked = Cell::new(false);
        let result = install_staged_app(
            &FakeTools::default(),
            &fixture.staged,
            &fixture.destination,
            &operation_path,
            &installed_identity(),
            &package("1.5.0"),
            "Claude",
            &|path| {
                checked.set(path == fixture.destination);
                true
            },
        );
        assert_eq!(
            result,
            Err(InstallError::Unchanged(
                "Cierra Claude para actualizarla.".to_string()
            ))
        );
        assert!(checked.get());
        assert_eq!(version_of(&fixture.destination), "1.0.0");
        assert_eq!(version_of(&fixture.staged), "1.5.0");
        drop(fixture.operation);
        fs::remove_dir_all(fixture.root).unwrap();
    }

    #[test]
    fn fallback_swap_keeps_previous_and_can_be_undone() {
        let fixture = install_fixture("swap-fallback", signed("1.5.0"));
        let operation_path = fixture.operation.path().to_path_buf();
        let outcome = swap_bundles_with(
            &fixture.staged,
            &fixture.destination,
            &operation_path.join("previous"),
            false,
        )
        .unwrap();
        let backup = operation_path.join("previous/Claude.app");
        assert_eq!(
            outcome,
            SwapOutcome::Moved {
                backup: backup.clone()
            }
        );
        assert_eq!(version_of(&fixture.destination), "1.5.0");
        assert_eq!(version_of(&backup), "1.0.0");
        unswap_bundles(
            &outcome,
            &fixture.staged,
            &fixture.destination,
            &operation_path,
        )
        .unwrap();
        assert_eq!(version_of(&fixture.destination), "1.0.0");
        assert_eq!(version_of(&operation_path.join("failed")), "1.5.0");
        drop(fixture.operation);
        assert!(!operation_path.exists());
        fs::remove_dir_all(fixture.root).unwrap();
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn rename_swap_exchanges_both_bundles_atomically() {
        let fixture = install_fixture("swap-exchange", signed("1.5.0"));
        let operation_path = fixture.operation.path().to_path_buf();
        let outcome = swap_bundles(
            &fixture.staged,
            &fixture.destination,
            &operation_path.join("previous"),
        )
        .unwrap();
        assert_eq!(outcome, SwapOutcome::Exchanged);
        assert_eq!(version_of(&fixture.destination), "1.5.0");
        assert_eq!(version_of(&fixture.staged), "1.0.0");
        unswap_bundles(
            &outcome,
            &fixture.staged,
            &fixture.destination,
            &operation_path,
        )
        .unwrap();
        assert_eq!(version_of(&fixture.destination), "1.0.0");
        drop(fixture.operation);
        fs::remove_dir_all(fixture.root).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn read_only_parent_fails_with_permission_message_before_anything_else() {
        let root = temp_root("readonly-parent");
        let applications = root.join("Applications");
        let destination = applications.join("Claude.app");
        write_fake_bundle(&destination, &signed("1.0.0"));
        fs::set_permissions(&applications, fs::Permissions::from_mode(0o555)).unwrap();
        let result = OperationDir::beside(&destination, "Claude");
        fs::set_permissions(&applications, fs::Permissions::from_mode(0o755)).unwrap();
        let error = result.err().unwrap();
        assert!(
            error.starts_with("No hay permiso para escribir en"),
            "{error}"
        );
        assert!(error.contains("«Abrir Claude»"));
        assert_eq!(fs::read_dir(&applications).unwrap().count(), 1);
        fs::remove_dir_all(root).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn recovery_restores_previous_and_ignores_foreign_entries() {
        use std::os::unix::fs::symlink;
        let root = temp_root("recovery");
        let applications = root.join("Applications");
        let installation = applications.join("Claude.app");
        let staging = root.join("original-update");
        fs::create_dir_all(&staging).unwrap();

        // Interrupted fallback swap: the original was moved to previous/ and never replaced.
        let interrupted = applications.join(operation_dir_name(Uuid::new_v4()));
        write_fake_bundle(&interrupted.join("previous/Claude.app"), &signed("1.0.0"));
        // Foreign names and a symlink with a valid name are never touched.
        let foreign = applications.join(".code-ai-profiles-original-not-a-uuid");
        fs::create_dir_all(&foreign).unwrap();
        let uppercase = applications.join(format!(
            "{OPERATION_PREFIX}{}",
            Uuid::new_v4().hyphenated().to_string().to_uppercase()
        ));
        fs::create_dir_all(&uppercase).unwrap();
        let elsewhere = root.join("elsewhere");
        fs::create_dir_all(&elsewhere).unwrap();
        let linked = applications.join(operation_dir_name(Uuid::new_v4()));
        symlink(&elsewhere, &linked).unwrap();
        // A failed rollback is kept for a person to decide.
        let kept = applications.join(operation_dir_name(Uuid::new_v4()));
        fs::create_dir_all(&kept).unwrap();
        fs::write(kept.join(ROLLBACK_FAILED_MARKER), b"").unwrap();
        // Downloads: UUID folders go, anything else stays.
        let download = staging.join(Uuid::new_v4().hyphenated().to_string());
        fs::create_dir_all(&download).unwrap();
        fs::write(download.join("package.zip"), b"zip").unwrap();
        let stray = staging.join("keep-me");
        fs::create_dir_all(&stray).unwrap();

        recover_leftovers_in(&[installation.clone()], &staging);

        assert_eq!(version_of(&installation), "1.0.0");
        assert!(!interrupted.exists());
        assert!(foreign.exists());
        assert!(uppercase.exists());
        assert!(fs::symlink_metadata(&linked)
            .unwrap()
            .file_type()
            .is_symlink());
        assert!(elsewhere.exists());
        assert!(kept.exists());
        assert!(!download.exists());
        assert!(stray.exists());

        // Installed and nothing to restore: the leftover is just removed.
        let finished = applications.join(operation_dir_name(Uuid::new_v4()));
        write_fake_bundle(&finished.join("staged/Claude.app"), &signed("0.9.0"));
        recover_leftovers_in(&[installation.clone()], &staging);
        assert!(!finished.exists());
        assert_eq!(version_of(&installation), "1.0.0");
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn recovery_skips_operations_owned_by_a_live_process() {
        let root = temp_root("recovery-live");
        let installation = root.join("Applications/Claude.app");
        write_fake_bundle(&installation, &signed("1.0.0"));
        let live = OperationDir::beside(&installation, "Claude").unwrap();
        let live_staging = OperationDir::staging(&root.join("original-update")).unwrap();
        recover_leftovers_in(&[installation.clone()], &root.join("original-update"));
        assert!(live.path().exists());
        assert!(live_staging.path().exists());
        let (live_path, staging_path) =
            (live.path().to_path_buf(), live_staging.path().to_path_buf());
        drop(live);
        drop(live_staging);
        assert!(!live_path.exists());
        assert!(!staging_path.exists());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn single_flight_and_cancellation_rules() {
        assert!(!original_update_in_flight());
        assert!(
            !cancel_original_update(),
            "nothing to cancel without a flight"
        );
        let flight = begin_flight().unwrap();
        assert!(original_update_in_flight());
        assert_eq!(
            begin_flight().err().as_deref(),
            Some("Ya hay una actualización de la original en curso.")
        );
        assert!(!flight.cancelled());
        assert!(cancel_original_update());
        assert!(flight.cancelled());
        assert!(
            !flight.enter_uncancellable(),
            "a cancelled flight never installs"
        );
        drop(flight);
        assert!(!original_update_in_flight());

        let flight = begin_flight().unwrap();
        assert!(flight.enter_uncancellable());
        assert!(!cancel_original_update(), "installing is not cancellable");
        assert!(!flight.cancelled());
        drop(flight);
        assert!(!original_update_in_flight());
        assert!(!cancel_original_update());
    }

    #[test]
    fn source_update_cache_reports_current_after_installing() {
        let root = temp_root("installed-cache");
        let paths = crate::tests::test_managed_paths(&root);
        let checked_at = Utc::now().timestamp_millis();
        save_source_update_cache(
            &paths,
            "macos",
            "1.5.0",
            &installed_update_info("1.5.0", checked_at),
        )
        .unwrap();
        let cached =
            read_source_update_cache(&paths, "macos", "1.5.0", UPDATE_CACHE_FRESH_MS).unwrap();
        assert_eq!(cached.status, SourceUpdateStatus::Current);
        assert_eq!(cached.latest_version.as_deref(), Some("1.5.0"));
        assert_eq!(cached.checked_at, Some(checked_at));
        assert_eq!(cached.source, Some(SourceUpdateSource::OfficialFeed));
        assert!(
            read_source_update_cache(&paths, "macos", "1.0.0", UPDATE_CACHE_FRESH_MS).is_none()
        );
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn space_check_counts_download_and_staging_and_sums_on_one_volume() {
        let size = 1_000_000_000;
        let download = size + DOWNLOAD_SPACE_MARGIN;
        let install = 3 * size + INSTALL_SPACE_MARGIN;
        assert_eq!(check_space(download, install, false, size), Ok(()));
        assert!(check_space(download - 1, install, false, size).is_err());
        assert!(check_space(download, install - 1, false, size).is_err());
        assert!(check_space(0, download + install, true, size).is_ok());
        assert!(check_space(u64::MAX, download + install - 1, true, size).is_err());
        let message = check_space(0, 0, true, size).unwrap_err();
        assert!(
            message.starts_with("No hay espacio suficiente"),
            "{message}"
        );
    }

    #[test]
    fn destination_must_be_a_plain_bundle_outside_the_instances() {
        let root = temp_root("destination");
        let instances = root.join("managed-instances");
        fs::create_dir_all(&instances).unwrap();
        let original = root.join("Applications/Claude.app");
        write_fake_bundle(&original, &signed("1.0.0"));
        assert_eq!(
            prepare_destination(&original, &instances, "Claude").unwrap(),
            fs::canonicalize(&original).unwrap()
        );
        let inside = instances.join("Claude.app");
        write_fake_bundle(&inside, &signed("1.0.0"));
        assert!(prepare_destination(&inside, &instances, "Claude").is_err());
        let not_a_bundle = root.join("Applications/Other");
        fs::create_dir_all(&not_a_bundle).unwrap();
        assert!(prepare_destination(&not_a_bundle, &instances, "Claude").is_err());
        assert!(prepare_destination(&root.join("missing.app"), &instances, "Claude").is_err());
        #[cfg(unix)]
        {
            let link = root.join("Link.app");
            std::os::unix::fs::symlink(&original, &link).unwrap();
            let error = prepare_destination(&link, &instances, "Claude").unwrap_err();
            assert!(error.contains("«Abrir Claude»"), "{error}");
        }
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn stale_instances_split_into_stopped_targets_and_running_pending() {
        let root = temp_root("split-stale");
        let mut stopped = crate::tests::test_instance(&root);
        stopped.status = InstanceStatus::Stopped;
        let mut running = crate::tests::test_instance(&root);
        running.status = InstanceStatus::Running;
        let mut missing = crate::tests::test_instance(&root);
        missing.status = InstanceStatus::Missing;
        let current = crate::tests::test_instance(&root);
        let registry = Registry {
            version: REGISTRY_VERSION,
            instances: vec![stopped.clone(), running.clone(), missing.clone(), current],
        };
        let topology = VersionTopology {
            latest_installed_version: Some("1.5.0".to_string()),
            latest_source: None,
            stale_instance_ids: vec![
                stopped.id.clone(),
                running.id.clone(),
                missing.id.clone(),
                "deleted".to_string(),
            ],
            original_behind: false,
            can_synchronize_managed: true,
            reason: None,
        };
        assert_eq!(
            split_stale_instances(&topology, &registry),
            (vec![stopped.id], vec![running.id])
        );
        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn errors_before_the_swap_say_the_original_did_not_change() {
        assert_eq!(
            unchanged("Sin red.".to_string()),
            "Sin red. La original no cambió."
        );
        assert_eq!(
            unchanged("Algo. La original no cambió.".to_string()),
            "Algo. La original no cambió."
        );
    }

    #[test]
    fn progress_serializes_with_the_ipc_contract() {
        let value = serde_json::to_value(progress_for(
            OriginalInstallPhase::Downloading,
            Some(&package("1.5.0")),
            5,
            true,
        ))
        .unwrap();
        assert_eq!(
            value,
            serde_json::json!({
                "phase": "downloading",
                "targetVersion": "1.5.0",
                "receivedBytes": 5,
                "totalBytes": 10,
                "cancellable": true
            })
        );
        let outcome = cancelled_outcome(Some("1.0.0".to_string()));
        assert_eq!(outcome.status, OriginalInstallStatus::Cancelled);
        assert_eq!(outcome.installed_version, None);
        assert_eq!(
            serde_json::to_value(OriginalInstallStatus::Installed).unwrap(),
            serde_json::json!("installed")
        );
        let request: InstallOriginalUpdateRequest =
            serde_json::from_value(serde_json::json!({ "expectedVersion": "1.5.0" })).unwrap();
        assert_eq!(request.expected_version, "1.5.0");
    }

    #[cfg(unix)]
    #[test]
    fn symlinks_must_stay_inside_the_bundle() {
        use std::os::unix::fs::symlink;
        let root = temp_root("symlinks");
        let bundle = root.join("Claude.app");
        let versions = bundle.join("Contents/Frameworks/F.framework/Versions");
        fs::create_dir_all(versions.join("A")).unwrap();
        fs::write(versions.join("A/F"), b"binary").unwrap();
        symlink("A", versions.join("Current")).unwrap();
        symlink(
            "Versions/Current/F",
            bundle.join("Contents/Frameworks/F.framework/F"),
        )
        .unwrap();
        assert_eq!(check_symlinks_within(&bundle), Ok(()));

        let absolute = bundle.join("Contents/absolute");
        symlink("/etc/hosts", &absolute).unwrap();
        assert!(check_symlinks_within(&bundle).is_err());
        fs::remove_file(&absolute).unwrap();

        let escaping = bundle.join("Contents/escape");
        symlink("../../outside", &escaping).unwrap();
        fs::write(root.join("outside"), b"x").unwrap();
        assert!(check_symlinks_within(&bundle).is_err());
        fs::remove_file(&escaping).unwrap();

        // Contents/up -> .. is the bundle root (allowed), so Contents/sneaky -> up/../outside reads as
        // Contents/outside but really resolves next to the bundle.
        let up = bundle.join("Contents/up");
        symlink("..", &up).unwrap();
        assert_eq!(check_symlinks_within(&bundle), Ok(()));
        let sneaky = bundle.join("Contents/sneaky");
        symlink("up/../outside", &sneaky).unwrap();
        assert!(check_symlinks_within(&bundle).is_err());
        fs::remove_file(&sneaky).unwrap();
        fs::remove_file(&up).unwrap();

        let broken = bundle.join("Contents/broken");
        symlink("missing", &broken).unwrap();
        assert!(check_symlinks_within(&bundle).is_err());
        fs::remove_file(&broken).unwrap();

        let link_root = root.join("Link.app");
        symlink(&bundle, &link_root).unwrap();
        assert!(check_symlinks_within(&link_root).is_err());

        assert_eq!(check_symlinks_within(&bundle), Ok(()));
        fs::remove_dir_all(root).unwrap();
    }
}
