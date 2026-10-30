import assert from "node:assert/strict";
import test from "node:test";
import {
  EMPTY_DASHBOARD,
  dashboardReducer,
  initialDashboardStore,
  type DashboardStore,
} from "../src/features/dashboard/dashboard-store.ts";
import {
  countCodeSessions,
  countRunning,
  filterInstances,
  findInstance,
  matchesOriginalApp,
  originalAppName,
  outdatedInstances,
  runningInstanceIds,
  usageRanking,
} from "../src/features/dashboard/dashboard-selectors.ts";
import { applyLiveUsage } from "../src/features/instances/live-usage.ts";
import { instancePending, instanceStatusLabel, instanceToggle } from "../src/features/instances/instance-status.ts";
import type { CodeSession, DashboardState, ManagedInstance, OriginalInstallProgress, UsageStats } from "../src/types.ts";

function session(id: string, title: string): CodeSession {
  return {
    id,
    title,
    model: null,
    effort: null,
    completedTurns: 0,
    createdAt: null,
    lastActivityAt: null,
    isArchived: false,
  };
}

function instance(id: string, overrides: Partial<ManagedInstance> = {}): ManagedInstance {
  return {
    id,
    name: `Perfil ${id}`,
    sourceVersion: "1.0.0",
    appPath: `/Apps/${id}.app`,
    profilePath: `/perfiles/${id}`,
    createdAt: "2026-10-28T00:00:00Z",
    lastLaunchedAt: null,
    pid: null,
    status: "stopped",
    usage: null,
    codeSessions: [],
    ...overrides,
  };
}

function dashboard(instances: ManagedInstance[], system: Partial<DashboardState["system"]> = {}): DashboardState {
  return { instances, system: { ...EMPTY_DASHBOARD.system, ...system } };
}

const usage: UsageStats = { sessionPercent: 40, weeklyPercent: 10, capturedAt: 1_800_000_000 };

test("el store inicial carga, sin operación, sin mensajes y con el panel vacío", () => {
  assert.equal(initialDashboardStore.loading, true);
  assert.equal(initialDashboardStore.busy, null);
  assert.equal(initialDashboardStore.error, null);
  assert.equal(initialDashboardStore.errorTitle, null);
  assert.equal(initialDashboardStore.notice, null);
  assert.deepEqual(initialDashboardStore.iconPreviews, {});
  assert.equal(initialDashboardStore.originalInstall, null);
  assert.deepEqual(initialDashboardStore.pendingSyncIds, []);
  assert.equal(initialDashboardStore.dashboard, EMPTY_DASHBOARD);
  assert.deepEqual(EMPTY_DASHBOARD.instances, []);
  assert.equal(EMPTY_DASHBOARD.system.platform, "unknown");
  assert.equal(EMPTY_DASHBOARD.system.originalStatus, "missing");
});

test("dashboard/replaced reemplaza el estado completo sin mutar el anterior", () => {
  const next = dashboard([instance("a")]);
  const store = dashboardReducer(initialDashboardStore, { type: "dashboard/replaced", dashboard: next });
  assert.equal(store.dashboard, next);
  assert.notEqual(store, initialDashboardStore);
  assert.equal(initialDashboardStore.dashboard, EMPTY_DASHBOARD);
  assert.equal(dashboardReducer(store, { type: "dashboard/replaced", dashboard: next }), store);
});

test("dashboard/updated aplica la función sobre el estado actual", () => {
  const base = dashboardReducer(initialDashboardStore, { type: "dashboard/replaced", dashboard: dashboard([instance("a")]) });
  const store = dashboardReducer(base, {
    type: "dashboard/updated",
    update: (current) => ({ ...current, instances: [...current.instances, instance("b")] }),
  });
  assert.deepEqual(store.dashboard.instances.map((item) => item.id), ["a", "b"]);
  assert.equal(base.dashboard.instances.length, 1);
  assert.equal(dashboardReducer(base, { type: "dashboard/updated", update: (current) => current }), base);
});

