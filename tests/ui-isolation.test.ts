import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, posix, resolve } from "node:path";
import test from "node:test";

// HU-0014: el catálogo shadcn/ui y Tailwind solo viven en el showcase. Estas pruebas vigilan que no lleguen a la app.
// La historia que adopte los componentes cambiará a propósito la lista de exclusiones y la de imports prohibidos.

const root = resolve(import.meta.dirname, "..");
const src = join(root, "src");

/** Rutas siempre con «/», también en Windows (relative() devuelve «\»). */
const toPosix = (path: string) => path.replace(/\\/g, "/");

/** Lo que no es la app: el catálogo, sus hooks, el showcase, el tema del catálogo y `cn`. Rutas relativas a src/. */
function isExcluded(local: string): boolean {
  const path = toPosix(local);
  return (
    path.startsWith("components/ui/") ||
    path.startsWith("hooks/") ||
    path.startsWith("showcase/") ||
    path === "styles/ui-theme.css" ||
    path === "lib/utils.ts"
  );
}

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

/** Lo que importan un .ts, .tsx o .css: `from "x"`, `import "x"`, `import("x")`, `@import "x"` y `@import url("x")`. */
function specifiers(source: string): string[] {
  const found: string[] = [];
  for (const match of source.matchAll(/(?:from|import)\s*\(?\s*(?:url\(\s*)?["']([^"']+)["']/g)) found.push(match[1]);
  return found;
}

const FORBIDDEN_PACKAGE = /^(tailwindcss|@tailwindcss\/|tw-animate-css|shadcn|lucide-react|radix-ui|class-variance-authority|cn)(\/|$)/;
const FORBIDDEN_ALIAS = /^@\/(components\/ui|hooks|showcase|lib\/utils|styles\/ui-theme)(\/|$)/;
const FORBIDDEN_TARGET = /^(components\/ui|hooks|showcase|lib\/utils|styles\/ui-theme)(\/|\.|$)/;
const FORBIDDEN_NAME = /tailwindcss|tw-animate-css|shadcn|ui-theme|showcase|components\/ui/;

/** Imports prohibidos de un archivo de la app. `local` es su ruta relativa a src/ (con «/» o «\»). */
function findLeaks(local: string, source: string): string[] {
  const dir = posix.dirname(toPosix(local));
  const leaks: string[] = [];
  for (const specifier of specifiers(source)) {
    let bad = FORBIDDEN_PACKAGE.test(specifier) || FORBIDDEN_ALIAS.test(specifier) || FORBIDDEN_NAME.test(specifier);
    if (!bad && specifier.startsWith(".")) bad = FORBIDDEN_TARGET.test(posix.normalize(posix.join(dir, specifier)));
    if (bad) leaks.push(specifier);
  }
  return leaks;
}

const MUTED = /\(--muted\)/; // cubre var(--muted) y la forma corta de Tailwind 4, bg-(--muted)

test("la entrada de la app no menciona Tailwind, el tema de shadcn ni el showcase", () => {
  for (const file of ["styles/index.css", "main.tsx"]) {
    const text = read(join(src, file));
    for (const word of ["tailwindcss", "ui-theme", "shadcn", "showcase", "components/ui"]) {
      assert.ok(!text.includes(word), `src/${file} menciona «${word}»`);
    }
  }
});

test("nada de la app (todo src/ salvo el catálogo, el showcase y su tema) importa Tailwind ni el catálogo", () => {
  const files = walk(src)
    .map((path) => toPosix(path.slice(src.length + 1)))
    .filter((local) => /\.(tsx?|css)$/.test(local) && !isExcluded(local));
  for (const prefix of ["app/", "features/", "lib/", "components/", "styles/"]) {
    assert.ok(
      files.some((local) => local.startsWith(prefix)),
      `no se revisó ningún archivo de src/${prefix}`,
    );
  }
  assert.ok(files.includes("main.tsx"), "no se revisó src/main.tsx");
  assert.ok(files.includes("styles/base.css"), "no se revisó src/styles/base.css");
  for (const local of files) {
    const leaks = findLeaks(local, read(join(src, local)));
    assert.deepEqual(leaks, [], `src/${local} importa ${leaks.map((leak) => `«${leak}»`).join(", ")}`);
  }
});

test("components/ui y hooks no usan var(--muted) ni (--muted) (A-3: es un color de texto en la app)", () => {
  const files = [...walk(join(src, "components", "ui")), ...walk(join(src, "hooks"))];
  assert.ok(files.length > 0, "no se encontró ningún archivo del catálogo que revisar");
  for (const file of files) {
    assert.ok(!MUTED.test(read(file)), `${toPosix(file)} usa (--muted): usa --surface-soft`);
  }
});

test("index.html no menciona el showcase", () => {
  assert.ok(!read(join(root, "index.html")).includes("showcase"));
});

test("canario: la detección marca fugas sintéticas, también con rutas de Windows", () => {
  assert.equal(isExcluded("features\\scan\\useScan.ts"), false);
  assert.equal(isExcluded("features/scan/useScan.ts"), false);
  assert.equal(isExcluded("components\\ui\\button.tsx"), true);
  assert.equal(isExcluded("hooks\\use-mobile.ts"), true);
  assert.equal(isExcluded("showcase/main.tsx"), true);
  assert.equal(isExcluded("styles\\ui-theme.css"), true);
  assert.equal(isExcluded("styles\\base.css"), false);
  assert.equal(isExcluded("components\\Icons.tsx"), false);

  const leaky: Array<[string, string]> = [
    ["styles/base.css", '@import "tailwindcss";'],
    ["styles\\base.css", '@import url("tw-animate-css");'],
    ["components\\buttons.css", '@import "../styles/ui-theme.css";'],
    ["features\\scan\\x.ts", 'import { Button } from "@/components/ui/button";'],
    ["features\\scan\\x.ts", 'import { Button } from "../../components/ui/button";'],
    ["app\\layout\\x.tsx", 'import { useIsMobile } from "../../hooks/use-mobile";'],
    ["app/layout/x.tsx", 'import { X } from "lucide-react";'],
    ["main.tsx", 'import { Dialog } from "radix-ui";'],
    ["main.tsx", 'import { cn } from "cn";'],
    ["lib/x.ts", 'const m = await import("@/showcase/main");'],
  ];
  for (const [local, source] of leaky) {
    assert.ok(findLeaks(local, source).length > 0, `no marcó ${local}: ${source}`);
  }

  const clean: Array<[string, string]> = [
    ["features/scan/x.ts", 'import { bridge } from "../../lib/bridge";'],
    ["features\\scan\\x.ts", 'import type { DashboardState } from "../../types";'],
    ["main.tsx", 'import "@fontsource/inter/latin-400.css";'],
    ["styles/index.css", '@import "./base.css";'],
  ];
  for (const [local, source] of clean) {
    assert.deepEqual(findLeaks(local, source), [], `marcó de más ${local}: ${source}`);
  }

  for (const sample of ["bg-(--muted)", "color-mix(in oklch, var(--muted), red)"]) {
    assert.ok(MUTED.test(sample), `no marcó ${sample}`);
  }
  assert.ok(!MUTED.test("var(--surface-soft)"));
});
