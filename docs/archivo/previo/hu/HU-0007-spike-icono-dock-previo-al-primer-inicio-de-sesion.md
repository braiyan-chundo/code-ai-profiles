# HU-0007 — Spike de icono de Dock previo al primer inicio de sesión

## Metadatos

- Estado: `Done`
- Creada: 2026-10-14
- Actualizada: 2026-10-14
- Solicitante: mantenedor del proyecto
- Orquestación: `architect`
- Documentación: `document`
- Implementación prevista: `backend`, como experimento aislado

## Historia de usuario

Como mantenedor, quiero validar en una copia temporal nueva y nunca iniciada si personalizar ICNS/`Info.plist` y re-firmar localmente produce un logo real en el Dock antes de un primer login, para decidir si es seguro diseñar el producto sin arriesgar instancias existentes.

## Problema

La ruta de metadata externa mediante `NSWorkspace.setIcon` no pudo conservar simultáneamente el icono de Dock y `codesign --verify --deep --strict`. La re-firma de una copia gestionada podría permitir un icono real, pero cambiar la identidad de firma puede afectar Keychain, safeStorage y autenticación; no puede probarse contra una instancia, perfil o sesión existentes.

## Contexto y evidencia de Graphify

Evidencia entregada por `architect`; `document` no ejecutó ni modificó Graphify:

- La consulta conecta `create_instance_sync`, `CustomIcon`, `copy_provider_application`, `provider_executable`, `macos_signature_snapshot` y el spike previo de icono.
- HU-0005 conserva el requisito de Dock bloqueado: los bytes de un perfil pueden permanecer intactos sin garantizar que los datos vinculados a Keychain/safeStorage puedan seguir descifrándose o ser accesibles.

## Alcance

1. El spike es exclusivo de macOS, opt-in y se ejecuta antes de iniciar sesión en la copia temporal.
2. Confirmar mediante snapshot read-only que la aplicación fuente original detectada permanece en su ubicación e intacta: firma más hash o metadata relevantes antes/después. Crear un root nuevo mediante `mktemp`, un clon temporal del bundle del proveedor denominado claramente `Code AI Dock Test` y un perfil vacío nuevo con sentinel.
3. Reutilizar `src-tauri/icons/icon.icns` o una PNG existente del repositorio para el icono distintivo, sin ImageGen ni dependencias nuevas. Modificar únicamente el bundle temporal: `CFBundleIconFile` y los recursos estrictamente necesarios. Mantener inicialmente el `CFBundleIdentifier` original para aislar variables. Si `CFBundleIconName` o `Assets.car` predomina, documentarlo y modificar solo el clon; cualquier cambio posterior de nombre o ID queda limitado al spike, con impacto documentado y sin traslado al producto.
4. Capturar antes y después del clon temporal: `codesign --verify --deep --strict`, CDHash, Team ID, designated requirement, entitlements y `Info.plist`. Comparar entitlements sin inventarlos; si la firma ad-hoc impide iniciar, reportar ese resultado.
5. Re-firmar únicamente el clon local con firma ad-hoc o controlada. Nunca re-firmar original, instancia gestionada, bundle de producto ni binario fuente fuera del root temporal.
6. Ejecutar un launch smoke con `--user-data-dir` dirigido al perfil vacío. Reportar únicamente PID, ejecutable y perfil fixture exactos; no autenticar ni iniciar sesión.
7. La confirmación visual del Dock la realiza solo root mediante CUA si responde. Si CUA no responde, no bloquear ni esperar: backend puede exportar una PNG de `NSRunningApplication.icon` del PID fixture como evidencia del icono asociado al proceso, distinguiéndola explícitamente de una confirmación visual del Dock.
8. Detener exclusivamente el PID fixture después de validar ejecutable y argumento exacto `--user-data-dir`; aplicar rollback y limpieza explícitos de root, bundle, perfil, procesos y artefactos temporales.

## Fuera de alcance

- Cambios de producto, comandos Tauri, UI, registry, Graphify, manifiestos de versión, DMG, push, publicación o protecciones de ramas.
- Escritura en la aplicación original, instancias reales, perfiles existentes, autenticación, llavero, login, sesiones o transcripts.
- `killall Dock`, limpieza de caché global, desactivar SIP, Gatekeeper o quarantine, y eludir verificaciones de seguridad.
- Lectura de stdout, stderr o logs del proveedor que puedan contener prompts, tokens o contenido sensible; solo se registran diagnósticos estructurados propios del spike.
- Inventar, añadir o reemplazar entitlements.

## Criterios de aceptación

