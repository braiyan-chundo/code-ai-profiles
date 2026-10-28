# Arquitectura del frontend

La interfaz de Code AI Profiles es una SPA de React 19 + Vite + TypeScript que corre dentro de Tauri 2.
Se organiza **por features**: lo que cambia junto vive junto, y una funcionalidad nueva es una carpeta
nueva. Hay un router con historial por hash, un estado compartido con Context y `useReducer`, y el CSS propio
de `DESIGN.md` repartido por feature sin alterar la cascada. Origen: HU-0015.

## Estructura

```text
src/
  main.tsx              entrada: StrictMode, fuentes locales, styles/index.css y <App />
  types.ts              el contrato con Rust (de backend; el frontend solo lo lee)
  app/                  composición: proveedores, router, layout y pantallas
    App.tsx             solo compone: <AppProviders><RouterProvider router={router} /></AppProviders>
    router.tsx          createHashRouter: rutas, layout y salida para rutas desconocidas
    RouteErrorBoundary.tsx
    providers/          AppProviders, DashboardRuntime, DialogsProvider (+ dialogs-context.ts)
    layout/             AppShell, Titlebar, Statusbar, DialogHost, window-actions.ts y su CSS
    routes/<pantalla>/  un componente de ruta y las piezas que solo usa esa pantalla
  features/<feature>/   componentes, hooks, lógica pura, tipos y CSS de una funcionalidad
    index.ts            su API pública
  components/           piezas compartidas sin dominio: Icons, ModalFrame, ConfirmDialog, Metric,
                        EmptyState, LoadingCards y su CSS
    ui/                 (HU-0014) componentes de shadcn/ui
  hooks/                (HU-0014) hooks genéricos que trae shadcn
  lib/                  sin React: bridge, controladores, formato, errores, plataforma
    utils.ts            (HU-0014) cn()
  styles/               índice del CSS y las capas globales: base, animaciones, tema claro y responsive
tests/*.test.ts         node --test sobre módulos puros
```

Las entradas marcadas con (HU-0014) están reservadas: no existen hasta que esa historia instale shadcn/ui.

### Las features

| Feature | Qué contiene |
| --- | --- |
| `dashboard` | El **núcleo de datos**: `dashboard-store.ts` (reducer puro), `dashboard-selectors.ts`, `DashboardProvider`, `useDashboard`, la carga inicial, la plataforma en uso y los banners de error y aviso |
| `scan` | Controlador de escaneo (`useScanRuntime` lo crea en el render; `useScanLifecycle` es su efecto), refresco en segundo plano, `useScan`, `ScanProgressPanel` |
| `updates` | Actualización oficial de la original y sincronización de instancias: controlador (`useSourceUpdateController` lo crea; `useSourceUpdateRuntime` registra `blur`, `focus` y `visibilitychange`), sondeo de 6 h, `useSourceUpdate`, banners, diálogos, textos |
| `instances` | Tarjeta, medidores, sección de instancias, editor, borrado, uso en vivo, icono personalizado |
| `sessions` | Formato y contexto de sesiones, transferencia, desvinculación, perfiles de transferencia |
| `original-app` | La sección de la aplicación original |
| `appearance` | Preferencias (tema y tamaño de texto), su proveedor y su diálogo |

La pantalla `/` es `app/routes/panel/`: la toolbar con el buscador y el contenido que compone las features.

## Reglas de dependencias

```text
app/  ──►  features/*  ──►  components/, lib/, types.ts
                │
                └──►  features/dashboard   (el núcleo; él no importa ninguna feature)
```

- `app/` puede importar todo. Nada importa de `app/`.
- Una feature importa de otra **solo por su `index.ts`** y nunca en ciclo. Hoy: `instances` y
  `original-app` usan `sessions`; `scan`, `updates`, `instances` y `sessions` usan `dashboard`; `appearance` no
  importa ninguna.
