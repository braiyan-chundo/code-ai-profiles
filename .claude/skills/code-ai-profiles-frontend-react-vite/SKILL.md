---
name: code-ai-profiles-frontend-react-vite
description: Cómo se construye la interfaz de Code AI Profiles con React 19 + Vite + TypeScript sobre Tauri - CSS propio con los tokens de DESIGN.md (sin Tailwind ni shadcn), iconos SVG propios, datos vía bridge.ts, controladores puros, temas, plataformas y pruebas con node --test y npm. Cárgala antes de escribir o cambiar cualquier pantalla, componente, estilo o controlador de src/.
---

# React + Vite · Code AI Profiles

<!-- Adaptada del pack frontend-react-vite (2026-10-24) al proyecto real el 2026-10-27 (HU-0011):
     React 19, Vite 6, TypeScript 5.7, Node 24, npm. Sin revisar por el mantenedor.
     Por debajo de 170 líneas; si crece, índice y fichas. -->

## La regla de oro

**El sistema de diseño ya existe y está aprobado: `DESIGN.md` + `src/styles.css`.** Lo nuevo se
construye con sus variables CSS, sus clases y sus patrones. No se trae otra librería de estilos o de
componentes, no se restiliza de forma global y no se crean primitivas que ya existen. Una dependencia
nueva necesita una historia y el sí del mantenedor: la app es local y pequeña por diseño.

## La estructura

```text
src/
  main.tsx                 StrictMode, fuentes locales (@fontsource Inter y JetBrains Mono), styles.css
  App.tsx                  la app: estado, efectos y los componentes de pantalla (InstanceCard,
                           SessionTransferDialog, ModalFrame, ConfirmDialog…) en el mismo archivo
  styles.css               los tokens (:root), los temas, las plataformas y todas las clases
  components/Icons.tsx     los iconos SVG propios, sobre IconBase
  lib/bridge.ts            el ÚNICO sitio que llama a invoke(), con mock para el navegador
  lib/*-controller.ts      lógica con tiempo o concurrencia, pura y con dependencias inyectadas
  types.ts                 el contrato con Rust (de backend; tú solo lo lees)
tests/*.test.ts            pruebas de los controladores con node --test
```

Antes de crear un componente, busca en `App.tsx` uno que ya lo resuelva (`ModalFrame`,
`ConfirmDialog`, `Metric`, `UsageMeter`, `EmptyState`, `LoadingCards`). Partir `App.tsx` en archivos
lo decide una historia, no un despacho.

## Estilos

- **CSS plano con clases semánticas** en `styles.css` (`.instance-card`, `.theme-option`…). No se
  usan CSS Modules, CSS-in-JS ni `style={{}}` con colores o medidas. `style` solo se acepta para
  valores calculados, como el ancho de una barra de progreso.
- **Tokens**: `--surface`, `--surface-raised`, `--line`, `--text`, `--muted`, `--quiet`, `--primary`,
  `--danger`… en `:root`. Úsalos en lugar de repetir hex sueltos. Hay reglas antiguas con
  `rgba(...)` directos: no las copies, y si tocas una, pásala al token.
- **Temas**: el shell lleva `theme-dark` o `theme-light`; `system` se resuelve con `matchMedia` en
  `App.tsx`. El oscuro es la base (`:root` y las reglas sin prefijo). `.theme-light …` lo
  sobrescribe y `.theme-dark` no tiene reglas: no escribas reglas `.theme-dark` vacías. Cada regla
  nueva con color lleva su contrapartida en `.theme-light`; si no, el tema claro sale roto.
- **Plataformas**: el shell lleva `platform-macos`, `platform-windows` o `platform-linux`, y cada
  una tiene su `tauri.<os>.conf.json`. En Windows la ventana no tiene decoraciones y usa las
  `.window-controls` propias. En macOS los semáforos nativos van superpuestos (`titleBarStyle:
  Overlay`, se les deja sitio con `padding-left`). En Linux la barra la pone el gestor de ventanas.
  En los dos últimos se ocultan `.window-controls`.
- **Densidad**: los tamaños de sesión salen de las variables `--session-*`, que cambian con
  `session-text-compact` o `session-text-large`. No fijes px ahí.
- **Ventana reducida**: la mínima es 980×680. Hay cortes en `@media (max-width: 1260px)` y
  `(max-width: 1070px)`, y se respeta `prefers-reduced-motion`.
- Las fuentes son locales (`@fontsource`). La CSP solo permite `font-src 'self' data:`, así que nada
  de Google Fonts ni de CDNs.

## Iconos

Son propios, en `components/Icons.tsx`: un `export const XIcon = (props) => <IconBase …>` con un
`viewBox` de 24, `stroke="currentColor"` y `aria-hidden`. El color se hereda del texto. Un botón que
solo tiene un icono lleva `aria-label` en español.

## Datos y estado

- **`invoke` solo se usa en `lib/bridge.ts`**, con una función tipada por comando. En el navegador
  (`npm run dev`, sin `__TAURI_INTERNALS__`) responde el mock. Si añades una función, añade también
  su rama mock. Las funciones del bridge son de backend: si necesitas una nueva, la pides.
  `listen`, `getCurrentWindow` y `convertFileSrc` se usan en `App.tsx`, y solo detrás de
  `bridge.isDesktop()`.
