# Graph Report - Code AI Profiles  (2026-10-28)

## Corpus Check
- 321 files · ~164,440 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2286 nodes · 5321 edges · 139 communities (121 shown, 18 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e70b58ae`
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
- update_instance_application_from_source_sync
- useScanRuntime.ts
- graphify.mjs
- permissions
- HU-0010 — Publicar el fix de actualización como versión 0.2.2
- compilerOptions
- Observaciones (no bloquean)
- tauri.linux.conf.json
- sections/message-scroller.tsx
- Vec
- Path
- HU-0002 — Actualizar la aplicación original y mostrar metadatos precisos por modelo y proveedor
- HU-0003 — Transferencias conscientes de artefactos, actualización disponible y uso en vivo
- HU-0004 — Sincronización desde la instancia más reciente, cierre robusto, artefactos locales e identidad visual
- app
- sessions/index.ts
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
- source-update-controller.ts
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
- .resolve
- HU-0014-design-system-con-shadcn-y-showcase-loca/seguimiento.md
- HU-0015-frontend-escalable-componentes-features-/seguimiento.md
- Solución
- appearance/index.ts
- devDependencies
- dependencies
- String
- package.json
- Verificación · HU-0015 · Frontend escalable: componentes, features y router
- format.test.ts
- Brief · HU-0014 · frontend
- sections/hover-card.tsx
- AppearanceDialog.tsx
- sections/dropdown-menu.tsx
- AppSidebar.tsx
- ui/sidebar.tsx
- ui/combobox.tsx
- ShowcaseSection.tsx
- SessionTransferDialog.tsx
- ui/button.tsx
- ui/command.tsx
- sections/context-menu.tsx
- ui/carousel.tsx
- sections/scroll-area.tsx
- sections/trace.tsx
- ManagedInstance
- updates/index.ts
- react
- sections/table.tsx
- sections/direction.tsx
- AppProviders.tsx
- sections/select.tsx
- sections/sheet.tsx
- ui/input.tsx
- runtime_cache
- sections/pagination.tsx
- Solución
- Revisión técnica · HU-0016 · Rediseño con sidebar, dashboard y página por instancia
- sections/popover.tsx
- highlighter.tsx
- sections/accordion.tsx
- sections/input-otp.tsx
- sections/marker.tsx
- Revisión técnica · HU-0014 · Design system con shadcn y showcase local
- Brief · HU-0016 · frontend
- ui-isolation.test.ts
- Verificación · HU-0016 · Rediseño con sidebar, dashboard y página por instancia
- Alcance
- date-fns
- @fontsource/jetbrains-mono
- react-day-picker
- react-resizable-panels
- react-router
- @shadcn/react
- shiki
- sections/kbd.tsx
- cmdk
- Verificación · HU-0014 · Design system con shadcn y showcase local
- catalog.ts
- InstanceEditor.tsx
- HU-0016-rediseno-con-sidebar-dashboard-y-pagina-/seguimiento.md
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
- `CodeBlockCopyButton()` --references--> `react`  [EXTRACTED]
  src/components/ui/code-block.tsx → package.json
- `useComboboxAnchor()` --references--> `react`  [EXTRACTED]
  src/components/ui/combobox.tsx → package.json

## Import Cycles
- None detected.

## Communities (139 total, 18 thin omitted)

### Community 0 - "Result"
Cohesion: 0.19
Nodes (35): AppHandle, D, Error, Result, check_source_update(), clear_instance_icon(), copy_code_session(), create_instance() (+27 more)

### Community 1 - "useDashboard"
Cohesion: 0.15
Nodes (22): AppShell(), SIDEBAR_STYLE, AppSidebar(), DialogHost(), FeedbackArea(), PageContent(), PageHeader(), PageSkeleton() (+14 more)

### Community 2 - "scripts"
Cohesion: 0.09
Nodes (22): scripts, build, build:linux, build:macos, build:windows, dev, graph:build, graph:check (+14 more)

### Community 3 - "sections/attachment.tsx"
Cohesion: 0.21
Nodes (12): Attachment(), AttachmentAction(), AttachmentActions(), AttachmentContent(), AttachmentDescription(), AttachmentGroup(), AttachmentMedia(), attachmentMediaVariants (+4 more)

### Community 4 - "lib.rs"
Cohesion: 0.05
Nodes (62): annotates_a_session_linked_inside_the_original_app(), application_fingerprint_changes_when_managed_bytes_change(), apply_session_links_to_profile(), artifact_export_rejects_symlinks_and_depth_escapes(), artifact_export_roots(), artifact_reference_count(), ArtifactTransferOutcome, atomically_creates_and_replaces_session_index() (+54 more)

### Community 5 - "Solución"
Cohesion: 0.06
Nodes (31): Arquitectura del frontend, Añadir una feature, Añadir una pantalla, Design system (HU-0014), Dónde va cada cosa, Estado, Estilos, Estructura (+23 more)

### Community 6 - "types.ts"
Cohesion: 0.08
Nodes (27): call(), isTauri(), mockInstances, mockOriginalSessions, now, friendlyError(), ArtifactMonitorSummary, CopyCodeSessionRequest (+19 more)

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

### Community 14 - "update_instance_application_from_source_sync"
Cohesion: 0.11
Nodes (40): Default, SourceUpdateSource, SourceUpdateStatus, build_version_topology(), cached_source_version(), check_official_update_feed(), check_source_update_sync(), copy_provider_application() (+32 more)

### Community 15 - "useScanRuntime.ts"
Cohesion: 0.15
Nodes (21): ScanContext, ScanContextValue, ScanProgressPanel(), useBackgroundRefresh(), ScanProgressEvent, ScanRuntime, useScanLifecycle(), useScanRuntime() (+13 more)

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
Cohesion: 0.13
Nodes (23): Bubble(), BubbleContent(), BubbleGroup(), BubbleReactions(), bubbleReactionsVariants, bubbleVariants, Message(), MessageAvatar() (+15 more)

### Community 23 - "Vec"
Cohesion: 0.11
Nodes (34): ArtifactMonitorSummary, DashboardState, HashMap, Instant, OsString, PathBuf, SessionTransferInfo, SourceUpdateInfo (+26 more)

### Community 24 - "Path"
Cohesion: 0.16
Nodes (37): Path, application_fingerprint(), apply_external_icon_best_effort(), apply_macos_branding_after_update(), apply_macos_custom_icon(), atomic_replace_file(), clear_instance_icon_sync(), clear_macos_custom_icon() (+29 more)

### Community 25 - "HU-0002 — Actualizar la aplicación original y mostrar metadatos precisos por modelo y proveedor"
Cohesion: 0.10
Nodes (21): Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Cierre del fix — CA11 y CA12, Contexto y evidencia de Graphify, Criterios de aceptación, Diseño técnico y contratos (+13 more)

### Community 26 - "HU-0003 — Transferencias conscientes de artefactos, actualización disponible y uso en vivo"
Cohesion: 0.10
Nodes (21): Actualización disponible, Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Diseño técnico y contratos (+13 more)

### Community 27 - "HU-0004 — Sincronización desde la instancia más reciente, cierre robusto, artefactos locales e identidad visual"
Cohesion: 0.12
Nodes (16): Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Diseño técnico y contratos, Documentación afectada, Fuera de alcance (+8 more)

### Community 28 - "app"
Cohesion: 0.40
Nodes (4): app, macOSPrivateApi, windows, $schema

### Community 29 - "sessions/index.ts"
Cohesion: 0.15
Nodes (21): DialogsContext, DialogsContextValue, Setter, InstanceDetailProps, describeArtifactOutcome(), transferNotice(), unlinkDialogCopy, SessionTransferSelection (+13 more)

### Community 30 - "HU-0005 — Recuperar la respuesta de la interfaz y establecer versionado SemVer"
Cohesion: 0.10
Nodes (21): Alcance, Bitácora de implementación, Casos límite, privacidad y plataformas, Cierre de Graphify, Contexto y evidencia de Graphify, Criterios de aceptación, Decisión pendiente para el Dock, Diseño técnico y contratos (+13 more)

### Community 31 - "dashboard/index.ts"
Cohesion: 0.13
Nodes (25): SummaryCards(), DashboardContext, DashboardContextValue, countCodeSessions(), countRunning(), filterInstances(), findInstance(), matchesOriginalApp() (+17 more)

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

### Community 62 - "source-update-controller.ts"
Cohesion: 0.18
Nodes (18): DashboardRuntime(), useInitialLoad(), useSourceUpdatePolling(), useSourceUpdateController(), bridge, createSourceUpdateController(), HandoffIntent, mergeSourceUpdateForInstallation() (+10 more)

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

### Community 76 - ".resolve"
Cohesion: 0.16
Nodes (23): Child, Duration, ManagedInstance, Self, apply_session_links(), create_instance_sync(), delete_instance_sync(), launch_instance_sync() (+15 more)

### Community 79 - "Solución"
Cohesion: 0.09
Nodes (21): Aislamiento de Tailwind, Ajustes a los componentes del registro (lista cerrada), Análisis, Archivos, Arquitectura · HU-0014 · Design system con shadcn y showcase local, Briefs y orden, Catálogo (63, registro `radix-vega`, 2026-10-28), Decisiones (A-n) y desvíos de las ★ (+13 more)

### Community 80 - "appearance/index.ts"
Cohesion: 0.22
Nodes (17): AppearanceContext, AppearanceContextValue, APPEARANCE_STORAGE_KEY, AppearancePreferences, AppTheme, DEFAULT_APPEARANCE, loadAppearancePreferences(), PreferencesStorage (+9 more)

### Community 81 - "devDependencies"
Cohesion: 0.10
Nodes (21): devDependencies, shadcn, tailwindcss, @tailwindcss/vite, @tauri-apps/cli, tw-animate-css, @types/react, @types/react-dom (+13 more)

### Community 82 - "dependencies"
Cohesion: 0.07
Nodes (27): @base-ui/react, class-variance-authority, cn, embla-carousel-react, @fontsource/inter, input-otp, lucide-react, dependencies (+19 more)

### Community 83 - "String"
Cohesion: 0.09
Nodes (42): Option, ArtifactMonitorEntry, ArtifactMonitorSummary, check_apt_update(), clean_monitor_state(), CodeSessionDocument, CreateInstanceRequest, desktop_entry_value() (+34 more)

### Community 84 - "package.json"
Cohesion: 0.33
Nodes (5): name, packageManager, private, type, version

### Community 85 - "Verificación · HU-0015 · Frontend escalable: componentes, features y router"
Cohesion: 0.29
Nodes (6): Comprobaciones, Decisiones tomadas por defecto (★, revisables al probar), Guía de prueba, Qué se entregó, Veredicto, Verificación · HU-0015 · Frontend escalable: componentes, features y router

### Community 86 - "format.test.ts"
Cohesion: 0.16
Nodes (15): formatModelName(), formatSessionTime(), formatTokenCount(), sessionContextLevel, LEVEL_BAR, LEVEL_TEXT, SessionContextMeter(), SessionItem() (+7 more)

### Community 87 - "Brief · HU-0014 · frontend"
Cohesion: 0.25
Nodes (7): Archivos, Brief · HU-0014 · frontend, Entrega, No toques, Pasos (los de § Secuencia; un commit por paso con el trailer `HU: HU-0014`), Pruebas, Si dudas

### Community 88 - "sections/hover-card.tsx"
Cohesion: 0.23
Nodes (10): Avatar(), AvatarBadge(), AvatarFallback(), AvatarGroup(), AvatarGroupCount(), HoverCard(), HoverCardContent(), HoverCardTrigger() (+2 more)

### Community 89 - "AppearanceDialog.tsx"
Cohesion: 0.16
Nodes (18): Field(), FieldContent(), FieldDescription(), FieldError(), FieldGroup(), FieldLabel(), FieldLegend(), FieldSeparator() (+10 more)

### Community 90 - "sections/dropdown-menu.tsx"
Cohesion: 0.11
Nodes (28): Breadcrumb(), BreadcrumbEllipsis(), BreadcrumbItem(), BreadcrumbLink(), BreadcrumbList(), BreadcrumbPage(), BreadcrumbSeparator(), ButtonGroup() (+20 more)

### Community 91 - "AppSidebar.tsx"
Cohesion: 0.14
Nodes (19): Sidebar(), SidebarContent(), SidebarFooter(), SidebarGroup(), SidebarGroupContent(), SidebarGroupLabel(), SidebarHeader(), SidebarInput() (+11 more)

### Community 92 - "ui/sidebar.tsx"
Cohesion: 0.16
Nodes (8): SidebarContext, SidebarContextProps, SidebarProvider(), Tooltip(), TooltipContent(), TooltipTrigger(), useIsMobile(), TooltipSection()

### Community 93 - "ui/combobox.tsx"
Cohesion: 0.10
Nodes (23): ComboboxChip(), ComboboxChips(), ComboboxChipsInput(), ComboboxContent(), ComboboxEmpty(), ComboboxInput(), ComboboxItem(), ComboboxList() (+15 more)

### Community 94 - "ShowcaseSection.tsx"
Cohesion: 0.14
Nodes (15): Toaster(), ToggleGroup(), ToggleGroupContext, ToggleGroupItem(), Toggle(), toggleVariants, TooltipProvider(), catalog (+7 more)

### Community 95 - "SessionTransferDialog.tsx"
Cohesion: 0.20
Nodes (15): Alert(), AlertAction(), AlertDescription(), AlertTitle(), alertVariants, Dialog(), DialogClose(), DialogContent() (+7 more)

### Community 96 - "ui/button.tsx"
Cohesion: 0.06
Nodes (56): AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter(), AlertDialogHeader(), AlertDialogMedia() (+48 more)

### Community 97 - "ui/command.tsx"
Cohesion: 0.27
Nodes (10): Command(), CommandDialog(), CommandEmpty(), CommandGroup(), CommandInput(), CommandItem(), CommandList(), CommandSeparator() (+2 more)

### Community 98 - "sections/context-menu.tsx"
Cohesion: 0.09
Nodes (28): ContextMenu(), ContextMenuCheckboxItem(), ContextMenuContent(), ContextMenuItem(), ContextMenuLabel(), ContextMenuRadioGroup(), ContextMenuRadioItem(), ContextMenuSeparator() (+20 more)

### Community 99 - "ui/carousel.tsx"
Cohesion: 0.18
Nodes (15): Carousel(), CarouselApi, CarouselContent(), CarouselContext, CarouselContextProps, CarouselItem(), CarouselNext(), CarouselOptions (+7 more)

### Community 100 - "sections/scroll-area.tsx"
Cohesion: 0.29
Nodes (6): ScrollArea(), ScrollBar(), Separator(), etiquetas, ScrollAreaSection(), SeparatorSection()

### Community 101 - "sections/trace.tsx"
Cohesion: 0.22
Nodes (13): Collapsible(), CollapsibleContent(), CollapsibleTrigger(), Trace(), TraceCollapsible(), TraceCollapsibleContent(), TraceCollapsibleTrigger(), TraceDescription() (+5 more)

### Community 102 - "ManagedInstance"
Cohesion: 0.19
Nodes (15): CodeSession, CustomIcon, InstanceStatus, ManagedProcessIdentity, AccountPlan, identity_matches_instance(), ManagedInstance, ManagedProcessIdentity (+7 more)

### Community 103 - "updates/index.ts"
Cohesion: 0.17
Nodes (16): NoticeAlert(), ApplicationUpdateDialog(), originalUpdateChannel, OriginalApplicationUpdateDialog(), SourceUpdateContext, SourceUpdateContextValue, useSourceUpdate(), SourceUpdateBanner() (+8 more)

### Community 104 - "react"
Cohesion: 0.16
Nodes (16): react, react, ChartConfig, ChartContainer(), ChartContext, ChartContextProps, ChartLegendContent(), ChartTooltipContent() (+8 more)

### Community 105 - "sections/table.tsx"
Cohesion: 0.29
Nodes (10): Table(), TableBody(), TableCaption(), TableCell(), TableFooter(), TableHead(), TableHeader(), TableRow() (+2 more)

### Community 106 - "sections/direction.tsx"
Cohesion: 0.24
Nodes (8): DirectionProvider(), Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger(), DirectionSection(), TabsSection()

### Community 107 - "AppProviders.tsx"
Cohesion: 0.31
Nodes (5): App(), AppProviders(), DialogsProvider(), RouteErrorBoundary(), router

### Community 108 - "sections/select.tsx"
Cohesion: 0.23
Nodes (9): Select(), SelectContent(), SelectGroup(), SelectItem(), SelectLabel(), SelectSeparator(), SelectTrigger(), SelectValue() (+1 more)

### Community 109 - "sections/sheet.tsx"
Cohesion: 0.23
Nodes (10): Sheet(), SheetClose(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetTitle(), SheetTrigger() (+2 more)

### Community 110 - "ui/input.tsx"
Cohesion: 0.36
Nodes (4): Checkbox(), Input(), InputSection(), LabelSection()

### Community 111 - "runtime_cache"
Cohesion: 0.29
Nodes (7): FnOnce, Mutex, managed_bytes(), path_size(), record_refresh_work(), registry_operation_mutex(), runtime_cache()

### Community 112 - "sections/pagination.tsx"
Cohesion: 0.31
Nodes (9): Pagination(), PaginationContent(), PaginationEllipsis(), PaginationItem(), PaginationLink(), PaginationLinkProps, PaginationNext(), PaginationPrevious() (+1 more)

### Community 113 - "Solución"
Cohesion: 0.11
Nodes (18): Análisis, Arquitectura · HU-0016 · Rediseño con sidebar, dashboard y página por instancia, Briefs y orden, Componentes del catálogo por pantalla (orientativo; las fichas de `code-ai-profiles-ui` mandan), CSS, Decisiones (A-n) y desvíos de las ★, Estructura resultante, Impacto (+10 more)

### Community 114 - "Revisión técnica · HU-0016 · Rediseño con sidebar, dashboard y página por instancia"
Cohesion: 0.29
Nodes (6): Documentos de arquitectura, Las desviaciones de E3, Los siete puntos pedidos, Método, Observaciones (nada bloquea), Revisión técnica · HU-0016 · Rediseño con sidebar, dashboard y página por instancia

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

### Community 123 - "Verificación · HU-0016 · Rediseño con sidebar, dashboard y página por instancia"
Cohesion: 0.29
Nodes (6): Comprobaciones, Decisiones tomadas por defecto (★, revisables al probar), Guía de prueba, Qué se entregó, Veredicto, Verificación · HU-0016 · Rediseño con sidebar, dashboard y página por instancia

### Community 124 - "Alcance"
Cohesion: 0.40
Nodes (5): Alcance, Artefactos locales con soporte seguro, Identidad visual e icono, Lifecycle robusto, Topología y sincronización de versiones

### Community 132 - "sections/kbd.tsx"
Cohesion: 0.60
Nodes (3): Kbd(), KbdGroup(), KbdSection()

### Community 134 - "Verificación · HU-0014 · Design system con shadcn y showcase local"
Cohesion: 0.29
Nodes (6): Comprobaciones, Decisiones tomadas por defecto (★, revisables al probar), Guía de prueba, Qué se entregó, Veredicto, Verificación · HU-0014 · Design system con shadcn y showcase local

### Community 136 - "catalog.ts"
Cohesion: 0.08
Nodes (30): AspectRatio(), NativeSelect(), NativeSelectOptGroup(), NativeSelectOption(), NativeSelectProps, ResizableHandle(), ResizablePanel(), ResizablePanelGroup() (+22 more)

### Community 138 - "InstanceEditor.tsx"
Cohesion: 0.06
Nodes (57): UsageRanking(), BrandMark(), BrandMarkProps, Badge(), badgeVariants, Card(), CardAction(), CardContent() (+49 more)

### Community 143 - "Ciclo de vida e identidad visual de instancias"
Cohesion: 0.40
Nodes (4): Ciclo de vida e identidad visual de instancias, Iconos por instancia, Inicio, detección y cierre, Privacidad y límites

## Knowledge Gaps
- **760 isolated node(s):** `name`, `private`, `version`, `type`, `packageManager` (+755 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Button()` connect `ui/button.tsx` to `useDashboard`, `sections/attachment.tsx`, `sections/kbd.tsx`, `catalog.ts`, `InstanceEditor.tsx`, `useScanRuntime.ts`, `sections/message-scroller.tsx`, `dashboard/index.ts`, `sections/hover-card.tsx`, `AppearanceDialog.tsx`, `sections/dropdown-menu.tsx`, `AppSidebar.tsx`, `ui/sidebar.tsx`, `ui/combobox.tsx`, `SessionTransferDialog.tsx`, `ui/command.tsx`, `ui/carousel.tsx`, `sections/trace.tsx`, `updates/index.ts`, `sections/direction.tsx`, `sections/sheet.tsx`, `sections/pagination.tsx`, `sections/popover.tsx`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `Block()` connect `catalog.ts` to `sections/attachment.tsx`, `sections/kbd.tsx`, `InstanceEditor.tsx`, `sections/message-scroller.tsx`, `sections/navigation-menu.tsx`, `sections/hover-card.tsx`, `AppearanceDialog.tsx`, `sections/dropdown-menu.tsx`, `AppSidebar.tsx`, `ui/sidebar.tsx`, `ui/combobox.tsx`, `ShowcaseSection.tsx`, `SessionTransferDialog.tsx`, `ui/button.tsx`, `ui/command.tsx`, `sections/context-menu.tsx`, `ui/carousel.tsx`, `sections/scroll-area.tsx`, `sections/trace.tsx`, `react`, `sections/table.tsx`, `sections/direction.tsx`, `sections/select.tsx`, `sections/sheet.tsx`, `ui/input.tsx`, `sections/pagination.tsx`, `sections/popover.tsx`, `sections/accordion.tsx`, `sections/input-otp.tsx`, `sections/marker.tsx`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `Sample()` connect `catalog.ts` to `sections/attachment.tsx`, `sections/kbd.tsx`, `InstanceEditor.tsx`, `sections/message-scroller.tsx`, `sections/navigation-menu.tsx`, `sections/hover-card.tsx`, `AppearanceDialog.tsx`, `sections/dropdown-menu.tsx`, `ui/sidebar.tsx`, `ui/combobox.tsx`, `ShowcaseSection.tsx`, `SessionTransferDialog.tsx`, `ui/button.tsx`, `ui/command.tsx`, `sections/context-menu.tsx`, `ui/carousel.tsx`, `sections/scroll-area.tsx`, `sections/trace.tsx`, `react`, `sections/direction.tsx`, `sections/select.tsx`, `sections/sheet.tsx`, `ui/input.tsx`, `sections/pagination.tsx`, `sections/popover.tsx`, `sections/accordion.tsx`, `sections/input-otp.tsx`, `sections/marker.tsx`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _760 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `lib.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.04814814814814815 - nodes in this community are weakly interconnected._
- **Should `Solución` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._