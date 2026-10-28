import { useEffect, useRef } from "react";
import { bridge } from "../../lib/bridge";
import { mergeSourceUpdateForInstallation, sourceInstallationIdentity } from "../../lib/source-update-controller";
import { useDashboard } from "../dashboard";

/** Consulta el estado oficial cada 6 h, para la instalación que había al lanzar la consulta. */
export function useSourceUpdatePolling() {
  const { dashboard: state, updateDashboard } = useDashboard();
  const sourceIdentityRef = useRef(sourceInstallationIdentity(state.system));
  sourceIdentityRef.current = sourceInstallationIdentity(state.system);

  useEffect(() => {
    let active = true;
    const refreshSourceUpdate = async () => {
      if (!active || document.hidden) return;
      try {
        const expected = sourceIdentityRef.current;
        const sourceUpdate = await bridge.checkSourceUpdate();
        if (active) {
          updateDashboard((current) => mergeSourceUpdateForInstallation(current, expected, sourceUpdate));
        }
      } catch {
        // La última metadata válida permanece visible desde la caché backend.
      }
    };
    const timer = window.setInterval(() => void refreshSourceUpdate(), 6 * 60 * 60 * 1_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);
}
