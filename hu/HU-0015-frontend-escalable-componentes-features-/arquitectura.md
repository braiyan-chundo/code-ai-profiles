# Arquitectura · HU-0015 · Frontend escalable: componentes, features y router

<!-- La escribe architect. Dial arquitectura: ligera. Diseño: off (la referencia visual es la app actual). -->

## Preguntas abiertas

Ninguna bloquea. Dos avisos para el orquestador, sin decisión pendiente en esta historia:

1. **React Router 8 ya existe** (`npm view react-router version` → 8.5.1; exige React ≥ 19.2.7 y Node ≥ 22.22).
   La ★ D-3 y la autorización dicen v7, y la v7 sigue mantenida (7.18.5 publicada el 2026-10-27). Se instala
   `react-router@^7.18.5`: el `^` no salta a la 8. Pasar a la 8 sería otra decisión del mantenedor.
2. **La ★ D-1 de la HU-0014** justifica `showcase.html` con «la app no tiene router». Tras esta historia sí lo
   tiene. La decisión de la HU-0014 se mantiene (que el showcase no llegue al build), pero su justificación
   hay que reescribirla cuando se retome.

## Análisis

Confianza: alta. Es un refactor sin contrato nuevo, pero tiene concurrencia: el orden de los listeners de
`focus`, los refs de ciclo de vida del escaneo y los descartes por `generation`.

Leído: `src/App.tsx` (completo), `src/main.tsx`, `src/styles.css` (sus 959 líneas, por selector),
`src/lib/scan-controller.ts`, `src/lib/source-update-controller.ts`, `src/lib/bridge.ts` (importaciones),
`tests/*.test.ts`, `package.json`, `tsconfig*.json`, `vite.config.ts`, la `hu.md` de la HU-0014,
`.metodo/reglas/frontend.md` y la skill de frontend. El grafo: `graphify query "estructura del frontend…"`
(comunidades `App.tsx`, `InstanceCard`, `source-update-controller.ts`).

### Supuestos

- **S-1** · Vite 6 resuelve `@import` en CSS (con su postcss-import integrado) y lo inlinea en el orden escrito. Si no,
  el paso 1 lo detecta (el CSS compilado cambia de hash) y se vuelve a importar los archivos desde `main.tsx`
  en el mismo orden.
- **S-2** · `RouterProvider` de React Router 7 no añade nodos al DOM. Lo comprueba el paso 8, con la
  comparación del DOM.
- **S-3** · El mock de `bridge.ts` devuelve datos estables entre cargas (salvo los tiempos relativos), así que
  sirve para comparar el DOM antes y después.

### Impacto

| Símbolo que cambia | Consumidores | Qué se rompe si se hace mal |
| --- | --- | --- |
| `App` (src/App.tsx) | `main.tsx` | Todo: es la app entera |
| `styles.css` | `main.tsx` | Cascada; tema claro; cortes de ventana reducida |
| Efectos de `App` (12) | Rust por IPC; `window`/`document` | Escaneos dobles, refresco general tras volver de la actualización oficial, fugas de listeners |
| `scanController`, `sourceUpdateController` | `App` | Resultados viejos aplicados si se crean dos veces o se recrean al navegar |

- Contrato IPC: **no**. `src/types.ts`, `src/lib/bridge.ts` y `src-tauri/` no se tocan.
- Datos guardados: **no**. `localStorage["code-ai-profiles:appearance"]` conserva clave y formato. Sin migración.
- Privacidad: sin cambios. Ningún dato de perfil entra en la URL, en logs ni en estado nuevo.
- Plataformas: el hash funciona igual en `tauri://localhost` (macOS y Linux) y en `http://tauri.localhost` (Windows),
  y no necesita servidor. Los controles de ventana (Windows), el hueco de los semáforos (macOS) y la
  barra del gestor (Linux) siguen dependiendo solo de las clases `platform-*` del shell, que no cambian.
- Red, permisos, telemetría: ninguno. `react-router` trae `cookie` y `set-cookie-parser` como dependencias
  transitivas; en una SPA no se usan.
- Tamaño: el JS crece lo que pese React Router (del orden de 20–25 KB gzip; el paso 8 lo mide). Se anota para `docs/rendimiento.document.md`.
- Riesgosa: **sí**, por la concurrencia de efectos y listeners (ver Riesgos). La revisión técnica es obligatoria.

## Solución

La arquitectura final está descrita en [`docs/arquitectura/frontend.md`](../../docs/arquitectura/frontend.md).
Este documento añade el plan: qué sale de dónde, el contrato interno del estado, el reparto exacto del CSS,
las pruebas, los riesgos y la secuencia.

### Decisiones tomadas más allá de las ★

- **A-1 · Las pantallas viven en `src/app/routes/<pantalla>/`.** Componen features; la lógica de dominio
  queda en `features/`. Así la dirección de dependencias es siempre `app → features → components/lib`.
- **A-2 · `features/dashboard` es el núcleo de datos** (store, contexto, selectores). Cualquier feature puede
  importarlo; él no importa ninguna feature.
- **A-3 · Un solo componente ordena los efectos de ejecución** (`app/providers/DashboardRuntime.tsx`) y
  llama a los hooks de cada feature en el orden exacto de hoy. Ver R-1.
