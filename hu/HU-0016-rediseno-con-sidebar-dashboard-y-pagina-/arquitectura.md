# Arquitectura · HU-0016 · Rediseño con sidebar, dashboard y página por instancia

<!-- La escribe architect (2026-10-28). Base: docs/arquitectura/frontend.md (HU-0015 y HU-0014). Sin contrato IPC:
     no cambian src/types.ts, src/lib/bridge.ts ni el Rust de src-tauri/. Única línea en src-tauri/: O-1 (P-1). -->

## P-1 · Base de WebKit (resuelta)

Con Tailwind 4 dentro de la app, la interfaz pasa a necesitar un WebKit de **Safari 16.4 o posterior** (como mínimo,
16.2). Hoy la app funciona con WebKit más antiguos.

**Decisión del mantenedor (2026-10-28): opción (b), «Subir macOS a 13.3».** Las alternativas eran (a) mantener
macOS 12.0 con un aviso de motor y (c) no cargar Tailwind.

Evidencia (compilado en local con el Tailwind 4.3.3 del repo, sobre `src/showcase/showcase.css` y el catálogo):

1. **Todo** lo que genera Tailwind va dentro de `@layer`. Un motor sin capas en cascada (anterior a Safari 15.4 o
   WebKitGTK 2.36) descarta esos bloques enteros y la app se queda sin estilos. macOS 12.0 salió con Safari 15.1, y
   15.4 llegó con macOS 12.3.
2. Los modificadores de opacidad sobre colores del tema (`bg-destructive/10`, `ring-ring/50`…) solo tienen una
   alternativa **opaca** fuera de `@supports (color: color-mix(...))`. `color-mix` existe desde Safari 16.2. El botón
   `destructive` del catálogo (`button.tsx:18`, `bg-destructive/10 text-destructive`) quedaría con el texto del mismo
   color que el fondo, es decir, invisible. Hay 94 reglas así en el CSS del catálogo.
3. `@property` sí tiene alternativa: un bloque `@supports` que detecta WebKit sin `margin-trim` (anterior a 16.4).
4. La minificación de Tailwind en el build (`@tailwindcss/node`, lightningcss) fija `targets` a Safari 16.4, Chrome 111
   y Firefox 128. No hay forma de rebajarlos: lightningcss no puede bajar `color-mix(var(...))` ni aplanar `@layer`.

Dónde se nota:

- **macOS 12**: WKWebView usa el WebKit del Safari instalado. Monterey admite Safari hasta la 17.6, así que un Monterey
  con Safari al día funciona y uno sin actualizar, no.
- **Ubuntu 22.04**: salió con WebKitGTK 2.36. `jammy-updates` trae versiones mucho más recientes (2.4x). El `.deb` usa
  la del sistema. El AppImage empaqueta la del runner.
- **Windows**: WebView2 es Chromium evergreen, así que no hay problema.

### Qué se hace con (b)

