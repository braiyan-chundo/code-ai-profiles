import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Block, Sample } from "../ShowcaseSection";

export default function DropdownMenuSection() {
  const [marcado, setMarcado] = useState(true);
  const [tema, setTema] = useState("oscuro");
  return (
    <>
      <Block title="Variantes" className="min-h-72">
        <Sample label="elementos, grupo y atajo">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Acciones</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Perfil de ejemplo</DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  Abrir <DropdownMenuShortcut>⌘O</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem>Duplicar</DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Mover a</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem>Perfil uno</DropdownMenuItem>
                  <DropdownMenuItem>Perfil dos</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">Eliminar</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Sample>
        <Sample label="casillas y opciones">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Preferencias</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuCheckboxItem checked={marcado} onCheckedChange={setMarcado}>
                Mostrar sesiones
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={tema} onValueChange={setTema}>
                <DropdownMenuRadioItem value="oscuro">Oscuro</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="claro">Claro</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </Sample>
      </Block>
      <Block title="Estados">
        <Sample label="elemento deshabilitado">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Con deshabilitado</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Disponible</DropdownMenuItem>
              <DropdownMenuItem disabled>No disponible</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Sample>
      </Block>
    </>
  );
}
