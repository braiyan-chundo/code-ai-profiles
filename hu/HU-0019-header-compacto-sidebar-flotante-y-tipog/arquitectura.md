# Arquitectura · HU-0019 · Header compacto, sidebar flotante y tipografía legible

<!-- La escribe architect. Rama hu-0019-ajustes-visuales, HEAD 42b8661. -->

## Análisis

Confianza: **alta** en la forma y **media** en un único punto: si la barra nativa de macOS (Overlay, ≈35 px de alto con
`trafficLightPosition` y = 19) deja pasar los clics a los botones de la barra de 52 px. Se comprueba en el escritorio
(paso 7).

Leído: `hu.md`, `seguimiento.md`, `diseno/vista.md`, `diseno/maqueta.html` (tokens §2 y §3, plantillas A),
`diseno/capturas/01, 07, 13, 15`, `docs/arquitectura/frontend.md`, `src/app/layout/*`, `src/styles/*`,
`src/features/appearance/*`, `src/components/ui/{sidebar,button,input,badge,kbd,dialog,alert-dialog}.tsx`,
`tests/ui-isolation.test.ts`, las revisiones técnicas de HU-0015 y HU-0016, `src-tauri/tauri*.conf.json` y
`graphify query "titlebar sidebar tipografía tokens apariencia tamaño semáforos"`. `graphify-out/` sigue sin cambios.

### Supuestos

- **S-1** · La maqueta aprobada es la variante A con los cuatro detalles de A (bitácora, 21:08). Si el mantenedor
  quisiera B o C, cambian los pasos 3 y 4. El paso 1 y el 2 valen para las tres.
- **S-2** · Los botones HTML que caen dentro de la barra nativa de macOS reciben el clic, como pasa hoy con la zona de
  arrastre. Si no fuera así, se baja `y` o se cambia la altura del título; no afecta a Windows ni a Linux.
- **S-3** · Las preferencias guardadas (`code-ai-profiles:appearance`) no cambian de forma: el campo sigue siendo
  `sessionTextSize` con `compact | comfortable | large`. No hay migración.

### Preguntas

Ninguna bloquea. Dos decisiones que tomo yo y la persona puede revertir sin coste:

1. **La etiqueta «Cómodo»** del tamaño intermedio se queda (la maqueta y la historia dicen «normal»). Cambiarla es
   una línea en `AppearanceDialog.tsx`.
2. **«AUTO · 60S»** sigue visible a 980 px. La maqueta lo oculta por debajo de 1071 px, pero AC-05 pide que no se
   pierda nada con la ventana al mínimo, y cabe con el texto en grande.

### Impacto

| Símbolo que cambia | Consumidores (`grafo.mjs impacto`, `rg`) | Qué se rompe si se hace mal |
| --- | --- | --- |
| `Titlebar` | `AppShell` | El arrastre de la ventana y los controles de Windows |
| `PageHeader` | `DashboardRoute`, `InstanceRoute`, `OriginalRoute` | El título y las acciones de cada página |
| `AppShell` (rejilla y variables) | `router.tsx` | Todas las pantallas |
| `AppSidebar` | `AppShell` | La navegación, la búsqueda y Ctrl/⌘ F |
| `--session-*` y `data-session-text` | `SessionList`, `SessionContextMeter`, `AppearanceDialog`, `AppearanceProvider`, `tokens.css` | El texto de las sesiones |
| `text-xs`/`text-sm`/`text-base`…`text-2xl` (pasan a la escala) | el catálogo (≈130 usos) y 28 usos de la app | El tamaño de casi todo el texto |
| `h-9`/`h-8`/`h-10`/`h-6`/`h-5` de `button`, `input`, `badge`, `kbd` y el `SidebarMenuButton` | toda la app y el showcase | La altura de los controles |
| `trafficLightPosition` | `tauri.macos.conf.json` (solo macOS) | Los semáforos tapan el botón de plegar o quedan fuera de la barra |

- **Contrato IPC**: no. Ni `types.ts`, ni `bridge.ts`, ni `src-tauri/src`. Solo una línea de configuración de Tauri.
- **Datos guardados**: no cambia su forma (S-3). El atributo `data-session-text` de `<html>` se renombra; no se
  guarda en ningún sitio.
