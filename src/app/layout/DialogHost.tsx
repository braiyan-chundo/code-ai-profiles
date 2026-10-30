import { Suspense, useEffect } from "react";
import { useNavigate } from "react-router";
import { originalAppName as selectOriginalAppName, useDashboard, useRuntimePlatform } from "../../features/dashboard";
import { DeleteInstanceDialog, InstanceEditor, useInstanceActions } from "../../features/instances";
import {
  SessionTransferDialog,
  UnlinkSessionDialog,
  useSessionActions,
  useTransferProfiles,
} from "../../features/sessions";
import {
  findProject,
  HistoryReader,
  IncompleteDataDialog,
  isReadable,
  PinProjectDialog,
  usePinProject,
  useProjects,
} from "../../features/projects";
import { ApplicationUpdateDialog, OriginalApplicationUpdateDialog, useUpdateActions } from "../../features/updates";
import { useDialogs } from "../providers/dialogs-context";

/**
 * Los ocho diálogos, montados con su bandera de `useDialogs()` y en este orden: editor, borrar, transferir,
 * desvincular, sincronizar, original, anclar proyecto (HU-0023) y el de un proyecto (HU-0025): sus datos incompletos o el
 * lector de una historia, de carga diferida. Sin un proyecto legible (o sin esa historia) no se pinta y se limpia la bandera. Son `Dialog` y `AlertDialog` del catálogo (HU-0016, A-12): su portal cuelga de
 * `body` y toma el tema de `<html>` (A-3). Cada uno recibe su `busy`, que guarda Escape, la X y el clic fuera.
 */
