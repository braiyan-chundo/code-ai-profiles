# HU-0005 — Recuperar la respuesta de la interfaz y establecer versionado SemVer

## Metadatos

- Estado: `In Progress`
- Creada: 2026-10-11
- Actualizada: 2026-10-17
- Solicitante: mantenedor del proyecto
- Orquestación: `architect`
- Documentación: `document`
- Implementación prevista: `backend` y `frontend`

## Historia de usuario

Como persona que administra varias instancias de aplicaciones de IA de escritorio, quiero que las acciones habituales respondan sin esperas evitables y que todas las superficies de la aplicación usen una versión SemVer única, para trabajar con fluidez y saber exactamente qué build estoy usando.

## Problema

Después de HU-0004, acciones sencillas esperan la reconstrucción completa del dashboard antes de completar. El flujo actual vuelve a inspeccionar procesos, firmas, versiones, sesiones, transcripts y almacenamiento aunque la acción solo haya cambiado una parte del estado. Además, el escaneo manual impone una espera mínima de 1.150 ms incluso cuando el backend ya terminó.

La versión `0.1.0` está repetida en `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json` y `src/App.tsx`. Esas fuentes pueden divergir y la interfaz no obtiene la versión desde el contrato de ejecución.

## Contexto y evidencia de Graphify

Evidencia entregada por `architect`; `document` no ejecutó ni modificó Graphify:

- Graphify relaciona `refresh_instance_statuses`, `refresh_instance_usage`, `refresh_code_sessions`, `process_snapshot`, `build_version_topology`, `dashboard_from` y `get_dashboard_state` en `src-tauri/src/lib.rs`.
- `process_snapshot` construye `System::new_all()` y llama `refresh_all` por instancia. `refresh_process_identity` puede repetirlo mediante `identity_matches_instance`; `signal_instance_processes` y sus esperas repiten inventarios.
- `refresh_registry` vuelve a leer estados, nombres de bundle, versiones, uso, catálogo global de transcripts y sesiones. `system_info` vuelve a construir topología, validar identidades/firmas, leer sesiones originales y ejecutar `path_size` recursivo.
- Todos los comandos de mutación terminan en `dashboard_from`; `launch_instance` llama además `refresh_registry` antes y `dashboard_from` después.
- En frontend, `refresh(scan = true)` impone una espera artificial mínima de 1.150 ms aunque el backend termine antes.
- `0.1.0` está hardcodeada en los manifests, locks, configuración Tauri y `App.tsx`.
- La reanudación del análisis conecta `apply_macos_custom_icon`, `set_macos_workspace_icon`, `set_instance_icon`, `launch_instance` y el spike de Dock. La consulta se limita a relaciones de código y documentación; `document` no ejecutó Graphify.

## Alcance

### Respuesta y refresco incremental

1. Capturar un inventario de procesos una sola vez por operación o iteración y reutilizarlo para refrescar todas las instancias, validar su identidad y señalizarlas. Los loops de espera podrán refrescar una vez por tick, nunca una vez por proceso o por instancia anidada.
2. Introducir scopes o modos de refresco. El inicio y escaneo manual completo podrán leer procesos, uso, catálogo/sesiones, versiones/topología y almacenamiento. Las acciones lifecycle, edición e icono devolverán el estado actualizado sin reindexar transcripts ni recorrer el tamaño de disco. Las transferencias y desvinculaciones refrescarán sesiones y, deliberadamente, su catálogo global de transcripts; las sincronizaciones y actualizaciones refrescarán versiones.
3. Mantener los datos previos de áreas que no se refrescan e invalidar o actualizar solamente el área mutada, sin cambiar el contrato público existente de `DashboardState`.
4. Cachear metadata de inspección de aplicación y versión con una clave estable derivada de ruta canónica y metadata del binario o archivo de versión. La caché se invalidará al crear, sincronizar, reemplazar, borrar o cambiar el fingerprint de metadata. La validación profunda de firma/provenance (`codesign` o Authenticode) seguirá siendo fresca en los preflights que aceptan una fuente y nunca se sustituirá por una entrada cacheada.
5. Cachear `managed_bytes` con un TTL razonable e invalidarlo tras operaciones de disco. El escaneo manual forzará su recálculo.
6. Ejecutar trabajo bloqueante fuera del hilo async de comandos Tauri cuando corresponda y evitar dashboards completos duplicados.
7. Eliminar el mínimo artificial de 1.150 ms. La interfaz conservará el progreso real y podrá hacer un cierre visual breve que no bloquee la disponibilidad de la acción.
8. Las mediciones, fixtures y pruebas usarán únicamente datos sintéticos. No se leerá, registrará ni expondrá contenido de transcripts.

