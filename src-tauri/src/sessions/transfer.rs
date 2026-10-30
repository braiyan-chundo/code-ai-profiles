//! Copiar, mover, devolver y desvincular una sesión entre perfiles detenidos: respaldo de la
//! transacción, índice del destino con su cuenta y organización, artefactos locales y vuelta atrás.

use super::*;

const ARTIFACT_EXPORT_MAX_FILES: usize = 256;

const ARTIFACT_EXPORT_MAX_BYTES: u64 = 256 * 1024 * 1024;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SessionTransferManifest {
    pub(crate) transfer_id: String,
    pub(crate) created_at: String,
    pub(crate) session_id: String,
    pub(crate) session_title: String,
    pub(crate) source_instance_id: String,
    pub(crate) source_instance_name: String,
    pub(crate) target_instance_id: String,
    pub(crate) target_instance_name: String,
    pub(crate) source_index: String,
    pub(crate) target_index: String,
    pub(crate) transcript: String,
    pub(crate) replaced_existing_target: bool,
    #[serde(default)]
    pub(crate) mode: SessionTransferMode,
}

#[derive(Debug, Clone)]
pub(crate) struct TransferProfile {
    pub(crate) id: String,
    pub(crate) name: String,
    pub(crate) profile_path: PathBuf,
    pub(crate) status: InstanceStatus,
}

fn resolve_transfer_profile(
    registry: &Registry,
    id: &str,
    inventory: &ProcessInventory,
) -> Result<TransferProfile, String> {
    if id == ORIGINAL_INSTANCE_ID {
        let profile_path = detect_original_profile().ok_or_else(|| {
            "No se encontró el perfil local de la aplicación original.".to_string()
        })?;
        return Ok(TransferProfile {
            id: ORIGINAL_INSTANCE_ID.to_string(),
            name: "Aplicación original".to_string(),
            profile_path,
            status: original_instance_status_with_inventory(inventory),
        });
    }

    registry
        .instances
        .iter()
        .find(|instance| instance.id == id)
        .map(|instance| TransferProfile {
            id: instance.id.clone(),
            name: instance.name.clone(),
            profile_path: PathBuf::from(&instance.profile_path),
            status: instance.status.clone(),
        })
        .ok_or_else(|| "El perfil ya no existe.".to_string())
}

fn profile_identity(profile_path: &Path) -> Result<(String, String), String> {
    let config: Value = serde_json::from_slice(
        &fs::read(profile_path.join("config.json"))
            .map_err(|_| "El perfil destino aún no tiene una cuenta iniciada.".to_string())?,
    )
    .map_err(|_| "La configuración del perfil destino no es válida.".to_string())?;
    let account_id = config
        .get("lastKnownAccountUuid")
        .and_then(Value::as_str)
        .and_then(|value| Uuid::parse_str(value).ok())
        .map(|value| value.to_string())
        .ok_or_else(|| "No se pudo identificar la cuenta del perfil destino.".to_string())?;

    let usage: Value = serde_json::from_slice(
        &fs::read(profile_path.join("plan-usage-history.json"))
            .map_err(|_| "El perfil destino todavía no expone una organización.".to_string())?,
    )
    .map_err(|_| "El historial de uso del perfil destino no es válido.".to_string())?;
    let organization_id = usage
        .get("samples")
        .and_then(Value::as_array)
        .and_then(|samples| samples.last())
        .and_then(|sample| sample.get("org"))
        .and_then(Value::as_str)
        .and_then(|value| Uuid::parse_str(value).ok())
        .map(|value| value.to_string())
        .ok_or_else(|| "No se pudo identificar la organización del perfil destino.".to_string())?;
    Ok((account_id, organization_id))
}

fn find_file_named(directory: &Path, file_name: &str, depth: usize) -> Option<PathBuf> {
    if depth > 5 {
        return None;
    }
    for entry in fs::read_dir(directory).ok()?.flatten() {
        let path = entry.path();
        let Ok(metadata) = fs::symlink_metadata(&path) else {
            continue;
        };
        if metadata.file_type().is_symlink() {
            continue;
        }
        if metadata.is_dir() {
            if let Some(found) = find_file_named(&path, file_name, depth + 1) {
                return Some(found);
            }
        } else if metadata.is_file()
            && path.file_name().and_then(|value| value.to_str()) == Some(file_name)
        {
            return Some(path);
        }
    }
    None
}

