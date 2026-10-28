import { useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { bridge } from "../lib/bridge";
import { sourceUpdatePresentation } from "../lib/source-update-controller";
import { formatBytes } from "../lib/format";
import { resolveRuntimePlatform, shortcutModifierLabel } from "../lib/platform";
import {
  countCodeSessions,
  countRunning,
  filterInstances,
  matchesOriginalApp,
  originalAppName as selectOriginalAppName,
  outdatedInstances as selectOutdatedInstances,
  useDashboard,
} from "../features/dashboard";
import {
  SessionTransferDialog,
  UnlinkSessionDialog,
  useSessionActions,
  useTransferProfiles,
} from "../features/sessions";
import { DeleteInstanceDialog, InstanceCard, InstanceEditor, useInstanceActions } from "../features/instances";
import { AppearanceDialog, useAppearance } from "../features/appearance";
import {
  ApplicationUpdateDialog,
  OriginalApplicationUpdateDialog,
  synchronizeLabel as describeSynchronizeLabel,
  useUpdateActions,
} from "../features/updates";
import { ScanProgressPanel, useScan } from "../features/scan";
import { OriginalAppSection } from "../features/original-app";
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
} from "../components/Icons";
import { EmptyState } from "../components/EmptyState";
import { LoadingCards } from "../components/LoadingCards";
import { Metric } from "../components/Metric";
import { useDialogs } from "./providers/dialogs-context";

function AppView() {
  const {
    dashboard: state,
    loading,
    busy,
    error,
    notice,
    iconPreviews,
    setError,
    setNotice,
    clearFeedback,
  } = useDashboard();
  const { progress: scanProgress, requestManual: scanManually, dismiss: dismissScan } = useScan();
  const { preferences: appearance, setPreferences: setAppearance, resolvedTheme } = useAppearance();
  const {
    appearanceOpen,
    setAppearanceOpen,
    editor,
    setEditor,
    deleteTarget,
    setDeleteTarget,
    transfer,
    setTransfer,
    unlinkTarget,
    setUnlinkTarget,
    updateTargets,
    setUpdateTargets,
    originalUpdateOpen,
    setOriginalUpdateOpen,
  } = useDialogs();
  const instanceActions = useInstanceActions();
  const sessionActions = useSessionActions();
  const updateActions = useUpdateActions();
  const transferProfiles = useTransferProfiles();
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        searchRef.current?.focus();
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

  const windowAction = async (action: "close" | "minimize" | "maximize") => {
    if (!bridge.isDesktop()) return;
    const window = getCurrentWindow();
    if (action === "close") await window.close();
    if (action === "minimize") await window.minimize();
    if (action === "maximize") await window.toggleMaximize();
  };

  const runtimePlatform = resolveRuntimePlatform(state.system.platform, navigator.platform);
  const buildLabel = state.system.appVersion || (loading ? "cargando…" : "no disponible");

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
              onDismiss={() => dismissScan(scanProgress.generation)}
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
                  clearFeedback();
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
                  clearFeedback();
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
                    clearFeedback();
                    setOriginalUpdateOpen(true);
                  }}
                  onTransfer={(session) => {
                    clearFeedback();
                    setTransfer({ source: transferProfiles[0], session });
                  }}
                  onUnlink={(session) => {
                    clearFeedback();
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
                        onLaunch={() => instanceActions.launch(instance)}
                        onStop={() => instanceActions.stop(instance)}
                        onOpen={() => instanceActions.openFolder(instance)}
                        onEdit={() => setEditor(instance)}
                        onDelete={() => setDeleteTarget(instance)}
                        onTransfer={(session) => {
                          clearFeedback();
                          setTransfer({ source: instance, session });
                        }}
                        onUnlink={(session) => {
                          clearFeedback();
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
          onSave={(form, iconChange) => instanceActions.save(editor, form, iconChange, () => setEditor(null))}
        />
      )}

      {deleteTarget && (
        <DeleteInstanceDialog
          instance={deleteTarget}
          busy={busy === `delete:${deleteTarget.id}`}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => instanceActions.remove(deleteTarget, () => setDeleteTarget(null))}
        />
      )}

      {transfer && (
        <SessionTransferDialog
          key={`${transfer.source.id}:${transfer.session.id}`}
          source={transfer.source}
          session={transfer.session}
          instances={transferProfiles}
          busy={busy === `transfer:${transfer.session.id}`}
          onClose={() => setTransfer(null)}
          onTransfer={(targetId, mode, includeLocalArtifacts) => sessionActions.transfer(
            transfer,
            transferProfiles,
            targetId,
            mode,
            includeLocalArtifacts,
            () => setTransfer(null),
          )}
        />
      )}

      {unlinkTarget?.session.transfer && (
        <UnlinkSessionDialog
          selection={unlinkTarget}
          transferInfo={unlinkTarget.session.transfer}
          profiles={transferProfiles}
          busy={busy === `unlink:${unlinkTarget.session.id}`}
          onCancel={() => setUnlinkTarget(null)}
          onConfirm={(copy) => sessionActions.unlink(unlinkTarget, copy, () => setUnlinkTarget(null))}
        />
      )}

      {updateTargets && latestSource && latestVersion && (
        <ApplicationUpdateDialog
          instances={updateTargets}
          sourceName={latestSource.name}
          targetVersion={latestVersion}
          canSynchronize={state.system.versionTopology.canSynchronizeManaged}
          unavailableReason={state.system.versionTopology.reason}
          busy={busy === "update-applications"}
          onClose={() => setUpdateTargets(null)}
          onConfirm={() => updateActions.synchronize(updateTargets, latestSource, () => setUpdateTargets(null))}
        />
      )}

      {originalUpdateOpen && state.system.sourcePath && (
        <OriginalApplicationUpdateDialog
          appName={originalAppName}
          platform={runtimePlatform}
          version={state.system.sourceVersion}
          busy={busy === "update-original"}
          onClose={() => setOriginalUpdateOpen(false)}
          onConfirm={() => updateActions.updateOriginal(() => setOriginalUpdateOpen(false))}
        />
      )}
    </div>
  );
}

export default AppView;
