# Revisión técnica · HU-0022 · Configuración unificada con apariencia y permisos

Fecha: 2026-10-29 · Revisa: architect · HEAD revisado: `0f3c877` (rama `hu-0022-configuracion-unificada`)

- **Backend:** `1c7b8c3`, `82258bd`, `7a9ab41`.
- **Frontend, paso 1:** `689bde3`, `97c05ed`, `4db13ff`, `a64c5ba`, `f5e4931`.
- **Frontend, paso 2:** `541f5e6`, `2b8003b`, `2b4c821`, `70a246b`.
- **Orquestador:** `0f3c877`.
- **Fuera de la revisión:** los commits de la HU-0023 (`ab26ad5`, `1785d4d`, `a9d609c`), que no tocan nada de esta
  historia (ver «Choque con la HU-0023»).

## Veredicto: **PASS**, con dos correcciones antes de entregar y una condición de proceso

Nada bloquea: el contrato, la configuración, la privacidad y la promesa de AC-05 se cumplen en el código. Antes de la
prueba humana hay que corregir dos cosas: la **R-1** (la marca se corta en Grande, una regresión visual) y la **R-2**
(las skills todavía nombran el diálogo que ya no existe, y la HU-0023 se está implementando con ellas). El resto es
deuda.

**La condición:** `pruebas.mjs estado` dice «HEAD 0f3c877 sin suite en verde». Siguiendo el método, no corrí pruebas.
El último registro (`ultima-code-ai-profiles.log`, 01:46) es anterior a `0f3c877` y no incluye `test:permissions`: tipos
ok, `test:ui` 17/17 y `cargo test` 149/0/2. Las 13 pruebas de `test:permissions` y el `pnpm build` son cifras de quien
implementó. Antes de la prueba humana, el orquestador corre la suite una vez sobre el SHA final.

## Criterios

| Criterio | Estado | Dónde se ve |
| --- | --- | --- |
| AC-01 · maqueta aprobada | ✓ | `seguimiento.md`: «Aprobadas», 2026-10-29 01:01 |
| AC-06 · espaciado armónico | ✓ con deuda | Pruebas 15 y 16. La medición da 0 casos fuera de escala salvo el `pl-84` de macOS (14 pantallas en Cómodo y 56 combinaciones de Configuración). Ver R-1 y R-4 |
| AC-02 · una sola configuración | ✓ | `AppearanceSettings` usa el mismo `useAppearance()` y la misma clave de `localStorage`. No queda ninguna referencia en `src/` al diálogo, a `appearanceOpen` ni a `setAppearanceOpen` (sí en las skills: R-2) |
| AC-03 · permisos explicados | ✓ | `Popover` de Radix: botón de 24 px con `aria-label`, `aria-expanded` y `aria-haspopup`; se abre con Intro o Espacio y se cierra con Esc. Contenido con `role="dialog"` y `aria-label` |
| AC-04 · acceso directo | ✓ en el código | Solo se envía el enum. La de administrador no lleva botón (`panel: null`, probado). Que el panel sea el exacto lo comprueba la persona (S-1) |
| AC-05 · opcionales y sin sorpresas | ✓ en el código | Al entrar solo se ejecuta `id -Gn`, una vez al montar Permisos y solo en macOS. `open` solo se ejecuta al pulsar. Sin listeners nuevos y sin leer carpetas. Lo confirma la persona en `tauri dev` |

| Arquitectura | Estado |
| --- | --- |
| A-1 · sistema armónico | ✓. Sin `--esc`; `--lh-*` y `--ctl*` por tamaño; puente con `--line-height`; radios 4–24; foco de 2 px sin `/50`; `--ui-on-primary: #151615` literal en los tres selectores; el hover aclara con `color-mix` hacia blanco; bordes cambiados por anillos |
| A-2 · página | ✓. Ruta `configuracion/:section?` diferida, con `Navigate` a `apariencia`; pestañas controladas por la ruta con `replace`; entrada del sidebar con `useMatch("/configuracion/*")` y `aria-current`; ⌘, en el mismo `keydown` que ⌘F, bloqueado con cualquiera de las seis banderas de `DialogHost`; D-4 bloqueado si hay cambios, `busy` o `iconBusy` |
| A-3 · permisos | ✓. Catálogo puro con los textos de `vista.md` y `PROJECTS_AVAILABLE = false` (HU-0023 solo lo cambia); estados de A-3.2 y A-3.3; éxito con `role="status"`, error con `role="alert"` y la ruta del catálogo, nunca el mensaje de Rust; sin toasts |
| A-4 · contrato IPC | ✓. Espejo literal en `types.ts` y `bridge.ts`; mocks como se pidió; dos comandos en `generate_handler!`; los 21 anteriores no cambian |

