import { Badge } from "../../components/ui/badge";
import { cn } from "../../lib/utils";
import type { InstanceStatus } from "../../types";
import { instanceStatusLabel, type InstancePending } from "./instance-status";

/** El estado de una instancia o de la aplicación original: Ejecutándose, Detenido, No disponible, Abriendo… o Deteniendo…. */
export function InstanceStatusBadge({
  status,
  pending = null,
  className,
}: {
  status: InstanceStatus;
  /** La operación en curso sobre esta instancia (HU-0026): «Abriendo…» o «Deteniendo…», con el punto que late. */
  pending?: InstancePending | null;
  className?: string;
}) {
  const tone = pending ?? status;
  return (
    <Badge
      variant="outline"
      data-status={tone}
      className={cn(
        "gap-2 font-mono text-(length:--fs-micro)/(--lh-micro) font-semibold tracking-[0.06em] text-muted-foreground uppercase",
        "data-[status=running]:border-primary/30 data-[status=running]:bg-primary/10 data-[status=running]:text-primary-text",
        "data-[status=launching]:border-primary/20 data-[status=launching]:text-primary-text",
        "data-[status=stopping]:border-primary/20 data-[status=stopping]:text-primary-text",
        "data-[status=missing]:border-destructive/30 data-[status=missing]:text-destructive",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full bg-(--quiet)",
          tone === "running" && "bg-(--primary) shadow-[0_0_7px_var(--primary)]",
          (tone === "stopping" || tone === "launching") && "animate-pulse bg-(--primary-soft)",
          tone === "missing" && "bg-destructive",
        )}
      />
      {instanceStatusLabel(status, pending)}
    </Badge>
  );
}
