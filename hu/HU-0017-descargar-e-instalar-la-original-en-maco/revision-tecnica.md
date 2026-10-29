# Revisión técnica · HU-0017 · Descargar e instalar la original en macOS

Fecha: 2026-10-28 · Revisa: architect · Diff: `24b6161..bf52878` (rama `hu-0017-actualizar-original-macos`)
Backend `46eae71…0023e97` (+ `65a0d43` bitácora) · Frontend `e283657…720d877` (+ `bf52878` bitácora y grafo)

## Veredicto: **PASS**, con una condición de proceso

Nada bloquea. El código cumple la arquitectura y las desviaciones de la bitácora la mejoran o la concretan. Hay
diez observaciones; la R-1 conviene corregirla antes de la prueba humana, porque toca AC-05.

**La condición:** `pruebas.mjs estado` dice «HEAD bf52878 sin suite en verde». No corrí pruebas, como pide el
método. Las cifras de la bitácora (81 de Rust; test:ui 12, dashboard-state 19 y result-messages 22) son de quienes
implementaron. El orquestador corre la suite una vez sobre el SHA final antes de la prueba humana.

## Método

- Leí el diff completo de `config.rs`, `build.rs`, `.env.example`, `lib.rs`, la parte no de prueba de
  `original_update.rs` y la lista de sus pruebas, `types.ts`, `bridge.ts` y todos los archivos de `src/` tocados.
- Comprobaciones de solo lectura en esta máquina:
  - Fuente de `reqwest 0.13.4`: en `blocking`, `timeout` es **por lectura** (`blocking/response.rs:436-443`) y el
    cliente asíncrono interno no recibe un plazo total (`blocking/client.rs:1487`). La desviación del backend es
    correcta.
  - `codesign -d -r-` de `/Applications/Claude.app` da `designated => identifier "com.anthropic.claudefordesktop"
    and anchor apple generic and … leaf[subject.OU] = Q6L2SF6YDW`. `codesign --verify --strict -R "=<eso>"` sale
    con 0; con otro equipo, con 3. `parse_designated_requirement` y `-R =…` funcionan con la herramienta real.
  - `spctl --assess --type execute` de la instalada: `accepted, source=Notarized Developer ID`.
  - `zipinfo -1` y `-t` sobre el índice real del paquete (3.6556.2) dan las dos 5 202 entradas. Así, la
    comprobación «entradas de `-1` = total de `-t`» no rechaza el paquete bueno.
  - Zip slip por symlink: en un zip de prueba, un enlace `Claude.app/Contents/link → ../../../target` seguido de
    `Claude.app/Contents/link/pwned.txt`. `ditto -x -k` falla con «Not a directory» y **no escribe fuera**. Un zip
    legítimo con symlinks se restaura bien. (Prueba en el scratchpad, ya borrada.)
  - `cargo check --target x86_64-pc-windows-msvc` no llega a este crate: `aws-lc-sys` necesita `windows.h`, igual
    que antes de la historia. Windows y Linux se revisaron leyendo las ramas `cfg` (punto 4).

## Lo pedido, punto por punto