- **A-4 · El estado de los diálogos va en `DialogsProvider`, con `useState`, no en el reducer.** Son siete
  banderas independientes, como hoy (no una unión: hoy pueden convivir dos diálogos abiertos y eso se conserva).
- **A-5 · Sin alias `@/` todavía.** Imports relativos. El alias llega con la HU-0014 (lo exige shadcn) y
  convivirá con los relativos.
- **A-6 · El CSS se corta en tramos contiguos y no se reordena.** El tema claro, los cortes responsive y las
  animaciones quedan en archivos globales al final del índice. Repartirlos por feature exigiría reordenar
  reglas de igual especificidad (`.theme-light .instance-card` frente a `.instance-card.is-stopping`).
  Ningún componente importa CSS: solo `src/styles/index.css`.
- **A-7 · `errorElement` que relanza el error.** Así un fallo de render se comporta igual que hoy y no aparece la
  pantalla de error por defecto de React Router. Una pantalla de error propia sería producto.
- **A-8 · Cuatro scripts de prueba nuevos** (`test:format`, `test:appearance`, `test:dashboard`,
  `test:messages`) en lugar de uno por archivo de lógica.

### Estructura de carpetas final

```text
src/
  main.tsx                         StrictMode, fuentes, ./styles/index.css, <App />
  types.ts  vite-env.d.ts          sin cambios
  app/
    App.tsx                        solo compone: <AppProviders><RouterProvider router={router} /></AppProviders>
    router.tsx                     createHashRouter
    RouteErrorBoundary.tsx         errorElement que relanza (A-7)
    providers/AppProviders.tsx     AppearanceProvider > DashboardProvider > DashboardRuntime > DialogsProvider
    providers/DashboardRuntime.tsx controladores y efectos en orden fijo; monta ScanContext y SourceUpdateContext
    providers/DialogsProvider.tsx  + dialogs-context.ts (useDialogs) y la tecla Escape
    layout/AppShell.tsx            .desktop-shell, ambient, main.app-window, <Outlet />, DialogHost
    layout/Titlebar.tsx  layout/Statusbar.tsx  layout/DialogHost.tsx  layout/window-actions.ts
    layout/shell.css  layout/statusbar.css
    routes/panel/PanelRoute.tsx    la pantalla "/": búsqueda, banners, secciones, vacío
    routes/panel/Toolbar.tsx       system-pill + buscador (+ Ctrl/⌘ F)
    routes/panel/toolbar.css  routes/panel/content.css
  features/
    dashboard/   dashboard-store.ts · dashboard-selectors.ts · dashboard-context.ts (useDashboard)
                 DashboardProvider.tsx · useInitialLoad.ts · useRuntimePlatform.ts
                 FeedbackBanners.tsx · feedback-banners.css · index.ts
    scan/        useScanRuntime.ts · useBackgroundRefresh.ts · scan-context.ts (useScan)
                 ScanProgressPanel.tsx · scan.css · index.ts
    updates/     useSourceUpdateRuntime.ts · useSourceUpdatePolling.ts · source-update-context.ts
                 useUpdateActions.ts · update-messages.ts · original-update-channel.ts
                 SourceUpdateBanner.tsx · SynchronizeBanner.tsx · ApplicationUpdateDialog.tsx
                 OriginalApplicationUpdateDialog.tsx · update-banners.css
                 application-update-dialog.css · original-update-dialog.css · index.ts
    instances/   InstanceCard.tsx · UsageMeter.tsx · ManagedInstancesSection.tsx · InstanceEditor.tsx
                 DeleteInstanceDialog.tsx · useInstanceActions.ts · useLiveUsage.ts · live-usage.ts
                 instance-icon.ts · icon-validation.ts · instance-types.ts
                 instance-list.css · instance-card.css · instance-editor.css · index.ts
    sessions/    SessionContextMeter.tsx · SessionTransferDialog.tsx · UnlinkSessionDialog.tsx
                 useSessionActions.ts · useTransferProfiles.ts · session-format.ts · session-messages.ts
                 session-types.ts · session-list.css · session-transfer-dialog.css · index.ts
    original-app/ OriginalAppSection.tsx · original-app.css · index.ts
    appearance/  appearance-preferences.ts · appearance-context.ts (useAppearance)
                 AppearanceProvider.tsx · AppearanceDialog.tsx · appearance.css · index.ts
  components/    Icons.tsx (igual) · ModalFrame.tsx · ConfirmDialog.tsx · Metric.tsx · EmptyState.tsx
                 LoadingCards.tsx · modal.css · modal-actions.css · confirm-dialog.css
                 empty-state.css · buttons.css · loading-cards.css
                 ui/  ← reservada a la HU-0014 (shadcn). No se crea ahora.
  hooks/         ← reservada a los hooks genéricos que trae shadcn (HU-0014). No se crea ahora.
  lib/           bridge.ts · scan-controller.ts · source-update-controller.ts (los tres sin cambios)
                 format.ts · errors.ts · platform.ts
                 utils.ts ← reservado a cn() de la HU-0014. No se crea ahora.
  styles/        index.css · base.css · animations.css · theme-light.css · responsive.css
```

### Qué sale de `App.tsx` y adónde va

