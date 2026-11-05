export type InstanceStatus = "running" | "stopped" | "missing";
export const ORIGINAL_INSTANCE_ID = "__claude_original__";
export interface UsageStats {
  sessionPercent: number | null;
  weeklyPercent: number | null;
  capturedAt: number | null;
}

export interface UsageSnapshot {
  instanceId: string;
  usage: UsageStats;
}

export interface ArtifactMonitorSummary {
  monitorType: "artifact-comment-monitor" | string;
  state: string | null;
  artifactCount: number;
}

export interface ArtifactTransferOutcome {
  localCandidates: number;
  copied: number;
  registered: number;
  preservedForManualImport: number;
  remoteReferencesOmitted: number;
  monitorsOmitted: number;
  exportPath: string | null;
  warnings: string[];
}

export type SessionTransferMode = "copy" | "move";

export interface SessionTransferInfo {
  originInstanceId: string;
  mode: SessionTransferMode;
}

export interface CodeSession {
  id: string;
  title: string;
  model: string | null;
  effort: string | null;
  completedTurns: number;
  createdAt: number | null;
  lastActivityAt: number | null;
  isArchived: boolean;
  contextTokens?: number | null;
  contextWindowTokens?: number | null;
  contextPercent?: number | null;
  publishedArtifactCount?: number;
  artifactMonitor?: ArtifactMonitorSummary | null;
  transfer?: SessionTransferInfo | null;
}

export type SourceUpdateStatus = "current" | "available" | "unavailable" | "unknown" | "error";
export type SourceUpdateSource = "officialFeed" | "officialRelease" | "aptCache";

export interface SourceUpdateInfo {
  status: SourceUpdateStatus;
  latestVersion: string | null;
  checkedAt: number | null;
  stale: boolean;
  source: SourceUpdateSource | null;
  /** Motivo por el que no se pudo confirmar una versión nueva (p. ej. la publicación y el feed no coinciden). */
  warning: string | null;
}

export interface ManagedInstance {
  id: string;
  name: string;
  sourceVersion: string | null;
  appPath: string;
  profilePath: string;
  createdAt: string;
  lastLaunchedAt: string | null;
  pid: number | null;
  processIdentity?: ManagedProcessIdentity | null;
  launchGeneration?: number;
  customIcon?: CustomIcon | null;
  status: InstanceStatus;
  usage: UsageStats | null;
  codeSessions: CodeSession[];
}

export interface ManagedProcessIdentity {
  rootPid: number;
  processGroupId: number | null;
  startTime: number | null;
  fingerprint: string;
  profileArgument: string;
}

export type CustomIconSystemIssue = "appManagement";

export interface CustomIcon {
  path: string;
  revision: number;
  /** true = el icono está puesto en la copia y la comprobación equivalente pasó (solo macOS). */
  systemApplied: boolean;
  /** Texto para la persona. */
  systemMessage: string;
  /** Solo macOS; null salvo bloqueo de «Gestión de apps». */
  systemIssue?: CustomIconSystemIssue | null;
  /** Solo macOS, interno: qué distintivo lleva el icono del Dock. */
  dockBadge?: string | null;
}

export interface SessionProfile {
  id: string;
  name: string;
  status: InstanceStatus;
  codeSessions: CodeSession[];
  isOriginal?: boolean;
}

/** El icono de la aplicación original, ya recortado, para el distintivo de las instancias (HU-0028). */
export interface ProviderBadge {
  /** Ruta absoluta del PNG en caché; cambia cuando cambia el icono de la original. */
  path: string;
}

/** De dónde sale la carpeta de datos efectiva de la original (HU-0029). */
export type OriginalProfileOrigin = "chosen" | "detected" | "none";

