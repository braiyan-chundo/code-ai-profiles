import { CloudIcon } from "../../components/Icons";
import type { CodeSession, DashboardState, ManagedInstance } from "../../types";
import { useDashboard } from "../dashboard";
import { InstanceCard } from "./InstanceCard";
import { useInstanceActions } from "./useInstanceActions";

/** La lista de instancias administradas que coinciden con la búsqueda. */
export function ManagedInstancesSection({
  instances: filtered,
  outdatedInstances,
  platform: runtimePlatform,
  autoExpand,
  onEdit,
  onDelete,
  onTransfer,
  onUnlink,
}: {
  instances: ManagedInstance[];
  outdatedInstances: ManagedInstance[];
  platform: DashboardState["system"]["platform"];
  autoExpand: boolean;
  onEdit: (instance: ManagedInstance) => void;
  onDelete: (instance: ManagedInstance) => void;
  onTransfer: (instance: ManagedInstance, session: CodeSession) => void;
  onUnlink: (instance: ManagedInstance, session: CodeSession) => void;
}) {
  const { busy, iconPreviews } = useDashboard();
  const instanceActions = useInstanceActions();
  return (
    <section className="managed-profiles-section" aria-labelledby="managed-profiles-title">
      <div className="dashboard-section-heading">
        <div><CloudIcon size={17} /><strong id="managed-profiles-title">Instancias independientes</strong></div>
        <span>{filtered.length} {filtered.length === 1 ? "perfil" : "perfiles"}</span>
      </div>
      <div className="instance-list">
        {filtered.map((instance) => (
          <InstanceCard
            key={instance.id}
            instance={instance}
            platform={runtimePlatform}
            busy={busy}
            updateAvailable={outdatedInstances.some((outdated) => outdated.id === instance.id)}
            iconPreviewUrl={iconPreviews[instance.id] ?? null}
            autoExpand={autoExpand}
            onLaunch={() => instanceActions.launch(instance)}
            onStop={() => instanceActions.stop(instance)}
            onOpen={() => instanceActions.openFolder(instance)}
            onEdit={() => onEdit(instance)}
            onDelete={() => onDelete(instance)}
            onTransfer={(session) => onTransfer(instance, session)}
            onUnlink={(session) => onUnlink(instance, session)}
          />
        ))}
      </div>
    </section>
  );
}
