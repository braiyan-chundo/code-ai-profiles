import { TriangleAlertIcon } from "lucide-react";
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
import type { ManagedInstance } from "../../types";

/**
 * Confirmar el borrado de una instancia detenida. Escape y «Cancelar» llaman a `onCancel` salvo con `busy` (HU-0016,
 * A-12); el clic fuera no cierra un `AlertDialog`. Confirmar es un `Button` y no `AlertDialogAction`, que cerraría
 * el diálogo antes de que la operación marque `busy`: se cierra cuando termina bien, desde `DialogHost`.
 */
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
    <AlertDialog open onOpenChange={(open) => { if (!open && !busy) onCancel(); }}>
      <AlertDialogContent aria-busy={busy}>
        <AlertDialogHeader>
          <AlertDialogMedia className="size-12 rounded-xl bg-destructive/10 text-destructive *:[svg:not([class*='size-'])]:size-6">
            <TriangleAlertIcon />
          </AlertDialogMedia>
          <AlertDialogTitle className="break-words">Eliminar “{instance.name}”</AlertDialogTitle>
          <AlertDialogDescription className="text-xs leading-relaxed">
            Se borrarán la aplicación administrada y todos los datos locales de este perfil. La cuenta vinculada al proveedor no se elimina. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel size="lg" disabled={busy}>Cancelar</AlertDialogCancel>
          <Button size="lg" variant="destructive" onClick={() => void onConfirm()} disabled={busy}>
            {busy ? <><Spinner aria-hidden="true" /> Eliminando…</> : "Eliminar instancia"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
