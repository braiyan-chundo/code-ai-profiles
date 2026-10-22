import assert from "node:assert/strict";
import test from "node:test";
import {
  BACKGROUND_REFRESH_COOLDOWN_MS,
  createScanController,
  reconcileManualBusy,
  type ManualScanView,
} from "../src/lib/scan-controller.ts";

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
  let now = 0;
  let timerId = 0;
  const timers = new Map<number, { at: number; callback: () => void }>();
  const backgroundRuns: ReturnType<typeof deferred<string>>[] = [];
  const manualRuns: ReturnType<typeof deferred<string>>[] = [];
  const manualProgressReporters: Array<(progress: number, label: string) => void> = [];
  const backgroundResults: string[] = [];
  const manualResults: string[] = [];
  const views: Array<ManualScanView | null> = [];
  const controller = createScanController({
    clock: {
      now: () => now,
      setTimeout: (callback, delay) => {
        const id = ++timerId;
        timers.set(id, { at: now + delay, callback });
        return id;
      },
      clearTimeout: (id) => { timers.delete(id); },
    },
    runBackground: () => {
      const run = deferred<string>();
      backgroundRuns.push(run);
      return run.promise;
    },
    runManual: (onProgress) => {
      const run = deferred<string>();
      manualRuns.push(run);
      manualProgressReporters.push(onProgress);
      return run.promise;
    },
    onBackgroundResult: (result) => { backgroundResults.push(result); },
    onManualResult: (result) => { manualResults.push(result); },
    onManualView: (view) => { views.push(view); },
    describeError: (reason) => reason instanceof Error ? reason.message : String(reason),
    successCloseDelayMs: 50,
  });

  return {
    controller,
    backgroundRuns,
    manualRuns,
    manualProgressReporters,
    backgroundResults,
    manualResults,
    views,
    latestView: () => views.at(-1),
    advance(ms: number) {
      now += ms;
      for (const [id, timer] of [...timers]) {
        if (timer.at <= now) {
          timers.delete(id);
          timer.callback();
        }
      }
    },
  };
}

test("focus inicial y ticks dentro del cooldown no ejecutan background", () => {
  const h = harness();
  assert.equal(h.controller.requestManual(), 0);
  assert.equal(h.manualRuns.length, 0);
  assert.equal(h.controller.requestBackground("focus"), false);
  h.controller.markLoaded();
  assert.equal(h.controller.requestBackground("focus"), false);
  h.advance(BACKGROUND_REFRESH_COOLDOWN_MS - 1);
  assert.equal(h.controller.requestBackground("interval"), false);
  assert.equal(h.backgroundRuns.length, 0);
});

test("focus e intervalo comparten cooldown y permiten una sola llamada concurrente", async () => {
  const h = harness();
  h.controller.markLoaded();
  h.advance(BACKGROUND_REFRESH_COOLDOWN_MS);
  assert.equal(h.controller.requestBackground("focus"), true);
  assert.equal(h.controller.requestBackground("interval"), false);
  assert.equal(h.backgroundRuns.length, 1);
  h.backgroundRuns[0].resolve("background-1");
  await flush();
  assert.deepEqual(h.backgroundResults, ["background-1"]);
  assert.equal(h.controller.requestBackground("focus"), false);
  h.advance(BACKGROUND_REFRESH_COOLDOWN_MS);
  assert.equal(h.controller.requestBackground("interval"), true);
});

test("background es silencioso y un manual durante background espera y luego se ejecuta", async () => {
  const h = harness();
  h.controller.markLoaded();
  h.advance(BACKGROUND_REFRESH_COOLDOWN_MS);
  h.controller.requestBackground("interval");
  assert.equal(h.views.length, 0);
  const generation = h.controller.requestManual();
  assert.equal(h.latestView()?.status, "waiting");
  assert.equal(h.manualRuns.length, 0);
  h.backgroundRuns[0].resolve("background");
  await flush();
  assert.equal(h.manualRuns.length, 1);
  assert.equal(h.latestView()?.status, "running");
  assert.equal(h.views.some((view) => view?.status === "error"), false);
  h.controller.reportManualProgress(generation, 43, "Revisando perfiles…");
  assert.equal(h.latestView()?.progress, 43);
  assert.equal(h.latestView()?.label, "Revisando perfiles…");
});

test("manual completa, muestra terminal accesible y se autocierra", async () => {
  const h = harness();
  h.controller.markLoaded();
  const generation = h.controller.requestManual();
  h.controller.reportManualProgress(generation, 100, "Finalizando…");
  h.manualRuns[0].resolve("manual");
  await flush();
  assert.deepEqual(h.manualResults, ["manual"]);
  assert.equal(h.latestView()?.status, "success");
  h.advance(49);
  assert.equal(h.latestView()?.status, "success");
  h.advance(1);
  assert.equal(h.latestView(), null);
});

