import type { ManagedInstance, SystemSettingsPanel } from "../../types";

/**
 * El catálogo puro de permisos (HU-0022, A-3): qué tarjetas muestra Configuración › Permisos, con sus textos, su
 * estado y su acceso directo. No importa React ni Tauri: lo prueba `tests/permissions.test.ts`. Los textos son los de
 * `diseno/vista.md`. El estado de «Gestión de apps» sale del registro de instancias (metadatos que la app ya tiene);
 * nada se lee de los perfiles y nunca se fuerza un aviso del sistema (AC-05).
 */

export type PermissionId = "appManagement" | "filesAndFolders" | "adminAccount";

/**
 * `needs`: lo necesita alguna instancia. `idle`: sin uso todavía. `unknown`: no se puede comprobar. `ok` y `warn`: la
 * cuenta de administrador, con o sin. `pending`: la respuesta de `accountFacts()` todavía no llegó.
 */
export type PermissionTone = "needs" | "idle" | "unknown" | "ok" | "warn" | "pending";

export interface PermissionInfo {
  /** «Para qué», «Sin él» y, si hace falta, «Estado». */
  rows: Array<{ label: string; text: string }>;
  /** La línea de éxito del popover (en `--ui-success`). */
  optional: string;
  /** La ruta del panel, o por qué no hay panel. */
  path: string;
}

export interface PermissionCard {
  id: PermissionId;
  name: string;
  /** La línea visible: para qué lo usa la app. */
  purpose: string;
  tone: PermissionTone;
  /** El estado, en una línea. */
  status: string;
  /** Qué instancias lo necesitan (solo «Gestión de apps»). */
  who: string | null;
  /** El panel que abre el botón; `null` si no hay panel y, por tanto, no hay botón (AC-04). */
  panel: SystemSettingsPanel | null;
  info: PermissionInfo;
  /** Qué decir si el panel no se pudo abrir (A-3.6). `null` si no hay panel. */
  openFailure: string | null;
}

/** `true` o `false` si `accountFacts()` lo supo, `null` si no pudo y `"loading"` mientras llega. */
export type AdminState = boolean | null | "loading";

export interface PermissionCardsInput {
  platform: "macos" | "windows" | "linux";
  instances: ReadonlyArray<Pick<ManagedInstance, "name" | "customIcon">>;
  admin: AdminState;
  /** `false` hasta que exista Proyectos (HU-0023): la tarjeta de Archivos y carpetas queda oculta. */
  projectsAvailable: boolean;
}

export interface PermissionCardsResult {
  cards: PermissionCard[];
  /** Alguna instancia necesita un permiso: la pestaña lleva un punto. */
  attention: boolean;
}

export const PRIVACY_PATH = "Ajustes del Sistema › Privacidad y seguridad";
export const OPEN_SETTINGS_SUCCESS = "Se abrió Ajustes del Sistema. Activa Code AI Profiles y vuelve.";
export const EMPTY_PLATFORM_TITLE = "Esta plataforma no necesita permisos adicionales";
export const EMPTY_PLATFORM_TEXT =
  "En Windows y Linux, Code AI Profiles funciona sin pedir accesos al sistema. Si alguna función los necesita más adelante, aparecerán aquí.";
export const MAC_INTRO_LEAD = "Accesos de macOS que mejoran algunas funciones.";
export const MAC_INTRO_STRONG = "Todos son opcionales: la app funciona sin ellos.";
export const MAC_FOOTNOTE = "Entrar aquí no pide ningún permiso. Los botones solo abren el panel; tú decides qué activar.";

/** «Work Profile», «Work Profile y Personal Dev», «A, B y C» o «A, B, C y 2 más». */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length <= 3) return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
  return `${names.slice(0, 3).join(", ")} y ${names.length - 3} más`;
}

/** Las instancias a las que macOS les negó el icono del Dock por «Gestión de apps». La original no cuenta. */
export function appManagementNames(instances: PermissionCardsInput["instances"]): string[] {
  return instances.filter((instance) => instance.customIcon?.systemIssue === "appManagement").map((instance) => instance.name);
}

function panelPath(panel: string): string {
  return `${PRIVACY_PATH} › ${panel}`;
}

