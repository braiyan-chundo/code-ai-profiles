#!/usr/bin/env node
// Migra un proyecto de la metodología v3 a la v4, sin perder historia. Ver migracion-v3.md.
//
//   node <metodologia4>/plantillas/scripts/migrar-v3.mjs --destino . --simular   el plan y la config propuesta
//   node <metodologia4>/plantillas/scripts/migrar-v3.mjs --destino . --aplicar   mueve (git mv) y escribe la config
//
// Después de --aplicar: revisar .metodo/config.json y correr metodo.mjs iniciar (copia la metodología,
// los scripts, y genera agentes, comandos y hooks). Solo Node estándar.

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, renameSync, statSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { execSync } from "node:child_process";
import { AQUI, leerJSON } from "./lib.mjs";

const args = process.argv.slice(2);
const i = args.indexOf("--destino");
const RAIZ = resolve(i !== -1 ? args[i + 1] : ".");
const APLICAR = args.includes("--aplicar");
const PLANTILLAS = resolve(AQUI, "..");

const hayGit = (() => { try { execSync("git rev-parse --git-dir", { cwd: RAIZ, stdio: "ignore" }); return true; } catch { return false; } })();
const plan = [];   // [origen, destino]
const notas = [];

function mover(o, d) { if (existsSync(join(RAIZ, o))) plan.push([o, d]); }
const slugDe = (t) => String(t ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "historia";

// ── 1 · leer la v3 ───────────────────────────────────────────────────────────

if (!existsSync(join(RAIZ, "AGENTS.md"))) throw new Error(`No parece un proyecto v3: falta AGENTS.md en ${RAIZ}`);
if (existsSync(join(RAIZ, ".metodo", "config.json")) && !args.includes("--forzar")) throw new Error("Ya hay .metodo/config.json: el proyecto ya está en v4 (o a medio migrar). --forzar para repetir.");
const M = leerJSON(join(RAIZ, "marcadores.json"), {});
const HC = leerJSON(join(RAIZ, "hu", "config.json"), {});
if (!Object.keys(M).length) notas.push("No hay marcadores.json: la config propuesta sale de hu/config.json y valores por defecto; revísala con cuidado.");

// ── 2 · proponer la config ───────────────────────────────────────────────────

const base = leerJSON(join(PLANTILLAS, "config", "config.json"));
// Los gates del hook de la v3 que usan scripts propios (no los de la metodología) siguen como gates del proyecto.
const gatesV3 = leerJSON(join(RAIZ, ".claude", "hooks", "gates.json"), {})?.comandos ?? [];
const gatesPropios = gatesV3
  .filter((g) => /scripts\/[\w.-]+/.test(g.comando ?? "") && !/scripts\/(hu|alcance|grafo)\.mjs/.test(g.comando) && !(M.SI_GATE_CONTRATOS && /contracts\.mjs/.test(g.comando)))
  .map((g) => ({ nombre: g.nombre ?? g.comando, comando: g.comando, cuando: "codigo", nivel: "bloqueo" }));
let nApp = 0;
const repos = (M.REPOS_JSON ?? HC.repos ?? []).map((n) => {
  const esApi = /api|server|backend/.test(n);
  if (esApi) return { nombre: n, ruta: n, tipo: "api", ...(M.PUERTO_API ? { puerto: Number(M.PUERTO_API) } : {}) };
  nApp += 1;
  const dev = M[`PUERTO_DEV_APP_${nApp}`], comp = M[`PUERTO_COMPILADA_APP_${nApp}`];
  return { nombre: n, ruta: n, tipo: "app", ...(dev ? { puerto: Number(dev) } : {}), ...(comp ? { puertoCompilada: Number(comp) } : {}) };
});
// El motor, normalizado («mongodb 8.0 en replica set» → mongodb), y los packs del stack que se reconozca.
const motorTexto = String(M.MOTOR ?? "").toLowerCase();
const motor = /mongo/.test(motorTexto) ? "mongodb" : /postgres/.test(motorTexto) ? "postgres" : /mysql|maria/.test(motorTexto) ? "mysql" : /sqlite/.test(motorTexto) ? "sqlite" : motorTexto.split(/[^a-z0-9]/)[0];
const textoStack = [M.FRAMEWORK, M.STACK_DE_APPS, M.HERRAMIENTAS, ...["docs/architecture/stack.md", "AGENTS.md"].map((p) => existsSync(join(RAIZ, p)) ? readFileSync(join(RAIZ, p), "utf8") : "")].join(" ");
const packs = [
  ...(/nest/i.test(textoStack) ? ["backend-nestjs"] : []),
  ...(/react|vite/i.test(textoStack) ? ["frontend-react-vite"] : []),
  ...(motor ? [`persistencia-${motor}`] : []),
  ...(M.SI_HAY_DINERO ? ["dinero"] : []), ...(M.SI_COLAS ? ["eventos", ...(/bullmq/i.test(textoStack) ? ["colas-bullmq"] : [])] : []),
  ...(M.SI_TIEMPO_REAL || M.SI_SIN_CONEXION ? ["tiempo-real"] : []), ...(M.SI_GATE_CONTRATOS ? ["contratos"] : []),
];
const grande = M.SI_HAY_DINERO || M.SI_GATE_CONTRATOS || repos.length > 2;
const perfil = grande ? "L" : "M";
const ajustes = {};
const modo = String(M.MODO ?? M.DECISION_7 ?? "fase a fase").toLowerCase();
const modoV4 = modo.includes("bloque") ? "bloque" : modo.includes("construir") ? "construir-todo" : "fase-a-fase";
if (modoV4 !== "fase-a-fase") ajustes.modo = modoV4;
const sellado = existsSync(join(RAIZ, "docs", "product", "alcance-sellado.json"));
if (perfil === "M" && sellado) ajustes.alcance = "sellado";
if (perfil === "L" && !sellado) ajustes.alcance = "lista-viva";
if (perfil === "M" && M.SI_GRAFO) ajustes.grafo = "graphify";
if (M.SI_HAY_INTERFAZ === false) {
  const p = leerJSON(join(PLANTILLAS, "config", "perfiles.json")).perfiles[perfil];
  ajustes.agentes = p.agentes.filter((r) => r !== "product-design" && r !== "frontend");
  ajustes.diseno = "off";
}
const comandos = {};
for (const r of repos) comandos[r.nombre] = { tipos: M.CMD_TYPECHECK ?? "", build: M.CMD_BUILD ?? "", relacionadas: "", suite: M.CMD_TEST ?? "" };

const config = {
  ...base,
  $comentario: `Propuesta de migrar-v3.mjs el ${new Date().toLocaleDateString("sv-SE")}. Revísala antes de metodo.mjs iniciar (migracion-v3.md, paso 3).`,
  proyecto: { nombre: M.PROYECTO ?? "<nombre>", slug: M.PROYECTO_SLUG ?? "<slug>", resumen: M.RESUMEN ?? "",
    idiomas: { interfaz: M.IDIOMA_INTERFAZ ?? "español", codigo: M.IDIOMA_CODIGO ?? "inglés", documentacion: M.IDIOMA_DOCUMENTACION ?? "español" } },
  figuras: { aprueba: M.PERSONA_USUARIA ?? "", metodo: M.QUIEN_DECIDE_EL_METODO ?? "", salidas: M.AUTORIZA_SALIDAS ?? M.PERSONA_USUARIA ?? "",
    cliente: M.CLIENTE ?? "", canal: M.CANAL_DE_APROBACION ?? "directo, en la conversación con Claude" },
  perfil, fase: "desarrollo", ajustes,
  rasgos: { interfaz: M.SI_HAY_INTERFAZ !== false, variasApps: Boolean(M.SI_HAY_VARIAS_APPS), dinero: Boolean(M.SI_HAY_DINERO),
    datosPersonales: Boolean(M.SI_ROL_RESTRINGIDO), tiempoReal: Boolean(M.SI_TIEMPO_REAL), colas: Boolean(M.SI_COLAS),
    sinConexion: Boolean(M.SI_SIN_CONEXION), lienzo: Boolean(M.SI_LIENZO), ...(M.RUTA_LIENZO ? { rutaLienzo: M.RUTA_LIENZO } : {}),
    paqueteDeContratos: Boolean(M.SI_GATE_CONTRATOS) },
  repos,
  stack: { gestor: M.GESTOR_DE_PAQUETES ?? "pnpm", motor: motor || "<motor>", packs, comandos },
  ...(gatesPropios.length ? { gatesPropios } : {}),
  alcance: { archivo: `docs/producto/${M.NOMBRE_ANEXO ?? (HC.anexo ?? "anexo-alcance.md").split("/").pop()}`, nombre: M.NOMBRE_DEL_ALCANCE ?? HC.nombreDelAlcance ?? "alcance",
    contrato: M.CONTRATO ?? "", clausula: M.CLAUSULA_DE_CAMBIO ?? "", entregas: M.ENTREGAS_JSON ?? HC.entregas ?? [1], areas: M.AREAS_JSON ?? HC.areas ?? ["fundacional"] },
};
for (const r of repos) if (!comandos[r.nombre].relacionadas) notas.push(`stack.comandos.${r.nombre}.relacionadas está vacío: complétalo (pruebas solo de {archivos}).`);

// ── 4 · reestructurar hu/ ────────────────────────────────────────────────────

const FASES = { requirements: "requisitos", architecture: "arquitectura", design: "diseno", implementation: "implementacion", verification: "verificacion", documentation: "cierre", closure: "cierre" };
const historias = existsSync(join(RAIZ, "hu")) ? readdirSync(join(RAIZ, "hu")).filter((f) => /^HU-\d{4}\.md$/.test(f)) : [];
const traducciones = []; // [rutaNueva, texto]
for (const f of historias) {
  const id = f.replace(".md", "");
  const texto = readFileSync(join(RAIZ, "hu", f), "utf8");
  const titulo = (texto.match(/^title:\s*(.+)$/m) ?? [])[1]?.trim();
  const carpeta = `hu/${id}-${slugDe(titulo)}`;
  mover(`hu/${f}`, `${carpeta}/hu.md`);
  for (const [rolV3, rolV4] of [["backend", "backend"], ["frontend", "frontend"], ["design", "diseno"]]) mover(`hu/briefs/${id}-${rolV3}.md`, `${carpeta}/briefs/${rolV4}.md`);
  mover(`hu/design/${id}.html`, `${carpeta}/diseno/maqueta.html`);
  mover(`hu/design/${id}.md`, `${carpeta}/diseno/vista.md`);
  mover(`hu/qa/${id}.md`, `${carpeta}/verificacion.md`);
  if (existsSync(join(RAIZ, "hu", "qa", "evidencia", id))) mover(`hu/qa/evidencia/${id}`, `${carpeta}/diseno/capturas`);
  // frontmatter v3 → v4
  let t = texto.replace(/^---\n([\s\S]*?)\n---\n/, (_, fm) => {
    let x = fm
      .replace(/^title:/m, "titulo:").replace(/^status:/m, "estado:").replace(/^priority:/m, "prioridad:")
      .replace(/^created_at:/m, "creada:").replace(/^contrato:/m, "alcance:").replace(/^depends_on:/m, "depende:")
      .replace(/^phase:\s*(\w+)/m, (__, p) => `fase: ${FASES[p] ?? p}`)
      .replace(/^requires:\s*\{([^}]*)\}/m, (__, r) => `requiere: {${r.replace(/architecture/g, "arquitectura").replace(/design/g, "diseno")}}`);
    if (!/^reglas:/m.test(x)) x += "\nreglas: []";
    if (!/^riesgo:/m.test(x)) x += "\nriesgo: []";
    x += "\nmigrada: v3";
    return `---\n${x}\n---\n`;
  });
  traducciones.push([`${carpeta}/hu.md`, t, `${carpeta}/seguimiento.md`, id, titulo]);
}

