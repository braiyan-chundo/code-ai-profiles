import { Progress } from "../../components/ui/progress";
import { cn } from "../../lib/utils";
import { usageTone } from "./usage-tone";

/** Un porcentaje de uso en una línea (etiqueta, valor y barra), para las filas del ranking del dashboard. */
export function UsageBar({ label, value, className }: { label: string; value: number | null; className?: string }) {
  const progress = Math.min(100, Math.max(0, value ?? 0));
  return (
    <div className={cn("grid min-w-0 gap-2", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-(length:--fs-micro)/(--lh-micro) font-bold tracking-[0.08em] text-muted-foreground uppercase">{label}</span>
        <strong className="font-mono text-(length:--fs-small)/(--lh-small) font-semibold tracking-[-0.04em] text-primary-text">
          {value == null ? "—" : `${Math.round(value)}%`}
        </strong>
      </div>
      <Progress
        value={value == null ? null : progress}
        aria-label={value == null ? `${label} no disponible` : `${label}: ${value}% usado`}
        aria-valuenow={value == null ? undefined : Math.round(progress)}
        className={cn("h-1.5", usageTone(progress))}
      />
    </div>
  );
}