### Versionado SemVer

1. Subir el proyecto a `0.2.0`. Al tratarse de desarrollo inicial, las funcionalidades acumuladas desde `0.1.0` justifican el incremento `minor`.
2. Añadir `npm run release:version -- patch|minor|major|X.Y.Z`. El comando calculará o validará una versión SemVer canónica y sincronizará `package.json`, las dos entradas raíz de `package-lock.json`, la versión del paquete propio en `src-tauri/Cargo.toml`, el paquete propio en `src-tauri/Cargo.lock` y `src-tauri/tauri.conf.json`.
3. La actualización de versión será atómica: ante input inválido o fuentes inconsistentes, el comando fallará sin escritura parcial.
4. Añadir `npm run release:check`, de solo lectura, que falle si las fuentes de versión divergen. Debe formar parte de CI.
5. Exponer `SystemInfo.appVersion: string` en camelCase desde runtime, derivada por el backend de `CARGO_PKG_VERSION`; actualizar tipos, bridge y mocks. `App.tsx` mostrará ese contrato, sin un literal local.
6. Crear `CHANGELOG.md` siguiendo Keep a Changelog y `docs/versionado.document.md`. Actualizar el README con los comandos y esta política: `patch` para fixes compatibles, `minor` para funcionalidades compatibles y `major` para incompatibilidades. Para `0.y.z`, documentar que un `minor` puede incluir cambios incompatibles durante desarrollo inicial, aunque el proyecto mantendrá el criterio explícito anterior cuando sea posible.

### Icono distintivo en Dock de macOS

1. Aplicar la imagen personalizada realmente al Dock de macOS para cada copia gestionada mediante `NSWorkspace.setIcon`. El fallback limitado a la UI de Code AI Profiles de HU-0004 no satisface esta historia.
2. Antes de operar sobre una instancia real, realizar un spike en staging sintético que aplique `NSWorkspace.setIcon` a una copia temporal. Esta estrategia no altera bytes sellados, CDHash, Team ID ni designated requirement del proveedor, pero la metadata FinderInfo/resource fork hace fallar `codesign --verify --deep --strict` mientras permanece presente. El spike no usa ni modifica la aplicación original, perfiles reales, sesiones, autenticación ni transcripts.
3. La personalización se ejecutará únicamente con la instancia detenida como una transacción acotada a metadata externa de branding y registry. Puede escribir metadata de filesystem asociada al bundle gestionado, pero nunca archivos dentro del bundle, perfil, sesiones, credenciales, autenticación o transcripts. Debe tener backup y rollback por instancia.
4. Reaplicar el branding después de create, sync y update de una instancia. Si una instalación ya posee un icono personalizado, la actualización no lo pierde.
5. La implementación comprobará si una identidad de bundle única es imprescindible para invalidar la caché de Dock. Si ese cambio tiene impacto material sobre autenticación, perfil o updater, debe documentarse y elevarse al arquitecto antes de aplicarlo.
6. La personalización mediante metadata externa no relaja `validate_provider_identity`: mientras la metadata exista, la copia no supera la verificación estricta aunque sus bytes sellados, CDHash, Team ID y designated requirement sigan intactos. Producción retira esa metadata y restaura el baseline estricto antes de considerar la copia; por ello la personalización de sistema queda sin aplicar (`systemApplied=false`) y no puede declararse como icono de Dock. Copias legacy re-firmadas ad-hoc o manipuladas quedan excluidas como donantes.

### Decisión pendiente para el Dock

