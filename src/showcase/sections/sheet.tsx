import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Block, Sample } from "../ShowcaseSection";

const lados = ["top", "right", "bottom", "left"] as const;

export default function SheetSection() {
  return (
    <>
      <Block title="Variantes (side)">
        {lados.map((side) => (
          <Sample key={side} label={`side="${side}"`}>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">Abrir {side}</Button>
              </SheetTrigger>
              <SheetContent side={side}>
                <SheetHeader>
                  <SheetTitle>Panel de ejemplo</SheetTitle>
                  <SheetDescription>Contenido inventado, lado {side}.</SheetDescription>
                </SheetHeader>
                <div className="px-4">
                  <Field>
                    <FieldLabel htmlFor={`sheet-${side}`}>Nombre</FieldLabel>
                    <Input id={`sheet-${side}`} defaultValue="Perfil de ejemplo" />
                  </Field>
                </div>
                <SheetFooter>
                  <Button>Guardar</Button>
                  <SheetClose asChild>
                    <Button variant="outline">Cerrar</Button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </Sample>
        ))}
      </Block>
    </>
  );
}