export function DialogHost() {
  const { dashboard: state, busy } = useDashboard();
  const {
    editor,
    setEditor,
    deleteTarget,
    setDeleteTarget,
    transfer,
    setTransfer,
    unlinkTarget,
    setUnlinkTarget,
    updateTargets,
    setUpdateTargets,
    originalUpdateOpen,
    setOriginalUpdateOpen,
    pinCandidate,
    setPinCandidate,
    projectDialog,
    setProjectDialog,
  } = useDialogs();
  const pinProject = usePinProject();
  const { projects, status: projectsStatus } = useProjects();
  const dialogProject = projectDialog ? findProject(projects, projectDialog.projectId) : undefined;
  const readableProject = dialogProject && isReadable(dialogProject) ? dialogProject : null;
  const readerHistory = projectDialog?.kind === "reader"
    ? readableProject?.info.histories.find((history) => history.folder === projectDialog.folder) ?? null
    : null;
  const projectDialogValid = Boolean(
    projectDialog && readableProject && (projectDialog.kind === "incomplete" || readerHistory),
  );
  // Un proyecto desanclado o una historia que ya no está al releer: se cierra en vez de dejar una bandera huérfana.
  // Mientras la lista aún carga no se limpia: el proyecto puede estar por llegar.
  const projectsLoaded = projectsStatus === "ready";
  useEffect(() => {
    if (projectDialog && projectsLoaded && !projectDialogValid) setProjectDialog(null);
  }, [projectDialog, projectDialogValid, projectsLoaded, setProjectDialog]);
  const runtimePlatform = useRuntimePlatform();
  const navigate = useNavigate();
  const transferProfiles = useTransferProfiles();
  const instanceActions = useInstanceActions();
  const sessionActions = useSessionActions();
  const updateActions = useUpdateActions();
  // `editor` es una instantánea: el editor lee la instancia fresca para ver el resultado de «Reintentar» (HU-0020).
  const editorInstance = editor && editor !== "new"
    ? state.instances.find((item) => item.id === editor.id) ?? editor
    : null;
  const originalAppName = selectOriginalAppName(state.system);
  const latestSource = state.system.versionTopology.latestSource;
  const latestVersion = state.system.versionTopology.latestInstalledVersion;

  return (
    <>
      {editor && (
        <InstanceEditor
          instance={editorInstance}
          sourcePath={state.system.sourcePath}
          platform={runtimePlatform}
          busy={busy === "create" || busy === "update"}
          iconBusy={editorInstance !== null && busy === `icon:${editorInstance.id}`}
          onClose={() => setEditor(null)}
          // D-4: el editor solo llama a esto sin cambios sin guardar ni operaciones en curso.
          onOpenPermissions={() => {
            setEditor(null);
            navigate("/configuracion/permisos");
          }}
          onRetryIcon={() => editorInstance ? instanceActions.reapplyIcon(editorInstance) : Promise.resolve(null)}
          onSave={(form, iconChange) => instanceActions.save(editor, form, iconChange, () => setEditor(null))}
        />
      )}

      {deleteTarget && (
        <DeleteInstanceDialog
          instance={deleteTarget}
          busy={busy === `delete:${deleteTarget.id}`}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => instanceActions.remove(deleteTarget, () => setDeleteTarget(null))}
        />
      )}

      {transfer && (
        <SessionTransferDialog
          key={`${transfer.source.id}:${transfer.session.id}`}
          source={transfer.source}
          session={transfer.session}
          instances={transferProfiles}
          busy={busy === `transfer:${transfer.session.id}`}
          onClose={() => setTransfer(null)}
          onTransfer={(targetId, mode, includeLocalArtifacts) => sessionActions.transfer(
            transfer,
            transferProfiles,
            targetId,
            mode,
            includeLocalArtifacts,
            () => setTransfer(null),
          )}
        />
      )}

      {unlinkTarget?.session.transfer && (
        <UnlinkSessionDialog
          selection={unlinkTarget}
          transferInfo={unlinkTarget.session.transfer}
          profiles={transferProfiles}
          busy={busy === `unlink:${unlinkTarget.session.id}`}
          onCancel={() => setUnlinkTarget(null)}
          onConfirm={(copy) => sessionActions.unlink(unlinkTarget, copy, () => setUnlinkTarget(null))}
        />
      )}

      {updateTargets && latestSource && latestVersion && (
        <ApplicationUpdateDialog
          instances={updateTargets}
          sourceName={latestSource.name}
          targetVersion={latestVersion}
          canSynchronize={state.system.versionTopology.canSynchronizeManaged}
          unavailableReason={state.system.versionTopology.reason}
          busy={busy === "update-applications"}
          onClose={() => setUpdateTargets(null)}
          onConfirm={() => updateActions.synchronize(updateTargets, latestSource, () => setUpdateTargets(null))}
        />
      )}

      {originalUpdateOpen && state.system.sourcePath && (
        <OriginalApplicationUpdateDialog
          appName={originalAppName}
          platform={runtimePlatform}
          version={state.system.sourceVersion}
          busy={busy === "update-original"}
          onClose={() => setOriginalUpdateOpen(false)}
          onConfirm={() => updateActions.updateOriginal(() => setOriginalUpdateOpen(false))}
        />
      )}

      {pinCandidate && (
        <Suspense fallback={null}>
          <PinProjectDialog
            candidate={pinCandidate}
            pinning={pinProject.pinning}
            picking={pinProject.picking}
            error={pinProject.pinError}
            onClose={() => {
              pinProject.clearPinError();
              setPinCandidate(null);
            }}
            onPickAnother={async () => {
              pinProject.clearPinError();
              const result = await pinProject.pickFolder();
              if (result.status === "picked") setPinCandidate(result.candidate);
              else if (result.status === "failed") {
                setPinCandidate(null);
                navigate("/proyectos");
              }
            }}
            onPin={async () => {
              const project = await pinProject.pinFolder(pinCandidate.path);
              if (project) {
                setPinCandidate(null);
                navigate("/proyectos");
              }
            }}
            onView={(id) => {
              pinProject.clearPinError();
              setPinCandidate(null);
              navigate(`/proyectos/${encodeURIComponent(id)}`);
            }}
          />
        </Suspense>
      )}

      {projectDialog && readableProject && (
        <Suspense fallback={null}>
          {projectDialog.kind === "incomplete" ? (
            <IncompleteDataDialog project={readableProject} onClose={() => setProjectDialog(null)} />
          ) : readerHistory ? (
            <HistoryReader
              key={`${projectDialog.projectId}:${projectDialog.folder}`}
              projectId={projectDialog.projectId}
              history={readerHistory}
              onClose={() => setProjectDialog(null)}
            />
          ) : null}
        </Suspense>
      )}
    </>
  );
}
