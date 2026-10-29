import assert from "node:assert/strict";
import test from "node:test";
import {
  describeArtifactOutcome,
  transferNotice,
  unlinkDialogCopy,
} from "../src/features/sessions/session-messages.ts";
import { summarizeSynchronization, synchronizeLabel } from "../src/features/updates/update-messages.ts";
import {
  installPhaseLabel,
  installProgressPercent,
  originalInstallAvailability,
  outdatedInstancesDetail,
  pendingSyncNotice,
  pendingSyncPlan,
  summarizeOriginalInstall,
} from "../src/features/updates/original-install.ts";
import { EMPTY_DASHBOARD } from "../src/features/dashboard/dashboard-store.ts";
import { originalUpdateChannel } from "../src/features/updates/original-update-channel.ts";
import { iconDimensionsError, iconFileError } from "../src/features/instances/icon-validation.ts";
import type {
  ArtifactTransferOutcome,
  CodeSession,
  DashboardState,
  ManagedInstance,
  OriginalInstallProgress,
  OriginalInstallResult,
  SessionProfile,
  SynchronizationItemResult,
} from "../src/types.ts";

const noArtifacts: ArtifactTransferOutcome = {
  localCandidates: 0,
  copied: 0,
  registered: 0,
  preservedForManualImport: 0,
  remoteReferencesOmitted: 0,
  monitorsOmitted: 0,
  exportPath: null,
  warnings: [],
};

function outcome(overrides: Partial<ArtifactTransferOutcome>): ArtifactTransferOutcome {
  return { ...noArtifacts, ...overrides };
}

const session: CodeSession = {
  id: "s1",
  title: "Migración",
  model: null,
  effort: null,
  completedTurns: 3,
  createdAt: null,
  lastActivityAt: null,
  isArchived: false,
};

const profile: SessionProfile = { id: "b", name: "Personal", status: "stopped", codeSessions: [session] };

function result(status: SynchronizationItemResult["status"], message = ""): SynchronizationItemResult {
  return { instanceId: status, status, fromVersion: "1.0.0", toVersion: "1.1.0", message };
}

test("describeArtifactOutcome: sin artefactos", () => {
  assert.equal(describeArtifactOutcome(noArtifacts), "no se detectaron copias locales transferibles");
});

test("describeArtifactOutcome: cada rama", () => {
  assert.equal(describeArtifactOutcome(outcome({ copied: 2 })), "2 copia(s) local(es) preservada(s)");
  assert.equal(describeArtifactOutcome(outcome({ copied: 1, registered: 1 })), "1 copia(s) local(es) preservada(s), 1 registrada(s)");
  assert.equal(describeArtifactOutcome(outcome({ registered: 3 })), "0 copia(s) local(es) preservada(s), 3 registrada(s)");
  assert.equal(describeArtifactOutcome(outcome({ preservedForManualImport: 2 })), "2 lista(s) para importar o publicar de nuevo");
  assert.equal(describeArtifactOutcome(outcome({ remoteReferencesOmitted: 1 })), "las referencias y monitores cloud no se reasignaron");
  assert.equal(describeArtifactOutcome(outcome({ monitorsOmitted: 1 })), "las referencias y monitores cloud no se reasignaron");
  assert.equal(describeArtifactOutcome(outcome({ exportPath: "/x" })), "hay una exportación local disponible en la carpeta administrada");
  assert.equal(describeArtifactOutcome(outcome({ warnings: ["a", "b"] })), "a · b");
  assert.equal(
    describeArtifactOutcome(outcome({ copied: 1, preservedForManualImport: 1, monitorsOmitted: 1, exportPath: "/x", warnings: ["w"] })),
    "1 copia(s) local(es) preservada(s); 1 lista(s) para importar o publicar de nuevo; las referencias y monitores cloud no se reasignaron; hay una exportación local disponible en la carpeta administrada; w",
  );
});

test("transferNotice: mover y copiar", () => {
  assert.equal(
    transferNotice("move", "Migración", "Trabajo", "Personal", noArtifacts),
    "“Migración” se movió de Trabajo a Personal. Artefactos: no se detectaron copias locales transferibles.",
  );
  assert.equal(
    transferNotice("copy", "Migración", "Trabajo", "Personal", outcome({ copied: 1 })),
    "“Migración” se copió de Trabajo a Personal. Artefactos: 1 copia(s) local(es) preservada(s).",
  );
});

