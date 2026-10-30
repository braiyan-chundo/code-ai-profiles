# Arquitectura · HU-0022 · Configuración unificada con apariencia y permisos

## Análisis

Confianza: **alta** en el contrato, las rutas y los permisos, y **media** en el barrido armónico. Este último toca unos
65 archivos de la interfaz (45 de la app y 20 del catálogo que la app usa) y solo una persona puede confirmar el
resultado en pantalla.

Leído: `hu.md`, `seguimiento.md`, `diseno/vista.md` (sistema armónico y auditoría UX), las secciones 5 y 6 de
`diseno/maqueta.html`, `DESIGN.md`, `src/styles/{tokens,ui-theme,index}.css`, `tests/ui-isolation.test.ts`,
`src/features/appearance/*`, `src/app/{router.tsx,layout/AppSidebar.tsx,layout/PageHeader.tsx,layout/AppShell.tsx}`,
`src/features/instances/{InstanceEditor.tsx,icon-status.ts}`, `src/types.ts` (`CustomIcon`), `src/lib/bridge.ts`,
`src-tauri/{build.rs,src/config.rs}`, `lib.rs` (`open_instance_folder`, `generate_handler!`), `macos_icon.rs`
(`MESSAGE_APP_MANAGEMENT`), `original_update.rs` (escritura junto a la original) y ADR-0002. También el grafo
(`graphify query` sobre configuración, apariencia, permisos, sidebar, tokens y `appManagement`).

Mediciones propias, solo de lectura:

- **Tailwind 4.3.3** compila `text-(length:--fs-body)/(--lh-body)` como `font-size` + `line-height`. Compilado en el
  scratchpad.
- `cn` 0.5 trata esa forma como tamaño de texto: no la confunde con un color y la fusiona bien con `text-sm`,
  `leading-*` y `text-muted-foreground`.
- **Contraste**: `#151615` sobre `#ff5f35` da **6,00:1**; `#f3efeb` sobre el mismo fondo, 2,65; blanco, 3,03.
- **Pertenencia al grupo admin**: `/usr/bin/id -Gn` la da sin ningún aviso.
- **Infracciones de la escala hoy**, con el detector que propone A-5:

  | Infracción | App | Catálogo usado |
  | --- | --- | --- |
  | Espaciado fuera de la escala | 68 | 38 |
  | Radios fuera de la escala | 9 | 7 |
  | Interlineados con nombre | 36 | 8 |
  | `--fs-*` sin interlineado | 77 | 2 |
  | Anillo `ring-ring/50` / `ring-3` | 2 | 20 |

### Supuestos

- **S-1** · El esquema `x-apple.systempreferences:com.apple.preference.security?<ancla>` abre el panel exacto de
  macOS 13.3 a 27. En este Mac (macOS **27.0.1**, build 26A434) está verificado sin abrir Ajustes:
  - `SecurityPrivacyExtension.appex/Contents/Info.plist` declara `allowsXAppleSystemPreferencesURLScheme = true` y
    `legacyBundleIdentifier = com.apple.preference.security`.
  - `Resources/TCCServiceList.plist` asocia `revealElementKeyName = Privacy_AppBundles` a
    `kTCCServiceSystemPolicyAppBundles` («Gestión de apps»).
  - El binario de la extensión contiene `Privacy_FilesAndFolders`.

  De 13.3 a 15 lo respalda la documentación (Gestión de apps existe desde macOS 13). Si en 13.x o en una versión
  futura el ancla no existe, macOS abre Privacidad y seguridad sin desplazarse: es una degradación, no un error.
  Lo cierra la prueba humana.
- **S-2** · Ni `open` sobre ese esquema ni `id -Gn` disparan avisos de TCC. Abrir Ajustes no es un permiso
  protegido, e `id` solo lee la base de usuarios.
- **S-3** · Gestión de apps no se puede consultar sin intentar escribir en un bundle, y eso dispararía el aviso. Su
  estado sale solo de `customIcon.systemIssue` del registro. Archivos y carpetas tampoco se puede consultar sin leer
  una carpeta protegida (otro aviso), así que siempre queda «No se puede comprobar».
- **S-4** · `--spacing` de Tailwind vale 0,25 rem = 4 px, y nadie cambia el `font-size` de `<html>`. El tamaño del
  texto cambia solo las variables `--fs-*`.