fn rollback_transfer_target(
    target_index: &Path,
    backup_root: &Path,
    replaced_existing_target: bool,
) {
    if replaced_existing_target {
        if let Ok(previous) = fs::read(backup_root.join("target-index.previous.json")) {
            let _ = atomic_replace_file(target_index, &previous);
        }
    } else if target_index.exists() {
        let _ = fs::remove_file(target_index);
    }
}

pub(crate) fn published_artifacts(document: &Value) -> Option<Value> {
    document
        .get("publishedArtifacts")
        .filter(|value| value.is_array() || value.is_object())
        .cloned()
}

fn session_index_for_target(
    mut source_document: Value,
    target_artifacts: Option<Value>,
) -> Result<Vec<u8>, String> {
    let object = source_document
        .as_object_mut()
        .ok_or_else(|| "El índice de la sesión no tiene un formato válido.".to_string())?;
    object.remove("publishedArtifacts");
    if let Some(artifacts) = target_artifacts {
        object.insert("publishedArtifacts".to_string(), artifacts);
    }
    serde_json::to_vec_pretty(&source_document)
        .map_err(|error| format!("No se pudo preparar el índice sanitizado: {error}"))
}

fn restored_origin_artifacts(
    backup_root: &Path,
    session_id: &str,
    origin_instance_id: &str,
) -> Option<Value> {
    let mut directories = fs::read_dir(backup_root)
        .ok()?
        .flatten()
        .filter_map(|entry| {
            let path = entry.path();
            let metadata = fs::symlink_metadata(&path).ok()?;
            (metadata.is_dir() && !metadata.file_type().is_symlink()).then_some(path)
        })
        .collect::<Vec<_>>();
    directories.sort_by(|left, right| right.file_name().cmp(&left.file_name()));

    for directory in directories {
        let manifest_path = directory.join("manifest.json");
        let index_path = directory.join("source-index.json");
        let valid_file = |path: &Path| {
            fs::symlink_metadata(path)
                .ok()
                .filter(|metadata| metadata.is_file() && !metadata.file_type().is_symlink())
                .map(|metadata| metadata.len() <= 1024 * 1024)
                .unwrap_or(false)
        };
        if !valid_file(&manifest_path) || !valid_file(&index_path) {
            continue;
        }
        let Ok(manifest) =
            serde_json::from_slice::<SessionTransferManifest>(&fs::read(&manifest_path).ok()?)
        else {
            continue;
        };
        if manifest.session_id != session_id || manifest.source_instance_id != origin_instance_id {
            continue;
        }
        let Ok(document) = serde_json::from_slice::<Value>(&fs::read(index_path).ok()?) else {
            continue;
        };
        if let Some(artifacts) = published_artifacts(&document) {
            return Some(artifacts);
        }
    }
    None
}

fn artifact_export_roots(profile_path: &Path, session_id: &str) -> Vec<PathBuf> {
    [
        profile_path.join("artifacts").join(session_id),
        profile_path.join("claude-code-artifacts").join(session_id),
        profile_path
            .join("claude-code-sessions")
            .join("artifacts")
            .join(session_id),
    ]
    .into_iter()
    .filter(|path| path.exists())
    .collect()
}

fn artifact_reference_count(value: Option<&Value>) -> u64 {
    match value {
        Some(Value::Array(items)) => items.len() as u64,
        Some(Value::Object(items)) => items.len() as u64,
        _ => 0,
    }
}