| | Qué | Quién y dónde |
| --- | --- | --- |
| O-1 | `src-tauri/tauri.conf.json` → `bundle.macOS.minimumSystemVersion`: `"12.0"` → `"13.3"`. Es **la única** que fija la versión: `tauri.macos.conf.json` no la redefine y no hay `MACOSX_DEPLOYMENT_TARGET` en el repo. macOS 13.3 trae Safari 16.4. Tauri escribe el valor en `LSMinimumSystemVersion` del `Info.plist` y lo usa como *deployment target* al compilar. **No hay brief de backend**: es una línea de configuración, sin Rust ni IPC. La hace el **orquestador** en su propio commit (`HU: HU-0016`), antes de despachar E1. Verificación: `cargo test --manifest-path src-tauri/Cargo.toml` (no debe cambiar nada) y, en el Mac, `pnpm build:macos` con `plutil -p "src-tauri/target/release/bundle/macos/Code AI Profiles.app/Contents/Info.plist" \| grep LSMinimumSystemVersion` → `13.3`. El job de macOS de `build-desktop.yml` (runner `macos-14`) no cambia | orquestador |
| O-2 | `README.md` § Plataformas: una columna o nota de mínimos. macOS **13.3 o posterior** (Apple Silicon). Windows x64 con WebView2 (sin cambios). Linux x64/ARM64 con **WebKitGTK 2.40 o posterior**: en Ubuntu 22.04, el de `jammy-updates` (`sudo apt upgrade libwebkit2gtk-4.1-0`), porque el 2.36 con que salió no basta. El `.AppImage` lleva el WebKitGTK del runner, pero el `.deb` usa el del sistema. Se añade una línea en «Desarrollo local → Linux» que pide lo mismo | orquestador, en el mismo commit que O-1 |
| O-3 | `CHANGELOG.md` `[Unreleased]` → `### Changed`: «macOS 13.3 o posterior (antes 12.0) y WebKitGTK 2.40 o posterior en Linux, por la interfaz con Tailwind 4». Además, la entrada propia del rediseño, al cerrar | orquestador (O-1 y cierre) |
| A-16 | **El aviso de motor se mantiene**, pero ya no protege macOS (13.3 garantiza Safari 16.4) ni Windows (WebView2). Protege **Linux**: un `.deb` en una 22.04 sin actualizar o en otra distribución con WebKitGTK antiguo se quedaría sin estilos. `src/main.tsx` comprueba `typeof CSSLayerBlockRule !== "undefined"` y `CSS.supports("color", "color-mix(in srgb, red, red)")` antes de pintar. Si falla, pinta un aviso con estilos en línea y sin Tailwind («El motor web del sistema no es compatible con esta versión. En Linux, actualiza `libwebkit2gtk-4.1-0` a 2.40 o posterior»), sin enlaces ni red. La comprobación es una función pura en `src/lib/webview-support.ts` (recibe `CSS` y el constructor de la regla), con su prueba en `tests/format.test.ts` | frontend, paso 1 |

Revisado, y **no cambia**:

- `build-desktop.yml`: los runners son `macos-14`, `ubuntu-22.04` y `ubuntu-22.04-arm`, y no fijan versión mínima.
- `validate.yml`.
- `tauri.macos.conf.json` y `tauri.linux.conf.json`.
- `docs/*.document.md`: ninguno menciona la versión de macOS.
- Las historias anteriores (HU-0014 R-6): no se reescriben.

Queda como **opción sin decidir** (no entra en esta historia): declarar en el `.deb` `libwebkit2gtk-4.1-0 (>= 2.40)`
con `bundle.linux.deb.depends`. Así apt actualizaría o se negaría a instalar, en lugar de depender del aviso. Es
configuración de `src-tauri/` y la decide el mantenedor.

## Análisis

Confianza: alta en la estructura (rutas, estado, efectos, pruebas) y media en el aspecto, que se decide al probar
(no hay dial de diseño). Leído: `hu.md`, `docs/arquitectura/frontend.md`, la arquitectura y la revisión de HU-0014,
la revisión de HU-0015, `DESIGN.md`, `src/app/**`, `src/features/**/*.tsx|ts`, `src/components/*`, `src/styles/*`,
`src/components/ui/{sidebar,button,tooltip}.tsx`, `src/hooks/use-mobile.ts`, `vite.config.ts`, `src-tauri/tauri*.json`,
`capabilities/default.json`, `tests/ui-isolation.test.ts`, `validate.yml`, la ficha `sidebar.md` y
`.metodo/reglas/frontend.md`. Grafo: `graphify query "sidebar dashboard instancias rutas panel tarjetas tema tailwind"`.
También busqué en `node_modules`, con `rg`, los listeners de `window` de Radix y sonner.

### Supuestos

- **S-1** · Tailwind resuelve los `@import` de su entrada en el orden en que aparecen. Igualmente, todos los `@import`
  van **antes** de cualquier regla, como exige CSS.
