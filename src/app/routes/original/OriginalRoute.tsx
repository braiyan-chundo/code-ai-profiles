import { EmptyState } from "../../../components/EmptyState";
import { originalAppName as selectOriginalAppName, useDashboard, useRuntimePlatform } from "../../../features/dashboard";
import { OriginalDetail } from "../../../features/original-app";
import { useScan } from "../../../features/scan";
import { useTransferProfiles } from "../../../features/sessions";
import { SourceUpdateBanner } from "../../../features/updates";
import { useDialogs } from "../../providers/dialogs-context";
import { PageFeedback } from "../../layout/PageFeedback";
import { PageContent } from "../../layout/PageContent";
import { PageHeader } from "../../layout/PageHeader";
import { PageSkeleton } from "../../layout/PageSkeleton";

/**
 * `#/original` (HU-0016, A-9 y A-10). Sin aplicación detectada muestra el vacío con el escaneo; no redirige.
 * TEMPORAL (paso 5): el feedback va dentro de la página hasta que `FeedbackArea` lo suba al layout (A-10).
 */
export function OriginalRoute() {
  const { dashboard: state, loading, busy, clearFeedback } = useDashboard();
  const { requestManual: scanManually } = useScan();
  const { setTransfer, setUnlinkTarget, setOriginalUpdateOpen } = useDialogs();
  const runtimePlatform = useRuntimePlatform();
  const transferProfiles = useTransferProfiles();
  const appName = selectOriginalAppName(state.system);
  const sourcePath = state.system.sourcePath;
  const openOriginalUpdate = () => {
    clearFeedback();
    setOriginalUpdateOpen(true);
  };

  return (
    <>
      <PageHeader eyebrow="Aplicación original" title={sourcePath ? appName : "Aplicación original"} />
      <PageContent aria-live="polite" aria-busy={loading}>
        <PageFeedback />
        {sourcePath ? (
          <>
            <SourceUpdateBanner onUpdate={openOriginalUpdate} />
            <OriginalDetail
              appName={appName}
              appPath={sourcePath}
              platform={runtimePlatform}
              profilePath={state.system.originalProfilePath}
              version={state.system.sourceVersion}
              status={state.system.originalStatus}
              sessions={state.system.originalCodeSessions}
              busy={busy !== null}
              onUpdate={openOriginalUpdate}
              onTransfer={(session) => {
                clearFeedback();
                setTransfer({ source: transferProfiles[0], session });
              }}
              onUnlink={(session) => {
                clearFeedback();
                setUnlinkTarget({ instance: transferProfiles[0], session });
              }}
            />
          </>
        ) : loading ? (
          <PageSkeleton rows={2} />
        ) : (
          <EmptyState searching={false} sourceFound={false} onCreate={() => undefined} onClear={() => undefined} onScan={scanManually} />
        )}
      </PageContent>
    </>
  );
}
