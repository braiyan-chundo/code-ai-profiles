# HU-0008 — Diagnóstico A/B del arranque macOS para branding previo al login

## Metadatos

- Estado: `Done`
- Creada: 2026-10-16
- Actualizada: 2026-10-17
- Solicitante: mantenedor del proyecto
- Orquestación: `architect`
- Documentación: `document`
- Implementación prevista: `backend`, como diagnóstico aislado

## Historia de usuario

Como mantenedor, quiero comparar dos copias temporales nacidas de la misma fuente —un control sin modificar y una variante con icono y re-firma—, ambas con perfiles vacíos nuevos, para localizar si el fallo de HU-0007 se correlaciona con branding/firma o con el mecanismo o contexto de lanzamiento, sin tocar datos reales.

## Problema

HU-0007 terminó con resultado negativo: su clon re-firmado no produjo un PID fixture validable ni confirmación visual del Dock. La ejecución directa terminó con señal 9 antes de un PID validable y la ruta con `open -n` falló antes de crear un proceso validable; no se atribuyó una causa. Como solo se evaluó la variante modificada, no permite separar una posible correlación con branding/firma de una correlación con lanzamiento o entorno.

## Contexto y evidencia de Graphify

Evidencia entregada por `architect`; `document` no ejecutó ni modificó Graphify:

- La consulta enfocada conecta HU-0007 y `scripts/hu0007-macos-dock-icon-spike.sh` con `snapshot_bundle`, `prepare`, `cleanup`, `validate_pid`, firma macOS y HU-0005.
- Se crea un script dedicado para HU-0008 con el fin de preservar íntegra la evidencia cerrada de HU-0007.
- Preflight del 2026-10-16: `/Applications/Claude.app` versión `2.37337.1`, arm64, dio un falso negativo de `codesign` dentro del sandbox. La misma fuente, verificada fuera de sandbox con `codesign --verify --deep --strict --verbose=2`, devolvió `0`, `valid on disk` y `satisfies its Designated Requirement`; CDHash `922ad85442372ac0dc58d14ccc04a7a78b420297` y Team ID `Q6L2SF6YDW`.
- Un intento read-only de extraer entitlements dentro del sandbox no devolvió un plist. No se interpreta como ausencia de entitlements.
- Esta diferencia es de entorno. No es causa atribuida al fallo histórico de HU-0007, cuyos lanzamientos se hicieron fuera del sandbox.

## Alcance

1. Diagnóstico opt-in exclusivo de macOS, aislado del producto y ejecutado únicamente en el mismo contexto autorizado fuera de sandbox para todas las operaciones nativas reales.
2. Comprobar el preflight externo de la fuente original antes de copiar o lanzar. Si falla en el momento de ejecución, abortar sin crear clones ni iniciar procesos.
3. Mantener la fuente original en solo lectura; crear mediante `mktemp` un root temporal validado y dos clones independientes y frescos, A y B, desde esa misma fuente, con dos perfiles vacíos y sentinels independientes.
4. A es el control: conserva bytes, firma, `Info.plist` y recursos de la fuente. B es la variante: modifica únicamente ICNS y los campos de plist estrictamente necesarios, y se re-firma ad-hoc preservando permisos y entitlements existentes sin inventarlos ni presentar el DR del proveedor como válido tras la re-firma.
5. Mantener inicialmente el mismo bundle identifier en A y B. Aplicar a ambos la misma técnica de lanzamiento, ruta exacta del bundle, argumentos, ventana de observación, timeout y condiciones de cierre.
6. Ejecutar en secuencia estricta A → validación y cleanup sin procesos fixture → B → validación y cleanup. Nunca ejecutar A y B simultáneamente.
7. Usar un launcher nativo común que devuelva como máximo dominio/código de error, PID fixture exacto si existe y estado, lifetime o terminación acotados. Redirigir stdout/stderr del proveedor a `/dev/null`; un helper propio solo puede emitir JSON con campos allowlisted.
8. Capturar snapshots antes/después de fuente, control y variante: estado de `codesign --verify --deep --strict`, CDHash, Team ID, presencia/hash o valor técnico de DR, hashes de entitlements, `Info.plist` y ejecutable, bundle ID y campos de icono. La firma y los entitlements de fuente, A y B se extraen y comparan todos en el mismo contexto nativo autorizado fuera de sandbox.
9. Si existe un crash report nuevo que coincida inequívocamente con ruta exacta del fixture, PID y ventana temporal, extraer exclusivamente `exception.type` o señal y `termination.namespace`, código o indicador. No conservar el informe raw ni campos no permitidos. Si no coincide, descartarlo y registrar `ambiguousEvidenceDiscarded=true` sin contenido.
10. Producir comparación estructurada con `sourceBaselineTrusted`, `control.signature`, `control.launch`, `branded.signature`, `branded.launch`, `sourceUnchanged`, `profilesSentinelsIntact`, `cleanupCompleted`, `remainingFixtureProcesses`, `evidenceDiscarded` y uno de `branding-correlated`, `environment-or-launch-correlated`, `both-start` o `inconclusive`.

