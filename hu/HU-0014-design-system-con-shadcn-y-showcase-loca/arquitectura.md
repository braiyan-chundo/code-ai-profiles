# Arquitectura · HU-0014 · Design system con shadcn y showcase local

<!-- La escribe architect (2026-10-28). Base: docs/arquitectura/frontend.md (HU-0015). Sin contrato IPC: la
     historia no toca Rust, types.ts ni bridge.ts. -->

## Preguntas abiertas

Ninguna bloquea. Cuatro avisos para el mantenedor, ya resueltos dentro de lo autorizado:

1. **El catálogo real tiene 63 componentes, no ~50.** El registro `radix-vega` (el estilo de shadcn 4.x con
   base Radix) trae 64 entradas `registry:ui`. `form` no trae archivos. Entre los 63 hay 8 de conversación
   (`message`, `bubble`, `message-scroller`, `attachment`, `questionnaire`, `marker`, `trace`, `code-block`).
   Arrastran `@shadcn/react` y `shiki`, y `combobox` arrastra `@base-ui/react`. Entran porque se pidió «todo el
   catálogo». Si no los quieres, se quitan en el paso 2 sin tocar nada más.
2. **`cn` sustituye a `clsx` y `tailwind-merge`.** Esta versión del registro importa `cn` (un paquete de shadcn
   que hace lo mismo que los dos). No se instalan `clsx` ni `tailwind-merge`.
3. **`next-themes` no se instala.** `sonner.tsx` lo usa para leer el tema. Aquí el tema lo lleva la app, así que
   el componente recibe `theme` por props (A-6).
4. **El botón principal se ve como el de la app**: naranja (`--primary-bright`) con texto blanco, con un contraste
   de 3,0:1, igual que `.primary-action`. Si en la revisión visual prefieres un texto oscuro (5,8:1), es un cambio
   de una línea en `ui-theme.css`.

## Análisis

Confianza: alta en el aislamiento y media en el aspecto. El aislamiento se mide con el hash de `dist/` y del CSS
servido en desarrollo. El aspecto solo lo juzga la persona.

Leído: `hu.md`, `docs/arquitectura/frontend.md`, `DESIGN.md`, `src/styles/{index,base,theme-light}.css`,
`src/components/{buttons,modal}.css`, `src/app/layout/shell.css` (`.primary-action`, `.app-window`),
`src/features/instances/instance-editor.css` (`.form-field`), `vite.config.ts`, `tsconfig*.json`, `package.json`,
`pnpm-workspace.yaml`, `index.html`, `src-tauri/tauri.conf.json` (`devUrl`, `beforeBuildCommand`, CSP),
`.metodo/reglas/frontend.md`, la skill de frontend, `.metodo/config.json` (territorios, comandos) y `.graphifyignore`.
Grafo: `graphify query "shadcn tailwind showcase componentes ui tokens estilos vite"` (solo nodos de documentación;
no hay código previo de shadcn). Fuera del repo, en el scratchpad: el paquete `shadcn@4.22.1` (CLI,
`dist/tailwind.css`, opciones de `init` y `add`), `@tailwindcss/vite@4.3.3` (su `transform`), el registro
`https://ui.shadcn.com/r/styles/radix-vega/registry.json` y el código de sus 67 entradas `ui`, `hook` y `lib`.

### Supuestos

- **S-1** · El plugin `@tailwindcss/vite` no altera un CSS sin directivas de Tailwind. Lo comprobé en su código:
  `generate()` devuelve `false` si el archivo no usa `@apply`, `theme()`, utilidades ni variantes, y entonces el
  `transform` no devuelve nada. Aun así no se confía en eso para el build: el plugin **solo se carga en `serve`**
  (A-1), y `vite build` ni lo importa.
- **S-2** · Vite resuelve `"/src"` como ruta relativa a la raíz del proyecto, igual que hace `index.html` con
  `/src/main.tsx`. Por eso el alias `@` → `"/src"` no necesita `node:path` ni `@types/node`. Si el paso 1 falla en
  Windows, se vuelve a architect.
