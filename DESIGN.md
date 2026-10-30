---
name: Lumina Desktop
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#20201f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353535'
  on-surface: '#e5e2e1'
  on-surface-variant: '#dbc1b9'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#a38c85'
  outline-variant: '#55433d'
  surface-tint: '#ffb59e'
  primary: '#ffb59e'
  on-primary: '#5c1902'
  primary-container: '#d97757'
  on-primary-container: '#541400'
  inverse-primary: '#99462a'
  secondary: '#c8c6c4'
  on-secondary: '#30302f'
  secondary-container: '#474746'
  on-secondary-container: '#b7b5b3'
  tertiary: '#cdc6b9'
  on-tertiary: '#343027'
  tertiary-container: '#979186'
  on-tertiary-container: '#2e2a22'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdbd0'
  primary-fixed-dim: '#ffb59e'
  on-primary-fixed: '#390b00'
  on-primary-fixed-variant: '#7a2f15'
  secondary-fixed: '#e4e2e0'
  secondary-fixed-dim: '#c8c6c4'
  on-secondary-fixed: '#1b1c1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#eae1d4'
  tertiary-fixed-dim: '#cdc6b9'
  on-tertiary-fixed: '#1e1b13'
  on-tertiary-fixed-variant: '#4b463d'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353535'
typography:
  display:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.05em
  mono-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  sidebar-width: 256px
  gutter: 24px
  margin-page: 40px
  unit-xs: 4px
  unit-sm: 8px
  unit-md: 16px
  unit-lg: 24px
  unit-xl: 32px
---

## Brand & Style
The design system is engineered for a premium desktop experience, drawing inspiration from high-end hardware and modern operating systems. The brand personality is **sophisticated, precise, and effortless**. It targets power users who value clarity and a focused workspace.

The style is a refined **Glassmorphism** mixed with **Minimalism**. It emphasizes the physical properties of light and material: surfaces use varying levels of translucency (acrylic effects), vibrant background blurs, and thin, high-contrast "inner strokes" that simulate the edge of a glass pane. The emotional response should be one of calm control and premium craftsmanship.

## Colors
The palette is rooted in a "Studio" aesthetic, moving away from pure digital blues toward warmer, more organic tones.

- **Primary:** A warm, muted terracotta/clay used sparingly for call-to-actions and active states.
- **Anthracite & Grays:** The foundation of the dark mode. We use a deep black for the lowest layer and varied "Anthracite" shades for floating panels.
- **Accents:** High-quality whites and "Paper" grays are used for primary text to ensure maximum legibility against dark glass backgrounds.
- **Translucency:** Backgrounds should utilize 60-80% opacity with a 30px background blur (Gaussian) to allow desktop wallpapers or underlying content to bleed through subtly.

## Typography
This design system uses **Inter** for its clean, Swiss-inspired readability and high x-height, which performs exceptionally well on high-DPI desktop displays. For technical labels and instance management, we use **Geist** to provide a precise, developer-tool aesthetic.

- **Headlines:** Use tight letter-spacing and semi-bold weights to create a "locked-in" professional look.
- **Body:** Standardized at 14px for density without sacrificing legibility.
- **Labels:** Always uppercase with slight tracking for secondary metadata and sidebar headers.

## Layout & Spacing
The layout follows a **Fixed-Fluid hybrid** model common in desktop apps.
- **Sidebar:** Fixed width (256px, a floating 240px panel with 8px margins) with a semi-transparent acrylic background.
- **Main Content:** Fluid width with a maximum container of 1200px to maintain readability.
- **Margins:** Generous outer margins (32px) provide "breathing room" that signifies a premium application.
- **Grid:** A 12-column grid is used for dashboard views, while single-column layouts are preferred for focused session management.

## Elevation & Depth
Depth is achieved through **material layering** rather than traditional drop shadows.

1.  **Level 0 (Background):** Solid deep anthracite or the desktop wallpaper.
2.  **Level 1 (Sidebar/Base):** 70% opacity with 40px blur. 1px solid border at 10% white (inner glow).
3.  **Level 2 (Cards/Modals):** 85% opacity with 30px blur. Subtle 0.5px white border and a 20px "Ambient Shadow" (Black, 20% opacity).
4.  **Level 3 (Popovers/Tooltips):** Near-opaque (95%) with a crisp 1px border.

Shadows should be "long and soft," simulating a large, overhead light source. Avoid "fuzzy" dark halos.

