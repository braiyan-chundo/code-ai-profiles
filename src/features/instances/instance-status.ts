import type { InstanceStatus } from "../../types";

/** El estado visible de una instancia o de la aplicación original. «Deteniendo…» mientras corre su `stop:<id>`. */
export function instanceStatusLabel(status: InstanceStatus, stopping = false): string {
  if (stopping) return "Deteniendo…";
  if (status === "running") return "Ejecutándose";
  return status === "missing" ? "No disponible" : "Detenido";
}
