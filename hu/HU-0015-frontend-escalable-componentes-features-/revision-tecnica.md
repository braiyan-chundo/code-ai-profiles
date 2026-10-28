# Revisión técnica · HU-0015 · Frontend escalable: componentes, features y router

**Veredicto: PASS**. No hay bloqueos. El refactor conserva la lógica de cada manejador, efecto y cálculo de
`5995e50:src/App.tsx`. Se mantiene el orden de R-1 y las protecciones contra resultados viejos no cambian.
Las desviaciones declaradas son inocuas. Hay siete observaciones: ninguna obliga a tocar `src/`.

Revisado el 2026-10-28 sobre la rama `hu-0015-frontend-escalable`, de `02480a9` a `f5c194a` (código) más
`c157308` (gobierno), contra la base `5995e50`.

**Pruebas.** `pruebas.mjs estado` dice: «HEAD c157308 sin suite en verde». Lo comprobé aparte:

- los seis `test:*` del frontend pasan (scan 13, update 24, format 11, appearance 9, dashboard 13, messages 10: 80 de 80);
- `npx tsc --noEmit -p tsconfig.json` pasa.

La suite completa sigue pendiente: la corre el orquestador antes de cerrar (R-7).

## Método

- Extraje cada componente de `git show 5995e50:src/App.tsx` y lo comparé con `diff -w -B` contra su
  archivo nuevo, quitando los imports. Son idénticos `ScanProgressPanel`, `Metric`, `OriginalAppSection`,
  `InstanceCard`, `UsageMeter`, `SessionContextMeter`, `LoadingCards`, `EmptyState`, `AppearanceDialog`,
  `ModalFrame`, `ApplicationUpdateDialog`, `SessionTransferDialog` y `ConfirmDialog`. Solo cambian los dos
  sitios previstos en el plan: `platformDetails` pasa a `originalUpdateChannel`
  (`OriginalApplicationUpdateDialog.tsx:17`) y la validación del icono pasa a `iconFileError` e
  `iconDimensionsError` (`InstanceEditor.tsx:37-40`). En los dos casos se conservan los textos, el orden de
  las comprobaciones y los `return`.
- Los efectos y manejadores de `App()` los comparé leyendo uno por uno contra su destino (tabla
  «Qué sale de `App.tsx`» de `arquitectura.md`).
- Las dependencias las comprobé con `rg` y el tamaño del JS con un bundle aislado (esbuild, React externo).

## Foco 1 · Copia literal y desviaciones declaradas

| Pieza | Destino | Resultado |
| --- | --- | --- |
| Carga inicial | `features/dashboard/useInitialLoad.ts:11-39` | Literal. `setState` → `replaceDashboard`/`updateDashboard`, `setLoading(false)` → `finishLoading()`. `active` y `markLoaded()` en el mismo punto |
| Ciclo del escaneo | `features/scan/useScanRuntime.ts:90-100` | Literal |
| Controlador de escaneo y `runManual` | `useScanRuntime.ts:35-80` | Literal, incluidos los dos chequeos de `scanListenerLifecycleRef` y el `finally` |
| Controlador de actualización | `features/updates/useSourceUpdateRuntime.ts:15-27` | Literal; `expected` se captura igual |
| `blur`/`focus`/`visibilitychange` | `useSourceUpdateRuntime.ts:35-49` | Literal |
| Uso en vivo | `features/instances/useLiveUsage.ts:9-37` | Literal; la fusión pasa a `applyLiveUsage`, que es la misma expresión |
| Sondeo de 6 h | `features/updates/useSourceUpdatePolling.ts:8-31` | Literal; `sourceIdentityRef` se asigna en el render, como antes |
| Refresco en segundo plano | `features/scan/useBackgroundRefresh.ts:12-24` | Literal; `busyRef` es el del proveedor |
| Escape | `app/providers/DialogsProvider.tsx:18-32` | Literal (mismas guardas por `busyRef`) |
| Ctrl/⌘ F | `app/routes/panel/Toolbar.tsx:14-23` | Literal |
| `runAction` | `features/dashboard/DashboardProvider.tsx:32-42` | Literal |
| Guardar instancia | `features/instances/useInstanceActions.ts:26-60` | Literal. Lee `state.instances` del render de `DialogHost`; `close()` en el mismo punto que `setEditor(null)` |
| Borrar | `useInstanceActions.ts:62-65` | Literal |
| Transferir / desvincular | `features/sessions/useSessionActions.ts:12-58` | Literal; `setError(null); setNotice(null)` → `clearFeedback()` (misma tanda, mismo estado final) |
| Sincronizar / actualizar original | `features/updates/useUpdateActions.ts:13-48` | Literal; los textos salen de `summarizeSynchronization`, en el mismo orden (`setNotice` antes que `setError`) |
| Selectores | `features/dashboard/dashboard-selectors.ts`, `PanelRoute.tsx:30-40` | Literal, con las mismas dependencias en los `useMemo` |

