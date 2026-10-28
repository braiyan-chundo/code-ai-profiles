import { ConfirmDialog } from "../../components/ConfirmDialog";
import type { ManagedInstance } from "../../types";

export function DeleteInstanceDialog({
  instance,
  busy,
  onCancel,
  onConfirm,
}: {
  instance: ManagedInstance;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <ConfirmDialog
      title={`Eliminar “${instance.name}”`}
      confirmLabel="Eliminar instancia"
      busy={busy}
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      Se borrarán la aplicación administrada y todos los datos locales de este perfil. La cuenta vinculada al proveedor no se elimina. Esta acción no se puede deshacer.
    </ConfirmDialog>
  );
}
