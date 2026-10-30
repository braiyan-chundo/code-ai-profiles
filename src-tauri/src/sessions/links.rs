//! El origen de cada sesión copiada o movida entre perfiles (`session-links.json`): migrar los
//! manifiestos antiguos, anotar las sesiones con su origen y actualizar el vínculo tras transferir.

use super::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SessionLink {
    pub(crate) id: String,
    pub(crate) session_id: String,
    pub(crate) origin_instance_id: String,
    pub(crate) linked_instance_id: String,
    pub(crate) mode: SessionTransferMode,
    pub(crate) created_at: String,
    pub(crate) updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SessionLinkRegistry {
    #[serde(default = "registry_version")]
    pub(crate) version: u32,
    #[serde(default)]
    pub(crate) links: Vec<SessionLink>,
}

impl Default for SessionLinkRegistry {
    fn default() -> Self {
        Self {
            version: REGISTRY_VERSION,
            links: Vec::new(),
        }
    }
}

pub(crate) fn save_session_links(
    paths: &ManagedPaths,
    links: &SessionLinkRegistry,
) -> Result<(), String> {
    let contents = serde_json::to_vec_pretty(links)
        .map_err(|error| format!("No se pudo serializar el registro de sesiones: {error}"))?;
    atomic_replace_file(&paths.session_links, &contents)
        .map_err(|error| format!("No se pudo guardar el origen de las sesiones: {error}"))
}

fn migrate_session_links(paths: &ManagedPaths) -> SessionLinkRegistry {
    let mut manifests = fs::read_dir(&paths.session_backups)
        .into_iter()
        .flatten()
        .flatten()
        .filter_map(|entry| {
            let path = entry.path().join("manifest.json");
            let metadata = fs::metadata(&path).ok()?;
            if !metadata.is_file() || metadata.len() > 64 * 1024 {
                return None;
            }
            serde_json::from_slice::<SessionTransferManifest>(&fs::read(path).ok()?).ok()
        })
        .collect::<Vec<_>>();
    manifests.sort_by(|left, right| left.created_at.cmp(&right.created_at));

    let mut registry = SessionLinkRegistry {
        version: REGISTRY_VERSION,
        links: Vec::new(),
    };
    for manifest in manifests {
        let Some(session_id) = canonical_code_session_id(&manifest.session_id) else {
            continue;
        };
        let origin = registry
            .links
            .iter()
            .find(|link| link.session_id == session_id)
            .map(|link| link.origin_instance_id.clone())
            .unwrap_or_else(|| manifest.source_instance_id.clone());
        if manifest.target_instance_id == origin {
            continue;
        }
        if let Some(link) = registry.links.iter_mut().find(|link| {
            link.session_id == session_id && link.linked_instance_id == manifest.target_instance_id
        }) {
            link.updated_at = manifest.created_at;
            link.mode = manifest.mode;
        } else {
            registry.links.push(SessionLink {
                id: Uuid::new_v4().to_string(),
                session_id,
                origin_instance_id: origin,
                linked_instance_id: manifest.target_instance_id,
                mode: manifest.mode,
                created_at: manifest.created_at.clone(),
                updated_at: manifest.created_at,
            });
        }
    }
    registry
}

pub(crate) fn load_session_links(paths: &ManagedPaths) -> Result<SessionLinkRegistry, String> {
    if !paths.session_links.exists() {
        let migrated = migrate_session_links(paths);
        save_session_links(paths, &migrated)?;
        return Ok(migrated);
    }
    let contents = fs::read(&paths.session_links)
        .map_err(|error| format!("No se pudo leer el origen de las sesiones: {error}"))?;
    serde_json::from_slice(&contents)
        .map_err(|error| format!("El registro de sesiones vinculadas está dañado: {error}"))
}

pub(crate) fn apply_session_links(registry: &mut Registry, links: &SessionLinkRegistry) {
    for instance in &mut registry.instances {
        apply_session_links_to_profile(&mut instance.code_sessions, &instance.id, links);
    }
}

pub(crate) fn apply_session_links_to_profile(
    sessions: &mut [CodeSession],
    profile_id: &str,
    links: &SessionLinkRegistry,
) {
    for session in sessions {
        session.transfer = links
            .links
            .iter()
            .find(|link| link.linked_instance_id == profile_id && link.session_id == session.id)
            .map(|link| SessionTransferInfo {
                origin_instance_id: link.origin_instance_id.clone(),
                mode: link.mode,
            });
    }
}

pub(crate) fn update_session_links_after_transfer(
    links: &mut SessionLinkRegistry,
    session_id: &str,
    source_instance_id: &str,
    target_instance_id: &str,
    mode: SessionTransferMode,
) {
    let origin_instance_id = links
        .links
        .iter()
        .find(|link| {
            link.session_id == session_id
                && (link.origin_instance_id == source_instance_id
                    || link.linked_instance_id == source_instance_id
                    || link.origin_instance_id == target_instance_id
                    || link.linked_instance_id == target_instance_id)
        })
        .map(|link| link.origin_instance_id.clone())
        .unwrap_or_else(|| source_instance_id.to_string());
    let source_was_moved = links.links.iter().any(|link| {
        link.session_id == session_id
            && link.linked_instance_id == source_instance_id
            && link.mode == SessionTransferMode::Move
    });

    if target_instance_id == origin_instance_id {
        if mode == SessionTransferMode::Move {
            links.links.retain(|link| {
                !(link.session_id == session_id && link.linked_instance_id == source_instance_id)
            });
        }
        return;
    }

    if mode == SessionTransferMode::Move && source_instance_id != origin_instance_id {
        links.links.retain(|link| {
            !(link.session_id == session_id && link.linked_instance_id == source_instance_id)
        });
    }

    let linked_mode = if mode == SessionTransferMode::Move
        && (source_instance_id == origin_instance_id || source_was_moved)
    {
        SessionTransferMode::Move
    } else {
        SessionTransferMode::Copy
    };
    let now = Utc::now().to_rfc3339();
    if let Some(link) = links
        .links
        .iter_mut()
        .find(|link| link.session_id == session_id && link.linked_instance_id == target_instance_id)
    {
        link.origin_instance_id = origin_instance_id;
        link.mode = linked_mode;
        link.updated_at = now;
    } else {
        links.links.push(SessionLink {
            id: Uuid::new_v4().to_string(),
            session_id: session_id.to_string(),
            origin_instance_id,
            linked_instance_id: target_instance_id.to_string(),
            mode: linked_mode,
            created_at: now.clone(),
            updated_at: now,
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tracks_copy_move_and_return_session_lineage() {
        let mut links = SessionLinkRegistry::default();
        let session_id = "local_96812ba4-6864-40d5-a70a-0470f244022c";

        update_session_links_after_transfer(
            &mut links,
            session_id,
            "work-profile",
            "personal-profile",
            SessionTransferMode::Copy,
        );
        assert_eq!(links.links.len(), 1);
        assert_eq!(links.links[0].origin_instance_id, "work-profile");
        assert_eq!(links.links[0].mode, SessionTransferMode::Copy);

        update_session_links_after_transfer(
            &mut links,
            session_id,
            "work-profile",
            "personal-profile",
            SessionTransferMode::Move,
        );
        assert_eq!(links.links.len(), 1);
        assert_eq!(links.links[0].mode, SessionTransferMode::Move);

        update_session_links_after_transfer(
            &mut links,
            session_id,
            "personal-profile",
            "work-profile",
            SessionTransferMode::Move,
        );
        assert!(links.links.is_empty());

        update_session_links_after_transfer(
            &mut links,
            session_id,
            ORIGINAL_INSTANCE_ID,
            "work-profile",
            SessionTransferMode::Move,
        );
        assert_eq!(links.links.len(), 1);
        assert_eq!(links.links[0].origin_instance_id, ORIGINAL_INSTANCE_ID);
        assert_eq!(links.links[0].linked_instance_id, "work-profile");

        update_session_links_after_transfer(
            &mut links,
            session_id,
            "work-profile",
            ORIGINAL_INSTANCE_ID,
            SessionTransferMode::Move,
        );
        assert!(links.links.is_empty());
    }

    #[test]
    fn migrates_existing_round_trip_as_a_link_to_the_original() {
        let root = env::temp_dir().join(format!("code-ai-profiles-links-test-{}", Uuid::new_v4()));
        let backups = root.join("session-transfer-backups");
        let paths = ManagedPaths {
            app_data: root.clone(),
            instances: root.join("managed-instances"),
            registry: root.join("instances.json"),
            session_backups: backups.clone(),
            session_links: root.join("session-links.json"),
            source_update_cache: root.join("source-update-cache.json"),
            artifact_exports: root.join("artifact-exports"),
            original_update: root.join("original-update"),
        };
        let session_id = "local_96812ba4-6864-40d5-a70a-0470f244022c";
        let manifest = |transfer_id: &str, created_at: &str, source_id: &str, target_id: &str| {
            SessionTransferManifest {
                transfer_id: transfer_id.to_string(),
                created_at: created_at.to_string(),
                session_id: session_id.to_string(),
                session_title: "QLEO-PROJECT".to_string(),
                source_instance_id: source_id.to_string(),
                source_instance_name: source_id.to_string(),
                target_instance_id: target_id.to_string(),
                target_instance_name: target_id.to_string(),
                source_index: String::new(),
                target_index: String::new(),
                transcript: String::new(),
                replaced_existing_target: false,
                mode: SessionTransferMode::Copy,
            }
        };
        let outbound = backups.join("01-outbound");
        let returned = backups.join("02-returned");
        fs::create_dir_all(&outbound).unwrap();
        fs::create_dir_all(&returned).unwrap();
        fs::write(
            outbound.join("manifest.json"),
            serde_json::to_vec(&manifest(
                "first",
                "2026-07-19T08:11:00Z",
                "work-profile",
                "personal-profile",
            ))
            .unwrap(),
        )
        .unwrap();
        fs::write(
            returned.join("manifest.json"),
            serde_json::to_vec(&manifest(
                "second",
                "2026-07-19T08:12:00Z",
                "personal-profile",
                "work-profile",
            ))
            .unwrap(),
        )
        .unwrap();

        let migrated = migrate_session_links(&paths);
        assert_eq!(migrated.links.len(), 1);
        assert_eq!(migrated.links[0].origin_instance_id, "work-profile");
        assert_eq!(migrated.links[0].linked_instance_id, "personal-profile");
        assert_eq!(migrated.links[0].mode, SessionTransferMode::Copy);

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn annotates_a_session_linked_inside_the_original_app() {
        let session_id = "local_96812ba4-6864-40d5-a70a-0470f244022c";
        let mut sessions = vec![CodeSession {
            id: session_id.to_string(),
            title: "QLEO-PROJECT".to_string(),
            model: None,
            effort: None,
            completed_turns: 0,
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
        }];
        let links = SessionLinkRegistry {
            version: REGISTRY_VERSION,
            links: vec![SessionLink {
                id: "link-1".to_string(),
                session_id: session_id.to_string(),
                origin_instance_id: "work-profile".to_string(),
                linked_instance_id: ORIGINAL_INSTANCE_ID.to_string(),
                mode: SessionTransferMode::Copy,
                created_at: "2026-07-19T08:11:00Z".to_string(),
                updated_at: "2026-07-19T08:11:00Z".to_string(),
            }],
        };

        apply_session_links_to_profile(&mut sessions, ORIGINAL_INSTANCE_ID, &links);

        let transfer = sessions[0].transfer.as_ref().unwrap();
        assert_eq!(transfer.origin_instance_id, "work-profile");
        assert_eq!(transfer.mode, SessionTransferMode::Copy);
    }
}