| Origen (línea de `src/App.tsx`) | Destino |
| --- | --- |
| import `convertFileSrc` (2) | `features/instances/instance-icon.ts` |
| import `listen` (3) | `features/scan/useScanRuntime.ts` |
| import `getCurrentWindow` (4) | `app/layout/window-actions.ts` |
| `EMPTY_STATE` (50) | `features/dashboard/dashboard-store.ts` como `EMPTY_DASHBOARD` |
| `ScanProgressEvent` (81) | `features/scan/useScanRuntime.ts` (local) |
| `SessionTransferSelection`, `SessionUnlinkSelection` (86–94) | `features/sessions/session-types.ts` |
| `InstanceIconChange` (96) | `features/instances/instance-types.ts` |
| `AppTheme`, `SessionTextSize`, `AppearancePreferences`, `APPEARANCE_STORAGE_KEY`, `DEFAULT_APPEARANCE`, `loadAppearancePreferences` (102–130) | `features/appearance/appearance-preferences.ts` (+ `saveAppearancePreferences`, `resolveTheme`) |
| `formatBytes` (132), `formatCaptureTime` (154) | `lib/format.ts` |
| `formatSessionTime` (140), `SessionContextLevel`/`sessionContextLevel` (164–171), `formatTokenCount` (173), `formatModelName` (186) | `features/sessions/session-format.ts` |
| `friendlyError` (201) | `lib/errors.ts` |
| `managedIconSource` (207) | `features/instances/instance-icon.ts` |
| `describeArtifactOutcome` (214) | `features/sessions/session-messages.ts` |
| `state`, `loading`, `busy`, `error`, `notice`, `iconPreviews` (228–241) | reducer de `features/dashboard` |
| `query`, `searchRef` (231, 245) | `app/routes/panel/PanelRoute.tsx` / `Toolbar.tsx` |
| `scanProgress` (233), controlador de escaneo y sus refs (246–296), `scanManually` (311) | `features/scan/useScanRuntime.ts` → `useScan()` |
| `editor`, `deleteTarget`, `transfer`, `unlinkTarget`, `updateTargets`, `originalUpdateOpen`, `appearanceOpen` | `app/providers/DialogsProvider.tsx` |
| `appearance`, `systemDark` (243–244) y efectos (432–446) | `features/appearance/AppearanceProvider.tsx` |
| `busyRef` (248–249) | `features/dashboard/DashboardProvider.tsx` |
| controlador de actualización (297–309) y efecto (357–371) | `features/updates/useSourceUpdateRuntime.ts` |
| efecto de carga inicial (317–345) | `features/dashboard/useInitialLoad.ts` |
| efecto de ciclo del escaneo (347–355) | `features/scan/useScanRuntime.ts` |
| `runningInstanceIds`/`runningInstanceKey` (373–377) y uso en vivo (381–409) | `features/instances/useLiveUsage.ts` + `live-usage.ts` (`applyLiveUsage`) + selector `runningInstanceIds` |
| `sourceIdentityRef` (378–379) y sondeo de 6 h (411–430) | `features/updates/useSourceUpdatePolling.ts` |
| refresco en segundo plano (448–460) | `features/scan/useBackgroundRefresh.ts` |
| atajos (462–480) | Ctrl/⌘ F → `app/routes/panel/Toolbar.tsx`; Escape → `DialogsProvider` |
| `filtered`, `originalAppName`, `showOriginal`, `running`, `codeSessionCount`, `outdatedInstances` (482–515) | `features/dashboard/dashboard-selectors.ts` |
| `officialUpdate` (518) | `features/updates/SourceUpdateBanner.tsx` (llama a `sourceUpdatePresentation`) |
| `synchronizeLabel` (523) | `features/updates/update-messages.ts` |
| `transferProfiles` (526) | `features/sessions/useTransferProfiles.ts` (usa `ORIGINAL_INSTANCE_ID`, valor; por eso no va a un módulo probado) |
| `runAction` (537) | `DashboardProvider` |
| `windowAction` (549) | `app/layout/window-actions.ts` |
| plataforma (557–565) | `lib/platform.ts` (`resolveRuntimePlatform`, `shortcutModifierLabel`) + `features/dashboard/useRuntimePlatform.ts` |
| `buildLabel` (566) | `app/layout/Statusbar.tsx` |
| `resolvedTheme` (567) | `resolveTheme` + `AppearanceProvider` |
| shell (572–576, 815, 1029) | `app/layout/AppShell.tsx` |
| titlebar (577–619) | `app/layout/Titlebar.tsx` |
| toolbar (621–650) | `app/routes/panel/Toolbar.tsx` |
| contenido (652–798) | `app/routes/panel/PanelRoute.tsx`; banners en `features/updates`; error y aviso en `features/dashboard/FeedbackBanners.tsx`; sección de instancias en `features/instances/ManagedInstancesSection.tsx` |
| footer (800–814) | `app/layout/Statusbar.tsx` |
| diálogos (817–1028) | `app/layout/DialogHost.tsx`, con manejadores en `useInstanceActions`, `useSessionActions` y `useUpdateActions`; el IIFE de 923–963 pasa a `features/sessions/UnlinkSessionDialog.tsx` (+ `unlinkDialogCopy`); el de borrar, a `features/instances/DeleteInstanceDialog.tsx` |
| textos de transferencia (907–912) y de sincronización (985–993) | `session-messages.ts` (`transferNotice`), `update-messages.ts` (`summarizeSynchronization`) |
| `ScanProgressPanel` (1033) | `features/scan/ScanProgressPanel.tsx` |
| `Metric` (1080) | `components/Metric.tsx` |
| `OriginalAppSection` (1089) | `features/original-app/OriginalAppSection.tsx` |
| `InstanceCardProps`, `InstanceCard` (1224–1377) | `features/instances/InstanceCard.tsx` |
| `UsageMeter` (1379) | `features/instances/UsageMeter.tsx` |
| `SessionContextMeter` (1398) | `features/sessions/SessionContextMeter.tsx` |
| `LoadingCards` (1455), `EmptyState` (1463) | `components/` |
| `AppearanceDialog` (1503) | `features/appearance/AppearanceDialog.tsx` |
| `OriginalApplicationUpdateDialog` (1595) | `features/updates/` (+ `original-update-channel.ts` con `platformDetails`) |
| `ModalFrame` (1672), `ConfirmDialog` (2128) | `components/` |
| `InstanceEditor` (1698) | `features/instances/InstanceEditor.tsx` (+ validación de tipo, tamaño y dimensiones a `icon-validation.ts`) |
| `ApplicationUpdateDialog` (1870) | `features/updates/ApplicationUpdateDialog.tsx` |
| `SessionTransferDialog` (1955) | `features/sessions/SessionTransferDialog.tsx` |

