---
name: code-ai-profiles-ui
description: Catálogo shadcn/ui de Code AI Profiles (63 componentes en src/components/ui con el tema de la app) y su showcase local. Cárgala antes de usar, estilizar, añadir o actualizar un componente de components/ui, o de tocar src/showcase o ui-theme.css.
---

# Design system · shadcn/ui

El catálogo vive en `src/components/ui/` (HU-0014): **código propio** descargado del registro `radix-vega`
(shadcn 4.22.1, 2026-10-28) y estilizado con los tokens de la app. **Desde HU-0016 es la interfaz de la app**: Tailwind
se carga en `src/styles/index.css`, el CSS propio se retiró y las pantallas se componen con estos componentes y
utilidades. El showcase (`pnpm dev` → `http://127.0.0.1:1420/showcase.html`) enseña los 63 con los mismos tokens; no
entra en `dist/`.

## Cuándo usar cada cosa

1. **Una pieza de la app que ya lo resuelve** (abajo): úsala antes de componer otra vez el catálogo.
2. **Un componente del catálogo**, con clases de Tailwind sobre los tokens. Si el ajuste es el aspecto de la app
   en todos los usos (el radio de un modal, su scroll), va **en el componente**, con su línea en «Diferencias con el
   registro» de la ficha; si es de una pantalla, en su `className`.
3. Un componente que falta no se inventa: viene del registro (`pnpm exec shadcn add <id>`). Ni CSS propio, ni otra
   librería de componentes o de iconos (lucide, más `BrandMark`).

## Piezas de la app sobre el catálogo

| Pieza | Dónde | Para qué |
| --- | --- | --- |
| `BrandMark` | `src/components` | La marca (nube) y el icono por defecto de una instancia |
| `EmptyState` | `src/components` | Vacíos de página: sin fuente, sin instancias, sin coincidencias (`Empty`) |
| `NoticeAlert` | `src/components` | Un aviso con icono, título, acción y pie (`Alert`) |
| `PageHeader`, `PageContent`, `PageSkeleton` | `src/app/layout` | La barra, el cuerpo con scroll y la carga de una página |
| `InstanceAvatar`, `InstanceStatusBadge` | `features/instances` | Icono con punto de estado; el estado con sus palabras |
| `UsageMeter`, `UsageBar` | `features/instances` | Uso de sesión y semanal (`Card`/`Progress`) |
| `SessionItem`, `SessionList`, `SessionContextMeter` | `features/sessions` | Una sesión, la lista y su contexto (`Item`) |
| `ProjectInitial`, `StateBar`, `StateLegend`, `StateDot` | `features/projects` | La inicial del proyecto (16, 40, 64) y la barra por estados con su leyenda; «en espera» lleva trama y marcador hueco (HU-0023) |
| `CopyButton`, `GapTag` | `features/projects` | Copiar un texto con `navigator.clipboard` (112 px, «Copiado», en español; `iconOnly` para el bloque de código) y la etiqueta discontinua «Sin tiempo» / «Sin métricas» (HU-0025) |

## Cómo se usa

Dentro de `components/ui` se importa con `@/components/ui/<id>`; en la app, con imports relativos
(`../../components/ui/button`). Los componentes usan `cn` del paquete `cn`, `class-variance-authority`, `radix-ui` y
`lucide-react`. Textos en español y `aria-label` en los botones de solo icono. Los textos por defecto que salen en
inglés (spinner, carousel) se pasan o se ocultan (`<Spinner aria-hidden="true" />` dentro de un botón con texto).

## Patrones de la app

- **Diálogos** (A-12): `Dialog` para tareas y `AlertDialog` para confirmar, montados por `DialogHost` con su bandera
  y `open` fijo. `onOpenChange={(open) => { if (!open && !busy) onClose(); }}` guarda a la vez Escape, la X y el clic
  fuera; `closeDisabled={busy}` deshabilita la X. En un `AlertDialog` asíncrono, confirmar es un `Button`, nunca
  `AlertDialogAction` (cerraría antes de marcar `busy`). Ningún `keydown` global para Escape.
- **Tarjetas de opción**: `RadioGroup` > `FieldLabel htmlFor` > `Field orientation="horizontal"` > `RadioGroupItem` +
  `FieldContent`. La elegida toma borde y tinte solos (`has-data-checked`).
- **Avisos**: el tono va en el `Alert` (`text-warning`, `text-success`, `text-primary-text`): su regla
  `*:[svg]:text-current` gana a cualquier color puesto en el icono.
- **Medidores**: `Progress` con `aria-valuenow` a mano (ficha de `progress`) y el color del indicador con
  `[&>[data-slot=progress-indicator]]:bg-…`.
- **Sin** `Toaster` (sonner) ni toast de Radix: registran `visibilitychange`, `focus` y `blur` (R-1, A-13).

## El tema

Los tokens de shadcn (`--background`, `--border`…) salen de los de la app (`--surface`, `--line`…), declarados en
`src/styles/tokens.css`, a través de `src/styles/ui-theme.css`. `--primary` y `--muted` **no** se redeclaran (A-3).
El tema se aplica con `theme-dark` o `theme-light` en `<html>` (A-9), así que los portales lo heredan. Detalle y
cómo añadir un `--ui-*`: [`tema.md`](tema.md).

## Añadir o actualizar un componente

1. `pnpm exec shadcn add <id>`. **Nunca `--overwrite`**: pisaría los ajustes.
2. `git status`: revierte lo que no sea `src/components/ui`, `src/hooks` o `src/lib/utils.ts`, y descarta lo que la
   CLI escriba en `src/showcase/showcase.css` (`git checkout -- src/showcase/showcase.css`).
3. Aplica los ajustes de la lista cerrada (ver «Diferencias con el registro» en las fichas) y que
   `rg -n "next-themes|IconPlaceholder|@/registry|var\(--muted\)" src/components/ui src/hooks` salga vacío.
4. Añade su sección (`src/showcase/sections/<id>.tsx`), su línea en `src/showcase/catalog.ts`, su ficha
   `componentes/<id>.md` y su fila en el índice de abajo.
5. `pnpm build` y `pnpm test:ui`. El CSS de `dist/` crece aunque ninguna pantalla lo use (`@source "../components"`
   lo incluye): anota el tamaño.

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
