import type { DashboardState, SourceUpdateInfo, SystemInfo, VersionTopology } from "../types";

export type SourceInstallationIdentity = Pick<SystemInfo, "sourcePath" | "sourceVersion">;

export function sourceInstallationIdentity(system: SystemInfo): SourceInstallationIdentity {
  return { sourcePath: system.sourcePath, sourceVersion: system.sourceVersion };
}

export function mergeSourceUpdateForInstallation(
  current: DashboardState,
  expected: SourceInstallationIdentity,
  sourceUpdate: SourceUpdateInfo,
): DashboardState {
  if (
    current.system.sourcePath !== expected.sourcePath
    || current.system.sourceVersion !== expected.sourceVersion
  ) return current;
  return { ...current, system: { ...current.system, sourceUpdate } };
}

/**
 * Cada cuánto se pide el estado oficial. La caché de Rust responde sin red mientras el resultado es fresco (6 h, o
 * 30 min si traía aviso), así que el sondeo puede ser corto: lo que importa es no dejar pasar la caducidad. Con un
 * sondeo de 6 h contado desde el arranque, la consulta llegaba segundos antes de caducar la caché, devolvía el
 * resultado guardado y el escaneo lo marcaba «no es reciente» poco después, sin volver a consultar en 6 h.
 */
export const SOURCE_UPDATE_POLL_MS = 15 * 60 * 1_000;

/** Lo que dice la comprobación que la persona pide con «Comprobar actualización». */
export function summarizeSourceUpdateCheck(
  sourceUpdate: SourceUpdateInfo,
  appName: string,
): { notice: string | null; error: string | null } {
  const fresh = !sourceUpdate.stale && sourceUpdate.checkedAt !== null && sourceUpdate.source !== null;
  if (!fresh || sourceUpdate.status === "unavailable") {
    return {
      notice: null,
      error: `No se pudo consultar la publicación oficial de ${appName}. Revisa la conexión e inténtalo de nuevo.`,
    };
  }
  // Una versión disponible ya la anuncia el aviso, con su botón «Instalar».
  if (sourceUpdate.status === "available") return { notice: null, error: null };
  const latest = sourceUpdate.latestVersion ? `: ${sourceUpdate.latestVersion} es la última versión publicada` : "";
  return { notice: `${appName} está al día${latest}.`, error: null };
}

export type SourceUpdatePresentationKind = "available" | "local-ahead" | "uncertain";

export interface SourceUpdatePresentation {
  kind: SourceUpdatePresentationKind;
  title: string;
  detail: string;
  actionLabel: string;
}

export function sourceUpdatePresentation(
  sourceUpdate: SourceUpdateInfo,
  topology: VersionTopology,
  appName: string,
  installedVersion: string | null = null,
  /** Hay un botón «Instalar»: solo entonces el título hace la pregunta (HU-0024, R-2). */
  canInstall = false,
): SourceUpdatePresentation | null {
  const fresh = !sourceUpdate.stale && sourceUpdate.checkedAt !== null && sourceUpdate.source !== null;

  // `available` ignora `warning`: la versión nueva ya está confirmada por la publicación y el feed.
  if (fresh && sourceUpdate.status === "available" && sourceUpdate.latestVersion) {
    const installed = installedVersion ? `Instalada ${installedVersion} · ` : "";
    return {
      kind: "available",
      title: `Hay una nueva versión de ${appName} (${sourceUpdate.latestVersion}).${canInstall ? " ¿Deseas instalarla?" : ""}`,
      detail: `${installed}publicada ${sourceUpdate.latestVersion}.`,
      actionLabel: "Ver actualización",
    };
  }

  if (fresh && sourceUpdate.status === "current") {
    if (topology.originalBehind) {
      const localVersion = topology.latestInstalledVersion
        ? ` (${topology.latestInstalledVersion})`
        : "";
      const warning = sourceUpdate.warning ? ` ${sourceUpdate.warning}` : "";
      return {
        kind: "local-ahead",
        title: "La original está al día según la comprobación oficial",
        detail: `Una instancia usa una compilación local superior${localVersion}. Esto no confirma una actualización oficial adicional.${warning}`,
        actionLabel: "Comprobar actualización",
      };
    }
    if (sourceUpdate.warning) {
      return {
        kind: "uncertain",
        title: "No se pudo confirmar si hay una versión nueva",
        detail: sourceUpdate.warning,
        actionLabel: "Comprobar actualización",
      };
    }
    return null;
  }

  return {
    kind: "uncertain",
    title: "No se pudo confirmar el estado de actualización",
    detail: sourceUpdate.stale
      ? "La última comprobación oficial tiene más de 6 horas. Pulsa «Comprobar actualización» para consultar la publicación oficial."
      : "La publicación oficial no respondió. Pulsa «Comprobar actualización» para volver a consultarla.",
    actionLabel: "Comprobar actualización",
  };
}

interface HandoffIntent {
  generation: number;
  lifecycle: number;
  handoffConfirmed: boolean;
  departed: boolean;
  returned: boolean;
  refreshAttempts: number;
}

interface SourceUpdateControllerOptions<T> {
  runRefresh: () => Promise<T>;
  onRefreshResult: (result: T) => void;
  runOfficialCheck?: (refreshResult: T) => Promise<SourceUpdateInfo>;
  onOfficialCheckResult?: (sourceUpdate: SourceUpdateInfo, refreshResult: T) => void;
}

