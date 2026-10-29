import { Channel, invoke } from "@tauri-apps/api/core";
import packageMetadata from "../../package.json";
import type {
  CodeSession,
  ManagedInstance,
  CopyCodeSessionRequest,
  CreateInstanceRequest,
  DashboardState,
  InstallOriginalUpdateRequest,
  InstanceStatus,
  OriginalApplicationUpdateResult,
  OriginalInstallProgress,
  OriginalInstallResult,
  SynchronizationItemResult,
  SessionTransferResult,
  SourceUpdateInfo,
  SynchronizeManagedApplicationsRequest,
  SynchronizeManagedApplicationsResult,
  UnlinkCodeSessionRequest,
  UpdateInstanceRequest,
  UsageSnapshot,
} from "../types";
import { ORIGINAL_INSTANCE_ID } from "../types";

const isTauri = () => Boolean(window.__TAURI_INTERNALS__);

const now = new Date().toISOString();
const latestMockVersion = "1.22300.0";
const mockAvailableVersion = "1.22400.0";
const mockSourceName = "Claude Desktop";
const mockPackageBytes = 378_072_300;
let mockSourceVersion = latestMockVersion;
let mockInstall: { cancelled: boolean; cancellable: boolean } | null = null;
let mockOriginalStatus: InstanceStatus = "stopped";
let mockOriginalSessions: CodeSession[] = [
  { id: "local-original-1", title: "Qleo project context and corrections", model: "opus-4-8", effort: "high", completedTurns: 101, createdAt: Date.now() - 2_592_000_000, lastActivityAt: Date.now() - 1_800_000, isArchived: false, contextTokens: 45_521, contextWindowTokens: 1_000_000, contextPercent: 4.5521, publishedArtifactCount: 3, artifactMonitor: { monitorType: "artifact-comment-monitor", state: "armed", artifactCount: 3 } },
  { id: "local-original-2", title: "Moovimi Manager", model: "opus-4-8", effort: "high", completedTurns: 64, createdAt: Date.now() - 1_209_600_000, lastActivityAt: Date.now() - 86_400_000, isArchived: false, contextTokens: 647_000, contextWindowTokens: 1_000_000, contextPercent: 64.7 },
  { id: "local-original-3", title: "Njord REST API", model: "sonnet-4-5", effort: "medium", completedTurns: 32, createdAt: Date.now() - 604_800_000, lastActivityAt: Date.now() - 172_800_000, isArchived: false, contextTokens: 167_200, contextWindowTokens: 200_000, contextPercent: 83.6 },
  { id: "local-original-4", title: "Rutas de calendario no funcionan", model: "modelo-privado-acme", effort: null, completedTurns: 5, createdAt: Date.now() - 259_200_000, lastActivityAt: Date.now() - 216_000_000, isArchived: true, contextTokens: 32_400, contextWindowTokens: null, contextPercent: null },
];
let mockInstances: ManagedInstance[] = [
  {
    id: "demo-work",
    name: "Work Profile",
    sourceVersion: "1.22209.0",
    appPath: "/Applications/Work Profile.app",
    profilePath: "~/Library/Application Support/Code AI Profiles/demo-work",
    createdAt: now,
    lastLaunchedAt: now,
    pid: 4021,
    status: "running",
    usage: { sessionPercent: 85, weeklyPercent: 54, capturedAt: Date.now() },
    codeSessions: [
      { id: "work-1", title: "Refactor del dashboard de clientes", model: "opus-4-8", effort: "high", completedTurns: 18, createdAt: Date.now() - 86_400_000, lastActivityAt: Date.now() - 540_000, isArchived: false, contextTokens: 588_000, contextWindowTokens: 1_000_000, contextPercent: 58.8 },
      { id: "work-2", title: "Auditoría del pipeline de despliegue", model: "sonnet-4-6", effort: "medium", completedTurns: 9, createdAt: Date.now() - 172_800_000, lastActivityAt: Date.now() - 7_200_000, isArchived: false, contextTokens: 720_000, contextWindowTokens: 1_000_000, contextPercent: 72 },
      { id: "work-3", title: "Documentación de la API pública", model: "sonnet", effort: null, completedTurns: 6, createdAt: Date.now() - 604_800_000, lastActivityAt: Date.now() - 345_600_000, isArchived: true },
    ],
  },
  {
    id: "demo-personal",
    name: "Personal Dev",
    sourceVersion: "1.22209.0",
    appPath: "~/Applications/Personal Dev.app",
    profilePath: "~/Library/Application Support/Code AI Profiles/demo-personal",
    createdAt: now,
    lastLaunchedAt: null,
    pid: null,
    status: "stopped",
    usage: { sessionPercent: 42, weeklyPercent: 21, capturedAt: Date.now() },
    codeSessions: [
      { id: "personal-1", title: "Prototipo de aplicación personal", model: "sonnet-4-5", effort: "medium", completedTurns: 12, createdAt: Date.now() - 259_200_000, lastActivityAt: Date.now() - 43_200_000, isArchived: false, contextTokens: 175_000, contextWindowTokens: 200_000, contextPercent: 87.5 },
    ],
  },
  {
    id: "demo-lab",
    name: "Experimental Lab",
    sourceVersion: latestMockVersion,
    appPath: "~/Applications/Experimental Lab.app",
    profilePath: "~/Library/Application Support/Code AI Profiles/demo-lab",
    createdAt: now,
    lastLaunchedAt: null,
    pid: null,
    status: "stopped",
    usage: null,
    codeSessions: [],
  },
];

