# HU-0009 — Estado oficial de actualización y refresco de versiones

## Metadatos

- Estado: `Done`
- Creada: 2026-10-22
- Actualizada: 2026-10-23
- Solicitante: mantenedor del proyecto
- Orquestación: `architect`
- Documentación: `document`
- Implementación prevista: `backend` y `frontend`

## Historia de usuario

Como usuario de Code AI Profiles, quiero distinguir una compilación local adelantada de una actualización oficial confirmada y que, después de iniciar el flujo oficial de actualización, el dashboard refresque versiones al regresar, para no recibir una alerta falsa ni depender de esperar o de ejecutar un escaneo manual.

## Problema

La aplicación puede etiquetar la instalación original como desactualizada cuando una instancia administrada tiene un número de versión local mayor. Esa comparación local no confirma por sí misma que el canal oficial ofrezca una actualización. Además, el flujo de actualización promete recalcular al volver a la aplicación, pero el refresco de fondo puede quedar suprimido por su cooldown de 60 segundos, manteniendo la topología y la versión visualmente antiguas.

## Contexto y evidencia de Graphify

Evidencia entregada por `architect`; `document` no ejecutó ni modificó Graphify:

- En macOS, la instalación original detectada en `/Applications` y la interfaz mostraban `3.1623.4`; el DMG oficial montado mostraba `3.1623.1`.
- El feed oficial cacheado indicó estado `current` para `3.1623.4`.
- Cuatro bundles administrados contenían efectivamente `3.6556.1`. Que una instancia sea mayor es evidencia local; por sí sola no prueba la causa, disponibilidad oficial, canal ni rollout de esa compilación.
- `VersionTopology.originalBehind` compara la mayor versión local. La interfaz traduce ese resultado a «original desactualizada», aunque una instancia local mayor no basta para afirmarlo.
- El CTA de la original abre actualmente un redirect de DMG fijo.
- El retorno por focus se coordina con un cooldown de 60 segundos. Un foco previo o uno ocurrido mientras la acción externa sigue pendiente puede consumir la oportunidad de refresco y mantener `sourceVersion` y la topología viejas.

## Alcance

### Estado y comunicación de actualización

1. Separar la semántica de la evidencia local (`originalBehind` o instancia local mayor) del estado oficial de actualización (`SourceUpdateStatus::Available`). Una versión local mayor nunca equivaldrá por sí sola a una actualización oficial disponible.
2. Solo metadatos oficiales, válidos y frescos podrán afirmar que hay una actualización oficial disponible o que la instalación está al día. Los estados stale, error, unavailable y unknown no afirmarán `current` ni `available` como hechos actuales.
3. Cuando `sourceUpdate.status` sea `available` y no esté stale, conservar el aviso de nueva versión y una acción dirigida al flujo oficial.
4. Cuando el estado oficial fresco sea `current` pero una instancia local sea mayor, mostrar un mensaje neutral: la original está al día según el canal oficial y una instancia tiene una compilación local superior o adelantada. No inferir canal o rollout como hechos.
5. Cuando los metadatos sean unavailable o stale, mostrar un mensaje neutral de imposibilidad de confirmación y conservar una acción segura para comprobar o abrir el flujo oficial, sin declarar una actualización disponible.

### Flujo oficial y refresco dirigido

1. En macOS, orientar al actualizador nativo oficial del bundle original sin automatizar clics, accesibilidad, AppleScript ni requerir permisos invasivos. La implementación validará estrictamente que se lance la ruta original detectada y nunca una instancia administrada.
2. La solución podrá abrir la original y guiar al usuario hacia `Claude > Check for Updates`, conforme a la documentación oficial, o adoptar una alternativa equivalente acordada durante la implementación. Windows y Linux conservarán el handoff y los botones existentes.
3. Desde el inicio de la acción externa, registrar la posible salida y retorno de foco como intención pendiente. El handoff puede causar blur o retorno antes de resolver su promesa; el controlador no consumirá el refresco hasta un éxito confirmado. Si el retorno ya ocurrió al resolver exitosamente, encolará exactamente un refresco específico de versiones y topología. El refresco no realizará escaneo completo, no mostrará modal de progreso ni accederá a transcripts o contenido.
4. Ese refresco dirigido podrá saltar una vez el cooldown general. Focus y visibility se deduplicarán: habrá como máximo una llamada en vuelo.
5. Si la operación falla, el próximo evento o acción podrá reintentar de forma acotada, sin bucles ni spam. Desmontaje, lifecycle y resultados atrasados no podrán aplicar datos obsoletos.
6. Si cambia la versión instalada y la caché del feed corresponde a otra versión, no reutilizar estados `current` o `available`: se revalidará contra la nueva versión. El refresco explícito invalidará la caché runtime de aplicaciones o releerá el disco según el contrato definitivo.

