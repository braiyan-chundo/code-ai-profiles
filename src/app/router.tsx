import { Navigate, createHashRouter } from "react-router";
import { AppShell } from "./layout/AppShell";
import { RouteErrorBoundary } from "./RouteErrorBoundary";
import { PanelRoute } from "./routes/panel/PanelRoute";

/**
 * Historial por hash: en Tauri no hay servidor que resuelva rutas profundas al recargar. `/` es el layout;
 * la ruta índice es el panel y cualquier otra vuelve a `/`. Las pantallas nuevas, como hijas de `/` y con `lazy`.
 */
export const router = createHashRouter([
  {
    path: "/",
    element: <AppShell />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <PanelRoute /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
