---
name: code-ai-profiles-ui
description: Catálogo shadcn/ui de Code AI Profiles (63 componentes en src/components/ui con el tema de la app) y su showcase local. Cárgala antes de usar, estilizar, añadir o actualizar un componente de components/ui, o de tocar src/showcase o ui-theme.css.
---

# Design system · shadcn/ui

El catálogo vive en `src/components/ui/` (HU-0014): **código propio** descargado del registro `radix-vega`
(shadcn 4.22.1, 2026-10-28) y estilizado con los tokens de la app. **Hoy solo lo usa el showcase**
(`pnpm dev` → `http://127.0.0.1:1420/showcase.html`, sin Tailwind en `/` ni en `dist/`). Las pantallas
actuales siguen con el CSS de `src/styles/` y `src/components/`. Una pantalla adopta estos componentes solo
con una historia que cargue Tailwind en la app, sin restilizar lo existente ni duplicar primitivas.

## Cuándo usar cada cosa

- **CSS propio** (`DESIGN.md`, `src/styles/`, `src/components/`): todo lo que ya existe y lo que se construye
  hoy en la app. Antes de crear nada, mira `ModalFrame`, `ConfirmDialog`, `EmptyState`, `LoadingCards`, `Metric`.
- **`components/ui`**: el showcase y, cuando una historia lo autorice, las superficies nuevas.
- Un componente que falta en el catálogo no se inventa: viene del registro (`pnpm exec shadcn add <id>`).

## Cómo se usa

Importa desde `@/components/ui/<id>` (alias `@` → `src`, solo para este código; la app usa imports relativos).
Los componentes usan `cn` del paquete `cn`, `class-variance-authority`, `radix-ui` y `lucide-react`.
Una pieza nueva de la interfaz lleva textos en español y `aria-label` en los botones de solo icono. Los
textos por defecto de algunos componentes salen en inglés (spinner, carousel, cierre del diálogo): pásalos tú.

## El tema

Los tokens de shadcn (`--background`, `--border`…) salen de los de la app (`--surface`, `--line`…) en
`src/styles/ui-theme.css`, que solo importa `src/showcase/showcase.css`. `--primary` y `--muted` **no** se
redeclaran (A-3). El tema se aplica con `theme-dark` o `theme-light` en `<html>` (A-9). Detalle y cómo añadir
un `--ui-*`: [`tema.md`](tema.md).

## Añadir o actualizar un componente

1. `pnpm exec shadcn add <id>`. **Nunca `--overwrite`**: pisaría los ajustes.
2. `git status`: revierte lo que no sea `src/components/ui`, `src/hooks` o `src/lib/utils.ts`, y descarta lo que la
   CLI escriba en `src/showcase/showcase.css` (`git checkout -- src/showcase/showcase.css`).
3. Aplica los ajustes de la lista cerrada (ver «Diferencias con el registro» en las fichas) y que
   `rg -n "next-themes|IconPlaceholder|@/registry|var\(--muted\)" src/components/ui src/hooks` salga vacío.
4. Añade su sección (`src/showcase/sections/<id>.tsx`), su línea en `src/showcase/catalog.ts`, su ficha
   `componentes/<id>.md` y su fila en el índice de abajo.
5. `pnpm build` y `pnpm test:ui`. `dist/` no debe cambiar.

## Índice

### Acciones (5)

| Componente | Para qué |
| --- | --- |
| [`button`](componentes/button.md) | Dispara una acción: seis variantes y ocho tamaños. |
| [`button-group`](componentes/button-group.md) | Une botones, texto y menús en una sola pieza. |
| [`toggle`](componentes/toggle.md) | Botón con estado pulsado o no pulsado. |
| [`toggle-group`](componentes/toggle-group.md) | Conjunto de toggles de selección única o múltiple. |
| [`kbd`](componentes/kbd.md) | Muestra una tecla o un atajo de teclado. |

### Formularios (14)

| Componente | Para qué |
| --- | --- |
| [`field`](componentes/field.md) | Etiqueta, control, descripción y error de un campo de formulario. |
| [`label`](componentes/label.md) | Texto asociado a un control, con su estado deshabilitado. |
| [`input`](componentes/input.md) | Entrada de una línea con sus tipos nativos. |
| [`input-group`](componentes/input-group.md) | Campo con complementos al inicio, al final o en bloque. |
| [`input-otp`](componentes/input-otp.md) | Entrada de código en casillas separadas. |
| [`textarea`](componentes/textarea.md) | Entrada de varias líneas. |
| [`checkbox`](componentes/checkbox.md) | Marca o desmarca una opción, con estado indeterminado. |
| [`radio-group`](componentes/radio-group.md) | Elige una opción entre varias. |
| [`switch`](componentes/switch.md) | Activa o desactiva un ajuste al instante. |
| [`slider`](componentes/slider.md) | Elige un valor o un rango arrastrando. |
| [`select`](componentes/select.md) | Lista desplegable personalizada de opciones. |
| [`native-select`](componentes/native-select.md) | El select del navegador con el aspecto de la app. |
| [`combobox`](componentes/combobox.md) | Campo con búsqueda y lista de opciones, simple o múltiple. |
| [`calendar`](componentes/calendar.md) | Elige un día o un rango de fechas. |

