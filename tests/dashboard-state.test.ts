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
} from "../src/features/dashboard/dashboard-selectors.ts";
import { applyLiveUsage } from "../src/features/instances/live-usage.ts";
import type { CodeSession, DashboardState, ManagedInstance, UsageStats } from "../src/types.ts";

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
  assert.equal(initialDashboardStore.notice, null);
  assert.deepEqual(initialDashboardStore.iconPreviews, {});
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