test("unlinkDialogCopy: devolver una sesión movida, con origen y sin él", () => {
  const selection = { instance: profile, session };
  const copy = unlinkDialogCopy(selection, { originInstanceId: "a", mode: "move" }, "Trabajo");
  assert.deepEqual(copy, {
    isMove: true,
    title: "Devolver “Migración”",
    confirmLabel: "Devolver a Trabajo",
    busyLabel: "Devolviendo…",
    body: "La sesión dejará de aparecer en Personal y volverá a Trabajo. Ambas instancias deben estar detenidas.",
    notice: "“Migración” volvió a Trabajo.",
  });
  const orphan = unlinkDialogCopy(selection, { originInstanceId: "a", mode: "move" }, undefined);
  assert.equal(orphan.confirmLabel, "Devolver a su origen");
  assert.equal(orphan.body, "La sesión dejará de aparecer en Personal y volverá a su instancia original. Ambas instancias deben estar detenidas.");
  assert.equal(orphan.notice, "“Migración” volvió a su instancia de origen.");
});

test("unlinkDialogCopy: desvincular una copia, con origen y sin él", () => {
  const selection = { instance: profile, session };
  const copy = unlinkDialogCopy(selection, { originInstanceId: "a", mode: "copy" }, "Trabajo");
  assert.deepEqual(copy, {
    isMove: false,
    title: "Desvincular “Migración”",
    confirmLabel: "Desvincular copia",
    busyLabel: "Desvinculando…",
    body: "La copia dejará de aparecer en Personal. La sesión original permanece intacta en Trabajo.",
    notice: "La copia de “Migración” se desvinculó de Personal.",
  });
  const orphan = unlinkDialogCopy(selection, { originInstanceId: "a", mode: "copy" }, undefined);
  assert.equal(orphan.body, "La copia dejará de aparecer en Personal. La sesión original permanece intacta en su instancia de origen.");
  assert.equal(orphan.notice, "La copia de “Migración” se desvinculó de Personal.");
});

test("synchronizeLabel: con fuente y versión, o genérico", () => {
  assert.equal(synchronizeLabel({ kind: "original", instanceId: null, name: "Compatible" }, "2.0.1"), "Sincronizar instancias desde Compatible v2.0.1");
  assert.equal(synchronizeLabel(null, "2.0.1"), "Sincronizar instancias");
  assert.equal(synchronizeLabel({ kind: "managed", instanceId: "a", name: "Trabajo" }, null), "Sincronizar instancias");
});

test("summarizeSynchronization: vacío, solo fallos y mezcla", () => {
  assert.deepEqual(summarizeSynchronization([]), { notice: null, error: null });
  assert.deepEqual(summarizeSynchronization([result("failed", "uno"), result("failed", "dos")]), {
    notice: null,
    error: "No se completó en 2 instancia(s): uno · dos",
  });
  assert.deepEqual(summarizeSynchronization([result("updated"), result("skipped"), result("updated"), result("failed", "sin espacio")]), {
    notice: "Sincronización finalizada: 2 actualizada(s), 1 omitida(s), 1 con error.",
    error: "No se completó en 1 instancia(s): sin espacio",
  });
  assert.deepEqual(summarizeSynchronization([result("skipped")]), {
    notice: "Sincronización finalizada: 0 actualizada(s), 1 omitida(s), 0 con error.",
    error: null,
  });
});

test("originalUpdateChannel: canal por plataforma", () => {
  assert.deepEqual(originalUpdateChannel("linux", "Compatible"), {
    label: "Linux",
    channel: "Instrucciones oficiales del repositorio apt",
    handoff: "Se abrirán las instrucciones oficiales de apt. Revisa y completa los pasos en tu sistema; Code AI Profiles no ejecutará comandos ni solicitará permisos.",
    action: "Ver instrucciones oficiales",
  });
  const windows = originalUpdateChannel("windows", "Compatible");
  assert.equal(windows.label, "Windows");
  assert.equal(windows.channel, "Descarga oficial para Windows");
  assert.equal(windows.action, "Abrir descarga oficial");
  const macos = originalUpdateChannel("macos", "Compatible");
  assert.equal(macos.label, "macOS");
  assert.equal(macos.channel, "Actualizador oficial de la aplicación original");
  assert.equal(macos.action, "Abrir Compatible");
  assert.match(macos.handoff, /^Se abrirá únicamente Compatible\. /);
  assert.equal(originalUpdateChannel("unknown", "Compatible").label, "macOS");
});

