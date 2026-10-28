import { Outlet } from "react-router";
import { useAppearance } from "../../features/appearance";
import { useRuntimePlatform } from "../../features/dashboard";
import { DialogHost } from "./DialogHost";
import { Statusbar } from "./Statusbar";
import { Titlebar } from "./Titlebar";

/**
 * La ruta de layout. La titlebar, el statusbar y los diálogos persisten al navegar; `<Outlet />` pinta la
 * pantalla en las filas 2 y 3 de `.app-window` (su barra y su `.content`). Sin envoltorios nuevos.
 */
export function AppShell() {
  const { preferences: appearance, resolvedTheme } = useAppearance();
  const runtimePlatform = useRuntimePlatform();
  return (
    <div className={`desktop-shell platform-${runtimePlatform} theme-${resolvedTheme} session-text-${appearance.sessionTextSize}`}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <main className="app-window">
        <Titlebar />
        <Outlet />
        <Statusbar />
      </main>

      <DialogHost />
    </div>
  );
}
