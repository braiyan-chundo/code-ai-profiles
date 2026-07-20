import { invoke } from "@tauri-apps/api/core";
import type {
  CodeSession,
  ManagedInstance,
  CopyCodeSessionRequest,
  CreateInstanceRequest,
  DashboardState,
  InstanceStatus,
  UnlinkCodeSessionRequest,
  UpdateInstanceRequest,
} from "../types";
import { ORIGINAL_INSTANCE_ID } from "../types";

const isTauri = () => Boolean(window.__TAURI_INTERNALS__);

const now = new Date().toISOString();
const latestMockVersion = "1.22300.0";
let mockOriginalStatus: InstanceStatus = "stopped";
let mockOriginalSessions: CodeSession[] = [
  { id: "local-original-1", title: "Qleo project context and corrections", model: "opus-4-8", effort: "high", completedTurns: 101, createdAt: Date.now() - 2_592_000_000, lastActivityAt: Date.now() - 1_800_000, isArchived: false, contextTokens: 45_521, contextWindowTokens: 1_000_000, contextPercent: 4.5521 },
  { id: "local-original-2", title: "Moovimi Manager", model: "opus-4-8", effort: "high", completedTurns: 64, createdAt: Date.now() - 1_209_600_000, lastActivityAt: Date.now() - 86_400_000, isArchived: false, contextTokens: 647_000, contextWindowTokens: 1_000_000, contextPercent: 64.7 },
  { id: "local-original-3", title: "Njord REST API", model: "opus-4-8", effort: "medium", completedTurns: 32, createdAt: Date.now() - 604_800_000, lastActivityAt: Date.now() - 172_800_000, isArchived: false, contextTokens: 836_000, contextWindowTokens: 1_000_000, contextPercent: 83.6 },
  { id: "local-original-4", title: "Rutas de calendario no funcionan", model: "opus-4-8", effort: null, completedTurns: 5, createdAt: Date.now() - 259_200_000, lastActivityAt: Date.now() - 216_000_000, isArchived: true },
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
      { id: "personal-1", title: "Prototipo de aplicación personal", model: "sonnet-4-6", effort: "medium", completedTurns: 12, createdAt: Date.now() - 259_200_000, lastActivityAt: Date.now() - 43_200_000, isArchived: false, contextTokens: 875_000, contextWindowTokens: 1_000_000, contextPercent: 87.5 },
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

const mockState = (): DashboardState => ({
  instances: mockInstances,
  system: {
    platform: "macos",
    sourcePath: "/Applications/Compatible App.app",
    sourceVersion: latestMockVersion,
    originalProfilePath: "~/Library/Application Support/Compatible App",
    originalStatus: mockOriginalStatus,
    originalCodeSessions: mockOriginalSessions,
    freeBytes: 452_800_000_000,
    managedBytes: 2_140_000_000,
  },
});

const mockProfiles = () => [
  {
    id: ORIGINAL_INSTANCE_ID,
    name: "Aplicación original",
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

  async create(request: CreateInstanceRequest): Promise<DashboardState> {
    if (isTauri()) return call("create_instance", { request });
    mockInstances = [
      ...mockInstances,
      {
        id: crypto.randomUUID(),
        name: request.name,
        sourceVersion: latestMockVersion,
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
      item.id === id ? { ...item, sourceVersion: latestMockVersion, status: "stopped", pid: null } : item,
    );
    return mockState();
  },

  async copySession(request: CopyCodeSessionRequest): Promise<DashboardState> {
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
    const transferred = { ...session, transfer: targetTransfer };
    updateMockProfileSessions(target.id, (sessions) => {
      const alreadyExists = sessions.some((existing) => existing.id === session.id);
      return alreadyExists
        ? sessions.map((existing) => existing.id === session.id ? transferred : existing)
        : [transferred, ...sessions];
    });
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
