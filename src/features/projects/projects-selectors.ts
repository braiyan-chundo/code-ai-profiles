import type {
  ProjectCandidate,
  ProjectCounts,
  ProjectHistory,
  ProjectHistoryState,
  ProjectInfo,
  ProjectProtectedLocation,
  ProjectStatus,
  ProjectSummary,
  ProjectTechnology,
} from "../../types";

/**
 * Los cálculos de pantalla de Proyectos (HU-0023, A-4 «Cálculos»): el orden, las fracciones de la barra, las
 * tecnologías agrupadas, el consumo y qué proyectos viven en una carpeta protegida de macOS. Todo puro y sin React ni
 * Tauri: lo prueba `tests/projects.test.ts`. Sus únicos imports relativos son `import type`.
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

/** Los cuatro estados de una historia, siempre en este orden, más `unknown` cuando una historia tiene un estado raro. */
export const STATE_ORDER: ProjectHistoryState[] = ["inProgress", "waiting", "done", "discarded", "unknown"];

export const STATE_LABEL: Record<ProjectHistoryState, string> = {
  inProgress: "En curso",
  waiting: "En espera",
  done: "Terminada",
  discarded: "Descartada",
  unknown: "Sin estado",
};

/** Plural en minúscula, para la leyenda de la barra: «4 en curso», «7 terminadas». */
export const STATE_LEGEND: Record<ProjectHistoryState, string> = {
  inProgress: "en curso",
  waiting: "en espera",
  done: "terminadas",
  discarded: "descartadas",
  unknown: "sin estado",
};

/** Plural en mayúscula inicial, para las pestañas del filtro. */
export const STATE_TAB: Record<ProjectHistoryState, string> = {
  inProgress: "En curso",
  waiting: "En espera",
  done: "Terminadas",
  discarded: "Descartadas",
  unknown: "Sin estado",
};

export interface StateSegment {
  state: ProjectHistoryState;
  count: number;
  /** `count / total`, de 0 a 1; 0 si no hay historias. */
  fraction: number;
}

/** El reparto de la barra por estados. Sin estado raro (`unknown: 0`) solo salen los cuatro de siempre. */
export function stateFractions(counts: ProjectCounts): StateSegment[] {
  const states = STATE_ORDER.filter((state) => state !== "unknown" || counts.unknown > 0);
  return states.map((state) => ({
    state,
    count: counts[state],
    fraction: counts.total > 0 ? counts[state] / counts.total : 0,
  }));
}

/** «4 en curso, 1 en espera, 7 terminadas, 2 descartadas»: el texto accesible de la barra. */
export function stateSummary(counts: ProjectCounts): string {
  return stateFractions(counts).map(({ state, count }) => `${count} ${STATE_LEGEND[state]}`).join(", ");
}

export type HistoryFilter = "all" | ProjectHistoryState;

/** Las pestañas del filtro de la tabla, con su número. «Sin estado» solo aparece si alguna historia lo tiene. */
export function historyFilters(counts: ProjectCounts): { value: HistoryFilter; count: number }[] {
  const states = STATE_ORDER.filter((state) => state !== "unknown" || counts.unknown > 0);
  return [{ value: "all", count: counts.total }, ...states.map((state) => ({ value: state as HistoryFilter, count: counts[state] }))];
}

/** Las filas de la tabla: de la historia más reciente a la más antigua (por carpeta, `HU-0023` > `HU-0022`) y filtradas. */
export function historyRows(histories: readonly ProjectHistory[], filter: HistoryFilter): ProjectHistory[] {
  const rows = filter === "all" ? [...histories] : histories.filter((history) => history.state === filter);
  return rows.sort((a, b) => b.folder.localeCompare(a.folder, "es", { numeric: true }));
}

export interface UsageRow {
  key: string;
  id: string;
  label: string;
  total: number;
  /** El ancho de la barra, de 0 a 1, respecto de la mayor. */
  fraction: number;
}

const fractionOf = (value: number, max: number) => (max > 0 ? value / max : 0);

/** El consumo por historia: solo las que suman en los totales, de mayor a menor. Las descartadas no entran. */
export function consumptionByHistory(info: ProjectInfo): UsageRow[] {
  const counted = info.histories.filter((history) => history.countsInTotals && history.tokens !== null);
  const rows = counted.map((history) => ({
    key: history.folder,
    id: history.id,
    label: history.title,
    total: history.tokens?.total ?? 0,
  }));
  rows.sort((a, b) => b.total - a.total);
  const max = rows[0]?.total ?? 0;
  return rows.map((row) => ({ ...row, fraction: fractionOf(row.total, max) }));
}

