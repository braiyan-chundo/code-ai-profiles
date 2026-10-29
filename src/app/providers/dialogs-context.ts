import { createContext, useContext, type Dispatch, type SetStateAction } from "react";
import type { SessionTransferSelection, SessionUnlinkSelection } from "../../features/sessions";
import type { ManagedInstance } from "../../types";

type Setter<T> = Dispatch<SetStateAction<T>>;

/** Las siete banderas de los diálogos. Son independientes: pueden convivir dos abiertos, como antes. */
export interface DialogsContextValue {
  appearanceOpen: boolean;
  setAppearanceOpen: Setter<boolean>;
  editor: ManagedInstance | "new" | null;
  setEditor: Setter<ManagedInstance | "new" | null>;
  deleteTarget: ManagedInstance | null;
  setDeleteTarget: Setter<ManagedInstance | null>;
  transfer: SessionTransferSelection | null;
  setTransfer: Setter<SessionTransferSelection | null>;
  unlinkTarget: SessionUnlinkSelection | null;
  setUnlinkTarget: Setter<SessionUnlinkSelection | null>;
  updateTargets: ManagedInstance[] | null;
  setUpdateTargets: Setter<ManagedInstance[] | null>;
  originalUpdateOpen: boolean;
  setOriginalUpdateOpen: Setter<boolean>;
}

export const DialogsContext = createContext<DialogsContextValue | null>(null);

export function useDialogs(): DialogsContextValue {
  const value = useContext(DialogsContext);
  if (!value) throw new Error("useDialogs debe usarse dentro de DialogsProvider.");
  return value;
}