### Preguntas para el mantenedor

Ninguna bloquea. Hay dos ★ con su alternativa, por si quieres otra cosa:

1. **Cuenta de administrador con estado real** (A-3.3). La maqueta decía «Solo informativo». Propongo mostrar
   «Tu cuenta es de administrador» o «Tu cuenta no es de administrador», comprobado con `id -Gn` sin avisos. Encaja
   con D-3 («estado cuando se puede saber»). *Alternativa:* el texto de la maqueta, sin la llamada.
2. **Atajo ⌘, / Ctrl+,** para abrir Configuración (H7). Entra en esta historia. *Alternativa:* sin atajo.

### Impacto

| Símbolo que cambia | Consumidores (`rg`, grafo) | Qué se rompe si se hace mal |
| --- | --- | --- |
| `--esc` (desaparece) y `--ctl*` (por tamaño de texto) | `button`, `input`, `badge`, `kbd`, `sidebar` del catálogo; `DashboardRoute.tsx`; `ui-theme.css` (`--text-base…2xl`) | Alturas de controles en Compacto y Grande; pruebas 9 y 12 de `test:ui` |
| `--text-base/lg/xl/2xl` del puente | `input`, `field`, `card`, `empty` (catálogo) | Pasan de `16·esc` a tokens de la escala: hasta 2 px menos en normal |
| `--radius*` | Unos 160 `rounded-*` | Radios de toda la app |
| `--ui-on-primary` y `--ring` | `Button` primario, `Badge` default, `sidebar-primary-foreground`, el foco de todo | Contraste del primario; el foco visible |
| `AppearanceDialog`, `appearanceOpen`/`setAppearanceOpen` | `DialogHost`, `DialogsProvider`, `dialogs-context`, `AppSidebar`, prueba 13 (`SAMPLE_FILE`) | El diálogo desaparece: no puede quedar ninguna referencia |
| `iconRetryState().appManagement` y el aviso del editor | `InstanceEditor.tsx` | Solo se añade el enlace (D-4) |
| IPC nuevo: `open_system_settings`, `get_account_facts` | `bridge.ts`, `types.ts` | Comandos aditivos; los 21 existentes no cambian |

- **Contrato**: aditivo. Dos comandos y tres tipos. Estamos en 0.x, sin versión mayor.
- **Datos guardados**: ninguno. `code-ai-profiles:appearance` (localStorage) y el registro no cambian. **No hay
  migración.**
- **Privacidad**: no se lee nada de los perfiles. El estado sale de `customIcon.systemIssue`, que ya cruza el IPC, y
  de un booleano de pertenencia a `admin`. La salida de `id` no se guarda, no se registra y no cruza el IPC.
- **Permisos de la app**: no se piden. No cambian ni `capabilities/default.json` ni la CSP ni `assetProtocol`. No
  hay plugins ni dependencias nuevas. No hay red.
- **Plataformas**: las tarjetas son solo de macOS. Windows y Linux muestran el vacío y compilan los dos comandos con
  una rama explícita.
- **Riesgosa**: sí por alcance visual (barrido global) y por la etiqueta `permisos`. No toca dinero, sesiones,
  datos de perfil ni concurrencia.

## Solución

### A-1 · Sistema armónico en toda la app (paso 1)

Fuente de verdad: `diseno/vista.md` («Sistema armónico aplicado» y «Medidas clave») y las secciones 5 y 6 de la
maqueta. Lo que queda fijado aquí:

**A-1.1 · Espaciado.** No se añaden tokens `--s*`. La escala de Tailwind ya es de 4 px, así que los pasos
permitidos son `0, 1, 2, 3, 4, 6, 8, 12` (0, 4, 8, 12, 16, 24, 32, 48 px), en `p*`, `m*`, `gap*` y `space-*`.
Quedan fuera:

- los pasos `0.5`, `1.5`, `2.5`, `3.5`, `5`, `7`, `9`, `10`, `11`, `14` y `px`;
- `[Npx]` en espaciado, salvo tres huecos de posición de controles nativos: `Titlebar.tsx` `pl-[84px]`, y en
  `PageHeader.tsx` `pr-[160px]` y `pl-[68px]`.

