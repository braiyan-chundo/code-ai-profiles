import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { bridge } from "./lib/bridge";
import type {
  CodeSession,
  ManagedInstance,
  CreateInstanceRequest,
  DashboardState,
  SessionTransferMode,
  SessionProfile,
} from "./types";
import { ORIGINAL_INSTANCE_ID } from "./types";
import {
  AlertIcon,
  ChevronIcon,
  ClockIcon,
  CloudIcon,
  CodeSessionIcon,
  EditIcon,
  FolderIcon,
  HardDriveIcon,
  PlayIcon,
  PlusIcon,
  RefreshIcon,
  SearchIcon,
  SettingsIcon,
  SparklesIcon,
  StopIcon,
  TransferIcon,
  TrashIcon,
  UnlinkIcon,
  XIcon,
} from "./components/Icons";

const EMPTY_STATE: DashboardState = {
  instances: [],
  system: {
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
    originalProfilePath: null,
    originalStatus: "missing",
    originalCodeSessions: [],
    freeBytes: null,
    managedBytes: 0,
  },
};

interface ScanProgressState {
  progress: number;
  label: string;
}

interface SessionTransferSelection {
  source: SessionProfile;
  session: CodeSession;
}

interface SessionUnlinkSelection {
  instance: SessionProfile;
  session: CodeSession;
}

interface ApplicationUpdateProgress {
  current: number;
  total: number;
  instanceName: string;
}

type AppTheme = "system" | "dark" | "light";
type SessionTextSize = "compact" | "comfortable" | "large";

interface AppearancePreferences {
  theme: AppTheme;
  sessionTextSize: SessionTextSize;
}

const APPEARANCE_STORAGE_KEY = "code-ai-profiles:appearance";
const DEFAULT_APPEARANCE: AppearancePreferences = {
  theme: "system",
  sessionTextSize: "comfortable",
};

