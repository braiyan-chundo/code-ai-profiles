# Arquitectura · HU-0020 · Icono personalizado de la instancia en el Dock de macOS

Architect · 2026-10-28 · rama `hu-0019-ajustes-visuales` (HEAD `3cdcb4d`). Solo análisis y briefs.

## Análisis

Confianza: **alta** en la comprobación (la medí en el sandbox con fixtures propios, tabla de §A-2) y **media** en el
permiso «Gestión de apps» (lo simulé con `chflags uchg`; el caso real solo se ve desde la app firmada como se
distribuye).

Leído: `hu.md`, `seguimiento.md`, `analisis.md`, `docs/instancias.document.md`, `docs/arquitectura/backend.md`,
ADR-0002, `src-tauri/src/lib.rs` (validación de proveedor y provenance L1500-1730, topología L1731, sincronización
L4048-4385, creación L4426, lanzamiento L4537, icono L4858-5460, pruebas L5745-6230), `original_update.rs`
(`MacosTools::verify_signature`, `synchronize_after_install`), `src/types.ts`, `src/lib/bridge.ts`,
`src/features/instances/`. Grafo: `graphify query` y `grafo.mjs impacto` (dejaban cambios en `graphify-out/`: devueltos
a HEAD).

### Lo que se midió ahora (sandbox, fixtures propios, sin Claude)

Fixture firmado ad hoc con requisito explícito (`designated => identifier "com.example.hu20"`), icono puesto con
`NSWorkspace.setIcon`. «Detecta» = la verificación falla.

| Cambio sobre la copia con icono | `--deep --strict` | `--deep --strict=symlinks -R=<DR>` |
| --- | --- | --- |
| Ninguno (solo el icono) | falla (detritus) | **pasa** |
| Archivo o carpeta extra en la raíz; symlink en la raíz; `Icon\r` sustituido por symlink o con bit de ejecución | detecta | detecta («unsealed contents present in the bundle root») |
| Archivo extra en `Contents/` o `Resources/`; `._*`; `Contents/Icon\r`; recurso sellado o `Info.plist` alterado | detecta | detecta (sello) |
| Requisito distinto (`-R` con otro identificador) | — | detecta |
| `com.apple.FinderInfo` o `com.apple.ResourceFork` en un archivo interno | detecta | **no detecta** → lo cubre el barrido propio (A-2, paso 4) |
| `Icon\r` con bytes en la *data fork* | detecta | **no detecta** → lo cubre la forma de la raíz (A-2, paso 5) |
| xattr arbitrario (`com.example.x`) en raíz o archivo | **no** detecta (también pasa `--strict` sin icono) | no detecta (paridad) |

- `--strict=symlinks` conserva la comprobación de symlinks y deja fuera solo la de *sideband/detritus*, que es
  justo la que rompe el icono. `--strict=sideband` falla con el icono.
- `setIcon(nil)` quita `Icon\r` y el FinderInfo de la raíz, y `--strict` vuelve a verde. Quitarlos a mano
  (`rm Icon\r` + `removexattr FinderInfo`) también.
- Con la raíz del bundle inmutable (`chflags uchg`), `setIcon` devuelve `false` y abrir `Icon\r` para escritura da
  `EPERM`. Es la misma firma que deja «Gestión de apps».
- Claude instalada (solo lectura): `--deep --strict` 1,2 s; `--deep --strict=symlinks -R=<DR>` 1,1 s; 5 202
  entradas; xattrs presentes: `com.apple.quarantine` en todas, `com.apple.cs.*` en 136, `provenance` y `macl` en la
  raíz. Ningún FinderInfo ni ResourceFork.

### Supuestos

- **S-1** · «Gestión de apps» deniega con `EPERM` la escritura dentro del bundle y hace que `setIcon` devuelva
  `false`. Si no, la clasificación cae en «rechazado» genérico y el reintento sigue funcionando; solo cambia el texto.
- **S-2** · El Dock pinta el icono aplicado justo antes de lanzar (prueba 6 del análisis). Si no, se ve desde el
  segundo lanzamiento. Lo confirma el mantenedor a ojo.
