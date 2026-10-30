import type { InstanceStatus } from "../../types";

/** La operación en curso sobre una instancia, deducida del `busy` único del store (HU-0026, A-1). */
export type InstancePending = "launching" | "stopping";

/** «Abriendo» si `busy` es `launch:<id>`, «Deteniendo» si es `stop:<id>`; cualquier otra cosa no es de esta instancia. */
export function instancePending(busy: string | null, id: string): InstancePending | null {
  if (busy === `launch:${id}`) return "launching";
  if (busy === `stop:${id}`) return "stopping";
  return null;
}

/** El estado visible de una instancia o de la aplicación original, con la operación en curso delante. */
export function instanceStatusLabel(status: InstanceStatus, pending: InstancePending | null = null): string {
  if (pending === "launching") return "Abriendo…";
  if (pending === "stopping") return "Deteniendo…";
  if (status === "running") return "Ejecutándose";
  return status === "missing" ? "No disponible" : "Detenido";
}

/** El botón «Abrir»/«Detener» del sidebar y del dashboard (HU-0026, A-1). */
export interface InstanceToggle {
  action: "launch" | "stop";
  /** El nombre accesible: «Abrir {nombre}», «Detener {nombre}», «Abriendo {nombre}…» o «Deteniendo {nombre}…» (AC-05). */
  label: string;
  /** La operación de esta instancia está en curso. */
  pending: boolean;
  /** Corre una operación, de esta instancia o de otra: el `busy` es único (decisión 6). */
  disabled: boolean;
}

/**
 * Qué botón lleva una instancia: ninguno si no está disponible, «Detener» si se ejecuta y «Abrir» si no. Mientras corre
 * su propia operación, la acción es la de esa operación aunque el estado aún no haya cambiado.
 */
export function instanceToggle(
  instance: { id: string; name: string; status: InstanceStatus },
  busy: string | null,
): InstanceToggle | null {
  if (instance.status === "missing") return null;
  const pending = instancePending(busy, instance.id);
  const action = pending === "launching" ? "launch" : pending === "stopping" ? "stop" : instance.status === "running" ? "stop" : "launch";
  const label = pending
    ? `${action === "launch" ? "Abriendo" : "Deteniendo"} ${instance.name}…`
    : `${action === "launch" ? "Abrir" : "Detener"} ${instance.name}`;
  return { action, label, pending: pending !== null, disabled: busy !== null };
}
