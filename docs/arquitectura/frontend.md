# Arquitectura del frontend

La interfaz de Code AI Profiles es una SPA de React 19 + Vite + TypeScript que corre dentro de Tauri 2.
Se organiza **por features**: lo que cambia junto vive junto, y una funcionalidad nueva es una carpeta
nueva. Hay un router con historial por hash y un estado compartido con Context y `useReducer`. Origen: HU-0015.
Desde la HU-0016 la interfaz se construye con el catálogo `src/components/ui` y Tailwind 4, con los tokens de
`DESIGN.md`. La navegación es un sidebar con un dashboard y una página por instancia. El CSS propio heredado se
retira en esa misma historia.

## Estructura

```text
src/
  main.tsx              entrada: StrictMode, fuentes locales, styles/index.css, aviso de motor (HU-0016 A-16) y <App />
  types.ts              el contrato con Rust (de backend; el frontend solo lo lee)
  app/                  composición: proveedores, router, layout y pantallas
    App.tsx             solo compone: <AppProviders><RouterProvider router={router} /></AppProviders>
    router.tsx          createHashRouter: rutas, layout y salida para rutas desconocidas
    RouteErrorBoundary.tsx
    providers/          AppProviders, DashboardRuntime, DialogsProvider (+ dialogs-context.ts)
    layout/             AppShell (SidebarProvider), Titlebar, AppSidebar, FeedbackArea, Statusbar, DialogHost,
                        PageHeader, PageContent, PageSkeleton (las dos filas y el esqueleto de una pantalla) y window-actions.ts.
                        Desde HU-0019, Titlebar es solo la zona de la barra sobre el sidebar y PageHeader es la barra de la página
    routes/<pantalla>/  un componente de ruta y las piezas que solo usa esa pantalla
  features/<feature>/   componentes, hooks, lógica pura y tipos de una funcionalidad (sin CSS desde la HU-0016)
    index.ts            su API pública
  components/           piezas compartidas sin dominio: BrandMark (la marca), EmptyState y NoticeAlert (el aviso en línea)
    ui/                 (HU-0014) el catálogo shadcn/ui (radix-vega): código propio desde su descarga
  hooks/                (HU-0014) hooks genéricos del registro: use-mobile, use-highlighted-code (+ highlighter.tsx)
  lib/                  sin React: bridge, controladores, formato, errores, plataforma, webview-support (HU-0016)
    utils.ts            (HU-0014) cn(), reexportado del paquete `cn`
  styles/               index.css (la entrada de Tailwind de la app), tokens.css (tokens oscuros, claros y de
                        densidad) y ui-theme.css (el puente de las variables de shadcn a los tokens)
  showcase/             (HU-0014) la otra entrada de Vite: main.tsx, showcase.css (su entrada de Tailwind; la app
                        tiene la suya en styles/index.css), Showcase.tsx, catalog.ts y sections/<componente>.tsx
tests/*.test.ts         node --test sobre módulos puros (y ui-isolation.test.ts, que vigila las fronteras de la UI)
showcase.html           (HU-0014) la página del showcase; solo la sirve `pnpm dev`, `vite build` no la empaqueta
components.json         (HU-0014) configuración de la CLI de shadcn
```

### Las features

| Feature | Qué contiene |
| --- | --- |
| `dashboard` | El **núcleo de datos**: `dashboard-store.ts` (reducer puro), `dashboard-selectors.ts`, `DashboardProvider`, `useDashboard`, la carga inicial, la plataforma en uso y los banners de error y aviso |
| `scan` | Controlador de escaneo (`useScanRuntime` lo crea en el render; `useScanLifecycle` es su efecto), refresco en segundo plano, `useScan`, `ScanProgressPanel` |
| `updates` | Actualización oficial de la original y sincronización de instancias: controlador (`useSourceUpdateController` lo crea; `useSourceUpdateRuntime` registra `blur`, `focus` y `visibilitychange`), sondeo de 6 h, `useSourceUpdate`, banners, diálogos, textos |
| `instances` | Detalle de la instancia (`InstanceDetail`), `InstanceAvatar`, medidores, editor, borrado, uso en vivo, icono personalizado |
| `sessions` | `SessionList` (compartida por instancia y original), formato y contexto de sesiones, transferencia, desvinculación, perfiles de transferencia |
| `original-app` | El detalle de la aplicación original (`OriginalDetail`) |
| `appearance` | Preferencias (tema, tamaño de texto y sidebar plegado), su proveedor (que aplica el tema en `<html>`) y `AppearanceSettings`, la sección Apariencia de Configuración (HU-0022; el diálogo ya no existe) |
| `permissions` | (HU-0022) El catálogo puro `permission-cards.ts` (tarjetas, textos, estado y `attention` por plataforma), `PermissionsSettings`, `PermissionCard` y `usePermissionsAttention`. El estado sale del registro de instancias y de `accountFacts()`; nunca de los perfiles |

