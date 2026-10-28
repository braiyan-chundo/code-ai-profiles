# Revisión técnica · HU-0011 · Adopción v4

**Veredicto: FAIL**. Hay dos bloqueos en el borrador del pack `rust-tauri` (R-1 y R-2). La skill de frontend y el archivado de `.codex/` y `.agents/` pasan, con observaciones.

Revisado el 2026-10-27 sobre el árbol de trabajo de `adopcion-v4` (HEAD `a52b658`, con cambios sin commitear). `pruebas.mjs estado`: «HEAD a52b658 sin suite en verde». La historia no toca código de producto, así que esto no bloquea, pero la suite se corre sobre el SHA final antes de cerrar.

Responsable de todas las correcciones: orquestador, que es quien escribió los documentos de gobierno revisados.

## Bloqueos

### R-1 (B) · rust-tauri: la regla de rutas y entorno es falsa para la aplicación y el perfil originales

- **Dónde**: `hu/HU-0011-adopcion-v4/pack-rust-tauri/skills/rust-tauri/SKILL.md:14-17`, `:72-73`, `:119-120` y `:137-138`.
- **Qué falla**: la skill dice que las rutas salen de `ManagedPaths::resolve`, que «nunca se lee `HOME`», que no hay `std::env::var` sueltos y que no se hace `rename` sobre rutas que no salgan de `root_for`/`ManagedPaths`. El código hace otra cosa, y con razón:
  - `detect_provider_source` (`src-tauri/src/lib.rs:1058`) y `detect_original_profile` (`lib.rs:1116`) usan `dirs::home_dir()` y `env::var_os("LOCALAPPDATA" | "APPDATA" | "XDG_CONFIG_HOME")` (`lib.rs:1013`, `1062`, `1072`, `1102`, `1119`, `1127`, `1132`, `1140`);
  - `resolve_transfer_profile` (`lib.rs:1172`) acepta `ORIGINAL_INSTANCE_ID`, que no es un UUID, y la ruta de un perfil administrado sale de `instance.profile_path` en el registro, no de `root_for`;
  - copiar o devolver sesiones al perfil original escribe con `atomic_replace_file`, es decir, con `rename`, fuera de `ManagedPaths`.

  Un agente que siga la skill «corregiría» la detección por plataforma, por ejemplo llevando `LOCALAPPDATA` a `config.rs` y `.env.example`. También podría rechazar una transferencia legítima. Es justo el área que más ha costado en este proyecto.
- **Corrección**:
  - Sustituir las líneas 72-73 por: «Las rutas administradas salen de `ManagedPaths::resolve(app)` (`app_data_dir`). La instalación y el perfil de la aplicación original se localizan solo con `detect_provider_source` y `detect_original_profile`, que usan `dirs::home_dir()` y las variables del sistema operativo (`APPDATA`, `LOCALAPPDATA`, `XDG_CONFIG_HOME`). Esas variables son convenciones de la plataforma, no configuración: no van a `config.rs` ni a `.env.example`. No se arma `~` a mano.»
  - En la línea 15, cambiar «que el id es un UUID (`ManagedPaths::root_for`)» por «que el id es un UUID (`ManagedPaths::root_for`) o `ORIGINAL_INSTANCE_ID`, y que la ruta sale de `resolve_transfer_profile`, del registro o de `ManagedPaths`».
  - En la línea 119, cambiar por «Nada de `std::env::var` para configuración propia. Si hace falta, va a `src-tauri/src/config.rs` con su ficha en `.env.example`. Se exceptúan las variables de ubicación del sistema operativo de la línea 72.»
  - En la línea 137, cambiar por «`remove_dir_all` o `rename` sobre una ruta que no salió de `ManagedPaths`, del registro o de `detect_original_profile`.»

### R-2 (B) · pack.json: el comando «relacionadas» de cargo da verde sin correr ninguna prueba

