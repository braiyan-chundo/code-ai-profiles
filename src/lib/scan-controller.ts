export const BACKGROUND_REFRESH_COOLDOWN_MS = 60_000;
export const MANUAL_SUCCESS_CLOSE_DELAY_MS = 900;

export type BackgroundTrigger = "focus" | "interval";
export type ManualScanStatus = "waiting" | "running" | "success" | "error";

export interface ManualScanView {
  generation: number;
  status: ManualScanStatus;
  progress: number;
  label: string;
  error: string | null;
}

interface ScanControllerClock {
  now: () => number;
  setTimeout: (callback: () => void, delay: number) => number;
  clearTimeout: (timer: number) => void;
}

interface ScanControllerOptions<T> {
  clock: ScanControllerClock;
  runBackground: () => Promise<T>;
  runManual: (onProgress: (progress: number, label: string) => void) => Promise<T>;
  onBackgroundResult: (result: T) => void;
  onManualResult: (result: T) => void;
  onManualView: (view: ManualScanView | null) => void;
  describeError: (reason: unknown) => string;
  cooldownMs?: number;
  successCloseDelayMs?: number;
}

export interface ScanController {
  activate: () => void;
  deactivate: () => void;
  markLoaded: () => void;
  requestBackground: (trigger: BackgroundTrigger) => boolean;
  requestManual: () => number;
  reportManualProgress: (generation: number, progress: number, label: string) => void;
  dismissManual: (generation: number) => boolean;
  currentManualGeneration: () => number | null;
  dispose: () => void;
}

export function reconcileManualBusy(current: string | null, view: ManualScanView | null): string | null {
  if (view?.status === "waiting" || view?.status === "running") return "scan";
  return current === "scan" ? null : current;
}

export function createScanController<T>(options: ScanControllerOptions<T>): ScanController {
  const cooldownMs = options.cooldownMs ?? BACKGROUND_REFRESH_COOLDOWN_MS;
  const successCloseDelayMs = options.successCloseDelayMs ?? MANUAL_SUCCESS_CLOSE_DELAY_MS;
  let disposed = false;
  let active = true;
  let lifecycle = 0;
  let loaded = false;
  let backgroundRunning = false;
  let backgroundOwnerLifecycle: number | null = null;
  let manualRunning = false;
  let manualOwner: { lifecycle: number; generation: number } | null = null;
  let manualQueued = false;
  let generation = 0;
  let manualView: ManualScanView | null = null;
  let backgroundEligibleAt = Number.POSITIVE_INFINITY;
  let closeTimer: number | null = null;

  const clearCloseTimer = () => {
    if (closeTimer !== null) options.clock.clearTimeout(closeTimer);
    closeTimer = null;
  };

  const emitManual = (view: ManualScanView | null) => {
    if (disposed || !active) return;
    manualView = view;
    options.onManualView(view);
  };

  const isCurrent = (targetGeneration: number, targetLifecycle = lifecycle) => (
    !disposed && active && lifecycle === targetLifecycle && generation === targetGeneration
  );

  const finishBackgroundCooldown = () => {
    backgroundEligibleAt = options.clock.now() + cooldownMs;
  };

  const startManual = (targetGeneration: number) => {
    if (!isCurrent(targetGeneration) || manualRunning || backgroundRunning) return;
    const targetLifecycle = lifecycle;
    manualQueued = false;
    manualRunning = true;
    manualOwner = { lifecycle: targetLifecycle, generation: targetGeneration };
    emitManual({
      generation: targetGeneration,
      status: "running",
      progress: 0,
      label: "Iniciando el escaneo…",
      error: null,
    });

    void options.runManual((progress, label) => {
      if (!isCurrent(targetGeneration, targetLifecycle) || !manualRunning || manualView?.status !== "running") return;
      const nextProgress = Math.max(manualView.progress, Math.min(100, Math.max(0, progress)));
      emitManual({ ...manualView, progress: nextProgress, label });
    }).then((result) => {
      if (!isCurrent(targetGeneration, targetLifecycle)) return;
      options.onManualResult(result);
      emitManual({
        generation: targetGeneration,
        status: "success",
        progress: 100,
        label: "Escaneo completado",
        error: null,
      });
      closeTimer = options.clock.setTimeout(() => {
        closeTimer = null;
        if (isCurrent(targetGeneration, targetLifecycle) && manualView?.status === "success") emitManual(null);
      }, successCloseDelayMs);
    }).catch((reason: unknown) => {
      if (!isCurrent(targetGeneration, targetLifecycle)) return;
      emitManual({
        generation: targetGeneration,
        status: "error",
        progress: manualView?.progress ?? 0,
        label: "No se pudo completar el escaneo",
        error: options.describeError(reason),
      });
    }).finally(() => {
      if (manualOwner?.lifecycle !== targetLifecycle || manualOwner.generation !== targetGeneration) return;
      manualRunning = false;
      manualOwner = null;
      if (active) finishBackgroundCooldown();
      if (!disposed && active && manualQueued) startManual(generation);
    });
  };

  return {
    activate() {
      if (disposed) return;
      active = true;
    },

    deactivate() {
      if (disposed || !active) return;
      active = false;
      lifecycle += 1;
      generation += 1;
      manualQueued = false;
      clearCloseTimer();
      manualView = null;
    },

    markLoaded() {
      if (disposed || !active) return;
      loaded = true;
      finishBackgroundCooldown();
    },

    requestBackground(_trigger) {
      if (
        disposed
        || !active
        || !loaded
        || backgroundRunning
        || manualRunning
        || manualQueued
        || options.clock.now() < backgroundEligibleAt
      ) return false;

      const targetLifecycle = lifecycle;
      backgroundRunning = true;
      backgroundOwnerLifecycle = targetLifecycle;
      void options.runBackground().then((result) => {
        if (!disposed && active && lifecycle === targetLifecycle) options.onBackgroundResult(result);
      }).catch(() => {
        // El background no tiene superficie de error visible por contrato.
      }).finally(() => {
        if (backgroundOwnerLifecycle !== targetLifecycle) return;
        backgroundRunning = false;
        backgroundOwnerLifecycle = null;
        if (active) finishBackgroundCooldown();
        if (!disposed && active && manualQueued) startManual(generation);
      });
      return true;
    },

    requestManual() {
      if (disposed || !active || !loaded) return generation;
      if (manualQueued) return generation;
      clearCloseTimer();
      generation += 1;
      const targetGeneration = generation;
      manualQueued = backgroundRunning || manualRunning;
      if (manualQueued) {
        emitManual({
          generation: targetGeneration,
          status: "waiting",
          progress: 0,
          label: "Esperando a que termine la actualización en segundo plano…",
          error: null,
        });
      } else {
        startManual(targetGeneration);
      }
      return targetGeneration;
    },

    reportManualProgress(targetGeneration, progress, label) {
      if (!isCurrent(targetGeneration) || !manualRunning || manualView?.status !== "running") return;
      const nextProgress = Math.max(manualView.progress, Math.min(100, Math.max(0, progress)));
      emitManual({ ...manualView, progress: nextProgress, label });
    },

    dismissManual(targetGeneration) {
      if (!isCurrent(targetGeneration) || !manualView || manualView.status === "running" || manualView.status === "waiting") {
        return false;
      }
      clearCloseTimer();
      generation += 1;
      emitManual(null);
      return true;
    },

    currentManualGeneration() {
      return manualView?.generation ?? null;
    },

    dispose() {
      if (disposed) return;
      this.deactivate();
      disposed = true;
    },
  };
}
