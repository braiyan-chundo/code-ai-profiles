import { createContext, useContext } from "react";
import type { ManualScanView } from "../../lib/scan-controller";

export interface ScanContextValue {
  /** La vista del escaneo manual en curso o terminado, o `null`. */
  progress: ManualScanView | null;
  /** Pide un escaneo manual; no hace nada mientras carga el panel. */
  requestManual: () => void;
  /** Oculta el resultado del escaneo de esa generación. */
  dismiss: (generation: number) => void;
}

export const ScanContext = createContext<ScanContextValue | null>(null);

export function useScan(): ScanContextValue {
  const value = useContext(ScanContext);
  if (!value) throw new Error("useScan debe usarse dentro de DashboardRuntime.");
  return value;
}
