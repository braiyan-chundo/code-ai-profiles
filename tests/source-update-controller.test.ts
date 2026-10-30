import assert from "node:assert/strict";
import test from "node:test";
import {
  createSourceUpdateController,
  mergeSourceUpdateForInstallation,
  sourceInstallationIdentity,
  sourceUpdatePresentation,
} from "../src/lib/source-update-controller.ts";
import type { DashboardState, SourceUpdateInfo, VersionTopology } from "../src/types.ts";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function flush() {
  return new Promise<void>((resolve) => setImmediate(resolve));
}

function harness() {
  const refreshes: ReturnType<typeof deferred<string>>[] = [];
  const results: string[] = [];
  const controller = createSourceUpdateController({
    runRefresh: () => {
      const refresh = deferred<string>();
      refreshes.push(refresh);
      return refresh.promise;
    },
    onRefreshResult: (result) => { results.push(result); },
  });
  return { controller, refreshes, results };
}

test("blur y retorno durante la promesa se conservan hasta confirmar el handoff", async () => {
  const h = harness();
  const handoff = deferred<string>();
  const pending = h.controller.runHandoff(() => handoff.promise);
  h.controller.handleBlur();
  h.controller.handleFocus();
  assert.equal(h.refreshes.length, 0);
  handoff.resolve("abierto");
  await pending;
  assert.equal(h.refreshes.length, 1);
  h.controller.handleVisibility(false);
  assert.equal(h.refreshes.length, 1);
});

test("salida y retorno por visibility previos al éxito encolan exactamente un refresh", async () => {
  const h = harness();
  const handoff = deferred<void>();
  const pending = h.controller.runHandoff(() => handoff.promise);
  h.controller.handleVisibility(true);
  h.controller.handleVisibility(false);
  handoff.resolve();
  await pending;
  assert.equal(h.refreshes.length, 1);
});

test("el primer retorno posterior al éxito inicia el refresh dirigido", async () => {
  const h = harness();
  await h.controller.runHandoff(async () => "abierto");
  assert.equal(h.refreshes.length, 0);
  h.controller.handleFocus();
  assert.equal(h.refreshes.length, 1);
});

test("un handoff fallido no consume eventos ni inicia refresh y una acción nueva puede reintentar", async () => {
  const h = harness();
  const failed = deferred<void>();
  const pending = h.controller.runHandoff(() => failed.promise);
  h.controller.handleBlur();
  h.controller.handleFocus();
  failed.reject(new Error("no abrió"));
  await assert.rejects(pending, /no abrió/);
  h.controller.handleFocus();
  assert.equal(h.refreshes.length, 0);
  await h.controller.runHandoff(async () => undefined);
  h.controller.handleFocus();
  assert.equal(h.refreshes.length, 1);
});

test("focus y visibility duplicados producen una sola llamada en vuelo", async () => {
  const h = harness();
  await h.controller.runHandoff(async () => undefined);
  h.controller.handleFocus();
  h.controller.handleVisibility(false);
  h.controller.handleFocus();
  assert.equal(h.refreshes.length, 1);
  assert.equal(h.controller.blocksGeneralRefresh("focus"), true);
  h.refreshes[0].resolve("dashboard");
  await flush();
  h.controller.handleFocus();
  assert.deepEqual(h.results, ["dashboard"]);
  assert.equal(h.refreshes.length, 1);
});

test("un retorno por visibility no bloquea intervalos después de completar y deduplica el siguiente focus", async () => {
  const h = harness();
  await h.controller.runHandoff(async () => undefined);
  h.controller.handleVisibility(false);
  h.refreshes[0].resolve("dashboard");
  await flush();
  assert.equal(h.controller.hasPendingRefresh(), false);
  assert.equal(h.controller.blocksGeneralRefresh("interval"), false);
  assert.equal(h.controller.blocksGeneralRefresh("focus"), true);
  assert.equal(h.controller.blocksGeneralRefresh("focus"), false);
});

