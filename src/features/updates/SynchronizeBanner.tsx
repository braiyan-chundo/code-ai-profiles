import { RefreshIcon } from "../../components/Icons";
import type { ManagedInstance } from "../../types";
import { useDashboard } from "../dashboard";
import { synchronizeLabel as describeSynchronizeLabel } from "./update-messages";

/** Aviso de instancias con una versión anterior a la más reciente instalada. */
export function SynchronizeBanner({
  outdatedInstances,
  onSynchronize,
}: {
  outdatedInstances: ManagedInstance[];
  onSynchronize: () => void;
}) {
  const { dashboard: state, busy } = useDashboard();
  if (!(outdatedInstances.length > 0)) return null;
  const synchronizeLabel = describeSynchronizeLabel(
    state.system.versionTopology.latestSource,
    state.system.versionTopology.latestInstalledVersion,
  );
  return (
    <div className="update-banner">
      <span className="update-banner-icon"><RefreshIcon size={17} /></span>
      <div>
        <strong>{synchronizeLabel}</strong>
        <span>
          {state.system.versionTopology.canSynchronizeManaged
            ? outdatedInstances.length === 1
              ? `${outdatedInstances[0].name} usa una versión anterior.`
              : `${outdatedInstances.length} instancias usan una versión anterior.`
            : state.system.versionTopology.reason ?? "No hay una fuente local válida para sincronizar."}
        </span>
      </div>
      <button
        onClick={onSynchronize}
        disabled={busy !== null || !state.system.versionTopology.canSynchronizeManaged}
      >
        Sincronizar
      </button>
    </div>
  );
}
