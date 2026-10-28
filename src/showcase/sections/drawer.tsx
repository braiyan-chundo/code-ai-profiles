import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Block, Sample } from "../ShowcaseSection";

const direcciones = ["bottom", "top", "right", "left"] as const;

export default function DrawerSection() {
  return (
    <>
      <Block title="Variantes (direction)">
        {direcciones.map((direction) => (
          <Sample key={direction} label={`direction="${direction}"`}>
            <Drawer direction={direction}>
              <DrawerTrigger asChild>
                <Button variant="outline">Abrir {direction}</Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Cajón de ejemplo</DrawerTitle>
                  <DrawerDescription>Se arrastra para cerrarlo. Contenido inventado.</DrawerDescription>
                </DrawerHeader>
                <DrawerFooter>
                  <Button>Aceptar</Button>
                  <DrawerClose asChild>
                    <Button variant="outline">Cerrar</Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </Sample>
        ))}
      </Block>
    </>
  );
}
