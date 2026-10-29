# Revisión técnica · HU-0023 · Proyectos: resumen de proyectos con metodología v4

Fecha: 2026-10-29 · Revisa: architect · HEAD revisado: `da30038` (rama `hu-0022-configuracion-unificada`)

- **Backend:** `ab26ad5` (contrato TS y mocks), `1785d4d` (`tauri-plugin-dialog` 2.7.3 e `Info.plist`), `a9d609c`
  (`projects.rs`, `projects/{method,tech,git,tests}.rs`, seis comandos).
- **Frontend:** `ecf5102`, `10883f5`, `fcd3423`, `5d5e667`, `ac9d421`.
- **Orquestador:** `da30038` (`test:projects` en `relacionadas`, `suite` y `validate.yml`).
- **Fuera de la revisión:** `da99619`, `3ca310f` y `e2cfb37` son correcciones de la HU-0022. Tocan `AppSidebar`,
  Configuración y Permisos, pero no cambian nada de Proyectos.

## Veredicto: **FAIL**, por una corrección pequeña de backend (R-1)

El diseño se cumple casi entero: solo lectura, sin ejecutar nada, lista de exclusión, registro atómico y privacidad
del reflog. Las cifras cuadran con este repo. El fallo está en un punto concreto: `resolve_repo` toca en disco la
`ruta` de un repo **antes** de saber si está fuera de la carpeta. Con un `.metodo/config.json` ajeno, eso es red
encubierta: en Windows, un `\\host\share` abre SMB y envía el hash NTLM de la persona al arrancar la app. Contradice
RN-02 («no se usa la red», «lo de fuera no se lee»), que es la promesa central de la historia. Se arregla con pocas
líneas y una prueba. Después, R-2 y R-3 se corrigen antes de entregar y el resto es deuda.

**Proceso.** `pruebas.mjs estado` dice «HEAD e2cfb37 sin suite en verde». No hay ningún registro de suite sobre los SHA
de esta historia. Las cifras `cargo test` 149/0/2, `test:projects` 22, `test:ui` 18 y `test:permissions` 14 las dan
quienes implementaron. No corrí pruebas. Tras corregir R-1 a R-3, el orquestador corre la suite una vez sobre el SHA
final.

## Criterios

| Criterio | Estado | Dónde se ve |
| --- | --- | --- |
| AC-01 · maqueta aprobada | ✓ | `seguimiento.md`: «Aprobadas», 2026-10-29 01:01 |
| AC-02 · anclar y desanclar | ✓ en el código | `pin_project` vuelve a validar en Rust; es idempotente por ruta canónica (sin distinguir mayúsculas en macOS y Windows); tope de 100; `unpin` solo toca `projects.json` |
| AC-03 · resumen | ✓ | Este repo da 14 historias (1 · 4 · 7 · 2), igual que `hu/INDEX.md` |
| AC-04 · historias y consumo | ✓ | Recalculado a partir de los `metricas.json` de este repo: 7 terminadas, 3383 min (56 h), 571 504 427 tokens, 97,8 % de caché y 2 743 865 de entrada + salida. Las mismas cifras que los mocks y `tests/projects.test.ts`. La suma `agentes[].tokens` + `orquestador.porFase[].tokens` es igual a `totales.tokens` en las 7. HU-0012 y HU-0013 (descartadas) no suman (RN-03) y salen tachadas (`ProjectHistories.tsx:25`) |
| AC-05 · carpeta rota | ✓ | `notFound`, `notDirectory`, `configBroken`, `permissionDenied` y `forbidden` son estados, no un `Err`. `lastName` y `lastReadAt` se conservan (prueba 15). La página de proyecto roto deja desanclarlo |
| AC-06 · solo lectura | ✗ **R-1** | Ningún `Command::new`, `fs::write` ni `OpenOptions` en `projects/*`. La huella del árbol es la misma antes y después (prueba 13). Pero una ruta de repo de fuera se toca en disco (R-1) |