Las pantallas (HU-0016) son `app/routes/dashboard/` (`#/`), `app/routes/original/` (`#/original`),
`app/routes/instance/` (`#/instancias/:instanceId`) y, desde la HU-0022, `app/routes/settings/`
(`#/configuracion/:section?`, con `apariencia` o `permisos`). La búsqueda vive en el sidebar.

## Reglas de dependencias

```text
app/  ──►  features/*  ──►  components/, lib/, types.ts
                │
                └──►  features/dashboard   (el núcleo; él no importa ninguna feature)
```

- `app/` puede importar todo. Nada importa de `app/`.
- Una feature importa de otra **solo por su `index.ts`** y nunca en ciclo. Hoy: `instances` y
  `original-app` usan `sessions`; `original-app` usa además el tipo `OriginalInstallAvailability` de `updates`
  (HU-0017, solo `import type`); `scan`, `updates`, `instances` y `sessions` usan `dashboard`; `appearance` no
  importa ninguna.
- Dentro de una feature, imports relativos directos (no a través de su propio `index.ts`).
- `components/` no conoce el dominio: recibe props, no usa `useDashboard`.
- `lib/` no importa React ni features. Solo `bridge.ts` toca `window` (detección de Tauri y esperas del mock);
  los demás módulos reciben del llamador lo que necesitan del entorno (`navigator.platform`, el reloj).
- `invoke` y `Channel` (HU-0017: el progreso de una llamada larga) **solo** en `lib/bridge.ts`; el resto de la app
  recibe un callback. Las otras APIs de Tauri, siempre detrás de `bridge.isDesktop()`, viven en tres
  sitios: `listen` en `features/scan/useScanRuntime.ts`, `getCurrentWindow` en `app/layout/window-actions.ts` y
  `convertFileSrc` en `features/instances/instance-icon.ts`.
- El alias `@/` → `src/` existe desde la HU-0014 (`tsconfig.json` `paths` y `vite.config.ts`). Lo usan
  `components/ui`, `hooks` y `showcase`. El código nuevo puede usarlo para cruzar carpetas. Lo existente no se
  reescribe por eso. **Excepción:** un módulo que se prueba con `node --test` usa solo imports relativos, porque
  Node no resuelve `@/`.
- **La capa de UI genérica** (HU-0014): `components/ui → hooks → lib/utils.ts`. No conoce el dominio ni importa
  `features/`, `app/`, `lib/bridge.ts`, `types.ts` ni `@tauri-apps/*`. La app la usa (HU-0016) importando
  `components/ui/<id>`, `cn` de `lib/utils` (con imports relativos, como el resto de la app) y los iconos de
  `lucide-react`. `radix-ui` y `cva` solo aparecen
  dentro de `components/ui`. Si una pantalla necesita una primitiva que el catálogo no tiene, se añade al catálogo.
- **El showcase** (`src/showcase/`) importa `components/ui`, `hooks`, `lib/utils.ts` y las fuentes. Nada importa
  del showcase, y el showcase no importa features, `app/`, `bridge` ni datos reales.
- Lo vigila `tests/ui-isolation.test.ts`. Comprueba que hay una entrada de Tailwind por página, que el showcase queda
  fuera de la app, que el catálogo no conoce el dominio, que no se usan cookies, quién registra `focus`, `blur` y
  `visibilitychange`, y la lista cerrada de `.css`. El detalle está en
  `hu/HU-0016-…/arquitectura.md` § `test:ui`.

## Dónde va cada cosa

