# HU-0003 — Transferencias conscientes de artefactos, actualización disponible y uso en vivo

## Metadatos

- Estado: `Done`
- Creada: 2026-09-22
- Actualizada: 2026-09-25
- Solicitante: mantenedor del proyecto
- Orquestación: `architect`
- Documentación: `document`
- Implementación: entrega integrada y cierre verificado

## Historia de usuario

Como desarrollador que administra perfiles aislados de una aplicación compatible, quiero transferir conversaciones sin atribuir artefactos o monitores remotos al perfil equivocado, saber si hay una actualización oficial disponible y ver el último uso local de perfiles que están ejecutándose, para operar mis perfiles con expectativas seguras y datos oportunos.

## Problema

La transferencia actual copia sin filtrar el índice de una sesión. Ese índice puede contener `publishedArtifacts`, pero los monitores reales `artifact-comment-monitor` residen en el transcript global y los artefactos publicados están ligados remotamente a una cuenta, organización y conversación. Al abrir la sesión en otro perfil el proveedor puede advertir que un monitor no pudo reanudarse. No es seguro ni técnicamente válido reasignar esa propiedad remota mediante una copia local.

`sourceVersion` describe solamente la versión local de la aplicación fuente. El dashboard no comprueba si existe una versión posterior publicada por el canal oficial. Por otra parte, el uso de plan sí se actualiza durante la ejecución en `<perfil>/plan-usage-history.json`; la sensación de estancamiento se debe a la cadencia de escritura del proveedor, al escaneo completo de 60 segundos y a que una lectura parcial puede reemplazar indebidamente el último valor válido.

## Contexto y evidencia de Graphify

Evidencia suministrada por `architect` tras actualizar el grafo, sin cambios topológicos:

- `copy_code_session_sync` (`src-tauri/src/lib.rs:L1746`) y `unlink_code_session_sync` (`L1913`) gestionan la transferencia, devolución y lineage de sesiones.
- `read_usage` (`L1226`) alimenta `refresh_instance_usage` (`L2102`), que a su vez participa en `refresh_registry` (`L2046`) y `scan_system` (`L2163`).
- `source_version` (`L944`) se incorpora al contrato de `system_info` (`L2114`).
- El polling frontend actual está en `src/App.tsx:L273-L295`.

## Alcance

### Transferencias y artefactos

- Mantener la precondición de que origen y destino estén detenidos, así como los backups, rollback y lineage existentes.
- Tratar `publishedArtifacts` como metadata propiedad del perfil. En copia o movimiento A→B, no escribir en B referencias que pertenezcan a A. Si B ya tiene un índice de la misma sesión, conservar exclusivamente las referencias propias de B.
- La copia conserva el índice de A. El movimiento respalda el índice de A. En una devolución directa B→A o al desvincular, restaurar las referencias de A desde backup/lineage y fusionarlas transaccionalmente con la metadata vigente de la sesión.
- Si falta o está corrupto el material necesario para restaurar de forma segura, no inventar referencias: conservar la recuperabilidad, advertir que se debe publicar de nuevo y no declarar que el monitor remoto se reanudará.
- Exponer en `CodeSession` un resumen mínimo y seguro: conteo de `publishedArtifacts` y resumen del último `artifact-comment-monitor` del transcript global (tipo, estado y conteo). El parser solo puede deserializar los campos permitidos.
- Explicar en el modal y en el aviso posterior que se transfiere la conversación, no la propiedad de artefactos/monitores remotos; en el destino se debe publicar y vigilar de nuevo. El texto no debe prometer eliminar avisos originados por el proveedor.

### Actualización disponible