test("validación de icono: tipo y tamaño de archivo", () => {
  assert.equal(iconFileError({ type: "image/png", size: 1024 }), null);
  assert.equal(iconFileError({ type: "image/jpeg", size: 5 * 1024 * 1024 }), null);
  assert.equal(iconFileError({ type: "image/gif", size: 10 }), "Selecciona una imagen PNG o JPEG válida.");
  assert.equal(iconFileError({ type: "", size: 10 }), "Selecciona una imagen PNG o JPEG válida.");
  assert.equal(iconFileError({ type: "image/png", size: 5 * 1024 * 1024 + 1 }), "La imagen supera el límite de 5 MiB.");
  assert.equal(iconFileError({ type: "image/webp", size: 6 * 1024 * 1024 }), "Selecciona una imagen PNG o JPEG válida.");
});

test("validación de icono: dimensiones entre 32 y 4096 px", () => {
  const error = "Usa una imagen entre 32×32 y 4096×4096 píxeles.";
  assert.equal(iconDimensionsError(31, 64), error);
  assert.equal(iconDimensionsError(64, 31), error);
  assert.equal(iconDimensionsError(32, 32), null);
  assert.equal(iconDimensionsError(4096, 4096), null);
  assert.equal(iconDimensionsError(4097, 512), error);
  assert.equal(iconDimensionsError(512, 4097), error);
});

type System = DashboardState["system"];

function system(overrides: Partial<System> = {}): System {
  return {
    ...EMPTY_DASHBOARD.system,
    platform: "macos",
    sourcePath: "/Applications/Claude.app",
    sourceName: "Claude",
    sourceVersion: "1.0.0",
    originalStatus: "stopped",
    sourceUpdate: { status: "available", latestVersion: "1.1.0", checkedAt: 1_800_000_000, stale: false, source: "officialFeed" },
    ...overrides,
  };
}

test("originalInstallAvailability: se ofrece solo en macOS con una versión oficial fresca y disponible", () => {
  assert.deepEqual(originalInstallAvailability(system(), null), { visible: true, disabled: false, disabledReason: null });
  assert.equal(originalInstallAvailability(system({ platform: "windows" }), null).visible, false);
  assert.equal(originalInstallAvailability(system({ platform: "linux" }), null).visible, false);
  assert.equal(originalInstallAvailability(system({ platform: "unknown" }), null).visible, false);
  assert.equal(originalInstallAvailability(system({ sourcePath: null }), null).visible, false);
});

test("originalInstallAvailability: no se ofrece con información vieja, al día o sin versión", () => {
  const info = system().sourceUpdate;
  assert.equal(originalInstallAvailability(system({ sourceUpdate: { ...info, stale: true } }), null).visible, false);
  assert.equal(originalInstallAvailability(system({ sourceUpdate: { ...info, checkedAt: null } }), null).visible, false);
  assert.equal(originalInstallAvailability(system({ sourceUpdate: { ...info, source: null } }), null).visible, false);
  assert.equal(originalInstallAvailability(system({ sourceUpdate: { ...info, status: "current" } }), null).visible, false);
  assert.equal(originalInstallAvailability(system({ sourceUpdate: { ...info, status: "unavailable" } }), null).visible, false);
  assert.equal(originalInstallAvailability(system({ sourceUpdate: { ...info, latestVersion: null } }), null).visible, false);
  assert.deepEqual(originalInstallAvailability(system({ platform: "windows" }), "scan"), {
    visible: false,
    disabled: false,
    disabledReason: null,
  });
});

test("originalInstallAvailability: la original en marcha da un motivo visible; otra operación, solo deshabilita", () => {
  assert.deepEqual(originalInstallAvailability(system({ originalStatus: "running" }), null), {
    visible: true,
    disabled: true,
    disabledReason: "Cierra Claude para actualizarla.",
  });
  assert.equal(
    originalInstallAvailability(system({ originalStatus: "running", sourceName: null }), "scan").disabledReason,
    "Cierra Aplicación compatible para actualizarla.",
  );
  assert.deepEqual(originalInstallAvailability(system(), "scan"), { visible: true, disabled: true, disabledReason: null });
  assert.deepEqual(originalInstallAvailability(system(), "install-original"), { visible: true, disabled: true, disabledReason: null });
});

function progress(overrides: Partial<OriginalInstallProgress> = {}): OriginalInstallProgress {
  return { phase: "downloading", targetVersion: "1.1.0", receivedBytes: 120_000_000, totalBytes: 378_072_300, cancellable: true, ...overrides };
}

