import { useMemo, useState, type ReactNode } from "react";
import type { SessionTransferSelection, SessionUnlinkSelection } from "../../features/sessions";
import type { ManagedInstance, ProjectCandidate } from "../../types";
import { DialogsContext, type DialogsContextValue, type ProjectDialogState } from "./dialogs-context";

/**
 * Las ocho banderas de los diálogos. Ya no hay un `keydown` global (HU-0016, A-12): cada diálogo se cierra con Escape, la X
 * o el clic fuera desde el `onOpenChange` del catálogo, con la misma guarda de `busy` que su botón «Cancelar».
 */
export function DialogsProvider({ children }: { children: ReactNode }) {
  const [editor, setEditor] = useState<ManagedInstance | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedInstance | null>(null);
  const [transfer, setTransfer] = useState<SessionTransferSelection | null>(null);
  const [unlinkTarget, setUnlinkTarget] = useState<SessionUnlinkSelection | null>(null);
  const [updateTargets, setUpdateTargets] = useState<ManagedInstance[] | null>(null);
  const [originalUpdateOpen, setOriginalUpdateOpen] = useState(false);
  const [pinCandidate, setPinCandidate] = useState<ProjectCandidate | null>(null);
  const [projectDialog, setProjectDialog] = useState<ProjectDialogState | null>(null);

  const value = useMemo<DialogsContextValue>(() => ({
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
  }), [deleteTarget, editor, originalUpdateOpen, pinCandidate, projectDialog, transfer, unlinkTarget, updateTargets]);

  return <DialogsContext.Provider value={value}>{children}</DialogsContext.Provider>;
}
