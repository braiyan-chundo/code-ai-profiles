import { FolderXIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import { projectInitial } from "./projects-selectors";

const SIZES = {
  /** 16: el icono del sidebar. */
  sm: "size-4 rounded-xs text-(length:--fs-micro)/(--lh-micro)",
  /** 40: el de una tarjeta. */
  lg: "size-10 rounded-md text-(length:--fs-heading)/(--lh-heading)",
  /** 64: el de la página, igual que el avatar de una instancia. */
  xl: "size-16 rounded-lg text-(length:--fs-dialog)/(--lh-dialog)",
} as const;

/**
 * La inicial del proyecto en un cuadrado neutro: su identidad en el sidebar, la tarjeta y la página (HU-0023). Sin
 * colores por proyecto. Un proyecto roto lleva la inicial en rojo; en 40 y 64 enseña una carpeta tachada.
 */
export function ProjectInitial({
  name,
  size,
  broken = false,
  className,
}: {
  name: string;
  size: keyof typeof SIZES;
  broken?: boolean;
  className?: string;
}) {
  const icon = broken && size !== "sm";
  return (
    <b
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center bg-(--surface-soft) font-mono font-bold text-muted-foreground ring-1 ring-(--line-strong) ring-inset",
        SIZES[size],
        broken && "text-destructive ring-destructive/45",
        className,
      )}
    >
      {icon ? <FolderXIcon className={size === "xl" ? "size-8" : "size-5"} /> : projectInitial(name)}
    </b>
  );
}