## Fuera de alcance

- Cambios de producto, Tauri, UI, registry, manifests, versión, instalador, push, publicación, Graphify o documentación pública estable.
- Escritura en fuente original, instancias reales, perfiles existentes, autenticación, login, sesiones, transcripts, llavero o safeStorage.
- Lectura o modificación directa de Keychain/safeStorage, perfiles reales o servicios de credenciales. La herramienta no inicia sesión ni aprueba, elude o interactúa con prompts de seguridad o llavero.
- Confirmación visual del Dock, persistencia de login, updater o funcionamiento de sesiones: el diagnóstico no los prueba.
- Ejecutar A y B en paralelo, iniciar más de una ejecución A/B autorizada, lanzar antes de las aprobaciones o atribuir causalidad sin un delta A/B.
- `killall`, caches globales, SIP, Gatekeeper, quarantine, firmas originales, entitlements inventados y lectura de stdout, stderr, logs de proveedor, unified/global logs, argumentos o entorno.

## Criterios de aceptación

1. La HU se implementa en un script dedicado de HU-0008, sin modificar el script ni la evidencia de HU-0007.
2. El preflight externo usa `codesign --verify --deep --strict --verbose=2` sobre la fuente detectada. Si falla, el diagnóstico aborta antes de copiar o lanzar.
3. Fuente, clones, root temporal y perfiles fixture se distinguen por rutas y ownership; la fuente se snapshottea antes/después y resulta sin cambios.
4. Se crean A y B desde la misma fuente y perfiles vacíos con sentinels distintos. A conserva sus bytes, firma, `Info.plist` y recursos; B registra de forma explícita la modificación mínima y la re-firma ad-hoc.
5. A y B usan el mismo launcher, mecanismo, argumentos, ventana y timeout; se ejecutan estrictamente A, cleanup sin procesos fixture, B, cleanup, nunca simultáneamente.
6. El launcher solo devuelve los diagnósticos estructurados allowlisted. stdout/stderr del proveedor se redirigen a `/dev/null` y no se leen logs ni datos privados.
7. La firma, DR, entitlements, hashes de `Info.plist` y ejecutable, bundle ID y campos de icono se capturan secuencialmente y en el mismo contexto nativo autorizado para fuente, A y B. Un DR ausente o no comparable se representa como tal, sin afirmar preservación del DR del proveedor tras re-firma. Una extracción de entitlements no válida se registra como `unknown` o produce una comparación `inconclusive`; nunca equivale a entitlements ausentes.
8. Solo se procesa un crash report nuevo si ruta fixture, PID y ventana temporal coinciden inequívocamente; la evidencia ambigua se descarta sin contenido y marca `ambiguousEvidenceDiscarded=true`.
9. El resultado incluye todos los campos estructurados acordados y una clasificación limitada a `branding-correlated`, `environment-or-launch-correlated`, `both-start` o `inconclusive`. No se afirma que `SIGKILL` o una terminación sea causada por firma sin delta A/B que lo respalde.
10. Cada perfil fixture mantiene intacto su sentinel; ello no se interpreta como prueba de login, Keychain/safeStorage, sesiones, updater ni accesibilidad funcional de datos protegidos.
11. El estado se guarda `0600` dentro de `TMPDIR` tras validar ubicación, ownership y contención. El trap cubre todo fallo; solo se envía `TERM` a un PID cuya ruta ejecutable esté bajo el clon exacto y cuyo perfil coincida exactamente. No quedan procesos fixture ni estado temporal tras cleanup; si queda un proceso exacto, no se borra el root y se reporta.
12. `bash -n`, self-test sintético de clasificación, allowlist y atribución, `dry-run`, `git diff --check` y revisión de `architect` y root pasan antes de cualquier lanzamiento. No se lanza hasta la aprobación explícita de root.
13. Después de la aprobación, se realiza una sola ejecución A/B fuera de sandbox. Un aborto o fallo limpio es un resultado válido y no modifica producto ni datos reales.
14. La herramienta no lee ni modifica Keychain/safeStorage ni perfiles reales y no habrá login. No puede garantizar que el código del proveedor no consulte servicios del SO al arrancar: un perfil vacío no demuestra aislamiento de todos ellos. Si aparece un prompt de seguridad o llavero, no se aprueba ni se elude, se detiene el fixture de forma segura y solo se registra `securityInteractionObserved=true`, sin contenido.

