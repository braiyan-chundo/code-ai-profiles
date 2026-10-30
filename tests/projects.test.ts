import assert from "node:assert/strict";
import test from "node:test";
import {
  cachePercent,
  formatCacheShare,
  formatClock,
  formatDay,
  formatHoursCompact,
  formatLocalDay,
  formatMinutes,
  formatPhase,
  formatRelative,
  formatRepoCount,
  formatSinceRange,
  formatSpanDays,
  formatTokens,
  formatTokensCompact,
  inputPlusOutput,
} from "../src/features/projects/projects-format.ts";
import {
  candidateChecks,
  cardTechnologies,
  consumptionByHistory,
  consumptionByRole,
  historyFilters,
  historyRows,
  incompleteChip,
  incompleteGroups,
  incompleteHistories,
  limitWarnings,
  metricsCommand,
  metricsCommands,
  repoTechnologies,
  stateFractions,
  stateSummary,
  technologyGroups,
  technologySources,
  timeHint,
} from "../src/features/projects/projects-detail.ts";
import { linkTarget, readerBody } from "../src/features/projects/history-reader.ts";
import {
  findProject,
  inProgressCount,
  isBroken,
  projectInitial,
  projectName,
  selectProtectedProjects,
  sortProjects,
} from "../src/features/projects/projects-selectors.ts";
import { initialProjectsStore, projectsReducer, type ProjectsAction, type ProjectsStore } from "../src/features/projects/projects-store.ts";
import type {
  ProjectCandidate,
  ProjectCounts,
  ProjectDataGap,
  ProjectHistory,
  ProjectHistoryState,
  ProjectInfo,
  ProjectStatus,
  ProjectSummary,
  ProjectTechnology,
  ProjectWarning,
  TokenBreakdown,
} from "../src/types.ts";

// ---- Datos de prueba: las cifras de Code AI Profiles de `diseno/vista.md` -------------------------------------------

const tokens = (input: number, output: number, cacheWrite: number, cacheRead: number): TokenBreakdown => ({
  input, output, cacheWrite, cacheRead, total: input + output + cacheWrite + cacheRead,
});

function history(folder: string, state: ProjectHistoryState, minutes: number | null, usage: TokenBreakdown | null, counts = state === "done"): ProjectHistory {
  return {
    id: folder.slice(0, 7), folder, title: `Título ${folder.slice(0, 7)}`, state, phase: "cierre", area: "interfaz",
    priority: "media", created: "2026-10-28", minutes, tokens: usage, countsInTotals: counts && usage !== null, dataGaps: [],
  };
}

const counts = (partial: Partial<ProjectCounts>): ProjectCounts => ({ total: 0, waiting: 0, inProgress: 0, done: 0, discarded: 0, unknown: 0, ...partial });

function info(partial: Partial<ProjectInfo> = {}): ProjectInfo {
  const histories = [
    history("HU-0010-a", "done", 1864, tokens(1568, 481471, 1720987, 171555142)),
    history("HU-0011-b", "done", 194, tokens(276, 118746, 461985, 17920179)),
    history("HU-0012-c", "discarded", 1793, tokens(1328, 412484, 1535388, 157104813)),
    history("HU-0017-d", "inProgress", null, null),
    history("HU-0018-e", "waiting", null, null),
    history("HU-0020-f", "done", 139, tokens(712, 408850, 1785334, 88824103)),
  ];
  return {
    name: "Code AI Profiles", slug: "code-ai-profiles", summary: "Resumen", profile: "S", phase: "desarrollo",
    approver: "Braiyan", packageManager: "pnpm", packs: ["frontend-react-vite"],
    repos: [{ name: "code-ai-profiles", path: ".", kind: "otro", status: "ok", manifests: ["package.json", "src-tauri/Cargo.toml"], git: null }],
    technologies: [],
    histories,
    counts: counts({ total: 14, inProgress: 4, waiting: 1, done: 7, discarded: 2 }),
    firstCreated: "2026-10-27", lastActivity: "2026-10-29T00:27", spanDays: 3,
    totals: {
      histories: 7, minutes: 3383, timedHistories: 7,
      tokens: { input: 5_000_000 - 2_256_135, output: 2_256_135, cacheWrite: 10_000_000, cacheRead: 559_000_000 - 0, total: 571_504_427 },
      byRole: [
        { role: "frontend", tokens: tokens(0, 0, 0, 143_497_899), approximate: false },
        { role: "orquestador", tokens: tokens(0, 0, 0, 326_955_814), approximate: true },
        { role: "backend", tokens: tokens(0, 0, 0, 25_552_403), approximate: false },
      ],
    },
    ...partial,
  };
}

function project(id: string, status: ProjectStatus, overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id, path: `/p/${id}`, displayPath: `~/Proyectos/${id}`, lastName: id, pinnedAt: "2026-10-29T05:10:00Z", lastReadAt: null,
    readAt: "2026-10-29T07:31:00Z", status, message: status === "v4" ? null : "Mensaje de Rust", protectedLocation: null,
    info: status === "v4" ? info({ name: id }) : null, warnings: [], ...overrides,
  };
}

