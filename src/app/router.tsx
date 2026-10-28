import { Navigate, createHashRouter } from "react-router";
import { AppShell } from "./layout/AppShell";
import { RouteErrorBoundary } from "./RouteErrorBoundary";
import { DashboardRoute } from "./routes/dashboard/DashboardRoute";

/**
 * Historial por hash: en Tauri no hay servidor que resuelva rutas profundas al recargar (HU-0016, A-8).
 * `/` es el layout; la ruta índice es la primera pantalla y no se difiere. `#/original` y `#/instancias/<id>` (el id es
 * un UUID opaco) se cargan con `lazy`; cualquier otra vuelve a `/`. El `hydrateFallbackElement` cubre el arranque en
 * una ruta diferida con el color de fondo, sin destello.
 */
export const router = createHashRouter([
  {
    path: "/",
    element: <AppShell />,
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <div className="size-full bg-background" />,
    children: [
      { index: true, element: <DashboardRoute /> },
      {
        path: "original",
        lazy: () => import("./routes/original/OriginalRoute").then(({ OriginalRoute }) => ({ Component: OriginalRoute })),
      },
      {
        path: "instancias/:instanceId",
        lazy: () => import("./routes/instance/InstanceRoute").then(({ InstanceRoute }) => ({ Component: InstanceRoute })),
      },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
