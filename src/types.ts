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

export type SourceUpdateStatus = "current" | "available" | "unavailable";
export type SourceUpdateSource = "officialFeed" | "aptCache";

export interface SourceUpdateInfo {
  status: SourceUpdateStatus;
  latestVersion: string | null;
  checkedAt: number | null;
  stale: boolean;
  source: SourceUpdateSource | null;
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
  status: InstanceStatus;
  usage: UsageStats | null;
  codeSessions: CodeSession[];
}

export interface SessionProfile {
  id: string;
  name: string;
  status: InstanceStatus;
  codeSessions: CodeSession[];
  isOriginal?: boolean;
}

export interface SystemInfo {
  platform: "macos" | "windows" | "linux" | "unknown";
  sourcePath: string | null;
  sourceName: string | null;
  sourceVersion: string | null;
  sourceUpdate: SourceUpdateInfo;
  originalProfilePath: string | null;
  originalStatus: InstanceStatus;
  originalCodeSessions: CodeSession[];
  freeBytes: number | null;
  managedBytes: number;
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
}

export interface UnlinkCodeSessionRequest {
  instanceId: string;
  sessionId: string;
}
