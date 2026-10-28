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
 * Los diálogos, dentro de `.desktop-shell` y después de `<main>` (`.theme-light .modal-backdrop` lo necesita), en
 * este orden: apariencia, editor, borrar, transferir, desvincular, sincronizar y original.
 */
export function DialogHost() {
  const { dashboard: state, busy } = useDashboard();
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
          instance={editor === "new" ? null : editor}
          sourcePath={state.system.sourcePath}
          platform={runtimePlatform}
          busy={busy === "create" || busy === "update"}
          onClose={() => setEditor(null)}
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