- **Privacidad**: no aparece ningún dato nuevo. El contador del sidebar es `codeSessions.length`, la misma cifra que ya
  enseñan la página («3 sesiones») y el resumen. Ningún título de sesión sale de donde ya estaba.
- **Dinero, permisos, red, dependencias, telemetría**: ninguno. La capacidad `core:window:allow-start-dragging` ya existe.
- **Riesgosa**: no por dominio, pero toca el texto de toda la interfaz y el armazón de las tres plataformas. Lleva
  revisión técnica (el método la pide en toda historia).

### Las restricciones por plataforma

| | macOS | Windows | Linux |
| --- | --- | --- | --- |
| Ventana | Overlay, título oculto, semáforos nativos | sin decoraciones, transparente, marco de 20 px | decoraciones del gestor |
| Barra | 52 px; hueco de 84 px a la izquierda (semáforos en x 20) | 52 px; 160 px reservados a la derecha para los tres controles propios (3 × 46 + 10) | 52 px, sin controles; hueco de 16 px |
| Plegar | botón en x 84 | botón en x 16 | botón en x 16 |
| Arrastre | zona izquierda y `PageHeader` | ídem; los controles no arrastran | ídem (además, la barra nativa) |
| Cómo se comprueba | `pnpm dev` (el mock dice macOS) y `pnpm tauri dev` en este Mac | el instalador de CI y la persona | el instalador de CI y la persona |

## Solución

No hay contrato entre capas. Lo que se fija aquí son las decisiones de la interfaz (A-n). Las reglas que perduran pasan
a `docs/arquitectura/frontend.md` (delta escrito con esta arquitectura).

### A-1 · La barra: una sola fila de 52 px, sin portal

La barra deja de ser una franja a todo el ancho encima de todo. La rejilla queda como en la maqueta: arriba a la
izquierda, la zona de la ventana; arriba a la derecha, la barra de la página. Cada ruta sigue pintando su `PageHeader`
sin envoltorio, ahora a la altura de la barra. No hace falta portal ni contexto nuevo.

```text
SidebarProvider (marco: flex en fila, h-full, transform, overflow-hidden; en Windows, esquinas de 20 px)
├─ Titlebar        absolute top-0 left-0 z-20 · h-(--titlebar-height) · hueco por plataforma + SidebarTrigger
│                  (+ en Windows, los tres controles: absolute top-0 right-2.5 z-20)
├─ AppSidebar      variant="floating" · el contenedor fixed empieza en top-(--titlebar-height)
└─ SidebarInset    grid-rows-[var(--titlebar-height)_auto_minmax(0,1fr)_auto]
   ├─ PageHeader   fila 1: «Sección › Página» y acciones; zona de arrastre
   ├─ FeedbackArea fila 2
   ├─ PageContent  fila 3
   └─ Statusbar    fila 4
```

- `--titlebar-height: 52px` en las tres plataformas (hoy 94 en macOS y 64 en el resto). La fija `AppShell`.
- **`Titlebar`** ya no lleva la marca: es la zona sobre la columna del sidebar. Su ancho es `w-(--sidebar-width)`
  desplegado y `w-16` plegado, con `min-w-max`, para que en macOS plegado (84 + 32 px) no recorte el botón. Hueco
  izquierdo: `pl-[84px]` en macOS y `pl-4` en el resto. Toda ella lleva `data-tauri-drag-region`, y el botón no.
- **`PageHeader`**: `row-start-1 flex h-(--titlebar-height) items-center justify-between gap-4 px-8 max-[1070px]:px-6`,
  con `data-tauri-drag-region` en el `header`, en el grupo del título, en la sección y en el `h1` (en Tauri 2 el
  atributo no se hereda). En Windows, `pr-[160px]`. En macOS con el sidebar plegado, `pl-[68px]`: 64 de columna + 68 =
  132, a la derecha del botón de plegar. Lee `useRuntimePlatform()` y `useSidebar().state`.