// Lo que queda en hu/design, hu/qa y hu/briefs sin patrón HU-#### (lienzos, ajustes por vía directa).
const yaMovido = new Set(plan.map(([o]) => o));
for (const [carpetaV3, destino] of [["hu/design", "docs/diseno/heredado"], ["hu/qa", "docs/archivo/metodo-v3/hu-qa"], ["hu/briefs", "docs/archivo/metodo-v3/hu-briefs"]]) {
  if (!existsSync(join(RAIZ, carpetaV3))) continue;
  for (const f of readdirSync(join(RAIZ, carpetaV3))) {
    const o = `${carpetaV3}/${f}`;
    if (!yaMovido.has(o) && !(f === "evidencia" && carpetaV3 === "hu/qa")) mover(o, `${destino}/${f}`);
  }
}

// ── 6-8 · docs, scripts, metodología v3, reglas propias ─────────────────────

for (const [o, d] of [["docs/product", "docs/producto"], ["docs/architecture", "docs/arquitectura"], ["docs/operations", "docs/operaciones"], ["docs/decisions", "docs/decisiones"]]) mover(o, d);
const ARCHIVO = "docs/archivo/metodo-v3";
for (const o of ["hu/index.md", "hu/TEMPLATE.md", "hu/config.json", "docs/templates", "metodologia", "marcadores.json"]) mover(o, `${ARCHIVO}/${o.replace(/\//g, "__")}`);
// Solo se archivan los scripts que eran de la v3; los propios del proyecto se quedan en scripts/.
const DE_LA_V3 = ["hu.mjs", "alcance.mjs", "grafo.mjs", "arranque.mjs", "gates.config.json", "hu.config.json", ...(M.SI_GATE_CONTRATOS ? ["contracts.mjs"] : [])];
const propios = [];
if (existsSync(join(RAIZ, "scripts"))) for (const f of readdirSync(join(RAIZ, "scripts"))) {
  if (DE_LA_V3.includes(f)) mover(`scripts/${f}`, `${ARCHIVO}/scripts/${f}`);
  else propios.push(f);
}
if (propios.length) notas.push(`Scripts propios del proyecto que se quedan en scripts/: ${propios.join(", ")}.`);
const reglas = [];
const dirAgentes = join(RAIZ, ".claude", "agents");
if (existsSync(dirAgentes)) for (const f of readdirSync(dirAgentes).filter((x) => x.endsWith(".md"))) {
  const t = readFileSync(join(dirAgentes, f), "utf8");
  const m = t.match(/\n## Reglas del proyecto\n([\s\S]*?)(?=\n## |$)/);
  if (m) reglas.push([`.metodo/reglas/${f}`, `# Reglas propias de ${f.replace(".md", "")} (migradas de la v3; revísalas)\n\n${m[1].trim()}\n`]);
  mover(`.claude/agents/${f}`, `${ARCHIVO}/agents/${f}`);
}

// ── 9 · skills del proyecto con nombre de rol → nombre del pack ──────────────

const slug = M.PROYECTO_SLUG;
const renombres = []; // [carpeta vieja, carpeta nueva, nombre nuevo]
if (slug && existsSync(join(RAIZ, ".claude", "skills"))) {
  const destinoDe = { backend: packs.find((p) => p.startsWith("backend-")), frontend: packs.find((p) => p.startsWith("frontend-")), persistencia: packs.find((p) => p.startsWith("persistencia-")) };
  for (const [tipo, pack] of Object.entries(destinoDe)) {
    const viejo = `.claude/skills/${slug}-${tipo}`;
    const nuevo = `.claude/skills/${slug}-${pack}`;
    if (pack && existsSync(join(RAIZ, viejo)) && !existsSync(join(RAIZ, nuevo))) { mover(viejo, nuevo); renombres.push([viejo, nuevo, `${slug}-${pack}`]); }
  }
}
// Si la v3 tenía sistema de diseño aprobado, la fundación ya existe: guias.md nace aprobada.
const sistemaV3 = ["docs/architecture/sistema-de-diseno.md", `.claude/skills/${slug}-diseno/SKILL.md`].find((p) => existsSync(join(RAIZ, p)));
const guiasHeredadas = M.SI_HAY_INTERFAZ !== false && sistemaV3 && !existsSync(join(RAIZ, "docs", "diseno", "guias.md"));

// Las rutas escritas como TEXTO (en comandos, tablas, prosa): `node scripts/hu.mjs check`, `metodologia/arnes.md`,
// `docs/product/…`. Lo archivado de la v3 apunta a su equivalente en la v4, no al archivo.
const EQUIVALENTES = [
  ["scripts/hu.mjs", ".metodo/scripts/hu.mjs"], ["scripts/alcance.mjs", ".metodo/scripts/alcance.mjs"],
  ["scripts/grafo.mjs", ".metodo/scripts/grafo.mjs"], ["scripts/arranque.mjs", ".metodo/scripts/metodo.mjs"],
  ...(M.SI_GATE_CONTRATOS ? [["scripts/contracts.mjs", ".metodo/scripts/contracts.mjs"]] : []),
  ["scripts/gates.config.json", ".metodo/gates.config.json"], ["hu/index.md", "hu/INDEX.md"],
  ["hu/TEMPLATE.md", ".metodo/metodologia/plantillas/docs/hu.md"], ["docs/templates/", ".metodo/metodologia/plantillas/docs/"],
  ["metodologia/", ".metodo/metodologia/"], [".claude/hooks/gates.json", ".metodo/config.json"],
];
function rutasEnTexto(texto) {
  const pares = [...EQUIVALENTES, ...plan.filter(([, d]) => !d.startsWith("docs/archivo/"))]
    .filter(([o]) => !EQUIVALENTES.some(([e]) => e !== o && o === e))
    .sort((a, b) => b[0].length - a[0].length);
  const destino = new Map(pares);
  const escapar = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Una carpeta («metodologia/») va seguida de su contenido; un archivo o una carpeta sin barra, de un límite.
  const partes = pares.map(([o]) => (o.endsWith("/") ? escapar(o) : `${escapar(o)}(?![\\w-])`));
  const re = new RegExp(`(?<![\\w./-])(?:${partes.join("|")})`, "g");
  return pares.length ? texto.replace(re, (o) => destino.get(o) ?? o) : texto;
}

// Reescribe los enlaces de los .md según lo movido: cada enlace se resuelve contra la ubicación vieja del
// archivo y se lleva a la nueva del destino. Solo se toca un enlace si su destino existe tras mover.
function reescribirEnlaces() {
  const mapa = plan.map(([o, d]) => [o, d]).sort((a, b) => b[0].length - a[0].length);
  const nuevoDe = (rel) => { for (const [o, d] of mapa) if (rel === o || rel.startsWith(o + "/")) return d + rel.slice(o.length); return rel; };
  const viejoDe = (rel) => { for (const [o, d] of [...mapa].sort((a, b) => b[1].length - a[1].length)) if (rel === d || rel.startsWith(d + "/")) return o + rel.slice(d.length); return rel; };
  const mds = [];
  (function recorrer(dir) {
    for (const f of readdirSync(join(RAIZ, dir))) {
      const rel = dir ? `${dir}/${f}` : f;
      if ([".git", "node_modules", ".metodo"].includes(f)) continue;
      if (statSync(join(RAIZ, rel)).isDirectory()) { if (!dir && !["hu", "docs", ".claude"].includes(f)) continue; if (rel === "docs/archivo") continue; recorrer(rel); }
      else if (f.endsWith(".md")) mds.push(rel);
    }
  })("");
  let cambiados = 0;
  for (const rel of mds) {
    const viejo = viejoDe(rel);
    const texto = readFileSync(join(RAIZ, rel), "utf8");
    const nuevoTexto = texto.replace(/\]\(([^)\s]+)\)/g, (todo, destino) => {
      if (/^(https?:|mailto:|#)/.test(destino)) return todo;
      const [ruta, ancla] = destino.split("#");
      const relViejo = relative(RAIZ, resolve(RAIZ, dirname(viejo), ruta)).split("\\").join("/");
      const relNuevo = nuevoDe(relViejo);
      if (!existsSync(join(RAIZ, relNuevo))) return todo;
      const enlace = relative(join(RAIZ, dirname(rel)), join(RAIZ, relNuevo)).split("\\").join("/") || ".";
      return `](${enlace}${ancla !== undefined ? "#" + ancla : ""})`;
    });
    const conRutas = rutasEnTexto(nuevoTexto);
    if (conRutas !== texto) { writeFileSync(join(RAIZ, rel), conRutas); cambiados++; }
  }
  return cambiados;
}

// ── salida ───────────────────────────────────────────────────────────────────

console.log(`Proyecto v3 en ${RAIZ}${hayGit ? " (git: se usará git mv)" : " (sin git: se renombra)"}\n`);
console.log(`Config propuesta: perfil ${perfil}${Object.keys(ajustes).length ? `, ajustes ${JSON.stringify(ajustes)}` : ""}, ${repos.length} repo(s), packs: ${packs.join(", ") || "—"}`);
console.log(`Historias: ${historias.length} · movimientos: ${plan.length} · reglas propias extraídas: ${reglas.length}\n`);
for (const [o, d] of plan) console.log(`  ${o}  →  ${d}`);
for (const n of notas) console.log(`\n  nota · ${n}`);

if (!APLICAR) {
  console.log("\n(simulación: no se cambió nada. --aplicar para hacerlo; árbol limpio y en una rama, migracion-v3.md)");
  process.exit(0);
}
for (const [o, d] of plan) {
  mkdirSync(dirname(join(RAIZ, d)), { recursive: true });
  if (hayGit) {
    try { execSync(`git mv "${o}" "${d}"`, { cwd: RAIZ, stdio: "pipe" }); continue; } catch { /* sin seguir: se renombra */ }
  }
  renameSync(join(RAIZ, o), join(RAIZ, d));
}
const hoy = new Date().toLocaleDateString("sv-SE");
for (const [ruta, texto, seg, id, titulo] of traducciones) {
  writeFileSync(join(RAIZ, ruta), texto);
  if (!existsSync(join(RAIZ, seg)))
    writeFileSync(join(RAIZ, seg), `# Bitácora · ${id} · ${titulo}\n\n| Fecha | Quién | Qué |\n| --- | --- | --- |\n| ${hoy} | migrar-v3.mjs | migrada desde la metodología v3 |\n`);
}
for (const [, nuevo, nombre] of renombres) {
  const p = join(RAIZ, nuevo, "SKILL.md");
  if (existsSync(p)) writeFileSync(p, readFileSync(p, "utf8").replace(/^name:.*$/m, `name: ${nombre}`));
}
if (guiasHeredadas) {
  mkdirSync(join(RAIZ, "docs", "diseno"), { recursive: true });
  writeFileSync(join(RAIZ, "docs", "diseno", "guias.md"), `# Guías de diseño\n\n> Estado: **aprobada** (heredada de la v3, ${hoy}). La fundación de diseño ya existía: ` +
    `ver ${sistemaV3.replace("docs/architecture/", "../arquitectura/")}. Completa aquí los niveles de vista y patrones (diseno.md §4) cuando haga falta.\n`);
}
const enlaces = reescribirEnlaces();
mkdirSync(join(RAIZ, ".metodo", "reglas"), { recursive: true });
for (const [ruta, texto] of reglas) writeFileSync(join(RAIZ, ruta), rutasEnTexto(texto));
writeFileSync(join(RAIZ, ".metodo", "config.json"), JSON.stringify(config, null, 2) + "\n");
console.log(`\nEnlaces y rutas reescritos en ${enlaces} documento(s) (docs/archivo/ no se toca).${renombres.length ? ` Skills renombradas al pack: ${renombres.map(([v, n]) => `${v.split("/").pop()} → ${n.split("/").pop()}`).join(", ")}.` : ""}${guiasHeredadas ? " docs/diseno/guias.md creada como aprobada (fundación heredada)." : ""}${gatesPropios.length ? ` Gates propios: ${gatesPropios.map((g) => g.nombre).join(", ")}.` : ""}`);
console.log(`\nHecho. Siguiente (migracion-v3.md):
  1. Revisa .metodo/config.json (perfil, ajustes, nombres y colores de los agentes, comandos de pruebas).
  2. Revisa .metodo/reglas/ (lo propio de cada agente v3).
  3. node "${join(PLANTILLAS, "scripts", "metodo.mjs")}" iniciar --destino .
  4. node .metodo/scripts/hu.mjs index && node .metodo/scripts/hu.mjs check
  5. node .metodo/scripts/config.mjs check --todo   (lo que encuentre va a la historia «Adopción v4»)`);
