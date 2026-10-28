import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useDashboard } from "../../features/dashboard";
import type { SessionTransferSelection, SessionUnlinkSelection } from "../../features/sessions";
import type { ManagedInstance } from "../../types";
import { DialogsContext, type DialogsContextValue } from "./dialogs-context";

/** Las banderas de los diálogos y la tecla Escape, que cierra cada uno salvo durante su operación. */
export function DialogsProvider({ children }: { children: ReactNode }) {
  const { busyRef } = useDashboard();
  const [editor, setEditor] = useState<ManagedInstance | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedInstance | null>(null);
  const [transfer, setTransfer] = useState<SessionTransferSelection | null>(null);
  const [unlinkTarget, setUnlinkTarget] = useState<SessionUnlinkSelection | null>(null);
  const [updateTargets, setUpdateTargets] = useState<ManagedInstance[] | null>(null);
  const [originalUpdateOpen, setOriginalUpdateOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAppearanceOpen(false);
        setEditor(null);
        setDeleteTarget(null);
        if (!busyRef.current?.startsWith("transfer:")) setTransfer(null);
        if (!busyRef.current?.startsWith("unlink:")) setUnlinkTarget(null);
        if (busyRef.current !== "update-applications") setUpdateTargets(null);
        if (busyRef.current !== "update-original") setOriginalUpdateOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

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