test("una intención nueva se drena al liberarse un refresh antiguo en vuelo", async () => {
  const h = harness();
  await h.controller.runHandoff(async () => "primero");
  h.controller.handleFocus();
  assert.equal(h.refreshes.length, 1);

  await h.controller.runHandoff(async () => "segundo");
  h.controller.handleFocus();
  assert.equal(h.refreshes.length, 1);

  h.refreshes[0].resolve("dashboard-viejo");
  await flush();
  assert.deepEqual(h.results, []);
  assert.equal(h.refreshes.length, 2);

  h.refreshes[1].resolve("dashboard-nuevo");
  await flush();
  assert.deepEqual(h.results, ["dashboard-nuevo"]);
});

test("un throw sincrónico de runRefresh libera el owner y permite un único retry por evento", async () => {
  let attempts = 0;
  const results: string[] = [];
  const retry = deferred<string>();
  const controller = createSourceUpdateController({
    runRefresh: () => {
      attempts += 1;
      if (attempts === 1) throw new Error("fallo sincrónico");
      return retry.promise;
    },
    onRefreshResult: (result) => { results.push(result); },
  });

  await controller.runHandoff(async () => undefined);
  assert.doesNotThrow(() => controller.handleFocus());
  await flush();
  assert.equal(attempts, 1);
  controller.handleFocus();
  assert.equal(attempts, 2);
  retry.resolve("dashboard");
  await flush();
  assert.deepEqual(results, ["dashboard"]);
  controller.handleFocus();
  await flush();
  assert.equal(attempts, 2);
});

test("aplica el dashboard local antes de ejecutar una única comprobación oficial", async () => {
  const refresh = deferred<string>();
  const official = deferred<SourceUpdateInfo>();
  const localResults: string[] = [];
  const officialResults: SourceUpdateInfo[] = [];
  let officialChecks = 0;
  const controller = createSourceUpdateController({
    runRefresh: () => refresh.promise,
    onRefreshResult: (result) => { localResults.push(result); },
    runOfficialCheck: () => {
      officialChecks += 1;
      return official.promise;
    },
    onOfficialCheckResult: (result) => { officialResults.push(result); },
  });

  await controller.runHandoff(async () => undefined);
  controller.handleFocus();
  refresh.resolve("dashboard-local");
  await flush();
  assert.deepEqual(localResults, ["dashboard-local"]);
  assert.equal(officialChecks, 1);
  assert.deepEqual(officialResults, []);
  official.resolve(update({ status: "available" }));
  await flush();
  assert.equal(officialResults.length, 1);
});

test("fallo de comprobación oficial no revierte dashboard local ni crea otro intento", async () => {
  const localResults: string[] = [];
  let officialChecks = 0;
  const controller = createSourceUpdateController({
    runRefresh: async () => "dashboard-local",
    onRefreshResult: (result) => { localResults.push(result); },
    runOfficialCheck: async () => {
      officialChecks += 1;
      throw new Error("sin metadata");
    },
    onOfficialCheckResult: () => { throw new Error("no debe aplicarse"); },
  });

  await controller.runHandoff(async () => undefined);
  controller.handleFocus();
  await flush();
  assert.deepEqual(localResults, ["dashboard-local"]);
  assert.equal(officialChecks, 1);
  controller.handleFocus();
  await flush();
  assert.equal(officialChecks, 1);
});

test("resultado oficial tardío de otra generación se descarta", async () => {
  const official = deferred<SourceUpdateInfo>();
  const officialResults: SourceUpdateInfo[] = [];
  const controller = createSourceUpdateController({
    runRefresh: async () => "dashboard-local",
    onRefreshResult: () => undefined,
    runOfficialCheck: () => official.promise,
    onOfficialCheckResult: (result) => { officialResults.push(result); },
  });

  await controller.runHandoff(async () => undefined);
  controller.handleFocus();
  await flush();
  await controller.runHandoff(async () => undefined);
  official.resolve(update({ status: "available" }));
  await flush();
  assert.deepEqual(officialResults, []);
});

