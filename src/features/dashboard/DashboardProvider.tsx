import { useCallback, useMemo, useReducer, useRef, type ReactNode } from "react";
import { friendlyError } from "../../lib/errors";
import type { DashboardState } from "../../types";
import { DashboardContext, type DashboardContextValue } from "./dashboard-context";
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
  const setError = useCallback((error: string | null) => dispatch({ type: "error/changed", error }), []);
  const setNotice = useCallback((notice: string | null) => dispatch({ type: "notice/changed", notice }), []);
  const clearFeedback = useCallback(() => dispatch({ type: "feedback/cleared" }), []);
  const finishLoading = useCallback(() => dispatch({ type: "loading/finished" }), []);
  const storeIconPreview = useCallback(
    (instanceId: string, url: string) => dispatch({ type: "icon-preview/stored", instanceId, url }),
    [],
  );
  const removeIconPreview = useCallback((instanceId: string) => dispatch({ type: "icon-preview/removed", instanceId }), []);

  const runAction = useCallback(async (key: string, action: () => Promise<DashboardState>) => {
    setBusy(key);
    setError(null);
    try {
      replaceDashboard(await action());
    } catch (reason) {
      setError(friendlyError(reason));
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
    runAction,
  ]);

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}
