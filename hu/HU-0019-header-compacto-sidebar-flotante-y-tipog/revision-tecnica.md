# Revisión técnica · HU-0019 · Header compacto, sidebar flotante y tipografía legible

Rama `hu-0019-ajustes-visuales`, diff `4a612d3..3cdcb4d` (frontend `00ca976`…`6788ed1` y bitácora `3cdcb4d`), revisado
contra `arquitectura.md` (A-1 a A-7) y la maqueta aprobada (variante A). Fecha: 2026-10-28.

## Veredicto: **PASS**

Nada bloquea. El código cumple A-1 a A-7. Quedan dos condiciones antes de la prueba humana:

- la suite sobre el SHA final (R-1);
- la comprobación de macOS en el escritorio (R-2).

## Método

- **Pruebas**: no las corrí. `node .metodo/scripts/pruebas.mjs estado` dice «HEAD 3cdcb4d sin suite en verde». El último
  registro es `2698dca`, anterior a esta historia. La bitácora anota `test:ui` 15/15, pero eso no es la suite.
- **Código**: leí el diff completo de `src/`, `tests/ui-isolation.test.ts`, `DESIGN.md`, las fichas y las skills.
- **CSS compilado**: leí `dist/assets/index-_eg0I9w-.css` (21:45, posterior a `ca0ded5`).
  - `.text-xs{font-size:var(--fs-small)}`, `.text-sm{font-size:var(--fs-body)}` y `.text-base{font-size:calc(16px * var(--esc))}`;
  - los `--text-*--line-height` siguen siendo proporciones;
  - `.h-\(--ctl\){height:var(--ctl)}` y el bloque `:root[data-text-size=large]` completo.
- **JS compilado**: conté en `dist/assets/*.js` los `addEventListener` de `focus`, `blur` y `visibilitychange`.
- **`cn`**: reproduje su comportamiento con el paquete del proyecto.
- **Evidencias**: miré `01`, `07`, `13`, `16` y las dos del showcase.

## Los puntos pedidos

**1 · La escala: bien construida.**
- **`tokens.css`**: tiene los siete `--fs-*`, `--esc` y `--ctl*` en `:root`, y compacto y grande en
  `:root[data-text-size=…]`, con los valores de A-3. Las `calc` con `var(--esc)` se resuelven en `<html>`, que es donde
  cambia `--esc`, y los hijos heredan el valor ya calculado. Es correcto.
- **El puente de `ui-theme.css`**, en `@theme inline`:
  - en normal, `text-xs` y `text-sm` valen 12 y 14, como antes;
  - el catálogo crece sin editar sus componentes;
  - el título de los diálogos usa `--fs-dialog`.
- **La regla `text-(length:--fs-*)` se cumple en todo `src/`**:
  - `rg '\btext-(micro|small|body|heading|title|figure|dialog)\b' src` no encuentra nada;
  - no queda ningún `text-[<n>px]` fuera de las tres muestras de Apariencia;
  - no queda ningún `--session-*` ni ningún `text-(--quiet)`.
- **La tabla de A-4, completa**:
  - todos los tamaños sueltos de la app, migrados, con `leading-*` aparte;
  - los `CardTitle` pasan a `--fs-heading` y las figuras, a `--fs-figure`;
  - el `h-4` del badge de estado en `UsageRanking` desaparece.
- **Las pruebas 12–14 protegen lo que dicen**, y cada detector tiene su canario en la 9.
  - La 12 lee los bloques de `tokens.css`. Falla si:
    - un token falta o no está en px;
    - un token baja de 11;
    - grande no supera a normal;
    - falta `--esc`;
    - se usa un `--fs-<x>` que no existe.
  - La 12 exige además el enganche de `xs` y `sm`. Sus huecos, en R-3.

**2 · R-1 de HU-0015: intacta.**
- `src/app/providers`, `features/scan`, `useSourceUpdateRuntime`, `useLiveUsage`, `lib/`, `types.ts` y `src-tauri/src`
  no tienen diff.
- El diff de `src/` no añade ningún `addEventListener`, `matchMedia` ni `ResizeObserver`. El corte de 1071 px es CSS.
- En el bundle siguen los cinco de siempre: `focus` ×3, `blur` ×1 y `visibilitychange` ×1.
- El `Tooltip` de «Escanear sistema» ya estaba en el bundle. La prueba 8 no cambia.

**3 · Arrastre y controles: correctos en el código. Falta verlo en el escritorio (R-2).**
- **`Titlebar`** es `absolute top-0 left-0 z-20` sobre la columna del sidebar:
  - ancho `w-(--sidebar-width)`, o `w-16` + `min-w-max` plegado;
  - hueco de 84 px en macOS y de 16 px en el resto;
  - `data-tauri-drag-region` en la zona, no en el botón.