test("error manual permanece hasta dismiss y running no se puede ocultar", async () => {
  const h = harness();
  h.controller.markLoaded();
  const generation = h.controller.requestManual();
  assert.equal(h.controller.dismissManual(generation), false);
  h.manualRuns[0].reject(new Error("falló el escaneo"));
  await flush();
  assert.equal(h.latestView()?.status, "error");
  assert.equal(h.latestView()?.error, "falló el escaneo");
  assert.equal(h.controller.dismissManual(generation), true);
  assert.equal(h.latestView(), null);
});

test("timer, progreso y resultado de una generación vieja no pisan la nueva", async () => {
  const h = harness();
  h.controller.markLoaded();
  const first = h.controller.requestManual();
  h.manualRuns[0].resolve("first");
  await flush();
  assert.equal(h.latestView()?.status, "success");
  const second = h.controller.requestManual();
  assert.notEqual(first, second);
  h.controller.reportManualProgress(first, 100, "Evento tardío");
  assert.equal(h.latestView()?.generation, second);
  assert.equal(h.latestView()?.progress, 0);
  h.advance(50);
  assert.equal(h.latestView()?.generation, second);
  h.manualRuns[1].resolve("second");
  await flush();
  assert.deepEqual(h.manualResults, ["first", "second"]);
});

test("dispose limpia timers e ignora eventos y resultados tardíos", async () => {
  const h = harness();
  h.controller.markLoaded();
  const generation = h.controller.requestManual();
  const viewCount = h.views.length;
  h.controller.dispose();
  h.controller.reportManualProgress(generation, 90, "Tardío");
  h.manualRuns[0].resolve("late-result");
  await flush();
  h.advance(100);
  assert.equal(h.views.length, viewCount);
  assert.deepEqual(h.manualResults, []);
});

test("cleanup y reactivación de StrictMode ignoran el ciclo viejo y permiten el nuevo", async () => {
  const h = harness();
  h.controller.markLoaded();
  h.controller.deactivate();
  h.controller.activate();
  h.controller.markLoaded();
  const generation = h.controller.requestManual();
  assert.equal(generation > 0, true);
  assert.equal(h.manualRuns.length, 1);
  h.manualRuns[0].resolve("remounted");
  await flush();
  assert.deepEqual(h.manualResults, ["remounted"]);
});

test("fin manual reinicia cooldown y dismiss terminal no deja ejecución bloqueada", async () => {
  const h = harness();
  h.controller.markLoaded();
  h.advance(BACKGROUND_REFRESH_COOLDOWN_MS);
  const first = h.controller.requestManual();
  h.manualRuns[0].resolve("first");
  await flush();
  assert.equal(h.controller.dismissManual(first), true);
  assert.equal(h.controller.requestBackground("focus"), false);
  const second = h.controller.requestManual();
  assert.notEqual(second, first);
  assert.equal(h.manualRuns.length, 2);
});

test("listener capturado de una generación vieja no actualiza la nueva", async () => {
  const h = harness();
  h.controller.markLoaded();
  h.controller.requestManual();
  const oldReporter = h.manualProgressReporters[0];
  h.manualRuns[0].resolve("first");
  await flush();
  h.controller.requestManual();
  oldReporter(100, "Evento viejo después de la nueva generación");
  assert.equal(h.latestView()?.status, "running");
  assert.equal(h.latestView()?.progress, 0);
});

test("autocierre manual conserva un busy ajeno", () => {
  const terminal: ManualScanView = {
    generation: 1,
    status: "success",
    progress: 100,
    label: "Listo",
    error: null,
  };
  assert.equal(reconcileManualBusy("scan", terminal), null);
  assert.equal(reconcileManualBusy("launch:profile", terminal), "launch:profile");
  assert.equal(reconcileManualBusy("update", null), "update");
});

test("background de lifecycle viejo libera y ejecuta el manual encolado del nuevo", async () => {
  const h = harness();
  h.controller.markLoaded();
  h.advance(BACKGROUND_REFRESH_COOLDOWN_MS);
  h.controller.requestBackground("interval");
  h.controller.deactivate();
  h.controller.activate();
  h.controller.markLoaded();
  h.controller.requestManual();
  assert.equal(h.latestView()?.status, "waiting");
  assert.equal(h.manualRuns.length, 0);
  h.backgroundRuns[0].resolve("stale-background");
  await flush();
  assert.deepEqual(h.backgroundResults, []);
  assert.equal(h.manualRuns.length, 1);
  assert.equal(h.latestView()?.status, "running");
});

test("manual de lifecycle viejo no libera el owner nuevo y transfiere su cola al terminar", async () => {
  const h = harness();
  h.controller.markLoaded();
  h.controller.requestManual();
  h.controller.deactivate();
  h.controller.activate();
  h.controller.markLoaded();
  h.controller.requestManual();
  assert.equal(h.latestView()?.status, "waiting");
  assert.equal(h.manualRuns.length, 1);
  h.manualRuns[0].resolve("stale-manual");
  await flush();
  assert.deepEqual(h.manualResults, []);
  assert.equal(h.manualRuns.length, 2);
  assert.equal(h.latestView()?.status, "running");
});
