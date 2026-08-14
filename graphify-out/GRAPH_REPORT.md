# Graph Report - Code AI Profiles  (2026-08-13)

## Corpus Check
- 32 files · ~23,070 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 471 nodes · 926 edges · 29 communities (28 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c683a171`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- lib.rs
- String
- scripts
- App.tsx
- bundle
- compilerOptions
- Icons.tsx
- bridge.ts
- permissions
- graphify.mjs
- compilerOptions
- tauri.linux.conf.json
- CodeSession
- app
- formatModelName
- vite-env.d.ts
- Sistema de agentes de desarrollo
- HU-0001 — Integrar Graphify y agentes especializados
- Code AI Profiles
- DESIGN.md
- Rol: architect
- Rol: document
- Contrato de desarrollo asistido por IA
- Rol: backend
- Rol: frontend
- PULL_REQUEST_TEMPLATE.md

## God Nodes (most connected - your core abstractions)
1. `copy_code_session_sync()` - 22 edges
2. `dashboard_from()` - 21 edges
3. `update_instance_application_sync()` - 20 edges
4. `scan_system()` - 18 edges
5. `load_registry()` - 17 edges
6. `unlink_code_session_sync()` - 16 edges
7. `system_info()` - 16 edges
8. `compilerOptions` - 16 edges
9. `HU-0001 — Integrar Graphify y agentes especializados` - 16 edges
10. `Registry` - 15 edges

## Surprising Connections (you probably didn't know these)
- `SessionTransferSelection` --references--> `CodeSession`  [EXTRACTED]
  src/App.tsx → src/types.ts
- `SessionTransferSelection` --references--> `SessionProfile`  [EXTRACTED]
  src/App.tsx → src/types.ts
- `SessionUnlinkSelection` --references--> `CodeSession`  [EXTRACTED]
  src/App.tsx → src/types.ts
- `SessionUnlinkSelection` --references--> `SessionProfile`  [EXTRACTED]
  src/App.tsx → src/types.ts
- `InstanceCardProps` --references--> `CodeSession`  [EXTRACTED]
  src/App.tsx → src/types.ts

## Import Cycles
- None detected.

## Communities (29 total, 1 thin omitted)

### Community 0 - "lib.rs"
Cohesion: 0.06
Nodes (76): CodeSession, Default, HashMap, InstanceStatus, ManagedInstance, Option, Path, PathBuf (+68 more)

### Community 1 - "String"
Cohesion: 0.17
Nodes (46): AppHandle, Result, atomic_replace_file(), atomically_creates_and_replaces_session_index(), clean_session_text(), copy_code_session(), copy_code_session_sync(), copy_provider_application() (+38 more)

### Community 2 - "scripts"
Cohesion: 0.05
Nodes (39): @fontsource/inter, @fontsource/jetbrains-mono, dependencies, @fontsource/inter, @fontsource/jetbrains-mono, react, react-dom, @tauri-apps/api (+31 more)

### Community 3 - "App.tsx"
Cohesion: 0.09
Nodes (17): App(), AppearancePreferences, ApplicationUpdateProgress, AppTheme, DEFAULT_APPEARANCE, EMPTY_STATE, formatBytes(), formatTokenCount() (+9 more)

### Community 4 - "bundle"
Cohesion: 0.07
Nodes (29): icons/128x128@2x.png, icons/128x128.png, icons/32x32.png, icons/icon.icns, icons/icon.ico, app, macOSPrivateApi, security (+21 more)

### Community 5 - "compilerOptions"
Cohesion: 0.09
Nodes (22): DOM, DOM.Iterable, ES2022, src, compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop (+14 more)

### Community 6 - "Icons.tsx"
Cohesion: 0.09
Nodes (20): AlertIcon(), ChevronIcon(), ClockIcon(), CloudIcon(), CodeSessionIcon(), EditIcon(), FolderIcon(), HardDriveIcon() (+12 more)

### Community 7 - "bridge.ts"
Cohesion: 0.13
Nodes (17): bridge, call(), isTauri(), mockInstances, mockOriginalSessions, now, CopyCodeSessionRequest, CreateInstanceRequest (+9 more)

### Community 8 - "permissions"
Cohesion: 0.17
Nodes (11): core:default, core:window:allow-close, core:window:allow-minimize, core:window:allow-start-dragging, core:window:allow-toggle-maximize, main, description, identifier (+3 more)

### Community 9 - "graphify.mjs"
Cohesion: 0.18
Nodes (10): candidates, graphDir, graphify, graphPath, projectRoot, reportPath, run(), runGraphify() (+2 more)

### Community 10 - "compilerOptions"
Cohesion: 0.22
Nodes (8): vite.config.ts, compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 11 - "tauri.linux.conf.json"
Cohesion: 0.25
Nodes (7): appimage, deb, app, windows, bundle, targets, $schema

### Community 12 - "CodeSession"
Cohesion: 0.40
Nodes (6): InstanceCardProps, SessionTransferSelection, SessionUnlinkSelection, CodeSession, ManagedInstance, SessionProfile

### Community 13 - "app"
Cohesion: 0.40
Nodes (4): app, macOSPrivateApi, windows, $schema

### Community 14 - "formatModelName"
Cohesion: 0.67
Nodes (4): formatModelName(), formatSessionTime(), InstanceCard(), OriginalAppSection()

### Community 19 - "Sistema de agentes de desarrollo"
Cohesion: 0.08
Nodes (22): Agentes de desarrollo, Antes de programar, Contribuir a Code AI Profiles, Licencia de las contribuciones, Privacidad y seguridad, Pull requests, Verificación local, Definiciones y adaptadores (+14 more)

### Community 20 - "HU-0001 — Integrar Graphify y agentes especializados"
Cohesion: 0.12
Nodes (16): Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Diseño técnico y contratos, Documentación afectada (+8 more)

### Community 21 - "Code AI Profiles"
Cohesion: 0.13
Nodes (15): Code AI Profiles, Compatibilidad actual y marcas, Contribuir, Crear cada versión, Cómo funciona el aislamiento, Desarrollo asistido por IA y Graphify, Desarrollo local, Funciones principales (+7 more)

### Community 22 - "DESIGN.md"
Cohesion: 0.25
Nodes (7): Brand & Style, Colors, Components, Elevation & Depth, Layout & Spacing, Shapes, Typography

### Community 23 - "Rol: architect"
Cohesion: 0.29
Nodes (6): Entrega esperada, Misión, Perfil recomendado, Proceso obligatorio, Restricciones, Rol: architect

### Community 24 - "Rol: document"
Cohesion: 0.29
Nodes (6): Estructura mínima de una HU, Misión, Perfil recomendado, Proceso obligatorio, Restricciones, Rol: document

### Community 25 - "Contrato de desarrollo asistido por IA"
Cohesion: 0.33
Nodes (5): Contrato de desarrollo asistido por IA, Flujo obligatorio para features y fixes, Graphify, Límites de los roles, Reglas del repositorio

### Community 26 - "Rol: backend"
Cohesion: 0.33
Nodes (5): Misión, Perfil recomendado, Proceso obligatorio, Reglas críticas, Rol: backend

### Community 27 - "Rol: frontend"
Cohesion: 0.33
Nodes (5): Misión, Perfil recomendado, Proceso obligatorio, Reglas críticas, Rol: frontend

### Community 28 - "PULL_REQUEST_TEMPLATE.md"
Cohesion: 0.50
Nodes (3): Autorización previa, Resumen, Verificación

## Knowledge Gaps
- **192 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+187 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `HU-0001 — Integrar Graphify y agentes especializados` connect `HU-0001 — Integrar Graphify y agentes especializados` to `Sistema de agentes de desarrollo`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `Code AI Profiles` connect `Code AI Profiles` to `Sistema de agentes de desarrollo`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `ManagedInstance` connect `lib.rs` to `String`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _192 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `lib.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.05987703822507351 - nodes in this community are weakly interconnected._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08505747126436781 - nodes in this community are weakly interconnected._