const withActivity = (id: string, lastActivity: string | null) => project(id, "v4", { info: info({ name: id, lastActivity }) });

// ---- Orden -------------------------------------------------------------------------------------------------------

test("el orden: por la última actividad y los rotos al final, en su orden de anclado", () => {
  const list = [
    project("roto-b", "notFound"),
    withActivity("viejo", "2026-10-23T09:00"),
    project("roto-a", "permissionDenied"),
    withActivity("reciente", "2026-10-29T00:27"),
    withActivity("sin-actividad", null),
    withActivity("medio", "2026-10-28T18:40"),
  ];
  const before = list.map((item) => item.id);
  assert.deepEqual(sortProjects(list).map((item) => item.id), ["reciente", "medio", "viejo", "sin-actividad", "roto-b", "roto-a"]);
  assert.deepEqual(list.map((item) => item.id), before, "no cambia el arreglo recibido");
});

test("a igual actividad, por nombre; un v4 sin info cuenta como roto", () => {
  const same = [withActivity("zeta", "2026-10-29T00:27"), withActivity("alfa", "2026-10-29T00:27")];
  assert.deepEqual(sortProjects(same).map((item) => item.id), ["alfa", "zeta"]);
  assert.equal(isBroken(project("x", "v4", { info: null })), true);
  assert.equal(isBroken(project("y", "v4")), false);
});

test("nombre, inicial y contador del sidebar", () => {
  assert.equal(projectName(project("a", "v4")), "a");
  assert.equal(projectName(project("a", "notFound", { lastName: "Panel Finanzas" })), "Panel Finanzas", "el último nombre leído");
  assert.equal(projectName(project("a", "notFound", { lastName: null, displayPath: "~/Proyectos/panel-finanzas" })), "panel-finanzas");
  assert.equal(projectInitial("vetcare"), "V");
  assert.equal(projectInitial(""), "?");
  assert.equal(inProgressCount(project("a", "v4")), 4);
  assert.equal(inProgressCount(project("a", "notFound")), 0);
  assert.equal(findProject([project("a", "v4")], "a")?.id, "a");
  assert.equal(findProject([project("a", "v4")], "b"), undefined);
  assert.equal(findProject([project("a", "v4")], undefined), undefined);
});

// ---- Cifras ------------------------------------------------------------------------------------------------------

test("tokens: «572 M» grande, «571,5 M» en la tabla, «2,7 M» de entrada + salida", () => {
  assert.equal(formatTokensCompact(571_504_427), "572 M");
  assert.equal(formatTokens(571_504_427), "571,5 M");
  assert.equal(formatTokens(173_759_168), "173,8 M");
  assert.equal(formatTokensCompact(2_743_865), "2,7 M");
  assert.equal(formatTokensCompact(3_280_000_000), "3.280 M");
  assert.equal(formatTokens(12_345), "12,3 k");
  assert.equal(formatTokens(845), "845");
  assert.equal(formatTokensCompact(0), "0");
});

test("«98 % caché» es cacheRead / total; entrada + salida es input + output", () => {
  const usage = { input: 6_000, output: 2_743_865 - 6_000, cacheWrite: 9_000_000, cacheRead: 559_000_000, total: 571_504_427 };
  assert.equal(formatCacheShare(usage), "98 % caché");
  assert.equal(cachePercent(usage), 98);
  assert.equal(inputPlusOutput(usage), 2_743_865);
  assert.equal(formatTokensCompact(inputPlusOutput(usage)), "2,7 M");
  assert.equal(formatCacheShare({ cacheRead: 0, total: 0 }), null);
});

test("tiempo en fases: «56 h» (3383 min), «56,4 h», filas «2,3 h» y «45 min»", () => {
  assert.equal(formatHoursCompact(3383), "56 h");
  assert.equal(formatMinutes(3383), "56,4 h");
  assert.equal(formatMinutes(139), "2,3 h");
  assert.equal(formatMinutes(45), "45 min");
  assert.equal(formatHoursCompact(45), "45 min");
  assert.equal(formatHoursCompact(0), "0 min");
});

test("«Desde»: spanDays y el rango de fechas", () => {
  assert.equal(formatSpanDays(3), "3 días");
  assert.equal(formatSpanDays(1), "1 día");
  assert.equal(formatSpanDays(null), null);
  const now = new Date(2026, 9, 29, 10, 0);
  assert.equal(formatSinceRange("2026-10-27", "2026-10-29T00:27", now), "27 oct → hoy");
  assert.equal(formatSinceRange("2026-10-27", "2026-10-28T18:40", now), "27 oct → 28 oct");
  assert.equal(formatSinceRange("2026-10-27", null, now), "27 oct");
  assert.equal(formatSinceRange(null, "2026-10-28T18:40", now), null);
  assert.equal(formatDay("2026-10-27"), "27 oct");
  assert.equal(formatDay("2026-09-02T10:00"), "2 sep");
  assert.equal(formatDay("sin fecha"), "sin fecha");
});