- **S-3** · `shadcn add --all` con un `components.json` escrito a mano instala sin `init`. Su lista coincide con
  la de § Catálogo. Si difiere, manda lo que instale la CLI, y la diferencia se anota en la entrega.
- **S-4** · Tailwind 4.3 envuelve en la capa `@import "x.css" layer(base)` (es la sintaxis de su documentación para
  el preflight).

### Impacto

- **Rust, IPC, `types.ts`, `bridge.ts`**: nada.
- **La app (`index.html`, `src/main.tsx`, `src/styles/**`, `app/`, `features/`, `components/*.tsx`)**: nada. El
  `dist/` debe salir **byte a byte igual** que en `7dca7a0`.
- **Plataformas**: el binario nativo de Tailwind (`@tailwindcss/oxide`) existe para macOS arm64, Windows x64 y
  Linux x64/arm64, y no tiene scripts de instalación. Como solo se carga en `pnpm dev`, los runners de
  `build-desktop.yml` no lo ejecutan nunca. `pnpm install --frozen-lockfile` sí lo descarga como opcional.
- **Privacidad**: el showcase no importa `bridge`, `@tauri-apps/*`, features ni `localStorage`. Usa solo datos
  inventados y no hace peticiones de red (sin avatares remotos ni imágenes externas). Shiki usa su motor de JS y
  gramáticas locales, sin CDN. La CLI de shadcn consulta `ui.shadcn.com` solo cuando la ejecuta una persona.
- **Migraciones**: ninguna. **Datos del perfil**: ninguno.
- **Regresiones posibles**: (1) que Tailwind o su preflight entren en la app; (2) que `pnpm install` mueva una
  versión que ya existía y cambie el bundle; (3) que `tsc` no compile algún componente (rompería `pnpm build` y la
  CI); (4) que `--primary` y `--muted` se pisen (A-3). Las cuatro tienen su comprobación en § Secuencia.

## Solución

### Decisiones (A-n) y desvíos de las ★

| | Decisión | Respecto a la ★ |
| --- | --- | --- |
| A-1 | `vite.config.ts` carga `@tailwindcss/vite` **solo si `command === "serve"`**, con un `import()` dinámico. `vite build` no lo importa. | Refuerza D-2: el build no puede cambiar porque Tailwind no existe para él. |
| A-2 | Estilo `radix-vega` (base Radix, iconos lucide, Inter) con `components.json` escrito a mano, **sin `shadcn init`**: `init` reescribe CSS, fuentes y configuración que no son suyos. | D-3 y D-5 tal cual. |
| A-3 | El tema no redeclara `--primary` ni `--muted`, porque ya son tokens de la app: `--primary` significa lo mismo, y `--muted` es un **color de texto** en la app y un **fondo** en shadcn. Las utilidades se mapean en `@theme inline` (`--color-muted: var(--surface-soft)`, `--color-muted-foreground: var(--muted)`). El único `var(--muted)` crudo del registro (`bubble.tsx`) pasa a `var(--surface-soft)`. | Precisa D-4. Con `--primary: var(--primary)` habría un ciclo, y con `--muted` redefinido se rompería el texto de la app. |
| A-4 | Lo que la app no tiene como token (texto sobre el primario, primario de texto en claro, fondo de popover, velo de los modales, radios y fuentes) va como `--ui-*` en un **único** archivo, `src/styles/ui-theme.css`, con valores copiados del CSS de la app y la regla de la que salen. | Desvío parcial de D-4: crear tokens en `src/styles/base.css` está fuera de alcance y cambiaría el CSS de la app. |
| A-5 | `shadcn@4.22.1` como devDependency exacta. Fija la CLI (`pnpm exec shadcn`) y aporta `shadcn/tailwind.css`, que los componentes necesitan (variantes `data-open`, `data-checked`… y las animaciones del acordeón). | D-5. El registro no tiene versión: se anota la fecha de descarga en la skill. |
| A-6 | `sonner.tsx` sin `next-themes`: `theme` llega por props, con `"dark"` por defecto. Se desinstala `next-themes`. | Una dependencia menos. La app tiene su `AppearanceProvider`. |
| A-7 | `src/lib/highlighter.tsx` (registro) se mueve a `src/hooks/highlighter.tsx`, porque importa React y `lib/` no puede. Se actualiza su import en `hooks/use-highlighted-code.ts`. | Mantiene la regla de `lib/`. |
| A-8 | Las versiones nuevas van **exactas** en `package.json` (sin `^`). | D-5, extendida a todo lo que trae el registro. |
| A-9 | El tema de shadcn se aplica con la clase `theme-dark` o `theme-light` **en `<html>`** del showcase, para que los portales de Radix (que van a `body`) hereden el tema. | Ver R-5 para la historia que lo adopte en la app. |

