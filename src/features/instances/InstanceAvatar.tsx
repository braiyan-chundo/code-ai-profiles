import { useState } from "react";
import { BrandMark } from "../../components/BrandMark";
import { cn } from "../../lib/utils";
import type { InstanceStatus } from "../../types";
import { showsProviderBadge } from "./avatar-badge";
import type { InstancePending } from "./instance-status";

/**
 * El icono de una instancia (el propio, si tiene, o la marca) con su punto de estado (HU-0016). Lo usan el sidebar, el
 * dashboard y las páginas. `iconSrc` sale de `managedIconSource`; la aplicación original pasa `null`.
 */
export function InstanceAvatar({
  iconSrc,
  status,
  pending = null,
  badgeSrc = null,
  className,
  dotClassName,
  badgeClassName,
}: {
  iconSrc: string | null;
  status: InstanceStatus;
  /** La operación en curso (HU-0026): el punto late al abrir y al detener. */
  pending?: InstancePending | null;
  /** El icono de la aplicación original (HU-0028): solo se ve junto a un icono propio y si carga. */
  badgeSrc?: string | null;
  className?: string;
  /** Para dar otro tamaño o posición al punto de estado (el avatar grande de una página). */
  dotClassName?: string;
  /** Para dar otra posición al distintivo (el avatar grande de una página). */
  badgeClassName?: string;
}) {
  const [failedBadge, setFailedBadge] = useState<string | null>(null);
  const badged = showsProviderBadge(iconSrc, badgeSrc, failedBadge);
  return (
    <span
      data-slot="instance-avatar"
      data-badged={badged || undefined}
      aria-hidden="true"
      className={cn(
        "group/avatar relative inline-grid size-5 shrink-0 place-items-center rounded-md text-primary-text [&>svg]:size-full",
        className,
      )}
    >
      {iconSrc ? <img src={iconSrc} alt="" className="size-full rounded-[inherit] object-cover" /> : <BrandMark />}
      {badged && (
        <img
          src={badgeSrc!}
          alt=""
          draggable={false}
          onError={() => setFailedBadge(badgeSrc)}
          className={cn(
            "pointer-events-none absolute -right-0.5 -bottom-0.5 size-[36%] [filter:drop-shadow(0_0_1.5px_var(--surface))_drop-shadow(0_0_1px_var(--surface))]",
            badgeClassName,
          )}
        />
      )}
      <span
        data-status={pending ?? status}
        className={cn(
          "absolute -right-0.5 -bottom-0.5 size-2 rounded-full bg-(--quiet) ring-2 ring-(--surface)",
          "data-[status=running]:bg-(--primary) data-[status=running]:shadow-[0_0_6px_var(--primary)]",
          "data-[status=stopping]:animate-pulse data-[status=stopping]:bg-(--primary-soft)",
          "data-[status=launching]:animate-pulse data-[status=launching]:bg-(--primary-soft)",
          "data-[status=missing]:bg-destructive",
          "group-data-badged/avatar:bottom-auto group-data-badged/avatar:-top-0.5",
          dotClassName,
        )}
      />
    </span>
  );
}
