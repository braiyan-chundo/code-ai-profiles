# ADR-0002 · Módulos Rust propios y configuración en compilación

Fecha: 2026-10-28 · Historia: HU-0017 · Propone: architect · Decide: Braiyan Rodriguez (mantenedor) · Estado: aceptado (2026-10-28, «Sí, modificarlas») · **Sustituido en parte por el ADR-0003**

> **Sustituido en parte por el ADR-0003 (2026-10-30).** Ya no rige lo de que los `#[tauri::command]` siguen en
> `lib.rs` y lo demás no se mueve, ni lo de que partir `lib.rs` requiere un ADR. `lib.rs` ya está partido en
> módulos de dominio, y los comandos viven en `commands.rs`. Siguen vigentes `config.rs`, `original_update.rs`
> y el punto 2 (configuración fijada al compilar).

## Contexto

`src-tauri/src/lib.rs` tiene 7 036 líneas en un solo archivo, y la skill `code-ai-profiles-rust-tauri` dice que
partirlo lo decide un ADR. La HU-0017 añade un flujo largo y autocontenido (feed, descarga, verificación,
intercambio de la original y recuperación), con su capa inyectable para pruebas.

Además, la regla fija «nada de configuración en el código» no se cumplía en Rust: el feed oficial, dos descargas de
Windows y la guía de Linux estaban escritas en `lib.rs`, y el `User-Agent` fijo en `0.1` (deuda de HU-0011). La
HU-0017 añade un host de descarga, que tampoco puede ir en el código.

## Decisión

1. **Dos módulos hijos de `lib.rs`**, no un refactor del resto:
   - `src-tauri/src/config.rs`: el único sitio de Rust con URLs y hosts. Expone funciones (`feed_url`,
     `download_hosts`, las URLs del handoff) y `validate()`, que `setup` llama antes de abrir la ventana.
   - `src-tauri/src/original_update.rs`: la instalación de la original en macOS. Usa `super::*`; sus pruebas viven en
     su propio `#[cfg(test)] mod tests`.
   Los `#[tauri::command]` siguen en `lib.rs`, como envoltorios finos, junto a `generate_handler!`. Lo demás de
   `lib.rs` no se mueve en esta historia.
2. **La configuración se fija al compilar.** `src-tauri/build.rs` lee las claves `CAP_*` con esta precedencia:
   entorno del proceso de compilación, `.env.local`, `.env.example`. Las emite con `cargo:rustc-env`, y
   `config.rs` las lee con `env!`. Si falta una, la compilación falla y dice cuál. En ejecución no se lee
   ninguna variable propia.

## Alternativas

| Opción | A favor | En contra |
| --- | --- | --- |
| Todo en `lib.rs` | Sigue la regla actual | Más de 8 000 líneas; la capa de pruebas se mezcla con el resto |
| Partir `lib.rs` entero ahora | Orden general | Diff enorme y riesgo de regresión en una historia de producto |
| Leer las variables en ejecución (`std::env::var`) | Cambiar sin recompilar | Una variable del entorno podría redirigir la descarga de la original |
| Constantes en `config.rs` sin `.env.example` | Más simple | Incumple la regla fija y deja la deuda de HU-0011 a medias |

## Consecuencias

- Se gana: las URLs de Rust tienen catálogo con ficha; la instalación se prueba aislada y no se puede
  redirigir en ejecución. Un fork puede compilar con otros valores sin tocar el código.
- Se paga: hay que recompilar para cambiar una URL. `build.rs` tiene que tolerar los finales `\r\n` del runner de
  Windows. La guarda de configuración (`config.mjs`) sigue sin revisar `.rs`. Para que lo haga, el mantenedor tiene
  que añadir `.rs` a `codigo.extensiones` y marcar con `metodo:permitir` las URLs de las pruebas de `lib.rs`. Es un
  cambio de método, aparte de esta historia.
