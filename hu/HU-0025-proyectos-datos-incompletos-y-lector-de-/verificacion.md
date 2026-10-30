# Verificación · HU-0025 · Proyectos: datos incompletos y lector de historias

Preparada por el orquestador el 2026-10-30. Verifica la persona; el orquestador no corrige lo que encuentra.
Lleva revisión técnica porque el dial `revisionTecnica` es `siempre` (riesgo contrato): `revision.md`, PASS tras
corregir R-1 (bloqueaba), R-2, R-3 y O-1.

## Qué se entregó

| Repo | Commits | Qué |
| --- | --- | --- |
| code-ai-profiles | backend · `afd6fc7`, `088a36c` | `dataGaps` por historia y `minutes` nulo (antes un nulo contaba como 0); `read_project_history` (los 4 `.md` fijos de la carpeta, 512 KiB cada uno, sin seguir symlinks); `open_external_link` (solo http/https); R-2 |
| code-ai-profiles | frontend · `6a617c5`, `088a36c`, `5e62f11` | Chip «N historias con datos incompletos · Ver», etiquetas «Sin tiempo»/«Sin métricas», modal agrupado con comandos para copiar, lector Markdown con pestañas; `react-markdown` 10.1.0 y `remark-gfm` 4.0.1 en un chunk aparte; R-1, R-3, O-1 |
| code-ai-profiles | `91c553b` | Capturas en `evidencias/` |
| code-ai-profiles | historia, maqueta, arquitectura, revisión, grafo y esta verificación | Gobierno |

En la misma rama `ajustes-proyectos-e-instancias`: el fix de «Actualizar» (`a41cdb9`), que ahora indica que está
trabajando y muestra «✓ Actualizado» con la hora.

## Comprobaciones

| Comprobación (2026-10-30) | Resultado |
| --- | --- |
| Suite, tipos y build (`pruebas.mjs suite todos`), una vez | en verde sobre `75b6387` |
| `cargo test` | 207 pasan, 2 ignoradas (lector: orden, tope, binarios, symlinks fuera y dentro del proyecto, nube) |
| `test:projects` | 42 de 42 (chip, grupos, comando, pista de tiempo, cuerpo del lector, enlaces) |
| `test:ui` | 20 de 20; la 19 vigila que el lector no pinte `href`, `src` ni HTML crudo |
| DMG (macOS Apple Silicon, código de `75b6387`) | `Code AI Profiles_0.3.0_aarch64.dmg`, SHA-256 `1f9ae1f2b101f4d2931312a61c45be2c5ec0bc5d2f2f14691a79115068a0921b` |
| Configuración fuera del código y guarda de producción | en orden |
| Capturas con mocks de `happy-office` | `evidencias/` (chip, etiquetas, modal con y sin avisos, lector, pestaña ilegible) |

## Decisiones tomadas

1. Etiqueta y modal para los datos incompletos (tu elección).
2. El lector lee `hu.md` y sus `.md` hermanos; RN-02 cambia al cerrar (tu elección).
3. `react-markdown` + `remark-gfm` (tu autorización).
4. Enlaces externos al navegador del sistema, sin confirmación (tu elección).
5. ★ D-2: sin HTML embebido ni imágenes; una imagen se muestra como «Imagen no mostrada: {texto}».
6. Desviación aceptada en la revisión: `code-block` y `scroll-area` del catálogo ajustados a la escala armónica.

## Guía de prueba

Dónde: la app instalada desde el `.dmg` de esta entrega, con `happy-office` anclado en Proyectos.

1. **Fix «Actualizar».** Pulsa «Actualizar»: el botón indica que trabaja y luego dice «✓ Actualizado» con la hora.
2. **AC-02.** La página ya no tiene la lista de 18 avisos. En la cabecera está «18 historias con datos incompletos ·
   Ver», y en la lista las filas llevan «Sin tiempo» o «Sin métricas».
3. **AC-03.** Pulsa «Ver»: el modal agrupa «Sin métricas» (5) y «Sin tiempo» (13), explica cada grupo y da el comando
   de cada historia sin métricas. «Copiar» y «Copiar todos» lo dejan en el portapapeles; la app no lo ejecuta.
   Opcional: pégalo en una terminal dentro de `happy-office`, pulsa «Actualizar» y esa historia deja de salir.
4. **AC-04.** Pulsa una historia: se abre su `hu.md` con títulos, listas, tablas, código y citas. Las pestañas son
   solo las de los `.md` que existen (hu → arquitectura → verificación → seguimiento).
5. **AC-05 · Enlaces.** En una historia con un enlace `https://…`: el clic o Enter lo abren en tu navegador. El clic
   derecho y arrastrarlo **no** deben cargar la web dentro de la ventana de la app.
6. **AC-05 · Solo lectura.** `git status` en `happy-office` sigue limpio después de abrir varias historias.

**Solo tú puedes comprobar:** el proyecto real `happy-office` y sus números; el menú contextual del webview en macOS
(paso 5); Windows y Linux (solo CI).

## Veredicto

Pendiente.