fn collect_opaque_artifact_files(
    root: &Path,
    directory: &Path,
    depth: usize,
    entries_seen: &mut usize,
    files: &mut Vec<PathBuf>,
    total_bytes: &mut u64,
) -> Result<(), String> {
    if depth > 12 {
        return Err("La exportación local supera el límite de profundidad.".to_string());
    }
    *entries_seen = entries_seen.saturating_add(1);
    if *entries_seen > ARTIFACT_EXPORT_MAX_FILES * 2 {
        return Err("La exportación local supera el límite de entradas.".to_string());
    }
    let canonical_root = fs::canonicalize(root)
        .map_err(|_| "No se pudo validar el root local de artefactos.".to_string())?;
    let metadata = fs::symlink_metadata(directory)
        .map_err(|error| format!("No se pudo validar un artefacto local: {error}"))?;
    if metadata.file_type().is_symlink() {
        return Err(
            "Se omitió un artefacto local porque contiene un enlace simbólico.".to_string(),
        );
    }
    if metadata.is_file() {
        let canonical = fs::canonicalize(directory)
            .map_err(|_| "No se pudo canonicalizar un artefacto local.".to_string())?;
        if !canonical.starts_with(&canonical_root) {
            return Err("Se rechazó un artefacto local fuera del root permitido.".to_string());
        }
        if files.len() >= ARTIFACT_EXPORT_MAX_FILES {
            return Err("La exportación local supera el límite de archivos.".to_string());
        }
        *total_bytes = total_bytes.saturating_add(metadata.len());
        if *total_bytes > ARTIFACT_EXPORT_MAX_BYTES {
            return Err("La exportación local supera el límite de tamaño.".to_string());
        }
        files.push(directory.to_path_buf());
        return Ok(());
    }
    if !metadata.is_dir() {
        return Err("Se rechazó un artefacto local de tipo especial.".to_string());
    }
    for entry in fs::read_dir(directory)
        .map_err(|error| format!("No se pudo enumerar un artefacto local: {error}"))?
    {
        let entry =
            entry.map_err(|error| format!("No se pudo leer un artefacto local: {error}"))?;
        collect_opaque_artifact_files(
            root,
            &entry.path(),
            depth + 1,
            entries_seen,
            files,
            total_bytes,
        )?;
    }
    Ok(())
}

fn export_local_artifacts(
    paths: &ManagedPaths,
    profile_path: &Path,
    session_id: &str,
    transfer_id: &str,
    include: bool,
    remote_references_omitted: u64,
    monitors_omitted: u64,
) -> ArtifactTransferOutcome {
    let mut outcome = ArtifactTransferOutcome {
        remote_references_omitted,
        monitors_omitted,
        ..ArtifactTransferOutcome::default()
    };
    if !include {
        outcome
            .warnings
            .push("No se solicitaron copias locales de artefactos.".to_string());
        return outcome;
    }
    let roots = artifact_export_roots(profile_path, session_id);
    let mut files = Vec::new();
    let mut total_bytes = 0_u64;
    let mut entries_seen = 0_usize;
    for root in &roots {
        if let Err(error) = collect_opaque_artifact_files(
            root,
            root,
            0,
            &mut entries_seen,
            &mut files,
            &mut total_bytes,
        ) {
            outcome.warnings.push(error);
            return outcome;
        }
    }
    outcome.local_candidates = files.len() as u64;
    if files.is_empty() {
        if remote_references_omitted > 0 {
            outcome.warnings.push(
                "Solo se detectaron referencias remotas; deben publicarse de nuevo en el destino."
                    .to_string(),
            );
        }
        return outcome;
    }

    let staging = paths
        .artifact_exports
        .join(format!(".{transfer_id}.staging"));
    let destination = paths.artifact_exports.join(transfer_id);
    if let Err(error) = fs::create_dir_all(&staging) {
        outcome
            .warnings
            .push(format!("No se pudo preparar la exportación local: {error}"));
        return outcome;
    }
    for (root_index, root) in roots.iter().enumerate() {
        for file in files.iter().filter(|file| file.starts_with(root)) {
            let safe_to_copy = fs::symlink_metadata(file)
                .ok()
                .filter(|metadata| metadata.is_file() && !metadata.file_type().is_symlink())
                .and_then(|_| fs::canonicalize(file).ok())
                .zip(fs::canonicalize(root).ok())
                .is_some_and(|(file, root)| file.starts_with(root));
            if !safe_to_copy {
                outcome.warnings.push(
                    "Una copia local cambió durante la transferencia y fue omitida.".to_string(),
                );
                continue;
            }
            let Ok(relative) = file.strip_prefix(root) else {
                continue;
            };
            let target = staging.join(root_index.to_string()).join(relative);
            let copied = target
                .parent()
                .and_then(|parent| fs::create_dir_all(parent).ok().map(|_| ()))
                .and_then(|_| fs::copy(file, &target).ok());
            if copied.is_some() {
                outcome.copied = outcome.copied.saturating_add(1);
            } else {
                outcome.warnings.push(
                    "Una copia local no pudo preservarse; el origen no fue modificado.".to_string(),
                );
            }
        }
    }
    if outcome.copied == outcome.local_candidates {
        if let Some(parent) = destination.parent() {
            let _ = fs::create_dir_all(parent);
        }
        if fs::rename(&staging, &destination).is_ok() {
            outcome.preserved_for_manual_import = outcome.copied;
            outcome.export_path = Some(format!("artifact-exports/{transfer_id}"));
            outcome.warnings.push(
                "El schema local no está confirmado: se creó una exportación opaca para importar o publicar manualmente."
                    .to_string(),
            );
        } else {
            let _ = fs::remove_dir_all(&staging);
            outcome.copied = 0;
            outcome.warnings.push(
                "No se pudo activar la exportación local; el origen quedó intacto.".to_string(),
            );
        }
    } else {
        let _ = fs::remove_dir_all(&staging);
        outcome.copied = 0;
    }
    outcome
}

