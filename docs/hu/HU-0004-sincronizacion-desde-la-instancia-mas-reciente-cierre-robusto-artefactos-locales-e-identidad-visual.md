# HU-0004 — Sincronización desde la instancia más reciente, cierre robusto, artefactos locales e identidad visual

## Metadatos

- Estado: `Done`
- Creada: 2026-10-10
- Actualizada: 2026-10-10
- Solicitante: mantenedor del proyecto
- Orquestación: `architect`
- Documentación: `document`
- Implementación: `backend` y `frontend`; cierre confirmado por `architect`

## Historia de usuario

Como persona que administra varias instancias de una aplicación de IA de escritorio, quiero que Code AI Profiles detecte cuál instalación compatible está realmente más actualizada, cierre cada instancia con fiabilidad, conserve el máximo material local de artefactos al transferir sesiones y me permita reconocer visualmente cada instancia, para no depender de cerrar desde el Dock ni perder trabajo.

## Problema

Una copia gestionada puede autoactualizarse antes que la aplicación original, pero el flujo actual toma exclusivamente la original como fuente. El cierre persiste solo un PID y declara la instancia detenida inmediatamente después de señalizar; esto es insuficiente frente a helpers, updater, relaunch y reutilización de PID.

HU-0003 separó correctamente ownership cloud de artefactos y monitores, pero excluyó payloads y manifiestos locales. La personalización actual únicamente renombra el bundle `.app`; un icono real y portable en Dock o taskbar no puede asegurarse sin cooperación de la aplicación propietaria o sin alterar recursos firmados.

## Contexto y evidencia de Graphify

Evidencia suministrada por `architect`; `document` no ejecutó ni modificó Graphify:

- `source_version()` (`src-tauri/src/lib.rs:L1073`), `copy_provider_application()` (`L1366`), `personalize_application_path()` (`L1476`), `refresh_instance_versions()` (`L2578`) y `update_instance_application_sync()` (`L2752`) componen el flujo de versión y copia. `App.tsx:L437-L440` solo compara `system.sourceVersion` contra instancias.
- `process_is_alive()` (`src-tauri/src/lib.rs:L2506`) prueba únicamente la existencia del PID; `refresh_instance_statuses()` (`L2563`) depende de él. `launch_instance()` (`L2969`) guarda `child.id()` y descarta `Child`; solo Linux crea process group. `stop_instance()` (`L3015`) llama `stop_process()` (`L3034`), borra el PID y marca `Stopped` sin espera ni verificación. macOS señaliza únicamente al root, Linux señaliza al grupo y retorna, y Windows usa `taskkill /T` y retorna.
- `copy_code_session_sync()` (`L2210`), `session_index_for_target()` (`L2148`), `restored_origin_artifacts()` (`L2163`), `latest_artifact_monitor()` (`L1638`) y HU-0003 implementan la sanitización/restauración de referencias y el resumen de monitores. HU-0003 excluyó payloads/manifiestos locales y confirmó que ownership y monitores publicados no se reasignan.
- `personalize_application_path()` solo renombra el bundle macOS. La evidencia primaria de Apple indica que `CFBundleIconFile`, recursos sellados por firma y atributos xattr de Finder/resource fork requieren preservar la validación; `NSApplication.applicationIconImage` y Electron `app.dock.setIcon` deben ejecutarse dentro del proceso propietario. Microsoft requiere AppUserModelID/propiedades de ventana para icono y agrupación de taskbar. freedesktop asocia `Icon` y `StartupWMClass`, con límites del compositor o Wayland.
- `graphify affected personalize_application_path()` mostró impacto directo en create/update/refresh de instancias; `graphify explain stop_process()` lo conecta únicamente con `stop_instance`.

## Alcance

### Topología y sincronización de versiones

