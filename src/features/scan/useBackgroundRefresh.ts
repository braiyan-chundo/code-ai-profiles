import { useEffect } from "react";
import { BACKGROUND_REFRESH_COOLDOWN_MS, type ScanController } from "../../lib/scan-controller";
import type { SourceUpdateController } from "../../lib/source-update-controller";
import { useDashboard } from "../dashboard";

/**
 * Refresco silencioso por intervalo y al volver el foco. Su listener de `focus` tiene que registrarse
 * después del de la actualización oficial: consume `suppressNextGeneralFocus` (ver DashboardRuntime).
 */
export function useBackgroundRefresh(scanController: ScanController, sourceUpdateController: SourceUpdateController) {
  const { busyRef } = useDashboard();
  useEffect(() => {
    const refreshSilently = (trigger: "focus" | "interval") => {
      if (document.hidden || busyRef.current || sourceUpdateController.blocksGeneralRefresh(trigger)) return;
      scanController.requestBackground(trigger);
    };
    const timer = window.setInterval(() => refreshSilently("interval"), BACKGROUND_REFRESH_COOLDOWN_MS);
    const handleFocus = () => refreshSilently("focus");
    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
    };
  }, [scanController, sourceUpdateController]);
}