- **`PageHeader`**:
  - lleva el atributo en el `header`, en el grupo de migas, en la sección y en el `h1`, pero no en el chevron (R-6);
  - `pr-[160px]` en Windows y `pl-[68px]` en macOS plegado, repetidos en `max-[1070px]` para que `px-6` no los pise. Bien visto.
- **Controles de Windows**: 46 × 36 fijos, `z-20`, `right-2.5`.
- **`trafficLightPosition`** en `{ "x": 20, "y": 19 }` desde `4a612d3`. Nada en `src-tauri/src` lo pisa.
- **El riesgo que queda**: la barra nativa de macOS (Overlay) ocupa unos 35 px de alto. El botón de plegar (y 10–42),
  «Escanear sistema» y «Nueva instancia» caen en parte dentro de ella. En el navegador funcionan; en el escritorio
  nadie lo ha visto (la bitácora lo dice: «No visto: macOS real»).
- **Esquinas de Windows**:
  - el panel queda a 8 px dentro del marco `rounded-[20px] overflow-hidden [transform:translateZ(0)]`;
  - su arco de 14 px queda unos 9 px por dentro del arco de 20 px en la diagonal;
  - `Titlebar` y el contenedor `fixed` quedan dentro del marco transformado. En `13` no se ve recorte.
  - La ventana transparente real solo se ve con el instalador (persona).

**4 · AC-05: no se pierde nada.** Lo cotejé con el inventario de la arquitectura.
- **Barra**:
  - el botón de plegar y el arrastre;
  - los tres controles de Windows;
  - la marca y BETA, ahora en `SidebarHeader`, también plegado (solo la marca);
  - las migas en las tres rutas y en el «Cargando…»;
  - «Escanear sistema» con el mismo `disabled` y el giro, y su nombre en `sr-only` + tooltip a 980;
  - «Nueva instancia» con el mismo `disabled` y el `title` sin original.
- **Sidebar**: no se quitó ninguna línea.
  - búsqueda, limpiar, `Kbd` y Ctrl/⌘ F (el efecto no cambia);
  - esqueleto, «Sin instancias todavía», «Sin coincidencias» + limpiar;
  - «Nueva instancia» con su `title`;
  - los tooltips con el estado y los `sr-only`;
  - al pie, «Escanear sistema» y «Apariencia»;
  - el plegado guardado en las preferencias.
- **Contador**: `codeSessions.length` y `originalCodeSessions.length` (solo con original), con «sesión/sesiones» en
  `sr-only`. No expone nada que la página no enseñe ya. **Privacidad en orden.**
- **Resto**:
  - `FeedbackArea`, las pantallas, los diálogos y la barra de estado («AUTO · 60S» incluido a 980) siguen completos;
  - en Apariencia cambian los textos de A-6, y la muestra y el campo guardado `sessionTextSize` se quedan.
- **Lo que cambia, todo declarado**:
  - la sección del detalle pasa de «Instancia» a «Instancias»;
  - los botones del dashboard pasan de `lg` a `default`;
  - el contexto «desconocido» pierde su gris más tenue (texto igual, `--muted`).

**5 · El showcase con `--ctl*`: bien en el código, poco evidenciado (R-4).**
- `showcase.css` importa `tokens.css` y `ui-theme.css`, así que `--ctl*` y `--fs-*` existen allí con los valores normales.
- En normal, los altos son los de antes (36, 32, 40, 24 y 20), así que el showcase no cambia.
- Pero las dos capturas, `showcase-dark.png` y `showcase-light.png`, son **el mismo archivo** (mismo md5). Las dos
  están en oscuro y no enseñan botones, entradas ni badges.

## Las desviaciones declaradas

| Desviación | Juicio |
| --- | --- |
| Prueba 13: en `components/ui/` solo `px`; el showcase, fuera | Aceptada. `calendar` (`0.8rem` = 12,8 px) y `questionnaire` (`0.625rem` = 10 px) no los usa la app. Hueco anotado en R-3 |
| `ca0ded5`: marca y BETA, barra de estado con `nowrap` y menos tracking a ≤1070, ranking al 30 % con `flex-wrap`, `leading-[1.15]` en `SummaryCards` | Aceptadas. Corrigen solapes reales a 980 px y en grande (evidencia `16`). Ver R-5 sobre `overflow-hidden` |
| Sidebar: `gap-0.5`, etiquetas `hidden` al plegar, raya con `my-2.5`, badge con `--ctl-badge` | Aceptadas. Las etiquetas `hidden` sustituyen al `-mt-8 opacity-0` del catálogo y son más limpias con la raya |
| Apariencia: descripciones sin `truncate` | Aceptada. En grande, truncar escondía la descripción del tema |
| Windows y Linux simulados reescribiendo por CDP la respuesta del mock | Aceptada, y mejor que editar `bridge.ts`: no deja diff. No sustituye a la prueba con instaladores |

## Observaciones