- Dentro de una feature, imports relativos directos (no a través de su propio `index.ts`).
- `components/` no conoce el dominio: recibe props, no usa `useDashboard`.
- `lib/` no importa React ni features. Solo `bridge.ts` toca `window` (detección de Tauri y esperas del mock);
  los demás módulos reciben del llamador lo que necesitan del entorno (`navigator.platform`, el reloj).
- `invoke` **solo** en `lib/bridge.ts`. Las otras APIs de Tauri, siempre detrás de `bridge.isDesktop()`, viven en tres
  sitios: `listen` en `features/scan/useScanRuntime.ts`, `getCurrentWindow` en `app/layout/window-actions.ts` y
  `convertFileSrc` en `features/instances/instance-icon.ts`.
- Imports relativos. Cuando la HU-0014 añada el alias `@/`, se preferirá para cruzar carpetas.

## Dónde va cada cosa

| Si es… | Va en… |
| --- | --- |
| Una pantalla nueva | `app/routes/<pantalla>/` + su ruta en `app/router.tsx` |
| Un componente de una funcionalidad | `features/<feature>/<Componente>.tsx` |
| Un componente reutilizable sin dominio | `components/` |
| Un componente de shadcn | `components/ui/` (desde la HU-0014) |
| Estado de una funcionalidad compartido entre pantallas | contexto en `features/<feature>/<feature>-context.ts` + proveedor; se monta en `app/providers/AppProviders.tsx` |
| Estado local de una pieza | `useState` en la pieza |
| Datos que vienen de Rust | el store de `features/dashboard` (o, si son de otra pantalla, la feature de esa pantalla), siempre vía `bridge` |
| Lógica sin React (formato, textos, validación, selectores, reducer) | un `.ts` puro en la feature o en `lib/`, con su prueba |
| Lógica con tiempo, reintentos o carreras | un controlador puro en `lib/*-controller.ts`, con el reloj y las llamadas inyectados |
| Un efecto que vive lo que vive la app | un hook en su feature, llamado desde `app/providers/DashboardRuntime.tsx` en su turno. Si además crea un controlador, el controlador se crea en un hook sin efectos (render) y el efecto va en otro, para que el orden lo fije la llamada al efecto |
| Un diálogo | el componente en su feature; su bandera en `DialogsProvider`; se pinta en `app/layout/DialogHost.tsx` |
| Un icono | `components/Icons.tsx` |
| Una URL fija | el archivo de enlaces (`src/lib/links.ts`, cuando haga falta); nunca en un componente |

## Estado

```text
<StrictMode>
  <AppearanceProvider>        preferencias, tema del sistema, persistencia en localStorage
    <DashboardProvider>       useReducer(dashboardReducer): dashboard, loading, busy, error, notice, iconPreviews
      <DashboardRuntime>      controladores y efectos; provee useScan y useSourceUpdate
        <DialogsProvider>     banderas de los diálogos y la tecla Escape
          <RouterProvider>    AppShell > pantallas
```

- **Store.** `DashboardState` llega completo en casi cada comando y se **reemplaza**
  (`replaceDashboard`). Solo dos fusiones parciales, puras y probadas: el estado oficial de actualización
  (`mergeSourceUpdateForInstallation`) y el uso en vivo (`applyLiveUsage`). Pasan como `update` en la acción
  `dashboard/updated`. El reducer solo tiene `import type` y se prueba con `node --test`.
- **Operación en curso.** `busy` es una clave (`scan`, `create`, `update`, `launch:<id>`, `stop:<id>`,
  `delete:<id>`, `transfer:<sessionId>`, `unlink:<sessionId>`, `update-applications`, `update-original`) que
  deshabilita controles. `busyRef` refleja su último valor para los listeners. `runAction(key, action)` es el
  patrón estándar: marca `busy`, limpia `error`, reemplaza el estado y libera `busy`.