1. **Descarga e instalación.** Cumplen.
   - Red:
     - el host se compara exacto y en minúsculas;
     - se rechazan `@`, puerto distinto de 443, `http` y rutas que no son `.zip`;
     - redirecciones: hasta 3, cada una `https` a un host permitido (`attempt.previous().len()`);
     - `https_only` y `referer(false)`.
   - Límites de tamaño:
     - `size` entre 1 y 2 GiB;
     - un `Content-Length` mayor se corta antes de leer;
     - `take(size+1)`; el parcial se borra; el `sha256` se calcula a la vez que se descarga.
   - El zip:
     - una sola raíz `.app`, sin `..`, `.`, rutas absolutas, `\`, NUL ni caracteres de control;
     - entradas y bytes limitados; el espacio se comprueba otra vez con el tamaño real.
   - El bundle extraído: symlinks relativos e internos (por la ruta escrita y por la canónica) y ningún archivo
     especial.
   - La firma:
     - la instalada pasa `--deep --strict`, con TeamIdentifier y un requisito explícito (las ad hoc se rechazan);
     - la nueva cumple `-R` de la instalada con `--deep`, tiene el mismo equipo, pasa Gatekeeper y trae el mismo
       bundle id y la versión del feed, posterior a la instalada;
     - tras el intercambio se repite la comprobación `-R` sin `--deep`.
   - La original abierta:
     - se comprueba al preparar y otra vez dentro de `with_registry_operation`, justo antes del intercambio;
     - cuenta cualquier proceso con el ejecutable dentro del bundle canónico.
   - El intercambio es `renamex_np(RENAME_SWAP)`, con el patrón de dos `rename` si el volumen no lo admite.
   - Recuperación y temporales:
     - cerrojo `fs2` por operación;
     - la limpieza y la recuperación borran solo si la original está en su sitio;
     - si falta la original, devuelven `previous/`; si no pueden, no borran nada;
     - con la marca `rollback-failed`, la carpeta se conserva.
   - **La única copia de la original no se borra en ningún camino normal.** Quedan dos bordes de doble fallo
     (R-3 y R-4).
   - No se piden privilegios. Una carpeta sin permiso da el mensaje que manda a «Abrir {app}», y una original de
     otro usuario se rechaza.
2. **Configuración.** Cumple.
   - Las 5 claves `CAP_*` tienen su ficha `[PUBLICO]`.
   - `build.rs` aplica la precedencia entorno > `.env.local` > `.env.example`, falla diciendo cuál falta y tolera
     `\r` y comillas.
   - `config.rs` es el único sitio con URLs, y `validate()` corre en `setup`. El `User-Agent` sigue
     `CARGO_PKG_VERSION`.
   - `rg` no encuentra `claude.ai`, `claude.com` ni el TeamIdentifier en `src-tauri/src` ni en `src`. Las únicas URLs
     de `lib.rs` y `original_update.rs` están en pruebas (y el DTD de Apple, que ya existía).
   - La deuda de HU-0011 queda saldada. `config.mjs check` en verde.
3. **R-1 de HU-0015.** Se mantiene.
   - `focus`, `blur` y `visibilitychange` siguen solo en sus tres dueños (`rg`).
   - `Channel` se crea solo en `bridge.ts`, sin `listen` nuevo.
   - El paso 7 va al final y no registra listeners.
   - La sincronización pendiente exige `!loading`, `busy === null`, `originalInstall === null` y un vuelo propio
     libre. Mientras corre, `busy = "update-applications"` frena el refresco en segundo plano. En Rust todo pasa por
     el mutex.
   - Un refresco que ya estaba en vuelo puede llegar antes con datos viejos, pero la respuesta de la sincronización
     lo reemplaza después. No hay bucle: lo intentado se quita del pendiente pase lo que pase.
   - Falta un borde de olvido: R-1.
4. **Windows y Linux.** Por lectura, compilan.
   - `#![cfg_attr(not(macos), allow(dead_code))]`.
   - `SystemMacosTools`, `exchange_paths`, `ENOTSUP`, `getuid`, `MetadataExt` y `macos_provider_candidates` están
     detrás de su `cfg`, y cada uno tiene su alternativa.
   - `install_original_update_sync` devuelve «La instalación directa solo está disponible en macOS.» antes de
     `begin_flight` y sin tocar la red. `cancel` devuelve `false`.
   - La recuperación en `setup` no hace nada (no hay candidatos y no existe la carpeta).
   - Solo lo confirma la CI (R-9).
5. **Privacidad.** Cumple.
   - Sin almacén de cookies (`reqwest` sin `cookies`).
   - La descarga solo lleva `User-Agent`, sin query ni `device_id`; el feed lleva el UUID nulo.
   - No se lee nada de perfiles. Por IPC cruzan versiones, bytes, fase, ids de instancia y mensajes.
6. **Pruebas.**
   - AC-01: `originalInstallAvailability`.
   - AC-02: piezas con herramientas falsas, más un zip real de `ditto` en macOS.
   - AC-03: tamaño, hash, firma, equipo, Gatekeeper, versión, permiso, espacio, cancelación y vuelta atrás. «Sin red»
     no tiene prueba automática; su error ya lleva «La original no cambió.».
   - AC-04: proceso dentro del bundle y botón deshabilitado con su motivo.
   - AC-05: `split_stale_instances` y `pendingSyncPlan`.
   - AC-06: validación de host y URL.
   - Hueco: la orquestación de punta a punta (R-5).

## Observaciones

### R-1 (O, conviene antes de la prueba humana) · Una pendiente se olvida si la original se abre antes de detenerla

- **Dónde:** `src/features/updates/original-install.ts` `pendingSyncPlan` y `usePendingSynchronization.ts`. Es un
  hueco de mi especificación (A-6), no del implementador.
- **Qué pasa:**
  - Con la original en marcha, `build_version_topology` no la toma como fuente.
  - Si ninguna otra instancia detenida está ya en la versión nueva, la pendiente deja de aparecer en
    `staleInstanceIds`, `pendingSyncPlan` la pone en `drop` y se olvida.
  - Al cerrar la original vuelve a estar «por detrás», pero ya no se sincroniza sola. Incumple AC-05 en ese caso.
- **Qué hacer:**
  - Olvidar por «ya no está por detrás» solo si la topología tiene fuente (`latestSource !== null`).
  - O comparar `instance.sourceVersion` con `system.sourceVersion`.
  - Sin fuente, la pendiente espera.
  - Añadir el caso a `tests/result-messages.test.ts`.