- Las migas: `<span>` con la sección (`--fs-body`, `font-medium`, `text-muted-foreground`), `ChevronRightIcon`
  (`size-3.5`, `text-muted-foreground`, `aria-hidden`) y el `h1` (`--fs-title`, `font-semibold`,
  `tracking-[-0.025em]`, `truncate`). No es un enlace: no hay navegación nueva. La sección del detalle de instancia
  pasa de «Instancia» a «Instancias», como en la maqueta.
- **Dashboard**: los dos botones pasan a tamaño `default` (36 × `--esc`). «Escanear sistema» envuelve su texto en
  `<span className="max-[1070px]:sr-only">` y, por debajo de 1071 px, queda cuadrado
  (`max-[1070px]:w-(--ctl) max-[1070px]:px-0`), con `Tooltip` «Escanear sistema». Sin listener de `resize`: el corte
  lo hace CSS.
- **Semáforos (macOS)**: `trafficLightPosition` pasa de `{ "x": 28, "y": 40 }` a `{ "x": 20, "y": 19 }` en
  `src-tauri/tauri.macos.conf.json`. Es una línea de configuración, sin Rust: **la hace el orquestador** (no hay
  despacho a backend). No hay ningún `set_traffic_light*` en `src-tauri/src` que la pise (comprobado con `rg`).
- Primer contenido a **60 px** (52 + 8) en las tres plataformas. Hoy está a 193 en macOS y a 163 en el resto.

### A-2 · Sidebar flotante con el catálogo

- `Sidebar variant="floating" collapsible="icon"` (hoy usa la variante por defecto). El catálogo ya resuelve
  el margen (`p-2`), el radio (`rounded-lg` = 14 px), la sombra y el ancho plegado
  (`calc(var(--sidebar-width-icon) + 1rem)` = 64 px de columna).
- `SIDEBAR_STYLE`: `--sidebar-width: 256px`, para un panel de 240 + 8 + 8. En el marco, `[--sidebar:var(--surface-raised)]`
  (hoy `--surface-soft`). Anillo de la maqueta: en el `className` del `Sidebar`, `*:data-[slot=sidebar-inner]:ring-foreground/10`.
- El panel va de y 60 a 8 px del pie, porque el contenedor `fixed` sigue con `top-(--titlebar-height)! h-auto!`
  dentro del marco con `transform`.
- **Cabecera del panel**: `BrandMark` (20 px) + «Code AI Profiles» (`--fs-title`, `font-bold`, `tracking-[-0.04em]`) +
  «BETA» (`--fs-micro`, mono). Plegado, solo la marca, centrada. Debajo, la búsqueda (como hoy; plegado no se ve).
- **Contadores**: `SidebarMenuBadge` con `codeSessions.length` de cada instancia y
  `system.originalCodeSessions.length` de la original. Solo si son mayores que 0 y hay original detectada. Mono,
  `--fs-micro`, `rounded-full bg-(--surface-soft)`, alto `--ctl-badge`, centrado con `top-1/2! -translate-y-1/2`, y
  `<span className="sr-only"> sesiones</span>`. Plegado, el catálogo ya los oculta.
- **Plegado**: entre grupos, una raya de 20 px en lugar de la etiqueta
  (`SidebarSeparator` con `hidden group-data-[collapsible=icon]:block`).
- Se conserva todo lo de hoy: búsqueda y Ctrl/⌘ F (que despliega y enfoca), limpiar, `Kbd`, esqueleto, «Sin
  instancias todavía», «Sin coincidencias», «Nueva instancia» con su `title`, tooltips con el estado, «Escanear
  sistema» (con su giro) y «Apariencia» al pie, y el estado plegado guardado en las preferencias.

### A-3 · La escala tipográfica: seis tokens, un factor y el catálogo enganchado

**Tokens en `src/styles/tokens.css`** (sustituyen al bloque `--session-*`):

