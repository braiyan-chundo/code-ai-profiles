import { useCallback, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import { bridge } from "../../lib/bridge";
import { friendlyError } from "../../lib/errors";
import type { ProjectSummary } from "../../types";
import { ProjectsContext, type PickResult, type ProjectsContextValue } from "./projects-context";
import { initialProjectsStore, projectsReducer } from "./projects-store";

/** Lo mínimo que gira «Actualizar»: una lectura local es casi instantánea y sin esto el botón no se vería reaccionar. */
const MIN_REFRESH_MS = 400;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * El estado de Proyectos, encima del router y debajo de `DashboardRuntime` (HU-0023, A-4). Carga la lista una vez al
 * montar; después solo se relee al entrar en una pantalla o con «Actualizar». Sin `focus`, `blur`, `visibilitychange`,
 * `listen` ni intervalos (R-1 de HU-0015): la única lectura de fondo es la de montar.
 *
 * Las lecturas en vuelo se deduplican por clave (`list`, `one:<id>`): en StrictMode el efecto de montaje corre dos
 * veces y dos pantallas pueden pedir lo mismo a la vez, pero Rust recibe una sola llamada.
 */
export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [store, dispatch] = useReducer(projectsReducer, initialProjectsStore);
  const inflight = useRef(new Map<string, Promise<void>>());

  const dedupe = useCallback((key: string, run: () => Promise<void>): Promise<void> => {
    const running = inflight.current.get(key);
    if (running) return running;
    const promise = run().finally(() => inflight.current.delete(key));
    inflight.current.set(key, promise);
    return promise;
  }, []);

  const refreshAll = useCallback(() => dedupe("list", async () => {
    dispatch({ type: "list/requested" });
    try {
      dispatch({ type: "list/loaded", state: await bridge.listProjects() });
    } catch (reason) {
      dispatch({ type: "list/failed", error: friendlyError(reason) });
    }
  }), [dedupe]);

  const refreshOne = useCallback((id: string) => dedupe(`one:${id}`, async () => {
    dispatch({ type: "project/requested", id });
    const minimum = wait(MIN_REFRESH_MS);
    try {
      const project = await bridge.readProject(id);
      await minimum;
      dispatch({ type: "project/loaded", project });
    } catch (reason) {
      await minimum;
      dispatch({ type: "project/failed", id, error: friendlyError(reason) });
    }
  }), [dedupe]);

  const unpin = useCallback(async (id: string): Promise<boolean> => {
    dispatch({ type: "action-error/changed", error: null });
    try {
      await bridge.unpinProject(id);
      dispatch({ type: "project/unpinned", id });
      return true;
    } catch (reason) {
      dispatch({ type: "action-error/changed", error: friendlyError(reason) });
      return false;
    }
  }, []);

  const openFolder = useCallback(async (id: string) => {
    dispatch({ type: "action-error/changed", error: null });
    try {
      await bridge.openProjectFolder(id);
    } catch (reason) {
      dispatch({ type: "action-error/changed", error: friendlyError(reason) });
    }
  }, []);

  const pickFolder = useCallback(async (): Promise<PickResult> => {
    dispatch({ type: "action-error/changed", error: null });
    dispatch({ type: "pick/changed", picking: true });
    try {
      const candidate = await bridge.pickProjectFolder();
      return candidate ? { status: "picked", candidate } : { status: "cancelled" };
    } catch (reason) {
      dispatch({ type: "action-error/changed", error: friendlyError(reason) });
      return { status: "failed" };
    } finally {
      dispatch({ type: "pick/changed", picking: false });
    }
  }, []);

  const pinFolder = useCallback(async (path: string): Promise<ProjectSummary | null> => {
    dispatch({ type: "pin/started" });
    try {
      const project = await bridge.pinProject(path);
      dispatch({ type: "pin/succeeded", project });
      return project;
    } catch (reason) {
      dispatch({ type: "pin/failed", error: friendlyError(reason) });
      return null;
    }
  }, []);

  const clearPinError = useCallback(() => dispatch({ type: "pin-error/cleared" }), []);
  const clearActionError = useCallback(() => dispatch({ type: "action-error/changed", error: null }), []);

  // La única lectura de fondo: al montar (el sidebar enseña el contador «en curso» de cada proyecto).
  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const value = useMemo<ProjectsContextValue>(() => ({
    ...store,
    refreshAll,
    refreshOne,
    unpin,
    openFolder,
    pickFolder,
    pinFolder,
    clearPinError,
    clearActionError,
  }), [clearActionError, clearPinError, openFolder, pickFolder, pinFolder, refreshAll, refreshOne, store, unpin]);

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}