Las marcas de sesión de `InstanceCard` y de `OriginalAppSection` **no se unifican** en esta historia. Se
parecen, pero no son iguales (`disabled={isBusy}` y la clase `original-session-row`). Unificarlas es otro cambio.

### Estado compartido (contrato interno)

**Store (puro, `features/dashboard/dashboard-store.ts`):**

```ts
export interface DashboardStore {
  dashboard: DashboardState; loading: boolean; busy: string | null;
  error: string | null; notice: string | null; iconPreviews: Record<string, string>;
}
export type DashboardAction =
  | { type: "dashboard/replaced"; dashboard: DashboardState }
  | { type: "dashboard/updated"; update: (current: DashboardState) => DashboardState }
  | { type: "loading/finished" }
  | { type: "busy/changed"; busy: string | null }
  | { type: "busy/updated"; update: (current: string | null) => string | null }
  | { type: "error/changed"; error: string | null }
  | { type: "notice/changed"; notice: string | null }
  | { type: "feedback/cleared" }                       // error y notice a null a la vez
  | { type: "icon-preview/stored"; instanceId: string; url: string }
  | { type: "icon-preview/removed"; instanceId: string };
export const initialDashboardStore: DashboardStore; // loading: true, el resto vacío
export function dashboardReducer(store: DashboardStore, action: DashboardAction): DashboardStore;
```

- Los `update` son funciones puras (StrictMode llama dos veces al reducer en desarrollo). Las que se usan son
  `mergeSourceUpdateForInstallation` (con su `expected` capturado como hoy), `applyLiveUsage` y
  `reconcileManualBusy`. El reducer no las importa; las recibe en la acción. Así el módulo solo tiene
  `import type` y se prueba con `node --test`.
- Si un valor no cambia, el reducer devuelve el mismo `store`, que equivale a la comparación con `Object.is` de `setState`.

**`useDashboard()`** (`dashboard-context.ts`; lanza un error si se usa fuera del proveedor) devuelve:
`{ dashboard, loading, busy, error, notice, iconPreviews, busyRef, replaceDashboard, updateDashboard,
setBusy, updateBusy, setError, setNotice, clearFeedback, finishLoading, storeIconPreview,
removeIconPreview, runAction }`. Las funciones son estables (`useCallback` sobre `dispatch`). `runAction`
reproduce literalmente la de la línea 537. `busyRef.current = busy` se asigna en el render del proveedor,
igual que hoy.

**Lo que queda local:** `query` en `PanelRoute`; `sessionsExpanded` en `InstanceCard` y
`OriginalAppSection`; el formulario en `InstanceEditor`; destino, modo y artefactos en
`SessionTransferDialog`; `scanProgress` en `useScanRuntime` (expuesto por `useScan`).

**Otros contextos:**

| Hook | Dónde se define | Quién lo provee | Valor |
| --- | --- | --- | --- |
| `useScan()` | `features/scan/scan-context.ts` | `DashboardRuntime` | `{ progress, requestManual, dismiss }`. `requestManual` es el `scanManually` de hoy |
| `useSourceUpdate()` | `features/updates/source-update-context.ts` | `DashboardRuntime` | `{ runHandoff }` |
| `useAppearance()` | `features/appearance/appearance-context.ts` | `AppearanceProvider` | `{ preferences, setPreferences, resolvedTheme }` |
| `useDialogs()` | `app/providers/dialogs-context.ts` | `DialogsProvider` | las siete banderas y sus setters |

**Las protecciones actuales se conservan sin cambiar una línea de su lógica:**

- Los controladores se crean una sola vez, con `useRef` perezoso en `DashboardRuntime`, que está **encima**
  del `RouterProvider`. Navegar nunca los recrea. Sus callbacks llaman a `dispatch`, que es estable, igual
  que hoy llaman a los `setX`.
