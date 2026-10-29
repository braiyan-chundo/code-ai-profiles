import type {
  ProjectInfo,
  ProjectProtectedLocation,
  ProjectStatus,
  ProjectSummary,
} from "../../types";

/**
 * Lo que necesitan el sidebar y Configuración de Proyectos (HU-0023, A-4): el orden, el nombre, la inicial, el contador
 * «en curso» y qué proyectos viven en una carpeta protegida de macOS. Es lo único que entra en el JS principal; los
 * cálculos de las pantallas viven en `projects-detail.ts`, que solo cargan las rutas. Puro y sin React ni Tauri: lo
 * prueba `tests/projects.test.ts`. Sus únicos imports relativos son `import type`.
 */

/** Un proyecto con su resumen leído: `info` existe solo con `status === "v4"`. */
export type ReadableProject = ProjectSummary & { status: "v4"; info: ProjectInfo };

export function isReadable(project: ProjectSummary): project is ReadableProject {
  return project.status === "v4" && project.info !== null;
}

export function findProject(projects: readonly ProjectSummary[], id: string | undefined): ProjectSummary | undefined {
  return id === undefined ? undefined : projects.find((project) => project.id === id);
}

/** Las carpetas que se ven rotas: todo lo que no es un v4 leído. */
export function isBroken(project: ProjectSummary): boolean {
  return !isReadable(project);
}

/**
 * El orden de la lista y del sidebar: por la última actividad (la más reciente primero) y, a igualdad o sin actividad,
 * por nombre. Los proyectos rotos van al final, en su orden de anclado. No cambia el arreglo recibido.
 */
export function sortProjects(projects: readonly ProjectSummary[]): ProjectSummary[] {
  const healthy = projects.filter((project) => !isBroken(project));
  const broken = projects.filter(isBroken);
  const activity = (project: ProjectSummary) => (isReadable(project) ? project.info.lastActivity ?? "" : "");
  healthy.sort((a, b) => {
    const [x, y] = [activity(a), activity(b)];
    if (x !== y) return x < y ? 1 : -1;
    return projectName(a).localeCompare(projectName(b), "es");
  });
  return [...healthy, ...broken];
}

/** El nombre que se ve: el de la config o, si la carpeta se rompió, el último que se leyó. */
export function projectName(project: ProjectSummary): string {
  const name = project.info?.name ?? project.lastName;
  if (name) return name;
  const segments = project.displayPath.split(/[\\/]/).filter(Boolean);
  return segments[segments.length - 1] ?? "Proyecto";
}

/** La inicial del cuadrado de identidad. */
export function projectInitial(name: string): string {
  const first = Array.from(name.trim())[0];
  return first ? first.toLocaleUpperCase("es") : "?";
}

/** El contador «en curso» del sidebar y de su tooltip. */
export function inProgressCount(project: ProjectSummary): number {
  return project.info?.counts.inProgress ?? 0;
}

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  v4: "Proyecto v4",
  notV4: "No es v4",
  noConfig: "Sin configuración",
  configBroken: "Configuración rota",
  notFound: "Carpeta no encontrada",
  notDirectory: "No es una carpeta",
  permissionDenied: "Sin permiso",
  forbidden: "Carpeta no permitida",
};

// ---- Permisos de macOS (A-6) ----------------------------------------------------------------------------------------

export const PROTECTED_LOCATION_LABEL: Record<ProjectProtectedLocation, string> = {
  desktop: "Escritorio",
  documents: "Documentos",
  downloads: "Descargas",
  icloud: "iCloud Drive",
  external: "un volumen externo",
};

const LOCATION_ORDER: ProjectProtectedLocation[] = ["desktop", "documents", "downloads", "icloud", "external"];

export interface ProtectedProjectsUse {
  /** Cuántos proyectos anclados viven en una ubicación que macOS protege. */
  count: number;
  /** Las ubicaciones, con su nombre, sin repetir y en un orden fijo. */
  locations: string[];
  /** Los nombres de los que macOS no dejó leer (`permissionDenied`). */
  deniedNames: string[];
}

/** Lo que Configuración › Permisos necesita saber de Proyectos (A-6). Solo hay datos en macOS: en el resto, `protectedLocation` es `null`. */
export function selectProtectedProjects(projects: readonly ProjectSummary[]): ProtectedProjectsUse {
  const located = projects.filter((project) => project.protectedLocation !== null);
  const places = new Set(located.map((project) => project.protectedLocation));
  return {
    count: located.length,
    locations: LOCATION_ORDER.filter((place) => places.has(place)).map((place) => PROTECTED_LOCATION_LABEL[place]),
    deniedNames: located.filter((project) => project.status === "permissionDenied").map(projectName),
  };
}