Las alturas y anchos arbitrarios (`h|w|size|min-*|max-*-[Npx]`) deben ser múltiplos de 4. La retícula de página
es de 12 × 68 px con 24 de gutter. El cuerpo de Configuración mide `max-w-[896px]` (10 columnas) y ocupa todo el
ancho por debajo de 1071 px.

**A-1.2 · Interlineado y tamaños: sin `--esc`.** En `tokens.css`, cada uno de los tres bloques (`:root`,
`[data-text-size="compact"]` y `[data-text-size="large"]`) declara los siete `--fs-*` (sin cambios), ocho `--lh-*`
y cinco `--ctl*` en px enteros. `--esc` desaparece.

| Token | Compacto | Normal | Grande |
| --- | --- | --- | --- |
| `--lh-micro` | 16 | 16 | 16 |
| `--lh-small` | 16 | 16 | 20 |
| `--lh-prose` (párrafos en `--fs-small`) | 20 | 20 | 24 |
| `--lh-body` | 20 | 20 | 24 |
| `--lh-heading` | 20 | 20 | 24 |
| `--lh-title` | 20 | 24 | 24 |
| `--lh-figure` | 24 | 28 | 32 |
| `--lh-dialog` | 24 | 28 | 32 |
| `--ctl` (botón, pestaña) | 32 | 36 | 40 |
| `--ctl-sm` (botón sm, ítem del sidebar, buscador) | 28 | 32 | 36 |
| `--ctl-lg` (entrada, botón lg, tile de permiso) | 36 | 40 | 44 |
| `--ctl-xs` (info, botón xs) | 24 | 24 | 28 |
| `--ctl-badge` (chips, kbd, contador, BETA) | 24 | 24 | 28 |

El `--lh-prosa` de la maqueta se llama `--lh-prose` en el código.

- **Cómo se escribe un texto en la app**: `text-(length:--fs-<x>)/(--lh-<y>)`, con el `/` obligatorio.
  `leading-(--lh-<y>)` sirve donde el tamaño viene del catálogo. Las clases `leading-none|tight|snug|normal|relaxed|
  loose|[n]` quedan prohibidas. `leading-4` a `leading-8` (16–32 px) solo dentro de una caja fija.
- **`body`** (`index.css`, capa base): `font-size: var(--fs-body); line-height: var(--lh-body)`.
- **Puente del catálogo** (`ui-theme.css`, `@theme inline`). Desaparecen los `calc(…*var(--esc))`.

  | Clase | Tamaño | Interlineado |
  | --- | --- | --- |
  | `--text-xs` | `--fs-small` | `--lh-small` |
  | `--text-sm` | `--fs-body` | `--lh-body` |
  | `--text-base` | `--fs-heading` | `--lh-heading` |
  | `--text-lg` | `--fs-title` | `--lh-title` |
  | `--text-xl` | `--fs-figure` | `--lh-figure` |
  | `--text-2xl` | `--fs-dialog` | `--lh-dialog` |

  Cada interlineado se declara como `--text-<n>--line-height`.
- **AC-04 de HU-0019 se mantiene**:
  - Ningún `--fs-*` baja de 11.
  - Grande es mayor que normal en cada `--fs-*`.
  - Los `--ctl*` y los `--lh-*` de Grande son mayores o iguales que los de normal, y los de Compacto, menores o
    iguales.

  Lo vigila la prueba 12.

**A-1.3 · Radios** (`ui-theme.css`, `@theme inline`):

| Clase | Valor | Para qué |
| --- | --- | --- |
| `rounded-xs` | 4 | kbd, BETA, contador, lo decorativo |
| `rounded-sm` | 8 | antes 9: chips, controles de 24–32, hijos anidados |
| `rounded-md` | 12 | controles de 36–44 |
| `rounded-lg` = `--radius` | 16 | antes 14: tarjetas, panel del sidebar, popover |
| `rounded-xl` | 16 | |
| `rounded-2xl` | 20 | ventana de Windows |
| `rounded-3xl` | 24 | antes 26: diálogos |

- Prohibidos: `rounded-4xl`, `rounded-[calc…]`, `rounded-[min…]` y `rounded-[Npx]` con N fuera de {4, 8, 12, 16,
  20, 24}.
