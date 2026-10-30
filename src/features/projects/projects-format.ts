import type { TokenBreakdown } from "../../types";

/**
 * Los textos de las cifras de Proyectos (HU-0023, A-4 «Cálculos»): tokens, tiempo, fechas y relativos, en español y sin
 * zona horaria propia (las fechas del método son locales). Funciones puras, con el reloj como argumento: las prueba
 * `tests/projects.test.ts`. No importa React ni Tauri; sus únicos imports relativos son `import type`.
 */

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const oneDecimalPlain = new Intl.NumberFormat("es", { minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: false });
const integerPlain = new Intl.NumberFormat("es", { maximumFractionDigits: 0, useGrouping: false });

/** «3.280»: el separador de miles también con cuatro cifras (el `es` del navegador lo omite). La coma decimal ya viene. */
const group = (text: string) => text.replace(/^(\d+)/, (digits) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, "."));
const oneDecimal = { format: (value: number) => group(oneDecimalPlain.format(value)) };
const integer = { format: (value: number) => group(integerPlain.format(value)) };

/** «571,5 M», «173,8 M», «12,3 k» o «845»: un decimal, para tablas y pies. */
export function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${oneDecimal.format(value / 1_000_000)} M`;
  if (value >= 1_000) return `${oneDecimal.format(value / 1_000)} k`;
  return integer.format(value);
}

/** La cifra grande: «572 M» (sin decimales desde 100 M), «2,7 M», «3.280 M». */
export function formatTokensCompact(value: number): string {
  if (value >= 100_000_000) return `${integer.format(value / 1_000_000)} M`;
  return formatTokens(value);
}

/** «98 %» de lo que se leyó de la caché, o `null` si no hay tokens. */
export function cachePercent(tokens: Pick<TokenBreakdown, "cacheRead" | "total">): number | null {
  if (tokens.total <= 0) return null;
  return Math.round((tokens.cacheRead / tokens.total) * 100);
}

/** «98 % caché», o `null` si no hay tokens. */
export function formatCacheShare(tokens: Pick<TokenBreakdown, "cacheRead" | "total">): string | null {
  const percent = cachePercent(tokens);
  return percent === null ? null : `${percent} % caché`;
}

/** Entrada + salida, la cifra secundaria de los tokens. */
export function inputPlusOutput(tokens: Pick<TokenBreakdown, "input" | "output">): number {
  return tokens.input + tokens.output;
}

/** «2,3 h» o «45 min»: el tiempo de una fila de la tabla. */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  return `${oneDecimal.format(minutes / 60)} h`;
}

/** «56 h» o «45 min»: la cifra grande del tiempo en fases. */
export function formatHoursCompact(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  return `${integer.format(minutes / 60)} h`;
}

/** «1 día» o «3 días». `null` si el proyecto no tiene fechas. */
export function formatSpanDays(days: number | null): string | null {
  if (days === null) return null;
  return `${days} ${days === 1 ? "día" : "días"}`;
}

/** «1 repo», «3 repos». */
export function formatRepoCount(count: number): string {
  return `${count} ${count === 1 ? "repo" : "repos"}`;
}

/** «N historia(s)» con la palabra en singular o plural. */
export function formatHistoryCount(count: number): string {
  return `${count} ${count === 1 ? "historia" : "historias"}`;
}

const DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;

/** «27 oct» de `AAAA-MM-DD` o `AAAA-MM-DDTHH:MM…`; el texto que llegue, si no es una fecha. */
export function formatDay(value: string): string {
  const match = DATE_PREFIX.exec(value);
  if (!match) return value;
  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${Number(match[3])} ${month}` : value;
}

const pad = (value: number) => String(value).padStart(2, "0");

/** «02:31», la hora local de una marca de tiempo; con `seconds`, «02:31:07». Vacío si no se puede leer. */
export function formatClock(value: string, seconds = false): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const clock = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return seconds ? `${clock}:${pad(date.getSeconds())}` : clock;
}

/** «17 oct», el día local de una marca de tiempo con zona (`readAt`, `lastReadAt`). Vacío si no se puede leer. */
export function formatLocalDay(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** `AAAA-MM-DD` del día local de `now`, para saber si una fecha es «hoy». */
function localIsoDay(now: Date): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** «27 oct → hoy» o «27 oct → 29 oct»; `null` sin la primera fecha. */
export function formatSinceRange(firstCreated: string | null, lastActivity: string | null, now: Date): string | null {
  if (!firstCreated) return null;
  const from = formatDay(firstCreated);
  if (!lastActivity) return from;
  const last = DATE_PREFIX.exec(lastActivity)?.[0];
  return `${from} → ${last === localIsoDay(now) ? "hoy" : formatDay(lastActivity)}`;
}

/**
 * «hace 25 min», «hace 2 h», «hace 6 días». `value` es una fecha con zona (RFC 3339) o, como `lastActivity`, local y
 * sin zona. Un instante futuro (relojes distintos) cuenta como «hace un momento».
 */
export function formatRelative(value: string, now: Date): string {
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return "";
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60_000);
  if (minutes < 1) return "hace un momento";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 60) return `hace ${days} ${days === 1 ? "día" : "días"}`;
  const months = Math.floor(days / 30);
  return `hace ${months} meses`;
}

const PHASES: Record<string, string> = {
  requisitos: "Requisitos",
  arquitectura: "Arquitectura",
  diseno: "Diseño",
  implementacion: "Implementación",
  verificacion: "Verificación",
  cierre: "Cierre",
};

/** «Implementación» de `implementacion`; cualquier otra fase, con la primera en mayúscula. */
export function formatPhase(value: string): string {
  const known = PHASES[value.toLowerCase()];
  if (known) return known;
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}
