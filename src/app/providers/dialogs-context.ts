import { createContext, useContext, type Dispatch, type SetStateAction } from "react";
import type { SessionTransferSelection, SessionUnlinkSelection } from "../../features/sessions";
import type { ManagedInstance, ProjectCandidate } from "../../types";

type Setter<T> = Dispatch<SetStateAction<T>>;

/** Las siete banderas de los diálogos. Son independientes: pueden convivir dos abiertos, como antes. */
export interface DialogsContextValue {
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
  /** La carpeta que la persona eligió en el selector, con lo que Rust encontró en ella (HU-0023). */
  pinCandidate: ProjectCandidate | null;
  setPinCandidate: Setter<ProjectCandidate | null>;
}

export const DialogsContext = createContext<DialogsContextValue | null>(null);

export function useDialogs(): DialogsContextValue {
  const value = useContext(DialogsContext);
  if (!value) throw new Error("useDialogs debe usarse dentro de DialogsProvider.");
  return value;
}
