# Graph Report - Code AI Profiles  (2026-10-10)

## Corpus Check
- 38 files · ~44,771 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 701 nodes · 1505 edges · 48 communities (46 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `05437f91`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- lib.rs
- String
- scripts
- App
- bundle
- compilerOptions
- system_info
- types.ts
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
- App.tsx
- update_original_application
- session_index_for_target
- HU-0004 — Sincronización desde la instancia más reciente, cierre robusto, artefactos locales e identidad visual
- PathBuf
- deserialize_collection_count
- TranscriptEntry
- read_usage
- Ciclo de vida e identidad visual de instancias

## God Nodes (most connected - your core abstractions)
1. `copy_code_session_sync()` - 29 edges
2. `dashboard_from()` - 24 edges
3. `update_instance_application_from_source_sync()` - 22 edges
4. `synchronize_managed_applications_sync()` - 22 edges
5. `load_registry()` - 21 edges
6. `ManagedInstance` - 20 edges
7. `system_info()` - 19 edges
8. `HU-0002 — Actualizar la aplicación original y mostrar metadatos precisos por modelo y proveedor` - 19 edges
9. `DashboardState` - 18 edges
10. `scan_system()` - 18 edges

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

## Communities (48 total, 2 thin omitted)

### Community 0 - "lib.rs"
Cohesion: 0.06
Nodes (33): annotates_a_session_linked_inside_the_original_app(), apply_session_links(), apply_session_links_to_profile(), atomically_creates_and_replaces_session_index(), canonical_code_session_id(), contains_model_alias(), context_window_for_model(), CustomIcon (+25 more)

### Community 1 - "String"
Cohesion: 0.13
Nodes (66): AppHandle, Child, Result, apply_external_icon_best_effort(), atomic_replace_file(), check_source_update(), clean_session_text(), clear_instance_icon() (+58 more)

### Community 2 - "scripts"
Cohesion: 0.05
Nodes (39): @fontsource/inter, @fontsource/jetbrains-mono, dependencies, @fontsource/inter, @fontsource/jetbrains-mono, react, react-dom, @tauri-apps/api (+31 more)

### Community 3 - "App"
Cohesion: 0.29
Nodes (6): App(), describeArtifactOutcome(), formatBytes(), friendlyError(), loadAppearancePreferences(), SCAN_STAGES

### Community 4 - "bundle"
Cohesion: 0.06
Nodes (33): $APPDATA/managed-instances/*/branding/icon.png, icons/128x128@2x.png, icons/128x128.png, icons/32x32.png, icons/icon.icns, icons/icon.ico, app, macOSPrivateApi (+25 more)

### Community 5 - "compilerOptions"
Cohesion: 0.09
Nodes (22): DOM, DOM.Iterable, ES2022, src, compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop (+14 more)

### Community 6 - "system_info"
Cohesion: 0.19
Nodes (17): ManagedInstance, SourceUpdateInfo, build_version_topology(), detect_original_profile(), detect_provider_source(), InstanceStatus, original_app_is_running(), original_instance_status() (+9 more)

### Community 7 - "types.ts"
Cohesion: 0.07
Nodes (35): bridge, call(), isTauri(), mockInstances, mockOriginalSessions, now, ArtifactMonitorSummary, ArtifactTransferOutcome (+27 more)

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
Cohesion: 0.33
Nodes (7): formatCaptureTime(), formatModelName(), formatSessionTime(), InstanceCard(), InstanceEditor(), managedIconSource(), OriginalAppSection()

### Community 20 - "HU-0001 — Integrar Graphify y agentes especializados"
Cohesion: 0.12
Nodes (16): Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Diseño técnico y contratos, Documentación afectada (+8 more)

### Community 21 - "Code AI Profiles"
Cohesion: 0.12
Nodes (16): Cierre e identidad visual de instancias, Code AI Profiles, Compatibilidad actual y marcas, Contribuir, Crear cada versión, Cómo funciona el aislamiento, Desarrollo asistido por IA y Graphify, Desarrollo local (+8 more)

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
Cohesion: 0.20
Nodes (10): Actualizaciones de la aplicación original y las instancias, Comportamiento por plataforma, Detección de versión disponible, Dos operaciones independientes, Errores y limitaciones, Flujo de actualización original, Límites de seguridad, Nombre y estado de la aplicación original (+2 more)

### Community 31 - "ManagedInstance"
Cohesion: 0.15
Nodes (19): CodeSession, CustomIcon, Duration, InstanceStatus, ManagedProcessIdentity, AccountPlan, custom_icon_contract_does_not_modify_the_application_path(), identity_matches_instance() (+11 more)

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
Cohesion: 0.13
Nodes (28): Option, Path, ArtifactMonitorSummary, clean_monitor_state(), clears_context_after_compaction_until_the_next_response(), CodeSessionDocument, copy_provider_application(), find_file_named() (+20 more)

### Community 37 - "HU-0003 — Transferencias conscientes de artefactos, actualización disponible y uso en vivo"
Cohesion: 0.10
Nodes (21): Actualización disponible, Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Diseño técnico y contratos (+13 more)

### Community 38 - "check_source_update_sync"
Cohesion: 0.18
Nodes (13): Default, Self, SourceUpdateSource, SourceUpdateStatus, check_apt_update(), check_official_update_feed(), check_source_update_sync(), parse_apt_policy() (+5 more)

### Community 39 - "App.tsx"
Cohesion: 0.06
Nodes (30): AppearancePreferences, AppTheme, DEFAULT_APPEARANCE, EMPTY_STATE, formatTokenCount(), InstanceIconChange, ScanProgressState, SessionContextLevel (+22 more)

### Community 40 - "update_original_application"
Cohesion: 0.29
Nodes (8): original_application_update_target(), OriginalApplicationUpdateAction, OriginalApplicationUpdateResult, OriginalApplicationUpdateTarget, platform_name(), require_provider_source(), selects_official_update_targets_by_platform_and_architecture(), update_original_application()

### Community 41 - "session_index_for_target"
Cohesion: 0.33
Nodes (7): artifact_reference_count(), published_artifacts(), restored_origin_artifacts(), restores_origin_artifacts_from_the_transaction_backup(), sanitizes_artifacts_using_only_the_target_profile_ownership(), session_index_for_target(), Value

### Community 42 - "HU-0004 — Sincronización desde la instancia más reciente, cierre robusto, artefactos locales e identidad visual"
Cohesion: 0.10
Nodes (21): Alcance, Artefactos locales con soporte seguro, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Diseño técnico y contratos (+13 more)

### Community 43 - "PathBuf"
Cohesion: 0.18
Nodes (21): ArtifactMonitorSummary, HashMap, PathBuf, SessionTransferInfo, applies_the_latest_model_context_and_clamps_percentage(), apply_session_context(), artifact_export_rejects_symlinks_and_depth_escapes(), artifact_export_roots() (+13 more)

### Community 44 - "deserialize_collection_count"
Cohesion: 0.67
Nodes (3): D, Error, deserialize_collection_count()

### Community 45 - "TranscriptEntry"
Cohesion: 0.40
Nodes (5): ArtifactMonitorEntry, TranscriptEntry, TranscriptMessage, TranscriptUsage, TranscriptUsageIteration

### Community 46 - "read_usage"
Cohesion: 0.33
Nodes (6): read_usage(), reads_complete_usage_samples_and_rejects_partial_files(), refresh_instance_usage(), refresh_usage_keeps_the_last_good_snapshot_on_partial_data(), UsageSnapshot, UsageStats

### Community 47 - "Ciclo de vida e identidad visual de instancias"
Cohesion: 0.50
Nodes (4): Ciclo de vida e identidad visual de instancias, Iconos por instancia, Inicio, detección y cierre, Privacidad y límites

## Knowledge Gaps
- **286 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+281 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `HU-0002 — Actualizar la aplicación original y mostrar metadatos precisos por modelo y proveedor` connect `HU-0002 — Actualizar la aplicación original y mostrar metadatos precisos por modelo y proveedor` to `README.md`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `HU-0003 — Transferencias conscientes de artefactos, actualización disponible y uso en vivo` connect `HU-0003 — Transferencias conscientes de artefactos, actualización disponible y uso en vivo` to `README.md`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `HU-0004 — Sincronización desde la instancia más reciente, cierre robusto, artefactos locales e identidad visual` connect `HU-0004 — Sincronización desde la instancia más reciente, cierre robusto, artefactos locales e identidad visual` to `README.md`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _286 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `lib.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.05959183673469388 - nodes in this community are weakly interconnected._
- **Should `String` be split into smaller, more focused modules?**
  _Cohesion score 0.12598770851624233 - nodes in this community are weakly interconnected._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._