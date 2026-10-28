import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Block, Sample } from "../ShowcaseSection";

export default function TooltipSection() {
  return (
    <>
      <Block title="Variantes (side)" className="min-h-24">
        {(["top", "right", "bottom", "left"] as const).map((side) => (
          <Sample key={side} label={`side="${side}"`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">{side}</Button>
              </TooltipTrigger>
              <TooltipContent side={side}>Pista de ejemplo</TooltipContent>
            </Tooltip>
          </Sample>
        ))}
      </Block>
      <Block title="Estados">
        <Sample label="sobre un botón deshabilitado (en un span)">
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>
                <Button disabled>Deshabilitado</Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Explica por qué no se puede usar</TooltipContent>
          </Tooltip>
        </Sample>
      </Block>
      <Block title="Composición">
        <Sample label="botón de solo icono con atajo">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="outline" aria-label="Añadir perfil de ejemplo">
                <PlusIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Añadir <Kbd>N</Kbd>
            </TooltipContent>
          </Tooltip>
        </Sample>
      </Block>
    </>
  );
}