export interface SystemInfo {
  appVersion: string;
  platform: "macos" | "windows" | "linux" | "unknown";
  sourcePath: string | null;
  sourceName: string | null;
  /** null si la original no está o su icono no se pudo leer. */
  providerBadge: ProviderBadge | null;
  sourceVersion: string | null;
  sourceUpdate: SourceUpdateInfo;
  versionTopology: VersionTopology;
  /** La carpeta de datos efectiva de la original: la elegida si sigue valiendo, si no la detectada (HU-0029). */
  originalProfilePath: string | null;
  originalProfileOrigin: OriginalProfileOrigin;
  /** La carpeta efectiva tiene `claude-code-sessions/`. */
  originalProfileHasSessions: boolean;
  /** Hay una carpeta elegida guardada que ya no vale; se usa la detectada (D-5). */
  originalProfileChosenMissing: boolean;
  originalStatus: InstanceStatus;
  originalCodeSessions: CodeSession[];
  freeBytes: number | null;
  managedBytes: number;
}

export type VersionSourceKind = "original" | "managed";

export interface VersionSource {
  kind: VersionSourceKind;
  instanceId: string | null;
  name: string;
}

export interface VersionTopology {
  latestInstalledVersion: string | null;
  latestSource: VersionSource | null;
  staleInstanceIds: string[];
  originalBehind: boolean;
  canSynchronizeManaged: boolean;
  reason: string | null;
}

export type OriginalApplicationUpdateAction = "download" | "instructions";

export interface OriginalApplicationUpdateResult {
  action: OriginalApplicationUpdateAction;
  message: string;
}

export interface DashboardState {
  instances: ManagedInstance[];
  system: SystemInfo;
}

export interface CreateInstanceRequest {
  name: string;
  sourcePath?: string | null;
}

export interface UpdateInstanceRequest {
  id: string;
  name: string;
}

export interface CopyCodeSessionRequest {
  sourceInstanceId: string;
  targetInstanceId: string;
  sessionId: string;
  mode: SessionTransferMode;
  includeLocalArtifacts?: boolean;
}

export interface SessionTransferResult {
  dashboard: DashboardState;
  artifacts: ArtifactTransferOutcome;
}

export interface SynchronizeManagedApplicationsRequest {
  source: VersionSource;
  targetInstanceIds: string[];
}

export type SynchronizationStatus = "updated" | "skipped" | "failed";

export interface SynchronizationItemResult {
  instanceId: string;
  status: SynchronizationStatus;
  fromVersion: string | null;
  toVersion: string | null;
  message: string;
}

export interface SynchronizeManagedApplicationsResult {
  dashboard: DashboardState;
  results: SynchronizationItemResult[];
}

export interface UnlinkCodeSessionRequest {
  instanceId: string;
  sessionId: string;
}

export interface InstallOriginalUpdateRequest {
  expectedVersion: string;
}

export type OriginalInstallPhase = "preparing" | "downloading" | "verifying" | "installing" | "synchronizing";

export interface OriginalInstallProgress {
  phase: OriginalInstallPhase;
  targetVersion: string | null;
  receivedBytes: number;
  totalBytes: number;
  cancellable: boolean;
}

export type OriginalInstallStatus = "installed" | "cancelled";

export interface OriginalInstallResult {
  status: OriginalInstallStatus;
  previousVersion: string | null;
  installedVersion: string | null;
  synchronization: SynchronizationItemResult[];
  pendingInstanceIds: string[];
  dashboard: DashboardState;
}

/** Panel de Ajustes del Sistema que Code AI Profiles sabe abrir (solo macOS). */
export type SystemSettingsPanel = "appManagement" | "filesAndFolders";

export interface AccountFacts {
  /** Solo macOS: la cuenta pertenece al grupo admin. null fuera de macOS o si no se pudo saber. */
  admin: boolean | null;
}

/* ── Proyectos anclados (HU-0023) ─────────────────────────────────────────── */

export type ProjectStatus =
  | "v4" | "notV4" | "noConfig" | "configBroken" | "notFound" | "notDirectory" | "permissionDenied" | "forbidden";
export type ProjectProtectedLocation = "desktop" | "documents" | "downloads" | "icloud" | "external";
export type ProjectHistoryState = "waiting" | "inProgress" | "done" | "discarded" | "unknown";
export type ProjectRepoStatus = "ok" | "missing" | "outside" | "forbidden" | "unreadable";
export type ProjectGitStatus = "ok" | "none" | "unsupported" | "unreadable";
export type ProjectWarningScope = "config" | "history" | "metrics" | "timeline" | "repo" | "manifest" | "git" | "limit";
/** Lo que le falta a una historia terminada (HU-0025): «Sin tiempo» o «Sin métricas». No es un aviso. */
export type ProjectDataGap = "noTime" | "noMetrics";