La investigación de reanudación descarta repetir `NSWorkspace.setIcon`: Apple documenta que FinderInfo, resource fork y atributos extendidos de icono están prohibidos en bundles firmados y explican el fallo de `codesign --verify --deep --strict`. `app.dock.setIcon` de Electron solo se puede invocar dentro del main process de la aplicación propietaria; `NSDockTile` también corresponde al proceso propio y `NSRunningApplication.icon` es de solo lectura. La inyección de `NODE_OPTIONS` no es una alternativa para aplicaciones empaquetadas.

Al 14 de octubre, modificar recursos de **una copia gestionada detenida** y aplicar una re-firma controlada era una alternativa candidata para investigar un icono real de Dock. El diseño no escribiría perfiles, conversaciones ni archivos de sesión y los fixtures podrían comprobar bytes intactos, pero una identidad de firma distinta puede impedir descifrar o acceder datos ligados a Keychain/safeStorage. Por tanto, ni el login ni la accesibilidad funcional de conversaciones podían garantizarse sin staging. El cliente propuso limitar el branding al momento de crear, antes del primer login, y autorizó el spike de HU-0007; ese experimento dio resultado negativo y no demostró viabilidad visual en el Dock.

La aplicación original, perfiles, conversaciones, credenciales, llavero y sesiones reales quedan fuera de cualquier spike. Esta reanudación no experimentó con ellos ni con instancias reales.

## Fuera de alcance

- Auto-updater de Code AI Profiles, descargas de la propia aplicación, tags, GitHub Releases o publicación de instaladores.
- Migración de datos por cambio de versión.
- Lectura del contenido de prompts, respuestas, credentials, cookies, tokens o transcripts privados.
- Optimizar la copia física de aplicaciones durante create/sync; esas operaciones pueden tardar por la naturaleza del copiado.
- Escribir, renombrar, re-firmar o sustituir la instalación original o cualquier binario fuente fuera de una copia gestionada.

## Criterios de aceptación

1. La carga inicial y el escaneo manual completo siguen mostrando datos correctos.
2. Launch, stop, edición e icono no reindexan el catálogo de transcripts, no recalculan `managed_bytes` ni construyen topología costosa si esa área no cambió.
3. Transferencias y desvinculaciones sí refrescan sesiones; sincronizaciones y actualizaciones sí refrescan versiones.
4. Cada refresco captura un inventario de procesos compartido, salvo ticks explícitos de espera durante stop.
5. Las cachés de metadata invalidan al cambiar su fingerprint y los preflights mantienen una validación profunda fresca de firma/provenance.
6. El escaneo ya no tiene un mínimo artificial de 1.150 ms y conserva información de progreso real.
7. Todas las fuentes canónicas, incluidas locks propios, quedan en `0.2.0`.
8. `release:version` admite `patch`, `minor`, `major` y una versión exacta; rechaza SemVer inválido e inconsistencias sin dejar escrituras parciales.
9. `release:check` es read-only, detecta divergencias y se ejecuta en CI.
10. La interfaz obtiene y muestra la versión desde `SystemInfo.appVersion` en runtime.
11. Pasan `npm run build`, `cargo fmt --check`, `cargo test --manifest-path src-tauri/Cargo.toml`, `npm run release:check`, `git diff --check` y el cierre Graphify indicado por el arquitecto.
12. Se preservan compatibilidad macOS, Windows y Linux, privacidad y el diseño visual actual.
13. En macOS, una solución de icono de sistema debe conservar el resultado de `codesign --verify --deep --strict` antes y después, mantener CDHash/Team ID/designated requirement del proveedor, superar un launch smoke y mostrar un icono distinguible en el Dock. La ruta actual de `NSWorkspace.setIcon` no cumple todavía este criterio porque se revierte para restaurar la verificación estricta.
14. La prueba del icono usa un bundle y perfil fixture o temporal; puede comprobar que los bytes del perfil quedan intactos y no usa ni cierra sesiones reales ni la aplicación original, pero ese resultado no garantiza el login ni la accesibilidad funcional de datos protegidos por Keychain/safeStorage tras una re-firma.
15. Cada operación de create, sync o update reaplica el branding de la copia gestionada y hace rollback de bundle/registry si falla.
16. La topología sigue rechazando copias legacy re-firmadas ad-hoc, manipuladas o no confiables como donantes; la personalización actual no modifica recursos sellados ni firma del proveedor.

