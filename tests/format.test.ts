import assert from "node:assert/strict";
import test from "node:test";
import { friendlyError } from "../src/lib/errors.ts";
import { formatBytes, formatCaptureTime } from "../src/lib/format.ts";
import { resolveRuntimePlatform, shortcutModifierLabel } from "../src/lib/platform.ts";
import { isWebviewSupported, UNSUPPORTED_WEBVIEW_MESSAGE, type CssSupports } from "../src/lib/webview-support.ts";
import {
  ICON_RETRY_RUNNING_HINT,
  iconBadgeLabel,
  iconRetryState,
  iconStatusLead,
} from "../src/features/instances/icon-status.ts";
import {
  formatModelName,
  formatSessionTime,
  formatTokenCount,
  sessionContextLevel,
} from "../src/features/sessions/session-format.ts";

const MINUTE = 60_000;
const NOW = 1_800_000_000_000;

test("formatBytes: nulo, cero, KB sin decimales y GB con uno", () => {
  assert.equal(formatBytes(null), "No disponible");
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(512), "512 B");
  assert.equal(formatBytes(1536), "2 KB");
  assert.equal(formatBytes(5 * 1024 * 1024), "5 MB");
  assert.equal(formatBytes(1.5 * 1024 ** 3), "1.5 GB");
  assert.equal(formatBytes(2 * 1024 ** 4), "2.0 TB");
});

test("formatSessionTime: acepta segundos y milisegundos", () => {
  assert.equal(formatSessionTime(null, NOW), "Sin actividad registrada");
  assert.equal(formatSessionTime(NOW / 1000, NOW), "Ahora mismo");
  assert.equal(formatSessionTime(NOW - 30_000, NOW), "Ahora mismo");
  assert.equal(formatSessionTime(NOW + 5 * MINUTE, NOW), "Ahora mismo");
});

test("formatSessionTime: minutos, horas, días y fecha a partir de 30 días", () => {
  assert.equal(formatSessionTime(NOW - 5 * MINUTE, NOW), "Hace 5 min");
  assert.equal(formatSessionTime(NOW - 59 * MINUTE, NOW), "Hace 59 min");
  assert.equal(formatSessionTime(NOW - 60 * MINUTE, NOW), "Hace 1 h");
  assert.equal(formatSessionTime(NOW - 23 * 60 * MINUTE, NOW), "Hace 23 h");
  assert.equal(formatSessionTime(NOW - 24 * 60 * MINUTE, NOW), "Hace 1 d");
  assert.equal(formatSessionTime(NOW - 29 * 24 * 60 * MINUTE, NOW), "Hace 29 d");
  const old = NOW - 30 * 24 * 60 * MINUTE;
  assert.equal(
    formatSessionTime(old, NOW),
    new Intl.DateTimeFormat("es", { day: "numeric", month: "short" }).format(old),
  );
});

test("formatSessionTime: sin `now` usa la hora actual", () => {
  assert.equal(formatSessionTime(Date.now()), "Ahora mismo");
});

test("formatCaptureTime: nulo y patrón HH:MM:SS sin depender de la zona horaria", () => {
  assert.equal(formatCaptureTime(null), "Sin captura reciente");
  assert.equal(formatCaptureTime(undefined), "Sin captura reciente");
  assert.match(formatCaptureTime(NOW), /^Última captura \d{2}:\d{2}:\d{2}$/);
  assert.equal(formatCaptureTime(NOW / 1000), formatCaptureTime(NOW));
});

test("formatTokenCount: unidades, miles y millones", () => {
  assert.equal(formatTokenCount(null), "Sin datos");
  assert.equal(formatTokenCount(undefined), "Sin datos");
  assert.equal(formatTokenCount(999), "999");
  assert.equal(formatTokenCount(1000), "1k");
  assert.equal(formatTokenCount(1500), "1.5k");
  assert.equal(formatTokenCount(100_000), "100k");
  assert.equal(formatTokenCount(1_000_000), "1M");
  assert.equal(formatTokenCount(1_500_000), "1.5M");
});

test("formatModelName: familias con versión y nombres desconocidos", () => {
  assert.equal(formatModelName(null), "Modelo no registrado");
  assert.equal(formatModelName(""), "Modelo no registrado");
  assert.equal(formatModelName("claude-opus-4-8"), "Opus 4.8");
  assert.equal(formatModelName("claude-sonnet-4-5-20250929"), "Sonnet 4.5");
  assert.equal(formatModelName("claude-haiku-4-5"), "Haiku 4.5");
  assert.equal(formatModelName("opus"), "opus");
  assert.equal(formatModelName("modelo-local"), "modelo-local");
});

test("sessionContextLevel: umbrales de 70 y 90", () => {
  assert.equal(sessionContextLevel(null), "unknown");
  assert.equal(sessionContextLevel(undefined), "unknown");
  assert.equal(sessionContextLevel(69), "normal");
  assert.equal(sessionContextLevel(70), "elevated");
  assert.equal(sessionContextLevel(89), "elevated");
  assert.equal(sessionContextLevel(90), "critical");
});

test("friendlyError: Error, texto y valores desconocidos", () => {
  assert.equal(friendlyError(new Error("falló")), "falló");
  assert.equal(friendlyError("texto"), "texto");
  assert.equal(friendlyError({ code: 1 }), "Ocurrió un error inesperado.");
  assert.equal(friendlyError(undefined), "Ocurrió un error inesperado.");
});