| Si es… | Va en… |
| --- | --- |
| Una pantalla nueva | `app/routes/<pantalla>/` + su ruta en `app/router.tsx` |
| Un componente de una funcionalidad | `features/<feature>/<Componente>.tsx` |
| Un componente reutilizable sin dominio | `components/ui/` si es una primitiva del catálogo; `components/` si es una composición propia sin dominio |
| Un componente de shadcn | `components/ui/` con `pnpm exec shadcn add <id>` (nunca `--overwrite`), su sección en `showcase/sections/` y su ficha en la skill `code-ai-profiles-ui` |
| Una variable del tema de shadcn | `styles/ui-theme.css`: un `var(--token)` de la app o, si no existe, un `--ui-*` con la regla de la que sale |
| Estado de una funcionalidad compartido entre pantallas | contexto en `features/<feature>/<feature>-context.ts` + proveedor; se monta en `app/providers/AppProviders.tsx` |
| Estado local de una pieza | `useState` en la pieza |
| Datos que vienen de Rust | el store de `features/dashboard` (o, si son de otra pantalla, la feature de esa pantalla), siempre vía `bridge` |
| Lógica sin React (formato, textos, validación, selectores, reducer) | un `.ts` puro en la feature o en `lib/`, con su prueba |
| Lógica con tiempo, reintentos o carreras | un controlador puro en `lib/*-controller.ts`, con el reloj y las llamadas inyectados |
| Un efecto que vive lo que vive la app | un hook en su feature, llamado desde `app/providers/DashboardRuntime.tsx` en su turno. Si además crea un controlador, el controlador se crea en un hook sin efectos (render) y el efecto va en otro, para que el orden lo fije la llamada al efecto |
| Un diálogo | el componente en su feature, con `Dialog` o `AlertDialog` del catálogo; su bandera en `DialogsProvider`; se pinta en `app/layout/DialogHost.tsx`. Escape, la X y el clic fuera usan la misma función guardada por `busy` |
| Un icono | `lucide-react`. La marca, en `components/BrandMark.tsx`. El icono propio de una instancia, con `managedIconSource` |
| Una entrada de navegación | `app/layout/AppSidebar.tsx` |
| Un aviso | en línea, con `Alert`. Si tiene que verse en todas las pantallas, en `app/layout/FeedbackArea.tsx`. Sin `Toaster` |
| Una URL fija | el archivo de enlaces (`src/lib/links.ts`, cuando haga falta); nunca en un componente |

## Estado

```text
<StrictMode>
  <AppearanceProvider>        preferencias, tema del sistema, persistencia en localStorage
    <DashboardProvider>       useReducer(dashboardReducer): dashboard, loading, busy, error, notice, iconPreviews
      <DashboardRuntime>      controladores y efectos; provee useScan y useSourceUpdate
        <DialogsProvider>     banderas de los diálogos
          <RouterProvider>    AppShell (SidebarProvider) > pantallas
```

- **Store.** `DashboardState` llega completo en casi cada comando y se **reemplaza**
  (`replaceDashboard`). Solo dos fusiones parciales, puras y probadas: el estado oficial de actualización
  (`mergeSourceUpdateForInstallation`) y el uso en vivo (`applyLiveUsage`). Pasan como `update` en la acción
  `dashboard/updated`. El reducer solo tiene `import type` y se prueba con `node --test`.
- **Instalación de la original (HU-0017).** El store guarda también `originalInstall` (el último progreso, o `null`)
  y `pendingSyncIds` (las instancias que estaban en marcha al instalar). Ninguno de los dos es persistente: al
  cerrar la app, una pendiente vuelve a ser una instancia por detrás, como cualquier otra.
  `installOriginal` pone `busy = "install-original"` durante todo el flujo, y deja de pintar el progreso del
  `Channel` en cuanto llega la respuesta. La barra sin medida es `Progress` con `value=100` y `animate-pulse`. La
  acción no tiene diálogo: el botón ya es la confirmación.
