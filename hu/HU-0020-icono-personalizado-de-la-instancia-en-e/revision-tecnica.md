# Revisión técnica · HU-0020 · Icono personalizado de la instancia en el Dock de macOS

Fecha: 2026-10-28 · Revisa: architect · Diff: `fc39180..cdaeeac` (rama `hu-0019-ajustes-visuales`)
Backend `391fa89…76fad7f` (+ `4666cb9` bitácora) · Frontend `ef01d4f`, `02310ba` (+ `cdaeeac` bitácora)

## Veredicto: **PASS**, con una condición de proceso

Nada bloquea. La comprobación equivalente no deja pasar ninguna de las manipulaciones de la arquitectura. El CDHash
solo se registra después de un `--strict -R` limpio, y el permiso no se pide nunca de antemano. Hay nueve
observaciones:

- **antes de la prueba humana:** la R-1 (el texto contradictorio);
- **antes de cerrar:** las R-2 y R-3, aunque no afectan a ninguna instancia de este Mac;
- **las demás:** opcionales o de proceso.

**La condición:** `pruebas.mjs estado` dice «HEAD cdaeeac sin suite en verde». No corrí pruebas, como pide el
método. Las cifras (115 pruebas de Rust; `test:format` 16, `test:ui` 15/15) son de quienes implementaron. El
orquestador corre la suite una vez sobre el SHA final antes de la prueba humana.

## Método

- **Lo que leí:**
  - entero, `src-tauri/src/macos_icon.rs` sin las pruebas, y de las pruebas la lista y la matriz de manipulación;
  - el diff de `lib.rs` (verificación, sincronización, creación, lanzamiento, comandos y pruebas);
  - `types.ts`, `bridge.ts`, `icon-status.ts`, `InstanceEditor.tsx`, `InstanceDetail.tsx`,
    `useInstanceActions.ts` y `DialogHost.tsx`.
- **Comprobaciones de solo lectura en este Mac:**
  - Registro: solo nombres, rutas de bundle e indicadores. Bundle de «Claudio Personal»: solo su raíz y su firma.
    No se leyó ningún perfil.
  - `Claudio Personal.app`: en la raíz solo `com.apple.macl` y `com.apple.provenance`; ni `Icon\r` ni
    `com.apple.FinderInfo` (forma **limpia**). `codesign --verify --deep --strict` en verde (0,35 s).
    `TeamIdentifier=Q6L2SF6YDW`, DR explícito (`identifier "com.anthropic.claudefordesktop" and anchor apple generic
    and … leaf[subject.OU] = Q6L2SF6YDW`), `CDHash=7e66aceb…`, versión 4.29.0.
  - La original (`/Applications/Claude.app`, 3.6556.2) pasa `--strict`.
  - La copia va por delante de la original: Claude se actualizó sola dentro de la copia. Es el caso D-3 de verdad, y
    el diseño lo cubre.

## Respuesta a la pregunta concreta: ¿se bloquea alguna instancia de este Mac?

**No.**

- **Claudio Personal** tiene `customIcon` y no tiene provenance. En su primer lanzamiento con esta versión pasa por
  `launch_preflight` con la instancia detenida. Ahora está en marcha, así que será en el siguiente lanzamiento
  después de detenerla.
  - Ve la forma **limpia** sin provenance (★ D-C) y llama a `register_clean_provenance(bundle, original, None)`.
  - Eso es `--deep --strict -R =<DR de la original>`, el mismo bundle id y el mismo Team ID. Con lo medido, pasa.
  - Registra `managed_code_hash = 7e66aceb…` y `provider_version = 4.29.0`.
  - Aplica `setIcon`, comprueba A-2 y guarda el registro antes del `spawn`.
  - Si `setIcon` falla (incluido «Gestión de apps»), se lanza igual con `systemApplied=false`. Si fallara el
    registro, que no es el caso, se lanzaría como hoy.
- **Las otras tres** no tienen `customIcon`: el preflight ni se ejecuta y se lanzan como antes. En la topología
  siguen por la identidad en caché (desviación 5), como hoy.

## Los cinco puntos pedidos

1. **Ninguna manipulación pasa.**
   - `check_iconized` aplica los seis pasos de A-2, de los baratos (forma de la raíz y barrido de *sideband* sin
     seguir symlinks) a los caros (`--strict=symlinks -R`, CDHash, bundle id y Team ID contra la original y contra
     lo registrado).
   - La forma limpia sigue con `--strict`.
   - La matriz de la prueba cubre los diez casos de la arquitectura en las dos variantes de requisito, más la
     re-firma ad hoc (falla por el CDHash) y la original con otro requisito.
   - Si A-2 falla después de un `setIcon` correcto, en el preflight se quita el icono y se exige `--strict` limpio.
     Así un *detritus* interno plantado sigue bloqueando.
   - **El mutex y los tres reintentos no esconden nada.** Solo repiten un `setIcon` que devolvió `false`. Tras un
     éxito, A-2 corre siempre. Tras el tercer `false`, se clasifica. En producción los comandos ya van en serie por
     `with_registry_operation`, así que el mutex solo protege las pruebas paralelas. Coste: hasta tres avisos de
     macOS y 300 ms (R-4).