| Token | Compacto | Normal | Grande | Uso |
| --- | --- | --- | --- | --- |
| `--fs-micro` | 11 | 11 | 12 | mayúsculas, chips, kbd, barra de estado, contexto de sesión |
| `--fs-small` | 11 | 12 | 14 | metadatos, rutas, versiones, pistas, descripciones, tooltip |
| `--fs-body` | 13 | 14 | 16 | sidebar, botones, avisos, título de sesión |
| `--fs-heading` | 14 | 15 | 17 | títulos de tarjeta, vacíos |
| `--fs-title` | 15 | 17 | 19 | título de la página, marca del panel |
| `--fs-figure` | 20 | 22 | 26 | cifras y porcentajes |
| `--fs-dialog` | 20 | 22 | 25 | título de diálogo (**añadido**: la maqueta no dibuja diálogos; hoy es `text-[22px]` fijo) |
| `--esc` | 0.93 | 1 | 1.143 | factor del alto de los controles |

En `:root` van los valores normales y, además, `--ctl: calc(36px * var(--esc))`, `--ctl-sm` (32), `--ctl-lg` (40),
`--ctl-xs` (24) y `--ctl-badge` (20). Compacto y grande van en `:root[data-text-size="compact"]` y
`:root[data-text-size="large"]`. Todo está en `:root`, así que las `calc` se resuelven donde cambia `--esc`.

**El atributo.** `AppearanceProvider` pone `data-text-size` (antes `data-session-text`) en `<html>`, con los mismos
valores. El campo guardado sigue siendo `sessionTextSize` (S-3). El tipo `SessionTextSize` no se renombra.

**El catálogo crece sin tocar sus 63 componentes.** En el `@theme inline` de `ui-theme.css`:

```css
--text-xs: var(--fs-small);   /* 12 en normal, igual que hoy */
--text-sm: var(--fs-body);    /* 14 en normal, igual que hoy */
--text-base: calc(16px * var(--esc));
--text-lg: calc(18px * var(--esc));
--text-xl: calc(20px * var(--esc));
--text-2xl: calc(24px * var(--esc));
```

Los `--text-*--line-height` por defecto son proporciones sin unidad, así que siguen valiendo. En normal, el
catálogo no cambia ni un píxel.

**La app usa `text-(length:--fs-*)`, nunca una utilidad con nombre propio.** Comprobado con el `cn` del proyecto
(drop-in de tailwind-merge): `cn("text-micro", "text-muted-foreground")` devuelve `"text-muted-foreground"`, es decir,
toma `text-micro` por un color y lo borra. En cambio, `text-(length:--fs-micro)` se reconoce como tamaño y gana a
`text-xs`/`text-sm` del componente. Es la misma forma que ya usaban las sesiones. El interlineado va aparte
(`leading-none`, `leading-tight`), no con `/`.

**Alto de los controles con `--esc`** (ajuste del catálogo, con su ficha):

| Componente | Hoy | Pasa a |
| --- | --- | --- |
| `button.tsx` | `h-9`/`size-9`, `h-8`/`size-8`, `h-10`/`size-10`, `h-6`/`size-6` | `h-(--ctl)`/`size-(--ctl)`, `-sm`, `-lg`, `-xs` |
| `input.tsx` | `h-9` | `h-(--ctl)` |
| `badge.tsx`, `kbd.tsx` | `h-5` (y `min-w-5` en kbd) | `h-(--ctl-badge)` (`min-w-(--ctl-badge)`) |
| `sidebar.tsx` | `SidebarMenuButton` `h-8` (tamaño default), `SidebarInput` `h-8` | `h-(--ctl-sm)` |

No cambia: `group-data-[collapsible=icon]:size-8!` (plegado, el panel de 48 px no crece), los iconos (16 px), los
avatares y los controles de ventana de Windows (46 × 36). Esto **se aparta de la maqueta**, que también escala
iconos y avatares: escalar los iconos desbordaría el panel plegado.

**Mínimo de 11 px.** Por construcción, el token más pequeño vale 11. Lo vigila `test:ui` (más abajo) y, con la app
abierta, el guion de comprobación del paso 7.

**`--quiet` deja de colorear texto.** Da 3,4:1 en oscuro y 2,9:1 en claro. Todo `text-(--quiet)` pasa a
`text-muted-foreground`. `--quiet` queda para puntos, rayas y separadores (`bg-(--quiet)`). La paleta no cambia.

