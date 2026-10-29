import { useEffect, useRef } from "react";
import { bridge } from "../../lib/bridge";
import {
  createSourceUpdateController,
  mergeSourceUpdateForInstallation,
  sourceInstallationIdentity,
  type SourceUpdateController,
} from "../../lib/source-update-controller";
import type { DashboardState } from "../../types";
import { useDashboard } from "../dashboard";

/** Crea el controlador de la actualización oficial una sola vez (ref perezoso). No registra efectos. */
export function useSourceUpdateController(): SourceUpdateController {
  const { replaceDashboard, updateDashboard } = useDashboard();
  const sourceUpdateControllerRef = useRef<ReturnType<typeof createSourceUpdateController<DashboardState>> | null>(null);
  if (!sourceUpdateControllerRef.current) {
    sourceUpdateControllerRef.current = createSourceUpdateController({
      runRefresh: () => bridge.refreshVersions(),
      onRefreshResult: replaceDashboard,
      runOfficialCheck: () => bridge.checkSourceUpdate(),
      onOfficialCheckResult: (sourceUpdate, refreshedDashboard) => {
        const expected = sourceInstallationIdentity(refreshedDashboard.system);
        updateDashboard((current) => mergeSourceUpdateForInstallation(current, expected, sourceUpdate));
      },
    });
  }
  return sourceUpdateControllerRef.current;
}

/**
 * Ciclo de la actualización oficial: `blur`, `focus` y `visibilitychange`. Su listener de `focus` tiene que
 * registrarse antes que el del refresco en segundo plano: marca `suppressNextGeneralFocus` (ver DashboardRuntime).
 */
export function useSourceUpdateRuntime(sourceUpdateController: SourceUpdateController) {
  useEffect(() => {
    sourceUpdateController.activate();
    const handleBlur = () => sourceUpdateController.handleBlur();
    const handleFocus = () => sourceUpdateController.handleFocus();
    const handleVisibility = () => sourceUpdateController.handleVisibility(document.hidden);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      sourceUpdateController.deactivate();
    };
  }, [sourceUpdateController]);
}
