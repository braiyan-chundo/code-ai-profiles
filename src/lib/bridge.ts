import { Channel, invoke } from "@tauri-apps/api/core";
import packageMetadata from "../../package.json";
import type {
  AccountFacts,
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
  ProjectCandidate,
  ProjectCounts,
  ProjectDataGap,
  ProjectDocument,
  ProjectHistory,
  ProjectHistoryDocuments,
  ProjectHistoryState,
  ProjectInfo,
  ProjectRoleUsage,
  ProjectsState,
  ProjectSummary,
  SynchronizationItemResult,
  SessionTransferResult,
  SourceUpdateInfo,
  SynchronizeManagedApplicationsRequest,
  SynchronizeManagedApplicationsResult,
  SystemSettingsPanel,
  TokenBreakdown,
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
      source: "officialRelease",
      warning: null,
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

// ── Proyectos anclados (HU-0023): mocks para el modo navegador ───────────────
// Code AI Profiles usa las cifras reales de este repo (vista.md); Vetcare y Panel Finanzas son inventados.
// happy-office (HU-0025) es inventado: historias «Sin tiempo», «Sin métricas» y dos avisos reales.

type MockTokenTuple = [input: number, output: number, cacheWrite: number, cacheRead: number, total: number];

const mockTokens = ([input, output, cacheWrite, cacheRead, total]: MockTokenTuple): TokenBreakdown => ({
  input, output, cacheWrite, cacheRead, total,
});

const emptyMockTokens = (): TokenBreakdown => ({ input: 0, output: 0, cacheWrite: 0, cacheRead: 0, total: 0 });

function mockHistory(
  folder: string,
  title: string,
  state: ProjectHistoryState,
  phase: string,
  area: string | null,
  priority: string | null,
  created: string,
  minutes: number | null,
  tokens: MockTokenTuple | null,
  dataGaps?: ProjectDataGap[],
): ProjectHistory {
  // Como method.rs: solo en terminadas; sin metricas.json → noMetrics, sin minutosTotales → noTime.
  const gaps: ProjectDataGap[] = dataGaps
    ?? (state !== "done" ? [] : tokens === null ? ["noMetrics"] : minutes === null ? ["noTime"] : []);
  return {
    id: folder.slice(0, 7),
    folder,
    title,
    state,
    phase,
    area,
    priority,
    created,
    minutes,
    tokens: tokens ? mockTokens(tokens) : null,
    countsInTotals: state === "done" && tokens !== null,
    dataGaps: gaps,
  };
}

function mockProjectInfo(base: Omit<ProjectInfo, "counts" | "totals">, byRole: ProjectRoleUsage[]): ProjectInfo {
  const counts: ProjectCounts = { total: 0, waiting: 0, inProgress: 0, done: 0, discarded: 0, unknown: 0 };
  const tokens = emptyMockTokens();
  let minutes = 0;
  let histories = 0;
  let timedHistories = 0;
  for (const history of base.histories) {
    counts.total += 1;
    counts[history.state] += 1;
    if (!history.countsInTotals || !history.tokens) continue;
    histories += 1;
    if (history.minutes !== null) {
      minutes += history.minutes;
      timedHistories += 1;
    }
    tokens.input += history.tokens.input;
    tokens.output += history.tokens.output;
    tokens.cacheWrite += history.tokens.cacheWrite;
    tokens.cacheRead += history.tokens.cacheRead;
    tokens.total += history.tokens.total;
  }
  return { ...base, counts, totals: { histories, minutes, tokens, byRole, timedHistories } };
}

const mockCodeAiProfilesInfo = (): ProjectInfo => mockProjectInfo(
  {
    name: "Code AI Profiles",
    slug: "code-ai-profiles",
    summary: "Aplicación de escritorio open source (Apache-2.0) hecha con Tauri 2, React 19 + Vite y Rust para administrar perfiles aislados de una aplicación de IA compatible instalada en el equipo.",
    profile: "S",
    phase: "desarrollo",
    approver: "Braiyan Rodriguez (mantenedor)",
    packageManager: "pnpm",
    packs: ["frontend-react-vite"],
    repos: [
      {
        name: "code-ai-profiles",
        path: ".",
        kind: "otro",
        status: "ok",
        manifests: ["package.json", "src-tauri/Cargo.toml"],
        git: { status: "ok", branch: "hu-0022-configuracion-unificada", detached: false, shortSha: "6421f84", movedAt: "2026-10-29T00:27:00-05:00" },
      },
    ],
    technologies: [
      { name: "pnpm", version: "12", source: "packageManager", repo: null },
      { name: "frontend-react-vite", version: null, source: "pack", repo: null },
      { name: "React", version: "19", source: "manifest", repo: "code-ai-profiles" },
      { name: "Vite", version: "6", source: "manifest", repo: "code-ai-profiles" },
      { name: "Tailwind CSS", version: "4", source: "manifest", repo: "code-ai-profiles" },
      { name: "React Router", version: "7", source: "manifest", repo: "code-ai-profiles" },
      { name: "TypeScript", version: "5", source: "manifest", repo: "code-ai-profiles" },
      { name: "Tauri", version: "2", source: "manifest", repo: "code-ai-profiles" },
      { name: "Rust", version: null, source: "manifest", repo: "code-ai-profiles" },
    ],
    histories: [
      mockHistory("HU-0010-publicar-el-fix-de-actualizacion-como-ve", "Publicar el fix de actualización como versión 0.2.2", "done", "cierre", "versionado", "media", "2026-10-27", 1864, [1568, 481471, 1720987, 171555142, 173759168]),
      mockHistory("HU-0011-adopcion-v4", "Adopción v4", "done", "cierre", "metodo", "media", "2026-10-27", 194, [276, 118746, 461985, 17920179, 18501186]),
      mockHistory("HU-0012-icono-distintivo-en-el-dock-de-macos", "Icono distintivo en el Dock de macOS", "discarded", "requisitos", "instancias", "baja", "2026-10-27", 1793, [1328, 412484, 1535388, 157104813, 159054013]),
      mockHistory("HU-0013-describir-lo-construido-reglas-arquitect", "Describir lo construido: reglas, arquitectura y componentes", "discarded", "requisitos", "metodo", "media", "2026-10-27", 1677, [1396, 416386, 1403589, 159810869, 161632240]),
      mockHistory("HU-0014-design-system-con-shadcn-y-showcase-loca", "Design system con shadcn y showcase local", "done", "cierre", "interfaz", "media", "2026-10-28", 560, [956, 514654, 1434375, 67629867, 69579852]),
      mockHistory("HU-0015-frontend-escalable-componentes-features-", "Frontend escalable: componentes, features y router", "done", "cierre", "interfaz", "media", "2026-10-28", 408, [560, 347230, 1012763, 46621354, 47981907]),
      mockHistory("HU-0016-rediseno-con-sidebar-dashboard-y-pagina-", "Rediseño con sidebar, dashboard y página por instancia", "done", "cierre", "interfaz", "media", "2026-10-28", 132, [908, 514089, 1799690, 93268893, 95583580]),
      mockHistory("HU-0017-descargar-e-instalar-la-original-en-maco", "Descargar e instalar la original en macOS", "inProgress", "verificacion", "actualizaciones", "media", "2026-10-28", null, null),
      mockHistory("HU-0018-descargar-e-instalar-la-original-en-wind", "Descargar e instalar la original en Windows y Linux", "waiting", "requisitos", "actualizaciones", "media", "2026-10-28", null, null),
      mockHistory("HU-0019-header-compacto-sidebar-flotante-y-tipog", "Header compacto, sidebar flotante y tipografía legible", "done", "cierre", "interfaz", "media", "2026-10-28", 86, [654, 353191, 1576487, 73149403, 75079735]),
      mockHistory("HU-0020-icono-personalizado-de-la-instancia-en-e", "Icono personalizado de la instancia en el Dock de macOS", "done", "cierre", "instancias", "media", "2026-10-28", 139, [712, 408850, 1785334, 88824103, 91018999]),
      mockHistory("HU-0021-spike-relevo-del-retorno-de-inicio-de-se", "Spike: relevo del retorno de inicio de sesión a la instancia correcta", "inProgress", "requisitos", "instancias", "media", "2026-10-28", null, null),
      mockHistory("HU-0022-configuracion-unificada-con-apariencia-y", "Configuración unificada con apariencia y permisos", "inProgress", "implementacion", "interfaz", "alta", "2026-10-29", null, null),
      mockHistory("HU-0023-proyectos-resumen-de-proyectos-con-metod", "Proyectos: resumen de proyectos con metodología v4", "inProgress", "implementacion", "proyectos", "alta", "2026-10-29", null, null),
    ],
    firstCreated: "2026-10-27",
    lastActivity: "2026-10-29T00:27",
    spanDays: 3,
  },
  [
    { role: "orquestador", tokens: mockTokens([2822, 903599, 2863616, 323185777, 326955814]), approximate: true },
    { role: "frontend", tokens: mockTokens([1520, 855223, 2875146, 139766010, 143497899]), approximate: false },
    { role: "architect", tokens: mockTokens([946, 683915, 2716693, 62165209, 65566763]), approximate: false },
    { role: "backend", tokens: mockTokens([226, 196871, 927020, 24428286, 25552403]), approximate: false },
    { role: "general-purpose", tokens: mockTokens([120, 98623, 409146, 9423659, 9931548]), approximate: false },
  ],
);

const mockVetcareInfo = (): ProjectInfo => mockProjectInfo(
  {
    name: "Vetcare",
    slug: "vetcare",
    summary: "Gestión de citas, historias clínicas y facturación para clínicas veterinarias, con portal para clientes y app móvil.",
    profile: "M",
    phase: "desarrollo",
    approver: "Laura Méndez (producto)",
    packageManager: "pnpm",
    packs: ["frontend-react-vite", "backend-nestjs", "mobile-expo"],
    repos: [
      { name: "vetcare-web", path: "apps/web", kind: "web", status: "ok", manifests: ["package.json"], git: { status: "ok", branch: "develop", detached: false, shortSha: "a91c3e2", movedAt: "2026-10-28T18:42:10-05:00" } },
      { name: "vetcare-api", path: "apps/api", kind: "api", status: "ok", manifests: ["package.json"], git: { status: "ok", branch: "develop", detached: false, shortSha: "4be07d1", movedAt: "2026-10-28T16:05:33-05:00" } },
      { name: "vetcare-movil", path: "apps/movil", kind: "movil", status: "ok", manifests: ["package.json"], git: { status: "none", branch: null, detached: false, shortSha: null, movedAt: null } },
    ],
    technologies: [
      { name: "pnpm", version: "9", source: "packageManager", repo: null },
      { name: "frontend-react-vite", version: null, source: "pack", repo: null },
      { name: "backend-nestjs", version: null, source: "pack", repo: null },
      { name: "mobile-expo", version: null, source: "pack", repo: null },
      { name: "React", version: "19", source: "manifest", repo: "vetcare-web" },
      { name: "Vite", version: "6", source: "manifest", repo: "vetcare-web" },
      { name: "NestJS", version: "11", source: "manifest", repo: "vetcare-api" },
      { name: "Prisma", version: "6", source: "manifest", repo: "vetcare-api" },
      { name: "Expo", version: "52", source: "manifest", repo: "vetcare-movil" },
      { name: "React Native", version: null, source: "manifest", repo: "vetcare-movil" },
    ],
    histories: [
      mockHistory("HU-0001-registro-de-clinicas", "Registro de clínicas y sedes", "done", "cierre", "cuentas", "alta", "2026-09-02", 2210, [3120, 612400, 2104300, 96200400, 98920220]),
      mockHistory("HU-0002-agenda-de-citas", "Agenda de citas por veterinario", "done", "cierre", "citas", "alta", "2026-09-05", 3045, [4410, 801220, 2950110, 131880400, 135636140]),
      mockHistory("HU-0003-historia-clinica", "Historia clínica de la mascota", "inProgress", "implementacion", "clinica", "alta", "2026-09-20", null, null),
      mockHistory("HU-0004-recordatorios-por-correo", "Recordatorios de vacunas por correo", "waiting", "requisitos", "notificaciones", "media", "2026-10-01", null, null),
      mockHistory("HU-0005-facturacion-electronica", "Facturación electrónica", "waiting", "requisitos", "facturacion", "media", "2026-10-03", null, null),
      mockHistory("HU-0006-portal-de-clientes", "Portal de clientes", "discarded", "arquitectura", "portal", "baja", "2026-10-06", 410, [520, 98200, 310400, 14200800, 14609920]),
    ],
    firstCreated: "2026-09-02",
    lastActivity: "2026-10-28T18:40",
    spanDays: 57,
  },
  [
    { role: "orquestador", tokens: mockTokens([4200, 812000, 2900000, 128000000, 131716200]), approximate: true },
    { role: "backend", tokens: mockTokens([2100, 401620, 1414410, 64080800, 65898930]), approximate: false },
    { role: "frontend", tokens: mockTokens([1230, 200000, 740000, 36000000, 36941230]), approximate: false },
  ],
);

const mockHappyOfficeInfo = (): ProjectInfo => mockProjectInfo(
  {
    name: "happy-office",
    slug: "happy-office",
    summary: "Reserva de puestos, salas y parqueaderos para oficinas híbridas, con app móvil y panel de administración.",
    profile: "M",
    phase: "desarrollo",
    approver: "Marta Ruiz (producto)",
    packageManager: "pnpm",
    packs: ["frontend-react-vite", "backend-fastapi", "mobile-expo"],
    repos: [
      { name: "happy-office-web", path: "web", kind: "frontend", status: "ok", manifests: ["package.json"], git: { status: "ok", branch: "develop", detached: false, shortSha: "3fa91c2", movedAt: "2026-10-30T08:40:00-05:00" } },
      { name: "happy-office-api", path: "api", kind: "backend", status: "ok", manifests: ["pyproject.toml"], git: { status: "ok", branch: "develop", detached: false, shortSha: "b81e07d", movedAt: "2026-10-30T06:41:00-05:00" } },
      { name: "happy-office-mobile", path: "mobile", kind: "frontend", status: "ok", manifests: ["package.json"], git: { status: "ok", branch: "hu-0045-idioma", detached: false, shortSha: "94d02aa", movedAt: "2026-10-29T10:12:00-05:00" } },
      { name: "happy-office-infra", path: "infra", kind: "otro", status: "ok", manifests: [], git: { status: "ok", branch: "main", detached: false, shortSha: "0c7be15", movedAt: "2026-10-24T17:05:00-05:00" } },
    ],
    technologies: [
      { name: "pnpm", version: "10", source: "packageManager", repo: null },
      { name: "frontend-react-vite", version: null, source: "pack", repo: null },
      { name: "backend-fastapi", version: null, source: "pack", repo: null },
      { name: "mobile-expo", version: null, source: "pack", repo: null },
      { name: "React", version: "19", source: "manifest", repo: "happy-office-web" },
      { name: "Vite", version: "6", source: "manifest", repo: "happy-office-web" },
      { name: "FastAPI", version: null, source: "manifest", repo: "happy-office-api" },
      { name: "Expo", version: "52", source: "manifest", repo: "happy-office-mobile" },
    ],
    histories: [
      mockHistory("HU-0001-login-con-correo", "Inicio de sesión con correo corporativo", "done", "cierre", "cuentas", "alta", "2026-10-19", null, null),
      mockHistory("HU-0002-mapa-de-puestos", "Mapa de puestos por piso", "done", "cierre", "reservas", "alta", "2026-10-19", null, null),
      mockHistory("HU-0003-reserva-de-puesto", "Reserva de puesto por día", "done", "cierre", "reservas", "alta", "2026-10-20", 312, [1210, 210400, 880100, 41200300, 42292010]),
      mockHistory("HU-0004-salas-de-reunion", "Reserva de salas de reunión", "done", "cierre", "reservas", "alta", "2026-10-20", null, [980, 188200, 701300, 33900100, 34790580]),
      mockHistory("HU-0005-check-in-con-qr", "Check-in con código QR", "done", "cierre", "reservas", "media", "2026-10-21", null, [640, 120500, 455800, 21800400, 22377340]),
      mockHistory("HU-0006-parqueaderos", "Reserva de parqueaderos", "done", "cierre", "reservas", "media", "2026-10-22", 205, [720, 140300, 520900, 25100200, 25762120]),
      mockHistory("HU-0007-notificaciones-push", "Notificaciones push de la reserva", "done", "cierre", "notificaciones", "media", "2026-10-23", null, [410, 90200, 330100, 15900400, 16321110]),
      // metricas.json existe pero está roto: es un aviso, no un dato que falta.
      mockHistory("HU-0008-panel-de-ocupacion", "Panel de ocupación por sede", "done", "cierre", "admin", "media", "2026-10-24", null, null, []),
      mockHistory("HU-0009-politicas-de-reserva", "Políticas de reserva por equipo", "done", "cierre", "admin", "baja", "2026-10-25", null, [530, 101800, 390200, 18700300, 19192830]),
      mockHistory("HU-0010-idioma-de-la-app", "Idioma de la app móvil", "inProgress", "implementacion", "movil", "media", "2026-10-28", null, null),
      mockHistory("HU-0011-exportar-a-csv", "Exportar reservas a CSV", "waiting", "requisitos", "admin", "baja", "2026-10-29", null, null),
      mockHistory("HU-0012-sso-con-entra-id", "SSO con Entra ID", "discarded", "arquitectura", "cuentas", "baja", "2026-10-21", null, [120, 30100, 90400, 4100200, 4220820]),
    ],
    firstCreated: "2026-10-19",
    lastActivity: "2026-10-30T11:40",
    spanDays: 12,
  },
  [
    { role: "orquestador", tokens: mockTokens([2900, 610200, 2401000, 112300600, 115314700]), approximate: true },
    { role: "backend", tokens: mockTokens([1690, 140100, 600200, 45900400, 46642390]), approximate: false },
    { role: "frontend", tokens: mockTokens([900, 101200, 377200, 18400900, 18880200]), approximate: false },
  ],
);

const mockProjectsAt = () => new Date().toISOString();

let mockProjects: ProjectSummary[] = [
  {
    id: "5b7f2c1e-8a4d-4c3b-9f6e-1d2a3b4c5d6e",
    path: "/Users/demo/Proyectos/code-ai-profiles",
    displayPath: "~/Proyectos/code-ai-profiles",
    lastName: "Code AI Profiles",
    pinnedAt: "2026-10-29T05:10:00Z",
    lastReadAt: now,
    readAt: now,
    status: "v4",
    message: null,
    protectedLocation: null,
    info: mockCodeAiProfilesInfo(),
    warnings: [],
  },
  {
    id: "0e9d8c7b-6a5f-4e3d-8c2b-1a0f9e8d7c6b",
    path: "/Users/demo/Documents/clientes/vetcare",
    displayPath: "~/Documents/clientes/vetcare",
    lastName: "Vetcare",
    pinnedAt: "2026-10-29T05:12:00Z",
    lastReadAt: now,
    readAt: now,
    status: "v4",
    message: null,
    protectedLocation: "documents",
    info: mockVetcareInfo(),
    warnings: [
      { scope: "repo", target: "vetcare-movil", message: "El repo no tiene carpeta .git: no se muestra rama ni commit." },
    ],
  },
  {
    id: "8f1e2d3c-4b5a-4968-8776-655443322110",
    path: "/Users/demo/Proyectos/happy-office",
    displayPath: "~/Proyectos/happy-office",
    lastName: "happy-office",
    pinnedAt: "2026-10-30T09:00:00Z",
    lastReadAt: now,
    readAt: now,
    status: "v4",
    message: null,
    protectedLocation: null,
    info: mockHappyOfficeInfo(),
    warnings: [
      { scope: "metrics", target: "HU-0008", message: "metricas.json no es JSON válido (línea 14, columna 3); la historia queda sin cifras." },
      { scope: "manifest", target: "happy-office-mobile/package.json", message: "package.json está en la nube sin descargar y no se lee para no descargarlo." },
    ],
  },
  {
    id: "3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f",
    path: "/Users/demo/Proyectos/panel-finanzas",
    displayPath: "~/Proyectos/panel-finanzas",
    lastName: "Panel Finanzas",
    pinnedAt: "2026-10-01T15:00:00Z",
    lastReadAt: "2026-10-17T14:20:00Z",
    readAt: now,
    status: "notFound",
    message: "No se encontró la carpeta. Puede que se haya movido, renombrado o borrado. Desánclala o vuelve a anclarla desde su nueva ubicación.",
    protectedLocation: null,
    info: null,
    warnings: [],
  },
];

const mockCandidates: ProjectCandidate[] = [
  {
    path: "/Users/demo/Proyectos/lumen-tienda",
    displayPath: "~/Proyectos/lumen-tienda",
    status: "v4",
    message: null,
    configVersion: 4,
    name: "Lumen Tienda",
    profile: "S",
    phase: "desarrollo",
    historyCount: 9,
    repoCount: 1,
    alreadyPinnedId: null,
  },
  {
    path: "/Users/demo/Proyectos/landing-2024",
    displayPath: "~/Proyectos/landing-2024",
    status: "notV4",
    message: "La carpeta usa la metodología versión 3. Solo se pueden anclar proyectos con la versión 4.",
    configVersion: 3,
    name: "landing-2024",
    profile: null,
    phase: null,
    historyCount: null,
    repoCount: null,
    alreadyPinnedId: null,
  },
];
let mockPickCount = 0;

const mockLumenInfo = (): ProjectInfo => mockProjectInfo(
  {
    name: "Lumen Tienda",
    slug: "lumen-tienda",
    summary: "Tienda en línea de lámparas de diseño con catálogo, carrito y pagos.",
    profile: "S",
    phase: "desarrollo",
    approver: "Braiyan Rodriguez (mantenedor)",
    packageManager: "pnpm",
    packs: ["frontend-react-vite"],
    repos: [
      { name: "lumen-tienda", path: ".", kind: "web", status: "ok", manifests: ["package.json"], git: { status: "ok", branch: "main", detached: false, shortSha: "c0ffee1", movedAt: "2026-10-27T11:02:00-05:00" } },
    ],
    technologies: [
      { name: "pnpm", version: "10", source: "packageManager", repo: null },
      { name: "frontend-react-vite", version: null, source: "pack", repo: null },
      { name: "React", version: "19", source: "manifest", repo: "lumen-tienda" },
      { name: "Vite", version: "6", source: "manifest", repo: "lumen-tienda" },
    ],
    histories: [
      mockHistory("HU-0001-catalogo", "Catálogo de productos", "done", "cierre", "catalogo", "alta", "2026-10-10", 540, [610, 120400, 480200, 22100300, 22701510]),
      mockHistory("HU-0002-carrito", "Carrito de compra", "inProgress", "implementacion", "compra", "alta", "2026-10-20", null, null),
    ],
    firstCreated: "2026-10-10",
    lastActivity: "2026-10-27T11:00",
    spanDays: 18,
  },
  [{ role: "orquestador", tokens: mockTokens([610, 120400, 480200, 22100300, 22701510]), approximate: true }],
);

const findMockProject = (id: string): ProjectSummary => {
  const project = mockProjects.find((item) => item.id === id);
  if (!project) throw new Error("El proyecto ya no está anclado.");
  return project;
};

const mockReadProject = (project: ProjectSummary): ProjectSummary => {
  const readAt = mockProjectsAt();
  return project.status === "v4" ? { ...project, readAt, lastReadAt: readAt } : { ...project, readAt };
};

// ── Lector de historias (HU-0025): Markdown de ejemplo para el modo navegador ─────
// Lleva todo lo que el lector debe pintar (tabla, código, cita, casillas, enlace externo) y lo que no
// debe pintar nunca (una imagen y HTML crudo). Las URLs son de dominios reservados (.invalid / .test).

const mockFrontmatter = (history: ProjectHistory) => [
  "---",
  `id: ${history.id}`,
  `titulo: "${history.title}"`,
  `estado: ${history.state === "done" ? "terminada" : history.state === "inProgress" ? "en-proceso" : history.state === "waiting" ? "en-espera" : "descartada"}`,
  `fase: ${history.phase ?? "requisitos"}`,
  `creada: ${history.created ?? "2026-10-01"}`,
  "---",
  "",
];

const mockHuMarkdown = (history: ProjectHistory) => [
  ...mockFrontmatter(history),
  `# ${history.title}`,
  "",
  "Como persona del equipo **quiero** reservar desde el móvil **para** no depender del panel web.",
  "",
  "## Criterios de aceptación",
  "",
  "- [x] La reserva se confirma en menos de 2 s.",
  "- [x] Se envía la confirmación al correo corporativo.",
  "- [ ] Se puede cancelar hasta una hora antes.",
  "",
  "| Caso | Resultado esperado |",
  "| --- | --- |",
  "| Puesto libre | Reserva confirmada |",
  "| Puesto ocupado | Aviso y alternativas del mismo piso |",
  "",
  "> Regla de negocio: una persona no puede tener dos reservas que se solapen.",
  "",
  "Detalle en la guía de reservas:",
  // metodo:permitir enlace de ejemplo del Markdown mock (dominio reservado .test)
  "[Guía de reservas](https://docs.happy-office.test/reservas?seccion=politicas#cancelar), y el código `POST /reservas`.",
  "",
  "Una imagen que el lector no debe cargar:",
  "",
  // metodo:permitir imagen de ejemplo que el lector no carga (dominio reservado .invalid)
  "![Mapa del piso 3](https://cdn.happy-office.invalid/mapa-piso-3.png)",
  "",
  "<div onclick=\"this.remove()\"><b>HTML crudo que no se pinta</b><script>document.title = 'no';</script></div>",
  "",
  "Enlace relativo que queda como texto: [arquitectura](./arquitectura.md).",
  "",
].join("\n");

const mockArchitectureMarkdown = (history: ProjectHistory) => [
  `# Arquitectura · ${history.id}`,
  "",
  "## Solución",
  "",
  "```python",
  "@router.post(\"/reservas\")",
  "def crear_reserva(datos: ReservaIn, persona: Persona = Depends(actual)) -> ReservaOut:",
  "    return servicio.reservar(persona, datos.puesto, datos.dia)",
  "```",
  "",
  "1. Validar que el puesto existe.",
  "2. Bloquear el puesto con una escritura condicionada.",
  "   - Si falla, devolver `409`.",
  "",
].join("\n");

const mockVerificationMarkdown = (history: ProjectHistory) => [
  `# Verificación · ${history.id}`,
  "",
  "| Prueba | Resultado |",
  "| --- | --- |",
  "| `pytest tests/reservas` | 48 de 48 |",
  "| `pnpm test` | 112 de 112 |",
  "",
].join("\n");

const mockTimelineMarkdown = (history: ProjectHistory) => [
  `# Bitácora · ${history.id}`,
  "",
  "| Fecha | Quién | Qué |",
  "| --- | --- | --- |",
  `| ${history.created ?? "2026-10-01"} 09:00 | hu.mjs | Historia creada |`,
  `| ${history.created ?? "2026-10-01"} 17:30 | hu.mjs | Fase: ${history.phase ?? "requisitos"} |`,
  "",
].join("\n");

/**
 * Las terminadas y descartadas tienen los cuatro archivos; las demás, solo hu.md y seguimiento.md.
 * En las historias cuyo id acaba en 3, verificacion.md sale ilegible para ver ese estado.
 */
const mockHistoryDocuments = (history: ProjectHistory): ProjectDocument[] => {
  const ok = (kind: ProjectDocument["kind"], file: string, content: string): ProjectDocument => ({
    kind, file, path: `hu/${history.folder}/${file}`, status: "ok", content, message: null,
  });
  const complete = history.state === "done" || history.state === "discarded";
  const documents: ProjectDocument[] = [ok("hu", "hu.md", mockHuMarkdown(history))];
  if (complete) {
    documents.push(ok("architecture", "arquitectura.md", mockArchitectureMarkdown(history)));
    documents.push(history.id.endsWith("3")
      ? {
        kind: "verification",
        file: "verificacion.md",
        path: `hu/${history.folder}/verificacion.md`,
        status: "unreadable",
        content: null,
        message: "verificacion.md supera el tamaño máximo que se lee (512 KiB).",
      }
      : ok("verification", "verificacion.md", mockVerificationMarkdown(history)));
  }
  documents.push(ok("timeline", "seguimiento.md", mockTimelineMarkdown(history)));
  return documents;
};

/** Misma regla que `external_link` en Rust: http/https con host, sin credenciales, ≤ 2 048 caracteres. */
const mockExternalLinkError = "El enlace no se puede abrir: solo se abren direcciones http o https completas.";
const mockOpenedLinks: string[] = [];

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
      source: "officialRelease",
      warning: null,
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
        systemMessage: "macOS no aplicó el icono a la copia. Pulsa «Reintentar» con la instancia detenida.",
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
        systemMessage: "Se verá al abrir la instancia; la firma de la aplicación no cambia.",
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

  async openSystemSettings(panel: SystemSettingsPanel): Promise<void> {
    if (isTauri()) await call("open_system_settings", { panel });
  },

  async accountFacts(): Promise<AccountFacts> {
    if (isTauri()) return call("get_account_facts");
    return { admin: true };
  },

  async listProjects(): Promise<ProjectsState> {
    if (isTauri()) return call("list_projects");
    await mockWait(160);
    mockProjects = mockProjects.map(mockReadProject);
    return { projects: mockProjects, readAt: mockProjectsAt() };
  },

  async readProject(id: string): Promise<ProjectSummary> {
    if (isTauri()) return call("read_project", { id });
    await mockWait(120);
    const project = mockReadProject(findMockProject(id));
    mockProjects = mockProjects.map((item) => (item.id === id ? project : item));
    return project;
  },

  async pickProjectFolder(): Promise<ProjectCandidate | null> {
    if (isTauri()) return call("pick_project_folder");
    await mockWait(200);
    const candidate = mockCandidates[mockPickCount % mockCandidates.length];
    mockPickCount += 1;
    const alreadyPinnedId = mockProjects.find((item) => item.path === candidate.path)?.id ?? null;
    return { ...candidate, alreadyPinnedId };
  },

  async pinProject(path: string): Promise<ProjectSummary> {
    if (isTauri()) return call("pin_project", { path });
    await mockWait(160);
    const existing = mockProjects.find((item) => item.path === path);
    if (existing) return existing;
    const candidate = mockCandidates.find((item) => item.path === path);
    if (!candidate) throw new Error("No se encontró la carpeta. Elige otra carpeta.");
    if (candidate.status !== "v4") throw new Error(candidate.message ?? "No es un proyecto v4. No se ancló nada.");
    const readAt = mockProjectsAt();
    const project: ProjectSummary = {
      id: crypto.randomUUID(),
      path: candidate.path,
      displayPath: candidate.displayPath,
      lastName: candidate.name,
      pinnedAt: readAt,
      lastReadAt: readAt,
      readAt,
      status: "v4",
      message: null,
      protectedLocation: null,
      info: mockLumenInfo(),
      warnings: [],
    };
    mockProjects = [...mockProjects, project];
    return project;
  },

  async unpinProject(id: string): Promise<void> {
    if (isTauri()) {
      await call("unpin_project", { id });
      return;
    }
    findMockProject(id);
    mockProjects = mockProjects.filter((item) => item.id !== id);
  },

  async openProjectFolder(id: string): Promise<void> {
    if (isTauri()) {
      await call("open_project_folder", { id });
      return;
    }
    const project = findMockProject(id);
    if (project.status === "notFound") throw new Error("No se encontró la carpeta del proyecto.");
  },

  /** Lector de historias (HU-0025): los `.md` fijos de `hu/<folder>`, leídos al abrir. */
  async readProjectHistory(id: string, folder: string): Promise<ProjectHistoryDocuments> {
    if (isTauri()) return call("read_project_history", { id, folder });
    await mockWait(240);
    if (!/^HU-\d{4}(-[^/\\:…]*)?$/.test(folder) || folder.includes("..") || folder.length > 120) {
      throw new Error("La historia no es válida.");
    }
    const project = findMockProject(id);
    const history = project.info?.histories.find((item) => item.folder === folder);
    if (!history) throw new Error("La historia ya no está en el proyecto. Pulsa «Actualizar».");
    return { folder, documents: mockHistoryDocuments(history), readAt: mockProjectsAt() };
  },

  /** Abre un enlace http/https en el navegador del sistema. El mock no abre nada: lo registra. */
  async openExternalLink(url: string): Promise<void> {
    if (isTauri()) {
      await call("open_external_link", { url });
      return;
    }
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error(mockExternalLinkError);
    }
    if (
      url.length > 2048
      || !["http:", "https:"].includes(parsed.protocol)
      || !parsed.hostname
      || parsed.username
      || parsed.password
    ) {
      throw new Error(mockExternalLinkError);
    }
    mockOpenedLinks.push(parsed.href);
    console.info("[mock] openExternalLink", parsed.href);
  },
};