1. La fuente original no cambia: se reportan hashes o metadata relevantes antes/después y su ubicación se conserva.
2. Root temporal, bundle y perfil fixture son nuevos; no se usan instancias, perfiles ni sesiones existentes.
3. El resultado informa honestamente icono real observado, icono de proceso exportado sin confirmación de Dock, o resultado no concluyente/fallido.
4. La firma posterior al spike se registra como cambio esperado; no se afirma equivalencia con la firma del proveedor.
5. Los entitlements antes/después se comparan y un fallo de inicio por firma ad-hoc se informa sin workaround inseguro.
6. El launch smoke abre Sign in o arranca sin autenticarse; no se intenta login.
7. El sentinel de perfil fixture queda intacto. Ese dato no se interpreta como garantía de login ni accesibilidad funcional de datos protegidos por Keychain/safeStorage.
8. Solo se detienen procesos fixture identificados por PID, ejecutable y `--user-data-dir`; no quedan procesos fixture al terminar.
9. Se realiza rollback y limpieza explícitos del root temporal y los artefactos del spike.
10. El fallo del spike es un resultado válido y no modifica producto ni datos reales.
11. Las verificaciones de codesign se ejecutan secuencialmente para evitar la condición `SIGSEGV` observada al ejecutar fixtures macOS concurrentemente.

## Diseño técnico y contratos

- `backend` será dueño exclusivo de un script aislado bajo `scripts/` o una prueba ignored explícita. No modifica rutas de producto.
- El spike emite un resultado estructurado que distingue `dockVisualConfirmed`, `processIconExported`, `launchStarted`, `signatureChanged`, `entitlementsCompared`, `cleanupCompleted` y diagnósticos seguros. Ningún campo incluye contenido de proveedor, perfil o logs.
- Si se exporta la PNG de `NSRunningApplication.icon`, su resultado significa solo que el proceso fixture tiene un icono asociado; no demuestra qué aparece en Dock.
- El spike conserva snapshots de metadata de firma y plist dentro del root temporal únicamente durante su ejecución o informe seguro. Los datos de perfil se reducen al sentinel fixture.

## Casos límite, privacidad y plataformas

- La fuente puede no permitir clonación, la re-firma puede invalidar el lanzamiento o el Dock puede cachear un icono previo. Cada caso se registra como resultado, no como motivo para tocar caches globales o el bundle original.
- CUA puede no responder; el spike sigue y devuelve evidencia de proceso o un resultado no concluyente sin bloqueos.
- Cambiar ID/nombre del bundle en el spike puede afectar agrupación de Dock, login, updater o Keychain. Nunca se adopta en producto sin una historia y decisión separadas.
- Una copia con firma ad-hoc puede compartir service names con el proveedor. El spike no usa login, llavero ni datos reales, por lo que no infiere persistencia de autenticación.
- No se leen prompts, respuestas, tokens, credenciales, cookies, transcripts, stdout, stderr ni logs del proveedor.

## Plan de delegación

1. `backend` implementa y ejecuta el script o prueba aislada, respetando el root temporal y las restricciones de privacidad. No toca producto, registry, UI, Graphify ni manifests.
2. `architect` revisa el resultado estructurado, verifica la integridad de la fuente, el alcance temporal y decide si se requiere una futura HU de producto.
3. Root realiza CUA solo si está disponible y valida visualmente el Dock; si no, el resultado se mantiene no concluyente o limitado a evidencia de icono del proceso.
4. `document` actualiza esta HU y el índice con evidencia verificable. No modifica Graphify.

## Plan previsto y resultado de pruebas

El plan previsto incluía snapshot de fuente y clon, verificación secuencial de firma y metadata, launch smoke con perfil fixture y sentinel, y evidencia visual mediante CUA —o, si hubiese PID fixture, una PNG del icono del proceso claramente no equivalente a confirmar el Dock—.

Se ejecutaron `bash -n`, el self-test de cuatro casos para el estado triestado de DR, `dry-run`, `git diff --check` y los dos intentos reales acotados que se detallan abajo. No se ejecutaron simulaciones específicas de fallo de clonación, modificación, firma, CUA o cleanup; por tanto, esta HU no afirma cobertura de esas rutas. Tampoco hubo exportación PNG porque no existió un PID fixture validable. No se realizaron nuevos lanzamientos después de los dos intentos descritos.

Evidencia de cierre entregada por `architect`:

