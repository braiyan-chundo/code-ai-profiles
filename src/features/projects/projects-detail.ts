import type {
  ProjectCandidate,
  ProjectCounts,
  ProjectHistory,
  ProjectHistoryState,
  ProjectInfo,
  ProjectStatus,
  ProjectTechnology,
  ProjectTotals,
  ProjectWarning,
} from "../../types";

/**
 * Los cálculos de las pantallas de Proyectos (HU-0023, A-4 «Cálculos»): las fracciones de la barra, la tabla de
 * historias, el consumo, las tecnologías agrupadas, lo que enseña el diálogo de anclar y el tope de avisos. Separados
 * de `projects-selectors.ts` para que no entren en el JS principal. Puro, sin React ni Tauri; su prueba es
 * `tests/projects.test.ts`. Sus únicos imports relativos son `import type`.
 */

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

/** Cuántos avisos por campo enseña la página como máximo; el resto se resume en «y N más» (R-10 de la revisión). */
export const MAX_WARNINGS_SHOWN = 20;

/** Los primeros `max` avisos y cuántos quedaron fuera. No cambia el arreglo recibido. */
export function limitWarnings(warnings: readonly ProjectWarning[], max = MAX_WARNINGS_SHOWN): { shown: ProjectWarning[]; hidden: number } {
  return { shown: warnings.slice(0, max), hidden: Math.max(0, warnings.length - max) };
}

// ---- Datos incompletos (HU-0025) ----------------------------------------------------------------------------------

/** El chip de la cabecera (D-1): su texto sin el «· Ver» y su tono. */
export interface IncompleteChip {
  text: string;
  /** `warning` si el proyecto trae avisos reales: icono triángulo y borde `--ui-warning`. */
  tone: "neutral" | "warning";
}

/** Las historias con algún hueco (`dataGaps`), de la más antigua a la más reciente, como en el modal. */
export function incompleteHistories(info: ProjectInfo): ProjectHistory[] {
  return info.histories
    .filter((history) => history.dataGaps.length > 0)
    .sort((a, b) => a.folder.localeCompare(b.folder, "es", { numeric: true }));
}

/** «18 historias con datos incompletos · 2 avisos», «3 avisos al leer el proyecto» o `null` si no hay nada que decir. */
export function incompleteChip(info: ProjectInfo, warnings: readonly ProjectWarning[]): IncompleteChip | null {
  const incomplete = incompleteHistories(info).length;
  const warned = warnings.length;
  if (incomplete === 0 && warned === 0) return null;
  const warningText = warned === 1 ? "1 aviso" : `${warned} avisos`;
  if (incomplete === 0) return { text: `${warningText} al leer el proyecto`, tone: "warning" };
  const incompleteText = `${incomplete} ${incomplete === 1 ? "historia con datos incompletos" : "historias con datos incompletos"}`;
  return warned > 0
    ? { text: `${incompleteText} · ${warningText}`, tone: "warning" }
    : { text: incompleteText, tone: "neutral" };
}

export type IncompleteGroup =
  | { kind: "warnings"; warnings: ProjectWarning[]; hidden: number }
  | { kind: "noMetrics"; histories: ProjectHistory[] }
  | { kind: "noTime"; histories: ProjectHistory[] };

/** Los grupos del modal, de lo más accionable a lo menos: avisos → sin métricas → sin tiempo. Un grupo vacío no sale. */
export function incompleteGroups(info: ProjectInfo, warnings: readonly ProjectWarning[]): IncompleteGroup[] {
  const histories = incompleteHistories(info);
  const noMetrics = histories.filter((history) => history.dataGaps.includes("noMetrics"));
  const noTime = histories.filter((history) => history.dataGaps.includes("noTime"));
  const groups: IncompleteGroup[] = [];
  if (warnings.length > 0) {
    const { shown, hidden } = limitWarnings(warnings);
    groups.push({ kind: "warnings", warnings: shown, hidden });
  }
  if (noMetrics.length > 0) groups.push({ kind: "noMetrics", histories: noMetrics });
  if (noTime.length > 0) groups.push({ kind: "noTime", histories: noTime });
  return groups;
}

/**
 * El comando que genera `metricas.json` de una historia. Sale de `folder`, nunca del `id` del frontmatter, y solo si
 * empieza por `HU-####-`: el texto se pega en una terminal. Rust ya lo garantiza; esto es la segunda barrera.
 */
export function metricsCommand(folder: string): string | null {
  const code = /^(HU-\d{4})-/.exec(folder)?.[1];
  return code ? `node .metodo/scripts/metricas.mjs hu ${code}` : null;
}

/** Los comandos de varias historias, uno por línea, para «Copiar todos». */
export function metricsCommands(histories: readonly Pick<ProjectHistory, "folder">[]): string {
  return histories.flatMap((history) => metricsCommand(history.folder) ?? []).join("\n");
}

/** La pista de «Tiempo en fases»: «de 23 de 41 terminadas» si faltan tiempos; si no, «de 5 historias cerradas». */
export function timeHint(totals: Pick<ProjectTotals, "histories" | "timedHistories">, counts: Pick<ProjectCounts, "done">): string {
  if (totals.timedHistories < counts.done) {
    return totals.timedHistories === 0
      ? `ninguna de ${counts.done} terminadas tiene tiempo`
      : `de ${totals.timedHistories} de ${counts.done} terminadas`;
  }
  if (totals.histories === 0) return "Aún sin historias cerradas";
  return `de ${totals.histories} ${totals.histories === 1 ? "historia cerrada" : "historias cerradas"}`;
}