- **Operación en curso.** `busy` es una clave (`scan`, `create`, `update`, `launch:<id>`, `stop:<id>`,
  `delete:<id>`, `transfer:<sessionId>`, `unlink:<sessionId>`, `update-applications`, `update-original`,
  `install-original`) que
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
  `useBackgroundRefresh` → `usePendingSynchronization` (HU-0017). Este último no registra listeners: reacciona al
  store y solo sincroniza con `busy === null`. El listener de `focus` de la actualización tiene que registrarse **antes** que el del
  refresco en segundo plano: el primero marca `suppressNextGeneralFocus` y el segundo lo consume. Ningún otro
  archivo de `src/` registra `focus`, `blur` ni `visibilitychange` (lo vigila `test:ui`). Fuera de `DashboardRuntime`
  solo hay listeners de otro tipo:
  - `keydown` de Ctrl/⌘ F y, desde la HU-0022, de Ctrl/⌘ , (abre Configuración salvo con un diálogo de `DialogHost`
    abierto) en `app/layout/AppSidebar.tsx`. Es el único `keydown` de la app: un atajo nuevo va en ese mismo handler;
  - `change` de `prefers-color-scheme` en `AppearanceProvider`;
  - `change` del `matchMedia` de `hooks/use-mobile.ts`, que usa el sidebar.

  Escape lo gestiona cada diálogo de Radix (HU-0016). En las dependencias, Radix `Menu` (menús desplegables y
  contextuales) y `Select` registrarían `blur` en `window` **mientras estuvieran abiertos**, para cerrarse (hoy la app no
  los usa: en el bundle solo hay los cinco listeners de los tres dueños). No tocan los
  `focus` de R-1. En la app no se montan `Toaster` (sonner registra `visibilitychange`) ni el toast de Radix (registra
  `focus` y `blur`).
- **Dependencias de esos efectos.** Solo valores estables (los controladores, refs, las acciones del store) o la
  clave de instancias en ejecución del uso en vivo. Un efecto que se vuelve a ejecutar vuelve a registrar su
  listener al final de la cola, y eso puede invertir el orden de `focus`.
- **Los controladores se crean una sola vez** (`useRef` perezoso) encima del router: navegar no los recrea.
- `localStorage` solo guarda las preferencias de apariencia (`code-ai-profiles:appearance`: `theme`,
  `sessionTextSize` y, desde la HU-0016, `sidebar`), validadas campo a campo al leerlas. La app no usa cookies. El
  `sidebar.tsx` del catálogo no escribe `sidebar_state` ni registra Cmd/Ctrl+B.
- **El tema va en `<html>`** (HU-0016). `AppearanceProvider` aplica `theme-dark`/`theme-light` y `data-text-size`
  (HU-0019; antes `data-session-text`; el campo guardado sigue siendo `sessionTextSize`) sobre `document.documentElement` con `useLayoutEffect`, y así los portales de Radix (menús, diálogos, tooltips),
  que cuelgan de `body`, lo heredan. La plataforma no va en el DOM como gancho de CSS: los componentes que cambian
  por plataforma (`AppShell`, `Titlebar`) leen `useRuntimePlatform()` y eligen sus clases. La raíz conserva la clase
  `platform-*` solo como marca para inspeccionar.

## Router

- React Router 7 en modo datos: `createHashRouter` (`react-router`) y `RouterProvider` (`react-router/dom`). Va con hash
  porque en Tauri no hay servidor que resuelva rutas profundas al recargar. Funciona igual en
  `tauri://localhost` y en `http://tauri.localhost`.
- `/` es una ruta de layout (`AppShell`). La titlebar, el sidebar, `FeedbackArea`, el statusbar y `DialogHost`
  persisten, y `<Outlet />` pinta la pantalla dentro de `SidebarInset`, en su zona con scroll.
- Rutas (HU-0016): la índice es el dashboard (no diferida), y `original`, `instancias/:instanceId` y
  `configuracion/:section?` (HU-0022) van con `lazy`. Sin sección, o con una desconocida, Configuración redirige a
  `/configuracion/apariencia`. Sus pestañas (`Tabs`) están controladas por la ruta y navegan con `replace`.
  `*` redirige a `/` con `<Navigate replace />`. La raíz lleva `hydrateFallbackElement` para arrancar en una ruta
  diferida.
- Una página de algo que no existe vuelve a `/` con `<Navigate replace />`, pero **solo cuando `loading` es falso**.
  Mientras carga, muestra un esqueleto. Así se cubren un id desconocido, el borrado desde la propia página y la
  desaparición en un refresco.
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