- **S-3** · Cuando Claude se actualiza sola dentro de una copia, ShipIt sustituye el bundle al salir y el icono
  desaparece. El diseño (D-3) no depende de cuándo ocurre exactamente.
- **S-4** · `--strict=symlinks` existe en todo macOS soportado (mínimo 13.3; la opción es de 10.9.5).

### Decisiones tomadas por mí (★ de arquitectura)

- ★ **D-A · Reaplicar en el siguiente lanzamiento, no en la detención.** Se aparta del texto de ★ D-3 («siguiente
  detención»): ShipIt sustituye el bundle *después* de que la instancia sale, así que lo reaplicado al detener se
  perdería. El preflight de lanzamiento corre con la instancia aún detenida, que es lo que exige la historia.
- ★ **D-B · La comprobación al lanzar es solo para copias con icono registrado.** Las copias sin icono se lanzan como
  hoy (sin coste ni regresión para copias heredadas ad hoc). Verificar todas al lanzar sería otra historia.
- ★ **D-C · Migración perezosa.** Las instancias que ya tienen icono (hoy `systemApplied=false`, sin provenance) lo
  reciben en su siguiente lanzamiento si la copia pasa `--strict`; si no lo pasa, se lanzan como hoy.
- ★ **D-D · Sin botón «Abrir Ajustes».** El texto dice la ruta y macOS ya muestra su propio aviso al bloquear. Un
  botón exigiría una URL del sistema en `config.rs` y otro comando. Se puede añadir después.
- ★ **D-E · `managed_fingerprint` deja de ser puerta.** Incluye la ruta canónica (cambia al renombrar la instancia)
  y un `DefaultHasher` que no es estable entre versiones de Rust. El CDHash fijado es más fuerte. El campo se sigue
  escribiendo por compatibilidad.

### Preguntas

Ninguna bloquea: los ★ D-A…D-E son el valor por defecto. El mantenedor puede cambiar cualquiera antes de
implementar.

### Impacto

| Símbolo que cambia | Consumidores (`rg`, `grafo.mjs impacto`) | Qué se rompe |
| --- | --- | --- |
| `validate_managed_provenance` | `validate_managed_application` (topología, sync), `set/clear_instance_icon_sync`, `apply/clear_macos_custom_icon` | Se sustituye por `verify_managed_bundle` (A-2). Hoy una copia con icono fallaría en todos |
| `validate_managed_application_source` (donantes) | `build_version_topology`, `synchronize_managed_applications_sync` | Una donante con icono debe pasar con A-2 |
| `apply_macos_custom_icon` / `apply_macos_branding_after_update` | set icon, sync, `original_update::synchronize_after_install` (encadenada) | Deja de revertir; registra CDHash; clasifica el fallo de `setIcon` |
| `clear_macos_custom_icon`, `restore_macos_workspace_icon_after_failure` | clear icon, rollbacks | Validan con A-2 o `--strict` según la forma |
| `copy_provider_application` (macOS) | `create_instance_sync`, `update_instance_application_from_source_sync` | Se quita el icono heredado en el destino recién copiado |
| `launch_instance_sync` | `launch_instance` | Nuevo preflight para copias con icono (≈1-2 s más) |
| `CustomIcon` | registro, `ManagedInstance` por IPC, `types.ts`, `InstanceEditor`, `InstanceDetail`, mock | Campo nuevo opcional |
| Test L6061 y vecinos (L6084, L6127) | — | Se invierten o reescriben |

- **Contrato:** sí. Campo `systemIssue` y comando `reapply_instance_icon`. Contratos flexibles (0.x): se anota aquí,
  sin major.
- **Datos guardados:** `CustomIcon.system_issue` con `#[serde(default)]`; `ProviderProvenance` sin campos nuevos.
  Sin migración de registro (D-C es perezosa y en el bundle).
- **Permisos:** «Gestión de apps» (TCC `SystemPolicyAppBundles`), autorizado «si hace falta». No se pide de antemano
  ni cambian las capabilities de Tauri.
- **Privacidad:** solo se tocan el bundle de la copia y `branding/icon.png`. Nunca el perfil, el llavero ni sesiones.
  Los mensajes no incluyen rutas del perfil.
