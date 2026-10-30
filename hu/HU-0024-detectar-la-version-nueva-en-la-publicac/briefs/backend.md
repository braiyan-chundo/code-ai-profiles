# Brief · HU-0024 · backend

Criterios: AC-01, AC-02, AC-05, AC-06 (AC-03/AC-04 no tocan Rust). Modelo: **opus**, porque decide qué paquete de la
red se instala sobre la original (integridad, permisos, vuelta atrás).
Contrato: `arquitectura.md` § A-1 (aditivo, 0.x), A-2, A-3, A-4.

## Archivos

| Archivo | Qué cambia |
| --- | --- |
| `src-tauri/src/official_release.rs` (nuevo) | `PublishedRelease`, `parse_published_release`, `confirm_published_package`, `OfficialResolution`, `resolve_official_target`, `fetch_published_releases` y sus pruebas |
| `src-tauri/src/lib.rs` | `mod official_release;`; `SourceUpdateSource::OfficialRelease`; `SourceUpdateInfo.warning` (`#[serde(default)]`); `SourceUpdateCache.schema` + `SOURCE_UPDATE_CACHE_SCHEMA = 2`; `UPDATE_CACHE_RETRY_MS`; ayudante común de GET extraído de `fetch_official_feed` (~L1891); `check_official_update_feed` (~L1951) resuelve con A-2 en macOS; `read_source_update_cache` (~L1846) |
| `src-tauri/src/original_update.rs` | `InstallEnvironment::fetch_releases`; `prepare_and_verify` (~L1762) usa `resolve_official_target`; caché nueva en TOCTOU; `installed_update_info(version, checked_at, source)`; textos «publicación oficial»; `FakeEnv` y `end_to_end` |
| `src-tauri/src/config.rs` | `RELEASES_URL` + `releases_url(platform, arch)` + validación y casos de prueba |
| `src-tauri/build.rs` | `KEYS`: añadir `CAP_UPDATE_RELEASES_URL` (8 claves) |
| `.env.example` | La clave nueva con su ficha, junto a `CAP_UPDATE_FEED_URL` |

## Pasos

1. Config: clave, `build.rs`, `config.rs` (`validate_values` exige `{platform}`, `{arch}` y https; caso en
   `validation_names_the_broken_key`). `node .metodo/scripts/config.mjs check`.
2. `official_release.rs` puro (A-2), con la tabla de casos de la arquitectura. La comparación de URL es de
   `reqwest::Url` ya validadas, igualdad exacta. `version_is_newer` y `valid_release_version` vienen de `lib.rs`.
3. Ayudante de GET: mismos límites que hoy (5 s, sin redirecciones, 256 KiB, `User-Agent`), parámetros de query
   opcionales. `RELEASES.json` va **sin** query. El feed sigue con `version` + `NULL_DEVICE_ID`.
4. Detección: en macOS, `RELEASES.json` + feed(instalada) + (si toca) feed(P). Windows idéntico a hoy con
   `warning: None`. Linux no cambia.
5. Caché: `schema` distinto de 2 ⇒ `None` (también para pintar). Con `warning`, `check_source_update_sync` la trata
   como fresca solo 30 min; `system_info_scoped` igual que hoy.
6. Instalación (A-4): resolver con las tres fuentes del `InstallEnvironment`; exigir paquete con la versión esperada;
   si la resuelta difiere, `save_source_update_cache` con ella y error que termine en «La original no cambió.» (lo pone
   `unchanged`). Nada más del pipeline cambia.

## Variables de entorno nuevas

| Nombre | [SECRET]/[PUBLICO] | Apps | Para qué |
| --- | --- | --- | --- |
| `CAP_UPDATE_RELEASES_URL` | [PUBLICO] | desktop (Rust) | Plantilla de `RELEASES.json`: `https://downloads.claude.ai/releases/{platform}/{arch}/RELEASES.json` |

Se añade a `.env.example` con su ficha y se lee solo desde `config.rs` (fijada al compilar, ADR-0002).

## Pruebas

Las 6 de «Pruebas que no pueden faltar» de `arquitectura.md` (1–6), con hosts `*.example.test` y documentos con la
forma real de hoy. Correr: `node .metodo/scripts/pruebas.mjs relacionadas code-ai-profiles src-tauri/src/official_release.rs src-tauri/src/original_update.rs src-tauri/src/lib.rs src-tauri/src/config.rs`
y `cargo test --manifest-path src-tauri/Cargo.toml`. Sin red real en las pruebas.

## Si dudas

`graphify explain "prepare_and_verify"`, `graphify explain "parse_feed_package"`,
`node .metodo/scripts/grafo.mjs impacto "SourceUpdateInfo"`; skills `code-ai-profiles-rust-tauri` y
`code-ai-profiles-configuracion`; `hu/HU-0017-descargar-e-instalar-la-original-en-maco/arquitectura.md` (A-5, A-8).

## No toques

- `src/` entero (incluidos `src/types.ts` y `src/lib/bridge.ts`: son del frontend).
- Descarga, zip, firma, Gatekeeper, intercambio, vuelta atrás, recuperación de restos, `synchronize_after_install`
  (la sincronización automática se queda salvo que la persona responda otra cosa a la Pregunta 2).
- `launch_instance_sync` y `macos_icon.rs`: nada bloquea por versión y así sigue.
- Ningún comando IPC nuevo ni permiso de Tauri. Ninguna elevación (`osascript`, `sudo`).
- Instancias reales, `~/Library/Application Support/com.braiyan.claudeprofiles/`, `/Applications/Claude.app`.

## Skills

`code-ai-profiles-rust-tauri`, `code-ai-profiles-configuracion`, `code-ai-profiles-pruebas`.
