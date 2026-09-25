# Graph Report - Code AI Profiles  (2026-09-25)

## Corpus Check
- 36 files · ~35,843 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 601 nodes · 1200 edges · 46 communities (43 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ca9c4acb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- lib.rs
- String
- scripts
- App.tsx
- bundle
- compilerOptions
- Path
- bridge.ts
- permissions
- graphify.mjs
- compilerOptions
- tauri.linux.conf.json
- CodeSession
- app
- InstanceCard
- vite-env.d.ts
- README.md
- HU-0001 — Integrar Graphify y agentes especializados
- Code AI Profiles
- DESIGN.md
- Rol: architect
- Rol: document
- Contrato de desarrollo asistido por IA
- Rol: backend
- Rol: frontend
- PULL_REQUEST_TEMPLATE.md
- HU-0002 — Actualizar la aplicación original y mostrar metadatos precisos por modelo y proveedor
- Actualizaciones de la aplicación original y las instancias
- ManagedInstance
- Sesiones y estimación de contexto
- Sistema de agentes de desarrollo
- Grafo de conocimiento con Graphify
- Contribuir a Code AI Profiles
- Option
- HU-0003 — Transferencias conscientes de artefactos, actualización disponible y uso en vivo
- check_source_update_sync
- Icons.tsx
- CodeSession
- session_index_for_target
- SessionLinkRegistry
- .default
- deserialize_collection_count
- TranscriptEntry

## God Nodes (most connected - your core abstractions)
1. `copy_code_session_sync()` - 25 edges
2. `dashboard_from()` - 21 edges
3. `update_instance_application_sync()` - 20 edges
4. `HU-0002 — Actualizar la aplicación original y mostrar metadatos precisos por modelo y proveedor` - 19 edges
5. `load_registry()` - 18 edges
6. `scan_system()` - 18 edges
7. `HU-0003 — Transferencias conscientes de artefactos, actualización disponible y uso en vivo` - 18 edges
8. `system_info()` - 17 edges
9. `check_source_update_sync()` - 16 edges
10. `unlink_code_session_sync()` - 16 edges

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

## Communities (46 total, 3 thin omitted)

### Community 0 - "lib.rs"
Cohesion: 0.08
Nodes (19): atomically_creates_and_replaces_session_index(), contains_model_alias(), context_window_for_model(), migrates_existing_round_trip_as_a_link_to_the_original(), original_application_update_target(), OriginalApplicationUpdateAction, OriginalApplicationUpdateResult, OriginalApplicationUpdateTarget (+11 more)

### Community 1 - "String"
Cohesion: 0.13
Nodes (59): AppHandle, ManagedInstance, Result, atomic_replace_file(), canonical_code_session_id(), check_source_update(), clean_session_text(), copy_code_session() (+51 more)

### Community 2 - "scripts"
Cohesion: 0.05
Nodes (39): @fontsource/inter, @fontsource/jetbrains-mono, dependencies, @fontsource/inter, @fontsource/jetbrains-mono, react, react-dom, @tauri-apps/api (+31 more)

### Community 3 - "App.tsx"
Cohesion: 0.08
Nodes (17): App(), AppearancePreferences, ApplicationUpdateProgress, AppTheme, DEFAULT_APPEARANCE, EMPTY_STATE, formatBytes(), formatTokenCount() (+9 more)

### Community 4 - "bundle"
Cohesion: 0.07
Nodes (29): icons/128x128@2x.png, icons/128x128.png, icons/32x32.png, icons/icon.icns, icons/icon.ico, app, macOSPrivateApi, security (+21 more)

### Community 5 - "compilerOptions"
Cohesion: 0.09
Nodes (22): DOM, DOM.Iterable, ES2022, src, compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop (+14 more)

### Community 6 - "Path"
Cohesion: 0.19
Nodes (23): HashMap, Path, PathBuf, SourceUpdateInfo, code_transcript_catalog(), collect_code_session_files(), collect_code_transcripts(), detect_original_profile() (+15 more)

### Community 7 - "bridge.ts"
Cohesion: 0.10
Nodes (24): bridge, call(), isTauri(), mockInstances, mockOriginalSessions, now, ArtifactMonitorSummary, CopyCodeSessionRequest (+16 more)

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

### Community 14 - "InstanceCard"
Cohesion: 0.50
Nodes (5): formatCaptureTime(), formatModelName(), formatSessionTime(), InstanceCard(), OriginalAppSection()

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

### Community 29 - "HU-0002 — Actualizar la aplicación original y mostrar metadatos precisos por modelo y proveedor"
Cohesion: 0.10
Nodes (21): Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Cierre del fix — CA11 y CA12, Contexto y evidencia de Graphify, Criterios de aceptación, Diseño técnico y contratos (+13 more)

### Community 30 - "Actualizaciones de la aplicación original y las instancias"
Cohesion: 0.17
Nodes (9): Actualizaciones de la aplicación original y las instancias, Comportamiento por plataforma, Detección de versión disponible, Dos operaciones independientes, Errores y limitaciones, Flujo de actualización original, Límites de seguridad, Nombre y estado de la aplicación original (+1 more)

### Community 31 - "ManagedInstance"
Cohesion: 0.40
Nodes (5): CodeSession, InstanceStatus, AccountPlan, ManagedInstance, UsageStats

### Community 32 - "Sesiones y estimación de contexto"
Cohesion: 0.20
Nodes (10): Compactación y ausencia de datos, Cálculo y señales visuales, Mantenimiento de modelos y aliases, Origen y alcance del dato, Privacidad, Referencias oficiales, Sesiones y estimación de contexto, Transferencia de sesiones, artefactos y monitores (+2 more)

### Community 33 - "Sistema de agentes de desarrollo"
Cohesion: 0.29
Nodes (7): Definiciones y adaptadores, Flujo, Historias de usuario, Modelos de Codex, Propósito, Sistema de agentes de desarrollo, Uso fuera de Codex

### Community 34 - "Grafo de conocimiento con Graphify"
Cohesion: 0.29
Nodes (7): Artefactos versionados, Comandos, Grafo de conocimiento con Graphify, Instalación, Privacidad, Propósito, Regla de cierre

### Community 35 - "Contribuir a Code AI Profiles"
Cohesion: 0.33
Nodes (6): Antes de programar, Contribuir a Code AI Profiles, Licencia de las contribuciones, Privacidad y seguridad, Pull requests, Verificación local

### Community 36 - "Option"
Cohesion: 0.21
Nodes (17): Option, ArtifactMonitorSummary, clean_monitor_state(), CodeSessionDocument, latest_artifact_monitor(), linux_desktop_name(), macos_bundle_value(), normalize_linux_version() (+9 more)

### Community 37 - "HU-0003 — Transferencias conscientes de artefactos, actualización disponible y uso en vivo"
Cohesion: 0.10
Nodes (21): Actualización disponible, Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Diseño técnico y contratos (+13 more)

### Community 38 - "check_source_update_sync"
Cohesion: 0.27
Nodes (11): SourceUpdateSource, SourceUpdateStatus, check_apt_update(), check_official_update_feed(), check_source_update_sync(), parse_apt_policy(), read_source_update_cache(), SourceUpdateCache (+3 more)

### Community 39 - "Icons.tsx"
Cohesion: 0.09
Nodes (20): AlertIcon(), ChevronIcon(), ClockIcon(), CloudIcon(), CodeSessionIcon(), EditIcon(), FolderIcon(), HardDriveIcon() (+12 more)

### Community 40 - "CodeSession"
Cohesion: 0.18
Nodes (11): ArtifactMonitorSummary, SessionTransferInfo, applies_the_latest_model_context_and_clamps_percentage(), apply_session_context(), clears_context_after_compaction_until_the_next_response(), CodeSession, latest_transcript_context(), parse_code_session() (+3 more)

### Community 41 - "session_index_for_target"
Cohesion: 0.40
Nodes (6): published_artifacts(), restored_origin_artifacts(), restores_origin_artifacts_from_the_transaction_backup(), sanitizes_artifacts_using_only_the_target_profile_ownership(), session_index_for_target(), Value

### Community 42 - "SessionLinkRegistry"
Cohesion: 0.22
Nodes (11): Default, annotates_a_session_linked_inside_the_original_app(), apply_session_links(), apply_session_links_to_profile(), SessionLink, SessionLinkRegistry, SessionTransferInfo, SessionTransferManifest (+3 more)

### Community 44 - "deserialize_collection_count"
Cohesion: 0.67
Nodes (3): D, Error, deserialize_collection_count()

### Community 45 - "TranscriptEntry"
Cohesion: 0.40
Nodes (5): ArtifactMonitorEntry, TranscriptEntry, TranscriptMessage, TranscriptUsage, TranscriptUsageIteration

## Knowledge Gaps
- **252 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+247 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `HU-0002 — Actualizar la aplicación original y mostrar metadatos precisos por modelo y proveedor` connect `HU-0002 — Actualizar la aplicación original y mostrar metadatos precisos por modelo y proveedor` to `Actualizaciones de la aplicación original y las instancias`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `HU-0003 — Transferencias conscientes de artefactos, actualización disponible y uso en vivo` connect `HU-0003 — Transferencias conscientes de artefactos, actualización disponible y uso en vivo` to `Actualizaciones de la aplicación original y las instancias`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `HU-0001 — Integrar Graphify y agentes especializados` connect `HU-0001 — Integrar Graphify y agentes especializados` to `README.md`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _252 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `lib.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `String` be split into smaller, more focused modules?**
  _Cohesion score 0.13387978142076504 - nodes in this community are weakly interconnected._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._