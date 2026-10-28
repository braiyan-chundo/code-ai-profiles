import { PlusIcon, RefreshCwIcon } from "lucide-react";
import { useMemo } from "react";
import { EmptyState } from "../../../components/EmptyState";
import { Button } from "../../../components/ui/button";
import { outdatedInstances as selectOutdatedInstances, useDashboard } from "../../../features/dashboard";
import { useScan } from "../../../features/scan";
import { SourceUpdateBanner, SynchronizeBanner } from "../../../features/updates";
import { PageContent } from "../../layout/PageContent";
import { PageHeader } from "../../layout/PageHeader";
import { PageSkeleton } from "../../layout/PageSkeleton";
import { useDialogs } from "../../providers/dialogs-context";
import { SummaryCards } from "./SummaryCards";
import { UsageRanking } from "./UsageRanking";

const NO_SOURCE_TITLE = "Instala una aplicación compatible o configura una ruta válida";

/**
 * `#/` (HU-0016, AC-02): el resumen global. Los avisos de actualización oficial y de sincronización, las cifras, el
 * uso por instancia y los accesos «Nueva instancia» y «Escanear sistema». El error, el aviso y el escaneo los pinta
 * `FeedbackArea`, en el layout (A-10). No tiene búsqueda: el resumen es global (A-15).
 */
export function DashboardRoute() {
  const { dashboard: state, loading, busy, clearFeedback } = useDashboard();
  const { requestManual: scanManually } = useScan();
  const { setEditor, setUpdateTargets, setOriginalUpdateOpen } = useDialogs();
  const sourceFound = Boolean(state.system.sourcePath);
  const outdatedInstances = useMemo(
    () => selectOutdatedInstances(state.instances, state.system.versionTopology.staleInstanceIds),
    [state.instances, state.system.versionTopology.staleInstanceIds],
  );

  return (
    <>
      <PageHeader eyebrow="Resumen" title="Dashboard">
        <Button variant="outline" size="lg" onClick={scanManually} disabled={loading || busy !== null} className="px-3.5">
          <RefreshCwIcon className={busy === "scan" ? "animate-spin" : undefined} /> Escanear sistema
        </Button>
        {/* El title va en el contenedor: un botón deshabilitado no recibe el puntero (AC-06: la razón sigue visible). */}
        <span title={!sourceFound ? NO_SOURCE_TITLE : undefined}>
          <Button size="lg" onClick={() => setEditor("new")} disabled={!sourceFound || busy !== null} className="px-3.5">
            <PlusIcon /> Nueva instancia
          </Button>
        </span>
      </PageHeader>
      <PageContent aria-busy={loading}>
        {loading ? (
          <PageSkeleton />
        ) : (
          <div className="mx-auto grid w-full max-w-[1200px] gap-4">
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
            <SummaryCards />
            {state.instances.length > 0 ? (
              <UsageRanking />
            ) : (
              <EmptyState
                searching={false}
                sourceFound={sourceFound}
                onCreate={() => setEditor("new")}
                onClear={() => undefined}
                onScan={scanManually}
              />
            )}
          </div>
        )}
      </PageContent>
    </>
  );
}
