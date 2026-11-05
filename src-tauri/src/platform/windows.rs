//! Windows: `Claude.exe` en %LOCALAPPDATA% (instalador clásico) o en un paquete MSIX, PowerShell, Authenticode,
//! `robocopy` y `taskkill`.

use super::*;
use std::ffi::OsStr;
use std::os::windows::process::CommandExt;

/// Evita que Windows abra una ventana de consola por cada proceso auxiliar: la app es GUI y no hay consola que heredar.
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// Único punto donde este archivo crea un proceso hijo; todos nacen sin ventana de consola.
fn hidden_command(program: impl AsRef<OsStr>) -> Command {
    let mut command = Command::new(program);
    command.creation_flags(CREATE_NO_WINDOW);
    command
}

pub(crate) const PLATFORM_NAME: &str = "windows";

/// La aplicación compatible es una instalación compartida: no hay copias de bytes que sincronizar.
pub(crate) const SHARED_INSTALLATION: bool = false;

pub(crate) fn source_display_name(source: &Path) -> Option<String> {
    let product_name = hidden_command("powershell.exe")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            "(Get-Item -LiteralPath $args[0]).VersionInfo.ProductName",
        ])
        .arg(source)
        .output()
        .ok()
        .filter(|output| output.status.success())
        .and_then(|output| sanitize_source_name(&String::from_utf8_lossy(&output.stdout)));
    source_name_from_metadata(product_name.as_deref(), None, source)
}

/// HU-0028 · the badge comes from the resources of `Claude.exe` itself (classic installer or MSIX), read in Rust by
/// `provider_badge.rs`: no PowerShell.
pub(crate) fn provider_icon_file(source: &Path) -> Option<PathBuf> {
    source.is_file().then(|| source.to_path_buf())
}

pub(crate) fn detect_provider_source() -> Option<PathBuf> {
    classic_source().or_else(|| packaged_installation().map(|package| package.executable))
}

/// El instalador clásico (Squirrel) deja `Claude.exe` en %LOCALAPPDATA%.
fn classic_source() -> Option<PathBuf> {
    let local = env::var_os("LOCALAPPDATA").map(PathBuf::from)?;
    let candidates = [
        local.join("AnthropicClaude/Claude.exe"),
        local.join("Programs/Claude/Claude.exe"),
        local.join("Programs/claude/Claude.exe"),
        local.join("Claude/Claude.exe"),
    ];
    if let Some(found) = candidates.into_iter().find(|path| path.is_file()) {
        return Some(found);
    }

    let squirrel_root = local.join("AnthropicClaude");
    let mut versioned: Vec<PathBuf> = fs::read_dir(squirrel_root)
        .ok()?
        .flatten()
        .map(|entry| entry.path().join("Claude.exe"))
        .filter(|path| path.is_file())
        .collect();
    versioned.sort();
    versioned.pop()
}

/// Claude instalado como paquete MSIX: vive en `C:\Program Files\WindowsApps\<paquete>`, de solo lectura y con
/// una carpeta por versión, y Windows redirige lo que escribe en AppData a `%LOCALAPPDATA%\Packages\<familia>`.
#[derive(Clone)]
struct PackagedInstallation {
    executable: PathBuf,
    family: String,
}

impl PackagedInstallation {
    fn virtualized_profile(&self) -> Option<PathBuf> {
        let local = env::var_os("LOCALAPPDATA").map(PathBuf::from)?;
        Some(
            local
                .join("Packages")
                .join(&self.family)
                .join("LocalCache/Roaming/Claude"),
        )
    }
}

/// Una consulta encontrada vale 5 minutos mientras su ejecutable exista (una actualización cambia la carpeta); sin
/// paquete, 1 minuto. Así el refresco del panel no lanza PowerShell cada vez.
const PACKAGED_FOUND_TTL: Duration = Duration::from_secs(300);
const PACKAGED_MISSING_TTL: Duration = Duration::from_secs(60);

/// Solo metadatos del paquete y de su manifiesto: no lee nada de los datos de Claude.
const PACKAGED_QUERY: &str = "$p=Get-AppxPackage -Name Claude -PackageTypeFilter Main | Sort-Object {[version]$_.Version} -Descending | Select-Object -First 1; if($p){$p.PackageFamilyName; $p.InstallLocation; foreach($a in @((Get-AppxPackageManifest -Package $p.PackageFullName).Package.Applications.Application)){$a.Executable}}";

fn packaged_installation() -> Option<PackagedInstallation> {
    static CACHE: OnceLock<Mutex<Option<(Instant, Option<PackagedInstallation>)>>> =
        OnceLock::new();
    let mut cache = CACHE
        .get_or_init(|| Mutex::new(None))
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    if let Some((checked_at, cached)) = cache.as_ref() {
        let fresh = match cached {
            Some(package) => {
                checked_at.elapsed() < PACKAGED_FOUND_TTL && package.executable.is_file()
            }
            None => checked_at.elapsed() < PACKAGED_MISSING_TTL,
        };
        if fresh {
            return cached.clone();
        }
    }
    let found = query_packaged_installation();
    *cache = Some((Instant::now(), found.clone()));
    found
}

