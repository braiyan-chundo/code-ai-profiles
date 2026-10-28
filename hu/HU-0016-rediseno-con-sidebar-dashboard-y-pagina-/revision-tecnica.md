# Revisión técnica · HU-0016 · Rediseño con sidebar, dashboard y página por instancia

**Veredicto: PASS.** No hay bloqueos. Las desviaciones de E3 son correctas, y tres de ellas cambian algo visible que
hay que declarar (R-2 y R-3). Lo que sigue abierto es lo de siempre al cerrar (R-9) y un par de mejoras opcionales.

Revisado el 2026-10-28 sobre `hu-0016-rediseno-sidebar`, diff `ed8b3b1..8caf37f` (más el paso O, `a8091c2`), contra
`arquitectura.md`.

**Pruebas.** `pruebas.mjs estado` da «HEAD 8caf37f sin suite en verde». No he corrido pruebas. Leí el `dist/` que hay
en local (de las 12:27, el build de E3), sin volver a construirlo.

## Método

- Leí enteros: `DashboardRuntime` (sin diff), `DialogsProvider`, `DialogHost`, los siete diálogos, el diff de
  `components/ui/{dialog,alert-dialog,sheet,sidebar}.tsx`, `AppShell`, `Titlebar`, `AppSidebar`, `router.tsx`,
  `InstanceRoute`, `OriginalRoute`, `AppearanceProvider`, `styles/{index,tokens}.css`, `vite.config.ts`, `main.tsx`,
  `webview-support.ts`, `tests/ui-isolation.test.ts` y `validate.yml`.
- Con `rg`: los listeners de `src/`, los componentes del catálogo que importa la app y los accesos a almacenamiento y
  red.
- En `dist/assets/index-*.js`: qué dependencias llegan y cuántos `addEventListener("focus"|"blur"|"visibilitychange")`
  hay.
- Las fichas de `dialog`, `alert-dialog`, `sheet` y `sidebar` («Diferencias con el registro»), el tamaño de las skills
  y `metodo.mjs validar`.

## Los siete puntos pedidos

**1 · R-1 de HU-0015: se mantiene.**
- `DashboardRuntime.tsx`, los hooks de ejecución, `lib/*-controller.ts`, `bridge.ts`, `types.ts` y `src-tauri/` (salvo
  la línea de O-1) no tienen diff.
- En `src/`, los únicos `focus`, `blur` y `visibilitychange` siguen en `useSourceUpdateRuntime.ts:40-42`,
  `useLiveUsage.ts:31` y `useBackgroundRefresh.ts:19`. Los listeners nuevos son de otro tipo: el `keydown` de Ctrl/⌘ F
  en `AppSidebar.tsx:74` y el `change` de `use-mobile`. El `keydown` de Escape de `DialogsProvider` desaparece.
- **En el bundle hay exactamente cinco** `addEventListener` de esos tipos: los de los tres dueños. La app importa
  `dialog`, `alert-dialog`, `tooltip`, `checkbox`, `radio-group`, `progress`, `sidebar` y otros sin estado. **No importa**
  `select`, `dropdown-menu`, `context-menu` ni `menubar` (los que registran `blur` en `window` mientras están abiertos), ni
  `sonner` ni el toast de Radix. Dialog y FocusScope usan `focusin`/`focusout` y `pointerdown` en `document`, que no
  tocan `suppressNextGeneralFocus`.
- Al cerrar un diálogo, devolver el foco a un elemento con `.focus()` no dispara el `focus` de `window`.
- **`test:ui`.** La prueba 8 es la que protege R-1: compara con `deepEqual` la lista de dueños, así que falla si sobra
  uno o si falta uno. Las pruebas 10 y 11 no protegen R-1: impiden que vuelvan el CSS y los iconos propios. Los límites
  de la 8 están en R-1 (O).

**2 · Guardas de `busy`: correctas en los siete diálogos.**
- Cada uno hace `onOpenChange={(open) => { if (!open && !busy) onClose() }}`. El `busy` es el mismo que antes usaba la
  X de `ModalFrame`: `create`/`update`, `delete:`, `transfer:`, `unlink:`, `update-applications` y `update-original`.
  Apariencia no tiene `busy`.
- La X se deshabilita con `closeDisabled={busy}`, y «Cancelar» y `AlertDialogCancel`, con `disabled={busy}`.
- **La carrera no se da.** `setBusy` se llama de forma síncrona antes del primer `await`: dentro de `runAction`, y en el
  editor, al principio de `save`. El clic es un evento discreto, así que React 19 renderiza al terminarlo, y el siguiente
  Escape o clic fuera ya ve `busy`.
