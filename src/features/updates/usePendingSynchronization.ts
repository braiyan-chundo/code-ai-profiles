import { useEffect, useRef } from "react";
import { bridge } from "../../lib/bridge";
import { friendlyError } from "../../lib/errors";
import { useDashboard } from "../dashboard";
import { pendingSyncNotice, pendingSyncPlan } from "./original-install";
import { summarizeSynchronization } from "./update-messages";

/**
 * Sincroniza las instancias que quedaron en marcha tras instalar la original, en cuanto se detienen (HU-0017, A-6).
 * No registra ningún listener de ventana (R-1): reacciona a los cambios del store, que llegan por el refresco de 60 s,
 * el de `focus` o el panel que devuelve «Detener». El disparo exige `busy === null` y un vuelo propio libre; mientras
 * sincroniza, `busy` frena el refresco en segundo plano. Quita las que intentó pase lo que pase: una que falla no
 * reintenta en bucle y queda en «Sincronizar instancias».
 */
export function usePendingSynchronization() {
  const {
    dashboard,
    loading,
    busy,
    originalInstall,
    pendingSyncIds,
    setBusy,
    setError,
    setNotice,
    replaceDashboard,
    removePendingSync,
  } = useDashboard();
  const inFlight = useRef(false);

  useEffect(() => {
    if (loading || busy !== null || originalInstall !== null || inFlight.current || pendingSyncIds.length === 0) return;
    const plan = pendingSyncPlan(pendingSyncIds, dashboard);
    if (plan.drop.length > 0) removePendingSync(plan.drop);
    const { latestSource, canSynchronizeManaged } = dashboard.system.versionTopology;
    if (plan.ready.length === 0 || !latestSource || !canSynchronizeManaged) return;

    inFlight.current = true;
    setBusy("update-applications");
    void bridge
      .synchronizeApplications({ source: latestSource, targetInstanceIds: plan.ready })
      .then((result) => {
        replaceDashboard(result.dashboard);
        const summary = summarizeSynchronization(result.results);
        if (summary.notice) setNotice(pendingSyncNotice(summary.notice));
        if (summary.error) setError(summary.error);
      })
      .catch((reason: unknown) => setError(friendlyError(reason)))
      .finally(() => {
        removePendingSync(plan.ready);
        setBusy(null);
        inFlight.current = false;
      });
  }, [
    dashboard,
    loading,
    busy,
    originalInstall,
    pendingSyncIds,
    setBusy,
    setError,
    setNotice,
    replaceDashboard,
    removePendingSync,
  ]);
}