fn query_packaged_installation() -> Option<PackagedInstallation> {
    let output = hidden_command("powershell.exe")
        .args(["-NoProfile", "-NonInteractive", "-Command", PACKAGED_QUERY])
        .output()
        .ok()
        .filter(|output| output.status.success())?;
    let query = parse_packaged_query(&String::from_utf8_lossy(&output.stdout))?;
    let executable = query
        .executables
        .iter()
        .map(|relative| query.install_location.join(relative))
        .chain([
            query.install_location.join("app/Claude.exe"),
            query.install_location.join("Claude.exe"),
        ])
        .find(|path| path.is_file())?;
    Some(PackagedInstallation {
        executable,
        family: query.family,
    })
}

pub(crate) fn detect_original_profile() -> Option<PathBuf> {
    if classic_source().is_none() {
        if let Some(profile) = packaged_installation()
            .and_then(|package| package.virtualized_profile())
            .filter(|path| path.is_dir())
        {
            return Some(profile);
        }
    }
    let mut candidates = Vec::new();
    if let Some(roaming) = env::var_os("APPDATA") {
        let roaming = PathBuf::from(roaming);
        candidates.push(roaming.join("Claude"));
        candidates.push(roaming.join("Anthropic Claude"));
    }
    if let Some(local) = env::var_os("LOCALAPPDATA") {
        candidates.push(PathBuf::from(local).join("Claude"));
    }
    candidates.into_iter().find(|path| path.is_dir())
}

pub(crate) fn validate_source(path: &Path) -> Result<(), String> {
    let is_compatible_executable = path
        .file_name()
        .and_then(|value| value.to_str())
        .map(|name| name.eq_ignore_ascii_case("Claude.exe"))
        .unwrap_or(false);
    if !is_compatible_executable || !path.is_file() {
        return Err(
            "La ruta no corresponde a un ejecutable válido de la aplicación compatible."
                .to_string(),
        );
    }
    Ok(())
}

pub(crate) fn source_version(source: &Path) -> Option<String> {
    let powershell = hidden_command("powershell.exe")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            "(Get-Item -LiteralPath $args[0]).VersionInfo.ProductVersion",
        ])
        .arg(source)
        .output()
        .ok()
        .filter(|output| output.status.success())
        .map(|output| String::from_utf8_lossy(&output.stdout).trim().to_string())
        .filter(|version| !version.is_empty());
    powershell.or_else(|| {
        source
            .parent()?
            .file_name()?
            .to_str()?
            .strip_prefix("app-")
            .map(str::to_string)
    })
}

pub(crate) fn provider_executable(app_path: &Path) -> PathBuf {
    app_path.to_path_buf()
}

/// Archivos cuya huella (tamaño y fecha) entra en `application_fingerprint`, además del ejecutable.
pub(crate) fn fingerprint_metadata_paths(canonical_path: &Path) -> Vec<PathBuf> {
    let parent = canonical_path.parent().unwrap_or(canonical_path);
    vec![
        canonical_path.to_path_buf(),
        parent.join("resources/app.asar"),
        parent.join("resources/app-update.yml"),
    ]
}

fn windows_signer_subject(path: &Path) -> Option<String> {
    let output = hidden_command("powershell.exe")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            "$s=Get-AuthenticodeSignature -LiteralPath $args[0]; if($s.Status -eq 'Valid' -and $s.SignerCertificate){$s.SignerCertificate.Subject}",
        ])
        .arg(path)
        .output()
        .ok()?;
    output
        .status
        .success()
        .then(|| String::from_utf8_lossy(&output.stdout).trim().to_string())
        .filter(|value| !value.is_empty())
}

pub(crate) fn validate_provider_identity_uncached(
    candidate: &Path,
    original: &Path,
) -> Result<(), String> {
    let candidate = windows_signer_subject(candidate)
        .ok_or_else(|| "La firma Authenticode de la instancia no es válida.".to_string())?;
    let original = windows_signer_subject(original)
        .ok_or_else(|| "La firma Authenticode de la original no es válida.".to_string())?;
    if candidate != original {
        return Err("El editor de la instancia no coincide con la original.".to_string());
    }
    Ok(())
}