2. **El CDHash nunca viene de una copia sin verificar.**
   - Solo se escribe en `register_clean_provenance`, que exige forma limpia y `check_clean_against_original`
     (`--strict -R =<DR de la original>`, más bundle id y Team ID iguales).
   - Una copia con icono nunca registra: `provenance_for_icon` devuelve la provenance que ya tenía.
   - La sincronización encadenada de la HU-0017 pasa por `update_instance_application_from_source_sync`:
     verifica el *staging* limpio y luego `apply_branding_after_update` vuelve a registrar contra la original
     nueva. Las instancias pendientes (en marcha) conservan su CDHash antiguo, que sigue siendo el de su bundle.
   - Desaparece la herencia de la provenance de la donante (desviación 9): es más seguro.
   - La raíz de confianza sigue siendo la original instalada (R-9).
3. **«Gestión de apps».**
   - Solo se detecta después de un `setIcon` que devuelve `false`, o de un `EPERM` al quitar el icono a mano.
   - La sonda abre `Icon\r` con `O_NOFOLLOW` y lo borra si no existía.
   - Ni TCC, ni `x-apple.systempreferences`, ni `tccutil` (`rg` sin resultados).
   - Con `systemIssue = appManagement`, ni el lanzamiento ni la sincronización reintentan: solo lo hace la persona.
4. **R-1 de HU-0015 intacta.** `DashboardRuntime` no se tocó y el diff de `src/` no añade ningún listener ni
   `useEffect`.
   - **Windows y Linux:**
     - `reapply_instance_icon_sync` devuelve el literal de A-1;
     - `set`/`clear` conservan su rama;
     - `system_issue: None`;
     - `fingerprint_label` solo existe en macOS y no tiene usos fuera;
     - `strip_inherited_icon_after_copy` no hace nada fuera de macOS.
   - En CI, `validate.yml` corre `cargo test` en Linux. Windows solo se comprueba en `build-desktop.yml`.
5. **El texto:** ver R-1.

## Observaciones

### R-1 (O) · Texto redundante en la línea de estado · frontend y backend · antes de la prueba humana

Hoy se lee «**En el Dock.** Icono aplicado a la copia. Se verá en el Dock al abrir la instancia.», y en el fallo,
«**Solo en Code AI Profiles.** macOS no aplicó el icono a la copia. Sigue visible en Code AI Profiles; …». La frase
inicial (frontend) y `systemMessage` (backend) dicen lo mismo dos veces. Texto final:

| Caso | Frase inicial (`iconStatusLead`) | `systemMessage` (constante en `macos_icon.rs`) |
| --- | --- | --- |
| Aplicado | «Aplicado al Dock. » | `MESSAGE_APPLIED` = «Se verá al abrir la instancia; la firma de la aplicación no cambia.» |
| Reaplicado tras sincronizar | «Aplicado al Dock. » | `MESSAGE_REAPPLIED_AFTER_SYNC` = «Se reaplicó al sincronizar y se verá al abrir la instancia.» |
| Rechazado | «Solo en Code AI Profiles. » | `MESSAGE_REJECTED` = «macOS no aplicó el icono a la copia. Pulsa «Reintentar» con la instancia detenida.» |
| Gestión de apps | (sin frase inicial: va en el `Alert`) | Sin cambios |

- El badge («en el Dock» / «solo en la app») no cambia. El `title` del badge lleva `systemMessage`, que con estos
  textos se entiende solo.
- Hay que actualizar las pruebas de `tests/format.test.ts` y las de Rust que comparan los literales.
- Los registros guardados con el mensaje antiguo lo cambian en la siguiente aplicación o reaplicación.

### R-2 (O) · Una copia con restos de icono y sin provenance queda sin salida · backend · antes de cerrar

**Caso:** forma «con icono» (`Icon\r` o un FinderInfo en la raíz) y sin provenance. Puede venir de un *rollback*
fallido de la versión anterior o de una etiqueta de color de Finder. No es el caso de ninguna instancia de este Mac.

| Operación | Qué pasa |
| --- | --- |
| Con `customIcon`, lanzar | `MissingProvenance`, no se lanza |
| Sincronizar | El preflight del destino falla |
| Quitar el icono | `verify_managed_bundle` falla antes |
| Poner el icono | `provenance_for_icon` falla |

