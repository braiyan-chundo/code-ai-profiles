import type { ProjectsState, ProjectSummary } from "../../types";

/**
 * El estado de Proyectos (HU-0023, A-4): un reducer puro, sin React ni Tauri, que prueba `tests/projects.test.ts`.
 * La lista llega entera de Rust (`listProjects`) y se reemplaza; un proyecto suelto (`readProject`, `pinProject`) se
 * funde en su sitio. Nada se guarda fuera de memoria: el registro de anclados vive en Rust.
 */

export type ProjectsStatus = "idle" | "loading" | "ready" | "error";

export interface ProjectsStore {
  status: ProjectsStatus;
  projects: ProjectSummary[];
  /** Cuándo leyó Rust la lista por última vez (RFC 3339). */
  readAt: string | null;
  /** Por qué falló la carga de la lista; `null` si fue bien. */
  error: string | null;
  /** Los proyectos que se están releyendo ahora mismo, por id. */
  refreshing: Record<string, true>;
  /** Una lectura de la lista en curso («Actualizar» o la de entrar en Proyectos). */
  listRefreshing: boolean;
  /** El selector nativo de carpetas está abierto. */
  picking: boolean;
  /** `pinProject` en curso. */
  pinning: boolean;
  /** Lo que salió mal al anclar, para el diálogo. */
  pinError: string | null;
  /** Lo que salió mal en una acción de página (releer, abrir la carpeta, desanclar, el selector). */
  actionError: string | null;
}

export type ProjectsAction =
  | { type: "list/requested" }
  | { type: "list/loaded"; state: ProjectsState }
  | { type: "list/failed"; error: string }
  | { type: "project/requested"; id: string }
  | { type: "project/loaded"; project: ProjectSummary }
  | { type: "project/failed"; id: string; error: string }
  | { type: "project/unpinned"; id: string }
  | { type: "pick/changed"; picking: boolean }
  | { type: "pin/started" }
  | { type: "pin/succeeded"; project: ProjectSummary }
  | { type: "pin/failed"; error: string }
  | { type: "pin-error/cleared" }
  | { type: "action-error/changed"; error: string | null };

export const initialProjectsStore: ProjectsStore = {
  status: "idle",
  projects: [],
  readAt: null,
  error: null,
  refreshing: {},
  listRefreshing: false,
  picking: false,
  pinning: false,
  pinError: null,
  actionError: null,
};

/** Reemplaza el proyecto con el mismo id, o lo añade al final si no estaba. */
function upsert(projects: readonly ProjectSummary[], project: ProjectSummary): ProjectSummary[] {
  return projects.some((item) => item.id === project.id)
    ? projects.map((item) => (item.id === project.id ? project : item))
    : [...projects, project];
}

function without(refreshing: Record<string, true>, id: string): Record<string, true> {
  const { [id]: _removed, ...rest } = refreshing;
  return rest;
}

export function projectsReducer(store: ProjectsStore, action: ProjectsAction): ProjectsStore {
  switch (action.type) {
    case "list/requested":
      // La primera lectura enseña el esqueleto; las siguientes dejan lo que ya hay mientras se relee.
      return { ...store, status: store.status === "ready" ? "ready" : "loading", listRefreshing: true, error: null };
    case "list/loaded":
      return {
        ...store,
        status: "ready",
        projects: action.state.projects,
        readAt: action.state.readAt,
        listRefreshing: false,
        refreshing: {},
        error: null,
      };
    case "list/failed":
      // Con una lista ya cargada, el fallo no la borra: el error se enseña encima.
      return { ...store, status: store.status === "ready" ? "ready" : "error", listRefreshing: false, error: action.error };
    case "project/requested":
      return { ...store, refreshing: { ...store.refreshing, [action.id]: true }, actionError: null };
    case "project/loaded":
      return { ...store, projects: upsert(store.projects, action.project), refreshing: without(store.refreshing, action.project.id) };
    case "project/failed":
      return { ...store, refreshing: without(store.refreshing, action.id), actionError: action.error };
    case "project/unpinned":
      return {
        ...store,
        projects: store.projects.filter((project) => project.id !== action.id),
        refreshing: without(store.refreshing, action.id),
      };
    case "pick/changed":
      return { ...store, picking: action.picking };
    case "pin/started":
      return { ...store, pinning: true, pinError: null };
    case "pin/succeeded":
      return { ...store, pinning: false, pinError: null, projects: upsert(store.projects, action.project) };
    case "pin/failed":
      return { ...store, pinning: false, pinError: action.error };
    case "pin-error/cleared":
      return { ...store, pinError: null };
    case "action-error/changed":
      return { ...store, actionError: action.error };
  }
}