1. Crea `src/app/routes/<pantalla>/<Pantalla>Route.tsx`. Pinta su contenido con utilidades y el catálogo; el
   scroll, el error, el aviso y el escaneo ya los da el layout. Si se navega a ella desde el sidebar, su entrada
   va en `app/layout/AppSidebar.tsx`.
2. Añade la ruta diferida en `app/router.tsx`, como hija de `/`:

   ```tsx
   { path: "configuracion/:section?", lazy: () => import("./routes/settings/SettingsRoute").then(({ SettingsRoute }) => ({ Component: SettingsRoute })) }
   ```

3. Navega con `<Link to="/configuracion">` o `useNavigate()`. Si la entrada del sidebar debe quedar activa en sus
   subrutas, usa `useMatch("/<ruta>/*")` y `aria-current="page"`. Los datos salen de los hooks de las features; si la
   pantalla necesita datos nuevos de Rust, se piden a backend como función de `bridge.ts`.
4. Sin CSS propio: utilidades y componentes del catálogo (§ Estilos).

### Añadir una feature

1. Crea `src/features/<feature>/` con sus componentes, hooks, `.ts` puros, tipos e `index.ts` (solo lo que
   otros necesitan).
2. Si tiene estado compartido: `<feature>-context.ts` (contexto + `use<Feature>`) y `<Feature>Provider.tsx`,
   montado en `app/providers/AppProviders.tsx`. Si tiene efectos que viven lo que la app, un
   `use<Feature>Runtime` llamado desde `DashboardRuntime`, al final del orden salvo que dependa de otro.
3. Su lógica pura, con su prueba en `tests/<area>.test.ts`, su script `test:<area>` en `package.json`, su paso
   en `.github/workflows/validate.yml` y su entrada en `stack.comandos` de `.metodo/config.json`.
4. Sin `.css` propio: utilidades de Tailwind y componentes de `components/ui`. Un color, radio o fuente que falte
   es un token en `styles/ui-theme.css` (§ Estilos), no un valor suelto.

## Estilos

Lo que rige desde la HU-0016, con los pasos y la convivencia en `hu/HU-0016-…/arquitectura.md` § CSS.

- `src/styles/index.css` es la **única** entrada de CSS de la app y la única que importa `tailwindcss` (con
  `source(none)` y `@source` de `app`, `features`, `components` y `hooks`). Ningún `.ts`/`.tsx` importa CSS salvo
  las dos entradas: `main.tsx` (fuentes e `index.css`) y `showcase/main.tsx`.
- Orden: preflight y Tailwind; `tokens.css` en `layer(base)` (después del preflight y por debajo de las
  utilidades); `ui-theme.css`; y un `@layer base` con el borde y el anillo por defecto, el `color-scheme` de cada tema
  y `prefers-reduced-motion`. **`body` no lleva fondo**: en Windows la ventana es transparente con esquinas
  redondeadas, y el fondo lo pinta la raíz del shell.
- Tokens (`styles/tokens.css`): oscuros en `:root, .theme-dark` (una muestra `.theme-dark` dentro del tema claro
  también los toma), claros en `.theme-light` (detrás) y la escala tipográfica en `:root[data-text-size=…]` (§ Escala). El puente a shadcn,
  en `ui-theme.css` (§ Design system). Lo que el aspecto de la app necesita y no es token de shadcn va como `--ui-*`
  (por ejemplo, el degradado, el borde y la sombra de la ventana).
- **Una sola barra de 52 px** (HU-0019): `--titlebar-height: 52px` en las tres plataformas. No hay franja a todo el
  ancho. Arriba a la izquierda, `Titlebar` (absoluta, sobre la columna del sidebar), con el hueco de la plataforma y
  el botón de plegar. Arriba a la derecha, la fila 1 de `SidebarInset`: el `PageHeader` de cada ruta, con «Sección ›
  Página» y sus acciones, a la altura de la barra. Sin portal: la rejilla lo pone en su sitio. Las zonas sin
  controles de las dos llevan `data-tauri-drag-region`, en cada elemento, porque el atributo no se hereda.