function loadAppearancePreferences(): AppearancePreferences {
  try {
    const stored = JSON.parse(window.localStorage.getItem(APPEARANCE_STORAGE_KEY) ?? "null") as Partial<AppearancePreferences> | null;
    const theme = stored?.theme;
    const sessionTextSize = stored?.sessionTextSize;
    return {
      theme: theme === "light" || theme === "dark" || theme === "system" ? theme : DEFAULT_APPEARANCE.theme,
      sessionTextSize: sessionTextSize === "compact" || sessionTextSize === "comfortable" || sessionTextSize === "large"
        ? sessionTextSize
        : DEFAULT_APPEARANCE.sessionTextSize,
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

const SCAN_STAGES: ScanProgressState[] = [
  { progress: 8, label: "Preparando el escaneo…" },
  { progress: 22, label: "Cargando perfiles administrados…" },
  { progress: 40, label: "Comprobando instancias y procesos…" },
  { progress: 62, label: "Leyendo métricas locales de uso…" },
  { progress: 74, label: "Leyendo modelos y contexto de las sesiones…" },
  { progress: 88, label: "Buscando la aplicación compatible y su versión…" },
  { progress: 92, label: "Actualizando almacenamiento y registro…" },
];

function formatBytes(value: number | null): string {
  if (value == null) return "No disponible";
  if (value === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index > 2 ? 1 : 0)} ${units[index]}`;
}

function formatSessionTime(value: number | null): string {
  if (value == null) return "Sin actividad registrada";
  const timestamp = value < 10_000_000_000 ? value * 1000 : value;
  const elapsed = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "Ahora mismo";
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Hace ${days} d`;
  return new Intl.DateTimeFormat("es", { day: "numeric", month: "short" }).format(timestamp);
}

function formatCaptureTime(value: number | null | undefined): string {
  if (value == null) return "Sin captura reciente";
  const timestamp = value < 10_000_000_000 ? value * 1000 : value;
  return `Última captura ${new Intl.DateTimeFormat("es", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(timestamp)}`;
}

type SessionContextLevel = "normal" | "elevated" | "critical" | "unknown";

function sessionContextLevel(value: number | null | undefined): SessionContextLevel {
  if (value == null) return "unknown";
  if (value >= 90) return "critical";
  if (value >= 70) return "elevated";
  return "normal";
}

function formatTokenCount(value: number | null | undefined): string {
  if (value == null) return "Sin datos";
  if (value >= 1_000_000) {
    const amount = value / 1_000_000;
    return `${amount.toFixed(Number.isInteger(amount) ? 0 : 1)}M`;
  }
  if (value >= 1_000) {
    const amount = value / 1_000;
    return `${amount.toFixed(value >= 100_000 || Number.isInteger(amount) ? 0 : 1)}k`;
  }
  return `${value}`;
}

function formatModelName(value: string | null | undefined): string {
  if (!value) return "Modelo no registrado";
  const normalized = value.toLowerCase();
  const family = normalized.includes("opus")
    ? "Opus"
    : normalized.includes("sonnet")
      ? "Sonnet"
      : normalized.includes("haiku")
        ? "Haiku"
        : null;
  const version = normalized.match(/(?:opus|sonnet|haiku)-(\d+)-(\d+)/);
  if (family && version) return `${family} ${version[1]}.${version[2]}`;
  return value;
}

function friendlyError(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === "string") return reason;
  return "Ocurrió un error inesperado.";
}

function versionParts(version: string): number[] {
  return version.split(/\D+/).filter(Boolean).map((part) => Number.parseInt(part, 10));
}

function versionIsNewer(candidate: string, current: string | null): boolean {
  if (!current) return true;
  const candidateParts = versionParts(candidate);
  const currentParts = versionParts(current);
  const length = Math.max(candidateParts.length, currentParts.length);
  for (let index = 0; index < length; index += 1) {
    const candidatePart = candidateParts[index] ?? 0;
    const currentPart = currentParts[index] ?? 0;
    if (candidatePart !== currentPart) return candidatePart > currentPart;
  }
  return false;
}

function App() {
  const [state, setState] = useState<DashboardState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState<ScanProgressState | null>(null);
  const [editor, setEditor] = useState<ManagedInstance | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedInstance | null>(null);
  const [transfer, setTransfer] = useState<SessionTransferSelection | null>(null);
  const [unlinkTarget, setUnlinkTarget] = useState<SessionUnlinkSelection | null>(null);
  const [updateTargets, setUpdateTargets] = useState<ManagedInstance[] | null>(null);
  const [updateProgress, setUpdateProgress] = useState<ApplicationUpdateProgress | null>(null);
  const [originalUpdateOpen, setOriginalUpdateOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [appearance, setAppearance] = useState<AppearancePreferences>(loadAppearancePreferences);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  const searchRef = useRef<HTMLInputElement>(null);
  const scanInFlightRef = useRef(false);
  const busyRef = useRef<string | null>(null);
  busyRef.current = busy;

  const refresh = async (scan = false) => {
    if (scan && scanInFlightRef.current) return;
    if (scan) scanInFlightRef.current = true;
    setBusy(scan ? "scan" : "refresh");
    setError(null);
    const startedAt = Date.now();
    const stageTimers: number[] = [];
    if (scan) {
      setScanProgress(SCAN_STAGES[0]);
      SCAN_STAGES.slice(1).forEach((stage, index) => {
        stageTimers.push(window.setTimeout(() => setScanProgress(stage), (index + 1) * 190));
      });
    }
    try {
      const nextState = scan ? await bridge.scan() : await bridge.dashboard();
      if (scan) {
        const remaining = Math.max(0, 1_150 - (Date.now() - startedAt));
        await new Promise((resolve) => window.setTimeout(resolve, remaining));
        stageTimers.forEach(window.clearTimeout);
        setScanProgress({ progress: 100, label: "Escaneo completado" });
        window.setTimeout(() => setScanProgress(null), 420);
      }
      setState(nextState);
    } catch (reason) {
      stageTimers.forEach(window.clearTimeout);
      if (scan) {
        setScanProgress({ progress: 100, label: "No se pudo completar el escaneo" });
        window.setTimeout(() => setScanProgress(null), 1_200);
      }
      setError(friendlyError(reason));
    } finally {
      if (scan) scanInFlightRef.current = false;
      setLoading(false);
      setBusy(null);
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      await refresh();
      try {
        const sourceUpdate = await bridge.checkSourceUpdate();
        if (active) {
          setState((current) => ({
            ...current,
            system: { ...current.system, sourceUpdate },
          }));
        }
      } catch {
        // La detección remota nunca bloquea la carga del dashboard.
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const runningInstanceIds = useMemo(
    () => state.instances.filter((instance) => instance.status === "running").map((instance) => instance.id),
    [state.instances],
  );
  const runningInstanceKey = runningInstanceIds.join(":");

  useEffect(() => {
    if (!runningInstanceIds.length) return;
    let active = true;
    const refreshLiveUsage = async () => {
      if (!active || document.hidden) return;
      try {
        const snapshots = await bridge.liveUsage(runningInstanceIds);
        if (!active || !snapshots.length) return;
        const byId = new Map(snapshots.map((snapshot) => [snapshot.instanceId, snapshot.usage]));
        setState((current) => ({
          ...current,
          instances: current.instances.map((instance) => {
            const usage = byId.get(instance.id);
            return usage ? { ...instance, usage } : instance;
          }),
        }));
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
        const sourceUpdate = await bridge.checkSourceUpdate();
        if (active) setState((current) => ({ ...current, system: { ...current.system, sourceUpdate } }));
      } catch {
        // La última metadata válida permanece visible desde la caché backend.
      }
    };
    const timer = window.setInterval(() => void refreshSourceUpdate(), 6 * 60 * 60 * 1_000);
    window.addEventListener("focus", refreshSourceUpdate);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshSourceUpdate);
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(appearance));
    } catch {
      // La app sigue funcionando aunque el WebView no permita persistir preferencias.
    }
  }, [appearance]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    setSystemDark(media.matches);
    media.addEventListener("change", updateSystemTheme);
    return () => media.removeEventListener("change", updateSystemTheme);
  }, []);

  useEffect(() => {
    let active = true;
    const scanSilently = async () => {
      if (!active || document.hidden || scanInFlightRef.current || busyRef.current) return;
      scanInFlightRef.current = true;
      try {
        const nextState = await bridge.scan();
        if (active) setState(nextState);
      } catch {
        // Los escaneos de fondo son silenciosos; el escaneo manual muestra los errores.
      } finally {
        scanInFlightRef.current = false;
      }
    };
    const timer = window.setInterval(() => void scanSilently(), 60_000);
    const handleFocus = () => void scanSilently();
    window.addEventListener("focus", handleFocus);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

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

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return state.instances;
    return state.instances.filter((instance) =>
      [instance.name, instance.appPath, instance.status, ...instance.codeSessions.map((session) => session.title)]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase().includes(term)),
    );
  }, [query, state.instances]);

  const originalAppName = state.system.sourceName ?? "Aplicación compatible";
  const showOriginal = useMemo(() => {
    if (!state.system.sourcePath) return false;
    const term = query.trim().toLocaleLowerCase();
    if (!term) return true;
    return [
      "Aplicación original",
      "Instalación principal",
      originalAppName,
      state.system.sourcePath,
      state.system.originalProfilePath,
      ...state.system.originalCodeSessions.map((session) => session.title),
    ]
      .filter(Boolean)
      .some((value) => value!.toLocaleLowerCase().includes(term));
  }, [originalAppName, query, state.system.originalCodeSessions, state.system.originalProfilePath, state.system.sourcePath]);

  const running = state.instances.filter((instance) => instance.status === "running").length;
  const codeSessionCount = state.instances.reduce((total, instance) => total + instance.codeSessions.length, 0)
    + state.system.originalCodeSessions.length;
  const outdatedInstances = useMemo(() => {
    const latestVersion = state.system.sourceVersion;
    if (!latestVersion) return [];
    return state.instances.filter((instance) => versionIsNewer(latestVersion, instance.sourceVersion));
  }, [state.instances, state.system.sourceVersion]);
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

  const browserPlatform = navigator.platform.toLowerCase();
  const fallbackPlatform = browserPlatform.includes("mac")
    ? "macos"
    : browserPlatform.includes("linux")
      ? "linux"
      : "windows";
  const runtimePlatform = state.system.platform === "unknown"
    ? fallbackPlatform
    : state.system.platform;
  const resolvedTheme = appearance.theme === "system"
    ? (systemDark ? "dark" : "light")
    : appearance.theme;

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
              <button className="text-action" onClick={() => void refresh(true)} disabled={busy !== null}>
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
              <kbd>{navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl"} F</kbd>
            )}
          </label>
        </section>

        <section className={`content ${scanProgress ? "is-scanning" : ""}`} aria-live="polite">
          {scanProgress && <ScanProgressPanel {...scanProgress} />}
          {state.system.sourceUpdate.status === "available" && state.system.sourceUpdate.latestVersion && (
            <div className="source-update-banner">
              <span className="update-banner-icon"><SparklesIcon size={17} /></span>
              <div>
                <strong>Nueva versión de {originalAppName}</strong>
                <span>
                  Versión {state.system.sourceUpdate.latestVersion} disponible
                  {state.system.sourceUpdate.stale ? " · última comprobación guardada" : ""}
                </span>
              </div>
              <button
                onClick={() => {
                  setError(null);
                  setNotice(null);
                  setOriginalUpdateOpen(true);
                }}
                disabled={busy !== null || !state.system.sourcePath}
              >
                Ver actualización
              </button>
            </div>
          )}
          {outdatedInstances.length > 0 && (
            <div className="update-banner">
              <span className="update-banner-icon"><RefreshIcon size={17} /></span>
              <div>
                <strong>Actualización de la aplicación disponible</strong>
                <span>
                  {outdatedInstances.length === 1
                    ? `${outdatedInstances[0].name} usa una versión anterior.`
                    : `${outdatedInstances.length} instancias usan una versión anterior.`}
                </span>
              </div>
              <button
                onClick={() => {
                  setError(null);
                  setNotice(null);
                  setUpdateTargets(outdatedInstances);
                }}
                disabled={busy !== null}
              >
                Actualizar instancias
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
                        busy={busy}
                        updateAvailable={outdatedInstances.some((outdated) => outdated.id === instance.id)}
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
              onScan={() => void refresh(true)}
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
            <span>AUTO · 60S</span><span className="mini-dot" /><span>BUILD 0.1.0</span><span className="mini-dot" /><span>{runtimePlatform.toUpperCase()}</span>
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
          busy={busy === "create" || busy === "update"}
          onClose={() => setEditor(null)}
          onSave={async (form) => {
            const isNew = editor === "new";
            setBusy(isNew ? "create" : "update");
            setError(null);
            try {
              const next = isNew
                ? await bridge.create(form)
                : await bridge.update({ ...form, id: editor.id });
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
          onTransfer={async (targetId, mode) => {
            const target = transferProfiles.find((instance) => instance.id === targetId);
            if (!target) return;
            setBusy(`transfer:${transfer.session.id}`);
            setError(null);
            setNotice(null);
            try {
              const nextState = await bridge.copySession({
                sourceInstanceId: transfer.source.id,
                targetInstanceId: targetId,
                sessionId: transfer.session.id,
                mode,
              });
              setState(nextState);
              setNotice(
                (mode === "move"
                  ? `“${transfer.session.title}” se movió de ${transfer.source.name} a ${target.name}.`
                  : `“${transfer.session.title}” se copió de ${transfer.source.name} a ${target.name}.`)
                + " Los artefactos publicados y sus monitores no se reasignan; publícalos y activa su vigilancia desde el perfil destino si los necesitas.",
              );
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
        const isMove = transferInfo.mode === "move";
        return (
          <ConfirmDialog
            title={isMove ? `Devolver “${unlinkTarget.session.title}”` : `Desvincular “${unlinkTarget.session.title}”`}
            confirmLabel={isMove ? `Devolver a ${origin?.name ?? "su origen"}` : "Desvincular copia"}
            busy={busy === `unlink:${unlinkTarget.session.id}`}
            tone="neutral"
            busyLabel={isMove ? "Devolviendo…" : "Desvinculando…"}
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
                setNotice(
                  isMove
                    ? `“${unlinkTarget.session.title}” volvió a ${origin?.name ?? "su instancia de origen"}.`
                    : `La copia de “${unlinkTarget.session.title}” se desvinculó de ${unlinkTarget.instance.name}.`,
                );
                setUnlinkTarget(null);
              } catch (reason) {
                setError(friendlyError(reason));
              } finally {
                setBusy(null);
              }
            }}
          >
            {isMove
              ? `La sesión dejará de aparecer en ${unlinkTarget.instance.name} y volverá a ${origin?.name ?? "su instancia original"}. Ambas instancias deben estar detenidas.`
              : `La copia dejará de aparecer en ${unlinkTarget.instance.name}. La sesión original permanece intacta en ${origin?.name ?? "su instancia de origen"}.`}
          </ConfirmDialog>
        );
      })()}

      {updateTargets && state.system.sourceVersion && (
        <ApplicationUpdateDialog
          instances={updateTargets}
          targetVersion={state.system.sourceVersion}
          busy={busy === "update-applications"}
          progress={updateProgress}
          onClose={() => setUpdateTargets(null)}
          onConfirm={async () => {
            const targets = [...updateTargets];
            setBusy("update-applications");
            setError(null);
            setNotice(null);
            try {
              for (let index = 0; index < targets.length; index += 1) {
                const instance = targets[index];
                setUpdateProgress({ current: index + 1, total: targets.length, instanceName: instance.name });
                setState(await bridge.updateApplication(instance.id));
              }
              setNotice(
                `${targets.length === 1 ? targets[0].name : `${targets.length} instancias`} ${targets.length === 1 ? "se actualizó" : "se actualizaron"} a la versión ${state.system.sourceVersion}.`,
              );
              setUpdateTargets(null);
            } catch (reason) {
              setError(friendlyError(reason));
              setUpdateTargets(null);
            } finally {
              setUpdateProgress(null);
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
              const result = await bridge.updateOriginalApplication();
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

function ScanProgressPanel({ progress, label }: ScanProgressState) {
  return (
    <div className="scan-progress-panel" role="status" aria-label={`${label} ${progress}%`}>
      <div className="scan-progress-heading">
        <div className="scan-progress-copy">
          <span className="scan-radar"><SearchIcon size={17} /></span>
          <div>
            <strong>Escaneando sistema</strong>
            <span>{label}</span>
          </div>
        </div>
        <span className="scan-percentage">{progress}%</span>
      </div>
      <div className="scan-progress-track">
        <span style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong className={accent ? "danger" : ""}>{value}</strong>
    </div>
  );
}

function OriginalAppSection({
  appName,
  appPath,
  platform,
  profilePath,
  version,
  status,
  sessions,
  autoExpand,
  busy,
  onUpdate,
  onTransfer,
  onUnlink,
}: {
  appName: string;
  appPath: string;
  platform: DashboardState["system"]["platform"];
  profilePath: string | null;
  version: string | null;
  status: SessionProfile["status"];
  sessions: CodeSession[];
  autoExpand: boolean;
  busy: boolean;
  onUpdate: () => void;
  onTransfer: (session: CodeSession) => void;
  onUnlink: (session: CodeSession) => void;
}) {
  const [sessionsExpanded, setSessionsExpanded] = useState(false);
  const stateLabel = status === "running"
    ? "Ejecutándose"
    : status === "missing" ? "No disponible" : "Detenido";
  useEffect(() => {
    if (autoExpand) setSessionsExpanded(true);
  }, [autoExpand]);
  return (
    <section className="original-app-section" aria-labelledby="original-app-title">
      <div className="dashboard-section-heading original-heading">
        <div><SparklesIcon size={17} /><strong id="original-app-title">Aplicación original</strong><span className="original-badge">PRINCIPAL</span></div>
        <span className={`original-state state-${status}`}><i />{stateLabel}</span>
      </div>
      <article className="original-app-card">
        <div className="original-app-main">
          <div className="original-symbol"><CloudIcon size={31} /><span className={status === "running" ? "online" : ""} /></div>
          <div className="original-identity">
            <div><h2>{appName}</h2><span>Instalación original</span></div>
            <span className="path" title={appPath}>{appPath}</span>
            <span className="version">Versión {version ?? "—"}</span>
          </div>
          <div className="original-summary-metrics">
            <div><small>PERFIL LOCAL</small><strong>{profilePath ? "Detectado" : "Sin detectar"}</strong></div>
            <div><small>SESIONES CODE</small><strong>{sessions.length}</strong></div>
            <button
              type="button"
              className="original-update-button"
              onClick={onUpdate}
              disabled={busy}
              aria-label={`Actualizar ${appName} mediante su canal oficial`}
              title={`Abrir confirmación para el canal oficial de ${platform === "linux" ? "Linux" : platform === "windows" ? "Windows" : "macOS"}`}
            >
              <RefreshIcon size={14} /> Actualizar original
            </button>
          </div>
        </div>

        <section className={`original-code-sessions ${sessionsExpanded ? "is-expanded" : "is-collapsed"}`} aria-label="Sesiones de Code de la aplicación original">
          <div className="code-sessions-heading">
            <div><CodeSessionIcon size={17} /><strong>Sesiones de la aplicación original</strong></div>
            <button
              className="sessions-toggle"
              onClick={() => setSessionsExpanded((current) => !current)}
              aria-expanded={sessionsExpanded}
              aria-controls="original-code-session-list"
            >
              <span>{sessions.length} {sessions.length === 1 ? "sesión" : "sesiones"}</span>
              <ChevronIcon className={sessionsExpanded ? "open" : ""} size={16} />
            </button>
          </div>
          {sessionsExpanded && (
            <div className="code-sessions-body" id="original-code-session-list">
              {sessions.length ? (
                <div className="code-session-list original-session-list">
                  {sessions.map((session) => (
                    <div className="code-session-row original-session-row" key={session.id} title={session.title}>
                      <span className="session-index"><CodeSessionIcon size={14} /></span>
                      <div className="session-copy">
                        <strong>{session.title}</strong>
                        <span>
                          {formatModelName(session.model)}
                          <i />
                          {session.completedTurns} {session.completedTurns === 1 ? "turno" : "turnos"}
                          <i />
                          {formatSessionTime(session.lastActivityAt)}
                        </span>
                        <SessionContextMeter session={session} />
                      </div>
                      <div className="session-actions">
                        {session.isArchived && <span className="archived-badge">Archivada</span>}
                        {session.transfer && (
                          <span className={`linked-badge mode-${session.transfer.mode}`}>
                            {session.transfer.mode === "move" ? "Movida" : "Copia"}
                          </span>
                        )}
                        <button
                          className="session-transfer-button"
                          onClick={() => onTransfer(session)}
                          title="Transferir sesión a otro perfil"
                          aria-label={`Transferir “${session.title}” a otro perfil`}
                        >
                          <TransferIcon size={15} />
                        </button>
                        {session.transfer && (
                          <button
                            className="session-unlink-button"
                            onClick={() => onUnlink(session)}
                            title={session.transfer.mode === "move" ? "Devolver a la instancia de origen" : "Desvincular esta copia"}
                            aria-label={session.transfer.mode === "move" ? `Devolver “${session.title}” a su origen` : `Desvincular copia de “${session.title}”`}
                          >
                            <UnlinkIcon size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="sessions-empty"><ClockIcon size={15} /> La aplicación original aún no tiene sesiones de Code indexadas</div>
              )}
            </div>
          )}
        </section>
      </article>
    </section>
  );
}

interface InstanceCardProps {
  instance: ManagedInstance;
  busy: string | null;
  updateAvailable: boolean;
  autoExpand: boolean;
  onLaunch: () => void;
  onStop: () => void;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTransfer: (session: CodeSession) => void;
  onUnlink: (session: CodeSession) => void;
}

function InstanceCard({ instance, busy, updateAvailable, autoExpand, onLaunch, onStop, onOpen, onEdit, onDelete, onTransfer, onUnlink }: InstanceCardProps) {
  const [sessionsExpanded, setSessionsExpanded] = useState(false);
  const isRunning = instance.status === "running";
  const sessionUsage = instance.usage?.sessionPercent ?? null;
  const weeklyUsage = instance.usage?.weeklyPercent ?? null;
  const isBusy = busy?.endsWith(instance.id) ?? false;
  const stateLabel = instance.status === "running"
    ? "Ejecutándose"
    : instance.status === "missing" ? "No disponible" : "Detenido";
  useEffect(() => {
    if (autoExpand) setSessionsExpanded(true);
  }, [autoExpand]);

  return (
    <article className={`instance-card ${isRunning ? "is-running" : ""} ${instance.status === "missing" ? "is-missing" : ""}`}>
      <div className="instance-card-main">
        <div className="instance-symbol" aria-hidden="true">
          <CloudIcon size={34} />
          <span className={`symbol-status ${isRunning ? "online" : ""}`} />
        </div>

        <div className="instance-identity">
          <div className="name-line">
            <h2>{instance.name}</h2>
            <span className={`instance-state state-${instance.status}`}><span />{stateLabel}</span>
          </div>
          <span className="path" title={instance.appPath}>{instance.appPath}</span>
          <span className="version">
            Versión {instance.sourceVersion ?? "—"}
            {updateAvailable && <small className="version-update-badge">Actualización disponible</small>}
          </span>
        </div>
        <div className="usage-overview">
          <UsageMeter label="Uso de sesión" value={sessionUsage} />
          <UsageMeter label="Límite semanal" value={weeklyUsage} />
          <span className="usage-captured-at">{formatCaptureTime(instance.usage?.capturedAt)}</span>
        </div>

        <div className="card-actions">
          <button className="icon-button" onClick={onOpen} title="Abrir carpeta del perfil"><FolderIcon size={20} /></button>
          <button className="icon-button" onClick={onEdit} title="Editar nombre"><EditIcon size={19} /></button>
          {isRunning ? (
            <button className="launch-button stop" disabled={isBusy} onClick={onStop}>
              <StopIcon size={20} /> {isBusy ? "Deteniendo…" : "Detener"}
            </button>
          ) : (
            <button className="launch-button" disabled={isBusy || instance.status === "missing"} onClick={onLaunch}>
              <PlayIcon size={20} /> {isBusy ? "Abriendo…" : "Abrir"}
            </button>
          )}
          {!isRunning && (
            <button className="icon-button danger-button" onClick={onDelete} title="Eliminar instancia"><TrashIcon size={19} /></button>
          )}
        </div>
      </div>

      <section className={`code-sessions ${sessionsExpanded ? "is-expanded" : "is-collapsed"}`} aria-label={`Sesiones de Code de ${instance.name}`}>
        <div className="code-sessions-heading">
          <div><CodeSessionIcon size={17} /><strong>Sesiones de Code</strong></div>
          <button
            className="sessions-toggle"
            onClick={() => setSessionsExpanded((current) => !current)}
            aria-expanded={sessionsExpanded}
            aria-controls={`code-session-list-${instance.id}`}
          >
            <span>{instance.codeSessions.length} {instance.codeSessions.length === 1 ? "sesión" : "sesiones"}</span>
            <ChevronIcon className={sessionsExpanded ? "open" : ""} size={16} />
          </button>
        </div>
        {sessionsExpanded && (
          <div className="code-sessions-body" id={`code-session-list-${instance.id}`}>
            {instance.codeSessions.length ? (
              <div className="code-session-list">
                {instance.codeSessions.map((session) => (
              <div className="code-session-row" key={session.id} title={session.title}>
                <span className="session-index"><CodeSessionIcon size={14} /></span>
                <div className="session-copy">
                  <strong>{session.title}</strong>
                  <span>
                    {formatModelName(session.model)}
                    <i />
                    {session.completedTurns} {session.completedTurns === 1 ? "turno" : "turnos"}
                    <i />
                    {formatSessionTime(session.lastActivityAt)}
                  </span>
                  <SessionContextMeter session={session} />
                </div>
                <div className="session-actions">
                  {session.isArchived && <span className="archived-badge">Archivada</span>}
                  {session.transfer && (
                    <span className={`linked-badge mode-${session.transfer.mode}`}>
                      {session.transfer.mode === "move" ? "Movida" : "Copia"}
                    </span>
                  )}
                  <button
                    className="session-transfer-button"
                    onClick={() => onTransfer(session)}
                    title="Transferir sesión a otro perfil"
                    aria-label={`Transferir “${session.title}” a otro perfil`}
                  >
                    <TransferIcon size={15} />
                  </button>
                  {session.transfer && (
                    <button
                      className="session-unlink-button"
                      onClick={() => onUnlink(session)}
                      title={session.transfer.mode === "move" ? "Devolver a la instancia de origen" : "Desvincular esta copia"}
                      aria-label={session.transfer.mode === "move" ? `Devolver “${session.title}” a su origen` : `Desvincular copia de “${session.title}”`}
                    >
                      <UnlinkIcon size={15} />
                    </button>
                  )}
                </div>
              </div>
                ))}
              </div>
            ) : (
              <div className="sessions-empty"><ClockIcon size={15} /> Aún no hay sesiones de Code en este perfil</div>
            )}
          </div>
        )}
      </section>
    </article>
  );
}

function UsageMeter({ label, value }: { label: string; value: number | null }) {
  const progress = Math.min(100, Math.max(0, value ?? 0));
  return (
    <div className="usage-meter">
      <div className="usage-meter-heading">
        <span>{label}</span>
        <strong>{value == null ? "—" : `${Math.round(value)}%`}</strong>
      </div>
      <div className="progress-track" aria-label={value == null ? `${label} no disponible` : `${label}: ${value}% usado`}>
        <span
          className={progress >= 90 ? "critical" : progress >= 70 ? "high" : ""}
          style={{ width: value == null ? "0%" : `${progress}%` }}
        />
      </div>
      <small>{value == null ? "Sin datos" : "usado"}</small>
    </div>
  );
}

function SessionContextMeter({ session }: { session: CodeSession }) {
  const tokens = session.contextTokens ?? null;
  const windowTokens = session.contextWindowTokens ?? null;
  const percent = session.contextPercent ?? null;
  const hasKnownLimit = windowTokens != null && percent != null;
  const level = sessionContextLevel(hasKnownLimit ? percent : null);
  const progress = Math.min(100, Math.max(0, percent ?? 0));
  const description = level === "critical"
    ? "Considera compactar o crear otra sesión"
    : level === "elevated"
      ? "Contexto elevado"
        : level === "normal"
        ? "Contexto saludable"
        : tokens != null
          ? "Límite no identificado para este modelo"
          : "Disponible tras la próxima respuesta";
  const accessibleLabel = tokens == null
    ? "Contexto sin datos"
    : hasKnownLimit
      ? `Contexto usado: ${Math.round(percent)}%, ${tokens} de ${windowTokens} tokens`
      : `${tokens} tokens usados. Límite no identificado para este modelo`;

  return (
    <div
      className={`session-context context-${level}`}
      title={tokens == null
        ? "La aplicación aún no registra uso de contexto para esta sesión"
        : hasKnownLimit
          ? `${new Intl.NumberFormat("es-CO").format(tokens)} de ${new Intl.NumberFormat("es-CO").format(windowTokens)} tokens de contexto`
          : `${new Intl.NumberFormat("es-CO").format(tokens)} tokens usados. Límite no identificado para este modelo`}
      aria-label={accessibleLabel}
    >
      <div className="session-context-heading">
        <span>
          {tokens == null
            ? "Contexto sin datos"
            : `${formatTokenCount(tokens)}${hasKnownLimit ? ` de ${formatTokenCount(windowTokens)}` : " tokens"}`}
        </span>
        {hasKnownLimit && <strong>{Math.round(percent)}%</strong>}
      </div>
      {hasKnownLimit && (
        <div
          className="session-context-track"
          role="meter"
          aria-label={`Contexto usado: ${Math.round(percent)}%`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
      )}
      <small>{description}</small>
    </div>
  );
}

function LoadingCards() {
  return (
    <div className="instance-list" aria-label="Cargando instancias">
      {[1, 2, 3].map((item) => <div className="skeleton-card" key={item}><span /><span /><span /></div>)}
    </div>
  );
}

function EmptyState({
  searching,
  sourceFound,
  onCreate,
  onClear,
  onScan,
}: {
  searching: boolean;
  sourceFound: boolean;
  onCreate: () => void;
  onClear: () => void;
  onScan: () => void;
}) {
  if (searching) {
    return (
      <div className="empty-state">
        <div className="empty-icon"><SearchIcon size={29} /></div>
        <h2>Sin coincidencias</h2>
        <p>No hay perfiles que coincidan con la búsqueda actual.</p>
        <button className="secondary-button" onClick={onClear}>Limpiar búsqueda</button>
      </div>
    );
  }

  return (
    <div className="empty-state">
      <div className="empty-icon"><CloudIcon size={34} /></div>
      <h2>{sourceFound ? "Crea tu primer perfil aislado" : "No se detectó una aplicación compatible"}</h2>
      <p>
        {sourceFound
          ? "Code AI Profiles creará una copia administrada y un directorio de datos independiente. Cada perfil podrá iniciar sesión con una cuenta distinta."
          : "Instala una aplicación compatible y vuelve a escanear el sistema."}
      </p>
      <button className={sourceFound ? "primary-action" : "secondary-button"} onClick={sourceFound ? onCreate : onScan}>
        {sourceFound ? <><PlusIcon size={17} /> Nueva instancia</> : <><RefreshIcon size={17} /> Escanear de nuevo</>}
      </button>
    </div>
  );
}

function AppearanceDialog({
  preferences,
  onChange,
  onClose,
}: {
  preferences: AppearancePreferences;
  onChange: (preferences: AppearancePreferences) => void;
  onClose: () => void;
}) {
  const themes: Array<{ value: AppTheme; label: string; description: string }> = [
    { value: "system", label: "Sistema", description: "Sigue macOS, Windows o Linux" },
    { value: "light", label: "Claro", description: "Mayor luminosidad" },
    { value: "dark", label: "Oscuro", description: "Menor brillo" },
  ];
  const sizes: Array<{ value: SessionTextSize; label: string; sample: string }> = [
    { value: "compact", label: "Compacto", sample: "Aa" },
    { value: "comfortable", label: "Cómodo", sample: "Aa" },
    { value: "large", label: "Grande", sample: "Aa" },
  ];

  return (
    <ModalFrame
      title="Apariencia"
      subtitle="Personaliza la lectura de tus sesiones"
      onClose={onClose}
    >
      <div className="appearance-settings">
        <section className="appearance-section">
          <div className="appearance-section-heading">
            <strong>Tema</strong>
            <span>Se aplica inmediatamente</span>
          </div>
          <div className="theme-options" role="radiogroup" aria-label="Tema de la aplicación">
            {themes.map((theme) => (
              <button
                key={theme.value}
                type="button"
                className={`theme-option theme-preview-${theme.value} ${preferences.theme === theme.value ? "selected" : ""}`}
                onClick={() => onChange({ ...preferences, theme: theme.value })}
                role="radio"
                aria-checked={preferences.theme === theme.value}
              >
                <span className="theme-swatch"><i /><i /><i /></span>
                <span><strong>{theme.label}</strong><small>{theme.description}</small></span>
              </button>
            ))}
          </div>
        </section>

        <section className="appearance-section">
          <div className="appearance-section-heading">
            <strong>Tamaño del texto de sesiones</strong>
            <span>También amplía modelos y contexto</span>
          </div>
          <div className="text-size-options" role="radiogroup" aria-label="Tamaño del texto de las sesiones">
            {sizes.map((size) => (
              <button
                key={size.value}
                type="button"
                className={`text-size-option size-${size.value} ${preferences.sessionTextSize === size.value ? "selected" : ""}`}
                onClick={() => onChange({ ...preferences, sessionTextSize: size.value })}
                role="radio"
                aria-checked={preferences.sessionTextSize === size.value}
              >
                <span>{size.sample}</span>
                <strong>{size.label}</strong>
              </button>
            ))}
          </div>
        </section>

        <div className="appearance-preview" aria-label="Vista previa del texto de sesión">
          <span className="session-index"><CodeSessionIcon size={14} /></span>
          <div className="session-copy">
            <strong>Vista previa de una sesión</strong>
            <span>Opus 4.8 <i /> 24 turnos <i /> Ahora mismo</span>
            <div className="session-context context-elevated">
              <div className="session-context-heading"><span>640k de 1M</span><strong>64%</strong></div>
              <div className="session-context-track"><span style={{ width: "64%" }} /></div>
              <small>Contexto elevado</small>
            </div>
          </div>
        </div>

        <div className="modal-actions appearance-actions">
          <button className="primary-action modal-primary" onClick={onClose}>Listo</button>
        </div>
      </div>
    </ModalFrame>
  );
}

function OriginalApplicationUpdateDialog({
  appName,
  platform,
  version,
  busy,
  onClose,
  onConfirm,
}: {
  appName: string;
  platform: DashboardState["system"]["platform"];
  version: string | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const platformDetails = platform === "linux"
    ? {
        label: "Linux",
        channel: "Instrucciones oficiales del repositorio apt",
        handoff: "Se abrirán las instrucciones oficiales de apt. Revisa y completa los pasos en tu sistema; Code AI Profiles no ejecutará comandos ni solicitará permisos.",
        action: "Ver instrucciones oficiales",
      }
    : platform === "windows"
      ? {
          label: "Windows",
          channel: "Descarga oficial para Windows",
          handoff: "Se abrirá la descarga oficial. Después debes ejecutar y completar el instalador de Windows; Code AI Profiles no instalará ni cerrará la aplicación por ti.",
          action: "Abrir descarga oficial",
        }
      : {
          label: "macOS",
          channel: "Descarga oficial para macOS",
          handoff: "Se abrirá la descarga oficial. Después debes abrir y completar el instalador de macOS; Code AI Profiles no reemplazará ni cerrará la aplicación por ti.",
          action: "Abrir descarga oficial",
        };

  return (
    <ModalFrame
      title={`Actualizar ${appName}`}
      subtitle={`Versión actual ${version ?? "no disponible"} · ${platformDetails.label}`}
      onClose={busy ? () => undefined : onClose}
      closeDisabled={busy}
    >
      <div className="original-update-summary">
        <span><RefreshIcon size={21} /></span>
        <div>
          <small>CANAL OFICIAL</small>
          <strong>{platformDetails.channel}</strong>
          <p>{platformDetails.handoff}</p>
        </div>
      </div>

      <div className="original-update-boundary">
        <HardDriveIcon size={19} />
        <div>
          <strong>Tus perfiles y sesiones no se tocan</strong>
          <p>Esta acción tampoco actualiza las instancias administradas. Solo entrega el proceso a la descarga o documentación oficial.</p>
        </div>
      </div>

      <div className="original-update-next-step">
        <SparklesIcon size={18} />
        <p>Cuando termines la instalación, vuelve a esta ventana. El escaneo al recuperar el foco detectará la nueva versión y entonces podrás usar <strong>Actualizar instancias</strong> para sincronizarlas.</p>
      </div>

      <div className="modal-actions original-update-actions">
        <button className="secondary-button" onClick={onClose} disabled={busy}>Cancelar</button>
        <button className="primary-action modal-primary" onClick={() => void onConfirm()} disabled={busy}>
          {busy
            ? <><RefreshIcon className="spin" size={17} /> Abriendo canal oficial…</>
            : <><RefreshIcon size={17} /> {platformDetails.action}</>}
        </button>
      </div>
    </ModalFrame>
  );
}

function ModalFrame({
  title,
  subtitle,
  onClose,
  closeDisabled = false,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  closeDisabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <div><h2 id="modal-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
          <button className="modal-close" onClick={onClose} disabled={closeDisabled} aria-label="Cerrar"><XIcon size={20} /></button>
        </div>
        {children}
      </section>
    </div>
  );
}

function InstanceEditor({
  instance,
  sourcePath,
  busy,
  onClose,
  onSave,
}: {
  instance: ManagedInstance | null;
  sourcePath: string | null;
  busy: boolean;
  onClose: () => void;
  onSave: (request: CreateInstanceRequest) => Promise<void>;
}) {
  const [name, setName] = useState(instance?.name ?? "");
  const [customSource, setCustomSource] = useState(sourcePath ?? "");
  const [advanced, setAdvanced] = useState(false);
  const isNew = !instance;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await onSave({
      name: name.trim(),
      sourcePath: isNew ? customSource.trim() || null : undefined,
    });
  };

  return (
    <ModalFrame
      title={isNew ? "Nueva instancia" : "Editar instancia"}
      subtitle={isNew ? "Un perfil local completamente independiente" : "Actualiza el nombre visible de este perfil"}
      onClose={busy ? () => undefined : onClose}
    >
      <form className="editor-form" onSubmit={(event) => void submit(event)}>
        <label className="form-field">
          <span>Nombre del perfil</span>
          <input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={64} required placeholder="Ej. Trabajo, Personal, Cliente A" />
        </label>

        {isNew && (
          <>
            <div className="isolation-note">
              <span className="note-icon"><HardDriveIcon size={20} /></span>
              <div>
                <strong>Copia aislada + perfil independiente</strong>
                <p>La primera creación puede tardar. macOS intenta usar una copia APFS eficiente, Windows crea una copia administrada y Linux reutiliza el binario instalado con un perfil aislado.</p>
              </div>
            </div>
            <button className="advanced-toggle" type="button" onClick={() => setAdvanced(!advanced)}>
              <ChevronIcon className={advanced ? "open" : ""} size={16} /> Opciones avanzadas
            </button>
            {advanced && (
              <label className="form-field advanced-field">
                <span>Ruta de la aplicación compatible</span>
                <input value={customSource} onChange={(event) => setCustomSource(event.target.value)} required placeholder="/Applications/Compatible App.app" />
              </label>
            )}
          </>
        )}

        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="primary-action modal-primary" type="submit" disabled={busy || !name.trim()}>
            {busy ? <><RefreshIcon className="spin" size={17} /> {isNew ? "Creando copia…" : "Guardando…"}</> : isNew ? <><PlusIcon size={17} /> Crear instancia</> : "Guardar cambios"}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}

function ApplicationUpdateDialog({
  instances,
  targetVersion,
  busy,
  progress,
  onClose,
  onConfirm,
}: {
  instances: ManagedInstance[];
  targetVersion: string;
  busy: boolean;
  progress: ApplicationUpdateProgress | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const runningInstances = instances.filter((instance) => instance.status === "running");
  const ready = runningInstances.length === 0;
  const statusLabel = (instance: ManagedInstance) => instance.status === "running"
    ? "Ejecutándose"
    : instance.status === "missing" ? "Se reparará" : "Detenido";

  return (
    <ModalFrame
      title="Actualizar instancias"
      subtitle={`Usar la versión ${targetVersion} desde la instalación original`}
      onClose={busy ? () => undefined : onClose}
    >
      <div className="app-update-summary">
        <span><RefreshIcon size={21} /></span>
        <div>
          <small>NUEVA VERSIÓN DETECTADA</small>
          <strong>Versión {targetVersion}</strong>
          <p>Se reemplazará únicamente la aplicación de cada instancia.</p>
        </div>
      </div>

      <div className="app-update-list" aria-label="Instancias por actualizar">
        {instances.map((instance) => (
          <div className="app-update-row" key={instance.id}>
            <span className="app-update-cloud"><CloudIcon size={17} /></span>
            <div>
              <strong>{instance.name}</strong>
              <small>{instance.sourceVersion ?? "sin versión"} <i>→</i> {targetVersion}</small>
            </div>
            <span className={`target-status status-${instance.status}`}><i />{statusLabel(instance)}</span>
          </div>
        ))}
      </div>

      {!ready && (
        <div className="transfer-requirement">
          <StopIcon size={18} />
          <span>
            Detén {runningInstances.map((instance) => `“${instance.name}”`).join(" y ")} antes de actualizar. La app no cerrará ninguna instancia automáticamente.
          </span>
        </div>
      )}

      <div className="update-profile-note">
        <HardDriveIcon size={18} />
        <p>Las cuentas, sesiones, preferencias y datos de los perfiles no se modifican. Si el reemplazo falla, se restaura automáticamente la aplicación anterior.</p>
      </div>

      <div className="modal-actions app-update-actions">
        <button className="secondary-button" onClick={onClose} disabled={busy}>Cancelar</button>
        <button className="primary-action modal-primary" onClick={() => void onConfirm()} disabled={busy || !ready}>
          {busy && progress
            ? <><RefreshIcon className="spin" size={17} /> Actualizando {progress.current} de {progress.total}…</>
            : <><RefreshIcon size={17} /> Actualizar {instances.length === 1 ? "instancia" : `${instances.length} instancias`}</>}
        </button>
      </div>
      {busy && progress && <span className="update-current-instance">Preparando {progress.instanceName}</span>}
    </ModalFrame>
  );
}

function SessionTransferDialog({
  source,
  session,
  instances,
  busy,
  onClose,
  onTransfer,
}: {
  source: SessionProfile;
  session: CodeSession;
  instances: SessionProfile[];
  busy: boolean;
  onClose: () => void;
  onTransfer: (targetId: string, mode: SessionTransferMode) => Promise<void>;
}) {
  const candidates = instances.filter((instance) => instance.id !== source.id);
  const preferredTarget = candidates.find((instance) => !instance.isOriginal && instance.status === "stopped")
    ?? candidates.find((instance) => instance.status === "stopped")
    ?? candidates[0];
  const [targetId, setTargetId] = useState(preferredTarget?.id ?? "");
  const [mode, setMode] = useState<SessionTransferMode>("move");
  const target = candidates.find((instance) => instance.id === targetId) ?? null;
  const registeredOrigin = session.transfer
    ? instances.find((instance) => instance.id === session.transfer?.originInstanceId)
    : source;
  const sourceStopped = source.status === "stopped";
  const targetStopped = target?.status === "stopped";
  const hasExistingCopy = target?.codeSessions.some((item) => item.id === session.id) ?? false;
  const ready = Boolean(target && sourceStopped && targetStopped);

  const statusLabel = (instance: SessionProfile) => instance.status === "stopped"
    ? "Detenido"
    : instance.status === "running" ? "Ejecutándose" : "No disponible";

  return (
    <ModalFrame
      title="Transferir sesión de Code"
      subtitle="Transferencia experimental con respaldo automático"
      onClose={busy ? () => undefined : onClose}
    >
      <div className="transfer-summary">
        <span className="transfer-session-icon"><CodeSessionIcon size={19} /></span>
        <div>
          <small>SESIÓN ACTUAL</small>
          <strong>{session.title}</strong>
          <span>
            En {source.name}
            {registeredOrigin && registeredOrigin.id !== source.id ? ` · origen: ${registeredOrigin.name}` : ""}
          </span>
        </div>
      </div>

      <div className="transfer-section">
        <span className="transfer-label">Qué deseas hacer</span>
        <div className="transfer-mode-grid" role="radiogroup" aria-label="Modo de transferencia">
          <button
            type="button"
            className={`transfer-mode-option ${mode === "move" ? "selected" : ""}`}
            onClick={() => setMode("move")}
            role="radio"
            aria-checked={mode === "move"}
          >
            <span className="target-radio"><i /></span>
            <span><strong>Mover</strong><small>Queda visible solo en el destino</small></span>
            <em>RECOMENDADO</em>
          </button>
          <button
            type="button"
            className={`transfer-mode-option ${mode === "copy" ? "selected" : ""}`}
            onClick={() => setMode("copy")}
            role="radio"
            aria-checked={mode === "copy"}
          >
            <span className="target-radio"><i /></span>
            <span><strong>Copiar</strong><small>Permanece visible en ambos perfiles</small></span>
          </button>
        </div>
      </div>

      {candidates.length ? (
        <div className="transfer-section">
          <span className="transfer-label">Perfil de destino</span>
          <div className="transfer-target-list" role="radiogroup" aria-label="Perfil de destino">
            {candidates.map((candidate) => {
              const existing = candidate.codeSessions.some((item) => item.id === session.id);
              return (
                <button
                  key={candidate.id}
                  type="button"
                  className={`transfer-target ${targetId === candidate.id ? "selected" : ""}`}
                  onClick={() => setTargetId(candidate.id)}
                  role="radio"
                  aria-checked={targetId === candidate.id}
                >
                  <span className="target-radio"><i /></span>
                  <span className="target-copy">
                    <strong>{candidate.name}</strong>
                    <small>
                      {existing
                        ? "Ya contiene esta sesión · su índice se actualizará"
                        : mode === "move" ? "La sesión se retirará del perfil actual" : "Se creará una copia vinculada"}
                    </small>
                  </span>
                  <span className={`target-status status-${candidate.status}`}><i />{statusLabel(candidate)}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="transfer-empty">Crea otro perfil para poder transferir esta sesión.</div>
      )}

      {!ready && candidates.length > 0 && (
        <div className="transfer-requirement">
          <StopIcon size={18} />
          <span>
            Detén {sourceStopped ? target?.name : targetStopped ? source.name : "ambos perfiles"} antes de transferir. La app no los cerrará automáticamente.
          </span>
        </div>
      )}

      <div className="transfer-warning">
        <AlertIcon size={18} />
        <div>
          <p>
            {mode === "move"
              ? "La sesión se retira del origen después de confirmar la copia en el destino. Se crea un respaldo y podrás devolverla a su origen desde el botón de desvincular."
              : "La sesión aparecerá en ambos perfiles, pero su transcript sigue siendo global y compartido. No la abras simultáneamente en los dos perfiles."}
          </p>
          {(session.publishedArtifactCount ?? 0) > 0 || session.artifactMonitor ? (
            <p className="artifact-transfer-note">
              Esta sesión registra {Math.max(session.publishedArtifactCount ?? 0, session.artifactMonitor?.artifactCount ?? 0)} artefacto(s).
              Se transferirá la conversación, no la propiedad remota ni sus monitores: en {target?.name ?? "el destino"} deberás publicar y activar la vigilancia de nuevo.
            </p>
          ) : (
            <p className="artifact-transfer-note">
              Los artefactos publicados y sus monitores pertenecen a cada perfil y no se reasignan durante la transferencia.
            </p>
          )}
        </div>
      </div>

      <div className="modal-actions transfer-actions">
        <button className="secondary-button" onClick={onClose} disabled={busy}>Cancelar</button>
        <button className="primary-action modal-primary" onClick={() => target && void onTransfer(target.id, mode)} disabled={busy || !ready}>
          {busy
            ? <><RefreshIcon className="spin" size={17} /> Transfiriendo y respaldando…</>
            : <><TransferIcon size={17} /> {
              mode === "move"
                ? hasExistingCopy ? "Mover y actualizar" : "Mover sesión"
                : hasExistingCopy ? "Actualizar copia" : "Copiar sesión"
            }</>}
        </button>
      </div>
    </ModalFrame>
  );
}

function ConfirmDialog({
  title,
  confirmLabel,
  busy,
  busyLabel = "Eliminando…",
  tone = "danger",
  onCancel,
  onConfirm,
  children,
}: {
  title: string;
  confirmLabel: string;
  busy: boolean;
  busyLabel?: string;
  tone?: "danger" | "neutral";
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  children: ReactNode;
}) {
  return (
    <ModalFrame title={title} onClose={busy ? () => undefined : onCancel}>
      <div className="confirm-content">
        <div className="confirm-warning"><AlertIcon size={23} /></div>
        <p>{children}</p>
      </div>
      <div className="modal-actions">
        <button className="secondary-button" onClick={onCancel} disabled={busy}>Cancelar</button>
        <button className={tone === "danger" ? "destructive-button" : "primary-action modal-primary"} onClick={() => void onConfirm()} disabled={busy}>
          {busy ? busyLabel : confirmLabel}
        </button>
      </div>
    </ModalFrame>
  );
}

export default App;