## Diseño técnico y contratos

- `backend` será dueño exclusivo de `scripts/hu0008-macos-launch-ab-diagnostic.sh` o un nombre dedicado equivalente, y de helpers temporales generados por el propio script. No cambia producto, manifests, versión, docs ni Graphify.
- El launcher nativo común recibe la ruta exacta del bundle y el perfil fixture exacto. Su salida JSON allowlisted contiene únicamente estado, dominio/código de error si existe, PID fixture si existe, lifetime y terminación acotada; nunca argumentos, entorno, salida del proveedor ni datos de perfiles.
- `sourceBaselineTrusted` se deriva del preflight externo. El preflight de sandbox no habilita ni invalida el diagnóstico por sí solo. La extracción de entitlements realizada en sandbox tampoco determina presencia o ausencia: se vuelve a extraer, para fuente, A y B, en el contexto nativo externo común; un resultado no válido se modela como `unknown`.
- Una comparación `branding-correlated` requiere un delta A/B observado con launcher y condiciones equivalentes; `environment-or-launch-correlated`, `both-start` e `inconclusive` se usan cuando la evidencia no permite esa inferencia. Tras la revisión de HU-0008, `both-start` exige que ambos fixtures sobrevivan la ventana y terminen normalmente con `exit 0` o señal `SIGTERM`/`15`; una anomalía posobservación como señal `9` clasifica el resultado como `inconclusive`. Ninguna clasificación certifica el Dock, autenticación o compatibilidad de producción.
- B puede cambiar su firma al aplicar firma ad-hoc. Ese hecho se registra como diferencia experimental, no como una firma equivalente a la del proveedor ni como prueba de compatibilidad con Keychain/safeStorage.

## Casos límite, privacidad y plataformas

- La única ruta de ejecución es macOS. Windows y Linux no cambian; el script debe abortar con un resultado claro fuera de macOS.
- El falso negativo de `codesign` y la extracción de entitlements sin plist dentro de sandbox se registran como diferencias de entorno. Todos los comandos nativos reales, incluidos snapshots de firma y entitlements de fuente, A y B, deben usar el contexto autorizado fuera de sandbox, igual que los ensayos históricos de HU-0007. Un resultado no válido se conserva como `unknown`, no como vacío o ausente.
- Si no hay PID validable, no se envía señal, no se exporta información de proceso y el resultado conserva la ausencia como dato.
- Un perfil fixture vacío evita usar datos de perfil existentes, pero no acredita que el proveedor no consulte servicios del SO durante el arranque. La herramienta no lee ni modifica Keychain/safeStorage, no realiza login y no puede autorizar prompts en nombre del usuario. Ante un prompt de seguridad o llavero, se detiene el fixture validado y se registra únicamente `securityInteractionObserved=true`.
- Si el crash report no es inequívoco, se descarta sin lectura ni persistencia de backtrace, threads, binary images, texto específico de la aplicación, argumentos o entorno.
- No se conservan prompts, respuestas, tokens, credenciales, cookies, transcripts, logs, stdout ni stderr del proveedor. El estado temporal solo contiene el JSON allowlisted y se protege con modo `0600`.
- No se desactiva ninguna seguridad de macOS ni se modifica la fuente o un perfil existente. La conservación de un sentinel fixture no prueba la preservación de datos protegidos por firma.