- **Hooks de acceso.** `useDashboard`, `useScan`, `useSourceUpdate`, `useAppearance` y `useDialogs`. Cada contexto
  vive en un `*-context.ts` separado de su proveedor, y su hook falla si se usa fuera de él.
- **Resultados viejos.** Los controladores descartan por `generation` y por ciclo de vida. Los efectos con
  `await` usan su bandera `active`. El listener `scan-progress` comprueba su ciclo con un ref antes de usar el
  payload.
- **Orden de los efectos de ejecución.** `DashboardRuntime` crea primero los dos controladores en el render
  (`useScanRuntime`, `useSourceUpdateController`) y después llama a los efectos en un orden fijo:
  `useInitialLoad` → `useScanLifecycle` → `useSourceUpdateRuntime` → `useLiveUsage` → `useSourceUpdatePolling` →
  `useBackgroundRefresh`. El listener de `focus` de la actualización tiene que registrarse **antes** que el del
  refresco en segundo plano: el primero marca `suppressNextGeneralFocus` y el segundo lo consume. Ningún otro
  componente registra `focus`, `blur` ni `visibilitychange`. Fuera de `DashboardRuntime` solo hay listeners de
  otro tipo: `keydown` de Escape en `DialogsProvider`, `keydown` de Ctrl/⌘ F en `app/routes/panel/Toolbar.tsx` y
  `change` de `prefers-color-scheme` en `AppearanceProvider`.
- **Dependencias de esos efectos.** Solo valores estables (los controladores, refs, las acciones del store) o la
  clave de instancias en ejecución del uso en vivo. Un efecto que se vuelve a ejecutar vuelve a registrar su
  listener al final de la cola, y eso puede invertir el orden de `focus`.
- **Los controladores se crean una sola vez** (`useRef` perezoso) encima del router: navegar no los recrea.
- `localStorage` solo guarda las preferencias de apariencia (`code-ai-profiles:appearance`), validadas campo a
  campo al leerlas.

## Router

- React Router 7 en modo datos: `createHashRouter` (`react-router`) y `RouterProvider` (`react-router/dom`). Va con hash
  porque en Tauri no hay servidor que resuelva rutas profundas al recargar. Funciona igual en
  `tauri://localhost` y en `http://tauri.localhost`.
- `/` es una ruta de layout (`AppShell`). La titlebar, el statusbar y `DialogHost` persisten, y `<Outlet />`
  pinta la pantalla en las filas 2 y 3 de `.app-window` (barra y contenido).
- La ruta índice es el panel. `*` redirige a `/` con `<Navigate replace />`.
- `errorElement` relanza el error: un fallo de render se comporta como sin router. Una pantalla de error
  propia la decide una historia.
- La URL nunca lleva nombres, rutas de disco, títulos de sesión ni nada del contenido de un perfil. A lo sumo, un ID opaco
  de instancia.
- **Coste.** El modo datos (`createHashRouter` + `RouterProvider`) pesa unos 33 kB gzip en el JS de entrada
  (medido en HU-0015: de 85,0 a 119,6 kB). Las dependencias `cookie` y `set-cookie-parser` se instalan pero no
  llegan al bundle. Importar `RouterProvider` desde `react-router` en vez de `react-router/dom` no ahorra nada.
  El modo declarativo (`<HashRouter>` + `<Routes>`) pesaría unos 15 kB, pero pierde `lazy` y `errorElement` por ruta;
  cambiarlo exige otra decisión (★ D-3 de la HU-0015).

### Añadir una pantalla

1. Crea `src/app/routes/<pantalla>/<Pantalla>Route.tsx`. Pinta **dos** hijos: su barra (fila 2) y su
   contenido con la clase `content` (fila 3). Si necesita otra rejilla, la define la historia con su diseño.
2. Añade la ruta diferida en `app/router.tsx`, como hija de `/`:

   ```tsx
   { path: "ajustes", lazy: async () => ({ Component: (await import("./routes/settings/SettingsRoute")).SettingsRoute }) }
   ```

