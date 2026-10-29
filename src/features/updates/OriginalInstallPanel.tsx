import { DownloadIcon } from "lucide-react";
import { NoticeAlert } from "../../components/NoticeAlert";
import { Button } from "../../components/ui/button";
import { Progress } from "../../components/ui/progress";
import { cn } from "../../lib/utils";
import { originalAppName, useDashboard } from "../dashboard";
import { installPhaseLabel, installProgressPercent } from "./original-install";
import { useUpdateActions } from "./useUpdateActions";

/**
 * El avance de «Descargar e instalar» (HU-0017, A-10): la fase, la barra (medida al descargar, indeterminada en el
 * resto) y «Cancelar» mientras se puede. Se monta en `FeedbackArea`, así que se ve en cualquier página.
 */
export function OriginalInstallPanel() {
  const { dashboard, originalInstall } = useDashboard();
  const { cancelInstall } = useUpdateActions();
  if (!originalInstall) return null;
  const label = installPhaseLabel(originalInstall, originalAppName(dashboard.system));
  const percent = installProgressPercent(originalInstall);
  return (
    <NoticeAlert
      role="status"
      aria-label={label}
      data-phase={originalInstall.phase}
      icon={<DownloadIcon aria-hidden="true" className="text-primary-text" />}
      title="Actualizando la aplicación original"
      action={
        <>
          {percent !== null && <span className="font-mono text-xs font-semibold">{percent}%</span>}
          {originalInstall.cancellable && (
            <Button type="button" variant="outline" size="sm" onClick={() => void cancelInstall()}>
              Cancelar
            </Button>
          )}
        </>
      }
      footer={
        <Progress
          value={percent ?? 100}
          aria-label={percent === null ? "Progreso de la instalación" : `Progreso de la descarga: ${percent}%`}
          aria-valuenow={percent ?? undefined}
          aria-valuetext={label}
          className={cn("h-1.5", percent === null && "[&>[data-slot=progress-indicator]]:animate-pulse")}
        />
      }
    >
      {label}
    </NoticeAlert>
  );
}
