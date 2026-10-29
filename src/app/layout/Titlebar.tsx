import { MinusIcon, SquareIcon, XIcon } from "lucide-react";
import type { ReactNode } from "react";
import { BrandMark } from "../../components/BrandMark";
import { SidebarTrigger } from "../../components/ui/sidebar";
import { useRuntimePlatform } from "../../features/dashboard";
import { cn } from "../../lib/utils";
import { windowAction } from "./window-actions";

/**
 * La barra superior a todo el ancho (HU-0016, A-6 y A-7), encima del sidebar y del contenido. Su alto es
 * `--titlebar-height` (lo fija `AppShell`). macOS: los semáforos nativos van superpuestos en `x:28, y:40`, así que se
 * reservan 106 px a la izquierda. Windows: ventana sin decoraciones, con los controles propios arriba a la derecha.
 * Linux: las decoraciones las pone el gestor de ventanas. Se arrastra desde cualquier zona sin controles.
 */
export function Titlebar() {
  const platform = useRuntimePlatform();
  return (
    <header
      data-tauri-drag-region
      className={cn(
        "relative flex h-(--titlebar-height) shrink-0 items-center gap-3 border-b border-border px-3 select-none",
        platform === "macos" && "pl-[106px]",
        platform === "windows" && "pr-[150px]",
      )}
    >
      <SidebarTrigger className="size-8 text-muted-foreground hover:text-foreground" />
      <div data-tauri-drag-region className="flex min-w-0 items-center gap-2.5">
        <BrandMark size={24} className="shrink-0 text-(--primary-soft) in-[.theme-light]:text-primary-text" />
        <span data-tauri-drag-region className="truncate text-xl font-bold tracking-[-0.045em] text-foreground">
          Code AI Profiles
        </span>
        <span className="rounded-[5px] border border-(--line-strong) px-1.5 pt-1 pb-[3px] font-mono text-(length:--fs-micro) leading-none font-semibold tracking-[0.12em] text-muted-foreground">
          BETA
        </span>
      </div>

      {platform === "windows" && (
        <div className="absolute top-0 right-2.5 z-10 flex" aria-label="Controles de ventana">
          <WindowButton label="Minimizar" onClick={() => void windowAction("minimize")}><MinusIcon /></WindowButton>
          <WindowButton label="Maximizar" onClick={() => void windowAction("maximize")}><SquareIcon className="size-3.5!" /></WindowButton>
          <WindowButton label="Cerrar" close onClick={() => void windowAction("close")}><XIcon className="size-[18px]!" /></WindowButton>
        </div>
      )}
    </header>
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
        "grid h-9 w-[46px] place-items-center rounded-b-[7px] text-muted-foreground transition-colors [&_svg]:size-4 [&_svg]:stroke-[1.5]",
        "hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
        close && "hover:bg-(--ui-window-close) hover:text-primary-foreground",
      )}
    >
      {children}
    </button>
  );
}