### Archivos

```text
showcase.html                     NUEVO · raíz · <html lang="es">, #root, /src/showcase/main.tsx. Solo lo sirve pnpm dev
components.json                   NUEVO · raíz · configuración de la CLI (A-2)
vite.config.ts                    Tailwind solo en serve (A-1) y alias @ → "/src"
tsconfig.json                     "paths": { "@/*": ["./src/*"] }   (sin baseUrl)
package.json, pnpm-lock.yaml      dependencias de § Dependencias, exactas
src/components/ui/*.tsx           NUEVO · 63 componentes del registro (código propio desde la descarga)
src/hooks/use-mobile.ts           NUEVO · registro (lo usa sidebar)
src/hooks/use-highlighted-code.ts NUEVO · registro (lo usa code-block)
src/hooks/highlighter.tsx         NUEVO · registro, movido desde lib/ (A-7)
src/lib/utils.ts                  NUEVO · registro: export { cn } from "cn"
src/styles/ui-theme.css           NUEVO · el puente shadcn → tokens. index.css NO lo importa
src/showcase/main.tsx             NUEVO · fuentes @fontsource (las mismas que src/main.tsx), ./showcase.css, <Showcase />
src/showcase/showcase.css         NUEVO · la única entrada de Tailwind (§ Aislamiento)
src/showcase/Showcase.tsx         NUEVO · disposición, índice, buscador, selector de tema y <Toaster>
src/showcase/catalog.ts           NUEVO · lista ordenada { id, name, group, Section }: de ella salen el índice y las secciones
src/showcase/ShowcaseSection.tsx  NUEVO · el marco común de una sección
src/showcase/sections/<id>.tsx    NUEVO · una por componente (63), con el nombre del archivo de components/ui
tests/ui-isolation.test.ts        NUEVO · § Pruebas
.claude/skills/code-ai-profiles-ui/SKILL.md, tema.md, componentes/<id>.md   NUEVO · § Skill
.claude/skills/code-ai-profiles-frontend-react-vite/SKILL.md   § Reglas y skill de frontend
.metodo/reglas/frontend.md        § Reglas y skill de frontend
.github/workflows/validate.yml    un paso: pnpm test:ui
docs/arquitectura/frontend.md     delta ya aplicado por architect
```

`components.json`, sin `$schema`, porque la guarda revisa URLs:

```json
{
  "style": "radix-vega", "rsc": false, "tsx": true, "iconLibrary": "lucide", "rtl": false,
  "menuColor": "default", "menuAccent": "subtle",
  "tailwind": { "config": "", "css": "src/showcase/showcase.css", "baseColor": "neutral", "cssVariables": true, "prefix": "" },
  "aliases": { "components": "@/components", "ui": "@/components/ui", "utils": "@/lib/utils", "lib": "@/lib", "hooks": "@/hooks" }
}
```

`vite.config.ts` (la forma; los nombres son los del archivo actual):

```ts
export default defineConfig(async ({ command }) => {
  const plugins: PluginOption[] = [react()];
  // HU-0014: Tailwind solo existe para el showcase, que solo sirve `pnpm dev`. `vite build` no lo carga.
  if (command === "serve") plugins.push((await import("@tailwindcss/vite")).default());
  return { plugins, resolve: { alias: { "@": "/src" } }, clearScreen: false, server: { /* igual que hoy */ } };
});
```

### Dependencias

Referencia del 2026-10-28, todas con más de 24 h. pnpm 12 resuelve respetando `minimumReleaseAge`; se fija
**exacto** lo que quede en el lockfile.

