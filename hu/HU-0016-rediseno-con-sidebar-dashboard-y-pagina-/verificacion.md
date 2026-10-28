# Verificación · HU-0016 · Rediseño con sidebar, dashboard y página por instancia

Preparada por el orquestador el 2026-10-28. Verifica la persona; el orquestador no corrige lo que encuentra.
Lleva revisión técnica porque el dial `revisionTecnica` es `siempre`: `revision-tecnica.md`, PASS sin
bloqueos (R-1..R-9). Sin maqueta: el dial de diseño está apagado, así que el aspecto se decide al probar.

## Qué se entregó

| Repo | Commits | Qué |
| --- | --- | --- |
| code-ai-profiles | `a8091c2` (orquestador) | macOS 13.3 como mínimo y requisitos de motor web en README y CHANGELOG (P-1, opción b) |
| code-ai-profiles | E1 · `eaac80d`, `c4c584f` | Tailwind en la app, tema en `<html>`, aviso de motor, `test:ui` nuevo; shell con sidebar, titlebar por plataforma, statusbar y rutas |
| code-ai-profiles | E2 · `358823a`, `f45efe9`, `0a83abd` | Página de instancia, página de la original, dashboard con resumen y ranking de uso, avisos en el layout y búsqueda en el sidebar |
| code-ai-profiles | E3 · `40d5400`, `08bd8b2` | Los siete diálogos con el catálogo; `tokens.css`; fuera el CSS propio e `Icons.tsx`; `DESIGN.md`, skills y reglas |
| code-ai-profiles | `d06c006`, `bc04d0a`, `ed8b3b1`, `378f41d`, `6583100`, `8caf37f` y el de esta verificación | Historia, arquitectura, bitácora, guías de diseño, revisión técnica y agentes regenerados |

## Comprobaciones

| Comprobación (2026-10-28) | Resultado |
| --- | --- |
| Suite, tipos y build (`pruebas.mjs suite todos`), una vez | en verde; se registra sobre el SHA de esta verificación |
| Pruebas del frontend (E3) | `test:ui` 12/12, `appearance` 10/10, `dashboard` 15/15, `format` 12/12, `messages` 10/10, `scan` 13/13, `update` 24/24 |
| R-1 de HU-0015 (revisión técnica) | `DashboardRuntime`, hooks, `bridge.ts`, `types.ts` y Rust sin diff; en `dist/` solo los 5 `addEventListener` de foco de siempre; `test:ui` 8 fija sus dueños |
| Rutas (frontend con Chrome sin interfaz; orquestador con el navegador integrado) | `#/`, `#/original`, `#/instancias/<id>`; id o ruta desconocidos → `#/`; borrar desde la página → `#/`; sin errores en consola |
| Diálogos (frontend, mock lento de 5 s) | los siete no se cierran con Escape, clic fuera ni X mientras su operación corre; Escape cierra solo el de encima |
| Temas | oscuro, claro y sistema en las tres rutas y en los diálogos, que heredan el tema de `<html>` |
| Tamaños | capturas a 1440×920 y 980×680 de rutas y diálogos (frontend, ~60) |
| Sidebar | sin cookie; Cmd/Ctrl+B no hace nada; plegado se guarda en la preferencia de apariencia; ⌘/Ctrl F enfoca la búsqueda |
| Inventario de AC-06 | cada acción, atajo y aviso de la app anterior tiene su sitio (tabla del frontend y revisión técnica) |
| Restos del CSS propio | solo quedan `index.css`, `tokens.css`, `ui-theme.css` y `showcase.css`; `Icons.tsx`, `ModalFrame`, `ConfirmDialog` y `routes/panel` borrados |
| Peso | CSS 57,6 → 214,5 kB (gzip 31,8); JS 383 → 573 kB (gzip 181); aviso de chunk > 500 kB |
| Privacidad | sin cookies ni red; `localStorage` solo con las preferencias de apariencia |
| Configuración fuera del código y guarda de producción | en orden |