- **Plataformas:** solo macOS cambia. Windows y Linux reciben el campo nuevo (siempre `null`) y el comando devuelve
  un error explícito. Tienen que compilar en sus runners.
- **Regresiones posibles:** sync desde donante con icono; renombrar una instancia con icono; copias legacy ad hoc;
  la original (sigue con `--strict` y nunca recibe icono).
- **Riesgosa:** sí. Relaja una verificación de firma y pide un permiso del sistema.

## Solución

### A-1 · Contrato (TypeScript literal; Rust con `rename_all = "camelCase"`)

```ts
export type CustomIconSystemIssue = "appManagement";
export interface CustomIcon {
  path: string;
  revision: number;
  systemApplied: boolean;          // true = el icono está puesto en la copia y la comprobación A-2 pasó
  systemMessage: string;           // texto para la persona (A-5)
  systemIssue?: CustomIconSystemIssue | null; // nuevo; solo macOS; null salvo bloqueo de «Gestión de apps»
}
// IPC nuevo: reapply_instance_icon { id: string } -> DashboardState   (RefreshScope::LIGHT, with_registry_operation)
// bridge: reapplyInstanceIcon(id: string): Promise<DashboardState>   (mock: systemApplied=true, systemIssue=null)
```

Rust: `enum CustomIconSystemIssue { AppManagement }` (`#[serde(rename_all = "camelCase")]`) y
`#[serde(default)] system_issue: Option<CustomIconSystemIssue>` en `CustomIcon`. `reapply_instance_icon` reaplica
`<root>/branding/icon.png` con la instancia detenida (A-4). Fuera de macOS devuelve
`Err("El icono del Dock solo se aplica en macOS.")`.

### A-2 · La comprobación con icono: `verify_managed_bundle(candidate, original, provenance)`

Forma de la raíz del bundle:

- **limpia:** no hay `Icon\r` ni `com.apple.FinderInfo` en la raíz;
- **con icono:** hay uno o los dos, y nada más fuera de `Contents/`.

| Forma | Requisitos | Resultado |
| --- | --- | --- |
| Limpia | `validate_provider_identity_uncached` (hoy: `--deep --strict` en copia y original, bundle id, Team ID). Si hay provenance: versión ≥ `provider_version` (sin *downgrade*) | `Clean { code_hash_matches }`. Si el CDHash no coincide con el registrado, es D-3 y se re-registra en el siguiente punto con escritura (A-3) |
| Con icono | Los seis pasos de abajo | `Iconized`, o error |

Pasos de la forma «con icono»:

1. Hay provenance con `provider_signature_preserved = true` y `managed_code_hash`. Sin provenance, la forma con
   icono no se admite (`--strict` falla, como hoy).
2. Original: `validate_provider_identity(original, original)` (con caché por fingerprint, sigue `--strict`).
   Su DR se lee de `codesign -d -r-` (stdout), explícito o implícito (`# designated => cdhash …`).
3. Copia: `/usr/bin/codesign --verify --deep --strict=symlinks -R =<DR de la original> <copia>`, con los argumentos
   como lista y `LC_ALL=C`.
4. CDHash de la copia == `managed_code_hash`; bundle id de la copia == el de la original == `bundle_identifier`;
   Team ID de la copia == el de la original == `provider_team_identifier`.
5. **Barrido de *sideband*** (lo que `--strict=symlinks` deja fuera): se recorre el bundle con `lstat`, sin seguir
   symlinks. Ninguna entrada, salvo la raíz y `<raíz>/Icon\r`, puede tener `com.apple.FinderInfo` ni
   `com.apple.ResourceFork`. En la raíz no puede haber `com.apple.ResourceFork`. Se usa `libc::listxattr` con
   `XATTR_NOFOLLOW`. El resto de xattrs (`quarantine`, `provenance`, `com.apple.cs.*`, `macl`) se admite, igual
   que en `--strict`.
6. **Forma de la raíz**: las entradas son ⊆ {`Contents`, `Icon\r`}. Si existe `Icon\r`: archivo regular (`lstat`),
   0 bytes de *data fork* y sin bits de ejecución.