| Paquete | Versión | Tipo | Por qué |
| --- | --- | --- | --- |
| `tailwindcss`, `@tailwindcss/vite` | 4.3.3 | dev | Tailwind 4 (D-5) |
| `shadcn` | 4.22.1 | dev | CLI fijada y `shadcn/tailwind.css` (A-5). La 4.23.0 tiene menos de 24 h |
| `tw-animate-css` | 1.4.0 | dev | animaciones `animate-in`/`out` del registro |
| `radix-ui` | 1.8.1 | dep | primitivas (el paquete unificado) |
| `class-variance-authority` · `cn` | 0.7.1 · 0.5.0 | dep | variantes · `cn()` |
| `lucide-react` | la que resuelva pnpm (≥ 1.61.0) | dep | iconos internos (D-3) |
| `sonner` · `cmdk` · `vaul` | 2.0.8 · 1.1.1 · 1.1.2 | dep | sonner · command · drawer |
| `embla-carousel-react` · `recharts` | 8.6.0 · 3.8.0 | dep | carousel · chart (el registro fija `recharts@3.8.0`) |
| `react-day-picker` · `date-fns` | 10.0.2 · 4.4.0 | dep | calendar |
| `input-otp` · `react-resizable-panels` | 1.5.0 · 4.15.0 | dep | input-otp · resizable |
| `@base-ui/react` | 1.9.0 | dep | combobox (sí, también en la base Radix) |
| `@shadcn/react` · `shiki` | 0.3.1 · 4.5.0 | dep | message-scroller y questionnaire · code-block |

No se instalan `next-themes` (A-6), `clsx`, `tailwind-merge`, `zod` ni `react-hook-form` (`form` está vacío).
Ninguna tiene scripts de instalación (comprobado en el registro de npm). `allowBuilds` no cambia: si
`pnpm ignored-builds` lista algo, **se para** y se pregunta al mantenedor.

### Aislamiento de Tailwind

```css
/* src/showcase/showcase.css: la única entrada de Tailwind (HU-0014) */
@import "tailwindcss" source(none);          /* sin detección automática: no escanea docs, hu ni src-tauri */
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@import "../styles/base.css" layer(base);     /* tokens oscuros en :root, en la capa base, después del preflight */
@import "../styles/theme-light.css" layer(base); /* tokens claros en .theme-light */
@import "../styles/ui-theme.css";
@source "../components/ui";
@source "../hooks";
@source "./";
@layer base {
  * { @apply border-border outline-ring/50; }
  body { @apply bg-background text-foreground; }
  .theme-dark { color-scheme: dark; }
  .theme-light { color-scheme: light; }
}
```

- **Por qué `layer(base)`.** `base.css` sin capa ganaría a las utilidades: `button { color: inherit }` anularía
  `text-primary-foreground`, y su `outline` de foco anularía el anillo de shadcn. Dentro de `base`, gana al preflight
  y pierde ante las utilidades.
- `base.css` deja `html, body, #root` con `overflow: hidden`, así que el showcase hace scroll en su `<main>`, como la app.
- La app no cambia: `index.html` → `src/main.tsx` → `src/styles/index.css`, sin Tailwind. Ningún archivo de la app
  importa `showcase.css`, `ui-theme.css`, `components/ui` ni `hooks`. Lo vigila `tests/ui-isolation.test.ts`.
- Tras cualquier `shadcn add`, la CLI vuelve a escribir variables `:root`/`.dark` en `showcase.css`. **Se descartan**
  (`git checkout -- src/showcase/showcase.css`), porque redefinirían `--primary` y `--muted`.

### Mapa de tokens (`src/styles/ui-theme.css`)

```css
@custom-variant dark (&:where(.theme-dark, .theme-dark *));
:root, .theme-dark { --ui-on-primary: #fff; --ui-primary-text: var(--primary); --ui-popover: rgba(43, 44, 43, 0.98); --ui-overlay: rgba(5, 6, 5, 0.58); }
.theme-light { --ui-primary-text: #9c5947; --ui-popover: rgba(255, 253, 251, 0.995); --ui-overlay: rgba(67, 50, 43, 0.3); }
:root, .theme-dark, .theme-light { --background: var(--surface); /* … la tabla … */ }
@theme inline { --color-background: var(--background); /* … */ }
```

