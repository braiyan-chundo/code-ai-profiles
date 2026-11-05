# Revisión técnica · HU-0029 · Carpeta de datos de la original elegida por la persona

Fecha: 2026-11-05 · Revisa: architect · HEAD revisado: `25b330e` (rama `fix-ventanas-consola-windows`)

- **Backend:** `3d9fef1` (contrato Rust y TS, mock, fixtures) y `603758d` (`original_profile.rs`, llamadores, comandos).
- **Frontend:** `1955a53` (pantalla, `originalProfileView`, acciones) y `25b330e` (disposición según la maqueta).
- **Referencia:** `arquitectura.md` (A-1 a A-6, R-1 a R-6), `briefs/`, `hu.md` (D-1 a D-8, AC-01 a AC-06), `diseno/`.
- Diff revisado: `git diff 0c3ccf5..25b330e -- src src-tauri tests` (22 archivos).

## Veredicto: **PASS con observaciones**

No hay bloqueos (ningún B-n). Las observaciones son mejoras opcionales o comprobaciones de Windows.

**Condiciones antes de la prueba humana:**

1. La suite, una vez, sobre el SHA final. `pruebas.mjs estado` dice «HEAD 25b330e sin suite en verde». Yo no corrí
   pruebas.
2. Windows no se compila en local. Revisé ese código a mano (ver «Tres plataformas»). `build-desktop.yml` tiene que
   quedar en verde en el runner de Windows antes de fusionar hacia `develop`.

`cargo fmt --check` en orden. `config.mjs check` en orden. No cambian dependencias (`Cargo.toml`, `package.json`),
`capabilities/` ni `.env.example`.

## Lo comprobado

