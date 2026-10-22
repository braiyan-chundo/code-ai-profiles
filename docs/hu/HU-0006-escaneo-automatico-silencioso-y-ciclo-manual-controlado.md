# HU-0006 — Escaneo automático silencioso y ciclo manual controlado

## Metadatos

- Estado: `Done`
- Creada: 2026-10-13
- Actualizada: 2026-10-13
- Solicitante: mantenedor del proyecto
- Orquestación: `architect`
- Documentación: `document`
- Implementación prevista: `frontend`, con apoyo de `backend` solo si un contrato indispensable lo exige

## Historia de usuario

Como usuario, quiero que el refresco automático sea realmente silencioso y deduplicado, y que el escaneo manual muestre progreso cerrable al terminar, para enfocar o abrir la app sin alertas persistentes ni acciones invisibles.

## Problema

Un evento de progreso de escaneo automático puede dejar el panel de progreso visible aunque la operación haya terminado. Además, focus, intervalo y acciones manuales comparten referencias de concurrencia sin distinguir quién inició el trabajo; el foco inicial o un selector de archivo pueden provocar escaneos repetidos y un clic manual durante un trabajo de fondo puede no producir respuesta visible.

## Contexto y evidencia de Graphify

Evidencia entregada por `architect`; `document` no ejecutó ni modificó Graphify:

- En `src/App.tsx`, el listener global de `scan-progress` cerca de L281-L301 muestra el panel siempre que `scanInFlightRef.current`; actualiza el estado alrededor de L285-L286.
- El escaneo automático `scanSilently` cerca de L395-L417 reutiliza esa referencia, llama `bridge.scan()` al recuperar foco y cada 60 s, y en `finally` solo devuelve la referencia a `false`.
- Solo el flujo manual `refresh(true)` cerca de L249-L279 programa `closeScanProgressSoon`. `ScanProgressPanel` cerca de L1000-L1017 no ofrece cierre.
- `busyRef` no distingue el dueño de la operación. El backend emite 100 % antes de resolver, por lo que el frontend puede separar ambos ciclos sin modificar Rust si adopta un controlador correcto.
- El impacto identificado conecta `App` con `bridge.scan`/`bridge.dashboard`, `ScanProgressPanel`, listeners de focus/interval y `SystemInfo`/manifests para la versión `0.2.1`.

## Alcance

### Control de escaneos

1. Separar los ciclos manual y de fondo mediante un controlador o state machine puro y testeable. Solo habrá un trabajo relevante en vuelo y el trabajo de fondo no alterará `scanProgress`, `busy` ni un error visible.
2. El refresco automático mantendrá la actualización del dashboard, pero será silencioso. Focus e intervalo compartirán un cooldown de al menos 60 s o una constante explícita; se deduplicarán y el foco inicial no lanzará inmediatamente otro escaneo completo. Cuando el estado esté stale, un focus iniciará como máximo un trabajo de fondo.
3. Evaluar `bridge.dashboard()` como lectura de fondo si conserva los datos necesarios y no emite `scan-progress`. `bridge.scan()` permanecerá para el flujo manual que fuerza escaneo. No se cambia el contrato Rust salvo evidencia imprescindible.
4. El flujo manual mostrará progreso real y estados running, success y error. En éxito se autocerrará; en terminal tendrá control «Cerrar» u «Ocultar» accesible. Mientras corre, no ofrecerá una falsa cancelación.
5. Un clic manual durante un trabajo de fondo tendrá una salida determinista: esperar, promover o informar y ejecutar después. Nunca podrá desaparecer ni quedar indefinidamente invisible.
6. Eventos o resultados tardíos, timers viejos y desmontaje no reabrirán el panel ni sobrescribirán una operación nueva. Listeners y timers tendrán cleanup completo.
7. Se preservan el uso en vivo cada 15 segundos, la comprobación de actualización de fuente al recuperar foco, accesibilidad y el sistema visual existente.

### Versión

1. Usar la herramienta oficial de versionado para dejar todas las fuentes canónicas en `0.2.1`.
2. El instalador macOS se compilará fuera de la implementación de frontend. Esta HU no publica releases, no crea tags ni modifica protecciones de ramas o PR5.

## Fuera de alcance