Las variables de shadcn se declaran en `:root, .theme-dark, .theme-light`. Una custom property se resuelve en el
elemento que la declara: si solo estuviera en `:root`, un `.theme-light` en un descendiente (como `.desktop-shell` en
la app) heredaría los valores oscuros ya resueltos.

| Variable de shadcn | Valor | Oscuro → claro | Origen |
| --- | --- | --- | --- |
| `--background` · `--sidebar` | `var(--surface)` | #151615 → #f3efeb | `base.css` / `theme-light.css` |
| `--foreground`, `--card-foreground`, `--popover-foreground`, `--secondary-foreground`, `--accent-foreground`, `--sidebar-foreground`, `--sidebar-accent-foreground` | `var(--text)` | #e8e4e2 → #2e2926 | idem |
| `--card` | `var(--surface-raised)` | rgba(33,34,33,.9) → rgba(255,255,255,.92) | idem |
| `--popover` | `var(--ui-popover)` | rgba(43,44,43,.98) → rgba(255,253,251,.995) | `.modal-card` (`modal.css`, `theme-light.css`) |
| `--primary` | **no se declara** (A-3) | #ff8d6c en los dos | token de la app |
| `--primary-foreground` · `--sidebar-primary-foreground` | `var(--ui-on-primary)` | #fff | `.primary-action { color: white }` (`shell.css`) |
| `--secondary` | `var(--surface-soft)` | blanco 4,5 % → tierra 5,5 % | `base.css` / `theme-light.css` |
| `--muted` | **no se declara** (A-3) | — | — |
| `--muted-foreground` | `var(--muted)` | #aaa19e → #746b67 | idem |
| `--accent` · `--sidebar-accent` | `var(--line)` | blanco 9 % → tierra 11 % | hover de la app ≈ 7,5–9 % |
| `--destructive` | `var(--danger)` | #ef7e70 → #be4f42 | idem |
| `--border` · `--sidebar-border` | `var(--line)` | | idem |
| `--input` | `var(--line-strong)` | | idem |
| `--ring` · `--sidebar-ring` | `var(--primary)` | | foco de la app: `rgba(255,141,108,.78)` |
| `--sidebar-primary` | `var(--primary-bright)` | #ff5f35 | |
| `--chart-1…5` | `--primary`, `--primary-soft`, `--primary-bright`, `--muted`, `--quiet` | | |
| `--radius` | `14px` | | botones de `.modal-actions` |

`@theme inline` además de lo estándar (`--color-<x>: var(--<x>)` para cada variable de arriba):

