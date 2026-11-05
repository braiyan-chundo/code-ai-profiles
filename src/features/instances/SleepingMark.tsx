import { cn } from "../../lib/utils";

/**
 * El «zᶻ» de una instancia detenida (HU-0030). Decorativo: el estado lo dice el texto accesible de la fila.
 * La escala no admite tamaños sueltos: la primera «z» usa --fs-small (12 px) y la segunda, --fs-micro (11 px) reducida a
 * ~9 px con scale y subida 6 px.
 */
export function SleepingMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex shrink-0 items-start font-mono font-bold text-muted-foreground select-none", className)}
    >
      <span className="text-(length:--fs-small)/(--lh-small)">z</span>
      <span className="origin-bottom-left -translate-y-1.5 scale-[0.82] text-(length:--fs-micro)/(--lh-micro)">z</span>
    </span>
  );
}
