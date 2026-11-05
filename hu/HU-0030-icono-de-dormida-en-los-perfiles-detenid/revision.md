# Revisión técnica · HU-0030 · Icono de dormida en los perfiles detenidos

Fecha: 2026-11-05 · Revisa: architect · HEAD revisado: `9272d5c` (rama `fix-ventanas-consola-windows`)

- **Frontend:** `39cd60c` (`SleepingMark.tsx`, `isSleeping`, `AppSidebar.tsx`, `UsageRanking.tsx`, prueba).
- **Referencia:** `hu.md` (D-1 a D-4, AC-01 a AC-03) y `diseno/vista.md` + `diseno/maqueta.html` (aprobada con «zᶻ»).
  Sin arquitectura.
- Incluye el **fix de ancho** `29e1fbd` (sin historia), en su propia sección.

## Veredicto: **FAIL** (un bloqueo; arreglarlo es cuestión de una línea)

La suite no está corrida sobre el SHA final (`pruebas.mjs estado`: «HEAD 9272d5c sin suite en verde»). No corrí pruebas.

## Lo comprobado

| Punto | Resultado |
| --- | --- |
| Condición (D-1, AC-03) | `isSleeping(status, pending)` = `status === "stopped" && pending === null` (`instance-status.ts:50`). En el sidebar y en el dashboard recibe el `pending` de `instancePending(busy, id)`. Al pulsar «Abrir», `pending` pasa a `launching` y el icono se va en ese momento. Al detener, aparece cuando el estado llega a `stopped` y el `busy` se limpia. La prueba cubre los cinco casos (`dashboard-state.test.ts`). `missing` no lleva icono |
| Original | `AppSidebar.tsx:187`: `sourceFound && isSleeping(originalStatus, null)`. Hoy la original no tiene una operación en curso en el sidebar, así que `null` es correcto (ver O-3) |
| Sidebar plegado (D-3) | `group-data-[collapsible=icon]:hidden` en las dos filas: plegado, solo queda el avatar con su punto |
| Accesibilidad (D-4) | `aria-hidden="true"` y `select-none` en el glifo. El estado lo siguen diciendo el `sr-only`, el `tooltip` del sidebar y la insignia del dashboard. El texto accesible de la fila no cambia |
| Color (desviación) | Usa `text-muted-foreground` en lugar de `text-(--quiet)`. **Aceptada.** La prueba 14 de `ui-isolation.test.ts:191` prohíbe `--quiet` en texto porque no llega al contraste (3,4:1 en oscuro y 2,9:1 en claro). La vista pedía un tono apagado, y este lo es y además se lee |
| Tamaños (desviación) | La primera «z» usa `--fs-small` (12 px). La segunda, `--fs-micro` (11 px) con `scale-[0.82]` ≈ 9 px y `-translate-y-1.5` (6 px), así que encaja con la vista (12 / 9 / −6) sin tamaños sueltos. **Aceptada.** `items-start` frente a `flex-end` de la maqueta da casi el mismo dibujo: lo confirma la prueba humana |
| Dashboard (AC-02) | `UsageRanking.tsx:73`: va justo después del `Link` del nombre y antes de la insignia. El `Link` no lleva `flex-1`, así que queda pegado (gap-x-2 = 8 px), como en la vista |

## Bloqueos

- **B-1 · media · frontend** · `src/app/layout/AppSidebar.tsx:186` y `:232`. En el sidebar el icono **no queda pegado
  al nombre**, como piden AC-01 («justo después del nombre») y `vista.md` («pegado al nombre… antes del espacio
  flexible»). El `<span>` del nombre conserva `min-w-0 flex-1 truncate`. Con `flex-1` el nombre ocupa todo el espacio
  libre y empuja `SleepingMark` al borde derecho del enlace, junto a la caja del contador o del botón. Con nombres
  cortos («Trabajo») queda lejos del nombre. La maqueta separa el nombre y el espacio flexible (`.name` + `sleep()` +
  `.grow`).

  **Arreglo:** quitar `flex-1` del `<span>` del nombre en las dos filas (la original y las instancias) y dejar
  `min-w-0 truncate`. El contador y el botón son hermanos absolutos del enlace, así que no se mueven, y el nombre se
  sigue truncando antes que el icono (`shrink-0`). Volver a mirar en el navegador que no cambie nada con el sidebar
  plegado.

## Observaciones

- **O-1 · informativa · orquestador** · `diseno/vista.md` dice `text-(--quiet)`. Al cerrar, hay que anotar en
  `verificacion.md` la desviación a `text-muted-foreground` y su motivo (la prueba 14).
- **O-2 · baja · persona** · Pendiente humano de la HU: el glifo en mono y negrita depende de la fuente mono de cada
  sistema (SF Mono, Cascadia/Consolas, DejaVu). Hay que mirarlo en Windows y Linux.
- **O-3 · informativa · frontend (a futuro)** · `AppSidebar.tsx:187` pasa `null` como `pending` de la original. Si algún
  día se puede abrir o detener la original desde el sidebar, `isSleeping` tiene que recibir esa operación.

## Fix de ancho · `29e1fbd` (sin historia)

Quita `mx-auto max-w-[1200px]` de 8 vistas. Ajustes también pierde `max-w-[896px]`. La lista de proyectos pasa de
`grid-cols-2` (1 columna por debajo de 760 px) a `repeat(auto-fill, minmax(380px, 1fr))`.

- **No rompe nada evidente.** Con `minWidth: 980` (`tauri.conf.json:20`) y el sidebar de 16rem, el área principal
  mínima ronda los 676 px. Nunca baja de 380, así que la rejilla no desborda en horizontal. En la ventana mínima hay
  1 columna (antes había 2). Con el sidebar plegado o con ventanas anchas, 2 o más columnas. Ninguna prueba dependía de
  esos anchos: `ui-isolation.test.ts:556` solo usa `w-[896px]` como muestra del analizador.
- **O-4 · baja · orquestador** · `DESIGN.md:130` sigue diciendo «maximum container of 1200px to maintain readability».
  Hay que actualizarlo al ancho fluido para que el siguiente frontend no vuelva a poner el tope.
- **O-5 · baja · persona/frontend** · Ajustes (`SettingsRoute.tsx:34`) queda sin tope. En ventanas muy anchas, las
  filas de formulario con el control a la derecha separan mucho la etiqueta del control. Conviene mirarlo en la prueba
  humana. Si molesta, se puede devolver un `max-w` solo al contenido de las pestañas.

## Responsables

B-1: frontend, y después vuelve a revisión, que se limitará a esas dos líneas. O-1 y O-4: orquestador al cerrar. O-2 y
O-5: prueba humana.

## Seguimiento del orquestador (2026-11-05)

- B-1 corregido en `ae69ef9`: los nombres del sidebar sin `flex-1`; el «zᶻ» queda pegado al nombre (comprobado en `pnpm dev`).
- O-4 (fix de ancho) corregida en el mismo commit: `DESIGN.md` ya no habla de un contenedor de 1200 px.
- O-1 anotada en `verificacion.md`. O-2 y O-5 quedan para la prueba humana; O-3 como nota para el futuro.
