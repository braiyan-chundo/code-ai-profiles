# Graph Report - Code AI Profiles  (2026-10-28)

## Corpus Check
- 162 files · ~108,128 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1447 nodes · 3329 edges · 87 communities (78 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cb4c019c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- String
- DialogHost.tsx
- scripts
- Icons.tsx
- lib.rs
- Solución
- types.ts
- bundle
- hu0008-macos-launch-ab-diagnostic.sh
- hu0007-macos-dock-icon-spike.sh
- Revisión técnica · HU-0015 · Frontend escalable: componentes, features y router
- compilerOptions
- release-version.mjs
- Brief · HU-0015 · frontend
- synchronize_managed_applications_sync
- useDashboard
- graphify.mjs
- permissions
- HU-0010 — Publicar el fix de actualización como versión 0.2.2
- compilerOptions
- Observaciones (no bloquean)
- tauri.linux.conf.json
- update_instance_application_from_source_sync
- PathBuf
- Option
- HU-0002 — Actualizar la aplicación original y mostrar metadatos precisos por modelo y proveedor
- HU-0003 — Transferencias conscientes de artefactos, actualización disponible y uso en vivo
- HU-0004 — Sincronización desde la instancia más reciente, cierre robusto, artefactos locales e identidad visual
- app
- updates/index.ts
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
- Publicar el fix de actualización como versión 0.2.2
- Design system con shadcn y showcase local
- Frontend escalable: componentes, features y router
- .capture
- HU-0014-design-system-con-shadcn-y-showcase-loca/seguimiento.md
- HU-0015-frontend-escalable-componentes-features-/seguimiento.md
- HU-0010-publicar-fix-de-actualizacion-como-0-2-2.md
- appearance/index.ts
- devDependencies
- dependencies
- Vec
- package.json
- Verificación · HU-0015 · Frontend escalable: componentes, features y router
- deserialize_collection_count

## God Nodes (most connected - your core abstractions)
1. `useDashboard()` - 46 edges
2. `copy_code_session_sync()` - 30 edges
3. `update_instance_application_from_source_sync()` - 28 edges
4. `DashboardState` - 25 edges
5. `set_instance_icon_sync()` - 24 edges
6. `system_info_scoped()` - 23 edges
7. `synchronize_managed_applications_sync()` - 23 edges
8. `scripts` - 21 edges
9. `ManagedInstance` - 21 edges
10. `load_registry()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `harness()` --calls--> `createScanController()`  [EXTRACTED]
  tests/scan-controller.test.ts → src/lib/scan-controller.ts
- `harness()` --calls--> `createSourceUpdateController()`  [EXTRACTED]
  tests/source-update-controller.test.ts → src/lib/source-update-controller.ts
- `DialogHost()` --calls--> `useDashboard()`  [EXTRACTED]
  src/app/layout/DialogHost.tsx → src/features/dashboard/dashboard-context.ts
- `DialogHost()` --calls--> `useInstanceActions()`  [EXTRACTED]
  src/app/layout/DialogHost.tsx → src/features/instances/useInstanceActions.ts
- `DialogHost()` --calls--> `useSessionActions()`  [EXTRACTED]
  src/app/layout/DialogHost.tsx → src/features/sessions/useSessionActions.ts

## Import Cycles
- None detected.

## Communities (87 total, 9 thin omitted)

### Community 0 - "String"
Cohesion: 0.16
Nodes (53): AppHandle, Child, Result, check_source_update(), clear_instance_icon(), copy_code_session(), create_instance(), create_instance_sync() (+45 more)

### Community 1 - "DialogHost.tsx"
Cohesion: 0.13
Nodes (19): AppShell(), DialogHost(), Statusbar(), Titlebar(), windowAction, useDialogs(), RouteErrorBoundary(), router (+11 more)

### Community 2 - "scripts"
Cohesion: 0.10
Nodes (21): scripts, build, build:linux, build:macos, build:windows, dev, graph:build, graph:check (+13 more)

### Community 3 - "Icons.tsx"
Cohesion: 0.09
Nodes (38): ConfirmDialog(), AlertIcon(), ChevronIcon(), ClockIcon(), CloudIcon(), CodeSessionIcon(), EditIcon(), FolderIcon() (+30 more)

### Community 4 - "lib.rs"
Cohesion: 0.04
Nodes (75): annotates_a_session_linked_inside_the_original_app(), apply_session_links(), apply_session_links_to_profile(), artifact_reference_count(), ArtifactMonitorEntry, ArtifactMonitorSummary, atomic_replace_file(), atomically_creates_and_replaces_session_index() (+67 more)

### Community 5 - "Solución"
Cohesion: 0.06
Nodes (31): Arquitectura del frontend, Añadir una feature, Añadir una pantalla, Dónde va cada cosa, Estado, Estilos, Estructura, Las features (+23 more)

### Community 6 - "types.ts"
Cohesion: 0.08
Nodes (27): originalUpdateChannel, OriginalApplicationUpdateDialog(), call(), isTauri(), mockInstances, mockOriginalSessions, now, ArtifactMonitorSummary (+19 more)

### Community 7 - "bundle"
Cohesion: 0.06
Nodes (33): $APPDATA/managed-instances/*/branding/icon.png, icons/128x128@2x.png, icons/128x128.png, icons/32x32.png, icons/icon.icns, icons/icon.ico, app, macOSPrivateApi (+25 more)

### Community 8 - "hu0008-macos-launch-ab-diagnostic.sh"
Cohesion: 0.11
Nodes (27): cleanup(), collect_crash_evidence(), dry_run(), emit_error(), failure_cleanup(), launch_one(), OBSERVATION_MS, purge_snapshot_raw() (+19 more)

### Community 9 - "hu0007-macos-dock-icon-spike.sh"
Cohesion: 0.15
Nodes (22): cleanup(), CLONE_NAME, dry_run(), find_valid_primary_pid(), json_error(), prepare(), prepare_failure_cleanup(), REPO_ICON (+14 more)

### Community 10 - "Revisión técnica · HU-0015 · Frontend escalable: componentes, features y router"
Cohesion: 0.11
Nodes (17): Foco 1 · Copia literal y desviaciones declaradas, Foco 2 · R-1 a R-9, Foco 3 · Reducer y contrato, Foco 4 · Dependencias (comprobadas con `rg`), Foco 5 · Tamaño del JS, Foco 6 · Documentación frente al código, Método, Observaciones (no bloquean) (+9 more)

### Community 11 - "compilerOptions"
Cohesion: 0.09
Nodes (22): DOM, DOM.Iterable, ES2022, src, compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop (+14 more)

### Community 12 - "release-version.mjs"
Cohesion: 0.17
Nodes (17): canonicalVersion(), cargoPackageBlocks(), checkVersions(), collectState(), main(), packageSection(), parseJson(), readSources() (+9 more)

### Community 13 - "Brief · HU-0015 · frontend"
Cohesion: 0.50
Nodes (3): Ajuste del orquestador (2026-10-28), Brief · HU-0015 · frontend, Verificación manual de AC-01

### Community 14 - "synchronize_managed_applications_sync"
Cohesion: 0.08
Nodes (54): CodeSession, CustomIcon, Default, Duration, FnOnce, InstanceStatus, ManagedInstance, ManagedProcessIdentity (+46 more)

### Community 15 - "useDashboard"
Cohesion: 0.09
Nodes (43): DashboardRuntime(), useDashboard(), useInitialLoad(), useLiveUsage(), ScanContext, ScanContextValue, ScanProgressPanel(), useBackgroundRefresh() (+35 more)

### Community 16 - "graphify.mjs"
Cohesion: 0.13
Nodes (14): candidates, generateGraph(), graphDir, graphify, graphPath, restoreMemory(), withMemoryAside(), projectRoot (+6 more)

### Community 17 - "permissions"
Cohesion: 0.17
Nodes (11): core:default, core:window:allow-close, core:window:allow-minimize, core:window:allow-start-dragging, core:window:allow-toggle-maximize, main, description, identifier (+3 more)

### Community 18 - "HU-0010 — Publicar el fix de actualización como versión 0.2.2"
Cohesion: 0.12
Nodes (16): Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Diseño técnico y contratos, Documentación afectada (+8 more)

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
Cohesion: 0.18
Nodes (15): cached_source_version(), instance_bundle_name(), normalize_linux_version(), personalize_application_path(), refresh_instance_bundle_names(), refresh_instance_versions(), rollback_application_directory(), source_version() (+7 more)

### Community 23 - "PathBuf"
Cohesion: 0.14
Nodes (24): ArtifactMonitorSummary, DashboardState, HashMap, Instant, PathBuf, SessionTransferInfo, SourceUpdateInfo, ApplicationFingerprint (+16 more)

### Community 24 - "Option"
Cohesion: 0.15
Nodes (42): Option, Path, application_fingerprint(), application_fingerprint_changes_when_managed_bytes_change(), apply_macos_branding_after_update(), apply_macos_custom_icon(), clear_instance_icon_sync(), clear_macos_custom_icon() (+34 more)

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

### Community 29 - "updates/index.ts"
Cohesion: 0.23
Nodes (12): ApplicationUpdateDialog(), SourceUpdateContext, SourceUpdateContextValue, useSourceUpdate(), SourceUpdateBanner(), SynchronizeBanner(), summarizeSynchronization(), SynchronizationSummary (+4 more)

### Community 30 - "HU-0005 — Recuperar la respuesta de la interfaz y establecer versionado SemVer"
Cohesion: 0.10
Nodes (21): Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Decisión pendiente para el Dock, Diseño técnico y contratos (+13 more)

### Community 31 - "dashboard/index.ts"
Cohesion: 0.12
Nodes (27): PanelRoute(), Toolbar(), EmptyState(), LoadingCards(), Metric(), DashboardContext, DashboardContextValue, countCodeSessions() (+19 more)

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
Cohesion: 0.15
Nodes (12): [0.2.0] - 2026-10-11, [0.2.1] - 2026-10-13, [0.2.2] - 2026-10-27, Added, Changed, Changed, Changed, Changed (+4 more)

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
Cohesion: 0.25
Nodes (7): Escaneo automático y manual, Límites, Peso del frontend, Procesos y almacenamiento, Progreso y privacidad, Refrescos por alcance, Rendimiento del dashboard

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
Cohesion: 0.15
Nodes (24): DialogsContext, DialogsContextValue, Setter, InstanceCardProps, formatTokenCount(), sessionContextLevel, describeArtifactOutcome(), transferNotice() (+16 more)

### Community 73 - "Publicar el fix de actualización como versión 0.2.2"
Cohesion: 0.17
Nodes (12): AC-01 · Versión sincronizada, AC-02 · Documentación coherente, AC-03 · Pruebas y grafo en verde, AC-04 · Integración por PR, AC-05 · Bundle macOS verificable, Alcance, Criterios de aceptación, Estado al adoptar (+4 more)

### Community 74 - "Design system con shadcn y showcase local"
Cohesion: 0.12
Nodes (17): AC-01 · El showcase se abre en local, AC-02 · Los componentes tienen el aspecto de la app, AC-03 · Tema oscuro y claro, AC-04 · El showcase no llega a la app empaquetada, AC-05 · Una skill con índice y una ficha por componente, Alcance, Cierre, Criterios de aceptación (+9 more)

### Community 75 - "Frontend escalable: componentes, features y router"
Cohesion: 0.12
Nodes (17): AC-01 · La app se ve y funciona igual, AC-02 · Cada pieza en su sitio, AC-03 · Hay un router listo para pantallas nuevas, AC-04 · Lo que ya funcionaba sigue en verde, AC-05 · La arquitectura queda escrita, Alcance, Cierre, Criterios de aceptación (+9 more)

### Community 76 - ".capture"
Cohesion: 0.17
Nodes (11): Mutex, Self, light_refresh_executes_one_inventory_and_skips_expensive_work(), platform_name(), process_start_time(), registry_operation_mutex(), reset_refresh_work_counters(), run() (+3 more)

### Community 79 - "HU-0010-publicar-fix-de-actualizacion-como-0-2-2.md"
Cohesion: 0.33
Nodes (3): Análisis, Arquitectura · HU-0010 · Publicar el fix de actualización como versión 0.2.2, Impacto

### Community 80 - "appearance/index.ts"
Cohesion: 0.17
Nodes (19): App(), AppProviders(), DialogsProvider(), AppearanceContext, AppearanceContextValue, APPEARANCE_STORAGE_KEY, AppearancePreferences, AppTheme (+11 more)

### Community 81 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, @tauri-apps/cli, @types/react, @types/react-dom, typescript, vite, @vitejs/plugin-react, @tauri-apps/cli (+5 more)

### Community 82 - "dependencies"
Cohesion: 0.15
Nodes (13): @fontsource/inter, @fontsource/jetbrains-mono, dependencies, @fontsource/inter, @fontsource/jetbrains-mono, react, react-dom, react-router (+5 more)

### Community 83 - "Vec"
Cohesion: 0.13
Nodes (18): OsString, artifact_export_rejects_symlinks_and_depth_escapes(), artifact_export_roots(), ArtifactTransferOutcome, collect_opaque_artifact_files(), export_local_artifacts(), MacosOriginalLaunch, normalized_icon_png() (+10 more)

### Community 84 - "package.json"
Cohesion: 0.33
Nodes (5): name, packageManager, private, type, version

### Community 85 - "Verificación · HU-0015 · Frontend escalable: componentes, features y router"
Cohesion: 0.29
Nodes (6): Comprobaciones, Decisiones tomadas por defecto (★, revisables al probar), Guía de prueba, Qué se entregó, Veredicto, Verificación · HU-0015 · Frontend escalable: componentes, features y router

### Community 89 - "deserialize_collection_count"
Cohesion: 0.67
Nodes (3): D, Error, deserialize_collection_count()

## Knowledge Gaps
- **602 isolated node(s):** `name`, `private`, `version`, `type`, `packageManager` (+597 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useDashboard()` connect `useDashboard` to `DialogHost.tsx`, `Icons.tsx`, `types.ts`, `sessions/index.ts`, `appearance/index.ts`, `updates/index.ts`, `dashboard/index.ts`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `HU-0009 — Estado oficial de actualización y refresco de versiones` connect `HU-0009 — Estado oficial de actualización y refresco de versiones` to `index.md`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `Code AI Profiles` connect `Code AI Profiles` to `README.md`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _602 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `DialogHost.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `Icons.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08870056497175141 - nodes in this community are weakly interconnected._