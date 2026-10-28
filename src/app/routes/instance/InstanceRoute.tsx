import { useMemo } from "react";
import { Navigate, useParams } from "react-router";
import { LoadingCards } from "../../../components/LoadingCards";
import {
  findInstance,
  outdatedInstances as selectOutdatedInstances,
  useDashboard,
  useRuntimePlatform,
} from "../../../features/dashboard";
import { InstanceCard, useInstanceActions } from "../../../features/instances";
import { useDialogs } from "../../providers/dialogs-context";
import { PageFeedback } from "../../layout/PageFeedback";
import { PageHeader } from "../../layout/PageHeader";

/**
 * `#/instancias/<id>` (HU-0016, A-9). Un id que no está (desconocido, borrado desde aquí o desaparecido en un refresco)
 * vuelve al dashboard; mientras carga, un esqueleto. TEMPORAL (paso 2): pinta la `InstanceCard` heredada; en el paso 3
 * la sustituye `InstanceDetail`.
 */
export function InstanceRoute() {
  const { instanceId } = useParams();
  const { dashboard: state, loading, busy, iconPreviews, clearFeedback } = useDashboard();
  const { setEditor, setDeleteTarget, setTransfer, setUnlinkTarget } = useDialogs();
  const runtimePlatform = useRuntimePlatform();
  const instanceActions = useInstanceActions();
  const instance = findInstance(state.instances, instanceId);
  const outdatedInstances = useMemo(
    () => selectOutdatedInstances(state.instances, state.system.versionTopology.staleInstanceIds),
    [state.instances, state.system.versionTopology.staleInstanceIds],
  );

  if (!instance) {
    if (!loading) return <Navigate to="/" replace />;
    return (
      <>
        <PageHeader eyebrow="Instancia" title="Cargando…" />
        <section className="content" aria-busy="true"><LoadingCards /></section>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Instancia" title={instance.name} />
      <section className="content" aria-live="polite">
        <PageFeedback />
        <InstanceCard
          instance={instance}
          platform={runtimePlatform}
          busy={busy}
          updateAvailable={outdatedInstances.some((outdated) => outdated.id === instance.id)}
          iconPreviewUrl={iconPreviews[instance.id] ?? null}
          autoExpand
          onLaunch={() => instanceActions.launch(instance)}
          onStop={() => instanceActions.stop(instance)}
          onOpen={() => instanceActions.openFolder(instance)}
          onEdit={() => setEditor(instance)}
          onDelete={() => setDeleteTarget(instance)}
          onTransfer={(session) => {
            clearFeedback();
            setTransfer({ source: instance, session });
          }}
          onUnlink={(session) => {
            clearFeedback();
            setUnlinkTarget({ instance, session });
          }}
        />
      </section>
    </>
  );
}