- Plataformas (`AppShell`, `Titlebar` y `PageHeader`, con `useRuntimePlatform()`):
  - **macOS**: hueco de 84 px a la izquierda para los semáforos nativos (`x:20, y:19` en `tauri.macos.conf.json`).
    Con el sidebar plegado, `PageHeader` lleva `pl-[68px]`.
  - **Windows**: pinta sus tres controles arriba a la derecha, y `PageHeader` reserva 160 px. Marco con esquinas de
    20 px, borde y sombra.
  - **Linux**: decoraciones nativas, sin controles en la barra; hueco de 16 px.
  - Cambiar la altura de la barra obliga a mover `trafficLightPosition` (es de backend o del orquestador).
- **Sidebar flotante** (HU-0019): `Sidebar variant="floating"` del catálogo, con `--sidebar-width: 256px` (panel de
  240 + 8 de margen) y `--sidebar: var(--surface-raised)`. La marca va en la cabecera del panel.
- Los elementos estructurales se marcan con `data-slot` (`desktop-shell` en la raíz, `sidebar-wrapper` del catálogo
  en el marco), no con clases propias.
- El sidebar del catálogo es `position: fixed`. El marco (`SidebarProvider`) lleva `transform: translateZ(0)` y
  `overflow-hidden` para que quede dentro de la ventana y lo recorten sus esquinas. `AppSidebar` lo baja con
  `top-(--titlebar-height)! h-auto!`. Los diálogos se pintan en `body`, fuera del marco: su velo cubre la ventana
  entera, también las esquinas transparentes de Windows, como antes.
- **Escala tipográfica** (HU-0019; sin factor desde la HU-0022). El ajuste de Apariencia escala toda la interfaz:
  - **Tokens.** `tokens.css` declara, en `:root` (normal) y en `:root[data-text-size="compact"|"large"]`, siete
    `--fs-*`, ocho interlineados `--lh-*` (`micro`, `small`, `prose`, `body`, `heading`, `title`, `figure`,
    `dialog`) y cinco alturas `--ctl`, `--ctl-sm`, `--ctl-lg`, `--ctl-xs` y `--ctl-badge`, todos en px enteros. Los
    `--lh-*` y los `--ctl*` son múltiplos de 4. `--esc` ya no existe: daba alturas fuera de la retícula (33,5 y
    41,1). Los valores están en `DESIGN.md` y en `hu/HU-0022-…/arquitectura.md` § A-1.2.
  - **Mínimo de 11 px.** Ningún `--fs-*` baja de 11; en Grande cada uno es mayor que en normal, y `--lh-*` y `--ctl*`
    nunca menguan al crecer el tamaño. Lo vigila la prueba 12 de `test:ui` (AC-04 de la HU-0019).
  - **El catálogo.** `ui-theme.css` engancha la escala de Tailwind con su interlineado: `text-xs` → `--fs-small` /
    `--lh-small`, `text-sm` → body, `text-base` → heading, `text-lg` → title, `text-xl` → figure y `text-2xl` →
    dialog (`--text-<n>--line-height`). `button`, `input`, `badge`, `kbd`, `tabs` y el `SidebarMenuButton` toman su
    alto de `--ctl*`. Iconos y avatares no escalan.
  - **En la app**, un texto se escribe **siempre** `text-(length:--fs-<x>)/(--lh-<y>)`, con el `/` obligatorio.
    `leading-(--lh-<y>)` sirve donde el tamaño viene del catálogo. Están prohibidos `leading-none|tight|snug|normal|
    relaxed|loose|[n]`. Una utilidad con nombre propio (`text-micro`) no sirve: `cn` la toma por un color y la borra.
    Tampoco se usa `text-[<n>px]`; la excepción son las tres muestras de `AppearanceSettings`. `--session-*` ya no
    existe.
