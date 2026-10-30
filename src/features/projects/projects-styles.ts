import type { ProjectHistoryState } from "../../types";

/**
 * Las clases de Tailwind que repiten las piezas de Proyectos (HU-0023). Los cuatro colores de estado son los de
 * `diseno/vista.md` y van siempre iguales (barra, leyenda, tabla y pestañas): «en curso» es `--primary` en oscuro y
 * `--primary-bright` en claro (el naranja claro no llega a 3:1 sobre blanco); «en espera» lleva además un marcador hueco
 * y, en la barra, una trama a 45°, porque en oscuro su tono queda a ΔE 8,8 de «en curso» (1,8 para protanopía).
 */

/** El punto de un estado: relleno, o un aro hueco para «en espera» y «sin estado». */
export const STATE_DOT: Record<ProjectHistoryState, string> = {
  inProgress: "bg-(--primary) in-[.theme-light]:bg-primary",
  waiting: "bg-transparent ring-2 ring-warning ring-inset",
  done: "bg-success",
  discarded: "bg-(--quiet)",
  unknown: "bg-transparent ring-2 ring-(--quiet) ring-inset",
};

/** El segmento de la barra: lo mismo, con la trama a 45° en «en espera». */
export const STATE_FILL: Record<ProjectHistoryState, string> = {
  inProgress: "bg-(--primary) in-[.theme-light]:bg-primary",
  waiting:
    "bg-[repeating-linear-gradient(135deg,var(--ui-warning)_0_3px,color-mix(in_srgb,var(--ui-warning)_35%,transparent)_3px_6px)]",
  done: "bg-success",
  discarded: "bg-(--quiet)",
  unknown: "bg-(--quiet)",
};

/** Etiqueta pequeña en mayúsculas y monoespaciada: perfil, fase, «Metodología v4», recuentos. */
export const BADGE_MONO = "font-mono text-(length:--fs-micro)/(--lh-micro) tracking-[0.05em] uppercase";

/** La etiqueta de una cifra y de un grupo: micro, negrita, mayúsculas y muy espaciada. */
export const EYEBROW =
  "text-(length:--fs-micro)/(--lh-micro) font-bold tracking-[0.08em] text-muted-foreground uppercase";

/** Una ruta: monoespaciada, pequeña y en gris. */
export const PATH_TEXT = "font-mono text-(length:--fs-small)/(--lh-small) text-muted-foreground";
