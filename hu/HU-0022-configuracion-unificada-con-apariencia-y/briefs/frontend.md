# Brief · HU-0022 · frontend

Criterios: AC-06 (paso 1), AC-02, AC-03, AC-04 y AC-05 (paso 2). Modelo: **sonnet**: visual y mecánico, guiado
por pruebas; no toca dinero, sesiones ni datos de perfil. Contrato: `arquitectura.md` § A-1, A-2, A-3 y A-4. Las
medidas salen de `diseno/vista.md` y de las secciones 5–6 de `diseno/maqueta.html` (aprobada). Un commit por paso.

## Paso 1 · Sistema armónico (en paralelo con backend)

| Archivo | Qué cambia |
| --- | --- |
| `src/styles/tokens.css` | Fuera `--esc`; `--lh-*` y `--ctl*` por tamaño (tabla de A-1.2) |
| `src/styles/ui-theme.css` | Puente `--text-*` con su `--line-height` (A-1.2); radios (A-1.3); `--ring`/`--sidebar-ring` (A-1.4); `--ui-on-primary: #151615` en los tres selectores (A-1.5) |
| `src/styles/index.css` | `body` con `--fs-body`/`--lh-body`; `outline-ring` sin `/50` |
| `src/components/ui/*` que la app importa | Espaciado, radios, `--ctl*`, foco y anillos en lugar de bordes (A-1.1–A-1.6); `Badge` a `rounded-sm` y `--ctl-badge` |
| `src/app/**`, `src/features/**`, `src/components/*.tsx` | `text-(length:--fs-x)/(--lh-y)`, la escala y los radios; sidebar, barra, estado, chips de 24 (maqueta § 6) |
| `tests/ui-isolation.test.ts` | Prueba 12 reescrita; 15 y 16 nuevas; canario 9 (A-5) |
| `DESIGN.md`, `.claude/skills/code-ai-profiles-ui/{tema.md,componentes/<id>.md}` | A-1.7 y las fichas de los componentes que cambian |

Orden: tokens y prueba 12; prueba 15 en rojo (te da la lista de infracciones); corregir archivo por archivo hasta
verde; prueba 16; medir el hover del primario (A-1.5).

## Paso 2 · Configuración y permisos (cuando backend entregue `types.ts` y `bridge.ts`)

| Archivo | Qué cambia |
| --- | --- |
| `src/app/router.tsx` | `configuracion/:section?` con `lazy` (A-2) |
| `src/app/routes/settings/SettingsRoute.tsx` (nuevo) | `PageHeader` y `PageContent`, `Tabs` controladas por la ruta, punto en Permisos |
| `src/features/appearance/AppearanceSettings.tsx` (nuevo) | Sustituye a `AppearanceDialog.tsx`, que se borra; `index.ts` lo exporta |
| `src/app/providers/{dialogs-context.ts,DialogsProvider.tsx}`, `src/app/layout/DialogHost.tsx` | Fuera `appearanceOpen`/`setAppearanceOpen` |
| `src/app/layout/AppSidebar.tsx` | Entrada «Configuración» (`SettingsIcon`, `Link`, `useMatch("/configuracion/*")`); ⌘, / Ctrl+, en el `keydown` que ya existe |
| `src/features/permissions/permission-cards.ts` (nuevo, puro) | `permissionCards({ platform, instances, admin, projectsAvailable })` → tarjetas y `attention` (A-3.1–A-3.4); textos de `vista.md` |
| `src/features/permissions/{PermissionsSettings,PermissionCard}.tsx` e `index.ts` (nuevos) | Tarjetas, popover (`Popover`), botón, línea de éxito o error (A-3.6), vacío de Windows/Linux; `projectsAvailable = false` |
| `src/features/instances/InstanceEditor.tsx` | Enlace D-4, bloqueado con cambios sin guardar, `busy` o `iconBusy` (A-2) |
| `tests/permissions.test.ts` (nuevo), `package.json`, `.github/workflows/validate.yml` | Script `test:permissions` y su paso en CI |
| `tests/ui-isolation.test.ts` | `SAMPLE_FILE` pasa a `AppearanceSettings.tsx` (prueba 13) |

Notas: `bridge.accountFacts()` una vez al montar Permisos, solo en macOS («Comprobando…» mientras llega);
`bridge.openSystemSettings(card.panel)` solo si `panel !== null`. Nunca se pasa ni se muestra una URL. Sin toasts
y sin listeners nuevos de `focus`.

## Variables de entorno nuevas

Ninguna en el frontend: las URLs viven en Rust (A-3.5).

## Pruebas

Las de A-5: `test:ui` (pruebas 9, 12, 13, 15 y 16) y `test:permissions` (estados, `projectsAvailable` y
plataformas). Para comprobar: `pnpm build && pnpm test:ui && pnpm test:appearance && pnpm test:permissions`, más
`node .metodo/scripts/pruebas.mjs relacionadas code-ai-profiles <archivos>`.

Con la app abierta (`pnpm dev` y, en macOS, `pnpm tauri dev`): Dashboard, original, instancia, editor (nueva y
existente), transferir, desvincular, actualizar, borrar, escaneo, banners y Configuración, en oscuro y claro,
Compacto, Cómodo y Grande, 1440×920 y 980×680, sidebar desplegado y plegado, y foco con teclado. Lo que no puedas
ver queda declarado como pendiente.

## Si dudas

`graphify explain "AppSidebar()"`, `graphify explain "AppearanceDialog"`, `graphify explain "iconRetryState"`. Los
números, en `diseno/vista.md` («Medidas clave»). Las skills `code-ai-profiles-frontend-react-vite` (rutas, `Tabs`,
R-1) y `code-ai-profiles-ui` (fichas, `Popover`).

## No toques

`src/types.ts`, `src/lib/bridge.ts` y `src-tauri/**` (son de backend); `appearance-preferences.ts` ni la clave de
`localStorage` (sin migración); los componentes del catálogo que la app no importa; `hu/HU-0023-*`. Nada de `.css`
nuevo ni de tokens `--s*`.

## Skills

`code-ai-profiles-frontend-react-vite`, `code-ai-profiles-ui`, `code-ai-profiles-configuracion` y
`code-ai-profiles-pruebas`.