Cualquier fallo devuelve un mensaje para la persona:

> La copia de «{nombre}» cambió fuera de Code AI Profiles y no se abrirá. Sincronízala desde la original para
> recuperarla.

No se devuelven rutas ni diagnósticos de `codesign`. Equivalencia: los pasos 3, 5 y 6 cubren todo lo que detecta
`--strict` salvo el FinderInfo de la raíz y el contenido de `Icon\r`. El paso 4 fija además el binario exacto: ni
siquiera otra versión firmada por Anthropic pasa con icono.

**El CDHash se registra** (`managed_code_hash`, `provider_version`, `provider_team_identifier`,
`bundle_identifier`) **solo inmediatamente después de un `--strict` en verde sobre la copia limpia** y antes de
`setIcon`. Puntos de registro: aplicar el icono a una copia limpia, el final de un sync o una actualización encadenada
de la HU-0017 (sobre el bundle nuevo), y D-3/D-C en el preflight de lanzamiento. Nunca se registra desde una copia
con icono.

### A-3 · Dónde se aplica

| Operación | Comprobación |
| --- | --- |
| Original, descarga e instalación (HU-0017), handoff «Actualizar original» | `--strict` sin cambios. Además, `setIcon` rechaza cualquier ruta que no esté dentro de `ManagedPaths.instances` |
| Topología y refresco (`validate_managed_application[_source]`) | `verify_managed_bundle`, sin escribir nada. Una donante con icono vale como fuente |
| **Lanzar** una copia con `custom_icon` + provenance | Preflight A-4.5 antes de `spawn`. Si falla, no se lanza |
| **Clonar** (`create_instance_sync`, también con `source_path` propia) | Tras `copy_provider_application`: se quita el icono heredado (A-4.3). Sin otra verificación nueva |
| **Sincronizar / actualizar** (incluida la encadenada de la HU-0017) | Fuente: `verify_managed_bundle` (donante) o `--strict` (original). En *staging*: quitar el heredado y luego `--deep --strict -R=<DR>` + versión + bundle id **antes del swap** (nuevo). Tras el swap: registrar y aplicar el icono del destino (A-4.4) |
| Poner, reaplicar o quitar el icono | Antes: `verify_managed_bundle`. Después: A-2 «con icono» al poner; `--strict` al quitar |

### A-4 · Ciclo de vida del icono (macOS; siempre con la instancia detenida y dentro de `with_registry_operation`)

1. **Poner o reemplazar** (`set_instance_icon`, `reapply_instance_icon`):
   - comprobar con `verify_managed_bundle`;
   - si la copia está limpia: `--strict` y registrar;
   - `set_workspace_icon(Some)`, luego A-2 «con icono»;
   - guardar `systemApplied=true` y `systemIssue=null`.
   Si `setIcon` falla, se clasifica (A-5) y **no es fatal**: se guarda el icono con `systemApplied=false`, la
   provenance limpia registrada y la copia limpia (se deshace lo parcial con `setIcon(nil)`, y si no, con la
   quita directa). Si A-2 falla después de un `setIcon` correcto, se vuelve al estado anterior y se devuelve `Err`.
2. **Quitar** (`clear_instance_icon`): `set_workspace_icon(None)`, `--strict` en verde, `custom_icon=None` y
   `provider_provenance=None`. Si `setIcon(nil)` falla por «Gestión de apps», devuelve `Err` con el texto de A-5 y
   no cambia nada. Así no se miente sobre AC-04.
3. **Quitar el heredado al copiar:** `strip_inherited_icon(bundle)` borra `<raíz>/Icon\r` (si es archivo regular) y
   hace `removexattr(raíz, "com.apple.FinderInfo", XATTR_NOFOLLOW)`, ignorando `ENOATTR` y `NotFound`. Sin
   NSWorkspace: el bundle aún no es visible. Corre sobre la copia de *staging* o la recién creada.