test("loading/finished termina la carga una sola vez", () => {
  const store = dashboardReducer(initialDashboardStore, { type: "loading/finished" });
  assert.equal(store.loading, false);
  assert.equal(dashboardReducer(store, { type: "loading/finished" }), store);
});

test("busy/changed y busy/updated", () => {
  const store = dashboardReducer(initialDashboardStore, { type: "busy/changed", busy: "scan" });
  assert.equal(store.busy, "scan");
  assert.equal(dashboardReducer(store, { type: "busy/changed", busy: "scan" }), store);
  const updated = dashboardReducer(store, { type: "busy/updated", update: (current) => (current === "scan" ? null : current) });
  assert.equal(updated.busy, null);
  assert.equal(dashboardReducer(updated, { type: "busy/updated", update: (current) => current }), updated);
});

test("error/changed, notice/changed y feedback/cleared", () => {
  const withError = dashboardReducer(initialDashboardStore, { type: "error/changed", error: "falló" });
  const withBoth = dashboardReducer(withError, { type: "notice/changed", notice: "listo" });
  assert.equal(withBoth.error, "falló");
  assert.equal(withBoth.notice, "listo");
  assert.equal(dashboardReducer(withBoth, { type: "error/changed", error: "falló" }), withBoth);
  const cleared = dashboardReducer(withBoth, { type: "feedback/cleared" });
  assert.equal(cleared.error, null);
  assert.equal(cleared.notice, null);
  assert.equal(withBoth.error, "falló");
  assert.equal(dashboardReducer(cleared, { type: "feedback/cleared" }), cleared);
});

test("icon-preview/stored y icon-preview/removed", () => {
  const stored = dashboardReducer(initialDashboardStore, { type: "icon-preview/stored", instanceId: "a", url: "data:a" });
  assert.deepEqual(stored.iconPreviews, { a: "data:a" });
  assert.deepEqual(initialDashboardStore.iconPreviews, {});
  assert.equal(dashboardReducer(stored, { type: "icon-preview/stored", instanceId: "a", url: "data:a" }), stored);
  const two = dashboardReducer(stored, { type: "icon-preview/stored", instanceId: "b", url: "data:b" });
  const removed = dashboardReducer(two, { type: "icon-preview/removed", instanceId: "a" });
  assert.deepEqual(removed.iconPreviews, { b: "data:b" });
  assert.deepEqual(two.iconPreviews, { a: "data:a", b: "data:b" });
  assert.equal(dashboardReducer(removed, { type: "icon-preview/removed", instanceId: "a" }), removed);
});

test("una acción desconocida devuelve el mismo store", () => {
  const unknown = { type: "otra" } as unknown as Parameters<typeof dashboardReducer>[1];
  assert.equal(dashboardReducer(initialDashboardStore, unknown), initialDashboardStore);
});

test("filterInstances: vacío devuelve el mismo array; recorta, ignora mayúsculas y busca en sesiones", () => {
  const instances = [
    instance("a", { name: "Trabajo" }),
    instance("b", { name: "Personal", status: "running" }),
    instance("c", { name: "Cliente", codeSessions: [session("s1", "Migración de pagos")] }),
  ];
  assert.equal(filterInstances(instances, ""), instances);
  assert.equal(filterInstances(instances, "   "), instances);
  assert.deepEqual(filterInstances(instances, "  TRABAJO ").map((item) => item.id), ["a"]);
  assert.deepEqual(filterInstances(instances, "running").map((item) => item.id), ["b"]);
  assert.deepEqual(filterInstances(instances, "pagos").map((item) => item.id), ["c"]);
  assert.deepEqual(filterInstances(instances, "/apps/b.app").map((item) => item.id), ["b"]);
  assert.deepEqual(filterInstances(instances, "nada"), []);
});