Las desviaciones declaradas por frontend:

- **Hooks partidos** (`useScanRuntime`/`useScanLifecycle`, `useSourceUpdateController`/`useSourceUpdateRuntime`).
  Son inocuas y además necesarias. Los controladores se crean en el render antes de `useInitialLoad`, que
  necesita `scan.controller`, como en el original. Los efectos se registran en el orden de R-1
  (`DashboardRuntime.tsx:31-40`). Si no se hubieran partido, el ciclo del escaneo quedaría por delante de
  la carga inicial.
- **`unlinkDialogCopy` con `transferInfo`** (`session-messages.ts:41-58`). Inocua. Recibe el mismo objeto que
  `unlinkTarget.session.transfer` (`DialogHost.tsx:94-97`) y sirve para que TypeScript estreche el tipo. Los
  textos son los de antes, y el aviso se calcula en el render en que se pulsa confirmar, como el `isMove` del IIFE.
- **`formatSessionTime(value, now = Date.now())`** (`session-format.ts:1`). Inocua. El valor por defecto se
  evalúa en cada llamada y ningún componente pasa `now`.
- **`SourceUpdateBanner`/`SynchronizeBanner` devuelven `null`** (`SourceUpdateBanner.tsx:13`,
  `SynchronizeBanner.tsx:15`). Inocua. React no pinta ni `null` ni `false`. `sourceUpdatePresentation` ya se
  calculaba en cada render.
- **`icon-preview/removed` (y `stored`) devuelven el mismo store** si no hay cambio (`dashboard-store.ts:90-99`).
  Inocua. Antes se creaba un objeto nuevo y se volvía a renderizar sin cambio visible; ahora no se renderiza.

## Foco 2 · R-1 a R-9

- **R-1.** Se cumple. En `DashboardRuntime.tsx:31-40`, primero los controladores en el render y después
  `useInitialLoad` → `useScanLifecycle` → `useSourceUpdateRuntime` → `useLiveUsage` → `useSourceUpdatePolling`
  → `useBackgroundRefresh`, con el comentario. `rg` confirma que `focus`, `blur` y `visibilitychange` solo se
  registran en `useSourceUpdateRuntime.ts:40-42`, `useLiveUsage.ts:31` y `useBackgroundRefresh.ts:19`. Las
  dependencias de esos efectos son estables (controladores con ref perezoso, `busyRef`) o la clave
  `runningInstanceKey`, igual que antes, así que ningún render nuevo vuelve a registrar un listener ni altera
  el orden. Ver R-2 sobre lo que sí cambió de orden.
- **Resultados viejos.** Se conservan `generation` (`PanelRoute.tsx:50` → `dismiss` → `dismissManual`), los dos
  refs de ciclo del escaneo, el `active` de la carga, del uso en vivo y del sondeo, y las claves de `busy`.
- **Listener `scan-progress`.** Sin cambios. `listen` solo detrás de `bridge.isDesktop()`, y la baja se da
  en `finally` y en la limpieza del ciclo (`useScanRuntime.ts:47-70`, `:93-97`).