Solo queda borrar la instancia, y el mensaje dice «Sincronízala», que no funciona.

**Arreglo:** con la instancia detenida, si no hay provenance y la forma es «con icono», ejecutar
`strip_inherited_icon` y seguir por el camino limpio. Así lo decide `--strict` y no se relaja nada. Va en
`launch_preflight` y en `provenance_for_icon` (al poner o reintentar). En `clear_instance_icon`, quitar el icono y
exigir `--strict` después, sin verificar antes. Prueba: un fixture con `Icon\r` sin provenance se lanza tras la
limpieza; con otro cambio, no.

### R-3 (O) · Las copias heredadas ad hoc ya no se pueden sincronizar · backend · antes de cerrar

**Caso:** `provider_signature_preserved=false`. Ahora fallan `check_clean`, porque no tienen Team ID, y por tanto el
preflight del destino de la sincronización, y también poner y quitar el icono. Antes se sincronizaban:
`validate_managed_provenance` se saltaba la identidad en ese caso. El mensaje les pide sincronizar, así que es un
callejón sin salida. En este Mac no hay ninguna.

**Arreglo:** la firma del destino no protege nada, porque su bundle se sustituye entero y el *staging* ya pasa
`--strict -R`. En `synchronize_managed_applications_sync`, aceptar como destino la copia con
`provider_signature_preserved=false` (o la que solo falla por identidad) y validar solo la ruta, `validate_source` y
la versión. Si se prefiere no tocarlo, el mensaje para esas copias debe decir «vuelve a crear la instancia».

### R-4 (O) · Los reintentos de `setIcon` pueden repetir el aviso de macOS · backend · opcional

Con «Gestión de apps», los tres intentos pueden mostrar tres veces el aviso del sistema. **Arreglo:** tras el primer
`false`, ejecutar `classify_rejection`; si da `EPERM`, no reintentar. Los reintentos quedan para el `false`
transitorio.

### R-5 (O) · `codesign` en cada refresco de versiones para las copias con icono en marcha · backend · opcional

- **Causa:** en la topología, una instancia en marcha falla la comprobación de donante por su estado y cae en
  `check_managed_bundle`. Para la forma «con icono» siempre ejecuta `codesign --deep`, unos 1,1 s, sin caché.
- **Antes:** con `--strict` en caché por fingerprint, esto no costaba.
- **Arreglo:** cachear el `Iconized` por (fingerprint, CDHash registrado, metadatos de `Icon\r` y de la raíz) o, en
  la topología, aceptar el último resultado de una copia en marcha.

### R-6 (O) · Sin la original, una copia con icono no se abre · documentación

Es la desviación 6. Fallar cerrado es correcto, porque el DR sale de la original. Hay que contarlo en
`docs/instancias.document.md` al cerrar. Idea para el futuro: guardar el DR en la provenance al registrar.

### R-7 (O) · El editor puede mostrar un error ajeno después de «Reintentar» · frontend · opcional

`retried` no vuelve a `false`. Un error global posterior (un refresco en segundo plano) aparecería dentro del editor
como si fuera del reintento. **Arreglo:** guardar el error en `retryIcon` (`try/catch` local) en vez de leer
`actionError`, o reiniciar `retried` al empezar otra acción.

### R-8 (O) · Proceso · orquestador

- Suite sobre el SHA final antes de la prueba humana.
- Al cerrar: `pnpm graph:update` y `graphify affected "verify_managed_bundle"`.
- Los deltas de `docs/instancias.document.md`, README y CHANGELOG.
- Windows solo se verifica en CI.

### R-9 (O) · La raíz de confianza es la original instalada · sin acción

El DR implícito (`cdhash H"…"`) se admite para que las pruebas usen fixtures ad hoc. Es lo mismo que hoy: con una
original ad hoc, la copia queda fijada al mismo binario. La Claude real tiene un DR explícito con Team ID (comprobado
arriba). Se deja escrito en `docs/arquitectura/backend.md`.

## Prueba humana (después de la R-1 y de la suite)

1. Detener «Claudio Personal» y lanzarla. Comprobar:
   - el icono en el Dock y en Cmd-Tab;
   - sin diálogo del llavero y con la sesión conservada (AC-01, AC-02);
   - si aparece un aviso de «Gestión de apps».
2. Abrir a la vez otra instancia con otro icono (AC-01).
3. «Quitar» con la instancia detenida y volver a abrirla: vuelve el icono de Claude (AC-04).
4. Opcional, AC-03: en una instancia de prueba vacía, añadir un archivo a `Contents/Resources` y comprobar que no se
   lanza. Nunca en una instancia con sesión.