test("findInstance: por id exacto; desconocido, vacío o ausente devuelve undefined (A-9)", () => {
  const instances = [instance("a"), instance("b")];
  assert.equal(findInstance(instances, "b"), instances[1]);
  assert.equal(findInstance(instances, "c"), undefined);
  assert.equal(findInstance(instances, ""), undefined);
  assert.equal(findInstance(instances, undefined), undefined);
  assert.equal(findInstance([], "a"), undefined);
  assert.equal(findInstance(instances, "A"), undefined, "el id no se normaliza");
});

test("originalAppName y matchesOriginalApp", () => {
  const without = EMPTY_DASHBOARD.system;
  assert.equal(originalAppName(without), "Aplicación compatible");
  assert.equal(matchesOriginalApp(without, "Aplicación compatible", ""), false);
  const system = {
    ...without,
    sourcePath: "/Applications/Compatible.app",
    sourceName: "Compatible",
    originalProfilePath: "/Users/x/perfil",
    originalCodeSessions: [session("o1", "Refactor del router")],
  };
  assert.equal(originalAppName(system), "Compatible");
  assert.equal(matchesOriginalApp(system, "Compatible", ""), true);
  assert.equal(matchesOriginalApp(system, "Compatible", "  original "), true);
  assert.equal(matchesOriginalApp(system, "Compatible", "principal"), true);
  assert.equal(matchesOriginalApp(system, "Compatible", "compatible"), true);
  assert.equal(matchesOriginalApp(system, "Compatible", "users/x"), true);
  assert.equal(matchesOriginalApp(system, "Compatible", "ROUTER"), true);
  assert.equal(matchesOriginalApp(system, "Compatible", "nada"), false);
});

test("usageRanking: de mayor a menor por el mayor de los dos porcentajes, sin dato al final y empate por nombre (A-15)", () => {
  const usage = (sessionPercent: number | null, weeklyPercent: number | null): UsageStats => ({ sessionPercent, weeklyPercent, capturedAt: null });
  const alta = instance("alta", { name: "Alta", usage: usage(30, 91) });
  const media = instance("media", { name: "Media", usage: usage(60, 20) });
  const soloSemanal = instance("semanal", { name: "Semanal", usage: usage(null, 45) });
  const empateB = instance("b", { name: "Beta", usage: usage(10, 50) });
  const empateA = instance("a", { name: "Álamo", usage: usage(50, 5) });
  const sinUsoB = instance("sb", { name: "Zeta", usage: null });
  const sinUsoA = instance("sa", { name: "Ábaco", usage: usage(null, null) });
  const original = [sinUsoB, media, empateB, alta, sinUsoA, soloSemanal, empateA];
  const ids = usageRanking(original).map((item) => item.id);
  assert.deepEqual(ids, ["alta", "media", "a", "b", "semanal", "sa", "sb"]);
  assert.deepEqual(original.map((item) => item.id), ["sb", "media", "b", "alta", "sa", "semanal", "a"], "no muta la entrada");
  assert.deepEqual(usageRanking([]), []);
  assert.notEqual(usageRanking(original), original);
});

test("conteos: en ejecución y sesiones de Code (instancias + original)", () => {
  const state = dashboard(
    [
      instance("a", { status: "running", codeSessions: [session("1", "x"), session("2", "y")] }),
      instance("b", { status: "stopped", codeSessions: [session("3", "z")] }),
      instance("c", { status: "running" }),
    ],
    { originalCodeSessions: [session("4", "w")] },
  );
  assert.equal(countRunning(state.instances), 2);
  assert.equal(countCodeSessions(state), 4);
  assert.equal(countRunning([]), 0);
  assert.equal(countCodeSessions(EMPTY_DASHBOARD), 0);
});

test("outdatedInstances y runningInstanceIds conservan el orden de las instancias", () => {
  const instances = [instance("a", { status: "running" }), instance("b"), instance("c", { status: "running" })];
  assert.deepEqual(outdatedInstances(instances, ["c", "a", "z"]).map((item) => item.id), ["a", "c"]);
  assert.deepEqual(outdatedInstances(instances, []), []);
  assert.deepEqual(runningInstanceIds(instances), ["a", "c"]);
  assert.deepEqual(runningInstanceIds([]), []);
});