## Diseño técnico y contratos

- `SystemInfo.appVersion` es un `string` camelCase que el backend deriva de `CARGO_PKG_VERSION`. Los retornos existentes de `DashboardState` se conservan.
- El backend será dueño de `src-tauri/src/lib.rs`, manifests y locks, scripts de release, workflow de CI y del contrato inicial en `src/types.ts` y `src/lib/bridge.ts`. Debe terminar ese contrato antes de que frontend cambie la vista.
- El frontend será dueño de `src/App.tsx` y estilos estrictamente necesarios para mostrar la versión de runtime y retirar la demora artificial. No modificará Rust, scripts, manifests, locks ni workflow.
- Los scopes de refresco deben limitar las lecturas a la región invalidada y fusionarse con el último dashboard conocido. No pueden fabricar datos sobre áreas omitidas ni modificar el sentido de los campos existentes.
- La clave de caché de metadata de inspección debe incorporar ruta canónica y fingerprint de metadata de versión. La invalidación será explícita en operaciones que creen, sincronicen, reemplacen o eliminen aplicaciones. Los preflights de fuente ejecutan validación profunda de firma/provenance de forma fresca.
- `release:version` debe validar todo antes de escribir. Si requiere más de una escritura, debe preparar contenido completo y usar reemplazos seguros para que el repositorio no quede en una mezcla de versiones ante fallo.
- En macOS, la personalización intenta aplicar `NSWorkspace.setIcon` como metadata externa sobre la copia gestionada detenida. Puede escribir FinderInfo, resource fork o atributos extendidos sin editar archivos dentro del bundle, `Info.plist`, ICNS, recursos sellados o ejecutables. Esos metadatos no cambian CDHash, Team ID ni designated requirement, pero hacen fallar `codesign --verify --deep --strict` mientras existen; producción los retira y restaura el registry/baseline estricto, dejando `systemApplied=false`.
- `validate_provider_identity` continúa exigiendo la identidad del proveedor original. Las copias legacy con re-firma ad-hoc o recursos alterados fuera del flujo no pueden convertirse en fuente de sincronización.

## Casos límite, privacidad y plataformas

- Un proceso que desaparece entre inventario y acción se manejará como cambio de estado, sin crear un segundo inventario por cada instancia. Los ticks de cierre siguen verificando de forma acotada hasta completar o informar fallo.
- Una aplicación cuyo fingerprint de metadata cambie pierde la entrada aunque conserve la misma ruta. Una entrada corrupta o no verificable se trata como cache miss. La aceptación de una fuente no se basa solo en caché: el preflight vuelve a validar firma/provenance.
- El escaneo manual fuerza `managed_bytes`; acciones ligeras conservan el último valor válido hasta su próxima actualización apropiada.
- La herramienta SemVer debe aceptar únicamente versiones canónicas `MAJOR.MINOR.PATCH` con prerelease/build metadata solo si la política y los manifests soportados lo permiten de forma consistente; en caso contrario debe rechazarlas con un mensaje claro. No debe modificar dependencias de terceros al actualizar el paquete propio en locks.
- Las diferencias de filesystem, firmas y mecanismos de proceso entre macOS, Windows y Linux deben tener pruebas con fixtures o abstracciones cuando el host no cubra una rama. No se agregan permisos, telemetría ni acceso de red.
- Los datos de sesión se miden mediante contadores o fixtures sintéticos; no se registran rutas o contenidos sensibles para demostrar rendimiento.
- El Dock puede conservar una caché de icono o agrupar por identidad de bundle. El spike mostró que `NSWorkspace.setIcon` no satisface simultáneamente el icono de Dock y la verificación estricta: su metadata se revierte en producción. El bundle ID no se modifica por su posible efecto en autenticación, perfil o updater.
- La edición de ICNS/`CFBundleIconFile` exige re-firma. La re-firma controlada fue una alternativa candidata para buscar un icono real, pero HU-0007 no demostró que arranque ni que llegue a producir evidencia visual del Dock en esta configuración. Puede cambiar firma, Team ID o designated requirement y comprometer Keychain/safeStorage o login. La original permanece intacta y las copias legacy no validables quedan excluidas de la topología como donantes.

