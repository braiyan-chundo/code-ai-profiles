import { ChevronsUpDownIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Block, Sample } from "../ShowcaseSection";

export default function CollapsibleSection() {
  const [abierto, setAbierto] = useState(true);
  return (
    <>
      <Block title="Variantes">
        <Sample label="controlado">
          <Collapsible open={abierto} onOpenChange={setAbierto} className="w-72">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">3 sesiones de ejemplo</span>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Mostrar u ocultar sesiones">
                  <ChevronsUpDownIcon />
                </Button>
              </CollapsibleTrigger>
            </div>
            <div className="mt-2 rounded-lg border border-border px-3 py-2 text-sm">Sesión uno</div>
            <CollapsibleContent className="mt-2 flex flex-col gap-2">
              <div className="rounded-lg border border-border px-3 py-2 text-sm">Sesión dos</div>
              <div className="rounded-lg border border-border px-3 py-2 text-sm">Sesión tres</div>
            </CollapsibleContent>
          </Collapsible>
        </Sample>
      </Block>
      <Block title="Estados">
        <Sample label="deshabilitado">
          <Collapsible disabled className="w-72">
            <CollapsibleTrigger asChild>
              <Button variant="outline" disabled>
                No se puede abrir
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>Contenido oculto.</CollapsibleContent>
          </Collapsible>
        </Sample>
      </Block>
    </>
  );
}
