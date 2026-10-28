import assert from "node:assert/strict";
import test from "node:test";
import {
  describeArtifactOutcome,
  transferNotice,
  unlinkDialogCopy,
} from "../src/features/sessions/session-messages.ts";
import { summarizeSynchronization, synchronizeLabel } from "../src/features/updates/update-messages.ts";
import { originalUpdateChannel } from "../src/features/updates/original-update-channel.ts";
import { iconDimensionsError, iconFileError } from "../src/features/instances/icon-validation.ts";
import type {
  ArtifactTransferOutcome,
  CodeSession,
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
