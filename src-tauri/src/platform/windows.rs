//! Windows: `Claude.exe` en %LOCALAPPDATA%, PowerShell, Authenticode, `robocopy` y `taskkill`.

use super::*;

pub(crate) const PLATFORM_NAME: &str = "windows";

/// La aplicación compatible es una instalación compartida: no hay copias de bytes que sincronizar.
pub(crate) const SHARED_INSTALLATION: bool = false;

pub(crate) fn source_display_name(source: &Path) -> Option<String> {
    let product_name = Command::new("powershell.exe")
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

pub(crate) fn detect_provider_source() -> Option<PathBuf> {
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

pub(crate) fn detect_original_profile() -> Option<PathBuf> {
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
    let powershell = Command::new("powershell.exe")
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
    let output = Command::new("powershell.exe")
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
    let status = Command::new("robocopy")
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
    Command::new("tasklist")
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
        let mut command = Command::new("taskkill");
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
    Command::new("rundll32.exe")
        .args(["url.dll,FileProtocolHandler", url])
        .status()
}

/// Abre en el navegador del sistema un enlace `http`/`https` que la persona pulsó en el lector
/// (HU-0025). `url` llega ya validada y reserializada por `projects::reader::external_link`; va como
/// argumento, nunca en una cadena de shell. Distinto de `open_update_url`, que es solo del canal oficial.
pub(crate) fn open_external_url(url: &str) -> Result<(), AppError> {
    let status = Command::new("rundll32.exe")
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
