import { createContext, useContext } from "react";
import type { ProjectCandidate, ProjectSummary } from "../../types";
import type { ProjectsStore } from "./projects-store";

/** Lo que devolvió el selector nativo: una carpeta, «cancelar» o un fallo (su motivo queda en `actionError`). */
export type PickResult =
  | { status: "picked"; candidate: ProjectCandidate }
  | { status: "cancelled" }
  | { status: "failed" };

export interface ProjectsContextValue extends ProjectsStore {
  /** Relee la lista entera. Las llamadas que coinciden en el tiempo (StrictMode, dos pantallas) comparten una. */
  refreshAll: () => Promise<void>;
  /** Relee un proyecto. Igual de deduplicada, por id. */
  refreshOne: (id: string) => Promise<void>;
  /** Quita el proyecto de la lista. No toca la carpeta. `true` si se desancló. */
  unpin: (id: string) => Promise<boolean>;
  /** Abre su carpeta en el gestor de archivos. */
  openFolder: (id: string) => Promise<void>;
  /** Abre el selector nativo. */
  pickFolder: () => Promise<PickResult>;
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