- Construir un catálogo de candidatos instalados: original e instancias gestionadas, con `kind`, `id`, `name`, `path`, `version`, `status` y resultado de validación. Elegir estrictamente la mayor versión instalada válida con el comparador existente, sin usar el feed remoto como fuente de bytes.
- Una instancia gestionada solo es elegible si está detenida, su ruta está dentro de su root administrado, pasa `validate_source` y su identidad de proveedor/firma coincide con la original o la identidad confiable registrada al crearla. En macOS se validan bundle ID, `codesign --verify --deep --strict` y `TeamIdentifier` cuando exista; en Windows, firma Authenticode/editor o verificación nativa equivalente, sin PowerShell inseguro ni ejecutar contenido. Linux comparte normalmente paquete o symlink y no copia bytes divergentes.
- Exponer en `SystemInfo` el contrato camelCase `VersionTopology`: `latestInstalledVersion`, `latestSource { kind: original|managed, instanceId, name } | null`, `staleInstanceIds`, `originalBehind`, `canSynchronizeManaged` y una razón segura cuando no haya candidato.
- Añadir `synchronize_managed_applications`, un batch que recibe fuente explícita derivada de la topología y IDs objetivo. El preflight rechaza fuente/objetivos ejecutándose, faltantes, incompatibles o downgrade. Por objetivo reutiliza staging/swap/rollback y vuelve a aplicar nombre/branding externo, sin copiar perfiles. Devuelve `updated|skipped|failed`, `fromVersion`, `toVersion` y `message`, para comunicar fallos parciales honestamente.
- No escribir ni sustituir nunca la aplicación original. Si `originalBehind`, mostrar aviso separado y preservar `update_original_application` como handoff oficial manual. No descargar, elevar, cerrar silenciosamente ni telemetría.
- Diferenciar en la interfaz «Sincronizar instancias desde <nombre> vX» de «Abrir actualización oficial para la original». Si la fuente más reciente es una instancia, no llamarla «original».

### Lifecycle robusto

- Reemplazar el PID desnudo como autoridad por `ManagedProcessIdentity`, compatible con migración: `rootPid`, `processGroupId` opcional, `startTime` opcional y fingerprint derivado de ruta del ejecutable gestionado y argumento exacto `--user-data-dir=<profile>`. No persistir cmdline completa ni datos sensibles.
- Al lanzar, crear grupo propio en macOS y Linux; en Windows usar árbol/job cuando sea viable, con fallback de árbol verificado. Mantener un reaper/watcher que espere a `Child`, evite zombies y actualice solamente la misma launch generation. Redescubrir un relaunch/updater mediante executable root y profile arg.
- El descubrimiento local puede usar una dependencia multiplataforma sin red ni telemetría. Antes de señalizar, validar PID, start time si existe, ejecutable bajo `app_path` y profile arg; nunca matar por nombre, bundle ID o PID persistido exclusivamente.
- `stop_instance` pasa a async/`spawn_blocking`: petición graceful a procesos verificados, espera acotada aproximada de 5 s y, si sobreviven, escalación force únicamente al árbol/grupo verificado y nueva espera aproximada de 2 s. Solo marca `Stopped` cuando no queda ningún proceso de esa identidad. Si falla, mantiene `Running` y devuelve un error accionable. La interfaz conserva «Deteniendo…» y bloquea acciones incompatibles.
- En macOS/Linux usar PGID + TERM, espera y KILL si procede, con verificación adicional de sobrevivientes. En Windows usar cierre de ventanas/árbol o `taskkill` no forzado, espera, y `/F /T` únicamente sobre raíces verificadas. Tras reinicio de app/backend, migrar/redescubrir sin confiar ciegamente en PID.

### Artefactos locales con soporte seguro

- Mantener la regla de HU-0003: refs publicadas, URLs/UUID cloud, ownership, tareas y `artifact-comment-monitor` no se reasignan, reanudan ni inventan. La UI debe explicarlo.
- Añadir al preflight y resultado de transferencia `ArtifactTransferOutcome`: candidatos locales detectados; material copiado/registrado; material preservado para importación manual; referencias remotas omitidas; monitores omitidos; y warnings. No incluir títulos, URLs, IDs remotos, prompts, respuestas ni contenido.
- En el modal, ofrecer y marcar por defecto «Incluir copias locales de artefactos si están disponibles». Leer exclusivamente campos de schema necesarios para resolver una referencia local. Copiar payloads como bytes opacos: nunca inspeccionarlos, indexarlos, registrarlos ni enviarlos.
- Canonicalizar y allowlistear roots conocidos. Rechazar symlinks/escapes, archivos especiales y rutas fuera de los roots; aplicar límites configurados de tamaño/conteo; usar staging, backup y escritura atómica.
- Si existe adaptador de schema local confirmado, copiar al namespace destino con IDs locales nuevos, eliminar campos cloud/monitor/autopublish y actualizar manifest destino bajo lock/backup. Si el schema no se puede validar, no escribir manifest privado: preservar la copia en un directorio administrado de exportación y ofrecer «Abrir copias locales / publicar de nuevo».
- En copy el origen queda intacto. En move solo detach/eliminar material local de origen tras confirmar el destino y disponer rollback. Con solo export o recurso cloud, conservar origen y comunicarlo. Devolución/unlink restaura mediante lineage/backups sin duplicar ni destruir refs propias del perfil.
- Cambiar el retorno de copia/move a `SessionTransferResult { dashboard, artifacts }` y adaptar mocks, UI y toasts.