- Casi todos los comandos devuelven el `DashboardState` completo. Se reemplaza el estado con lo que
  llega; no se parchea a mano ni se guarda una copia en otro sitio.
- El estado vive en `App.tsx` con `useState` y `useRef`. No hay store global.
- La lógica con temporizadores, reintentos o carreras (escaneo, comprobación de actualización) va en
  un **controlador puro** en `lib/` (`createScanController`). Recibe por parámetro el reloj y las
  funciones que llaman a Rust, no importa React y se prueba sin DOM. Los resultados viejos se
  descartan por `generation`.
- Eventos de Rust: `listen` de `@tauri-apps/api/event`. Guardas la función de baja y la llamas en
  `finally` o al desmontar. Antes de usar el payload, compruebas con un ref que el ciclo del listener
  sigue vigente: es el patrón de `scan-progress` en el `runManual` de `App.tsx`.
- `localStorage` solo guarda preferencias de apariencia, y se validan campo por campo al leerlas.
  Nunca guarda datos de perfiles ni de sesiones.

## Estados de cada superficie

Cargando (`LoadingCards`), vacío (`EmptyState`), error con un mensaje que diga qué hacer, deshabilitado
mientras hay una operación en curso (`busy`), foco visible (`:focus-visible` ya definido), ventana
reducida, y tema claro, oscuro y del sistema. Los textos de la interfaz van en español; el código, en
inglés.

## Configuración y enlaces

Hoy la interfaz no lee `import.meta.env`. Si alguna vez hace falta, se crea `src/config.ts` como único
lector y se añade la ficha en `.env.example`. Las URLs fijas van al archivo de enlaces declarado
(`src/lib/links.*`, todavía no existe), nunca escritas en un componente. Nada de `VITE_*` con secretos.

## Pruebas

- `node --test` de Node 24, que ejecuta `.ts` quitando los tipos. Por eso:
  - las pruebas importan con la extensión: `from "../src/lib/scan-controller.ts"`;
  - en los archivos que se prueban, solo sintaxis TypeScript borrable: nada de `enum`, `namespace`
    ni propiedades de parámetro, y `import type` para los tipos;
  - el módulo que se prueba no importa React, el DOM ni `@tauri-apps/api`, y sus imports relativos
    solo pueden ser `import type`: Node exige la extensión `.ts` y `tsc` la rechaza.
- `node:assert/strict` y `node:test`, con dobles a mano (`deferred()`, un reloj falso). No hay
  Vitest, Testing Library ni MSW.
- `tsconfig.json` solo incluye `src/`, así que `npm run build` no revisa los tipos de `tests/`.
- Un archivo de prueba nuevo lleva su script `test:<area>` en `package.json`, entra en
  `stack.comandos` (`.metodo/config.json`) y tiene su paso en `.github/workflows/validate.yml`.
- Lo que no se puede probar sin DOM (temas, ventana reducida, plataformas) se revisa a mano con
  `npm run dev` y se anota en la entrega.

## Lo que nunca

- Llamar a `invoke` fuera de `bridge.ts`, o usar una API de Tauri sin `bridge.isDesktop()`: rompe el
  modo navegador y el mock.
- Colores, sombras o medidas nuevas fuera de los tokens, o una regla de color sin su `.theme-light`.
- Mostrar o guardar contenido de un perfil (prompts, respuestas, transcripts, credenciales) más allá
  de los metadatos que da `types.ts`. Es la promesa central del producto.
- Inventar en la interfaz datos que Rust no puede obtener de forma segura.
- Cambiar `types.ts` o las firmas de `bridge.ts`: eso se devuelve al orquestador.

## Lo que no se toma prestado

- **Tailwind, shadcn/ui, `cn()`, `cva`**: aquí el CSS es propio. No se migra lo que hay.
- **lucide-react** u otra librería de iconos: están en `Icons.tsx`.
- **TanStack Query, Zustand, Redux, SWR**: los datos llegan por IPC, no por HTTP, y el estado vive
  en `App.tsx` y en los controladores.
- **zod, react-hook-form**: los formularios son pocos y se validan a mano (y otra vez en Rust).
- **Socket.IO o fetch a un servidor**: no hay servidor; solo `invoke` y los eventos de Tauri.
- **Vitest, Jest, Testing Library, pnpm**: son `node --test` y npm.
- **React Router**: es una sola ventana con diálogos.
- **Next.js o Electron** (`"use client"`, `ipcRenderer`): esto es una SPA de Vite dentro de Tauri 2.

## Verificación

```bash
npm run build
npm run test:scan && npm run test:update
```

Las relacionadas, con `node .metodo/scripts/pruebas.mjs relacionadas code-ai-profiles <archivos>`. La
suite la corre el orquestador.

## Skills relacionadas

`code-ai-profiles-configuracion` · `code-ai-profiles-pruebas` · `code-ai-profiles-rust-tauri` (el
contrato visto desde Rust).
