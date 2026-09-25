# HU-0002 — Actualizar la aplicación original y mostrar metadatos precisos por modelo y proveedor

## Metadatos

- Estado: `Done`
- Creada: 2026-08-13
- Actualizada: 2026-08-13
- Solicitante: mantenedor del proyecto
- Orquestación: `architect`
- Documentación: `document`
- Implementación: entrega original y fix de revisión integrados; cierre verificado por `architect`

## Historia de usuario

Como desarrollador que administra perfiles aislados, quiero iniciar de forma segura la actualización oficial de la app original, ver su nombre real y medir el contexto contra la ventana del modelo activo, para mantener original e instancias al día y tomar decisiones correctas de compactación.

## Problema

La aplicación solamente podía actualizar instancias copiando la versión ya instalada del original; no ofrecía una acción explícita para llevar la aplicación original a la última versión oficial. Además, la tarjeta original usaba el texto genérico «Aplicación compatible». El cálculo de contexto ya reconocía algunas familias con ventana de 1 000 000 de tokens, pero omitía modelos vigentes —entre ellos Opus 4.6— y aplicaba 200 000 como fallback a cualquier identificador `claude-*`; por ello podía mostrar un denominador y un porcentaje incorrectos. La ventana debe proceder del modelo registrado por la última respuesta válida de cada sesión y quedar no disponible cuando el modelo sea desconocido.

## Reapertura por revisión

Después del primer cierre se detectó una regresión en la disponibilidad de «Actualizar original». `OriginalAppSection` solo se monta cuando `sourcePath` existe, pero el botón también usa `disabled={busy || status === "missing"}`. `original_instance_status()` devuelve `Missing` tanto cuando falta el binario como cuando falta el perfil original. En consecuencia, una instalación detectada sin perfil queda impedida de abrir el canal oficial, aunque la actualización de la aplicación no depende de que exista ese perfil.

El fix separa ambas precondiciones:

- Frontend: dentro de la sección ya condicionada por `sourcePath`, el botón se deshabilita únicamente por `busy`; el estado del perfil no bloquea el handoff oficial.
- Backend: antes de abrir la URL, `update_original_application` comprueba `detect_provider_source()` y devuelve un error si no existe una instalación fuente. Así, una invocación IPC directa tampoco puede omitir la precondición real.
- La defensa backend no debe crear, modificar ni inspeccionar perfiles; solo confirma que la fuente compatible está detectada.

## Contexto y evidencia de Graphify

Evidencia suministrada por `architect`:

- `detect_provider_source`, `source_version`, `system_info` y `original_instance_status` en `src-tauri/src/lib.rs` conforman la detección de la aplicación original.
- `update_instance_application_sync` copia a una instancia la versión ya instalada del original; no actualiza el original.
- `latest_transcript_context` toma la última entrada no-sidechain con `usage` y su modelo; `context_window_for_model` establece el denominador y `apply_session_context` calcula el porcentaje.
- `SystemInfo` conecta Rust con `src/types.ts`, `src/lib/bridge.ts`, `App` y `OriginalAppSection`.
- `OriginalAppSection` contiene literalmente «Aplicación compatible» y el banner/modal existente solo corresponde a «Actualizar instancias».

## Alcance