3. Navega con `<Link to="/ajustes">` o `useNavigate()`. Los datos salen de los hooks de las features; si la
   pantalla necesita datos nuevos de Rust, se piden a backend como función de `bridge.ts`.
4. Su CSS, como en «Añadir una feature».

### Añadir una feature

1. Crea `src/features/<feature>/` con sus componentes, hooks, `.ts` puros, tipos e `index.ts` (solo lo que
   otros necesitan).
2. Si tiene estado compartido: `<feature>-context.ts` (contexto + `use<Feature>`) y `<Feature>Provider.tsx`,
   montado en `app/providers/AppProviders.tsx`. Si tiene efectos que viven lo que la app, un
   `use<Feature>Runtime` llamado desde `DashboardRuntime`, al final del orden salvo que dependa de otro.
3. Su lógica pura, con su prueba en `tests/<area>.test.ts`, su script `test:<area>` en `package.json`, su paso
   en `.github/workflows/validate.yml` y su entrada en `stack.comandos` de `.metodo/config.json`.
4. Su CSS en `features/<feature>/<feature>.css`, con clases de su propio prefijo, importado en
   `styles/index.css` **después del último archivo de feature y antes de `styles/animations.css`**. Sus reglas
   `.theme-light …` y `@media` van al final de su propio archivo. Como sus selectores no se comparten con nadie,
   su posición no altera la cascada existente. Nunca sobrescribe clases compartidas (`.primary-action`,
   `.modal-card`…) desde una feature: compone con las suyas.

## Estilos

- `src/styles/index.css` es el **único** archivo que importa CSS, y solo con `@import`. Ningún `.tsx` importa
  CSS: Vite ordenaría el resultado según el grafo de módulos.
- El orden del índice reproduce el `styles.css` original tramo a tramo: `base` → shell → toolbar y contenido
  del panel → features y componentes, en el orden en que aparecían → `animations` → `theme-light` →
  `responsive`. El tema claro y los cortes de ventana reducida de lo que existía viven en `styles/theme-light.css` y
  `styles/responsive.css`, porque repartirlos cambiaría el orden de reglas de igual especificidad.
- Para cambiar el aspecto de algo existente en claro o en ventana reducida, se edita su bloque en esos dos archivos.
- Tokens, temas (`theme-dark` / `theme-light`, `system` vía `matchMedia`), plataformas (`platform-*`) y
  densidad (`session-text-*`) siguen como describen `DESIGN.md` y la skill
  `code-ai-profiles-frontend-react-vite`. Varias reglas dependen de la posición en el DOM (`:nth-of-type`):
  no se envuelven piezas en elementos nuevos sin revisar el CSS.
- Los diálogos se pintan dentro de `.desktop-shell`, después de `<main>`. `.theme-light .modal-backdrop` lo
  necesita. Nada de portales a `body`.

## Pruebas

- `node --test` sobre los `.ts` puros. Importan con la extensión `.ts`, usan solo sintaxis borrable y
  sus imports relativos son solo `import type`. Las pruebas importan el archivo del módulo, nunca el
  `index.ts` de la feature.
- Scripts: `test:scan`, `test:update` (controladores), `test:format`, `test:appearance`, `test:dashboard` y
  `test:messages`.
- Los hooks, los componentes, los temas, las plataformas y la ventana reducida se verifican con la app abierta
  (`pnpm dev` con el mock, `pnpm tauri dev` en escritorio).

## Lo que reservó esta estructura para la HU-0014

shadcn/ui irá en `src/components/ui/`, `cn()` en `src/lib/utils.ts`, sus hooks genéricos en `src/hooks/` y el alias
`@/` en `tsconfig.json` y `vite.config.ts`. Tailwind no entra en `src/styles/index.css`: según la HU-0014, solo
se carga en su showcase.
