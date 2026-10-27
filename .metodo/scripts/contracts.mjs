#!/usr/bin/env node
// Comprueba las fronteras entre repositorios.
//   node .metodo/scripts/contracts.mjs check
//
// Reemplaza la garantía que daría un monorepo: sin este gate, una app puede seguir
// compilando contra una versión vieja del paquete de contratos sin que nadie se
// entere hasta producción.
//
// Qué comprueba se lee de .metodo/gates.config.json, bloque "contratos". Cada
// comprobación se activa si su clave está en "comprobaciones". Fail-open ante su
// propia ausencia: sin configuración o sin el repo de la API, informa y sale en verde.
// Válvulas por línea, siempre con comentario al lado: contracts-ignore-money,
// contracts-allow-interval, contracts-allow-color. Solo Node estándar.

import { execSync, spawnSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

// Manda la ubicación del script (.metodo/scripts/ → la raíz es ../..): no actúa sobre otro proyecto.
const RAIZ = dirname(fileURLToPath(import.meta.url)).endsWith(join(".metodo", "scripts"))
  ? join(dirname(fileURLToPath(import.meta.url)), "..", "..") : (process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
const CONFIG = join(RAIZ, ".metodo", "gates.config.json");
const errores = [];
const avisos = [];

const leerJSON = (r) => { try { return JSON.parse(readFileSync(r, "utf8")); } catch { return null; } };
const rel = (r) => relative(RAIZ, r);

function archivosBajo(dir, extensiones) {
  const salida = [];
  if (!existsSync(dir)) return salida;
  for (const nombre of readdirSync(dir)) {
    if (["node_modules", ".git", "dist", "build", "coverage", ".vite"].includes(nombre)) continue;
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...archivosBajo(ruta, extensiones));
    else if (extensiones.some((e) => nombre.endsWith(e))) salida.push(ruta);
  }
  return salida;
}

function porLinea(archivos, fn) {
  for (const archivo of archivos) {
    readFileSync(archivo, "utf8").split("\n").forEach((linea, i) => fn(linea, `${rel(archivo)}:${i + 1}`));
  }
}

// ── configuración ────────────────────────────────────────────────────────────

const cfg = leerJSON(CONFIG)?.contratos;
const API = cfg ? join(RAIZ, cfg.api) : null;
const APPS = (cfg?.apps ?? []).map((a) => join(RAIZ, a));
const PAQ = cfg?.paquetes ?? {};          // { contracts: { nombre, carpeta, ... }, ui: {...} }
const C = cfg?.comprobaciones ?? {};
const fuentesApps = (ext) => APPS.flatMap((a) => archivosBajo(join(a, "src"), ext));
const fuentesApi = () => archivosBajo(join(API, "src"), [".ts", ".js", ".mjs"]);

function depDe(app, nombre) {
  const pkg = leerJSON(join(app, "package.json"));
  return pkg?.dependencies?.[nombre] ?? pkg?.devDependencies?.[nombre] ?? null;
}

// "git+…#contracts-v1.4.0&path:/packages/contracts" → "1.4.0". El sufijo &path: es legítimo.
const versionEtiquetada = (spec) => String(spec ?? "").match(/#[a-z0-9-]+-v(\d+\.\d+\.\d+)(?:&|$)/i)?.[1] ?? null;
const esLocal = (spec) => /^(link:|file:|workspace:)/.test(String(spec ?? ""));

// ── 1 · versiones: cada app apunta a una etiqueta, y no a una mayor distinta ─

function comprobarVersiones() {
  for (const p of Object.values(PAQ)) {
    const publicada = leerJSON(join(API, p.carpeta, "package.json"))?.version;
    for (const app of APPS) {
      const spec = depDe(app, p.nombre);
      if (!spec) continue;
      const nombreApp = app.split("/").pop();
      if (esLocal(spec) && p.localPermitido) {
        avisos.push(`${nombreApp}: ${p.nombre} apunta a la carpeta local. Sirve para trabajar; no se commitea.`);
        continue;
      }
      const instalada = versionEtiquetada(spec);
      if (!instalada) {
        errores.push(`${nombreApp}: ${p.nombre} no apunta a una etiqueta («${spec}»).`);
        continue;
      }
      if (!publicada) continue;
      if (instalada.split(".")[0] !== publicada.split(".")[0])
        errores.push(`${nombreApp}: ${p.nombre} instalado v${instalada}, publicado v${publicada}: cambio mayor sin actualizar.`);
      else if (instalada !== publicada) {
        const n = (v) => v.split(".").map(Number);
        const [a, b] = [n(instalada), n(publicada)];
        const detras = a[1] < b[1] || (a[1] === b[1] && a[2] < b[2]);
        avisos.push(`${nombreApp}: ${p.nombre} v${instalada} va ${detras ? "por detrás" : "por delante (¿etiqueta sin el paquete subido?)"} de v${publicada}.`);
      }
    }
  }
}

// ── 1a · un paquete compartido, la misma versión en todas las apps ──────────

function comprobarVersionUnica() {
  for (const clave of [].concat(C.versionUnica)) {
    const p = PAQ[clave];
    if (!p) continue;
    const origenes = APPS.map((a) => ({ app: a.split("/").pop(), spec: depDe(a, p.nombre) })).filter((o) => o.spec);
    const distintos = new Set(origenes.map((o) => (esLocal(o.spec) ? "local" : versionEtiquetada(o.spec))));
    if (distintos.size > 1)
      errores.push(`${p.nombre}: las apps instalan versiones distintas (${origenes.map((o) => `${o.app}: ${o.spec}`).join(" · ")}).`);
  }
}

// ── 1b · package.json y la constante de versión dicen lo mismo ───────────────

function comprobarVersionDelPaquete() {
  for (const p of Object.values(PAQ)) {
    if (!p.versionArchivo) continue;
    const pkg = leerJSON(join(API, p.carpeta, "package.json"));
    const fuente = join(API, p.carpeta, p.versionArchivo);
    if (!pkg || !existsSync(fuente)) continue;
    const re = new RegExp(`${p.versionConstante}\\s*=\\s*["'\`]([^"'\`]+)["'\`]`);
    const m = readFileSync(fuente, "utf8").match(re);
    if (!m) errores.push(`${rel(fuente)} no declara ${p.versionConstante}.`);
    else if (m[1] !== pkg.version)
      errores.push(`${p.nombre}: package.json dice v${pkg.version} y ${p.versionConstante} dice v${m[1]}.`);
  }
}

// ── 2 · el dist versionado coincide con lo que produce el build ─────────────

function comprobarDist() {
  const { comando, rutas } = C.dist;
  try { execSync(comando, { cwd: API, stdio: "pipe" }); }
  catch (e) { errores.push(`No se pudo construir los paquetes («${comando}»): ${e.message}`); return; }
  const diff = spawnSync("git", ["diff", "--stat", "--", ...rutas], { cwd: API, encoding: "utf8" });
  const salida = (diff.stdout || "").trim();
  if (salida) errores.push(`El dist/ versionado no coincide con el build. Reconstruye y commitea:\n      ${salida.split("\n").join("\n      ")}`);
}

// ── 3 · endpoints declarados que no aparecen en el servidor ─────────────────

function comprobarEndpoints() {
  const archivo = join(API, C.endpoints.archivo);
  if (!existsSync(archivo)) return;
  const re = new RegExp(C.endpoints.patron ?? "path:\\s*[\"'`]([^\"'`]+)[\"'`]", "g");
  const declarados = [...readFileSync(archivo, "utf8").matchAll(re)].map((m) => m[1]);
  const fuente = fuentesApi().map((f) => readFileSync(f, "utf8")).join("\n");
  for (const ruta of declarados) {
    const ancla = ruta.split("/").filter((s) => s && !s.startsWith(":")).pop();
    if (ancla && !fuente.includes(ancla)) errores.push(`Contrato: la ruta «${ruta}» no aparece en ${cfg.api}/src.`);
  }
}

// ── 4 · eventos emitidos fuera de la unión del contrato ─────────────────────

function comprobarEventos() {
  const archivo = join(API, C.eventos.archivo);
  if (!existsSync(archivo)) return;
  const texto = readFileSync(archivo, "utf8");
  const declarados = new Set([...texto.matchAll(/type:\s*["'`]([a-z0-9.\-_]+)["'`]/gi)].map((m) => m[1]));
  for (const extra of C.eventos.senales ?? []) declarados.add(extra);
  if (!declarados.size) return;
  const emisor = new RegExp(C.eventos.emisor ?? "\\.emit\\(\\s*[\"'`]([a-z0-9.\\-_]+)[\"'`]", "gi");
  for (const f of fuentesApi())
    for (const m of readFileSync(f, "utf8").matchAll(emisor))
      if (!declarados.has(m[1])) errores.push(`${rel(f)}: emite «${m[1]}», que no está en ${C.eventos.archivo}.`);
  const apps = fuentesApps([".ts", ".tsx", ".js", ".jsx"]).map((f) => readFileSync(f, "utf8")).join("\n");
  for (const ev of declarados) if (APPS.length && !apps.includes(ev)) avisos.push(`Evento «${ev}»: ninguna app lo escucha.`);
}

// ── 5 · sondeo en las apps ───────────────────────────────────────────────────

function comprobarSondeo() {
  const re = new RegExp(C.sondeo.patron ?? "\\b(refetchInterval|refetchIntervalInBackground|setInterval)\\s*[(:]");
  porLinea(fuentesApps([".ts", ".tsx", ".js", ".jsx"]), (linea, donde) => {
    if (linea.includes("contracts-allow-interval") || !re.test(linea)) return;
    errores.push(`${donde}: sondeo. Los datos se refrescan con eventos, no con un temporizador.`);
  });
}

// ── 6 · colores de marca escritos a mano ─────────────────────────────────────

function comprobarColores() {
  const colores = C.colores.map((c) => c.toLowerCase());
  porLinea(fuentesApps([".ts", ".tsx", ".css"]), (linea, donde) => {
    if (linea.includes("contracts-allow-color")) return;
    const c = colores.find((x) => linea.toLowerCase().includes(x));
    if (c) errores.push(`${donde}: color de marca «${c}» escrito a mano. Usa el token.`);
  });
}

// ── 7 · las clases de la librería de UI, dentro del escaneo de estilos ──────

function comprobarEscaneo() {
  const p = PAQ[C.escaneo.paquete];
  if (!p) return;
  const re = new RegExp(C.escaneo.patron ?? `@source\\s+["'][^"']*${p.nombre.replace("/", "\\/")}`);
  for (const app of APPS) {
    if (!depDe(app, p.nombre)) continue;
    const declara = archivosBajo(join(app, "src"), [".css"]).some((h) => re.test(readFileSync(h, "utf8")));
    if (!declara) errores.push(`${rel(app)}: consume ${p.nombre} pero ninguna hoja lo incluye en el escaneo de estilos.`);
  }
}

// ── 8 · dinero tipado como número ────────────────────────────────────────────
// Mira NOMBRES DE CAMPO del código, en el idioma del código (por defecto inglés). La lista de
// hu/config.json → dinero mira otra cosa: el título de las historias, en el idioma de la
// documentación. Cada una se amplía según el dominio: aquí con comprobaciones.dinero.palabras.

function comprobarDinero() {
  const palabras = new RegExp(C.dinero.palabras ?? "(amount|price|balance|earning|commission|total|subtotal|fee|refund|payout|debt|gross|tariff|cost)", "i");
  const noDinero = new RegExp(C.dinero.sufijosNoDinero ?? "(count|orders?|pages?|items?|records?|rows?|ms|millis|seconds?|minutes?|hours?|days?|km|meters?|percent|index|size|length|attempts?|retries|version)$", "i");
  const campo = /\b([A-Za-z_$][A-Za-z0-9_$]*)\s*\??\s*:\s*number\b/g;
  const archivos = [...archivosBajo(join(API, "src"), [".ts"]), ...Object.values(PAQ).flatMap((p) => archivosBajo(join(API, p.carpeta, "src"), [".ts"])), ...fuentesApps([".ts", ".tsx"])];
  porLinea([...new Set(archivos)], (linea, donde) => {
    if (linea.includes("contracts-ignore-money")) return;
    for (const m of linea.matchAll(campo))
      if (palabras.test(m[1]) && !noDinero.test(m[1]))
        errores.push(`${donde}: «${m[1]}» es un importe tipado como number. El dinero cruza la frontera como string decimal.`);
  });
}

// ── 9 · campos que nunca llegan a un rol restringido ─────────────────────────

function comprobarRecorte() {
  const { archivo, constante, app, eventos } = C.recorte;
  const lista = join(API, archivo);
  if (!existsSync(lista)) return;
  const decl = readFileSync(lista, "utf8").match(new RegExp(`${constante}\\s*=\\s*\\[([^\\]]*)\\]`));
  if (!decl) { errores.push(`${rel(lista)} no declara ${constante}.`); return; }
  const prohibidos = [...decl[1].matchAll(/["'`]([A-Za-z0-9_$]+)["'`]/g)].map((m) => m[1]);
  porLinea(archivosBajo(join(RAIZ, app, "src"), [".ts", ".tsx"]), (linea, donde) => {
    const n = prohibidos.find((x) => new RegExp(`\\b${x}\\b`).test(linea));
    if (n) errores.push(`${donde}: la app del rol restringido menciona «${n}».`);
  });
  if (eventos && existsSync(join(API, eventos)))
    porLinea([join(API, eventos)], (linea, donde) => {
      const n = prohibidos.find((x) => new RegExp(`(^|[^\\w.])${x}\\s*\\??\\s*:`).test(linea));
      if (n) errores.push(`${donde}: un evento declara «${n}», que no puede llegar al rol restringido.`);
    });
}

// ── ejecución ────────────────────────────────────────────────────────────────

const COMPROBACIONES = [
  ["versiones", comprobarVersiones], ["versionUnica", comprobarVersionUnica],
  ["versionDelPaquete", comprobarVersionDelPaquete], ["dist", comprobarDist],
  ["endpoints", comprobarEndpoints], ["eventos", comprobarEventos], ["sondeo", comprobarSondeo],
  ["colores", comprobarColores], ["escaneo", comprobarEscaneo], ["dinero", comprobarDinero],
  ["recorte", comprobarRecorte],
];

function check() {
  if (!cfg) { console.log("Sin bloque «contratos» en .metodo/gates.config.json: nada que comprobar."); return; }
  if (!existsSync(API)) { console.log(`${cfg.api} todavía no existe: nada que comprobar.`); return; }
  for (const [clave, fn] of COMPROBACIONES) if (C[clave]) fn();
  for (const a of avisos) console.warn(`  aviso · ${a}`);
  if (errores.length) {
    console.error(`\n${errores.length} problema(s) de contrato:\n`);
    for (const e of errores) console.error(`  · ${e}`);
    console.error("");
    process.exit(1);
  }
  console.log(`Contratos en orden.${avisos.length ? ` ${avisos.length} aviso(s).` : ""}`);
}

const [comando] = process.argv.slice(2);
try {
  if (comando === "check" || comando === undefined) check();
  else throw new Error(`Comando desconocido «${comando}». Usa check.`);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