- **Regla de anidado**: un hijo de todo el ancho dentro de un contenedor con padding *p* y radio *R* lleva
  `max(8, R − p)`.
- El `Badge` pasa de `rounded-4xl` a `rounded-sm`, y su altura a `--ctl-badge` (24).

**A-1.4 · Foco**:

- `--ring` y `--sidebar-ring` pasan a `var(--ui-primary-text)`.
- En los componentes del catálogo que usa la app, `focus-visible:ring-3 … ring-ring/50` se sustituye por
  `focus-visible:ring-2 focus-visible:ring-ring`, sin el `/50`.
- En `index.css`, `outline-ring/50` pasa a `outline-ring`.
- Los anillos `aria-invalid` siguen igual.

**A-1.5 · Botón primario.** `--ui-on-primary: #151615` (el `--surface` oscuro) en `:root, .theme-dark, .theme-light`.

- **Trampa**: `var(--surface)` no sirve. Se resuelve en `<html>`, y en tema claro daría `#f3efeb` (2,65:1).
- El `hover` del primario debe seguir en 4,5:1 o más con el texto oscuro. `hover:bg-primary/80` sobre la ventana
  oscura lo oscurece: se mide y, si baja de 4,5, el hover aclara (`color-mix` hacia blanco) en lugar de
  transparentar.

**A-1.6 · Bordes que mueven la retícula.** Los bordes de 1 px de opciones, sesión, alerta, buscador, sidebar, barra
de estado y ventana de Windows pasan a anillo (`ring-1 ring-inset` o `shadow-[inset_…]` con tokens), como en la
maqueta.

**A-1.7 · Qué cambia en DESIGN.md**, en la sección «Cómo se aplica»:

- la tabla de la escala con `--lh-*` y `--ctl*` por tamaño, en lugar de `--esc`;
- los radios 4/8/12/16/20/24 y la regla de anidado;
- la escala de espaciado y la retícula de 12 columnas;
- el anillo de foco de 2 px;
- el texto oscuro del primario;
- chips y contadores de 24.

El frontmatter heredado de «Lumina» no se toca. También se actualizan las fichas de los componentes del catálogo
que cambian (`.claude/skills/code-ai-profiles-ui/componentes/<id>.md`, sección «Diferencias con el registro») y
`tema.md`.

### A-2 · La página Configuración (paso 2)

- **Ruta**: `{ path: "configuracion/:section?", lazy: SettingsRoute }`, hija de `/` en `src/app/router.tsx`.
  - `section` vale `apariencia` o `permisos`. Sin sección o con otra, `<Navigate to="/configuracion/apariencia"
    replace />`.
  - La URL no lleva nada más.
- **Pantalla**: `src/app/routes/settings/SettingsRoute.tsx` pinta `PageHeader` y `PageContent`, sin envoltorio.
  - `PageHeader` lleva `eyebrow="Configuración"` y, como título, «Apariencia» o «Permisos».
  - Las pestañas son `Tabs` del catálogo, controladas por la ruta: `value = section` y `onValueChange →
    navigate(…, { replace: true })`. Se recorren con flechas, como pide Radix.
  - La pestaña Permisos lleva un punto cuando `attention` es verdadero (A-3.4).
- **Apariencia**: `src/features/appearance/AppearanceSettings.tsx` sustituye a `AppearanceDialog.tsx`, que se
  borra.
  - Lleva tres tarjetas (Tema, Tamaño del texto, sesión de ejemplo), con el mismo `useAppearance()`, el efecto
    inmediato y sin «Listo».
  - Las muestras `text-[11px]`, `text-[15px]` y `text-[19px]` se quedan, y `SAMPLE_FILE` de la prueba 13 apunta al
    archivo nuevo.
- **Diálogo**: desaparecen `appearanceOpen`/`setAppearanceOpen` de `dialogs-context.ts`, `DialogsProvider.tsx` y
  `DialogHost.tsx`.
- **Sidebar** (D-1): en el pie, «Configuración» sustituye a «Apariencia».
  - Icono `SettingsIcon`, `<Link to="/configuracion">`.
  - `isActive` y `aria-current="page"` con `useMatch("/configuracion/*")`.
  - Tooltip «Configuración».
