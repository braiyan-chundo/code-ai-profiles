# Graph Report - Code AI Profiles  (2026-10-28)

## Corpus Check
- 135 files · ~102,114 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1363 nodes · 3046 edges · 86 communities (77 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ee1f2c5a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- String
- .capture
- scripts
- AppView.tsx
- lib.rs
- Solución
- types.ts
- bundle
- hu0008-macos-launch-ab-diagnostic.sh
- hu0007-macos-dock-icon-spike.sh
- source-update-controller.ts
- compilerOptions
- release-version.mjs
- Brief · HU-0015 · frontend
- ManagedInstance
- useScanRuntime.ts
- graphify.mjs
- permissions
- HU-0010 — Publicar el fix de actualización como versión 0.2.2
- compilerOptions
- Observaciones (no bloquean)
- tauri.linux.conf.json
- update_instance_application_from_source_sync
- Vec
- Option
- HU-0002 — Actualizar la aplicación original y mostrar metadatos precisos por modelo y proveedor
- HU-0003 — Transferencias conscientes de artefactos, actualización disponible y uso en vivo
- HU-0004 — Sincronización desde la instancia más reciente, cierre robusto, artefactos locales e identidad visual
- app
- result-messages.test.ts
- HU-0005 — Recuperar la respuesta de la interfaz y establecer versionado SemVer
- dashboard/index.ts
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
- sessions/index.ts
- copy_code_session_sync
- Design system con shadcn y showcase local
- Frontend escalable: componentes, features y router
- deserialize_collection_count
- HU-0014-design-system-con-shadcn-y-showcase-loca/seguimiento.md
- HU-0015-frontend-escalable-componentes-features-/seguimiento.md
- check_source_update_sync
- appearance-preferences.ts
- devDependencies
- dependencies
- DashboardRuntime.tsx
- package.json
- format.test.ts

## God Nodes (most connected - your core abstractions)
1. `copy_code_session_sync()` - 30 edges
2. `update_instance_application_from_source_sync()` - 28 edges
3. `DashboardState` - 25 edges
4. `set_instance_icon_sync()` - 24 edges
5. `system_info_scoped()` - 23 edges
6. `synchronize_managed_applications_sync()` - 23 edges
7. `AppView()` - 23 edges
8. `scripts` - 21 edges
9. `ManagedInstance` - 21 edges
10. `load_registry()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `AppView()` --indirect_call--> `loadAppearancePreferences()`  [INFERRED]
  src/app/AppView.tsx → src/features/appearance/appearance-preferences.ts
- `useScanRuntime()` --indirect_call--> `friendlyError()`  [INFERRED]
  src/features/scan/useScanRuntime.ts → src/lib/errors.ts
- `harness()` --calls--> `createScanController()`  [EXTRACTED]
  tests/scan-controller.test.ts → src/lib/scan-controller.ts
- `harness()` --calls--> `createSourceUpdateController()`  [EXTRACTED]
  tests/source-update-controller.test.ts → src/lib/source-update-controller.ts
- `AppView()` --calls--> `resolveTheme()`  [EXTRACTED]
  src/app/AppView.tsx → src/features/appearance/appearance-preferences.ts

## Import Cycles
- None detected.

## Communities (86 total, 9 thin omitted)

### Community 0 - "String"
Cohesion: 0.15
Nodes (57): AppHandle, Child, Result, check_source_update(), clear_instance_icon(), clear_instance_icon_sync(), copy_code_session(), create_instance() (+49 more)

### Community 1 - ".capture"
Cohesion: 0.17
Nodes (11): Mutex, Self, light_refresh_executes_one_inventory_and_skips_expensive_work(), platform_name(), process_start_time(), registry_operation_mutex(), reset_refresh_work_counters(), run() (+3 more)

### Community 2 - "scripts"
Cohesion: 0.10
Nodes (21): scripts, build, build:linux, build:macos, build:windows, dev, graph:build, graph:check (+13 more)

### Community 3 - "AppView.tsx"
Cohesion: 0.11
Nodes (34): ConfirmDialog(), EmptyState(), AlertIcon(), ChevronIcon(), ClockIcon(), CloudIcon(), CodeSessionIcon(), EditIcon() (+26 more)

### Community 4 - "lib.rs"
Cohesion: 0.04
Nodes (57): application_fingerprint_changes_when_managed_bytes_change(), ArtifactMonitorEntry, clean_session_text(), clears_context_after_compaction_until_the_next_response(), CodeSessionDocument, contains_model_alias(), context_window_for_model(), CopyCodeSessionRequest (+49 more)

### Community 5 - "Solución"
Cohesion: 0.06
Nodes (31): Arquitectura del frontend, Añadir una feature, Añadir una pantalla, Dónde va cada cosa, Estado, Estilos, Estructura, Las features (+23 more)

### Community 6 - "types.ts"
Cohesion: 0.10
Nodes (24): call(), isTauri(), mockInstances, mockOriginalSessions, now, ArtifactMonitorSummary, CopyCodeSessionRequest, CreateInstanceRequest (+16 more)

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
Cohesion: 0.22
Nodes (12): createSourceUpdateController(), HandoffIntent, SourceUpdateControllerOptions, sourceUpdatePresentation, SourceUpdatePresentationKind, SourceUpdateInfo, VersionTopology, dashboard() (+4 more)

### Community 11 - "compilerOptions"
Cohesion: 0.09
Nodes (22): DOM, DOM.Iterable, ES2022, src, compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop (+14 more)

### Community 12 - "release-version.mjs"
Cohesion: 0.17
Nodes (17): canonicalVersion(), cargoPackageBlocks(), checkVersions(), collectState(), main(), packageSection(), parseJson(), readSources() (+9 more)

### Community 13 - "Brief · HU-0015 · frontend"
Cohesion: 0.50
Nodes (3): Ajuste del orquestador (2026-10-28), Brief · HU-0015 · frontend, Verificación manual de AC-01

### Community 14 - "ManagedInstance"
Cohesion: 0.16
Nodes (18): CodeSession, CustomIcon, Duration, InstanceStatus, ManagedProcessIdentity, AccountPlan, identity_matches_instance(), ManagedInstance (+10 more)

### Community 15 - "useScanRuntime.ts"
Cohesion: 0.15
Nodes (19): ScanContext, ScanContextValue, useScan(), ScanProgressPanel(), ScanProgressEvent, ScanRuntime, useScanRuntime(), BACKGROUND_REFRESH_COOLDOWN_MS (+11 more)

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

### Community 22 - "update_instance_application_from_source_sync"
Cohesion: 0.16
Nodes (27): FnOnce, apply_external_icon_best_effort(), build_version_topology(), cached_source_version(), launch_macos_original_application_with(), macos_update_launcher_receives_only_the_validated_exact_original_path(), macos_update_launcher_rejects_a_managed_application_without_launching(), managed_bytes() (+19 more)

### Community 23 - "Vec"
Cohesion: 0.08
Nodes (47): ArtifactMonitorSummary, DashboardState, Default, HashMap, Instant, ManagedInstance, OsString, PathBuf (+39 more)

### Community 24 - "Option"
Cohesion: 0.14
Nodes (42): Option, Path, application_fingerprint(), apply_macos_branding_after_update(), apply_macos_custom_icon(), ArtifactMonitorSummary, clean_monitor_state(), clear_macos_custom_icon() (+34 more)

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

### Community 29 - "result-messages.test.ts"
Cohesion: 0.12
Nodes (16): ICON_ACCEPTED_TYPES, ICON_MAX_BYTES, ICON_MAX_SIZE, ICON_MIN_SIZE, iconFileError(), originalUpdateChannel, OriginalApplicationUpdateDialog(), summarizeSynchronization() (+8 more)

### Community 30 - "HU-0005 — Recuperar la respuesta de la interfaz y establecer versionado SemVer"
Cohesion: 0.10
Nodes (21): Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Decisión pendiente para el Dock, Diseño técnico y contratos (+13 more)

### Community 31 - "dashboard/index.ts"
Cohesion: 0.15
Nodes (22): App(), AppView(), DashboardContext, DashboardContextValue, countCodeSessions(), countRunning(), filterInstances(), matchesOriginalApp() (+14 more)

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

### Community 72 - "sessions/index.ts"
Cohesion: 0.23
Nodes (14): formatTokenCount(), sessionContextLevel, describeArtifactOutcome(), transferNotice(), unlinkDialogCopy, SessionTransferSelection, SessionUnlinkSelection, SessionContextMeter() (+6 more)

### Community 73 - "copy_code_session_sync"
Cohesion: 0.17
Nodes (21): artifact_reference_count(), atomic_replace_file(), atomically_creates_and_replaces_session_index(), canonical_code_session_id(), copy_code_session_sync(), find_code_session_index(), load_session_links(), migrate_session_links() (+13 more)

### Community 74 - "Design system con shadcn y showcase local"
Cohesion: 0.12
Nodes (17): AC-01 · El showcase se abre en local, AC-02 · Los componentes tienen el aspecto de la app, AC-03 · Tema oscuro y claro, AC-04 · El showcase no llega a la app empaquetada, AC-05 · Una skill con índice y una ficha por componente, Alcance, Cierre, Criterios de aceptación (+9 more)

### Community 75 - "Frontend escalable: componentes, features y router"
Cohesion: 0.12
Nodes (17): AC-01 · La app se ve y funciona igual, AC-02 · Cada pieza en su sitio, AC-03 · Hay un router listo para pantallas nuevas, AC-04 · Lo que ya funcionaba sigue en verde, AC-05 · La arquitectura queda escrita, Alcance, Cierre, Criterios de aceptación (+9 more)

### Community 76 - "deserialize_collection_count"
Cohesion: 0.67
Nodes (3): D, Error, deserialize_collection_count()

### Community 79 - "check_source_update_sync"
Cohesion: 0.24
Nodes (12): SourceUpdateSource, SourceUpdateStatus, check_apt_update(), check_official_update_feed(), check_source_update_sync(), parse_apt_policy(), read_source_update_cache(), save_source_update_cache() (+4 more)

### Community 80 - "appearance-preferences.ts"
Cohesion: 0.24
Nodes (13): APPEARANCE_STORAGE_KEY, AppearancePreferences, AppTheme, DEFAULT_APPEARANCE, loadAppearancePreferences(), PreferencesStorage, ResolvedTheme, resolveTheme() (+5 more)

### Community 81 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, @tauri-apps/cli, @types/react, @types/react-dom, typescript, vite, @vitejs/plugin-react, @tauri-apps/cli (+5 more)

### Community 82 - "dependencies"
Cohesion: 0.18
Nodes (11): @fontsource/inter, @fontsource/jetbrains-mono, dependencies, @fontsource/inter, @fontsource/jetbrains-mono, react, react-dom, @tauri-apps/api (+3 more)

### Community 83 - "DashboardRuntime.tsx"
Cohesion: 0.17
Nodes (20): DashboardRuntime(), useDashboard(), useInitialLoad(), InstanceIconChange, applyLiveUsage(), UsageMeter(), useLiveUsage(), useBackgroundRefresh() (+12 more)

### Community 84 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 85 - "format.test.ts"
Cohesion: 0.33
Nodes (6): formatBytes(), formatCaptureTime(), resolveRuntimePlatform(), RuntimePlatform, shortcutModifierLabel(), SystemPlatform

## Knowledge Gaps
- **578 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+573 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Design system con shadcn y showcase local` connect `Design system con shadcn y showcase local` to `README.md`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `HU-0002 — Actualizar la aplicación original y mostrar metadatos precisos por modelo y proveedor` connect `HU-0002 — Actualizar la aplicación original y mostrar metadatos precisos por modelo y proveedor` to `index.md`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `HU-0006 — Escaneo automático silencioso y ciclo manual controlado` connect `HU-0006 — Escaneo automático silencioso y ciclo manual controlado` to `index.md`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _578 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `AppView.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10980392156862745 - nodes in this community are weakly interconnected._
- **Should `lib.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._