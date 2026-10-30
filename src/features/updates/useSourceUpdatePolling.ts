import { useEffect, useRef } from "react";
import { bridge } from "../../lib/bridge";
import {
  mergeSourceUpdateForInstallation,
  SOURCE_UPDATE_POLL_MS,
  sourceInstallationIdentity,
} from "../../lib/source-update-controller";
import { useDashboard } from "../dashboard";

/**
 * Pide el estado oficial cada `SOURCE_UPDATE_POLL_MS`, para la instalación que había al lanzar la consulta. La caché de
 * Rust evita la red mientras el resultado es fresco. Además, si el escaneo trae el resultado caducado, consulta en el
 * momento en lugar de esperar al siguiente sondeo.
 */
export function useSourceUpdatePolling() {
  const { dashboard: state, updateDashboard } = useDashboard();
  const sourceIdentityRef = useRef(sourceInstallationIdentity(state.system));
  sourceIdentityRef.current = sourceInstallationIdentity(state.system);
  const activeRef = useRef(false);
  const inFlightRef = useRef(false);

  const refreshSourceUpdate = useRef(async () => {
    if (!activeRef.current || document.hidden || inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const expected = sourceIdentityRef.current;
      const sourceUpdate = await bridge.checkSourceUpdate();
      if (activeRef.current) {
        updateDashboard((current) => mergeSourceUpdateForInstallation(current, expected, sourceUpdate));
      }
    } catch {
      // La última metadata válida permanece visible desde la caché backend.
    } finally {
      inFlightRef.current = false;
    }
  }).current;

  useEffect(() => {
    activeRef.current = true;
    const timer = window.setInterval(() => void refreshSourceUpdate(), SOURCE_UPDATE_POLL_MS);
    return () => {
      activeRef.current = false;
      window.clearInterval(timer);
    };
  }, [refreshSourceUpdate]);

  // Solo al pasar a caducado: si la consulta falla, el resultado sigue caducado y no se repite hasta el sondeo.
  const stale = state.system.sourceUpdate.stale;
  useEffect(() => {
    if (stale) void refreshSourceUpdate();
  }, [stale, refreshSourceUpdate]);
}