test("applyLiveUsage solo cambia las instancias recibidas", () => {
  const untouched = instance("b");
  const state = dashboard([instance("a", { status: "running" }), untouched]);
  const next = applyLiveUsage(state, new Map([["a", usage], ["z", usage]]));
  assert.equal(next.instances[0].usage, usage);
  assert.equal(next.instances[1], untouched);
  assert.equal(next.system, state.system);
  assert.equal(state.instances[0].usage, null);
  assert.equal(next.instances.length, 2);
});

const downloading: OriginalInstallProgress = {
  phase: "downloading",
  targetVersion: "1.22400.0",
  receivedBytes: 100,
  totalBytes: 400,
  cancellable: true,
};

test("original-install/progressed guarda el avance y devuelve el mismo store si no cambia nada", () => {
  const store = dashboardReducer(initialDashboardStore, { type: "original-install/progressed", progress: downloading });
  assert.deepEqual(store.originalInstall, downloading);
  assert.equal(initialDashboardStore.originalInstall, null);
  // Un objeto nuevo con los mismos valores no es un cambio: evita renders por cada mensaje repetido del canal.
  assert.equal(dashboardReducer(store, { type: "original-install/progressed", progress: { ...downloading } }), store);
  const next = dashboardReducer(store, {
    type: "original-install/progressed",
    progress: { ...downloading, receivedBytes: 250 },
  });
  assert.equal(next.originalInstall?.receivedBytes, 250);
  assert.notEqual(next, store);
  const verifying = dashboardReducer(next, {
    type: "original-install/progressed",
    progress: { ...downloading, phase: "verifying", receivedBytes: 0, cancellable: false },
  });
  assert.equal(verifying.originalInstall?.phase, "verifying");
});

test("original-install/finished limpia el avance una sola vez", () => {
  const running = dashboardReducer(initialDashboardStore, { type: "original-install/progressed", progress: downloading });
  const store = dashboardReducer(running, { type: "original-install/finished" });
  assert.equal(store.originalInstall, null);
  assert.equal(dashboardReducer(store, { type: "original-install/finished" }), store);
  assert.equal(dashboardReducer(initialDashboardStore, { type: "original-install/finished" }), initialDashboardStore);
});

test("pending-sync/added suma sin duplicar y no cambia el store si no hay nada nuevo", () => {
  const store = dashboardReducer(initialDashboardStore, { type: "pending-sync/added", instanceIds: ["a", "b", "a"] });
  assert.deepEqual(store.pendingSyncIds, ["a", "b"]);
  assert.deepEqual(initialDashboardStore.pendingSyncIds, []);
  assert.equal(dashboardReducer(store, { type: "pending-sync/added", instanceIds: ["b"] }), store);
  assert.equal(dashboardReducer(store, { type: "pending-sync/added", instanceIds: [] }), store);
  const more = dashboardReducer(store, { type: "pending-sync/added", instanceIds: ["b", "c"] });
  assert.deepEqual(more.pendingSyncIds, ["a", "b", "c"]);
});

test("pending-sync/removed quita solo las indicadas y no cambia el store si no hay ninguna", () => {
  const store = dashboardReducer(initialDashboardStore, { type: "pending-sync/added", instanceIds: ["a", "b", "c"] });
  const next = dashboardReducer(store, { type: "pending-sync/removed", instanceIds: ["b", "z"] });
  assert.deepEqual(next.pendingSyncIds, ["a", "c"]);
  assert.deepEqual(store.pendingSyncIds, ["a", "b", "c"]);
  assert.equal(dashboardReducer(next, { type: "pending-sync/removed", instanceIds: ["b"] }), next);
  assert.equal(dashboardReducer(next, { type: "pending-sync/removed", instanceIds: [] }), next);
});