- Añadir `SourceUpdateInfo`, separado de `sourceVersion`, con contrato TypeScript camelCase equivalente a `{ status: current | available | unavailable, latestVersion, checkedAt, stale, source: officialFeed | aptCache | null }`.
- Para macOS y Windows consultar solamente metadata JSON del feed oficial `https://releases.claude.com/api/desktop/{darwin|win32}/{universal|x64|arm64}/squirrel/update`. La consulta usa UUID nulo fijo, nunca el UUID de la app fuente ni un identificador persistente, y aporta versión instalada y versión de SO únicamente cuando el feed lo requiere.
- Aplicar timeout total de cinco segundos, tamaño de cuerpo acotado y validación de formato de versión. No seguir ni descargar `updateTo.url`; no enviar ni usar cookies, tokens, analítica o credenciales.
- Para Linux consultar localmente `apt-cache policy claude-desktop`, sin `sudo`, `apt update` ni descarga. Comparar Installed/Candidate con `dpkg --compare-versions`; sin repositorio o candidato el estado es `unavailable`.
- Mantener una caché backend en datos de aplicación con versión, fecha, fuente y plataforma, sin identificadores. Un éxito dura seis horas; el último éxito puede mostrarse como `stale` hasta siete días. Cache corrupta, timeout o fallo de red nunca deben bloquear el dashboard ni crear un banner falso.
- Ejecutar la comprobación mediante un comando asíncrono y ligero, sin bloquear cada escaneo. Mantener el botón manual `update_original_application`: solo abre el canal oficial y no descarga, instala o cierra aplicaciones.
- Mostrar un aviso sutil solo cuando el estado sea `available`, con el nombre y versión disponible y el mismo handoff manual ya existente.

### Uso vivo

- Añadir un comando IPC ligero y de solo lectura que devuelva snapshots de uso por ID leyendo exclusivamente `plan-usage-history.json`; no puede ejecutar `scan_system`, leer transcripts ni persistir el registro.
- `refresh_instance_usage` y los merges deben retener el último dato válido si el archivo no existe temporalmente, está bloqueado o contiene JSON parcial.
- El frontend consulta uso cada 15 segundos únicamente si hay instancias en ejecución y la ventana está visible; al recuperar foco realiza una actualización. Solo fusiona el campo `usage` y conserva la información de sesiones, versiones y estado recibida por el escaneo completo de 60 segundos.
- El timestamp se presenta como `capturedAt` o «última captura», sin afirmar que representa información en tiempo real. No se llama a una API autenticada ni se fuerza al proveedor a escribir una muestra.

## Fuera de alcance

- Reautenticar, republicar o reanudar monitores automáticamente.
- Transferir ownership cloud, editar transcripts para eliminar monitores, copiar payloads de artefactos locales o modificar `scheduled-tasks.json`, backlog/tasks o manifiestos globales `artifacts.json`.
- Persistir URLs, títulos o payloads de artefactos en `SessionLink`.
- Instalar, descargar silenciosamente, cerrar la aplicación fuente o las instancias, elevar permisos, añadir telemetría o acceder a API autenticada.
- Resolver en esta HU las colisiones ShipIt/Squirrel de bundles copiados: las copias conservan el bundle ID y el cache updater podría apuntar a instancias; debe quedar como riesgo futuro documentado.

## Criterios de aceptación