## Plan de delegación

1. `backend` implementará inventario compartido, scopes de dashboard, cachés, invalidación, trabajo bloqueante, scripts SemVer, versiones en manifests/locks/CI, `SystemInfo.appVersion`, personalización transaccional de Dock macOS mediante metadata externa y pruebas Rust/nativas con fixtures. No modificará `App.tsx` ni estilos.
2. Cuando el contrato quede disponible, `frontend` eliminará la demora artificial y sustituirá el literal de versión por `SystemInfo.appVersion`, preservando diseño, tema, accesibilidad y mocks. No modificará Rust, scripts, manifests, locks ni workflow.
3. `architect` verificará los criterios, coordinará contratos y cerrará Graphify. `document` actualizará esta HU, su índice, `docs/rendimiento.document.md`, `docs/versionado.document.md`, README y CHANGELOG según la evidencia recibida.

## Plan y resultado de pruebas

Plan pendiente de implementación:

- Pruebas estructurales o contadores reproducibles que prueben una captura de procesos por refresco, excepto ticks de stop.
- Pruebas que prueben que acciones `LIGHT` no invocan catálogo de transcripts, `path_size` ni topología costosa; que `SESSIONS` sí reconstruye deliberadamente el catálogo global requerido para transferencias; y que transfer/sync refrescan sus áreas respectivas.
- Pruebas de caché que cambien el fingerprint y comprueben invalidación.
- Pruebas de `release:version` para incrementos, versión exacta, entrada inválida, inconsistencias y ausencia de escrituras parciales; prueba de `release:check` ante fuentes iguales y divergentes.
- Pruebas de contrato y mock para `SystemInfo.appVersion`, build de frontend y verificaciones mínimas de las rutas de plataforma no host.
- Prueba nativa en macOS sobre bundle/perfil fixture o temporal: baseline y resultado de `codesign --verify --deep --strict`, CDHash/Team ID/designated requirement de proveedor, launch smoke, estado `systemApplied`, icono distinguible en Dock mediante Cua y bytes de perfil sin cambios. La conservación de bytes no demuestra login ni accesibilidad de datos ligados a Keychain/safeStorage tras una re-firma. La ruta actual debe comprobar que retira la metadata y recupera el baseline; no cuenta como cumplimiento del Dock. Pruebas de rollback y rechazo de copias legacy no confiables como donantes.

Evidencia verificada y pendiente entregada por `architect`:

- La versión `0.2.0` quedó sincronizada entre `package.json`, `package-lock.json`, `Cargo.toml`, `Cargo.lock` y `tauri.conf.json`.
- `release:version` calcula incrementos `patch`, `minor`, `major` o acepta una versión exacta ascendente; usa `BigInt`, rechaza entradas inválidas, versiones iguales y downgrades. La simulación de rollback confirma que no deja una escritura parcial.
- `release:check` valida las fuentes en modo read-only; CI lo ejecuta junto con 11 pruebas Node. El build de frontend pasa y `SystemInfo.appVersion` ya alimenta la interfaz en runtime.
- La implementación de rendimiento incorpora scopes `FULL`, `FULL_SCAN`, `LIGHT`, `SESSIONS` y `VERSIONS`, inventario de procesos compartido, caché de almacenamiento, ejecución bloqueante separada y elimina la espera mínima visual del escaneo.
- `cargo test --manifest-path src-tauri/Cargo.toml` terminó con 38 pruebas aprobadas, 1 ignorada y 0 fallos. La prueba ignorada es el spike visual opt-in de Dock, se ejecutó por separado y falló; no cuenta como criterio de aceptación cumplido ni altera el resultado verde del gate normal de Cargo.
- El spike opt-in fuera de sandbox abrió el clon temporal mediante `open -n` con un perfil vacío; Cua mostró únicamente la pantalla de inicio de sesión de ese fixture. `set_macos_workspace_icon(..., None)` falló en `src-tauri/src/lib.rs:5895` con «NSWorkspace rechazó el icono personalizado», por lo que no hubo confirmación visual de un icono en Dock. Root cerró únicamente el PID `27587` tras validar el ejecutable y el argumento exacto `--user-data-dir` del fixture. No se tocaron perfiles ni sesiones reales. No habrá más experimentos de Dock en esta iteración.
- La producción conserva `systemApplied=false` y el icono personalizado dentro de Code AI Profiles como fallback. La estrategia no cambia bundle ID ni re-firma; los metadatos de `NSWorkspace` que impedirían la verificación estricta se retiran para restaurar el baseline.