## Lo comprobado (por lectura)

- **Ramas de Windows y Linux.** Compilan por lectura:
  - `open_system_settings_sync` y `account_facts_sync` tienen su `cfg(not(target_os = "macos"))`;
  - `system_settings_url` y `groups_include_admin` llevan `cfg_attr(not(macos), allow(dead_code))`;
  - las variantes del enum se construyen con `Deserialize`;
  - `Command` se importa sin condición;
  - las pruebas solo usan funciones puras;
  - CI corre `cargo test` sin `-D warnings`.

  En CI, `build.rs` lee las dos claves nuevas de `.env.example`, igual que las cinco anteriores.
- **Configuración.**
  - Las dos URLs están solo en `.env.example` (`[PUBLICO]`, con su ficha) y en `config.rs` (`env!`).
  - `validate_settings_url` exige el prefijo exacto y solo `[A-Za-z0-9._?=&-]`. Las pruebas cubren `https`, `file:`,
    vacío, espacio, comilla, `;` y mayúsculas en el esquema.
  - El frontend no tiene ninguna URL. La prueba de permisos lo vigila: ni `x-apple`, ni `http`, ni `systempreferences`.
  - `open` recibe la URL como argumento y no pasa por un shell.
- **Privacidad.**
  - El estado sale de `customIcon.systemIssue` y de los nombres de las instancias, metadatos del registro que el
    sidebar ya muestra.
  - La salida de `id` no se guarda, no se registra y no cruza el IPC: solo pasa un booleano.
  - No se lee nada de los perfiles.
- **R-1 de la HU-0015.**
  - `focus`, `blur` y `visibilitychange` siguen solo en los tres hooks que ordena `DashboardRuntime` (prueba 8).
  - ⌘, reutiliza el `keydown` de ⌘F en `AppSidebar`, que vuelve a registrarse si cambian `dialogOpen` u `onSettings`.
    Es un `keydown`, sin efecto sobre el orden de `focus`.
- **AC-04 de la HU-0019.** La prueba 12 sigue protegiéndolo, y con más alcance:
  - ningún `--fs-*` baja de 11;
  - en cada `--fs-*`, Grande es mayor que normal;
  - `--lh-*` y `--ctl*` crecen o se mantienen en Grande y bajan o se mantienen en Compacto;
  - los tres bloques declaran la escala completa en px;
  - nadie redefine la escala fuera de `tokens.css`.
- **Peso.**
  - No hay dependencias nuevas: `Tabs` y `Popover` ya estaban en el catálogo y en `radix-ui`.
  - `SettingsRoute` es un chunk diferido de 29 kB sin comprimir.
  - El CSS crece 0,84 kB, según el implementador.
  - En Rust, ni crates ni capacidades nuevas.
- **Desvíos declarados.** Todos aceptados:
  - **Verde de éxito `#3b7550` en claro**: el `#3f7a52` anterior daba 4,46:1 sobre `--surface`, y la prueba 16 lo vigila.
  - **Entradas con `rounded-sm` (8)**: lo pide la maqueta aprobada («Entrada del editor 40 · radio 8»), que manda
    sobre la tabla de A-1.3. El `Input` del catálogo sigue en `rounded-md`.
  - **Anillos en vez de bordes**: es lo que pide A-1.6.
  - **«Cuándo cambia» en el popover**: lo pide A-3.2.
  - **Interlineado a 2 px de la retícula**: ver R-4.
- **Regresiones visuales.** Contrasté `evidencias/paso1` y `paso2` con `diseno/capturas` (00, 01 y 03) y con la
  evidencia de Grande de la HU-0019. La página Configuración coincide con la maqueta. La única regresión que encontré
  está en la R-1.

## Choque con la HU-0023

Ninguno:

- `ab26ad5` y `a9d609c` añaden tipos, mocks y comandos de proyectos, sin tocar `SystemSettingsPanel`, `AccountFacts`,
  `config.rs` ni `.env.example`.
- `1785d4d` añade `Info.plist` con los textos de TCC de Escritorio, Documentos y Descargas. Así, el aviso de «Archivos y
  carpetas» solo puede aparecer cuando Proyectos lea una carpeta, nunca al entrar en Configuración.
