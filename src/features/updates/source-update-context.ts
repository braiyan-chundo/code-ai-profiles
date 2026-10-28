import { createContext, useContext } from "react";

export interface SourceUpdateContextValue {
  /** Entrega la original a su canal oficial y prepara el refresco de versiones al volver a la ventana. */
  runHandoff: <T>(handoff: () => Promise<T>) => Promise<T>;
}

export const SourceUpdateContext = createContext<SourceUpdateContextValue | null>(null);

export function useSourceUpdate(): SourceUpdateContextValue {
  const value = useContext(SourceUpdateContext);
  if (!value) throw new Error("useSourceUpdate debe usarse dentro de DashboardRuntime.");
  return value;
}
