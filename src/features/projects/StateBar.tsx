import type { ProjectCounts, ProjectHistoryState } from "../../types";
import { cn } from "../../lib/utils";
import { STATE_FILL, STATE_DOT } from "./projects-styles";
import { STATE_LEGEND, stateFractions, stateSummary } from "./projects-selectors";

/** El punto de un estado de historia: 8 px, redondo; hueco para «en espera» y «sin estado». */
export function StateDot({ state, className }: { state: ProjectHistoryState; className?: string }) {
  return <i aria-hidden="true" className={cn("block size-2 shrink-0 rounded-full", STATE_DOT[state], className)} />;
}

/**
 * La barra apilada de historias por estado (dataviz): 8 px de alto, extremos de 4 y 2 px entre segmentos. Cada
 * segmento lleva su título («4 en curso») y la barra, el reparto como texto. El hueco de 2 px es un borde transparente,
 * no un `gap`: así no sale de la escala de espaciado.
 */
export function StateBar({ counts, className }: { counts: ProjectCounts; className?: string }) {
  const segments = stateFractions(counts).filter((segment) => segment.count > 0);
  return (
    <div
      role="img"
      aria-label={stateSummary(counts)}
      className={cn("flex h-2 overflow-hidden rounded-xs", segments.length === 0 && "bg-(--line)", className)}
    >
      {segments.map((segment) => (
        <i
          key={segment.state}
          title={`${segment.count} ${STATE_LEGEND[segment.state]}`}
          style={{ flexGrow: segment.count }}
          className={cn("block h-full basis-0 border-r-2 border-transparent bg-clip-padding last:border-r-0", STATE_FILL[segment.state])}
        />
      ))}
    </div>
  );
}

/** La leyenda de la barra, siempre con los números: la identidad de un estado nunca depende solo del color. */
export function StateLegend({ counts, className }: { counts: ProjectCounts; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-x-3 gap-y-1 text-(length:--fs-small)/(--lh-small) text-muted-foreground", className)}>
      {stateFractions(counts).map(({ state, count }) => (
        <li key={state} className="inline-flex items-center gap-2 whitespace-nowrap">
          <StateDot state={state} />
          <span>
            <b className="font-mono font-semibold text-foreground">{count}</b> {STATE_LEGEND[state]}
          </span>
        </li>
      ))}
    </ul>
  );
}