const mockOriginalInstalled = () => mockSourceVersion === mockAvailableVersion;
const mockLatestVersion = () => (mockOriginalInstalled() ? mockAvailableVersion : latestMockVersion);

const mockTopology = (): DashboardState["system"]["versionTopology"] => {
  const latest = mockLatestVersion();
  const staleInstanceIds = mockInstances
    .filter((instance) => instance.sourceVersion !== latest)
    .map((instance) => instance.id);
  return {
    latestInstalledVersion: latest,
    latestSource: mockOriginalInstalled()
      ? { kind: "original", instanceId: null, name: mockSourceName }
      : { kind: "managed", instanceId: "demo-lab", name: "Experimental Lab" },
    staleInstanceIds,
    originalBehind: mockSourceVersion !== latest,
    canSynchronizeManaged: staleInstanceIds.length > 0,
    reason: null,
  };
};

const mockState = (): DashboardState => ({
  instances: mockInstances,
  system: {
    appVersion: packageMetadata.version,
    platform: "macos",
    sourcePath: "/Applications/Claude.app",
    sourceName: mockSourceName,
    sourceVersion: mockSourceVersion,
    sourceUpdate: {
      status: mockOriginalInstalled() ? "current" : "available",
      latestVersion: mockAvailableVersion,
      checkedAt: Date.now(),
      stale: false,
      source: "officialFeed",
    },
    versionTopology: mockTopology(),
    originalProfilePath: "~/Library/Application Support/Claude",
    originalStatus: mockOriginalStatus,
    originalCodeSessions: mockOriginalSessions,
    freeBytes: 452_800_000_000,
    managedBytes: 2_140_000_000,
  },
});

const mockWait = (milliseconds: number) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

const mockProfiles = () => [
  {
    id: ORIGINAL_INSTANCE_ID,
    name: mockSourceName,
    status: mockOriginalStatus,
    codeSessions: mockOriginalSessions,
  },
  ...mockInstances,
];

function updateMockProfileSessions(
  id: string,
  update: (sessions: CodeSession[]) => CodeSession[],
) {
  if (id === ORIGINAL_INSTANCE_ID) {
    mockOriginalSessions = update(mockOriginalSessions);
    return;
  }
  mockInstances = mockInstances.map((instance) =>
    instance.id === id ? { ...instance, codeSessions: update(instance.codeSessions) } : instance,
  );
}

async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) throw new Error("Tauri bridge unavailable");
  return invoke<T>(command, args);
}

