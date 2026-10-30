//! La topología de versiones: cuál es la instalación detenida y validada más reciente (la original o
//! una copia donante), qué copias quedan por detrás y si se pueden sincronizar.

use super::*;

pub(crate) fn build_version_topology(
    paths: &ManagedPaths,
    registry: &Registry,
    inventory: &ProcessInventory,
) -> VersionTopology {
    #[cfg(test)]
    record_refresh_work(|counters| counters.topology_builds += 1);
    let Some(original) = detect_provider_source() else {
        return VersionTopology {
            latest_installed_version: None,
            latest_source: None,
            stale_instance_ids: Vec::new(),
            original_behind: false,
            can_synchronize_managed: false,
            reason: Some("No se encontró la aplicación original compatible.".to_string()),
        };
    };
    let original_valid = original_instance_status_with_inventory(inventory)
        == InstanceStatus::Stopped
        && validate_source(&original).is_ok()
        && (SHARED_INSTALLATION
            || validate_provider_identity_uncached(&original, &original).is_ok());
    let original_version = original_valid
        .then(|| cached_source_version(&original))
        .flatten()
        .filter(|version| valid_release_version(version));
    let original_name =
        source_display_name(&original).unwrap_or_else(|| "Aplicación original".to_string());
    let mut latest = original_version.clone().map(|version| {
        (
            version,
            VersionSource {
                kind: VersionSourceKind::Original,
                instance_id: None,
                name: original_name,
            },
        )
    });

    let mut validated_versions = HashMap::new();
    if !SHARED_INSTALLATION {
        for instance in &registry.instances {
            let donor_version = validate_managed_application_source(paths, instance, &original);
            let validated_version = donor_version
                .clone()
                .or_else(|_| validate_managed_application(paths, instance, &original));
            let Ok(version) = validated_version else {
                continue;
            };
            validated_versions.insert(instance.id.clone(), version.clone());
            if donor_version.is_ok() {
                if latest
                    .as_ref()
                    .map(|(current, _)| version_is_newer(&version, Some(current)))
                    .unwrap_or(true)
                {
                    latest = Some((
                        version,
                        VersionSource {
                            kind: VersionSourceKind::Managed,
                            instance_id: Some(instance.id.clone()),
                            name: instance.name.clone(),
                        },
                    ));
                }
            }
        }
    }

    let stale_instance_ids = latest
        .as_ref()
        .map(|(latest_version, _)| {
            registry
                .instances
                .iter()
                .filter(|instance| {
                    validated_versions
                        .get(&instance.id)
                        .map(|version| version_is_newer(latest_version, Some(version)))
                        .unwrap_or(false)
                })
                .map(|instance| instance.id.clone())
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    let original_behind = latest.as_ref().is_some_and(|(latest, _)| {
        original_version
            .as_deref()
            .is_some_and(|version| version_is_newer(latest, Some(version)))
    });
    let can_synchronize_managed =
        !SHARED_INSTALLATION && latest.is_some() && !stale_instance_ids.is_empty();
    let has_latest = latest.is_some();
    VersionTopology {
        latest_installed_version: latest.as_ref().map(|(version, _)| version.clone()),
        latest_source: latest.map(|(_, source)| source),
        stale_instance_ids,
        original_behind,
        can_synchronize_managed,
        reason: if SHARED_INSTALLATION {
            Some(
                "Linux usa el paquete compartido; no hay copias de bytes que sincronizar."
                    .to_string(),
            )
        } else if !has_latest {
            Some("No hay una instalación detenida y validada disponible como fuente.".to_string())
        } else {
            None
        },
    }
}