export interface SourceUpdateController {
  runHandoff: <T>(handoff: () => Promise<T>) => Promise<T>;
  handleBlur: () => void;
  handleFocus: () => void;
  handleVisibility: (hidden: boolean) => void;
  hasPendingRefresh: () => boolean;
  blocksGeneralRefresh: (trigger: "focus" | "interval") => boolean;
  activate: () => void;
  deactivate: () => void;
  dispose: () => void;
}

const MAX_REFRESH_ATTEMPTS_PER_HANDOFF = 2;

export function createSourceUpdateController<T>(
  options: SourceUpdateControllerOptions<T>,
): SourceUpdateController {
  let active = true;
  let disposed = false;
  let lifecycle = 0;
  let generation = 0;
  let intent: HandoffIntent | null = null;
  let refreshOwner: { generation: number; lifecycle: number } | null = null;
  let suppressNextGeneralFocus = false;

  const isCurrent = (candidate: HandoffIntent) => (
    !disposed
    && active
    && intent === candidate
    && lifecycle === candidate.lifecycle
    && generation === candidate.generation
  );

  const isCurrentGeneration = (candidate: HandoffIntent) => (
    !disposed
    && active
    && lifecycle === candidate.lifecycle
    && generation === candidate.generation
  );

  const checkOfficialStatus = (candidate: HandoffIntent, refreshResult: T) => {
    if (!options.runOfficialCheck || !options.onOfficialCheckResult) return;
    let checkPromise: Promise<SourceUpdateInfo>;
    try {
      checkPromise = Promise.resolve(options.runOfficialCheck(refreshResult));
    } catch {
      return;
    }
    void checkPromise.then((sourceUpdate) => {
      if (isCurrentGeneration(candidate)) {
        options.onOfficialCheckResult?.(sourceUpdate, refreshResult);
      }
    }).catch(() => {
      // La topología local ya se aplicó; la metadata oficial conserva su estado neutral.
    });
  };

  const requestRefresh = (candidate: HandoffIntent) => {
    if (
      !isCurrent(candidate)
      || !candidate.handoffConfirmed
      || refreshOwner !== null
      || candidate.refreshAttempts >= MAX_REFRESH_ATTEMPTS_PER_HANDOFF
    ) return false;

    candidate.refreshAttempts += 1;
    const owner = { generation: candidate.generation, lifecycle: candidate.lifecycle };
    refreshOwner = owner;
    let refreshPromise: Promise<T>;
    try {
      refreshPromise = Promise.resolve(options.runRefresh());
    } catch (reason) {
      refreshPromise = Promise.reject(reason);
    }
    void refreshPromise.then((result) => {
      if (!isCurrent(candidate)) return;
      intent = null;
      options.onRefreshResult(result);
      checkOfficialStatus(candidate, result);
    }).catch(() => {
      if (!isCurrent(candidate)) return;
      if (candidate.refreshAttempts >= MAX_REFRESH_ATTEMPTS_PER_HANDOFF) intent = null;
    }).finally(() => {
      if (
        refreshOwner?.generation === owner.generation
        && refreshOwner.lifecycle === owner.lifecycle
      ) {
        refreshOwner = null;
        const queued = intent;
        if (
          queued
          && queued.generation !== owner.generation
          && queued.handoffConfirmed
          && queued.returned
          && queued.refreshAttempts === 0
        ) requestRefresh(queued);
      }
    });
    return true;
  };

  const registerDeparture = () => {
    if (!intent || !isCurrent(intent)) return;
    intent.departed = true;
  };

  const registerReturn = () => {
    if (!intent || !isCurrent(intent)) return;
    if (!intent.handoffConfirmed && !intent.departed) return;
    intent.returned = true;
    suppressNextGeneralFocus = true;
    if (intent.handoffConfirmed) requestRefresh(intent);
  };

  return {
    async runHandoff<TResult>(handoff: () => Promise<TResult>): Promise<TResult> {
      if (disposed || !active) throw new Error("El controlador de actualización no está activo.");
      generation += 1;
      const candidate: HandoffIntent = {
        generation,
        lifecycle,
        handoffConfirmed: false,
        departed: false,
        returned: false,
        refreshAttempts: 0,
      };
      intent = candidate;
      try {
        const result = await handoff();
        if (isCurrent(candidate)) {
          candidate.handoffConfirmed = true;
          if (candidate.returned) requestRefresh(candidate);
        }
        return result;
      } catch (reason) {
        if (isCurrent(candidate)) {
          intent = null;
          suppressNextGeneralFocus = false;
        }
        throw reason;
      }
    },

    handleBlur() {
      registerDeparture();
    },

    handleFocus() {
      registerReturn();
    },

    handleVisibility(hidden) {
      if (hidden) registerDeparture();
      else registerReturn();
    },

    hasPendingRefresh() {
      return intent !== null;
    },

    blocksGeneralRefresh(trigger) {
      if (trigger === "focus" && suppressNextGeneralFocus) {
        suppressNextGeneralFocus = false;
        return true;
      }
      return intent !== null;
    },

    activate() {
      if (!disposed) active = true;
    },

    deactivate() {
      if (disposed || !active) return;
      active = false;
      lifecycle += 1;
      generation += 1;
      intent = null;
      suppressNextGeneralFocus = false;
    },

    dispose() {
      if (disposed) return;
      this.deactivate();
      disposed = true;
    },
  };
}
