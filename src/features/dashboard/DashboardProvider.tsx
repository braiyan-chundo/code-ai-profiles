import { useCallback, useMemo, useReducer, useRef, type ReactNode } from "react";
import { friendlyError } from "../../lib/errors";
import type { DashboardState, OriginalInstallProgress } from "../../types";
import { DashboardContext, type DashboardContextValue, type RunActionOptions } from "./dashboard-context";
import { dashboardReducer, initialDashboardStore } from "./dashboard-store";

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [store, dispatch] = useReducer(dashboardReducer, initialDashboardStore);
  const busyRef = useRef<string | null>(null);
  busyRef.current = store.busy;

  const replaceDashboard = useCallback((dashboard: DashboardState) => dispatch({ type: "dashboard/replaced", dashboard }), []);
  const updateDashboard = useCallback(
    (update: (current: DashboardState) => DashboardState) => dispatch({ type: "dashboard/updated", update }),
    [],
  );
  const setBusy = useCallback((busy: string | null) => dispatch({ type: "busy/changed", busy }), []);
  const updateBusy = useCallback(
    (update: (current: string | null) => string | null) => dispatch({ type: "busy/updated", update }),
    [],
  );
  const setError = useCallback(
    (error: string | null, title?: string) => dispatch({ type: "error/changed", error, title }),
    [],
  );
  const setNotice = useCallback((notice: string | null) => dispatch({ type: "notice/changed", notice }), []);
  const clearFeedback = useCallback(() => dispatch({ type: "feedback/cleared" }), []);
  const finishLoading = useCallback(() => dispatch({ type: "loading/finished" }), []);
  const storeIconPreview = useCallback(
    (instanceId: string, url: string) => dispatch({ type: "icon-preview/stored", instanceId, url }),
    [],
  );
  const removeIconPreview = useCallback((instanceId: string) => dispatch({ type: "icon-preview/removed", instanceId }), []);

  const setOriginalInstall = useCallback(
    (progress: OriginalInstallProgress) => dispatch({ type: "original-install/progressed", progress }),
    [],
  );
  const finishOriginalInstall = useCallback(() => dispatch({ type: "original-install/finished" }), []);
  const addPendingSync = useCallback(
    (instanceIds: string[]) => dispatch({ type: "pending-sync/added", instanceIds }),
    [],
  );
  const removePendingSync = useCallback(
    (instanceIds: string[]) => dispatch({ type: "pending-sync/removed", instanceIds }),
    [],
  );

  const runAction = useCallback(async (key: string, action: () => Promise<DashboardState>, options?: RunActionOptions) => {
    // El ref se adelanta al render: un segundo clic en el mismo instante ya ve la operación en curso (HU-0026).
    busyRef.current = key;
    setBusy(key);
    setError(null);
    try {
      replaceDashboard(await action());
    } catch (reason) {
      setError(friendlyError(reason), options?.errorTitle);
    } finally {
      setBusy(null);
    }
  }, [replaceDashboard, setBusy, setError]);

  const value = useMemo<DashboardContextValue>(() => ({
    ...store,
    busyRef,
    replaceDashboard,
    updateDashboard,
    setBusy,
    updateBusy,
    setError,
    setNotice,
    clearFeedback,
    finishLoading,
    storeIconPreview,
    removeIconPreview,
    setOriginalInstall,
    finishOriginalInstall,
    addPendingSync,
    removePendingSync,
    runAction,
  }), [
    store,
    replaceDashboard,
    updateDashboard,
    setBusy,
    updateBusy,
    setError,
    setNotice,
    clearFeedback,
    finishLoading,
    storeIconPreview,
    removeIconPreview,
    setOriginalInstall,
    finishOriginalInstall,
    addPendingSync,
    removePendingSync,
    runAction,
  ]);

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}