## Decisiones tomadas por defecto (★, revisables al probar)

1. D-1 · Tailwind en la app y el CSS propio retirado en esta historia. Alternativa: convivencia por partes.
2. D-2 · El `sidebar` del catálogo, plegable a iconos, sin cookie ni Cmd/Ctrl+B. Alternativa: sidebar propio.
3. D-3 · Rutas `#/`, `#/original`, `#/instancias/<id>`; los diálogos siguen siendo diálogos. `#/original` sin
   aplicación detectada muestra un vacío con «Escanear de nuevo» en lugar de volver al dashboard.
4. D-4 · El tema y el tamaño de texto en `<html>`.
5. D-5 · lucide en toda la interfaz; la marca y los iconos propios de cada instancia se conservan.
6. D-6 · Resumen del dashboard: instancias, en marcha, sesiones Code, versión de la original, almacenamiento y
   uso por instancia de más a menos.
7. La búsqueda y ⌘/Ctrl F pasan al sidebar; los avisos de escaneo, error y resultado se ven en todas las rutas.
8. **R-2:** el clic fuera ya no cierra las confirmaciones de borrar y desvincular (solo Escape o «Cancelar»).
9. **R-3:** con una operación en curso, la X sale deshabilitada en todos los diálogos y Escape no los cierra.
10. macOS 13.3 como mínimo (tu elección en P-1).

## Guía de prueba

Dónde: la app de escritorio con `pnpm tauri dev`, sobre tus perfiles locales. No hay cuentas de seed.

1. **AC-01 · Sidebar.** Mira el sidebar: Dashboard, la aplicación original y una entrada por instancia con su
   estado. Pulsa cada una. Pliégalo con el botón de la barra de título, cierra y reabre la app: sigue plegado.
   Crea, renombra y borra una instancia de prueba: el sidebar cambia sin recargar.
2. **AC-02 · Dashboard.** En «Dashboard», comprueba las cifras (instancias, en marcha, sesiones, versión,
   almacenamiento) y el uso de cada instancia, de más a menos. Pulsa una fila: abre su página.
3. **AC-03 · Página de instancia.** Abre una instancia: estado, versión, uso y sesiones. Ábrela, detenla,
   abre su carpeta, edítala y transfiere una sesión (copiar, mover, devolver).
4. **AC-04 · Página de la original.** Abre la aplicación original: versión, estado, sesiones, transferir,
   desvincular y «Actualizar original».
5. **AC-05 · Aspecto.** Usa «Apariencia» para pasar por oscuro, claro y sistema, y reduce la ventana al mínimo
   (980×680). Abre diálogos y avisos en cada tema.
6. **AC-06 · La vuelta tras «Actualizar original».** Con una actualización disponible, pulsa «Actualizar
   original» y vuelve a Code AI Profiles: solo se refrescan las versiones, sin que aparezca el panel de
   escaneo. Es el riesgo principal (R-1 de HU-0015).

Regresión: cada acción que usabas antes sigue existiendo; si echas algo en falta, es un rechazo.

**Solo tú puedes comprobar:**

- La app de escritorio: nadie la ha abierto, todo se vio en Chrome con el mock. En macOS, los semáforos con
  el sidebar plegado y desplegado, y arrastrar la ventana por la barra de título.
- Que el nuevo uso «se siente» mejor: es el objetivo de la historia y no hay maqueta contra la que compararlo.
- Windows y Linux reales: controles de ventana, esquinas transparentes con el velo de los diálogos (R-7),
  WebKitGTK y el aviso de motor en una Ubuntu 22.04 sin actualizar.
- Iconos personalizados reales y el selector de archivo del editor.
- El `.dmg` declara macOS 13.3 (`LSMinimumSystemVersion`).

## Veredicto

2026-10-28 · Braiyan Rodriguez (mantenedor), tras recorrer la app de escritorio con `pnpm tauri dev` en macOS:

> «Aprobado, cierra»

**Aprobada.** Las ★ quedan como estaban, incluidas R-2 y R-3.
