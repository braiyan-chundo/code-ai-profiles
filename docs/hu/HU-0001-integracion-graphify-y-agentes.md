# HU-0001 — Integrar Graphify y agentes especializados

## Metadatos

- Estado: `Done`
- Creada: 2026-08-13
- Actualizada: 2026-08-13
- Solicitante: mantenedor del proyecto
- Orquestación: `architect`
- Documentación: `document`
- Implementación: bootstrap del sistema de agentes

## Historia de usuario

Como mantenedor, quiero que cualquier IA que trabaje en el repositorio consulte y mantenga un grafo del código y use agentes especializados, para que cada feature o fix tenga análisis, implementación y documentación trazables.

## Problema

El repositorio no tenía un mapa persistente de relaciones del código ni un contrato formal para separar análisis, backend, frontend y documentación. Las iteraciones podían comenzar sin una especificación verificable y terminar con documentación o contexto arquitectónico desactualizados.

## Contexto y evidencia de Graphify

Esta HU crea el grafo inicial, por lo que no existía una consulta previa. El cierre debe generar `graphify-out/graph.json`, `GRAPH_REPORT.md` y el manifiesto incremental; las siguientes HU deberán consultar esos artefactos antes del análisis.

## Alcance

- Instalar la skill oficial de Graphify para Codex y para herramientas compatibles con Agent Skills.
- Añadir comandos reproducibles para construir, actualizar y validar el grafo local de código.
- Versionar el grafo, reporte y manifiesto; excluir cachés y rutas locales.
- Definir roles portables `architect`, `backend`, `frontend` y `document`.
- Añadir adaptadores Codex con modelos y niveles de razonamiento diferentes.
- Establecer creación, índice, ciclo de vida y cierre de HU.
- Documentar el flujo y añadir una validación de CI para detectar grafos desactualizados.

## Fuera de alcance

- Migrar el frontend actual a Tailwind o shadcn/ui.
- Cambiar comportamiento o diseño de la aplicación.
- Añadir agentes al runtime del producto.
- Usar un LLM o enviar código a servicios externos para construir el grafo.

## Criterios de aceptación

1. Existe un grafo local generado únicamente mediante AST y sus artefactos portables están versionados.
2. Toda feature/fix debe pasar por `architect`, una HU única, agentes implementadores y cierre documental/gráfico.
3. Codex puede descubrir cuatro agentes personalizados con los modelos solicitados.
4. Otras IAs pueden cargar definiciones neutrales desde `.agents/roles/`.
5. `frontend` conserva el diseño actual y solo permite Tailwind/shadcn para superficies nuevas autorizadas.
6. `document` mantiene HU y `docs/<area>.document.md`, pero no puede actualizar Graphify.
7. CI falla si el código cambia y los artefactos de Graphify no se actualizan.
8. El build frontend, las pruebas Rust, el parseo TOML y la verificación del grafo terminan correctamente.

## Diseño técnico y contratos

- `AGENTS.md` es el contrato de entrada compatible con herramientas que soportan instrucciones de repositorio.
- `.agents/roles/*.md` contiene roles canónicos neutrales.
- `.codex/agents/*.toml` adapta los roles a agentes personalizados de Codex.
- `docs/hu/index.md` es la única fuente para estado y asignación de IDs.
- `scripts/graphify.mjs` usa Graphify fijado por `.graphify-version` y ofrece `build`, `update` y `check`.
- Graphify indexa código localmente con `--code-only`; ninguna clave ni contenido se envía a un modelo externo.

## Casos límite, privacidad y plataformas

- El ejecutable puede estar en PATH, en `~/.local/bin` o disponible mediante `uvx`.
- El hook generado con una ruta absoluta local no se versiona.
- El manifiesto usa rutas relativas para funcionar en clones y en macOS, Windows y Linux.
- Cachés, HTML y archivos temporales permanecen ignorados.
- Schemas, assets generados y las copias de la skill se excluyen del corpus para evitar ruido y duplicados.

## Plan de delegación

- `architect`: reglas, secuencia, criterios y cierre.
- `backend`: no requerido; no cambia producto.
- `frontend`: no requerido; no cambia producto.
- `document`: estructura de HU, índice y documentación estable.

## Plan y resultado de pruebas

- `tomllib`: configuración general y cuatro agentes parseados correctamente.
- `node --check scripts/graphify.mjs`: wrapper válido.
- `npm run build`: build React/Vite correcto.
- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`: formato correcto.
- `cargo test --manifest-path src-tauri/Cargo.toml`: 15 pruebas aprobadas.
- Graphify: grafo y reporte generados; sin endpoints faltantes, relaciones duplicadas, self-loops ni colapsos.
- Idempotencia: dos actualizaciones consecutivas conservaron los mismos hashes de grafo, reporte y manifiesto.
- Simulación de CI: se detectó y normalizó la diferencia exclusiva de `mtime` de un clon limpio, manteniendo estricta la comparación de hashes reales.
- Consulta de impacto: el grafo relacionó `App.tsx`, `src/lib/bridge.ts`, contratos TypeScript, configuración Tauri, backend Rust y el nuevo wrapper Graphify.

## Documentación afectada

- `README.md`
- `CONTRIBUTING.md`
- `docs/agents.document.md`
- `docs/graphify.document.md`

## Bitácora de implementación

- 2026-08-13: se confirmó que los agentes son herramientas de desarrollo, no funciones del producto.
- 2026-08-13: se acordó no migrar el frontend actual y mantener su design system.
- 2026-08-13: se fijó Graphify 0.9.32 y se instalaron sus skills de proyecto.
- 2026-08-13: se añadieron roles portables, adaptadores Codex, comandos, CI y documentación.

## Resultado y riesgos residuales

El flujo queda preparado para futuras iteraciones. Otras herramientas de IA deben soportar `AGENTS.md` o cargar manualmente el rol canónico. Los nombres de modelo de `.codex/agents/` dependen de que dichos modelos estén disponibles en la instalación de Codex utilizada.

## Cierre de Graphify

El arquitecto generó el grafo inicial después de implementar esta HU, comprobó el nombre real del manifiesto producido por la versión fijada y verificó que los artefactos portables reflejan el estado final del código sin problemas de integridad.
