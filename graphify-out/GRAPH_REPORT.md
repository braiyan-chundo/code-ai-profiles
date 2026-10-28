# Graph Report - Code AI Profiles  (2026-10-28)

## Corpus Check
- 81 files · ~95,634 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1234 nodes · 2488 edges · 79 communities (70 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fa2f80ff`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Result
- set_instance_icon_sync
- scripts
- App.tsx
- lib.rs
- Solución
- types.ts
- bundle
- hu0008-macos-launch-ab-diagnostic.sh
- hu0007-macos-dock-icon-spike.sh
- source-update-controller.ts
- compilerOptions
- release-version.mjs
- system_info_scoped
- String
- scan-controller.ts
- graphify.mjs
- permissions
- HU-0010 — Publicar el fix de actualización como versión 0.2.2
- compilerOptions
- Observaciones (no bloquean)
- tauri.linux.conf.json
- InstanceCard
- PathBuf
- Option
- HU-0002 — Actualizar la aplicación original y mostrar metadatos precisos por modelo y proveedor
- HU-0003 — Transferencias conscientes de artefactos, actualización disponible y uso en vivo
- HU-0004 — Sincronización desde la instancia más reciente, cierre robusto, artefactos locales e identidad visual
- app
- CodeSession
- HU-0005 — Recuperar la respuesta de la interfaz y establecer versionado SemVer
- deserialize_collection_count
- vite-env.d.ts
- HU-0009 — Estado oficial de actualización y refresco de versiones
- HU-0006 — Escaneo automático silencioso y ciclo manual controlado
- HU-0007 — Spike de icono de Dock previo al primer inicio de sesión
- Code AI Profiles
- HU-0001 — Integrar Graphify y agentes especializados
- HU-0008 — Diagnóstico A/B del arranque macOS para branding previo al login
- Rust + Tauri 2 · {{PROYECTO}}
- Describir lo construido: reglas, arquitectura y componentes
- Icono distintivo en el Dock de macOS
- Adopción v4
- Changelog
- Actualizaciones de la aplicación original y las instancias
- Sesiones y estimación de contexto
- DESIGN.md
- index.md
- README.md
- Code AI Profiles · cómo trabajamos
- Sistema de agentes de desarrollo
- Grafo de conocimiento con Graphify
- Rendimiento del dashboard
- Verificación · HU-0011 · Adopción v4
- Contribuir a Code AI Profiles
- Contrato de desarrollo asistido por IA
- ADR-0001 · Adopción de la metodología v4
- Versionado de Code AI Profiles
- Stack de Code AI Profiles
- Ciclo de vida e identidad visual de instancias
- Análisis
- Invariantes de Code AI Profiles
- Reglas de negocio de Code AI Profiles
- PULL_REQUEST_TEMPLATE.md
- HU-0010-publicar-el-fix-de-actualizacion-como-ve/seguimiento.md
- HU-0011-adopcion-v4/seguimiento.md
- HU-0012-icono-distintivo-en-el-dock-de-macos/seguimiento.md
- HU-0013-describir-lo-construido-reglas-arquitect/seguimiento.md
- copy_code_session_sync
- ManagedInstance
- Design system con shadcn y showcase local
- Frontend escalable: componentes, features y router
- check_source_update_sync
- HU-0014-design-system-con-shadcn-y-showcase-loca/seguimiento.md
- HU-0015-frontend-escalable-componentes-features-/seguimiento.md

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

## Communities (79 total, 9 thin omitted)

### Community 0 - "Result"
Cohesion: 0.24
Nodes (30): AppHandle, Result, clear_instance_icon(), copy_code_session(), create_instance(), dashboard_from_exact_scope(), dashboard_from_exact_scope_async(), dashboard_from_scope() (+22 more)

### Community 1 - "set_instance_icon_sync"
Cohesion: 0.15
Nodes (14): Mutex, atomic_replace_file(), atomically_creates_and_replaces_session_index(), invalidate_application_cache(), managed_bytes(), normalized_icon_png(), normalizes_small_png_icons_and_rejects_invalid_input(), path_size() (+6 more)

### Community 2 - "scripts"
Cohesion: 0.04
Nodes (45): @fontsource/inter, @fontsource/jetbrains-mono, dependencies, @fontsource/inter, @fontsource/jetbrains-mono, react, react-dom, @tauri-apps/api (+37 more)

### Community 3 - "App.tsx"
Cohesion: 0.06
Nodes (30): AppearancePreferences, AppTheme, DEFAULT_APPEARANCE, EMPTY_STATE, formatTokenCount(), InstanceIconChange, ScanProgressEvent, SessionContextLevel (+22 more)

### Community 4 - "lib.rs"
Cohesion: 0.05
Nodes (45): OsString, application_fingerprint_changes_when_managed_bytes_change(), artifact_export_rejects_symlinks_and_depth_escapes(), ArtifactTransferOutcome, collect_opaque_artifact_files(), CopyCodeSessionRequest, desktop_entry_value(), get_live_usage() (+37 more)

### Community 5 - "Solución"
Cohesion: 0.06
Nodes (31): Arquitectura del frontend, Añadir una feature, Añadir una pantalla, Dónde va cada cosa, Estado, Estilos, Estructura, Las features (+23 more)

### Community 6 - "types.ts"
Cohesion: 0.07
Nodes (34): InstanceCardProps, bridge, call(), isTauri(), mockInstances, mockOriginalSessions, now, ArtifactMonitorSummary (+26 more)

### Community 7 - "bundle"
Cohesion: 0.06
Nodes (33): $APPDATA/managed-instances/*/branding/icon.png, icons/128x128@2x.png, icons/128x128.png, icons/32x32.png, icons/icon.icns, icons/icon.ico, app, macOSPrivateApi (+25 more)

### Community 8 - "hu0008-macos-launch-ab-diagnostic.sh"
Cohesion: 0.11
Nodes (27): cleanup(), collect_crash_evidence(), dry_run(), emit_error(), failure_cleanup(), launch_one(), OBSERVATION_MS, purge_snapshot_raw() (+19 more)

### Community 9 - "hu0007-macos-dock-icon-spike.sh"
Cohesion: 0.15
Nodes (22): cleanup(), CLONE_NAME, dry_run(), find_valid_primary_pid(), json_error(), prepare(), prepare_failure_cleanup(), REPO_ICON (+14 more)

### Community 10 - "source-update-controller.ts"
Cohesion: 0.13
Nodes (21): App(), describeArtifactOutcome(), formatBytes(), friendlyError(), loadAppearancePreferences(), createSourceUpdateController(), HandoffIntent, mergeSourceUpdateForInstallation() (+13 more)

### Community 11 - "compilerOptions"
Cohesion: 0.09
Nodes (22): DOM, DOM.Iterable, ES2022, src, compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop (+14 more)

### Community 12 - "release-version.mjs"
Cohesion: 0.17
Nodes (17): canonicalVersion(), cargoPackageBlocks(), checkVersions(), collectState(), main(), packageSection(), parseJson(), readSources() (+9 more)

### Community 13 - "system_info_scoped"
Cohesion: 0.12
Nodes (22): ManagedInstance, Self, SourceUpdateInfo, annotates_a_session_linked_inside_the_original_app(), apply_session_links(), apply_session_links_to_profile(), detect_original_profile(), InstanceStatus (+14 more)

### Community 14 - "String"
Cohesion: 0.17
Nodes (28): Child, FnOnce, clear_instance_icon_sync(), create_instance_sync(), CreateInstanceRequest, delete_instance_sync(), instance_bundle_name(), launch_instance_sync() (+20 more)

### Community 15 - "scan-controller.ts"
Cohesion: 0.19
Nodes (12): BACKGROUND_REFRESH_COOLDOWN_MS, BackgroundTrigger, createScanController(), MANUAL_SUCCESS_CLOSE_DELAY_MS, ManualScanStatus, ManualScanView, reconcileManualBusy(), ScanController (+4 more)

### Community 16 - "graphify.mjs"
Cohesion: 0.13
Nodes (14): candidates, generateGraph(), graphDir, graphify, graphPath, restoreMemory(), withMemoryAside(), projectRoot (+6 more)

### Community 17 - "permissions"
Cohesion: 0.17
Nodes (11): core:default, core:window:allow-close, core:window:allow-minimize, core:window:allow-start-dragging, core:window:allow-toggle-maximize, main, description, identifier (+3 more)

### Community 18 - "HU-0010 — Publicar el fix de actualización como versión 0.2.2"
Cohesion: 0.06
Nodes (31): Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Diseño técnico y contratos, Documentación afectada (+23 more)

### Community 19 - "compilerOptions"
Cohesion: 0.22
Nodes (8): vite.config.ts, compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 20 - "Observaciones (no bloquean)"
Cohesion: 0.09
Nodes (21): Afirmaciones nuevas comprobadas, Bloqueos, Lo que se comprobó y es correcto, Observaciones (no bloquean), Queda una observación (no bloquea), R-10 (O) · frontend: una restricción de imports en los módulos probados, R-11 (O) · frontend: el tema oscuro es la base, R-12 (O) · config: «relacionadas» no corre Rust (+13 more)

### Community 21 - "tauri.linux.conf.json"
Cohesion: 0.25
Nodes (7): appimage, deb, app, windows, bundle, targets, $schema

### Community 22 - "InstanceCard"
Cohesion: 0.33
Nodes (7): formatCaptureTime(), formatModelName(), formatSessionTime(), InstanceCard(), InstanceEditor(), managedIconSource(), OriginalAppSection()

### Community 23 - "PathBuf"
Cohesion: 0.13
Nodes (23): ArtifactMonitorSummary, DashboardState, HashMap, Instant, PathBuf, SessionTransferInfo, ApplicationFingerprint, applies_the_latest_model_context_and_clamps_percentage() (+15 more)

### Community 24 - "Option"
Cohesion: 0.08
Nodes (78): Option, Path, application_fingerprint(), apply_external_icon_best_effort(), apply_macos_branding_after_update(), apply_macos_custom_icon(), artifact_export_roots(), ArtifactMonitorEntry (+70 more)

### Community 25 - "HU-0002 — Actualizar la aplicación original y mostrar metadatos precisos por modelo y proveedor"
Cohesion: 0.10
Nodes (21): Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Cierre del fix — CA11 y CA12, Contexto y evidencia de Graphify, Criterios de aceptación, Diseño técnico y contratos (+13 more)

### Community 26 - "HU-0003 — Transferencias conscientes de artefactos, actualización disponible y uso en vivo"
Cohesion: 0.10
Nodes (21): Actualización disponible, Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Diseño técnico y contratos (+13 more)

### Community 27 - "HU-0004 — Sincronización desde la instancia más reciente, cierre robusto, artefactos locales e identidad visual"
Cohesion: 0.10
Nodes (21): Alcance, Artefactos locales con soporte seguro, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Diseño técnico y contratos (+13 more)

### Community 28 - "app"
Cohesion: 0.40
Nodes (4): app, macOSPrivateApi, windows, $schema

### Community 29 - "CodeSession"
Cohesion: 0.67
Nodes (4): SessionTransferSelection, SessionUnlinkSelection, CodeSession, SessionProfile

### Community 30 - "HU-0005 — Recuperar la respuesta de la interfaz y establecer versionado SemVer"
Cohesion: 0.10
Nodes (21): Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Decisión pendiente para el Dock, Diseño técnico y contratos (+13 more)

### Community 31 - "deserialize_collection_count"
Cohesion: 0.67
Nodes (3): D, Error, deserialize_collection_count()

### Community 36 - "HU-0009 — Estado oficial de actualización y refresco de versiones"
Cohesion: 0.11
Nodes (18): Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Diseño técnico y contratos, Documentación afectada (+10 more)

### Community 37 - "HU-0006 — Escaneo automático silencioso y ciclo manual controlado"
Cohesion: 0.11
Nodes (18): Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Control de escaneos, Criterios de aceptación, Diseño técnico y contratos (+10 more)

### Community 38 - "HU-0007 — Spike de icono de Dock previo al primer inicio de sesión"
Cohesion: 0.12
Nodes (17): Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Diseño técnico y contratos, Documentación afectada (+9 more)

### Community 39 - "Code AI Profiles"
Cohesion: 0.12
Nodes (17): Cierre e identidad visual de instancias, Code AI Profiles, Compatibilidad actual y marcas, Contribuir, Crear cada versión, Cómo funciona el aislamiento, Desarrollo asistido por IA y Graphify, Desarrollo local (+9 more)

### Community 40 - "HU-0001 — Integrar Graphify y agentes especializados"
Cohesion: 0.12
Nodes (16): Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Diseño técnico y contratos, Documentación afectada (+8 more)

### Community 41 - "HU-0008 — Diagnóstico A/B del arranque macOS para branding previo al login"
Cohesion: 0.12
Nodes (16): Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Diseño técnico y contratos, Documentación afectada (+8 more)

### Community 42 - "Rust + Tauri 2 · {{PROYECTO}}"
Cohesion: 0.12
Nodes (15): Añadir un comando IPC, Errores, La estructura, La regla de oro, Lo que no se toma prestado, Lo que nunca, Procesos, Pruebas (+7 more)

### Community 43 - "Describir lo construido: reglas, arquitectura y componentes"
Cohesion: 0.13
Nodes (15): AC-01 · Reglas de negocio escritas, AC-02 · Arquitectura descrita, AC-03 · Componentes con skill, Alcance, Cierre, Criterios de aceptación, Decisiones por defecto (★), Definición de Preparado (+7 more)

### Community 44 - "Icono distintivo en el Dock de macOS"
Cohesion: 0.15
Nodes (13): AC-01 · Icono propio en el Dock sin romper la firma, Alcance, Cierre, Criterios de aceptación, Decisiones por defecto (★), Definición de Preparado, Definición de Terminado, Fuera de alcance (+5 more)

### Community 45 - "Adopción v4"
Cohesion: 0.17
Nodes (12): AC-01 · Método validado, AC-02 · Sesión nueva carga el método, Adopción v4, Alcance, Cierre, Criterios de aceptación, Definición de Preparado, Definición de Terminado (+4 more)

### Community 46 - "Changelog"
Cohesion: 0.18
Nodes (10): [0.2.0] - 2026-10-11, [0.2.1] - 2026-10-13, [0.2.2] - 2026-10-27, Added, Changed, Changed, Changed, Changelog (+2 more)

### Community 47 - "Actualizaciones de la aplicación original y las instancias"
Cohesion: 0.18
Nodes (10): Actualizaciones de la aplicación original y las instancias, Comportamiento por plataforma, Detección de versión disponible, Dos operaciones independientes, Errores y limitaciones, Flujo de actualización original, Límites de seguridad, Nombre y estado de la aplicación original (+2 more)

### Community 48 - "Sesiones y estimación de contexto"
Cohesion: 0.18
Nodes (10): Compactación y ausencia de datos, Cálculo y señales visuales, Mantenimiento de modelos y aliases, Origen y alcance del dato, Privacidad, Referencias oficiales, Sesiones y estimación de contexto, Transferencia de sesiones, artefactos y monitores (+2 more)

### Community 49 - "DESIGN.md"
Cohesion: 0.20
Nodes (8): Brand & Style, Colors, Components, Elevation & Depth, Layout & Spacing, Shapes, Typography, Guías de diseño · Code AI Profiles

### Community 52 - "Code AI Profiles · cómo trabajamos"
Cohesion: 0.22
Nodes (9): Code AI Profiles · cómo trabajamos, Cómo se trabaja, Las dos reglas fijas, Lo que no se edita a mano, Lo que sale de la máquina, Pruebas, Quién es quién, Reglas propias del proyecto (+1 more)

### Community 53 - "Sistema de agentes de desarrollo"
Cohesion: 0.25
Nodes (7): Definiciones y adaptadores, Flujo, Historias de usuario, Modelos de Codex, Propósito, Sistema de agentes de desarrollo, Uso fuera de Codex

### Community 54 - "Grafo de conocimiento con Graphify"
Cohesion: 0.29
Nodes (7): Artefactos versionados, Comandos, Grafo de conocimiento con Graphify, Instalación, Privacidad, Propósito, Regla de cierre

### Community 55 - "Rendimiento del dashboard"
Cohesion: 0.29
Nodes (6): Escaneo automático y manual, Límites, Procesos y almacenamiento, Progreso y privacidad, Refrescos por alcance, Rendimiento del dashboard

### Community 56 - "Verificación · HU-0011 · Adopción v4"
Cohesion: 0.29
Nodes (6): Comprobaciones, Decisiones tomadas por defecto (★, revisables al probar), Guía de prueba, Qué se entregó, Veredicto, Verificación · HU-0011 · Adopción v4

### Community 57 - "Contribuir a Code AI Profiles"
Cohesion: 0.33
Nodes (6): Antes de programar, Contribuir a Code AI Profiles, Licencia de las contribuciones, Privacidad y seguridad, Pull requests, Verificación local

### Community 58 - "Contrato de desarrollo asistido por IA"
Cohesion: 0.33
Nodes (5): Contrato de desarrollo asistido por IA, Flujo obligatorio para features y fixes, Graphify, Límites de los roles, Reglas del repositorio

### Community 59 - "ADR-0001 · Adopción de la metodología v4"
Cohesion: 0.33
Nodes (5): ADR-0001 · Adopción de la metodología v4, Alternativas, Consecuencias, Contexto, Decisión

### Community 60 - "Versionado de Code AI Profiles"
Cohesion: 0.33
Nodes (5): Actualizar una versión, Política, Publicación, Verificar consistencia, Versionado de Code AI Profiles

### Community 61 - "Stack de Code AI Profiles"
Cohesion: 0.40
Nodes (4): Las reglas que impone cada pieza, Módulo de configuración de cada app, Repos, Stack de Code AI Profiles

### Community 62 - "Ciclo de vida e identidad visual de instancias"
Cohesion: 0.40
Nodes (4): Ciclo de vida e identidad visual de instancias, Iconos por instancia, Inicio, detección y cierre, Privacidad y límites

### Community 63 - "Análisis"
Cohesion: 0.40
Nodes (4): Análisis, Arquitectura · HU-0011 · Adopción v4, Decisiones, Impacto

### Community 64 - "Invariantes de Code AI Profiles"
Cohesion: 0.50
Nodes (3): De producto (las aprueba Braiyan Rodriguez (mantenedor)), Invariantes de Code AI Profiles, Técnicas (las aprueba Braiyan Rodriguez (mantenedor))

### Community 65 - "Reglas de negocio de Code AI Profiles"
Cohesion: 0.50
Nodes (3): Cómo se escribe una regla, Dominios, Reglas de negocio de Code AI Profiles

### Community 66 - "PULL_REQUEST_TEMPLATE.md"
Cohesion: 0.50
Nodes (3): Autorización previa, Resumen, Verificación

### Community 72 - "copy_code_session_sync"
Cohesion: 0.18
Nodes (20): artifact_reference_count(), canonical_code_session_id(), clean_session_text(), copy_code_session_sync(), find_code_session_index(), load_session_links(), migrate_session_links(), migrates_existing_round_trip_as_a_link_to_the_original() (+12 more)

### Community 73 - "ManagedInstance"
Cohesion: 0.15
Nodes (17): CodeSession, CustomIcon, Duration, InstanceStatus, ManagedProcessIdentity, AccountPlan, custom_icon_contract_does_not_modify_the_application_path(), identity_matches_instance() (+9 more)

### Community 74 - "Design system con shadcn y showcase local"
Cohesion: 0.12
Nodes (17): AC-01 · El showcase se abre en local, AC-02 · Los componentes tienen el aspecto de la app, AC-03 · Tema oscuro y claro, AC-04 · El showcase no llega a la app empaquetada, AC-05 · Una skill con índice y una ficha por componente, Alcance, Cierre, Criterios de aceptación (+9 more)

### Community 75 - "Frontend escalable: componentes, features y router"
Cohesion: 0.12
Nodes (17): AC-01 · La app se ve y funciona igual, AC-02 · Cada pieza en su sitio, AC-03 · Hay un router listo para pantallas nuevas, AC-04 · Lo que ya funcionaba sigue en verde, AC-05 · La arquitectura queda escrita, Alcance, Cierre, Criterios de aceptación (+9 more)

### Community 76 - "check_source_update_sync"
Cohesion: 0.19
Nodes (15): Default, SourceUpdateSource, SourceUpdateStatus, check_apt_update(), check_official_update_feed(), check_source_update(), check_source_update_sync(), parse_apt_policy() (+7 more)

## Knowledge Gaps
- **575 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+570 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `HU-0002 — Actualizar la aplicación original y mostrar metadatos precisos por modelo y proveedor` connect `HU-0002 — Actualizar la aplicación original y mostrar metadatos precisos por modelo y proveedor` to `index.md`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `HU-0004 — Sincronización desde la instancia más reciente, cierre robusto, artefactos locales e identidad visual` connect `HU-0004 — Sincronización desde la instancia más reciente, cierre robusto, artefactos locales e identidad visual` to `index.md`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `Code AI Profiles` connect `Code AI Profiles` to `README.md`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _575 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.043478260869565216 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06464646464646465 - nodes in this community are weakly interconnected._
- **Should `lib.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.049667178699436765 - nodes in this community are weakly interconnected._