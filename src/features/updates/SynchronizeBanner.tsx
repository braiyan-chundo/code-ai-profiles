import { RefreshCwIcon } from "lucide-react";
import { NoticeAlert } from "../../components/NoticeAlert";
import { Button } from "../../components/ui/button";
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
    <NoticeAlert
      role="status"
      icon={<RefreshCwIcon aria-hidden="true" className="text-primary-text" />}
      title={synchronizeLabel}
      action={
        <Button
          variant="outline"
          size="sm"
          onClick={onSynchronize}
          disabled={busy !== null || !state.system.versionTopology.canSynchronizeManaged}
        >
          Sincronizar
        </Button>
      }
    >
      {state.system.versionTopology.canSynchronizeManaged
        ? outdatedInstances.length === 1
          ? `${outdatedInstances[0].name} usa una versión anterior.`
          : `${outdatedInstances.length} instancias usan una versión anterior.`
        : state.system.versionTopology.reason ?? "No hay una fuente local válida para sincronizar."}
    </NoticeAlert>
  );
}
