import { EmptyState } from "../../../components/EmptyState";
import { originalAppName as selectOriginalAppName, useDashboard, useRuntimePlatform } from "../../../features/dashboard";
import { OriginalDetail } from "../../../features/original-app";
import { useScan } from "../../../features/scan";
import { useTransferProfiles } from "../../../features/sessions";
import { originalInstallAvailability, SourceUpdateBanner, useUpdateActions } from "../../../features/updates";
import { useDialogs } from "../../providers/dialogs-context";
import { PageContent } from "../../layout/PageContent";
import { PageHeader } from "../../layout/PageHeader";
import { PageSkeleton } from "../../layout/PageSkeleton";

/**
 * `#/original` (HU-0016, A-9 y A-10). Sin aplicación detectada muestra el vacío con el escaneo; no redirige.
 * El error, el aviso y el escaneo los pinta `FeedbackArea`, en el layout (A-10).
 */
export function OriginalRoute() {
  const { dashboard: state, loading, busy, clearFeedback } = useDashboard();
  const { requestManual: scanManually } = useScan();
  const { setTransfer, setUnlinkTarget, setOriginalUpdateOpen } = useDialogs();
  const runtimePlatform = useRuntimePlatform();
  const transferProfiles = useTransferProfiles();
  const { installOriginal } = useUpdateActions();
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
        {sourcePath ? (
          <div className="mx-auto grid w-full max-w-[1200px] gap-4">
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
              install={originalInstallAvailability(state.system, busy)}
              onInstall={() => void installOriginal()}
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
          </div>
        ) : loading ? (
          <PageSkeleton rows={2} />
        ) : (
          <EmptyState searching={false} sourceFound={false} onCreate={() => undefined} onClear={() => undefined} onScan={scanManually} />
        )}
      </PageContent>
    </>
  );
}
