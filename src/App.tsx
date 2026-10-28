import { useEffect, useMemo, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { bridge } from "./lib/bridge";
import {
  BACKGROUND_REFRESH_COOLDOWN_MS,
  createScanController,
  reconcileManualBusy,
  type ManualScanView,
} from "./lib/scan-controller";
import {
  createSourceUpdateController,
  mergeSourceUpdateForInstallation,
  sourceInstallationIdentity,
  sourceUpdatePresentation,
} from "./lib/source-update-controller";
import { formatBytes } from "./lib/format";
import { friendlyError } from "./lib/errors";
import { resolveRuntimePlatform, shortcutModifierLabel } from "./lib/platform";
import {
  EMPTY_DASHBOARD,
  countCodeSessions,
  countRunning,
  filterInstances,
  matchesOriginalApp,
  originalAppName as selectOriginalAppName,
  outdatedInstances as selectOutdatedInstances,
  runningInstanceIds as selectRunningInstanceIds,
} from "./features/dashboard";
import {
  SessionTransferDialog,
  transferNotice,
  unlinkDialogCopy,
  type SessionTransferSelection,
  type SessionUnlinkSelection,
} from "./features/sessions";
import { InstanceCard, InstanceEditor, applyLiveUsage } from "./features/instances";
import {
  AppearanceDialog,
  loadAppearancePreferences,
  resolveTheme,
  saveAppearancePreferences,
  type AppearancePreferences,
} from "./features/appearance";
import {
  ApplicationUpdateDialog,
  OriginalApplicationUpdateDialog,
  summarizeSynchronization,
  synchronizeLabel as describeSynchronizeLabel,
} from "./features/updates";
import { ScanProgressPanel } from "./features/scan";
import { OriginalAppSection } from "./features/original-app";
import type { DashboardState, ManagedInstance, SessionProfile } from "./types";
import { ORIGINAL_INSTANCE_ID } from "./types";
import {
  AlertIcon,
  CloudIcon,
  HardDriveIcon,
  PlusIcon,
  RefreshIcon,
  SearchIcon,
  SettingsIcon,
  SparklesIcon,
  XIcon,
} from "./components/Icons";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { EmptyState } from "./components/EmptyState";
import { LoadingCards } from "./components/LoadingCards";
import { Metric } from "./components/Metric";

interface ScanProgressEvent {
  progress: number;
  label: string;
}

function App() {
  const [state, setState] = useState<DashboardState>(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState<ManualScanView | null>(null);
  const [editor, setEditor] = useState<ManagedInstance | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedInstance | null>(null);
  const [transfer, setTransfer] = useState<SessionTransferSelection | null>(null);
  const [unlinkTarget, setUnlinkTarget] = useState<SessionUnlinkSelection | null>(null);
  const [updateTargets, setUpdateTargets] = useState<ManagedInstance[] | null>(null);
  const [originalUpdateOpen, setOriginalUpdateOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [iconPreviews, setIconPreviews] = useState<Record<string, string>>({});
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [appearance, setAppearance] = useState<AppearancePreferences>(loadAppearancePreferences);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  const searchRef = useRef<HTMLInputElement>(null);
  const manualProgressUnlistenRef = useRef<(() => void) | null>(null);
  const scanListenerLifecycleRef = useRef(0);
  const busyRef = useRef<string | null>(null);
  busyRef.current = busy;
  const scanControllerRef = useRef<ReturnType<typeof createScanController<DashboardState>> | null>(null);
  if (!scanControllerRef.current) {
    scanControllerRef.current = createScanController({
      clock: {
        now: () => Date.now(),
        setTimeout: (callback, delay) => window.setTimeout(callback, delay),
        clearTimeout: (timer) => window.clearTimeout(timer),
      },
      runBackground: () => bridge.dashboard(),
      runManual: async (onProgress) => {
        const listenerLifecycle = scanListenerLifecycleRef.current;
        let removeListener: (() => void) | null = null;
        try {
          if (bridge.isDesktop()) {
            try {
              removeListener = await listen<ScanProgressEvent>("scan-progress", ({ payload }) => {
                onProgress(payload.progress, payload.label);
              });
              if (listenerLifecycle !== scanListenerLifecycleRef.current) {
                removeListener();
                removeListener = null;
              } else {
                manualProgressUnlistenRef.current = removeListener;
              }
            } catch {
              // El scan conserva sus estados inicial y terminal si el WebView no expone eventos.
            }
          }
          if (listenerLifecycle !== scanListenerLifecycleRef.current) {
            throw new Error("El ciclo de vida del escaneo manual terminó antes de iniciar.");
          }
          return await bridge.scan();
        } finally {
          if (manualProgressUnlistenRef.current === removeListener) manualProgressUnlistenRef.current = null;
          removeListener?.();
        }
      },
      onBackgroundResult: setState,
      onManualResult: setState,
      onManualView: (view) => {
        setScanProgress(view);
        setBusy((current) => reconcileManualBusy(current, view));
      },
      describeError: friendlyError,
    });
  }
  const scanController = scanControllerRef.current;
  const sourceUpdateControllerRef = useRef<ReturnType<typeof createSourceUpdateController<DashboardState>> | null>(null);
  if (!sourceUpdateControllerRef.current) {
    sourceUpdateControllerRef.current = createSourceUpdateController({
      runRefresh: () => bridge.refreshVersions(),
      onRefreshResult: setState,
      runOfficialCheck: () => bridge.checkSourceUpdate(),
      onOfficialCheckResult: (sourceUpdate, refreshedDashboard) => {
        const expected = sourceInstallationIdentity(refreshedDashboard.system);
        setState((current) => mergeSourceUpdateForInstallation(current, expected, sourceUpdate));
      },
    });
  }
  const sourceUpdateController = sourceUpdateControllerRef.current;

  const scanManually = () => {
    if (loading) return;
    setError(null);
    scanController.requestManual();
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      let expected: ReturnType<typeof sourceInstallationIdentity> | null = null;
      try {
        const dashboard = await bridge.dashboard();
        expected = sourceInstallationIdentity(dashboard.system);
        if (active) setState(dashboard);
      } catch (reason) {
        if (active) setError(friendlyError(reason));
      } finally {
        if (active) {
          setLoading(false);
          scanController.markLoaded();
        }
      }
      if (!expected) return;
      try {
        const sourceUpdate = await bridge.checkSourceUpdate();
        if (active) {
          setState((current) => mergeSourceUpdateForInstallation(current, expected, sourceUpdate));
        }
      } catch {
        // La detección remota nunca bloquea la carga del dashboard.
      }
    };
    void load();
    return () => { active = false; };
  }, [scanController]);

  useEffect(() => {
    scanController.activate();
    return () => {
      scanListenerLifecycleRef.current += 1;
      manualProgressUnlistenRef.current?.();
      manualProgressUnlistenRef.current = null;
      scanController.deactivate();
    };
  }, [scanController]);

  useEffect(() => {
    sourceUpdateController.activate();
    const handleBlur = () => sourceUpdateController.handleBlur();
    const handleFocus = () => sourceUpdateController.handleFocus();
    const handleVisibility = () => sourceUpdateController.handleVisibility(document.hidden);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      sourceUpdateController.deactivate();
    };
  }, [sourceUpdateController]);

  const runningInstanceIds = useMemo(
    () => selectRunningInstanceIds(state.instances),
    [state.instances],
  );
  const runningInstanceKey = runningInstanceIds.join(":");
  const sourceIdentityRef = useRef(sourceInstallationIdentity(state.system));
  sourceIdentityRef.current = sourceInstallationIdentity(state.system);

  useEffect(() => {
    if (!runningInstanceIds.length) return;
    let active = true;
    const refreshLiveUsage = async () => {
      if (!active || document.hidden) return;
      try {
        const snapshots = await bridge.liveUsage(runningInstanceIds);
        if (!active || !snapshots.length) return;
        const byId = new Map(snapshots.map((snapshot) => [snapshot.instanceId, snapshot.usage]));
        setState((current) => applyLiveUsage(current, byId));
      } catch {
        // Una lectura parcial conserva la última captura válida.
      }
    };
    void refreshLiveUsage();
    const timer = window.setInterval(() => void refreshLiveUsage(), 15_000);
    window.addEventListener("focus", refreshLiveUsage);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshLiveUsage);
    };
  }, [runningInstanceKey]);

  useEffect(() => {
    let active = true;
    const refreshSourceUpdate = async () => {
      if (!active || document.hidden) return;
      try {
        const expected = sourceIdentityRef.current;
        const sourceUpdate = await bridge.checkSourceUpdate();
        if (active) {
          setState((current) => mergeSourceUpdateForInstallation(current, expected, sourceUpdate));
        }
      } catch {
        // La última metadata válida permanece visible desde la caché backend.
      }
    };
    const timer = window.setInterval(() => void refreshSourceUpdate(), 6 * 60 * 60 * 1_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    saveAppearancePreferences(appearance);
  }, [appearance]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    setSystemDark(media.matches);
    media.addEventListener("change", updateSystemTheme);
    return () => media.removeEventListener("change", updateSystemTheme);
  }, []);

  useEffect(() => {
    const refreshSilently = (trigger: "focus" | "interval") => {
      if (document.hidden || busyRef.current || sourceUpdateController.blocksGeneralRefresh(trigger)) return;
      scanController.requestBackground(trigger);
    };
    const timer = window.setInterval(() => refreshSilently("interval"), BACKGROUND_REFRESH_COOLDOWN_MS);
    const handleFocus = () => refreshSilently("focus");
    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
    };
  }, [scanController, sourceUpdateController]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        setAppearanceOpen(false);
        setEditor(null);
        setDeleteTarget(null);
        if (!busyRef.current?.startsWith("transfer:")) setTransfer(null);
        if (!busyRef.current?.startsWith("unlink:")) setUnlinkTarget(null);
        if (busyRef.current !== "update-applications") setUpdateTargets(null);
        if (busyRef.current !== "update-original") setOriginalUpdateOpen(false);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const filtered = useMemo(() => filterInstances(state.instances, query), [query, state.instances]);

  const originalAppName = selectOriginalAppName(state.system);
  const showOriginal = useMemo(
    () => matchesOriginalApp(state.system, originalAppName, query),
    // Las mismas dependencias que antes: solo los campos de `system` que lee el filtro.
    [originalAppName, query, state.system.originalCodeSessions, state.system.originalProfilePath, state.system.sourcePath],
  );

  const running = countRunning(state.instances);
  const codeSessionCount = countCodeSessions(state);
  const outdatedInstances = useMemo(
    () => selectOutdatedInstances(state.instances, state.system.versionTopology.staleInstanceIds),
    [state.instances, state.system.versionTopology.staleInstanceIds],
  );
  const latestSource = state.system.versionTopology.latestSource;
  const latestVersion = state.system.versionTopology.latestInstalledVersion;
  const officialUpdate = sourceUpdatePresentation(
    state.system.sourceUpdate,
    state.system.versionTopology,
    originalAppName,
  );
  const synchronizeLabel = describeSynchronizeLabel(latestSource, latestVersion);
  const transferProfiles = useMemo<SessionProfile[]>(() => [
    {
      id: ORIGINAL_INSTANCE_ID,
      name: originalAppName,
      status: state.system.originalStatus,
      codeSessions: state.system.originalCodeSessions,
      isOriginal: true,
    },
    ...state.instances,
  ], [originalAppName, state.instances, state.system.originalCodeSessions, state.system.originalStatus]);

  const runAction = async (key: string, action: () => Promise<DashboardState>) => {
    setBusy(key);
    setError(null);
    try {
      setState(await action());
    } catch (reason) {
      setError(friendlyError(reason));
    } finally {
      setBusy(null);
    }
  };

  const windowAction = async (action: "close" | "minimize" | "maximize") => {
    if (!bridge.isDesktop()) return;
    const window = getCurrentWindow();
    if (action === "close") await window.close();
    if (action === "minimize") await window.minimize();
    if (action === "maximize") await window.toggleMaximize();
  };

  const runtimePlatform = resolveRuntimePlatform(state.system.platform, navigator.platform);
  const buildLabel = state.system.appVersion || (loading ? "cargando…" : "no disponible");
  const resolvedTheme = resolveTheme(appearance.theme, systemDark);

  return (
    <div className={`desktop-shell platform-${runtimePlatform} theme-${resolvedTheme} session-text-${appearance.sessionTextSize}`}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <main className="app-window">
        <header className="titlebar" data-tauri-drag-region>
          <div className="brand-cluster" data-tauri-drag-region>
            <div className="window-controls" aria-label="Controles de ventana">
              <button className="window-dot close" aria-label="Cerrar" onClick={() => void windowAction("close")} />
              <button className="window-dot minimize" aria-label="Minimizar" onClick={() => void windowAction("minimize")} />
              <button className="window-dot maximize" aria-label="Maximizar" onClick={() => void windowAction("maximize")} />
            </div>
            <div className="brand-divider" />
            <div className="brand" data-tauri-drag-region>
              <span className="brand-mark"><CloudIcon size={29} /></span>
              <span>Code AI Profiles</span>
              <span className="beta-label">BETA</span>
            </div>
          </div>

          <div className="header-actions">
            <div className="action-island">
              <span className="sparkle"><SparklesIcon size={19} /></span>
              <span className="action-divider" />
              <button className="text-action" onClick={scanManually} disabled={loading || busy !== null}>
                <RefreshIcon className={busy === "scan" ? "spin" : ""} size={18} />
                <span>Escanear sistema</span>
              </button>
            </div>
            <button
              className="appearance-button"
              onClick={() => setAppearanceOpen(true)}
              title="Configurar apariencia"
              aria-label="Configurar apariencia"
            >
              <SettingsIcon size={19} />
            </button>
            <button
              className="primary-action"
              onClick={() => setEditor("new")}
              disabled={!state.system.sourcePath || busy !== null}
              title={!state.system.sourcePath ? "Instala una aplicación compatible o configura una ruta válida" : undefined}
            >
              <span className="plus-disc"><PlusIcon size={15} /></span>
              Nueva instancia
            </button>
          </div>
        </header>

        <section className="toolbar">
          <div className="system-pill">
            <div className="active-summary">
              <span className={`status-dot ${running > 0 ? "live" : ""}`} />
              <strong>{running} EN EJECUCIÓN</strong>
            </div>
            <span className="pill-divider" />
            <Metric label="Perfiles" value={`${state.instances.length}`} />
            <span className="pill-divider short" />
            <Metric label="Sesiones Code" value={`${codeSessionCount}`} />
            <span className="pill-divider short" />
            <Metric label="Aplicación" value={state.system.sourceVersion ?? "No detectada"} accent={!state.system.sourcePath} />
          </div>

          <label className="search-pill">
            <SearchIcon size={18} />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar perfiles o sesiones…"
              aria-label="Buscar instancias"
            />
            {query ? (
              <button className="clear-search" onClick={() => setQuery("")} aria-label="Limpiar búsqueda"><XIcon size={15} /></button>
            ) : (
              <kbd>{shortcutModifierLabel(navigator.platform)} F</kbd>
            )}
          </label>
        </section>

        <section className={`content ${scanProgress?.status === "waiting" || scanProgress?.status === "running" ? "is-scanning" : ""}`} aria-live="polite">
          {scanProgress && (
            <ScanProgressPanel
              {...scanProgress}
              onDismiss={() => scanController.dismissManual(scanProgress.generation)}
            />
          )}
          {!loading && state.system.sourcePath && officialUpdate && (
            <div className={`source-update-banner source-update-${officialUpdate.kind}`}>
              <span className="update-banner-icon">
                {officialUpdate.kind === "available" ? <SparklesIcon size={17} /> : <AlertIcon size={17} />}
              </span>
              <div>
                <strong>{officialUpdate.title}</strong>
                <span>{officialUpdate.detail}</span>
              </div>
              <button
                onClick={() => {
                  setError(null);
                  setNotice(null);
                  setOriginalUpdateOpen(true);
                }}
                disabled={busy !== null || !state.system.sourcePath}
              >
                {officialUpdate.actionLabel}
              </button>
            </div>
          )}
          {outdatedInstances.length > 0 && (
            <div className="update-banner">
              <span className="update-banner-icon"><RefreshIcon size={17} /></span>
              <div>
                <strong>{synchronizeLabel}</strong>
                <span>
                  {state.system.versionTopology.canSynchronizeManaged
                    ? outdatedInstances.length === 1
                      ? `${outdatedInstances[0].name} usa una versión anterior.`
                      : `${outdatedInstances.length} instancias usan una versión anterior.`
                    : state.system.versionTopology.reason ?? "No hay una fuente local válida para sincronizar."}
                </span>
              </div>
              <button
                onClick={() => {
                  setError(null);
                  setNotice(null);
                  setUpdateTargets(outdatedInstances);
                }}
                disabled={busy !== null || !state.system.versionTopology.canSynchronizeManaged}
              >
                Sincronizar
              </button>
            </div>
          )}
          {error && (
            <div className="error-banner">
              <AlertIcon size={19} />
              <span>{error}</span>
              <button onClick={() => setError(null)} aria-label="Cerrar error"><XIcon size={16} /></button>
            </div>
          )}
          {notice && (
            <div className="notice-banner">
              <SparklesIcon size={19} />
              <span>{notice}</span>
              <button onClick={() => setNotice(null)} aria-label="Cerrar aviso"><XIcon size={16} /></button>
            </div>
          )}

          {loading ? (
            <LoadingCards />
          ) : showOriginal || filtered.length ? (
            <div className="dashboard-sections">
              {showOriginal && (
                <OriginalAppSection
                  appName={originalAppName}
                  appPath={state.system.sourcePath!}
                  platform={runtimePlatform}
                  profilePath={state.system.originalProfilePath}
                  version={state.system.sourceVersion}
                  status={state.system.originalStatus}
                  sessions={state.system.originalCodeSessions}
                  autoExpand={Boolean(query)}
                  busy={busy !== null}
                  onUpdate={() => {
                    setError(null);
                    setNotice(null);
                    setOriginalUpdateOpen(true);
                  }}
                  onTransfer={(session) => {
                    setError(null);
                    setNotice(null);
                    setTransfer({ source: transferProfiles[0], session });
                  }}
                  onUnlink={(session) => {
                    setError(null);
                    setNotice(null);
                    setUnlinkTarget({ instance: transferProfiles[0], session });
                  }}
                />
              )}
              {filtered.length > 0 && (
                <section className="managed-profiles-section" aria-labelledby="managed-profiles-title">
                  <div className="dashboard-section-heading">
                    <div><CloudIcon size={17} /><strong id="managed-profiles-title">Instancias independientes</strong></div>
                    <span>{filtered.length} {filtered.length === 1 ? "perfil" : "perfiles"}</span>
                  </div>
                  <div className="instance-list">
                    {filtered.map((instance) => (
                      <InstanceCard
                        key={instance.id}
                        instance={instance}
                        platform={runtimePlatform}
                        busy={busy}
                        updateAvailable={outdatedInstances.some((outdated) => outdated.id === instance.id)}
                        iconPreviewUrl={iconPreviews[instance.id] ?? null}
                        autoExpand={Boolean(query)}
                        onLaunch={() => void runAction(`launch:${instance.id}`, () => bridge.launch(instance.id))}
                        onStop={() => void runAction(`stop:${instance.id}`, () => bridge.stop(instance.id))}
                        onOpen={() => void bridge.openFolder(instance.id).catch((reason) => setError(friendlyError(reason)))}
                        onEdit={() => setEditor(instance)}
                        onDelete={() => setDeleteTarget(instance)}
                        onTransfer={(session) => {
                          setError(null);
                          setNotice(null);
                          setTransfer({ source: instance, session });
                        }}
                        onUnlink={(session) => {
                          setError(null);
                          setNotice(null);
                          setUnlinkTarget({ instance, session });
                        }}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <EmptyState
              searching={Boolean(query)}
              sourceFound={Boolean(state.system.sourcePath)}
              onCreate={() => setEditor("new")}
              onClear={() => setQuery("")}
              onScan={scanManually}
            />
          )}
        </section>

        <footer className="statusbar">
          <div className="footer-group">
            <span className={`footer-health ${state.system.sourcePath ? "healthy" : "warning"}`}>
              <span className="mini-dot" />
              {state.system.sourcePath ? `${originalAppName.toLocaleUpperCase()} DETECTADA` : "APLICACIÓN COMPATIBLE NO DETECTADA"}
            </span>
            <span className="footer-divider" />
            <span><HardDriveIcon size={14} /> {formatBytes(state.system.freeBytes)} libres</span>
            <span className="footer-divider" />
            <span>{formatBytes(state.system.managedBytes)} administrados</span>
          </div>
          <div className="footer-build">
            <span>AUTO · 60S</span><span className="mini-dot" /><span aria-label={`Versión de Code AI Profiles ${buildLabel}`}>BUILD {buildLabel}</span><span className="mini-dot" /><span>{runtimePlatform.toUpperCase()}</span>
          </div>
        </footer>
      </main>

      {appearanceOpen && (
        <AppearanceDialog
          preferences={appearance}
          onChange={setAppearance}
          onClose={() => setAppearanceOpen(false)}
        />
      )}

      {editor && (
        <InstanceEditor
          instance={editor === "new" ? null : editor}
          sourcePath={state.system.sourcePath}
          platform={runtimePlatform}
          busy={busy === "create" || busy === "update"}
          onClose={() => setEditor(null)}
          onSave={async (form, iconChange) => {
            const isNew = editor === "new";
            setBusy(isNew ? "create" : "update");
            setError(null);
            try {
              let next = isNew
                ? await bridge.create(form)
                : await bridge.update({ ...form, id: editor.id });
              const previousIds = new Set(state.instances.map((instance) => instance.id));
              const changedInstance = isNew
                ? next.instances.find((instance) => !previousIds.has(instance.id))
                : next.instances.find((instance) => instance.id === editor.id);
              if (changedInstance && iconChange.remove && changedInstance.customIcon) {
                next = await bridge.clearInstanceIcon(changedInstance.id);
                setIconPreviews((current) => {
                  const updated = { ...current };
                  delete updated[changedInstance.id];
                  return updated;
                });
              }
              if (changedInstance && iconChange.bytes) {
                next = await bridge.setInstanceIcon(changedInstance.id, iconChange.bytes);
                if (iconChange.previewUrl) {
                  setIconPreviews((current) => ({ ...current, [changedInstance.id]: iconChange.previewUrl! }));
                }
              }
              setState(next);
              setEditor(null);
            } catch (reason) {
              setError(friendlyError(reason));
            } finally {
              setBusy(null);
            }
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={`Eliminar “${deleteTarget.name}”`}
          confirmLabel="Eliminar instancia"
          busy={busy === `delete:${deleteTarget.id}`}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            await runAction(`delete:${deleteTarget.id}`, () => bridge.remove(deleteTarget.id));
            setDeleteTarget(null);
          }}
        >
          Se borrarán la aplicación administrada y todos los datos locales de este perfil. La cuenta vinculada al proveedor no se elimina. Esta acción no se puede deshacer.
        </ConfirmDialog>
      )}

      {transfer && (
        <SessionTransferDialog
          key={`${transfer.source.id}:${transfer.session.id}`}
          source={transfer.source}
          session={transfer.session}
          instances={transferProfiles}
          busy={busy === `transfer:${transfer.session.id}`}
          onClose={() => setTransfer(null)}
          onTransfer={async (targetId, mode, includeLocalArtifacts) => {
            const target = transferProfiles.find((instance) => instance.id === targetId);
            if (!target) return;
            setBusy(`transfer:${transfer.session.id}`);
            setError(null);
            setNotice(null);
            try {
              const result = await bridge.copySession({
                sourceInstanceId: transfer.source.id,
                targetInstanceId: targetId,
                sessionId: transfer.session.id,
                mode,
                includeLocalArtifacts,
              });
              setState(result.dashboard);
              setNotice(transferNotice(mode, transfer.session.title, transfer.source.name, target.name, result.artifacts));
              setTransfer(null);
            } catch (reason) {
              setError(friendlyError(reason));
            } finally {
              setBusy(null);
            }
          }}
        />
      )}

      {unlinkTarget?.session.transfer && (() => {
        const transferInfo = unlinkTarget.session.transfer;
        const origin = transferProfiles.find((instance) => instance.id === transferInfo.originInstanceId);
        const copy = unlinkDialogCopy(unlinkTarget, transferInfo, origin?.name);
        return (
          <ConfirmDialog
            title={copy.title}
            confirmLabel={copy.confirmLabel}
            busy={busy === `unlink:${unlinkTarget.session.id}`}
            tone="neutral"
            busyLabel={copy.busyLabel}
            onCancel={() => setUnlinkTarget(null)}
            onConfirm={async () => {
              setBusy(`unlink:${unlinkTarget.session.id}`);
              setError(null);
              setNotice(null);
              try {
                const nextState = await bridge.unlinkSession({
                  instanceId: unlinkTarget.instance.id,
                  sessionId: unlinkTarget.session.id,
                });
                setState(nextState);
                setNotice(copy.notice);
                setUnlinkTarget(null);
              } catch (reason) {
                setError(friendlyError(reason));
              } finally {
                setBusy(null);
              }
            }}
          >
            {copy.body}
          </ConfirmDialog>
        );
      })()}

      {updateTargets && latestSource && latestVersion && (
        <ApplicationUpdateDialog
          instances={updateTargets}
          sourceName={latestSource.name}
          targetVersion={latestVersion}
          canSynchronize={state.system.versionTopology.canSynchronizeManaged}
          unavailableReason={state.system.versionTopology.reason}
          busy={busy === "update-applications"}
          onClose={() => setUpdateTargets(null)}
          onConfirm={async () => {
            const targets = updateTargets.filter((instance) => instance.status === "stopped");
            setBusy("update-applications");
            setError(null);
            setNotice(null);
            try {
              const result = await bridge.synchronizeApplications({
                source: latestSource,
                targetInstanceIds: targets.map((instance) => instance.id),
              });
              setState(result.dashboard);
              const summary = summarizeSynchronization(result.results);
              if (summary.notice) setNotice(summary.notice);
              if (summary.error) setError(summary.error);
              setUpdateTargets(null);
            } catch (reason) {
              setError(friendlyError(reason));
              setUpdateTargets(null);
            } finally {
              setBusy(null);
            }
          }}
        />
      )}

      {originalUpdateOpen && state.system.sourcePath && (
        <OriginalApplicationUpdateDialog
          appName={originalAppName}
          platform={runtimePlatform}
          version={state.system.sourceVersion}
          busy={busy === "update-original"}
          onClose={() => setOriginalUpdateOpen(false)}
          onConfirm={async () => {
            setBusy("update-original");
            setError(null);
            setNotice(null);
            try {
              const result = await sourceUpdateController.runHandoff(() => bridge.updateOriginalApplication());
              setNotice(result.message);
              setOriginalUpdateOpen(false);
            } catch (reason) {
              setError(friendlyError(reason));
              setOriginalUpdateOpen(false);
            } finally {
              setBusy(null);
            }
          }}
        />
      )}
    </div>
  );
}

export default App;
