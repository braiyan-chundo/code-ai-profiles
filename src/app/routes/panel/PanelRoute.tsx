import { useMemo, useState } from "react";
import { EmptyState } from "../../../components/EmptyState";
import { LoadingCards } from "../../../components/LoadingCards";
import {
  FeedbackBanners,
  filterInstances,
  matchesOriginalApp,
  originalAppName as selectOriginalAppName,
  outdatedInstances as selectOutdatedInstances,
  useDashboard,
  useRuntimePlatform,
} from "../../../features/dashboard";
import { ManagedInstancesSection } from "../../../features/instances";
import { OriginalAppSection } from "../../../features/original-app";
import { ScanProgressPanel, useScan } from "../../../features/scan";
import { useTransferProfiles } from "../../../features/sessions";
import { SourceUpdateBanner, SynchronizeBanner } from "../../../features/updates";
import { useDialogs } from "../../providers/dialogs-context";
import { Toolbar } from "./Toolbar";

/** La pantalla `/`: su barra (fila 2) y su contenido (fila 3), sin envoltorio. */
export function PanelRoute() {
  const { dashboard: state, loading, busy, clearFeedback } = useDashboard();
  const { progress: scanProgress, requestManual: scanManually, dismiss: dismissScan } = useScan();
  const { setEditor, setDeleteTarget, setTransfer, setUnlinkTarget, setUpdateTargets, setOriginalUpdateOpen } = useDialogs();
  const runtimePlatform = useRuntimePlatform();
  const transferProfiles = useTransferProfiles();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => filterInstances(state.instances, query), [query, state.instances]);
  const originalAppName = selectOriginalAppName(state.system);
  const showOriginal = useMemo(
    () => matchesOriginalApp(state.system, originalAppName, query),
    // Las mismas dependencias que antes: solo los campos de `system` que lee el filtro.
    [originalAppName, query, state.system.originalCodeSessions, state.system.originalProfilePath, state.system.sourcePath],
  );
  const outdatedInstances = useMemo(
    () => selectOutdatedInstances(state.instances, state.system.versionTopology.staleInstanceIds),
    [state.instances, state.system.versionTopology.staleInstanceIds],
  );

  return (
    <>
      <Toolbar query={query} setQuery={setQuery} />

      <section className={`content ${scanProgress?.status === "waiting" || scanProgress?.status === "running" ? "is-scanning" : ""}`} aria-live="polite">
        {scanProgress && (
          <ScanProgressPanel
            {...scanProgress}
            onDismiss={() => dismissScan(scanProgress.generation)}
          />
        )}
        <SourceUpdateBanner
          onUpdate={() => {
            clearFeedback();
            setOriginalUpdateOpen(true);
          }}
        />
        <SynchronizeBanner
          outdatedInstances={outdatedInstances}
          onSynchronize={() => {
            clearFeedback();
            setUpdateTargets(outdatedInstances);
          }}
        />
        <FeedbackBanners />

        {loading ? (
          <LoadingCards />
        ) : showOriginal || filtered.length ? (
          <div className="dashboard-sections">
            {showOriginal && (
              <OriginalAppSection
                appName={originalAppName}
                appPath={state.system.sourcePath!}
                platform={runtimePlatform}
                profilePath={state.system.originalProfilePath}
                version={state.system.sourceVersion}
                status={state.system.originalStatus}
                sessions={state.system.originalCodeSessions}
                autoExpand={Boolean(query)}
                busy={busy !== null}
                onUpdate={() => {
                  clearFeedback();
                  setOriginalUpdateOpen(true);
                }}
                onTransfer={(session) => {
                  clearFeedback();
                  setTransfer({ source: transferProfiles[0], session });
                }}
                onUnlink={(session) => {
                  clearFeedback();
                  setUnlinkTarget({ instance: transferProfiles[0], session });
                }}
              />
            )}
            {filtered.length > 0 && (
              <ManagedInstancesSection
                instances={filtered}
                outdatedInstances={outdatedInstances}
                platform={runtimePlatform}
                autoExpand={Boolean(query)}
                onEdit={(instance) => setEditor(instance)}
                onDelete={(instance) => setDeleteTarget(instance)}
                onTransfer={(instance, session) => {
                  clearFeedback();
                  setTransfer({ source: instance, session });
                }}
                onUnlink={(instance, session) => {
                  clearFeedback();
                  setUnlinkTarget({ instance, session });
                }}
              />
            )}
          </div>
        ) : (
          <EmptyState
            searching={Boolean(query)}
            sourceFound={Boolean(state.system.sourcePath)}
            onCreate={() => setEditor("new")}
            onClear={() => setQuery("")}
            onScan={scanManually}
          />
        )}
      </section>
    </>
  );
}
