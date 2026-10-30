import { BrandMark } from "../../components/BrandMark";
import { cn } from "../../lib/utils";
import type { InstanceStatus } from "../../types";
import type { InstancePending } from "./instance-status";

/**
 * El icono de una instancia (el propio, si tiene, o la marca) con su punto de estado (HU-0016). Lo usan el sidebar, el
 * dashboard y las páginas. `iconSrc` sale de `managedIconSource`; la aplicación original pasa `null`.
 */
export function InstanceAvatar({
  iconSrc,
  status,
  pending = null,
  className,
  dotClassName,
}: {
  iconSrc: string | null;
  status: InstanceStatus;
  /** La operación en curso (HU-0026): el punto late al abrir y al detener. */
  pending?: InstancePending | null;
  className?: string;
  /** Para dar otro tamaño o posición al punto de estado (el avatar grande de una página). */
  dotClassName?: string;
}) {
  return (
    <span
      data-slot="instance-avatar"
      aria-hidden="true"
      className={cn(
        "relative inline-grid size-5 shrink-0 place-items-center rounded-md text-primary-text [&>svg]:size-full",
        className,
      )}
    >
      {iconSrc ? <img src={iconSrc} alt="" className="size-full rounded-[inherit] object-cover" /> : <BrandMark />}
      <span
        data-status={pending ?? status}
        className={cn(
          "absolute -right-0.5 -bottom-0.5 size-2 rounded-full bg-(--quiet) ring-2 ring-(--surface)",
          "data-[status=running]:bg-(--primary) data-[status=running]:shadow-[0_0_6px_var(--primary)]",
          "data-[status=stopping]:animate-pulse data-[status=stopping]:bg-(--primary-soft)",
          "data-[status=launching]:animate-pulse data-[status=launching]:bg-(--primary-soft)",
          "data-[status=missing]:bg-destructive",
          dotClassName,
        )}
      />
    </span>
  );
}
