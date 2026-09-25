# Contrato de desarrollo asistido por IA

Estas reglas aplican a cualquier IA que analice o modifique este repositorio. Las definiciones canónicas de roles están en `.agents/roles/`; los adaptadores ejecutables de Codex están en `.codex/agents/`.

## Flujo obligatorio para features y fixes

1. Entregar la petición al rol `architect`. En Codex, iniciar el agente personalizado `architect`; en otras herramientas, cargar `.agents/roles/architect.md` como instrucciones del agente principal.
2. Antes de abrir archivos fuente de forma amplia, consultar el grafo con `npm run graph:update` si está pendiente y `graphify query "<objetivo y área afectada>"`. Usar `graphify path`, `graphify explain` o `graphify affected` cuando corresponda.
3. El arquitecto analiza alcance, riesgos, contratos, pruebas e impacto y entrega al agente `document` un brief estructurado de HU. No implementa código.
4. `document` asigna el siguiente identificador secuencial `HU-XXXX`, crea `docs/hu/HU-XXXX-<slug>.md` y agrega una sola entrada a `docs/hu/index.md`. No modifica Graphify.
5. Solo cuando la HU esté en estado `Ready`, el arquitecto delega trabajo acotado a `backend`, `frontend` o ambos. Evitar ediciones paralelas sobre los mismos archivos; definir primero cualquier contrato compartido.
6. Cada implementador lee la HU y consulta el grafo antes de editar. Debe limitarse al alcance delegado, ejecutar verificaciones proporcionales y devolver al arquitecto archivos cambiados, pruebas, riesgos y decisiones.
7. El arquitecto revisa la integración contra todos los criterios de aceptación. Después entrega los resultados a `document`, que actualiza la HU, su índice y la documentación funcional en `docs/<area>.document.md`.
8. Al finalizar cualquier iteración con cambios de código, ejecutar `npm run graph:update`, revisar `graphify affected "<símbolo principal>"` o una consulta equivalente y ejecutar `npm run graph:check`. El arquitecto es responsable de este cierre; `document` queda explícitamente excluido.
9. Una feature o fix no está terminada si la HU, las pruebas, la documentación aplicable o los artefactos versionados de Graphify están desactualizados.

## Límites de los roles

- `architect`: analiza, decide y orquesta. Usa el modelo de mayor capacidad disponible.
- `backend`: implementa Rust/Tauri, comandos, almacenamiento local, procesos, plataformas e integraciones con aplicaciones de IA compatibles.
- `frontend`: implementa React/Vite y UX/UI. Conserva el diseño actual. No migra el frontend existente; para nuevas superficies puede usar Tailwind y shadcn/ui únicamente si se integran sin romper el design system descrito en `DESIGN.md`.
- `document`: crea y mantiene HU, índices y documentación. No implementa producto ni actualiza el grafo.

## Reglas del repositorio

- Preservar la privacidad: no leer, registrar ni exponer credenciales, cookies, tokens, prompts, respuestas o transcripts fuera de los metadatos explícitamente permitidos.
- Mantener compatibilidad macOS, Windows y Linux. Si una implementación es específica de plataforma, documentar y probar sus rutas alternativas.
- No introducir dependencias, permisos invasivos, telemetría o acceso de red sin que la HU lo justifique y el cliente lo autorice.
- Ejecutar como mínimo `npm run build` para frontend/contratos TypeScript y `cargo test --manifest-path src-tauri/Cargo.toml` para backend Rust cuando el área cambie.

## Graphify

This project has a knowledge graph at `graphify-out/` with god nodes, community structure, and cross-file relationships.

When the user types `$graphify` or `/graphify`, use the installed Graphify skill before doing anything else. The portable skill is at `.agents/skills/graphify/SKILL.md`; Codex also has `.codex/skills/graphify/SKILL.md`.

Rules:

- For codebase questions, first run `graphify query "<question>"` when `graphify-out/graph.json` exists. Use `graphify path "<A>" "<B>"`, `graphify explain "<concept>"`, or `graphify affected "<concept>"` for focused relationships.
- Dirty `graphify-out/` files are expected after incremental updates and are not a reason to skip Graphify.
- Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review or when targeted graph commands do not surface enough context.
- After modifying code, run `npm run graph:update` to keep the graph current using local AST extraction with no API cost.
- Do not hand-edit `graphify-out/graph.json`, `graphify-out/GRAPH_REPORT.md`, or `graphify-out/manifest.json`.