- **S-2** · La CSS sin capa gana a toda la CSS con capa, sea cual sea su especificidad. En eso se basa la convivencia
  de los pasos 1 a 6: el CSS heredado, sin capa, se impone a Tailwind en sus propias clases.
- **S-3** · Los IDs de instancia son UUID v4 (`src-tauri/src/lib.rs:841`), así que `#/instancias/<id>` no expone
  nada del perfil.

### Impacto

- **Rust, IPC, `types.ts`, `bridge.ts` y capacidades**: nada. En `tauri*.json`, solo O-1 (una línea, la hace el orquestador).
- **Dependencias**: ninguna nueva. Tailwind, `tw-animate-css`, `shadcn` (dev), `radix-ui` y `lucide-react` ya
  están instalados. Lo que cambia es que el build las usa: Tailwind en `vite build` y el catálogo en el bundle.
- **Plataformas**:
  - macOS: los semáforos nativos están en `x:28, y:40` (`tauri.macos.conf.json`) y obligan a reservar la esquina
    superior izquierda.
  - Windows: ventana transparente sin decoraciones, controles propios a la derecha y esquinas de 20 px.
  - Linux: decoraciones nativas.
  - P-1: macOS sube a 13.3 (O-1) y Linux necesita WebKitGTK 2.40 o posterior (O-2, A-16).
- **Privacidad**: la URL solo lleva el UUID. No hay cookies (D-2) ni red. `localStorage` usa la misma clave, con un
  campo más. Los títulos de sesión se muestran igual que hoy.
- **Migraciones**: `code-ai-profiles:appearance` gana `sidebar`. Se valida campo a campo, y una versión anterior lo ignora.
- **Regresiones posibles**:
  1. R-1 de HU-0015, es decir, que algo registre `focus` fuera de su turno.
  2. El preflight sobre el CSS heredado mientras convive.
  3. Los portales sin tema.
  4. Escape y cierre de diálogos durante `busy`.
  5. Las esquinas transparentes de Windows.
  6. El sidebar `fixed` fuera de la ventana redondeada.
  7. Perder una acción, un atajo o un aviso (inventario en § AC-06).
  8. P-1: un usuario de macOS 12 deja de poder instalar la versión nueva (decisión del mantenedor).

## Solución

### Decisiones (A-n) y desvíos de las ★