1. Las transferencias continúan rechazando origen o destino ejecutándose y preservan backup, rollback y lineage.
2. Una copia A→B no modifica los `publishedArtifacts` de A ni escribe referencias de A en B; si B ya tiene el índice de sesión, mantiene únicamente sus referencias propias.
3. Un movimiento A→B respalda el índice de A; una devolución directa B→A o desvinculación restaura y fusiona de forma transaccional las referencias propias de A desde backup/lineage.
4. Si no es seguro restaurar referencias, el sistema no las inventa, conserva los datos recuperables y comunica la necesidad de republicar en destino.
5. No se copian ni modifican `scheduled-tasks.json`, backlog/tasks, `artifacts.json` globales ni payloads de artefactos.
6. `CodeSession` expone únicamente conteos y tipo/estado permitidos de artefactos/monitores. No expone URLs, IDs remotos, títulos, prompts, respuestas, resultados, cookies, credenciales, tokens ni payloads.
7. El modal de transferencia y el aviso posterior explican claramente que artefactos y monitores remotos no se reasignan y que hay que publicar/vigilar de nuevo, sin prometer su reanudación.
8. `SourceUpdateInfo` diferencia la versión instalada de un estado remoto `current`, `available` o `unavailable`, con versión, fecha, stale y fuente cuando estén disponibles.
9. macOS y Windows consultan exclusivamente el feed oficial descrito, con UUID nulo fijo, timeout total de cinco segundos, body limitado y validación de versión; nunca siguen o descargan `updateTo.url`, ni transmiten credenciales, cookies, tokens o analítica.
10. Linux usa solo `apt-cache policy claude-desktop` local y `dpkg --compare-versions`, sin privilegios, actualización de índices ni descargas; un candidato ausente resulta `unavailable`.
11. La caché de actualización conserva solo metadata mínima, dura seis horas cuando tiene éxito y puede presentar el último éxito como stale hasta siete días. Un error, timeout o caché corrupta no interrumpe el dashboard ni muestra disponibilidad falsa.
12. El aviso de actualización aparece solo para `available`, identifica nombre y versión, y conserva el handoff manual sin instalar, descargar o cerrar aplicaciones.
13. El IPC de uso vivo solo lee `plan-usage-history.json` por perfiles solicitados, no ejecuta escaneo global ni escribe registro. Una lectura faltante, bloqueada o parcial conserva el último valor válido.
14. Con al menos una instancia en ejecución y la ventana visible, el frontend actualiza uso cada 15 segundos y al foco; fusiona solo `usage`. El escaneo completo de 60 segundos conserva las demás responsabilidades.
15. La UI etiqueta el valor como última captura y no promete tiempo real ni consulta autenticada.
16. Hay pruebas de sanitizer y ownership de referencias, copia, movimiento/devolución, rollback, archivos excluidos y parser de monitores sin contenido; de feed/caché/timeout/versión/UUID nulo y apt; de uso válido/parcial/faltante y ausencia de escrituras; y de banner, polling, merge y avisos frontend. `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`, `cargo test --manifest-path src-tauri/Cargo.toml` y `npm run build` pasan.
17. Las rutas macOS, Windows y Linux se cubren por pruebas unitarias cuando no puedan compilarse en el host de revisión. La documentación de sesiones y actualizaciones queda actualizada y `architect` cierra Graphify.

## Verificación de criterios de aceptación

| Criterio | Estado | Evidencia entregada para revisión |
| --- | --- | --- |
| CA1–CA5 | Cumple | El backend sanitiza `publishedArtifacts` con ownership del destino, conserva el origen en copia, respalda el movimiento y restaura referencias del origen desde manifests/backups en devolución. También excluye tareas, backlog, manifiestos globales y payloads del flujo. |
| CA6–CA7 | Cumple | `CodeSession` publica solo `publishedArtifactCount` y el último resumen `artifact-comment-monitor` (tipo, estado y conteo). Modal y aviso posterior indican que se debe republicar/vigilar en el destino, sin prometer reanudación. |
| CA8–CA12 | Cumple | Se añadió `SourceUpdateInfo` y `check_source_update`: feed oficial en macOS/Windows con UUID nulo, cinco segundos, redirects deshabilitados, body de 256 KiB y validación; Linux usa `apt-cache`/`dpkg`; caché de seis horas y stale de siete días. El banner solo abre el handoff manual existente. |
| CA13–CA15 | Cumple | `get_live_usage` es IPC de solo lectura, conserva last-good en backend; frontend consulta cada 15 s con instancias running y ventana visible, recupera al foco, fusiona solo `usage` y etiqueta «Última captura». |
| CA16 | Cumple con evidencia disponible | `npm run build`, `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`, `cargo test --offline --manifest-path src-tauri/Cargo.toml` (27 pruebas) y `git diff --check` son correctos. La revisión visual local confirmó banner, «Última captura», polling y modal; no existe un framework de pruebas de componentes separado reportado. |
| CA17 | Cumple | Tras el commit `ca9c4ac`, Graphify está actualizado y `npm run graph:check` pasa con 601 nodos, 1 200 aristas y 46 comunidades. |

## Diseño técnico y contratos

