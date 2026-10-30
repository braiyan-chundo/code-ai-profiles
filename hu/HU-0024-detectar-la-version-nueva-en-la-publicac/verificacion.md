# Verificación · HU-0024 · Detectar la versión nueva en la publicación oficial e instalarla

Preparada por el orquestador el 2026-10-29. Verifica la persona; el orquestador no corrige lo que encuentra.
Lleva revisión técnica porque el dial `revisionTecnica` es `siempre` (riesgo permisos y contrato):
`revision-tecnica.md`, PASS; R-1 a R-4 corregidas antes de entregar.

## Qué se entregó

| Repo | Commits | Qué |
| --- | --- | --- |
| code-ai-profiles | backend · `4544ead`, `40b13c5`, `f34cc5d` | `CAP_UPDATE_RELEASES_URL` en `.env.example`; `official_release.rs` (versión de `RELEASES.json`, paquete confirmado por el feed con la misma versión y URL); detección e instalación con esa versión; caché `schema` 2 con reintento a los 30 min; R-1, R-3 y R-4 |
| code-ai-profiles | frontend · `f8a491f`, `d7e534c` | Aviso «Hay una nueva versión de Claude (X). ¿Deseas instalarla?» con «Instalar»; «Actualizar instancias obsoletas»; «Actualizar» en la instancia y en el ranking, sin bloquear «Abrir»; R-2 |
| code-ai-profiles | historia, arquitectura, revisión, grafo y esta verificación | Gobierno |

Rama `hu-0024-version-oficial`, encima de `fix-copia-autoactualizada-y-transferencia` (que va encima de la rama de
las HU-0022 y HU-0023).

## Comprobaciones

| Comprobación (2026-10-29) | Resultado |
| --- | --- |
| Suite, tipos y build (`pruebas.mjs suite todos`), una vez | en verde sobre `52e4984` |
| Pruebas | `cargo test` 178 (detección, confirmación, eco del feed, TOCTOU, cancelación, caché); `test:update` 30; `test:ui` 19 |
| Fuentes reales (GET sin identificadores) | `RELEASES.json`: 4.4212.0; el feed preguntado con 4.4212.0 da la misma URL, con `sha256` y tamaño 378 758 916 |
| DMG (macOS Apple Silicon, código de `f34cc5d`) | `Code AI Profiles_0.3.0_aarch64.dmg`, SHA-256 `9a6aaeed3a51d60f775b9ee07d33fcf6f37a68136303d9b3e76fbc18175c8ccf` |
| Configuración fuera del código y guarda de producción | en orden |
| Capturas con mocks | `evidencias/` (dashboard oscuro y claro, instancia detenida y en marcha, original, aviso con incidencia) |

## Decisiones tomadas

1. Instalación con el flujo de la HU-0017, sin DMG (tu elección).
2. Acceso de red a `downloads.claude.ai` (tu autorización).
3. ★ del architect con su recomendación: el aviso usa el nombre de la app instalada («Claude»); las instancias
   detenidas se actualizan solas tras instalar; no se pide contraseña (hace falta una cuenta de administrador).

## Guía de prueba

Dónde: la app instalada desde este `.dmg`, con la original en 4.29.0 cerrada.

1. **AC-01.** Abre la app: el dashboard muestra «Hay una nueva versión de Claude (4.4212.0). ¿Deseas instalarla?» con
   «Instalar». También en la página de la original.
2. **AC-02.** Pulsa «Instalar». Se descarga, se verifica y se sustituye la original sin abrir Claude. Al acabar, la
   original dice 4.4212.0 y no quedan temporales.
3. **AC-03.** Las instancias detenidas que estaban en 4.29.0 pasan a 4.4212.0. Si alguna estaba abierta, aparece
   «Actualizar instancias obsoletas».
4. **AC-04.** Una instancia por detrás muestra «Actualizar» y se puede abrir igual.
5. **AC-05.** Claudio Personal (4.4212.0) iba por delante de la original: aun así se ofreció la versión oficial.
6. **AC-06.** (Opcional) Sin red, la app sigue funcionando y lo dice.

**Solo tú puedes comprobar:** la instalación real (también la prueba pendiente de la HU-0017); Windows y Linux (solo
CI).

## Veredicto

Pendiente.
