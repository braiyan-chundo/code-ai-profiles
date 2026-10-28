import { Outlet } from "react-router";
import { useRuntimePlatform } from "../../features/dashboard";
import { DialogHost } from "./DialogHost";
import { Statusbar } from "./Statusbar";
import { Titlebar } from "./Titlebar";

/**
 * La ruta de layout. La titlebar, el statusbar y los diálogos persisten al navegar; `<Outlet />` pinta la
 * pantalla en las filas 2 y 3 de `.app-window` (su barra y su `.content`). Sin envoltorios nuevos. El tema y el
 * tamaño del texto van en `<html>` (HU-0016, A-3), no aquí.
 */
export function AppShell() {
  const runtimePlatform = useRuntimePlatform();
  return (
    <div className={`desktop-shell platform-${runtimePlatform}`}>
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