- **Atajo** (H7): ⌘, en macOS y Ctrl+, en Windows y Linux.
  - Va en el `keydown` que ya tiene `AppSidebar` para ⌘F: no se añade otro listener.
  - Navega a `/configuracion`.
  - No actúa si hay un diálogo de `DialogHost` abierto, para no navegar detrás de un modal.
  - El tooltip muestra el atajo con `shortcutModifierLabel`.
- **Aviso del editor** (D-4): junto a «Reintentar», un enlace «Ver en Configuración › Permisos» que cierra el
  editor (`setEditor(null)`) y navega a `/configuracion/permisos`.
  - Con cambios sin guardar, o con `busy` o `iconBusy`, el enlace no navega y muestra «Guarda o cancela los
    cambios para ir a Configuración». Así no se pierden ediciones.
  - En Windows y Linux el aviso no existe.

### A-3 · Permisos

**A-3.1 · Inventario definitivo**

| Plataforma | Permiso | Panel | Estado | Botón |
| --- | --- | --- | --- | --- |
| macOS | **Gestión de apps** (`kTCCServiceSystemPolicyAppBundles`) | `Privacy_AppBundles` | Del registro (A-3.2) | «Abrir Ajustes del Sistema» |
| macOS | **Archivos y carpetas** | `Privacy_FilesAndFolders` | «No se puede comprobar» | Sí, **solo cuando exista Proyectos** (HU-0023) |
| macOS | **Cuenta de administrador** | — (no es un permiso de TCC) | `get_account_facts` (A-3.3) | No (AC-04) |
| Windows | — | — | Vacío: «Esta plataforma no necesita permisos adicionales» | — |
| Linux | — | — | Ídem | — |

Fuera, con su razón:

- **El Llavero**: lo usan las instancias, no Code AI Profiles. Desde HU-0020 no pide contraseña y no tiene panel
  en Ajustes.
- **pkexec (HU-0018) y `claude://` (HU-0021)**: todavía no existen.
- **Automatización, Accesibilidad y Acceso total al disco**: la app no los usa. Se comprobó con `rg` en `src-tauri`
  que no hay `osascript`, AX ni lecturas protegidas.

**A-3.2 · Gestión de apps.** Se calcula en el frontend con los datos que ya trae el panel.

- `n` = instancias de `dashboard.instances` con `customIcon?.systemIssue === "appManagement"`. La original no
  cuenta.
- Con `n > 0`: «Lo necesita: 1 instancia» o «Lo necesita: N instancias», en `--ui-warning`, y `attention = true`.
- Con `n = 0`: «Sin uso todavía», con el punto en `--quiet`.
- El estado cambia solo cuando la persona pulsa «Reintentar» en la instancia: el popover lo dice. El refresco al
  volver a la app ya existe (`useBackgroundRefresh`) y no se añade otro.

**A-3.3 · Cuenta de administrador** (★, pregunta 1). La da `get_account_facts`.

| `admin` | Texto | Color |
| --- | --- | --- |
| `true` | «Tu cuenta es de administrador» | `--ui-success` |
| `false` | «Tu cuenta no es de administrador: «Descargar e instalar» se parará» | `--ui-warning`, sin `attention` porque no hay nada que activar |
| `null` | «No se puede comprobar» | |

Mientras llega, «Comprobando…». Se pide una vez al montar la pestaña Permisos, solo en macOS.

**A-3.4 · Archivos y carpetas y HU-0023.** Esta historia deja hecho todo lo que la tarjeta necesita:

- el panel `filesAndFolders` en Rust, con su clave de configuración;
- la tarjeta y sus textos en el catálogo puro.

Queda oculta tras un parámetro `projectsAvailable` de `permissionCards()`, que hoy vale `false` en
`PermissionsSettings`. **HU-0023 solo cambia ese valor a `true`** cuando exista `#/proyectos`. No toca Rust, `types.ts`
ni `bridge.ts` para este permiso.

**A-3.5 · Enlaces y por dónde se abren.**

| Panel | Clave | Valor |
| --- | --- | --- |
| `appManagement` | `CAP_MACOS_APP_MANAGEMENT_SETTINGS_URL` | `x-apple.systempreferences:com.apple.preference.security?Privacy_AppBundles` |
| `filesAndFolders` | `CAP_MACOS_FILES_AND_FOLDERS_SETTINGS_URL` | `x-apple.systempreferences:com.apple.preference.security?Privacy_FilesAndFolders` |

