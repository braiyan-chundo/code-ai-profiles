# Bitácora · HU-0011 · Adopción v4

Una línea por evento, en orden: fase, despacho, SHA, aprobación (con sus palabras), veredicto, decisión.
Se añade al final, nunca se reescribe. La escriben `hu.mjs` (fase, estado, log) y el orquestador.

| Fecha | Quién | Qué |
| --- | --- | --- |
| 2026-10-27 17:21 | hu.mjs | creada: «Adopción v4» · fase requisitos |
| 2026-10-27 17:21 | hu.mjs | fase requisitos → implementacion (forzado: adopción: el andamiaje ya está hecho) |
| 2026-10-27 17:21 | hu.mjs | estado en-proceso → en-proceso · adopción en curso |
| 2026-10-27 17:22 | orquestador | config.mjs check --todo: 4 lecturas sueltas de process.env (GRAPHIFY_BIN, HOME) en scripts/graphify.mjs:14-19. Es tooling de desarrollo: decidir si se exceptúa en config.codigo o se refactoriza. |
| 2026-10-27 17:22 | orquestador | Andamiaje v4 hecho: config, iniciar, reglas por rol, HU-0010 migrada, ADR-0001, guías heredadas. Validaciones en verde. |
| 2026-10-27 17:46 | orquestador | Pack rust-tauri forjado como borrador en hu/HU-0011-adopcion-v4/pack-rust-tauri/ desde src-tauri/ y la documentación de Tauri 2. No se instala: .metodo/metodologia/** está protegida por settings (deny Edit). Pendiente: revisión del mantenedor e instalación. |
| 2026-10-27 17:46 | orquestador | Skill code-ai-profiles-frontend-react-vite reescrita al proyecto real: CSS propio con tokens de DESIGN.md, sin Tailwind ni shadcn, Icons.tsx, bridge.ts, controladores puros, node --test y npm. Se retiran los anexos datos-y-estado.md y tiempo-real.md (TanStack/Zustand/Socket.IO no aplican). |
| 2026-10-27 17:46 | orquestador | Decisión de Braiyan Rodriguez sobre HU-0005: «Cerrar y abrir Dock». HU-0005 heredada → Done en docs/archivo/previo/hu/; el Dock pasa a HU-0012 en espera. |
| 2026-10-27 17:46 | orquestador | Decisión de Braiyan Rodriguez sobre Codex: «se hace lo que dice la metodologia v4». Según adopcion.md §4 (otras herramientas de IA → original al archivo), .codex/ y .agents/skills/graphify se mueven a docs/archivo/previo/; .graphifyignore apunta a las nuevas rutas. |
| 2026-10-27 17:46 | orquestador | Hallazgo: el gate de configuración no revisa .rs; la URL del feed oficial está escrita en src-tauri/src/lib.rs:1913. Anotada como deuda en la skill rust-tauri. |
| 2026-10-27 20:35 | orquestador | Revisión técnica: FAIL (R-1 rutas/entorno, R-2 relacionadas sin pruebas) → corregidos R-1…R-14 → re-revisión PASS. Skill rust-tauri instalada como skill del proyecto (D-1) y regla en reglas/backend.md; cargo test en stack.comandos.relacionadas; .graphifyignore ignora los adaptadores archivados; grafo actualizado. Pendientes de la adopción → HU-0013 (en espera). |
| 2026-10-27 20:35 | orquestador | Veredicto de Braiyan Rodriguez: «cerra todo con lo recomendado». |
| 2026-10-27 20:35 | hu.mjs | estado en-proceso → terminada |