| Punto | Resultado |
| --- | --- |
| Privacidad: qué se toca en la carpeta elegida | `validate_original_profile_folder` y `check_real_folder` (`original_profile.rs:106-149`) usan solo `symlink_metadata`, `is_absolute`, `file_name` y `path_is_within` (`canonicalize`). `has_code_sessions` de la detectada es un `is_dir`. No hay `read_dir`, `File::open` ni `fs::read` sobre la carpeta elegida. El único `fs::read` lee `original-profile.json`, que está en los datos de la app. Las sesiones se siguen leyendo con `read_code_sessions(path, transcripts)` (`scan.rs:291-297`), igual que hoy. No hay `println!`, `eprintln!` ni `dbg!`. La ruta solo llega a la UI cuando el origen es `chosen` (AC-02) |
| Candado (R-1) | `choose_original_profile_folder` (`commands.rs:262-289`): el selector va en su propio `spawn_blocking` **sin** `with_registry_operation`. Si la persona cancela, devuelve `Ok(None)` sin tocar nada. Validar y guardar van dentro de `with_registry_operation` (`commands.rs:275-279`). `dashboard_from_scope_async` va fuera, cuando ya se soltó el candado. `forget` sigue el mismo patrón. Las transferencias toman el mismo candado, así que la carpeta efectiva no cambia a mitad de una transferencia |
| Resolución única (A-2) | `rg "detect_original_profile\("` da las 4 definiciones en `platform/*.rs` y un solo uso, en `original_profile.rs:216` (el punto de partida del selector, solo para calcular la ruta). Todo lo demás pasa por `resolve_original_profile`. Las sesiones y los 4 campos del contrato salen de una misma resolución (`scan.rs:291`). El estado sale de `processes.rs:14`. La topología usa `original_instance_status_with_inventory(paths, …)` (`topology.rs:23`), y sus tres llamadores (`scan.rs:283`, `synchronize.rs:256` y `original_update.rs:1548`) ya pasaban `paths`. Las transferencias y el desvínculo usan la carpeta efectiva y su estado (`transfer.rs:45-52`). Para la exclusión de Proyectos, `projects.rs:518` añade la efectiva, la detectada y la guardada aunque ya no valga, sin duplicados |
| Exclusión de Proyectos en Windows | `ProjectEnv::new` normaliza cada ruta prohibida con `comparable` y además añade su forma canónica. `is_within` compara por componentes sin distinguir mayúsculas en macOS y Windows (`projects.rs:486-505, 812-820`). Una elegida que se borró no se puede canonicalizar, pero su forma literal sigue en la lista |
| Validación (D-2, D-4) y mensajes M-1 a M-7 | El orden y los textos coinciden con A-3. Si se elige `claude-code-sessions`, se usa su padre, con las mismas comprobaciones. `claude-code-sessions` tiene que ser una carpeta real: si es un enlace, se rechaza con M-2; si es un archivo, con M-3. Se rechazan la carpeta de datos de la app y cualquier carpeta dentro de ella, en los dos sentidos. La ruta se guarda **tal como la dio el selector**, sin canonicalizar. Un rechazo no escribe nada (prueba `rejected_choice_writes_nothing_and_keeps_the_previous_one`). Ver O-2 |
| Persistencia | `original-profile.json` contiene `{"path": …}` y se escribe con `write_file_atomic(…, ".original-profile")`. Si falta, está dañado o trae `""`, cuenta como sin elegida (probado). Olvidar trata `NotFound` como éxito (probado). No hay migración: sin el archivo todo funciona como antes |
| D-5 y R-6 | La elegida se revalida en cada resolución. Si se borró, se renombró, se convirtió en enlace o perdió `claude-code-sessions`, la app vuelve a la detectada con `chosen_missing = true` y la ruta guardada se conserva. R-6 queda confirmado con la prueba `choice_without_code_sessions_falls_back_to_detected`, y la UI muestra «La carpeta elegida ya no existe» con «Elegir carpeta» y «Usar la detectada». Riesgo aceptado en la arquitectura |
| Refresco (R-2) | `RefreshScope::ORIGINAL_PROFILE` = `sessions` + `topology` + `LIGHT`, y `LIGHT` incluye `processes`. El paso de `missing` a `stopped` y la topología que depende de él se recalculan juntos. `system_info_seed(previous)` clona el estado anterior en los refrescos parciales |
| Contrato (A-1) | `OriginalProfileOrigin` (en minúsculas) y los 3 campos están en Rust y en TS con el mismo nombre camelCase. La semilla, `EMPTY_DASHBOARD` y los fixtures (`scan.rs:631`, `source-update-controller.test.ts:301`) están actualizados. Es un cambio aditivo en 0.x |
| Pantalla (A-5, AC-01 a AC-04) | `originalProfileView` es pura y sigue la tabla de A-5. La prueba recorre los 5 casos (`dashboard-state.test.ts:392-399`). El aviso se pinta con `NoticeAlert` encima de la tarjeta. La fila «Carpeta de datos» va al pie de la tarjeta, con la ruta, «Elegida», «Cambiar carpeta» y «Usar la detectada». Un rechazo pasa por `setError(friendlyError)`, que conserva el texto M-n de Rust y no cambia el panel. Al cancelar no se reemplaza nada. Mientras el selector está abierto, `busy` deshabilita los botones. El mock con `?original=sin-sesiones` alterna rechazo (M-3) y aceptación, como pide A-4 |
| Desviación aceptada | El aviso «ya no existe» no muestra la ruta perdida, porque el contrato no la trae. A-5 tampoco la pedía. Es coherente y no se sacan rutas de más |
| Tres plataformas (revisión a mano) | `original_profile.rs` no tiene `cfg` fuera de la prueba `#[cfg(unix)]` de enlaces. Todo lo que usa llega por `use super::*` (`fs`, `env`, `Path`, `PathBuf`, `Serialize`, `Deserialize`, `Manager` para `get_webview_window`, `Uuid` en pruebas). El selector copia el patrón de `project_picker.rs`, que ya compila en las tres plataformas (`set_parent`, `blocking_pick_folder`, `into_path`). `dirs` y `tauri-plugin-dialog` no dependen de la plataforma. `is_some_and` y `eq_ignore_ascii_case` funcionan en `stable`. **Windows:** `claude-code-sessions` se compara sin distinguir mayúsculas. En Windows, `FileType::is_symlink()` de `std` es verdadero para los reparse points con el bit *name surrogate*, así que cubre los enlaces simbólicos y las uniones (`IO_REPARSE_TAG_MOUNT_POINT`). Los marcadores de OneDrive no llevan ese bit y no se rechazan. `canonicalize` solo se usa dentro de `path_is_within`, que compara rutas `\\?\` con `\\?\`; lo guardado y lo mostrado nunca lleva `\\?\`. La detección de MSIX (`packaged_installation`) está en caché (`OnceLock`), así que las resoluciones de más no abren más `powershell.exe`. Esto importa en esta rama, que es la de las ventanas de consola. **macOS:** el selector se abre en el padre de la detectada, porque `~/Library` está oculta. **Linux:** usa el mismo portal/GTK que Proyectos. Ver O-1 |

## Hallazgos

| Id | Severidad | Archivo:línea | Hallazgo | Responsable |
| --- | --- | --- | --- | --- |
| O-1 | baja | `src-tauri/src/original_profile.rs:442` | El rechazo de enlaces solo tiene prueba en Unix (`#[cfg(unix)]`). En Windows, que una unión (junction) se rechace se deduce de `std`, pero ninguna prueba lo demuestra. Opcional: una prueba `#[cfg(windows)]` que cree una unión con `mklink /J` (no necesita privilegios) y espere M-2. Si no, se declara como pendiente humano en el Windows real | backend |
| O-2 | baja | `src-tauri/src/original_profile.rs:133-144` | La comprobación de la carpeta de datos de la app (M-4) va **después** de la de `claude-code-sessions` (M-3), como dice A-3. Si se elige la raíz de los datos de la app, que no tiene `claude-code-sessions`, se rechaza con M-3 y no con M-4. Se rechaza igual y no se guarda nada, pero AC-03 pide que el mensaje diga por qué. Opcional: mover el `path_is_within` antes del paso 3. Los perfiles de instancia dentro de los datos de la app sí dan M-4 (probado) | backend |
| O-3 | baja | `src-tauri/src/scan.rs:291`, `processes.rs:14`, `sessions/transfer.rs:45,52` | En un refresco completo, `resolve_original_profile` se ejecuta hasta 3 veces: sesiones, estado y topología. En `resolve_transfer_profile` se ejecuta 2 veces (ruta y estado). Cada vez lee `original-profile.json` y hace unos 6 `stat` y 4 `canonicalize`. El coste es pequeño, porque la detección de Windows está en caché, pero en teoría la ruta y el estado podrían salir de resoluciones distintas si la carpeta desaparece entre una y otra. Mejora futura: resolver una vez por refresco o transferencia y pasar el `OriginalProfile` | backend (futura) |
| O-4 | baja | `src-tauri/src/processes.rs:7-20` | Ninguna prueba de Rust cubre el paso de `missing` a `stopped` con una elegida válida y sin detectada, porque depende de `detect_provider_source` de la plataforma. La lógica es de una línea y la cubre la prueba humana (AC-02 en el Windows real) | QA humana |
| O-5 | cosmética | `src/features/original-app/OriginalDetail.tsx:153-169` | El bloque `{profileView.chosenPath && (…)}` está sangrado dos espacios menos que sus hermanos dentro de `CardContent`. No cambia el comportamiento | frontend |
| O-6 | info | `hu.md` (Pendiente humano), R-4 y R-5 | Siguen abiertos: hay que comprobar en el Windows real (Claude MSIX 4.16336) que existe alguna carpeta con `claude-code-sessions`. En macOS se prueba con `?original=sin-sesiones`, nunca renombrando los datos reales de Claude | orquestador / persona |

## Seguimiento del orquestador (2026-11-05)

- O-2 corregida en `60727e8`: la comprobación de la carpeta de datos de la app va antes que la de
  `claude-code-sessions`; un perfil de instancia sin `claude-code-sessions` da M-4 (prueba ampliada).
- O-5 corregida en `60727e8`.
- O-1 y O-4 quedan como pendiente humano en el Windows real. O-3 queda como deuda declarada.