- Se creó un único script experimental: `scripts/hu0007-macos-dock-icon-spike.sh`, con modos `dry-run`, `prepare`, `prepare-open` y `cleanup`. `bash -n`, self-test de cuatro casos del estado triestado de DR, `dry-run` y `git diff --check` fueron correctos. `shellcheck` no estaba disponible.
- Hubo dos intentos reales autorizados y ambos usaron exclusivamente `Code AI Dock Test.app`, un perfil fixture nuevo y sentinel. La fuente original permaneció read-only; no hubo login, acceso a Keychain, perfiles, sesiones, logs del proveedor ni datos reales.
- En el intento con ejecutable directo, clonación, icono, re-firma y `codesign --verify --deep --strict` posterior fueron correctos, pero el proceso terminó con señal 9 antes de existir un PID validable. No se atribuye una causa.
- En el segundo y último intento, `/usr/bin/open -n` con la ruta exacta del clon y el perfil exacto falló antes de crear un proceso validable. El diagnóstico externo se descartó deliberadamente por privacidad, por lo que la causa se mantiene desconocida. No se realizó un tercer intento.
- No hubo PID fixture vivo ni exportación de icono. CUA no produjo evidencia: el intento de root de seleccionar el Dock falló por timeout (`-10005`), por lo que no hubo confirmación visual.
- Tras el spike, el clon pasó verificación estricta (`strict=0`). Su CDHash cambió de `922ad85442372ac0dc58d14ccc04a7a78b420297` a `ae216a66df489299dcf53d48c18bd957f8603aa3`; Team ID cambió de `Q6L2SF6YDW` a `null`; el hash de entitlements se mantuvo en `072e78c344301d030b9a1cc5f322aac4ad97dd2fc43c22145c1118e080c68369`; el bundle ID se preservó y `CFBundleIconFile` fue `CodeAIDockTest.icns`.
- La fuente original pasó verificación estricta antes/después (`strict=0`) y conservó CDHash, Team ID, hashes de `Info.plist` y ejecutable, y hash de entitlements; `sourceUnchanged=true`. Root comprobó read-only que su DR original existe e incluye identificador de proveedor y `anchor apple generic`/Team. El parser inicial dejó DR como `null` en los snapshots y no hay medición válida del DR del clon tras re-firma: no se afirma comparación ni preservación de DR.
- La fuente tenía `CFBundleIconName=Claude` y `Assets.car=true`; su precedencia no pudo probarse porque el clon no inició.
- El trap de cleanup eliminó los roots, no quedaron procesos fixture y el sentinel estuvo intacto antes de eliminarse. El estado `600` se capturó antes de retirarlo como evidencia del resultado. Root ejecutó la limpieza explícita del estado `W1M7Qz` y obtuvo `{alreadyAbsent:true, cleanupCompleted:true, ok:true, phase:cleanup}`; no queda archivo de estado retenido.

El resultado negativo satisface CA10: el spike no habilita producto. La técnica de re-firma ad-hoc queda rechazada con esta configuración.

## Documentación afectada

- Esta HU y `docs/hu/index.md`: alcance, resultado y decisión posterior.
- Las guías públicas solo se actualizan si un producto posterior y aprobado deriva del spike; este experimento no cambia comportamiento publicado.

## Bitácora de implementación

- 2026-10-14: `architect` entregó el brief del spike autorizado con alcance temporal, riesgos, fuentes, criterios verificables y restricciones de privacidad.
- 2026-10-14: `document` confirmó que `HU-0007` es el siguiente ID único, creó esta HU inicialmente como `Draft` y la dejó en `Ready` porque el brief es verificable. Se añadió una sola entrada al índice. No se modificó producto ni Graphify.
- 2026-10-14: `architect` entregó evidencia de dos intentos autorizados, ambos negativos, y confirmó cleanup, fuente original intacta y ausencia de datos reales. Root verificó además `bash -n`, self-test de cuatro casos para DR triestado, `dry-run` y `git diff --check`, sin nuevos lanzamientos, y cerró la limpieza del estado temporal. `document` registró el resultado como `Done`: el fallo es un resultado válido por CA10 y no autoriza una implementación de producto.

## Resultado y riesgos residuales

El spike no obtuvo un proceso validable ni icono de Dock, y no demuestra login, safeStorage, updater ni persistencia de sesiones tras re-firma. El resultado descarta esta configuración ad-hoc para producto. La ausencia de diagnóstico externo deliberada protege la privacidad, por lo que la causa de los fallos de lanzamiento permanece desconocida.

## Referencias primarias

- Apple: [QA1940](https://developer.apple.com/library/archive/qa/qa1940/_index.html), [TN2206](https://developer.apple.com/library/archive/technotes/tn2206/), [TN3127](https://developer.apple.com/documentation/technotes/tn3127-inside-code-signing-requirements) y [CFBundleIconFile](https://developer.apple.com/documentation/bundleresources/information-property-list/cfbundleiconfile).
- Electron: [Dock.setIcon](https://www.electronjs.org/docs/latest/api/dock/), [safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage/) y [variables de entorno](https://www.electronjs.org/docs/latest/api/environment-variables).

## Cierre de Graphify

Evidencia entregada por `architect`; `document` no ejecutó ni modificó Graphify:

- `npm run graph:update` reconstruyó 908 nodos, 2.064 aristas y 58 comunidades.
- `graphify affected snapshot_bundle` conecta `prepare`, `cleanup` y el script de HU-0007.
- La consulta enfocada encontró `prepare`, `prepare_failure_cleanup`, `cleanup`, `self_test`, HU-0007 y sus conexiones con las rutas existentes de create/launch.
- `npm run graph:check` en modo PRECOMMIT devolvió código 1 únicamente porque `graph.json` y `GRAPH_REPORT.md` actualizados aún no están versionados; la reextracción indicó que no había cambios topológicos adicionales. No es un gate final verde: root lo repetirá después del commit local.
- El estado temporal fue eliminado mediante cleanup idempotente (`alreadyAbsent=true`, `cleanupCompleted=true`).