test("fechas relativas, hora y día locales", () => {
  const now = new Date(2026, 9, 29, 2, 31);
  assert.equal(formatRelative("2026-10-29T02:06", now), "hace 25 min");
  assert.equal(formatRelative("2026-10-29T00:27", now), "hace 2 h");
  assert.equal(formatRelative("2026-10-23T02:00", now), "hace 6 días");
  assert.equal(formatRelative("2026-10-28T02:00", now), "hace 1 día");
  assert.equal(formatRelative("2026-10-29T02:31", now), "hace un momento");
  assert.equal(formatRelative("2026-10-29T09:00", now), "hace un momento", "un instante futuro");
  assert.equal(formatRelative("no es una fecha", now), "");
  assert.equal(formatClock(new Date(2026, 9, 29, 2, 31).toISOString()), "02:31");
  assert.equal(formatLocalDay(new Date(2026, 9, 17, 14, 20).toISOString()), "17 oct");
  assert.equal(formatClock("basura"), "");
  assert.equal(formatClock(new Date(2026, 9, 29, 2, 31, 7).toISOString(), true), "02:31:07", "con segundos, para ver que releyó");
  assert.equal(formatClock("basura", true), "");
});

test("plurales y fases", () => {
  assert.equal(formatRepoCount(1), "1 repo");
  assert.equal(formatRepoCount(3), "3 repos");
  assert.equal(formatPhase("verificacion"), "Verificación");
  assert.equal(formatPhase("implementacion"), "Implementación");
  assert.equal(formatPhase("desarrollo"), "Desarrollo");
});

// ---- La barra por estados y la tabla -----------------------------------------------------------------------------

test("fracciones de la barra: 4 · 1 · 7 · 2 de 14 y su texto accesible", () => {
  const segments = stateFractions(counts({ total: 14, inProgress: 4, waiting: 1, done: 7, discarded: 2 }));
  assert.deepEqual(segments.map((segment) => segment.state), ["inProgress", "waiting", "done", "discarded"]);
  assert.deepEqual(segments.map((segment) => segment.count), [4, 1, 7, 2]);
  assert.ok(Math.abs(segments[0].fraction - 4 / 14) < 1e-9);
  assert.ok(Math.abs(segments.reduce((sum, segment) => sum + segment.fraction, 0) - 1) < 1e-9);
  assert.equal(stateSummary(counts({ total: 14, inProgress: 4, waiting: 1, done: 7, discarded: 2 })), "4 en curso, 1 en espera, 7 terminadas, 2 descartadas");
  assert.ok(stateFractions(counts({ total: 3, done: 2, unknown: 1 })).some((segment) => segment.state === "unknown"), "«sin estado» solo si hay una");
  assert.deepEqual(stateFractions(counts({})).map((segment) => segment.fraction), [0, 0, 0, 0], "sin historias, sin dividir entre cero");
});

test("pestañas del filtro y filas: de la más reciente a la más antigua, y el filtro por estado", () => {
  const data = info();
  assert.deepEqual(historyFilters(data.counts).map((tab) => [tab.value, tab.count]), [
    ["all", 14], ["inProgress", 4], ["waiting", 1], ["done", 7], ["discarded", 2],
  ]);
  assert.ok(historyFilters(counts({ total: 2, unknown: 1, done: 1 })).some((tab) => tab.value === "unknown"));
  assert.deepEqual(historyRows(data.histories, "all").map((row) => row.id), ["HU-0020", "HU-0018", "HU-0017", "HU-0012", "HU-0011", "HU-0010"]);
  assert.deepEqual(historyRows(data.histories, "done").map((row) => row.id), ["HU-0020", "HU-0011", "HU-0010"]);
  assert.deepEqual(historyRows(data.histories, "unknown"), []);
  const numbered = [history("HU-0100-x", "done", 1, null), history("HU-0099-y", "done", 1, null)];
  assert.deepEqual(historyRows(numbered, "all").map((row) => row.id), ["HU-0100", "HU-0099"]);
});

// ---- Consumo -----------------------------------------------------------------------------------------------------

test("consumo por historia: solo las que suman, de mayor a menor; la mayor llena la barra", () => {
  const rows = consumptionByHistory(info());
  assert.deepEqual(rows.map((row) => row.id), ["HU-0010", "HU-0020", "HU-0011"], "la descartada HU-0012 no entra");
  assert.equal(rows[0].fraction, 1);
  assert.ok(Math.abs(rows[1].fraction - rows[1].total / rows[0].total) < 1e-9);
  assert.equal(formatTokens(rows[0].total), "173,8 M");
  assert.deepEqual(consumptionByHistory(info({ histories: [] })), []);
});

test("consumo por rol: orden, barra respecto del mayor y porcentaje del total", () => {
  const rows = consumptionByRole(info());
  assert.deepEqual(rows.map((row) => row.role), ["orquestador", "frontend", "backend"]);
  assert.equal(rows[0].approximate, true);
  assert.equal(rows[0].percent, 57, "326,96 M de 571,50 M");
  assert.equal(rows[1].percent, 25);
  assert.equal(rows[2].percent, 4);
  assert.equal(rows[0].fraction, 1);
  assert.equal(consumptionByRole(info({ totals: { histories: 0, minutes: 0, tokens: tokens(0, 0, 0, 0), byRole: [] } })).length, 0);
});

