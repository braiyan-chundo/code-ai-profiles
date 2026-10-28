import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import test from "node:test";

// HU-0014: el catálogo shadcn/ui y Tailwind solo viven en el showcase. Estas pruebas vigilan que no lleguen a la app.
// La historia que adopte los componentes cambiará la segunda a propósito.

const root = resolve(import.meta.dirname, "..");
const src = join(root, "src");

function walk(dir: string, skip: (path: string) => boolean = () => false): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (skip(path)) continue;
    if (statSync(path).isDirectory()) out.push(...walk(path, skip));
    else out.push(path);
  }
  return out;
}

const read = (path: string) => readFileSync(path, "utf8");
const rel = (path: string) => relative(root, path);

function specifiers(source: string): string[] {
  const found: string[] = [];
  for (const match of source.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)) found.push(match[1]);
  return found;
}

test("la entrada de la app no menciona Tailwind, el tema de shadcn ni el showcase", () => {
  for (const file of [join(src, "styles/index.css"), join(src, "main.tsx")]) {
    const text = read(file);
    for (const word of ["tailwindcss", "ui-theme", "shadcn", "showcase"]) {
      assert.ok(!text.includes(word), `${rel(file)} menciona «${word}»`);
    }
  }
});

test("la app no importa el catálogo ui, los hooks del catálogo, lucide-react ni radix-ui", () => {
  const isApp = (path: string) => {
    const local = relative(src, path);
    if (local === join("lib", "utils.ts")) return false;
    if (/\.(tsx?|css)$/.test(local) === false) return false;
    if (local.startsWith("app/") || local.startsWith("features/") || local.startsWith("lib/")) return true;
    return dirname(local) === "components" && local.endsWith(".tsx");
  };
  const files = walk(src, (path) => path.startsWith(join(src, "components", "ui") + "/")).filter(isApp);
  assert.ok(files.length > 0, "no se encontró ningún archivo de la app que revisar");
  for (const file of files) {
    for (const specifier of specifiers(read(file))) {
      assert.ok(!/^(lucide-react|radix-ui)(\/|$)/.test(specifier), `${rel(file)} importa «${specifier}»`);
      assert.ok(!/^@\/(components\/ui|hooks)(\/|$)/.test(specifier), `${rel(file)} importa «${specifier}»`);
      if (specifier.startsWith(".")) {
        const target = relative(src, resolve(dirname(file), specifier));
        assert.ok(!/^(components\/ui|hooks)(\/|$)/.test(target), `${rel(file)} importa «${specifier}»`);
      }
    }
  }
});

test("components/ui y hooks no usan var(--muted) (A-3: es un color de texto en la app)", () => {
  const files = [...walk(join(src, "components", "ui")), ...walk(join(src, "hooks"))];
  assert.ok(files.length > 0, "no se encontró ningún archivo del catálogo que revisar");
  for (const file of files) {
    assert.ok(!read(file).includes("var(--muted)"), `${rel(file)} usa var(--muted): usa var(--surface-soft)`);
  }
});

test("index.html no menciona el showcase", () => {
  assert.ok(!read(join(root, "index.html")).includes("showcase"));
});