## Plan de delegación

1. `backend` prepara el script dedicado, `prepare`, `dry-run`, self-test, validación de allowlist/atribución y cleanup, sin lanzamiento real ni cambios de producto.
2. `architect` revisa el diseño ejecutable, los gates previos y la equivalencia de condiciones A/B. Solo después solicita a root la autorización explícita para una única ejecución nativa fuera de sandbox.
3. Root ejecuta, si autoriza, la única corrida A/B desde el contexto autorizado y entrega únicamente el resultado estructurado permitido. No ejecuta launches adicionales sin una nueva decisión.
4. `architect` interpreta la clasificación dentro de sus límites, cierra Graphify y entrega evidencia a `document`.
5. `document` actualiza esta HU, el índice y documentación estable únicamente con evidencia recibida. No modifica Graphify.

## Plan y resultado de pruebas

Plan previo obligatorio, sin launches:

- `bash -n` del script dedicado.
- Self-test sintético que cubra las cuatro clasificaciones, el rechazo de campos fuera de allowlist y el descarte de crash evidence ambigua.
- `dry-run`, validación de state `0600`, contención/ownership y rutas A/B/perfiles/sentinels.
- `git diff --check` y revisión de `architect` y root.

Plan posterior a aprobación de root:

- Un único A/B secuencial fuera de sandbox, con snapshots de fuente antes/después, códigos de firma y resultado estructurado por variante.
- Validación exacta de PID y perfil antes de cualquier `TERM`; cleanup, sentinels, procesos restantes y estado temporal.

Resultado verificado:

- Hubo una única corrida A/B autorizada fuera de sandbox el 2026-10-17; no se realizaron launches adicionales. Los gates previos pasaron (`passed=true`, `resignStatus=0`), `sourceBaselineTrusted=true`, `sourceUnchanged=true`, la verificación strict/deep fue válida, el control A tuvo `matchesSource=true`, los perfiles y sentinels quedaron intactos y `remainingFixtureProcesses=0`.
- A inició, se mantuvo estable durante la ventana de observación (`observedLifetimeMs=5005`) y, tras `TERM` solicitado, terminó con `exit 0`; su cleanup tomó `321ms`.
- B inició, se mantuvo estable durante la ventana (`observedLifetimeMs=5041`) y, tras `TERM` solicitado, terminó con señal no capturada, estado `9`; su cleanup tomó `54ms`. No se atribuye esta anomalía a firma, AMFI ni otra causa.
- En B, strict/deep devolvió `0`; el CDHash cambió de `922ad85442372ac0dc58d14ccc04a7a78b420297` a `ae216a66df489299dcf53d48c18bd957f8603aa3`, el Team ID de `Q6L2SF6YDW` a `null`, el DR posterior quedó `unknown`, el hash de entitlements se preservó como `072e78c344301d030b9a1cc5f322aac4ad97dd2fc43c22145c1118e080c68369`, y bundle/version se conservaron con `CFBundleIconFile=CodeAIDockTest.icns`. Estos datos no equivalen a identidad del proveedor ni a compatibilidad de producción.
- El collector inicial y tardío para PID `18334`, ruta exacta y ventana temporal devolvió `matched=false`, `ambiguous=false`, con exception y termination nulas. No se leyeron ni conservaron logs globales ni informes raw.
- El estado raw inicial clasificó `both-start` por supervivencia de cinco segundos. La revisión de `architect` no aceptó eso como éxito: B tuvo la anomalía posterior de señal `9` y no hubo muestra de UI, Dock ni login. El script se corrigió sin repetir la corrida: `both-start` requiere cierre normal `exit 0` o `SIGTERM`/`15`; estable más señal `9` es `inconclusive`. Pasó `realClassifierPostObservationAnomaly=true` y el clasificador cubrió cinco casos.
- Un helper de control separado con `/usr/bin/false`, sin proveedor ni perfiles, observó `52ms`, `stable=false`, `exit 1`; descarta un falso positivo genérico de `isRunning`, pero no prueba UI ni liveness funcional de B.
- El cleanup exacto pasó (`cleanupCompleted=true`, cero procesos restantes); root y state fueron eliminados. `securityInteractionObserved` quedó `unknown`: no se afirma que el proveedor no consultó servicios del SO.
- Tras la corrección, root y `architect` confirmaron `bash -n`, self-test del parser real y cinco casos del clasificador, `dry-run` sin copy/codesign/launch y `git diff --check`. `shellcheck` no estaba disponible y no bloqueó el diagnóstico.