- **Cierres obsoletos.** No se introducen. Las acciones del store son `useCallback` sobre `dispatch` y no
  cambian nunca (`DashboardProvider.tsx:12-42`). Los manejadores de diálogo se crean en cada render de
  `DialogHost`/`PanelRoute` y leen ese render, como antes. `requestManual` depende de `loading` en el
  `useMemo` (`DashboardRuntime.tsx:44-54`), equivalente al `scanManually` original. `onManualView` llama a
  `setScanProgress` (estado de `DashboardRuntime`) y a `updateBusy` (reducer). Son dos componentes, pero
  entran en la misma tanda automática de React 19, así que nunca hay un render intermedio con el progreso
  nuevo y `busy` viejo.
- **StrictMode.** Las limpiezas siguen siendo simétricas. En el desmontaje simulado se destruye y se rehace todo
  en el mismo orden relativo dentro de `DashboardRuntime`. Las funciones de fusión (`mergeSourceUpdateForInstallation`,
  `applyLiveUsage`, `reconcileManualBusy`) son puras, así que la doble llamada al reducer es inocua.
- **R-3.** Los controladores solo están en `DashboardRuntime`, que queda por encima de `RouterProvider`
  (`AppProviders.tsx:8-19`, `App.tsx:5-10`).
- **R-4.** Se cumple: `listen`, `getCurrentWindow` y `convertFileSrc` siguen detrás de `bridge.isDesktop()`.
- **R-6.** No hay envoltorios nuevos: `AppShell` y `PanelRoute` usan fragmentos y los diálogos siguen
  después de `<main>`, en el orden acordado (`DialogHost.tsx:47-127`). El orquestador ya lo confirmó con el DOM.
- **R-7.** Se cumple: solo `src/styles/index.css` importa CSS de la app; `main.tsx` importa además las fuentes, como antes.
- **R-8.** Se cumple: no hay ciclos (`dashboard` ← `scan`, `updates`, `instances`, `sessions`; `sessions` ←
  `instances`, `original-app`).
- **R-9.** Se cumple: los contextos y sus hooks están en `*-context.ts`, y cada proveedor en su `.tsx`.

## Foco 3 · Reducer y contrato

`dashboard-store.ts` cumple el contrato de `arquitectura.md` § Estado compartido: las mismas diez acciones,
solo `import type` y la misma referencia cuando no hay cambio (`withField` con `Object.is`). Las únicas
funciones `update` que se pasan son las tres previstas. Ningún efecto tiene dependencias nuevas, así que no
cambian los tiempos: 15 s del uso en vivo, 6 h del sondeo, `BACKGROUND_REFRESH_COOLDOWN_MS` y retardo de
cierre del escaneo, todos en los controladores. Ahora hay menos renders que antes: solo se renderizan los
consumidores del contexto que cambia.

## Foco 4 · Dependencias (comprobadas con `rg`)

- `invoke(` no aparece fuera de `bridge.ts`.
- Ningún `.ts`/`.tsx` importa CSS de la app.
- `features/dashboard` no importa ninguna feature.
- Entre features, nada pasa por rutas internas: todo va por `index.ts`.
- Nada importa de `app/`.
- `components/` no usa hooks de dominio.
- El `.tsx` más largo es `SessionTransferDialog.tsx`, con 177 líneas.

## Foco 5 · Tamaño del JS

Medí con un bundle aislado (esbuild, minificado, React externo) cuánto pesa solo el router con el mismo uso
que la app:

| Variante | gzip |
| --- | --- |
| `createHashRouter` + `RouterProvider` de `react-router/dom` (lo actual) | 32,9 kB |
| `createHashRouter` + `RouterProvider` de `react-router` (otro punto de entrada) | 32,8 kB |
| `<HashRouter>` + `<Routes>` (modo declarativo) | 15,5 kB |

- El crecimiento (+34,5 kB) es casi todo el **modo datos** del router (`createRouter`: cargadores, acciones,
  fetchers, revalidación). Los 1,6 kB restantes son el propio refactor.