| | Decisión | Respecto a la ★ |
| --- | --- | --- |
| A-1 | `vite.config.ts` carga `@tailwindcss/vite` **siempre** (import estático). `vite build` sigue empaquetando solo `index.html`, así que el showcase sigue fuera de `dist/`. | D-1 |
| A-2 | `src/styles/index.css` pasa a ser **la entrada de Tailwind de la app**, con preflight (ver § CSS). Durante los pasos 1 a 6, el CSS heredado se importa **sin capa** y gana en sus clases. Cada paso borra lo que deja sin uso, y el paso 7 retira todo. Lo heredado que se vea distinto por el preflight **no se retoca**, porque se va a borrar. Solo se corrige lo que impida usarlo, en `styles/legacy-compat.css` (capa `base`), que muere en el paso 7. | D-1, con convivencia **dentro** de la rama |
| A-3 | Tema en `<html>`: `AppearanceProvider` aplica con `useLayoutEffect` `theme-dark`/`theme-light` y `data-session-text` en `document.documentElement` (antes de pintar y sin destello), y lo limpia al desmontar. El shell deja de llevar `theme-*`. **`body` sigue transparente**: el fondo lo pinta la raíz del shell, porque en Windows la ventana es transparente con esquinas redondeadas. | D-4, ampliada al tamaño de texto (los diálogos se pintan en `body`) |
| A-4 | `sidebar.tsx` se edita (código propio): fuera la cookie `sidebar_state` y el `keydown` de Cmd/Ctrl+B, y textos en español (`Toggle Sidebar` y la cabecera `sr-only` del `Sheet`). `dialog.tsx` y `sheet.tsx`: `Close` → `Cerrar`. Cada cambio va en su ficha, en «Diferencias con el registro». El showcase pierde la cookie y el atajo también. | D-2 |
| A-5 | `SidebarProvider` controlado: `open = preferences.sidebar === "expanded"`, y `onOpenChange` escribe la preferencia. `AppearancePreferences` gana `sidebar: "expanded" \| "collapsed"` (por defecto `expanded`), validado en `loadAppearancePreferences`. | D-2 |
| A-6 | Disposición «barra superior a todo el ancho» (el patrón *sidebar-16* de shadcn): titlebar arriba, debajo el sidebar a la izquierda y `SidebarInset` (contenido y statusbar) a la derecha. La raíz lleva `transform: translateZ(0)` para que el `position: fixed` del sidebar quede **dentro** de la ventana (las esquinas de Windows lo recortan). El contenedor del sidebar lleva `top-(--titlebar-height)` y `bottom-0` (con `!` si `cn` no basta). Así los semáforos de macOS y los controles de Windows siguen en la titlebar, esté el sidebar plegado o no. | Precisa D-2 |
| A-7 | `--titlebar-height`: 94 px en macOS (el semáforo está fijo en `y:40` y no se toca Tauri), con 106 px de reserva a la izquierda. En Windows y Linux, 64 px. Los controles de Windows se mantienen arriba a la derecha (46×36, el de cerrar en rojo al pasar el ratón), con un margen derecho en las acciones. Linux no pinta controles. | Mantiene AC-05 |
| A-8 | Rutas: `index` → `DashboardRoute` (no diferida: es la primera pantalla); `original` y `instancias/:instanceId` con `lazy`; `*` → `<Navigate to="/" replace />`. La raíz lleva `hydrateFallbackElement` (un `div` del color de fondo) para el arranque en una ruta diferida. | D-3 |
| A-9 | `InstanceRoute`: si el id no está en `dashboard.instances`, muestra un esqueleto mientras `loading` y, si no, `<Navigate to="/" replace />`. Cubre el id desconocido, el borrado desde la página y la desaparición en un refresco. `#/original` sin aplicación detectada muestra un estado vacío con «Escanear sistema», no redirige. | Precisa D-3 |
| A-10 | El error, el aviso y el progreso o resultado del escaneo pasan al **layout**, encima del `<Outlet />`: una acción lanzada desde una página o el escaneo lanzado desde el sidebar tienen que verse donde estés. El aviso de actualización oficial y el de sincronización van en el dashboard, y el oficial también en `#/original`. | Amplía AC-02 sin perder nada |
| A-11 | Búsqueda: `SidebarInput` en la cabecera del sidebar filtra las entradas con `filterInstances` y `matchesOriginalApp` (sin cambios). Ctrl/⌘ F la enfoca (despliega antes el sidebar si está plegado). El `keydown` se mueve de `Toolbar.tsx` al sidebar. Sin coincidencias muestra «Sin coincidencias» y «Limpiar búsqueda». | Conserva el atajo (AC-06) |
| A-12 | Diálogos con `Dialog`/`AlertDialog` del catálogo, montados con la misma condición que hoy en `DialogHost`. Escape, la X y el clic fuera llaman a **la misma** función guardada por `busy` que ya usa cada diálogo (`busy ? noop : onClose`). Se elimina el `keydown` de Escape de `DialogsProvider`. Diferencias declaradas: (1) Escape cierra solo el diálogo de encima; (2) el editor y el de borrar ya no se cierran con Escape mientras su operación corre, igual que con la X. | D-3 (siguen siendo diálogos) |
| A-13 | Sin `Toaster` ni toast de Radix en la app: sonner registra `visibilitychange` y el toast de Radix, `focus` y `blur`. Los avisos siguen en línea (`Alert`). | Protege R-1 |
| A-14 | Iconos: lucide en todo. `CloudIcon` pasa a `components/BrandMark.tsx` (la marca y el icono por defecto de una instancia) y `Icons.tsx` se borra. El icono personalizado sigue con `managedIconSource`. | D-5 |
| A-15 | Dashboard: Instancias, En marcha, Sesiones Code y versión de la aplicación original (las cifras de la toolbar actual, para no perderlas), almacenamiento (administrado y libre), uso por instancia ordenado (`usageRanking`), avisos y los accesos «Nueva instancia» y «Escanear sistema». Sin búsqueda: el resumen es global. | D-6, más las cifras de la toolbar (AC-06) |