## Documentación afectada

- `docs/rendimiento.document.md`: estrategia de refresco, cachés, invalidación y límites de privacidad.
- `docs/versionado.document.md`: SemVer, comandos de versión, comprobación y política durante `0.y.z`.
- `docs/instancias.document.md`: personalización de icono en Dock macOS, límites de plataforma, provenance y rollback.
- `README.md`: comandos de versión y política pública.
- `CHANGELOG.md`: historial inicial en formato Keep a Changelog.
- `docs/hu/index.md` y esta HU: estado, evidencia y cierre.

## Bitácora de implementación

- 2026-10-11: `architect` entregó el brief con evidencia de Graphify, alcance, contratos, criterios verificables y plan de delegación.
- 2026-10-11: con autorización explícita del solicitante, `architect` incorporó al alcance el requisito de identidad visual en el Dock de macOS y su spike para copias gestionadas. La decisión vigente evalúa `NSWorkspace.setIcon` como metadata externa, con backup/rollback y sin modificar archivos del bundle, firma o perfiles; el resultado en Dock no quedó confirmado.
- 2026-10-11: `document` confirmó que el siguiente ID único era `HU-0005`, creó esta HU inicialmente como `Draft` y la dejó en `Ready` porque el brief contiene alcance y criterios verificables. Se añadió una sola entrada al índice. No se modificó producto ni Graphify.
- 2026-10-11: `architect` reportó el versionado `0.2.0`, scripts y CI operativos, junto con la implementación inicial de scopes, cachés, inventario compartido, versión runtime y eliminación de espera artificial. La HU pasa a `In Progress`: quedan estabilización integral, pruebas y gates nativos de Dock.
- 2026-10-12: `document` actualizó la documentación de Dock tras la decisión arquitectónica de usar exclusivamente `NSWorkspace.setIcon` como metadata externa. Las copias legacy re-firmadas ad-hoc siguen excluidas como donantes. La HU permanece en `In Progress` hasta la evidencia nativa y el cierre del arquitecto.
- 2026-10-13: `architect` confirmó rendimiento y SemVer con build frontend, 11 de 11 pruebas de release y coherencia `0.2.0`; el backend completó 38 pruebas, 1 ignorada y 0 fallos. La prueba ignorada corresponde al spike visual opt-in y no satisface el criterio de aceptación del Dock. Fuera de sandbox, `open -n` abrió el clon temporal con perfil vacío y Cua mostró Sign in; `set_macos_workspace_icon(..., None)` falló en `lib.rs:5895` con «NSWorkspace rechazó el icono personalizado». No se consiguió icono de Dock, no se tocaron perfiles/sesiones reales y no habrá más experimentos de Dock en esta iteración.
- 2026-10-13: `architect` precisó que `NSWorkspace.setIcon` deja intactos bytes sellados, CDHash, Team ID y designated requirement, pero su metadata FinderInfo/resource fork hace fallar la verificación estricta mientras está presente. Producción la revierte, restaura el baseline y deja `systemApplied=false`; el Dock sigue sin cumplir su criterio.
- 2026-10-14: el cliente confirmó que `0.2.1` funciona y pidió reanudar el icono de Dock. `architect` documentó que `NSWorkspace.setIcon`, APIs externas de Electron y variables de entorno empaquetadas no resuelven la necesidad. El cliente propuso branding únicamente al crear y antes del primer login, y autorizó HU-0007 para evaluar la re-firma como alternativa candidata. No se experimentó con instancias reales, perfiles, conversaciones ni llavero.
- 2026-10-14: [HU-0007](HU-0007-spike-icono-dock-previo-al-primer-inicio-de-sesion.md) cerró con resultado negativo válido: la re-firma ad-hoc de un clon temporal no produjo proceso validable ni confirmación visual de Dock. La técnica queda rechazada en esta configuración y no habilita producto.
- 2026-10-17: [HU-0008](HU-0008-diagnostico-ab-del-arranque-macos-para-branding-previo-al-login.md) cerró el diagnóstico A/B con resultado `inconclusive`. El control y la variante re-firmada sobrevivieron la ventana de observación, pero la variante terminó con señal `9` después de `TERM`; no hubo muestra de UI, Dock ni login y no se atribuyó causa. No existe una implementación de branding de Dock validada.

