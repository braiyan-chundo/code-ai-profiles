import type { CSSProperties } from "react";
import { Outlet } from "react-router";
import { SidebarInset, SidebarProvider } from "../../components/ui/sidebar";
import { TooltipProvider } from "../../components/ui/tooltip";
import { useAppearance } from "../../features/appearance";
import { useRuntimePlatform } from "../../features/dashboard";
import { cn } from "../../lib/utils";
import { AppSidebar } from "./AppSidebar";
import { DialogHost } from "./DialogHost";
import { FeedbackArea } from "./FeedbackArea";
import { Statusbar } from "./Statusbar";
import { Titlebar } from "./Titlebar";

/** Ancho del sidebar desplegado (DESIGN.md: 260 px); plegado, el del catálogo (3rem). */
const SIDEBAR_STYLE = { "--sidebar-width": "260px" } as CSSProperties;

/**
 * La ruta de layout (HU-0016, A-6): la titlebar a todo el ancho y, debajo, el sidebar y el contenido. `SidebarInset`
 * tiene cuatro filas: la barra de la página (1), el feedback (2, A-10), su contenido (3) y el statusbar (4). La pantalla
 * (`<Outlet />`) pinta dos hijos sin envoltorio, `PageHeader` y `PageContent`, que fijan sus filas. `DialogHost`, al
 * final: sus diálogos se pintan en un portal de `body`.
 *
 * - La raíz lleva `data-slot="desktop-shell"` y la clase `platform-*` (el gancho de cada plataforma). El marco
 *   (`SidebarProvider`, `data-slot="sidebar-wrapper"`) lleva `transform` para que el `position: fixed` del sidebar
 *   quede dentro de la ventana y sus esquinas redondeadas (Windows) lo recorten. La raíz fija `--titlebar-height`
 *   por plataforma (A-7).
 * - El tema y el tamaño del texto van en `<html>` (A-3). `body` es transparente: el fondo lo pinta el marco.
 * - El sidebar plegado o desplegado se guarda en las preferencias de apariencia (A-5), sin cookie.
 */
export function AppShell() {
  const runtimePlatform = useRuntimePlatform();
  const { preferences, setPreferences } = useAppearance();
  const framed = runtimePlatform === "windows";
  return (
    <div
      data-slot="desktop-shell"
      className={cn(
        "relative isolate size-full",
        `platform-${runtimePlatform}`,
        runtimePlatform === "macos" ? "[--titlebar-height:94px]" : "[--titlebar-height:64px]",
      )}
    >
      <TooltipProvider delayDuration={300}>
        <SidebarProvider
          open={preferences.sidebar === "expanded"}
          onOpenChange={(open) => setPreferences((current) => ({ ...current, sidebar: open ? "expanded" : "collapsed" }))}
          style={SIDEBAR_STYLE}
          className={cn(
            "h-full min-h-0 flex-col overflow-hidden [transform:translateZ(0)] bg-(image:--ui-window) text-foreground [--sidebar:var(--surface-soft)]",
            framed && "rounded-[20px] border border-(--ui-window-border) shadow-(--ui-window-shadow)",
          )}
        >
          <Titlebar />
          <div className="flex min-h-0 flex-1">
            <AppSidebar />
            <SidebarInset className="grid min-h-0 min-w-0 grid-rows-[auto_auto_minmax(0,1fr)_auto] bg-transparent">
              <FeedbackArea />
              <Outlet />
              <Statusbar />
            </SidebarInset>
          </div>
        </SidebarProvider>
      </TooltipProvider>

      <DialogHost />
    </div>
  );
}
