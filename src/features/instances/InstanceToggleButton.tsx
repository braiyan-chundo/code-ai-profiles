import { PlayIcon, SquareIcon } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Spinner } from "../../components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";
import { cn } from "../../lib/utils";
import type { InstanceToggle } from "./instance-status";

/**
 * «Abrir»/«Detener» al final de una fila del dashboard (HU-0026, A-4). Con icono y etiqueta en 104 px; por debajo de
 * 1071 px, solo el icono con su tooltip (el corte es CSS, sin listener de `resize`). En curso, el spinner sustituye al
 * icono y la etiqueta no cambia: la insignia de la fila ya dice «Abriendo…»/«Deteniendo…» y el ancho no salta.
 * Sin `toggle` (instancia no disponible), un hueco del mismo ancho para que las barras sigan alineadas.
 *
 * Va envuelto en un `span` `relative z-10`: queda por encima del enlace que cubre la fila, así que el clic no navega,
 * tampoco con el botón deshabilitado (que no recibe el puntero).
 */
export function InstanceToggleButton({ toggle, onToggle }: { toggle: InstanceToggle | null; onToggle: () => void }) {
  if (!toggle) return <span aria-hidden="true" className="w-26 shrink-0 max-[1070px]:w-(--ctl-sm)" />;
  const stopping = toggle.action === "stop";
  const text = stopping ? "Detener" : "Abrir";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="relative z-10 inline-flex shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onToggle}
            disabled={toggle.disabled}
            aria-label={toggle.label}
            aria-busy={toggle.pending || undefined}
            className={cn(
              "w-26 max-[1070px]:w-(--ctl-sm) max-[1070px]:px-0",
              stopping && "border-primary/30 bg-primary/10 text-primary-text hover:bg-primary/15 hover:text-primary-text",
              toggle.pending && "disabled:opacity-100",
            )}
          >
            {toggle.pending ? <Spinner aria-hidden="true" /> : stopping ? <SquareIcon /> : <PlayIcon />}
            <span className="max-[1070px]:sr-only">{text}</span>
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent className="min-[1071px]:hidden">{toggle.label}</TooltipContent>
    </Tooltip>
  );
}