| Arquitectura | Estado |
| --- | --- |
| A-1 · lectura | ✓ salvo R-1, R-2 y R-4. `read` canonicaliza, comprueba la exclusión y el prefijo, exige un archivo regular, salta los de la nube y lee con `take(límite + 1)`. Los topes son los de la tabla. Las ramas se validan antes de usarlas como ruta. No se leen objetos de git |
| A-1.5 · privacidad del reflog | ✓. `last_reflog_entry` toma solo `<nuevo>` y `<segundos> <zona>`. El nombre, el correo y el mensaje no salen de la función. La prueba 9 comprueba el JSON serializado |
| A-2 · registro | ✓. `write_json_atomic` escribe un temporal en la misma carpeta, hace `sync_all` y `rename`, y borra el temporal si algo falla. `projects_mutex` es propio, con las lecturas fuera del cerrojo y releer + aplicar + guardar dentro. Un archivo dañado, un `version ≠ 1` o un id que no es UUID dan `Err` y no se sobrescriben. El id es un UUID v4 estable al volver a anclar |
| A-3 · contrato | ✓. `types.ts` es el espejo literal de A-3. `bridge.ts` llama a los seis comandos con `{ id }` o `{ path }`. `open_project_folder` toma la ruta del registro, nunca del frontend |
| A-4 · frontend | ✓ salvo R-3. Las rutas son `lazy`. Sin `focus`, `blur`, `visibilitychange`, `listen` ni intervalos en `features/projects`. Las lecturas se deduplican por clave en un `useRef`, así que StrictMode y la ruta comparten la carga de montaje. La prueba 17 vigila el aislamiento y que no se importe `@tauri-apps/plugin-dialog` |
| A-6 · TCC | ✓ con deuda (R-5, R-6). `protectedLocation` se calcula por prefijo, sin listar. Un `EPERM` en la raíz o en la config da `permissionDenied`, con un enlace a `#/configuracion/permisos`. La tarjeta «Archivos y carpetas» cuenta los proyectos en carpetas protegidas y marca los denegados |

## Lo comprobado (por lectura)

- **Plugin del diálogo.**
  - `Cargo.lock` añade solo `rfd` 0.16.1, `tauri-plugin` 2.6.3, `tauri-plugin-dialog` 2.7.3, `tauri-plugin-fs` 2.5.2
    (crate sin registrar, sin comandos) y `windows-sys` 0.60 con sus `targets`. No hay `ashpd` ni `zbus`: Linux usa
    GTK3, que Tauri ya enlaza. No añade ninguna crate de red.
  - Superficie: el plugin registra `open`, `save` y `message`. `capabilities/default.json` no les da permiso, así que
    desde el webview no se pueden llamar (ACL de Tauri 2).
  - Efecto lateral: el plugin inyecta en cada página `init-iife.js`, que reemplaza `window.alert` y `window.confirm`
    por llamadas a `plugin:dialog|…`, y esas llamadas se rechazan. Hoy no hay ningún `alert`, `confirm` ni `prompt` en
    `src/`. Ver R-3.
  - El selector usa `blocking_pick_folder` dentro de `spawn_blocking`, con `main` de padre. El plugin lo despacha al
    hilo principal en las tres plataformas.
