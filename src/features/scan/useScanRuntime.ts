import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { listen } from "@tauri-apps/api/event";
import { bridge } from "../../lib/bridge";
import { friendlyError } from "../../lib/errors";
import {
  createScanController,
  reconcileManualBusy,
  type ManualScanView,
  type ScanController,
} from "../../lib/scan-controller";
import type { DashboardState } from "../../types";
import { useDashboard } from "../dashboard";

interface ScanProgressEvent {
  progress: number;
  label: string;
}

export interface ScanRuntime {
  controller: ScanController;
  progress: ManualScanView | null;
  manualProgressUnlistenRef: MutableRefObject<(() => void) | null>;
  scanListenerLifecycleRef: MutableRefObject<number>;
}

/**
 * Crea el controlador de escaneo una sola vez (ref perezoso) y guarda la vista del escaneo manual.
 * No registra efectos: el ciclo de vida va en `useScanLifecycle`, que `DashboardRuntime` llama en su turno.
 */
export function useScanRuntime(): ScanRuntime {
  const { replaceDashboard, updateBusy } = useDashboard();
  const [scanProgress, setScanProgress] = useState<ManualScanView | null>(null);
  const manualProgressUnlistenRef = useRef<(() => void) | null>(null);
  const scanListenerLifecycleRef = useRef(0);
  const scanControllerRef = useRef<ReturnType<typeof createScanController<DashboardState>> | null>(null);
  if (!scanControllerRef.current) {
    scanControllerRef.current = createScanController({
      clock: {
        now: () => Date.now(),
        setTimeout: (callback, delay) => window.setTimeout(callback, delay),
        clearTimeout: (timer) => window.clearTimeout(timer),
      },
      runBackground: () => bridge.dashboard(),
      runManual: async (onProgress) => {
        const listenerLifecycle = scanListenerLifecycleRef.current;
        let removeListener: (() => void) | null = null;
        try {
          if (bridge.isDesktop()) {
            try {
              removeListener = await listen<ScanProgressEvent>("scan-progress", ({ payload }) => {
                onProgress(payload.progress, payload.label);
              });
              if (listenerLifecycle !== scanListenerLifecycleRef.current) {
                removeListener();
                removeListener = null;
              } else {
                manualProgressUnlistenRef.current = removeListener;
              }
            } catch {
              // El scan conserva sus estados inicial y terminal si el WebView no expone eventos.
            }
          }
          if (listenerLifecycle !== scanListenerLifecycleRef.current) {
            throw new Error("El ciclo de vida del escaneo manual terminó antes de iniciar.");
          }
          return await bridge.scan();
        } finally {
          if (manualProgressUnlistenRef.current === removeListener) manualProgressUnlistenRef.current = null;
          removeListener?.();
        }
      },
      onBackgroundResult: replaceDashboard,
      onManualResult: replaceDashboard,
      onManualView: (view) => {
        setScanProgress(view);
        updateBusy((current) => reconcileManualBusy(current, view));
      },
      describeError: friendlyError,
    });
  }
  return {
    controller: scanControllerRef.current,
    progress: scanProgress,
    manualProgressUnlistenRef,
    scanListenerLifecycleRef,
  };
}

/** Ciclo de vida del controlador de escaneo: lo activa y, al desmontar, da de baja el listener y lo desactiva. */
export function useScanLifecycle({ controller: scanController, manualProgressUnlistenRef, scanListenerLifecycleRef }: ScanRuntime) {
  useEffect(() => {
    scanController.activate();
    return () => {
      scanListenerLifecycleRef.current += 1;
      manualProgressUnlistenRef.current?.();
      manualProgressUnlistenRef.current = null;
      scanController.deactivate();
    };
  }, [scanController]);
}
