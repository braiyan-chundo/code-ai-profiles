---
name: code-ai-profiles-frontend-react-vite
description: Cómo se construye la interfaz de Code AI Profiles con React 19 y Vite en Tauri - features, React Router 7 con hash, Context y useReducer, CSS propio de DESIGN.md (shadcn solo en el showcase), iconos propios, datos vía bridge.ts, controladores puros, temas, plataformas y pruebas. Cárgala antes de escribir o cambiar cualquier pantalla, ruta, feature, componente, estilo o controlador de src/.
---

# React + Vite · Code AI Profiles

<!-- HU-0011, HU-0015 y HU-0014 (2026-10-28). React 19, Router 7, Vite 6, TypeScript 5.7, Node 24, pnpm. Máx. 170 líneas. -->

## La regla de oro

**El sistema de diseño ya existe y está aprobado: `DESIGN.md` + el CSS de `src/styles/index.css`.** Lo
nuevo se construye con sus variables CSS, sus clases y sus patrones. No se trae otra librería de estilos
o de componentes, no se restiliza de forma global y no se crean primitivas que ya existen. La excepción
es el catálogo shadcn de `components/ui` (HU-0014): hoy solo lo usa el showcase y se adopta con una
historia (skill `code-ai-profiles-ui`). Una dependencia nueva necesita una historia y el sí del mantenedor.

## La estructura

El detalle y las reglas de dependencias, en `docs/arquitectura/frontend.md`. Lo que cambia junto vive junto.

```text
src/
  main.tsx            StrictMode, fuentes locales (@fontsource), styles/index.css y <App />
  app/                App.tsx (solo compone), router.tsx (createHashRouter), RouteErrorBoundary
    providers/        AppProviders, DashboardRuntime (efectos en orden fijo), DialogsProvider
    layout/           AppShell, Titlebar, Statusbar, DialogHost, window-actions.ts
    routes/<pantalla> el componente de ruta y lo que solo usa esa pantalla (panel/: PanelRoute, Toolbar)
  features/<feature>/ componentes, hooks, lógica pura, tipos y CSS; su API pública en index.ts
                      dashboard (núcleo: store, selectores, useDashboard), scan, updates, instances,
                      sessions, original-app, appearance
  components/         piezas sin dominio: Icons, ModalFrame, ConfirmDialog, Metric, EmptyState, LoadingCards
    ui/               catálogo shadcn (63, código propio, `@/components/ui/<id>`); solo lo importa el showcase
  hooks/              hooks del catálogo (use-mobile, use-highlighted-code); lib/utils.ts exporta `cn`
  showcase/           otra entrada de Vite (`showcase.html`, solo `pnpm dev`): la única que carga Tailwind
  lib/                sin React: bridge.ts (el ÚNICO invoke), *-controller.ts, format, errors, platform
  styles/             index.css (el único que importa CSS), base, animations, theme-light, responsive
  types.ts            el contrato con Rust (de backend; tú solo lo lees)
tests/*.test.ts       node --test sobre los módulos puros
```

- `app/` importa todo; nadie importa de `app/`. Entre features, **solo por su `index.ts`** y sin ciclos;
  `features/dashboard` no importa ninguna feature. Dentro de una feature, imports directos. Imports relativos.
- Antes de crear un componente, busca uno que ya lo resuelva en `components/` o en la feature.
- **Pantalla nueva**: `app/routes/<pantalla>/<Pantalla>Route.tsx`, hija de `/` en `app/router.tsx` con
  `lazy`. Pinta dos hijos sin envoltorio: su barra (fila 2) y su `.content` (fila 3). Se navega con
  `<Link>` o `useNavigate()`. La URL nunca lleva nombres, rutas de disco ni títulos: a lo sumo un ID opaco.
- **Feature nueva**: `features/<feature>/` con su `index.ts`; si tiene estado compartido, su contexto y
  hook en `<feature>-context.ts` y el proveedor en su `.tsx` (fast refresh), montado en `AppProviders`.

## Estilos

- **CSS plano con clases semánticas** (`.instance-card`, `.theme-option`…). No se usan CSS Modules,
  CSS-in-JS ni `style={{}}` con colores o medidas. `style` solo para valores calculados (el ancho de
  una barra de progreso).
- **Ningún `.tsx` importa CSS.** Solo `src/styles/index.css`, con `@import`, salvo las entradas (`main.tsx`
  y `showcase/main.tsx`). Su orden es la cascada: un import desde un componente la reordenaría.
