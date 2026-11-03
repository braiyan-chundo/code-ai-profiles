# Revisión técnica · HU-0027 · Icono personalizado de proyecto

Fecha: 2026-11-03 · Revisa: architect · HEAD revisado: `eefeac6` (rama `ajustes-windows-y-sidebar`)

- **Backend:** `3b3092a` (contrato TS y mocks) y `adf610e` (Rust, scope del asset protocol y pruebas).
- **Frontend:** `66a318d` (interfaz, pruebas y evidencias).
- **Referencia:** `arquitectura.md` (A-1 a A-6), `briefs/`, `diseno/vista.md` y la maqueta aprobada.

## Veredicto: **PASS con observaciones**

No hay nada que bloquee. R-1 y R-2 son baratos. Conviene corregirlos antes de la prueba humana, porque R-1 se ve en
la escena 07, y la suite completa tiene que correr sobre el SHA que salga de esos arreglos.

**Condición antes de la prueba humana:** la suite completa, una vez, sobre el SHA final. `pruebas.mjs estado` dice
«HEAD eefeac6 sin suite en verde» y no hay ningún registro de `3b3092a`, `adf610e` ni `66a318d`. No corrí pruebas.
`config.mjs check` está en orden.

## Lo comprobado

| Punto | Resultado |
| --- | --- |
| Privacidad y RN-02 | Rust no lee ni escribe nada de la carpeta del proyecto. Los bytes llegan por IPC desde el selector, se normalizan en memoria y solo se escribe `<app_data>/project-icons/<uuid>.png`. `ReadContext` y la lista de exclusión no cambian. No hay `println!`/`log` de bytes ni de rutas. La vista previa es un `data:` que solo vive en memoria del diálogo. La prueba `projects_icon_set_writes_a_normalized_copy_outside_the_project` compara `fingerprint` de la carpeta antes y después |
| La ruta la calcula Rust | `project_icon_file` (`projects.rs`) toma el nombre de `Uuid::parse_str(id)?.hyphenated()`, nunca del texto. El frontend solo manda `id` y `bytes`. Con `../../x` o `""` devuelve `NOT_PINNED`. Con `{uuid}` sale el nombre canónico, pero la búsqueda en el registro compara el texto y responde `NOT_PINNED`. Hay prueba de los tres casos |
| Symlinks | `project_icon` usa `symlink_metadata` y exige archivo regular de 1 B a 5 MiB: un enlace o un archivo vacío dan `icon: None` sin tocar el registro (pruebas `missing_copy` y `symlinked_copy`, esta solo en unix). `write_file_atomic` hace `rename` sobre el enlace, no sobre su destino. Además, el asset protocol de Tauri canonicaliza antes de comparar con el scope |
| Poner: orden y fallo a mitad | Normaliza **fuera** del candado. Dentro del candado: carga, busca, lee el PNG anterior, `create_dir_all`, `write_file_atomic(".project-icon")`, fija `revision` y `save_projects`. Si guardar falla, `restore_optional_file` devuelve el anterior o borra el nuevo si no había. Hay prueba con `app_data` en 0o555. Si el proceso muere entre el archivo y el registro, queda un PNG huérfano inocuo o uno nuevo con la revisión anterior, y el siguiente «Guardar» lo corrige |
| Quitar y desanclar | Primero el registro, después `remove_file` sin fallar. Los dos son idempotentes (pruebas `clear_is_idempotent` y `unpin_removes_the_copy`). Reanclar da otro UUID e `icon: None`. El error de `unpin` con un id no válido sigue siendo «El proyecto ya no está anclado.» (`String::from(AppError)` devuelve el mensaje). Ver R-2 |
| Candado sin reentrada | `read_project_at` (que llama a `find_entry`, que toma el candado) se llama **después** de soltarlo en los dos comandos. `with_projects_lock` pasa a ser genérico en `E`, y los llamadores existentes fijan `String` con `Ok::<(), String>`. No hay llamadores bajo `cfg` de plataforma |
| Carreras con `project/loaded` | Los dos comandos devuelven el resumen releído con `readAt` nuevo. Un `readProject` anterior aún en vuelo se descarta (`replaceIfNewer`), traiga o no el icono. `read_entries` toma `icon` del registro releído dentro del candado. Queda la ventana aceptada en A-2: un `list/loaded` cuya parte con candado terminó antes del guardado reemplaza sin mirar `readAt` |
| `projects.json` antiguo y bajar de versión | `icon` con `#[serde(default, skip_serializing_if)]`. `PinnedProject` y `ProjectsFile` no tienen `deny_unknown_fields`. `PROJECTS_VERSION` sigue en 1. Hay prueba de un registro sin `icon` que se reescribe sin el campo, mientras `ProjectSummary.icon` se serializa siempre (`null`). Una versión anterior ignora el campo |
| Scope del asset protocol | `tauri.conf.json` añade solo `"$APPDATA/project-icons/*.png"`. Los temporales (`.project-icon-<uuid>.tmp`) no encajan. La CSP, `capabilities/default.json` y los tres `tauri.<plataforma>.conf.json` no cambian. `$APPDATA` es `app_data_dir()`, la misma base de `ManagedPaths` (`storage.rs:128`) |
| `?v=revision` y caché | `localFileSource(path, revision)` añade `?v=` solo en escritorio. En el navegador devuelve el `data:`/`blob:` del mock sin tocarlo, porque `?v=` lo rompería. `instance-icon.ts` no pasa `revision` y queda igual que antes. `revision = max(ahora_ms, anterior + 1)` crece al reemplazar (hay prueba). Ver O-4 |
| D-3 (un proyecto roto no muestra el icono) | `visibleIcon` = `isReadable ? icon : null`, con prueba de los cuatro estados rotos. Lo usan el sidebar, la tarjeta, la cabecera y el diálogo a través de `projectIconSource`. `ProjectInitial` hace además que `broken` gane siempre. Rust sigue informando el icono de un proyecto roto (hay prueba), así que vuelve solo cuando aparece la carpeta (AC-05). Lo confirma la evidencia 10 |
| D-4 (un proyecto roto no abre el diálogo) | `ProjectBrokenPage` no cambia y `ProjectHero` solo recibe `ReadableProject`. `DialogHost` solo da por válido `kind: "icon"` con `readableProject`, y su efecto cierra el diálogo si el proyecto se rompe estando abierto |
| Accesibilidad del avatar-botón | Es un `<button type="button">` con `aria-label` «Cambiar icono del proyecto», `focus-visible:ring-2 ring-ring` y velo con lápiz `aria-hidden`, que aparece con hover y con foco. Tooltip del catálogo con `side="bottom"`. En el diálogo, mientras guarda: `aria-busy`, `closeDisabled`, `onOpenChange` ignora el cierre (Escape, X, clic fuera), y «Cancelar», «Quitar» y el `input` quedan desactivados. El `Spinner` lleva `aria-hidden`. Ver O-2 y O-3 |
| Tres plataformas | No hay `cfg` nuevos en el código de producción. El módulo de pruebas de `instances/icons.rs` pasa a `cfg(all(test, target_os = "macos"))` porque solo le queda el spike. La prueba de normalización se movió a `icon_image.rs` con `cfg(test)`, y en Windows y Linux sigue corriendo. `Cursor` e `image` no dependen de la plataforma. En Windows, `app_data_dir()` no lleva `\\?\` y `convertFileSrc` codifica la ruta. Ver O-6 |
| Territorios | `3b3092a`: solo `src/types.ts` y `src/lib/bridge.ts`. `adf610e`: solo `src-tauri/**`. `66a318d`: `src/app/**`, `src/features/**`, `src/lib/{icon-validation,local-asset}.ts`, `tests/` y `evidencias/`. Ningún rol escribió fuera de lo suyo. Ver O-5 |
| Prueba 17 (`features/projects` no importa `features/instances`) | Se respeta: `ProjectIconDialog` y `project-icon.ts` importan de `src/lib/` |
| Configuración | No hay variables nuevas, ni URLs ni identificadores en el código. Los iconos del mock son `data:image/png` en línea |

## Hallazgos

### R-1 · Una selección no válida deja activa la anterior: «Guardar» queda activo junto al error · no bloquea · frontend

`src/features/projects/ProjectIconDialog.tsx:35` y `:43` (y el `catch`) ponen el error, pero no deshacen una selección
válida anterior: `bytes` y `previewUrl` siguen puestos, así que `dirty` (`:28`) es `true` y «Guardar» está activo. La
evidencia `07-error-*` lo muestra así: vista previa con el degradado elegido antes, «Selecciona una imagen PNG o JPEG
válida.» debajo y «Guardar» activo. La escena 07 aprobada en `vista.md` dice «el icono no cambia y "Guardar" sigue
desactivado», y AC-03 pide «"Guardar" queda desactivado mientras no haya un cambio válido». Al pulsar «Guardar» se
guardaría la imagen anterior, no la que el error acaba de rechazar. **Arreglo:** en `select`, ante cualquier error
(tipo y peso, dimensiones, decodificación), `setBytes(null)` y `setPreviewUrl(null)` (se deja `remove` como estaba),
para que la vista previa vuelva al icono guardado o a la inicial y «Guardar» se desactive. Después, repetir las tres
capturas `07-error-*`. `InstanceEditor` tiene el mismo patrón, pero queda fuera de esta historia.

### R-2 · «Quitar» borra la copia fuera del candado: contra un «Guardar» concurrente, el registro se queda con icono y sin archivo · no bloquea · backend

`src-tauri/src/projects.rs:1631`: `clear_project_icon_at` suelta el candado y después hace `remove_file`. Si entre
las dos cosas entra un `set_project_icon_at` del mismo id (escribe el PNG nuevo y guarda `revision`), el
`remove_file` de «Quitar» borra la copia recién guardada. El registro dice que hay icono, `project_icon` no encuentra el
archivo y la imagen desaparece sin error. Desde la interfaz es casi inalcanzable, porque hay un solo diálogo y queda
bloqueado mientras guarda, pero la operación deja de ser atómica respecto del registro. **Arreglo:** mover el
`let _ = fs::remove_file(&icon_file);` dentro del cierre, después de `save_projects` (y también cuando el registro no
cambió, para limpiar huérfanos), sin propagar el error. `unpin_project_at` (`:1564`) no tiene la carrera, porque sin
entrada el «Guardar» responde `NOT_PINNED`, pero puede moverse igual para que las dos sigan la misma regla. Corrijo
yo el texto de A-3 cuando se cierre.

## Observaciones

- **O-1 · frontend, sin acción.** `project/loaded` limpia `refreshing[id]`. Si había un «Actualizar» de ese proyecto en
  vuelo, su spinner se para antes de tiempo y su resultado se descarta (`readAt` anterior). El comportamiento del
  reducer es anterior a la historia y el resultado es correcto.
- **O-2 · frontend, opcional.** El nombre accesible es «Cambiar icono del proyecto» y Radix añade el tooltip «Cambiar
  icono» como descripción, así que un lector de pantalla lo anuncia dos veces. Además, el nombre no dice de qué proyecto
  se trata. Con `aria-label={`Cambiar icono de ${name}`}` desaparece la repetición y se gana contexto.
- **O-3 · frontend, opcional.** `select` es asíncrono y no tiene guarda. Si se eligen dos archivos muy seguidos, gana el
  que termine de decodificarse el último, no el último elegido. Se arregla con un contador en un `useRef`, ignorando los
  resultados que ya no son el último.
- **O-4 · architect, documentación.** Después de «Quitar», la siguiente revisión es `ahora_ms` y no `anterior + 1`,
  porque el registro ya no guarda la anterior. «Crece siempre» (A-2) en realidad significa «crece con el reloj». Para
  que se repitiera una URL de la sesión, el reloj tendría que retroceder. Lo acepto y corrijo el texto al cerrar.
- **O-5 · backend, aceptada.** `projects/reader.rs` y una prueba existente de `projects/tests.rs` solo cambian por
  `cargo fmt` (el commit lo declara). No estaban en el brief, pero son de su territorio y no cambian el comportamiento.
- **O-6 · backend, aceptada.** Las pruebas de enlace y de restauración tras un fallo son `cfg(unix)`. El código es el
  mismo en Windows, pero allí no se prueba. El reemplazo del PNG en Windows depende de que nadie lo tenga abierto sin
  `FILE_SHARE_DELETE` (el asset protocol lo lee con std, que sí lo comparte). Queda como pendiente humano.
- **O-7 · orquestador, al cerrar.** Aplicar el delta de RN-04 de `arquitectura.md` en `docs/producto/reglas/proyectos.md`,
  correr `pnpm graph:update`, `graphify affected "ProjectSummary"` y `pnpm graph:check`, y actualizar la documentación
  funcional y el `README.md` si enseñan los proyectos.

## Lo que solo comprueba una persona

- Con la app de escritorio: poner, reemplazar y quitar un icono, y ver que cambia en la cabecera, en el sidebar
  desplegado y plegado y en la tarjeta sin reiniciar. Comprobar que se mantiene al reabrir la app, que `git status` del
  proyecto sigue limpio y que, al desanclar, desaparece `project-icons/<uuid>.png`.
- Un logo con transparencia y una foto en 16 px. Que el tooltip «Cambiar icono» sale también con el foco de teclado (la
  evidencia 03 no lo muestra) y que Escape no cierra mientras guarda.
- Windows y Linux solo se compilan en `build-desktop.yml`. Queda por ver el icono servido por `http://asset.localhost`
  en Windows, el reemplazo de un icono ya pintado y la ruta de AppImage en Linux.
