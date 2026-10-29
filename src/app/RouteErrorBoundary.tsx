import { useRouteError } from "react-router";

/**
 * Relanza el error de la ruta (A-7): un fallo de render se comporta como sin router, en lugar de mostrar la
 * pantalla de error por defecto de React Router. Una pantalla de error propia la decide una historia.
 */
export function RouteErrorBoundary(): never {
  throw useRouteError();
}