function openFailure(panel: string): string {
  return `No se pudo abrir Ajustes del Sistema. Ábrelo tú: ${panelPath(panel)}.`;
}

function appManagementCard(instances: PermissionCardsInput["instances"]): PermissionCard {
  const names = appManagementNames(instances);
  const count = names.length;
  return {
    id: "appManagement",
    name: "Gestión de apps",
    purpose: "Pone el icono de cada instancia en el Dock cuando Claude se actualiza solo.",
    tone: count > 0 ? "needs" : "idle",
    status: count > 0 ? `Lo necesita: ${count} ${count === 1 ? "instancia" : "instancias"}` : "Sin uso todavía",
    who: count > 0 ? joinNames(names) : null,
    panel: "appManagement",
    info: {
      rows: [
        {
          label: "Para qué",
          text: "macOS protege las apps instaladas. Con este permiso, Code AI Profiles puede poner el icono de cada instancia en las copias que Claude actualizó por su cuenta.",
        },
        { label: "Sin él", text: "Esas copias enseñan el icono original en el Dock. Dentro de la app el icono se sigue viendo." },
        { label: "Cuándo cambia", text: "El estado se actualiza cuando pulsas «Reintentar» en el editor de la instancia." },
      ],
      optional: "Opcional: la app funciona sin él.",
      path: panelPath("Gestión de apps"),
    },
    openFailure: openFailure("Gestión de apps"),
  };
}

function filesAndFoldersCard(): PermissionCard {
  return {
    id: "filesAndFolders",
    name: "Archivos y carpetas",
    purpose: "Deja que Proyectos lea carpetas en Escritorio, Documentos o Descargas.",
    tone: "unknown",
    status: "No se puede comprobar",
    who: null,
    panel: "filesAndFolders",
    info: {
      rows: [
        {
          label: "Para qué",
          text: "Que Proyectos pueda leer las carpetas de tus proyectos cuando están en Escritorio, Documentos o Descargas.",
        },
        { label: "Sin él", text: "Los proyectos de esas carpetas no aparecen. Los de otras carpetas, sí." },
        { label: "Estado", text: "macOS no deja saber si está activo sin mostrarte un aviso, así que la app no lo comprueba." },
      ],
      optional: "Opcional: la app funciona sin él.",
      path: panelPath("Archivos y carpetas"),
    },
    openFailure: openFailure("Archivos y carpetas"),
  };
}

function adminStatus(admin: AdminState): Pick<PermissionCard, "tone" | "status"> {
  if (admin === "loading") return { tone: "pending", status: "Comprobando…" };
  if (admin === true) return { tone: "ok", status: "Tu cuenta es de administrador" };
  if (admin === false) return { tone: "warn", status: "Tu cuenta no es de administrador: «Descargar e instalar» se parará" };
  return { tone: "unknown", status: "No se puede comprobar" };
}

function adminCard(admin: AdminState): PermissionCard {
  return {
    id: "adminAccount",
    name: "Cuenta de administrador",
    purpose: "«Descargar e instalar» copia la versión nueva de Claude en Aplicaciones.",
    ...adminStatus(admin),
    who: null,
    panel: null,
    info: {
      rows: [
        {
          label: "Para qué",
          text: "«Descargar e instalar» pone la versión nueva en Aplicaciones, y en macOS esa carpeta solo la cambia un administrador.",
        },
        { label: "Sin ella", text: "La instalación se para con un aviso y Claude sigue en la versión que tenías." },
      ],
      optional: "Opcional: lo demás funciona igual.",
      path: "No hay nada que activar: depende del tipo de tu cuenta.",
    },
    openFailure: null,
  };
}

/**
 * Las tarjetas de la plataforma actual (D-2). macOS: Gestión de apps, Archivos y carpetas (solo con Proyectos) y Cuenta
 * de administrador, en ese orden. Windows y Linux: ninguna (la pantalla enseña su estado vacío).
 */
export function permissionCards(input: PermissionCardsInput): PermissionCardsResult {
  if (input.platform !== "macos") return { cards: [], attention: false };
  const cards = [
    appManagementCard(input.instances),
    ...(input.projectsAvailable ? [filesAndFoldersCard()] : []),
    adminCard(input.admin),
  ];
  return { cards, attention: cards.some((card) => card.tone === "needs") };
}
