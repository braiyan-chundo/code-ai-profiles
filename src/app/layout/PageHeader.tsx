import { ChevronRightIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useSidebar } from "../../components/ui/sidebar";
import { useRuntimePlatform } from "../../features/dashboard";
import { cn } from "../../lib/utils";

/**
 * La barra de una página (HU-0019, A-1; fila 1 de `SidebarInset`, la de `--titlebar-height`; la 2 es `FeedbackArea`):
 * las migas «Sección › Página» y, a la derecha, sus acciones. Cada ruta pinta esta barra y su `PageContent` sin
 * envoltorio. Es zona de arrastre de la ventana: en Tauri 2 `data-tauri-drag-region` no se hereda, así que va en cada
 * elemento sin controles. Windows reserva 160 px a la derecha para los tres controles de la ventana; macOS con el
 * sidebar plegado deja 68 px a la izquierda para no tapar el botón de plegar (que sobresale de la columna de 64 px).
 */
export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  const platform = useRuntimePlatform();
  const { state } = useSidebar();
  return (
    <header
      data-tauri-drag-region
      className={cn(
        "row-start-1 flex h-(--titlebar-height) min-w-0 items-center justify-between gap-4 px-8 select-none max-[1070px]:px-6",
        platform === "windows" && "pr-[160px] max-[1070px]:pr-[160px]",
        platform === "macos" && state === "collapsed" && "pl-[68px] max-[1070px]:pl-[68px]",
      )}
    >
      <div data-tauri-drag-region className="flex min-w-0 items-center gap-1.5">
        <span data-tauri-drag-region className="text-(length:--fs-body) font-medium whitespace-nowrap text-muted-foreground">
          {eyebrow}
        </span>
        <ChevronRightIcon aria-hidden="true" className="pointer-events-none size-3.5 shrink-0 text-muted-foreground" />
        <h1 data-tauri-drag-region className="m-0 truncate text-(length:--fs-title) leading-tight font-semibold tracking-[-0.025em] text-foreground">
          {title}
        </h1>
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </header>
  );
}