- **Responsable:** frontend. Yo actualizo A-6.

### R-2 (O) · El análisis previo del zip no ve entradas colgadas de un symlink

- **Dónde:** `original_update.rs` `list_zip` y `validate_zip_listing`.
- **Qué pasa:**
  - `zipinfo -1` da nombres, no tipos.
  - Un enlace seguido de `enlace/archivo` pasa el análisis, y la defensa depende de que `ditto` no escriba a
    través del enlace. Lo comprobé y no escribe, pero es el comportamiento de una herramienta, no un contrato.
  - El `sha256` del feed por TLS y el host permitido ya lo hacen improbable.
- **Qué hacer:**
  - Leer también la lista larga (`zipinfo -l`: la columna de permisos empieza por `l`).
  - Rechazar cualquier nombre que tenga como prefijo estricto una entrada symlink.
  - Probarlo con un listado falso.
- **Responsable:** backend.

### R-3 (O) · Doble fallo en el intercambio de dos `rename`: el mensaje dice «La original no cambió.»

- **Dónde:** `swap_bundles_with` → `swap_application_directory` → `InstallError::Unchanged`.
- **Qué pasa:**
  - Solo en un volumen sin `RENAME_SWAP`: el segundo `rename` falla y también la vuelta del primero.
  - La original queda en `<op>/previous/`, y el `Drop` la devuelve (o conserva la carpeta si no puede).
  - El mensaje es falso en ese caso.
- **Qué hacer:**
  - Si después del error el destino no existe, devolver `Stuck`, llamar a `keep()` y decir dónde está.
- **Responsable:** backend.

### R-4 (O) · Si no se puede escribir la marca `rollback-failed`, la próxima recuperación borra la anterior

- **Dónde:** `OperationDir::keep`, `cleanup_operation_dir`.
- **Qué pasa:**
  - Con `RENAME_SWAP` y la vuelta atrás fallida, el destino tiene la nueva rechazada y `<op>/staged/` la anterior.
  - En esta ejecución, `keep` evita la limpieza.
  - Si además falló el `fs::write` de la marca, al arrancar la recuperación ve el destino en su sitio y borra la
    carpeta con la anterior.
  - Es un triple fallo, y el destino conserva una app con firma válida.
- **Qué hacer:**
  - Escribir una marca de «intercambio en curso» **antes** del swap y quitarla solo tras validar o tras una vuelta
    atrás correcta.
  - La recuperación no borra una carpeta con esa marca.
- **Responsable:** backend.

### R-5 (O) · La orquestación no tiene prueba de punta a punta

- **Dónde:** `prepare_and_verify` e `install_original_update_sync`.
- **Qué pasa:**
  - `detect_provider_source`, `fetch_official_feed` y `download_package` van dentro, sin inyección.
  - Sin cubrir: el orden de los puntos de cancelación, «cancelado tras verificar no instala»
    (`enter_uncancellable`, sí probado aparte) y que la sincronización corra tras instalar.
  - Lo cubren las piezas y la prueba humana pendiente.
- **Qué hacer:** opcional. Pasar detección, feed y descarga como parámetros, y una prueba con herramientas falsas
  que recorra el flujo con un `Cursor`.
- **Responsable:** backend, en esta historia o como deuda declarada.

### R-6 (O) · `build.rs` no se entera si `.env.local` se crea después

- **Dónde:** `src-tauri/build.rs` (desviación anotada).
- **Qué pasa:** el `rerun-if-changed` solo se registra si el archivo existe. Crear `.env.local` más tarde no recompila
  hasta que cambie `.env.example` o una variable `CAP_*`.
- **Qué hacer:** una línea en la cabecera de `.env.example`: «tras crear `.env.local`, `touch src-tauri/build.rs`».
- **Responsable:** orquestador.

### R-7 (O) · La skill `code-ai-profiles-rust-tauri` contradice ADR-0002

- **Dónde:** `.claude/skills/code-ai-profiles-rust-tauri/SKILL.md`. No es mi territorio; el texto exacto está en el
  anexo.
- **Responsable:** orquestador.

### R-8 (O, proceso) · Falta la suite sobre el SHA final

- **Qué pasa:** `pruebas.mjs estado` no tiene la suite en verde para `bf52878`.
- **Qué hacer:** correrla una vez tras aplicar lo que se decida de R-1…R-6.
- **Responsable:** orquestador.

### R-9 (O) · Windows y Linux solo los compila la CI, y la CI no corre `cargo test`