**Las sesiones.** `--session-title-size` → `--fs-body`. `--session-meta-size` → `--fs-small`.
`--session-context-size`, `--session-hint-size` y `--session-badge-size` → `--fs-micro`. `--session-row-height`
desaparece (alto automático). `--session-track-height` → `h-1` fijo (4 px, como la maqueta).

### A-4 · Lo que se migra en la app (tabla de equivalencias)

| Hoy | Pasa a |
| --- | --- |
| `text-[7–10px]` en mayúsculas, chips, badges, `Kbd`, leyendas, eyebrow, BETA, barra de estado, «Usado» | `--fs-micro` |
| `text-[9–11px]` en metadatos mono, rutas, «Versión …», hora de captura, `FieldDescription`, `AlertDescription`, pistas de `SummaryCards`, valores de `UsageBar` (`text-sm`) | `--fs-small` |
| `text-[13px]` (título de `NoticeAlert`, títulos y valores en diálogos, valor de `MiniStat`) | `--fs-body` |
| `CardTitle … text-sm` (`UsageRanking`, `InstanceDetail`, `OriginalDetail`) | `--fs-heading` |
| `text-[22px]` de `PageHeader` y `text-xl` de la marca | `--fs-title` |
| `text-2xl/none` (`SummaryCards`) y `text-2xl/[0.9]` (`UsageMeter`) | `--fs-figure` + `leading-*` |
| `text-[22px]` de `DialogTitle` y `AlertDialogTitle` (catálogo) | `--fs-dialog` |
| `text-(length:--session-*)` | según A-3 |
| `text-[11px]`, `text-[15px]` y `text-[19px]` de las muestras de `AppearanceDialog` | **se quedan**: enseñan cada opción con un tamaño fijo |

Los `text-xs` y `text-sm` que ya hay en la app se quedan, porque ahora escalan. Las alturas fijas menores que el texto
nuevo se quitan, por ejemplo el `h-4` del `InstanceStatusBadge` en `UsageRanking`, que con `overflow-hidden` lo
recortaría. Los chips llevan `leading-none`.

### A-5 · Márgenes y barra de estado

- `PageContent`: `px-8 pt-2 pb-6 max-[1070px]:px-6` (hoy 38/25). `FeedbackArea`: los mismos `px` y `not-empty:pt-2`.
- `Statusbar`: `h-9 max-[1070px]:h-8` (36/32), `px-8 max-[1070px]:px-6`, `--fs-micro`, `text-muted-foreground` y
  separadores de 14 px. «administrados» se oculta por debajo de 1071 px, como hoy. «AUTO · 60S» se queda (pregunta 2).

### A-6 · Apariencia

- Leyenda «Tamaño del texto» y pista «Se aplica a toda la interfaz». `aria-label` del grupo: «Tamaño del texto».
  Descripción del diálogo: «Personaliza el tema y el tamaño del texto».
- La vista previa (`SessionItem`) se queda, sin `min-h-(--session-row-height)`.

### A-7 · `test:ui` (el mismo script; tres pruebas nuevas y sus canarios)

- **12 · Escala.** `tokens.css` declara los siete `--fs-*` y `--esc` en `:root` y en los dos
  `:root[data-text-size=…]`. Cada `--fs-*` vale **≥ 11 px** en los tres, y grande es mayor que normal en todos.
  `ui-theme.css` lleva `--text-xs: var(--fs-small)` y `--text-sm: var(--fs-body)`. Cada `--fs-<x>` que se use en
  `src/**/*.tsx` existe en `tokens.css`: un nombre mal escrito dejaría el texto sin tamaño, y no se vería.
- **13 · Sin tamaños sueltos.** Ningún `text-[<n>px|rem|em]` en `app/`, `features/` ni `components/` fuera de
  `components/ui/`, salvo las tres muestras de `AppearanceDialog.tsx` (lista cerrada). Ningún `text-[<n>px]` en
  `components/ui/`. Ninguna mención a `--session-` ni a `data-session-text`/`dataset.sessionText` en `src/`.
