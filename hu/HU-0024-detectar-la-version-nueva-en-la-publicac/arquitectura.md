# Arquitectura · HU-0024 · Detectar la versión nueva en la publicación oficial e instalarla

## Análisis

Confianza: **alta**. El pipeline de instalación de la HU-0017 ya hace todo lo difícil (descarga acotada, `sha256`,
tamaño, zip, firma con el DR de la instalada, equipo, Gatekeeper, intercambio atómico con vuelta atrás, temporales
borrados). Lo que falta es **de dónde sale la versión objetivo**: hoy, del `currentRelease` del feed preguntado con la
versión instalada, que no ve el despliegue escalonado. Esta historia añade una segunda fuente oficial y una función pura
que resuelve cuál manda; el resto se reutiliza.

Leído: `hu.md`, `seguimiento.md`, `src-tauri/src/lib.rs` (`fetch_official_feed`, `source_update_from_feed`,
`check_official_update_feed`, `check_source_update_sync`, caché, `build_version_topology`, `system_info_scoped`,
`launch_instance_sync`), `src-tauri/src/original_update.rs` (`parse_feed_package`, `InstallEnvironment`,
`prepare_and_verify`, `check_expected_version`, `verify_staged_app`, `installed_update_info`, `FakeEnv`),
`src-tauri/src/config.rs`, `src-tauri/build.rs`, `.env.example`, `macos_icon::launch_preflight`, `src/types.ts`,
`src/lib/bridge.ts`, `src/lib/source-update-controller.ts`, `src/features/updates/*`,
`src/features/instances/InstanceDetail.tsx`, las rutas `dashboard`, `original` e `instance`, `docs/arquitectura/backend.md`,
la arquitectura de la HU-0017 y `graphify query` del área.

Comprobado hoy (2026-10-29, GET sin identificadores; el feed, con el UUID nulo como ya hace la app):

- `RELEASES.json` de `darwin/universal`: `currentRelease` 4.4212.0 y `updateTo.url` =
  `…/4.4212.0/Claude-cbfe3c56d49c49332ad5a9588303c9dbc70a5e7f.zip`, sin `sha256` ni `size`. `cache-control: max-age=60`.
- El feed con `version=4.4212.0`: `currentRelease` 4.4212.0 y **la misma `url` byte a byte**, con `sha256` y
  `size` 378 758 916. La coincidencia exacta de la URL es la prueba cruzada que hace D-1 robusta frente al «eco».
- Nada bloquea hoy abrir una instancia con una versión anterior: `launch_instance_sync` no compara versiones y
  `launch_preflight` (HU-0020) solo rechaza que una copia baje por debajo de **su propia** versión registrada, no de la
  original. En la interfaz, «Abrir» solo se desactiva con `busy` o `missing`. AC-04 es solo interfaz.
- El aviso de la actualización oficial ya se monta en el dashboard y en `#/original` (`SourceUpdateBanner` en
  `DashboardRoute` y `OriginalRoute`): D-3 se cumple sin piezas nuevas.

### Supuestos

- **S-1** · `RELEASES.json` sigue publicando `{currentRelease, releases[{version, updateTo{version, url}}]}`. Si cambia,
  la detección cae al feed (D-2) con un aviso, y nada se bloquea.
- **S-2** · El feed preguntado con una versión publicada devuelve su paquete con la misma `url`. Si deja de hacerlo, esa
  versión no se ofrece (no es verificable) y se avisa; queda «Abrir {app}».
- **S-3** · Solo macOS. Windows sigue con el feed sin cambios (no se consulta `RELEASES.json`); Linux, con APT.
- **S-4** · «Con la contraseña de administrador» (AC-02) se lee como en la HU-0017: hace falta una **cuenta de
  administrador** (renombrar en `/Applications` sin `sudo`) y, si macOS lo pide, el permiso «Gestión de apps». No se
  añade ninguna elevación nueva (ver Pregunta 3).

### Preguntas (los briefs asumen la recomendación; ninguna bloquea)

1. **Nombre en el aviso.** La petición dice «Claude Desktop». La app nunca escribe el nombre a mano: usa el del bundle
   (`originalAppName`), que en macOS es «Claude». Recomiendo `Hay una nueva versión de {appName} (X). ¿Deseas
   instalarla?` → «Hay una nueva versión de Claude (4.4212.0)…». Si quieres el literal «Claude Desktop», es un texto.
2. **Sincronización automática tras instalar.** La HU-0017 ya sincroniza **sola** las instancias detenidas al terminar
   (y deja pendientes las que están en marcha). Con eso, tras instalar casi nunca quedará una detenida por detrás y el
   botón de AC-03 aparecerá solo para las pendientes, las que fallaron o las que se queden atrás después. Recomiendo
   mantenerla (menos clics, ya probada). Alternativa: quitarla para que siempre lo haga el botón (una línea en
   `install_and_synchronize`).
