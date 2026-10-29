import { UnlinkIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { Button } from "../../components/ui/button";
import { Spinner } from "../../components/ui/spinner";
import type { SessionProfile, SessionTransferInfo } from "../../types";
import { unlinkDialogCopy, type UnlinkDialogCopy } from "./session-messages";
import type { SessionUnlinkSelection } from "./session-types";

/**
 * Devolver una sesión movida a su origen, o desvincular una copia. Escape y «Cancelar» llaman a `onCancel` salvo con
 * `busy` (HU-0016, A-12). Confirmar es un `Button` y no `AlertDialogAction`, que cerraría antes de marcar `busy`.
 */
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
    <AlertDialog open onOpenChange={(open) => { if (!open && !busy) onCancel(); }}>
      <AlertDialogContent aria-busy={busy}>
        <AlertDialogHeader>
          <AlertDialogMedia className="size-12 rounded-xl bg-primary/10 text-primary-text *:[svg:not([class*='size-'])]:size-6">
            <UnlinkIcon />
          </AlertDialogMedia>
          <AlertDialogTitle className="break-words">{copy.title}</AlertDialogTitle>
          <AlertDialogDescription className="text-xs leading-relaxed">{copy.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel size="lg" disabled={busy}>Cancelar</AlertDialogCancel>
          <Button size="lg" onClick={() => void onConfirm(copy)} disabled={busy}>
            {busy ? <><Spinner aria-hidden="true" /> {copy.busyLabel}</> : copy.confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
