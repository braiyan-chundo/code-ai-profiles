# Brief · HU-0031 · backend

Criterios: AC-01, AC-02 (abrir), AC-04. Modelo: opus, porque añade un comando que entrega un archivo del proyecto al
sistema y tiene que mantener las defensas de rutas en las tres plataformas.
Contrato: `arquitectura.md` § A-1, A-2 y A-5 (aditivo, 0.x, sin major).

## Archivos

| Archivo | Qué cambia |
| --- | --- |
| `src-tauri/src/projects.rs` | `ProjectDocumentKind::Design` y `ProjectDocumentStatus::TooLarge` al final; comentarios de `content`/`message`; reexporta `open_history_mockup_sync` (línea 24) |
| `src-tauri/src/projects/reader.rs` | `MOCKUP_LIMIT`; `DOCUMENTS` a 5 entradas `(kind, componentes, tope)`; comprobación de la carpeta sacada a una función común; `history_mockup_url` y `open_history_mockup_sync`; doc del módulo |
| `src-tauri/src/commands.rs` | `open_history_mockup(id, folder)` junto a `open_external_link`, con `spawn_blocking` |
| `src-tauri/src/lib.rs` | registra `commands::open_history_mockup` (junto a la línea 104) |
| `src-tauri/src/projects/tests.rs` | pruebas nuevas (abajo); `"design"` y `"tooLarge"` en H25-6 |
| `src/types.ts` | `"design"` en `ProjectDocumentKind`, `"tooLarge"` en `ProjectDocumentStatus`; comentarios |

## Pasos

1. `const MOCKUP_LIMIT: u64 = 1024 * KIB;` `DOCUMENTS`: hu `["hu.md"]`, architecture, verification, timeline (todos
   `DOCUMENT_LIMIT`) y design `["diseno", "maqueta.html"]` con `MOCKUP_LIMIT`. Ese orden.
2. `rel`/`own` plegando componentes sobre `base`/`own_base` (**nunca** `join("diseno/maqueta.html")`); `file` = último;
   `path = format!("hu/{folder}/{}", parts.join("/"))`. Lo demás del bucle igual, salvo `Err(Skip::TooLarge)` en
   design → `status: TooLarge`, `content: None`, mensaje «maqueta.html pesa más de 1 MiB y no se pinta aquí.».
3. Saca el bloque de la carpeta de la historia (líneas 84-102) a una función que devuelva `(ctx, base, own_base)` o
   equivalente; mismos mensajes; la usan la lectura y la URL.
4. `pub(super) fn history_mockup_url(app_data, env, id, folder) -> Result<reqwest::Url, AppError>` según § A-5:
   carpeta válida y propia; `ctx.resolve` de la maqueta; `canonical == own`; `is_file()`; no nube; sin tope;
   `reqwest::Url::from_file_path(&canonical)` y `scheme() == "file"`. Mensajes literales de § A-5. No abre nada.
5. `pub(crate) fn open_history_mockup_sync(app, id, folder) -> Result<(), String>`: `environment(app)`, la URL y
   `open_external_url(url.as_str())`, mapeando su error a «No se pudo abrir la maqueta en el navegador.». No toques
   `open_external_url` ni `external_link` (este sigue solo con http/https).
6. `src/types.ts` solo tipos y comentarios. `bridge.ts` lo hace el frontend.

## Variables de entorno nuevas

Ninguna.

## Pruebas

En `tests.rs`, prefijo `H31-`, con el estilo de H25-4a/4b; `Fixture::write` crea carpetas.

- **Lectura presente**: `diseno/maqueta.html` (`"<!doctype html>\r\n<p>x</p>"`) → último `(Design, "maqueta.html")`, `path`
  `hu/HU-0002-registro/diseno/maqueta.html`, `\n`, `Ok`. `diseno/otra.html` y `diseno/captura.png` no se leen (siguen 5).
  Huella de `p` y registro intactos.
- **Ausente**: H25-4a sigue con cuatro; `diseno/` vacía → sin `Design`.
- **Topes**: maqueta de `MOCKUP_LIMIT` → `Ok`; `+1` → `TooLarge`, `content None`, el mensaje. Un `.md` de 512 KiB + 1
  sigue `Unreadable` (no `TooLarge`). Maqueta con `\0` → `Unreadable` «maqueta.html no es un archivo de texto.».
- **Symlinks en la lectura** (`#[cfg(unix)]`, como el bloque de la línea 1756): `maqueta.html` → fuera del proyecto;
  → `../hu.md`; `diseno` → carpeta fuera; `diseno` → otra carpeta del proyecto. La llamada es `Ok`, `Design` `Unreadable`
  con «fuera», las demás pestañas siguen.
- **URL de abrir** (`history_mockup_url`): presente → `scheme "file"`, `to_file_path()` igual a la ruta del fixture;
  mayor de 1 MiB → `Ok` (sin tope); con un proyecto en una carpeta con espacio y `#` → la URL lleva `%20` y `%23`
  y vuelve a la misma ruta (si `pinned_reference` no deja elegir la carpeta, ancla otra con ese nombre). Rechaza: ausente; `diseno/maqueta.html` que es carpeta; los cuatro symlinks de arriba
  (`#[cfg(unix)]`); nube (`env` con `cloud: |_, _| true`); `folder` manipulado (`../x`, `HU-0002/diseno`) → entrada no
  válida; proyecto no anclado → `NOT_PINNED`. Ninguna prueba llama a `open_external_url`.
- **Contrato** (H25-6): `Design` → `"design"`, `TooLarge` → `"tooLarge"`.

`node .metodo/scripts/pruebas.mjs relacionadas code-ai-profiles src-tauri/src/projects/reader.rs src-tauri/src/projects.rs src-tauri/src/projects/tests.rs src-tauri/src/commands.rs src-tauri/src/lib.rs src/types.ts`
y `pnpm build`.

## Si dudas

`graphify explain "read_project_history_at"`, `node .metodo/scripts/grafo.mjs impacto "open_external_url"`;
`ReadContext::resolve`/`read` en `src-tauri/src/projects.rs:592` y `:670`; la skill `code-ai-profiles-rust-tauri`.

## No toques

`tauri.conf.json`, `capabilities/default.json`, `build.rs`, `platform/*.rs`, `ReadContext`, `Skip`, `DOCUMENT_LIMIT`,
`external_link`, `src/lib/bridge.ts`, `src/features/`.

## Skills

`code-ai-profiles-rust-tauri`, `code-ai-profiles-pruebas`, `code-ai-profiles-configuracion`.