3. **Contraseña de administrador.** El flujo de la HU-0017 no pide contraseña: exige cuenta de administrador. Pedirla
   (`osascript … with administrator privileges`) sería una elevación nueva que esta historia no necesita. Recomiendo no
   añadirla; AC-02 se verifica con una cuenta de administrador.

### Impacto

| Símbolo que cambia | Consumidores (grafo y `rg`) | Qué se rompe |
| --- | --- | --- |
| `SourceUpdateInfo` (+`warning`) | `lib.rs`, `original_update.rs`, `types.ts`, `bridge.ts` (2 mocks), `source-update-controller.ts`, `tests/source-update-controller.test.ts` | Nada si es aditivo: `#[serde(default)]` al leer la caché; los mocks TS ganan `warning: null` |
| `SourceUpdateSource` (+`officialRelease`) | Igual; la UI solo mira `source !== null` | Nada |
| `SourceUpdateCache` (+`schema`) | `read/save_source_update_cache`, pruebas de caché en `lib.rs` y `original_update.rs` | La caché anterior se descarta una vez (también en Windows y Linux: una consulta más) |
| `InstallEnvironment::fetch_feed` (+`fetch_releases`) | `SystemEnvironment`, `FakeEnv` | `FakeEnv` y `end_to_end` se adaptan |
| `installed_update_info` (+`source`) | `install_and_synchronize`, 1 prueba | Firma |
| `check_official_update_feed` (macOS) | `check_source_update_sync` | Más consultas: 2–3 GET cada 6 h, solo macOS |

- **Contrato IPC:** sí, aditivo (0.x, sin major). Ningún comando nuevo; `install_original_update` igual.
- **Datos guardados:** `source-update-cache.json` gana `schema`; la anterior se ignora (sin migración).
- **Permisos:** ninguno nuevo. **Red:** una salida nueva autorizada (`RELEASES.json` en `downloads.claude.ai`, host ya
  permitido para el paquete). **Privacidad:** no se lee nada de los perfiles; el feed recibe una versión publicada en
  vez de la instalada, con el `device_id` nulo de siempre.
- **Riesgosa: sí** (escribe sobre la original con lo que dice la red; `riesgo: [permisos, contrato]`). Revisión técnica
  obligatoria.

## Solución

### A-1 · Contrato (aditivo, 0.x)

Rust (`lib.rs`) y su espejo TS (`src/types.ts`):

```rust
enum SourceUpdateSource { OfficialFeed, AptCache, OfficialRelease }   // "officialRelease"
struct SourceUpdateInfo { /* …lo de hoy… */ #[serde(default)] warning: Option<String> }
struct SourceUpdateCache { #[serde(default)] schema: u32, platform, installed_version, result }
```

```ts
export type SourceUpdateSource = "officialFeed" | "aptCache" | "officialRelease";
export interface SourceUpdateInfo { /* …lo de hoy… */ warning: string | null; }
```

- `source: "officialRelease"` ⇒ la versión salió de `RELEASES.json` y su paquete quedó confirmado por el feed.
- `warning`: una frase para la persona cuando una fuente falló o no se pudo verificar, aunque la otra respondiera
  (AC-06). `null` en lo demás. Nunca lleva URLs, cabeceras ni cuerpos de respuesta.
- `install_original_update({ expectedVersion })` no cambia; `expectedVersion` puede venir ahora de `officialRelease`.

### A-2 · Resolución de la versión objetivo (D-1, D-2) · `src-tauri/src/official_release.rs` (nuevo)

Funciones puras, más una de red:

- `parse_published_release(doc, hosts) -> Result<PublishedRelease { version, url }>`: `currentRelease` válido
  (`valid_release_version`), la entrada cuyo `updateTo.version == currentRelease`, `url` por `validate_download_url`
  (https, sin credenciales, 443, host exacto, `.zip`). Ignora `name`, `pub_date`, `notes`.
- `confirm_published_package(feed_doc, published, hosts) -> Result<FeedPackage>`: `parse_feed_package(feed_doc)` y,
  además, `package.version == published.version` **y** `package.url == published.url` (comparando `Url` ya parseadas).