- Añadir `sourceName: string | null` a `SystemInfo`; obtenerlo únicamente de metadatos locales de la instalación original, sin leer perfiles.
- En macOS usar `CFBundleDisplayName` o `CFBundleName` y, como respaldo, el nombre del bundle; en Windows usar `ProductName` y, como respaldo, el stem; en Linux usar nombre de desktop/package/binario y un respaldo legible. El mock será «Claude Desktop».
- Mostrar `sourceName` en la tarjeta original, perfil de transferencia, búsqueda y estado visible; usar «Aplicación compatible» únicamente si no se dispone de metadatos.
- Crear una acción IPC sin parámetros externos para iniciar la actualización de la aplicación original mediante el canal oficial del proveedor, con un resultado honesto como `action: download | instructions` y `message`.
- En macOS y Windows abrir la descarga oficial adecuada para plataforma y arquitectura; en Linux abrir las instrucciones oficiales del repositorio apt. Las URL serán constantes internas y nunca provendrán del usuario.
- Añadir a la tarjeta original un botón accesible y un modal de confirmación separado de «Actualizar instancias». Debe identificar nombre y versión, explicar el handoff al instalador/gestor oficial y advertir que las instancias no cambian automáticamente.
- Al regresar o enfocar la aplicación, reutilizar el escaneo existente para reflejar una versión nueva y ofrecer, por separado, el flujo existente de actualización de instancias.
- Conservar el cálculo local estimado de contexto y usar el modelo de la última respuesta válida de la sesión.
- Actualizar `context_window_for_model` para devolver 1 000 000 para familias o IDs actuales de Opus 5, Opus 4.8/4.7/4.6, Sonnet 5/4.6, Fable 5, Mythos 5 y Mythos Preview; y 200 000 para los modelos conocidos restantes, incluidos Sonnet 4.5 y Haiku 4.5. Incluir aliases fechados, sufijos y wrappers por substring con pruebas.
- Devolver límite y porcentaje no disponibles para modelos desconocidos, sin suponer 200 000. Mantener los umbrales del 70 % y 90 % cuando el límite sea conocido y limitar el porcentaje a 100.
- Mantener el diseño, temas, accesibilidad y estilos existentes sin introducir Tailwind, shadcn/ui ni dependencias.

## Fuera de alcance

- Consultar versiones remotas o descargar e instalar binarios desde Code AI Profiles.
- Reemplazar automáticamente la aplicación original, cerrar procesos, elevar permisos o modificar el bundle original o perfiles.
- Actualizar automáticamente instancias como parte de la misma acción.
- Migrar visualmente el frontend, añadir telemetría, API o inferir una ventana para modelos desconocidos.

## Criterios de aceptación

1. La tarjeta de la aplicación original muestra el `sourceName` real; el texto genérico solo aparece como fallback. Búsqueda, perfil y estado visible son coherentes con ese nombre.
2. Existe un botón accesible para actualizar la aplicación original y es distinto del flujo de actualización de instancias.
3. La confirmación explica el handoff oficial, la plataforma y que las instancias permanecen intactas.
4. La acción solo abre una URL oficial constante apropiada y devuelve un aviso o error claro; no modifica archivos o perfiles ni eleva permisos.
5. macOS, Windows y Linux están cubiertos; Linux dirige a las instrucciones oficiales de apt.
6. `context_window_for_model` implementa la tabla vigente, incluido Opus 4.6 = 1 000 000, Sonnet 4.5 y Haiku 4.5 = 200 000, y modelos desconocidos = `None`.
7. El modelo procede de la última respuesta válida; el porcentaje se recalcula con su ventana y un cambio de modelo se refleja en el siguiente escaneo.
8. La interfaz no muestra límite ni porcentaje inventados cuando el modelo o límite es desconocido.
9. `npm run build`, `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` y `cargo test --manifest-path src-tauri/Cargo.toml` pasan; hay pruebas de nombre/fallback, URL por plataforma/arquitectura y modelos representativos.
10. La documentación funcional y las referencias oficiales quedan actualizadas; el cierre de Graphify lo realiza `architect`.
11. Con `sourcePath` presente y `status === "missing"` por ausencia del perfil original, «Actualizar original» está habilitado si no existe una operación `busy`; durante `busy` permanece deshabilitado.
12. Una invocación de `update_original_application` sin instalación fuente detectada falla antes de abrir el handler del sistema; el helper o guard se prueba para los casos `Some` y `None` y no modifica perfiles.

## Verificación de criterios de aceptación

