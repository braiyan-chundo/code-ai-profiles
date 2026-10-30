# Revisión técnica · HU-0026 · Arrancar y detener instancias desde el sidebar y el dashboard

Fecha: 2026-10-30 · Revisa: architect · HEAD revisado: `91c553b` (rama `ajustes-proyectos-e-instancias`)

- **Frontend:** `dca8a1f` (código y pruebas) y `47ca535` (evidencias).
- **Fuera de la revisión:** los commits de la HU-0025 de la misma rama. Lo único que comparten es la línea
  `dialogOpen` de `AppSidebar.tsx`. La HU-0025 añadió `projectDialog` sin tocar `launch`/`stop` ni la lista de instancias.

## Veredicto: **PASS con observaciones**

No hay nada que bloquee. R-1 a R-3 son observaciones baratas y las puede corregir el frontend antes de cerrar o en un
`/fix`.

**Condición antes de la prueba humana:** la suite completa, una vez, sobre el SHA final. `pruebas.mjs estado` dice
«HEAD 91c553b sin suite en verde». No corrí pruebas.

## Lo comprobado

| Punto | Resultado |
| --- | --- |
| Mismos comandos y mismo camino de errores | Sí. El sidebar, el dashboard y la página de la instancia llaman a `useInstanceActions().launch/stop`, que pasan por `runAction` y `bridge.launch/stop` (`launch_instance`/`stop_instance`). Rust no cambia. El error llega por `friendlyError` → `setError(mensaje, título)` → `FeedbackBanners`, con el título «No se pudo abrir/detener {nombre}» y el mensaje de Rust debajo, también en la página de la instancia (S-5) |
| Doble disparo y carreras | `runAction` adelanta `busyRef.current = key` antes del render, y `launch`/`stop` salen si `busyRef.current !== null`. Un segundo clic en el mismo tick ya no dispara nada. `disabled = busy !== null` en los dos botones nuevos (S-4). El adelanto también hace que `useBackgroundRefresh` vea antes la operación en curso, y eso es correcto. `busyRef` vuelve a `store.busy` en el render siguiente a `setBusy(null)` |
| El botón no roba el clic de la fila | En el sidebar, `SidebarMenuAction` es hermano del `Link` dentro de `SidebarMenuItem` y no va anidado. En el dashboard, la fila deja de ser `<a>`: el `Link` del nombre la cubre con `after:absolute after:inset-0`, y el botón va en un `span` `relative z-10`, así que tampoco navega cuando está deshabilitado. `ItemTitle` y `ItemContent` no están posicionados, de modo que el `::after` toma como referencia la fila (`relative`) |
| Nombres accesibles | `instanceToggle().label` da «Abrir X», «Detener X», «Abriendo X…» y «Deteniendo X…». Se usa como `aria-label` en los dos botones, con `aria-busy` cuando está en curso y el `Spinner` `aria-hidden`. En el dashboard, el texto visible («Abrir»/«Detener») está dentro del nombre accesible, como pide WCAG 2.5.3 |
| Original y «No disponible» | La original no está en `state.instances` (ni en el sidebar ni en `usageRanking`), así que no lleva botón. `missing` → `instanceToggle` devuelve `null`: en el sidebar no hay botón y en el dashboard queda un hueco `aria-hidden` del mismo ancho. Hay prueba |
| Estado intermedio | `instancePending` solo reconoce `launch:<id>` y `stop:<id>` exactos, nunca `stop:ab` para `a`. `instanceToggle` mantiene la acción en curso aunque el estado aún no haya cambiado. Hay pruebas de las dos cosas |
| Catálogo | `SidebarMenuAction` solo lo usa `AppSidebar`. El cambio está documentado como diferencia 6 en `componentes/sidebar.md` |
| Plataformas, privacidad y contrato | No cambian el IPC, Rust, los permisos ni la red. Solo se usan el nombre y el estado. El hover y el foco funcionan igual en las tres plataformas |

## Hallazgos

### R-1 · `listitem` dentro de un `group` · no bloquea · frontend

`src/app/routes/dashboard/UsageRanking.tsx:40` deja `ItemGroup role="group"`, y la HU añade `role="listitem"` a cada
fila (`:47`). En ARIA, `listitem` necesita un padre `list` (axe: *aria-required-parent*), y algunos lectores de pantalla
dejan de anunciar «lista, N elementos». **Corrección:** quitar `role="group"` del `ItemGroup`, que ya es `role="list"`
en el catálogo, y conservar el `aria-label`. La otra opción es quitar `role="listitem"` de las filas.

### R-2 · En la página de la instancia, «Abrir»/«Detener» parecen activos pero no hacen nada · no bloquea · frontend

`src/features/instances/InstanceDetail.tsx:130` y `:137` solo se desactivan con `isBusy` (una operación de **esta**
instancia). Con la guarda nueva de `useInstanceActions.ts:28` y `:32`, si corre otra operación (un escaneo, otra
instancia, la sincronización), el clic se ignora sin decir nada. Antes se lanzaba y pisaba el `busy`, y eso era peor.
Ahora el botón parece activo y no responde. **Corrección:** en `InstanceDetail`, `disabled={busy !== null}` para los dos
botones (el mismo criterio que `instanceToggle.disabled` y que «Actualizar» en esa misma tarjeta), o calcularlos con
`instanceToggle`.

### R-3 · Las barras de uso tapan el enlace que cubre la fila · no bloquea · frontend

`Progress` es `relative` y está después del `Link` en el DOM, así que en el orden de pintado queda encima de su
`::after`. Un clic justo sobre la barra de 6 px (`UsageRanking.tsx:81-82`) no navega. **Corrección:**
`pointer-events-none` en los dos `UsageBar` de esta fila. No pierden nada, porque no son interactivos.

## Lo que solo comprueba una persona

- Pasar el ratón y tabular en el sidebar: el contador cede su sitio sin mover la fila. Con el sidebar plegado no hay
  botón y el tooltip dice «nombre · Abriendo…».
- Con una instancia real, abrir desde el sidebar y desde el dashboard, incluido el aviso de macOS cuando bloquea la
  copia. Detener con la verificación de identidad de Rust y comprobar que el error sale con el nombre.
- Que el clic en la fila sigue navegando y el del botón no, a 1440 y a 980, en claro y en oscuro.
- Windows y Linux solo se compilan en `build-desktop.yml`. El hover sin ratón en Linux depende del foco de teclado.
