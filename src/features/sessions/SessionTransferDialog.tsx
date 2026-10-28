import { useState } from "react";
import type { CodeSession, SessionProfile, SessionTransferMode } from "../../types";
import { AlertIcon, CodeSessionIcon, RefreshIcon, StopIcon, TransferIcon } from "../../components/Icons";
import { ModalFrame } from "../../components/ModalFrame";

export function SessionTransferDialog({
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
  onTransfer: (targetId: string, mode: SessionTransferMode, includeLocalArtifacts: boolean) => Promise<void>;
}) {
  const candidates = instances.filter((instance) => instance.id !== source.id);
  const preferredTarget = candidates.find((instance) => !instance.isOriginal && instance.status === "stopped")
    ?? candidates.find((instance) => instance.status === "stopped")
    ?? candidates[0];
  const [targetId, setTargetId] = useState(preferredTarget?.id ?? "");
  const [mode, setMode] = useState<SessionTransferMode>("move");
  const [includeLocalArtifacts, setIncludeLocalArtifacts] = useState(true);
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

      <label className="artifact-copy-option">
        <input
          type="checkbox"
          checked={includeLocalArtifacts}
          onChange={(event) => setIncludeLocalArtifacts(event.target.checked)}
          disabled={busy}
        />
        <span>
          <strong>Incluir copias locales de artefactos si están disponibles</strong>
          <small>Los archivos se copian como bytes opacos. Si el esquema no es verificable, quedan en una exportación administrada para importarlos o publicarlos de nuevo.</small>
        </span>
      </label>

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
        <button className="primary-action modal-primary" onClick={() => target && void onTransfer(target.id, mode, includeLocalArtifacts)} disabled={busy || !ready}>
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