test("un fallo habilita sólo un retry por el siguiente evento, sin timer ni loop", async () => {
  const h = harness();
  await h.controller.runHandoff(async () => undefined);
  h.controller.handleFocus();
  h.refreshes[0].reject(new Error("falló refresh"));
  await flush();
  assert.equal(h.refreshes.length, 1);
  h.controller.handleVisibility(false);
  h.controller.handleFocus();
  assert.equal(h.refreshes.length, 2);
  h.refreshes[1].reject(new Error("falló retry"));
  await flush();
  h.controller.handleFocus();
  assert.equal(h.refreshes.length, 2);
});

test("cleanup ignora handoffs y resultados tardíos de un lifecycle anterior", async () => {
  const h = harness();
  const handoff = deferred<void>();
  const pending = h.controller.runHandoff(() => handoff.promise);
  h.controller.handleBlur();
  h.controller.handleFocus();
  h.controller.deactivate();
  handoff.resolve();
  await pending;
  assert.equal(h.refreshes.length, 0);

  h.controller.activate();
  await h.controller.runHandoff(async () => undefined);
  h.controller.handleFocus();
  assert.equal(h.refreshes.length, 1);
  h.controller.deactivate();
  h.refreshes[0].resolve("obsoleto");
  await flush();
  assert.deepEqual(h.results, []);
});

const topology = (overrides: Partial<VersionTopology> = {}): VersionTopology => ({
  latestInstalledVersion: "3.6556.1",
  latestSource: { kind: "managed", instanceId: "lab", name: "Lab" },
  staleInstanceIds: [],
  originalBehind: true,
  canSynchronizeManaged: true,
  reason: null,
  ...overrides,
});

const update = (overrides: Partial<SourceUpdateInfo> = {}): SourceUpdateInfo => ({
  status: "current",
  latestVersion: "3.1623.4",
  checkedAt: 1_000,
  stale: false,
  source: "officialRelease",
  warning: null,
  ...overrides,
});

const dashboard = (sourcePath: string | null, sourceVersion: string | null): DashboardState => ({
  instances: [],
  system: {
    appVersion: "0.2.1",
    platform: "macos",
    sourcePath,
    sourceName: "Claude",
    sourceVersion,
    sourceUpdate: update({ status: "unavailable" }),
    versionTopology: topology(),
    originalProfilePath: null,
    originalStatus: "stopped",
    originalCodeSessions: [],
    freeBytes: null,
    managedBytes: 0,
  },
});

test("metadata oficial sólo se fusiona para la misma ruta y versión instaladas", () => {
  const refreshed = dashboard("/Applications/Claude.app", "3.1623.4");
  const expected = sourceInstallationIdentity(refreshed.system);
  const official = update({ status: "available", latestVersion: "3.1700.0" });
  const current = dashboard("/Applications/Claude.app", "3.1623.4");
  const changedVersion = dashboard("/Applications/Claude.app", "3.1800.0");
  const changedPath = dashboard("/Applications/Claude Beta.app", "3.1623.4");

  assert.equal(mergeSourceUpdateForInstallation(current, expected, official).system.sourceUpdate, official);
  assert.equal(mergeSourceUpdateForInstallation(changedVersion, expected, official), changedVersion);
  assert.equal(mergeSourceUpdateForInstallation(changedPath, expected, official), changedPath);
});

test("available fresco ofrece instalar con el título de la publicación oficial", () => {
  const presentation = sourceUpdatePresentation(
    update({ status: "available", latestVersion: "3.1700.0" }),
    topology(),
    "Claude",
    "3.1623.4",
    true,
  );
  assert.equal(presentation?.kind, "available");
  assert.equal(presentation?.title, "Hay una nueva versión de Claude (3.1700.0). ¿Deseas instalarla?");
  assert.equal(presentation?.detail, "Instalada 3.1623.4 · publicada 3.1700.0.");
});

