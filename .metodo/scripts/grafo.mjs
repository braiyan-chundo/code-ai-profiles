#!/usr/bin/env node
// El grafo del proyecto: los repositorios y el gobierno en una sola pieza consultable.
//   node .metodo/scripts/grafo.mjs build                  construye y cose las aristas entre repos
//   node .metodo/scripts/grafo.mjs check                  gate: existe y no está hueco
//   node .metodo/scripts/grafo.mjs check --al-dia         además, que no sea más viejo que el código
//   node .metodo/scripts/grafo.mjs impacto "<Símbolo>"    quién se rompe si cambio esto
//
// DEPENDE DE graphify (extractor por AST local, sin LLM): `uv tool install graphifyy`.
// Es OPCIONAL: sin graphify, build y check informan y salen en verde; impacto falla
// porque no hay grafo. Un gate roto no secuestra el trabajo.
//
// Por qué hace falta coser: si las apps instalan el paquete de contratos por etiqueta y
// no como hermano del workspace, para el extractor es una caja negra de node_modules.
// Sin coser, el grafo no responde «qué pantalla rompo si cambio este contrato».
//
// Configuración: .metodo/gates.config.json, bloque "grafo". Solo Node estándar.

import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, rmSync, renameSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

// Manda la ubicación del script (.metodo/scripts/ → la raíz es ../..): no actúa sobre otro proyecto.
const RAIZ = dirname(fileURLToPath(import.meta.url)).endsWith(join(".metodo", "scripts"))
  ? join(dirname(fileURLToPath(import.meta.url)), "..", "..") : (process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
const leerJSON = (r) => { try { return JSON.parse(readFileSync(r, "utf8")); } catch { return null; } };
const cfg = leerJSON(join(RAIZ, ".metodo", "gates.config.json"))?.grafo ?? {};
const SALIDA = join(RAIZ, cfg.salida ?? "graphify-out");
const GRAFO = join(SALIDA, "graph.json");
const REPOS = cfg.repos ?? [];                     // todos los repos de código
const APPS = cfg.apps ?? [];                       // los que importan los paquetes publicados
const API = cfg.api ?? null;                       // donde viven los paquetes
const PAQUETES = cfg.paquetes ?? {};               // { contracts: { nombre, fuentes } }
const EXT = cfg.extensiones ?? [".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".jsx"];
const COBERTURA_MINIMA = cfg.coberturaMinima ?? 0.75;
const AL_DIA_TAMBIEN = cfg.alDiaTambien ?? ["hu", "docs"];
const ORIGEN = "grafo-cosido";

function graphify() {
  for (const cand of [join(process.env.HOME ?? "", ".local/bin/graphify"), "graphify"]) {
    const r = spawnSync(cand, ["--version"], { encoding: "utf8" });
    if (r.status === 0) return cand;
  }
  return null;
}

// El repo de un archivo: el de ruta más larga que lo contiene. Así un repo anidado (happy-office/apps/api)
// cuenta como suyo y no como de la carpeta de primer nivel.
function repoDe(archivo) {
  const a = String(archivo ?? "").split("\\").join("/");
  return [...REPOS].sort((x, y) => y.length - x.length).find((r) => r === "." || a === r || a.startsWith(r.replace(/\/$/, "") + "/")) ?? null;
}

function fuentesDe(dir) {
  const salida = [];
  if (!existsSync(dir)) return salida;
  for (const nombre of readdirSync(dir)) {
    if (["node_modules", ".git", "dist", "build", "coverage", ".vite", "graphify-out"].includes(nombre)) continue;
    const ruta = join(dir, nombre);
    let st; try { st = statSync(ruta); } catch { continue; }
    if (st.isDirectory()) salida.push(...fuentesDe(ruta));
    else if (EXT.some((e) => nombre.endsWith(e)) && !nombre.endsWith(".d.ts")) salida.push(ruta);
  }
  return salida;
}

// ── coser las aristas que cruzan la frontera del paquete publicado ──────────

function versionInstalada(app, nombre) {
  const pkg = leerJSON(join(RAIZ, app, "package.json"));
  const spec = pkg?.dependencies?.[nombre] ?? pkg?.devDependencies?.[nombre] ?? "";
  return spec.match(/#[a-z0-9-]+-v([\d.]+)/i)?.[1] ?? "desconocida";
}

function nombresImportados(fuente) {
  const nombres = [];
  for (const [clave, p] of Object.entries(PAQUETES)) {
    // [^{}]* y no [\s\S]*?: lo perezoso salta de un import a otro y se traga nombres ajenos.
    const re = new RegExp(`import\\s+(?:type\\s+)?\\{([^{}]*)\\}\\s*from\\s*["']${p.nombre.replace("/", "\\/")}["']`, "g");
    for (const m of fuente.matchAll(re))
      for (const bruto of m[1].split(",")) {
        const limpio = bruto.replace(/\btype\b/g, "").split(/\s+as\s+/)[0].trim();
        if (limpio) nombres.push({ nombre: limpio, paquete: clave });
      }
  }
  return nombres;
}

// El extractor no emite nodo para todo lo exportado (alias de tipo derivados, const cuyo
// valor es una llamada). Para esos se cose contra el nodo del ARCHIVO: menos preciso,
// pero cierto. Perder la arista sería peor.
function exportadosPorArchivo() {
  const donde = new Map();
  for (const [clave, p] of Object.entries(PAQUETES))
    for (const ruta of fuentesDe(join(RAIZ, API, p.fuentes))) {
      const re = /export\s+(?:declare\s+)?(?:async\s+)?(?:const|let|var|function|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g;
      for (const m of readFileSync(ruta, "utf8").matchAll(re)) donde.set(`${clave}:${m[1]}`, relative(RAIZ, ruta));
    }
  return donde;
}

function coser(grafo) {
  const porArchivo = new Map();
  const simbolos = new Map();
  for (const n of grafo.nodes) {
    const sf = n.source_file ?? "";
    const previo = porArchivo.get(sf);
    if (!previo || n.id.length < previo.id.length) porArchivo.set(sf, n);
    for (const [clave, p] of Object.entries(PAQUETES)) {
      if (!sf.startsWith(`${API}/${p.fuentes}`)) continue;
      const k = `${clave}:${String(n.label).replace(/\(\)$/, "")}`;
      if (!simbolos.has(k)) simbolos.set(k, n);
    }
  }
  grafo.links = grafo.links.filter((l) => l._origin !== ORIGEN);
  const yaHay = new Set(grafo.links.map((l) => `${l.source}\u0000${l.target}\u0000${l.relation}`));
  const respaldo = exportadosPorArchivo();
  const nuevas = [];
  const huerfanos = new Set();
  let aproximadas = 0;

  for (const app of APPS) {
    for (const ruta of fuentesDe(join(RAIZ, app))) {
      const desde = porArchivo.get(relative(RAIZ, ruta));
      if (!desde) continue;
      for (const { nombre, paquete } of nombresImportados(readFileSync(ruta, "utf8"))) {
        let hacia = simbolos.get(`${paquete}:${nombre}`);
        let exacta = true;
        if (!hacia) {
          const archivo = respaldo.get(`${paquete}:${nombre}`);
          hacia = archivo ? porArchivo.get(archivo) : undefined;
          exacta = false;
          if (!hacia) { huerfanos.add(`${paquete}:${nombre}`); continue; }
          aproximadas++;
        }
        const clave = `${desde.id}\u0000${hacia.id}\u0000imports_from`;
        if (yaHay.has(clave)) continue;
        yaHay.add(clave);
        nuevas.push({
          relation: "imports_from", confidence: "DERIVED", confidence_score: 1.0, weight: 1.0,
          _origin: ORIGEN, precision: exacta ? "simbolo" : "archivo", symbol: nombre,
          package_version: versionInstalada(app, PAQUETES[paquete].nombre),
          source_file: relative(RAIZ, ruta), source: desde.id, target: hacia.id,
        });
      }
    }
  }
  grafo.links.push(...nuevas);
  return { nuevas: nuevas.length, aproximadas, huerfanos: [...huerfanos] };
}

// ── comandos ─────────────────────────────────────────────────────────────────

function build() {
  const bin = graphify();
  if (!bin) { console.log("graphify no está instalado; el grafo se omite (es opcional)."); return; }
  if (!existsSync(join(RAIZ, ".graphifyignore")) && REPOS.length)
    console.warn("  aviso · no hay .graphifyignore: si .gitignore excluye los repos de código, el grafo saldrá hueco.");
  // `graphify update` FUSIONA con el graph.json que encuentra: un grafo que acumula
  // miente hacia arriba. Se aparta el anterior y se repone si la extracción no termina.
  const ANTERIOR = `${GRAFO}.anterior`;
  if (existsSync(ANTERIOR)) rmSync(ANTERIOR);
  if (existsSync(GRAFO)) renameSync(GRAFO, ANTERIOR);
  let grafo;
  try {
    console.log("Extrayendo (AST local, sin LLM)…");
    execFileSync(bin, ["update", "."], { cwd: RAIZ, stdio: "inherit" });
    grafo = leerJSON(GRAFO);
    if (!grafo) throw new Error(`graphify no dejó ${relative(RAIZ, GRAFO)}`);
  } catch (e) {
    if (existsSync(ANTERIOR)) {
      if (existsSync(GRAFO)) rmSync(GRAFO);
      renameSync(ANTERIOR, GRAFO);
      console.error("La extracción falló; se repuso el grafo anterior.");
    }
    throw e;
  }
  if (existsSync(ANTERIOR)) rmSync(ANTERIOR);
  const { nuevas, aproximadas, huerfanos } = API ? coser(grafo) : { nuevas: 0, aproximadas: 0, huerfanos: [] };
  writeFileSync(GRAFO, JSON.stringify(grafo));
  console.log(`\nCosidas ${nuevas} aristas entre repos.`);
  if (aproximadas) console.log(`  ${aproximadas} apuntan al archivo, no al símbolo.`);
  if (huerfanos.length) {
    console.warn(`  aviso · ${huerfanos.length} símbolo(s) importados que el paquete no exporta (¿etiqueta vieja o renombrado?):`);
    for (const h of huerfanos.slice(0, 10)) console.warn(`      ${h}`);
  }
  console.log(`${grafo.nodes.length} nodos · ${grafo.links.length} aristas`);
}

// Dos modos a propósito: lo estructural siempre (hook); la frescura solo al revisar y al cerrar.
function check({ alDia = false } = {}) {
  if (!graphify()) { console.log("graphify no está instalado; grafo omitido (es opcional)."); return; }
  if (!REPOS.some((r) => fuentesDe(join(RAIZ, r)).length)) {
    console.log("Todavía no hay código en ningún repo de la configuración: nada que comprobar.");
    return;
  }
  const grafo = leerJSON(GRAFO);
  if (!grafo) { console.error("No hay grafo. Constrúyelo:  node .metodo/scripts/grafo.mjs build"); process.exit(1); }
  const errores = [];

  // 1 · ningún repo hueco: graphify honra .gitignore, que suele excluir los repos de código.
  const enGrafo = new Map(REPOS.map((r) => [r, new Set()]));
  for (const n of grafo.nodes) {
    const repo = repoDe(n.source_file);
    if (repo && enGrafo.has(repo)) enGrafo.get(repo).add(n.source_file);
  }
  for (const repo of REPOS) {
    // Solo las fuentes que son de este repo y no de uno anidado dentro.
    const enDisco = fuentesDe(join(RAIZ, repo)).filter((p) => repoDe(relative(RAIZ, p)) === repo).length;
    if (!enDisco) continue;
    const dentro = enGrafo.get(repo).size;
    if (dentro / enDisco < COBERTURA_MINIMA)
      errores.push(`${repo}: solo ${dentro} de ${enDisco} fuentes en el grafo. Revisa .graphifyignore (debe reincluir «!${repo}/»).`);
  }

  // 2 · si hay apps que importan paquetes, tiene que haber aristas cosidas.
  const cosidas = grafo.links.filter((l) => l._origin === ORIGEN).length;
  if (APPS.length && Object.keys(PAQUETES).length && !cosidas && APPS.some((a) => existsSync(join(RAIZ, a))))
    errores.push("Ninguna arista cosida entre las apps y los paquetes. Reconstruye con build.");

  // 3 · al día: un grafo viejo es peor que ninguno, porque se consulta con confianza.
  if (alDia) {
    const mtime = statSync(GRAFO).mtimeMs;
    const recientes = [...REPOS, ...AL_DIA_TAMBIEN].flatMap((d) => fuentesDe(join(RAIZ, d)))
      .filter((f) => statSync(f).mtimeMs > mtime).map((f) => relative(RAIZ, f));
    if (recientes.length)
      errores.push(`El grafo es más viejo que ${recientes.length} archivo(s), p. ej. ${recientes.slice(0, 3).join(", ")}. Reconstruye.`);
  }

  if (errores.length) {
    console.error(`\n${errores.length} problema(s) con el grafo:\n`);
    for (const e of errores) console.error(`  · ${e}`);
    process.exit(1);
  }
  console.log(`Grafo en orden. ${grafo.nodes.length} nodos · ${grafo.links.length} aristas · ${cosidas} cosidas${alDia ? " · al día" : ""}.`);
}

function impacto(simbolo) {
  if (!simbolo) throw new Error('Falta el símbolo.  node .metodo/scripts/grafo.mjs impacto "<Símbolo>"');
  const grafo = leerJSON(GRAFO);
  if (!grafo) throw new Error("No hay grafo. node .metodo/scripts/grafo.mjs build (necesita graphify)");
  const porId = new Map(grafo.nodes.map((n) => [n.id, n]));
  const buscado = simbolo.toLowerCase().replace(/\(\)$/, "");
  const diana = grafo.nodes.filter((n) => String(n.label).toLowerCase().replace(/\(\)$/, "") === buscado);
  if (!diana.length) { console.error(`No hay ningún nodo «${simbolo}» en el grafo.`); process.exit(1); }
  const entrantes = new Map();
  for (const l of grafo.links) entrantes.set(l.target, [...(entrantes.get(l.target) ?? []), l]);
  const vistos = new Set(diana.map((d) => d.id));
  let frente = [...diana];
  const porRepo = new Map();
  for (let salto = 1; salto <= 3 && frente.length; salto++) {
    const siguiente = [];
    for (const n of frente)
      for (const l of entrantes.get(n.id) ?? []) {
        if (l.relation === "contains" || vistos.has(l.source)) continue;
        vistos.add(l.source);
        const orig = porId.get(l.source);
        if (!orig) continue;
        siguiente.push(orig);
        const repo = repoDe(orig.source_file);
        if (!porRepo.has(repo)) porRepo.set(repo, []);
        porRepo.get(repo).push({ ...orig, salto });
      }
    frente = siguiente;
  }
  console.log(`\n«${simbolo}» · definido en:`);
  for (const d of diana) console.log(`   ${d.source_file}`);
  if (!porRepo.size) { console.log("\nNadie lo consume todavía (o lo consume por literal: busca también con rg)."); return; }
  console.log("\nSe rompe, como mucho, en:");
  for (const [repo, ns] of [...porRepo].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n  ${repo} · ${ns.length}`);
    const archivos = new Map();
    for (const n of ns) archivos.set(n.source_file, Math.min(archivos.get(n.source_file) ?? 9, n.salto));
    for (const [f, s] of [...archivos].sort((a, b) => a[1] - b[1]).slice(0, 12)) console.log(`      ${"·".repeat(s)} ${f}`);
    if (archivos.size > 12) console.log(`      … y ${archivos.size - 12} archivo(s) más`);
  }
  console.log("");
}

const [comando, ...resto] = process.argv.slice(2);
try {
  if (comando === "build") build();
  else if (comando === "check" || comando === undefined) check({ alDia: resto.includes("--al-dia") });
  else if (comando === "impacto") impacto(resto.join(" "));
  else throw new Error("Uso: node .metodo/scripts/grafo.mjs build | check [--al-dia] | impacto \"<Símbolo>\"");
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