// ---- Tecnologías --------------------------------------------------------------------------------------------------

const tech = (name: string, version: string | null, source: ProjectTechnology["source"], repo: string | null = "code-ai-profiles"): ProjectTechnology => ({ name, version, source, repo });

test("tecnologías agrupadas en orden fijo, sin repetir y con el gestor antes que los packs", () => {
  const data = [
    tech("frontend-react-vite", null, "pack", null),
    tech("pnpm", "12", "packageManager", null),
    tech("React", "19", "manifest"),
    tech("React", "19", "manifest", "otro-repo"),
    tech("Rust", null, "manifest"),
    tech("Tauri", "2", "manifest"),
    tech("TypeScript", "5.7", "manifest"),
    tech("Algo raro", "1", "manifest"),
  ];
  const groups = technologyGroups(data);
  assert.deepEqual(groups.map((group) => group.label), ["Lenguajes", "Interfaz", "Escritorio", "Otras", "Gestor y packs"]);
  assert.deepEqual(groups[0].items.map((chip) => chip.label), ["Rust", "TypeScript 5.7"]);
  assert.deepEqual(groups[1].items.map((chip) => chip.label), ["React 19"], "React aparece en dos repos y sale una vez");
  assert.deepEqual(groups[4].items, [{ label: "pnpm 12", pack: false }, { label: "frontend-react-vite", pack: true }]);
  assert.deepEqual(technologyGroups([]), []);
});

test("tecnologías de la tarjeta y del repo, y de dónde salen", () => {
  const data = info({
    technologies: [
      tech("pnpm", "12", "packageManager", null),
      tech("frontend-react-vite", null, "pack", null),
      tech("React", "19", "manifest"),
      tech("Vite", "6", "manifest"),
      tech("Tailwind CSS", "4", "manifest"),
      tech("Tauri", "2", "manifest"),
      tech("Rust", null, "manifest"),
      tech("TypeScript", "5", "manifest"),
    ],
  });
  assert.deepEqual(cardTechnologies(data), ["React 19", "Vite 6", "Tailwind CSS 4", "Tauri 2", "Rust"]);
  assert.deepEqual(cardTechnologies(data, 2), ["React 19", "Vite 6"]);
  assert.deepEqual(cardTechnologies(info({ technologies: [tech("pnpm", "12", "packageManager", null)] })), ["pnpm 12"], "sin manifiestos, el gestor y los packs");
  assert.equal(repoTechnologies(data, "code-ai-profiles"), "React 19 · Vite 6 · Tailwind CSS 4 · Tauri 2 · Rust · TypeScript 5");
  assert.equal(repoTechnologies(data, "otro"), "");
  assert.equal(technologySources(data), "De package.json, src-tauri/Cargo.toml y los packs de .metodo/config.json.");
});

// ---- Permisos de macOS (A-6) --------------------------------------------------------------------------------------

test("proyectos en carpetas protegidas: cuántos, dónde y cuáles se negaron", () => {
  const list = [
    project("a", "v4", { protectedLocation: "documents" }),
    project("b", "permissionDenied", { protectedLocation: "documents", lastName: "Vetcare" }),
    project("c", "v4", { protectedLocation: "desktop" }),
    project("d", "v4", { protectedLocation: null }),
    project("e", "v4", { protectedLocation: "external" }),
  ];
  assert.deepEqual(selectProtectedProjects(list), {
    count: 4,
    locations: ["Escritorio", "Documentos", "un volumen externo"],
    deniedNames: ["Vetcare"],
  });
  assert.deepEqual(selectProtectedProjects([project("d", "v4")]), { count: 0, locations: [], deniedNames: [] });
  assert.deepEqual(selectProtectedProjects([]), { count: 0, locations: [], deniedNames: [] });
});

// ---- Diálogo de anclar --------------------------------------------------------------------------------------------

function candidate(overrides: Partial<ProjectCandidate>): ProjectCandidate {
  return {
    path: "/p/x", displayPath: "~/x", status: "v4", message: null, configVersion: 4, name: "X", profile: "S", phase: "desarrollo",
    historyCount: 9, repoCount: 1, alreadyPinnedId: null, ...overrides,
  };
}

