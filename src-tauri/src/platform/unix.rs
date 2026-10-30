//! Lo común a macOS y Linux (y a cualquier unix): grupos de procesos y señales.

use super::*;

/// Envía la señal a los procesos ya verificados por `signal_instance_processes`. En unix, al grupo de
/// procesos cuando el PID raíz coincide; en Windows, `taskkill` por PID.
pub(crate) fn signal_verified_processes(
    identity: &ManagedProcessIdentity,
    processes: Vec<(u32, u64)>,
    force: bool,
) -> Result<(), String> {
    let signal = if force { libc::SIGKILL } else { libc::SIGTERM };
    let mut signaled = HashSet::new();
    if let Some(group_id) = identity.process_group_id.filter(|_| {
        processes.iter().any(|(pid, start_time)| {
            *pid == identity.root_pid
                && identity
                    .start_time
                    .map(|expected| expected == *start_time)
                    .unwrap_or(true)
        })
    }) {
        let result = unsafe { libc::kill(-(group_id as i32), signal) };
        if result == 0 {
            signaled.insert(identity.root_pid);
        } else {
            let error = std::io::Error::last_os_error();
            if error.raw_os_error() != Some(libc::ESRCH) {
                return Err(format!("No se pudo señalizar el grupo verificado: {error}"));
            }
        }
    }
    for (pid, _start_time) in processes {
        if signaled.contains(&pid) {
            continue;
        }
        let result = unsafe { libc::kill(pid as i32, signal) };
        if result != 0 {
            let error = std::io::Error::last_os_error();
            if error.raw_os_error() != Some(libc::ESRCH) {
                return Err(format!(
                    "No se pudo señalizar el proceso verificado: {error}"
                ));
            }
        }
    }
    Ok(())
}

/// En unix la instancia nace en su propio grupo de procesos, para señalizarla entera.
pub(crate) fn isolate_process_group(command: &mut Command) {
    use std::os::unix::process::CommandExt;
    command.process_group(0);
}

/// El grupo de procesos que `isolate_process_group` dio al proceso raíz, si la plataforma los tiene.
pub(crate) fn launched_process_group(root_pid: u32) -> Option<u32> {
    Some(root_pid)
}