### Identidad visual e icono

- Permitir seleccionar imagen local explícitamente mediante input nativo del WebView, sin permiso global de filesystem. Validar magic/decodificación y límites —por ejemplo 5 MiB y dimensiones razonables—; normalizar a PNG cuadrado administrado fuera del bundle; persistir `customIcon` y revisión en la instancia. Mostrarlo en cards/modales y usar fallback actual si no existe. Al borrar o reemplazar, limpiar únicamente el asset administrado.
- Nunca editar `app.asar`, ejecutables, PE, `Info.plist`, `.icns`, recursos internos ni xattrs del bundle en la ruta normal; el asset externo sobrevive sincronizaciones. No hacer ad-hoc resign en producto por defecto.
- En Windows, el máximo seguro es `.ico`/launcher y, si pruebas nativas lo validan, aplicar AppUserModelID + RelaunchIconResource a ventanas exactas descubiertas tras launch; sin reescribir PE. Es best-effort y no puede afectar el cierre si falla.
- En Linux, crear `.desktop` por instancia con `Name`, `Icon`, `Exec` y `StartupWMClass`/clase única si el runtime lo respeta. X11 puede diferenciarlas; Wayland/compositor puede ignorarlo. No tocar la instalación del sistema.
- Antes de afirmar icono custom en Dock macOS, hacer spike sobre staging no productivo para evaluar icono externo/ad-hoc y comprobar `codesign --verify --deep --strict`, launch smoke y updater. Si no se preservan firma, launch y updater, conservar el icono oficial en Dock y mostrar el personalizado únicamente en Code AI Profiles. Documentar la limitación en UI/docs, sin promesa falsa. No tocar la original.

## Fuera de alcance

- Sobrescribir o instalar automáticamente la aplicación original, descargar releases, elevar privilegios o desactivar updater.
- Reasignar ownership cloud, autenticar como otra cuenta, reanudar/editar monitores, copiar credenciales/cookies/tokens o modificar transcripts de contenido.
- Matar procesos por nombre/bundle ID, cerrar la original u otra instancia, o garantizar que todos los compositores muestren icono distinto.
- Romper/reemplazar firma del proveedor, distribuir binarios modificados o afirmar soporte Dock macOS si el spike falla.

## Criterios de aceptación

1. El catálogo/topología elige la mayor versión instalada válida entre original y managed.
2. Invalida un candidato ejecutándose, con firma/identidad inválida o ruta no válida.
3. El batch solo sincroniza objetivos detenidos y nunca hace downgrade.
4. Hay staging/rollback por objetivo y resultado parcial.
5. No se copian perfiles.
6. La original nunca se escribe y el CTA oficial permanece.
7. El wording de UI separa ambas acciones.
8. Linux no copia un paquete compartido.
9. El proceso usa fingerprint + generation y migra PID legacy.
10. Unix crea PGID.
11. El watcher reapea `Child`.
12. Stop hace graceful/wait/force/wait y no informa éxito falso.
13. Existe defensa contra PID reuse y no se mata por nombre.
14. Un relaunch se redescubre.
15. Hay pruebas lifecycle por plataforma/fakes.
16. El outcome de artefactos no contiene material sensible.
17. La copia opaca aplica allowlist, rechazo de symlinks y límites.
18. Solo con schema validado hay registro con IDs nuevos y strip de cloud.
19. Con schema desconocido hay fallback de exportación.
20. Copy preserva origen y move solo elimina tras commit.
21. Cloud/monitores nunca se reasignan y la UI explica republicación.
22. Hay roundtrip/rollback.
23. El icono externo se valida, persiste y es visible en UI.
24. Una actualización de aplicación no pierde el icono.
25. Windows/Linux aplican best-effort sin modificar binario.
26. El spike macOS queda documentado y el bundle queda intacto si falla.
27. Se conservan accesibilidad, tema y mocks.
28. Pasan `cargo fmt --check`, `cargo test`, `npm run build` y `git diff --check`.
29. Hay pruebas unitarias de plataformas no host.
30. README/documentación se actualizan cuando exista el comportamiento y `architect` cierra Graphify.