## Fuera de alcance

- Instalar automáticamente o reemplazar la aplicación original.
- Elevar permisos, automatizar el menú nativo, accesibilidad o AppleScript.
- Sincronizar instancias automáticamente.
- Cambiar la versión de Code AI Profiles o generar un instalador.
- Resolver el icono personalizado del Dock.
- Tocar perfiles, sesiones, credenciales, cookies, prompts, respuestas o transcripts.
- Telemetría, permisos o dependencias nuevas sin justificación y autorización.

## Criterios de aceptación

1. La clasificación distingue de forma verificable entre instancia local adelantada y actualización oficial `available`, `current`, `unavailable` o stale.
2. Una instancia local mayor no muestra por sí sola que la original está desactualizada ni que existe una actualización oficial.
3. La interfaz no afirma `current` ni `available` cuando la metadata oficial está stale, indisponible, errónea o desconocida.
4. Con `available` fresco se conserva una alerta de actualización oficial y un CTA del canal oficial; con `current` fresco e instancia mayor se muestra un mensaje neutral; sin confirmación oficial se comunica incertidumbre de forma neutral.
5. Un cambio de `installedVersion` invalida los estados cacheados del feed asociados a otra versión y vuelve a validar el estado oficial.
6. En macOS se lanza exclusivamente la ruta original detectada y validada. Las pruebas usan launcher simulado o fixtures y nunca abren una aplicación real ni una instancia administrada.
7. El controlador registra blur, focus o visibility desde que comienza el handoff. Un retorno ocurrido mientras la acción todavía está pendiente no consume el refresh: si la acción resuelve con éxito, el retorno previo encola exactamente una actualización de versiones y topología; de lo contrario, el primer evento válido posterior lo dispara.
8. Eventos duplicados de focus y visibility producen una sola llamada en vuelo. Si falla, existe retry acotado mediante un siguiente evento o acción, sin ciclo automático ni spam.
9. El refresco dedicado no inicia escaneo completo, no muestra progreso de escaneo, no consulta sesiones ni escribe almacenamiento de perfiles. `RefreshScope::VERSIONS` preserva en `DashboardState` las listas ya presentes de sesiones de la original y de las instancias, sin reindexarlas ni volver a leer transcripts/storage.
10. Windows y Linux conservan sus handoffs y controles existentes.
11. Pasan `npm run build`, `cargo test --manifest-path src-tauri/Cargo.toml`, `npm run test:scan`, `npm run test:release`, las pruebas nuevas pertinentes y `git diff --check`.
12. Al cierre se actualizan esta HU, el índice, `docs/actualizaciones.document.md` y Graphify conforme al flujo obligatorio, con evidencia entregada por los responsables correspondientes.

## Diseño técnico y contratos

- Contrato propuesto para validación de `backend`: un comando dedicado que invalida la caché de aplicaciones y ejecuta `RefreshScope::VERSIONS`, devolviendo `DashboardState`. El scope preserva las listas existentes de sesiones original/de instancias y no las reindexa ni consulta transcripts/storage; tampoco debe refrescar perfiles o almacenamiento de usuario ajeno a las cachés de versión necesarias.
- Contrato propuesto para validación de `frontend`: el bridge expone `refreshVersions()` y conserva el contrato manual de escaneo separado.
- La acción de macOS devuelve un mensaje o instrucción después de lanzar únicamente el bundle original validado. No automatiza el actualizador ni modifica bundles o instancias.
- `frontend` mantendrá un controlador pequeño y separado para intención pendiente, deduplicación, retries acotados y lifecycle; debe contar con pruebas puras. Solo podrá extender `scan-controller` si demuestra que no altera las garantías de escaneo manual.
- Los nombres definitivos de tipos, comandos y controladores requieren confirmación de los implementadores y del `architect`; esta HU no prescribe una implementación de producto.

## Casos límite, privacidad y plataformas

