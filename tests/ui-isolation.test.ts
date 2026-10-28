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