- `resolve_official_target(installed, feed_for_installed: Result<Value>, published: Result<Value>, feed_for_version:
  &mut dyn FnMut(&str) -> Result<Value>, hosts) -> Result<OfficialResolution { latest_version, package:
  Option<FeedPackage>, source, warning }>`:
  1. `F` = `currentRelease` válido de `feed_for_installed`; `P` = `parse_published_release(published)`.
  2. Si `P > installed` y (`F` no existe o `P > F`): pide `feed_for_version(P)`. Si `confirm_published_package` va
     bien → `{P, Some(paquete), OfficialRelease, None}`. Si no → aviso «La publicación oficial anuncia la versión P,
     pero no se pudo verificar su paquete; se reintentará más tarde.» y sigue.
  3. Si hay `F` → `{F, parse_feed_package(feed).ok() si F > installed, OfficialFeed, aviso}`; si `P` falló al leerse,
     aviso «No se pudo leer la publicación oficial de versiones; se reintentará más tarde.».
  4. Sin `F`: si `P ≤ installed` → `{P, None, OfficialRelease, None}`; si no → `Err` (el mensaje del feed).
- `fetch_published_releases(platform, arch) -> Result<Value>`: GET a `config::releases_url(platform, arch)` con los
  mismos límites que el feed (5 s, sin redirecciones, 256 KiB, `User-Agent` propio), **sin query** ni identificadores.
  Se extrae de `fetch_official_feed` un ayudante común en `lib.rs` (URL + query + textos) para no duplicar los límites.

`F > P` (la publicación va por detrás) ⇒ manda el feed sin consulta extra (D-2). Como mucho 3 GET por comprobación.

### A-3 · Detección (`check_official_update_feed`, macOS)

Lee `RELEASES.json` y el feed con la versión instalada, resuelve con A-2 y devuelve `SourceUpdateInfo { status:
update_status(installed, latest), latest_version, checked_at, stale: false, source, warning }`. Windows: igual que hoy
con `warning: None`. Linux: APT, igual.

Caché y cadencia: la misma (`UPDATE_CACHE_FRESH_MS` 6 h; `STALE` 7 días; sondeo de la interfaz cada 6 h, al arrancar y
al volver del canal oficial). Dos cambios: `SOURCE_UPDATE_CACHE_SCHEMA = 2` (una caché sin él o con otro valor no se
usa, ni para pintar) y `UPDATE_CACHE_RETRY_MS = 30 min`: un resultado **con `warning`** solo cuenta como fresco 30 min
para `check_source_update_sync`, así el siguiente arranque o sondeo reintenta (AC-06). Para pintar el panel
(`system_info_scoped`) vale como hoy.

### A-4 · Instalación (`prepare_and_verify`)

`InstallEnvironment` gana `fetch_releases()`; `fetch_feed(version)` se pregunta con la instalada y con `P`. En vez de
`parse_feed_package(fetch_feed(installed))`, se llama a `resolve_official_target` con las tres fuentes y se exige
`resolution.package` con `version == expectedVersion` (`check_expected_version` sigue: igual a la esperada y mayor que la
instalada). Si la versión resuelta ya no es la esperada (TOCTOU: salió otra entre la detección y el clic), se guarda en
la caché la resolución nueva **antes** de devolver el error «…ya anuncia la versión Y… vuelve a comprobar», para que el
aviso no se quede ofreciendo X. El resto (descarga, `sha256`, tamaño, zip, firma, equipo, Gatekeeper,
`CFBundleShortVersionString == X`, X > instalada, intercambio con vuelta atrás, temporales, sincronización) **no cambia**.
`installed_update_info(version, checked_at, source)` guarda la fuente real. Los textos «del feed oficial» que vea la
persona pasan a «de la publicación oficial» donde la versión venga de ahí.

### A-5 · Interfaz

- **Aviso (dashboard y `#/original`, D-3)** · `sourceUpdatePresentation`, `kind: "available"`: título «Hay una nueva
  versión de {appName} (X). ¿Deseas instalarla?»; detalle «Instalada A · publicada X.» (+ motivo de bloqueo). En
  macOS, acción principal **«Instalar»** (el `installOriginal` de hoy, sin diálogo) y secundaria «Abrir {appName}». La
  original en marcha: «Instalar» desactivado con «Cierra {appName} para actualizarla.» (ya existe). No es modal.
- **Avisos de AC-06** · `current` + `originalBehind` → el «local-ahead» de hoy con `warning` añadido al detalle.
  `current` + `warning` sin nada más → `kind: "uncertain"`, título «No se pudo confirmar si hay una versión nueva»,
  detalle = `warning`, acción «Comprobar actualización». `available` ignora `warning`.
- **Tras un error de instalación** · `installOriginal` vuelve a pedir `checkSourceUpdate` y lo fusiona
  (`mergeSourceUpdateForInstallation`): así un TOCTOU muestra la versión nueva sin esperar 6 h.
- **Instancias obsoletas (AC-03)** · `SynchronizeBanner`: el botón pasa de «Sincronizar» a **«Actualizar instancias
  obsoletas»** (misma acción y diálogo).