- Una discrepancia de versión local superior no atribuye causa, canal ni disponibilidad pública de una compilación.
- Cache stale, fallo de red o metadata incompleta comunican incertidumbre sin ocultar la acción segura de comprobación.
- Focus y visibility pueden llegar en distinto orden, repetirse o llegar antes de que termine la promesa de acción externa. El handoff también puede emitir blur y retornar antes de resolver: se registra ese retorno desde el inicio, pero solo un éxito confirmado habilita su consumo; si ya retornó, se encola una única actualización.
- Un fallo de la acción externa no consume la intención, no aplica un resultado obsoleto ni inicia un loop. Errores, desmontaje o resultados asíncronos de una generación anterior tampoco actualizan el dashboard actual.
- Las pruebas usarán estados de versión, eventos y launchers sintéticos. No leerán, imprimirán ni persistirán datos privados.
- El handoff específico de macOS queda validado por ruta. Windows y Linux no reciben automatización de plataforma y preservan su comportamiento actual.

## Plan de delegación

1. `backend` será dueño del cálculo semántico de versiones, cache de versiones/feed, comando dedicado de refresco y validación de ruta de lanzamiento macOS. No modificará interfaces visuales ni datos privados. Reportará contratos, plataformas y pruebas al `architect`.
2. `frontend` será dueño del bridge TypeScript, mensajes visuales, CTA y controlador de intención de refresco con sus pruebas. No modificará Rust, configuración de empaquetado ni Graphify. Reportará la política final de lifecycle, deduplicación y retry al `architect`.
3. `architect` resolverá los contratos compartidos antes de la integración, revisará los criterios y realizará el cierre de Graphify.
4. `document` actualizará esta HU, el índice y la documentación estable únicamente después de recibir evidencia de implementación y cierre del `architect`.

## Plan y resultado de pruebas

Evidencia de implementación y cierre técnico confirmados:

- Backend: `refresh_versions` invalida la caché runtime de aplicaciones y ejecuta el scope exacto `VERSIONS`. El scope no relee sesiones, uso ni almacenamiento y preserva en el dashboard las listas ya disponibles.
- Backend: la caché del feed queda ligada a `installedVersion`; un valor stale deja de afirmar un estado actual. Tras un refresco local correcto, se programa una sola comprobación oficial asíncrona para la versión instalada, protegida por generación, lifecycle, `sourcePath` y `sourceVersion`; un fallo de esa comprobación no revierte el resultado local.
- Backend: en macOS el handoff valida la ruta original y abre únicamente ese bundle mediante `/usr/bin/open -n -a <ruta>`. Las pruebas usan launchers simulados/fixtures y rechazan rutas de instancias administradas; no abren aplicaciones reales.
- Frontend: separa actualización oficial fresca, diferencia local con estado oficial `current` e incertidumbre. El controlador registra el retorno desde el inicio, deduplica eventos, limita retries a dos y descarta generaciones o lifecycles obsoletos. La revisión adicional cubre retorno por `visibility` sin bloqueo permanente de intervalos, el drenaje de una intención nueva tras una operación previa en vuelo y throws síncronos del refresco.
- Verificaciones reportadas: `cargo test --manifest-path src-tauri/Cargo.toml` (43 passed, 1 ignored), `cargo fmt --manifest-path src-tauri/Cargo.toml --check`, `npm run test:update` (24 pruebas), `npm run test:scan` (13), `npm run test:release` (11), `npm run test:release:check` para la versión `0.2.1`, `npm run build` y `git diff --check`, todos correctos.
- Integración: `.github/workflows/validate.yml` incorpora `test:update`, por lo que las pruebas del controlador se ejecutan en la validación continua.
- Smoke de interfaz con bridge mock: el modal nativo de macOS y su toast se comportaron sin disparar escaneo ni tocar aplicaciones, perfiles o sesiones reales. La captura de esa comprobación no representa una ejecución contra una instalación real.

Resolución de cierre:

- Se autorizó y creó el commit local que versiona los artefactos requeridos. Tras ello, `npm run graph:check` finalizó correctamente con código 0. El fallo previo queda documentado como un gate correcto ante artefactos sin versionar, no como una desviación de la implementación. El push de la rama aún no se registra como realizado en esta HU.

El plan mínimo que originó la HU fue:

