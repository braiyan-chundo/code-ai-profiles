import type { DashboardState, OriginalInstallProgress } from "../../types";

export const EMPTY_DASHBOARD: DashboardState = {
  instances: [],
  system: {
    appVersion: "",
    platform: "unknown",
    sourcePath: null,
    sourceName: null,
    sourceVersion: null,
    sourceUpdate: {
      status: "unavailable",
      latestVersion: null,
      checkedAt: null,
      stale: false,
      source: null,
      warning: null,
    },
    versionTopology: {
      latestInstalledVersion: null,
      latestSource: null,
      staleInstanceIds: [],
      originalBehind: false,
      canSynchronizeManaged: false,
      reason: null,
    },
    originalProfilePath: null,
    originalStatus: "missing",
    originalCodeSessions: [],
    freeBytes: null,
    managedBytes: 0,
  },
};

export interface DashboardStore {
  dashboard: DashboardState;
  loading: boolean;
  busy: string | null;
  error: string | null;
  notice: string | null;
  iconPreviews: Record<string, string>;
  /** El avance de «Descargar e instalar» (HU-0017); `null` cuando no hay una instalación en curso. */
  originalInstall: OriginalInstallProgress | null;
  /** Instancias en marcha que quedaron por detrás de la original recién instalada. Solo en memoria (HU-0017, A-6). */
  pendingSyncIds: string[];
}

export type DashboardAction =
  | { type: "dashboard/replaced"; dashboard: DashboardState }
  | { type: "dashboard/updated"; update: (current: DashboardState) => DashboardState }
  | { type: "loading/finished" }
  | { type: "busy/changed"; busy: string | null }
  | { type: "busy/updated"; update: (current: string | null) => string | null }
  | { type: "error/changed"; error: string | null }
  | { type: "notice/changed"; notice: string | null }
  | { type: "feedback/cleared" }
  | { type: "icon-preview/stored"; instanceId: string; url: string }
  | { type: "icon-preview/removed"; instanceId: string }
  | { type: "original-install/progressed"; progress: OriginalInstallProgress }
  | { type: "original-install/finished" }
  | { type: "pending-sync/added"; instanceIds: string[] }
  | { type: "pending-sync/removed"; instanceIds: string[] };

export const initialDashboardStore: DashboardStore = {
  dashboard: EMPTY_DASHBOARD,
  loading: true,
  busy: null,
  error: null,
  notice: null,
  iconPreviews: {},
  originalInstall: null,
  pendingSyncIds: [],
};

function withField<K extends keyof DashboardStore>(store: DashboardStore, key: K, value: DashboardStore[K]): DashboardStore {
  return Object.is(store[key], value) ? store : { ...store, [key]: value };
}

function sameProgress(a: OriginalInstallProgress | null, b: OriginalInstallProgress): boolean {
  return (
    a !== null &&
    a.phase === b.phase &&
    a.targetVersion === b.targetVersion &&
    a.receivedBytes === b.receivedBytes &&
    a.totalBytes === b.totalBytes &&
    a.cancellable === b.cancellable
  );
}

/**
 * Reducer puro del panel. Las funciones `update` llegan en la acción (no se importan aquí) y deben ser puras:
 * StrictMode llama dos veces al reducer en desarrollo. Si un valor no cambia, devuelve el mismo `store`.
 */
export function dashboardReducer(store: DashboardStore, action: DashboardAction): DashboardStore {
  switch (action.type) {
    case "dashboard/replaced":
      return withField(store, "dashboard", action.dashboard);
    case "dashboard/updated":
      return withField(store, "dashboard", action.update(store.dashboard));
    case "loading/finished":
      return withField(store, "loading", false);
    case "busy/changed":
      return withField(store, "busy", action.busy);
    case "busy/updated":
      return withField(store, "busy", action.update(store.busy));
    case "error/changed":
      return withField(store, "error", action.error);
    case "notice/changed":
      return withField(store, "notice", action.notice);
    case "feedback/cleared":
      return store.error === null && store.notice === null ? store : { ...store, error: null, notice: null };
    case "icon-preview/stored":
      return store.iconPreviews[action.instanceId] === action.url
        ? store
        : { ...store, iconPreviews: { ...store.iconPreviews, [action.instanceId]: action.url } };
    case "icon-preview/removed": {
      if (!(action.instanceId in store.iconPreviews)) return store;
      const iconPreviews = { ...store.iconPreviews };
      delete iconPreviews[action.instanceId];
      return { ...store, iconPreviews };
    }
    case "original-install/progressed":
      return sameProgress(store.originalInstall, action.progress) ? store : { ...store, originalInstall: action.progress };
    case "original-install/finished":
      return withField(store, "originalInstall", null);
    case "pending-sync/added": {
      const added = action.instanceIds.filter((id, index, ids) => !store.pendingSyncIds.includes(id) && ids.indexOf(id) === index);
      return added.length ? { ...store, pendingSyncIds: [...store.pendingSyncIds, ...added] } : store;
    }
    case "pending-sync/removed": {
      const remaining = store.pendingSyncIds.filter((id) => !action.instanceIds.includes(id));
      return remaining.length === store.pendingSyncIds.length ? store : { ...store, pendingSyncIds: remaining };
    }
    default:
      return store;
  }
}