test("lo que enseña el diálogo: solo lo que Rust devolvió", () => {
  const ok = candidateChecks(candidate({}));
  assert.deepEqual(ok.map((check) => check.ok), [true, true, true]);
  assert.equal(ok[0].detail, "Perfil S · Desarrollo");
  assert.equal(ok[1].text, "9 historias en `hu/`");
  assert.equal(ok[2].text, "1 repo");
  assert.deepEqual(candidateChecks(candidate({ historyCount: null, repoCount: null, profile: null, phase: null })).length, 1);
  const old = candidateChecks(candidate({ status: "notV4", configVersion: 3 }));
  assert.deepEqual(old, [{ ok: false, text: "`.metodo/config.json` es de la versión 3", detail: "se necesita la 4" }]);
  assert.equal(candidateChecks(candidate({ status: "notV4", configVersion: null }))[0].text, "`.metodo/config.json` no indica la versión");
  assert.equal(candidateChecks(candidate({ status: "noConfig" }))[0].ok, false);
  assert.equal(candidateChecks(candidate({ status: "permissionDenied" }))[0].text, "No se pudo leer la carpeta");
});

// ---- Reducer ------------------------------------------------------------------------------------------------------

const run = (actions: ProjectsAction[], from: ProjectsStore = initialProjectsStore) => actions.reduce(projectsReducer, from);
const a = project("a", "v4");
const b = project("b", "notFound");

test("reducer: la primera carga enseña «loading» y la lista reemplaza lo anterior", () => {
  const loading = run([{ type: "list/requested" }]);
  assert.equal(loading.status, "loading");
  assert.equal(loading.listRefreshing, true);
  const ready = run([{ type: "list/loaded", state: { projects: [a, b], readAt: "2026-10-29T07:31:00Z" } }], loading);
  assert.equal(ready.status, "ready");
  assert.equal(ready.listRefreshing, false);
  assert.deepEqual(ready.projects.map((item) => item.id), ["a", "b"]);
  assert.equal(ready.readAt, "2026-10-29T07:31:00Z");
  const again = run([{ type: "list/requested" }], ready);
  assert.equal(again.status, "ready", "releer no vuelve al esqueleto");
  assert.deepEqual(again.projects, ready.projects);
  assert.deepEqual(run([{ type: "list/loaded", state: { projects: [b], readAt: "x" } }], again).projects.map((item) => item.id), ["b"]);
});

test("reducer: un fallo de la lista sin datos es «error»; con datos los conserva", () => {
  const failed = run([{ type: "list/requested" }, { type: "list/failed", error: "No se pudo leer." }]);
  assert.equal(failed.status, "error");
  assert.equal(failed.error, "No se pudo leer.");
  const ready = run([{ type: "list/loaded", state: { projects: [a], readAt: "x" } }]);
  const kept = run([{ type: "list/requested" }, { type: "list/failed", error: "Otra vez." }], ready);
  assert.equal(kept.status, "ready");
  assert.deepEqual(kept.projects, [a]);
  assert.equal(kept.error, "Otra vez.");
  assert.equal(run([{ type: "list/requested" }], kept).error, null, "pedir de nuevo limpia el error");
});

test("reducer: releer un proyecto lo marca, lo reemplaza en su sitio y, si falla, deja el aviso", () => {
  const ready = run([{ type: "list/loaded", state: { projects: [a, b], readAt: "x" } }]);
  const reading = run([{ type: "project/requested", id: "a" }], ready);
  assert.deepEqual(reading.refreshing, { a: true });
  const fresh = { ...a, readAt: "2026-10-29T08:00:00Z" };
  const done = run([{ type: "project/loaded", project: fresh }], reading);
  assert.deepEqual(done.refreshing, {});
  assert.equal(done.projects[0].readAt, "2026-10-29T08:00:00Z");
  assert.deepEqual(done.projects.map((item) => item.id), ["a", "b"], "mismo orden");
  const failed = run([{ type: "project/requested", id: "a" }, { type: "project/failed", id: "a", error: "El proyecto ya no está anclado." }], ready);
  assert.deepEqual(failed.refreshing, {});
  assert.equal(failed.actionError, "El proyecto ya no está anclado.");
  assert.deepEqual(failed.projects, [a, b]);
  assert.equal(run([{ type: "project/requested", id: "a" }], failed).actionError, null, "una acción nueva limpia el aviso");
});

test("reducer: desanclar quita el proyecto y su lectura en vuelo", () => {
  const ready = run([{ type: "list/loaded", state: { projects: [a, b], readAt: "x" } }, { type: "project/requested", id: "b" }]);
  const unpinned = run([{ type: "project/unpinned", id: "b" }], ready);
  assert.deepEqual(unpinned.projects.map((item) => item.id), ["a"]);
  assert.deepEqual(unpinned.refreshing, {});
});

test("R-9: una lista que salió antes de desanclar no devuelve el proyecto", () => {
  const ready = run([{ type: "list/loaded", state: { projects: [a, b], readAt: "x" } }]);
  const racing = run([{ type: "list/requested" }, { type: "project/unpinned", id: "b" }], ready);
  assert.deepEqual(racing.projects.map((item) => item.id), ["a"]);
  const landed = run([{ type: "list/loaded", state: { projects: [a, b], readAt: "y" } }], racing);
  assert.deepEqual(landed.projects.map((item) => item.id), ["a"], "la lista vieja aún traía b");
  assert.deepEqual(landed.unpinnedDuringList, {});
  const later = run([{ type: "list/requested" }, { type: "list/loaded", state: { projects: [b], readAt: "z" } }], landed);
  assert.deepEqual(later.projects.map((item) => item.id), ["b"], "una lista pedida después sí manda");
  const idle = run([{ type: "project/unpinned", id: "b" }], ready);
  assert.deepEqual(idle.unpinnedDuringList, {}, "sin lista en vuelo no se anota nada");
  assert.deepEqual(run([{ type: "list/requested" }, { type: "project/unpinned", id: "b" }, { type: "list/failed", error: "x" }], ready).unpinnedDuringList, {});
});

