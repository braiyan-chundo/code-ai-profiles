# Revisión técnica · HU-0024 · Detectar la versión nueva en la publicación oficial e instalarla

Fecha: 2026-10-29 · Revisa: architect · HEAD revisado: `40b13c5` (rama `hu-0024-version-oficial`), diff desde `ff7b108`

- **Frontend:** `f8a491f` (`src/types.ts`, `bridge.ts`, `source-update-controller.ts`, `SourceUpdateBanner`,
  `SynchronizeBanner`, `useUpdateActions`, `InstanceDetail`/`InstanceRoute`, `UsageRanking`, `dashboard-store`, pruebas;
  capturas en `evidencias/`, sobre los mocks).
- **Backend:** `4544ead` (`.env.example`, `build.rs`, `config.rs`) y `40b13c5` (`official_release.rs`, `lib.rs`,
  `original_update.rs`).

## Veredicto: **PASS**

Nada bloquea. La prueba cruzada D-1 está bien hecha: cuando la versión sale de `RELEASES.json`, el paquete solo se
acepta si el feed, preguntado por esa versión, anuncia **la misma versión y la misma URL** (`Url` parseadas, así que
puerto por defecto y mayúsculas del host se normalizan y una query distinta se rechaza). El pipeline de la HU-0017 no
cambia: solo cambia de dónde sale el `FeedPackage`. Después vienen `check_expected_version`, la descarga acotada, el
`sha256`, el tamaño, el zip, la firma con el DR de la instalada, el equipo, Gatekeeper, la versión del bundle, el
intercambio con vuelta atrás y los temporales. Lo que queda es deuda menor (R-1 a R-4).

**Condición antes de la prueba humana.** `pruebas.mjs estado` dice «HEAD 40b13c5 sin suite en verde». No corrí
pruebas. Las cifras son de quienes implementaron (`cargo test` 175/0/2; `test:update` 29, `test:messages` 23,
`test:ui` 19, `test:dashboard` 19; `pnpm build` ok). El orquestador corre la suite una vez sobre el SHA final.
`config.mjs check` está en verde.

## Criterios

| Criterio | Estado | Dónde se ve |
| --- | --- | --- |
| AC-01 · detección | ✓ en el código | `check_official_update_feed` (macOS) → `resolve_official_target`. Con F=4.29.0 y P=4.4212.0 confirmada, da `officialRelease` 4.4212.0 (`staged_rollout_installs_the_published_version_confirmed_by_the_feed`). Título «Hay una nueva versión de {appName} (X). ¿Deseas instalarla?» |
| AC-02 · instalar sin abrir | ✓ en el código · pendiente humano | `prepare_and_verify` comprueba primero que la original esté cerrada, después llama a `resolve_install_target` y sigue con el pipeline de la HU-0017 sin cambios. `end_to_end_*`: instala la publicada, pregunta al feed por `["1.0.0","1.5.0"]`, sin restos. La prueba real (4.4212.0 sobre 4.29.0) es de la persona |
| AC-03 · instancias obsoletas | ✓ | `SynchronizeBanner` muestra «Actualizar instancias obsoletas». En `InstanceDetail`, «Actualizar» abre el diálogo de sincronización con esa sola instancia (desactivado si está en marcha o con `busy`). La insignia de `UsageRanking` sale de `staleInstanceIds`, la misma fuente que `selectOutdatedInstances` |
| AC-04 · sin bloqueo | ✓ | «Abrir» sigue desactivado solo por `isBusy` o `missing`. `launch_instance_sync` y `launch_preflight` no se tocan |
| AC-05 · instancia por delante | ✓ | La resolución compara P con la versión de la **original** y no con la topología. Con `current` + `originalBehind` se mantiene «local-ahead», más el `warning` si lo hay |
| AC-06 · sin red o datos inválidos | ✓ | Una fuente que falla da un `warning` con un texto fijo, sin URL ni cuerpo de la respuesta. Ese resultado solo cuenta como fresco 30 min, y si fallan las dos se usa la caché antigua o `unknown`, así que nada se bloquea. En la interfaz se ve como «uncertain» |

## Lo que se comprobó, por foco

- **Versión y URL de las dos fuentes.** `confirm_published_package` exige `parse_feed_package` (https, host exacto,
  sin credenciales, 443, `.zip`, `sha256` de 64 hex, `size`), la misma `version` y la misma `url`. Las pruebas cubren
  el eco (misma versión con otra URL), otra versión, otra URL en el mismo host, una query añadida y la falta de
  `sha256` o de `size`. Si F ≥ P, manda el paquete del feed sin contrastarlo con `RELEASES.json`. Así lo decide D-2 y
  es lo mismo que hacía la HU-0017.
- **Límites de red.** `fetch_official_json` (común al feed y a la publicación): 5 s, `redirect::Policy::none()`
  (un 3xx no es éxito), 256 KiB comprobados por `Content-Length` y por lectura (`take(max+1)`), `User-Agent` propio,
  sin cookies. A `RELEASES.json` se le pide **sin query**, y el feed lleva solo `version` y el `device_id` nulo. Son
  3 GET como mucho por comprobación y otros 3 al instalar. La URL de `RELEASES.json` sale de la configuración
  compilada (https validado al arrancar) y no se contrasta con `CAP_UPDATE_DOWNLOAD_HOSTS`, que es lo correcto porque
  esa lista es la de los paquetes.
