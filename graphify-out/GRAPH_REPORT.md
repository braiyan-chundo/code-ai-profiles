# Graph Report - Code AI Profiles  (2026-10-27)

## Corpus Check
- 73 files · ~85,730 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1185 nodes · 2430 edges · 80 communities (72 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a52b6585`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- lib.rs
- Option
- scripts
- HU-0010 — Publicar el fix de actualización como versión 0.2.2
- bundle
- compilerOptions
- Observaciones (no bloquean)
- types.ts
- permissions
- graphify.mjs
- compilerOptions
- tauri.linux.conf.json
- CodeSession
- app
- InstanceCard
- vite-env.d.ts
- Ciclo de vida e identidad visual de instancias
- HU-0002 — Actualizar la aplicación original y mostrar metadatos precisos por modelo y proveedor
- Code AI Profiles
- DESIGN.md
- HU-0003 — Transferencias conscientes de artefactos, actualización disponible y uso en vivo
- HU-0004 — Sincronización desde la instancia más reciente, cierre robusto, artefactos locales e identidad visual
- README.md
- HU-0005 — Recuperar la respuesta de la interfaz y establecer versionado SemVer
- HU-0006 — Escaneo automático silencioso y ciclo manual controlado
- PULL_REQUEST_TEMPLATE.md
- HU-0009 — Estado oficial de actualización y refresco de versiones
- Actualizaciones de la aplicación original y las instancias
- HU-0007 — Spike de icono de Dock previo al primer inicio de sesión
- Sesiones y estimación de contexto
- HU-0001 — Integrar Graphify y agentes especializados
- Grafo de conocimiento con Graphify
- PathBuf
- HU-0008 — Diagnóstico A/B del arranque macOS para branding previo al login
- hu0008-macos-launch-ab-diagnostic.sh
- release-version.mjs
- App.tsx
- index.md
- .capture
- Adopción v4
- Code AI Profiles · cómo trabajamos
- Vec
- Contribuir a Code AI Profiles
- scan-controller.ts
- hu0007-macos-dock-icon-spike.sh
- String
- Rendimiento del dashboard
- Sistema de agentes de desarrollo
- Versionado de Code AI Profiles
- Changelog
- copy_code_session_sync
- Rol: architect
- Verificación · HU-0011 · Adopción v4
- Rol: document
- Contrato de desarrollo asistido por IA
- source-update-controller.ts
- Q: Implement HU-0009 official update state and directed version refresh
- Rol: backend
- Rol: frontend
- ADR-0001 · Adopción de la metodología v4
- Stack de Code AI Profiles
- Análisis
- Invariantes de Code AI Profiles
- Reglas de negocio de Code AI Profiles
- roles/README.md
- HU-0010-publicar-el-fix-de-actualizacion-como-ve/seguimiento.md
- HU-0011-adopcion-v4/seguimiento.md
- Rust + Tauri 2 · {{PROYECTO}}
- Icono distintivo en el Dock de macOS
- record_refresh_work
- HU-0012-icono-distintivo-en-el-dock-de-macos/seguimiento.md
- Describir lo construido: reglas, arquitectura y componentes
- SystemInfo
- deserialize_collection_count
- update_instance_application_from_source_sync
- HU-0013-describir-lo-construido-reglas-arquitect/seguimiento.md

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

## Communities (80 total, 8 thin omitted)

### Community 0 - "lib.rs"
Cohesion: 0.05
Nodes (42): application_fingerprint_changes_when_managed_bytes_change(), ArtifactMonitorEntry, clean_session_text(), clears_context_after_compaction_until_the_next_response(), CodeSessionDocument, contains_model_alias(), context_window_for_model(), custom_icon_contract_does_not_modify_the_application_path() (+34 more)

### Community 1 - "Option"
Cohesion: 0.08
Nodes (71): CodeSession, CustomIcon, DashboardState, InstanceStatus, Instant, ManagedProcessIdentity, Mutex, Option (+63 more)

### Community 2 - "scripts"
Cohesion: 0.04
Nodes (44): @fontsource/inter, @fontsource/jetbrains-mono, dependencies, @fontsource/inter, @fontsource/jetbrains-mono, react, react-dom, @tauri-apps/api (+36 more)

### Community 3 - "HU-0010 — Publicar el fix de actualización como versión 0.2.2"
Cohesion: 0.06
Nodes (31): Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Diseño técnico y contratos, Documentación afectada (+23 more)

### Community 4 - "bundle"
Cohesion: 0.06
Nodes (33): $APPDATA/managed-instances/*/branding/icon.png, icons/128x128@2x.png, icons/128x128.png, icons/32x32.png, icons/icon.icns, icons/icon.ico, app, macOSPrivateApi (+25 more)

### Community 5 - "compilerOptions"
Cohesion: 0.09
Nodes (22): DOM, DOM.Iterable, ES2022, src, compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop (+14 more)

### Community 6 - "Observaciones (no bloquean)"
Cohesion: 0.09
Nodes (21): Afirmaciones nuevas comprobadas, Bloqueos, Lo que se comprobó y es correcto, Observaciones (no bloquean), Queda una observación (no bloquea), R-10 (O) · frontend: una restricción de imports en los módulos probados, R-11 (O) · frontend: el tema oscuro es la base, R-12 (O) · config: «relacionadas» no corre Rust (+13 more)

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

### Community 19 - "Ciclo de vida e identidad visual de instancias"
Cohesion: 0.40
Nodes (4): Ciclo de vida e identidad visual de instancias, Iconos por instancia, Inicio, detección y cierre, Privacidad y límites

### Community 20 - "HU-0002 — Actualizar la aplicación original y mostrar metadatos precisos por modelo y proveedor"
Cohesion: 0.10
Nodes (21): Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Cierre del fix — CA11 y CA12, Contexto y evidencia de Graphify, Criterios de aceptación, Diseño técnico y contratos (+13 more)

### Community 21 - "Code AI Profiles"
Cohesion: 0.12
Nodes (17): Cierre e identidad visual de instancias, Code AI Profiles, Compatibilidad actual y marcas, Contribuir, Crear cada versión, Cómo funciona el aislamiento, Desarrollo asistido por IA y Graphify, Desarrollo local (+9 more)

### Community 22 - "DESIGN.md"
Cohesion: 0.20
Nodes (8): Brand & Style, Colors, Components, Elevation & Depth, Layout & Spacing, Shapes, Typography, Guías de diseño · Code AI Profiles

### Community 23 - "HU-0003 — Transferencias conscientes de artefactos, actualización disponible y uso en vivo"
Cohesion: 0.10
Nodes (21): Actualización disponible, Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Diseño técnico y contratos (+13 more)

### Community 24 - "HU-0004 — Sincronización desde la instancia más reciente, cierre robusto, artefactos locales e identidad visual"
Cohesion: 0.10
Nodes (21): Alcance, Artefactos locales con soporte seguro, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Diseño técnico y contratos (+13 more)

### Community 26 - "HU-0005 — Recuperar la respuesta de la interfaz y establecer versionado SemVer"
Cohesion: 0.10
Nodes (21): Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Decisión pendiente para el Dock, Diseño técnico y contratos (+13 more)

### Community 27 - "HU-0006 — Escaneo automático silencioso y ciclo manual controlado"
Cohesion: 0.11
Nodes (18): Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Control de escaneos, Criterios de aceptación, Diseño técnico y contratos (+10 more)

### Community 28 - "PULL_REQUEST_TEMPLATE.md"
Cohesion: 0.50
Nodes (3): Autorización previa, Resumen, Verificación

### Community 29 - "HU-0009 — Estado oficial de actualización y refresco de versiones"
Cohesion: 0.11
Nodes (18): Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Diseño técnico y contratos, Documentación afectada (+10 more)

### Community 30 - "Actualizaciones de la aplicación original y las instancias"
Cohesion: 0.18
Nodes (10): Actualizaciones de la aplicación original y las instancias, Comportamiento por plataforma, Detección de versión disponible, Dos operaciones independientes, Errores y limitaciones, Flujo de actualización original, Límites de seguridad, Nombre y estado de la aplicación original (+2 more)

### Community 31 - "HU-0007 — Spike de icono de Dock previo al primer inicio de sesión"
Cohesion: 0.12
Nodes (17): Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Diseño técnico y contratos, Documentación afectada (+9 more)

### Community 32 - "Sesiones y estimación de contexto"
Cohesion: 0.18
Nodes (10): Compactación y ausencia de datos, Cálculo y señales visuales, Mantenimiento de modelos y aliases, Origen y alcance del dato, Privacidad, Referencias oficiales, Sesiones y estimación de contexto, Transferencia de sesiones, artefactos y monitores (+2 more)

### Community 33 - "HU-0001 — Integrar Graphify y agentes especializados"
Cohesion: 0.12
Nodes (16): Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Diseño técnico y contratos, Documentación afectada (+8 more)

### Community 34 - "Grafo de conocimiento con Graphify"
Cohesion: 0.29
Nodes (7): Artefactos versionados, Comandos, Grafo de conocimiento con Graphify, Instalación, Privacidad, Propósito, Regla de cierre

### Community 35 - "PathBuf"
Cohesion: 0.15
Nodes (25): ArtifactMonitorSummary, HashMap, ManagedInstance, PathBuf, SessionTransferInfo, annotates_a_session_linked_inside_the_original_app(), applies_the_latest_model_context_and_clamps_percentage(), apply_session_context() (+17 more)

### Community 36 - "HU-0008 — Diagnóstico A/B del arranque macOS para branding previo al login"
Cohesion: 0.12
Nodes (16): Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Diseño técnico y contratos, Documentación afectada (+8 more)

### Community 37 - "hu0008-macos-launch-ab-diagnostic.sh"
Cohesion: 0.11
Nodes (27): cleanup(), collect_crash_evidence(), dry_run(), emit_error(), failure_cleanup(), launch_one(), OBSERVATION_MS, purge_snapshot_raw() (+19 more)

### Community 38 - "release-version.mjs"
Cohesion: 0.17
Nodes (17): canonicalVersion(), cargoPackageBlocks(), checkVersions(), collectState(), main(), packageSection(), parseJson(), readSources() (+9 more)

### Community 39 - "App.tsx"
Cohesion: 0.06
Nodes (30): AppearancePreferences, AppTheme, DEFAULT_APPEARANCE, EMPTY_STATE, formatTokenCount(), InstanceIconChange, ScanProgressEvent, SessionContextLevel (+22 more)

### Community 41 - ".capture"
Cohesion: 0.19
Nodes (10): Duration, Self, light_refresh_executes_one_inventory_and_skips_expensive_work(), platform_name(), process_start_time(), reset_refresh_work_counters(), run(), system_info_seed() (+2 more)

### Community 42 - "Adopción v4"
Cohesion: 0.17
Nodes (12): AC-01 · Método validado, AC-02 · Sesión nueva carga el método, Adopción v4, Alcance, Cierre, Criterios de aceptación, Definición de Preparado, Definición de Terminado (+4 more)

### Community 43 - "Code AI Profiles · cómo trabajamos"
Cohesion: 0.22
Nodes (9): Code AI Profiles · cómo trabajamos, Cómo se trabaja, Las dos reglas fijas, Lo que no se edita a mano, Lo que sale de la máquina, Pruebas, Quién es quién, Reglas propias del proyecto (+1 more)

### Community 44 - "Vec"
Cohesion: 0.21
Nodes (12): OsString, artifact_export_rejects_symlinks_and_depth_escapes(), artifact_export_roots(), ArtifactTransferOutcome, collect_opaque_artifact_files(), export_local_artifacts(), MacosOriginalLaunch, ProcessInventoryEntry (+4 more)

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
Cohesion: 0.09
Nodes (82): AppHandle, Child, Result, SourceUpdateSource, SourceUpdateStatus, apply_external_icon_best_effort(), atomic_replace_file(), atomically_creates_and_replaces_session_index() (+74 more)

### Community 49 - "Rendimiento del dashboard"
Cohesion: 0.29
Nodes (6): Escaneo automático y manual, Límites, Procesos y almacenamiento, Progreso y privacidad, Refrescos por alcance, Rendimiento del dashboard

### Community 50 - "Sistema de agentes de desarrollo"
Cohesion: 0.25
Nodes (7): Definiciones y adaptadores, Flujo, Historias de usuario, Modelos de Codex, Propósito, Sistema de agentes de desarrollo, Uso fuera de Codex

### Community 51 - "Versionado de Code AI Profiles"
Cohesion: 0.33
Nodes (5): Actualizar una versión, Política, Publicación, Verificar consistencia, Versionado de Code AI Profiles

### Community 52 - "Changelog"
Cohesion: 0.18
Nodes (10): [0.2.0] - 2026-10-11, [0.2.1] - 2026-10-13, [0.2.2] - 2026-10-27, Added, Changed, Changed, Changed, Changelog (+2 more)

### Community 53 - "copy_code_session_sync"
Cohesion: 0.17
Nodes (20): Default, artifact_reference_count(), canonical_code_session_id(), collect_code_session_files(), copy_code_session_sync(), find_code_session_index(), load_session_links(), ManagedPaths (+12 more)

### Community 54 - "Rol: architect"
Cohesion: 0.29
Nodes (6): Entrega esperada, Misión, Perfil recomendado, Proceso obligatorio, Restricciones, Rol: architect

### Community 55 - "Verificación · HU-0011 · Adopción v4"
Cohesion: 0.29
Nodes (6): Comprobaciones, Decisiones tomadas por defecto (★, revisables al probar), Guía de prueba, Qué se entregó, Veredicto, Verificación · HU-0011 · Adopción v4

### Community 56 - "Rol: document"
Cohesion: 0.29
Nodes (6): Estructura mínima de una HU, Misión, Perfil recomendado, Proceso obligatorio, Restricciones, Rol: document

### Community 57 - "Contrato de desarrollo asistido por IA"
Cohesion: 0.33
Nodes (5): Contrato de desarrollo asistido por IA, Flujo obligatorio para features y fixes, Graphify, Límites de los roles, Reglas del repositorio

### Community 58 - "source-update-controller.ts"
Cohesion: 0.13
Nodes (21): App(), describeArtifactOutcome(), formatBytes(), friendlyError(), loadAppearancePreferences(), createSourceUpdateController(), HandoffIntent, mergeSourceUpdateForInstallation() (+13 more)

### Community 59 - "Q: Implement HU-0009 official update state and directed version refresh"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Implement HU-0009 official update state and directed version refresh, Source Nodes

### Community 60 - "Rol: backend"
Cohesion: 0.33
Nodes (5): Misión, Perfil recomendado, Proceso obligatorio, Reglas críticas, Rol: backend

### Community 61 - "Rol: frontend"
Cohesion: 0.33
Nodes (5): Misión, Perfil recomendado, Proceso obligatorio, Reglas críticas, Rol: frontend

### Community 62 - "ADR-0001 · Adopción de la metodología v4"
Cohesion: 0.33
Nodes (5): ADR-0001 · Adopción de la metodología v4, Alternativas, Consecuencias, Contexto, Decisión

### Community 63 - "Stack de Code AI Profiles"
Cohesion: 0.40
Nodes (4): Las reglas que impone cada pieza, Módulo de configuración de cada app, Repos, Stack de Code AI Profiles

### Community 64 - "Análisis"
Cohesion: 0.40
Nodes (4): Análisis, Arquitectura · HU-0011 · Adopción v4, Decisiones, Impacto

### Community 65 - "Invariantes de Code AI Profiles"
Cohesion: 0.50
Nodes (3): De producto (las aprueba Braiyan Rodriguez (mantenedor)), Invariantes de Code AI Profiles, Técnicas (las aprueba Braiyan Rodriguez (mantenedor))

### Community 66 - "Reglas de negocio de Code AI Profiles"
Cohesion: 0.50
Nodes (3): Cómo se escribe una regla, Dominios, Reglas de negocio de Code AI Profiles

### Community 71 - "Rust + Tauri 2 · {{PROYECTO}}"
Cohesion: 0.12
Nodes (15): Añadir un comando IPC, Errores, La estructura, La regla de oro, Lo que no se toma prestado, Lo que nunca, Procesos, Pruebas (+7 more)

### Community 72 - "Icono distintivo en el Dock de macOS"
Cohesion: 0.15
Nodes (13): AC-01 · Icono propio en el Dock sin romper la firma, Alcance, Cierre, Criterios de aceptación, Decisiones por defecto (★), Definición de Preparado, Definición de Terminado, Fuera de alcance (+5 more)

### Community 73 - "record_refresh_work"
Cohesion: 0.33
Nodes (6): FnOnce, managed_bytes(), path_size(), record_refresh_work(), refresh_work_counters(), RefreshWorkCounters

### Community 75 - "Describir lo construido: reglas, arquitectura y componentes"
Cohesion: 0.13
Nodes (15): AC-01 · Reglas de negocio escritas, AC-02 · Arquitectura descrita, AC-03 · Componentes con skill, Alcance, Cierre, Criterios de aceptación, Decisiones por defecto (★), Definición de Preparado (+7 more)

### Community 76 - "SystemInfo"
Cohesion: 0.40
Nodes (5): SourceUpdateInfo, InstanceStatus, SystemInfo, TransferProfile, VersionTopology

### Community 77 - "deserialize_collection_count"
Cohesion: 0.67
Nodes (3): D, Error, deserialize_collection_count()

### Community 78 - "update_instance_application_from_source_sync"
Cohesion: 0.24
Nodes (19): build_version_topology(), copy_provider_application(), detect_original_profile(), detect_provider_source(), linux_provider_installation(), original_instance_status_with_inventory(), process_snapshot(), ProcessInventory (+11 more)

## Knowledge Gaps
- **539 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+534 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `HU-0005 — Recuperar la respuesta de la interfaz y establecer versionado SemVer` connect `HU-0005 — Recuperar la respuesta de la interfaz y establecer versionado SemVer` to `index.md`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `HU-0009 — Estado oficial de actualización y refresco de versiones` connect `HU-0009 — Estado oficial de actualización y refresco de versiones` to `index.md`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `Code AI Profiles` connect `Code AI Profiles` to `README.md`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _539 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `lib.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.04632768361581921 - nodes in this community are weakly interconnected._
- **Should `Option` be split into smaller, more focused modules?**
  _Cohesion score 0.07525150905432595 - nodes in this community are weakly interconnected._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._