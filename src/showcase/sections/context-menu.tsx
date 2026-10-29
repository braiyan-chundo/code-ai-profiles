import { useState } from "react";
import { ContextMenu, ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuRadioGroup, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Block, Sample } from "../ShowcaseSection";

export default function ContextMenuSection() {
  const [marcado, setMarcado] = useState(true);
  const [orden, setOrden] = useState("nombre");
  return (
    <>
      <Block title="Variantes (clic derecho)" className="min-h-60">
        <Sample label="menú contextual">
          <ContextMenu>
            <ContextMenuTrigger className="flex h-32 w-72 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
              Clic derecho aquí
            </ContextMenuTrigger>
            <ContextMenuContent className="w-56">
              <ContextMenuLabel>Perfil de ejemplo</ContextMenuLabel>
              <ContextMenuItem>
                Abrir <ContextMenuShortcut>⌘O</ContextMenuShortcut>
              </ContextMenuItem>
              <ContextMenuItem disabled>Duplicar (no disponible)</ContextMenuItem>
              <ContextMenuSub>
                <ContextMenuSubTrigger>Mover a</ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  <ContextMenuItem>Perfil uno</ContextMenuItem>
                  <ContextMenuItem>Perfil dos</ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
              <ContextMenuSeparator />
              <ContextMenuCheckboxItem checked={marcado} onCheckedChange={setMarcado}>
                Mostrar sesiones
              </ContextMenuCheckboxItem>
              <ContextMenuSeparator />
              <ContextMenuRadioGroup value={orden} onValueChange={setOrden}>
                <ContextMenuRadioItem value="nombre">Ordenar por nombre</ContextMenuRadioItem>
                <ContextMenuRadioItem value="fecha">Ordenar por fecha</ContextMenuRadioItem>
              </ContextMenuRadioGroup>
              <ContextMenuSeparator />
              <ContextMenuItem variant="destructive">Eliminar</ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </Sample>
      </Block>
    </>
  );
}