- **Aviso por instancia (AC-03, AC-04)** · `InstanceDetail`: si está por detrás, botón **«Actualizar»** junto a «Abrir»
  que abre el diálogo de sincronización con esa sola instancia; desactivado si está en marcha («Detén la instancia para
  actualizarla»). «Abrir» no cambia: nunca se bloquea por versión. `UsageRanking` (dashboard): insignia «Actualizar» en
  las filas por detrás (la fila es un enlace: insignia, no botón). Windows también (es la sincronización); Linux no
  tiene instancias por detrás.

### Datos

`source-update-cache.json` (`app_data`): `{schema: 2, platform, installedVersion, result: SourceUpdateInfo}`. Nada más.

### Variables de entorno nuevas

| Nombre | [SECRET]/[PUBLICO] | Apps | Para qué |
| --- | --- | --- | --- |
| `CAP_UPDATE_RELEASES_URL` | [PUBLICO] | desktop (Rust), fijada al compilar | Plantilla de la publicación oficial de versiones; `{platform}` y `{arch}` se sustituyen. Valor: `https://downloads.claude.ai/releases/{platform}/{arch}/RELEASES.json` |

`build.rs` la añade a `KEYS`; `config.rs`: `releases_url(platform, arch)` y validación (placeholders + https).

### Señales

No hay observabilidad (app local, sin telemetría).

### Riesgos

| Riesgo | Mitigación |
| --- | --- |
| TOCTOU entre `RELEASES.json` y el feed | Exigir versión y **URL idénticas**; si no, esa versión no se ofrece y se avisa. En la instalación se resuelve otra vez (A-4) |
| TOCTOU entre detección e instalación | `expectedVersion` + caché actualizada + nueva comprobación desde la interfaz |
| Eco del feed (devuelve la versión que se le pregunta) | La versión siempre sale de `RELEASES.json`; URL idéntica; después `sha256`, tamaño, firma con el DR de la instalada, equipo, Gatekeeper, versión del bundle y «mayor que la instalada». Un eco no instala nada que Anthropic no haya firmado ni una versión menor |
| Bajada de versión | `check_expected_version` y `verify_staged_app` exigen X > instalada |
| Fallo a mitad | Vuelta atrás de la HU-0017 sin cambios |
| Original abierta | Se comprueba antes y durante el intercambio (HU-0017) |
| Windows/Linux | Sin consultas nuevas; solo la caché se descarta una vez. La clave nueva se compila y valida en las tres |
| La caché vieja dice «al día» | `schema` la invalida |

### Pruebas que no pueden faltar

Rust (`cargo test --manifest-path src-tauri/Cargo.toml`), con hosts `*.example.test`:

1. `parse_published_release`: forma de hoy; rechaza `currentRelease` inválido, sin entrada, URL http/otro host/credenciales/puerto/`.dmg`.
2. `confirm_published_package`: acepta URL idéntica; rechaza otra versión, otra URL (mismo host), sin `sha256`/`size`.
3. `resolve_official_target`, tabla: F=4.29.0, P=4.4212.0 verificable → `officialRelease` 4.4212.0 (AC-01, AC-05);
   P sin verificar → F + aviso; P falla → F + aviso; F > P → feed sin llamar a `feed_for_version`; F falla y P ≤
   instalada → al día; ambas fallan → `Err`.
4. Caché: `schema` antiguo ignorado; con `warning`, fresca 30 min y no 6 h.
5. `end_to_end` con `FakeEnv` (feed por versión + `RELEASES.json`): instala la versión publicada; con versión resuelta
   distinta de la esperada, error, la original intacta y la caché con la nueva.
6. `config.rs`: `CAP_UPDATE_RELEASES_URL` sin placeholders o http → error con su nombre.

Frontend (`pnpm build` y `tests/`): `sourceUpdatePresentation` (título nuevo, `warning` en «uncertain» y «local-ahead»,
`officialRelease` cuenta como fresco).

Pendiente humano: instalar 4.4212.0 real sobre la original 4.29.0 (también la prueba real de la HU-0017).

## Briefs y orden

1. `briefs/backend.md` — modelo **opus**: escribe sobre la original con datos de red (integridad del paquete, permisos).
2. `briefs/frontend.md` — modelo **sonnet**: textos, presentación y un botón sobre acciones que ya existen.

En paralelo: el contrato está fijado aquí. `src/types.ts` y `src/lib/bridge.ts` son solo del frontend; backend solo
toca `src-tauri/`, `.env.example` y nada de `src/`.

## Revisión técnica

**PASS** (2026-10-29, HEAD `40b13c5`). Detalle y hallazgos R-1..R-4 (deuda) en `revision-tecnica.md`.