## Resultado y riesgos residuales

La implementación está en progreso. La optimización elimina trabajo redundante y esperas artificiales, pero no garantiza una latencia fija porque el filesystem, los procesos del proveedor y el copiado físico dependen del equipo y de la plataforma.

La identidad distintiva de Dock no está cumplida. HU-0007 evaluó una copia temporal nueva, pero la ejecución directa terminó con señal 9 antes de tener un PID validable y el segundo intento mediante `open -n` falló antes de crear un proceso validable; no se atribuyó causa. El intento de seleccionar el Dock con CUA agotó el tiempo (`-10005`) y no produjo evidencia visual. No se tocaron perfiles ni sesiones reales. Producción mantiene `systemApplied=false` y el icono personalizado solo dentro de la UI.

La re-firma controlada de una copia gestionada detenida fue una alternativa candidata para cambiar ICNS/`Info.plist`, pero HU-0007 la rechazó en la configuración evaluada: no produjo un proceso fixture validable ni confirmación visual de Dock. Además, podría romper Keychain/safeStorage y exigir reautenticación. Aunque no escriba los archivos de perfil o conversación, no garantiza que puedan descifrarse o seguir siendo accesibles. El Dock permanece pendiente por ausencia de una implementación validada, no por falta de respuesta del cliente. No se realizarán experimentos con instancias reales, perfiles, conversaciones o llavero en esta iteración.

HU-0007 descartó la configuración de re-firma ad-hoc evaluada: no produjo un proceso fixture validable ni evidencia visual de Dock. El requisito de Dock de esta HU permanece sin cumplir.

HU-0008 no habilita una alternativa: aunque ambos fixtures iniciaron en el diagnóstico A/B, la terminación anómala de la variante tras `TERM` obliga a clasificarlo como `inconclusive`. El Dock continúa pendiente por ausencia de una implementación validada; no se infiere compatibilidad con UI, login, Keychain/safeStorage, sesiones ni updater.

## Referencias primarias

- Apple: [NSWorkspace.setIcon](https://developer.apple.com/documentation/appkit/nsworkspace/seticon(_:forfile:options:)), [QA1940: resolving Finder information](https://developer.apple.com/library/archive/qa/qa1940/_index.html), [TN2206: macOS Code Signing In Depth](https://developer.apple.com/library/archive/technotes/tn2206/), [TN3127: Inside Code Signing Requirements](https://developer.apple.com/documentation/technotes/tn3127-inside-code-signing-requirements), [NSDockTile](https://developer.apple.com/documentation/appkit/nsdocktile) y [NSRunningApplication.icon](https://developer.apple.com/documentation/appkit/nsrunningapplication/icon).
- Electron: [Dock.setIcon](https://www.electronjs.org/docs/latest/api/dock/) y [variables de entorno](https://www.electronjs.org/docs/latest/api/environment-variables).

## Cierre de Graphify

Evidencia entregada por `architect`; `document` no ejecutó ni modificó Graphify:

- `npm run graph:update` produjo 824 nodos, 1.943 aristas y 52 comunidades.
- `graphify affected dashboard_from_scope` conecta `get_dashboard_state`, create/update/launch/stop/delete de instancias, set/clear de icono, copy/unlink de sesiones y synchronize/update de aplicaciones.
- La consulta final conecta `RefreshScope`, `ProcessInventory`, la HU y documentación relacionada, además del spike de Dock.
- `npm run graph:check` reextrajo sin cambios topológicos, pero devolvió código 1 porque `GRAPH_REPORT.md` y `graph.json` actualizados aún no están versionados. Root debe ejecutarlo de nuevo después del commit para completar este gate.

La HU sigue `In Progress`: el cierre de Graphify no sustituye la evidencia visual nativa pendiente para el icono de Dock.