- `scanListenerLifecycleRef` y `manualProgressUnlistenRef` se mudan tal cual a `useScanRuntime`. La limpieza
  del efecto de ciclo sigue incrementando el ciclo, dando de baja el listener y desactivando el controlador.
- `generation`: no se toca. `ScanProgressPanel` sigue llamando a `dismiss(progress.generation)`.
- `active` local de los efectos de carga, de uso en vivo y del sondeo de 6 h: se copian tal cual.
- `busy`: las mismas claves (`scan`, `create`, `update`, `launch:<id>`, `stop:<id>`, `delete:<id>`,
  `transfer:<sessionId>`, `unlink:<sessionId>`, `update-applications`, `update-original`) y las mismas guardas
  de Escape.
- Los cierres sobre el estado se conservan: los manejadores leen los valores del render en el que se crearon,
  como hoy (`onSave` con `state.instances`, `scanManually` con `loading`). No se «arreglan» con refs.

**Manejadores de diálogos:** `useInstanceActions`, `useSessionActions` y `useUpdateActions` devuelven
funciones `async` que **reciben `close` como parámetro** y lo llaman en el mismo punto que hoy. El orden de
las llamadas (`setBusy` → `clearFeedback` → bridge → `replaceDashboard` → `setNotice` → `close` → `finally
setBusy(null)`) se copia literalmente de cada bloque.

### Router

```tsx
// src/app/router.tsx
export const router = createHashRouter([
  { path: "/", element: <AppShell />, errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <PanelRoute /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ] },
]);
```

- `createHashRouter` y `Navigate` vienen de `react-router`; `RouterProvider`, de `react-router/dom`.
- El router se crea a nivel de módulo, no dentro de un render.
- `RouterProvider` se monta dentro de los proveedores (en `app/App.tsx`), así que el estado sobrevive a la
  navegación. `AppShell` es la ruta de layout: titlebar, statusbar y `DialogHost` persisten, y `<Outlet />` pinta
  las filas 2 y 3 de `.app-window` (barra y contenido).
- Una ruta desconocida (`#/no-existe`) vuelve a `#/` sin recargar el shell.
- Las pantallas futuras se cargan de forma diferida con `lazy` en su ruta (ver `docs/arquitectura/frontend.md`).
  Hoy no hay ninguna diferida: el panel se carga sin `lazy`, porque es la entrada.

### Reparto de `styles.css`

Son tramos contiguos de `src/styles.css`, **sin reordenar ni editar ningún byte**. Se crean con
`sed -n 'A,Bp' src/styles.css > destino`. `src/styles/index.css` solo tiene estas líneas `@import`, en este orden:

| # | Líneas | Archivo | Contenido |
| --- | --- | --- | --- |
| 1 | 1–50 | `styles/base.css` | `:root`, reset, foco, `body`, `.desktop-shell`, densidades `session-text-*` |
| 2 | 51–239 | `app/layout/shell.css` | ambient, `.app-window`, titlebar, regla flex compartida, controles por plataforma, botones base |
| 3 | 240–264 | `app/routes/panel/toolbar.css` | toolbar, system-pill, `.metric`, buscador |
| 4 | 265–280 | `app/routes/panel/content.css` | `.content`, secciones, encabezados |
| 5 | 281–305 | `features/original-app/original-app.css` | aplicación original |
| 6 | 306–308 | `features/instances/instance-list.css` | `.instance-list`, `.is-scanning` |
| 7 | 309–375 | `features/scan/scan.css` | panel de escaneo |
| 8 | 376–400 | `features/updates/update-banners.css` | banners de actualización |
| 9 | 401–520 | `features/instances/instance-card.css` | tarjeta, uso, acciones |
| 10 | 521–564 | `features/sessions/session-list.css` | sesiones, contexto, insignias |
| 11 | 565–593 | `features/dashboard/feedback-banners.css` | error y aviso |
| 12 | 594–604 | `app/layout/statusbar.css` | footer |
| 13 | 605–616 | `components/empty-state.css` | vacío |
| 14 | 617–621 | `components/buttons.css` | `.secondary-button`, `.destructive-button` |
| 15 | 622–625 | `components/loading-cards.css` | esqueletos |
| 16 | 626–652 | `components/modal.css` | backdrop, tarjeta, cabecera |
| 17 | 653–700 | `features/instances/instance-editor.css` | formulario, icono, notas |
| 18 | 701–703 | `components/modal-actions.css` | `.modal-actions`, `.modal-primary` |
| 19 | 704–736 | `features/appearance/appearance.css` | apariencia |
| 20 | 737–739 | `components/confirm-dialog.css` | confirmación |
| 21 | 740–757 | `features/updates/application-update-dialog.css` | sincronizar instancias |
| 22 | 758–771 | `features/updates/original-update-dialog.css` | actualizar original |
| 23 | 772–818 | `features/sessions/session-transfer-dialog.css` | transferencia |
| 24 | 819–829 | `styles/animations.css` | `.spin` y `@keyframes` |
| 25 | 830–920 | `styles/theme-light.css` | todo el tema claro |
| 26 | 921–959 | `styles/responsive.css` | 1260 px, 1070 px, `prefers-reduced-motion` |

`main.tsx` cambia `import "./styles.css"` por `import "./styles/index.css"` en la misma posición (después de
las fuentes). Ningún `.tsx` importa CSS.