export const bridge = {
  isDesktop: isTauri,

  async dashboard(): Promise<DashboardState> {
    return isTauri() ? call("get_dashboard_state") : mockState();
  },

  async scan(): Promise<DashboardState> {
    return isTauri() ? call("scan_system") : mockState();
  },

  async refreshVersions(): Promise<DashboardState> {
    return isTauri() ? call("refresh_versions") : mockState();
  },

  async create(request: CreateInstanceRequest): Promise<DashboardState> {
    if (isTauri()) return call("create_instance", { request });
    mockInstances = [
      ...mockInstances,
      {
        id: crypto.randomUUID(),
        name: request.name,
        sourceVersion: mockLatestVersion(),
        appPath: `~/Library/Application Support/Code AI Profiles/${request.name}/${request.name}.app`,
        profilePath: `~/Library/Application Support/Code AI Profiles/${request.name}/profile`,
        createdAt: new Date().toISOString(),
        lastLaunchedAt: null,
        pid: null,
        status: "stopped",
        usage: null,
        codeSessions: [],
      },
    ];
    return mockState();
  },

  async update(request: UpdateInstanceRequest): Promise<DashboardState> {
    if (isTauri()) return call("update_instance", { request });
    mockInstances = mockInstances.map((item) =>
      item.id === request.id
        ? { ...item, name: request.name }
        : item,
    );
    return mockState();
  },

  async updateApplication(id: string): Promise<DashboardState> {
    if (isTauri()) return call("update_instance_application", { id });
    const instance = mockInstances.find((item) => item.id === id);
    if (!instance) throw new Error("La instancia ya no existe.");
    if (instance.status === "running") {
      throw new Error(`Detén “${instance.name}” antes de actualizar su aplicación.`);
    }
    await new Promise((resolve) => window.setTimeout(resolve, 180));
    mockInstances = mockInstances.map((item) =>
      item.id === id ? { ...item, sourceVersion: mockLatestVersion(), status: "stopped", pid: null } : item,
    );
    return mockState();
  },

  async synchronizeApplications(
    request: SynchronizeManagedApplicationsRequest,
  ): Promise<SynchronizeManagedApplicationsResult> {
    if (isTauri()) return call("synchronize_managed_applications", { request });
    const results = request.targetInstanceIds.map((instanceId) => {
      const instance = mockInstances.find((item) => item.id === instanceId);
      if (!instance) {
        return { instanceId, status: "failed" as const, fromVersion: null, toVersion: mockLatestVersion(), message: "La instancia ya no existe." };
      }
      if (instance.status !== "stopped") {
        return { instanceId, status: "failed" as const, fromVersion: instance.sourceVersion, toVersion: mockLatestVersion(), message: "La instancia debe estar detenida." };
      }
      mockInstances = mockInstances.map((item) => item.id === instanceId ? { ...item, sourceVersion: mockLatestVersion() } : item);
      return { instanceId, status: "updated" as const, fromVersion: instance.sourceVersion, toVersion: mockLatestVersion(), message: "Aplicación sincronizada y perfil preservado." };
    });
    return { dashboard: mockState(), results };
  },

  async updateOriginalApplication(): Promise<OriginalApplicationUpdateResult> {
    if (isTauri()) return call("update_original_application");
    if (mockInstall) throw new Error("Hay una actualización de la original en curso. Espera a que termine.");
    await new Promise((resolve) => window.setTimeout(resolve, 320));
    return {
      action: "instructions",
      message: "Modo de demostración: se simuló abrir únicamente la aplicación original. En macOS usa Claude > Check for Updates; no se abrió ninguna aplicación real.",
    };
  },

  async installOriginalUpdate(
    request: InstallOriginalUpdateRequest,
    onProgress: (progress: OriginalInstallProgress) => void,
  ): Promise<OriginalInstallResult> {
    if (isTauri()) {
      const channel = new Channel<OriginalInstallProgress>();
      channel.onmessage = onProgress;
      return call("install_original_update", { request, onProgress: channel });
    }
    if (mockInstall) throw new Error("Ya hay una actualización de la original en curso.");
    if (mockState().system.originalStatus === "running") {
      throw new Error(`Cierra ${mockSourceName} para actualizarla. La original no cambió.`);
    }
    if (mockOriginalInstalled()) {
      throw new Error(`${mockSourceName} ya está al día. La original no cambió.`);
    }
    if (request.expectedVersion !== mockAvailableVersion) {
      throw new Error("El feed oficial ya anuncia otra versión. Vuelve a comprobar. La original no cambió.");
    }
    const flight = { cancelled: false, cancellable: true };
    mockInstall = flight;
    const previousVersion = mockSourceVersion;
    const report = (progress: Omit<OriginalInstallProgress, "targetVersion" | "totalBytes">) =>
      onProgress({ ...progress, targetVersion: mockAvailableVersion, totalBytes: mockPackageBytes });
    const cancelled = (): OriginalInstallResult => ({
      status: "cancelled",
      previousVersion,
      installedVersion: null,
      synchronization: [],
      pendingInstanceIds: [],
      dashboard: mockState(),
    });
    try {
      onProgress({ phase: "preparing", targetVersion: null, receivedBytes: 0, totalBytes: 0, cancellable: true });
      await mockWait(300);
      if (flight.cancelled) return cancelled();
      const steps = 12;
      for (let step = 0; step <= steps; step += 1) {
        report({ phase: "downloading", receivedBytes: Math.round((mockPackageBytes * step) / steps), cancellable: true });
        await mockWait(250);
        if (flight.cancelled) return cancelled();
      }
      report({ phase: "verifying", receivedBytes: 0, cancellable: true });
      await mockWait(700);
      if (flight.cancelled) return cancelled();
      flight.cancellable = false;
      report({ phase: "installing", receivedBytes: 0, cancellable: false });
      await mockWait(600);
      mockSourceVersion = mockAvailableVersion;
      report({ phase: "synchronizing", receivedBytes: 0, cancellable: false });
      await mockWait(500);
      const synchronization: SynchronizationItemResult[] = [];
      const pendingInstanceIds: string[] = [];
      mockInstances = mockInstances.map((instance) => {
        if (instance.sourceVersion === mockAvailableVersion) return instance;
        if (instance.status !== "stopped") {
          pendingInstanceIds.push(instance.id);
          return instance;
        }
        synchronization.push({
          instanceId: instance.id,
          status: "updated",
          fromVersion: instance.sourceVersion,
          toVersion: mockAvailableVersion,
          message: "Aplicación sincronizada y perfil preservado.",
        });
        return { ...instance, sourceVersion: mockAvailableVersion };
      });
      return {
        status: "installed",
        previousVersion,
        installedVersion: mockAvailableVersion,
        synchronization,
        pendingInstanceIds,
        dashboard: mockState(),
      };
    } finally {
      mockInstall = null;
    }
  },

  async cancelOriginalUpdate(): Promise<boolean> {
    if (isTauri()) return call("cancel_original_update");
    if (!mockInstall || !mockInstall.cancellable) return false;
    mockInstall.cancelled = true;
    return true;
  },

  async checkSourceUpdate(): Promise<SourceUpdateInfo> {
    if (isTauri()) return call("check_source_update");
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    return {
      status: mockOriginalInstalled() ? "current" : "available",
      latestVersion: mockAvailableVersion,
      checkedAt: Date.now(),
      stale: false,
      source: "officialFeed",
    };
  },

  async liveUsage(instanceIds: string[]): Promise<UsageSnapshot[]> {
    if (isTauri()) return call("get_live_usage", { instanceIds });
    const capturedAt = Date.now();
    mockInstances = mockInstances.map((instance) => {
      if (!instanceIds.includes(instance.id) || !instance.usage) return instance;
      return {
        ...instance,
        usage: {
          ...instance.usage,
          sessionPercent: Math.min(100, (instance.usage.sessionPercent ?? 0) + 0.2),
          capturedAt,
        },
      };
    });
    return mockInstances
      .filter((instance) => instanceIds.includes(instance.id) && instance.usage)
      .map((instance) => ({ instanceId: instance.id, usage: instance.usage! }));
  },

  async copySession(request: CopyCodeSessionRequest): Promise<SessionTransferResult> {
    if (isTauri()) return call("copy_code_session", { request });
    const profiles = mockProfiles();
    const source = profiles.find((item) => item.id === request.sourceInstanceId);
    const target = profiles.find((item) => item.id === request.targetInstanceId);
    if (!source || !target) throw new Error("El perfil de origen o destino ya no existe.");
    if (source.status !== "stopped" || target.status !== "stopped") {
      throw new Error(`Detén “${source.name}” y “${target.name}” antes de transferir la sesión.`);
    }
    const session = source.codeSessions.find((item) => item.id === request.sessionId);
    if (!session) throw new Error("La sesión ya no existe dentro del perfil de origen.");
    const originInstanceId = session.transfer?.originInstanceId ?? source.id;
    const sourceWasMoved = session.transfer?.mode === "move";
    const targetTransfer = target.id === originInstanceId
      ? undefined
      : {
          originInstanceId,
          mode: request.mode === "move" && (source.id === originInstanceId || sourceWasMoved) ? "move" as const : "copy" as const,
        };
    if (request.mode === "move") {
      updateMockProfileSessions(source.id, (sessions) => sessions.filter((existing) => existing.id !== session.id));
    }
    const existingTarget = target.codeSessions.find((existing) => existing.id === session.id);
    const transferred = {
      ...session,
      publishedArtifactCount: existingTarget?.publishedArtifactCount ?? 0,
      transfer: targetTransfer,
    };
    updateMockProfileSessions(target.id, (sessions) => {
      const alreadyExists = sessions.some((existing) => existing.id === session.id);
      return alreadyExists
        ? sessions.map((existing) => existing.id === session.id ? transferred : existing)
        : [transferred, ...sessions];
    });
    return {
      dashboard: mockState(),
      artifacts: {
        localCandidates: 0,
        copied: 0,
        registered: 0,
        preservedForManualImport: 0,
        remoteReferencesOmitted: session.publishedArtifactCount ?? 0,
        monitorsOmitted: session.artifactMonitor?.artifactCount ?? 0,
        exportPath: null,
        warnings: ["Los artefactos remotos deben publicarse de nuevo en el destino."],
      },
    };
  },

  async setInstanceIcon(id: string, bytes: Uint8Array): Promise<DashboardState> {
    if (isTauri()) return call("set_instance_icon", { request: { id, bytes: Array.from(bytes) } });
    mockInstances = mockInstances.map((item) => item.id === id ? {
      ...item,
      customIcon: {
        path: `mock://${id}/icon.png`,
        revision: (item.customIcon?.revision ?? 0) + 1,
        systemApplied: false,
        systemMessage: "Modo de demostración: icono visible dentro de Code AI Profiles.",
        systemIssue: null,
      },
    } : item);
    return mockState();
  },

  async reapplyInstanceIcon(id: string): Promise<DashboardState> {
    if (isTauri()) return call("reapply_instance_icon", { id });
    mockInstances = mockInstances.map((item) => item.id === id && item.customIcon ? {
      ...item,
      customIcon: {
        ...item.customIcon,
        systemApplied: true,
        systemMessage: "Modo de demostración: icono reaplicado a la copia.",
        systemIssue: null,
      },
    } : item);
    return mockState();
  },

  async clearInstanceIcon(id: string): Promise<DashboardState> {
    if (isTauri()) return call("clear_instance_icon", { id });
    mockInstances = mockInstances.map((item) => item.id === id ? { ...item, customIcon: null } : item);
    return mockState();
  },

  async unlinkSession(request: UnlinkCodeSessionRequest): Promise<DashboardState> {
    if (isTauri()) return call("unlink_code_session", { request });
    const profiles = mockProfiles();
    const linked = profiles.find((item) => item.id === request.instanceId);
    const session = linked?.codeSessions.find((item) => item.id === request.sessionId);
    if (!linked || !session?.transfer) throw new Error("Esta sesión no está registrada como vinculada.");
    if (linked.status !== "stopped") throw new Error(`Detén “${linked.name}” antes de desvincular la sesión.`);

    const origin = profiles.find((item) => item.id === session.transfer!.originInstanceId);
    if (session.transfer.mode === "move" && (!origin || origin.status !== "stopped")) {
      throw new Error("Detén también la instancia de origen antes de devolver la sesión.");
    }
    updateMockProfileSessions(linked.id, (sessions) => sessions.filter((existing) => existing.id !== session.id));
    if (session.transfer.mode === "move" && origin) {
      const returned = { ...session, transfer: undefined };
      updateMockProfileSessions(origin.id, (sessions) => {
        const alreadyExists = sessions.some((existing) => existing.id === session.id);
        return alreadyExists
          ? sessions.map((existing) => existing.id === session.id ? returned : existing)
          : [returned, ...sessions];
      });
    }
    return mockState();
  },

  async launch(id: string): Promise<DashboardState> {
    if (isTauri()) return call("launch_instance", { id });
    mockInstances = mockInstances.map((item) =>
      item.id === id ? { ...item, status: "running", pid: 5000 + Math.floor(Math.random() * 5000) } : item,
    );
    return mockState();
  },

  async stop(id: string): Promise<DashboardState> {
    if (isTauri()) return call("stop_instance", { id });
    mockInstances = mockInstances.map((item) =>
      item.id === id ? { ...item, status: "stopped", pid: null } : item,
    );
    return mockState();
  },

  async remove(id: string): Promise<DashboardState> {
    if (isTauri()) return call("delete_instance", { id });
    mockInstances = mockInstances.filter((item) => item.id !== id);
    return mockState();
  },

  async openFolder(id: string): Promise<void> {
    if (isTauri()) await call("open_instance_folder", { id });
  },
};
