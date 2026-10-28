import { EmptyState } from "../../../components/EmptyState";
import { LoadingCards } from "../../../components/LoadingCards";
import { originalAppName as selectOriginalAppName, useDashboard, useRuntimePlatform } from "../../../features/dashboard";
import { OriginalAppSection } from "../../../features/original-app";
import { useScan } from "../../../features/scan";
import { useTransferProfiles } from "../../../features/sessions";
import { SourceUpdateBanner } from "../../../features/updates";
import { useDialogs } from "../../providers/dialogs-context";
import { PageFeedback } from "../../layout/PageFeedback";
import { PageHeader } from "../../layout/PageHeader";

/**
 * `#/original` (HU-0016, A-9 y A-10). Sin aplicación detectada muestra el vacío con el escaneo; no redirige.
 * TEMPORAL (paso 2): pinta la `OriginalAppSection` heredada; en el paso 4 la sustituye `OriginalDetail`.
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
      <section className="content" aria-live="polite" aria-busy={loading}>
        <PageFeedback />
        {sourcePath ? (
          <>
            <SourceUpdateBanner onUpdate={openOriginalUpdate} />
            <OriginalAppSection
              appName={appName}
              appPath={sourcePath}
              platform={runtimePlatform}
              profilePath={state.system.originalProfilePath}
              version={state.system.sourceVersion}
              status={state.system.originalStatus}
              sessions={state.system.originalCodeSessions}
              autoExpand
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
          <LoadingCards />
        ) : (
          <EmptyState searching={false} sourceFound={false} onCreate={() => undefined} onClear={() => undefined} onScan={scanManually} />
        )}
      </section>
    </>
  );
}
