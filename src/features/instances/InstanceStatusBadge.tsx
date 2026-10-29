import { Badge } from "../../components/ui/badge";
import { cn } from "../../lib/utils";
import type { InstanceStatus } from "../../types";
import { instanceStatusLabel } from "./instance-status";

/** El estado de una instancia o de la aplicación original: Ejecutándose, Detenido, No disponible o Deteniendo…. */
export function InstanceStatusBadge({
  status,
  stopping = false,
  className,
}: {
  status: InstanceStatus;
  stopping?: boolean;
  className?: string;
}) {
  const tone = stopping ? "stopping" : status;
  return (
    <Badge
      variant="outline"
      data-status={tone}
      className={cn(
        "gap-2 font-mono text-(length:--fs-micro)/(--lh-micro) font-semibold tracking-[0.06em] text-muted-foreground uppercase",
        "data-[status=running]:border-primary/30 data-[status=running]:bg-primary/10 data-[status=running]:text-primary-text",
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
          tone === "stopping" && "animate-pulse bg-(--primary-soft)",
          tone === "missing" && "bg-destructive",
        )}
      />
      {instanceStatusLabel(status, stopping)}
    </Badge>
  );
}
