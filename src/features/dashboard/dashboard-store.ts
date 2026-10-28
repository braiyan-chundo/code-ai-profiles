import type { DashboardState } from "../../types";

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
  | { type: "icon-preview/removed"; instanceId: string };

export const initialDashboardStore: DashboardStore = {
  dashboard: EMPTY_DASHBOARD,
  loading: true,
  busy: null,
  error: null,
  notice: null,
  iconPreviews: {},
};

function withField<K extends keyof DashboardStore>(store: DashboardStore, key: K, value: DashboardStore[K]): DashboardStore {
  return Object.is(store[key], value) ? store : { ...store, [key]: value };
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
    default:
      return store;
  }
}