### Navegación (6)

| Componente | Para qué |
| --- | --- |
| [`tabs`](componentes/tabs.md) | Cambia entre vistas de un mismo contenido. |
| [`breadcrumb`](componentes/breadcrumb.md) | Muestra la ruta hasta la página actual. |
| [`pagination`](componentes/pagination.md) | Navega entre páginas de resultados. |
| [`navigation-menu`](componentes/navigation-menu.md) | Enlaces de primer nivel con contenido desplegable. |
| [`menubar`](componentes/menubar.md) | Menús de aplicación en una barra horizontal. |
| [`sidebar`](componentes/sidebar.md) | Navegación lateral que se contrae a iconos. |

### Superposiciones y menús (10)

| Componente | Para qué |
| --- | --- |
| [`dialog`](componentes/dialog.md) | Ventana modal para una tarea corta. |
| [`alert-dialog`](componentes/alert-dialog.md) | Modal que exige confirmar o cancelar una acción. |
| [`sheet`](componentes/sheet.md) | Panel que entra desde un borde de la ventana. |
| [`drawer`](componentes/drawer.md) | Panel que se arrastra para cerrarlo. |
| [`popover`](componentes/popover.md) | Contenido flotante anclado a un botón. |
| [`hover-card`](componentes/hover-card.md) | Vista previa que aparece al apuntar o enfocar. |
| [`tooltip`](componentes/tooltip.md) | Texto breve que explica un control. |
| [`dropdown-menu`](componentes/dropdown-menu.md) | Lista de acciones que se abre desde un botón. |
| [`context-menu`](componentes/context-menu.md) | Lista de acciones que se abre con el clic derecho. |
| [`command`](componentes/command.md) | Búsqueda de órdenes con lista filtrable. |

### Estado y avisos (7)

| Componente | Para qué |
| --- | --- |
| [`alert`](componentes/alert.md) | Mensaje destacado dentro de la página. |
| [`sonner`](componentes/sonner.md) | Notificaciones temporales (toast). |
| [`progress`](componentes/progress.md) | Barra de avance de una tarea. |
| [`spinner`](componentes/spinner.md) | Rueda que indica que algo está en curso. |
| [`skeleton`](componentes/skeleton.md) | Marcador de posición mientras carga el contenido. |
| [`empty`](componentes/empty.md) | Mensaje cuando no hay nada que mostrar. |
| [`badge`](componentes/badge.md) | Marca corta de estado o categoría. |

### Datos y contenido (8)

| Componente | Para qué |
| --- | --- |
| [`card`](componentes/card.md) | Contenedor con cabecera, contenido y pie. |
| [`item`](componentes/item.md) | Fila con icono, título, descripción y acciones. |
| [`table`](componentes/table.md) | Datos en filas y columnas. |
| [`chart`](componentes/chart.md) | Gráficos de barras y líneas con el tema de la app. |
| [`avatar`](componentes/avatar.md) | Imagen o iniciales de una persona o perfil. |
| [`carousel`](componentes/carousel.md) | Desplaza varios bloques en horizontal o vertical. |
| [`accordion`](componentes/accordion.md) | Secciones que se despliegan una a una o varias. |
| [`collapsible`](componentes/collapsible.md) | Muestra u oculta un bloque de contenido. |

### Disposición (5)

| Componente | Para qué |
| --- | --- |
| [`separator`](componentes/separator.md) | Línea que divide contenido. |
| [`scroll-area`](componentes/scroll-area.md) | Zona desplazable con barras propias. |
| [`resizable`](componentes/resizable.md) | Paneles cuyo tamaño se ajusta arrastrando. |
| [`aspect-ratio`](componentes/aspect-ratio.md) | Mantiene una proporción fija. |
| [`direction`](componentes/direction.md) | Proveedor de dirección de lectura (izquierda a derecha o al revés). |

### Conversación (8)

| Componente | Para qué |
| --- | --- |
| [`message`](componentes/message.md) | Una intervención de una conversación, con avatar y pie. |
| [`bubble`](componentes/bubble.md) | Globo de texto con siete variantes. |
| [`message-scroller`](componentes/message-scroller.md) | Lista de mensajes que se ancla al final. |
| [`attachment`](componentes/attachment.md) | Archivo adjunto con su estado de carga. |
| [`questionnaire`](componentes/questionnaire.md) | Preguntas paso a paso con opciones o texto. |
| [`marker`](componentes/marker.md) | Divisor con texto dentro de una conversación. |
| [`trace`](componentes/trace.md) | Pasos de una tarea con su estado. |
| [`code-block`](componentes/code-block.md) | Código con cabecera, numeración y botón de copiar. |
