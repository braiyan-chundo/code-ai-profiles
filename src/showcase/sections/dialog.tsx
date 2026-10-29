import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Block, Sample } from "../ShowcaseSection";

export default function DialogSection() {
  return (
    <>
      <Block title="Variantes">
        <Sample label="con pie de acciones">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Abrir diálogo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Renombrar perfil de ejemplo</DialogTitle>
                <DialogDescription>Los datos de este diálogo son inventados.</DialogDescription>
              </DialogHeader>
              <Field>
                <FieldLabel htmlFor="dialog-nombre">Nombre</FieldLabel>
                <Input id="dialog-nombre" defaultValue="Perfil de ejemplo" />
              </Field>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button>Guardar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Sample>
        <Sample label="sin botón de cierre (showCloseButton={false})">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Sin cierre</Button>
            </DialogTrigger>
            <DialogContent showCloseButton={false}>
              <DialogHeader>
                <DialogTitle>Sin botón de cierre</DialogTitle>
                <DialogDescription>Se cierra con Escape o con la acción.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button>Entendido</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Sample>
      </Block>
      <Block title="Estados">
        <Sample label="contenido largo (con scroll)">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Contenido largo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Texto largo de ejemplo</DialogTitle>
                <DialogDescription>El cuerpo hace scroll si no cabe.</DialogDescription>
              </DialogHeader>
              <div className="max-h-48 overflow-y-auto text-sm text-muted-foreground">
                {Array.from({ length: 12 }, (_, index) => (
                  <p key={index} className="pb-2">
                    Párrafo {index + 1} de texto de ejemplo, sin información real.
                  </p>
                ))}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cerrar</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Sample>
        <Sample label="botón disparador deshabilitado">
          <Button variant="outline" disabled>
            Deshabilitado
          </Button>
        </Sample>
      </Block>
    </>
  );
}
