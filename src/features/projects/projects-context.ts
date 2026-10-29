import { createContext, useContext } from "react";
import type { ProjectCandidate, ProjectSummary } from "../../types";
import type { ProjectsStore } from "./projects-store";

export interface ProjectsContextValue extends ProjectsStore {
  /** Relee la lista entera. Las llamadas que coinciden en el tiempo (StrictMode, dos pantallas) comparten una. */
  refreshAll: () => Promise<void>;
  /** Relee un proyecto. Igual de deduplicada, por id. */
  refreshOne: (id: string) => Promise<void>;
  /** Quita el proyecto de la lista. No toca la carpeta. `true` si se desancló. */
  unpin: (id: string) => Promise<boolean>;
  /** Abre su carpeta en el gestor de archivos. */
  openFolder: (id: string) => Promise<void>;
  /** Abre el selector nativo. `null` si se canceló o falló (el fallo queda en `actionError`). */
  pickFolder: () => Promise<ProjectCandidate | null>;
  /** Ancla la carpeta del candidato. `null` si falló (el motivo queda en `pinError`). */
  pinFolder: (path: string) => Promise<ProjectSummary | null>;
  clearPinError: () => void;
  clearActionError: () => void;
}

export const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export function useProjectsContext(): ProjectsContextValue {
  const value = useContext(ProjectsContext);
  if (!value) throw new Error("useProjects debe usarse dentro de ProjectsProvider.");
  return value;
}