test("resolveRuntimePlatform: Rust manda y el navegador solo cubre `unknown`", () => {
  assert.equal(resolveRuntimePlatform("linux", "MacIntel"), "linux");
  assert.equal(resolveRuntimePlatform("windows", "MacIntel"), "windows");
  assert.equal(resolveRuntimePlatform("macos", "Win32"), "macos");
  assert.equal(resolveRuntimePlatform("unknown", "MacIntel"), "macos");
  assert.equal(resolveRuntimePlatform("unknown", "Linux x86_64"), "linux");
  assert.equal(resolveRuntimePlatform("unknown", "Win32"), "windows");
  assert.equal(resolveRuntimePlatform("unknown", ""), "windows");
});

test("shortcutModifierLabel: ⌘ en Mac y Ctrl en el resto", () => {
  assert.equal(shortcutModifierLabel("MacIntel"), "⌘");
  assert.equal(shortcutModifierLabel("Win32"), "Ctrl");
  assert.equal(shortcutModifierLabel("Linux aarch64"), "Ctrl");
});

test("isWebviewSupported: hacen falta las capas en cascada y color-mix (A-16)", () => {
  const LayerRule = class {};
  const queries: Array<[string, string]> = [];
  const css = (colorMix: boolean): CssSupports => ({
    supports: (property, value) => {
      queries.push([property, value]);
      return colorMix && value.startsWith("color-mix(");
    },
  });
  assert.equal(isWebviewSupported(css(true), LayerRule), true, "los dos presentes");
  assert.deepEqual(queries[0], ["color", "color-mix(in srgb, red, red)"]);
  assert.equal(isWebviewSupported(css(true), undefined), false, "sin capas");
  assert.equal(isWebviewSupported(css(false), LayerRule), false, "sin color-mix");
  assert.equal(isWebviewSupported(css(false), undefined), false, "sin ninguno");
  assert.equal(isWebviewSupported(undefined, LayerRule), false, "sin CSS");
  const throwing: CssSupports = { supports: () => { throw new SyntaxError("bad"); } };
  assert.equal(isWebviewSupported(throwing, LayerRule), false, "si CSS.supports lanza");
  assert.match(UNSUPPORTED_WEBVIEW_MESSAGE, /libwebkit2gtk-4\.1-0 a 2\.40/);
  assert.doesNotMatch(UNSUPPORTED_WEBVIEW_MESSAGE, /https?:/, "sin enlaces");
});

const dockIcon = (overrides: Record<string, unknown> = {}) => ({
  path: "icon.png",
  revision: 1,
  systemApplied: false,
  systemMessage: "texto de Rust",
  systemIssue: null,
  ...overrides,
}) as Parameters<typeof iconRetryState>[0]["customIcon"];

const retryInput = (overrides: Record<string, unknown> = {}) => ({
  platform: "macos" as const,
  customIcon: dockIcon(),
  status: "stopped" as const,
  removeIcon: false,
  busy: false,
  ...overrides,
}) as Parameters<typeof iconRetryState>[0];

test("iconRetryState: solo en macOS, con icono sin aplicar y sin «Quitar» marcado", () => {
  assert.equal(iconRetryState(retryInput()).visible, true);
  assert.equal(iconRetryState(retryInput({ platform: "windows" })).visible, false);
  assert.equal(iconRetryState(retryInput({ platform: "linux" })).visible, false);
  assert.equal(iconRetryState(retryInput({ platform: "unknown" })).visible, false);
  assert.equal(iconRetryState(retryInput({ customIcon: null })).visible, false);
  assert.equal(iconRetryState(retryInput({ customIcon: dockIcon({ systemApplied: true }) })).visible, false);
  assert.equal(iconRetryState(retryInput({ removeIcon: true })).visible, false);
});

test("iconRetryState: activo solo con la instancia detenida y sin otra operación", () => {
  assert.deepEqual(iconRetryState(retryInput()), { visible: true, enabled: true, hint: null, appManagement: false });
  const running = iconRetryState(retryInput({ status: "running" }));
  assert.equal(running.visible, true);
  assert.equal(running.enabled, false);
  assert.equal(running.hint, ICON_RETRY_RUNNING_HINT);
  const missing = iconRetryState(retryInput({ status: "missing" }));
  assert.equal(missing.enabled, false);
  assert.equal(missing.hint, null);
  assert.equal(iconRetryState(retryInput({ busy: true })).enabled, false);
});

test("iconRetryState: «Gestión de apps» solo con systemIssue appManagement", () => {
  assert.equal(iconRetryState(retryInput({ customIcon: dockIcon({ systemIssue: "appManagement" }) })).appManagement, true);
  assert.equal(iconRetryState(retryInput({ customIcon: dockIcon({ systemIssue: null }) })).appManagement, false);
  assert.equal(iconRetryState(retryInput({ customIcon: dockIcon({ systemIssue: undefined }) })).appManagement, false);
});

test("textos del icono: macOS habla del Dock y el resto no cambia", () => {
  assert.equal(iconBadgeLabel("macos", true), "en el Dock");
  assert.equal(iconBadgeLabel("macos", false), "solo en la app");
  assert.equal(iconBadgeLabel("windows", true), "sistema aplicado");
  assert.equal(iconBadgeLabel("linux", false), "solo en la app");
  assert.equal(iconStatusLead(true), "Aplicado al Dock. ");
  assert.equal(iconStatusLead(false), "Solo en Code AI Profiles. ");
});