| | Bloquea | Dónde | Qué pasa | Qué hacer | Responsable |
| --- | --- | --- | --- | --- | --- |
| R-1 | No (sí para cerrar) | `pruebas.mjs estado` | HEAD `3cdcb4d` no tiene suite en verde, y la historia toca el texto de toda la app | `node .metodo/scripts/pruebas.mjs suite` una vez sobre el SHA final, antes de la prueba humana | orquestador |
| R-2 | No (sí para la prueba humana) | macOS, barra de 52 px | La barra nativa (Overlay, ≈35 px con `y: 19`) puede quedarse el clic o el `hover` de lo que cae en ella: el botón de plegar (y 10–42) y las acciones del dashboard. No se ha probado en el escritorio | En `pnpm tauri dev`, en este Mac: semáforos centrados y separados del botón; plegar, «Escanear sistema» y «Nueva instancia» responden; arrastrar desde la zona izquierda y desde las migas; doble clic. Si el clic no llega: bajar `y` o el alto de la barra, en la misma línea de `tauri.macos.conf.json` | orquestador |
| R-3 | No | `tests/ui-isolation.test.ts` 12–14 | **Huecos que podrían dar un falso verde**, aunque hoy no hay ningún caso. (a) La 12 no comprueba el enganche de `text-base` a `text-2xl` con `--esc`. (b) Nada vigila una utilidad con nombre propio (`text-micro`), que `cn` borraría: lo cubre la revisión, no una prueba. (c) La 13 no ve `text-[length:9px]`, `[font-size:9px]` ni `text-(length:9px)`. (d) Un `--fs-*` redefinido fuera de `tokens.css` (en `ui-theme.css` o en `.theme-light`) pasaría la 12 | Opcional, unas líneas, con sus canarios: exigir los seis `--text-*` en `ui-theme.css`; marcar `\btext-(micro\|small\|body\|heading\|title\|figure\|dialog)\b`; ampliar la expresión de la 13 a `length:` y `font-size:`; y exigir que `--fs-` solo se declare en `tokens.css`. Ya anotado en `docs/arquitectura/frontend.md` | frontend |
| R-4 | No | `evidencias/showcase-*.png` | Las dos capturas del showcase son idénticas (mismo md5, las dos en oscuro) y no enseñan los controles con `--ctl*` | Repetir la del tema claro y una de la sección «Botón», «Tecla» o «Insignia»; o declararlo como pendiente humano | frontend |
| R-5 | No | `Statusbar.tsx` (`overflow-hidden whitespace-nowrap`) | A 980 px, en grande, con la aplicación **no detectada** («APLICACIÓN COMPATIBLE NO DETECTADA», 10 caracteres más que el caso medido) y «WINDOWS», la fila puede no caber. El texto se solaparía o se recortaría sin aviso. No hay evidencia de ese estado | Comprobar ese caso en el navegador (mock sin `sourcePath`). Si no cabe, ocultar también «libres» a `max-[1070px]` o acortar la etiqueta a «NO DETECTADA» con el texto completo en `title` | frontend |
| R-6 | No | `PageHeader.tsx` | El chevron de las migas no lleva `data-tauri-drag-region`: arrastrar justo desde él no mueve la ventana (son 14 px) | Opcional: `pointer-events-none` en el icono, que deja pasar el gesto al `div` con el atributo | frontend |
| R-7 | No | `.claude/skills/code-ai-profiles-frontend-react-vite/SKILL.md:57` | El ejemplo de forma corta sigue diciendo `text-(--quiet)`, justo lo que prohíbe la prueba 14 y la línea 72 de la misma skill | Cambiar el ejemplo por `bg-(--quiet)` | frontend |
| R-8 | No | La misma skill | Pesa 12 385 bytes: `metodo validar` avisa por encima de 12 288 (bajó de 12 600; es la R-4 de HU-0016) | Pasar unas líneas más a `estilos.md`, por ejemplo el detalle de plataformas | frontend |
| R-9 | No | Pendientes de la bitácora | Sin ver: el vacío del dashboard, el tema «sistema» y Windows y Linux reales | El vacío y el sistema, con `pnpm dev`. Windows y Linux, con los instaladores, en la prueba humana: controles, arrastre y esquinas transparentes con el panel flotante | frontend (vacío y sistema); mantenedor (instaladores) |
| R-10 | No | `3cdcb4d` | El commit de la bitácora mezcla HU-0019 y HU-0021 y lleva `graphify-out/` regenerado antes del cierre | Nada que deshacer. Al cerrar, `pnpm graph:update` y `pnpm graph:check` otra vez sobre el SHA final, como siempre | orquestador |

## Documentos de arquitectura

`docs/arquitectura/frontend.md` describe lo construido: una barra, sidebar flotante, escala, `data-text-size` y la
regla de `cn`. Lo único que añado es el alcance exacto de la prueba 13 (el showcase fuera; en el catálogo, solo
`px`) y lo que las pruebas no ven (R-3).
