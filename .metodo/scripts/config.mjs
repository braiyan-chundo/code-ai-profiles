#!/usr/bin/env node
// Gate fijo: ninguna clave, token, URL ni lectura suelta del entorno en el código.
// Ver configuracion-del-codigo.md. Aplica en todos los perfiles y no se apaga.
//
//   node .metodo/scripts/config.mjs check                 lo que cambió (git status) en cada repo
//   node .metodo/scripts/config.mjs check --staged        lo que entra en el commit (pre-commit)
//   node .metodo/scripts/config.mjs check --todo          todo el código seguido por git
//   node .metodo/scripts/config.mjs check <archivo>...    esos archivos
//   node .metodo/scripts/config.mjs catalogo              .env.example contra los módulos de configuración
//   node .metodo/scripts/config.mjs probar                comprueba que el gate detecta un fallo provocado
//
// Una excepción real va en config.codigo.excepcionesUrl o con «metodo:permitir <motivo>» en la línea
// de encima. Exporta revisarTexto() para la guarda (hook PreToolUse). Solo Node estándar.

import { readFileSync, existsSync } from "node:fs";
import { join, relative, basename, extname, resolve, sep, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { execSync } from "node:child_process";
import { raizDelProyecto, leerConfig, cambiados, seguidos } from "./lib.mjs";

// ── reglas ───────────────────────────────────────────────────────────────────

export const SECRETOS = [
  ["clave de Stripe", /\b(?:sk|rk)_(?:live|test)_[0-9a-zA-Z]{10,}/],
  ["clave pública live de Stripe", /\bpk_live_[0-9a-zA-Z]{10,}/],
  ["secreto de webhook", /\bwhsec_[A-Za-z0-9]{10,}/],
  ["clave de AWS", /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
  ["token de GitHub", /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})/],
  ["token de Slack", /\bxox[baprs]-[A-Za-z0-9-]{10,}/],
  ["clave de Google", /\bAIza[0-9A-Za-z\-_]{35}\b/],
  ["JWT", /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ["clave privada", /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/],
  ["cadena de conexión con contraseña", /\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|redis|rediss|amqps?|mssql):\/\/[^\s:@/'"`]+:[^\s@/'"`]+@/],
  ["secreto asignado como texto", /\b[\w.]*(?:token|secret|secreto|api[_-]?key|apikey|access[_-]?key|password|passwd|clave|contrasena|private[_-]?key)\w*["']?\s*[:=]\s*["'`][A-Za-z0-9_\-+/=.]{12,}["'`]/i],
];

const URL = /(?:https?|wss?):\/\/[^\s'"`)<>\]]+/g;

const LECTURAS = [
  /\bprocess\.env\b/, /\bimport\.meta\.env\b/, /\bos\.environ\b/, /\bos\.getenv\s*\(/,
  /\bDeno\.env\b/, /\bBun\.env\b/, /\bSystem\.getenv\s*\(/, /\bPlatform\.environment\b/,
  /\bENV\[/, /(?<![\w.])getenv\s*\(/, /\bEnvironment\.GetEnvironmentVariable\s*\(/,
];

const PREFIJOS_PUBLICOS = ["VITE_", "NEXT_PUBLIC_", "NUXT_PUBLIC_", "PUBLIC_", "EXPO_PUBLIC_", "REACT_APP_", "GATSBY_"];
const INTEGRADAS = new Set(["NODE_ENV", "MODE", "DEV", "PROD", "SSR", "BASE_URL", "CI", "TZ", "PORT", "HOST", "HOSTNAME", "PATH", "HOME"]);

const POR_DEFECTO = {
  enlaces: "archivo",
  archivoDeEnlaces: ["config/enlaces", "config/links"],
  // localhost NO es excepción: la URL de la API en desarrollo es justo lo que no se escribe a mano.
  excepcionesUrl: ["http://www.w3.org/", "https://www.w3.org/"],
  carpetasDePrueba: ["test", "tests", "__tests__", "e2e", "fixtures", "mocks", "__mocks__", "spec"],
  extensiones: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue", ".svelte", ".astro", ".py", ".go", ".rb", ".php", ".java", ".kt", ".swift", ".dart", ".cs"],
  modulos: [],
};
const FUERA = ["node_modules", "dist", "build", ".next", ".nuxt", ".output", "coverage", "vendor", ".venv", "venv", "__pycache__", ".git", ".metodo", ".claude", "hu", "docs", "graphify-out"];

// Las listas del proyecto se SUMAN a las de por defecto; los valores sueltos las reemplazan.
export function opciones(cfg) {
  const o = { ...POR_DEFECTO };
  for (const [k, v] of Object.entries(cfg?.codigo ?? {})) {
    if (Array.isArray(v) && Array.isArray(o[k])) o[k] = [...new Set([...o[k], ...v])];
    else if (k === "archivoDeEnlaces") o[k] = [...new Set([...POR_DEFECTO.archivoDeEnlaces, ...[v].flat()])];
    else o[k] = v;
  }
  return o;
}

const segmentos = (rel) => rel.split(/[\\/]/);

export function esCodigo(rel, o) {
  if (!o.extensiones.includes(extname(rel))) return false;
  return !segmentos(rel).some((s) => FUERA.includes(s));
}
export function esDePrueba(rel, o) {
  return segmentos(rel).some((s) => o.carpetasDePrueba.includes(s)) || /\.(test|spec)\.[a-z]+$/.test(rel) || /(^|\/)test_[^/]+\.py$/.test(rel);
}
export function esModuloDeConfig(rel, o) {
  const limpio = rel.split(sep).join("/");
  if (o.modulos.some((m) => limpio.endsWith(m) || limpio.includes(m.replace(/\.[^.]+$/, "")))) return true;
  const b = basename(rel).replace(/\.[^.]+$/, "");
  return ["config", "env", "settings", "configuration", "environment"].includes(b.toLowerCase());
}
export function esArchivoDeEnlaces(rel, o) {
  if (o.enlaces !== "archivo") return false;
  const sin = rel.split(sep).join("/").replace(/\.[^.]+$/, "");
  return [o.archivoDeEnlaces].flat().some((a) => sin.endsWith(a));
}

const esComentario = (l) => /^\s*(\/\/|#(?!!)|\*|\/\*|<!--|--\s)/.test(l);

// Revisa un texto como si fuera el archivo rel (relativo al proyecto). Devuelve hallazgos.
export function revisarTexto(texto, rel, cfg) {
  const o = opciones(cfg);
  if (!esCodigo(rel, o)) return [];
  const prueba = esDePrueba(rel, o);
  const modulo = esModuloDeConfig(rel, o);
  const enlaces = esArchivoDeEnlaces(rel, o);
  const lineas = texto.split("\n");
  const hallazgos = [];
  lineas.forEach((l, i) => {
    if (i > 0 && /metodo:permitir/.test(lineas[i - 1])) return;
    if (/metodo:permitir/.test(l)) return;
    if (!prueba) {
      for (const [nombre, re] of SECRETOS) if (re.test(l)) { hallazgos.push({ linea: i + 1, tipo: "secreto", detalle: nombre }); break; }
    }
    if (!prueba && !modulo && !enlaces && !esComentario(l)) {
      for (const m of l.matchAll(URL)) {
        const u = m[0];
        if (o.excepcionesUrl.some((x) => u.startsWith(x))) continue;
        hallazgos.push({ linea: i + 1, tipo: "url", detalle: u.slice(0, 80) });
      }
    }
    if (!prueba && !modulo && !esComentario(l)) {
      const re = LECTURAS.find((r) => r.test(l));
      if (re) hallazgos.push({ linea: i + 1, tipo: "lectura", detalle: l.trim().slice(0, 80) });
    }
  });
  return hallazgos;
}

export const QUE_HACER = {
  secreto: "a .env.local (y su ficha [SECRET] en .env.example); el código lo lee del módulo de configuración",
  url: "si cambia entre entornos (la API, un servicio): a una variable [PUBLICO] en el .env.example de la app, leída desde el módulo de configuración; si es un enlace fijo del negocio (WhatsApp, redes, términos): al archivo de enlaces (config/links o config/enlaces)",
  lectura: "lee el entorno solo desde el módulo de configuración de la app (config.*, settings.*) e importa desde ahí",
};

// ── catálogo ─────────────────────────────────────────────────────────────────

export function leerCatalogo(dir) {
  const ruta = join(dir, ".env.example");
  if (!existsSync(ruta)) return null;
  const vars = new Map();
  let ficha = [];
  for (const l of readFileSync(ruta, "utf8").split("\n")) {
    if (!l.trim()) { ficha = []; continue; } // la ficha es el comentario pegado a la variable
    if (/^\s*#/.test(l)) { ficha.push(l); continue; }
    const m = l.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=(.*)$/);
    if (m) {
      // La etiqueta que cuenta es la más cercana a la variable.
      const texto = [...ficha].reverse().find((x) => /\[(SECRET|PUBLICO)\]/.test(x)) ?? "";
      vars.set(m[1], { secreto: /\[SECRET\]/.test(texto), publico: /\[PUBLICO\]/.test(texto), valor: m[2].trim() });
    }
    ficha = [];
  }
  return vars;
}

const NOMBRES = [
  /process\.env\.([A-Z][A-Z0-9_]*)/g, /process\.env\[["']([A-Z][A-Z0-9_]*)["']\]/g, /import\.meta\.env\.([A-Z][A-Z0-9_]*)/g,
  /os\.environ\[["']([A-Z][A-Z0-9_]*)["']\]/g, /os\.(?:getenv|environ\.get)\(\s*["']([A-Z][A-Z0-9_]*)["']/g,
  /\benv\(\s*["']([A-Z][A-Z0-9_]*)["']/g, /getenv\(\s*["']([A-Z][A-Z0-9_]*)["']/g, /\$env\.([A-Z][A-Z0-9_]*)/g,
  /(?:^|[{,])\s*["']?([A-Z][A-Z0-9_]{2,})["']?\s*:/gm,   // claves de un esquema: z.object({ VITE_API_URL: z.string() })
];

// Un catálogo por sitio donde la app lee su entorno: la raíz y cada repo (Vite y Nest leen el .env de
// su propia carpeta). El módulo de configuración de un repo se compara con su catálogo y con el de la raíz.
// soloDirs: los repos cuyo catálogo se revisa (null = todos). En un commit o un turno solo se revisa lo que
// cambió: el catálogo tocado y el de los módulos de configuración tocados.
function revisarCatalogo(raiz, archivosDeCodigo, o, cfg, soloDirs = null) {
  const problemas = [];
  const avisos = [];
  const dirs = [...new Set([raiz, ...(cfg?.repos ?? []).map((r) => resolve(raiz, r.ruta))])];
  const catalogos = new Map();
  for (const d of dirs) { const c = leerCatalogo(d); if (c) catalogos.set(d, c); }
  if (!catalogos.size) { avisos.push(".env.example no existe todavía: el catálogo lo crea la historia fundacional en cada repo"); return { problemas, avisos }; }
  const suyoDe = (abs) => dirs.filter((d) => d !== raiz && abs.startsWith(d + sep)).sort((a, b) => b.length - a.length)[0] ?? raiz;
  const revisar = soloDirs ? new Set([...soloDirs, ...archivosDeCodigo.map(suyoDe)]) : null;
  for (const [d, cat] of catalogos) {
    if (revisar && !revisar.has(d)) continue;
    const donde = relative(raiz, join(d, ".env.example"));
    for (const [n, v] of cat) {
      if (!v.secreto && !v.publico) problemas.push(`${donde}: ${n} sin [SECRET] ni [PUBLICO] en su ficha`);
      if (v.secreto && PREFIJOS_PUBLICOS.some((p) => n.startsWith(p))) problemas.push(`${donde}: ${n} es [SECRET] pero su prefijo lo publica en el navegador`);
      if (v.secreto && v.valor && !/^["']?["']?$/.test(v.valor) && !/^<.*>$/.test(v.valor)) problemas.push(`${donde}: ${n} es [SECRET] y trae un valor; va vacío aquí`);
    }
  }
  for (const abs of archivosDeCodigo) {
    const rel = relative(raiz, abs);
    if (!esModuloDeConfig(rel, o) || esDePrueba(rel, o)) continue;   // la config de las pruebas no es la de la app
    const t = readFileSync(abs, "utf8");
    const leidas = new Set();
    for (const re of NOMBRES) for (const m of t.matchAll(re)) leidas.add(m[1]);
    const suyo = dirs.filter((d) => d !== raiz && abs.startsWith(d + sep)).sort((a, b) => b.length - a.length)[0];
    const validos = [catalogos.get(suyo), catalogos.get(raiz)].filter(Boolean);
    const dondeCat = relative(raiz, join(suyo ?? raiz, ".env.example"));
    for (const n of leidas) if (!INTEGRADAS.has(n) && !validos.some((c) => c.has(n))) problemas.push(`${n} se lee en ${rel} pero no está en ${dondeCat}`);
  }
  return { problemas, avisos };
}

function envSeguidos(raiz, dirs) {
  const salida = [];
  for (const d of dirs) for (const abs of seguidos(d)) {
    const b = basename(abs);
    if (/^\.env(\..+)?$/.test(b) && b !== ".env.example") salida.push(relative(raiz, abs));
  }
  return [...new Set(salida)];
}

// ── ejecución ────────────────────────────────────────────────────────────────

function dirsDeCodigo(raiz, cfg) {
  const ds = (cfg?.repos ?? []).map((r) => resolve(raiz, r.ruta));
  return ds.length ? [...new Set(ds)] : [raiz];
}

function gitleaks(dir, staged) {
  try { execSync("gitleaks version", { stdio: "ignore" }); } catch { return null; }
  try {
    execSync(`gitleaks ${staged ? "protect --staged" : "detect --no-git"} --no-banner -s .`, { cwd: dir, stdio: "pipe" });
    return "";
  } catch (e) {
    return String(e.stdout ?? "") + String(e.stderr ?? "");
  }
}

function main(argv) {
  const raiz = raizDelProyecto(argv);
  const cfg = leerConfig(raiz);
  const o = opciones(cfg);
  const args = argv.slice(2);
  const cmd = args[0];
  const iRepo = args.indexOf("--repo");
  const dirs = iRepo !== -1 ? [resolve(args[iRepo + 1])] : dirsDeCodigo(raiz, cfg);

  if (cmd === "probar") {
    const falso = ["const api = \"http://localhost:3000/v1\";", "const token = \"Kq1Zt7l1w8Wl6m0Wk8xYlQtt\";", "const k = process.env.API_KEY;", "const s = \"sk_live_" + "a1B2c3D4e5F6g7H8\";"].join("\n");
    const h = revisarTexto(falso, "src/servicios/api.ts", cfg);
    const tipos = new Set(h.map((x) => x.tipo));
    const ok = ["secreto", "url", "lectura"].every((t) => tipos.has(t));
    console.log(ok ? `El gate detecta el fallo provocado (${h.length} hallazgos: secreto, URL y lectura suelta).` : `FALLO: el gate no detectó todo (${[...tipos].join(", ") || "nada"}).`);
    process.exit(ok ? 0 : 1);
  }
  if (cmd !== "check" && cmd !== "catalogo") {
    console.error("Uso: config.mjs check [--staged | --todo | archivos…] [--repo <dir>] | catalogo | probar");
    process.exit(1);
  }

  const staged = args.includes("--staged");
  const todo = args.includes("--todo");
  const sueltos = args.slice(1).filter((a, i, arr) => !a.startsWith("--") && arr[i - 1] !== "--repo" && arr[i - 1] !== "--destino");
  const completo = todo || cmd === "catalogo";
  let tocados = [];
  if (sueltos.length) tocados = sueltos.map((a) => resolve(a));
  else for (const d of dirs) tocados.push(...((completo ? seguidos(d) : cambiados(d, { staged })) ?? []));
  tocados = [...new Set(tocados)].filter((abs) => existsSync(abs));
  const archivos = tocados.filter((abs) => esCodigo(relative(raiz, abs), o));

  const problemas = [];
  const avisos = [];
  if (cmd === "check") {
    for (const abs of archivos) {
      const rel = relative(raiz, abs);
      for (const h of revisarTexto(readFileSync(abs, "utf8"), rel, cfg))
        problemas.push(`${rel}:${h.linea} · ${h.tipo === "secreto" ? `posible ${h.detalle}` : h.tipo === "url" ? `URL fija ${h.detalle}` : `lectura suelta del entorno: ${h.detalle}`}\n      → ${QUE_HACER[h.tipo]}`);
    }
    for (const e of envSeguidos(raiz, dirs)) problemas.push(`${e} está seguido por git: solo .env.example se commitea (git rm --cached ${e})`);
    for (const d of dirs) {
      const g = gitleaks(d, staged);
      if (g) problemas.push(`gitleaks encontró secretos en ${relative(raiz, d) || "."}:\n${g.split("\n").slice(0, 12).map((l) => "      " + l).join("\n")}`);
    }
  }
  // El catálogo: completo con --todo o «catalogo»; si no, solo lo que se tocó (un catálogo o un módulo).
  const catalogosTocados = tocados.filter((abs) => basename(abs) === ".env.example").map((abs) => dirname(abs));
  const modulos = archivos.filter((abs) => esModuloDeConfig(relative(raiz, abs), o));
  if (completo || modulos.length || catalogosTocados.length) {
    const c = revisarCatalogo(raiz, modulos, o, cfg, completo ? null : catalogosTocados);
    problemas.push(...c.problemas);
    avisos.push(...c.avisos);
  }

  for (const a of avisos) console.warn(`  aviso · ${a}`);
  if (problemas.length) {
    console.error(`\nConfiguración en el código: ${problemas.length} problema(s) (configuracion-del-codigo.md):`);
    for (const p of problemas) console.error(`  · ${p}`);
    process.exit(1);
  }
  console.log(`Configuración fuera del código: en orden (${archivos.length} archivo(s) revisados).`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main(process.argv);
