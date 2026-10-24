# Graph Report - Code AI Profiles  (2026-10-23)

## Corpus Check
- 55 files · ~75,983 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1013 nodes · 2284 edges · 59 communities (56 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e425cc99`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- lib.rs
- Path
- scripts
- ManagedInstance
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
- HU-0003 — Transferencias conscientes de artefactos, actualización disponible y uso en vivo
- Sesiones y estimación de contexto
- Sistema de agentes de desarrollo
- Grafo de conocimiento con Graphify
- README.md
- HU-0009 — Estado oficial de actualización y refresco de versiones
- hu0008-macos-launch-ab-diagnostic.sh
- release-version.mjs
- App.tsx
- HU-0005 — Recuperar la respuesta de la interfaz y establecer versionado SemVer
- copy_code_session_sync
- HU-0004 — Sincronización desde la instancia más reciente, cierre robusto, artefactos locales e identidad visual
- PathBuf
- deserialize_collection_count
- Contribuir a Code AI Profiles
- scan-controller.ts
- hu0007-macos-dock-icon-spike.sh
- String
- Rendimiento del dashboard
- HU-0008 — Diagnóstico A/B del arranque macOS para branding previo al login
- Versionado de Code AI Profiles
- [0.2.0] - 2026-10-11
- Option
- HU-0007 — Spike de icono de Dock previo al primer inicio de sesión
- ManagedPaths
- index.md
- source-update-controller.ts
- Q: Implement HU-0009 official update state and directed version refresh

## God Nodes (most connected - your core abstractions)
1. `copy_code_session_sync()` - 30 edges
2. `update_instance_application_from_source_sync()` - 28 edges
3. `DashboardState` - 25 edges
4. `set_instance_icon_sync()` - 24 edges
5. `system_info_scoped()` - 23 edges
6. `synchronize_managed_applications_sync()` - 23 edges
7. `ManagedInstance` - 21 edges
8. `load_registry()` - 21 edges
9. `scan_system_sync()` - 21 edges
10. `clear_instance_icon_sync()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `harness()` --calls--> `createScanController()`  [EXTRACTED]
  tests/scan-controller.test.ts → src/lib/scan-controller.ts
- `harness()` --calls--> `createSourceUpdateController()`  [EXTRACTED]
  tests/source-update-controller.test.ts → src/lib/source-update-controller.ts
- `App()` --calls--> `createScanController()`  [EXTRACTED]
  src/App.tsx → src/lib/scan-controller.ts
- `App()` --calls--> `reconcileManualBusy()`  [EXTRACTED]
  src/App.tsx → src/lib/scan-controller.ts
- `InstanceCardProps` --references--> `CodeSession`  [EXTRACTED]
  src/App.tsx → src/types.ts

## Import Cycles
- None detected.

## Communities (59 total, 3 thin omitted)

### Community 0 - "lib.rs"
Cohesion: 0.05
Nodes (42): application_fingerprint_changes_when_managed_bytes_change(), atomically_creates_and_replaces_session_index(), check_official_update_feed(), clean_session_text(), clears_context_after_compaction_until_the_next_response(), contains_model_alias(), context_window_for_model(), CopyCodeSessionRequest (+34 more)

### Community 1 - "Path"
Cohesion: 0.17
Nodes (33): Path, application_fingerprint(), apply_macos_branding_after_update(), apply_macos_custom_icon(), cached_source_version(), clear_macos_custom_icon(), clone_directory(), codesign_verification() (+25 more)

### Community 2 - "scripts"
Cohesion: 0.04
Nodes (44): @fontsource/inter, @fontsource/jetbrains-mono, dependencies, @fontsource/inter, @fontsource/jetbrains-mono, react, react-dom, @tauri-apps/api (+36 more)

### Community 3 - "ManagedInstance"
Cohesion: 0.17
Nodes (15): CodeSession, CustomIcon, Duration, InstanceStatus, ManagedProcessIdentity, AccountPlan, identity_matches_instance(), ManagedInstance (+7 more)

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
Nodes (34): InstanceCardProps, bridge, call(), isTauri(), mockInstances, mockOriginalSessions, now, ArtifactMonitorSummary (+26 more)

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
Cohesion: 0.67
Nodes (4): SessionTransferSelection, SessionUnlinkSelection, CodeSession, SessionProfile

### Community 13 - "app"
Cohesion: 0.40
Nodes (4): app, macOSPrivateApi, windows, $schema

### Community 14 - "InstanceCard"
Cohesion: 0.33
Nodes (7): formatCaptureTime(), formatModelName(), formatSessionTime(), InstanceCard(), InstanceEditor(), managedIconSource(), OriginalAppSection()

### Community 19 - "actualizaciones.document.md"
Cohesion: 0.22
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

### Community 31 - "HU-0003 — Transferencias conscientes de artefactos, actualización disponible y uso en vivo"
Cohesion: 0.10
Nodes (21): Actualización disponible, Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Diseño técnico y contratos (+13 more)

### Community 32 - "Sesiones y estimación de contexto"
Cohesion: 0.20
Nodes (10): Compactación y ausencia de datos, Cálculo y señales visuales, Mantenimiento de modelos y aliases, Origen y alcance del dato, Privacidad, Referencias oficiales, Sesiones y estimación de contexto, Transferencia de sesiones, artefactos y monitores (+2 more)

### Community 33 - "Sistema de agentes de desarrollo"
Cohesion: 0.29
Nodes (7): Definiciones y adaptadores, Flujo, Historias de usuario, Modelos de Codex, Propósito, Sistema de agentes de desarrollo, Uso fuera de Codex

### Community 34 - "Grafo de conocimiento con Graphify"
Cohesion: 0.29
Nodes (7): Artefactos versionados, Comandos, Grafo de conocimiento con Graphify, Instalación, Privacidad, Propósito, Regla de cierre

### Community 36 - "HU-0009 — Estado oficial de actualización y refresco de versiones"
Cohesion: 0.11
Nodes (18): Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Diseño técnico y contratos, Documentación afectada (+10 more)

### Community 37 - "hu0008-macos-launch-ab-diagnostic.sh"
Cohesion: 0.11
Nodes (27): cleanup(), collect_crash_evidence(), dry_run(), emit_error(), failure_cleanup(), launch_one(), OBSERVATION_MS, purge_snapshot_raw() (+19 more)

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
Cohesion: 0.11
Nodes (27): OsString, artifact_export_rejects_symlinks_and_depth_escapes(), artifact_export_roots(), artifact_reference_count(), ArtifactTransferOutcome, canonical_code_session_id(), collect_code_session_files(), collect_opaque_artifact_files() (+19 more)

### Community 42 - "HU-0004 — Sincronización desde la instancia más reciente, cierre robusto, artefactos locales e identidad visual"
Cohesion: 0.10
Nodes (21): Alcance, Artefactos locales con soporte seguro, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Diseño técnico y contratos (+13 more)

### Community 43 - "PathBuf"
Cohesion: 0.08
Nodes (47): ArtifactMonitorSummary, DashboardState, Default, HashMap, Instant, ManagedInstance, PathBuf, Self (+39 more)

### Community 44 - "deserialize_collection_count"
Cohesion: 0.67
Nodes (3): D, Error, deserialize_collection_count()

### Community 45 - "Contribuir a Code AI Profiles"
Cohesion: 0.33
Nodes (6): Antes de programar, Contribuir a Code AI Profiles, Licencia de las contribuciones, Privacidad y seguridad, Pull requests, Verificación local

### Community 46 - "scan-controller.ts"
Cohesion: 0.19
Nodes (12): BACKGROUND_REFRESH_COOLDOWN_MS, BackgroundTrigger, createScanController(), MANUAL_SUCCESS_CLOSE_DELAY_MS, ManualScanStatus, ManualScanView, reconcileManualBusy(), ScanController (+4 more)

### Community 47 - "hu0007-macos-dock-icon-spike.sh"
Cohesion: 0.15
Nodes (22): cleanup(), CLONE_NAME, dry_run(), find_valid_primary_pid(), json_error(), prepare(), prepare_failure_cleanup(), REPO_ICON (+14 more)

### Community 48 - "String"
Cohesion: 0.10
Nodes (86): AppHandle, Child, Mutex, Result, apply_external_icon_best_effort(), atomic_replace_file(), check_apt_update(), check_source_update() (+78 more)

### Community 49 - "Rendimiento del dashboard"
Cohesion: 0.33
Nodes (6): Escaneo automático y manual, Límites, Procesos y almacenamiento, Progreso y privacidad, Refrescos por alcance, Rendimiento del dashboard

### Community 50 - "HU-0008 — Diagnóstico A/B del arranque macOS para branding previo al login"
Cohesion: 0.12
Nodes (16): Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Diseño técnico y contratos, Documentación afectada (+8 more)

### Community 51 - "Versionado de Code AI Profiles"
Cohesion: 0.40
Nodes (5): Actualizar una versión, Política, Publicación, Verificar consistencia, Versionado de Code AI Profiles

### Community 52 - "[0.2.0] - 2026-10-11"
Cohesion: 0.25
Nodes (7): [0.2.0] - 2026-10-11, [0.2.1] - 2026-10-13, Added, Changed, Changed, Changelog, Fixed

### Community 53 - "Option"
Cohesion: 0.14
Nodes (22): Option, ArtifactMonitorEntry, ArtifactMonitorSummary, clean_monitor_state(), CodeSessionDocument, latest_artifact_monitor(), linux_desktop_name(), normalize_linux_version() (+14 more)

### Community 54 - "HU-0007 — Spike de icono de Dock previo al primer inicio de sesión"
Cohesion: 0.12
Nodes (17): Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Diseño técnico y contratos, Documentación afectada (+9 more)

### Community 55 - "ManagedPaths"
Cohesion: 0.17
Nodes (20): FnOnce, build_version_topology(), launch_macos_original_application_with(), linux_provider_installation(), macos_update_launcher_rejects_a_managed_application_without_launching(), managed_bytes(), ManagedPaths, path_is_within() (+12 more)

### Community 58 - "source-update-controller.ts"
Cohesion: 0.13
Nodes (21): App(), describeArtifactOutcome(), formatBytes(), friendlyError(), loadAppearancePreferences(), createSourceUpdateController(), HandoffIntent, mergeSourceUpdateForInstallation() (+13 more)

### Community 59 - "Q: Implement HU-0009 official update state and directed version refresh"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Implement HU-0009 official update state and directed version refresh, Source Nodes

## Knowledge Gaps
- **414 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+409 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `HU-0002 — Actualizar la aplicación original y mostrar metadatos precisos por modelo y proveedor` connect `HU-0002 — Actualizar la aplicación original y mostrar metadatos precisos por modelo y proveedor` to `actualizaciones.document.md`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `HU-0003 — Transferencias conscientes de artefactos, actualización disponible y uso en vivo` connect `HU-0003 — Transferencias conscientes de artefactos, actualización disponible y uso en vivo` to `actualizaciones.document.md`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `HU-0004 — Sincronización desde la instancia más reciente, cierre robusto, artefactos locales e identidad visual` connect `HU-0004 — Sincronización desde la instancia más reciente, cierre robusto, artefactos locales e identidad visual` to `actualizaciones.document.md`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _414 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `lib.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.04745762711864407 - nodes in this community are weakly interconnected._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._
- **Should `bundle` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._