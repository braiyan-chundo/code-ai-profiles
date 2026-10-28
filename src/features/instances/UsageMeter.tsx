import { Card, CardContent } from "../../components/ui/card";
import { Progress } from "../../components/ui/progress";
import { cn } from "../../lib/utils";
import { usageTone } from "./usage-tone";

/** Un porcentaje de uso (de sesión o semanal) con su barra. Sin dato muestra «—» y la barra vacía. */
export function UsageMeter({ label, value, className }: { label: string; value: number | null; className?: string }) {
  const progress = Math.min(100, Math.max(0, value ?? 0));
  return (
    <Card size="sm" className={cn("min-w-0 gap-2.5", className)}>
      <CardContent className="gap-2.5">
        <div className="flex items-end justify-between gap-2.5">
          <span className="truncate text-[9px] font-bold tracking-[0.08em] text-muted-foreground uppercase">{label}</span>
          <strong className="font-mono text-2xl/[0.9] font-semibold tracking-[-0.06em] text-primary-text">
            {value == null ? "—" : `${Math.round(value)}%`}
          </strong>
        </div>
        <Progress
          value={value == null ? null : progress}
          aria-label={value == null ? `${label} no disponible` : `${label}: ${value}% usado`}
          aria-valuenow={value == null ? undefined : Math.round(progress)}
          className={cn("h-2", usageTone(progress))}
        />
        <small className="text-right font-mono text-[8px] leading-none font-medium text-(--quiet) uppercase">
          {value == null ? "Sin datos" : "usado"}
        </small>
      </CardContent>
    </Card>
  );
}