### Estructura resultante

```text
src/app/
  router.tsx                      A-8
  layout/AppShell.tsx             SidebarProvider > [Titlebar] + [AppSidebar | SidebarInset(FeedbackArea, Outlet, Statusbar)] + DialogHost
  layout/AppSidebar.tsx           NUEVO · búsqueda (A-11), General (Dashboard, Aplicación original), Instancias (+ Nueva), pie (Escanear, Apariencia)
  layout/FeedbackArea.tsx         NUEVO · ScanProgressPanel + FeedbackBanners (A-10)
  layout/Titlebar.tsx, Statusbar.tsx, DialogHost.tsx, window-actions.ts   se rehacen las dos primeras; DialogHost cambia lo mínimo
  routes/dashboard/DashboardRoute.tsx (+ piezas)    NUEVO
  routes/original/OriginalRoute.tsx                 NUEVO (lazy)
  routes/instance/InstanceRoute.tsx                 NUEVO (lazy)
  routes/panel/                                     SE BORRA (paso 5)
src/features/
  instances/InstanceAvatar.tsx    NUEVO · icono propio o BrandMark + punto de estado (sidebar, dashboard, página)
  instances/InstanceDetail.tsx    NUEVO · cabecera, acciones, uso, sesiones (sustituye InstanceCard)
  original-app/OriginalDetail.tsx NUEVO · sustituye OriginalAppSection
  sessions/SessionList.tsx        NUEVO · la lista que hoy está duplicada en InstanceCard y OriginalAppSection
  dashboard/dashboard-selectors.ts   + usageRanking(instances), + findInstance(instances, id)
  appearance/appearance-preferences.ts  + sidebar (A-5)
src/components/BrandMark.tsx      NUEVO (A-14); EmptyState.tsx rehecho con `empty`
src/styles/index.css · tokens.css (paso 7) · ui-theme.css
```

Se conserva la **lógica** sin tocarla:

- `dashboard-store`, `DashboardProvider`, contextos, `useInitialLoad` y `useRuntimePlatform`;
- `useScanRuntime`/`useScanLifecycle`/`useBackgroundRefresh`;
- `useSourceUpdate*`, `useUpdateActions` y `update-messages`;
- `useInstanceActions`, `useLiveUsage`, `live-usage`, `instance-icon` e `icon-validation`;
- `session-format`, `session-messages`, `useSessionActions` y `useTransferProfiles`;
- `DashboardRuntime`, `DialogsProvider` (salvo Escape, A-12) y `dialogs-context`.

Se rehace solo la vista: banners, medidores, `ScanProgressPanel`, los 7 diálogos, `AppearanceDialog`, `EmptyState`.

### Componentes del catálogo por pantalla (orientativo; las fichas de `code-ai-profiles-ui` mandan)

