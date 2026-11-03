import { MinusIcon, SquareIcon, XIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useRuntimePlatform } from "../../features/dashboard";
import { cn } from "../../lib/utils";
import { windowAction } from "./window-actions";

/**
 * Lo que la ventana pone en la fila de `--titlebar-height` además de la barra de la página. Windows: ventana sin
 * decoraciones, con los controles propios arriba a la derecha, a 10 px del borde (`PageHeader` les reserva 160 px).
 * macOS: los semáforos nativos van superpuestos en `x:20, y:19`, sobre la cabecera del sidebar, que les deja el hueco.
 * Linux: las decoraciones las pone el gestor de ventanas. El botón de plegar el sidebar vive en `PageHeader`, antes de
 * las migas; el sidebar ocupa toda la altura.
 */
export function Titlebar() {
  const platform = useRuntimePlatform();
  if (platform !== "windows") return null;
  return (
    <div className="absolute top-0 right-2.5 z-20 flex" aria-label="Controles de ventana">
      <WindowButton label="Minimizar" onClick={() => void windowAction("minimize")}><MinusIcon /></WindowButton>
      <WindowButton label="Maximizar" onClick={() => void windowAction("maximize")}><SquareIcon /></WindowButton>
      <WindowButton label="Cerrar" close onClick={() => void windowAction("close")}><XIcon /></WindowButton>
    </div>
  );
}

function WindowButton({
  label,
  close = false,
  onClick,
  children,
}: {
  label: string;
  close?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid h-9 w-12 place-items-center rounded-b-sm text-muted-foreground transition-colors [&_svg]:size-4 [&_svg]:stroke-[1.5]",
        "hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
        close && "hover:bg-(--ui-window-close) hover:text-primary-foreground",
      )}
    >
      {children}
    </button>
  );
}