- Cambios de backend Rust, salvo que el análisis demuestre que un contrato es indispensable.
- Cambios de sesiones, cuentas, perfiles o datos privados.
- Telemetría, red, permisos adicionales o pruebas CUA reales.
- Publicación de release, modificación de protecciones de rama o cambios del PR5.

## Criterios de aceptación

1. Abrir o enfocar la aplicación no muestra el panel de un escaneo automático.
2. Focus e intervalo dentro del cooldown generan como máximo una llamada de fondo; el foco inicial no inicia un escaneo inmediato.
3. Un refresco de fondo actualiza el estado sin modificar `scanProgress`, `busy` ni error visible.
4. El escaneo manual recibe progreso real, finaliza y se oculta en éxito; un estado terminal ofrece cierre u ocultamiento legible y el estado running no finge cancelar.
5. Un clic manual durante background se resuelve de forma determinista y comprobada por prueba.
6. Eventos tardíos, timers anteriores o desmontaje no reabren el panel ni pisan una operación más nueva.
7. Live usage y la comprobación de actualización de fuente al focus siguen funcionando.
8. Existen pruebas sintéticas de la state machine o política con reloj, promesas y eventos inyectables; no son pruebas regex, no usan datos privados y no introducen dependencias nuevas salvo justificación.
9. Las fuentes de versión quedan en `0.2.1`; pasan pruebas de release y `release:check`.
10. Pasan `npm run build`, la nueva prueba de frontend, `git diff --check` y, si manifests Tauri cambian, `cargo fmt --check` y `cargo test --manifest-path src-tauri/Cargo.toml`.
11. Al cierre se actualizan las guías funcionales, la documentación de versión y Graphify según el flujo obligatorio.

## Diseño técnico y contratos

- El controlador de escaneo será una unidad pura TypeScript o JavaScript que reciba reloj, promesas y eventos inyectables. Modelará al menos origen manual/background, estado de ejecución, generación vigente, cooldown, cierre terminal y cleanup.
- El estado visual solo podrá provenir de la generación manual vigente. Los callbacks capturarán su generación y comprobarán que siga siendo actual antes de modificar estado.
- El background puede invocar `bridge.dashboard()` si su contrato basta para la actualización requerida; si necesita `bridge.scan()`, sus eventos de progreso se ignorarán para el panel manual. La decisión se documentará con la evidencia de datos obtenida por implementador.
- La política manual durante background se definirá antes de integrar UI, con una única semántica explícita y cubierta por prueba. La interfaz no convertirá un trabajo de fondo en manual sin mantener la generación y el feedback correspondiente.
- La versión se actualizó mediante `npm run release:version -- patch` desde `0.2.0` hasta `0.2.1`; el responsable de frontend no modificó `package.json` ni manifests en paralelo con el responsable de versión.

## Casos límite, privacidad y plataformas

- Un focus inicial, focus repetido, retorno de un selector de archivo y ticks de intervalo comparten cooldown y deduplicación.
- Un error de background se conserva para diagnóstico interno solo si ya existe un canal seguro; no abre panel ni muestra error visible. Un error manual se expresa dentro de su propio estado terminal.
- Si se desmonta la vista o cambia la generación, se cancelan listeners/timers y se ignoran eventos tardíos.
- Las pruebas usan clocks, promesas, dashboards y eventos sintéticos. No leen ni imprimen prompts, respuestas, transcripts, credenciales, cookies o tokens.
- El comportamiento es independiente de macOS, Windows y Linux; no requiere permisos de plataforma ni acceso de red adicional.

## Plan de delegación

1. `frontend` será dueño de `src/App.tsx`, el controlador puro de escaneo, sus pruebas y estilos estrictamente necesarios. No modifica Rust, manifests, locks, workflow ni Graphify. Informará al arquitecto la decisión `bridge.dashboard()`/`bridge.scan()` y cualquier contrato indispensable.
2. `backend` o el responsable de versión actualizará `0.2.1` con la herramienta oficial una vez que frontend indique que no edita manifests. Compila el instalador macOS fuera del alcance de implementación frontend.
3. `architect` integra, valida criterios, decide cualquier contrato backend y cierra Graphify. `document` actualizará esta HU, el índice y documentación estable solo con evidencia recibida.

## Plan y resultado de pruebas

Evidencia verificada por `architect`:

- `tests/scan-controller.test.ts`: 13 de 13 correctas. Cubre foco inicial/cooldown/deduplicación, background silencioso, manual encolado, success/error/dismiss, timer y evento viejo, dispose, StrictMode, cooldown posterior al manual, listener viejo, busy ajeno y lifecycle antiguo de background/manual.
- `npm run test:release`: 11 de 11 correctas.
- `npm run release:check`: correcto para `0.2.1`.
- `npm run build`: correcto.
- `cargo fmt --check`: correcto.
- `cargo test --manifest-path src-tauri/Cargo.toml`: 38 aprobadas, 0 fallos y 1 ignorada. La ejecución aislada del backend y la ejecución de root fueron correctas. Una primera corrida concurrente presentó `SIGSEGV` durante fixtures macOS de codesign; no bloquea el resultado aislado, pero los fixtures Rust no deben ejecutarse concurrentemente.
- `git diff --check`: correcto.
- Entrega operativa macOS: `npm run build:macos`, `hdiutil verify` y `codesign --verify --deep --strict` sobre la aplicación fueron correctos. El plist confirma `0.2.1` y el binario es Mach-O `arm64`. El DMG local `src-tauri/target/release/bundle/dmg/Code AI Profiles_0.2.1_aarch64.dmg` mide aproximadamente 5.6 MB. Tiene firma ad-hoc y no está notarizado; no constituye una publicación o release.

La implementación eligió `bridge.dashboard()` para background y dejó `bridge.scan()` para manual. No se introdujo contrato Rust ni dependencia nueva.

## Documentación afectada

- `docs/rendimiento.document.md`: comportamiento de escaneos manuales y silenciosos, cooldown y límites.
- `docs/versionado.document.md`, `README.md` y `CHANGELOG.md`: versión `0.2.1`, comandos y cambios visibles implementados.
- `docs/hu/index.md` y esta HU: estado, evidencia y cierre.

## Bitácora de implementación

- 2026-10-13: `architect` entregó el brief con evidencia de flujo, alcance, contratos, pruebas y criterios verificables.
- 2026-10-13: `document` confirmó que `HU-0006` es el siguiente ID único, creó esta HU inicialmente como `Draft` y la dejó en `Ready` al contar con un brief verificable. Se añadió una sola entrada al índice. No se modificó producto ni Graphify.
- 2026-10-13: `architect` confirmó la implementación del controlador puro `src/lib/scan-controller.ts`, su integración en `App.tsx`, pruebas sintéticas y el uso silencioso de `bridge.dashboard()` en background. La versión se actualizó con la herramienta oficial a `0.2.1`; las verificaciones enumeradas en esta HU fueron correctas.
- 2026-10-13: `document` actualizó las guías de rendimiento y versionado, README y CHANGELOG con la evidencia de implementación. La HU pasa a `Done`. Root confirmó la entrega operativa del DMG macOS `0.2.1`: build, verificación del DMG, firma estricta de la app, versión del plist y arquitectura `arm64` correctas. El artefacto está firmado ad-hoc, no notarizado y no se publicó.

## Resultado y riesgos residuales

La deduplicación reduce trabajo redundante, pero no promete un tiempo fijo para un dashboard o escaneo. El flujo manual sigue esperando datos reales y una lectura de fondo depende de la disponibilidad de datos del bridge. Los fixtures Rust de codesign deben ejecutarse de forma aislada para evitar la condición observada en la primera corrida concurrente.

## Cierre de Graphify

Evidencia entregada por `architect`; `document` no ejecutó ni modificó Graphify:

- `npm run graph:update` reconstruyó 863 nodos, 1.996 aristas y 53 comunidades.
- `graphify affected "createScanController"` mostró `App.tsx` como importador y llamador, `tests/scan-controller.test.ts` como importador y llamador, y `main.tsx` como dependencia transitiva.
- La consulta enfocada conectó HU-0006, `ScanProgressPanel`, `createScanController`, cooldown, bridge y el contrato Rust.
- `npm run graph:check` en PRECOMMIT devolvió código 1 únicamente porque `graph.json` y `GRAPH_REPORT.md` actualizados aún no están versionados. La reextracción no encontró cambios topológicos adicionales.

El gate final de Graphify no se declara verde: root debe repetir `npm run graph:check` después del commit local.