| Pantalla | Componentes |
| --- | --- |
| Shell | `sidebar` (`collapsible="icon"`, `variant="sidebar"`, ancho 260 px de DESIGN), `tooltip` (un `TooltipProvider` en `AppShell`), `button`, `kbd`, `separator`, `badge` |
| Dashboard | `card`, `progress`, `item` o `table` para el ranking, `alert` (avisos), `button`, `skeleton`, `empty` |
| Instancia / original | `card`, `badge` (estado, «Actualización disponible», icono, Archivada/Movida/Copia), `progress` (uso y contexto), `button`, `tooltip`, `item` (filas de sesión), `empty`, `skeleton` |
| Diálogos | `dialog`, `alert-dialog` (borrar, desvincular), `field`, `input`, `radio-group` o `toggle-group` (modo y destino de la transferencia, tema), `checkbox`/`switch` (artefactos locales), `button`, `spinner` |

### CSS

Pasos 1 a 6 (`src/styles/index.css`). Todos los `@import` van primero:

```css
@import "tailwindcss" source(none);
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@import "./base.css" layer(base);          /* tokens y reseteos: después del preflight, debajo de las utilidades */
@import "./legacy-compat.css" layer(base); /* solo si hace falta (A-2); se borra en el paso 7 */
@import "./ui-theme.css";
/* Legado sin capa (A-2): los mismos @import de hoy y en el mismo orden, desde shell.css hasta responsive.css. */
@source "../app";
@source "../features";
@source "../components";
@source "../hooks";
@layer base {
  * { @apply border-border outline-ring/50; }
  body { @apply text-foreground; }          /* sin fondo (A-3) */
  .theme-dark { color-scheme: dark; }
  .theme-light { color-scheme: light; }
}
```

En el paso 7 queda `@import "./tokens.css" layer(base)` en lugar de `base.css` y `legacy-compat.css`, sin legado.
`tokens.css` reúne:

- los tokens oscuros en `:root`;
- los claros en `.theme-light`, **después**;
- `--session-*` en `:root`, con `:root[data-session-text=…]`;
- `html, body, #root { height: 100%; margin: 0; overflow: hidden }` y la familia tipográfica.

La regla `prefers-reduced-motion` de `responsive.css` pasa a `@layer base` de `index.css`. `showcase.css` importa
`tokens.css` en lugar de `base.css` y `theme-light.css`. Si hace falta un token nuevo para el aspecto de hoy (por
ejemplo, el degradado de `.app-window` como `--ui-window`), va a `ui-theme.css` con la regla de la que sale (A-4 de
HU-0014).

### `tests/ui-isolation.test.ts` (mismo script `test:ui`; protege las fronteras nuevas)

Desde el paso 1:

1. Solo `src/styles/index.css` y `src/showcase/showcase.css` importan `tailwindcss`.
2. `src/main.tsx` solo importa CSS de las fuentes y `./styles/index.css`.
3. Ningún otro `.ts`/`.tsx` importa CSS.
4. Nada fuera de `src/showcase/` importa el showcase, y ni `index.html` ni `styles/index.css` lo mencionan.
5. `components/ui/` y `hooks/` no importan `features/`, `app/`, `lib/bridge`, `types` ni `@tauri-apps/*` (relativo
   o `@/`).
6. `(--muted)` sigue prohibido en `components/ui/` y `hooks/` (A-3 de HU-0014).
7. Ningún archivo de `src/` usa `document.cookie`, y `components/ui/sidebar.tsx` no registra `keydown` (D-2).
8. **R-1**: `addEventListener("focus" | "blur" | "visibilitychange")` aparece en `src/` solo en
   `features/updates/useSourceUpdateRuntime.ts`, `features/instances/useLiveUsage.ts` y
   `features/scan/useBackgroundRefresh.ts`.