- **Dónde**: `hu/HU-0011-adopcion-v4/pack-rust-tauri/pack.json:10`.
- **Qué falla**: `"cargo test --manifest-path src-tauri/Cargo.toml -q {archivos}"`. `pruebas.mjs` (`.metodo/scripts/pruebas.mjs:127`) sustituye `{archivos}` por rutas entre comillas. Con un archivo, cargo lo toma como filtro de nombre de prueba: no coincide ninguna, se ejecutan 0 pruebas, sale 0 y queda verde. Con dos archivos, cargo falla por argumento inesperado. Una vez instalado el pack, la verificación de backend registraría verdes falsos. Además contradice la propia skill (`SKILL.md:132-133`), que pide filtrar por nombre de prueba.
- **Corrección**: `"relacionadas": "cargo test --manifest-path src-tauri/Cargo.toml -q"`, sin `{archivos}`, porque en esta crate todas las pruebas viven en `lib.rs` y no hay forma fiable de mapear un archivo a sus pruebas. Si se quiere filtrar, que sea a mano y por nombre, como dice la skill.

## Observaciones (no bloquean)

### R-3 (O) · rust-tauri: el registro no se guarda de forma atómica

`SKILL.md:74-75` incluye el registro entre los JSON que se reemplazan con `atomic_replace_file`. No es así: `save_registry` (`lib.rs:781-791`) usa `fs::write`. Corrección: «Los enlaces de sesión y la caché del feed se reemplazan con `atomic_replace_file`… El registro (`save_registry`) todavía usa `fs::write`: es deuda conocida. Lo nuevo usa `atomic_replace_file`.»

### R-4 (O) · rust-tauri: la identidad del proceso está mal descrita

`SKILL.md:82-90` dice que la instancia se identifica por PID, hora de inicio y `launch_generation`. La identidad real es `ManagedProcessIdentity`: `root_pid`, `process_group_id`, `start_time`, `fingerprint` y `profile_argument` (`lib.rs:4546-4552`). `launch_generation` solo sirve para descartar eventos viejos del reaper. Corrección:

- nombrar `ManagedProcessIdentity`;
- añadir «las señales se envían solo a través de `signal_instance_processes` (`lib.rs:4610`), que verifica la huella y la hora de inicio antes de señalizar y, en unix, señala al grupo de procesos (`process_group(0)`). Nunca se escribe un `libc::kill` o un `taskkill` nuevo»;
- anotar que hoy ningún código de `src/` escucha `instance-process-exited`.

### R-5 (O) · rust-tauri: hay más `expect` que el de `run()`

`SKILL.md:67-68` dice que el único `expect` aceptado es el de `run()`. Hay otros tres fuera de las pruebas: `lib.rs:3555`, `3721` y `3740`, sobre invariantes de `RefreshScope`. Corrección: «… salvo los `expect` de invariantes internos ya existentes en `refresh_registry_scoped`. No se añaden nuevos.»

### R-6 (O) · rust-tauri: faltan ejecutables y formas de `cfg`

- `SKILL.md:96-98` no lista `/usr/bin/open` (macOS), `explorer.exe` (Windows) ni `xdg-open` (Linux), que están en `lib.rs:5446-5450` y `5496`.
- `SKILL.md:94-95` exige las tres ramas `target_os`, pero el código usa `#[cfg(unix)]` (macOS y Linux juntos), una rama `windows` y una final `#[cfg(not(any(...)))]` con error (`lib.rs:4639-4703`). Corrección: «las tres plataformas cubiertas, con `target_os` o con `unix` + `windows`, y una rama `not(any(...))` con un error explícito».

### R-7 (O) · rust-tauri: la deuda de URLs se queda corta

`SKILL.md:121-122` solo menciona la URL del feed. También están escritas en el código `lib.rs:1038`, `1042` (descarga de Windows) y `1046` (artículo de soporte de Linux). Además, el `User-Agent` `"Code-AI-Profiles/0.1"` de `lib.rs:1927` no sigue la versión 0.2.2. Corrección: listar las cuatro URLs y el `User-Agent` como deuda de HU-0011. El User-Agent puede salir de `env!("CARGO_PKG_VERSION")`.

