# Graph Report - Code AI Profiles  (2026-10-14)

## Corpus Check
- 49 files · ~64,181 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 908 nodes · 2064 edges · 58 communities (55 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e3e1191e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- lib.rs
- String
- scripts
- App
- bundle
- compilerOptions
- HU-0006 — Escaneo automático silencioso y ciclo manual controlado
- types.ts
- permissions
- graphify.mjs
- compilerOptions
- tauri.linux.conf.json
- CodeSession
- app
- InstanceCard
- vite-env.d.ts
- actualizaciones.document.md
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
- AppHandle
- HU-0003 — Transferencias conscientes de artefactos, actualización disponible y uso en vivo
- release-version.mjs
- App.tsx
- HU-0005 — Recuperar la respuesta de la interfaz y establecer versionado SemVer
- copy_code_session_sync
- HU-0004 — Sincronización desde la instancia más reciente, cierre robusto, artefactos locales e identidad visual
- PathBuf
- deserialize_collection_count
- read_code_sessions
- scan-controller.ts
- hu0007-macos-dock-icon-spike.sh
- record_refresh_work
- Rendimiento del dashboard
- system_info_scoped
- Versionado de Code AI Profiles
- [0.2.0] - 2026-10-11
- Vec
- HU-0007 — Spike de icono de Dock previo al primer inicio de sesión
- SessionLinkRegistry
- index.md
- README.md

## God Nodes (most connected - your core abstractions)
1. `copy_code_session_sync()` - 30 edges
2. `update_instance_application_from_source_sync()` - 28 edges
3. `set_instance_icon_sync()` - 24 edges
4. `system_info_scoped()` - 23 edges
5. `synchronize_managed_applications_sync()` - 23 edges
6. `ManagedInstance` - 21 edges
7. `DashboardState` - 21 edges
8. `load_registry()` - 21 edges
9. `scan_system_sync()` - 21 edges
10. `clear_instance_icon_sync()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `harness()` --calls--> `createScanController()`  [EXTRACTED]
  tests/scan-controller.test.ts → src/lib/scan-controller.ts
- `App()` --calls--> `createScanController()`  [EXTRACTED]
  src/App.tsx → src/lib/scan-controller.ts
- `App()` --calls--> `reconcileManualBusy()`  [EXTRACTED]
  src/App.tsx → src/lib/scan-controller.ts
- `SessionTransferSelection` --references--> `CodeSession`  [EXTRACTED]
  src/App.tsx → src/types.ts
- `SessionTransferSelection` --references--> `SessionProfile`  [EXTRACTED]
  src/App.tsx → src/types.ts

## Import Cycles
- None detected.

## Communities (58 total, 3 thin omitted)

### Community 0 - "lib.rs"
Cohesion: 0.05
Nodes (37): application_fingerprint_changes_when_managed_bytes_change(), ArtifactMonitorEntry, ArtifactMonitorSummary, atomically_creates_and_replaces_session_index(), clean_monitor_state(), contains_model_alias(), context_window_for_model(), CopyCodeSessionRequest (+29 more)

### Community 1 - "String"
Cohesion: 0.08
Nodes (102): Option, Path, Result, SourceUpdateSource, SourceUpdateStatus, application_fingerprint(), apply_external_icon_best_effort(), apply_macos_branding_after_update() (+94 more)

### Community 2 - "scripts"
Cohesion: 0.05
Nodes (43): @fontsource/inter, @fontsource/jetbrains-mono, dependencies, @fontsource/inter, @fontsource/jetbrains-mono, react, react-dom, @tauri-apps/api (+35 more)

### Community 3 - "App"
Cohesion: 0.33
Nodes (5): App(), describeArtifactOutcome(), formatBytes(), friendlyError(), loadAppearancePreferences()

### Community 4 - "bundle"
Cohesion: 0.06
Nodes (33): $APPDATA/managed-instances/*/branding/icon.png, icons/128x128@2x.png, icons/128x128.png, icons/32x32.png, icons/icon.icns, icons/icon.ico, app, macOSPrivateApi (+25 more)

### Community 5 - "compilerOptions"
Cohesion: 0.09
Nodes (22): DOM, DOM.Iterable, ES2022, src, compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop (+14 more)

### Community 6 - "HU-0006 — Escaneo automático silencioso y ciclo manual controlado"
Cohesion: 0.11
Nodes (18): Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Control de escaneos, Criterios de aceptación, Diseño técnico y contratos (+10 more)

### Community 7 - "types.ts"
Cohesion: 0.07
Nodes (34): bridge, call(), isTauri(), mockInstances, mockOriginalSessions, now, ArtifactMonitorSummary, ArtifactTransferOutcome (+26 more)

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
Cohesion: 0.33
Nodes (7): InstanceCardProps, SessionTransferSelection, SessionUnlinkSelection, CodeSession, DashboardState, ManagedInstance, SessionProfile

### Community 13 - "app"
Cohesion: 0.40
Nodes (4): app, macOSPrivateApi, windows, $schema

### Community 14 - "InstanceCard"
Cohesion: 0.33
Nodes (7): formatCaptureTime(), formatModelName(), formatSessionTime(), InstanceCard(), InstanceEditor(), managedIconSource(), OriginalAppSection()

### Community 19 - "actualizaciones.document.md"
Cohesion: 0.24
Nodes (4): Ciclo de vida e identidad visual de instancias, Iconos por instancia, Inicio, detección y cierre, Privacidad y límites

### Community 20 - "HU-0001 — Integrar Graphify y agentes especializados"
Cohesion: 0.12
Nodes (16): Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Diseño técnico y contratos, Documentación afectada (+8 more)

### Community 21 - "Code AI Profiles"
Cohesion: 0.12
Nodes (17): Cierre e identidad visual de instancias, Code AI Profiles, Compatibilidad actual y marcas, Contribuir, Crear cada versión, Cómo funciona el aislamiento, Desarrollo asistido por IA y Graphify, Desarrollo local (+9 more)

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
Cohesion: 0.10
Nodes (25): Child, CodeSession, CustomIcon, Duration, InstanceStatus, ManagedProcessIdentity, Self, AccountPlan (+17 more)

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

### Community 36 - "AppHandle"
Cohesion: 0.19
Nodes (29): AppHandle, Mutex, clear_instance_icon(), copy_code_session(), create_instance(), dashboard_from_scope(), dashboard_from_scope_async(), dashboard_from_scope_unlocked() (+21 more)

### Community 37 - "HU-0003 — Transferencias conscientes de artefactos, actualización disponible y uso en vivo"
Cohesion: 0.10
Nodes (21): Actualización disponible, Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Diseño técnico y contratos (+13 more)

### Community 38 - "release-version.mjs"
Cohesion: 0.17
Nodes (17): canonicalVersion(), cargoPackageBlocks(), checkVersions(), collectState(), main(), packageSection(), parseJson(), readSources() (+9 more)

### Community 39 - "App.tsx"
Cohesion: 0.06
Nodes (30): AppearancePreferences, AppTheme, DEFAULT_APPEARANCE, EMPTY_STATE, formatTokenCount(), InstanceIconChange, ScanProgressEvent, SessionContextLevel (+22 more)

### Community 40 - "HU-0005 — Recuperar la respuesta de la interfaz y establecer versionado SemVer"
Cohesion: 0.10
Nodes (21): Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Decisión pendiente para el Dock, Diseño técnico y contratos (+13 more)

### Community 41 - "copy_code_session_sync"
Cohesion: 0.21
Nodes (17): artifact_reference_count(), canonical_code_session_id(), collect_code_session_files(), copy_code_session_sync(), find_code_session_index(), load_session_links(), migrate_session_links(), migrates_existing_round_trip_as_a_link_to_the_original() (+9 more)

### Community 42 - "HU-0004 — Sincronización desde la instancia más reciente, cierre robusto, artefactos locales e identidad visual"
Cohesion: 0.10
Nodes (21): Alcance, Artefactos locales con soporte seguro, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Diseño técnico y contratos (+13 more)

### Community 43 - "PathBuf"
Cohesion: 0.22
Nodes (16): DashboardState, HashMap, Instant, ManagedInstance, PathBuf, ApplicationFingerprint, code_transcript_catalog(), collect_code_transcripts() (+8 more)

### Community 44 - "deserialize_collection_count"
Cohesion: 0.67
Nodes (3): D, Error, deserialize_collection_count()

### Community 45 - "read_code_sessions"
Cohesion: 0.19
Nodes (13): ArtifactMonitorSummary, SessionTransferInfo, applies_the_latest_model_context_and_clamps_percentage(), apply_session_context(), clean_session_text(), clears_context_after_compaction_until_the_next_response(), CodeSession, latest_transcript_context() (+5 more)

### Community 46 - "scan-controller.ts"
Cohesion: 0.19
Nodes (12): BACKGROUND_REFRESH_COOLDOWN_MS, BackgroundTrigger, createScanController(), MANUAL_SUCCESS_CLOSE_DELAY_MS, ManualScanStatus, ManualScanView, reconcileManualBusy(), ScanController (+4 more)

### Community 47 - "hu0007-macos-dock-icon-spike.sh"
Cohesion: 0.15
Nodes (22): cleanup(), CLONE_NAME, dry_run(), find_valid_primary_pid(), json_error(), prepare(), prepare_failure_cleanup(), REPO_ICON (+14 more)

### Community 48 - "record_refresh_work"
Cohesion: 0.33
Nodes (6): FnOnce, managed_bytes(), path_size(), record_refresh_work(), refresh_work_counters(), RefreshWorkCounters

### Community 49 - "Rendimiento del dashboard"
Cohesion: 0.33
Nodes (6): Escaneo automático y manual, Límites, Procesos y almacenamiento, Progreso y privacidad, Refrescos por alcance, Rendimiento del dashboard

### Community 50 - "system_info_scoped"
Cohesion: 0.24
Nodes (12): OsString, SourceUpdateInfo, detect_original_profile(), InstanceStatus, original_instance_status_with_inventory(), ProcessInventory, ProcessInventoryEntry, resolve_transfer_profile() (+4 more)

### Community 51 - "Versionado de Code AI Profiles"
Cohesion: 0.40
Nodes (5): Actualizar una versión, Política, Publicación, Verificar consistencia, Versionado de Code AI Profiles

### Community 52 - "[0.2.0] - 2026-10-11"
Cohesion: 0.25
Nodes (7): [0.2.0] - 2026-10-11, [0.2.1] - 2026-10-13, Added, Changed, Changed, Changelog, Fixed

### Community 53 - "Vec"
Cohesion: 0.22
Nodes (13): artifact_export_rejects_symlinks_and_depth_escapes(), artifact_export_roots(), ArtifactTransferOutcome, collect_opaque_artifact_files(), export_local_artifacts(), get_live_usage(), get_live_usage_sync(), read_usage() (+5 more)

### Community 54 - "HU-0007 — Spike de icono de Dock previo al primer inicio de sesión"
Cohesion: 0.12
Nodes (17): Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Diseño técnico y contratos, Documentación afectada (+9 more)

### Community 55 - "SessionLinkRegistry"
Cohesion: 0.22
Nodes (10): Default, annotates_a_session_linked_inside_the_original_app(), apply_session_links(), apply_session_links_to_profile(), light_refresh_executes_one_inventory_and_skips_expensive_work(), reset_refresh_work_counters(), run(), SessionLinkRegistry (+2 more)

## Knowledge Gaps
- **370 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+365 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `HU-0002 — Actualizar la aplicación original y mostrar metadatos precisos por modelo y proveedor` connect `HU-0002 — Actualizar la aplicación original y mostrar metadatos precisos por modelo y proveedor` to `actualizaciones.document.md`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `HU-0003 — Transferencias conscientes de artefactos, actualización disponible y uso en vivo` connect `HU-0003 — Transferencias conscientes de artefactos, actualización disponible y uso en vivo` to `actualizaciones.document.md`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `HU-0004 — Sincronización desde la instancia más reciente, cierre robusto, artefactos locales e identidad visual` connect `HU-0004 — Sincronización desde la instancia más reciente, cierre robusto, artefactos locales e identidad visual` to `actualizaciones.document.md`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _370 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `lib.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.05297532656023222 - nodes in this community are weakly interconnected._
- **Should `String` be split into smaller, more focused modules?**
  _Cohesion score 0.08009708737864078 - nodes in this community are weakly interconnected._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.045454545454545456 - nodes in this community are weakly interconnected._