4. **Sync o actualización** (`apply_macos_branding_after_update`), con la copia ya limpia y verificada en *staging*:
   - si el destino tiene `custom_icon` y `systemIssue != appManagement`: registrar y aplicar como en el punto 1;
   - si `setIcon` falla: se conserva la actualización con `systemApplied=false`;
   - si no tiene icono: `provider_provenance=None`.
   Mensaje: «Icono reaplicado después de sincronizar.»
5. **Preflight de lanzamiento** (solo con `custom_icon`, en macOS):
   - **con icono:** A-2. Si pasa, se lanza; si no, `Err` y no se lanza;
   - **limpia, sin provenance (D-C):** si `--strict` pasa, registrar y reaplicar (*best effort*); si no, se lanza
     como hoy;
   - **limpia con provenance:** si `--strict` + DR + versión ≥ registrada pasan, re-registrar (D-3 si cambió el
     CDHash) y reaplicar. Si fallan, `Err` y no se lanza;
   - la reaplicación se salta si `systemIssue == appManagement`, para no repetir el aviso de macOS en cada
     lanzamiento. Solo la reintenta la persona;
   - si reaplicar falla, se lanza igual, con `systemApplied=false` y el mensaje.
6. **D-3** · Si Claude se actualiza sola, la copia queda limpia con otro CDHash y una versión ≥. Se acepta como
   cualquier copia firmada por el proveedor y se reaplica en el siguiente lanzamiento o sincronización (★ D-A).
   Una versión menor que la registrada se rechaza.
7. **Renombrar** la instancia mueve `Icon\r` con el bundle; sin efecto (★ D-E).

### A-5 · «Gestión de apps»

- **Detección:** solo cuando `setIcon` devuelve `false` (o al quitarlo). Prueba posterior: `OpenOptions::new()
  .write(true).create(true).open(<raíz>/Icon\r)`; si el archivo no existía, se borra. `EPERM` (raw os error) →
  `AppManagement`. `Ok` u otro error → «rechazado» genérico. Lo mismo para `EPERM` en la quita directa.
  Nunca se consulta TCC ni se pide antes.
- **Mensajes** (`system_message`, literales):
  - aplicado: «Icono aplicado a la copia. Se verá en el Dock al abrir la instancia.»;
  - App Management: «macOS no dejó a Code AI Profiles cambiar el icono de la copia. Para verlo en el Dock, activa
    Code AI Profiles en Ajustes del Sistema › Privacidad y seguridad › Gestión de apps y pulsa «Reintentar». Si
    sigue igual, cierra y vuelve a abrir Code AI Profiles. El icono sigue visible dentro de la app.»;
  - genérico: «macOS no aplicó el icono a la copia. Sigue visible en Code AI Profiles; pulsa «Reintentar» con la
    instancia detenida.»
- **Reintento:** el botón «Reintentar» (`reapply_instance_icon`) aparece con la instancia detenida, en macOS, cuando
  `customIcon && !systemApplied`. Si tiene éxito, `systemIssue=null`.

### Datos

`CustomIcon.system_issue` (nuevo, opcional). `ProviderProvenance` ahora tiene uso real: el CDHash registrado es la
pieza de seguridad. Sin variables de entorno ni URLs nuevas.

### Variables de entorno nuevas

Ninguna.

### Señales

No aplica (observabilidad off).

## Briefs y orden

1. `briefs/backend.md` · modelo **opus** (verificación de firma, permiso del sistema y bundles reales). B-1 primero:
   contrato en `types.ts` y `bridge.ts`, y el comando que devuelve «no soportado». Avisa al frontend.
2. `briefs/frontend.md` · modelo **sonnet**. Empieza en paralelo tras B-1. Solo `src/features/instances/` y su
   cableado.
3. Revisión técnica (architect), después la prueba a ojo: el fixture del análisis y luego una instancia de prueba
   vacía con dos instancias a la vez (AC-01), el llavero sin diálogo (AC-02) y «Quitar» (AC-04).
4. Al cerrar, el orquestador: delta en `docs/instancias.document.md` (la regla modificada), README y CHANGELOG.

## Revisión técnica

2026-10-28 · `fc39180..cdaeeac` · **PASS**, con la condición de la suite. Las observaciones R-1 a R-9 están en
`revision-tecnica.md`.
