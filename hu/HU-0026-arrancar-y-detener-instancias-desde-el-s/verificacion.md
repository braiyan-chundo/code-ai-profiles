# Verificación · HU-0026 · Arrancar y detener instancias desde el sidebar y el dashboard

Preparada por el orquestador el 2026-10-30. Verifica la persona; el orquestador no corrige lo que encuentra.
Lleva revisión técnica porque el dial `revisionTecnica` es `siempre` (riesgo estados): `revision.md`, PASS; R-1 a R-3
corregidas antes de entregar.

## Qué se entregó

| Repo | Commits | Qué |
| --- | --- | --- |
| code-ai-profiles | frontend · `dca8a1f`, `16c35ea` | Botón Abrir/Detener en cada instancia del sidebar (al pasar el ratón o con foco) y en cada fila del ranking del dashboard; mismos comandos y errores que la página de la instancia; R-1 a R-3 |
| code-ai-profiles | `47ca535` | Capturas en `evidencias/` |
| code-ai-profiles | historia, maqueta, arquitectura, revisión, grafo y esta verificación | Gobierno |

Rama `ajustes-proyectos-e-instancias` (desde `develop` `b37e438`), junto con la HU-0025 y el fix de «Actualizar»
(`a41cdb9`).

## Comprobaciones

| Comprobación (2026-10-30) | Resultado |
| --- | --- |
| Suite, tipos y build (`pruebas.mjs suite todos`), una vez | en verde sobre `75b6387` |
| `cargo test` | 207 pasan, 2 ignoradas |
| `test:ui` | 20 de 20 |
| DMG (macOS Apple Silicon, código de `75b6387`) | `Code AI Profiles_0.3.0_aarch64.dmg`, SHA-256 `1f9ae1f2b101f4d2931312a61c45be2c5ec0bc5d2f2f14691a79115068a0921b` |
| Configuración fuera del código y guarda de producción | en orden |
| Grafo (`graph:check`) | al día |
| Capturas con mocks | `evidencias/` (reposo, hover y foco, abriendo, deteniendo, plegado, error) |

## Decisiones tomadas

1. Solo instancias: la Claude original no lleva botón (tu elección).
2. ★ D-1: sin confirmación al detener, igual que en la página de la instancia.
3. ★ D-2: en el sidebar el botón aparece con el ratón o el foco; el punto de estado se ve siempre.
4. ★ D-3: los errores salen en el aviso de siempre, con el título «No se pudo abrir/detener {nombre}».

## Guía de prueba

Dónde: la app instalada desde el `.dmg` de esta entrega, con al menos una instancia detenida.

1. **AC-02 · Sidebar.** Pasa el ratón por una instancia detenida: aparece ▶. Púlsalo: se abre sin cambiar de página
   y el punto pasa a «Ejecutándose».
2. **AC-03 · Sidebar.** Con ella en marcha, pasa el ratón: aparece ■. Púlsalo: se cierra y pasa a «Detenido».
3. **AC-02/AC-03 · Dashboard.** Repite con el botón de su fila en «Uso por instancia».
4. **AC-04.** Mientras abre o detiene, el botón queda desactivado y la fila dice «Abriendo…»/«Deteniendo…». Los demás
   botones también se desactivan hasta que acaba.
5. **AC-05.** Con Tab llegas al botón; su nombre es «Abrir {nombre}» o «Detener {nombre}». Un clic en el resto de la
   fila (también sobre las barras de uso) sigue llevando a la instancia.
6. Pliega el sidebar: los iconos de instancia siguen navegando y no hay botones encima.
7. La Claude original no tiene botón, ni en el sidebar ni en el dashboard.

**Solo tú puedes comprobar:** el aviso de macOS al abrir una copia bloqueada y la verificación de identidad al detener,
con instancias reales; Windows y Linux (solo CI).

## Veredicto

Pendiente.