- **`cookie` y `set-cookie-parser` no llegan al bundle**: `react-router` declara `sideEffects: false` y
  `dist/assets/index-Cv-5Ci13.js` no contiene `cookie`. Se instalan, pero no se ejecutan. Las dos son MIT.
- **Otro punto de entrada no ahorra nada**: 0,1 kB.
- La única reducción real es pasar al modo declarativo, unos 17 kB menos. Pero contradice la ★ D-3
  («`createHashRouter`»). Además se pierden `lazy` y `errorElement` por ruta: las pantallas diferidas se
  harían con `React.lazy` + `Suspense`, y el relanzado de A-7 con otra pieza.

**Juicio: aceptable, no bloquea.** Es una app de escritorio que carga el JS del disco local, sin red. 120 kB
gzip (383 kB sin comprimir) se analizan en milisegundos y no se nota al arrancar. Mi estimación de 20–25 kB
en `arquitectura.md` se quedó corta: no conté el núcleo del modo datos. Queda como deuda opcional en R-1.

## Foco 6 · Documentación frente al código

- **`docs/arquitectura/frontend.md`**: difería en cuatro puntos y lo he corregido:
  - los hooks partidos de `scan` y `updates`;
  - el orden exacto de los efectos;
  - los listeners `keydown` y `change` fuera de `DashboardRuntime`;
  - qué features usan `dashboard`, que no son todas.

  Además he añadido la regla de dependencias estables en esos efectos, he matizado «`lib/` no toca el DOM»
  (`bridge.ts` usa `window`) y he anotado el coste del router.
- **`.metodo/reglas/frontend.md`**: coincide con el código.
- **Skill `code-ai-profiles-frontend-react-vite`**: coincide, salvo un matiz en la línea 96 (R-6).

## Observaciones (no bloquean)

### R-1 (O) · El router en modo datos pesa 33 kB gzip, no 20–25

- **Dónde**: `src/app/router.tsx:10-20`, `src/app/App.tsx:1`, `package.json` (`react-router@^7.18.5`).
- **Qué**: el JS de entrada pasa de 85,0 a 119,6 kB gzip, por las razones del Foco 5.
- **Qué hacer**: nada en `src/`. Al cerrar, el orquestador apunta el dato en `docs/rendimiento.document.md`
  (ya está en `docs/arquitectura/frontend.md` § Router). Si algún día el tamaño importa, pasar a `<HashRouter>`
  ahorra unos 17 kB, pero es una decisión nueva sobre la ★ D-3 y la toma el mantenedor. **Responsable**: orquestador.

### R-2 (O) · Algunos listeners se registran ahora en otro orden relativo, sin efecto

- **Dónde**:
  - `src/app/routes/panel/Toolbar.tsx:14-23`, `src/app/providers/DialogsProvider.tsx:18-32`: `keydown`, que
    ahora se registra antes que los `focus`;
  - `src/features/appearance/AppearanceProvider.tsx:14-24`: persistencia y `matchMedia`, que ahora van
    después de todo `DashboardRuntime`.
- **Qué**: antes, todos los efectos estaban en `App`. Ahora React ejecuta primero los de los hijos y después los
  de los padres. Los dos casos de arriba cambian de posición. No afecta a nada: son eventos de otro tipo
  (`keydown`, `change`) y escrituras en `localStorage` que no interactúan con `focus`, `blur` ni
  `visibilitychange`, y el orden entre los tres `focus` se mantiene.
- **Qué hacer**: nada. Queda documentado en `docs/arquitectura/frontend.md` § Estado.

### R-3 (O) · `transferProfiles` se calcula en dos sitios

- **Dónde**: `src/app/routes/panel/PanelRoute.tsx:27,89,93` y `src/app/layout/DialogHost.tsx:37,80,85,98`.
- **Qué**: el `source` de una transferencia desde la original sale del array de `PanelRoute`, y la lista de
  perfiles del diálogo sale del de `DialogHost`. Son objetos distintos con los mismos datos. Funciona porque
  `SessionTransferDialog.tsx:21` y `UnlinkSessionDialog.tsx:22` comparan por `id`. Si alguien compara alguna
  vez por identidad, se rompe.
