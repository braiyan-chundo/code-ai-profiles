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
    layout/             AppShell (SidebarProvider), Titlebar, AppSidebar, FeedbackArea, Statusbar, DialogHost, window-actions.ts
    routes/<pantalla>/  un componente de ruta y las piezas que solo usa esa pantalla
  features/<feature>/   componentes, hooks, lógica pura y tipos de una funcionalidad (sin CSS desde la HU-0016)
    index.ts            su API pública
  components/           piezas compartidas sin dominio: BrandMark (la marca) y EmptyState
    ui/                 (HU-0014) el catálogo shadcn/ui (radix-vega): código propio desde su descarga
  hooks/                (HU-0014) hooks genéricos del registro: use-mobile, use-highlighted-code (+ highlighter.tsx)
  lib/                  sin React: bridge, controladores, formato, errores, plataforma
    utils.ts            (HU-0014) cn(), reexportado del paquete `cn`
  styles/               index.css (la entrada de Tailwind de la app), tokens.css (tokens oscuros, claros y de
                        densidad) y ui-theme.css (el puente de las variables de shadcn a los tokens)
  showcase/             (HU-0014) la otra entrada de Vite: main.tsx, showcase.css (la única entrada de
                        Tailwind), Showcase.tsx, catalog.ts y sections/<componente>.tsx
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
| `appearance` | Preferencias (tema, tamaño de texto y sidebar plegado), su proveedor (que aplica el tema en `<html>`) y su diálogo |

Las pantallas (HU-0016) son `app/routes/dashboard/` (`#/`), `app/routes/original/` (`#/original`) y
`app/routes/instance/` (`#/instancias/:instanceId`). La búsqueda vive en el sidebar.

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
- El alias `@/` → `src/` existe desde la HU-0014 (`tsconfig.json` `paths` y `vite.config.ts`). Lo usan
  `components/ui`, `hooks` y `showcase`. El código nuevo puede usarlo para cruzar carpetas. Lo existente no se
  reescribe por eso. **Excepción:** un módulo que se prueba con `node --test` usa solo imports relativos, porque
  Node no resuelve `@/`.
- **La capa de UI genérica** (HU-0014): `components/ui → hooks → lib/utils.ts`. No conoce el dominio ni importa
  `features/`, `app/`, `lib/bridge.ts`, `types.ts` ni `@tauri-apps/*`. La app la usa (HU-0016) importando
  `@/components/ui/<id>`, `cn` de `@/lib/utils` y los iconos de `lucide-react`. `radix-ui` y `cva` solo aparecen
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
  archivo de `src/` registra `focus`, `blur` ni `visibilitychange` (lo vigila `test:ui`). Fuera de `DashboardRuntime`
  solo hay listeners de otro tipo:
  - `keydown` de Ctrl/⌘ F en `app/layout/AppSidebar.tsx`;
  - `change` de `prefers-color-scheme` en `AppearanceProvider`;
  - `change` del `matchMedia` de `hooks/use-mobile.ts`, que usa el sidebar.

  Escape lo gestiona cada diálogo de Radix (HU-0016). En las dependencias, Radix `Menu` (menús desplegables y
  contextuales) y `Select` registran `blur` en `window` **mientras están abiertos**, para cerrarse. No tocan los
  `focus` de R-1. En la app no se montan `Toaster` (sonner registra `visibilitychange`) ni el toast de Radix (registra
  `focus` y `blur`).
- **Dependencias de esos efectos.** Solo valores estables (los controladores, refs, las acciones del store) o la
  clave de instancias en ejecución del uso en vivo. Un efecto que se vuelve a ejecutar vuelve a registrar su
  listener al final de la cola, y eso puede invertir el orden de `focus`.
- **Los controladores se crean una sola vez** (`useRef` perezoso) encima del router: navegar no los recrea.
- `localStorage` solo guarda las preferencias de apariencia (`code-ai-profiles:appearance`: `theme`,
  `sessionTextSize` y, desde la HU-0016, `sidebar`), validadas campo a campo al leerlas. La app no usa cookies. El
  `sidebar.tsx` del catálogo no escribe `sidebar_state` ni registra Cmd/Ctrl+B.
- **El tema va en `<html>`** (HU-0016). `AppearanceProvider` aplica `theme-dark`/`theme-light` y `data-session-text`
  sobre `document.documentElement` con `useLayoutEffect`, y así los portales de Radix (menús, diálogos, tooltips),
  que cuelgan de `body`, lo heredan. La plataforma va en la raíz del shell (`data-platform`).

## Router

- React Router 7 en modo datos: `createHashRouter` (`react-router`) y `RouterProvider` (`react-router/dom`). Va con hash
  porque en Tauri no hay servidor que resuelva rutas profundas al recargar. Funciona igual en
  `tauri://localhost` y en `http://tauri.localhost`.
- `/` es una ruta de layout (`AppShell`). La titlebar, el sidebar, `FeedbackArea`, el statusbar y `DialogHost`
  persisten, y `<Outlet />` pinta la pantalla dentro de `SidebarInset`, en su zona con scroll.
- Rutas (HU-0016): la índice es el dashboard (no diferida), y `original` e `instancias/:instanceId` van con `lazy`.
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
   { path: "ajustes", lazy: async () => ({ Component: (await import("./routes/settings/SettingsRoute")).SettingsRoute }) }
   ```

3. Navega con `<Link to="/ajustes">` o `useNavigate()`. Los datos salen de los hooks de las features; si la
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
- Tokens: oscuros en `:root`, claros en `.theme-light` (detrás) y densidad en `:root[data-session-text=…]`. El
  puente a shadcn, en `ui-theme.css` (§ Design system).
- Plataformas: la raíz del shell lleva `data-platform`, y las diferencias van con variantes (`in-data-[platform=…]:`).
  macOS reserva el semáforo nativo (`x:28, y:40` en `tauri.macos.conf.json`) con una titlebar de 94 px. Windows pinta
  sus controles arriba a la derecha y tiene esquinas de 20 px. Linux usa las decoraciones nativas.
- El sidebar del catálogo es `position: fixed`. La raíz del shell lleva `transform: translateZ(0)` para que quede
  dentro de la ventana, y el sidebar empieza debajo de la titlebar (`--titlebar-height`).
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
  `test:messages` y `test:ui`. `test:ui` revisa las fronteras de la UI y quién registra `focus`, `blur` y
  `visibilitychange` (R-1), leyendo los archivos con `node:fs`.
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