- **Rutas en Windows.** `comparable` quita `\\?\` (y `\\?\UNC\`) antes de comparar. `stored_path` guarda sin el
  prefijo. `join_relative` rechaza `..`, las rutas absolutas y los componentes con `:`. Para la `ruta` de los repos,
  ver R-1.
- **Configuración.** Ninguna URL ni variable nueva: `config.mjs check` en orden. El DTD de Apple en `Info.plist` es un
  estándar.
- **Privacidad.** No se leen transcripciones ni nada de `~/.claude`, de `app_data` ni del perfil de la original: la
  exclusión se compara de forma léxica antes de tocar el disco y otra vez tras canonicalizar. Hay pruebas con un
  symlink hacia `.claude` y con el `home` anclado. Del proyecto llegan a la UI la persona que aprueba, las ramas y las
  rutas relativas de los repos, y está dentro de lo permitido. Ni `println!` ni registros.
- **Peso.** JS principal 596 → 632 kB. El plugin aporta 0 bytes (no hay paquete npm). Medido con esbuild por módulo,
  los +36 kB son unos 12 kB de mocks de proyectos en `bridge.ts`, 7 de `projects-selectors`, 4 de `PinProjectDialog`
  (que `DialogHost` carga sin diferir), unos 2,5 de `ProjectsSidebarGroup`, unos 2,5 de `projects-format` y unos 5
  entre proveedor, store, inicial y estilos. Las páginas sí se difieren: `ProjectRoute` pesa 20 kB y `ProjectsRoute`
  7,8 kB. Ver R-7.
- **Desvíos declarados.** Todos aceptados:
  - `Table.containerClassName` está documentado en la ficha del catálogo.
  - En `NoticeAlert`, `col-start-2` es inocuo: `icon` es obligatorio y los 9 usos lo pasan.
  - Los avisos de Rust van bajo la cabecera (ver R-10).
  - Las filas del sidebar usan `--ctl-sm`, como las de instancias.
  - La tabla de tecnologías del frontend: ver R-8.

## Correcciones y deuda

| # | Severidad | Responsable | Qué |
| --- | --- | --- | --- |
| R-1 | **Bloquea** | backend | `resolve_repo` (`projects.rs` L1087) llama a `fs::canonicalize(&joined)` también cuando la ruta ya es léxicamente de fuera: absoluta, `..`, UNC `\\host\share` o la relativa a unidad `C:x` de Windows (`PathBuf::push` la convierte en relativa al CWD). Eso abre SMB en Windows (fuga del hash NTLM al arrancar), puede montar un volumen de red y puede sacar el aviso de TCC por una carpeta que la persona no eligió. **Pide:** con la exclusión léxica comprobada, si `!lexically_inside` → `Outside` **sin tocar el disco**. Los componentes con `:` en Windows también dan `Outside`, como en `join_relative`. Prueba `#[cfg(unix)]` que lo distinga: una `ruta` absoluta bajo una carpeta con modo `000` da `Outside` sin el aviso «No se pudo acceder…» (hoy da `Unreadable`). Las pruebas 8 y 12 tienen que seguir igual |
| R-2 | Corregir antes de entregar | backend | `ReadContext::list_dir` (L537) no comprueba `is_cloud_placeholder`. Listar `hu/` cuando es una carpeta *dataless* de iCloud o un *placeholder* de OneDrive (`RECALL_ON_OPEN`) obliga a descargar su contenido. **Pide:** la misma comprobación en `list_dir` antes de `read_dir`; si es un *placeholder*, `Skip::Cloud` |
| R-3 | Corregir antes de entregar | frontend | El plugin cambia `window.confirm` para que devuelva una `Promise` (siempre verdadera) y deja `alert` sin efecto, con un rechazo sin capturar. Hoy nadie los usa, pero un `if (confirm(…))` futuro borraría sin preguntar. **Pide:** un caso en `test:ui` que prohíba `alert(`, `confirm(` y `prompt(`, con `window.` o sin él, en `src/` (con su canario), y una línea en `docs/arquitectura/frontend.md` (hecha en esta revisión) |
| R-4 | Deuda | backend | Un symlink dentro del proyecto que apunta fuera se descarta bien, pero `canonicalize` ya ha resuelto su destino: un `stat` que puede tocar un volumen de red montado o una carpeta protegida por TCC. Lo seguro es recorrer los componentes con `symlink_metadata`/`read_link` y no seguir ninguno que salga de la carpeta |
| R-5 | Deuda | backend | `Info.plist` no tiene `NSRemovableVolumesUsageDescription` ni `NSNetworkVolumesUsageDescription`, aunque `protectedLocation` contempla `external`. Sin esos textos, el aviso sale sin explicación |
| R-6 | Deuda (decisión informada) | orquestador · mantenedor | Leer al abrir la app (pregunta 3) puede sacar **hasta un aviso por clase de TCC** (Escritorio, Documentos, Descargas, iCloud Drive, volúmenes extraíbles y de red), uno tras otro y antes de entrar en Proyectos. Además, la firma es ad hoc (`signingIdentity: "-"`): macOS guarda el permiso por *cdhash*, así que los avisos **vuelven tras cada actualización**, no salen «una vez por carpeta» como se dijo en S-3. El orquestador lo añade a `verificacion.md` (anclar en Documentos, reabrir y actualizar) y a `docs/proyectos.document.md`. Si al mantenedor le pesa, la alternativa de la pregunta 3 sigue disponible |
| R-7 | Deuda | frontend | El JS principal crece 36 kB, sin culpa del plugin. Hay dos palancas: diferir `PinProjectDialog` en `DialogHost` (unos 4 kB) y sacar los mocks de `bridge.ts` a un `import()` que solo se resuelva sin Tauri. Lo segundo afecta a todos los mocks (12 kB antes de esta historia) y va en un `/fix` aparte |
| R-8 | Deuda | architect → backend + frontend | `GROUP_OF` (`projects-selectors.ts`) repite en el frontend la tabla cerrada de `tech.rs`: es un acoplamiento que no se declaró. Una tecnología nueva en Rust caería en «Otras» sin avisar. Se resuelve con un `category` aditivo en `ProjectTechnology` (contrato 0.x) |
| R-9 | Deuda | frontend | Carreras del reducer: un `list/loaded` que empezó antes de desanclar vuelve a añadir el proyecto, y lo mismo pasa con un `project/loaded` tardío; además, `list/loaded` vacía `refreshing` con lecturas aún en vuelo. Se arregla con una generación por lista o ignorando los ids desanclados |
| R-10 | Deuda | backend + frontend | `warnings` no tiene tope ni en el resultado ni en la UI: 2000 historias rotas dan 2000 filas bajo la cabecera. La propuesta es un tope (p. ej. 50) más «y N más» |
| R-11 | Deuda | backend | `Cargo.toml` declara `tauri-plugin-dialog = "2"`, aunque el commit dice «~2». La versión solo la fija `Cargo.lock`: un `cargo update` subiría a 2.8.x y arrastraría tauri 2.12. La propuesta es `"~2.7"` |
| R-12 | Deuda (abierta desde la maqueta) | mantenedor · diseño | «En curso» en claro (`--primary-bright` `#ff5f35`) llega a unos 3,0:1 sobre la tarjeta y a 2,6:1 sobre `--surface`. Lo compensan la leyenda con números y la tabla |

**Observaciones** (sin responsable, para tenerlas en cuenta):

- `open_in_file_manager` usa `/usr/bin/open <carpeta>`. Si esa carpeta fuera un paquete `.app` con `.metodo/` dentro,
  se ejecutaría. El selector nativo no deja elegir paquetes, pero `pin_project` acepta cualquier ruta que le pase el
  webview. El riesgo es teórico.
- `lastReadAt` cambia en cada lectura correcta, así que `projects.json` se reescribe al arrancar y en cada visita.
  A-2 lo aceptó; con el mutex y la escritura atómica, no hay riesgo.

## Pendiente para el cierre (no es de esta revisión)

- `docs/producto/reglas/proyectos.md` (RN-02 a RN-04) y su fila en el README de reglas.
- `docs/proyectos.document.md`, README y CHANGELOG.
- La suite, una vez sobre el SHA final.
- La prueba humana: selector y TCC en macOS empaquetado (R-6), y el selector en Windows y Linux, o «solo verificado
  en CI».
