<!-- Copiado de arquitectura.md (sección «Brief · HU-0023 · frontend»), 2026-10-29. -->
### Brief · HU-0023 · frontend

Criterios: AC-02, AC-03, AC-04, AC-05 (lo visible). Modelo: **sonnet**: pantallas sobre un contrato fijado.
Contrato: § A-3 y A-4. **No edites** `src/types.ts` ni `src/lib/bridge.ts` (backend, B-1). Empieza cuando backend avise
y HU-0022 haya commiteado su sidebar, `DialogsProvider` y Configuración. Maqueta: `diseno/maqueta.html` y `vista.md`.

Datos que llegan a la pantalla: `ProjectsState`, `ProjectSummary`, `ProjectCandidate`. `message` se muestra tal cual.

| Archivo | Qué cambia |
| --- | --- |
| `src/features/projects/` (nuevo) | `projects-store.ts`, `projects-selectors.ts`, `projects-context.ts`, `ProjectsProvider.tsx`, `useProjects.ts`, `usePinProject.ts`, componentes de la maqueta (tarjeta, barra por estados, cifras, tecnologías, repos, tabla de historias, consumo, rota, `PinProjectDialog`), `index.ts` |
| `src/app/routes/projects/ProjectsRoute.tsx` (nuevo) | `#/proyectos`: lista, vacía, rotas al final |
| `src/app/routes/project/ProjectRoute.tsx` (nuevo) | `#/proyectos/:projectId`: página, rota, no encontrada |
| `src/app/router.tsx` | Dos rutas `lazy` antes de `*` |
| `src/app/providers/AppProviders.tsx` | `ProjectsProvider` dentro de `DashboardRuntime`, fuera de `DialogsProvider` |
| `src/app/providers/dialogs-context.ts`, `DialogsProvider.tsx`, `src/app/layout/DialogHost.tsx` | Bandera `pinCandidate` y `PinProjectDialog` |
| `src/app/layout/AppSidebar.tsx` | Grupo «Proyectos» (A-4) |
| Tarjeta «Archivos y carpetas» de Configuración (archivo de HU-0022) | La línea de A-6 con `selectProtectedProjects` |
| `tests/projects.test.ts` (nuevo), `tests/ui-isolation.test.ts`, `package.json` | Pruebas y `test:projects` |

Pasos:

1. Reducer y selectores puros con su prueba (A-4, «Cálculos»). Importes relativos (Node no resuelve `@/`).
2. Proveedor: carga al montar, `refreshAll`, `refreshOne(id)`, `unpin(id)`, deduplicación de llamadas en vuelo.
3. Rutas y pantallas con el catálogo `components/ui` y los tokens; colores de estado, trama de «en espera» y retícula
   de la maqueta (sistema armónico de HU-0022).
4. Flujo de anclar (A-4) y sidebar. Tras anclar, a `#/proyectos`.
5. `permissionDenied` enlaza a `#/configuracion` (sección Permisos, como lo deje HU-0022).

Variables de entorno nuevas: ninguna. Ninguna URL en componentes.

Pruebas: `tests/projects.test.ts` (orden con rotos al final, «572 M», «98 % caché», entrada + salida, «56 h», `spanDays`,
fracciones de la barra, reducer); caso 15 de `ui-isolation`. Corre `pnpm test:projects`, `pnpm test:ui`, `pnpm build` y
`node .metodo/scripts/pruebas.mjs relacionadas code-ai-profiles <archivos>`. Revisa en el navegador (mocks) las
pantallas de la maqueta a 1440×920 y 980×680, oscuro y claro.

Si dudas: `graphify explain "AppSidebar"`, `graphify explain "DialogHost"`, `docs/arquitectura/frontend.md` («Dónde va
cada cosa»), la maqueta con `#pantalla=…`.

No toques: `DashboardRuntime.tsx` ni ningún listener de `focus`/`blur`/`visibilitychange` (R-1, `test:ui 8`); `features/instances`,
`sessions`, `scan`, `updates`; `DESIGN.md` y la propuesta de radios (decisión aparte); `hu/HU-0022-*`.

Skills: `code-ai-profiles-frontend-react-vite`, `code-ai-profiles-ui`, `code-ai-profiles-pruebas`.