- `PROJECTS_AVAILABLE` sigue siendo el único punto de enganche (A-3.4).

## Observaciones

| # | Severidad | Responsable | Observación |
| --- | --- | --- | --- |
| R-1 | corregir antes de entregar | frontend | **La marca se corta en Grande.** «Code AI Profi…» a 1440 y a 980 (`paso1/instancia-light-grande-1440.png`, `paso2/permisos-necesita-dark-grande-980.png`). En la HU-0019 cabía entera (`HU-0019…/evidencias/15-instancia-1440-oscuro-grande.png`). Lo causa que el chip BETA ahora mide 28 con `px-1` y anillo, más el `px-4` de la cabecera. La forma de corregirlo la elige frontend, siempre dentro de la escala; por ejemplo, el BETA a `--ctl-xs` sin crecer en Grande, o `gap-1` en la cabecera de la marca. Hay que comprobarlo en los tres tamaños, con el sidebar desplegado, a 1440 y a 980 |
| R-2 | corregir antes de entregar | frontend | **Las skills nombran todavía `AppearanceDialog`**: `.claude/skills/code-ai-profiles-frontend-react-vite/estilos.md:34` (la excepción de la prueba 13) y, en `.claude/skills/code-ai-profiles-ui/`, `componentes/dialog.md:11`, `componentes/field.md:11`, `componentes/radio-group.md:11` y `tema.md:27`. Deben decir `AppearanceSettings`, en Configuración, y no en `DialogHost`. La HU-0023 se está implementando con estas skills |
| R-3 | deuda | frontend | **`541f5e6` no compila**: borra `AppearanceDialog.tsx`, pero `features/appearance/index.ts` y `DialogHost.tsx` siguen importándolo hasta `2b8003b`, así que `git bisect` falla en ese commit. No se reescribe la historia con la HU-0023 en curso; si el PR a `develop` se integra con squash, el problema desaparece. Para la próxima: el borrado va en el mismo commit que quita sus usos |
| R-4 | deuda (la persona la acepta o la rechaza en la prueba humana) | frontend | **Interlineado a 2 px de la retícula** en dos casos: el botón `sm` en Compacto (28 de alto con 16 de línea: y = 6) y el título de la barra en Grande (52 de alto con 24 de línea: y = 14). AC-06 pide «en los tres tamaños». El origen está en la tabla de A-1.2: ningún `--lh-*` cumple «alto − 16» en los tres tamaños para esos dos controles. El texto queda centrado ópticamente. Mi recomendación es aceptarlo como excepción con nombre. Si la persona lo rechaza, frontend añade `--lh-ctl-sm` (20 / 16 / 20) y un interlineado fijo de 20 para la barra, con la prueba 12 extendida |
| R-5 | deuda | frontend | **Accesibilidad menor en Permisos:** (a) el texto oculto del punto de la pestaña dice «una instancia necesita un permiso» aunque sean varias; mejor «alguna instancia necesita un permiso». (b) El paso de «Comprobando…» al estado de la cuenta no se anuncia: no hay región viva. (c) Los encabezados saltan de `h1` (`PageHeader`) a `h3` (la tarjeta) y a `h4` (el popover) |
| R-6 | deuda | frontend | **Las medidas del paso 1 son solo de Cómodo** (las 14 pantallas de `medidas-despues.json`). De Compacto y Grande del barrido solo hay capturas; la medición en los tres tamaños existe solo para Configuración (paso 2). La persona revisa el barrido en Compacto y Grande durante la prueba humana; si QA quiere, repite la medición con Chrome sin interfaz sobre `pnpm dev` |

Backend no tiene observaciones.

## Pendiente humano (macOS, `pnpm tauri dev`)

1. Entrar en Configuración › Permisos no muestra **ningún** aviso del sistema (AC-05).
2. «Abrir Ajustes del Sistema» de «Gestión de apps» abre ese panel exacto (S-1, AC-04). La línea de éxito aparece y
   no hay toast.
3. ⌘, abre Configuración, no actúa con un diálogo abierto y no choca con ningún menú nativo (R-8 de la arquitectura).
4. El enlace D-4 del editor se bloquea si hay cambios sin guardar.
5. El barrido en Compacto y Grande (R-4 y R-6) y la marca en Grande (R-1).
6. Windows y Linux: el vacío de Permisos y la compilación de los comandos, en los instaladores de CI.
