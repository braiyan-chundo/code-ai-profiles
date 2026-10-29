# Estilos de la app · detalle

Lo que `SKILL.md` resume. Cambió en HU-0019 (barra única, sidebar flotante, escala tipográfica).

## La barra y el sidebar

- `--titlebar-height: 52px` en macOS, Windows y Linux (lo fija `AppShell`). El primer contenido está a **60 px** del borde
  (52 + `pt-2`).
- `Titlebar` es la zona de la ventana sobre la columna del sidebar (`absolute`, `z-20`, ancho `--sidebar-width` o 64 px
  plegado, `min-w-max`), con el `SidebarTrigger`. Hueco izquierdo: **84 px en macOS** (los semáforos van en
  `x:20, y:19`, en `src-tauri/tauri.macos.conf.json`) y 16 px en el resto. En Windows, a la derecha, los tres controles
  propios (3 × 46 px, a 10 px del borde).
- `PageHeader` (fila 1 de `SidebarInset`, 52 px): migas «Sección › Página». Lleva `data-tauri-drag-region` en cada
  elemento sin controles (en Tauri 2 no se hereda). Windows: `pr-[160px]` (y `max-[1070px]:pr-[160px]`, porque
  `max-[1070px]:px-6` lo pisaría). macOS con el sidebar plegado: `pl-[68px]` (idem).
- Sidebar: `variant="floating"`, `--sidebar-width: 256px` (panel de 240 + 8 + 8), `[--sidebar:var(--surface-raised)]` en el
  marco. Plegado: panel de 50 px, columna de 64. Va de y 60 a 8 px del pie. Contadores con `SidebarMenuBadge`.
- Márgenes: `px-8` (`max-[1070px]:px-6`) en `PageHeader`, `FeedbackArea`, `PageContent` y `Statusbar` (36 px; 32 por debajo de
  1071 px). «Escanear sistema» de la barra queda solo con icono por debajo de 1071 px, con CSS (`sr-only` y `w-(--ctl)`).

## La escala

- Siete tamaños `--fs-micro…--fs-dialog` y el factor `--esc` en `tokens.css`; la tabla, en `DESIGN.md`. El ajuste de
  Apariencia los cambia con `:root[data-text-size="compact|large"]`. El campo guardado se sigue llamando
  `sessionTextSize`: son datos de usuario.
- El catálogo se engancha en `ui-theme.css` (`--text-xs` = `--fs-small`, `--text-sm` = `--fs-body`, `--text-base`…`--text-2xl` por
  `--esc`), así que `text-xs` y `text-sm` ya escalan. Los altos de `button`, `input`, `badge`, `kbd` y del sidebar usan
  `--ctl`, `--ctl-sm`, `--ctl-lg`, `--ctl-xs` y `--ctl-badge`. Los iconos y avatares **no** crecen.
- **Por qué `text-(length:--fs-x)`**: `cn` es tailwind-merge. `cn("text-micro", "text-muted-foreground")` devuelve solo el color:
  toma `text-micro` por un color y lo borra. `text-(length:--fs-micro)` se reconoce como tamaño y gana a `text-xs`. El
  interlineado va aparte (`leading-none`).
- Mínimo 11 px: prueba 12 de `test:ui` (los tokens) y, con la app abierta, el guion de consola:
  `[...document.querySelectorAll("body *")].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && e.getClientRects().length).map(e => [parseFloat(getComputedStyle(e).fontSize), e]).filter(([s]) => s < 11)` debe devolver `[]`.
- Las únicas excepciones a «sin `text-[Npx]`» son las tres muestras «Aa» de `AppearanceDialog` (prueba 13).
- Las alturas fijas menores que el texto se quitan (un chip `h-4` con `overflow-hidden` lo recorta).
