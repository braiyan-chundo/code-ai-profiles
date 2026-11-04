# Revisión técnica · HU-0028 · Distintivo de la app original en el icono de instancia

Fecha: 2026-11-03 · Revisa: architect · HEAD revisado: `1eb605b` (rama `ajustes-windows-y-sidebar`)

- **Backend:** `4dd8a55` (contrato TS, mock y literales) y `e90a629` (Rust: `provider_badge.rs`, plataformas, Dock,
  testigo, `launch_preflight`, sincronización, scope del asset protocol y pruebas).
- **Frontend:** `771efe1` (avatar, página, «Uso por instancia», editor y prueba) y `1eb605b` (evidencias).
- **Referencia:** `arquitectura.md` (A-1 a A-6), `briefs/`, `hu.md` (D-1 a D-7, AC-01 a AC-05) y la maqueta aprobada.

## Veredicto: **PASS con observaciones**

No hay nada que corregir antes de entregar. Las observaciones son mejoras opcionales o tareas del cierre.

**Condiciones antes de la prueba humana:**

1. La suite completa, una vez, sobre el SHA final. `pruebas.mjs estado` dice «HEAD 1eb605b sin suite en verde». El
   `cargo test` de 239 pruebas que corrió el orquestador en macOS no está registrado. Yo no corrí pruebas.
2. Windows no se ha compilado (falta `aws-lc-sys`). `validate.yml` compila y prueba en Linux (`ubuntu-22.04`). Windows
   solo pasa por `build-desktop.yml`, que tiene que quedar en verde en su runner antes de fusionar hacia `develop`.
   Revisé ese código a mano (ver «Tres plataformas»).

`cargo fmt --check` y `config.mjs check` están en orden.

## Lo comprobado

