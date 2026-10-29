import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, posix, resolve } from "node:path";
import test from "node:test";

// HU-0016: Tailwind y el catálogo shadcn/ui entran en la app. Estas pruebas vigilan las fronteras que quedan:
// dos entradas de CSS, el showcase fuera de la app, el catálogo sin dominio, sin cookies ni atajos globales del
// sidebar, los listeners de `focus`, `blur` y `visibilitychange` solo donde los ordena DashboardRuntime (R-1) y,
// desde el paso 7, que no vuelvan el CSS propio ni los iconos propios.

const root = resolve(import.meta.dirname, "..");
const src = join(root, "src");

/** Rutas siempre con «/», también en Windows (relative() devuelve «\»). */
const toPosix = (path: string) => path.replace(/\\/g, "/");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

const read = (path: string) => readFileSync(path, "utf8");

/** Archivos de src/ (relativos a src/ y con «/») con su texto. */
const files = walk(src)
  .map((path) => ({ local: toPosix(path.slice(src.length + 1)), source: read(path) }))
  .filter(({ local }) => /\.(tsx?|css)$/.test(local));
const code = files.filter(({ local }) => /\.tsx?$/.test(local));

/** Lo que importan un .ts, .tsx o .css: `from "x"`, `import "x"`, `import("x")`, `@import "x"` y `@import url("x")`. */
function specifiers(source: string): string[] {
  const found: string[] = [];
  for (const match of source.matchAll(/(?:from|import)\s*\(?\s*(?:url\(\s*)?["']([^"']+)["']/g)) found.push(match[1]);
  return found;
}

/** A qué ruta de src/ apunta un import relativo o con `@/`; `null` si es un paquete. */
function target(local: string, specifier: string): string | null {
  if (specifier.startsWith("@/")) return specifier.slice(2);
  if (specifier.startsWith(".")) return posix.normalize(posix.join(posix.dirname(toPosix(local)), specifier));
  return null;
}

// 1. Quién importa Tailwind.
const importsTailwind = (source: string) => specifiers(source).some((s) => /^tailwindcss(\/|$)/.test(s));

// 2 y 3. Los imports de CSS de un .ts/.tsx.
const cssImports = (source: string) => specifiers(source).filter((s) => /\.css(\?.*)?$/.test(s));
const MAIN_CSS = /^(@fontsource\/[a-z0-9-]+\/[a-z0-9-]+\.css|\.\/styles\/index\.css)$/;
const CSS_ENTRIES = ["main.tsx", "showcase/main.tsx"];

// 4. Lo que apunta al showcase desde fuera de él.
function showcaseLeaks(local: string, source: string): string[] {
  if (toPosix(local).startsWith("showcase/")) return [];
  return specifiers(source).filter((s) => {
    const to = target(local, s);
    return to !== null ? /^showcase(\/|\.|$)/.test(to) : /showcase/.test(s);
  });
}

// 5. El catálogo y sus hooks no conocen el dominio ni Tauri.
const DOMAIN_TARGET = /^(features|app)(\/|$)|^lib\/bridge(\.ts)?$|^types(\.ts)?$/;
function catalogLeaks(local: string, source: string): string[] {
  const path = toPosix(local);
  if (!path.startsWith("components/ui/") && !path.startsWith("hooks/")) return [];
  return specifiers(source).filter((s) => {
    const to = target(local, s);
    return to !== null ? DOMAIN_TARGET.test(to) : /^@tauri-apps\//.test(s);
  });
}

// 6. `--muted` es un color de texto en la app (A-3 de HU-0014).
const MUTED = /\(--muted\)/; // cubre var(--muted) y la forma corta de Tailwind 4, bg-(--muted)

// 7. Sin cookies y sin el atajo global del sidebar (D-2).
const COOKIE = /document\s*\.\s*cookie/;
const KEYDOWN_LISTENER = /addEventListener\(\s*["']keydown["']/;

// 8. R-1: los listeners de ventana que ordena DashboardRuntime.
const WINDOW_FOCUS_LISTENER = /addEventListener\(\s*["'](focus|blur|visibilitychange)["']/;
// 10. Los únicos .css de src/ tras retirar el CSS propio (paso 7).
const CSS_FILES = ["showcase/showcase.css", "styles/index.css", "styles/tokens.css", "styles/ui-theme.css"];

// 11. Nadie importa el antiguo components/Icons (relativo o con `@/`).
const importsIcons = (local: string, source: string) =>
  specifiers(source).filter((s) => /^components\/Icons(\.tsx)?$/.test(target(local, s) ?? ""));

// 12. HU-0019 (A-3) y HU-0022 (A-1.2): la escala. Siete --fs-*, ocho --lh-* y cinco --ctl* en px, en :root y en los dos
// tamaños del texto. No hay factor proporcional (--esc): las alturas caen en la retícula de 4 px en los tres tamaños.
const FS_TOKENS = ["micro", "small", "body", "heading", "title", "figure", "dialog"];
const LH_TOKENS = ["micro", "small", "prose", "body", "heading", "title", "figure", "dialog"];
const CTL_TOKENS = ["--ctl", "--ctl-sm", "--ctl-lg", "--ctl-xs", "--ctl-badge"];
/** A qué --fs-* sigue cada --lh-*: el interlineado nunca es menor que el texto. */
const LH_FOLLOWS: Record<string, string> = { prose: "small" };
const TEXT_SIZES = ["compact", "large"];
const MIN_FONT_PX = 11;
const GRID_PX = 4;

/** Las declaraciones `--nombre: valor` del bloque cuyo selector es exactamente `selector` (el último gana). */
function declarations(css: string, selector: string): Map<string, string> {
  const found = new Map<string, string>();
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const block of css.matchAll(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`, "g"))) {
    for (const item of block[1].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) found.set(item[1], item[2].trim());
  }
  return found;
}
const pxValue = (value: string | undefined) => (value && /^\d+(\.\d+)?px$/.test(value) ? parseFloat(value) : NaN);
/** Problemas de la escala en el texto de tokens.css; vacío si está bien. */
function scaleProblems(css: string): string[] {
  const problems: string[] = [];
  const blocks: [string, Map<string, string>][] = [
    ["normal", declarations(css, ":root")],
    ...TEXT_SIZES.map((size) => [size, declarations(css, `:root[data-text-size="${size}"]`)] as [string, Map<string, string>]),
  ];
  const [normal, compact, large] = blocks.map(([, map]) => map);
  const names = [...FS_TOKENS.map((n) => `--fs-${n}`), ...LH_TOKENS.map((n) => `--lh-${n}`), ...CTL_TOKENS];
  for (const [label, map] of blocks) {
    if (map.has("--esc")) problems.push(`${label}: --esc ya no existe`);
    for (const token of names) {
      const px = pxValue(map.get(token));
      if (Number.isNaN(px)) problems.push(`${token} no está en px en ${label}`);
      else if (token.startsWith("--fs-") && px < MIN_FONT_PX) problems.push(`${token} vale ${px}px en ${label} (mínimo ${MIN_FONT_PX})`);
      else if (!token.startsWith("--fs-") && px % GRID_PX !== 0) problems.push(`${token} vale ${px}px en ${label}: no es múltiplo de ${GRID_PX}`);
    }
    for (const name of LH_TOKENS) {
      const lh = pxValue(map.get(`--lh-${name}`));
      const fs = pxValue(map.get(`--fs-${LH_FOLLOWS[name] ?? name}`));
      if (!Number.isNaN(lh) && !Number.isNaN(fs) && lh < fs) problems.push(`--lh-${name} (${lh}px) es menor que su texto (${fs}px) en ${label}`);
    }
  }
  for (const token of names) {
    const [n, c, l] = [normal, compact, large].map((map) => pxValue(map.get(token)));
    if ([n, c, l].some(Number.isNaN)) continue;
    if (token.startsWith("--fs-") && l <= n) problems.push(`${token}: grande (${l}) no supera a normal (${n})`);
    if (l < n) problems.push(`${token}: grande (${l}) es menor que normal (${n})`);
    if (c > n) problems.push(`${token}: compacto (${c}) supera a normal (${n})`);
  }
  // Cada declaración de la escala vive en uno de los tres bloques: ninguna en `.theme-light` ni suelta.
  const inBlocks = blocks.reduce((sum, [, map]) => sum + [...map.keys()].filter((key) => SCALE_NAME.test(key)).length, 0);
  const total = scaleDeclarations(css).length;
  if (total !== inBlocks) problems.push(`tokens.css declara ${total} valores de la escala, pero solo ${inBlocks} están en :root y :root[data-text-size]`);
  return problems;
}
/** Una declaración (no un uso) de la escala: `--fs-x:`, `--lh-x:`, `--esc:` o `--ctl*:`, también como `[--fs-x:…]` o `"--fs-x":`. */
const SCALE_DECLARATION = /--(?:fs-[a-z0-9-]+|lh-[a-z0-9-]+|esc|ctl(?:-[a-z]+)?)["']?\s*:/g;
const SCALE_NAME = /^--(?:fs-|lh-|ctl)/;
const scaleDeclarations = (source: string) => source.match(SCALE_DECLARATION) ?? [];
/** El puente `--text-*` de ui-theme.css: cada tamaño del catálogo sigue a un --fs-* y su interlineado a un --lh-*. */
const TEXT_BRIDGE: [string, string, string][] = [
  ["xs", "small", "small"],
  ["sm", "body", "body"],
  ["base", "heading", "heading"],
  ["lg", "title", "title"],
  ["xl", "figure", "figure"],
  ["2xl", "dialog", "dialog"],
];
const bridgeProblems = (css: string) => {
  const problems: string[] = [];
  for (const [name, fs, lh] of TEXT_BRIDGE) {
    if (!new RegExp(`--text-${name}:\\s*var\\(--fs-${fs}\\)`).test(css)) problems.push(`--text-${name} no sigue a --fs-${fs}`);
    if (!new RegExp(`--text-${name}--line-height:\\s*var\\(--lh-${lh}\\)`).test(css)) problems.push(`--text-${name}--line-height no sigue a --lh-${lh}`);
  }
  if (/--esc/.test(css)) problems.push("el puente menciona --esc");
  return problems;
};
/** Cada `--fs-<x>` o `--lh-<x>` que usa un texto debe existir en la escala. */
const usedFontTokens = (source: string) => [...source.matchAll(/--fs-([a-z0-9-]+)/g)].map((m) => m[1]);
const usedLineTokens = (source: string) => [...source.matchAll(/--lh-([a-z0-9-]+)/g)].map((m) => m[1]);

// 13. Sin tamaños sueltos: `text-[<n>px|rem|em]`. Las tres muestras de AppearanceSettings enseñan cada opción con un
// tamaño fijo (lista cerrada).
// Cubre `text-[9px]`, `text-[length:9px]`, `text-(length:9px)` y `[font-size:9px]`.
const looseSizeRegex = (units: string) => new RegExp(`\\btext-\\[\\s*(?:length:)?\\s*\\d*\\.?\\d+\\s*(?:${units})\\s*\\]|\\btext-\\(\\s*length:\\s*\\d*\\.?\\d+\\s*(?:${units})\\s*\\)|\\[font-size:\\s*\\d*\\.?\\d+\\s*(?:${units})\\s*\\]`, "g");
const LOOSE_TEXT_SIZE = looseSizeRegex("px|rem|em");
// En components/ui/ solo los px: calendar y questionnaire (que la app no usa) miden en rem.
const LOOSE_TEXT_PX = looseSizeRegex("px");
// Una utilidad con nombre propio (`text-micro`): `cn` la toma por un color y la borra (A-3). El tamaño es `text-(length:--fs-x)`.
const OWN_NAME_UTILITY = /\btext-(?:micro|small|body|heading|title|figure|dialog)\b/;
const SAMPLE_FILE = "features/appearance/AppearanceSettings.tsx";
const SAMPLE_SIZES = ["text-[11px]", "text-[15px]", "text-[19px]"];
const looseSizes = (source: string, catalog = false) => source.match(catalog ? LOOSE_TEXT_PX : LOOSE_TEXT_SIZE) ?? [];
// ...y nada de la escala anterior de sesiones.
const OLD_SESSION_SCALE = /--session-|data-session-text|dataset\s*\.\s*sessionText\b/;

// 14. `--quiet` no colorea texto: da 3,4:1 en oscuro y 2,9:1 en claro. Queda para puntos, rayas y separadores.
const QUIET_TEXT = /\btext-\(--quiet\)/;

// 15. HU-0022 (A-1): la escala armónica. Espaciado de 4 px, radios, interlineado, foco y medidas arbitrarias, en los .tsx
// de app/, features/ y components/*.tsx y en los componentes de components/ui que esos archivos importan (directa o
// indirectamente), así que una pieza nueva del catálogo queda cubierta sola.
const SPACING_PREFIX = "(?:p[xytrblse]?|m[xytrblse]?|gap(?:-[xy])?|space-[xy])";
/** Pasos de Tailwind fuera de 0, 1, 2, 3, 4, 6, 8, 12 (0 a 48 px), más los decimales y `px`. */
const OFF_SCALE_STEPS = "0?\\.5|1\\.5|2\\.5|3\\.5|5|7|9|10|11|14|px";
const CLASS_START = "(?<![\\w\\-\\[(/])";
const CLASS_END = "(?![\\w\\-.\\[(])";
const OFF_SCALE_SPACING = new RegExp(`${CLASS_START}-?${SPACING_PREFIX}-(?:${OFF_SCALE_STEPS})${CLASS_END}`, "g");
const ARBITRARY_SPACING = new RegExp(`${CLASS_START}-?(${SPACING_PREFIX})-\\[\\s*-?\\d*\\.?\\d+(?:px|rem|em)\\s*\\]`, "g");
/** Los tres huecos de posición de controles nativos: las únicas medidas de espaciado en px permitidas. */
const SPACING_EXCEPTIONS: Record<string, string[]> = {
  "app/layout/Titlebar.tsx": ["pl-[84px]"],
  "app/layout/PageHeader.tsx": ["pr-[160px]", "pl-[68px]"],
};
const RADIUS_PX = [4, 8, 12, 16, 20, 24];
const RADIUS_CLASS = "rounded(?:-(?:t|b|l|r|s|e|tl|tr|bl|br|ss|se|ee|es))?";
const BAD_RADIUS_NAME = new RegExp(`${CLASS_START}${RADIUS_CLASS}-4xl${CLASS_END}`, "g");
const ARBITRARY_RADIUS = new RegExp(`${CLASS_START}${RADIUS_CLASS}-\\[([^\\]]*)\\]`, "g");
const BAD_LEADING = new RegExp(`${CLASS_START}leading-(?:none|tight|snug|normal|relaxed|loose|3|9|10|\\[[^\\]]*\\])${CLASS_END}`, "g");
const TEXT_LINE_NAME = new RegExp(`${CLASS_START}text-(?:xs|sm|base|lg|xl|2xl|3xl)/(?:none|tight|snug|normal|relaxed|loose|\\d+|\\[[^\\]]*\\])${CLASS_END}`, "g");
const TEXT_WITHOUT_LINE = /text-\(length:--fs-[a-z0-9-]+\)(?!\/\(--lh-[a-z0-9-]+\))/g;
const BAD_FOCUS_RING = /ring-ring\/50|\b(?:group-)?(?:focus|focus-visible|focus-within)[^\s"'`]*:ring-(?:3|\[3px\])\b|\bring-\[3px\]/g;
const ARBITRARY_BOX = new RegExp(`${CLASS_START}(?:min-|max-)?(?:h|w|size)-\\[\\s*(-?\\d*\\.?\\d+)px\\s*\\]`, "g");

/** Lo que de una fuente .tsx rompe la escala armónica; vacío si está bien. `local` decide las excepciones. */
function harmonyProblems(local: string, source: string): string[] {
  const path = toPosix(local);
  const problems: string[] = [];
  const allowed = SPACING_EXCEPTIONS[path] ?? [];
  for (const m of source.matchAll(OFF_SCALE_SPACING)) problems.push(`espaciado fuera de la escala: ${m[0]}`);
  for (const m of source.matchAll(ARBITRARY_SPACING)) if (!allowed.some((a) => m[0].endsWith(a))) problems.push(`espaciado arbitrario: ${m[0]}`);
  for (const m of source.matchAll(BAD_RADIUS_NAME)) problems.push(`radio fuera de la escala: ${m[0]}`);
  for (const m of source.matchAll(ARBITRARY_RADIUS)) {
    const inner = m[1].trim();
    const px = /^(\d+)px$/.exec(inner);
    // Solo se prohíben los px fuera de la escala y los cálculos (calc, min, max, clamp); `inherit` y `var(--x)` valen.
    if (px ? !RADIUS_PX.includes(parseInt(px[1], 10)) : /^(?:calc|min|max|clamp)\(/.test(inner) || /^-?[\d.]+(?:rem|em)?$/.test(inner)) problems.push(`radio arbitrario: ${m[0]}`);
  }
  for (const m of source.matchAll(BAD_LEADING)) problems.push(`interlineado con nombre: ${m[0]}`);
  for (const m of source.matchAll(TEXT_LINE_NAME)) problems.push(`interlineado con nombre: ${m[0]}`);
  for (const m of source.matchAll(TEXT_WITHOUT_LINE)) problems.push(`tamaño sin interlineado: ${m[0]}`);
  for (const m of source.matchAll(BAD_FOCUS_RING)) problems.push(`foco fuera de A-1.4: ${m[0]}`);
  for (const m of source.matchAll(ARBITRARY_BOX)) if (parseFloat(m[1]) % GRID_PX !== 0) problems.push(`medida que no es múltiplo de ${GRID_PX}: ${m[0]}`);
  return problems;
}

/** Los archivos que revisa la prueba 15: la app y los componentes del catálogo que importa, calculados desde los imports. */
function harmonyFiles(all: { local: string; source: string }[]): { local: string; source: string }[] {
  const byPath = new Map(all.map((file) => [toPosix(file.local), file]));
  const isApp = (path: string) => /\.tsx$/.test(path) && (path.startsWith("app/") || path.startsWith("features/") || /^components\/[^/]+\.tsx$/.test(path));
  const picked = new Map<string, { local: string; source: string }>();
  const queue: { local: string; source: string }[] = all.filter(({ local }) => isApp(toPosix(local)));
  for (const file of queue) picked.set(toPosix(file.local), file);
  while (queue.length) {
    const file = queue.pop()!;
    for (const specifier of specifiers(file.source)) {
      const to = target(file.local, specifier);
      if (!to || !/^components\/ui\/[^/]+$/.test(to)) continue;
      const found = byPath.get(`${to}.tsx`) ?? byPath.get(to);
      if (found && !picked.has(toPosix(found.local))) {
        picked.set(toPosix(found.local), found);
        queue.push(found);
      }
    }
  }
  return [...picked.values()].sort((a, b) => (toPosix(a.local) < toPosix(b.local) ? -1 : 1));
}

// 16. HU-0022 (A-1.5): contraste de los pares sólidos, calculado con los hex de tokens.css y ui-theme.css.
type ThemeName = "dark" | "light";
/** Los valores de un tema: los bloques `:root` / `.theme-dark` y, en claro, `.theme-light` después. */
function themeValues(css: string, theme: ThemeName): Map<string, string> {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/@[a-z-]+[^{;]*;/g, "");
  const values = new Map<string, string>();
  const wanted = theme === "dark" ? [":root", ".theme-dark"] : [":root", ".theme-dark", ".theme-light"];
  for (const block of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = block[1].split(",").map((selector) => selector.trim());
    if (!selectors.some((selector) => wanted.includes(selector))) continue;
    for (const item of block[2].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) values.set(item[1], item[2].trim());
  }
  return values;
}
/** Resuelve `var(--x)` dentro del mismo tema hasta dar con un `#rrggbb`; `null` si no es un sólido. */
function resolveColor(values: Map<string, string>, token: string, depth = 0): string | null {
  const value = values.get(token);
  if (!value || depth > 8) return null;
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex) return hex[1].toLowerCase();
  const ref = /^var\((--[a-z0-9-]+)\)$/.exec(value);
  return ref ? resolveColor(values, ref[1], depth + 1) : null;
}
function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}
function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
/** Pares sólidos y su mínimo: 4,5:1 el texto y 3:1 el anillo de foco. */
const CONTRAST_PAIRS: [fg: string, bg: string, min: number][] = [
  ["--text", "--surface", 4.5],
  ["--muted", "--surface", 4.5],
  ["--ui-on-primary", "--primary-bright", 4.5],
  ["--ui-primary-text", "--surface", 4.5],
  ["--ui-success", "--surface", 4.5],
  ["--ui-warning", "--surface", 4.5],
  ["--ring", "--surface", 3],
];
function contrastProblems(css: string): string[] {
  const problems: string[] = [];
  for (const theme of ["dark", "light"] as const) {
    const values = themeValues(css, theme);
    for (const [fg, bg, min] of CONTRAST_PAIRS) {
      const [a, b] = [resolveColor(values, fg), resolveColor(values, bg)];
      if (!a || !b) problems.push(`${theme}: ${fg} o ${bg} no es un color sólido`);
      else if (contrast(a, b) < min) problems.push(`${theme}: ${fg} sobre ${bg} da ${contrast(a, b).toFixed(2)}:1 (mínimo ${min}:1)`);
    }
  }
  return problems;
}

// 17. HU-0023 (A-4): Proyectos es «solo resumen». `features/projects` no importa instancias, sesiones, escaneo ni
// actualizaciones; quien la usa entra por su `index.ts` y solo `app/` y `features/permissions` la usan; y el selector de
// carpetas es solo de Rust (nadie importa `@tauri-apps/plugin-dialog`, que además no está en package.json).
const PROJECTS_FORBIDDEN = /^features\/(instances|sessions|scan|updates)(\/|$)/;
const PROJECTS_USERS = /^(app\/|features\/permissions\/|features\/projects\/)/;
function projectsLeaks(local: string, source: string): string[] {
  const path = toPosix(local);
  const leaks: string[] = [];
  for (const s of specifiers(source)) {
    const to = target(local, s);
    if (/^@tauri-apps\/plugin-dialog(\/|$)/.test(s)) leaks.push(`${s}: el selector de carpetas es de Rust`);
    if (to === null) continue;
    if (path.startsWith("features/projects/") && PROJECTS_FORBIDDEN.test(to)) leaks.push(`${s}: Proyectos no importa ${to.split("/")[1]}`);
    if (!path.startsWith("features/projects/") && /^features\/projects(\/|$)/.test(to)) {
      if (to !== "features/projects") leaks.push(`${s}: se entra por features/projects (su index.ts)`);
      if (!PROJECTS_USERS.test(path)) leaks.push(`${s}: solo app/ y features/permissions usan Proyectos`);
    }
  }
  return leaks;
}

const FOCUS_OWNERS = [
  "features/instances/useLiveUsage.ts",
  "features/scan/useBackgroundRefresh.ts",
  "features/updates/useSourceUpdateRuntime.ts",
];

test("se revisaron los archivos de cada carpeta", () => {
  for (const prefix of ["app/", "features/", "lib/", "components/", "components/ui/", "hooks/", "styles/", "showcase/"]) {
    assert.ok(files.some(({ local }) => local.startsWith(prefix)), `no se revisó ningún archivo de src/${prefix}`);
  }
  for (const local of ["main.tsx", "showcase/main.tsx", "styles/index.css", "showcase/showcase.css"]) {
    assert.ok(files.some((file) => file.local === local), `no se revisó src/${local}`);
  }
});

test("1 · solo styles/index.css y showcase/showcase.css importan tailwindcss", () => {
  const importers = files.filter(({ source }) => importsTailwind(source)).map(({ local }) => local).sort();
  assert.deepEqual(importers, ["showcase/showcase.css", "styles/index.css"]);
});

test("2 · src/main.tsx solo importa CSS de las fuentes y ./styles/index.css", () => {
  const imports = cssImports(read(join(src, "main.tsx")));
  assert.ok(imports.includes("./styles/index.css"), "src/main.tsx no importa ./styles/index.css");
  const other = imports.filter((s) => !MAIN_CSS.test(s));
  assert.deepEqual(other, [], `src/main.tsx importa ${other.join(", ")}`);
});

test("3 · ningún otro .ts/.tsx importa CSS (salvo la entrada del showcase)", () => {
  for (const { local, source } of code) {
    if (CSS_ENTRIES.includes(local)) continue;
    assert.deepEqual(cssImports(source), [], `src/${local} importa CSS`);
  }
});

test("4 · nada fuera de src/showcase/ importa el showcase; index.html y styles/index.css no lo mencionan", () => {
  for (const { local, source } of files) {
    const leaks = showcaseLeaks(local, source);
    assert.deepEqual(leaks, [], `src/${local} importa ${leaks.join(", ")}`);
  }
  assert.ok(!read(join(root, "index.html")).includes("showcase"), "index.html menciona el showcase");
  assert.ok(!read(join(src, "styles", "index.css")).includes("showcase"), "src/styles/index.css menciona el showcase");
});

test("5 · components/ui y hooks no importan features/, app/, lib/bridge, types ni @tauri-apps", () => {
  const catalog = files.filter(({ local }) => local.startsWith("components/ui/") || local.startsWith("hooks/"));
  assert.ok(catalog.length > 0, "no se encontró ningún archivo del catálogo que revisar");
  for (const { local, source } of catalog) {
    const leaks = catalogLeaks(local, source);
    assert.deepEqual(leaks, [], `src/${local} importa ${leaks.join(", ")}`);
  }
});

test("6 · components/ui y hooks no usan var(--muted) ni (--muted)", () => {
  for (const { local, source } of files) {
    if (!local.startsWith("components/ui/") && !local.startsWith("hooks/")) continue;
    assert.ok(!MUTED.test(source), `src/${local} usa (--muted): usa --surface-soft`);
  }
});

test("7 · nadie usa document.cookie y el sidebar no registra keydown (D-2)", () => {
  for (const { local, source } of files) {
    assert.ok(!COOKIE.test(source), `src/${local} usa document.cookie`);
  }
  assert.ok(!KEYDOWN_LISTENER.test(read(join(src, "components", "ui", "sidebar.tsx"))), "sidebar.tsx registra keydown");
});

test("8 · R-1: focus, blur y visibilitychange solo en los tres hooks que ordena DashboardRuntime", () => {
  const owners = code.filter(({ source }) => WINDOW_FOCUS_LISTENER.test(source)).map(({ local }) => local).sort();
  for (const local of owners) {
    assert.ok(FOCUS_OWNERS.includes(local), `src/${local} registra focus, blur o visibilitychange (R-1)`);
  }
  // Si un dueño deja de registrarlos, o el detector deja de verlos, la lista de arriba ya no protege nada.
  assert.deepEqual(owners, FOCUS_OWNERS);
});

test("9 · canario: cada detector marca fugas sintéticas, también con rutas de Windows", () => {
  // 1
  assert.ok(importsTailwind('@import "tailwindcss" source(none);'));
  assert.ok(importsTailwind('@import url("tailwindcss/utilities.css");'));
  assert.ok(!importsTailwind('@import "tw-animate-css";'));

  // 2 y 3
  assert.deepEqual(cssImports('import "./x.css";\nimport { a } from "./a";'), ["./x.css"]);
  assert.ok(MAIN_CSS.test("@fontsource/inter/latin-400.css"));
  assert.ok(MAIN_CSS.test("./styles/index.css"));
  assert.ok(!MAIN_CSS.test("./styles/ui-theme.css"));
  assert.ok(!MAIN_CSS.test("./app/layout/shell.css"));

  // 4
  for (const [local, source] of [
    ["app\\layout\\x.tsx", 'import { Showcase } from "../../showcase/Showcase";'],
    ["lib/x.ts", 'const m = await import("@/showcase/main");'],
    ["styles\\x.css", '@import "../showcase/showcase.css";'],
    ["main.tsx", 'import "./showcase/main";'],
  ]) {
    assert.ok(showcaseLeaks(local, source).length > 0, `no marcó ${local}: ${source}`);
  }
  assert.deepEqual(showcaseLeaks("showcase\\main.tsx", 'import "./showcase.css";'), []);
  assert.deepEqual(showcaseLeaks("app/x.tsx", 'import { a } from "../lib/format";'), []);

  // 5
  for (const [local, source] of [
    ["components\\ui\\x.tsx", 'import { useDashboard } from "../../features/dashboard";'],
    ["components/ui/x.tsx", 'import { router } from "@/app/router";'],
    ["hooks\\x.ts", 'import { bridge } from "../lib/bridge";'],
    ["hooks/x.ts", 'import type { DashboardState } from "@/types";'],
    ["components\\ui\\x.tsx", 'import { invoke } from "@tauri-apps/api/core";'],
  ]) {
    assert.ok(catalogLeaks(local, source).length > 0, `no marcó ${local}: ${source}`);
  }
  assert.deepEqual(catalogLeaks("components\\ui\\x.tsx", 'import { cn } from "cn";\nimport { Button } from "@/components/ui/button";'), []);
  assert.deepEqual(catalogLeaks("hooks/x.ts", 'import { a } from "../lib/utils";'), []);
  assert.deepEqual(catalogLeaks("features\\x.ts", 'import { bridge } from "../lib/bridge";'), [], "fuera del catálogo no aplica");

  // 6
  for (const sample of ["bg-(--muted)", "color-mix(in oklch, var(--muted), red)"]) assert.ok(MUTED.test(sample), sample);
  assert.ok(!MUTED.test("var(--surface-soft)"));

  // 7
  assert.ok(COOKIE.test("document.cookie = `a=b`"));
  assert.ok(COOKIE.test("const c = document .cookie;"));
  assert.ok(KEYDOWN_LISTENER.test('window.addEventListener("keydown", handleKeyDown)'));
  assert.ok(KEYDOWN_LISTENER.test("window.addEventListener( 'keydown', h)"));

  // 8
  for (const sample of [
    'window.addEventListener("focus", f)',
    "window.addEventListener('blur', f)",
    'document.addEventListener( "visibilitychange", f)',
  ]) {
    assert.ok(WINDOW_FOCUS_LISTENER.test(sample), sample);
  }
  assert.ok(!WINDOW_FOCUS_LISTENER.test('window.addEventListener("focusin", f)'));
  assert.ok(!WINDOW_FOCUS_LISTENER.test('media.addEventListener("change", f)'));

  // 11
  assert.ok(importsIcons("features\\x\\y.tsx", 'import { XIcon } from "../../components/Icons";').length > 0);
  assert.ok(importsIcons("components/x.tsx", 'import { A } from "./Icons";').length > 0);
  assert.ok(importsIcons("app/x.tsx", 'import { A } from "@/components/Icons";').length > 0);
  assert.deepEqual(importsIcons("app/x.tsx", 'import { XIcon } from "lucide-react";'), []);

  // 12
  const px = (n: number) => `${n}px`;
  const block = (selector: string, fs: number, lh: number, ctl: number) =>
    [`${selector} {`, ...FS_TOKENS.map((n) => `  --fs-${n}: ${px(fs)};`), ...LH_TOKENS.map((n) => `  --lh-${n}: ${px(lh)};`), ...CTL_TOKENS.map((n) => `  ${n}: ${px(ctl)};`), "}"].join("\n");
  const goodScale = [block(":root", 12, 16, 32), block(':root[data-text-size="compact"]', 11, 16, 28), block(':root[data-text-size="large"]', 14, 16, 36)].join("\n");
  assert.deepEqual(scaleProblems(goodScale), [], "la escala de muestra es válida");
  assert.ok(scaleProblems(goodScale.replace("--fs-body: 12px;", "--fs-body: 15px;")).some((p) => p.includes("--fs-body")), "no marcó un grande que no supera a normal");
  assert.ok(scaleProblems(goodScale.replace("--fs-micro: 12px;", "--fs-micro: 10px;")).some((p) => p.includes("10px")), "no marcó un valor bajo 11 px");
  assert.ok(scaleProblems(goodScale.replace(/ {2}--fs-title: 12px;\n/, "")).some((p) => p.includes("--fs-title")), "no marcó un token que falta");
  assert.ok(scaleProblems(goodScale.replace("--fs-small: 12px;", "--fs-small: 0.7rem;")).some((p) => p.includes("--fs-small")), "no marcó una unidad que no es px");
  assert.ok(scaleProblems(goodScale.replace(/ {2}--lh-body: 16px;\n/, "")).some((p) => p.includes("--lh-body")), "no marcó un --lh que falta");
  assert.ok(scaleProblems(goodScale.replace("--lh-body: 16px;", "--lh-body: 18px;")).some((p) => p.includes("múltiplo")), "no marcó un --lh fuera de la retícula");
  assert.ok(scaleProblems(goodScale.replace("--ctl-sm: 32px;", "--ctl-sm: 33.5px;")).some((p) => p.includes("--ctl-sm")), "no marcó un --ctl fuera de la retícula");
  assert.ok(scaleProblems(goodScale.replace("--lh-small: 16px;", "--lh-small: 8px;")).some((p) => p.includes("menor que su texto")), "no marcó un --lh menor que su --fs");
  assert.ok(scaleProblems(goodScale.replace("--ctl: 36px;", "--ctl: 28px;")).some((p) => p.includes("--ctl: grande")), "no marcó un --ctl de Grande menor que el normal");
  assert.ok(scaleProblems(goodScale.replace("--ctl: 28px;", "--ctl: 36px;")).some((p) => p.includes("compacto")), "no marcó un --ctl de Compacto mayor que el normal");
  assert.ok(scaleProblems(goodScale + "\n:root {\n  --esc: 1;\n}").some((p) => p.includes("--esc") || p.includes("tokens.css declara")), "no marcó --esc");
  assert.deepEqual(usedFontTokens("text-(length:--fs-micro) text-(length:--fs-tiny)"), ["micro", "tiny"]);
  assert.deepEqual(usedLineTokens("text-(length:--fs-micro)/(--lh-micro) leading-(--lh-tiny)"), ["micro", "tiny"]);
  assert.ok(scaleProblems(goodScale + "\n.theme-light {\n  --fs-body: 14px;\n}").some((p) => p.includes("tokens.css declara")), "no marcó un --fs-* fuera de los tres bloques");
  assert.ok(scaleProblems(goodScale + "\n.theme-light {\n  --lh-body: 20px;\n}").some((p) => p.includes("tokens.css declara")), "no marcó un --lh-* fuera de los tres bloques");
  const goodBridge = TEXT_BRIDGE.map(([name, fs, lh]) => `--text-${name}: var(--fs-${fs});\n--text-${name}--line-height: var(--lh-${lh});`).join("\n");
  assert.deepEqual(bridgeProblems(goodBridge), []);
  for (const [name] of TEXT_BRIDGE) {
    assert.ok(bridgeProblems(goodBridge.replace(new RegExp(`--text-${name}: var\\(--fs-[a-z]+\\)`), `--text-${name}: calc(16px * var(--esc))`)).some((p) => p.includes(`--text-${name} `)), `no marcó --text-${name} fijo`);
    assert.ok(bridgeProblems(goodBridge.replace(new RegExp(`--text-${name}--line-height: var\\(--lh-[a-z]+\\)`), `--text-${name}--line-height: 1.5`)).some((p) => p.includes(`--text-${name}--line-height`)), `no marcó el interlineado de --text-${name}`);
  }
  assert.ok(bridgeProblems(goodBridge.replace("var(--fs-body)", "14px")).some((p) => p.includes("--text-sm")), "no marcó --text-sm suelto");
  assert.ok(bridgeProblems("").length === 12, "no marcó un puente vacío");
  for (const sample of ["--fs-body: 20px;", "[--fs-micro:9px]", '"--fs-title": "10px"', "--esc: 2;", "--ctl-sm: 20px;", "--ctl: 10px;", "--lh-body: 18px;", "[--lh-small:10px]"]) {
    assert.equal(scaleDeclarations(sample).length, 1, `no marcó la redefinición ${sample}`);
  }
  assert.deepEqual(scaleDeclarations("text-(length:--fs-body)/(--lh-body) var(--esc) h-(--ctl-sm) calc(1px * var(--esc))"), [], "un uso no es una declaración");

  // 15
  const bad = (sample: string, local = "features/x/Y.tsx") => harmonyProblems(local, `className="${sample}"`);
  for (const sample of ["p-5", "px-2.5", "py-1.5", "gap-0.5", "mt-px", "-mx-3.5", "hover:p-7", "data-[state=open]:gap-9", "[&>svg]:px-10", "space-y-11", "ms-14", "gap-x-1.5", "p-[10px]", "mt-[0.5rem]", "pl-[84px]", "max-[1070px]:p-5"]) {
    assert.ok(bad(sample).length > 0, `no marcó el espaciado ${sample}`);
  }
  for (const sample of ["p-0", "px-3", "py-1", "gap-2", "mt-4", "-mx-1", "p-6", "gap-8", "pt-12", "m-auto", "p-(--x)", "p-[var(--x)]", "px-0 py-0", "ring-1", "border-px", "size-5", "h-7", "top-1.5", "text-(length:--fs-small)/(--lh-small)"]) {
    assert.deepEqual(bad(sample), [], `marcó un espaciado válido: ${sample}`);
  }
  assert.deepEqual(bad("pl-[84px]", "app/layout/Titlebar.tsx"), [], "la excepción de Titlebar");
  assert.deepEqual(bad("pr-[160px] pl-[68px]", "app\\layout\\PageHeader.tsx"), [], "las excepciones de PageHeader, con ruta de Windows");
  assert.ok(bad("pl-[84px]", "app/layout/PageHeader.tsx").length > 0, "la excepción de Titlebar no vale en otro archivo");
  assert.ok(bad("pl-[90px]", "app/layout/Titlebar.tsx").length > 0, "otra medida en Titlebar");
  for (const sample of ["rounded-4xl", "rounded-t-4xl", "rounded-[calc(var(--radius)-3px)]", "rounded-[min(var(--radius-md),10px)]", "rounded-[9px]", "rounded-[2px]", "rounded-l-[10px]", "hover:rounded-[14px]"]) {
    assert.ok(bad(sample).length > 0, `no marcó el radio ${sample}`);
  }
  for (const sample of ["rounded-xs", "rounded-sm", "rounded-md", "rounded-lg", "rounded-full", "rounded-none", "rounded-[8px]", "rounded-[24px]", "rounded-t-xl"]) {
    assert.deepEqual(bad(sample), [], `marcó un radio válido: ${sample}`);
  }
  for (const sample of ["leading-none", "leading-tight", "leading-snug", "leading-normal", "leading-relaxed", "leading-loose", "leading-[1.3]", "leading-3", "leading-10", "text-sm/relaxed", "text-xs/5"]) {
    assert.ok(bad(sample).length > 0, `no marcó el interlineado ${sample}`);
  }
  for (const sample of ["leading-4", "leading-8", "leading-(--lh-body)", "text-sm", "text-(length:--fs-body)/(--lh-body)"]) {
    assert.deepEqual(bad(sample), [], `marcó un interlineado válido: ${sample}`);
  }
  assert.ok(bad("text-(length:--fs-small)").length > 0, "no marcó un tamaño sin interlineado");
  assert.ok(bad("text-(length:--fs-small) leading-(--lh-small)").length > 0, "el / es obligatorio");
  for (const sample of ["focus-visible:ring-ring/50", "focus-visible:ring-3", "focus-visible:ring-[3px]", "ring-ring/50", "group-focus-visible/x:ring-3", "ring-[3px]"]) {
    assert.ok(bad(sample).length > 0, `no marcó el foco ${sample}`);
  }
  for (const sample of ["focus-visible:ring-2 focus-visible:ring-ring", "aria-invalid:ring-3 aria-invalid:ring-destructive/20", "ring-1 ring-inset ring-border"]) {
    assert.deepEqual(bad(sample), [], `marcó un foco válido: ${sample}`);
  }
  for (const sample of ["h-[18px]", "w-[13px]", "size-[30px]", "min-h-[22px]", "max-w-[1071px]", "data-[x]:h-[6px] w-[7px]"]) {
    assert.ok(bad(sample).length > 0, `no marcó la medida ${sample}`);
  }
  for (const sample of ["h-[20px]", "w-[896px]", "size-[24px]", "min-h-[48px]", "max-[1070px]:p-4", "h-[calc(100%-1px)]", "h-(--ctl)"]) {
    assert.deepEqual(bad(sample), [], `marcó una medida válida: ${sample}`);
  }
  const sampleFiles = [
    { local: "app\\layout\\X.tsx", source: 'import { Button } from "../../components/ui/button";' },
    { local: "components\\ui\\button.tsx", source: 'import { Spinner } from "@/components/ui/spinner";' },
    { local: "components\\ui\\spinner.tsx", source: "" },
    { local: "components\\ui\\calendar.tsx", source: "" },
    { local: "components\\Y.tsx", source: "" },
    { local: "components\\deep\\Z.tsx", source: "" },
    { local: "lib\\w.ts", source: "" },
    { local: "app\\style.css", source: "" },
  ];
  assert.deepEqual(harmonyFiles(sampleFiles).map(({ local }) => local), ["app\\layout\\X.tsx", "components\\Y.tsx", "components\\ui\\button.tsx", "components\\ui\\spinner.tsx"], "los archivos de la prueba 15, con rutas de Windows");

  // 16
  const css = [":root,", ".theme-dark {", "  --surface: #151615;", "  --text: #e8e4e2;", "  --muted: #aaa19e;", "  --primary-bright: #ff5f35;", "  --ui-on-primary: #151615;", "  --ui-primary-text: #ffb19b;", "  --ui-success: #84ab8c;", "  --ui-warning: #cf9a5e;", "  --primary: #ff8d6c;", "  --ring: var(--ui-primary-text);", "}", ".theme-light {", "  --surface: #f3efeb;", "  --text: #2e2926;", "  --muted: #746b67;", "  --ui-primary-text: #9c5947;", "  --ui-success: #3b7550;", "  --ui-warning: #94601f;", "}"].join("\n");
  assert.deepEqual(contrastProblems(css), [], "los colores de muestra pasan");
  assert.ok(contrastProblems(css.replace("--ui-on-primary: #151615;", "--ui-on-primary: #ffffff;")).some((p) => p.includes("--ui-on-primary")), "no marcó el texto blanco sobre el naranja");
  assert.ok(contrastProblems(css.replace("--muted: #746b67;", "--muted: #9b928d;")).some((p) => p.startsWith("light: --muted")), "no marcó un --muted bajo en claro");
  assert.ok(contrastProblems(css.replace("--ui-warning: #cf9a5e;", "--ui-warning: #7a5230;")).some((p) => p.startsWith("dark: --ui-warning")), "no marcó un --ui-warning bajo en oscuro");
  assert.ok(contrastProblems(css.replace("--ui-primary-text: #ffb19b;", "--ui-primary-text: #3a2a24;")).some((p) => p.includes("--ring")), "no marcó un anillo de foco bajo");
  assert.ok(contrastProblems(css.replace("--ui-success: #84ab8c;", "--ui-success: var(--missing);")).some((p) => p.includes("no es un color sólido")), "no marcó un color que no resuelve");
  assert.ok(Math.abs(contrast("ffffff", "000000") - 21) < 0.01);
  assert.ok(contrast("151615", "ff5f35") > 5.9 && contrast("151615", "ff5f35") < 6.1, "texto oscuro sobre el naranja: 6,0:1");
  assert.ok(contrast("ffffff", "ff5f35") < 3.1, "el blanco sobre el naranja era 3,03:1");

  // 13
  assert.deepEqual(looseSizes('className="text-[11px] text-[0.7rem] text-[.8em] text-[ 9px ]"').length, 4);
  assert.deepEqual(looseSizes('className="text-[0.8rem] text-[13px]"', true), ["text-[13px]"], "el catálogo solo marca los px");
  for (const sample of ["text-[length:9px]", "text-(length:9px)", "text-(length:0.7rem)", "[font-size:9px]", "[font-size:0.7rem]", "md:[font-size: 11px]", "data-[x=y]:text-[9px]"]) {
    assert.equal(looseSizes(sample).length, 1, `no marcó ${sample}`);
  }
  assert.equal(looseSizes("text-[length:var(--x)] [font-size:var(--x)] text-(length:--fs-micro) [font-size:inherit]").length, 0, "marcó un tamaño que viene de una variable");
  for (const name of ["micro", "small", "body", "heading", "title", "figure", "dialog"]) {
    assert.ok(OWN_NAME_UTILITY.test(`className="text-${name} font-mono"`), `no marcó text-${name}`);
    assert.ok(OWN_NAME_UTILITY.test(`className="hover:text-${name}"`), `no marcó hover:text-${name}`);
  }
  assert.ok(!OWN_NAME_UTILITY.test('className="text-(length:--fs-micro) text-muted-foreground data-text-size text-xs"'), "marcó un uso legítimo");
  assert.deepEqual(looseSizes('className="text-xs text-(length:--fs-micro) text-[var(--x)] text-[color:red]"'), []);
  for (const sample of ["--session-title-size: 12px;", 'root.dataset.sessionText = "a"', 'root[data-session-text="large"]', "text-(length:--session-meta-size)"]) {
    assert.ok(OLD_SESSION_SCALE.test(sample), sample);
  }
  assert.ok(!OLD_SESSION_SCALE.test("sessionTextSize: comfortable"), "el campo guardado sessionTextSize se queda");

  // 14
  assert.ok(QUIET_TEXT.test('className="text-(--quiet) font-mono"'));
  assert.ok(QUIET_TEXT.test('className="hover:text-(--quiet)"'));
  assert.ok(!QUIET_TEXT.test('className="bg-(--quiet) h-px"'));
  assert.ok(!QUIET_TEXT.test('className="text-muted-foreground"'));

  // Rutas de Windows
  assert.equal(toPosix("features\\scan\\useBackgroundRefresh.ts"), FOCUS_OWNERS[1]);
  assert.equal(target("features\\scan\\x.ts", "../../lib/bridge"), "lib/bridge");
  assert.equal(target("components\\ui\\x.tsx", "@/hooks/use-mobile"), "hooks/use-mobile");
  assert.equal(target("x.ts", "react"), null);
});

test("17 · Proyectos es solo resumen: sin instancias, sesiones, escaneo ni actualizaciones, y sin selector de JS", () => {
  assert.ok(files.some(({ local }) => local.startsWith("features/projects/")), "no se revisó features/projects");
  for (const { local, source } of code) {
    const leaks = projectsLeaks(local, source);
    assert.deepEqual(leaks, [], `src/${local}: ${leaks.join("; ")}`);
  }
  assert.ok(!/plugin-dialog/.test(read(join(root, "package.json"))), "package.json declara @tauri-apps/plugin-dialog: el selector es de Rust");
  // Canario: cada detector marca lo que debe, también con rutas de Windows.
  assert.equal(projectsLeaks("features\\projects\\X.tsx", 'import { a } from "../instances";').length, 1);
  assert.equal(projectsLeaks("features/projects/X.tsx", 'import { a } from "../sessions/session-types";').length, 1);
  assert.equal(projectsLeaks("features/projects/X.tsx", 'import { a } from "../scan";').length, 1);
  assert.equal(projectsLeaks("features/projects/X.tsx", 'import { a } from "../updates";').length, 1);
  assert.equal(projectsLeaks("features/projects/X.tsx", 'import { a } from "../dashboard";').length, 0, "dashboard sí se puede (la plataforma)");
  assert.equal(projectsLeaks("app/x.tsx", 'import { dialog } from "@tauri-apps/plugin-dialog";').length, 1);
  assert.equal(projectsLeaks("app/layout/X.tsx", 'import { a } from "../../features/projects/projects-selectors";').length, 1, "se entra por el index");
  assert.equal(projectsLeaks("app/layout/X.tsx", 'import { a } from "../../features/projects";').length, 0);
  assert.equal(projectsLeaks("features/permissions/X.tsx", 'import { a } from "../projects";').length, 0);
  assert.equal(projectsLeaks("features/instances/X.tsx", 'import { a } from "../projects";').length, 1, "una feature de instancias no usa Proyectos");
});

test("10 · los .css de src/ son solo index.css, tokens.css, ui-theme.css y showcase.css", () => {
  const css = walk(src).map((path) => toPosix(path.slice(src.length + 1))).filter((local) => local.endsWith(".css")).sort();
  assert.deepEqual(css, CSS_FILES, "el CSS propio se retiró en HU-0016: una pieza nueva usa el catálogo y las utilidades");
});

test("11 · components/Icons.tsx no existe: los iconos son de lucide y la marca vive en BrandMark", () => {
  assert.ok(!existsSync(join(src, "components", "Icons.tsx")), "volvió src/components/Icons.tsx");
  assert.ok(existsSync(join(src, "components", "BrandMark.tsx")), "falta src/components/BrandMark.tsx");
  for (const { local, source } of code) {
    const leaks = importsIcons(local, source);
    assert.deepEqual(leaks, [], `src/${local} importa ${leaks.join(", ")}`);
  }
});

test("12 · la escala: siete --fs-*, ocho --lh-* y cinco --ctl* en los tres tamaños, sin --esc, en la retícula de 4 px y con el catálogo enganchado", () => {
  const tokens = read(join(src, "styles", "tokens.css"));
  assert.deepEqual(scaleProblems(tokens), []);
  const theme = read(join(src, "styles", "ui-theme.css"));
  assert.deepEqual(bridgeProblems(theme), [], "ui-theme.css: el puente de la escala");
  for (const { local, source } of files) {
    assert.ok(!/--esc\b/.test(source), `src/${local} menciona --esc: la escala ya no tiene factor`);
    if (local === "styles/tokens.css") continue;
    assert.deepEqual(scaleDeclarations(source), [], `src/${local} declara un valor de la escala: solo tokens.css los fija`);
  }
  for (const { local, source } of code) {
    for (const name of usedFontTokens(source)) {
      assert.ok(FS_TOKENS.includes(name), `src/${local} usa --fs-${name}, que no existe en tokens.css`);
    }
    for (const name of usedLineTokens(source)) {
      assert.ok(LH_TOKENS.includes(name), `src/${local} usa --lh-${name}, que no existe en tokens.css`);
    }
  }
});

test("13 · sin tamaños sueltos de texto ni restos de --session-* o data-session-text", () => {
  for (const { local, source } of code) {
    if (local.startsWith("showcase/")) continue;
    const loose = looseSizes(source, local.startsWith("components/ui/"));
    if (local === SAMPLE_FILE) assert.deepEqual([...new Set(loose)].sort(), SAMPLE_SIZES, `${local}: las muestras cambiaron`);
    else assert.deepEqual(loose, [], `src/${local} fija un tamaño de texto: usa text-(length:--fs-<x>)`);
    assert.ok(!OWN_NAME_UTILITY.test(source), `src/${local} usa una utilidad con nombre propio (text-micro…): cn la borra; usa text-(length:--fs-<x>)`);
  }
  for (const { local, source } of files) {
    assert.ok(!OLD_SESSION_SCALE.test(source), `src/${local} menciona la escala anterior (--session-*, data-session-text)`);
  }
});

test("14 · --quiet no colorea texto: text-(--quiet) no existe en src/", () => {
  for (const { local, source } of code) {
    assert.ok(!QUIET_TEXT.test(source), `src/${local} usa text-(--quiet): usa text-muted-foreground`);
  }
});

test("15 · la escala armónica: espaciado de 4 px, radios, interlineado, foco y medidas en la app y en el catálogo que usa", () => {
  const revised = harmonyFiles(files);
  const paths = revised.map(({ local }) => local);
  for (const expected of ["app/layout/AppSidebar.tsx", "features/instances/InstanceEditor.tsx", "components/EmptyState.tsx", "components/ui/button.tsx", "components/ui/dialog.tsx"]) {
    assert.ok(paths.includes(expected), `no se revisó src/${expected}`);
  }
  assert.ok(!paths.includes("components/ui/calendar.tsx"), "se revisó un componente que la app no importa");
  const problems = revised.flatMap(({ local, source }) => [...new Set(harmonyProblems(local, source))].map((problem) => `src/${local}: ${problem}`));
  assert.deepEqual(problems, []);
});

test("16 · contraste de los pares sólidos en los dos temas: texto 4,5:1 y anillo de foco 3:1", () => {
  const css = read(join(src, "styles", "tokens.css")) + "\n" + read(join(src, "styles", "ui-theme.css"));
  assert.deepEqual(contrastProblems(css), []);
});