## Diseño técnico y contratos

- `VersionTopology` usa el contrato camelCase definido en Alcance y se entrega dentro de `SystemInfo`; la fuente de `synchronize_managed_applications` debe provenir explícitamente de esa topología validada.
- `ManagedProcessIdentity` limita los datos persistidos a PID raíz, PGID opcional, start time opcional, fingerprint de ejecutable gestionado y argumento exacto de perfil; launch generation impide que un watcher obsoleto altere un lanzamiento posterior.
- `ArtifactTransferOutcome` contiene exclusivamente conteos/estados/warnings seguros de transferencia local. `SessionTransferResult { dashboard, artifacts }` permite mostrar el resultado de dashboard y artefactos sin incorporar contenido de payload o metadata cloud al contrato público.
- El adaptador de schema de artefactos debe estar versionado y confirmado antes de registrar en el destino. La ruta segura cuando no se valida es exportación administrada, no una reconstrucción heurística de manifest.
- La selección de icono se limita al input explícito y a asset normalizado administrado fuera del bundle; el icono de sistema por plataforma es opcional/best-effort y no altera recursos firmados ni binarios del proveedor.

## Casos límite, privacidad y plataformas

- La inspección local de procesos se restringe a cmdline/ruta/start-time necesarios para identidad. No persiste cmdline completa ni contenido sensible. Un PID reutilizado o inconsistente no es señalizable.
- Los payloads de artefactos pueden contener datos sensibles. Su transferencia es local, explícita y por copia de bytes opacos; no se inspeccionan, registran ni envían por red. URLs, UUID cloud, ownership, tareas y monitores quedan excluidos.
- Un updater Squirrel/ShipIt puede compartir identidad de bundle. Por ello una fuente debe estar detenida y validada antes de ser elegible; Linux conserva el paquete/symlink compartido.
- La API/schema local de artefactos puede cambiar. El adaptador versionado reduce el riesgo y la exportación preserva material sin inventar registro cuando falta validación.
- En macOS, modificar recurso/xattr puede romper el seal, y el icono de Dock runtime exige cooperación del proceso. El spike no autoriza modificar producto ni la original: si falla firma, lanzamiento o updater, el Dock conserva icono oficial.
- En Windows, AppUserModelID/RelaunchIconResource se aplican solo a ventanas verificadas y solo si las pruebas nativas lo respaldan. En Linux, Wayland o el compositor pueden ignorar `StartupWMClass`/`Icon` incluso con desktop entry correcto.
- No se introducen red, telemetría, permisos invasivos, elevación, downloads ni cierres silenciosos.

## Referencias primarias

