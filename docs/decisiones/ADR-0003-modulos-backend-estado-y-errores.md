# ADR-0003 · Módulos del backend, estado en `tauri::State` y errores tipados

Fecha: 2026-10-30 · Historia: refactor de la rama `refactor-backend` (sin HU) · Propone: architect · Decide: Braiyan
Rodriguez (mantenedor) · Estado: propuesto (lo acepta el mantenedor al fusionar la rama)

## Contexto

`src-tauri/src/lib.rs` había llegado a 7 353 líneas. Tenía los tipos del IPC, los 29 comandos, la lógica de todos los
dominios, las ramas `#[cfg]` de las tres plataformas mezcladas en cada función y las pruebas. El ADR-0002 dejaba
partirlo para un ADR. Además:

- el estado del proceso eran estáticos (`OnceLock<Mutex<…>>`) que ninguna prueba podía aislar;
- todos los errores eran `String`, así que dentro de Rust no se distinguía un fallo de red, que puede volver a
  intentarse, de uno definitivo.

La rama `refactor-backend` (de `1e81123` a `c9ffe82`) hace el corte sin cambiar nada observable. La única excepción
es el texto de error de `atomic_replace_file`, que pasa de tres mensajes a uno. La revisión está en
`docs/arquitectura/revision-refactor-backend.md`.

## Decisión

**El backend se organiza por dominio, con una fachada por plataforma, el estado en `AppState` y un error interno
tipado.** El IPC no cambia: siguen los mismos 29 comandos, con las mismas firmas, los mismos tipos serde y
`Result<T, String>`.

1. **`lib.rs` solo declara.** Contiene los `mod`, los `use <módulo>::*` que reexportan cada dominio en la raíz y
   `run()`, con `.manage(AppState::default())` y `generate_handler![commands::…]`. No lleva lógica, tipos ni pruebas.
2. **Módulos.**

   | Módulo | Qué contiene |
   | --- | --- |
   | `commands.rs` | Los `#[tauri::command]`, como envoltorios finos |
   | `contract.rs` | Los tipos serde del IPC, espejo de `src/types.ts` |
   | `error.rs` | `AppError` |
   | `storage.rs` | Rutas, registro, escritura atómica, `AppState` y el memo de bundles |
   | `processes.rs` | Inventario, identidad y señales verificadas |
   | `scan.rs` | Panel, alcance del refresco y escaneo |
   | `instances/` | Crear, editar y borrar; lanzar y detener; iconos |
   | `sessions/` | Lectura, vínculos y transferencias |
   | `versions/` | Huella, topología, sincronización, feed y «Actualizar original» |
   | `platform/` | Lo específico de cada sistema |
   | `project_picker.rs` | El selector de carpetas |
   | `test_support.rs` | Ayudantes de las pruebas, solo con `cfg(test)` |

   No se tocan `config.rs`, `projects.rs`, `macos_icon.rs`, `original_update.rs` ni `official_release.rs`.
3. **Fachada de plataforma.**
   - `platform/{macos,windows,linux,unsupported}.rs` definen **el mismo conjunto de funciones y constantes con la
     misma firma**, entre ellas `PLATFORM_NAME` y `SHARED_INSTALLATION`.
   - Las señales y los grupos de procesos están en `unix.rs` y `windows.rs`. `unsupported.rs` solo los define fuera de
     unix.
   - `platform/mod.rs` reexporta las funciones del sistema que se compila y guarda lo portable.
   - En el dominio solo quedan `#[cfg(target_os = "macos")]` donde macOS añade pasos propios: el icono, la verificación
     de copias y el handoff de la original.
4. **Estado en `tauri::State`.**
   - `AppState` tiene dos partes:
     - `registry: RegistryLock`: el mutex que serializa leer, modificar y guardar `instances.json`;
     - `runtime: Mutex<RuntimeCache>`: el último panel y los bytes administrados.
   - Se registra con `.manage()`. Los comandos lo leen dentro de `spawn_blocking` con `app_state(&app)`.
   - Las funciones de dominio reciben solo la parte que usan (`&RegistryLock`, `&Mutex<RuntimeCache>`, `&AppState`).
     Así cada prueba puede crear el suyo.
   - Siguen estáticos, a propósito:
     - `application_cache()`: un memo por huella de bundle, que consultan cadenas sin estado a mano;
     - `projects_mutex`, el vuelo de `original_update.rs` y los cerrojos de `macos_icon.rs`.