### R-8 (O) · pack.json: nombre y tipo

`pack.json:2-3`: la plantilla pide `"<tipo>-<tecnologia>"`, y `"tipo": "servidor"` choca con «No es un servidor» (`SKILL.md:147`). No rompe nada. Recomendación: dejar `rust-tauri`, porque ya la cita la skill de frontend (`:147`), y añadir un `"$comentario"` que explique que `servidor` es el tipo más cercano a la capa nativa.

### R-9 (O) · frontend: hay APIs de Tauri fuera de `bridge.ts`

`SKILL.md:69` dice que todo lo que viene de Rust pasa por `bridge.ts`. Pero `App.tsx:2-4` importa `convertFileSrc`, `listen` y `getCurrentWindow`, siempre detrás de `bridge.isDesktop()`. Además, el `listen` de `scan-progress` no está en un `useEffect`: está en el `runManual` del controlador (`App.tsx:259-285`), con un ref de ciclo de vida y la baja en `finally`. Corrección en `:69` y `:80-82`: «`invoke` solo en `bridge.ts`. `listen`, `getCurrentWindow` y `convertFileSrc` se usan en `App.tsx` solo detrás de `bridge.isDesktop()`, y la suscripción se da de baja en `finally` o al desmontar (patrón de `runManual` en `App.tsx`).»

### R-10 (O) · frontend: una restricción de imports en los módulos probados

`SKILL.md:101-105` no dice que un módulo probado no puede tener imports relativos en tiempo de ejecución. Node exige la extensión `.ts`, y `tsc` la rechaza porque no está `allowImportingTsExtensions`. Hoy se cumple: `source-update-controller.ts` solo hace `import type` y `scan-controller.ts` no importa nada. Añadir: «Desde un módulo probado, los imports relativos solo pueden ser `import type`.»

### R-11 (O) · frontend: el tema oscuro es la base

`SKILL.md:46-48`: `.theme-dark` no tiene ni una regla en `styles.css`. El oscuro es la base (`:root`) y `.theme-light` lo sobrescribe (`styles.css:830+`). Aclararlo para que nadie escriba reglas `.theme-dark` vacías.

### R-12 (O) · config: «relacionadas» no corre Rust

En `.metodo/config.json`, `stack.comandos.code-ai-profiles.relacionadas` no incluye `cargo test`. Un cambio solo de Rust pasa «relacionadas» sin probar Rust. La skill lo compensa pidiendo `cargo test` a mano, y las reglas de backend también. Recomendación: añadir `&& cargo test --manifest-path src-tauri/Cargo.toml -q`, o dejarlo para cuando se instale el pack.

### R-13 (O) · archivado de `.codex/` y `.agents/`: nada queda roto

- `git grep` sobre los archivos versionados (sin contar `docs/archivo/`, `graphify-out/` y `hu/`) no encuentra referencias a `.codex/` ni a `.agents/` en `scripts/`, `.github/workflows/`, `package.json`, `README.md` ni `CONTRIBUTING.md`. Solo aparecen el ADR-0001, que lo cuenta como historia, y `.gitignore:18-19`.
- El grafo no conserva nodos con rutas `.codex/` ni `.agents/`.
- `.graphifyignore` apunta bien a las nuevas rutas de la skill de Graphify.
- Restos:
  - `.gitignore:19` (`.codex/hooks.json`) ya no tiene objeto. Es inofensivo; se puede quitar o dejar por si alguien reinstala el hook de Codex.
  - Los roles y agentes archivados (`docs/archivo/previo/agents/roles`, `docs/archivo/previo/codex/agents`) se indexan en el grafo del producto: unos 51 nodos. Recomendación: en `.graphifyignore`, ignorar `docs/archivo/previo/agents/` y `docs/archivo/previo/codex/` completos, y correr `npm run graph:update`.
  - Codex ya no tiene la skill de Graphify en el repo. Es lo que decidió el ADR-0001.

## Lo que se comprobó y es correcto

