import { DownloadIcon, SparklesIcon, TriangleAlertIcon } from "lucide-react";
import { NoticeAlert } from "../../components/NoticeAlert";
import { Button } from "../../components/ui/button";
import { sourceUpdatePresentation } from "../../lib/source-update-controller";
import { originalAppName as selectOriginalAppName, useDashboard } from "../dashboard";
import { originalInstallAvailability } from "./original-install";
import { useUpdateActions } from "./useUpdateActions";

/**
 * Aviso de la actualización oficial de la aplicación original (disponible o incierta). En macOS, con una versión
 * disponible, la acción principal es «Descargar e instalar» (sin diálogo de confirmación) y «Abrir {app}» pasa a ser la
 * secundaria, con el handoff de siempre; en el resto, una sola acción como antes (HU-0017, A-10).
 */
export function SourceUpdateBanner({ onUpdate }: { onUpdate: () => void }) {
  const { dashboard: state, loading, busy } = useDashboard();
  const { installOriginal } = useUpdateActions();
  const appName = selectOriginalAppName(state.system);
  const officialUpdate = sourceUpdatePresentation(state.system.sourceUpdate, state.system.versionTopology, appName);
  if (loading || !state.system.sourcePath || !officialUpdate) return null;
  const install = officialUpdate.kind === "available" ? originalInstallAvailability(state.system, busy) : null;
  const canInstall = install?.visible === true;
  return (
    <NoticeAlert
      role="status"
      data-kind={officialUpdate.kind}
      icon={
        officialUpdate.kind === "available" ? (
          <SparklesIcon aria-hidden="true" className="text-primary-text" />
        ) : (
          <TriangleAlertIcon aria-hidden="true" className="text-warning" />
        )
      }
      title={officialUpdate.title}
      action={
        canInstall ? (
          <>
            <Button variant="outline" size="sm" onClick={onUpdate} disabled={busy !== null}>
              Abrir {appName}
            </Button>
            <Button size="sm" onClick={() => void installOriginal()} disabled={install.disabled}>
              <DownloadIcon /> Descargar e instalar
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={onUpdate} disabled={busy !== null || !state.system.sourcePath}>
            {officialUpdate.actionLabel}
          </Button>
        )
      }
    >
      {canInstall
        ? `Instalada ${state.system.sourceVersion ?? "—"} · disponible ${state.system.sourceUpdate.latestVersion}.${
            install.disabledReason ? ` ${install.disabledReason}` : ""
          }`
        : officialUpdate.detail}
    </NoticeAlert>
  );
}
