import { useEffect, useMemo } from "react";
import { bridge } from "../../lib/bridge";
import { runningInstanceIds as selectRunningInstanceIds, useDashboard } from "../dashboard";
import { applyLiveUsage } from "./live-usage";

/** Lee el uso en vivo de las instancias en ejecución cada 15 s y al volver el foco. */
export function useLiveUsage() {
  const { dashboard: state, updateDashboard } = useDashboard();
  const runningInstanceIds = useMemo(
    () => selectRunningInstanceIds(state.instances),
    [state.instances],
  );
  const runningInstanceKey = runningInstanceIds.join(":");

  useEffect(() => {
    if (!runningInstanceIds.length) return;
    let active = true;
    const refreshLiveUsage = async () => {
      if (!active || document.hidden) return;
      try {
        const snapshots = await bridge.liveUsage(runningInstanceIds);
        if (!active || !snapshots.length) return;
        const byId = new Map(snapshots.map((snapshot) => [snapshot.instanceId, snapshot.usage]));
        updateDashboard((current) => applyLiveUsage(current, byId));
      } catch {
        // Una lectura parcial conserva la última captura válida.
      }
    };
    void refreshLiveUsage();
    const timer = window.setInterval(() => void refreshLiveUsage(), 15_000);
    window.addEventListener("focus", refreshLiveUsage);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshLiveUsage);
    };
  }, [runningInstanceKey]);
}