test("R-9: una lista que salió antes de anclar no hace desaparecer lo anclado", () => {
  const ready = run([{ type: "list/loaded", state: { projects: [a], readAt: "x" } }]);
  const racing = run([{ type: "list/requested" }, { type: "pin/succeeded", project: b }], ready);
  const landed = run([{ type: "list/loaded", state: { projects: [a], readAt: "y" } }], racing);
  assert.deepEqual(landed.projects.map((item) => item.id).sort(), ["a", "b"]);
  const fresher = run([{ type: "list/loaded", state: { projects: [a, { ...b, readAt: "2030-01-01T00:00:00Z" }], readAt: "y" } }], racing);
  assert.equal(fresher.projects.filter((item) => item.id === "b").length, 1, "si la lista ya lo trae, no se duplica");
  assert.equal(fresher.projects.find((item) => item.id === "b")?.readAt, "2030-01-01T00:00:00Z");
  const again = run([{ type: "project/unpinned", id: "b" }, { type: "pin/succeeded", project: b }], racing);
  assert.deepEqual(again.unpinnedDuringList, {}, "volver a anclar quita la marca de desanclado");
});

test("R-9: una lectura tardía no devuelve un proyecto desanclado ni pisa una más nueva", () => {
  const ready = run([{ type: "list/loaded", state: { projects: [a, b], readAt: "x" } }, { type: "project/requested", id: "a" }, { type: "project/requested", id: "b" }]);
  const unpinned = run([{ type: "project/unpinned", id: "a" }, { type: "project/loaded", project: { ...a, readAt: "2030-01-01T00:00:00Z" } }], ready);
  assert.deepEqual(unpinned.projects.map((item) => item.id), ["b"], "a no vuelve");
  assert.deepEqual(unpinned.refreshing, { b: true }, "la lectura tardía libera su marca, no la de otro");
  const newer = project("n", "v4", { readAt: "2026-10-29T09:00:00Z" });
  const base = run([{ type: "list/loaded", state: { projects: [newer], readAt: "x" } }]);
  const old = run([{ type: "project/loaded", project: { ...newer, readAt: "2026-10-29T08:00:00Z", lastName: "viejo" } }], base);
  assert.equal(old.projects[0].lastName, "n", "una lectura anterior no pisa la actual");
  const fresh = run([{ type: "project/loaded", project: { ...newer, readAt: "2026-10-29T10:00:00Z", lastName: "nuevo" } }], base);
  assert.equal(fresh.projects[0].lastName, "nuevo");
});

test("Actualizar: una relectura en el mismo segundo (Rust trunca a segundos) sí reemplaza los datos y libera la marca", () => {
  const same = project("m", "v4", { readAt: "2026-10-29T09:00:00Z" });
  const base = run([{ type: "list/loaded", state: { projects: [same], readAt: "x" } }, { type: "project/requested", id: "m" }]);
  const done = run([{ type: "project/loaded", project: { ...same, lastName: "releído" } }], base);
  assert.equal(done.projects[0].lastName, "releído", "un readAt igual no descarta la lectura");
  assert.deepEqual(done.refreshing, {});
  const failed = run([{ type: "project/failed", id: "m", error: "no se pudo" }], base);
  assert.deepEqual(failed.refreshing, {});
  assert.equal(failed.actionError, "no se pudo", "el error se ve");
});

test("R-9: la lista completa no suelta las lecturas de proyectos que siguen en vuelo", () => {
  const ready = run([{ type: "list/loaded", state: { projects: [a, b], readAt: "x" } }, { type: "project/requested", id: "a" }]);
  const landed = run([{ type: "list/requested" }, { type: "list/loaded", state: { projects: [a, b], readAt: "y" } }], ready);
  assert.deepEqual(landed.refreshing, { a: true });
  assert.deepEqual(run([{ type: "project/loaded", project: a }], landed).refreshing, {});
});

test("R-10: se enseñan como mucho N avisos y se cuenta el resto", () => {
  const warning = (n: number): ProjectWarning => ({ scope: "history", target: `HU-${n}`, message: "Aviso" });
  const many = Array.from({ length: 2000 }, (_, n) => warning(n));
  const limited = limitWarnings(many);
  assert.equal(limited.shown.length, 20);
  assert.equal(limited.hidden, 1980);
  assert.deepEqual(limitWarnings(many.slice(0, 3)), { shown: many.slice(0, 3), hidden: 0 });
  assert.deepEqual(limitWarnings(many, 5).shown.map((w) => w.target), ["HU-0", "HU-1", "HU-2", "HU-3", "HU-4"]);
  assert.deepEqual(limitWarnings([]), { shown: [], hidden: 0 });
  assert.equal(many.length, 2000, "no cambia el arreglo recibido");
});