- Pruebas backend de clasificación: local-ahead frente a `available`, `current`, unavailable, unknown y stale; invalidación por cambio de versión instalada; y alcance `VERSIONS` sin sesiones o storage.
- Pruebas backend de launch macOS mediante launcher mock o fixture: solo ruta original detectada y validada; rechazo de ruta de instancia administrada; sin apertura real.
- Pruebas frontend puras de intención pendiente: blur/salida y retorno durante promesa, retorno ya ocurrido al éxito, primer evento posterior, fallo sin consumo ni loop, deduplicación focus/visibility, una llamada en vuelo, retry acotado, cleanup y descarte de resultados atrasados.
- Pruebas de UI o integración para los tres mensajes oficiales: disponible fresco, actual fresco con instancia adelantada e imposibilidad de confirmación.
- `npm run build`, `cargo test --manifest-path src-tauri/Cargo.toml`, `npm run test:scan`, `npm run test:release` y `git diff --check`.

## Documentación afectada

- `docs/actualizaciones.document.md`: semántica de estado oficial, discrepancias locales, CTA seguro y refresco posterior al handoff. Actualizada provisionalmente durante esta revisión con la evidencia disponible.
- `docs/hu/index.md` y esta HU: trazabilidad, evidencia, pruebas, resultados y cierre.

## Bitácora de implementación

- 2026-10-22: `architect` entregó el brief con la evidencia de versiones locales, feed oficial, cachés, UX y lifecycle. `document` confirmó que `HU-0009` es el siguiente ID secuencial, creó esta HU inicialmente como `Draft` y la dejó en `Ready` porque el alcance y los criterios son verificables. Se añadió una sola entrada al índice. No se modificó producto, Graphify, perfiles ni sesiones.
- 2026-10-23: `backend` y `frontend` reportaron la implementación descrita en «Plan y resultado de pruebas». El `architect` previo quedó sin cuota; la coordinación raíz conserva la HU en `Review`, no en `Done`, hasta completar los pendientes de CI, revisión de integración y cierre de Graphify. Esta actualización no afirma que las versiones locales prueben un autoactualizador, canal o rollout.
- 2026-10-23: La revisión de integración confirmó la comprobación oficial asíncrona posterior al refresco local, con guards de generación, lifecycle, `sourcePath` y `sourceVersion`; también incorporó `test:update` a `validate.yml`. Las pruebas y el build finalizaron correctamente. El smoke visual usó solamente el bridge mock y confirmó el modal/instrucción de macOS sin abrir una aplicación ni tocar sesiones.
- 2026-10-23: Con autorización del solicitante se creó el commit local de cierre. `npm run graph:check` pasó con código 0 tras versionar los artefactos de Graphify. La coordinación raíz autorizó marcar la HU como `Done`; el push permanece pendiente de confirmación explícita y no se declara efectuado aquí.

## Resultado y riesgos residuales

La implementación separa la información local de la confirmación oficial y evita refrescos que lean sesiones o almacenamiento. Sigue existiendo incertidumbre inherente cuando el proveedor distribuye compilaciones por canales o rollouts distintos; la aplicación debe comunicarla como tal y no convertirla en una afirmación oficial. El flujo macOS depende de que el bundle original pueda detectarse y validarse, y del actualizador del propio proveedor; no automatiza su menú ni modifica la instalación.

## Cierre de Graphify

Evidencia entregada por coordinación raíz; `document` no ejecutó ni modificó Graphify:

- `npm run graph:update` finalizó con 1.013 nodos, 2.284 aristas y 59 comunidades.
- Una segunda ejecución informó «No topology changes» y conservó los hashes: `graph.json` `57bfa6a798ede8d725684c8f895730e00822910c577dce4df5f71ea0ef1aad70` y `GRAPH_REPORT.md` `01bd37b459b26098523ce6d1bc132afb4f8b5edd0ff7765ebc3a4bb54585980c`.
- La consulta final relacionó `mergeSourceUpdateForInstallation`, `createSourceUpdateController` y `refresh_versions` con App, pruebas y Rust.
- Antes del commit, `npm run graph:check` terminó con código 1 exclusivamente porque los artefactos actualizados diferían de `HEAD` y el gate exige versionarlos. Con la autorización posterior, se creó el commit local y una nueva ejecución de `npm run graph:check` finalizó con código 0. La coordinación raíz realizará una última regeneración/comprobación antes de publicar la rama.