| Criterio | Estado | Evidencia validada por `architect` |
| --- | --- | --- |
| CA1 | Cumple | `SystemInfo.sourceName` llega de Rust al contrato TypeScript y se usa en tarjeta, búsqueda, perfil de transferencia y footer; el genérico queda como fallback. |
| CA2 | Cumple | La tarjeta original incorpora el control accesible «Actualizar original», separado de «Actualizar instancias». |
| CA3 | Cumple | El modal identifica nombre, versión y plataforma; explica el handoff manual y que perfiles, sesiones e instancias permanecen intactos. |
| CA4 | Cumple | `update_original_application` no recibe argumentos, selecciona constantes internas y devuelve `download` o `instructions` con mensaje; solo abre el handler del sistema y propaga sus fallos. |
| CA5 | Cumple por contrato y pruebas unitarias | El selector cubre macOS universal, Windows x64/ARM64 y documentación apt para Linux. Las ramas nativas Windows/Linux no se compilaron en el host macOS. |
| CA6 | Cumple | Las pruebas cubren familias de 1 000 000, históricos de 200 000 —incluidos Sonnet 4.5 y Haiku 4.5—, Opus 4.6 y modelos desconocidos como `None`. |
| CA7 | Cumple | La lectura inversa selecciona la última respuesta principal válida con uso; una prueba cambia de Sonnet 4.5 a Opus 4.6 y verifica ventana y clamp. |
| CA8 | Cumple | La UI conserva los tokens estimados, pero oculta porcentaje y barra cuando el límite es desconocido y muestra un texto explícito. |
| CA9 | Cumple en el host de revisión | `npm run build`, formato Rust y 19/19 pruebas Rust terminaron correctamente. No se atribuye ejecución nativa en Windows o Linux. |
| CA10 | Cumple | La documentación funcional y las referencias oficiales están actualizadas; `architect` verificó los cierres Graphify de la entrega original y del fix, incluidas consultas de integración e impacto e integridad estructural. |
| CA11 | Cumple | `OriginalAppSection` usa `disabled={busy}` y la sección continúa condicionada por `sourcePath`. Por inspección, `sourcePath` presente, perfil ausente, estado `Missing` y `busy === false` dejan el botón habilitado; `busy === true` lo deshabilita. El build cubre tipos; no se añadió prueba de componente. |
| CA12 | Cumple | `update_original_application` ejecuta primero `require_provider_source(detect_provider_source())`; `None` devuelve «No se encontró la instalación original de la aplicación compatible.» antes de plataforma, destino o handler, y `Some` conserva la ruta. La prueba `requires_a_detected_source_before_updating_the_original_application` cubre ambos casos sin perfiles ni escrituras. |

## Diseño técnico y contratos

- `SystemInfo` incorpora `sourceName: string | null` en Rust, `src/types.ts` y `src/lib/bridge.ts`; backend y frontend coordinan este contrato antes de su consumo visual.
- El backend expone un comando Tauri equivalente a `update_original_application`, sin argumentos externos. Selecciona exclusivamente una URL oficial constante según plataforma y arquitectura y abre el navegador o handler del sistema. El resultado contiene una acción y un mensaje para el aviso de UI; un fallo al abrirlo se propaga como error claro.
- Como defensa en profundidad, el comando valida la existencia de una fuente mediante el helper puro `require_provider_source(Option<PathBuf>) -> Result<PathBuf, String>` antes de resolver plataforma, destino o handler. La ausencia de fuente produce un error y una fuente presente conserva su ruta.
- `OriginalAppSection` ya depende de que exista `sourcePath`; dentro de ella, la ausencia del perfil original no invalida la instalación fuente. Por eso «Actualizar original» se deshabilita solo mientras `busy` sea verdadero.
- La acción no ejecuta descargas, instalaciones, elevación de permisos, cierre de procesos, reemplazos ni cambios de perfiles. Una política empresarial que desactive la actualización automática se trata como una condición del instalador/gestor oficial, no como una operación de la aplicación.
- La detección de nombre no lee contenido de perfiles, transcripts, prompts, respuestas ni credenciales. Solo consulta los metadatos permitidos de la fuente instalada.
- `latest_transcript_context` mantiene la elección de la última entrada no-sidechain que tenga `usage` y modelo. `context_window_for_model` devuelve `Option`/equivalente para diferenciar modelos conocidos de desconocidos; `apply_session_context` calcula el porcentaje solo con un límite conocido y lo limita a 100.
- La tabla de contexto se fundamenta en la documentación oficial de Anthropic, incluidas las familias, aliases fechados, sufijos y wrappers necesarios para reconocer IDs válidos.

