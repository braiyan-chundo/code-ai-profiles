---
name: code-ai-profiles-frontend-react-vite
description: Cómo se construye la interfaz de Code AI Profiles con React 19 y Vite en Tauri - features, React Router 7 con hash, Context y useReducer, CSS propio de DESIGN.md sin Tailwind ni shadcn, iconos propios, datos vía bridge.ts, controladores puros, temas, plataformas y pruebas node --test. Cárgala antes de escribir o cambiar cualquier pantalla, ruta, feature, componente, estilo o controlador de src/.
---

# React + Vite · Code AI Profiles

<!-- Adaptada del pack frontend-react-vite (2026-10-24) al proyecto real el 2026-10-27 (HU-0011) y a la
     estructura por features el 2026-10-28 (HU-0015). React 19, React Router 7, Vite 6, TypeScript 5.7,
     Node 24, npm. Sin revisar por el mantenedor. Por debajo de 170 líneas; si crece, índice y fichas. -->

## La regla de oro

**El sistema de diseño ya existe y está aprobado: `DESIGN.md` + el CSS de `src/styles/index.css`.** Lo
nuevo se construye con sus variables CSS, sus clases y sus patrones. No se trae otra librería de estilos
o de componentes, no se restiliza de forma global y no se crean primitivas que ya existen. Una
dependencia nueva necesita una historia y el sí del mantenedor: la app es local y pequeña por diseño.

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
- **Ningún `.tsx` importa CSS.** Solo `src/styles/index.css`, con `@import`. Su orden es la cascada:
  un import desde un componente la reordenaría según el grafo de módulos.
- **CSS de una feature nueva**: `features/<feature>/<feature>.css` con clases de su prefijo, importado
  después del último archivo de feature y antes de `styles/animations.css`. Sus `.theme-light …` y
  `@media` van al final de su archivo. No sobrescribe clases compartidas (`.primary-action`, `.modal-card`).
- **Lo existente** en tema claro o ventana reducida se cambia en `styles/theme-light.css` y
  `styles/responsive.css`: repartirlos alteraría el orden de reglas de igual especificidad.
- **Tokens**: `--surface`, `--surface-raised`, `--line`, `--text`, `--muted`, `--quiet`, `--primary`,
  `--danger`… en `:root` (`styles/base.css`). Úsalos en lugar de hex sueltos. Hay reglas antiguas con
  `rgba(...)` directos: no las copies, y si tocas una, pásala al token.
- **Temas**: el shell (`AppShell`) lleva `theme-dark` o `theme-light`; `system` lo resuelve
  `AppearanceProvider` con `matchMedia`. El oscuro es la base; `.theme-light …` lo sobrescribe y
  `.theme-dark` no tiene reglas. Cada regla nueva con color lleva su contrapartida en `.theme-light`.
- **Plataformas**: el shell lleva `platform-macos`, `platform-windows` o `platform-linux`. En Windows
  la ventana no tiene decoraciones y usa las `.window-controls` propias. En macOS los semáforos van
  superpuestos (`titleBarStyle: Overlay`, se les deja sitio con `padding-left`). En Linux la barra la
  pone el gestor de ventanas. En los dos últimos se ocultan `.window-controls`.
- **DOM**: hay reglas con `:nth-of-type` y los diálogos van dentro de `.desktop-shell`, después de
  `<main>` (`DialogHost`). Nada de envoltorios nuevos sin revisar el CSS, ni portales a `body`.
- **Densidad**: los tamaños de sesión salen de `--session-*`, que cambian con `session-text-compact`
  o `session-text-large`. **Ventana reducida**: mínima 980×680, cortes en 1260 y 1070 px y
  `prefers-reduced-motion`. Fuentes locales: la CSP solo permite `font-src 'self' data:`.

## Iconos

Son propios, en `components/Icons.tsx`: un `export const XIcon = (props) => <IconBase …>` con un
`viewBox` de 24, `stroke="currentColor"` y `aria-hidden`. Un botón que solo tiene un icono lleva
`aria-label` en español.

## Datos y estado

- **`invoke` solo en `lib/bridge.ts`**, con una función tipada por comando y su rama mock para el
  navegador (`npm run dev`). Las funciones del bridge son de backend: si necesitas una, la pides. Las
  otras APIs de Tauri, siempre detrás de `bridge.isDesktop()`, viven en tres sitios: `listen` en
  `features/scan/useScanRuntime.ts`, `getCurrentWindow` en `app/layout/window-actions.ts` y
  `convertFileSrc` en `features/instances/instance-icon.ts`.
- **Store**: `features/dashboard` (`useReducer` con un reducer puro). `useDashboard()` da `dashboard`,
  `loading`, `busy`, `error`, `notice`, `iconPreviews`, `busyRef` y acciones estables. El `DashboardState`
  que devuelve Rust se **reemplaza** (`replaceDashboard`); las fusiones parciales son funciones puras
  que pasan por `updateDashboard`. `runAction(key, action)` marca `busy`, limpia el error, reemplaza y libera.
