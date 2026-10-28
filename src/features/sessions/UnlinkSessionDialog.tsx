import { ConfirmDialog } from "../../components/ConfirmDialog";
import type { SessionProfile, SessionTransferInfo } from "../../types";
import { unlinkDialogCopy, type UnlinkDialogCopy } from "./session-messages";
import type { SessionUnlinkSelection } from "./session-types";

/** Devolver una sesión movida a su origen, o desvincular una copia. */
export function UnlinkSessionDialog({
  selection,
  transferInfo,
  profiles,
  busy,
  onCancel,
  onConfirm,
}: {
  selection: SessionUnlinkSelection;
  transferInfo: SessionTransferInfo;
  profiles: SessionProfile[];
  busy: boolean;
  onCancel: () => void;
  onConfirm: (copy: UnlinkDialogCopy) => Promise<void>;
}) {
  const origin = profiles.find((instance) => instance.id === transferInfo.originInstanceId);
  const copy = unlinkDialogCopy(selection, transferInfo, origin?.name);
  return (
    <ConfirmDialog
      title={copy.title}
      confirmLabel={copy.confirmLabel}
      busy={busy}
      tone="neutral"
      busyLabel={copy.busyLabel}
      onCancel={onCancel}
      onConfirm={() => onConfirm(copy)}
    >
      {copy.body}
    </ConfirmDialog>
  );
}