9. Canario de cada detector, con rutas `\` y `/`, como el actual.

En el paso 7 se añade:

10. Los `.css` de `src/` son exactamente `styles/index.css`, `styles/tokens.css`, `styles/ui-theme.css` y
    `showcase/showcase.css`.
11. `components/Icons.tsx` no existe.

En `validate.yml`, el paso «Verify the bundle…» pasa a ser
`test ! -e dist/showcase.html && ! grep -rq "sidebar_state" dist`, y el paso de `test:ui` cambia de nombre
(«Test UI boundaries»).

### Inventario de AC-06 (cada punto se comprueba en el paso donde se mueve)

- **Acciones**:
  - Escanear sistema; Apariencia (tema y tamaño de texto); Nueva instancia (deshabilitada sin fuente o con `busy`,
    con su `title`).
  - Buscar y limpiar.
  - Por instancia: Abrir, Detener (con «Deteniendo…»), carpeta, Editar (nombre, icono, quitar icono), Eliminar
    (solo detenida), Transferir (copiar o mover, artefactos locales) y Desvincular o Devolver.
  - En la original: Actualizar original, Transferir y Desvincular. Sus botones de sesión **no** se deshabilitan con
    `busy`, como hoy.
  - Sincronizar. Ocultar el resultado del escaneo. Cerrar el error y el aviso. Los controles de ventana (Windows) y
    el arrastre.
- **Atajos**: Ctrl/⌘ F y Escape.
- **Avisos y estados**:
  - Actualización oficial (disponible o incierta); sincronización; progreso y resultado del escaneo; error; aviso.
  - «Actualización disponible»; icono personalizado (Dock o sistema aplicado o no); Ejecutándose, Detenido, No
    disponible y Deteniendo…; hora de captura del uso; contexto de sesión; Archivada, Movida y Copia.
  - Los vacíos: sin fuente, sin instancias, sin coincidencias y sin sesiones.
  - El statusbar completo.
  - Las cifras de la toolbar (A-15).

### Riesgos

| | Riesgo | Cómo se evita |
| --- | --- | --- |
| R-1 | Se invierte el orden de los `focus` y, al volver de «Actualizar original», se lanza un escaneo | `DashboardRuntime` no se toca. Prueba 8 de `test:ui`. A-13. Prueba humana en `pnpm tauri dev` (macOS) y en los instaladores |
| R-2 | P-1: estilos rotos en WebKit antiguo | macOS 13.3 (O-1). Linux: README (O-2) y aviso de motor (A-16) |
| R-3 | El preflight deforma el legado mientras convive | A-2: solo se corrige lo que impida usarlo, y se borra en el paso 7 |
| R-4 | Portales sin tema o sin tamaño de texto | A-3 y comprobación en los tres temas con un menú, un diálogo y un tooltip abiertos |
| R-5 | Esquinas opacas o el sidebar fuera de la ventana en Windows | A-3 (`body` transparente) y A-6 (`transform` en la raíz). Prueba humana en Windows |
| R-6 | Escape o clic fuera cierran un diálogo con la operación en curso | A-12. Comprobar con el mock lento (transferir y sincronizar) |
| R-7 | Página de una instancia borrada | A-9. Comprobar borrando desde la página y con un id inventado |
| R-8 | Más peso en el bundle (radix, lucide y el CSS de todo el catálogo por `@source "../components"`) | Se mide en el paso 0 y en el 7. El orquestador lo anota en `docs/rendimiento.document.md` |

### Secuencia (un commit por paso, `HU: HU-0016`; tres entregas)

| # | Paso | Verificación |
| --- | --- | --- |
| O | **Orquestador**, antes de E1: O-1, O-2 y O-3 en un commit | § P-1 |
| 0 | Línea base, sin commit: `pnpm build` (tamaños de `dist/assets`); capturas de `#/` en oscuro y en claro, a 1440×920 y a 980×680, con `pnpm dev` | Fuera del repo |
| **E1** · 1 | A-1, A-2, A-3, A-4 y A-5 (solo el campo y su validación). `index.css` como entrada. Aviso de motor (A-16) y su prueba. `test:ui` nuevo (1–9) y `validate.yml` | `pnpm build`; `dist/assets/*.css` contiene `--tw-` y no hay `showcase.html`; `test:ui` y `test:appearance`. En `pnpm dev`, el panel heredado se puede usar en los tres temas; `<html>` cambia de clase; `/showcase.html` sigue bien |
| E1 · 2 | Shell (A-6, A-7), `AppSidebar` (sin búsqueda todavía), `BrandMark`, `InstanceAvatar`, rutas (A-8, A-9). Las páginas pintan **temporalmente** el `InstanceCard` y el `OriginalAppSection` heredados, y `#/` sigue siendo el panel con su buscador | Navegación por el sidebar; id inventado → `#/`; borrar desde la página → `#/`; plegar y recargar conserva el estado; `document.cookie === ""`; Cmd/Ctrl+B no hace nada; `pnpm tauri dev` en macOS (semáforos libres) |
| **E2** · 3 | `InstanceDetail`, `SessionList` y medidores con el catálogo en `#/instancias/:id` | AC-03 con el mock: cada acción y estado del inventario; 980×680 |
| E2 · 4 | `OriginalDetail` en `#/original` (y su vacío sin fuente) | AC-04 |
| E2 · 5 | `DashboardRoute` (A-15, `usageRanking` y su prueba), `FeedbackArea` (A-10), búsqueda en el sidebar (A-11), `EmptyState`. Se borran `routes/panel/`, `InstanceCard`, `ManagedInstancesSection`, `OriginalAppSection`, `Metric`, `LoadingCards` y el CSS que dejan sin uso | AC-01 y AC-02; Ctrl/⌘ F; `test:dashboard` |
| **E3** · 6 | Los 7 diálogos con el catálogo (A-12). Se borran `ModalFrame`, `ConfirmDialog` y el Escape de `DialogsProvider` | Cada diálogo en los tres temas; Escape, X y clic fuera, con y sin `busy` |
| E3 · 7 | `Icons.tsx` → lucide (A-14); `tokens.css`; se borra todo el CSS heredado y `legacy-compat.css`; `test:ui` 10–11; `showcase.css`; `DESIGN.md`, las skills `code-ai-profiles-frontend-react-vite` y `code-ai-profiles-ui` (fichas tocadas) y `.metodo/reglas/frontend.md` | Las relacionadas; `pnpm build`; `rg -n 'className="[a-z-]+(-card\|-banner\|-pill\|-action)' src` vacío; las capturas del paso 0 contra las nuevas en los tres temas; `config.mjs check` |