export interface RoleRow {
  role: string;
  total: number;
  /** De 0 a 1 respecto del rol que más consumió: la barra. */
  fraction: number;
  /** El porcentaje entero que le toca del total de tokens del proyecto. */
  percent: number;
  approximate: boolean;
}

/** El consumo por rol, de mayor a menor. El orquestador lleva `approximate`. */
export function consumptionByRole(info: ProjectInfo): RoleRow[] {
  const grand = info.totals.tokens.total;
  const rows = info.totals.byRole.map((item) => ({ role: item.role, total: item.tokens.total, approximate: item.approximate }));
  rows.sort((a, b) => b.total - a.total);
  const max = rows[0]?.total ?? 0;
  return rows.map((row) => ({
    ...row,
    fraction: fractionOf(row.total, max),
    percent: grand > 0 ? Math.round((row.total / grand) * 100) : 0,
  }));
}

/** Las cifras de la tarjeta de tokens, todas sacadas de `totals.tokens`. */
export function tokenHeadline(info: ProjectInfo): { total: number; cacheRead: number; input: number; output: number } {
  const { total, cacheRead, input, output } = info.totals.tokens;
  return { total, cacheRead, input, output };
}

// ---- Tecnologías -----------------------------------------------------------------------------------------------------

export type TechnologyGroupId = "languages" | "server" | "interface" | "mobile" | "desktop" | "other" | "tooling";

const GROUP_LABEL: Record<TechnologyGroupId, string> = {
  languages: "Lenguajes",
  server: "Servidor",
  interface: "Interfaz",
  mobile: "Móvil",
  desktop: "Escritorio",
  other: "Otras",
  tooling: "Gestor y packs",
};

const GROUP_ORDER: TechnologyGroupId[] = ["languages", "server", "interface", "mobile", "desktop", "other", "tooling"];

/** La clasificación de las tecnologías que sabe nombrar el backend (A-1.6); lo que no está cae en «Otras». */
const GROUP_OF: Record<string, TechnologyGroupId> = {
  TypeScript: "languages", Rust: "languages", Python: "languages", Go: "languages", PHP: "languages", Ruby: "languages",
  Java: "languages", Kotlin: "languages", Dart: "languages", "Java/Kotlin": "languages",
  NestJS: "server", Express: "server", Fastify: "server", Prisma: "server", Mongoose: "server", Axum: "server",
  "Actix Web": "server", Tokio: "server", Django: "server", FastAPI: "server", Flask: "server", Gin: "server",
  Echo: "server", Fiber: "server", Laravel: "server", Symfony: "server", Rails: "server",
  React: "interface", Vite: "interface", "Tailwind CSS": "interface", "React Router": "interface", "Next.js": "interface",
  Vue: "interface", Nuxt: "interface", Svelte: "interface", SvelteKit: "interface", Angular: "interface", Astro: "interface",
  Flutter: "mobile", Expo: "mobile", "React Native": "mobile",
  Tauri: "desktop", Electron: "desktop",
};

export interface TechnologyChip {
  label: string;
  /** Un pack del método: se pinta en monoespaciada. */
  pack: boolean;
}

export interface TechnologyGroup {
  id: TechnologyGroupId;
  label: string;
  items: TechnologyChip[];
}

/** «React 19», o «Rust» sin versión. */
export function technologyLabel(technology: Pick<ProjectTechnology, "name" | "version">): string {
  return technology.version ? `${technology.name} ${technology.version}` : technology.name;
}

function groupOfTechnology(technology: ProjectTechnology): TechnologyGroupId {
  if (technology.source === "pack" || technology.source === "packageManager") return "tooling";
  return GROUP_OF[technology.name] ?? "other";
}