**Cómo se comprueba que el CSS es idéntico (las dos cosas):**

```bash
BASE=$(git merge-base HEAD develop)
# 1. La concatenación en el orden del índice es byte a byte el archivo original
(cd src/styles && sed -n 's/^@import "\(.*\)";$/\1/p' index.css | xargs cat) | cmp - <(git show "$BASE":src/styles.css)
# 2. El CSS compilado es idéntico (mismo contenido y, por tanto, mismo hash en el nombre)
shasum -a 256 dist/assets/*.css   # comparar con el valor anotado en el paso 0
```

### Pruebas nuevas (`node --test`, solo `import type` en los imports relativos)

| Archivo | Módulos | Casos mínimos |
| --- | --- | --- |
| `tests/format.test.ts` → `test:format` | `lib/format.ts`, `lib/errors.ts`, `lib/platform.ts`, `features/sessions/session-format.ts` | `formatBytes` (null, 0, KB sin decimales, GB con uno); `formatSessionTime(value, now)` (segundos y ms, «Ahora mismo», min, h, d, fecha ≥ 30 d); `formatCaptureTime` (null y patrón `HH:MM:SS`, sin depender de la zona horaria); `formatTokenCount` (999, 1000, 1500, 100 000, 1 000 000, 1 500 000); `formatModelName` (null, opus/sonnet/haiku con versión, desconocido); `sessionContextLevel` (null, 69, 70, 89, 90); `friendlyError`; `resolveRuntimePlatform` y `shortcutModifierLabel` |
| `tests/appearance.test.ts` → `test:appearance` | `features/appearance/appearance-preferences.ts` | null → por defecto; válido; cada campo inválido cae a su valor por defecto; JSON corrupto; `getItem` que lanza; `save` que traga el error; `resolveTheme` |
| `tests/dashboard-state.test.ts` → `test:dashboard` | `dashboard-store.ts`, `dashboard-selectors.ts`, `features/instances/live-usage.ts` | cada acción; inmutabilidad; misma referencia si no cambia; filtro (vacío devuelve el mismo array, recorte, mayúsculas, títulos de sesión); `matchesOriginalApp`; conteos; `outdatedInstances`; `runningInstanceIds`; `applyLiveUsage` (solo los ids recibidos) |
| `tests/result-messages.test.ts` → `test:messages` | `session-messages.ts`, `update-messages.ts`, `original-update-channel.ts`, `icon-validation.ts` | `describeArtifactOutcome` (vacío y cada rama); `transferNotice` (mover y copiar); `unlinkDialogCopy` (mover y copiar, con origen y sin él); `summarizeSynchronization` (solo fallos, mezcla, vacío); `synchronizeLabel`; canal por plataforma; validación de icono (tipo, 5 MiB, 31/32/4096/4097 px) |

Cada script entra en `package.json` y en `.github/workflows/validate.yml`. En `.metodo/config.json`
(`stack.comandos`), en `relacionadas` y `suite`, lo cambia el orquestador y regenera con `metodo.mjs generar`.
Las pruebas importan el archivo del módulo, nunca el `index.ts` de la feature (el barrel arrastra `.tsx`).

### Riesgos y cómo se evitan

- **R-1 · Orden de los listeners de `focus` (el más grave).** `sourceUpdateController.handleFocus` activa
  `suppressNextGeneralFocus`, y `blocksGeneralRefresh("focus")` lo consume. Por eso el listener de
  actualización tiene que registrarse **antes** que el del refresco en segundo plano, como hoy (efecto 3 antes
  que el 8). Si se invierte, al volver de la actualización oficial se lanza un escaneo general en paralelo.
  *Cómo se evita:* `DashboardRuntime` llama a los hooks en este orden y en ningún otro: controladores (render) →
  `useInitialLoad` → ciclo del escaneo → `useSourceUpdateRuntime` → `useLiveUsage` → `useSourceUpdatePolling`
  → `useBackgroundRefresh`. Va con un comentario que lo diga. Ningún otro componente registra `focus`, `blur`
  ni `visibilitychange`.
- **R-2 · Cierres sobre el estado.** Se copian los manejadores tal cual. Si se usa `useCallback`, con todas
  sus dependencias. Prohibido leer de un ref lo que hoy se lee del render.
- **R-3 · Controladores recreados.** Solo en `DashboardRuntime`, nunca en una ruta ni en un componente que se
  desmonte.
- **R-4 · Listener `scan-progress` de Tauri.** `listen` solo detrás de `bridge.isDesktop()` y con el
  patrón de ciclo de vida actual, sin tocarlo. `getCurrentWindow` y `convertFileSrc` siguen detrás de
  `bridge.isDesktop()`.
- **R-5 · StrictMode.** El doble montaje ya está cubierto por las limpiezas simétricas, que no cambian.
  `<Navigate>` puede navegar dos veces en desarrollo; con `replace` no tiene efecto visible.
- **R-6 · DOM distinto.** El CSS usa `:nth-of-type` (`.metric:nth-of-type(3)`, `.footer-divider:nth-of-type(2)`,
  `.footer-group > span:last-child`). No se añade **ningún** elemento envoltorio: solo fragmentos. Los
  diálogos siguen dentro de `.desktop-shell` y después de `<main>`, porque `.theme-light .modal-backdrop` lo
  necesita. Nada de portales. Se comprueba comparando el DOM (paso 0 y paso 8).