- Confirmar con un `Button` en lugar de `AlertDialogAction` es necesario: `Action` es un `Close` de Radix y cerraría el
  diálogo antes de marcar `busy`.
- Lo que cambia frente a antes, en R-2 y R-3.

**3 · Plataformas: bien en el código. La comprobación real es humana.**
- **macOS**: `--titlebar-height: 94px` y `pl-[106px]` (`AppShell.tsx:40`, `Titlebar.tsx:22`). El semáforo, en `x:28` y
  de unos 52 px de ancho, queda libre con el sidebar plegado o desplegado, porque el sidebar empieza debajo de la
  titlebar (`AppSidebar`: `top-(--titlebar-height)! h-auto!`).
- **Windows**: los controles propios están arriba a la derecha (46×36, el de cerrar con hover en `--ui-window-close`),
  con un margen derecho de 150 px. El marco lleva `rounded-[20px] overflow-hidden [transform:translateZ(0)]`, así que el
  sidebar `fixed` queda dentro y recortado. `body` es transparente. El velo de los diálogos cubre las esquinas, como
  antes (R-7).
- **Linux**: no pinta controles, solo la titlebar de 64 px.
- **Aviso de motor**: `isWebviewSupported` es pura y se prueba en `tests/format.test.ts`. Exige
  `CSSLayerBlockRule` y `color-mix`, y si falla pinta un `<p role="alert">` con estilos en línea, sin red. Ver R-6.
- **O-1** está en `a8091c2` (`minimumSystemVersion: "13.3"`), y README y CHANGELOG ya documentan los mínimos.

**4 · Peso: aceptable, sin cambios ahora (R-5).** Ya anotado en `docs/arquitectura/frontend.md` § Design system.

**5 · Privacidad: en orden.**
- Sin `document.cookie`: la cookie salió de `sidebar.tsx`, `test:ui` 7 lo vigila y `validate.yml` busca
  `sidebar_state` en `dist`.
- Sin `fetch` ni otras APIs de red, y la CSP no cambia.
- `localStorage`: solo `code-ai-profiles:appearance`, con el campo `sidebar` validado.
- La URL lleva solo el UUID. Las fuentes y los iconos son locales.
- Los títulos de sesión se ven igual que antes.

**6 · AC-06: no se pierde nada**, contrastado con el inventario de `arquitectura.md`.
- Las acciones del sidebar, del dashboard y de las páginas, con los mismos `disabled` y `title`.
- En la original, la `SessionList` no lleva `disabled`, igual que antes. En la instancia, las sesiones se bloquean
  con `isBusy`.
- Estados, badges, hora de captura, contexto, vacíos y statusbar completos. Las cifras de la toolbar, en
  `SummaryCards`.
- Ctrl/⌘ F y Escape siguen.
- La búsqueda conserva la coincidencia por título de sesión (`filterInstances`). El autodespliegue de sesiones deja de
  hacer falta, porque la página las muestra siempre.
- Solo cambian el cierre de los `AlertDialog` y Escape (R-2 y R-3).

**7 · La skill de 12,3 KB es de esta historia (R-4).** Pasó de 11 998 a 12 600 bytes aquí.

## Las desviaciones de E3

| Desviación | Juicio |
| --- | --- |
| Diálogos restilizados en el catálogo y la prop `closeDisabled` | Aceptada. Así hay un solo aspecto de modal y no siete `className` repetidos. Va anotada en las fichas `dialog` y `alert-dialog`. El showcase también lo hereda, y está bien así |
| `AlertDialog` sin cierre con el clic fuera | Aceptada. Es el patrón de un diálogo de confirmación, pero cambia algo visible (R-2) |
| Confirmar con `Button` y no con `AlertDialogAction` | Correcta y necesaria (punto 2) |
| X deshabilitada con `busy` en todos | Equivalente a lo de antes (la X no hacía nada) y más clara. Aceptada |
| Tokens oscuros en `:root, .theme-dark` | Correcta: la muestra oscura de Apariencia dentro del tema claro los necesita. `.theme-light` va después y gana en `<html>` |
| `.desktop-shell` y `.app-frame` pasan a `data-slot` | Aceptada. No queda CSS que necesite esas clases |
| Fuera el `keydown` de Escape de `DialogsProvider` | Correcta: es lo que pedía A-12 |

## Observaciones (nada bloquea)

