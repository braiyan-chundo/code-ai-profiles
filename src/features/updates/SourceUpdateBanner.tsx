import { SparklesIcon, TriangleAlertIcon } from "lucide-react";
import { NoticeAlert } from "../../components/NoticeAlert";
import { Button } from "../../components/ui/button";
import { sourceUpdatePresentation } from "../../lib/source-update-controller";
import { originalAppName as selectOriginalAppName, useDashboard } from "../dashboard";

/** Aviso de la actualización oficial de la aplicación original (disponible o incierta). */
export function SourceUpdateBanner({ onUpdate }: { onUpdate: () => void }) {
  const { dashboard: state, loading, busy } = useDashboard();
  const officialUpdate = sourceUpdatePresentation(
    state.system.sourceUpdate,
    state.system.versionTopology,
    selectOriginalAppName(state.system),
  );
  if (loading || !state.system.sourcePath || !officialUpdate) return null;
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
        <Button variant="outline" size="sm" onClick={onUpdate} disabled={busy !== null || !state.system.sourcePath}>
          {officialUpdate.actionLabel}
        </Button>
      }
    >
      {officialUpdate.detail}
    </NoticeAlert>
  );
}