- **Otros contextos**: `useScan()`, `useSourceUpdate()`, `useAppearance()` y `useDialogs()` (siete
  banderas independientes y Escape). Estado local de una pieza: `useState` en la pieza. Sin librería de estado.
- **Efectos de toda la app**: un hook `use…Runtime` llamado desde `app/providers/DashboardRuntime.tsx`,
  que fija el orden. El `focus` de la actualización oficial va **antes** que el del refresco en segundo
  plano (lo consume). Ningún otro componente registra `focus`, `blur` ni `visibilitychange`.
- **Controladores puros** en `lib/*-controller.ts` para tiempo, reintentos o carreras: reciben el reloj
  y las llamadas a Rust, no importan React, se crean una vez (ref perezoso, encima del router) y
  descartan resultados viejos por `generation`.
- **Eventos de Rust**: guardas la función de baja y la llamas en `finally` o al desmontar; antes de usar
  el payload compruebas con un ref que el ciclo sigue vigente (`scan-progress` en `useScanRuntime`).
- Los manejadores leen el estado del render en el que se crearon; no se «arreglan» con refs.
- `localStorage` solo guarda la apariencia (`code-ai-profiles:appearance`), validada campo a campo.

## Estados de cada superficie

Cargando (`LoadingCards`), vacío (`EmptyState`), error con un mensaje que diga qué hacer, deshabilitado
con `busy`, foco visible (`:focus-visible`), ventana reducida, y tema claro, oscuro y del sistema. Los
textos de la interfaz van en español; el código, en inglés.

## Configuración y enlaces

Hoy la interfaz no lee `import.meta.env`. Si hace falta, se crea `src/config.ts` como único lector y se
añade la ficha en `.env.example`. Las URLs fijas van a `src/lib/links.ts` (todavía no existe), nunca en
un componente. Nada de `VITE_*` con secretos.

## Pruebas

- `node --test` de Node 24, que ejecuta `.ts` quitando los tipos. Por eso las pruebas importan el
  archivo del módulo con extensión (`../src/lib/format.ts`), nunca el `index.ts` de la feature; el
  módulo probado usa solo sintaxis borrable, no importa React, el DOM ni `@tauri-apps/api`, y sus
  imports relativos son solo `import type`.
- `node:assert/strict` y `node:test`, con dobles a mano. No hay Vitest, Testing Library ni MSW.
- `tsconfig.json` solo incluye `src/`: `npm run build` no revisa los tipos de `tests/`.
- Un archivo de prueba nuevo lleva su script `test:<area>` en `package.json`, su entrada en
  `stack.comandos` (`.metodo/config.json`) y su paso en `.github/workflows/validate.yml`.
- Hooks, componentes, temas, plataformas y ventana reducida se revisan con la app abierta
  (`npm run dev`, `npm run tauri dev`) y se anotan en la entrega.

## Lo que nunca

- `invoke` fuera de `bridge.ts`, o una API de Tauri sin `bridge.isDesktop()`.
- Colores, sombras o medidas fuera de los tokens, o una regla de color sin su `.theme-light`.
- Un `import "./x.css"` en un componente, o un envoltorio nuevo en el DOM sin revisar el CSS.
- Mostrar o guardar contenido de un perfil (prompts, respuestas, transcripts, credenciales) más allá
  de los metadatos de `types.ts`, también en la URL. Es la promesa central del producto.
- Inventar datos que Rust no puede obtener de forma segura, o cambiar `types.ts` o las firmas de
  `bridge.ts`: eso se devuelve al orquestador.

## Lo que no se toma prestado

- **Tailwind, shadcn/ui, `cn()`, `cva`**: el CSS es propio (la HU-0014 reserva `components/ui/`).
- **lucide-react** u otra librería de iconos: están en `Icons.tsx`.
- **TanStack Query, Zustand, Redux, SWR**: los datos llegan por IPC y el estado vive en los contextos.
- **zod, react-hook-form**: los formularios son pocos y se validan a mano (y otra vez en Rust).
- **Socket.IO o fetch a un servidor**: no hay servidor; solo `invoke` y los eventos de Tauri.
- **Vitest, Jest, Testing Library, pnpm**: son `node --test` y npm.
- **`BrowserRouter` u otro router**: es `createHashRouter` de React Router 7; Tauri no resuelve rutas profundas.
- **Next.js o Electron** (`"use client"`, `ipcRenderer`): esto es una SPA de Vite dentro de Tauri 2.

## Verificación

```bash
npm run build
npm run test:scan && npm run test:update && npm run test:format
npm run test:appearance && npm run test:dashboard && npm run test:messages
```

Las relacionadas, con `node .metodo/scripts/pruebas.mjs relacionadas code-ai-profiles <archivos>`. La
suite la corre el orquestador.

## Skills relacionadas

`code-ai-profiles-configuracion` · `code-ai-profiles-pruebas` · `code-ai-profiles-rust-tauri` (el
contrato visto desde Rust).