- **Tailwind solo vive en `src/showcase/showcase.css`** (y se carga solo en `pnpm dev`). `styles/ui-theme.css`
  es su puente a los tokens; `index.css` no lo importa. `pnpm build` y `dist/` no cambian.
- **CSS de una feature nueva**: `features/<feature>/<feature>.css` con clases de su prefijo, importado
  después del último archivo de feature y antes de `styles/animations.css`. Sus `.theme-light …` y
  `@media` van al final de su archivo. No sobrescribe clases compartidas (`.primary-action`, `.modal-card`).
- **Lo existente** en tema claro o ventana reducida se cambia en `styles/theme-light.css` y
  `styles/responsive.css` (repartirlos alteraría el orden de reglas de igual especificidad).
- **Tokens**: `--surface`, `--surface-raised`, `--line`, `--text`, `--muted`, `--quiet`, `--primary`,
  `--danger`… en `:root` (`styles/base.css`). Úsalos en lugar de hex sueltos. Hay reglas antiguas con
  `rgba(...)` directos: no las copies, y si tocas una, pásala al token.
- **Temas**: el shell (`AppShell`) lleva `theme-dark` o `theme-light`; `system` lo resuelve
  `AppearanceProvider` con `matchMedia`. El oscuro es la base; `.theme-light …` lo sobrescribe y
  `.theme-dark` no tiene reglas. Cada regla nueva con color lleva su contrapartida en `.theme-light`.
- **Plataformas**: el shell lleva `platform-macos`, `platform-windows` o `platform-linux`. En Windows
  la ventana no tiene decoraciones y usa las `.window-controls` propias. En macOS los semáforos van
  superpuestos (`titleBarStyle: Overlay`, con `padding-left`); en Linux pone la barra el gestor de
  ventanas. En esos dos se ocultan `.window-controls`.
- **DOM**: hay reglas con `:nth-of-type` y los diálogos van dentro de `.desktop-shell`, después de
  `<main>` (`DialogHost`). Nada de envoltorios nuevos sin revisar el CSS, ni portales a `body`.
- **Densidad**: los tamaños de sesión salen de `--session-*`, que cambian con `session-text-compact`
  o `session-text-large`. **Ventana reducida**: mínima 980×680, cortes en 1260 y 1070 px y
  `prefers-reduced-motion`. Fuentes locales: la CSP solo permite `font-src 'self' data:`.

## Iconos

Son propios, en `components/Icons.tsx`: `export const XIcon = (props) => <IconBase …>`, `viewBox` de 24,
`stroke="currentColor"` y `aria-hidden`. Un botón de solo icono lleva `aria-label` en español.

## Datos y estado

- **`invoke` solo en `lib/bridge.ts`**, con una función tipada por comando y su rama mock para el
  navegador (`pnpm dev`); las funciones del bridge son de backend: si necesitas una, la pides. Las otras
  APIs de Tauri, siempre tras `bridge.isDesktop()`: `listen` en `features/scan/useScanRuntime.ts`,
  `getCurrentWindow` en `app/layout/window-actions.ts`, `convertFileSrc` en `features/instances/instance-icon.ts`.
- **Store**: `features/dashboard` (`useReducer` con un reducer puro). `useDashboard()` da `dashboard`,
  `loading`, `busy`, `error`, `notice`, `iconPreviews`, `busyRef` y acciones estables. El `DashboardState`
  que devuelve Rust se **reemplaza** (`replaceDashboard`); las fusiones parciales son funciones puras
  que pasan por `updateDashboard`. `runAction(key, action)` marca `busy`, limpia el error, reemplaza y libera.
- **Otros contextos**: `useScan()`, `useSourceUpdate()`, `useAppearance()` y `useDialogs()` (siete
  banderas independientes y Escape). Estado local de una pieza: `useState` en la pieza. Sin librería de estado.
- **Efectos de toda la app**: un hook `use…Runtime` llamado desde `app/providers/DashboardRuntime.tsx`,
  que fija el orden. El `focus` de la actualización oficial va **antes** que el del refresco en segundo
  plano (lo consume). Ningún otro componente registra `focus`, `blur` ni `visibilitychange`. Si un hook
  crea un controlador y registra un efecto, se parte en dos (`useScanRuntime`/`useScanLifecycle`), y sus
  efectos solo dependen de valores estables (acciones del store, refs): si no, se re-registran por render.
