import { useState } from "react";
import { CalendarIcon, SettingsIcon, UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command";
import { Block, Sample } from "../ShowcaseSection";

function Lista() {
  return (
    <>
      <CommandInput placeholder="Escribe una orden o busca" />
      <CommandList>
        <CommandEmpty>Sin resultados.</CommandEmpty>
        <CommandGroup heading="Sugerencias de ejemplo">
          <CommandItem>
            <CalendarIcon />
            Calendario
          </CommandItem>
          <CommandItem>
            <UserIcon />
            Perfiles
            <CommandShortcut>⌘P</CommandShortcut>
          </CommandItem>
          <CommandItem disabled>
            <SettingsIcon />
            Ajustes (no disponible)
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Otras">
          <CommandItem>Sesiones</CommandItem>
        </CommandGroup>
      </CommandList>
    </>
  );
}

export default function CommandSection() {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Block title="Variantes">
        <Sample label="en línea">
          <Command className="w-80 rounded-xl border border-border">
            <Lista />
          </Command>
        </Sample>
        <Sample label="en diálogo (botón)">
          <Button variant="outline" onClick={() => setAbierto(true)}>
            Abrir paleta
          </Button>
          {/* CommandDialog no envuelve a sus hijos en <Command>: hay que ponerlo. */}
          <CommandDialog open={abierto} onOpenChange={setAbierto} title="Paleta de comandos" description="Busca una orden de ejemplo">
            <Command>
              <Lista />
            </Command>
          </CommandDialog>
        </Sample>
      </Block>
    </>
  );
}