Se usa el identificador heredado `com.apple.preference.security` y no `com.apple.settings.PrivacySecurity.extension`:
la extensión de macOS 27 lo declara como `legacyBundleIdentifier`, y es el que entienden de 13 en adelante.

**Decisión: van a `.env.example`** como `[PUBLICO]`, fijadas al compilar (`build.rs` → `config.rs`), igual que las
demás URLs de Rust. El razonamiento:

1. Conceptualmente son constantes de plataforma: no cambian entre entornos y no identifican un servicio. Bajo la
   skill de configuración serían «enlaces fijos».
2. Pero la regla de este proyecto para Rust es más estricta y literal: «ninguna URL en `.rs` fuera de `config.rs`,
   que las recibe de `.env.example`» (ADR-0002 y skill `rust-tauri`). Además, la guarda no revisa `.rs`. Una
   excepción por esquema abriría una categoría nueva que nadie vigila.
3. Fijarlas al compilar cuesta dos líneas y permite corregir un ancla que macOS renombre sin tocar el código.
4. **Defensa**: el frontend nunca envía una URL, solo el enum. Rust abre únicamente lo que `config::validate()`
   aceptó: prefijo exacto `x-apple.systempreferences:` y solo `[A-Za-z0-9._?=&-]` después.

Se abre con `/usr/bin/open <url>`, con argumentos en lista y dentro de `spawn_blocking`, igual que
`open_instance_folder`. No hace falta ningún plugin ni capability nueva.

**A-3.6 · Respuesta al pulsar** (H1, H9):

- **Éxito**: bajo la tarjeta, una línea `role="status"` con «Se abrió Ajustes del Sistema. Activa Code AI Profiles
  y vuelve.».
- **Error**: una línea destructiva con «No se pudo abrir Ajustes del Sistema. Ábrelo tú: Ajustes del Sistema ›
  Privacidad y seguridad › <panel>.». La ruta sale del catálogo puro, no de Rust.
- Nunca un toast (R-1).
- **Popover de información** (AC-03): `Popover` del catálogo, con un botón de 24 × 24, `aria-label` y
  `aria-expanded`. Se abre con clic, Intro o Espacio y se cierra con Esc. Textos: los de «Textos» de `vista.md`.

### A-4 · Contrato IPC (aditivo, 0.x)

Rust, en `lib.rs`, junto a `open_instance_folder`:

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
enum SystemSettingsPanel { AppManagement, FilesAndFolders }

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
struct AccountFacts {
    /// macOS: the user belongs to the `admin` group. None off macOS or when `id` fails.
    admin: Option<bool>,
}

#[tauri::command]
async fn open_system_settings(panel: SystemSettingsPanel) -> Result<(), String>;
#[tauri::command]
async fn get_account_facts() -> Result<AccountFacts, String>; // siempre Ok
```

- `system_settings_url(panel) -> &'static str` es pura y sirve en las tres plataformas: devuelve la URL de `config`.
- `open_system_settings_sync`:
  - En macOS ejecuta `/usr/bin/open`, comprueba `status.success()` y, si falla, devuelve «No se pudo abrir Ajustes
    del Sistema: {error}».
  - En el resto devuelve `Err("Esta plataforma no tiene ese panel de ajustes.")`.
- `account_facts_sync`:
  - En macOS ejecuta `/usr/bin/id -Gn` y devuelve `admin: Some(groups_include_admin(stdout))` si sale bien, o `None`.
  - En el resto devuelve `None`.
- `groups_include_admin(&str) -> bool` es pura: comprueba si `split_whitespace()` contiene exactamente `"admin"`.
- Los dos comandos se registran en `generate_handler!`.

TypeScript, en `src/types.ts`:

```ts
/** Panel de Ajustes del Sistema que Code AI Profiles sabe abrir (solo macOS). */
export type SystemSettingsPanel = "appManagement" | "filesAndFolders";
export interface AccountFacts {
  /** Solo macOS: la cuenta pertenece al grupo admin. null fuera de macOS o si no se pudo saber. */
  admin: boolean | null;
}
```