## Shapes
We use a **highly rounded** geometric language.
- **Standard UI (Buttons/Inputs):** 8px (0.5rem) radius.
- **Large Containers (Cards/Modals):** 16px (1rem) radius.
- **Sidebar Active States:** Use "Squircle" (continuous curvature) shapes where possible for a more organic, Apple-like feel.

## Components
- **Sidebar Navigation:** Use SF-style iconography (thin stroke) with a 24px box. Active states should use a subtle background tint (Anthracite + 5% white) rather than a heavy color block.
- **Session Cards:** These are "glass bricks." Use a subtle gradient (top-left to bottom-right) from 10% white to 5% white. Include a "status dot" using the Primary color.
- **Instance Management Toggles:** A custom pill-shaped track. When "On," the track should use the Primary color; when "Off," it should blend into the glass background with only a stroke visible.
- **"Add Session" Modal:** Should appear as a centered floating pane. Use a heavy backdrop blur (20px) on the content behind it to pull focus. The primary action button should be the only element using a solid, non-transparent color.
- **Iconography:** Use line-based icons with a consistent 1.5pt stroke weight. Rounded ends on all paths.

## Cómo se aplica en Code AI Profiles

Desde HU-0016 la app se construye con el catálogo shadcn/ui de `src/components/ui` (código propio, Tailwind 4) y no
hay CSS propio. Esta guía describe la identidad; los valores reales que la app usa son estos:

- **Tokens**: `src/styles/tokens.css`. Oscuro, la base: superficie `#151615`, texto `#e8e4e2`, apagado `#aaa19e`,
  tenue `#726b68`, terracota `#ff8d6c` (texto y foco) y `#ff5f35` (relleno de la acción primaria), peligro `#ef7e70`;
  líneas y superficies elevadas en blanco translúcido. Claro: superficie `#f3efeb`, texto `#2e2926`, líneas en tierra
  translúcida. Lo que no es un token de la app (el marco de la ventana, el velo y el fondo de los diálogos, el verde y
  el ámbar del contexto de sesión) va como `--ui-*` en `src/styles/ui-theme.css`, con su valor claro.
- **Temas**: oscuro, claro y del sistema, aplicados con `theme-dark` o `theme-light` en `<html>`; diálogos, menús y
  tooltips los heredan.
- **Tipografía**: Inter para la interfaz y JetBrains Mono para datos técnicos (versiones, rutas, modelos, contexto,
  etiquetas en mayúsculas con tracking). Ambas locales (`@fontsource`). Geist no se usa.
- **Escala tipográfica** (HU-0019, HU-0022): siete tamaños, `--fs-micro` a `--fs-dialog`, ocho interlineados `--lh-*` y
  cinco alturas de control `--ctl*`, todos en px enteros y declarados por tamaño en `tokens.css`. No hay factor
  proporcional (`--esc` desapareció): con él un botón de 36 px daba 33,5 y 41,1 px en Compacto y Grande, fuera de la
  retícula de 4 px. El ajuste de Apariencia (compacto, cómodo, grande) los cambia en `<html data-text-size>`, así que
  escala toda la interfaz, también diálogos y menús. Ningún texto baja de 11 px. En la app un texto se escribe
  `text-(length:--fs-<x>)/(--lh-<y>)`.

  | Token | Compacto | Normal | Grande | Uso |
  | --- | --- | --- | --- | --- |
  | `--fs-micro` / `--lh-micro` | 11 / 16 | 11 / 16 | 12 / 16 | mayúsculas, chips, kbd, barra de estado, contexto de sesión |
  | `--fs-small` / `--lh-small` | 11 / 16 | 12 / 16 | 14 / 20 | metadatos, rutas, versiones, pistas |
  | `--lh-prose` (sobre `--fs-small`) | 20 | 20 | 24 | descripciones y párrafos de varias líneas |
  | `--fs-body` / `--lh-body` | 13 / 20 | 14 / 20 | 16 / 24 | sidebar, botones, avisos, título de sesión |
  | `--fs-heading` / `--lh-heading` | 14 / 20 | 15 / 20 | 17 / 24 | títulos de tarjeta |
  | `--fs-title` / `--lh-title` | 15 / 20 | 17 / 24 | 19 / 24 | título de la página, marca del panel |
  | `--fs-figure` / `--lh-figure` | 20 / 24 | 22 / 28 | 26 / 32 | cifras y porcentajes |
  | `--fs-dialog` / `--lh-dialog` | 20 / 24 | 22 / 28 | 25 / 32 | título de diálogo |
  | `--ctl` | 32 | 36 | 40 | botón, pestaña |
  | `--ctl-sm` | 28 | 32 | 36 | botón sm, ítem del sidebar, buscador |
  | `--ctl-lg` | 36 | 40 | 44 | entrada, botón lg, tile de permiso |
  | `--ctl-xs` | 24 | 24 | 28 | botón xs, info |
  | `--ctl-badge` | 24 | 24 | 28 | chips, kbd, contador, BETA |

  El texto gris de lectura es `--muted` (`text-muted-foreground`); `--quiet` queda para puntos, rayas y separadores,
  porque su contraste (3,4:1 en oscuro, 2,9:1 en claro) no basta para texto. En un control de una línea, el
  interlineado es el alto menos 16 (menos 8 en los de 24), de modo que el texto cae en la retícula.
