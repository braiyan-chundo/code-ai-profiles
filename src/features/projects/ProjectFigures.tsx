import type { ReactNode } from "react";
import { Card, CardContent } from "../../components/ui/card";
import type { ProjectInfo } from "../../types";
import { StateBar, StateLegend } from "./StateBar";
import {
  formatCacheShare,
  formatHoursCompact,
  formatSinceRange,
  formatSpanDays,
  formatTokensCompact,
  inputPlusOutput,
} from "./projects-format";
import { EYEBROW } from "./projects-styles";

const FIGURE = "font-mono text-(length:--fs-figure)/(--lh-figure) font-semibold tracking-[-0.05em]";
const HINT = "text-(length:--fs-small)/(--lh-small) text-muted-foreground";

function Figure({ label, value, hint, children, className }: {
  label: string;
  value: string;
  hint?: string | null;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Card size="sm" className={className}>
      <CardContent className="grid content-start gap-2">
        <span className={EYEBROW}>{label}</span>
        <strong className={FIGURE}>{value}</strong>
        {hint && <span className={HINT}>{hint}</span>}
        {children}
      </CardContent>
    </Card>
  );
}

/** «api · app · worker»: los tipos de repo, o los nombres si no declaran tipo. */
function repoHint(info: ProjectInfo): string | null {
  const kinds = [...new Set(info.repos.map((repo) => repo.kind).filter((kind): kind is string => Boolean(kind)))];
  const parts = kinds.length > 0 ? kinds : info.repos.map((repo) => repo.name);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * Las cifras de la página (HU-0023, AC-03 y AC-04) en la retícula de 12 columnas: Historias 4/12 con la barra por
 * estados y cuatro de 2/12 (Repos, Desde, Tiempo en fases, Tokens). Por debajo de 1071 px, Historias ocupa toda la fila y
 * las otras cuatro, 3/12. Tiempo y tokens suman solo las historias terminadas con métricas: las descartadas no cuentan.
 */
export function ProjectFigures({ info, now }: { info: ProjectInfo; now: Date }) {
  const { totals } = info;
  const closed = totals.histories;
  const cache = formatCacheShare(totals.tokens);
  return (
    <section aria-label="Resumen del proyecto" className="grid grid-cols-12 gap-6">
      <Card size="sm" className="col-span-4 max-[1070px]:col-span-12">
        <CardContent className="grid content-start gap-2">
          <span className={EYEBROW}>Historias</span>
          <strong className={FIGURE}>{info.counts.total}</strong>
          <StateBar counts={info.counts} />
          <StateLegend counts={info.counts} />
        </CardContent>
      </Card>
      <Figure
        label="Repos"
        value={String(info.repos.length)}
        hint={repoHint(info)}
        className="col-span-2 max-[1070px]:col-span-3"
      />
      <Figure
        label="Desde"
        value={formatSpanDays(info.spanDays) ?? "—"}
        hint={formatSinceRange(info.firstCreated, info.lastActivity, now)}
        className="col-span-2 max-[1070px]:col-span-3"
      />
      <Figure
        label="Tiempo en fases"
        value={closed > 0 ? formatHoursCompact(totals.minutes) : "—"}
        hint={closed > 0 ? `de ${closed} ${closed === 1 ? "historia cerrada" : "historias cerradas"}` : "Aún sin historias cerradas"}
        className="col-span-2 max-[1070px]:col-span-3"
      />
      <Figure
        label="Tokens"
        value={totals.tokens.total > 0 ? formatTokensCompact(totals.tokens.total) : "—"}
        hint={cache}
        className="col-span-2 max-[1070px]:col-span-3"
      >
        {totals.tokens.total > 0 && (
          <span className="grid text-(length:--fs-micro)/(--lh-micro) text-muted-foreground">
            <b className="font-mono font-semibold text-foreground">{formatTokensCompact(inputPlusOutput(totals.tokens))}</b>
            <span>entrada + salida</span>
          </span>
        )}
      </Figure>
    </section>
  );
}
