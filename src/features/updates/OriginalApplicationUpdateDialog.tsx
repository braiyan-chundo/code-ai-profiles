import type { DashboardState } from "../../types";
import { HardDriveIcon, RefreshIcon, SparklesIcon } from "../../components/Icons";
import { ModalFrame } from "../../components/ModalFrame";
import { originalUpdateChannel } from "./original-update-channel";

export function OriginalApplicationUpdateDialog({
  appName,
  platform,
  version,
  busy,
  onClose,
  onConfirm,
}: {
  appName: string;
  platform: DashboardState["system"]["platform"];
  version: string | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const platformDetails = originalUpdateChannel(platform, appName);

  return (
    <ModalFrame
      title={`Actualizar ${appName}`}
      subtitle={`Versión actual ${version ?? "no disponible"} · ${platformDetails.label}`}
      onClose={busy ? () => undefined : onClose}
      closeDisabled={busy}
    >
      <div className="original-update-summary">
        <span><RefreshIcon size={21} /></span>
        <div>
          <small>CANAL OFICIAL</small>
          <strong>{platformDetails.channel}</strong>
          <p>{platformDetails.handoff}</p>
        </div>
      </div>

      <div className="original-update-boundary">
        <HardDriveIcon size={19} />
        <div>
          <strong>Tus perfiles y sesiones no se tocan</strong>
        <p>Esta acción no escribe ni sustituye instancias administradas. Solo entrega la original al actualizador, descarga o documentación oficial de la plataforma.</p>
        </div>
      </div>

      <div className="original-update-next-step">
        <SparklesIcon size={18} />
        <p>Cuando vuelvas a esta ventana, se refrescarán únicamente las versiones y su topología. No se iniciará un escaneo manual ni se consultarán sesiones.</p>
      </div>

      <div className="modal-actions original-update-actions">
        <button className="secondary-button" onClick={onClose} disabled={busy}>Cancelar</button>
        <button className="primary-action modal-primary" onClick={() => void onConfirm()} disabled={busy}>
          {busy
            ? <><RefreshIcon className="spin" size={17} /> Abriendo canal oficial…</>
            : <><RefreshIcon size={17} /> {platformDetails.action}</>}
        </button>
      </div>
    </ModalFrame>
  );
}