- `SessionLink` no guarda material descriptivo ni contenido de artefactos. El backend conserva solamente el estado imprescindible para restaurar referencias propias del perfil de origen, mediante el mecanismo transaccional de backup/lineage existente o su extensión mínima.
- El sanitizador de índices debe ser target-owned: antes de persistir B, elimina referencias publicadas que proceden de A y conserva las que ya pertenecían a B. El camino inverso aplica la restauración desde la evidencia de A sin destruir metadata actual no conflictiva.
- El resumen de monitores se obtiene sin cargar contenido de transcript al contrato público. Debe permitir un estado ausente o no disponible.
- `SourceUpdateInfo` es un contrato separado de `SystemInfo.sourceVersion`; el estado de comprobación debe ser explícito para que una caché sin éxito o una fuente no disponible no se interpreten como «actualizado».
- El cliente de feed es acotado y no persistente: ruta/arquitectura permitida, request identificable solo por UUID nulo fijo, límites de tiempo y cuerpo, parseo defensivo y comparación de versiones. La fuente se considera técnicamente confiable por ser oficial, pero de estabilidad media porque el endpoint puede evolucionar.
- El comando de uso vivo devuelve una estructura por identificador, no una recreación del registro completo. El merge backend y frontend es conservador: un fallo local no borra `usage` conocido.

## Casos límite, privacidad y plataformas

- Los artefactos publicados y monitores se vinculan a recursos remotos; una copia local no prueba ownership ni puede reasignarlo. El aviso upstream puede continuar apareciendo tras una transferencia y no constituye una falla que deba ocultarse.
- Un backup o lineage faltante/corrupto nunca se reemplaza por una referencia fabricada. La sesión debe quedar recuperable y el usuario recibe una instrucción honesta de republicación.
- El parser puede detectar el último monitor admisible y su estado, pero no almacenar ni mostrar contenido, URLs, IDs, resultados o payloads.
- El feed puede fallar, redirigir, cambiar de forma o devolver un cuerpo inválido; cualquiera de esos casos conserva la última muestra válida según TTL y, fuera de ella, usa `unavailable` sin interrumpir el escaneo.
- Windows puede mantener archivos de uso bloqueados y el proveedor puede escribir un JSON a medio completar. Estos casos no borran el último dato válido.
- El uso puede no cambiar aunque la instancia esté ejecutándose, porque depende de cuándo el proveedor actualiza el historial; la UI muestra la marca temporal de captura local y no fuerza actividad externa.
- No se introducen permisos invasivos, telemetría ni lectura de cookies, tokens, prompts, respuestas o transcripts fuera de los metadatos explícitamente permitidos.

## Referencias oficiales