**Entregas.** El orquestador revisa al final de cada una: diff, relacionadas y DOM. La revisión técnica va después de
E3. Cada paso deja la app usable: el legado sirve hasta que su sustituto está hecho.

## Briefs y orden

Un solo rol, `briefs/frontend.md`, en secuencia (no hay nada que paralelizar sin pisar archivos). **Modelo: opus**
para E1 y E3, que cargan el preflight, la cascada, el tema en portales, las plataformas, R-1 y las guardas de `busy`
en los diálogos. **Sonnet** basta para E2, que es composición de pantallas con la lógica intacta. **No hay brief de
backend**: O-1 es una línea de configuración y la hace el orquestador. Despacho de E1: después del commit O.

## Revisión técnica

Después de E3 y antes de la prueba humana:

- el diff de `DashboardRuntime` (vacío);
- los listeners (prueba 8);
- `DialogHost` y las guardas;
- `sidebar.tsx` contra A-4;
- `index.css` y `tokens.css` contra § CSS;
- las rutas y A-9;
- `appearance-preferences` y su prueba;
- el inventario de AC-06;
- el peso del bundle;
- O-1 (`minimumSystemVersion` en `13.3`) y A-16.

**Pendiente humano:**

- que el `.dmg` declare 13.3 (`LSMinimumSystemVersion`);
- las tres plataformas, en especial las esquinas de Windows, los semáforos de macOS con el sidebar plegado y
  desplegado, y Linux;
- la vuelta tras «Actualizar original»;
- valorar el aspecto.