**Skill rust-tauri:**

- `main.rs` con `windows_subsystem`.
- Las capacidades (`core:default` y cuatro permisos de ventana).
- La CSP y el `scope` de `assetProtocol`.
- La ventana de Windows sin decoraciones, Overlay en macOS y decoraciones nativas en Linux.
- La plantilla de `stop_instance`, copiada literalmente de `lib.rs:4572`.
- `with_registry_operation` con mutex.
- `code_sessions.clear()`.
- `spawn_blocking`.
- `generate_handler!`.
- `rename_all` `camelCase` y `lowercase`.
- La parada ordenada, la espera de 5 s y la forzada.
- `robocopy` con código mayor que 7 tratado como error.
- reqwest blocking con rustls, 5 s, sin redirecciones y `device_id` nulo.
- `test_managed_paths` y `test_instance`.
- Los objetivos de `build-desktop.yml`.
- `__TAURI_INTERNALS__` en `bridge.ts`.
- Que el gate de configuración no mira `.rs` (`config.mjs:54`).

**Skill de frontend:**

- `main.tsx` con `@fontsource`.
- Los componentes de `App.tsx`.
- Los tokens.
- Las clases de plataforma y `.window-controls`.
- Las variables `--session-*`.
- Los cortes de 1260 y 1070 px.
- `prefers-reduced-motion` y `:focus-visible`.
- `IconBase`.
- La validación de `localStorage`.
- `node --test` y `tsconfig` con `include: ["src"]`.
- Los pasos de `validate.yml`.
- Que no lee `import.meta.env`.
- Las descripciones de ambas skills miden menos de 400 caracteres.
- `metodo.mjs generar` respeta un `SKILL.md` que ya existe.
- No quedan referencias a `datos-y-estado.md` ni a `tiempo-real.md`, que se borraron.

## Re-revisión 2026-10-27

**Veredicto: PASS.**

### Resueltos

- **R-1 · Resuelto.** El borrador y la skill instalada son idénticos una vez renderizados (`.claude/skills/code-ai-profiles-rust-tauri/SKILL.md`).
  - La regla de oro (`:12-16`) acepta `ORIGINAL_INSTANCE_ID` y las rutas que salen de `resolve_transfer_profile` o del registro.
  - La sección de rutas (`:70-76`) separa `ManagedPaths` de `detect_provider_source` y `detect_original_profile`, y excluye `APPDATA`, `LOCALAPPDATA` y `XDG_CONFIG_HOME` de `config.rs`.
  - `:126-128` y `:146-147` son coherentes con lo anterior. Todo se contrastó con `lib.rs:1058`, `1116` y `1172`.
- **R-2 · Resuelto.** `pack.json:11` queda en `cargo test --manifest-path src-tauri/Cargo.toml -q`, sin `{archivos}`. `stack.comandos.relacionadas` también incluye `cargo test` (R-12). `pruebas.mjs` no falla con una plantilla sin `{archivos}`: el `replace` no hace nada.

### Afirmaciones nuevas comprobadas

- Los índices de sesión y los iconos se escriben con `atomic_replace_file` (`lib.rs:3256` y `5229`).
- `save_registry` usa `fs::write`.
- `ManagedProcessIdentity` tiene los cinco campos que lista la skill.
- `signal_instance_processes` hace lo que la skill describe.
- `open`, `explorer.exe` y `xdg-open` están donde la skill dice.
- `original_application_update_target` contiene tres URLs, y el feed es la cuarta.

### Queda una observación (no bloquea)

- **R-14 (O)** · `.claude/skills/code-ai-profiles-rust-tauri/SKILL.md:66` y su borrador. De los `expect` que ya existen, solo `lib.rs:3555` está en `refresh_registry_scoped`. Los de `lib.rs:3721` y `3740` están en `system_info_scoped`. El error venía de mi texto en R-5. Corrección: «Solo existen el de `run()` y los de invariantes de `refresh_registry_scoped` y `system_info_scoped`.» Responsable: orquestador.