- **Espaciado** (HU-0022): retícula de 4 px. Márgenes, rellenos y huecos solo usan 0, 4, 8, 12, 16, 24, 32 y 48 px
  (`0, 1, 2, 3, 4, 6, 8, 12` de Tailwind); no hay `0.5`, `1.5`, `2.5`, `3.5`, `5`, `7`, `9`, `10`, `11`, `14` ni `px`. Las
  únicas medidas en px son los huecos de posición de los controles nativos (84 px a la izquierda de la barra en macOS,
  160 px a la derecha en Windows y 68 px con el sidebar plegado). Las alturas y anchos arbitrarios son múltiplos de 4.
  Ritmo vertical: dentro de un componente 4 a 12; entre componentes 16; entre bloques de la página y dentro de un
  diálogo 24. La página usa 12 columnas de 68 px con 24 de separación (1080 px); Configuración ocupa 10 (896 px) y los
  diálogos 6 (576 px) u 8 (760 px) más 24 de margen por lado.
- **Radios** (HU-0022): 4 px (kbd, BETA y lo decorativo), 8 (chips y controles de 24 a 32 px), 12 (controles de 36 a
  44), 16 (tarjetas, panel del sidebar, popover), 20 (la ventana en Windows) y 24 (diálogos): `rounded-xs` a
  `rounded-3xl` en `ui-theme.css`. Regla de anidado: un hijo de todo el ancho dentro de un contenedor con relleno
  *p* y radio *R* lleva `max(8, R − p)`; por eso las opciones de una tarjeta, las sesiones y los ítems del sidebar
  llevan 8. Los bordes de 1 px que mueven la retícula (opciones, sesión, alerta, buscador, sidebar, barra de estado y
  ventana de Windows) son anillos (`ring-1 ring-inset`, o `shadow-[inset_…]`), no `border`.
- **Foco y primario** (HU-0022): el anillo de foco es de 2 px en `--ui-primary-text` (7,1:1 en oscuro, 5,3:1 en claro,
  3:1 como mínimo exigido), sin transparencia. El botón primario lleva texto oscuro `#151615` sobre `#ff5f35`
  (6,0:1; el blanco daba 3,03:1) en los dos temas; su hover aclara hacia blanco en lugar de transparentar, para no
  bajar de 4,5:1. Chips, kbd y contadores miden 24 px (28 en Grande).
- **Disposición** (HU-0019): una sola barra de 52 px (la zona de la ventana sobre el sidebar y, a su derecha, las
  migas «Sección › Página» con las acciones), de modo que el contenido empieza a 60 px del borde. El sidebar es un
  panel flotante de 240 px con 8 px de margen (columna de 256 px; plegado, 50 px de panel y 64 de columna), con la marca
  arriba y el número de sesiones de cada perfil. Contenido de hasta 1200 px con márgenes de 32 px (24 px por debajo
  de 1071 px), barra de estado de 36 px (32) y ventana mínima de 980×680.
- **Profundidad**: el marco de la ventana es un degradado con borde interior; los diálogos flotan sobre un velo con
  desenfoque de 18 px. La acción primaria es el único relleno sólido de color.
- **Iconos**: lucide (trazo fino, extremos redondeados) y la marca propia (`BrandMark`), que también es el icono por
  defecto de una instancia.

El detalle del puente con shadcn está en la skill `code-ai-profiles-ui` (`tema.md`) y el de construcción, en
`code-ai-profiles-frontend-react-vite`.
