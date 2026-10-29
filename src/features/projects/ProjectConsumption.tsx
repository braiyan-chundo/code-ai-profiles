import { CoinsIcon } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Progress } from "../../components/ui/progress";
import { cn } from "../../lib/utils";
import type { ProjectInfo } from "../../types";
import { formatTokens } from "./projects-format";
import { BADGE_MONO, EYEBROW } from "./projects-styles";
import { consumptionByHistory, consumptionByRole } from "./projects-detail";

const ROW = "grid items-center gap-3 text-(length:--fs-small)/(--lh-small)";
const VALUE = "text-right font-mono font-semibold";

/** La barra de un consumo: un solo color neutro, extremos de 4 px, con el valor leído por los lectores de pantalla. */
function UsageBar({ fraction, label, value }: { fraction: number; label: string; value: string }) {
  const percent = Math.round(fraction * 100);
  return (
    <Progress
      value={percent}
      aria-label={`${label}: ${value}`}
      aria-valuenow={percent}
      className="h-2 rounded-xs bg-(--surface-soft) [&>[data-slot=progress-indicator]]:rounded-xs [&>[data-slot=progress-indicator]]:bg-muted-foreground"
    />
  );
}

/**
 * El consumo (AC-04): barras horizontales de mayor a menor, por historia (7/12) y por rol (5/12), con el valor directo
 * al final. Solo cuentan las historias terminadas con métricas; las descartadas no suman. El orquestador lleva «≈»:
 * si se trabajan dos historias a la vez, su consumo se reparte mal.
 */
export function ProjectConsumption({ info, className }: { info: ProjectInfo; className?: string }) {
  const byHistory = consumptionByHistory(info);
  const byRole = consumptionByRole(info);
  const approximate = byRole.some((row) => row.approximate);
  const discarded = info.counts.discarded;
  return (
    <Card aria-label="Consumo" className={cn("gap-4", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-(length:--fs-heading)/(--lh-heading) font-semibold">
          <CoinsIcon aria-hidden="true" className="size-5 text-muted-foreground" /> Consumo
        </CardTitle>
        <CardDescription className="text-(length:--fs-small)/(--lh-small)">
          Tokens de {info.totals.histories === 1 ? "la historia terminada" : `las ${info.totals.histories} historias terminadas`}, sumados de sus{" "}
          <code className="font-mono">metricas.json</code>.
          {discarded > 0 && ` ${discarded === 1 ? "La descartada no suma" : `Las ${discarded} descartadas no suman`}.`}
        </CardDescription>
        <CardAction>
          <Badge variant="secondary" className={BADGE_MONO}>{formatTokens(info.totals.tokens.total)}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        {byHistory.length === 0 ? (
          <p className="text-(length:--fs-small)/(--lh-small) text-muted-foreground">Todavía no hay historias terminadas con métricas.</p>
        ) : (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-7 grid content-start gap-3 max-[1070px]:col-span-12">
              <h3 className={EYEBROW}>Por historia</h3>
              <ul className="m-0 grid list-none gap-2 p-0">
                {byHistory.map((row) => (
                  <li key={row.key} className={cn(ROW, "grid-cols-[minmax(0,1fr)_minmax(0,1fr)_80px]")}>
                    <span className="truncate" title={`${row.id} · ${row.label}`}>
                      <span className="mr-2 font-mono text-muted-foreground">{row.id}</span>
                      {row.label}
                    </span>
                    <UsageBar fraction={row.fraction} label={row.id} value={formatTokens(row.total)} />
                    <span className={VALUE}>{formatTokens(row.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="col-span-5 grid content-start gap-3 max-[1070px]:col-span-12">
              <h3 className={EYEBROW}>Por rol</h3>
              <ul className="m-0 grid list-none gap-2 p-0">
                {byRole.map((row) => (
                  <li key={row.role} className={cn(ROW, "grid-cols-[120px_minmax(0,1fr)_136px]")}>
                    <span className="truncate font-mono" title={row.role}>{row.role}</span>
                    <UsageBar fraction={row.fraction} label={row.role} value={formatTokens(row.total)} />
                    <span className={VALUE}>
                      {row.approximate ? "≈ " : ""}{formatTokens(row.total)}{" "}
                      <small className="font-normal text-(length:--fs-micro)/(--lh-micro) text-muted-foreground">{row.percent} %</small>
                    </span>
                  </li>
                ))}
              </ul>
              {approximate && (
                <p className="text-(length:--fs-small)/(--lh-small) text-muted-foreground">
                  ≈ El del orquestador es aproximado: si se trabajan dos historias a la vez, se reparte mal.
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
