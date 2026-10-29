# Verificación · HU-0019 · Header compacto, sidebar flotante y tipografía legible

Preparada por el orquestador el 2026-10-28. Verifica la persona; el orquestador no corrige lo que encuentra.
Lleva revisión técnica porque el dial `revisionTecnica` es `siempre`: `revision-tecnica.md`, PASS; R-3..R-8
corregidas en `5ba9af8`. Maqueta aprobada antes de construir (`diseno/maqueta.html`).

## Qué se entregó

| Repo | Commits | Qué |
| --- | --- | --- |
| code-ai-profiles | `4a612d3` (orquestador) | Semáforos de macOS en (20, 19) para la barra nueva |
| code-ai-profiles | `00ca976`…`6788ed1` (frontend) | Escala `--fs-*`/`--esc`/`--ctl*`, migración de textos, barra única de 52 px, sidebar flotante, textos de Apariencia, documentación y ajustes de la comprobación |
| code-ai-profiles | `5ba9af8` (frontend) | R-3..R-8: pruebas 12–14 más estrictas, capturas del showcase, barra de estado sin aplicación a 980 px, chevron sin arrastre, skill de frontend |
| code-ai-profiles | `39f4f05`, `a2f0533`, `42b8661`, `3cdcb4d`, `bebded6` y el de esta verificación | Historia, maqueta, aprobación, arquitectura, revisión y bitácora |

## Comprobaciones

| Comprobación (2026-10-28) | Resultado |
| --- | --- |
| Suite, tipos y build (`pruebas.mjs suite todos`), una vez | en verde; se registra sobre el SHA de esta verificación |
| Medidas frente a la maqueta (frontend, Chrome sin interfaz) | cabecera 52 px; primer contenido en y = 60 (hoy 193 en macOS, 163 en el resto); sidebar 240 px a 8 px del borde, 50 px plegado; barra de estado 36/32 px; `h1` 15/17/19 px |
| Mínimo de 11 px | ningún texto por debajo en 72 combinaciones de macOS y 144 de Windows/Linux simulados, también con los diálogos abiertos; lo vigilan las pruebas 12–14 de `test:ui` (15/15) |
| Escritorio de macOS (mantenedor, `pnpm tauri dev`) | «Todo responde»: semáforos, botón de plegar, acciones y arrastre |
| R-1 de HU-0015 | sin cambios en proveedores, hooks, `lib/`, `types.ts` ni `src-tauri/src`; 5 listeners de siempre |
| Peso | CSS +0,8 %, JS +0,7 % |
| Configuración fuera del código y guarda de producción | en orden |

## Decisiones tomadas (★ y maqueta aprobada)

1. D-1 · Variante A: una sola barra de 52 px.
2. D-2 · Sidebar flotante de 240 px, plegable a 48–50 px con tooltips.
3. D-3 · Escala global: compacto 13, cómodo 14 y grande 16 px de cuerpo; nada por debajo de 11 px.
4. Detalles de A: contadores de sesiones en el sidebar, marca dentro del panel, «Escanear sistema» solo con
   icono por debajo de 1071 px (con tooltip), barra de estado de 36 px.
5. Desvíos de la arquitectura: iconos y avatares no crecen con «Grande»; «AUTO · 60S» se mantiene a 980 px; el
   tamaño intermedio se sigue llamando «Cómodo»; a 980 px sin aplicación detectada la barra dice «NO DETECTADA».

## Guía de prueba

Dónde: la app de escritorio (`pnpm tauri dev`) o el instalador de esta rama, con tus perfiles.

1. **AC-02 · Cabecera.** El contenido empieza justo bajo una barra baja con «Sección › Página» y las acciones.
2. **AC-03 · Sidebar.** Panel separado del borde; pliégalo, cierra y reabre: sigue plegado, con tooltips.
3. **AC-04 · Texto.** En Apariencia pasa por Compacto, Cómodo y Grande: crece todo el texto, no solo las sesiones.
4. **AC-05 · Nada se pierde.** Recorre dashboard, una instancia, la original y algunos diálogos en oscuro, claro
   y sistema, y con la ventana al mínimo.

**Solo tú puedes comprobar:**

- Windows y Linux reales: controles, arrastre y la esquina del panel frente al arco del marco de Windows.
- El dashboard vacío y el tema «Sistema» (no los cubre el mock).
- Que la lectura sea cómoda: no hay medida que lo sustituya.

## Veredicto

Pendiente de la persona.