- **14 · `--quiet` no colorea texto.** Ningún `text-(--quiet)` en `src/`.
- **9 · Canario**: cada detector nuevo marca una fuga sintética.

`test:appearance` no cambia: `appearance-preferences.ts` no cambia.

### Datos

No cambian. `localStorage` sigue igual (S-3).

### Variables de entorno nuevas

Ninguna.

### Señales

No aplica: la app no tiene observabilidad ni telemetría.

### Riesgos

| Id | Riesgo | Mitigación |
| --- | --- | --- |
| R-1 | Romper el orden de `focus` de HU-0015 | `DashboardRuntime.tsx` y los hooks de ejecución sin diff. Sin listeners nuevos: el corte de 1071 px es CSS. El `Tooltip` ya está en el bundle. `test:ui` 8 sin cambios |
| R-2 | `cn` borra una utilidad de tamaño | Solo `text-(length:--fs-*)` (A-3). La prueba 12 vigila los nombres |
| R-3 | Texto recortado por alturas fijas (chips `h-4`/`h-5` con `overflow-hidden`, el alto fijo de las sesiones) | `--ctl-badge`, `leading-none` y fuera `--session-row-height`. El paso 7 recorre los tres tamaños |
| R-4 | macOS: la barra nativa (≈35 px) se traga el clic del botón de plegar o de las acciones | Paso 7 en `pnpm tauri dev`. Si pasa, se ajusta `y` (S-2) |
| R-5 | Windows: el panel flotante y las esquinas transparentes | La esquina del panel (radio 14 a 8 px del borde) queda dentro del arco de 20 px del marco: unos 9 px de holgura en la diagonal. El marco recorta (`overflow-hidden` + `transform`). Lo comprueba la persona con el instalador |
| R-6 | AC-05: que se pierda algo al mover la marca, las migas o el botón de escanear | Inventario de abajo, revisado en el paso 7 |
| R-7 | Peso | Sin dependencias. Unas pocas utilidades nuevas. Se miden `dist/assets/*.css` y `*.js` antes y después (hoy: 214,5 kB de CSS y 573 kB de JS) |
| R-8 | El showcase cambia con el catálogo (alturas y escala) | Revisarlo en oscuro y claro (`/showcase.html`). En normal, el texto no cambia |
| R-9 | Linux, con WebKitGTK 2.40: `calc()` con variables y `color-mix` | Ya están en la base de navegadores (HU-0016 P-1). Nada nuevo |

### Inventario de AC-05 (se comprueba en el paso 7)

- **Barra**: plegar el sidebar; arrastrar la ventana (también con doble clic); en Windows, minimizar, maximizar y cerrar.
- **Marca**: «Code AI Profiles» y BETA, ahora en el panel.
- **Página**: la sección y el título de las tres pantallas, y el «Cargando…». En el dashboard, «Escanear sistema» y
  «Nueva instancia», con los mismos `disabled` y el `title` sin original.
- **Sidebar**: lo de A-2.
- **`FeedbackArea`**: el progreso del escaneo, el panel de instalación y los avisos.
- **Contenido**: banners, cifras, ranking, vacío, detalle, medidores, sesiones (copiar, mover, desvincular, archivada)
  y los siete diálogos con `busy`.
- **Barra de estado**: completa (A-5).
- **Apariencia**: tema y tamaño, persistentes al reabrir.
- En **oscuro, claro y sistema**, también en diálogos y tooltips, y a **980×680**.

### Secuencia (pasos numerados, cada uno con su verificación)