5. **Errores tipados.**
   - `AppError` (`error.rs`, sin dependencias) guarda el mensaje para la persona, en español y ya redactado, y su
     clase (`AppErrorKind`).
   - `Display` y `From<AppError> for String` devuelven el mensaje tal cual.
   - `From<String>` crea un error de clase `Other`.
   - Solo `Network` es reintentable (`is_retryable`). Ningún camino reintenta solo.
   - Hoy usan `AppError` `storage`, `processes` (también `signal_verified_processes`) y `versions/feed.rs`.

### Reglas para lo nuevo

- **Un comando**
  - Va en `commands.rs`, como `pub(crate) async fn`, con la E/S en `spawn_blocking`. Si muta el registro, la envuelve
    en `app_state(&app).with_registry_operation(|| …)`.
  - Se añade su nombre en `generate_handler![commands::…]` y su espejo en `src/types.ts` y `bridge.ts`.
  - La lógica va en `<nombre>_sync` dentro del módulo de su dominio, nunca en `commands.rs` ni en `lib.rs`.
- **Una función de plataforma**
  - Va en los cuatro archivos de `platform/` (o en `unix.rs` y `windows.rs` si es de procesos), con la misma firma.
    La de `unsupported.rs` devuelve un error explícito o el valor neutro.
  - Nada de `#[cfg(target_os)]` nuevo en el dominio, salvo un paso que solo exista en macOS.
  - Una función pura que se prueba en todas las plataformas va en `platform/mod.rs`.
- **Un error**
  - En el dominio, una función nueva devuelve `Result<T, AppError>`, con el constructor de su clase y el mismo estilo
    de mensaje («No se pudo <acción>: {error}»).
  - `String` solo aparece en `commands.rs` y en los `*_sync` que llaman los comandos. Se convierte con `?` o
    `String::from`, nunca con `format!("{error:?}")`.
  - Un reintento automático o una decisión tomada por la clase necesita una historia.
- **Estado**
  - Lo que depende de la sesión de la app va en `AppState`, nunca en un `static` nuevo.
  - Un `static` solo se acepta para un memo cuya clave determina el valor (como `application_cache`) y se justifica en
    su comentario.
  - No se toma un cerrojo dentro de otro, salvo en el orden registro → caché. El mutex no es reentrante: una
    función que ya corre dentro de `with_registry_operation` no lo vuelve a pedir.
- **Nombres y visibilidad**
  - Cada nombre exportado es único en todo el crate. Los `use super::*` y los globs de `lib.rs` convierten dos
    nombres iguales en un error de ambigüedad, y puede salir solo en una plataforma.
  - Lo que no sale de su módulo es privado (o `pub(super)`). `pub(crate)` solo para lo que usa otro módulo.
- **Pruebas**
  - Cada módulo lleva su `#[cfg(test)] mod tests` con `use crate::test_support::*`.
  - Una prueba de red solo abre `127.0.0.1`.

## Alternativas

| Opción | A favor | En contra |
| --- | --- | --- |
| Seguir con `lib.rs` único (ADR-0002) | Ningún riesgo de corte | 7 000+ líneas, `#[cfg]` mezclados y pruebas que no se aíslan |
| Un crate por dominio (workspace) | Fronteras que comprueba el compilador | Diff mucho mayor y más tiempo de compilación, sin necesidad hoy |
| `thiserror`/`anyhow` en lugar de `AppError` | Menos código propio | Una dependencia más, y el IPC sigue siendo `String` |
| Estado con `tauri::State<'_, T>` en la firma del comando | Lo idiomático de Tauri | No es `'static`, así que no entra en `spawn_blocking` sin clonar |
| Mover también `application_cache` a `AppState` | Cero estáticos | Obliga a reescribir la verificación de `macos_icon.rs` y de la topología |

## Consecuencias

- **Se gana:**
  - módulos de 100 a 800 líneas con su responsabilidad escrita en el `//!`;
  - un archivo por sistema, que se lee entero;
  - pruebas que crean su propio estado (+16, sin perder ninguna de las 184 anteriores);
  - la red, separada de lo definitivo dentro de Rust.
- **Se paga:**
  - `use super::*` y los globs hacen que cada módulo vea todo, así que las fronteras se cumplen por convención y no
    por el compilador;
  - todo es `pub(crate)` (se irá estrechando al tocar cada módulo);
  - `AppError` y `String` conviven hasta que se migre el resto;
  - Windows solo se comprueba en `build-desktop.yml`, porque ninguna CI lo prueba de forma nativa.
- **Supersede en parte al ADR-0002.** Sustituye la parte del punto 1 que dejaba los `#[tauri::command]` en `lib.rs`,
  y que `lib.rs` no se partiera sin un ADR. El resto del punto 1 (`config.rs` y `original_update.rs` como módulos
  propios) y el punto 2 (configuración fijada al compilar) siguen vigentes.
