import { useEffect } from "react";
import { bridge } from "../../lib/bridge";
import { friendlyError } from "../../lib/errors";
import type { ScanController } from "../../lib/scan-controller";
import { mergeSourceUpdateForInstallation, sourceInstallationIdentity } from "../../lib/source-update-controller";
import { useDashboard } from "./dashboard-context";

/** Carga el panel al montar, avisa al controlador de escaneo y después consulta el estado oficial. */
export function useInitialLoad(scanController: ScanController) {
  const { replaceDashboard, updateDashboard, setError, finishLoading } = useDashboard();
  useEffect(() => {
    let active = true;
    const load = async () => {
      let expected: ReturnType<typeof sourceInstallationIdentity> | null = null;
      try {
        const dashboard = await bridge.dashboard();
        expected = sourceInstallationIdentity(dashboard.system);
        if (active) replaceDashboard(dashboard);
      } catch (reason) {
        if (active) setError(friendlyError(reason));
      } finally {
        if (active) {
          finishLoading();
          scanController.markLoaded();
        }
      }
      if (!expected) return;
      try {
        const sourceUpdate = await bridge.checkSourceUpdate();
        if (active) {
          updateDashboard((current) => mergeSourceUpdateForInstallation(current, expected, sourceUpdate));
        }
      } catch {
        // La detección remota nunca bloquea la carga del dashboard.
      }
    };
    void load();
    return () => { active = false; };
  }, [scanController]);
}
