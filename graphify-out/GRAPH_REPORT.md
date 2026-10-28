# Graph Report - Code AI Profiles  (2026-10-28)

## Corpus Check
- 318 files · ~160,227 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2271 nodes · 5308 edges · 139 communities (121 shown, 18 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `08bd8b2d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Result
- useDashboard
- scripts
- sections/attachment.tsx
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
- ManagedPaths
- DashboardRuntime.tsx
- graphify.mjs
- permissions
- HU-0010 — Publicar el fix de actualización como versión 0.2.2
- compilerOptions
- Observaciones (no bloquean)
- tauri.linux.conf.json
- sections/message-scroller.tsx
- PathBuf
- String
- HU-0002 — Actualizar la aplicación original y mostrar metadatos precisos por modelo y proveedor
- HU-0003 — Transferencias conscientes de artefactos, actualización disponible y uso en vivo
- HU-0004 — Sincronización desde la instancia más reciente, cierre robusto, artefactos locales e identidad visual
- app
- icon-validation.ts
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
- UnlinkSessionDialog.tsx
- Análisis
- Invariantes de Code AI Profiles
- Reglas de negocio de Code AI Profiles
- PULL_REQUEST_TEMPLATE.md
- HU-0010-publicar-el-fix-de-actualizacion-como-ve/seguimiento.md
- HU-0011-adopcion-v4/seguimiento.md
- HU-0012-icono-distintivo-en-el-dock-de-macos/seguimiento.md
- HU-0013-describir-lo-construido-reglas-arquitect/seguimiento.md
- sections/navigation-menu.tsx
- Rediseño con sidebar, dashboard y página por instancia
- Design system con shadcn y showcase local
- Frontend escalable: componentes, features y router
- update_instance_application_from_source_sync
- HU-0014-design-system-con-shadcn-y-showcase-loca/seguimiento.md
- HU-0015-frontend-escalable-componentes-features-/seguimiento.md
- Solución
- AppearanceDialog.tsx
- devDependencies
- dependencies
- Vec
- package.json
- Verificación · HU-0015 · Frontend escalable: componentes, features y router
- sessions/index.ts
- Brief · HU-0014 · frontend
- input-otp
- Block
- sections/dropdown-menu.tsx
- ui/sidebar.tsx
- sections/tooltip.tsx
- ui/combobox.tsx
- ShowcaseSection.tsx
- ui/button.tsx
- sections/questionnaire.tsx
- ui/command.tsx
- sections/menubar.tsx
- ui/carousel.tsx
- sections/context-menu.tsx
- sections/trace.tsx
- ManagedInstance
- updates/index.ts
- ui/chart.tsx
- sections/table.tsx
- sections/direction.tsx
- sections/drawer.tsx
- sections/select.tsx
- sections/sheet.tsx
- sections/code-block.tsx
- utils.ts
- sections/pagination.tsx
- Solución
- EmptyState.tsx
- sections/popover.tsx
- highlighter.tsx
- sections/accordion.tsx
- sections/input-otp.tsx
- sections/marker.tsx
- Revisión técnica · HU-0014 · Design system con shadcn y showcase local
- Brief · HU-0016 · frontend
- ui-isolation.test.ts
- react
- date-fns
- @fontsource/jetbrains-mono
- react-day-picker
- react-resizable-panels
- react-router
- @shadcn/react
- shiki
- Verificación · HU-0014 · Design system con shadcn y showcase local
- sections/native-select.tsx
- catalog.ts
- SessionList.tsx
- instances/index.ts
- HU-0016-rediseno-con-sidebar-dashboard-y-pagina-/seguimiento.md
- sections/resizable.tsx
- Ciclo de vida e identidad visual de instancias

## God Nodes (most connected - your core abstractions)
1. `Block()` - 64 edges
2. `Sample()` - 60 edges
3. `Button()` - 52 edges
4. `useDashboard()` - 48 edges
5. `copy_code_session_sync()` - 30 edges
6. `update_instance_application_from_source_sync()` - 28 edges
7. `DashboardState` - 25 edges
8. `set_instance_icon_sync()` - 24 edges
9. `system_info_scoped()` - 23 edges
10. `synchronize_managed_applications_sync()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `CalendarDayButton()` --references--> `react`  [EXTRACTED]
  src/components/ui/calendar.tsx → package.json
- `Carousel()` --references--> `react`  [EXTRACTED]
  src/components/ui/carousel.tsx → package.json
- `useCarousel()` --references--> `react`  [EXTRACTED]
  src/components/ui/carousel.tsx → package.json
- `ChartContainer()` --references--> `react`  [EXTRACTED]
  src/components/ui/chart.tsx → package.json
- `ChartTooltipContent()` --references--> `react`  [EXTRACTED]
  src/components/ui/chart.tsx → package.json

## Import Cycles
- None detected.

## Communities (139 total, 18 thin omitted)

### Community 0 - "Result"
Cohesion: 0.16
Nodes (39): AppHandle, Child, D, Error, Result, check_source_update(), clear_instance_icon(), copy_code_session() (+31 more)

### Community 1 - "useDashboard"
Cohesion: 0.14
Nodes (25): AppShell(), SIDEBAR_STYLE, DialogHost(), FeedbackArea(), PageContent(), PageHeader(), PageSkeleton(), Statusbar() (+17 more)

### Community 2 - "scripts"
Cohesion: 0.09
Nodes (22): scripts, build, build:linux, build:macos, build:windows, dev, graph:build, graph:check (+14 more)

### Community 3 - "sections/attachment.tsx"
Cohesion: 0.21
Nodes (12): Attachment(), AttachmentAction(), AttachmentActions(), AttachmentContent(), AttachmentDescription(), AttachmentGroup(), AttachmentMedia(), attachmentMediaVariants (+4 more)

### Community 4 - "lib.rs"
Cohesion: 0.05
Nodes (57): annotates_a_session_linked_inside_the_original_app(), application_fingerprint_changes_when_managed_bytes_change(), apply_session_links_to_profile(), artifact_reference_count(), ArtifactMonitorSummary, atomically_creates_and_replaces_session_index(), canonical_code_session_id(), clean_monitor_state() (+49 more)

### Community 5 - "Solución"
Cohesion: 0.06
Nodes (31): Arquitectura del frontend, Añadir una feature, Añadir una pantalla, Design system (HU-0014), Dónde va cada cosa, Estado, Estilos, Estructura (+23 more)

### Community 6 - "types.ts"
Cohesion: 0.07
Nodes (43): DialogsContext, DialogsContextValue, Setter, InstanceDetailProps, describeArtifactOutcome(), transferNotice(), unlinkDialogCopy, SessionTransferSelection (+35 more)

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
Cohesion: 0.08
Nodes (23): DOM, DOM.Iterable, ES2022, src, compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop (+15 more)

### Community 12 - "release-version.mjs"
Cohesion: 0.17
Nodes (17): canonicalVersion(), cargoPackageBlocks(), checkVersions(), collectState(), main(), packageSection(), parseJson(), readSources() (+9 more)

### Community 13 - "Brief · HU-0015 · frontend"
Cohesion: 0.50
Nodes (3): Ajuste del orquestador (2026-10-28), Brief · HU-0015 · frontend, Verificación manual de AC-01

### Community 14 - "ManagedPaths"
Cohesion: 0.12
Nodes (26): Default, FnOnce, SourceUpdateSource, SourceUpdateStatus, check_apt_update(), check_official_update_feed(), check_source_update_sync(), launch_macos_original_application_with() (+18 more)

### Community 15 - "DashboardRuntime.tsx"
Cohesion: 0.09
Nodes (41): DashboardRuntime(), useInitialLoad(), ScanContext, ScanContextValue, useBackgroundRefresh(), ScanProgressEvent, ScanRuntime, useScanLifecycle() (+33 more)

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

### Community 22 - "sections/message-scroller.tsx"
Cohesion: 0.08
Nodes (33): Avatar(), AvatarBadge(), AvatarFallback(), AvatarGroup(), AvatarGroupCount(), Bubble(), BubbleContent(), BubbleGroup() (+25 more)

### Community 23 - "PathBuf"
Cohesion: 0.08
Nodes (41): ArtifactMonitorSummary, DashboardState, HashMap, Instant, Mutex, PathBuf, SessionTransferInfo, SourceUpdateInfo (+33 more)

### Community 24 - "String"
Cohesion: 0.12
Nodes (59): Option, Path, application_fingerprint(), apply_external_icon_best_effort(), apply_macos_branding_after_update(), apply_macos_custom_icon(), ArtifactMonitorEntry, atomic_replace_file() (+51 more)

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

### Community 29 - "icon-validation.ts"
Cohesion: 0.32
Nodes (7): ICON_ACCEPTED_TYPES, ICON_MAX_BYTES, ICON_MAX_SIZE, ICON_MIN_SIZE, iconDimensionsError(), iconFileError(), InstanceEditor()

### Community 30 - "HU-0005 — Recuperar la respuesta de la interfaz y establecer versionado SemVer"
Cohesion: 0.10
Nodes (21): Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Decisión pendiente para el Dock, Diseño técnico y contratos (+13 more)

### Community 31 - "dashboard/index.ts"
Cohesion: 0.11
Nodes (28): AppSidebar(), SummaryCards(), DashboardContext, DashboardContextValue, countCodeSessions(), countRunning(), filterInstances(), findInstance() (+20 more)

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
Cohesion: 0.14
Nodes (13): [0.2.0] - 2026-10-11, [0.2.1] - 2026-10-13, [0.2.2] - 2026-10-27, Added, Added, Changed, Changed, Changed (+5 more)

### Community 47 - "Actualizaciones de la aplicación original y las instancias"
Cohesion: 0.18
Nodes (10): Actualizaciones de la aplicación original y las instancias, Comportamiento por plataforma, Detección de versión disponible, Dos operaciones independientes, Errores y limitaciones, Flujo de actualización original, Límites de seguridad, Nombre y estado de la aplicación original (+2 more)

### Community 48 - "Sesiones y estimación de contexto"
Cohesion: 0.18
Nodes (10): Compactación y ausencia de datos, Cálculo y señales visuales, Mantenimiento de modelos y aliases, Origen y alcance del dato, Privacidad, Referencias oficiales, Sesiones y estimación de contexto, Transferencia de sesiones, artefactos y monitores (+2 more)

### Community 49 - "DESIGN.md"
Cohesion: 0.18
Nodes (9): Brand & Style, Colors, Components, Cómo se aplica en Code AI Profiles, Elevation & Depth, Layout & Spacing, Shapes, Typography (+1 more)

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

### Community 62 - "UnlinkSessionDialog.tsx"
Cohesion: 0.31
Nodes (11): AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter(), AlertDialogHeader(), AlertDialogMedia() (+3 more)

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

### Community 72 - "sections/navigation-menu.tsx"
Cohesion: 0.30
Nodes (8): NavigationMenu(), NavigationMenuContent(), NavigationMenuItem(), NavigationMenuLink(), NavigationMenuList(), NavigationMenuTrigger(), navigationMenuTriggerStyle, NavigationMenuSection()

### Community 73 - "Rediseño con sidebar, dashboard y página por instancia"
Cohesion: 0.11
Nodes (18): AC-01 · Sidebar con todo lo navegable, AC-02 · Dashboard con el resumen global, AC-03 · Página de cada instancia, AC-04 · Página de la aplicación original, AC-05 · Con los componentes del catálogo y el aspecto de la app, AC-06 · No se pierde nada, Alcance, Cierre (+10 more)

### Community 74 - "Design system con shadcn y showcase local"
Cohesion: 0.12
Nodes (17): AC-01 · El showcase se abre en local, AC-02 · Los componentes tienen el aspecto de la app, AC-03 · Tema oscuro y claro, AC-04 · El showcase no llega a la app empaquetada, AC-05 · Una skill con índice y una ficha por componente, Alcance, Cierre, Criterios de aceptación (+9 more)

### Community 75 - "Frontend escalable: componentes, features y router"
Cohesion: 0.12
Nodes (17): AC-01 · La app se ve y funciona igual, AC-02 · Cada pieza en su sitio, AC-03 · Hay un router listo para pantallas nuevas, AC-04 · Lo que ya funcionaba sigue en verde, AC-05 · La arquitectura queda escrita, Alcance, Cierre, Criterios de aceptación (+9 more)

### Community 76 - "update_instance_application_from_source_sync"
Cohesion: 0.14
Nodes (33): Duration, ManagedInstance, Self, apply_session_links(), build_version_topology(), copy_provider_application(), create_instance_sync(), delete_instance_sync() (+25 more)

### Community 79 - "Solución"
Cohesion: 0.09
Nodes (21): Aislamiento de Tailwind, Ajustes a los componentes del registro (lista cerrada), Análisis, Archivos, Arquitectura · HU-0014 · Design system con shadcn y showcase local, Briefs y orden, Catálogo (63, registro `radix-vega`, 2026-10-28), Decisiones (A-n) y desvíos de las ★ (+13 more)

### Community 80 - "AppearanceDialog.tsx"
Cohesion: 0.16
Nodes (20): AppearanceContext, AppearanceContextValue, APPEARANCE_STORAGE_KEY, AppearancePreferences, AppTheme, DEFAULT_APPEARANCE, loadAppearancePreferences(), PreferencesStorage (+12 more)

### Community 81 - "devDependencies"
Cohesion: 0.10
Nodes (21): devDependencies, shadcn, tailwindcss, @tailwindcss/vite, @tauri-apps/cli, tw-animate-css, @types/react, @types/react-dom (+13 more)

### Community 82 - "dependencies"
Cohesion: 0.07
Nodes (27): @base-ui/react, class-variance-authority, cmdk, cn, embla-carousel-react, @fontsource/inter, lucide-react, dependencies (+19 more)

### Community 83 - "Vec"
Cohesion: 0.11
Nodes (24): OsString, artifact_export_rejects_symlinks_and_depth_escapes(), artifact_export_roots(), ArtifactTransferOutcome, collect_opaque_artifact_files(), export_local_artifacts(), get_live_usage(), get_live_usage_sync() (+16 more)

### Community 84 - "package.json"
Cohesion: 0.33
Nodes (5): name, packageManager, private, type, version

### Community 85 - "Verificación · HU-0015 · Frontend escalable: componentes, features y router"
Cohesion: 0.29
Nodes (6): Comprobaciones, Decisiones tomadas por defecto (★, revisables al probar), Guía de prueba, Qué se entregó, Veredicto, Verificación · HU-0015 · Frontend escalable: componentes, features y router

### Community 86 - "sessions/index.ts"
Cohesion: 0.13
Nodes (19): App(), AppProviders(), DialogsProvider(), router, formatModelName(), formatSessionTime(), formatTokenCount(), sessionContextLevel (+11 more)

### Community 87 - "Brief · HU-0014 · frontend"
Cohesion: 0.25
Nodes (7): Archivos, Brief · HU-0014 · frontend, Entrega, No toques, Pasos (los de § Secuencia; un commit por paso con el trailer `HU: HU-0014`), Pruebas, Si dudas

### Community 89 - "Block"
Cohesion: 0.17
Nodes (19): Checkbox(), Field(), FieldContent(), FieldDescription(), FieldError(), FieldGroup(), FieldLabel(), FieldLegend() (+11 more)

### Community 90 - "sections/dropdown-menu.tsx"
Cohesion: 0.11
Nodes (28): Breadcrumb(), BreadcrumbEllipsis(), BreadcrumbItem(), BreadcrumbLink(), BreadcrumbList(), BreadcrumbPage(), BreadcrumbSeparator(), ButtonGroup() (+20 more)

### Community 91 - "ui/sidebar.tsx"
Cohesion: 0.14
Nodes (20): Sidebar(), SidebarContent(), SidebarContext, SidebarContextProps, SidebarFooter(), SidebarGroup(), SidebarGroupContent(), SidebarGroupLabel() (+12 more)

### Community 92 - "sections/tooltip.tsx"
Cohesion: 0.26
Nodes (8): Kbd(), KbdGroup(), Tooltip(), TooltipContent(), TooltipProvider(), TooltipTrigger(), KbdSection(), TooltipSection()

### Community 93 - "ui/combobox.tsx"
Cohesion: 0.10
Nodes (23): ComboboxChip(), ComboboxChips(), ComboboxChipsInput(), ComboboxContent(), ComboboxEmpty(), ComboboxInput(), ComboboxItem(), ComboboxList() (+15 more)

### Community 94 - "ShowcaseSection.tsx"
Cohesion: 0.10
Nodes (20): ScrollArea(), ScrollBar(), Separator(), Toaster(), ToggleGroup(), ToggleGroupContext, ToggleGroupItem(), Toggle() (+12 more)

### Community 95 - "ui/button.tsx"
Cohesion: 0.17
Nodes (21): Alert(), AlertAction(), AlertDescription(), AlertTitle(), alertVariants, Button(), Dialog(), DialogClose() (+13 more)

### Community 96 - "sections/questionnaire.tsx"
Cohesion: 0.15
Nodes (20): buttonVariants, Calendar(), CalendarDayButton(), Questionnaire(), QuestionnaireActions(), QuestionnaireChoice(), QuestionnaireChoiceDescription(), QuestionnaireChoices() (+12 more)

### Community 97 - "ui/command.tsx"
Cohesion: 0.27
Nodes (10): Command(), CommandDialog(), CommandEmpty(), CommandGroup(), CommandInput(), CommandItem(), CommandList(), CommandSeparator() (+2 more)

### Community 98 - "sections/menubar.tsx"
Cohesion: 0.18
Nodes (14): Menubar(), MenubarCheckboxItem(), MenubarContent(), MenubarItem(), MenubarMenu(), MenubarRadioGroup(), MenubarRadioItem(), MenubarSeparator() (+6 more)

### Community 99 - "ui/carousel.tsx"
Cohesion: 0.18
Nodes (15): Carousel(), CarouselApi, CarouselContent(), CarouselContext, CarouselContextProps, CarouselItem(), CarouselNext(), CarouselOptions (+7 more)

### Community 100 - "sections/context-menu.tsx"
Cohesion: 0.20
Nodes (14): ContextMenu(), ContextMenuCheckboxItem(), ContextMenuContent(), ContextMenuItem(), ContextMenuLabel(), ContextMenuRadioGroup(), ContextMenuRadioItem(), ContextMenuSeparator() (+6 more)

### Community 101 - "sections/trace.tsx"
Cohesion: 0.22
Nodes (13): Collapsible(), CollapsibleContent(), CollapsibleTrigger(), Trace(), TraceCollapsible(), TraceCollapsibleContent(), TraceCollapsibleTrigger(), TraceDescription() (+5 more)

### Community 102 - "ManagedInstance"
Cohesion: 0.18
Nodes (16): CodeSession, CustomIcon, InstanceStatus, ManagedProcessIdentity, AccountPlan, identity_matches_instance(), ManagedInstance, ManagedProcessIdentity (+8 more)

### Community 103 - "updates/index.ts"
Cohesion: 0.24
Nodes (12): originalUpdateChannel, OriginalApplicationUpdateDialog(), SourceUpdateContext, SourceUpdateContextValue, useSourceUpdate(), SynchronizeBanner(), summarizeSynchronization(), SynchronizationSummary (+4 more)

### Community 104 - "ui/chart.tsx"
Cohesion: 0.19
Nodes (13): ChartConfig, ChartContainer(), ChartContext, ChartContextProps, ChartLegendContent(), ChartTooltipContent(), getPayloadConfigFromPayload(), INITIAL_DIMENSION (+5 more)

### Community 105 - "sections/table.tsx"
Cohesion: 0.29
Nodes (10): Table(), TableBody(), TableCaption(), TableCell(), TableFooter(), TableHead(), TableHeader(), TableRow() (+2 more)

### Community 106 - "sections/direction.tsx"
Cohesion: 0.24
Nodes (8): DirectionProvider(), Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger(), DirectionSection(), TabsSection()

### Community 107 - "sections/drawer.tsx"
Cohesion: 0.23
Nodes (10): Drawer(), DrawerClose(), DrawerContent(), DrawerDescription(), DrawerFooter(), DrawerHeader(), DrawerTitle(), DrawerTrigger() (+2 more)

### Community 108 - "sections/select.tsx"
Cohesion: 0.23
Nodes (9): Select(), SelectContent(), SelectGroup(), SelectItem(), SelectLabel(), SelectSeparator(), SelectTrigger(), SelectValue() (+1 more)

### Community 109 - "sections/sheet.tsx"
Cohesion: 0.23
Nodes (10): Sheet(), SheetClose(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetTitle(), SheetTrigger() (+2 more)

### Community 110 - "sections/code-block.tsx"
Cohesion: 0.28
Nodes (11): CodeBlock(), CodeBlockActions(), CodeBlockContent(), CodeBlockCopyButton(), CodeBlockFooter(), CodeBlockHeader(), CodeBlockLine(), codeBlockLineVariants (+3 more)

### Community 111 - "utils.ts"
Cohesion: 0.24
Nodes (7): NoticeAlert(), Progress(), usageTone(), UsageBar(), UsageMeter(), ScanProgressPanel(), ProgressSection()

### Community 112 - "sections/pagination.tsx"
Cohesion: 0.31
Nodes (9): Pagination(), PaginationContent(), PaginationEllipsis(), PaginationItem(), PaginationLink(), PaginationLinkProps, PaginationNext(), PaginationPrevious() (+1 more)

### Community 113 - "Solución"
Cohesion: 0.11
Nodes (17): Análisis, Arquitectura · HU-0016 · Rediseño con sidebar, dashboard y página por instancia, Briefs y orden, Componentes del catálogo por pantalla (orientativo; las fichas de `code-ai-profiles-ui` mandan), CSS, Decisiones (A-n) y desvíos de las ★, Estructura resultante, Impacto (+9 more)

### Community 114 - "EmptyState.tsx"
Cohesion: 0.28
Nodes (10): BrandMark(), BrandMarkProps, Empty(), EmptyContent(), EmptyDescription(), EmptyHeader(), EmptyMedia(), emptyMediaVariants (+2 more)

### Community 115 - "sections/popover.tsx"
Cohesion: 0.33
Nodes (7): Popover(), PopoverContent(), PopoverDescription(), PopoverHeader(), PopoverTitle(), PopoverTrigger(), PopoverSection()

### Community 116 - "highlighter.tsx"
Cohesion: 0.36
Nodes (7): aliases, getHighlighter(), getLanguage(), highlightCode(), languages, loadHighlighter(), useHighlightedCode()

### Community 117 - "sections/accordion.tsx"
Cohesion: 0.39
Nodes (6): Accordion(), AccordionContent(), AccordionItem(), AccordionTrigger(), AccordionSection(), items

### Community 118 - "sections/input-otp.tsx"
Cohesion: 0.48
Nodes (5): InputOTP(), InputOTPGroup(), InputOTPSeparator(), InputOTPSlot(), InputOtpSection()

### Community 119 - "sections/marker.tsx"
Cohesion: 0.48
Nodes (5): Marker(), MarkerContent(), MarkerIcon(), markerVariants, MarkerSection()

### Community 120 - "Revisión técnica · HU-0014 · Design system con shadcn y showcase local"
Cohesion: 0.25
Nodes (7): Documentos de arquitectura, Lo que comprobé y está bien, Los cinco puntos pedidos, Método, Observaciones, Revisión técnica · HU-0014 · Design system con shadcn y showcase local, Segunda vuelta · `0dc0a6d..283649f` · PASS

### Community 121 - "Brief · HU-0016 · frontend"
Cohesion: 0.22
Nodes (8): Archivos (comprobados), Brief · HU-0016 · frontend, No toques, Pasos (los de § Secuencia; un commit por paso, trailer `HU: HU-0016`), Pruebas, Si dudas, Skills, Variables de entorno nuevas

### Community 122 - "ui-isolation.test.ts"
Cohesion: 0.18
Nodes (15): catalogLeaks(), code, CSS_ENTRIES, CSS_FILES, cssImports(), files, FOCUS_OWNERS, importsIcons() (+7 more)

### Community 123 - "react"
Cohesion: 0.40
Nodes (5): react, react, SidebarMenuSkeleton(), SidebarProvider(), useIsMobile()

### Community 134 - "Verificación · HU-0014 · Design system con shadcn y showcase local"
Cohesion: 0.29
Nodes (6): Comprobaciones, Decisiones tomadas por defecto (★, revisables al probar), Guía de prueba, Qué se entregó, Veredicto, Verificación · HU-0014 · Design system con shadcn y showcase local

### Community 135 - "sections/native-select.tsx"
Cohesion: 0.43
Nodes (5): NativeSelect(), NativeSelectOptGroup(), NativeSelectOption(), NativeSelectProps, NativeSelectSection()

### Community 136 - "catalog.ts"
Cohesion: 0.10
Nodes (20): AspectRatio(), Skeleton(), Slider(), CatalogEntry, AspectRatioSection(), BadgeSection(), variants, CardSection() (+12 more)

### Community 137 - "SessionList.tsx"
Cohesion: 0.22
Nodes (13): Item(), ItemActions(), ItemContent(), ItemDescription(), ItemFooter(), ItemGroup(), ItemHeader(), ItemMedia() (+5 more)

### Community 138 - "instances/index.ts"
Cohesion: 0.16
Nodes (22): UsageRanking(), Badge(), badgeVariants, Card(), CardAction(), CardContent(), CardDescription(), CardFooter() (+14 more)

### Community 141 - "sections/resizable.tsx"
Cohesion: 0.43
Nodes (4): ResizableHandle(), ResizablePanel(), ResizablePanelGroup(), ResizableSection()

### Community 143 - "Ciclo de vida e identidad visual de instancias"
Cohesion: 0.40
Nodes (4): Ciclo de vida e identidad visual de instancias, Iconos por instancia, Inicio, detección y cierre, Privacidad y límites

## Knowledge Gaps
- **749 isolated node(s):** `name`, `private`, `version`, `type`, `packageManager` (+744 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Button()` connect `ui/button.tsx` to `useDashboard`, `sections/attachment.tsx`, `catalog.ts`, `SessionList.tsx`, `instances/index.ts`, `sections/message-scroller.tsx`, `dashboard/index.ts`, `UnlinkSessionDialog.tsx`, `AppearanceDialog.tsx`, `sections/dropdown-menu.tsx`, `ui/sidebar.tsx`, `sections/tooltip.tsx`, `ui/combobox.tsx`, `sections/questionnaire.tsx`, `ui/command.tsx`, `ui/carousel.tsx`, `sections/trace.tsx`, `updates/index.ts`, `sections/direction.tsx`, `sections/drawer.tsx`, `sections/sheet.tsx`, `sections/code-block.tsx`, `utils.ts`, `sections/pagination.tsx`, `EmptyState.tsx`, `sections/popover.tsx`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `Block()` connect `Block` to `sections/attachment.tsx`, `sections/native-select.tsx`, `catalog.ts`, `SessionList.tsx`, `instances/index.ts`, `sections/resizable.tsx`, `sections/message-scroller.tsx`, `UnlinkSessionDialog.tsx`, `sections/navigation-menu.tsx`, `sections/dropdown-menu.tsx`, `ui/sidebar.tsx`, `sections/tooltip.tsx`, `ui/combobox.tsx`, `ShowcaseSection.tsx`, `ui/button.tsx`, `sections/questionnaire.tsx`, `ui/command.tsx`, `sections/menubar.tsx`, `ui/carousel.tsx`, `sections/context-menu.tsx`, `sections/trace.tsx`, `ui/chart.tsx`, `sections/table.tsx`, `sections/direction.tsx`, `sections/drawer.tsx`, `sections/select.tsx`, `sections/sheet.tsx`, `sections/code-block.tsx`, `utils.ts`, `sections/pagination.tsx`, `EmptyState.tsx`, `sections/popover.tsx`, `sections/accordion.tsx`, `sections/input-otp.tsx`, `sections/marker.tsx`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `Sample()` connect `catalog.ts` to `sections/attachment.tsx`, `sections/native-select.tsx`, `SessionList.tsx`, `instances/index.ts`, `sections/resizable.tsx`, `sections/message-scroller.tsx`, `UnlinkSessionDialog.tsx`, `sections/navigation-menu.tsx`, `Block`, `sections/dropdown-menu.tsx`, `sections/tooltip.tsx`, `ui/combobox.tsx`, `ShowcaseSection.tsx`, `ui/button.tsx`, `sections/questionnaire.tsx`, `ui/command.tsx`, `sections/menubar.tsx`, `ui/carousel.tsx`, `sections/context-menu.tsx`, `sections/trace.tsx`, `ui/chart.tsx`, `sections/direction.tsx`, `sections/drawer.tsx`, `sections/select.tsx`, `sections/sheet.tsx`, `sections/code-block.tsx`, `utils.ts`, `sections/pagination.tsx`, `EmptyState.tsx`, `sections/popover.tsx`, `sections/accordion.tsx`, `sections/input-otp.tsx`, `sections/marker.tsx`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _749 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useDashboard` be split into smaller, more focused modules?**
  _Cohesion score 0.14439946018893388 - nodes in this community are weakly interconnected._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `lib.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.04864864864864865 - nodes in this community are weakly interconnected._