pub(crate) fn copy_code_session_sync(
    app: &AppHandle,
    request: CopyCodeSessionRequest,
) -> Result<ArtifactTransferOutcome, String> {
    if request.source_instance_id == request.target_instance_id {
        return Err("El origen y el destino deben ser perfiles diferentes.".to_string());
    }

    let paths = ManagedPaths::resolve(app)?;
    let mut registry = load_registry(&paths)?;
    let mut session_links = load_session_links(&paths)?;
    let inventory = ProcessInventory::capture();
    refresh_instance_statuses(&mut registry, &inventory);
    let source = resolve_transfer_profile(&registry, &request.source_instance_id, &inventory)
        .map_err(|error| format!("No se pudo usar el perfil de origen: {error}"))?;
    let target = resolve_transfer_profile(&registry, &request.target_instance_id, &inventory)
        .map_err(|error| format!("No se pudo usar el perfil de destino: {error}"))?;

    if source.status != InstanceStatus::Stopped || target.status != InstanceStatus::Stopped {
        return Err(format!(
            "Detén “{}” y “{}” antes de transferir la sesión.",
            source.name, target.name
        ));
    }

    let source_profile = source.profile_path.clone();
    let target_profile = target.profile_path.clone();
    let (source_index, _index_contents, document) =
        find_code_session_index(&source_profile, &request.session_id)?;
    let session_id = document
        .get("sessionId")
        .and_then(Value::as_str)
        .and_then(canonical_code_session_id)
        .ok_or_else(|| "La sesión de origen no tiene un identificador válido.".to_string())?;
    let cli_session_id = document
        .get("cliSessionId")
        .and_then(Value::as_str)
        .and_then(|value| Uuid::parse_str(value).ok())
        .map(|value| value.to_string())
        .ok_or_else(|| "La sesión no tiene un transcript válido.".to_string())?;
    let session_title = document
        .get("title")
        .and_then(Value::as_str)
        .map(|value| value.to_string())
        .and_then(|value| clean_session_text(Some(value), 180))
        .unwrap_or_else(|| "Sesión sin título".to_string());

    let transcript_root = dirs::home_dir()
        .map(|home| home.join(".claude/projects"))
        .ok_or_else(|| "No se pudo resolver el almacenamiento global de sesiones.".to_string())?;
    let transcript_name = format!("{cli_session_id}.jsonl");
    let transcript = find_file_named(&transcript_root, &transcript_name, 0)
        .ok_or_else(|| "No se encontró el transcript global de esta sesión.".to_string())?;
    if fs::metadata(&transcript)
        .map(|metadata| metadata.len())
        .unwrap_or(0)
        == 0
    {
        return Err("El transcript global de esta sesión está vacío.".to_string());
    }

    let mut target_session_files = Vec::new();
    collect_code_session_files(
        &target_profile.join("claude-code-sessions"),
        0,
        &mut target_session_files,
    );
    let existing_target = target_session_files.into_iter().find(|path| {
        fs::read(path)
            .ok()
            .and_then(|contents| serde_json::from_slice::<Value>(&contents).ok())
            .and_then(|value| {
                value
                    .get("sessionId")
                    .and_then(Value::as_str)
                    .map(str::to_string)
            })
            .and_then(|value| canonical_code_session_id(&value))
            .map(|value| value == session_id)
            .unwrap_or(false)
    });
    let target_index = if let Some(existing_target) = existing_target {
        existing_target
    } else {
        let (account_id, organization_id) = profile_identity(&target_profile)?;
        let target_directory = target_profile
            .join("claude-code-sessions")
            .join(account_id)
            .join(organization_id);
        let preferred = target_directory.join(if session_id.starts_with("local_") {
            format!("{session_id}.json")
        } else {
            format!("local_{session_id}.json")
        });
        if preferred.exists() {
            target_directory.join(format!("local_import_{}.json", Uuid::new_v4()))
        } else {
            preferred
        }
    };

    let origin_instance_id = session_links
        .links
        .iter()
        .find(|link| {
            link.session_id == session_id
                && (link.origin_instance_id == source.id
                    || link.linked_instance_id == source.id
                    || link.origin_instance_id == target.id
                    || link.linked_instance_id == target.id)
        })
        .map(|link| link.origin_instance_id.clone())
        .unwrap_or_else(|| source.id.clone());
    let existing_target_artifacts = fs::read(&target_index)
        .ok()
        .and_then(|contents| serde_json::from_slice::<Value>(&contents).ok())
        .and_then(|document| published_artifacts(&document));
    let target_owned_artifacts = existing_target_artifacts.or_else(|| {
        (target.id == origin_instance_id).then(|| {
            restored_origin_artifacts(&paths.session_backups, &session_id, &origin_instance_id)
        })?
    });
    let sanitized_index = session_index_for_target(document.clone(), target_owned_artifacts)?;

    let transfer_id = Uuid::new_v4().to_string();
    let remote_artifacts = published_artifacts(&document);
    let remote_references_omitted = artifact_reference_count(remote_artifacts.as_ref());
    let monitors_omitted = latest_artifact_monitor(&transcript)
        .map(|summary| summary.artifact_count)
        .unwrap_or(0);
    let backup_root = paths.session_backups.join(format!(
        "{}-{}",
        Utc::now().format("%Y%m%d-%H%M%S"),
        transfer_id
    ));
    fs::create_dir_all(&backup_root)
        .map_err(|error| format!("No se pudo crear el respaldo de la transferencia: {error}"))?;
    fs::copy(&source_index, backup_root.join("source-index.json"))
        .map_err(|error| format!("No se pudo respaldar el índice de origen: {error}"))?;
    fs::copy(&transcript, backup_root.join("transcript.jsonl"))
        .map_err(|error| format!("No se pudo respaldar el transcript: {error}"))?;
    let replaced_existing_target = target_index.exists();
    if replaced_existing_target {
        fs::copy(
            &target_index,
            backup_root.join("target-index.previous.json"),
        )
        .map_err(|error| format!("No se pudo respaldar el índice destino: {error}"))?;
    }

    let manifest = SessionTransferManifest {
        transfer_id: transfer_id.clone(),
        created_at: Utc::now().to_rfc3339(),
        session_id: session_id.clone(),
        session_title,
        source_instance_id: source.id.clone(),
        source_instance_name: source.name.clone(),
        target_instance_id: target.id.clone(),
        target_instance_name: target.name.clone(),
        source_index: source_index.to_string_lossy().to_string(),
        target_index: target_index.to_string_lossy().to_string(),
        transcript: transcript.to_string_lossy().to_string(),
        replaced_existing_target,
        mode: request.mode,
    };
    let manifest_contents = serde_json::to_vec_pretty(&manifest)
        .map_err(|error| format!("No se pudo preparar el manifiesto de respaldo: {error}"))?;
    fs::write(backup_root.join("manifest.json"), manifest_contents)
        .map_err(|error| format!("No se pudo guardar el manifiesto de respaldo: {error}"))?;

    atomic_replace_file(&target_index, &sanitized_index)?;

    let detached_source = backup_root.join("source-index.detached.json");
    if request.mode == SessionTransferMode::Move {
        if let Err(error) = fs::rename(&source_index, &detached_source) {
            rollback_transfer_target(&target_index, &backup_root, replaced_existing_target);
            return Err(format!(
                "La copia se preparó, pero no se pudo retirar del origen; se restauró el destino: {error}"
            ));
        }
    }

    update_session_links_after_transfer(
        &mut session_links,
        &session_id,
        &source.id,
        &target.id,
        request.mode,
    );
    if let Err(error) = save_session_links(&paths, &session_links) {
        if detached_source.exists() {
            let _ = fs::rename(&detached_source, &source_index);
        }
        rollback_transfer_target(&target_index, &backup_root, replaced_existing_target);
        return Err(error);
    }
    Ok(export_local_artifacts(
        &paths,
        &source_profile,
        &session_id,
        &transfer_id,
        request.include_local_artifacts,
        remote_references_omitted,
        monitors_omitted,
    ))
}

