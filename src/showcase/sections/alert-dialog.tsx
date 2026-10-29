import { TrashIcon } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Block, Sample } from "../ShowcaseSection";

export default function AlertDialogSection() {
  return (
    <>
      <Block title="Variantes">
        <Sample label="confirmación">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">Confirmar acción</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Continuar con la acción de ejemplo?</AlertDialogTitle>
                <AlertDialogDescription>No ocurre nada real: es un texto de muestra.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction>Continuar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Sample>
        <Sample label="destructiva, con icono y tamaño sm">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Eliminar perfil</Button>
            </AlertDialogTrigger>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogMedia>
                  <TrashIcon />
                </AlertDialogMedia>
                <AlertDialogTitle>¿Eliminar el perfil de ejemplo?</AlertDialogTitle>
                <AlertDialogDescription>Es una muestra: no se elimina nada.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction variant="destructive">Eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Sample>
      </Block>
    </>
  );
}