| | Bloquea | Dónde | Qué | Qué hacer | Responsable |
| --- | --- | --- | --- | --- | --- |
| R-1 | No | `tests/ui-isolation.test.ts:85,159` | La prueba 8 solo detecta `addEventListener("focus"…)` con literal en `src/`. No ve `window.onfocus = …`, un nombre de evento en una variable ni una dependencia nueva que los registre (por ejemplo, si mañana se usa `Select`) | Opcional, y es la guarda más directa: en `validate.yml`, después del build, contar los `addEventListener("(focus\|blur\|visibilitychange)"` de `dist/assets/*.js` y exigir 5. Además, comprobar a mano la vuelta tras «Actualizar original» (pendiente humano) | orquestador (CI) |
| R-2 | No | `DeleteInstanceDialog`, `UnlinkSessionDialog` | El clic fuera ya no cierra la confirmación de borrar ni la de desvincular (antes `ConfirmDialog` sí lo hacía). Se cierran con Escape y «Cancelar» | Declararlo en `verificacion.md` y en la entrada del CHANGELOG. Si la persona lo quiere como antes, basta con `onOverlayClick` sobre la misma guarda | orquestador |
| R-3 | No | `DialogsProvider` | Escape cierra solo el diálogo de encima y no cierra el editor ni el de borrar mientras su operación corre (A-12) | Declararlo junto con R-2 | orquestador |
| R-4 | No | `.claude/skills/code-ai-profiles-frontend-react-vite/SKILL.md` | 12 600 bytes: `metodo validar` avisa por encima de 12 KB. Lo causó esta historia | Antes de cerrar, pasar a `estilos.md` (dentro de la skill) el detalle de tokens, plataformas y diálogos, y dejar un enlace. Es poco trabajo. Si no da tiempo, deuda declarada al cierre | frontend |
| R-5 | No | `dist/` | CSS 57,6 → 214,5 kB (31,8 gzip) por `@source "../components"`: la app usa 18 de los 63 componentes. JS 383 → 573 kB (181 gzip): primitivas de Radix y lucide. No llegan recharts, shiki, date-fns, @base-ui, cmdk, vaul ni embla. Vite avisa de un chunk de más de 500 kB | Nada ahora: se carga del disco. Anotar las cifras en `docs/rendimiento.document.md`. Si importara: `@source not` para los componentes que no se usan, o diferir los diálogos (`lazy`). No se recomienda subir `chunkSizeWarningLimit` para ocultar el aviso | orquestador |
| R-6 | No | `src/main.tsx` | La comprobación del motor corre después de evaluar el módulo, porque `App` se importa de forma estática. Si un motor antiguo fallara al **interpretar** el bundle, no llegaría a verse el aviso. Con el objetivo por defecto de Vite (Safari 14), WebKitGTK 2.36 lo interpreta, así que el riesgo es bajo | Opcional: `import("./app/App")` dentro de la rama compatible | frontend (si se toca) |
| R-7 | No | Windows | El velo de los diálogos (`fixed inset-0` en `body`) cubre las esquinas transparentes de la ventana. Igual que antes con `.modal-backdrop` | Mirarlo en la prueba humana en Windows | mantenedor |
| R-8 | No | Proceso (bitácora, E1) | Al parar Vite, el implementador mató con `lsof -ti tcp:1420` el proceso de red de la instancia administrada en marcha del mantenedor | Añadir a `.metodo/reglas/frontend.md`: Vite se para por el PID que se lanzó, nunca matando por puerto; nunca se tocan procesos de los perfiles | orquestador |
| R-9 | No | Cierre | Falta la suite sobre el SHA final (`pruebas.mjs estado`) | `pruebas.mjs suite` una vez; `graph:update`/`graph:check`; `docs/rendimiento.document.md` (R-5); la entrada del CHANGELOG con R-2 y R-3; `docs/sesiones` e `instancias` si se cita la interfaz antigua | orquestador |

## Documentos de arquitectura

- **`docs/arquitectura/frontend.md`**, alineado con lo construido:
  - la estructura (`PageHeader`/`PageContent`/`PageSkeleton`, `NoticeAlert`, `webview-support`), y `showcase.css` ya no
    es «la única entrada de Tailwind»;
  - los imports relativos al catálogo;
  - la plataforma con `useRuntimePlatform()` (no `data-platform`), el `transform` en el marco y no en la raíz, los
    `data-slot` y los tokens en `:root, .theme-dark`;
  - el aspecto común de los diálogos, `closeDisabled` y el `AlertDialog` sin clic fuera;
  - que hoy no se usan los menús ni el `Select` de Radix;
  - el peso (R-5).
- **`arquitectura.md`**: nueva tabla «Lo construido frente al plan», con las mismas diferencias.

**Pendiente humano**:
- las tres plataformas: el semáforo de macOS con el sidebar plegado y desplegado; las esquinas, los controles y el velo
  en Windows; Linux;
- la vuelta tras «Actualizar original» en escritorio;
- Escape y clic fuera con una operación en curso;
- los tres temas en menús, diálogos y tooltips;
- 980×680;
- valorar el aspecto.