- **R-7 · Orden del CSS.** Solo `styles/index.css` importa CSS. Un `import "./x.css"` en un componente lo
  reordenaría según el grafo de módulos.
- **R-8 · Ciclos entre barrels.** Entre features solo se importa por `index.ts`, y `features/dashboard` no
  importa ninguna feature. Dentro de una feature, imports directos.
- **R-9 · Fast refresh.** El contexto y su hook van en un `.ts` aparte del componente proveedor, para que Vite no
  recargue la página entera.

### Secuencia (la app compila y funciona al final de cada paso)

| Paso | Qué | Verificación |
| --- | --- | --- |
| 0 | Línea base, sin cambios: `npm run build` y anotar `shasum -a 256 dist/assets/*.css`; en `npm run dev`, guardar `document.getElementById("root").innerHTML` en el scratchpad en cinco estados: panel oscuro, panel claro, apariencia abierta, editor «Nueva instancia» abierto y transferencia abierta | Los archivos guardados |
| 1 | CSS: 26 archivos e `index.css`; `main.tsx` importa el índice; se borra `src/styles.css` | `cmp` y hash del CSS idénticos; `npm run build`; vistazo en los dos temas |
| 2 | Módulos puros (sin React) y sus 4 pruebas y scripts; `App.tsx` los importa en lugar de sus copias locales | `npm run build`; los 6 `test:*` del frontend |
| 3 | `components/`: `ModalFrame`, `ConfirmDialog`, `Metric`, `EmptyState`, `LoadingCards` | `build`; abrir un diálogo y el estado vacío (búsqueda sin resultados) |
| 4 | Componentes de feature con las mismas props: escaneo, original, tarjeta, medidores, editor, apariencia, diálogos de actualización y de transferencia, `instance-icon.ts` | `build`; recorrer el panel; `App.tsx` ≈ 800 líneas |
| 5 | `git mv src/App.tsx src/app/AppView.tsx` (nombre provisional); `app/App.tsx` + `DashboardProvider` (reducer); `AppView` usa `useDashboard` en lugar de los 6 `useState`; `main.tsx` importa `./app/App` | `build`; `test:dashboard`; abrir, detener, editar y borrar con errores visibles |
| 6 | `DashboardRuntime` y los hooks de ejecución (escaneo, actualización, uso en vivo, sondeo, refresco) en el orden de R-1; `useScan`, `useSourceUpdate` | `build`; escaneo manual con progreso y «Ocultar»; foco y desenfoque; en escritorio, la actualización de la original y la vuelta |
| 7 | `AppearanceProvider`, `DialogsProvider` (+ Escape), `useInstanceActions`, `useSessionActions`, `useUpdateActions`, `DeleteInstanceDialog`, `UnlinkSessionDialog` | `build`; cada diálogo abre, confirma, cancela y se cierra con Escape (y no se cierra con Escape si está ocupado) |
| 8 | `npm install react-router@^7.18.5`; `router.tsx`, `AppShell`, `Titlebar`, `Statusbar`, `DialogHost`, `PanelRoute`, `Toolbar`; se borra `AppView.tsx` | `build`; DOM de los cinco estados idéntico al del paso 0 (salvo los tiempos relativos); `#/no-existe` → `#/`; tamaño del JS (gzip) antes y después |
| 9 | Skill `code-ai-profiles-frontend-react-vite` y `.metodo/reglas/frontend.md` con la estructura nueva | Lectura; sin referencias a `src/styles.css` ni a «todo en App.tsx» |
| 10 | Cierre: `rg -n "invoke\(" src` (solo `bridge.ts`); `wc -l` de los `.tsx` (ninguno > 300); las relacionadas; la lista manual de AC-01 | Entregar las salidas al orquestador |

Cada paso es un commit (`HU: HU-0015`) para poder bisecar.

## Brief · frontend

Criterios: AC-01, AC-02, AC-03, AC-04, AC-05 (skill y reglas). **Modelo: opus**, porque mueve efectos con
concurrencia (orden de listeners, `generation`, ciclo del listener de Tauri) y una regresión ahí no se ve al abrir la app.
Contrato: este documento, § Estado compartido, § Router y § Reparto de `styles.css`. Sin versión (0.x, interno).

**Archivos.** Crear los de § Estructura de carpetas final. Modificar `src/main.tsx`, `package.json` (dependencia
`react-router` y 4 scripts) y `.github/workflows/validate.yml` (4 pasos). Borrar `src/App.tsx` y
`src/styles.css` al final de sus pasos. Rutas de partida comprobadas: `src/App.tsx`, `src/main.tsx`,
`src/styles.css`, `src/components/Icons.tsx`, `src/lib/{bridge,scan-controller,source-update-controller}.ts`,
`tests/{scan-controller,source-update-controller}.test.ts`, `.github/workflows/validate.yml`,
`.metodo/reglas/frontend.md`, `.claude/skills/code-ai-profiles-frontend-react-vite/SKILL.md`.

**Pasos.** Los de § Secuencia, del 0 al 10, en orden y un commit por paso. Reglas al mover código:

1. Se mueve, no se reescribe. Mismos textos, clases, atributos `aria-*`, `title`, `key` y condiciones.
2. Ningún elemento envoltorio nuevo; solo fragmentos. Los diálogos, en `DialogHost`, en el orden actual:
   apariencia, editor, borrar, transferir, desvincular, sincronizar, original.
3. Orden de efectos de R-1 en `DashboardRuntime`, con un comentario que lo diga.
4. Ningún `.tsx` importa CSS; solo `src/styles/index.css`.
5. Entre features, solo por `index.ts`; `features/dashboard` no importa features; `app/` puede importarlo todo.
6. Contexto y hook en `*-context.ts`; el proveedor, en su `.tsx`.
7. Si algo no se puede mover sin cambiar comportamiento, para y lo devuelves.

**Variables de entorno nuevas.** Ninguna. No se lee `import.meta.env`.

**Pruebas.** Las 4 de § Pruebas nuevas, con sus scripts y pasos de CI. Relacionadas:
`node .metodo/scripts/pruebas.mjs relacionadas code-ai-profiles <archivos>`; además, `npm run build`,
`test:scan` y `test:update` en cada paso. La suite la corre el orquestador.

**Entrega.** Las salidas de: `cmp` del CSS, hash del CSS antes y después, comparación del DOM de los cinco
estados, `rg -n "invoke\(" src`, `wc -l src/**/*.tsx` y la lista manual de AC-01 marcada (lo que no pudiste
ver, declarado como no visto).

**Si dudas.** `graphify explain "App()"`, `graphify explain "createScanController()"`,
`graphify explain "createSourceUpdateController()"`; `docs/arquitectura/frontend.md`; la skill
`code-ai-profiles-frontend-react-vite` (Datos y estado, Pruebas).

**No toques.** `src/types.ts`, `src/lib/bridge.ts`, `src/lib/*-controller.ts` y sus pruebas, `src-tauri/`,
`src/components/Icons.tsx` (solo se importa), `vite.config.ts` y `tsconfig*.json` (sin alias: A-5),
`DESIGN.md`, los valores del CSS, `docs/arquitectura/` (si la realidad difiere, avisas y lo actualiza
architect), `.metodo/config.json` (orquestador). No instales shadcn, Tailwind ni nada más.

**Skills.** `code-ai-profiles-frontend-react-vite`, `code-ai-profiles-pruebas`, `code-ai-profiles-configuracion`.

### Verificación manual de AC-01

En `npm run dev` (mock) y en `npm run tauri dev`, en **oscuro**, **claro** y **sistema**, a **1440×900** y
a la mínima, **980×680** (pasa los cortes de 1260 y 1070 px):

- [ ] Titlebar: marca, BETA, «Escanear sistema», apariencia, «Nueva instancia» (deshabilitada sin fuente).
      Windows: los tres controles propios funcionan; macOS: los semáforos no tapan la marca; Linux: sin controles propios.
- [ ] Toolbar: «N EN EJECUCIÓN», Perfiles, Sesiones Code y Aplicación (a 980 px se oculta Sesiones Code);
      ⌘F/Ctrl F enfoca el buscador; la ✕ lo limpia; el `kbd` dice ⌘ o Ctrl según la plataforma.
- [ ] Búsqueda: filtra por nombre, ruta, estado y título de sesión; despliega las sesiones; sin resultados
      muestra «Sin coincidencias» y «Limpiar búsqueda».
- [ ] Aplicación original: estado, versión, contador, desplegar y plegar sesiones, transferir y desvincular.
- [ ] Tarjeta de instancia: abrir («Abriendo…»), detener («Deteniendo…» y su borde), carpeta, editar,
      borrar (solo detenida), medidores de uso con «Última captura», insignias de actualización e icono.
- [ ] Contexto de sesión: niveles normal, elevado, crítico y sin datos, con sus colores y tooltips.
- [ ] Escaneo manual: panel con porcentaje, éxito que se cierra solo, error con «Ocultar»; tarjetas atenuadas
      mientras escanea; el botón gira.
- [ ] Banners: actualización oficial (disponible e incierta), sincronización (una y varias), error y aviso con su ✕.
- [ ] Diálogos: apariencia (tema y tamaño aplican al instante y persisten al recargar), nueva y editar
      instancia (icono válido e inválido, quitar, opciones avanzadas), borrar, transferir (mover y copiar,
      destino detenido o en ejecución), desvincular y devolver, sincronizar, actualizar la original.
      Escape cierra cada uno salvo durante su operación; clic en el fondo cierra.
- [ ] Estados: carga (esqueletos), vacío sin fuente («Escanear de nuevo») y con fuente («Crea tu primer perfil»).
- [ ] Footer: salud, libres, administrados, `BUILD x.y.z`, plataforma.
- [ ] `#/cualquier-cosa` en la barra del navegador vuelve al panel.
- [ ] Escritorio: tras «Actualizar original» y volver a la ventana, solo se refrescan las versiones (no
      aparece el panel de escaneo).

## Briefs y orden

1. Brief · frontend (arriba): **modelo opus**. Es el único rol. Pasos secuenciales, sin paralelismo.

## Revisión técnica

Obligatoria (`revisionTecnica: siempre` y riesgo de estados). Se hará sobre el SHA del paso 10, con foco en
R-1 a R-8, el diff del CSS y del DOM, y que cada manejador sea una copia literal del original.