test("available sin botón «Instalar» no hace la pregunta", () => {
  const presentation = sourceUpdatePresentation(
    update({ status: "available", latestVersion: "3.1700.0" }),
    topology(),
    "Claude",
    "3.1623.4",
    false,
  );
  assert.equal(presentation?.kind, "available");
  assert.equal(presentation?.title, "Hay una nueva versión de Claude (3.1700.0).");
  assert.doesNotMatch(presentation?.title ?? "", /¿Deseas/);
  assert.equal(presentation?.actionLabel, "Ver actualización");
});

test("available sin versión instalada conocida omite la parte de la instalada", () => {
  const presentation = sourceUpdatePresentation(update({ status: "available", latestVersion: "3.1700.0" }), topology(), "Claude");
  assert.equal(presentation?.detail, "publicada 3.1700.0.");
});

test("available ignora el warning", () => {
  const presentation = sourceUpdatePresentation(
    update({ status: "available", latestVersion: "3.1700.0", warning: "La publicación y el feed no coinciden." }),
    topology(),
    "Claude",
  );
  assert.equal(presentation?.kind, "available");
  assert.doesNotMatch(`${presentation?.title} ${presentation?.detail}`, /no coinciden/);
});

test("current con warning y sin discrepancia local es incierto y muestra el warning", () => {
  const presentation = sourceUpdatePresentation(
    update({ warning: "La publicación anuncia 3.1700.0 pero el feed no la confirma." }),
    topology({ originalBehind: false }),
    "Claude",
  );
  assert.equal(presentation?.kind, "uncertain");
  assert.equal(presentation?.title, "No se pudo confirmar si hay una versión nueva");
  assert.equal(presentation?.detail, "La publicación anuncia 3.1700.0 pero el feed no la confirma.");
  assert.equal(presentation?.actionLabel, "Comprobar actualización");
});

test("current con warning y con instancia superior sigue siendo local-ahead y añade el warning", () => {
  const presentation = sourceUpdatePresentation(update({ warning: "El feed no respondió." }), topology(), "Claude");
  assert.equal(presentation?.kind, "local-ahead");
  assert.match(presentation?.detail ?? "", /compilación local superior/);
  assert.match(presentation?.detail ?? "", /El feed no respondió\.$/);
});

test("stale gana al warning y a available", () => {
  const presentation = sourceUpdatePresentation(
    update({ status: "available", stale: true, warning: "x" }),
    topology(),
    "Claude",
  );
  assert.equal(presentation?.kind, "uncertain");
  assert.match(presentation?.detail ?? "", /no es reciente/);
});

test("current fresco con instancia superior comunica estado oficial y discrepancia local sin inferir rollout", () => {
  const presentation = sourceUpdatePresentation(update(), topology(), "Claude");
  assert.equal(presentation?.kind, "local-ahead");
  assert.match(presentation?.title ?? "", /al día según la comprobación oficial/);
  assert.match(presentation?.detail ?? "", /compilación local superior/);
  assert.doesNotMatch(`${presentation?.title} ${presentation?.detail}`, /desactualizada|canal adelantado|rollout/i);
});

test("current fresco sin discrepancia no crea alerta", () => {
  assert.equal(sourceUpdatePresentation(update(), topology({ originalBehind: false }), "Claude"), null);
});

for (const sourceUpdate of [
  update({ stale: true }),
  update({ status: "available", stale: true }),
  update({ status: "unavailable", latestVersion: null }),
  update({ status: "unknown", latestVersion: null }),
  update({ status: "error", latestVersion: null }),
  update({ status: "available", latestVersion: null }),
  update({ checkedAt: null }),
] satisfies SourceUpdateInfo[]) {
  test(`metadata incierta (${sourceUpdate.status}, stale=${sourceUpdate.stale}) no afirma current ni available`, () => {
    const presentation = sourceUpdatePresentation(sourceUpdate, topology(), "Claude");
    assert.equal(presentation?.kind, "uncertain");
    const copy = `${presentation?.title} ${presentation?.detail}`;
    assert.match(copy, /No se pudo confirmar/);
    assert.doesNotMatch(copy, /al día según|versión .* disponible/);
  });
}