- **TOCTOU.** `resolve_install_target` vuelve a resolver con las tres fuentes. Si la versión ya no es la mostrada,
  guarda la resolución en la caché y devuelve un error neutro («La versión disponible ahora es la Y…») antes de
  descargar nada (`end_to_end_newer_resolved_version_refuses_and_updates_the_cache`: 0 descargas, original intacta).
  Después, `useUpdateActions` vuelve a pedir `checkSourceUpdate` una sola vez y lo fusiona. Entre la resolución y la
  descarga, el `sha256` y el tamaño confirmados cierran la ventana.
- **El pipeline de la HU-0017.** En el diff de `original_update.rs` solo cambian el origen del paquete, el campo
  `source` de `Prepared` y la caché tras instalar, y cuatro textos. No cambian la descarga, las comprobaciones de
  zip y firma, Gatekeeper, el intercambio, la vuelta atrás ni la limpieza.
- **Caché y reintentos.** Con `schema` 2, una caché sin `schema` o con 1 o 3 se ignora, incluso para pintar (hay
  prueba). No hay bucles: el frontend sondea cada 6 h, al arrancar, al volver del canal y una vez tras un error de
  instalación. Si fallan las dos fuentes no se guarda nada y se vuelve a consultar en el siguiente sondeo, igual que
  antes.
- **Configuración.** `CAP_UPDATE_RELEASES_URL` `[PUBLICO]` está en `.env.example`, en `KEYS` de `build.rs` (entorno,
  `.env.local` o `.env.example`, así que compila igual en los runners de CI) y en `config.rs`, con `releases_url` y una
  validación que exige placeholders y https y nombra la clave rota (3 casos de prueba). No hay URLs en el código.
- **Windows y Linux.** Windows sigue con el feed y la versión instalada (`warning: None`). Linux sigue con APT. El
  único efecto es que la caché se descarta una vez. La rama `platform == "macos"` en ejecución, en vez de `cfg`, es
  equivalente, porque `platform_name()` sale de `cfg!`. Es una desviación aceptada.
- **Privacidad.** No se lee nada de los perfiles. Lo único nuevo que sale es un GET sin parámetros, y el feed recibe
  una versión publicada en vez de la instalada. Los `warning` son textos fijos.
- **Desviaciones declaradas.** `OfficialResolution.package_error` es interno y no forma parte del contrato. Lo acepto:
  guarda el motivo cuando F > instalada sin paquete válido. El mensaje del TOCTOU es neutro y también lo acepto. Que la
  caché schema 2 se descarte una vez en las tres plataformas ya estaba previsto en la arquitectura.

## Hallazgos

| # | Tipo | Responsable | Hallazgo y corrección |
| --- | --- | --- | --- |
| R-1 | Deuda | backend | `resolve_install_target` guarda en la caché **cualquier** resolución distinta de la esperada, también una **peor**. Ejemplo: `RELEASES.json` falla justo al pulsar «Instalar», y la caché pasa de «X disponible» a F (o a «al día» con aviso) durante 30 min. No es un riesgo de integridad, porque lo que se ofrezca sigue verificado y es mayor que la instalada, pero el aviso retrocede por un fallo pasajero. Corrección: guardar solo si `version_is_newer(latest, expected)` o si la resolución no trae `warning` |
| R-2 | Deuda | frontend | El título «…¿Deseas instalarla?» sale también cuando no hay botón «Instalar» (Windows, Linux con APT, macOS con la original fuera de `/Applications`), donde la única acción es «Ver actualización». Corrección: hacer la pregunta solo con `canInstall` y, en los demás casos, «Hay una nueva versión de {appName} (X)» |
| R-3 | Deuda | backend | Los textos de `validate_download_url`, `check_expected_version` y `verify_staged_app` dicen «publicación oficial» también cuando el paquete sale del feed (D-2). Es solo un texto |
| R-4 | Deuda | backend | El primer punto en que se puede cancelar llega tras la resolución, que puede tardar hasta 3 × 5 s (antes, 5 s). Corrección opcional: `if flight.cancelled()` justo después de `resolve_install_target` |

Ninguno bloquea ni hay que corregirlo antes de entregar. R-1 y R-2 cuestan unas pocas líneas cada uno: pueden ir en
esta historia si el mantenedor lo prefiere, o en un `/fix`.

## Documentación

- Actualizado `docs/arquitectura/backend.md` (sección Red): cómo se resuelve la versión objetivo, la caché con
  `schema` 2, el reintento de 30 min y el botón «Instalar».
- Al cerrar le toca al orquestador: `docs/actualizaciones.document.md`, `README.md` y `CHANGELOG.md` (lo pide el
  alcance de la historia), y `pnpm graph:update` / `graph:check`.
