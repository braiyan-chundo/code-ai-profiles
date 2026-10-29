import { useMemo, useState, type ReactNode } from "react";
import type { SessionTransferSelection, SessionUnlinkSelection } from "../../features/sessions";
import type { ManagedInstance } from "../../types";
import { DialogsContext, type DialogsContextValue } from "./dialogs-context";

/**
 * Las banderas de los diálogos. Ya no hay un `keydown` global (HU-0016, A-12): cada diálogo se cierra con Escape, la X
 * o el clic fuera desde el `onOpenChange` del catálogo, con la misma guarda de `busy` que su botón «Cancelar».
 */
export function DialogsProvider({ children }: { children: ReactNode }) {
  const [editor, setEditor] = useState<ManagedInstance | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedInstance | null>(null);
  const [transfer, setTransfer] = useState<SessionTransferSelection | null>(null);
  const [unlinkTarget, setUnlinkTarget] = useState<SessionUnlinkSelection | null>(null);
  const [updateTargets, setUpdateTargets] = useState<ManagedInstance[] | null>(null);
  const [originalUpdateOpen, setOriginalUpdateOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  const value = useMemo<DialogsContextValue>(() => ({
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
  }), [appearanceOpen, deleteTarget, editor, originalUpdateOpen, transfer, unlinkTarget, updateTargets]);

  return <DialogsContext.Provider value={value}>{children}</DialogsContext.Provider>;
}