test("installPhaseLabel: una línea por fase, con los bytes al descargar", () => {
  assert.equal(
    installPhaseLabel(progress({ phase: "preparing", targetVersion: null, receivedBytes: 0, totalBytes: 0 }), "Claude"),
    "Preparando la descarga de Claude…",
  );
  assert.equal(installPhaseLabel(progress(), "Claude"), "Descargando Claude 1.1.0 · 120 MB de 378 MB");
  assert.equal(installPhaseLabel(progress({ receivedBytes: 0 }), "Claude"), "Descargando Claude 1.1.0 · 0 MB de 378 MB");
  assert.equal(installPhaseLabel(progress({ totalBytes: 0, receivedBytes: 0 }), "Claude"), "Descargando Claude 1.1.0…");
  assert.equal(installPhaseLabel(progress({ targetVersion: null, totalBytes: 0 }), "Claude"), "Descargando Claude…");
  assert.equal(installPhaseLabel(progress({ phase: "verifying" }), "Claude"), "Verificando paquete, firma y versión…");
  assert.equal(installPhaseLabel(progress({ phase: "installing", cancellable: false }), "Claude"), "Instalando y comprobando…");
  assert.equal(installPhaseLabel(progress({ phase: "synchronizing", cancellable: false }), "Claude"), "Sincronizando instancias detenidas…");
});

test("installProgressPercent: medida solo al descargar con tamaño conocido", () => {
  assert.equal(installProgressPercent(progress({ receivedBytes: 0 })), 0);
  assert.equal(installProgressPercent(progress({ receivedBytes: 189_036_150 })), 50);
  assert.equal(installProgressPercent(progress({ receivedBytes: 999_999_999_999 })), 100);
  assert.equal(installProgressPercent(progress({ totalBytes: 0 })), null);
  assert.equal(installProgressPercent(progress({ phase: "verifying" })), null);
  assert.equal(installProgressPercent(progress({ phase: "preparing", totalBytes: 0 })), null);
});

function installed(overrides: Partial<OriginalInstallResult> = {}): OriginalInstallResult {
  return {
    status: "installed",
    previousVersion: "1.0.0",
    installedVersion: "1.1.0",
    synchronization: [],
    pendingInstanceIds: [],
    dashboard: { instances: [], system: system() },
    ...overrides,
  };
}

test("summarizeOriginalInstall: instalada sin instancias, con actualizadas y con pendientes", () => {
  assert.deepEqual(summarizeOriginalInstall(installed(), "Claude"), {
    notice: "Claude se actualizó de 1.0.0 a 1.1.0.",
    error: null,
  });
  assert.equal(
    summarizeOriginalInstall(installed({ synchronization: [result("updated"), result("updated")] }), "Claude").notice,
    "Claude se actualizó de 1.0.0 a 1.1.0. 2 instancias actualizadas.",
  );
  assert.equal(
    summarizeOriginalInstall(installed({ synchronization: [result("updated")], pendingInstanceIds: ["w"] }), "Claude").notice,
    "Claude se actualizó de 1.0.0 a 1.1.0. 1 instancia actualizada, 1 pendiente: se sincronizará al detenerla.",
  );
  assert.equal(
    summarizeOriginalInstall(installed({ pendingInstanceIds: ["a", "b"] }), "Claude").notice,
    "Claude se actualizó de 1.0.0 a 1.1.0. 2 pendientes: se sincronizarán al detenerlas.",
  );
  assert.equal(
    summarizeOriginalInstall(installed({ previousVersion: null }), "Claude").notice,
    "Claude se actualizó a 1.1.0.",
  );
});

test("summarizeOriginalInstall: los fallos de sincronización van al error y no quitan el aviso de la instalación", () => {
  const summary = summarizeOriginalInstall(
    installed({ synchronization: [result("updated"), result("failed", "No hay espacio."), result("failed", "Está en uso.")] }),
    "Claude",
  );
  assert.equal(summary.notice, "Claude se actualizó de 1.0.0 a 1.1.0. 1 instancia actualizada.");
  assert.equal(summary.error, "No se completó en 2 instancia(s): No hay espacio. · Está en uso.");
  assert.equal(summarizeOriginalInstall(installed({ synchronization: [result("skipped")] }), "Claude").error, null);
});

test("summarizeOriginalInstall: cancelada no cambia nada y no es un error", () => {
  assert.deepEqual(
    summarizeOriginalInstall(installed({ status: "cancelled", installedVersion: null }), "Claude"),
    { notice: "Descarga cancelada. La original no cambió.", error: null },
  );
});

test("pendingSyncNotice cambia el prefijo del resumen de la sincronización", () => {
  const summary = summarizeSynchronization([result("updated")]);
  assert.equal(
    pendingSyncNotice(summary.notice ?? ""),
    "Sincronización pendiente: 1 actualizada(s), 0 omitida(s), 0 con error.",
  );
});

