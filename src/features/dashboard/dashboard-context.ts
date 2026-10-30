import { createContext, useContext, type MutableRefObject } from "react";
import type { DashboardState, OriginalInstallProgress } from "../../types";
import type { DashboardStore } from "./dashboard-store";

export interface DashboardContextValue extends DashboardStore {
  /** El último `busy`, para los listeners que no deben recrearse en cada render. */
  busyRef: MutableRefObject<string | null>;
  replaceDashboard: (dashboard: DashboardState) => void;
  updateDashboard: (update: (current: DashboardState) => DashboardState) => void;
  setBusy: (busy: string | null) => void;
  updateBusy: (update: (current: string | null) => string | null) => void;
  /** `title` nombra lo que falló (HU-0026); sin él, el mensaje es el título del aviso, como siempre. */
  setError: (error: string | null, title?: string) => void;
  setNotice: (notice: string | null) => void;
  clearFeedback: () => void;
  finishLoading: () => void;
  storeIconPreview: (instanceId: string, url: string) => void;
  removeIconPreview: (instanceId: string) => void;
  setOriginalInstall: (progress: OriginalInstallProgress) => void;
  finishOriginalInstall: () => void;
  addPendingSync: (instanceIds: string[]) => void;
  removePendingSync: (instanceIds: string[]) => void;
  /**
   * Marca `busy`, limpia el error, reemplaza el estado con el resultado y libera `busy`. Con `errorTitle`, el error
   * sale con ese título y el mensaje de Rust debajo (HU-0026, A-2).
   */
  runAction: (key: string, action: () => Promise<DashboardState>, options?: RunActionOptions) => Promise<void>;
}

export interface RunActionOptions {
  errorTitle?: string;
}

export const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard(): DashboardContextValue {
  const value = useContext(DashboardContext);
  if (!value) throw new Error("useDashboard debe usarse dentro de DashboardProvider.");
  return value;
}