- **Qué hacer**: nada ahora. La próxima vez que se toque, se puede subir `useTransferProfiles` a un valor
  memorizado del contexto o seguir comparando siempre por `id`. **Responsable**: frontend, en una historia futura.

### R-4 (O) · Las dependencias de los efectos dependen de que las acciones sean estables

- **Dónde**: `src/features/dashboard/useInitialLoad.ts:39`, `src/features/updates/useSourceUpdatePolling.ts:31`,
  `src/features/instances/useLiveUsage.ts:37`.
- **Qué**: omiten `replaceDashboard`/`updateDashboard`/`setError`/`finishLoading` de las dependencias. Es
  correcto porque son estables (`useCallback(..., [])` sobre `dispatch`). Pero no hay lint que lo guarde: si
  alguien las vuelve inestables y las añade a las dependencias, el efecto se vuelve a ejecutar y su listener
  `focus` pasa al final de la cola, lo que rompe R-1 sin que se vea en el navegador.
- **Qué hacer**: nada en código. La regla queda escrita en `docs/arquitectura/frontend.md` («Dependencias de
  esos efectos»).

### R-5 (O) · El escenario de R-1 solo se ve en escritorio

- **Qué**: el mock del navegador no reproduce la vuelta desde la actualización oficial. La comparación del DOM
  y la carga limpia no prueban `suppressNextGeneralFocus`.
- **Qué hacer**: en la prueba humana, en `npm run tauri dev`, pulsar «Actualizar original», volver a la ventana
  y comprobar que solo cambian las versiones y que no aparece el panel de escaneo. Es el último punto de AC-01.
  Mejor en las tres plataformas, porque `blur`/`focus` se comportan distinto en cada WebView.
  **Responsable**: mantenedor (prueba humana).

### R-6 (O) · La skill no menciona los hooks partidos

- **Dónde**: `.claude/skills/code-ai-profiles-frontend-react-vite/SKILL.md:96-98`.
- **Qué**: dice «un hook `use…Runtime` llamado desde `DashboardRuntime`». Es correcto, pero no dice que un
  controlador se crea en un hook sin efectos y su efecto va en otro, ni que las dependencias de esos efectos
  tienen que ser estables.
- **Qué hacer**: añadir media línea que remita a `docs/arquitectura/frontend.md` § Estado.
  **Responsable**: orquestador (o frontend, en su próximo despacho).

### R-7 (O) · Falta la suite sobre el SHA final

- **Qué**: `pruebas.mjs estado` dice «HEAD c157308 sin suite en verde».
- **Qué hacer**: el orquestador corre `pruebas.mjs suite code-ai-profiles` una vez sobre el SHA que se vaya a
  cerrar, que ya incluye los cuatro `test:*` nuevos en `stack.comandos`. Al cerrar también tocan:
  - `npm run graph:update` y `graph:check`;
  - `docs/rendimiento.document.md`;
  - la entrada de `CHANGELOG.md`.

  **Responsable**: orquestador.

## Sin hallazgos

- **Privacidad**: ningún dato de perfil entra en la URL, en logs ni en estado nuevo.
- **`localStorage`**: misma clave y mismo formato.
- **Contrato IPC y Rust**: `src/types.ts`, `bridge.ts` y `src-tauri/` sin cambios.
- **Red, permisos y telemetría**: nada nuevo.
- **Configuración**: no se lee `import.meta.env`.
- **Plataformas**: el hash funciona en `tauri://localhost` y `http://tauri.localhost`, y las clases
  `platform-*` siguen en el shell (`AppShell.tsx:16`).
- **Errores de ruta**: `RouteErrorBoundary` relanza (A-7), así que un fallo de render llega a la raíz igual
  que antes.