En `src/lib/bridge.ts`:

- `openSystemSettings(panel: SystemSettingsPanel): Promise<void>` llama a `call("open_system_settings", { panel })`.
  El mock no hace nada.
- `accountFacts(): Promise<AccountFacts>` llama a `call("get_account_facts")`. El mock devuelve `{ admin: true }`.

### Variables de entorno nuevas

| Nombre | [SECRET]/[PUBLICO] | Apps | Para qué |
| --- | --- | --- | --- |
| `CAP_MACOS_APP_MANAGEMENT_SETTINGS_URL` | [PUBLICO] | desktop (Rust), al compilar | Panel «Gestión de apps» de Ajustes del Sistema |
| `CAP_MACOS_FILES_AND_FOLDERS_SETTINGS_URL` | [PUBLICO] | desktop (Rust), al compilar | Panel «Archivos y carpetas» |

Las dos se añaden a `KEYS` de `build.rs` (de 5 a 7), a `ConfigValues` y `validate_values` en `config.rs` y a sus
pruebas. Se compilan en las tres plataformas, pero solo macOS las usa.

### A-5 · Pruebas proporcionales

**Rust** (`cargo test`), sin que ninguna prueba ejecute `open` (abriría Ajustes):

- `config.rs`:
  - las dos claves válidas;
  - rechazo de `https://…`, de un esquema distinto, de un valor vacío y de espacios o comillas;
  - `validation_names_the_broken_key` crece con los dos casos.
- `lib.rs`:
  - `system_settings_url` devuelve la URL de cada panel y empieza por el esquema;
  - `SystemSettingsPanel` acepta `"appManagement"` y `"filesAndFolders"`, y rechaza `"fullDisk"`;
  - `AccountFacts { admin: None }` se serializa como `{"admin":null}`;
  - `groups_include_admin`: `"staff admin everyone"` → `true`; `"staff everyone"`, `"administrators"` y `""` →
    `false`.

**`test:ui`** (`tests/ui-isolation.test.ts`):

- **12, reescrita**:
  - `--esc` no existe en `src/`;
  - los tres bloques declaran 7 `--fs`, 8 `--lh` y 5 `--ctl` en px;
  - cada `--lh` y cada `--ctl` es múltiplo de 4, y cada `--lh-x` es al menos su `--fs-x`;
  - el mínimo de 11 se mantiene, Grande es mayor que normal y el orden de A-1.2 se cumple;
  - el puente `--text-*` sigue a `var(--fs-*)` con su `--line-height` en `var(--lh-*)`;
  - un `--lh-*` usado debe existir;
  - `SCALE_DECLARATION` incluye `--lh-`.
- **13**: `SAMPLE_FILE` pasa a `features/appearance/AppearanceSettings.tsx`.
- **15, nueva, escala armónica.** Revisa los `.tsx` de `app/`, `features/` y `components/*.tsx`, más los componentes
  de `components/ui/` que esos archivos importan, calculados desde sus imports para que una pieza nueva quede
  cubierta sola. Comprueba:
  - espaciado fuera de A-1.1, salvo las tres excepciones con nombre;
  - radios fuera de A-1.3;
  - `leading-*` con nombre;
  - `text-(length:--fs-*)` sin `/(--lh-*)`;
  - `ring-ring/50`, `ring-3` y `ring-[3px]` en foco;
  - medidas arbitrarias que no son múltiplo de 4.
- **16, nueva, contraste de pares sólidos.** Lee los hex de `tokens.css` y `ui-theme.css` y comprueba 4,5:1 o más en
  los dos temas para:
  - `--text` y `--muted` sobre `--surface`;
  - `--ui-on-primary` sobre `--primary-bright`;
  - `--ui-primary-text`, `--ui-success` y `--ui-warning` sobre `--surface`.

  Y 3:1 o más para `--ring` sobre `--surface`.
- **9, canario**: muestras sintéticas para las pruebas 15 y 16, con rutas de Windows.

**`test:permissions`** (nuevo, `tests/permissions.test.ts` sobre `src/features/permissions/permission-cards.ts`, puro):