/** Las tecnologías agrupadas en el orden fijo de `GROUP_ORDER`, sin repetir una que aparece en varios repos. */
export function technologyGroups(technologies: readonly ProjectTechnology[]): TechnologyGroup[] {
  const byGroup = new Map<TechnologyGroupId, TechnologyChip[]>();
  const seen = new Set<string>();
  for (const technology of technologies) {
    const group = groupOfTechnology(technology);
    const label = technologyLabel(technology);
    const key = `${group}:${label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    byGroup.set(group, [...(byGroup.get(group) ?? []), { label, pack: technology.source === "pack" }]);
  }
  // El gestor antes que los packs, como en la maqueta.
  const tooling = byGroup.get("tooling");
  if (tooling) byGroup.set("tooling", [...tooling.filter((chip) => !chip.pack), ...tooling.filter((chip) => chip.pack)]);
  return GROUP_ORDER.flatMap((id) => {
    const items = byGroup.get(id);
    return items ? [{ id, label: GROUP_LABEL[id], items }] : [];
  });
}

/** Las 4 a 5 tecnologías de la tarjeta: las de los manifiestos y, si no hay, los packs y el gestor. */
export function cardTechnologies(info: ProjectInfo, limit = 5): string[] {
  const manifest = info.technologies.filter((technology) => technology.source === "manifest");
  const pool = manifest.length > 0 ? manifest : info.technologies;
  const labels: string[] = [];
  for (const technology of pool) {
    const label = technologyLabel(technology);
    if (!labels.includes(label)) labels.push(label);
  }
  return labels.slice(0, limit);
}

/** «React 19 · Tauri 2 · Rust»: las tecnologías de un repo. */
export function repoTechnologies(info: ProjectInfo, repoName: string): string {
  return info.technologies
    .filter((technology) => technology.repo === repoName)
    .map(technologyLabel)
    .join(" · ");
}

/** De dónde salen las tecnologías, en una frase: «De package.json, src-tauri/Cargo.toml y los packs de .metodo/config.json.» */
export function technologySources(info: ProjectInfo): string {
  const manifests = [...new Set(info.repos.flatMap((repo) => repo.manifests))];
  const parts: string[] = [];
  if (manifests.length > 0) parts.push(info.repos.length > 1 ? "los manifiestos de cada repo" : manifests.join(", "));
  if (info.packs.length > 0 || info.packageManager) parts.push("los packs de .metodo/config.json");
  if (parts.length === 0) return "De .metodo/config.json.";
  return `De ${parts.join(" y ")}.`;
}

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

// ---- El diálogo de anclar -----------------------------------------------------------------------------------------

export interface CandidateCheck {
  ok: boolean;
  /** El texto, con `código` entre acentos graves. */
  text: string;
  /** Lo que se detectó, a la derecha. */
  detail: string | null;
}

/** Lo que enseña el diálogo de anclar: una fila por lo que se comprobó, solo con lo que Rust devolvió. */
export function candidateChecks(candidate: ProjectCandidate): CandidateCheck[] {
  switch (candidate.status) {
    case "v4": {
      const checks: CandidateCheck[] = [
        {
          ok: true,
          text: `\`.metodo/config.json\` · versión ${candidate.configVersion ?? 4}`,
          detail: [candidate.profile ? `Perfil ${candidate.profile}` : null, candidate.phase ? capitalize(candidate.phase) : null]
            .filter(Boolean)
            .join(" · ") || null,
        },
      ];
      if (candidate.historyCount !== null) {
        checks.push({ ok: true, text: `${candidate.historyCount} ${candidate.historyCount === 1 ? "historia" : "historias"} en \`hu/\``, detail: null });
      }
      if (candidate.repoCount !== null) {
        checks.push({ ok: true, text: `${candidate.repoCount} ${candidate.repoCount === 1 ? "repo" : "repos"}`, detail: null });
      }
      return checks;
    }
    case "notV4":
      return [
        candidate.configVersion !== null
          ? { ok: false, text: `\`.metodo/config.json\` es de la versión ${candidate.configVersion}`, detail: "se necesita la 4" }
          : { ok: false, text: "`.metodo/config.json` no indica la versión", detail: "se necesita la 4" },
      ];
    case "noConfig":
      return [{ ok: false, text: "No hay `.metodo/config.json`", detail: "se necesita la versión 4" }];
    case "configBroken":
      return [{ ok: false, text: "`.metodo/config.json` no se pudo leer", detail: null }];
    default:
      return [{ ok: false, text: "No se pudo leer la carpeta", detail: null }];
  }
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

/** El título del aviso del diálogo cuando el candidato no se puede anclar. */
export function candidateProblemTitle(status: ProjectStatus): string {
  switch (status) {
    case "notV4":
    case "noConfig":
    case "configBroken":
      return "No es un proyecto v4";
    case "permissionDenied":
      return "macOS no deja leer esta carpeta";
    case "forbidden":
      return "Esta carpeta no se puede anclar";
    case "notFound":
    case "notDirectory":
      return "No se encontró la carpeta";
    default:
      return "No se puede anclar";
  }
}
