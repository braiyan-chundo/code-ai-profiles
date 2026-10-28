import { AlertIcon, SparklesIcon } from "../../components/Icons";
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
    <div className={`source-update-banner source-update-${officialUpdate.kind}`}>
      <span className="update-banner-icon">
        {officialUpdate.kind === "available" ? <SparklesIcon size={17} /> : <AlertIcon size={17} />}
      </span>
      <div>
        <strong>{officialUpdate.title}</strong>
        <span>{officialUpdate.detail}</span>
      </div>
      <button
        onClick={onUpdate}
        disabled={busy !== null || !state.system.sourcePath}
      >
        {officialUpdate.actionLabel}
      </button>
    </div>
  );
}