- Apple: [CFBundleIconFile](https://developer.apple.com/library/archive/documentation/General/Reference/InfoPlistKeyReference/Articles/CoreFoundationKeys.html), [TN3126: hashes de code signing](https://developer.apple.com/documentation/technotes/tn3126-inside-code-signing-hashes), [QA1940: resource fork y atributos Finder](https://developer.apple.com/library/archive/qa/qa1940/_index.html) y [NSApplication.applicationIconImage](https://developer.apple.com/documentation/appkit/nsapplication/applicationiconimage).
- Microsoft: [Application User Model IDs](https://learn.microsoft.com/windows/win32/shell/appids) y [AppUserModel RelaunchIconResource](https://learn.microsoft.com/windows/win32/properties/props-system-appusermodel-relaunchiconresource).
- freedesktop.org: [Desktop Entry Specification: Icon y StartupWMClass](https://specifications.freedesktop.org/desktop-entry-spec/latest/recognized-keys.html).
- Anthropic: [What are Artifacts and how do I use them?](https://support.claude.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them), [instalar Claude Desktop](https://support.claude.com/en/articles/10065433-install-claude-desktop) y [desplegar Claude Desktop para macOS](https://support.claude.com/en/articles/12611117-deploy-claude-desktop-for-macos).

## Plan de delegación

1. `backend` será dueño de `src-tauri/src/lib.rs`, Cargo manifests/lock, pruebas Rust y del contrato compartido inicial en `src/types.ts`/`src/lib/bridge.ts`; no modifica `App.tsx` ni estilos. Implementa topología/sincronización, lifecycle, transferencia de artefactos, icono administrado y contratos de plataforma.
2. Tras el contrato backend, `frontend` será dueño de `src/App.tsx`, `src/styles.css` y assets UI; no modifica Rust ni contratos. Presenta topología, acciones inequívocas, resultado de artefactos, estados lifecycle e icono preservando diseño, accesibilidad, tema y mocks.
3. `architect` revisa la integración frente a todos los criterios, coordina los contratos y es responsable del cierre de Graphify. `document` solo actualizará esta HU, el índice y documentación estable cuando reciba evidencia verificable.

## Plan y resultado de pruebas

Evidencia entregada al cierre documental:

- `npm run build`: correcto.
- `cargo fmt --check`: correcto.
- `cargo test --manifest-path src-tauri/Cargo.toml`: correcto, 33 de 33 pruebas.
- `git diff --check`: correcto.
- QA visual del mock: correcta para banners de topología, diálogo de transferencia con la opción de copias locales, estado «Deteniendo…» e icono de instancia en la tarjeta/editor.

Las pruebas Rust añadidas cubren la migración de PID legacy, el fingerprint de aplicación y argumento exacto de perfil, el conteo seguro de referencias remotas, el rechazo de symlinks/escapes en la exportación opaca, la normalización de iconos y la garantía de no modificar la ruta de la aplicación. Las pruebas de transferencias, versiones, swap/rollback, modelos y uso existentes permanecen verdes.

La revisión nativa de cierres reales, launcher Linux, taskbar Windows y Dock/actualizador de macOS no se ejecutó en esta evidencia. Por ello sus comportamientos de plataforma siguen siendo best-effort y no se declaran garantizados.

## Documentación afectada

- `docs/actualizaciones.document.md`: topología de versiones, sincronización desde una instancia gestionada válida, conservación de la original y comportamiento Linux.
- `docs/sesiones.document.md`: transferencias locales de artefactos, exportación cuando el schema no se valida, expectativas de republicación y límites de privacidad.
- `docs/instancias.document.md`: cierre identificado de instancias e identidad visual por plataforma.
- `README.md`: comportamiento público de sincronización, cierre, artefactos e iconos.

## Bitácora de implementación

- 2026-10-10: `architect` entregó un brief con evidencia Graphify, decisiones de alcance y contratos, riesgos, plataformas, referencias primarias y 30 criterios verificables.
- 2026-10-10: `document` confirmó que el siguiente ID único era `HU-0004`, creó primero esta HU como `Draft`, comprobó que el brief era verificable y la dejó en `Ready`. Se añadió una sola entrada al índice. No hay código, pruebas, Graphify, documentación estable ni desviaciones registrados.
- 2026-10-10: `backend` implementó el contrato de topología de versiones, sincronización por lote, identidad de proceso, cierre verificado, resultado seguro de artefactos e icono externo administrado. `frontend` integró las acciones, advertencias, resultados y editor de icono sin cambiar el bundle del proveedor.
- 2026-10-10: se documentó que el adaptador de schema de artefactos no se considera validado en esta entrega: las copias locales detectadas se preservan en la exportación administrada y no se registran en el destino. En un movimiento, el payload de origen se conserva; refs cloud y monitores permanecen omitidos.
- 2026-10-10: se actualizaron las guías funcionales y el README con los límites explícitos: original no sobrescribible, icono firmado oficial en Dock macOS y soporte de sistema no garantizado por compositor/plataforma.
- 2026-10-10: `architect` confirmó el cierre de integración y los gates finales: `npm run build`, `cargo fmt --check`, `cargo test --manifest-path src-tauri/Cargo.toml` (33/33), `git diff --check` y QA visual correctos.

## Resultado y riesgos residuales

La implementación está lista para revisión del arquitecto. Riesgos residuales: la identidad de updater puede seguir compartida entre bundles copiados; el schema local de artefactos puede evolucionar y, sin un adaptador validado, la aplicación exporta los bytes locales sin registrarlos en el destino; y no es posible garantizar un icono personalizado en el Dock macOS sin afectar firma o actualizador. Los cierres reales y los launchers/iconos de plataforma requieren validación nativa adicional.

## Cierre de Graphify

`architect` confirmó el cierre el 2026-10-10: `npm run graph:update` reconstruyó 701 nodos, 1 505 aristas y 48 comunidades. Se revisó el impacto de `stop_instance_sync`, `synchronize_managed_applications_sync`, `copy_code_session_sync` y `set_instance_icon`; la consulta de HU-0004 confirmó integración con `build_version_topology`, `ArtifactTransferOutcome`, `CustomIcon` y el lifecycle. `document` no ejecutó ni modificó Graphify ni `graphify-out/`.
