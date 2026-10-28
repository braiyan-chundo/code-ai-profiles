import type { ArtifactTransferOutcome, SessionTransferInfo, SessionTransferMode } from "../../types";
import type { SessionUnlinkSelection } from "./session-types";

export function describeArtifactOutcome(outcome: ArtifactTransferOutcome) {
  const details: string[] = [];
  if (outcome.copied > 0 || outcome.registered > 0) {
    details.push(`${outcome.copied} copia(s) local(es) preservada(s)${outcome.registered > 0 ? `, ${outcome.registered} registrada(s)` : ""}`);
  }
  if (outcome.preservedForManualImport > 0) details.push(`${outcome.preservedForManualImport} lista(s) para importar o publicar de nuevo`);
  if (outcome.remoteReferencesOmitted > 0 || outcome.monitorsOmitted > 0) details.push("las referencias y monitores cloud no se reasignaron");
  if (outcome.exportPath) details.push("hay una exportación local disponible en la carpeta administrada");
  if (outcome.warnings.length) details.push(outcome.warnings.join(" · "));
  if (!details.length) details.push("no se detectaron copias locales transferibles");
  return details.join("; ");
}

/** El aviso que queda tras mover o copiar una sesión. */
export function transferNotice(
  mode: SessionTransferMode,
  sessionTitle: string,
  sourceName: string,
  targetName: string,
  artifacts: ArtifactTransferOutcome,
): string {
  return (mode === "move"
    ? `“${sessionTitle}” se movió de ${sourceName} a ${targetName}.`
    : `“${sessionTitle}” se copió de ${sourceName} a ${targetName}.`)
    + ` Artefactos: ${describeArtifactOutcome(artifacts)}.`;
}

export interface UnlinkDialogCopy {
  isMove: boolean;
  title: string;
  confirmLabel: string;
  busyLabel: string;
  body: string;
  notice: string;
}

/** Los textos del diálogo de devolver o desvincular. `originName` es el nombre del perfil de origen, si existe. */
export function unlinkDialogCopy(
  selection: SessionUnlinkSelection,
  transferInfo: SessionTransferInfo,
  originName: string | undefined,
): UnlinkDialogCopy {
  const isMove = transferInfo.mode === "move";
  return {
    isMove,
    title: isMove ? `Devolver “${selection.session.title}”` : `Desvincular “${selection.session.title}”`,
    confirmLabel: isMove ? `Devolver a ${originName ?? "su origen"}` : "Desvincular copia",
    busyLabel: isMove ? "Devolviendo…" : "Desvinculando…",
    body: isMove
      ? `La sesión dejará de aparecer en ${selection.instance.name} y volverá a ${originName ?? "su instancia original"}. Ambas instancias deben estar detenidas.`
      : `La copia dejará de aparecer en ${selection.instance.name}. La sesión original permanece intacta en ${originName ?? "su instancia de origen"}.`,
    notice: isMove
      ? `“${selection.session.title}” volvió a ${originName ?? "su instancia de origen"}.`
      : `La copia de “${selection.session.title}” se desvinculó de ${selection.instance.name}.`,
  };
}