## Casos límite, privacidad y plataformas

- Si no se detecta una aplicación fuente, la sección no se monta y una invocación IPC directa falla antes de abrir el handler.
- Si la instalación fuente existe pero falta el perfil original, la tarjeta puede mostrar estado `Missing` y el botón de actualización sigue habilitado mientras no haya una operación `busy`.
- Metadatos vacíos o incompletos usan el fallback legible; la UI usa el genérico solo si no existe `sourceName`.
- Si el original está abierto, el handoff no fuerza su cierre.
- Si falla el navegador o handler, se informa un error claro sin intentar una ruta alternativa no oficial.
- Linux sin repositorio apt recibe únicamente instrucciones oficiales.
- Si el transcript está compactado, no tiene `usage`, cambia de modelo o tiene un ID desconocido, la UI no inventa una capacidad; conserva el comportamiento seguro de datos no disponibles.
- Un conteo de tokens que supere la ventana conocida se representa como máximo 100 %.
- La funcionalidad debe conservar rutas compatibles con macOS, Windows y Linux, y no introduce telemetría, cliente de red ni descarga interna; el acceso al canal oficial queda en manos del handler del sistema.

## Referencias oficiales

- [Descarga oficial de Claude](https://claude.com/download)
- [Instalar Claude Desktop](https://support.claude.com/en/articles/10065433-install-claude-desktop)
- [Desplegar Claude Desktop para macOS](https://support.claude.com/en/articles/12611117-deploy-claude-desktop-for-macos)
- [Ventanas de contexto de Claude](https://platform.claude.com/docs/en/build-with-claude/context-windows)
- [Resumen de modelos Claude](https://platform.claude.com/docs/en/about-claude/models/overview)

## Plan de delegación y entregas

1. `backend` fijó primero los contratos `SystemInfo.sourceName`, `OriginalApplicationUpdateAction` y `OriginalApplicationUpdateResult`; implementó la detección del nombre, el comando Tauri sin argumentos, los destinos oficiales por plataforma/arquitectura, el mapeo de ventanas y las pruebas Rust.
2. `frontend` consumió el contrato, propagó el nombre real por las superficies visibles, añadió el modal y control separados, estados busy/error/deshabilitado, cierre con Escape, semántica accesible y mocks para límites de 1 000 000, 200 000 y desconocidos. Conservó los estilos y temas existentes sin dependencias nuevas.
3. `architect` revisó el diff completo, confirmó que el texto no promete una instalación silenciosa, ejecutó las verificaciones y cerró Graphify con consultas de impacto, integración e integridad.
4. `document` actualizó la HU, el índice y la documentación funcional, y registró la evidencia final suministrada por `architect`.
5. Reapertura: `frontend` corrigió únicamente la condición `disabled` del botón; `backend` añadió el guard puro de fuente y su prueba. `architect` validó la regresión y completó el cierre final de Graphify.

## Plan y resultado de pruebas

Resultados comunicados y validados por `architect`:

- `npm run build`: correcto; Vite transformó 45 módulos.
- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`: correcto.
- `cargo test --manifest-path src-tauri/Cargo.toml`: correcto; 19 de 19 pruebas aprobadas.
- Las pruebas Rust cubren sanitización y fallback de nombre, lectura del nombre principal de un desktop entry, destinos oficiales por plataforma/arquitectura, modelos representativos y wrappers, modelo desconocido, última respuesta principal válida, cambio de modelo, clamp al 100 % y limpieza del contexto tras compactación.
- `git diff --check` y la revisión del diff completo: correctos.
- La revisión frontend confirmó distinción entre actualización original e instancias, textos de instalación manual, estados busy/error/deshabilitado, Escape, accesibilidad, temas y ausencia de Tailwind o dependencias nuevas.
- No se ejecutaron builds nativos de Windows o Linux; la cobertura de esas ramas corresponde a inspección y pruebas unitarias del selector, no a validación en esos sistemas.
- Graphify: `architect` ejecutó la actualización, revisó impacto e integración y validó `graph:check` sobre un snapshot completo equivalente al estado que tendrá el commit.

Resultado de regresión de la reapertura, validado por `architect`:

- Inspección frontend: con `sourcePath` presente y estado `Missing`, `disabled={busy}` deja el botón habilitado cuando `busy` es falso y lo deshabilita cuando es verdadero. No se añadió una prueba de componente; el build valida los tipos.
- Backend: `require_provider_source` cubre `Some` y `None`; la prueba `requires_a_detected_source_before_updating_the_original_application` confirma la ruta preservada y el error previo al handler, sin perfiles ni escrituras.
- `npm run build`: correcto; Vite transformó 45 módulos.
- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`: correcto.
- `cargo test --manifest-path src-tauri/Cargo.toml`: correcto; 20 de 20 pruebas aprobadas.
- `git diff --check`: correcto.
- Graphify del fix: `architect` reconstruyó el grafo, verificó el consumidor directo de `require_provider_source`, ejecutó la consulta de integración y comprobó su integridad estructural.

## Documentación afectada

- `docs/actualizaciones.document.md`: actualizada con el flujo oficial, la separación fuente/perfil, la defensa IPC, plataformas, seguridad y referencias.
- `docs/sesiones.document.md`: creada con el cálculo estimado, modelo fuente, ventanas conocidas, estado desconocido, compactación y privacidad.
- `README.md`: actualizado porque el nombre detectado, el handoff oficial y los límites de contexto son comportamientos visibles; también se corrigieron los umbrales publicados a 70 % y 90 %.

## Bitácora de implementación

- 2026-08-13: `architect` entregó el brief con evidencia de Graphify, contratos, alcance, casos límite, criterios verificables y fuentes oficiales.
- 2026-08-13: se creó la HU en estado `Ready`; aún no hay implementación, pruebas ejecutadas ni desviaciones reportadas.
- 2026-08-13: `backend` entregó los contratos compartidos, detección de nombre, handoff oficial, mapeo de contexto y pruebas; `frontend` entregó las superficies, modal, estados y mocks correspondientes.
- 2026-08-13: `architect` validó el diff, el wording, el build frontend, el formato Rust y 19/19 pruebas Rust.
- 2026-08-13: se corrigió la descripción histórica del problema: existía reconocimiento parcial de ventanas de 1 000 000, pero había omisiones y un fallback genérico de 200 000 para IDs `claude-*`.
- 2026-08-13: `document` creó las guías funcionales, actualizó README y movió la HU a `Review`, a la espera del cierre de Graphify.
- 2026-08-13: `architect` reconstruyó y verificó Graphify; `document` registró el cierre y movió la HU a `Done`.
- 2026-08-13: `architect` solicitó reabrir HU-0002 al detectar que el estado `Missing` del perfil bloquea incorrectamente la actualización de una instalación fuente existente; se añadieron CA11 y CA12 y la HU volvió a `Ready`.
- 2026-08-13: `frontend` desacopló el botón del estado del perfil y `backend` añadió `require_provider_source` como primera validación del IPC, con prueba `Some`/`None`.
- 2026-08-13: `architect` validó CA11 por inspección y build, CA12 mediante la nueva prueba, el build de 45 módulos, formato Rust, 20/20 pruebas Rust y `git diff --check`; la HU pasó a `Review`.
- 2026-08-13: `architect` actualizó y verificó Graphify para el fix; `document` registró la evidencia final y movió HU-0002 a `Done`.

## Resultado y riesgos residuales

La implementación previa, el fix de regresión, sus verificaciones y el cierre Graphify satisfacen CA1–CA12. Una instalación fuente detectada puede abrir el canal oficial aunque falte su perfil, mientras que el IPC directo rechaza una fuente ausente antes de resolver o ejecutar el handler.

La acción conserva sus límites: abre el canal oficial y deja la instalación en manos del usuario y del sistema; no consulta una versión remota ni modifica la aplicación original, perfiles o instancias. Los modelos no reconocidos permanecen explícitamente sin límite para evitar decisiones de compactación incorrectas.

Persisten riesgos controlados: las ramas nativas de Windows y Linux no fueron compiladas en el host macOS; CA11 se verificó por inspección y build, sin prueba de componente; existe una ventana TOCTOU entre detectar la fuente y abrir el handler, pero no implica escrituras ni cambios de perfil; la detección depende de PowerShell y `ProductName` en Windows, de desktop entries en ubicaciones estándar en Linux y de herramientas/handlers del sistema; las políticas empresariales pueden condicionar el instalador oficial; y los endpoints, familias o aliases pueden evolucionar y requerir mantenimiento documental y de código.

## Cierre de Graphify

Evidencia suministrada y verificada por `architect`:

### Primer cierre — CA1 a CA10

- `npm run graph:update` reconstruyó los artefactos versionados con 527 nodos, 1 022 relaciones y 35 comunidades. El grafo incluye `source_display_name()`, `context_window_for_model()`, `update_original_application()`, esta HU y las guías `docs/actualizaciones.document.md` y `docs/sesiones.document.md`.
- `graphify affected "update_original_application"` no encontró consumidores aguas abajo en profundidad 2. Este resultado es coherente: el símbolo es un endpoint IPC registrado, no una función invocada por Rust.
- La consulta final `graphify query "HU-0002 source_display_name update_original_application context_window_for_model y superficies frontend afectadas" --budget 3500` encontró 110 nodos y conectó los tres símbolos backend con `system_info`, `latest_transcript_context`, el contrato compartido, el frontend, la HU y las guías funcionales.
- La comprobación de integridad JSON encontró 0 endpoints colgantes, 0 self-loops y 0 IDs de nodo duplicados.
- En el worktree real, `npm run graph:check` informa que los artefactos difieren de `HEAD`, lo esperado mientras esta iteración permanece sin commit. Para comprobar el estado que tendrá el commit sin modificar el repositorio, `architect` copió el snapshot completo a `/tmp/code-ai-graph-check.L3466I`, creó allí un commit exclusivamente de validación y obtuvo «Graphify está actualizado» al ejecutar `npm run graph:check`.
- No se creó ningún commit ni se realizó push en el repositorio real durante esta validación.

### Cierre del fix — CA11 y CA12

- `npm run graph:update` reconstruyó los artefactos con 532 nodos, 1 033 relaciones y 36 comunidades.
- `graphify affected "require_provider_source"` mostró `update_original_application()` como consumidor directo mediante una relación `calls` en `src-tauri/src/lib.rs:L2591`.
- La consulta de integración `fix HU-0002 require_provider_source update_original_application botón actualizar original busy status missing` encontró 140 nodos y conectó el guard, el endpoint, `detect_provider_source`, `original_instance_status`, la HU y `docs/actualizaciones.document.md`.
- La comprobación de integridad encontró 0 endpoints colgantes, 0 self-loops y 0 IDs de nodo duplicados.
- Las verificaciones asociadas permanecen correctas: build frontend de 45 módulos, formato Rust, 20/20 pruebas Rust y `git diff --check`.

Después de registrar el estado `Done`, `architect` reejecutó `graph:update`; no hubo cambios de topología posteriores a la corrección de métricas. `npm run graph:check` pasó en el snapshot completo temporal `/tmp/code-ai-graph-check.L3466I`, equivalente al estado final. No se creó ningún commit ni se realizó push en el repositorio real.