Veredicto final: `inconclusive`. B existió y sobrevivió la ventana según Process, pero el cierre anómalo, la ausencia de muestra de UI/Dock/login y los límites de observación impiden aceptar `both-start` como éxito o atribuir una causa. El diagnóstico no habilita producto.

## Documentación afectada

- Esta HU y `docs/hu/index.md`: trazabilidad, resultado y decisión posterior.
- No se actualizan README ni documentación pública estable durante el diagnóstico. Solo se documentará un cambio de producto en una HU posterior aprobada.

## Bitácora de implementación

- 2026-10-16: `architect` entregó el brief A/B, el preflight externo de la fuente, límites de privacidad, contrato de launcher y criterios verificables.
- 2026-10-16: `document` verificó que `HU-0008` es el siguiente ID secuencial, creó esta HU inicialmente como `Draft` y la dejó en `Ready` porque el alcance, los límites y los criterios son verificables. Se añadió una sola fila al índice. No se modificó producto ni Graphify.
- 2026-10-17: se ejecutó una sola corrida A/B autorizada fuera de sandbox. A y B iniciaron y sobrevivieron sus ventanas de observación; el control terminó con `exit 0` tras `TERM`, mientras B terminó con señal `9` tras `TERM`. La revisión corrigió el clasificador sin rerun y dejó el resultado en `inconclusive`; no hubo UI, Dock, login ni atribución causal. Los gates posteriores, cleanup, fuente y sentinels pasaron; no se tocaron instancias, perfiles reales, llavero ni login. `document` marca la HU `Done` como diagnóstico terminado, no como funcionalidad aprobada.

## Resultado y riesgos residuales

La HU terminó como diagnóstico `inconclusive`, no como producto. El A/B descartó que el simple hecho de observar un proceso durante cinco segundos baste para declarar éxito: el control cerró normalmente y la variante presentó señal `9` tras `TERM`, sin muestra de UI, Dock ni login. No se atribuye ese dato a firma ni a ningún mecanismo del sistema.

No hay implementación de branding de Dock validada. El resultado no demuestra login, persistencia de sesiones, Keychain/safeStorage, updater ni comportamiento funcional posterior a re-firma. La fuente original, las instancias reales y los datos existentes permanecieron fuera de alcance; cleanup eliminó root y state con cero procesos fixture. `securityInteractionObserved=unknown` no permite inferir que el proveedor no haya consultado servicios del SO.

## Cierre de Graphify

Evidencia entregada por `architect`; `document` no ejecutó ni modificó Graphify:

- `npm run graph:update` reconstruyó 958 nodos, 2.140 aristas y 57 comunidades; actualizó `graph.json`, `graph.html` y `GRAPH_REPORT.md`.
- `graphify affected "classify_results" --depth 3 --json` no encontró nodos downstream afectados: el script diagnóstico queda aislado.
- La consulta enfocada `HU-0008 script diagnóstico A/B macOS classify_results crash parser firma perfiles temporales cleanup` conectó `classify_results`, `run_diagnostic`, `write_crash_parser`, `collect_crash_evidence`, `snapshot_bundle`, `cleanup`, `self_test`, HU-0008 y HU-0007/HU-0005/Tauri macOS.
- `npm run graph:check` en modo PRECOMMIT devolvió código 1 únicamente porque `graphify-out/graph.json` y `GRAPH_REPORT.md` actualizados aún no están versionados; la reextracción informó `No code-graph topology changes detected`. No es un gate final verde: root lo repetirá después del commit.
