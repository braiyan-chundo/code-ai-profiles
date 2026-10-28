import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { restoreMemory, withMemoryAside } from "./graphify-memory.mjs";

function fixture(t) {
  const graphDir = mkdtempSync(join(tmpdir(), "graphify-memory-test-"));
  t.after(() => rmSync(graphDir, { recursive: true, force: true }));
  return graphDir;
}

function addQuery(dir) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "query.md"), "consulta guardada");
}

test("Graphify no ve la caché de consultas y la caché vuelve al terminar", (t) => {
  const graphDir = fixture(t);
  addQuery(join(graphDir, "memory"));

  const result = withMemoryAside(graphDir, () => {
    assert.equal(existsSync(join(graphDir, "memory")), false);
    return 0;
  });

  assert.equal(result, 0);
  assert.equal(readFileSync(join(graphDir, "memory", "query.md"), "utf8"), "consulta guardada");
  assert.equal(existsSync(join(graphDir, ".memory-aside")), false);
});

test("la caché vuelve aunque Graphify falle", (t) => {
  const graphDir = fixture(t);
  addQuery(join(graphDir, "memory"));

  assert.throws(() => withMemoryAside(graphDir, () => {
    throw new Error("graphify falló");
  }), /graphify falló/);

  assert.equal(existsSync(join(graphDir, "memory", "query.md")), true);
});

test("sin caché de consultas, solo ejecuta", (t) => {
  const graphDir = fixture(t);
  assert.equal(withMemoryAside(graphDir, () => 3), 3);
  assert.equal(existsSync(join(graphDir, "memory")), false);
});

test("recupera la caché que dejó apartada una ejecución interrumpida", (t) => {
  const graphDir = fixture(t);
  addQuery(join(graphDir, ".memory-aside"));

  restoreMemory(graphDir);

  assert.equal(existsSync(join(graphDir, "memory", "query.md")), true);
  assert.equal(existsSync(join(graphDir, ".memory-aside")), false);
});

test("no pisa nada si hay caché en los dos sitios", (t) => {
  const graphDir = fixture(t);
  addQuery(join(graphDir, "memory"));
  addQuery(join(graphDir, ".memory-aside"));

  assert.throws(() => withMemoryAside(graphDir, () => 0), /a la vez/);
  assert.equal(existsSync(join(graphDir, "memory", "query.md")), true);
  assert.equal(existsSync(join(graphDir, ".memory-aside", "query.md")), true);
});
