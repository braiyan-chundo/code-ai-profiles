import { DownloadIcon, SparklesIcon, TriangleAlertIcon } from "lucide-react";
import { NoticeAlert } from "../../components/NoticeAlert";
import { Button } from "../../components/ui/button";
import { Spinner } from "../../components/ui/spinner";
import { sourceUpdatePresentation } from "../../lib/source-update-controller";
import { originalAppName as selectOriginalAppName, useDashboard } from "../dashboard";
import { originalInstallAvailability } from "./original-install";
import { useUpdateActions } from "./useUpdateActions";

/**
 * Aviso de la actualización oficial de la aplicación original (disponible o incierta). Con una versión disponible en
 * macOS, la única acción es «Instalar» (HU-0017), sin abrir la original. Fuera de macOS, «Ver actualización» abre el
 * canal oficial de la plataforma (`onUpdate`). Si el estado es incierto, «Comprobar actualización» consulta la
 * publicación oficial desde la app, con «Buscando…» mientras tanto, en todas las plataformas.
 */
export function SourceUpdateBanner({ onUpdate }: { onUpdate: () => void }) {
  const { dashboard: state, loading, busy } = useDashboard();
  const { installOriginal, checkOriginalUpdate } = useUpdateActions();
  const appName = selectOriginalAppName(state.system);
  const install = originalInstallAvailability(state.system, busy);
  const officialUpdate = sourceUpdatePresentation(
    state.system.sourceUpdate,
    state.system.versionTopology,
    appName,
    state.system.sourceVersion,
    install.visible,
  );
  if (loading || !state.system.sourcePath || !officialUpdate) return null;
  const canInstall = officialUpdate.kind === "available" && install.visible;
  const checking = busy === "check-original-update";
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
          <Button size="sm" onClick={() => void installOriginal()} disabled={install.disabled}>
            <DownloadIcon /> Instalar
          </Button>
        ) : officialUpdate.kind === "available" ? (
          <Button variant="outline" size="sm" onClick={onUpdate} disabled={busy !== null || !state.system.sourcePath}>
            {officialUpdate.actionLabel}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void checkOriginalUpdate()}
            disabled={busy !== null}
            aria-busy={checking}
            className="min-w-48"
          >
            {checking ? <><Spinner aria-hidden="true" /> Buscando…</> : officialUpdate.actionLabel}
          </Button>
        )
      }
    >
      {canInstall && install.disabledReason
        ? `${officialUpdate.detail} ${install.disabledReason}`
        : officialUpdate.detail}
    </NoticeAlert>
  );
}