- **Controladores puros** en `lib/*-controller.ts` (tiempo, reintentos, carreras): reciben el reloj y las
  llamadas a Rust, no importan React, se crean una vez (ref perezoso) y descartan lo viejo por `generation`.
- **Eventos de Rust**: guardas la función de baja y la llamas en `finally` o al desmontar; antes de usar
  el payload compruebas con un ref que el ciclo sigue vigente (`scan-progress` en `useScanRuntime`).
  Los manejadores leen el estado del render en el que se crearon; no se «arreglan» con refs.
- `localStorage` solo guarda la apariencia (`code-ai-profiles:appearance`), validada campo a campo.

## Estados de cada superficie

Cargando (`LoadingCards`), vacío (`EmptyState`), error con un mensaje que diga qué hacer, deshabilitado
con `busy`, foco visible (`:focus-visible`), ventana reducida, y tema claro, oscuro y del sistema. Los
textos de la interfaz van en español; el código, en inglés.

## Configuración y enlaces

Hoy nadie lee `import.meta.env`. Si hace falta, `src/config.ts` es el único lector, con su ficha en
`.env.example`. Las URLs fijas van a `src/lib/links.ts` (no existe aún), nunca en un componente.
Nada de `VITE_*` con secretos.

## Pruebas

- `node --test` de Node 24, que ejecuta `.ts` quitando los tipos. Por eso las pruebas importan el
  archivo del módulo con extensión (`../src/lib/format.ts`), nunca el `index.ts` de la feature; el
  módulo probado usa solo sintaxis borrable, no importa React, el DOM ni `@tauri-apps/api`, y sus
  imports relativos son solo `import type`.
- `node:assert/strict` y `node:test`, con dobles a mano (ni Vitest, Testing Library ni MSW).
  `tsconfig.json` solo incluye `src/`: `pnpm build` no revisa los tipos de `tests/`.
- Un archivo de prueba nuevo lleva su script `test:<area>` en `package.json`, su entrada en
  `stack.comandos` (`.metodo/config.json`) y su paso en `.github/workflows/validate.yml`.
- Hooks, componentes, temas, plataformas y ventana reducida se revisan con la app abierta
  (`pnpm dev`, `pnpm tauri dev`) y se anotan en la entrega.

## Lo que nunca

- `invoke` fuera de `bridge.ts`, o una API de Tauri sin `bridge.isDesktop()`.
- Colores, sombras o medidas fuera de los tokens, o una regla de color sin su `.theme-light`.
- Un `import "./x.css"` en un componente, o un envoltorio nuevo en el DOM sin revisar el CSS.
- Mostrar o guardar contenido de un perfil (prompts, respuestas, transcripts, credenciales) más allá
  de los metadatos de `types.ts`, también en la URL. Es la promesa central del producto.
- Inventar datos que Rust no puede obtener de forma segura, o cambiar `types.ts` o las firmas de
  `bridge.ts`: eso se devuelve al orquestador.

## Lo que no se toma prestado

- **Tailwind, shadcn/ui, `cn()`, `cva`, `radix-ui` y lucide-react**: solo dentro de `components/ui/` y
  `showcase/`. En la app siguen el CSS propio y `Icons.tsx`; otra librería de iconos, no.
- **TanStack Query, Zustand, Redux, SWR**: los datos llegan por IPC y el estado vive en los contextos.
- **zod, react-hook-form**: los formularios son pocos y se validan a mano (y otra vez en Rust).
- **Socket.IO o fetch a un servidor**: no hay servidor; solo `invoke` y los eventos de Tauri.
- **Vitest, Jest, Testing Library, npm, yarn**: son `node --test` y pnpm.
- **`BrowserRouter` u otro router**: es `createHashRouter` de React Router 7; Tauri no resuelve rutas profundas.
- **Next.js o Electron** (`"use client"`, `ipcRenderer`): esto es una SPA de Vite dentro de Tauri 2.

## Verificación

```bash
pnpm build
pnpm test:scan && pnpm test:update && pnpm test:format
pnpm test:appearance && pnpm test:dashboard && pnpm test:messages && pnpm test:ui
```

Las relacionadas, con `node .metodo/scripts/pruebas.mjs relacionadas code-ai-profiles <archivos>`. La
suite la corre el orquestador.

## Skills relacionadas

`code-ai-profiles-ui` · `code-ai-profiles-configuracion` · `code-ai-profiles-pruebas` ·
`code-ai-profiles-rust-tauri` (el contrato visto desde Rust).