- [Descargar Claude Desktop](https://claude.com/download)
- [Instalar Claude Desktop](https://support.claude.com/en/articles/10065433-install-claude-desktop)
- Feed oficial de metadata de escritorio: `https://releases.claude.com/api/desktop/{platform}/{arch}/squirrel/update` (ruta técnica validada por el análisis; su estabilidad debe revisarse antes de cambiarla).

## Plan de delegación

1. `backend` trabaja primero y es dueño de `src-tauri/src/lib.rs`, `src-tauri/Cargo.toml`, el lockfile si procede, y del contrato mínimo en `src/types.ts` y `src/lib/bridge.ts`. Implementa transferencias seguras, resúmenes permitidos, comprobación/cache de actualización, snapshots de uso y pruebas Rust. No modifica `App.tsx` ni estilos.
2. Cuando el contrato backend esté disponible, `frontend` es dueño de `src/App.tsx` y `src/styles.css`. Consume los contratos, presenta los avisos y resúmenes seguros, implementa el polling/merge visible y conserva el diseño, temas y accesibilidad. No modifica Rust ni los contratos compartidos.
3. `architect` revisa la integración contra todos los criterios, ejecuta verificaciones proporcionales y cierra Graphify. `document` recibe resultados comprobables para actualizar esta HU, el índice y la documentación estable.

## Plan y resultado de pruebas

Resultados de la entrega y su cierre:

- `npm run build`: correcto.
- `cargo test --offline --manifest-path src-tauri/Cargo.toml`: correcto; 27 pruebas aprobadas.
- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` y `git diff --check`: correctos.
- La revisión visual local en IAB confirmó que el banner de versión disponible y «Última captura» se muestran; con una instancia running el mock de uso cambió de 85.2 a 85.4; el modal mostró tres artefactos y el aviso de republicación.
- La entrega declara cobertura de sanitización/ownership, copia, movimiento/devolución, resúmenes sin contenido, feed/caché/apt y uso last-good. No se reportó un framework separado de pruebas de componentes; la evidencia visual manual cubre las superficies visibles, no reemplaza una futura automatización de interfaz.
- El feed se validó mediante una lectura de metadata sin efectos: con UUID nulo respondió `currentRelease` `1.46388.4`. No se registran ni siguen URL ni hash de `updateTo`.

## Documentación afectada

- `docs/sesiones.document.md`: transferencias conscientes de artefactos/monitores, límites de seguridad y refresco de uso vivo.
- `docs/actualizaciones.document.md`: detección de versión disponible, feed o apt local, caché, fallos seguros y separación del handoff manual.
- `README.md`: solo si la revisión concluye que el comportamiento visible requiere actualizar información pública.

## Bitácora de implementación

- 2026-09-22: `architect` entregó el brief completo con evidencia de Graphify, decisiones de privacidad, contratos, rutas de plataforma, criterios verificables, alcance y riesgos.
- 2026-09-22: `document` creó la HU en `Draft`, verificó que el ID siguiente era `HU-0003`, completó el brief y la dejó en `Ready`. No hay implementación, pruebas ejecutadas, cambios de Graphify ni desviaciones registradas todavía.
- 2026-09-22: por agotamiento de cuota de `architect`/`backend`, `/root` integró la entrega de fallback: sanitización y restauración de refs de artefactos, resumen seguro de monitores, `SourceUpdateInfo` y detector acotado, IPC de uso vivo y sus superficies frontend. Se añadió `reqwest` 0.13 con TLS y sin cookies para el feed de metadata; no se informó telemetría ni uso de credenciales.
- 2026-09-22: se reportaron `npm run build` correcto y 27 pruebas Rust correctas ejecutadas offline. `document` actualizó las guías de sesiones y actualizaciones y pasó la HU a `Review`; el cierre de Graphify sigue pendiente.
- 2026-09-23: se validaron formato Rust, diff y revisión visual local; también se confirmó una respuesta read-only del feed con UUID nulo. El grafo se actualizó y se revisaron impactos.
- 2026-09-25: tras el commit autorizado `ca9c4ac feat: improve session transfers and live status`, `npm run graph:check` confirmó que Graphify está actualizado. Se validaron 601 nodos, 1 200 aristas y 46 comunidades; la HU pasó a `Done`.

## Resultado y riesgos residuales

La entrega está cerrada: la copia y el movimiento no adjudican `publishedArtifacts` de un perfil a otro, y la devolución recupera refs de origen desde manifests/backups cuando existe evidencia segura. El contrato público limita los monitores a metadata mínima, y la UI comunica que los recursos remotos deben republicarse o vigilarse de nuevo.

Un monitor remoto no se reanuda ni cambia de propietario mediante esta funcionalidad. El feed oficial de metadata es una dependencia externa confiable por procedencia pero susceptible de cambios; la caché y los límites de request reducen el impacto de fallos. El uso visible depende de la cadencia con que el proveedor escriba `plan-usage-history.json`, por lo que «Última captura» no equivale a tiempo real. Permanece como riesgo futuro la colisión de bundles copiados con ShipIt/Squirrel y sus caches de actualización.

## Cierre de Graphify

Evidencia suministrada por `architect`/`/root`:

- Tras el commit `ca9c4ac feat: improve session transfers and live status`, `npm run graph:update` y `npm run graph:check` confirmaron Graphify actualizado con 601 nodos, 1 200 aristas y 46 comunidades.
- `graphify affected "copy_code_session_sync"` relacionó el flujo de copia con copia y desvinculación; `graphify affected "check_source_update_sync"` relacionó el helper con `check_source_update`; `graphify affected "get_live_usage"` no encontró afectados.

`document` no ejecutó ni modificó Graphify ni `graphify-out/`; este cierre se registra a partir de la evidencia entregada por `architect`/`/root`.