- macOS con 0, 1 y 2 instancias bloqueadas: texto, tono y `attention`. La original no cuenta.
- `admin` en `true`, `false`, `null` y «cargando».
- `projectsAvailable` en `false` → 2 tarjetas; en `true` → 3, en el orden Gestión de apps, Archivos y carpetas,
  Cuenta de administrador.
- Windows y Linux → `[]`.
- Las tarjetas con `panel: null` no tienen botón.
- Cada tarjeta trae nombre, para qué, «sin él» y ruta.

**La medición visual** (márgenes, retícula de 4 y AA en pantalla) no tiene una prueba automática proporcional: no hay
DOM en `node --test`. La comprueba la persona a 1440×920 y 980×680, en los dos temas y los tres tamaños, con la lista
de pantallas del brief. Si QA quiere, puede repetir la medición de la maqueta con Chrome sin interfaz sobre `pnpm dev`
(modo navegador con mock).

### Riesgos

| # | Riesgo | Mitigación |
| --- | --- | --- |
| R-1 | Regresión visual en pantallas que esta historia no rediseña, por el barrido de ~270 clases | La prueba 15 fija la escala; se revisan pantalla por pantalla (Dashboard, original, instancia, editor, transferir, desvincular, actualizar, borrar, escaneo, banners, Configuración) en 2 temas × 3 tamaños × 2 ventanas; commits separados por paso |
| R-2 | Controles 1–2 px más bajos en Compacto y Grande al cuantizar | Es lo pedido (AC-06); AC-04 de HU-0019 sigue vigilado por la prueba 12 |
| R-3 | `--text-base/lg/xl/2xl` cambian ±1–2 px en `input`, `field`, `card` y `empty` | Revisión en el editor y en los vacíos |
| R-4 | `--ui-on-primary` mal resuelto en claro | Literal en los tres selectores (A-1.5) y prueba 16 |
| R-5 | El hover del primario baja de AA | Se mide (A-1.5) |
| R-6 | El enlace del editor pierde ediciones | Bloqueado con cambios sin guardar (A-2) |
| R-7 | El ancla de un panel cambia en una versión de macOS | Se degrada a Privacidad y seguridad; la ruta se muestra en el popover y en el error; la URL se corrige en `.env.example` sin tocar código |
| R-8 | ⌘, entra en conflicto con un menú nativo | La app no define menú (`lib.rs` no tiene `Menu`); prueba humana en macOS |
| R-9 | Windows y Linux | Comandos con rama `cfg` explícita; vacío en la interfaz; instaladores en `build-desktop.yml` («solo verificado en CI») |
| R-10 | HU-0023 en paralelo toca `AppSidebar`, `router.tsx` o tokens | Ver «Coordinación con HU-0023» |

### Coordinación con HU-0023 (lo que fija esta historia)

- **Tokens**: la escala de A-1, con `--lh-*` y `--ctl*` por tamaño, sin `--esc` ni `--s*`, y los radios de A-1.3.
  HU-0023 escribe `text-(length:--fs-x)/(--lh-y)` y pasa la prueba 15.
- **Archivos y carpetas**: hecho aquí y oculto (A-3.4). HU-0023 cambia `projectsAvailable` a `true`.
- **Archivos compartidos**: `router.tsx` y el pie o los grupos de `AppSidebar.tsx`. Entra primero HU-0022, y
  HU-0023 rebasa encima.

## Briefs y orden

1. **En paralelo**:
   - `briefs/backend.md` · **sonnet**: dos comandos aditivos sin estado, con la lógica pura probada. No toca
     registro, perfiles ni procesos.
   - `briefs/frontend.md` **paso 1** (sistema armónico) · **sonnet**: mecánico, guiado por la prueba 15 y la maqueta.

   No comparten archivos: backend escribe `types.ts`, `bridge.ts`, `src-tauri/**` y `.env.example`.
2. `briefs/frontend.md` **paso 2** (Configuración y permisos), cuando backend haya entregado `bridge.ts` y `types.ts`.
3. Suite una vez (orquestador), revisión técnica (architect) y prueba humana en macOS. Windows y Linux, en CI.

El orquestador añade `pnpm test:permissions` a `stack.comandos` (`relacionadas` y `suite`) de `.metodo/config.json`.

## Revisión técnica

Pendiente: después de implementar y antes de la prueba humana.