export interface TokenBreakdown { input: number; output: number; cacheWrite: number; cacheRead: number; total: number }
export interface ProjectWarning { scope: ProjectWarningScope; target: string | null; message: string }
export interface ProjectCandidate {
  path: string; displayPath: string; status: ProjectStatus; message: string | null;
  configVersion: number | null; name: string | null; profile: string | null; phase: string | null;
  historyCount: number | null; repoCount: number | null; alreadyPinnedId: string | null;
}
export interface ProjectGit {
  status: ProjectGitStatus; branch: string | null; detached: boolean; shortSha: string | null; movedAt: string | null;
}
export interface ProjectRepo {
  name: string; path: string; kind: string | null; status: ProjectRepoStatus; manifests: string[]; git: ProjectGit | null;
}
export interface ProjectTechnology { name: string; version: string | null; source: "pack" | "packageManager" | "manifest"; repo: string | null }
export interface ProjectHistory {
  id: string; folder: string; title: string; state: ProjectHistoryState; phase: string | null; area: string | null;
  priority: string | null; created: string | null; minutes: number | null; tokens: TokenBreakdown | null;
  countsInTotals: boolean;
  /** Solo en terminadas; `noTime` y `noMetrics` se excluyen entre sí. */
  dataGaps: ProjectDataGap[];
}
export interface ProjectRoleUsage { role: string; tokens: TokenBreakdown; approximate: boolean }
export interface ProjectCounts { total: number; waiting: number; inProgress: number; done: number; discarded: number; unknown: number }
export interface ProjectTotals {
  histories: number; minutes: number; tokens: TokenBreakdown; byRole: ProjectRoleUsage[];
  /** Las que suman en los totales y tienen minutos (divisor de «Tiempo en fases»). */
  timedHistories: number;
}
export interface ProjectInfo {
  name: string; slug: string | null; summary: string | null; profile: string | null; phase: string | null;
  approver: string | null; packageManager: string | null; packs: string[]; repos: ProjectRepo[];
  technologies: ProjectTechnology[]; histories: ProjectHistory[]; counts: ProjectCounts;
  firstCreated: string | null; lastActivity: string | null; spanDays: number | null; totals: ProjectTotals;
}
/** Icono elegido por la persona (HU-0027): la copia normalizada en `<app_data>/project-icons/<id>.png`. */
export interface ProjectIcon { path: string; revision: number }
export interface ProjectSummary {
  id: string; path: string; displayPath: string; lastName: string | null; pinnedAt: string;
  lastReadAt: string | null; readAt: string; status: ProjectStatus; message: string | null;
  protectedLocation: ProjectProtectedLocation | null; info: ProjectInfo | null; warnings: ProjectWarning[];
  /** También en un proyecto roto: ocultarlo es cosa de la interfaz. */
  icon: ProjectIcon | null;
}
export interface ProjectsState { projects: ProjectSummary[]; readAt: string }

/* ── Lector de historias (HU-0025) ────────────────────────────────────────── */

export type ProjectDocumentKind = "hu" | "architecture" | "verification" | "timeline";
export type ProjectDocumentStatus = "ok" | "unreadable";
export interface ProjectDocument {
  kind: ProjectDocumentKind;
  /** Nombre fijo del archivo (`hu.md`). */
  file: string;
  /** Relativa a la carpeta del proyecto, con `/` (`hu/<carpeta>/hu.md`). */
  path: string;
  status: ProjectDocumentStatus;
  /** El Markdown completo, solo si `status` es `ok`. */
  content: string | null;
  /** Qué pasó, solo si `status` es `unreadable`. */
  message: string | null;
}
/** Los `.md` de una historia en orden hu → arquitectura → verificación → seguimiento, solo los que existen. */
export interface ProjectHistoryDocuments { folder: string; documents: ProjectDocument[]; readAt: string }
