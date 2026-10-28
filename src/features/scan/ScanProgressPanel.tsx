import type { ManualScanView } from "../../lib/scan-controller";
import { SearchIcon } from "../../components/Icons";

export function ScanProgressPanel({
  generation,
  status,
  progress,
  label,
  error,
  onDismiss,
}: ManualScanView & { onDismiss: () => void }) {
  const terminal = status === "success" || status === "error";
  const heading = status === "waiting"
    ? "Escaneo manual en espera"
    : status === "success"
      ? "Escaneo completado"
      : status === "error"
        ? "Escaneo incompleto"
        : "Escaneando sistema";
  return (
    <div
      className={`scan-progress-panel is-${status}`}
      role={status === "error" ? "alert" : "status"}
      aria-label={`${label} ${progress}%`}
      data-scan-generation={generation}
    >
      <div className="scan-progress-heading">
        <div className="scan-progress-copy">
          <span className="scan-radar"><SearchIcon size={17} /></span>
          <div>
            <strong>{heading}</strong>
            <span>{error ?? label}</span>
          </div>
        </div>
        <div className="scan-progress-actions">
          <span className="scan-percentage">{progress}%</span>
          {terminal && (
            <button type="button" onClick={onDismiss} aria-label="Ocultar estado del escaneo">
              Ocultar
            </button>
          )}
        </div>
      </div>
      <div className="scan-progress-track">
        <span style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