pub(crate) fn unlink_code_session_sync(
    app: &AppHandle,
    request: UnlinkCodeSessionRequest,
) -> Result<(), String> {
    let paths = ManagedPaths::resolve(app)?;
    let mut session_links = load_session_links(&paths)?;
    let session_id = canonical_code_session_id(&request.session_id)
        .ok_or_else(|| "El identificador de la sesión no es válido.".to_string())?;
    let link = session_links
        .links
        .iter()
        .find(|link| {
            link.session_id == session_id && link.linked_instance_id == request.instance_id
        })
        .cloned()
        .ok_or_else(|| "Esta sesión no está registrada como una copia vinculada.".to_string())?;

    if link.mode == SessionTransferMode::Move {
        return copy_code_session_sync(
            app,
            CopyCodeSessionRequest {
                source_instance_id: link.linked_instance_id,
                target_instance_id: link.origin_instance_id,
                session_id,
                mode: SessionTransferMode::Move,
                include_local_artifacts: true,
            },
        )
        .map(|_| ());
    }

    let mut registry = load_registry(&paths)?;
    let inventory = ProcessInventory::capture();
    refresh_instance_statuses(&mut registry, &inventory);
    let linked_instance = resolve_transfer_profile(&registry, &link.linked_instance_id, &inventory)
        .map_err(|error| format!("La instancia vinculada no está disponible: {error}"))?;
    if linked_instance.status == InstanceStatus::Running {
        return Err(format!(
            "Detén “{}” antes de desvincular la sesión.",
            linked_instance.name
        ));
    }

    let linked_profile = linked_instance.profile_path.clone();
    let (linked_index, _, document) = find_code_session_index(&linked_profile, &session_id)?;
    let title = document
        .get("title")
        .and_then(Value::as_str)
        .map(str::to_string)
        .and_then(|value| clean_session_text(Some(value), 180))
        .unwrap_or_else(|| "Sesión sin título".to_string());
    let operation_id = Uuid::new_v4().to_string();
    let backup_root = paths.session_backups.join(format!(
        "{}-unlink-{}",
        Utc::now().format("%Y%m%d-%H%M%S"),
        operation_id
    ));
    fs::create_dir_all(&backup_root)
        .map_err(|error| format!("No se pudo crear el respaldo de desvinculación: {error}"))?;
    let detached = backup_root.join("linked-index.detached.json");
    fs::rename(&linked_index, &detached)
        .map_err(|error| format!("No se pudo retirar la sesión vinculada: {error}"))?;
    let manifest = serde_json::json!({
        "operationId": operation_id,
        "operation": "unlink",
        "createdAt": Utc::now().to_rfc3339(),
        "sessionId": session_id,
        "sessionTitle": title,
        "originInstanceId": link.origin_instance_id,
        "linkedInstanceId": link.linked_instance_id,
        "linkedIndex": linked_index.to_string_lossy(),
    });
    if let Err(error) = fs::write(
        backup_root.join("manifest.json"),
        serde_json::to_vec_pretty(&manifest).unwrap_or_default(),
    ) {
        let _ = fs::rename(&detached, &linked_index);
        return Err(format!(
            "No se pudo guardar el respaldo de desvinculación: {error}"
        ));
    }

    session_links
        .links
        .retain(|candidate| candidate.id != link.id);
    if let Err(error) = save_session_links(&paths, &session_links) {
        let _ = fs::rename(&detached, &linked_index);
        return Err(error);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn counts_remote_artifact_arrays_and_objects_without_exposing_values() {
        let array = serde_json::json!([{"private": "one"}, {"private": "two"}]);
        let object = serde_json::json!({"secret-a": {}, "secret-b": {}, "secret-c": {}});
        assert_eq!(artifact_reference_count(Some(&array)), 2);
        assert_eq!(artifact_reference_count(Some(&object)), 3);
        assert_eq!(artifact_reference_count(Some(&Value::Null)), 0);
    }

    #[cfg(unix)]
    #[test]
    fn artifact_export_rejects_symlinks_and_depth_escapes() {
        use std::os::unix::fs::symlink;

        let root = env::temp_dir().join(format!("code-ai-artifact-safe-{}", Uuid::new_v4()));
        let outside = env::temp_dir().join(format!("code-ai-artifact-private-{}", Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        fs::write(&outside, b"opaque").unwrap();
        symlink(&outside, root.join("escape")).unwrap();
        let mut files = Vec::new();
        let mut entries = 0;
        let mut bytes = 0;
        let error =
            collect_opaque_artifact_files(&root, &root, 0, &mut entries, &mut files, &mut bytes)
                .unwrap_err();
        assert!(error.contains("enlace simbólico"));
        assert!(files.is_empty());
        fs::remove_dir_all(root).unwrap();
        fs::remove_file(outside).unwrap();
    }

    #[test]
    fn sanitizes_artifacts_using_only_the_target_profile_ownership() {
        let source = serde_json::json!({
            "sessionId": "local_96812ba4-6864-40d5-a70a-0470f244022c",
            "publishedArtifacts": {"source-id": {"title": "private source"}},
            "scheduledTasks": {"must": "remain ordinary session metadata"}
        });
        let target_artifacts = serde_json::json!({
            "target-id": {"title": "private target"}
        });
        let sanitized: Value = serde_json::from_slice(
            &session_index_for_target(source.clone(), Some(target_artifacts.clone())).unwrap(),
        )
        .unwrap();
        assert_eq!(sanitized.get("publishedArtifacts"), Some(&target_artifacts));
        assert_ne!(
            sanitized.get("publishedArtifacts"),
            source.get("publishedArtifacts")
        );
        assert!(sanitized.get("scheduledTasks").is_some());

        let without_target: Value =
            serde_json::from_slice(&session_index_for_target(source, None).unwrap()).unwrap();
        assert!(without_target.get("publishedArtifacts").is_none());
    }

    #[test]
    fn restores_origin_artifacts_from_the_transaction_backup() {
        let root = env::temp_dir().join(format!("code-ai-artifact-backup-{}", Uuid::new_v4()));
        let transfer = root.join("20260922-transfer");
        fs::create_dir_all(&transfer).unwrap();
        let session_id = "local_96812ba4-6864-40d5-a70a-0470f244022c";
        let manifest = SessionTransferManifest {
            transfer_id: "transfer".to_string(),
            created_at: "2026-09-22T10:00:00Z".to_string(),
            session_id: session_id.to_string(),
            session_title: "Session".to_string(),
            source_instance_id: "origin".to_string(),
            source_instance_name: "Origin".to_string(),
            target_instance_id: "target".to_string(),
            target_instance_name: "Target".to_string(),
            source_index: String::new(),
            target_index: String::new(),
            transcript: String::new(),
            replaced_existing_target: false,
            mode: SessionTransferMode::Move,
        };
        fs::write(
            transfer.join("manifest.json"),
            serde_json::to_vec(&manifest).unwrap(),
        )
        .unwrap();
        fs::write(
            transfer.join("source-index.json"),
            br#"{"publishedArtifacts":{"owned-by-origin":{"payload":"not exposed"}}}"#,
        )
        .unwrap();

        let artifacts = restored_origin_artifacts(&root, session_id, "origin").unwrap();
        assert!(artifacts.get("owned-by-origin").is_some());
        assert!(restored_origin_artifacts(&root, session_id, "other").is_none());
        fs::remove_dir_all(root).unwrap();
    }
}