- **Sistema armónico** (HU-0022, A-1; la referencia es `DESIGN.md` § «Cómo se aplica»):
  - **Espaciado** solo con los pasos `0, 1, 2, 3, 4, 6, 8, 12` de Tailwind (de 0 a 48 px). Las únicas medidas de
    espaciado en px son los huecos de controles nativos: `pl-[84px]` en `Titlebar` y `pr-[160px]`/`pl-[68px]` en
    `PageHeader`. Las alturas y anchos arbitrarios son múltiplos de 4.
  - **Radios** `rounded-xs` 4, `sm` 8, `md` 12, `lg`/`xl` 16, `2xl` 20 y `3xl` 24. No se usa `rounded-4xl`. Regla
    de anidado: un hijo de todo el ancho lleva `max(8, R − p)`. Las entradas de la app van a 8, como en la maqueta.
  - **Foco**: `focus-visible:ring-2 ring-ring` (o `outline-2 outline-ring`), con `--ring` = `--ui-primary-text` y sin
    `/50`.
  - **Primario**: texto `--ui-on-primary: #151615`, literal en los tres selectores (6,0:1). El hover aclara con
    `color-mix` hacia blanco.
  - **Bordes que mueven la retícula**: se sustituyen por `ring-1 ring-inset` o `shadow-[inset_…]`.
  - Lo vigilan las pruebas 15 (la escala, en la app y en los componentes del catálogo que importa) y 16 (contraste de
    los pares sólidos). Excepción aceptada: interlineado a 2 px de la retícula en el botón `sm` en Compacto y en el
    título de la barra en Grande (revisión técnica de la HU-0022, R-4).
  - **`--quiet` no colorea texto**: no llega a 4,5:1. El texto secundario es `text-muted-foreground`, y `--quiet`
    queda para puntos y separadores.
- Diálogos: el aspecto común (radio 24, relleno 24, ancho 576, título `--fs-dialog`/`--lh-dialog`, 22/28 px en normal; HU-0022) está en `components/ui/dialog.tsx` y
  `alert-dialog.tsx`, con `closeDisabled` en `DialogContent` (ver sus fichas). Confirmar es un `Button`, no
  `AlertDialogAction`, para que el diálogo siga abierto mientras la operación marca `busy`. Un `AlertDialog` no se
  cierra con el clic fuera.
- **Base de navegadores** (HU-0016 P-1). Tailwind 4 necesita capas en cascada y `color-mix`, es decir, WebKit de
  Safari 16.4 o posterior. Por eso macOS pide **13.3 o posterior** (`minimumSystemVersion` en
  `src-tauri/tauri.conf.json`, que trae Safari 16.4). Linux pide **WebKitGTK 2.40 o posterior** (en Ubuntu 22.04, el de
  `jammy-updates`; el `.deb` usa el del sistema). Windows usa WebView2. `main.tsx` comprueba el motor antes de pintar
  (`lib/webview-support.ts`) y, si no basta, muestra un aviso con estilos en línea. En la práctica, solo puede saltar
  en Linux. Bajar cualquiera de estos mínimos exige otra decisión.

## Pruebas

- `node --test` sobre los `.ts` puros. Importan con la extensión `.ts`, usan solo sintaxis borrable y
  sus imports relativos son solo `import type`. Las pruebas importan el archivo del módulo, nunca el
  `index.ts` de la feature.
- Scripts: `test:scan`, `test:update` (controladores), `test:format`, `test:appearance`, `test:dashboard`,
  `test:messages`, `test:permissions` (HU-0022: el catálogo de permisos por plataforma, sus estados y que no lleve
  URLs) y `test:ui`. `test:ui` revisa las fronteras de la UI y quién registra `focus`, `blur` y
  `visibilitychange` (R-1), leyendo los archivos con `node:fs`. Desde HU-0019 vigila también:
  - la escala (prueba 12): el mínimo de 11 px, que grande sea mayor que normal, los `--lh-*` y `--ctl*` en la retícula,
    sin `--esc`, el puente `--text-*` con su interlineado, y que existan los `--fs-*` y `--lh-*` que se usan;
  - desde la HU-0022, la escala armónica (prueba 15) y el contraste de los pares sólidos en los dos temas (prueba 16);
  - que no haya tamaños sueltos (`text-[<n>px|rem|em]` en `app/`, `features/` y `components/`, salvo las tres muestras
    de Apariencia; en `components/ui/`, solo se vigilan los `px`, porque `calendar` y `questionnaire` miden en `rem` y
    la app no los usa; el showcase queda fuera), ni restos de `--session-*` o `data-session-text`;
  - que no haya texto en `--quiet` (`text-(--quiet)`).
  - Lo que no ve: utilidades con nombre propio (`text-micro`), `text-[length:…]`, `[font-size:…]` y tokens `--fs-*`
    redefinidos fuera de `tokens.css` (HU-0019, revisión técnica R-3).
