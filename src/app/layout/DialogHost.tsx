import { AppearanceDialog, useAppearance } from "../../features/appearance";
import { originalAppName as selectOriginalAppName, useDashboard, useRuntimePlatform } from "../../features/dashboard";
import { DeleteInstanceDialog, InstanceEditor, useInstanceActions } from "../../features/instances";
import {
  SessionTransferDialog,
  UnlinkSessionDialog,
  useSessionActions,
  useTransferProfiles,
} from "../../features/sessions";
import { ApplicationUpdateDialog, OriginalApplicationUpdateDialog, useUpdateActions } from "../../features/updates";
import { useDialogs } from "../providers/dialogs-context";

/**
 * Los siete diálogos, montados con su bandera de `useDialogs()` y en este orden: apariencia, editor, borrar, transferir,
 * desvincular, sincronizar y original. Son `Dialog` y `AlertDialog` del catálogo (HU-0016, A-12): su portal cuelga de
 * `body` y toma el tema de `<html>` (A-3). Cada uno recibe su `busy`, que guarda Escape, la X y el clic fuera.
 */
export function DialogHost() {
  const { dashboard: state, busy, error } = useDashboard();
  const { preferences: appearance, setPreferences: setAppearance } = useAppearance();
  const {
    appearanceOpen,
    setAppearanceOpen,
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
  } = useDialogs();
  const runtimePlatform = useRuntimePlatform();
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
      {appearanceOpen && (
        <AppearanceDialog
          preferences={appearance}
          onChange={setAppearance}
          onClose={() => setAppearanceOpen(false)}
        />
      )}

      {editor && (
        <InstanceEditor
          instance={editorInstance}
          sourcePath={state.system.sourcePath}
          platform={runtimePlatform}
          busy={busy === "create" || busy === "update"}
          iconBusy={editorInstance !== null && busy === `icon:${editorInstance.id}`}
          actionError={error}
          onClose={() => setEditor(null)}
          onRetryIcon={() => editorInstance ? instanceActions.reapplyIcon(editorInstance) : Promise.resolve()}
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
    </>
  );
}