/// Copia (o enlaza, en Linux) la aplicación compatible dentro de `application_root`, que ya existe.
pub(crate) fn copy_provider_bundle(
    source: &Path,
    application_root: &Path,
) -> Result<PathBuf, String> {
    let source_dir = source
        .parent()
        .ok_or_else(|| "El ejecutable no tiene un directorio de origen válido.".to_string())?;
    let destination = application_root.join("Claude");
    fs::create_dir_all(&destination)
        .map_err(|error| format!("No se pudo crear el destino de la aplicación: {error}"))?;
    let status = hidden_command("robocopy")
        .arg(source_dir)
        .arg(&destination)
        .args([
            "/E",
            "/COPY:DAT",
            "/DCOPY:DAT",
            "/R:2",
            "/W:1",
            "/NFL",
            "/NDL",
            "/NJH",
            "/NJS",
        ])
        .status()
        .map_err(|error| format!("No se pudo iniciar robocopy: {error}"))?;
    let code = status.code().unwrap_or(16);
    if code > 7 {
        return Err(format!(
            "No se pudo copiar la aplicación compatible (robocopy: {code})."
        ));
    }
    let executable_name = source.file_name().unwrap_or_default();
    Ok(destination.join(executable_name))
}

pub(crate) fn personalize_application_path(
    app_path: &Path,
    instance_name: &str,
) -> Result<PathBuf, String> {
    let _ = instance_name;
    Ok(app_path.to_path_buf())
}

fn process_is_alive(pid: u32) -> bool {
    let filter = format!("PID eq {pid}");
    hidden_command("tasklist")
        .args(["/FI", &filter, "/FO", "CSV", "/NH"])
        .output()
        .map(|output| {
            output.status.success()
                && String::from_utf8_lossy(&output.stdout).contains(&format!("\",\"{pid}\","))
        })
        .unwrap_or(false)
}

/// Envía la señal a los procesos ya verificados por `signal_instance_processes`. En unix, al grupo de
/// procesos cuando el PID raíz coincide; en Windows, `taskkill` por PID.
pub(crate) fn signal_verified_processes(
    _identity: &ManagedProcessIdentity,
    processes: Vec<(u32, u64)>,
    force: bool,
) -> Result<(), AppError> {
    for (pid, _start_time) in processes {
        let mut command = hidden_command("taskkill");
        command.args(["/PID", &pid.to_string(), "/T"]);
        if force {
            command.arg("/F");
        }
        let status = command.status().map_err(|error| {
            AppError::process(format!(
                "No se pudo solicitar el cierre de la aplicación: {error}"
            ))
        })?;
        if !status.success() && process_is_alive(pid) {
            return Err(AppError::process(format!(
                "Windows no pudo detener el proceso verificado {pid}."
            )));
        }
    }
    Ok(())
}

/// En unix la instancia nace en su propio grupo de procesos, para señalizarla entera.
pub(crate) fn isolate_process_group(_command: &mut Command) {}

/// El grupo de procesos que `isolate_process_group` dio al proceso raíz, si la plataforma los tiene.
pub(crate) fn launched_process_group(_root_pid: u32) -> Option<u32> {
    None
}

/// El gestor de archivos del sistema que abre `open_in_file_manager`.
pub(crate) fn file_manager_program() -> &'static str {
    "explorer.exe"
}

pub(crate) fn open_system_settings_sync(_panel: SystemSettingsPanel) -> Result<(), String> {
    Err("Esta plataforma no tiene ese panel de ajustes.".to_string())
}

pub(crate) fn account_facts_sync() -> AccountFacts {
    AccountFacts { admin: None }
}

pub(crate) fn apply_external_icon_best_effort(
    paths: &ManagedPaths,
    instance: &ManagedInstance,
    icon_path: &Path,
) -> (bool, String) {
    let _ = (paths, instance, icon_path);
    (
        false,
        "Windows conserva el icono del ejecutable firmado; el icono personalizado se muestra dentro de Code AI Profiles."
            .to_string(),
    )
}

/// Abre el canal oficial de actualización de la original (fuera de macOS).
pub(crate) fn open_update_url(url: &str) -> Result<std::process::ExitStatus, std::io::Error> {
    hidden_command("rundll32.exe")
        .args(["url.dll,FileProtocolHandler", url])
        .status()
}

/// Abre en el navegador del sistema un enlace `http`/`https` que la persona pulsó en el lector
/// (HU-0025). `url` llega ya validada y reserializada por `projects::reader::external_link`; va como
/// argumento, nunca en una cadena de shell. Distinto de `open_update_url`, que es solo del canal oficial.
pub(crate) fn open_external_url(url: &str) -> Result<(), AppError> {
    let status = hidden_command("rundll32.exe")
        .args(["url.dll,FileProtocolHandler", url])
        .status()
        .map_err(|error| {
            AppError::process(format!(
                "No se pudo abrir el enlace en el navegador: {error}"
            ))
        })?;
    if status.success() {
        Ok(())
    } else {
        Err(AppError::process(
            "No se pudo abrir el enlace en el navegador.",
        ))
    }
}
