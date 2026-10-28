import { SearchIcon } from "lucide-react";
import { NoticeAlert } from "../../components/NoticeAlert";
import { Button } from "../../components/ui/button";
import { Progress } from "../../components/ui/progress";
import type { ManualScanView } from "../../lib/scan-controller";
import { cn } from "../../lib/utils";

/** El progreso y el resultado del escaneo manual: «Ocultar» aparece solo cuando termina (con éxito o con error). */
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
    <NoticeAlert
      variant={status === "error" ? "destructive" : "default"}
      role={status === "error" ? "alert" : "status"}
      aria-label={`${label} ${progress}%`}
      data-scan-generation={generation}
      data-status={status}
      icon={<SearchIcon aria-hidden="true" className={cn(status === "running" && "animate-pulse")} />}
      title={heading}
      action={
        <>
          <span className="font-mono text-xs font-semibold">{progress}%</span>
          {terminal && (
            <Button type="button" variant="ghost" size="xs" onClick={onDismiss} aria-label="Ocultar estado del escaneo">
              Ocultar
            </Button>
          )}
        </>
      }
      footer={
        <Progress
          value={progress}
          aria-label={`Progreso del escaneo: ${progress}%`}
          aria-valuenow={progress}
          className={cn(
            "h-1.5",
            status === "error" && "[&>[data-slot=progress-indicator]]:bg-destructive",
            status === "success" && "[&>[data-slot=progress-indicator]]:bg-success",
          )}
        />
      }
    >
      {error ?? label}
    </NoticeAlert>
  );
}