| Punto | Resultado |
| --- | --- |
| Parser icns con datos hostiles | `icns_largest_png` exige `total` entre 8 y la longitud del archivo, y en cada trozo `length ≥ 8` y `end ≤ total`. Todo va con `checked_add` y `get(..)`, sin indexar a ciegas. Como `length ≥ 8`, el bucle siempre avanza (no hay bucle infinito). Se lee entero solo si ocupa ≤ 16 MiB (`read_bounded`). Hay pruebas de `total` excesivo, de un trozo que pasa del final, de un trozo más corto que su cabecera y de un archivo truncado. Ver O-3 |
| Parser PE con datos hostiles | Lee solo con `seek`: los 64 B de DOS, `e_lfanew` ≤ 1 MiB, 24 B de COFF, la cabecera opcional (≤ 64 KiB, `u16`), la tabla de 1 a 96 secciones y una sección de recursos de ≤ 64 MiB. Comprueba `NumberOfRvaAndSizes ≥ 3` y que el tipo sea PE32 o PE32+. El árbol tiene tres niveles fijos, sin recursión ni ciclos posibles, y ≤ 4096 entradas por directorio. Cada offset pasa por `checked_add` y `get`, y un RVA de otra sección da `None`. El DIB valida cabecera ≥ 40, 32 bits, sin compresión, lados de 1 a 2048 y píxeles dentro del recurso **antes** de reservar la imagen (≤ 16 MiB). La máscara AND usa `get` (si falta, el icono queda opaco). Ninguna resta puede desbordar. Hay pruebas de `e_lfanew` lejano, sección fuera del archivo, entrada fuera de la sección, 200 secciones, sin `MZ` y archivo vacío |
| Topes de memoria | icns y PNG ≤ 16 MiB leídos. Sección PE ≤ 64 MiB (`vec!` antes de `read_exact`: un archivo truncado reserva y falla, con tope). Decodificación con lados ≤ 2048, comprobados con `into_dimensions` antes de `load_from_memory` (≤ 32 MiB para RGBA16). Distintivo de ≤ 512 px. Caché de plantillas del Dock: 4 entradas, igual que antes. Una copia en caché manipulada (≤ 16 MiB) se decodifica con los `Limits` por defecto de `image` (512 MiB) y, si falla, `compose_dock_badge` la ignora (D-7) |
| Pánicos | No hay `unwrap` ni indexado sin comprobar fuera de las pruebas. En `compose_dock_badge`, `origin` = 1024 − 36 − 368 = 620 y la sombra cabe (x < 400, y ≤ 409, en un lienzo de 432). `BADGE_LOCK` se recupera si queda envenenado (`into_inner`) |
| Nada lee perfiles ni escribe en la original | Solo se lee el archivo de icono de la original: `Contents/Resources/<CFBundleIconFile>` (sin `/`, `\` ni `..`; si es un enlace, no vale), `Claude.exe` o el PNG de hicolor o pixmaps (nombre `[A-Za-z0-9._-]{1,128}`, o ruta absoluta `.png` bajo raíces conocidas y sin `.` ni `..`). Se escribe solo en `<app_data>/provider-badge/`. La prueba `dock_badge_reads_the_icns_of_the_original_bundle_only` comprueba que `strict_passes(original)` sigue en verde después de leer, y que `../Info.plist` se rechaza. No hay `println!`, `log` ni `dbg!` de rutas o bytes |
| Firma de la copia (A-2, HU-0020) | Solo cambia la imagen que recibe `setIcon`. `branding/icon.png` no cambia (D-2: la prueba compara sus bytes). La prueba `the_icon_records_the_badge_it_carries_and_launch_reapplies_only_when_it_changes` comprueba `check(...) == Iconized` después de reaplicar con el distintivo. `restore_after_failure` y la sincronización usan el mismo `apply_icon_to_registered`, que comprueba A-2 después de `setIcon` |
| Testigo `dockBadge` y bucles de reaplicación | El testigo es `Some(clave)` solo si `system_applied` con distintivo. En cualquier rechazo o estado `Clean` vale `None`. En la rama iconizada de `launch_preflight`, se reaplica solo si `dock_badge(..).key != custom_icon.dock_badge`. Con el testigo igual no hay ninguna llamada a `setIcon` (probado: `WORKSPACE_ICON_CALLS == 0`). Una instancia anterior a la historia (`None`) recibe el distintivo **una** vez y la siguiente apertura no hace nada (probado: el contador queda en 1). Con D-7 (sin distintivo) y testigo `None`, la clave y el testigo coinciden y no hay reaplicación. Un testigo viejo sin original legible se reaplica sin distintivo una vez (probado). Si `setIcon` se rechaza, `apply_icon_to_registered` retira el icono, la copia pasa a `Clean` y sigue el camino de antes (se reintenta en cada apertura, como hasta ahora). Con «Gestión de apps», `saved_icon_usable` es falso y no se intenta. No hay bucle. Ver O-1 y O-2 |
| `launch_preflight`: orden y salida de error | `IconizedSelfUpdated` sigue saliendo antes, sin reaplicar en esa apertura (la siguiente lo hace). `reapply_icon_on_launch` comparte bloque y salida de error con la rama limpia: si A-2 falla, el icono se retira y solo abre una copia limpia verificada. `instances/launch.rs` guarda el registro con `Ok(true)`. `dock_badge` se resuelve sin tomar el candado del registro y fuera de `WORKSPACE_ICON_LOCK` y `TEMPLATES` |
| Caché y limpieza de `provider-badge/` | `BADGE_LOCK` cubre la memoria, la extracción, la escritura atómica y la limpieza. `remove_other_badges` no entra en subcarpetas y no borra enlaces (`DirEntry::file_type` no los sigue). La ruta que se conserva se construye igual que las que se recorren. Un enlace donde va la copia se borra (el enlace, no su destino) antes de `write_file_atomic` (prueba unix). La memoria guarda `(app_data, huella)`: con la misma huella devuelve lo recordado (si es `Some`, después de un `stat`), y un fallo se recuerda (D-7). Entre `provider_badge` y el `fs::read` de `dock_badge`, otro refresco con una huella **distinta** podría borrar el archivo: el icono saldría sin distintivo y la siguiente apertura lo corregiría. Es el riesgo aceptado en A-2 |
| Clave de la caché de plantillas | La clave es SHA-256 de la longitud de `source`, `source`, un byte de presencia y el distintivo. Con la longitud delante, dos pares distintos no pueden dar la misma concatenación. Es una mejora sobre A-4, y está probado que las cuatro variantes dan claves distintas |
| Scope del asset protocol | `tauri.conf.json` añade solo `"$APPDATA/provider-badge/*.png"`. Los temporales (`.provider-badge-<uuid>.tmp`) no encajan. CSP, `capabilities/` y los tres `tauri.<plataforma>.conf.json` no cambian. `ProviderBadge.path` sale de `paths.app_data` sin canonicalizar (en Windows no lleva `\\?\`), la misma base que `project-icons` |
| Contrato y registro | `ProviderBadge` y `SystemInfo.providerBadge` (siempre serializado). `CustomIcon.dockBadge` con `#[serde(default, skip_serializing_if)]`: un `instances.json` anterior se lee sin migración y sin testigo no se escribe (probado). `REGISTRY_VERSION` no cambia. El refresco LIGHT clona el anterior (`system_info_seed`). En TS `dockBadge?` es opcional y la interfaz no lo usa |
| Tres plataformas (revisión a mano) | `provider_icon_file(&Path) -> Option<PathBuf>` tiene la misma firma en `macos.rs`, `windows.rs`, `linux.rs` y `unsupported.rs`. `provider_badge.rs` no tiene `cfg` y todo lo que define lo usa `provider_badge`, que llama `scan.rs` en todas las plataformas: no hay `dead_code`. `linux_desktop_icon`, `linux_icon_candidates` y `LINUX_ICON_ROOTS` llevan `cfg(any(test, target_os = "linux"))`, se usan en `linux.rs` y en las pruebas, y fuera de eso no existen. `sha2` e `image` (png) no dependen de la plataforma. `env`, `File`, `Read`, `Seek`, `SeekFrom`, `Cursor` y `Mutex` llegan por `use super::*` desde `lib.rs`. El `_source` sin usar de Linux lleva guion bajo. Los literales `CustomIcon` fuera de macOS (`instances/icons.rs:53`) ganan `dock_badge: None`. `IconOutcome` y `dock_badge` solo existen en `macos_icon` (con `cfg(macos)`), y la llamada de `synchronize.rs` está dentro del bloque `#[cfg(target_os = "macos")]`. `is_none_or` necesita Rust 1.82 y CI usa `stable`. Ningún workflow usa `-D warnings` ni clippy. En Windows, `badge_key` canonicaliza la misma ruta que ya canonicaliza `application_fingerprint`, así que si una funciona la otra también. La refactorización de `provider_desktop_files` en Linux no cambia `source_display_name` |
| Interfaz y sistema armónico | `showsProviderBadge` es puro y está probado en `test:dashboard` (cinco casos, incluido «falló otra ruta»). El distintivo usa `size-[36%]` (sin px) y el halo `drop-shadow` con `var(--surface)`. Las posiciones `-right/-bottom/-top-0.5` no son espaciado de la prueba 15. El punto sube con `group-data-badged/avatar:` (D-4). Lo pasan `InstanceDetail` (64), `UsageRanking` (32, calculado fuera del `map`) y la vista previa del editor (72). No lo pasan el sidebar ni `ApplicationUpdateDialog` (16, D-5). `OriginalDetail` usa `iconSrc={null}`, así que nunca lo muestra. `previewSrc` calculado una vez da el mismo resultado que la expresión del brief, y «Quitar» quita el distintivo (AC-04). La raíz del avatar sigue `aria-hidden` y el `<img>` del distintivo lleva `alt=""`. Las evidencias en claro y oscuro coinciden con la maqueta (el distintivo del mock es un cuadrado plano) |
| Territorios | `4dd8a55`: solo `src/types.ts`, `src/lib/bridge.ts`, `dashboard-store.ts` y `tests/source-update-controller.test.ts` (paso 1 del orden). `e90a629`: solo `src-tauri/**`. `771efe1`: `src/app/**`, `src/features/**` y `tests/dashboard-state.test.ts`. `1eb605b`: solo `evidencias/`. Ningún rol escribió fuera de lo suyo |
| Configuración | No hay variables nuevas. Las rutas de sistema (`/usr/share`, `XDG_DATA_HOME`) son estándar del sistema operativo, como el `XDG_CONFIG_HOME` que ya se leía. El mock es un `data:image/png` neutro |

### Desviaciones declaradas

Las acepto todas:

- **Memoria por `(app_data, huella)`**: es más estricta que «un par por huella».
- **Longitud en la clave de plantillas**: evita colisiones de concatenación.
- **`linux_icon_candidates` portable y probado en todas las plataformas.**
- **La máscara AND para un DIB sin alfa**: sin ella, los iconos antiguos saldrían invisibles.
- **`reapply_icon_on_launch` compartido**: una sola salida de error para las dos ramas.
- **`previewSrc` calculado una vez.**
- **`restore_after_failure` con el distintivo actual**: ver O-2.

## Hallazgos

Ninguno bloquea ni hay que corregirlo antes de entregar.

## Observaciones

- **O-1 · backend, opcional.** La clave (y con ella el testigo) sale de la ruta, el tamaño y el **mtime** del archivo de
  icono, no de su contenido. Cada actualización o reinstalación de la original cambia el mtime del `.icns`, aunque el
  icono sea el mismo. La sincronización de HU-0017 ya reaplica con la clave nueva, pero una instancia que no se
  sincroniza hace un `setIcon` + A-2 extra en su siguiente apertura, una vez por versión. No es un bucle y A-4 lo da
  por aceptado («otra cuando la original cambie»). Si molesta, la clave del testigo puede ser el SHA-256 del PNG
  normalizado, y entonces solo cambia cuando cambia la imagen.
- **O-2 · backend, aceptada.** `restore_after_failure` repone el icono con el distintivo **actual**, pero el registro
  conserva el testigo anterior. Si no coinciden, la siguiente apertura hace un `setIcon` más y queda bien. Solo pasa
  después de una transacción fallida.
- **O-3 · backend, opcional.** Hay dos casos de robustez, y los dos requieren archivos manipulados:
  - `pe_icon_image` prueba cada entrada del grupo (hasta 65 535). En cada una vuelve a analizar dos directorios de
    hasta 4096 entradas. En el peor caso son segundos de CPU con `BADGE_LOCK` tomado. Un tope de unas 256 entradas o
    quitar los ids repetidos lo cierra.
  - `icns_largest_png` elige el PNG más ancho aunque pase de 2048 px, y entonces no hay distintivo en lugar de usar el
    siguiente. Basta con elegir el mayor que sea ≤ 2048.
- **O-4 · backend, opcional.** Ninguna prueba cubre la memoria de `provider_badge`: que un fallo recordado no vuelva a
  extraer con la misma huella y que una huella nueva sí lo haga. Es la garantía de D-7 de no tener coste en cada
  refresco. Solo la cubren de forma indirecta las pruebas de `dock_badge` en macOS.
- **O-5 · frontend, aceptada.** `failedBadge` se queda con la ruta que falló mientras el componente esté montado. El
  distintivo vuelve con una ruta nueva o al remontar. Es coherente con el riesgo aceptado en A-2.
- **O-6 · architect, documentación.** Al cerrar corrijo el texto de `arquitectura.md`:
  - en A-2, «un solo par (huella, …)» pasa a `(app_data, huella)`;
  - en A-4, la clave lleva la longitud de `source`;
  - aclaro que en macOS se usa el `plutil` que ya había (A-2 hablaba de no usar `sips` ni PowerShell, y no se usan).
- **O-7 · orquestador, al cerrar.**
  - Aplicar el delta de RN-01 y RN-02 de `arquitectura.md` en `docs/producto/reglas/instancias.md`.
  - Correr `pnpm graph:update`, `graphify affected "provider_badge"`, `graphify affected "set_workspace_icon"` y
    `pnpm graph:check`.
  - Actualizar `docs/instancias.document.md` (distintivo, caché en `provider-badge/` y reaplicación única en la
    apertura) y, si enseña los iconos, el `README.md`.

## Lo que solo comprueba una persona

- macOS, con la Claude real: abrir una instancia que ya tenía icono y ver el distintivo en el Dock y en el Finder.
  Volver a abrirla y comprobar que no se reaplica (no hay parpadeo del Dock) y que la copia sigue pasando la
  verificación de la firma. Comprobarlo en claro y en oscuro, con «Reintentar» y después de una sincronización.
- La app con el distintivo real (no el cuadrado del mock): forma, halo y punto arriba en 64 y 32, y la vista previa
  del editor con «Quitar».
- Windows (clásico y MSIX) y Linux (paquete con PNG en hicolor y paquete solo con SVG, que no lleva distintivo, D-7):
  el distintivo en la app servido por el asset protocol. Que `build-desktop.yml` compile en los tres runners.