test("reducer: anclar (selector, en curso, éxito idempotente y fallo con su motivo)", () => {
  const picking = run([{ type: "pick/changed", picking: true }]);
  assert.equal(picking.picking, true);
  assert.equal(run([{ type: "pick/changed", picking: false }], picking).picking, false);
  const pinning = run([{ type: "pin/started" }]);
  assert.equal(pinning.pinning, true);
  const failed = run([{ type: "pin/failed", error: "No es un proyecto v4." }], pinning);
  assert.equal(failed.pinning, false);
  assert.equal(failed.pinError, "No es un proyecto v4.");
  assert.equal(run([{ type: "pin-error/cleared" }], failed).pinError, null);
  assert.equal(run([{ type: "pin/started" }], failed).pinError, null, "volver a intentar limpia el motivo");
  const pinned = run([{ type: "pin/succeeded", project: a }], pinning);
  assert.deepEqual(pinned.projects, [a]);
  assert.equal(pinned.pinning, false);
  const twice = run([{ type: "pin/succeeded", project: { ...a, readAt: "otra" } }], pinned);
  assert.equal(twice.projects.length, 1, "anclar la misma carpeta no la duplica");
  assert.equal(twice.projects[0].readAt, "otra");
  assert.equal(run([{ type: "action-error/changed", error: "x" }, { type: "action-error/changed", error: null }]).actionError, null);
});


// ---- HU-0025: datos incompletos y lector ------------------------------------------------------------------------------

const gapped = (folder: string, gap: ProjectDataGap | null, minutes: number | null = null): ProjectHistory => ({
  ...history(folder, "done", minutes, tokens(1, 1, 1, 1)),
  dataGaps: gap ? [gap] : [],
  countsInTotals: true,
});
const missing = (folder: string): ProjectHistory => ({ ...history(folder, "done", null, null), dataGaps: ["noMetrics"], countsInTotals: false });
const warning = (message: string, scope: ProjectWarning["scope"] = "config", target: string | null = null): ProjectWarning => ({ scope, target, message });

const incompleteInfo = () => info({
  histories: [
    gapped("HU-0023-reserva", null, 60),
    gapped("HU-0020-avisos", "noTime"),
    missing("HU-0017-menu"),
    gapped("HU-0004-catalogo", "noTime"),
    missing("HU-0001-alta"),
    history("HU-0030-en-curso", "inProgress", null, null),
  ],
});

test("chip: sin historias incompletas ni avisos no hay chip", () => {
  assert.equal(incompleteChip(info(), []), null);
});

test("chip: historias incompletas, en singular y plural, con tono neutro", () => {
  assert.deepEqual(incompleteChip(incompleteInfo(), []), { text: "4 historias con datos incompletos", tone: "neutral" });
  const one = info({ histories: [missing("HU-0001-alta")] });
  assert.deepEqual(incompleteChip(one, []), { text: "1 historia con datos incompletos", tone: "neutral" });
});

test("chip: solo avisos dice «al leer el proyecto» y es de aviso", () => {
  assert.deepEqual(incompleteChip(info(), [warning("a"), warning("b")]), { text: "2 avisos al leer el proyecto", tone: "warning" });
  assert.deepEqual(incompleteChip(info(), [warning("a")]), { text: "1 aviso al leer el proyecto", tone: "warning" });
});

test("chip: historias y avisos juntos suman «· M avisos» y toman el tono de aviso", () => {
  assert.deepEqual(incompleteChip(incompleteInfo(), [warning("a"), warning("b")]), {
    text: "4 historias con datos incompletos · 2 avisos",
    tone: "warning",
  });
  const one = info({ histories: [missing("HU-0001-alta")] });
  assert.equal(incompleteChip(one, [warning("a")])?.text, "1 historia con datos incompletos · 1 aviso");
});

test("incompletas: solo las que tienen hueco, de la más antigua a la más reciente", () => {
  assert.deepEqual(incompleteHistories(incompleteInfo()).map((item) => item.folder), [
    "HU-0001-alta", "HU-0004-catalogo", "HU-0017-menu", "HU-0020-avisos",
  ]);
});

test("grupos del modal: avisos → sin métricas → sin tiempo, y un grupo vacío no sale", () => {
  const groups = incompleteGroups(incompleteInfo(), [warning("x", "metrics", "HU-0023")]);
  assert.deepEqual(groups.map((group) => group.kind), ["warnings", "noMetrics", "noTime"]);
  const [, noMetrics, noTime] = groups;
  assert.deepEqual(noMetrics?.kind === "noMetrics" && noMetrics.histories.map((item) => item.id), ["HU-0001", "HU-0017"]);
  assert.deepEqual(noTime?.kind === "noTime" && noTime.histories.map((item) => item.id), ["HU-0004", "HU-0020"]);
  assert.deepEqual(incompleteGroups(incompleteInfo(), []).map((group) => group.kind), ["noMetrics", "noTime"]);
  assert.deepEqual(incompleteGroups(info(), []), []);
  assert.deepEqual(incompleteGroups(info(), [warning("x")]).map((group) => group.kind), ["warnings"]);
});

