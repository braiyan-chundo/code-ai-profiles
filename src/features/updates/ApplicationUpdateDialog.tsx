import type { ManagedInstance } from "../../types";
import { CloudIcon, HardDriveIcon, RefreshIcon, StopIcon } from "../../components/Icons";
import { ModalFrame } from "../../components/ModalFrame";

export function ApplicationUpdateDialog({
  instances,
  sourceName,
  targetVersion,
  canSynchronize,
  unavailableReason,
  busy,
  onClose,
  onConfirm,
}: {
  instances: ManagedInstance[];
  sourceName: string;
  targetVersion: string;
  canSynchronize: boolean;
  unavailableReason: string | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const runningInstances = instances.filter((instance) => instance.status === "running");
  const eligibleInstances = instances.filter((instance) => instance.status === "stopped");
  const ready = eligibleInstances.length > 0 && canSynchronize;
  const statusLabel = (instance: ManagedInstance) => instance.status === "running"
    ? "Ejecutándose"
    : instance.status === "missing" ? "No disponible" : "Detenido";

  return (
    <ModalFrame
      title={`Sincronizar instancias desde ${sourceName} v${targetVersion}`}
      subtitle="La fuente local más reciente fue validada antes de mostrar esta acción"
      onClose={busy ? () => undefined : onClose}
    >
      <div className="app-update-summary">
        <span><RefreshIcon size={21} /></span>
        <div>
          <small>FUENTE LOCAL VALIDADA</small>
          <strong>{sourceName} · versión {targetVersion}</strong>
          <p>Se reemplazará únicamente la aplicación de cada instancia; cada perfil permanece separado.</p>
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

      {(runningInstances.length > 0 || !canSynchronize || eligibleInstances.length === 0) && (
        <div className="transfer-requirement">
          <StopIcon size={18} />
          <span>
            {!canSynchronize
              ? unavailableReason ?? "La fuente local ya no es elegible. Vuelve a escanear el sistema."
              : runningInstances.length
              ? `${runningInstances.map((instance) => `“${instance.name}”`).join(" y ")} ${runningInstances.length === 1 ? "se omitirá" : "se omitirán"} porque ${runningInstances.length === 1 ? "está ejecutándose" : "están ejecutándose"}. Detén las instancias para incluirlas en otro intento.`
              : "No hay objetivos detenidos disponibles para sincronizar."}
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
          {busy
            ? <><RefreshIcon className="spin" size={17} /> Sincronizando y verificando…</>
            : <><RefreshIcon size={17} /> Sincronizar {eligibleInstances.length === 1 ? "instancia" : `${eligibleInstances.length} instancias`}</>}
        </button>
      </div>
      {busy && <span className="update-current-instance">Cada instancia devuelve un resultado independiente</span>}
    </ModalFrame>
  );
}