- El showcase y el aspecto de los componentes se revisan a mano en `http://127.0.0.1:1420/showcase.html`, en oscuro
  y en claro.
- Los hooks, los componentes, los temas (también en menús, diálogos y tooltips), las plataformas y la ventana mínima
  (980×680) se verifican con la app abierta (`pnpm dev` con el mock, `pnpm tauri dev` en escritorio). El mock siempre
  dice macOS: Windows y Linux se comprueban con los instaladores.

## Design system (HU-0014)

El catálogo de shadcn/ui (estilo `radix-vega`, CLI `shadcn` fijada como devDependency) vive en `src/components/ui/`.
Cómo usar cada componente, en la skill `code-ai-profiles-ui`. El detalle de las decisiones, en
`hu/HU-0014-…/arquitectura.md`.

- **Tailwind 4 se carga siempre** (HU-0016). Hay dos entradas: `src/styles/index.css` (la app) y
  `src/showcase/showcase.css` (el showcase), cada una con `source(none)` y sus `@source`. El build minifica con los
  `targets` fijos de Tailwind (Safari 16.4, Chrome 111, Firefox 128).
- **Peso** (medido en HU-0016, un solo chunk de entrada): CSS 57,6 → 214,5 kB (31,8 kB gzip) y JS 383 → 573 kB
  (181 kB gzip), con el aviso de Vite por un chunk de más de 500 kB. El CSS crece porque `@source "../components"`
  genera las clases de los 63 componentes, aunque la app usa 18. El JS crece por las primitivas de Radix (dialog,
  alert-dialog, tooltip con floating-ui, checkbox, radio-group, progress) y por lucide. No llegan al bundle recharts,
  shiki, date-fns, @base-ui, cmdk, vaul ni embla. Se carga del disco local, así que no se nota al arrancar. Si
  importara, hay dos palancas: excluir del `@source` lo que la app no usa y diferir los diálogos.
- **`vite build` solo empaqueta `index.html`** porque no hay `build.rollupOptions.input`. Si algún día se declara,
  `showcase.html` no entra en él.
- **En `pnpm dev` (y `pnpm tauri dev`) el optimizador de dependencias recorre todos los `*.html` de la raíz**, también
  `showcase.html`: preempaqueta las dependencias del catálogo (radix-ui, recharts, shiki…) aunque solo se abra la app.
  El arranque en frío es más lento, pero la app no las carga. Si al abrir el showcase Vite descubre una dependencia
  nueva, vuelve a optimizar y recarga todas las pestañas, también la ventana de Tauri.
- **El alias `@` → `"/src"`** es una ruta relativa a la raíz de Vite, no una ruta del sistema. Vite la resuelve con
  `path.resolve(root, "src/…")` en `serve` y en `build`, también en Windows. Solo la entienden Vite y `tsc` (`paths`).
  Una herramienta que no sea Vite y necesite `@/` usaría `fileURLToPath(new URL("./src", import.meta.url))`.
- **El showcase** es `showcase.html` (`http://127.0.0.1:1420/showcase.html`). Carga `styles/tokens.css` con
  `layer(base)`, igual que la app, y el tema en `<html>`. Sigue fuera de `dist/`.
- **El tema** (`styles/ui-theme.css`): las variables de shadcn apuntan a los tokens de la app y se declaran en
  `:root, .theme-dark, .theme-light`, para que se vuelvan a resolver donde esté la clase de tema. `--primary` y
  `--muted` **no se redeclaran**, porque son tokens de la app (en la app, `--muted` es un color de texto). Las
  utilidades `*-muted` leen `--surface-soft`, y `*-primary` lee `--primary-bright`. Lo que la app no tiene como token
  va como `--ui-*`, con el valor del que sale (desde la HU-0016, el del CSS heredado que ya no existe). La variante
  `dark:` es `.theme-dark`.
- **Adoptado en la app** por la HU-0016. Ahí se decidieron la base de navegadores (P-1), el tema en `<html>`, el
  preflight y el `sidebar.tsx` sin cookie ni atajo (ver sus fichas, en «Diferencias con el registro»).