test("grupos del modal: los avisos llevan el tope de 20 y cuántos quedaron fuera", () => {
  const many = Array.from({ length: 23 }, (_, index) => warning(`aviso ${index}`));
  const [group] = incompleteGroups(info(), many);
  assert.equal(group?.kind === "warnings" && group.warnings.length, 20);
  assert.equal(group?.kind === "warnings" && group.hidden, 3);
});

test("metricsCommand sale de folder y no del id, que puede traer cualquier cosa", () => {
  assert.equal(metricsCommand("HU-0023-reserva-de-puestos"), "node .metodo/scripts/metricas.mjs hu HU-0023");
  const odd = { ...missing("HU-0007-sala"), id: "HU-9999; rm -rf ~" };
  assert.equal(metricsCommands([odd, missing("HU-0008-x")]), "node .metodo/scripts/metricas.mjs hu HU-0007\nnode .metodo/scripts/metricas.mjs hu HU-0008");
  assert.equal(metricsCommands([]), "");
});

test("metricsCommand no arma comando si la carpeta no empieza por HU-####-", () => {
  for (const folder of ["HU-12; rm -rf ~", "HU-0023", "../HU-0023-x", "hu-0023-x", "HU-00a3-x", " HU-0023-x"]) {
    assert.equal(metricsCommand(folder), null, folder);
  }
  assert.equal(metricsCommands([missing("HU-12; rm -rf ~"), missing("HU-0008-x")]), "node .metodo/scripts/metricas.mjs hu HU-0008");
});

test("pista de «Tiempo en fases»: «de 23 de 41 terminadas» si faltan tiempos y el texto de siempre si no", () => {
  assert.equal(timeHint({ histories: 36, timedHistories: 23 }, { done: 41 }), "de 23 de 41 terminadas");
  assert.equal(timeHint({ histories: 7, timedHistories: 7 }, { done: 7 }), "de 7 historias cerradas");
  assert.equal(timeHint({ histories: 1, timedHistories: 1 }, { done: 1 }), "de 1 historia cerrada");
  assert.equal(timeHint({ histories: 0, timedHistories: 0 }, { done: 0 }), "Aún sin historias cerradas");
  assert.equal(timeHint({ histories: 3, timedHistories: 0 }, { done: 3 }), "ninguna de 3 terminadas tiene tiempo");
});

test("lector: se quita el frontmatter inicial y solo el inicial", () => {
  const withFront = "---\nid: HU-0001\ntitulo: \"Alta\"\n---\n\nTexto\n\n---\n\nOtro\n";
  assert.equal(readerBody(withFront, "Alta"), "Texto\n\n---\n\nOtro\n");
  assert.equal(readerBody("Texto\n---\nno es frontmatter\n---\n", "Alta"), "Texto\n---\nno es frontmatter\n---\n");
  assert.equal(readerBody("---\nsin cierre\nTexto", "Alta"), "---\nsin cierre\nTexto");
});

test("lector: el primer h1 se quita solo si es igual al título de la historia", () => {
  assert.equal(readerBody("# Alta de usuarios\n\nTexto", "Alta de usuarios"), "Texto");
  assert.equal(readerBody("---\nid: x\n---\n# Alta de usuarios\nTexto", "Alta de usuarios"), "Texto");
  assert.equal(readerBody("# Otro título\n\nTexto", "Alta de usuarios"), "# Otro título\n\nTexto");
  assert.equal(readerBody("Intro\n\n# Alta de usuarios\n", "Alta de usuarios"), "Intro\n\n# Alta de usuarios\n");
  assert.equal(readerBody("## Alta de usuarios\n", "Alta de usuarios"), "## Alta de usuarios\n");
});

test("lector: CRLF y BOM se normalizan", () => {
  assert.equal(readerBody("\uFEFF---\r\nid: x\r\n---\r\n# Alta\r\n\r\nTexto\r\n", "Alta"), "Texto\n");
  assert.equal(readerBody("", "Alta"), "");
});

test("enlaces: solo http y https con host son externos; el resto, texto", () => {
  assert.equal(linkTarget("https://docs.example.test/a?b=1#c"), "external");
  assert.equal(linkTarget("http://example.test"), "external");
  assert.equal(linkTarget("HTTPS://EXAMPLE.TEST"), "external");
  for (const href of [
    "javascript:alert(1)", "JavaScript:alert(1)", "file:///etc/passwd", "mailto:a@b.test", "tel:123", "data:text/html,x",
    "#seccion", "../a.md", "./arquitectura.md", "//host.test/a", "https:", "http://", "", "ftp://x.test", " javascript:x",
  ]) {
    assert.equal(linkTarget(href), "text", href);
  }
  assert.equal(linkTarget(undefined), "text");
});