| Paso | Qué | Quién | Verificación |
| --- | --- | --- | --- |
| 0 | `tauri.macos.conf.json`: `"x": 28, "y": 40` → `"x": 20, "y": 19` | orquestador | `git diff` de una línea; se mira en el paso 7 |
| 1 | Tokens `--fs-*`, `--esc`, `--ctl-*`, `data-text-size` y el puente `@theme` (A-3). Pruebas 12–14 y sus canarios | frontend | `pnpm build`. Antes del paso 2, la 13 y la 14 fallan (esperado) |
| 2 | Migración: catálogo (A-3) y app (A-4), `--quiet`, sesiones | frontend | `pnpm test:ui`, `pnpm build`, `rg 'text-\[\d' src/app src/features src/components` (solo las muestras) |
| 3 | Armazón (A-1, A-5): `AppShell`, `Titlebar`, `PageHeader`, `PageContent`, `FeedbackArea`, `Statusbar` y la sección de `InstanceRoute` | frontend | Medidas del DOM (paso 7) en `pnpm dev` |
| 4 | Sidebar flotante (A-2) | frontend | Medidas del DOM; plegar, recargar y que siga plegado; Ctrl/⌘ F plegado |
| 5 | Apariencia (A-6) | frontend | El diálogo en los tres tamaños y los dos temas |
| 6 | Documentación: `DESIGN.md` (sección de la app: disposición, tipografía y escala), fichas de `code-ai-profiles-ui` (`button`, `input`, `badge`, `kbd`, `sidebar`, `dialog`, `alert-dialog` y `tema.md`) y la skill `code-ai-profiles-frontend-react-vite` (Plataformas y Densidad → Escala, **sin crecer**: ya pasa de 12 KB; el detalle va a un `estilos.md` dentro de la skill) | frontend | `node .metodo/scripts/metodo.mjs validar` sin avisos nuevos |
| 7 | Comprobación contra la maqueta | frontend; macOS real, orquestador; Windows y Linux, la persona | Ver abajo |

**Paso 7, con la app abierta (`pnpm dev`, 1440×920 y 980×680):**

- **Medidas** (`getBoundingClientRect`): `PageHeader` de 52 de alto. Primer hijo de `PageContent` en y = 60.
  `[data-slot=sidebar-inner]` en x 8, y 60, de 240 de ancho (50 plegado) y a 8 del pie. Botón de plegar en x 84
  (macOS). Barra de estado de 36 (32 a 980). En los tres tamaños.
- **Mínimo de 11 px**, en la consola y en los tres tamaños, con un diálogo abierto y sin él:
  `[...document.querySelectorAll("body *")].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && e.getClientRects().length).map(e => [parseFloat(getComputedStyle(e).fontSize), e]).filter(([s]) => s < 11)`
  tiene que devolver `[]`. En grande, el `h1` mide 19 px y el título de sesión, 16.
- **Capturas** en oscuro y claro, a 1440 y 980, desplegado y plegado, en los tres tamaños, frente a `diseno/capturas/`
  `01, 04, 06, 07, 08, 10, 11, 12, 14, 15, 16`. Se guardan en `hu/HU-0019-…/evidencias/`. Windows y Linux, en local:
  el valor `platform` del mock en `src/lib/bridge.ts` se cambia **sin commitear** y se revierte (`git diff --exit-code
  src/lib/bridge.ts`).
- **Peso**: CSS y JS de `dist/assets` antes y después.
- **macOS real** (`pnpm tauri dev`, orquestador): semáforos centrados en la barra y separados del botón de plegar;
  plegar, «Escanear sistema» y «Nueva instancia» responden al clic (R-4); arrastrar y doble clic funcionan.
- **Windows y Linux** (persona, con los instaladores de CI): controles sin solaparse, arrastre y esquinas (R-5).

## Briefs y orden

1. Paso 0, el orquestador: una línea de configuración, sin despacho a backend.
2. `briefs/frontend.md`, modelo **sonnet**: es interfaz sin dinero, sin estados, sin permisos y sin migración sobre
   datos reales. Pasos 1 a 7 en orden, en un solo implementador. Los pasos 1 y 2 tocan los mismos archivos que el
   3 y el 4, así que no conviene paralelizar.

No hay brief de diseño (la maqueta está aprobada) ni de backend.

## Revisión técnica

En toda historia, después de implementar y antes de la prueba humana. Foco: R-1 (sin diff en `DashboardRuntime` y en
los hooks de ejecución, y la prueba 8), R-2 (ningún `text-<nombre>` propio), la tabla de A-4 completa, el inventario
de AC-05, las tres plataformas en `AppShell`, `Titlebar` y `PageHeader`, y las fichas del catálogo.