- **Qué pasa:**
  - Aquí no se puede compilar para esos targets: `aws-lc-sys` necesita `windows.h`, y eso viene de antes.
  - `build-desktop.yml` solo hace `tauri build`.
  - La revisión por lectura no encontró ramas sin `cfg`.
- **Qué hacer:** declararlo como «solo verificado en CI» en el cierre.
- **Responsable:** orquestador.

### R-10 (O, documentación) · Lo que contacta el sistema operativo

- **Qué pasa:** `codesign` y `spctl` pueden consultar servicios de Apple (revocación, notarización) por su cuenta.
- **Qué hacer:** escribirlo en `docs/actualizaciones.document.md`, junto a AC-06, al cerrar (A-8). Recordar también
  que la guarda de configuración sigue sin revisar `.rs` (consecuencia de ADR-0002; es un cambio de método).
- **Responsable:** orquestador.

## Documentos de arquitectura alineados en esta revisión

- `docs/arquitectura/backend.md`:
  - el plazo por lectura de `reqwest::blocking`, `https_only` y sin `Referer`;
  - la verificación completa de la instalada (las ad hoc se rechazan) y del paquete;
  - el cerrojo `.lock`, `failed/` y la marca `rollback-failed`;
  - las reglas exactas de la recuperación.
- `docs/arquitectura/frontend.md`:
  - `original-app` importa el tipo `OriginalInstallAvailability` de `updates`;
  - `busy = "install-original"`, la bandera que ignora el `Channel` tras la respuesta, la barra indeterminada y que
    la acción no tiene diálogo.

## Anexo · Texto para `.claude/skills/code-ai-profiles-rust-tauri/SKILL.md`

1. En el bloque de «La estructura», debajo de la línea de `src/lib.rs`, añadir:

   ```text
     src/config.rs          URLs y hosts fijados al compilar desde .env.example (ADR-0002); validate() en setup
     src/original_update.rs descargar, verificar e instalar la original en macOS (HU-0017); MacosTools inyectable
     build.rs               pasa las claves CAP_* (entorno > .env.local > .env.example) a cargo:rustc-env
   ```

   y cambiar la línea de `src/lib/bridge.ts` por:
   `src/lib/bridge.ts        el único sitio que llama a invoke() y crea Channel; con mock para el modo navegador`

2. Sustituir «`lib.rs` es un solo archivo: lo nuevo va junto a sus vecinos. Partirlo lo decide un ADR del
   architect.» por:
   «`lib.rs` es el archivo principal: lo nuevo va junto a sus vecinos. Un flujo largo y autocontenido puede vivir en
   un módulo hijo (`mod x;` en `lib.rs`, `use super::*`), con sus comandos como envoltorios finos en `lib.rs`
   (ADR-0002, `docs/arquitectura/backend.md`). Partir el resto lo decide un ADR del architect.»

3. En «Procesos», sustituir «Los eventos hacia la ventana se envían con `emit` (`scan-progress`).» por:
   «Los eventos de ventana se envían con `emit` (`scan-progress`). El progreso de una llamada larga va por
   `tauri::ipc::Channel<T>`, argumento del comando (`install_original_update`).»

4. Sustituir la sección «Red y configuración» entera por:

   ```markdown
   ## Red y configuración

   - Hay dos salidas a la red, las dos con `reqwest::blocking` y rustls, sin cookies y sin identificadores
     (`device_id` nulo en el feed): el feed oficial (5 s, sin redirecciones, 256 KiB) y, solo cuando la persona
     pulsa «Descargar e instalar» en macOS, el host del paquete (`https_only`, host exacto de
     `config::download_hosts()`, hasta 3 redirecciones a hosts permitidos, `size` del feed como tope, 60 s sin
     bytes, 30 min en total, cancelable). En `blocking`, `timeout` es por lectura. No se añade otra conexión ni
     telemetría sin una historia y la autorización del mantenedor.
   - Ninguna URL, host ni identificador de servicio en `.rs` fuera de `src-tauri/src/config.rs`, que los recibe al
     compilar desde `.env.example` vía `build.rs` (`env!`). Una clave nueva: su ficha `[PUBLICO]` en `.env.example`,
     su nombre en `KEYS` de `build.rs` y su validación en `config::validate()`. Nada de `std::env::var` en
     ejecución; se exceptúan las variables de ubicación del sistema operativo de la sección de sistema de archivos.
   - **El gate de configuración no revisa `.rs`**: la regla la cumples tú. El `User-Agent` es
     `config::user_agent()`.
   ```

5. En «Lo que nunca», añadir al final del primer punto:
   «La única excepción es `original_update.rs`: renombra la original que devuelven `detect_provider_source` y
   `prepare_destination`, y solo borra sus carpetas `.code-ai-profiles-original-<uuid>` y
   `<app_data>/original-update/<uuid>` cuando la original está en su sitio.»