| Tailwind | Valor | Por qué |
| --- | --- | --- |
| `--color-primary` | `var(--primary-bright)` | el relleno de `.primary-action` (#ff7149 → #ff4d20) |
| `--color-muted` · `--color-muted-foreground` | `var(--surface-soft)` · `var(--muted)` | A-3 |
| `--color-primary-text` | `var(--ui-primary-text)` | texto naranja legible en claro (#9c5947 sobre #f3efeb = 4,6:1, de `.theme-light .original-badge`) |
| `--color-overlay` | `var(--ui-overlay)` | velo de `.modal-backdrop` |
| `--font-sans` · `--font-heading` | `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | `base.css` |
| `--font-mono` | `"JetBrains Mono", ui-monospace, monospace` | `appearance.css`, `instance-editor.css` |
| `--radius-sm/md/lg/xl/2xl/3xl/4xl` | 9 · 12 · `var(--radius)` · 16 · 20 · 26 · 32 px | chips 9, cierre 13, acciones 14, tarjetas 16 (DESIGN), ventana 20, modal 26 |

### Ajustes a los componentes del registro (lista cerrada)

Cada uno se anota en la ficha, en «Diferencias con el registro».

1. `dialog`, `alert-dialog`, `sheet` y `drawer`: el velo `bg-black/10 … backdrop-blur-xs` pasa a `bg-overlay … backdrop-blur-[18px]`.
2. `bubble`: `var(--muted)` pasa a `var(--surface-soft)` (A-3).
3. `button`, variante `link`, y cualquier otro `text-primary` que no sea `-foreground`: pasa a `text-primary-text`.
4. `sonner`: sin `next-themes` (A-6). 5. `highlighter` movido (A-7).
6. Lo mínimo para que `tsc` compile, si algo falla, anotado y en la entrega.

Cualquier otro retoque de aspecto sale de la revisión visual de la persona y se anota igual. Nada de reescribir
componentes enteros.

### Catálogo (63, registro `radix-vega`, 2026-10-28)

| Grupo | Componentes |
| --- | --- |
| Acciones (5) | button, button-group, toggle, toggle-group, kbd |
| Formularios (14) | field, label, input, input-group, input-otp, textarea, checkbox, radio-group, switch, slider, select, native-select, combobox, calendar |
| Navegación (6) | tabs, breadcrumb, pagination, navigation-menu, menubar, sidebar |
| Superposiciones y menús (10) | dialog, alert-dialog, sheet, drawer, popover, hover-card, tooltip, dropdown-menu, context-menu, command |
| Estado y avisos (7) | alert, sonner, progress, spinner, skeleton, empty, badge |
| Datos y contenido (8) | card, item, table, chart, avatar, carousel, accordion, collapsible |
| Disposición (5) | separator, scroll-area, resizable, aspect-ratio, direction |
| Conversación (8) | message, bubble, message-scroller, attachment, questionnaire, marker, trace, code-block |

### Showcase

- **Disposición**: una rejilla a pantalla completa con una barra lateral fija (240 px) y un `<main>` con scroll. La
  barra lleva el título, el selector de tema (`ToggleGroup` Oscuro/Claro, por defecto oscuro, solo en estado: sin
  `localStorage`), un buscador que filtra el índice y el índice por grupos con enlaces `#<id>`. Se compone con los
  propios componentes.
- **El tema**: un efecto pone `theme-dark` o `theme-light` en `document.documentElement` (A-9). `<Toaster theme={…} />`
  se monta una sola vez.
- **Sección** (`ShowcaseSection`): `id`, el nombre, una línea de para qué sirve, la ruta de la ficha
  (`.claude/skills/code-ai-profiles-ui/componentes/<id>.md`) y los bloques **Variantes** (cada `variant` y `size` de
  su `cva`), **Estados** (deshabilitado, `aria-invalid`, cargando, vacío, abierto o seleccionado, según aplique) y
  **Composición** (con icono, dentro de un `Field`…). El foco se prueba con el tabulador.
- **Casos especiales**: `sidebar` dentro de un marco `relative h-[440px] overflow-hidden [transform:translateZ(0)]`
  (el `transform` contiene su `position: fixed`); `sheet`, `drawer`, `dialog` y `command` se abren con botón; `avatar`
  solo con `AvatarFallback` (sin URL); `carousel` y `aspect-ratio` con bloques de color; `chart` con datos inventados.
- **Textos** en español y claramente de ejemplo («Perfil de ejemplo»). Nada que parezca un prompt, una ruta real ni
  una credencial.
- El código del showcase vive en `src/showcase/`. Como `src/main.tsx`, su `main.tsx` importa CSS: es la otra entrada.

### Skill `code-ai-profiles-ui`

- `SKILL.md` (menos de 12 KB; descripción de menos de 400 caracteres): cuándo usar `components/ui` y cuándo el CSS
  propio, cómo se importa (`@/components/ui/<id>`), el tema en dos líneas con enlace a `tema.md`, cómo añadir o
  actualizar un componente (`pnpm exec shadcn add <id>`, **nunca `--overwrite`**, descartar los cambios de
  `showcase.css`, añadir la sección y la ficha), el origen (`radix-vega`, shadcn 4.22.1, la fecha de descarga) y
  el **índice**: una tabla por grupo con el componente, para qué sirve en una línea y el enlace a la ficha.
- `tema.md`: el mapa de tokens de arriba, la regla de A-3 y A-9, y cómo añadir un `--ui-*`.
- `componentes/<id>.md`, una por componente, con estas secciones: **Para qué** · **Cuándo sí / cuándo no** (frente
  al CSS propio y a `components/`: `ModalFrame`, `ConfirmDialog`, `EmptyState`, `LoadingCards`, `Metric`) ·
  **Importación** · **Uso mínimo** (un bloque de código real que compile) · **Variantes y tamaños** · **Estados** ·
  **Accesibilidad** (etiqueta en español, `aria-label` en los botones de solo icono) · **Tokens que usa** ·
  **Diferencias con el registro** · **Qué no hacer** · **En el showcase** (`/showcase.html#<id>`).

### Reglas y skill de frontend

- `.metodo/reglas/frontend.md`: la línea 2 («No se migra…») cambia a: lo existente sigue con CSS propio; el
  catálogo shadcn/ui vive en `src/components/ui` (HU-0014), con su tema en `src/styles/ui-theme.css` y la skill
  `code-ai-profiles-ui`; hoy solo lo usa el showcase; una pantalla lo adopta solo con una historia que cargue
  Tailwind en la app, sin restilizar lo existente ni duplicar primitivas. Se añade una línea: los componentes de
  `components/ui` son código propio y no se regeneran con `--overwrite`. Cada diferencia con el registro, en su ficha.
- Skill de frontend: la descripción, «La regla de oro», la estructura (`components/ui`, `hooks`, `lib/utils.ts`,
  `showcase/`), «Estilos» (Tailwind solo en el showcase) y «Lo que no se toma prestado» (Tailwind, shadcn, `cn`, `cva`
  y lucide **solo** dentro de `components/ui` y `showcase/`; en la app siguen `Icons.tsx` y el CSS propio). Se apunta a
  `code-ai-profiles-ui`. **Sigue en 170 líneas o menos**: se sustituye, no se añade.
- `metodo.mjs generar` lo corre el orquestador, para que el agente frontend lleve las reglas nuevas.

### Pruebas

`tests/ui-isolation.test.ts` (`node --test`, solo `node:fs`; script `test:ui`; paso en `validate.yml`). Comprueba que:

1. `src/styles/index.css` y `src/main.tsx` no mencionan `tailwindcss`, `ui-theme`, `shadcn` ni `showcase`;
2. ningún archivo de `src/app`, `src/features`, `src/lib` (salvo `utils.ts`) ni `src/components/*.tsx` importa
   `components/ui`, `@/components/ui`, `@/hooks`, `lucide-react` ni `radix-ui`. La historia que adopte los
   componentes cambiará esta prueba a propósito;
3. ningún archivo de `src/components/ui` ni de `src/hooks` contiene `var(--muted)` (A-3);
4. `index.html` no menciona `showcase`.

La entrada en `stack.comandos` de `.metodo/config.json` la añade el orquestador. Lo visual (AC-02, AC-03) no se prueba
con código: lo revisa la persona.

### Riesgos

| | Riesgo | Cómo se evita |
| --- | --- | --- |
| R-1 | Tailwind o el preflight llegan a la app | A-1, hash de `dist/` y del CSS en desarrollo, `tests/ui-isolation.test.ts` |
| R-2 | `pnpm add` mueve una versión ya instalada (vite, react, rollup, esbuild) y cambia el bundle | hash de `dist/`; si cambia, `git diff pnpm-lock.yaml` sobre esas claves y se vuelve a architect |
| R-3 | Un componente no compila con `tsc` (rdp 10, resizable 4, recharts 3.8) | `pnpm build` en el paso 2; arreglo mínimo anotado. Si no es mínimo, se vuelve |
| R-4 | Colisión `--primary`/`--muted` | A-3 y la prueba 3 |
| R-5 | En la app, `.theme-light` va en `.desktop-shell` y los portales de Radix van a `body`, así que se verían en oscuro | No afecta a esta historia (A-9). Queda anotado en la skill para la historia que adopte los componentes (`container` del portal o la clase en `<html>`) |
| R-6 | La CLI reescribe `showcase.css`, `tsconfig` u otros archivos fuera de lo previsto | `git status` tras `shadcn add`; se revierte todo lo que no esté en § Archivos |
| R-7 | Más superficie de dependencias de desarrollo (`shadcn` arrastra babel, ts-morph y el SDK de MCP) | Solo `devDependencies`, sin scripts de instalación, nunca en el bundle. La alternativa (copiar `shadcn/tailwind.css` y usar `pnpm dlx`) queda descartada por D-5 |
| R-8 | Contraste 3:1 del botón principal | Igual que la app (aviso 4). Lo decide la persona |

### Secuencia (un commit por paso, con `HU: HU-0014`)

| # | Paso | Verificación |
| --- | --- | --- |
| 0 | Línea base, sin commit: `pnpm build`; `find dist -type f \| sort \| xargs shasum -a 256`; con `pnpm dev`, `curl -s "http://127.0.0.1:1420/src/styles/index.css?direct" \| shasum -a 256` | Guardar las salidas fuera del repo |
| 1 | Tailwind, `shadcn` y `tw-animate-css` (dev, exactos); `vite.config.ts`; `tsconfig.json`; `components.json`; `showcase.html` y un `src/showcase/` mínimo | `pnpm ignored-builds` vacío; `pnpm build` con `dist/` idéntico; `/` con el CSS idéntico; `/showcase.html` pinta un botón con utilidades |
| 2 | `pnpm exec shadcn add --all --yes` (sin `--overwrite`); A-6, A-7 y A-8; `pnpm remove next-themes` | `git status` solo en § Archivos; 63 componentes; `rg -n "IconPlaceholder\|@/registry\|next-themes" src` vacío; `rg -n "\bcn-(menu\|rtl\|font\|logical)" src/components/ui` (anotar lo que quede); `pnpm build` y `dist/` idéntico |
| 3 | `ui-theme.css`, el `showcase.css` definitivo y los ajustes 1 a 3 | En el showcase mínimo: botón, input, diálogo y menú en oscuro y en claro con los colores de la tabla; `dist/` idéntico |
| 4 | El showcase: disposición, índice, tema, `<Toaster>` y las 63 secciones (puede ir en 2 o 3 commits por grupos) | AC-01, AC-02 y AC-03 a mano; consola sin errores; en Red, solo `127.0.0.1` |
| 5 | La skill `code-ai-profiles-ui` (SKILL.md, tema.md y 63 fichas) | Las 63 fichas existen (`ls … \| wc -l`); `node .metodo/scripts/metodo.mjs validar` sin avisos de tamaño |
| 6 | `.metodo/reglas/frontend.md` y la skill de frontend | Skill de 170 líneas o menos; sin frases que contradigan la HU-0014 |
| 7 | `tests/ui-isolation.test.ts`, `test:ui` y el paso en `validate.yml` | `pnpm test:ui`; las relacionadas |
| 8 | Cierre técnico, sin commit | `pnpm build` con `dist/` idéntico a la línea base; `rg -l "tailwindcss\|--tw-" dist` vacío; `ls dist` sin showcase; CSS de `/` idéntico; `node .metodo/scripts/config.mjs check`; `rm -rf node_modules && pnpm install --frozen-lockfile && pnpm build` |

**Paralelismo**: después del paso 3 pueden trabajar dos implementadores a la vez, uno en el paso 4 (`src/showcase/`) y
otro en el paso 5 (`.claude/skills/code-ai-profiles-ui/`), porque no comparten archivos. Si no, en orden.

## Briefs y orden

Un solo rol: `briefs/frontend.md`. **Modelo: sonnet.** No toca dinero, máquina de estados, permisos, sesión,
migraciones, contratos en producción, datos personales ni concurrencia. Es mucho volumen, pero el brief deja el riesgo
técnico resuelto, y el aislamiento se mide con hashes.

## Revisión técnica

Antes de la prueba humana: el diff de `vite.config.ts`, `tsconfig.json`, `package.json` y el lockfile (que no se
mueva nada de lo existente), `ui-theme.css` contra la tabla, la lista cerrada de ajustes, las reglas de dependencias y
los hashes de la entrega.