function managed(id: string, status: ManagedInstance["status"]): ManagedInstance {
  return {
    id,
    name: id,
    sourceVersion: "1.0.0",
    appPath: `/Apps/${id}.app`,
    profilePath: `/perfiles/${id}`,
    createdAt: "2026-10-28T00:00:00Z",
    lastLaunchedAt: null,
    pid: null,
    status,
    usage: null,
    codeSessions: [],
  };
}

function panel(instances: ManagedInstance[], staleInstanceIds: string[]): DashboardState {
  return {
    instances,
    system: system({
      versionTopology: {
        ...EMPTY_DASHBOARD.system.versionTopology,
        latestSource: { kind: "original", instanceId: null, name: "Claude" },
        staleInstanceIds,
      },
    }),
  };
}

test("pendingSyncPlan: detenida y por detrás está lista; en marcha espera", () => {
  const state = panel([managed("a", "stopped"), managed("b", "running")], ["a", "b"]);
  assert.deepEqual(pendingSyncPlan(["a", "b"], state), { ready: ["a"], drop: [] });
  assert.deepEqual(pendingSyncPlan(["b"], state), { ready: [], drop: [] });
});

test("pendingSyncPlan: borrada o al día se olvida, también si está en marcha", () => {
  const state = panel([managed("a", "stopped"), managed("b", "running")], ["b"]);
  assert.deepEqual(pendingSyncPlan(["a", "gone", "b"], state), { ready: [], drop: ["a", "gone"] });
  assert.deepEqual(pendingSyncPlan(["b"], panel([managed("b", "running")], [])), { ready: [], drop: ["b"] });
  assert.deepEqual(pendingSyncPlan([], state), { ready: [], drop: [] });
});

test("outdatedInstancesDetail: nombra las pendientes que se sincronizarán al detenerlas", () => {
  const a = { id: "a", name: "Personal" };
  const b = { id: "b", name: "Trabajo" };
  const c = { id: "c", name: "Lab" };
  assert.equal(outdatedInstancesDetail([a], []), "Personal usa una versión anterior.");
  assert.equal(outdatedInstancesDetail([a, b], []), "2 instancias usan una versión anterior.");
  assert.equal(outdatedInstancesDetail([a], ["a"]), "Personal usa una versión anterior y se sincronizará al detenerla.");
  assert.equal(
    outdatedInstancesDetail([a, b], ["b"]),
    "2 instancias usan una versión anterior. Trabajo se sincronizará al detenerla.",
  );
  assert.equal(
    outdatedInstancesDetail([a, b, c], ["a", "c", "gone"]),
    "3 instancias usan una versión anterior. Personal y Lab se sincronizarán al detenerlas.",
  );
  assert.equal(
    outdatedInstancesDetail([a, b, c], ["a", "b", "c"]),
    "3 instancias usan una versión anterior. Personal, Trabajo y Lab se sincronizarán al detenerlas.",
  );
});

test("pendingSyncPlan: sin fuente en la topología la pendiente espera, no se olvida (la original abierta)", () => {
  const withoutSource = (instances: ManagedInstance[], staleInstanceIds: string[]): DashboardState => ({
    instances,
    system: system({ originalStatus: "running", versionTopology: { ...EMPTY_DASHBOARD.system.versionTopology, latestSource: null, staleInstanceIds } }),
  });
  // La pendiente deja de aparecer en staleInstanceIds porque no hay a qué compararla: no es «al día».
  assert.deepEqual(pendingSyncPlan(["a", "b"], withoutSource([managed("a", "stopped"), managed("b", "running")], [])), { ready: [], drop: [] });
  assert.deepEqual(pendingSyncPlan(["a"], withoutSource([managed("a", "stopped")], ["a"])), { ready: [], drop: [] });
  // Lo que ya no existe se olvida igual.
  assert.deepEqual(pendingSyncPlan(["a", "gone"], withoutSource([managed("a", "stopped")], [])), { ready: [], drop: ["gone"] });
  // Con la fuente de vuelta, la detenida y por detrás queda lista.
  const source = { kind: "original" as const, instanceId: null, name: "Claude" };
  const back: DashboardState = {
    instances: [managed("a", "stopped")],
    system: system({ versionTopology: { ...EMPTY_DASHBOARD.system.versionTopology, latestSource: source, staleInstanceIds: ["a"] } }),
  };
  assert.deepEqual(pendingSyncPlan(["a"], back), { ready: ["a"], drop: [] });
});
