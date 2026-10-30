import { MinusIcon, SquareIcon, XIcon } from "lucide-react";
import type { ReactNode } from "react";
import { SidebarTrigger, useSidebar } from "../../components/ui/sidebar";
import { useRuntimePlatform } from "../../features/dashboard";
import { cn } from "../../lib/utils";
import { windowAction } from "./window-actions";

/**
 * La zona de la ventana (HU-0019, A-1): arriba a la izquierda, sobre la columna del sidebar, con el botón de plegar.
 * Mide `--titlebar-height` (lo fija `AppShell`) y la barra de la página (`PageHeader`) ocupa el resto de la fila. Ya no
 * lleva la marca: vive en el panel. macOS: los semáforos nativos van superpuestos en `x:20, y:19`, así que se dejan
 * 84 px a la izquierda. Windows y Linux: 16 px. Windows: ventana sin decoraciones, con los controles propios arriba a
 * la derecha, a 10 px del borde. Linux: las decoraciones las pone el gestor de ventanas. Se arrastra desde cualquier
 * zona sin controles.
 */
export function Titlebar() {
  const platform = useRuntimePlatform();
  const { state } = useSidebar();
  return (
    <>
      <div
        data-tauri-drag-region
        className={cn(
          "absolute top-0 left-0 z-20 flex h-(--titlebar-height) min-w-max items-center transition-[width] duration-200 ease-linear select-none",
          state === "expanded" ? "w-(--sidebar-width)" : "w-16",
          platform === "macos" ? "pl-[84px]" : "pl-4",
        )}
      >
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
      </div>

      {platform === "windows" && (
        <div className="absolute top-0 right-2.5 z-20 flex" aria-label="Controles de ventana">
          <WindowButton label="Minimizar" onClick={() => void windowAction("minimize")}><MinusIcon /></WindowButton>
          <WindowButton label="Maximizar" onClick={() => void windowAction("maximize")}><SquareIcon /></WindowButton>
          <WindowButton label="Cerrar" close onClick={() => void windowAction("close")}><XIcon /></WindowButton>
        </div>
      )}
    </>
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
