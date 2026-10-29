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

// 12. HU-0019 (A-3): la escala tipográfica. Siete tamaños y un factor, en :root y en los dos tamaños del texto.
const FS_TOKENS = ["micro", "small", "body", "heading", "title", "figure", "dialog"];
const TEXT_SIZES = ["compact", "large"];
const MIN_FONT_PX = 11;

/** Las declaraciones `--nombre: valor` del bloque cuyo selector es exactamente `selector` (el último gana). */
function declarations(css: string, selector: string): Map<string, string> {
  const found = new Map<string, string>();
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const block of css.matchAll(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`, "g"))) {
    for (const item of block[1].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) found.set(item[1], item[2].trim());
  }
  return found;
}
const fontPx = (value: string | undefined) => (value && /^\d+(\.\d+)?px$/.test(value) ? parseFloat(value) : NaN);
/** Problemas de la escala en el texto de tokens.css; vacío si está bien. */
function scaleProblems(css: string): string[] {
  const problems: string[] = [];
  const normal = declarations(css, ":root");
  const sizes = new Map(TEXT_SIZES.map((size) => [size, declarations(css, `:root[data-text-size="${size}"]`)]));
  if (!normal.has("--esc")) problems.push(":root no declara --esc");
  for (const [size, map] of sizes) if (!map.has("--esc")) problems.push(`:root[data-text-size="${size}"] no declara --esc`);
  for (const name of FS_TOKENS) {
    const token = `--fs-${name}`;
    const values = [["normal", normal], ...sizes].map(([label, map]) => [label as string, fontPx((map as Map<string, string>).get(token))] as const);
    for (const [label, px] of values) {
      if (Number.isNaN(px)) problems.push(`${token} no está en px en ${label}`);
      else if (px < MIN_FONT_PX) problems.push(`${token} vale ${px}px en ${label} (mínimo ${MIN_FONT_PX})`);
    }
    const [normalPx, largePx] = [values[0][1], values[2][1]];
    if (!Number.isNaN(normalPx) && !Number.isNaN(largePx) && largePx <= normalPx) problems.push(`${token}: grande (${largePx}) no supera a normal (${normalPx})`);
  }
  // Cada declaración de la escala vive en uno de los tres bloques: ninguna en `.theme-light` ni suelta.
  const inBlocks = [normal, ...sizes.values()].reduce((sum, map) => sum + [...map.keys()].filter((key) => /^--(?:fs-|esc$|ctl)/.test(key)).length, 0);
  const total = scaleDeclarations(css).length;
  if (total !== inBlocks) problems.push(`tokens.css declara ${total} valores de la escala, pero solo ${inBlocks} están en :root y :root[data-text-size]`);
  return problems;
}
/** Una declaración (no un uso) de la escala: `--fs-x:`, `--esc:` o `--ctl*:`, también como `[--fs-x:…]` o `"--fs-x":`. */
const SCALE_DECLARATION = /--(?:fs-[a-z0-9-]+|esc|ctl(?:-[a-z]+)?)["']?\s*:/g;
const scaleDeclarations = (source: string) => source.match(SCALE_DECLARATION) ?? [];
/** `--text-base`…`--text-2xl` del puente: siguen a `--esc`, así que crecen con el tamaño del texto (A-3). */
const TEXT_BRIDGE = ["base", "lg", "xl", "2xl"];
const bridgeProblems = (css: string) => {
  const problems: string[] = [];
  if (!/--text-xs:\s*var\(--fs-small\)/.test(css)) problems.push("--text-xs no sigue a --fs-small");
  if (!/--text-sm:\s*var\(--fs-body\)/.test(css)) problems.push("--text-sm no sigue a --fs-body");
  for (const name of TEXT_BRIDGE) {
    if (!new RegExp(`--text-${name}:\\s*calc\\(\\s*\\d+(?:\\.\\d+)?px\\s*\\*\\s*var\\(--esc\\)\\s*\\)`).test(css)) problems.push(`--text-${name} no escala con --esc`);
  }
  return problems;
};
/** Cada `--fs-<x>` que usa un texto debe existir en la escala. */
const usedFontTokens = (source: string) => [...source.matchAll(/--fs-([a-z0-9-]+)/g)].map((m) => m[1]);

// 13. Sin tamaños sueltos: `text-[<n>px|rem|em]`. Las tres muestras de AppearanceDialog enseñan cada opción con un
// tamaño fijo (lista cerrada).
// Cubre `text-[9px]`, `text-[length:9px]`, `text-(length:9px)` y `[font-size:9px]`.
const looseSizeRegex = (units: string) => new RegExp(`\\btext-\\[\\s*(?:length:)?\\s*\\d*\\.?\\d+\\s*(?:${units})\\s*\\]|\\btext-\\(\\s*length:\\s*\\d*\\.?\\d+\\s*(?:${units})\\s*\\)|\\[font-size:\\s*\\d*\\.?\\d+\\s*(?:${units})\\s*\\]`, "g");
const LOOSE_TEXT_SIZE = looseSizeRegex("px|rem|em");
// En components/ui/ solo los px: calendar y questionnaire (que la app no usa) miden en rem.
const LOOSE_TEXT_PX = looseSizeRegex("px");
// Una utilidad con nombre propio (`text-micro`): `cn` la toma por un color y la borra (A-3). El tamaño es `text-(length:--fs-x)`.
const OWN_NAME_UTILITY = /\btext-(?:micro|small|body|heading|title|figure|dialog)\b/;
const SAMPLE_FILE = "features/appearance/AppearanceDialog.tsx";
const SAMPLE_SIZES = ["text-[11px]", "text-[15px]", "text-[19px]"];
const looseSizes = (source: string, catalog = false) => source.match(catalog ? LOOSE_TEXT_PX : LOOSE_TEXT_SIZE) ?? [];
// ...y nada de la escala anterior de sesiones.
const OLD_SESSION_SCALE = /--session-|data-session-text|dataset\s*\.\s*sessionText\b/;

// 14. `--quiet` no colorea texto: da 3,4:1 en oscuro y 2,9:1 en claro. Queda para puntos, rayas y separadores.
const QUIET_TEXT = /\btext-\(--quiet\)/;

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
  const goodScale = [
    ":root {",
    ...FS_TOKENS.map((n) => `  --fs-${n}: 12px;`),
    "  --esc: 1;",
    "}",
    ...TEXT_SIZES.flatMap((size, i) => [`:root[data-text-size="${size}"] {`, ...FS_TOKENS.map((n) => `  --fs-${n}: ${i ? 14 : 11}px;`), "  --esc: 1;", "}"]),
  ].join("\n");
  assert.deepEqual(scaleProblems(goodScale), [], "la escala de muestra es válida");
  assert.ok(scaleProblems(goodScale.replace("--fs-body: 12px;", "--fs-body: 15px;")).some((p) => p.includes("--fs-body")), "no marcó un grande que no supera a normal");
  assert.ok(scaleProblems(goodScale.replace("--fs-micro: 11px;", "--fs-micro: 10px;")).some((p) => p.includes("10px")), "no marcó un valor bajo 11 px");
  assert.ok(scaleProblems(goodScale.replace(/ {2}--fs-title: 12px;\n/, "")).some((p) => p.includes("--fs-title")), "no marcó un token que falta");
  assert.ok(scaleProblems(goodScale.replace("--fs-small: 12px;", "--fs-small: 0.7rem;")).some((p) => p.includes("--fs-small")), "no marcó una unidad que no es px");
  assert.ok(scaleProblems(goodScale.replace("  --esc: 1;\n}\n:root[data-text-size=\"compact\"]", "}\n:root[data-text-size=\"compact\"]")).some((p) => p.includes("--esc")), "no marcó --esc ausente");
  assert.deepEqual(usedFontTokens("text-(length:--fs-micro) text-(length:--fs-tiny)"), ["micro", "tiny"]);
  assert.ok(scaleProblems(goodScale + "\n.theme-light {\n  --fs-body: 14px;\n}").some((p) => p.includes("tokens.css declara")), "no marcó un --fs-* fuera de los tres bloques");
  const goodBridge = "--text-xs: var(--fs-small);\n--text-sm: var(--fs-body);\n--text-base: calc(16px * var(--esc));\n--text-lg: calc(18px * var(--esc));\n--text-xl: calc(20px * var(--esc));\n--text-2xl: calc(24px * var(--esc));";
  assert.deepEqual(bridgeProblems(goodBridge), []);
  for (const name of TEXT_BRIDGE) {
    assert.ok(bridgeProblems(goodBridge.replace(new RegExp(`--text-${name}: calc\\(\\d+px \\* var\\(--esc\\)\\)`), `--text-${name}: 16px`)).some((p) => p.includes(`--text-${name}`)), `no marcó --text-${name} fijo`);
  }
  assert.ok(bridgeProblems(goodBridge.replace("var(--fs-body)", "14px")).some((p) => p.includes("--text-sm")), "no marcó --text-sm suelto");
  assert.ok(bridgeProblems("").length === 6, "no marcó un puente vacío");
  for (const sample of ["--fs-body: 20px;", "[--fs-micro:9px]", '"--fs-title": "10px"', "--esc: 2;", "--ctl-sm: 20px;", "--ctl: 10px;"]) {
    assert.equal(scaleDeclarations(sample).length, 1, `no marcó la redefinición ${sample}`);
  }
  assert.deepEqual(scaleDeclarations("text-(length:--fs-body) var(--esc) h-(--ctl-sm) calc(1px * var(--esc))"), [], "un uso no es una declaración");

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

test("12 · la escala tipográfica: siete --fs-* y --esc en los tres tamaños, ninguno bajo 11 px, y el catálogo enganchado", () => {
  const tokens = read(join(src, "styles", "tokens.css"));
  assert.deepEqual(scaleProblems(tokens), []);
  const theme = read(join(src, "styles", "ui-theme.css"));
  assert.deepEqual(bridgeProblems(theme), [], "ui-theme.css: el puente de la escala");
  for (const { local, source } of files) {
    if (local === "styles/tokens.css") continue;
    assert.deepEqual(scaleDeclarations(source), [], `src/${local} declara un valor de la escala: solo tokens.css los fija`);
  }
  for (const { local, source } of code) {
    for (const name of usedFontTokens(source)) {
      assert.ok(FS_TOKENS.includes(name), `src/${local} usa --fs-${name}, que no existe en tokens.css`);
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