test("error/changed guarda el título con el error y lo limpia con setError(null) y feedback/cleared (HU-0026)", () => {
  const titled = dashboardReducer(initialDashboardStore, {
    type: "error/changed",
    error: "La copia no responde.",
    title: "No se pudo abrir Perfil a",
  });
  assert.equal(titled.error, "La copia no responde.");
  assert.equal(titled.errorTitle, "No se pudo abrir Perfil a");
  assert.equal(
    dashboardReducer(titled, { type: "error/changed", error: "La copia no responde.", title: "No se pudo abrir Perfil a" }),
    titled,
  );
  const untitled = dashboardReducer(titled, { type: "error/changed", error: "Otro fallo" });
  assert.equal(untitled.error, "Otro fallo");
  assert.equal(untitled.errorTitle, null);
  const nulled = dashboardReducer(titled, { type: "error/changed", error: null, title: "No se pudo abrir Perfil a" });
  assert.equal(nulled.error, null);
  assert.equal(nulled.errorTitle, null);
  const cleared = dashboardReducer(titled, { type: "feedback/cleared" });
  assert.equal(cleared.error, null);
  assert.equal(cleared.errorTitle, null);
  assert.equal(dashboardReducer(cleared, { type: "feedback/cleared" }), cleared);
});

test("instancePending lee el busy de la instancia y nada más (HU-0026)", () => {
  assert.equal(instancePending("launch:a", "a"), "launching");
  assert.equal(instancePending("stop:a", "a"), "stopping");
  assert.equal(instancePending("launch:b", "a"), null);
  assert.equal(instancePending("stop:ab", "a"), null);
  assert.equal(instancePending("delete:a", "a"), null);
  assert.equal(instancePending("icon:a", "a"), null);
  assert.equal(instancePending("scan", "a"), null);
  assert.equal(instancePending(null, "a"), null);
});

test("instanceStatusLabel pone la operación en curso delante del estado (HU-0026)", () => {
  assert.equal(instanceStatusLabel("stopped"), "Detenido");
  assert.equal(instanceStatusLabel("running"), "Ejecutándose");
  assert.equal(instanceStatusLabel("missing"), "No disponible");
  assert.equal(instanceStatusLabel("stopped", "launching"), "Abriendo…");
  assert.equal(instanceStatusLabel("running", "stopping"), "Deteniendo…");
  assert.equal(instanceStatusLabel("running", null), "Ejecutándose");
});

test("instanceToggle: sin botón si no está disponible, Detener si corre y Abrir si no (HU-0026)", () => {
  assert.equal(instanceToggle(instance("a", { status: "missing" }), null), null);
  assert.equal(instanceToggle(instance("a", { status: "missing" }), "launch:a"), null);
  assert.deepEqual(instanceToggle(instance("a", { status: "running" }), null), {
    action: "stop",
    label: "Detener Perfil a",
    pending: false,
    disabled: false,
  });
  assert.deepEqual(instanceToggle(instance("a"), null), {
    action: "launch",
    label: "Abrir Perfil a",
    pending: false,
    disabled: false,
  });
});

test("instanceToggle: la operación de otra desactiva sin marcar en curso; la propia marca y nombra (HU-0026)", () => {
  assert.deepEqual(instanceToggle(instance("a"), "stop:b"), {
    action: "launch",
    label: "Abrir Perfil a",
    pending: false,
    disabled: true,
  });
  assert.deepEqual(instanceToggle(instance("a"), "scan"), {
    action: "launch",
    label: "Abrir Perfil a",
    pending: false,
    disabled: true,
  });
  assert.deepEqual(instanceToggle(instance("a"), "launch:a"), {
    action: "launch",
    label: "Abriendo Perfil a…",
    pending: true,
    disabled: true,
  });
  assert.deepEqual(instanceToggle(instance("a", { status: "running" }), "stop:a"), {
    action: "stop",
    label: "Deteniendo Perfil a…",
    pending: true,
    disabled: true,
  });
  // El estado aún no cambió: la acción es la que corre, no la que tocaría por el estado.
  assert.equal(instanceToggle(instance("a", { status: "running" }), "launch:a")?.action, "launch");
  assert.equal(instanceToggle(instance("a"), "stop:a")?.action, "stop");
});
