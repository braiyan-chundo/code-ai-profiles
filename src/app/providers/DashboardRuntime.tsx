import { useMemo, type ReactNode } from "react";
import { useDashboard, useInitialLoad } from "../../features/dashboard";
import { useLiveUsage } from "../../features/instances";
import {
  ScanContext,
  useBackgroundRefresh,
  useScanLifecycle,
  useScanRuntime,
  type ScanContextValue,
} from "../../features/scan";
import {
  SourceUpdateContext,
  usePendingSynchronization,
  useSourceUpdateController,
  useSourceUpdatePolling,
  useSourceUpdateRuntime,
  type SourceUpdateContextValue,
} from "../../features/updates";

/**
 * Los controladores y los efectos que viven lo que vive la app. Está encima del router: navegar no los recrea.
 *
 * R-1 · ORDEN FIJO. React registra los efectos en el orden de estas llamadas, y con ellos los listeners de
 * `window`. El `focus` de la actualización oficial (3) tiene que registrarse ANTES que el del refresco en
 * segundo plano (6): el primero marca `suppressNextGeneralFocus` y el segundo lo consume. Si se invierte, al
 * volver de la actualización oficial se lanza un escaneo general en paralelo. No reordenes estas llamadas ni
 * registres `focus`, `blur` o `visibilitychange` en ningún otro componente. El paso 7 (HU-0017) va al final y no
 * registra ningún listener de ventana: solo reacciona a los cambios del store.
 */
export function DashboardRuntime({ children }: { children: ReactNode }) {
  const { loading, setError } = useDashboard();

  // Controladores, creados una sola vez en el render (sin efectos).
  const scan = useScanRuntime();
  const sourceUpdateController = useSourceUpdateController();

  useInitialLoad(scan.controller); //                   1. carga inicial
  useScanLifecycle(scan); //                            2. ciclo del escaneo
  useSourceUpdateRuntime(sourceUpdateController); //    3. blur, focus y visibilitychange de la actualización oficial
  useLiveUsage(); //                                    4. uso en vivo (15 s y focus)
  useSourceUpdatePolling(); //                          5. sondeo de 6 h
  useBackgroundRefresh(scan.controller, sourceUpdateController); // 6. refresco en segundo plano (intervalo y focus)
  usePendingSynchronization(); //                       7. sincroniza las instancias pendientes al detenerse (sin listeners)

  const scanController = scan.controller;
  const scanProgress = scan.progress;
  const scanValue = useMemo<ScanContextValue>(() => ({
    progress: scanProgress,
    requestManual: () => {
      if (loading) return;
      setError(null);
      scanController.requestManual();
    },
    dismiss: (generation) => {
      scanController.dismissManual(generation);
    },
  }), [loading, scanController, scanProgress, setError]);

  const sourceUpdateValue = useMemo<SourceUpdateContextValue>(() => ({
    runHandoff: (handoff) => sourceUpdateController.runHandoff(handoff),
  }), [sourceUpdateController]);

  return (
    <ScanContext.Provider value={scanValue}>
      <SourceUpdateContext.Provider value={sourceUpdateValue}>
        {children}
      </SourceUpdateContext.Provider>
    </ScanContext.Provider>
  );
}
