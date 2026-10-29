#!/usr/bin/env node
// El método del proyecto: configuración, perfiles, fase y generación.
//
//   node .metodo/scripts/metodo.mjs validar              la combinación de diales tiene sentido
//   node .metodo/scripts/metodo.mjs efectivo             los diales que rigen y de dónde sale cada uno
//   node <metodologia>/plantillas/scripts/metodo.mjs talla repos=3 integraciones=2 dinero ...   el perfil que sale y sus diales
//   node <metodologia>/plantillas/scripts/metodo.mjs diales <S|M|L>                             los diales de un perfil, en una tabla
//   node <metodologia>/plantillas/scripts/metodo.mjs leer <documento> ["sección"]               una sección (sin sección, el índice)
//   node .metodo/scripts/metodo.mjs generar [--simular]  agentes, comandos, hooks, settings, AGENTS.md, skills
//   node .metodo/scripts/metodo.mjs perfil <S|M|L> [--simular] [--quitar-ajustes]
//   node .metodo/scripts/metodo.mjs fase <desarrollo|produccion> [--simular]
//   node .metodo/scripts/metodo.mjs estado
//   node <metodologia>/plantillas/scripts/metodo.mjs iniciar --destino . [--simular]
//
// generar NUNCA toca hu/, docs/, .metodo/reglas/ ni .env*. Lo que genera lleva una cabecera que lo dice.
// Solo Node estándar.

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, cpSync, renameSync, rmSync, statSync, chmodSync } from "node:fs";
import { join, dirname, relative, resolve, sep } from "node:path";
import { execSync } from "node:child_process";
import {
  raizDelProyecto, rutas, leerConfig, leerPerfiles, efectiva, validar, contexto, renderizar,
  marcadoresSinResolver, clave, packsDelProyecto, skillsPorRol, AQUI, leerJSON, git,
} from "./lib.mjs";

const args = process.argv.slice(2);
const SIMULAR = args.includes("--simular");
const RAIZ = raizDelProyecto();
let R = rutas(RAIZ);
const MARCA = "generado por metodo.mjs";

function escribir(destino, texto) {
  const ruta = join(RAIZ, destino);
  if (SIMULAR) return;
  mkdirSync(dirname(ruta), { recursive: true });
  writeFileSync(ruta, texto);
}

function cargar() {
  const cfg = leerConfig(RAIZ);
  if (!cfg) throw new Error(`No hay ${relative(RAIZ, R.config) || R.config}. En el arranque, Claude lo escribe desde plantillas/config/config.json (arranque.md, paso 7).`);
  return { cfg, perfiles: leerPerfiles(RAIZ) };
}

function informarValidacion(cfg, perfiles, { salirSiError = true } = {}) {
  const { errores, avisos } = validar(cfg, perfiles);
  for (const a of avisos) console.warn(`  aviso · ${a}`);
  if (errores.length) {
    console.error(`\n${errores.length} error(es) en la configuración:`);
    for (const e of errores) console.error(`  · ${e}`);
    if (salirSiError) process.exit(1);
  }
  return { errores, avisos };
}

// ── generar ──────────────────────────────────────────────────────────────────

const COMANDOS = [
  ["hu-new", () => true],
  ["hu-work", () => true],
  ["hu-close", () => true],
  ["fix", () => true],
  ["metodo", () => true],
  ["qa", (C) => C.SI_QA],
  ["seguridad", (C) => C.SI_SEGURIDAD_DIAL],
  ["deploy", (C) => C.SI_DEVOPS],
  ["diseno-fundacion", (C) => C.SI_DISENO_SISTEMA],
];

function cabeceraMd(rol) {
  const reglas = rol ? ` Las reglas propias van en .metodo/reglas/${rol}.md.` : "";
  return `<!-- ${MARCA} desde .metodo/config.json: no editar.${reglas} -->\n`;
}

// La cabecera va después del frontmatter, si lo hay.
function conCabecera(texto, rol) {
  const m = texto.match(/^---\n[\s\S]*?\n---\n/);
  if (m) return m[0].replace(/\n\s*\n/g, "\n") + cabeceraMd(rol) + texto.slice(m[0].length);
  return cabeceraMd(rol) + texto;
}

function settings(C, cfg) {
  const entornos = leerJSON(R.entornos, {});
  const deny = [
    "Edit(/hu/INDEX.md)",
    "Edit(/AGENTS.md)",
    "Edit(/.metodo/metodologia/**)",
    "Edit(/.claude/agents/**)",
    "Edit(/.claude/commands/**)",
    "Edit(/.claude/hooks/**)",
  ];
  if (C.SI_SELLADO) deny.push(`Edit(/${C.ALCANCE_ARCHIVO})`, "Edit(/docs/producto/fuera-de-alcance.md)", "Edit(/docs/producto/alcance-sellado.json)");
  if (C.SI_LIENZO && cfg.rasgos?.rutaLienzo) deny.push(`Edit(/${cfg.rasgos.rutaLienzo}/**)`);
  for (const a of entornos.produccion?.archivos ?? [".env.production"]) deny.push(`Read(**/${a})`);
  deny.push("Bash(git push:*)", "Bash(git push)", "Bash(gh release:*)", "Bash(gh pr create:*)");
  const hook = (archivo) => ({ type: "command", command: `node "$CLAUDE_PROJECT_DIR/.claude/hooks/${archivo}"` });
  return JSON.stringify({
    $schema: "https://json.schemastore.org/claude-code-settings.json",
    permissions: { deny },
    hooks: {
      PreToolUse: [{ matcher: "Bash|Edit|Write|MultiEdit|Read|Grep|Glob|Agent|Skill|WebFetch|WebSearch", hooks: [hook("guarda.mjs")] }],
      Stop: [{ hooks: [hook("fin-de-turno.mjs")] }],
    },
  }, null, 2) + "\n";
}

// La configuración de grafo.mjs y contracts.mjs sale de config.repos: nada de marcadores a mano.
function gatesConfig(C, cfg) {
  const repos = cfg.repos ?? [];
  const rutasDe = (tipos) => repos.filter((r) => tipos.includes(r.tipo)).map((r) => r.ruta);
  const api = rutasDe(["api", "fullstack", "worker"])[0] ?? repos[0]?.ruta ?? ".";
  const apps = rutasDe(["app", "paquete"]);
  const salida = {};
  if (C.SI_GRAFO) salida.grafo = { repos: repos.map((r) => r.ruta), apps, api, paquetes: {}, salida: "graphify-out", coberturaMinima: 0.75, alDiaTambien: ["hu", "docs"] };
  if (C.SI_PAQUETE_CONTRATOS) {
    const p = cfg.stack?.contratos ?? {};
    salida.contratos = {
      api, apps,
      paquetes: { contracts: { nombre: p.paquete ?? `@${C.SLUG}/contracts`, carpeta: p.carpeta ?? "packages/contracts", versionArchivo: p.versionArchivo ?? "src/version.ts", versionConstante: p.versionConstante ?? "CONTRACT_VERSION" } },
      comprobaciones: { versiones: true, versionDelPaquete: true },
    };
  }
  return JSON.stringify(salida, null, 2) + "\n";
}

const GRAPHIFYIGNORE = ["node_modules/", "dist/", "build/", "coverage/", ".next/", ".nuxt/", "graphify-out/", ".metodo/metodologia/", ".metodo/pruebas/", ".env*"].join("\n") + "\n";

function launch(cfg) {
  const g = cfg.stack?.gestor ?? "npm";
  const dir = (ruta) => (ruta === "." ? [] : g === "pnpm" ? ["--dir", ruta] : g === "yarn" ? ["--cwd", ruta] : ["--prefix", ruta]);
  const configuraciones = [];
  for (const r of cfg.repos ?? []) {
    if (!r.puerto) continue;
    configuraciones.push({ name: `${r.nombre}-dev`, runtimeExecutable: g, runtimeArgs: [...dir(r.ruta), "run", "dev"], port: r.puerto });
    if (r.puertoCompilada)
      configuraciones.push({ name: `${r.nombre}-compilada`, runtimeExecutable: g, runtimeArgs: [...dir(r.ruta), "run", "preview"], port: r.puertoCompilada });
  }
  // El launch.json del proyecto manda: se conservan sus configuraciones (el worker, servicios falsos,
  // maquetas…) y solo se añaden las de los repos que aún no estén, por nombre.
  const actual = leerJSON(join(RAIZ, ".claude", "launch.json"), null);
  if (actual?.configurations) {
    const nombres = new Set(actual.configurations.map((c) => c.name));
    return JSON.stringify({ ...actual, configurations: [...actual.configurations, ...configuraciones.filter((c) => !nombres.has(c.name))] }, null, 2) + "\n";
  }
  return JSON.stringify({ version: "0.0.1", configurations: configuraciones }, null, 2) + "\n";
}

function archivosBajo(dir) {
  const salida = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) salida.push(...archivosBajo(p).map((x) => join(f, x)));
    else salida.push(f);
  }
  return salida;
}

function planDeGeneracion(cfg, perfiles) {
  const C = contexto(RAIZ, cfg, perfiles);
  const { valores: v } = efectiva(cfg, perfiles);
  const plan = []; // [destino, texto, { siempre }]
  const leer = (p) => readFileSync(join(R.plantillas, p), "utf8");

  for (const rol of v.agentes) {
    const nombre = C[`N_${clave(rol)}`];
    plan.push([`.claude/agents/${nombre}.md`, conCabecera(renderizar(leer(`agents/${rol}.md`), C, RAIZ), rol), { siempre: true }]);
  }
  for (const [cmd, activo] of COMANDOS)
    if (activo(C)) plan.push([`.claude/commands/${cmd}.md`, conCabecera(renderizar(leer(`commands/${cmd}.md`), C, RAIZ)), { siempre: true }]);
  for (const h of ["guarda.mjs", "fin-de-turno.mjs"]) plan.push([`.claude/hooks/${h}`, leer(`hooks/${h}`), { siempre: true }]);
  plan.push([".claude/settings.json", settings(C, cfg), { siempre: true }]);
  if ((cfg.repos ?? []).some((r) => r.puerto)) plan.push([".claude/launch.json", launch(cfg), { siempre: true }]);
  if (C.SI_GRAFO || C.SI_PAQUETE_CONTRATOS) plan.push([".metodo/gates.config.json", gatesConfig(C, cfg), { siempre: true }]);
  // El grafo honra .graphifyignore en lugar de .gitignore: así ve los repos de código aunque el gobierno los ignore.
  if (C.SI_GRAFO) plan.push([".graphifyignore", GRAPHIFYIGNORE, { siempre: false }]);
  plan.push(["AGENTS.md", cabeceraMd() + renderizar(leer("docs/AGENTS.md"), C, RAIZ), { siempre: true }]);
  plan.push(["CLAUDE.md", leer("docs/CLAUDE.md"), { siempre: false }]);

  // Skills: las base de la metodología y las de los packs. Solo si no existen: los roles las rellenan.
  // Las del orquestador (verifica y vigila la configuración) existen siempre.
  const skills = new Map([[`${C.SLUG}-pruebas`, null], [`${C.SLUG}-configuracion`, null]]);
  for (const g of Object.values(skillsPorRol(RAIZ, cfg, v))) for (const s of [...g.siempre, ...g.tarea]) skills.set(`${C.SLUG}-${s}`, null);
  const origenes = new Map();
  for (const s of readdirSync(join(R.plantillas, "skills"))) origenes.set(`${C.SLUG}-${s}`, join(R.plantillas, "skills", s));
  for (const p of packsDelProyecto(RAIZ, cfg))
    for (const s of p.skills ?? []) origenes.set(`${C.SLUG}-${s}`, join(R.plantillas, "packs", p.nombre, "skills", s));
  for (const nombre of skills.keys()) {
    const origen = origenes.get(nombre);
    if (!origen || !existsSync(origen)) continue;
    // Una skill que ya existe es del proyecto: no se le añaden archivos del pack (p. ej. Socket.IO en una app con SSE).
    if (existsSync(join(RAIZ, ".claude", "skills", nombre, "SKILL.md"))) continue;
    for (const f of archivosBajo(origen))
      plan.push([`.claude/skills/${nombre}/${f}`, renderizar(readFileSync(join(origen, f), "utf8"), C, RAIZ), { siempre: false }]);
  }

  // Las reglas propias de cada rol activo: vacías, para que existan.
  plan.push([".metodo/reglas/orquestador.md", `# Reglas propias del orquestador en ${C.PROYECTO}\n\n<!-- Lo que este proyecto añade a AGENTS.md: convenciones, fuentes de verdad, reglas de producto. El generador lo incluye en AGENTS.md. -->\n`, { siempre: false }]);
  for (const rol of v.agentes)
    plan.push([`.metodo/reglas/${rol}.md`, `# Reglas propias de ${rol} en ${C.PROYECTO}\n\n<!-- Lo que este proyecto añade al rol. El generador lo incluye en su agente. Una regla por línea, con su porqué. -->\n`, { siempre: false }]);
  return { plan, C, v };
}

// Los generados que ya no tocan (un rol o un comando desactivado).
function sobrantes(plan) {
  const destinos = new Set(plan.map(([d]) => d));
  const salida = [];
  for (const dir of [".claude/agents", ".claude/commands"]) {
    const abs = join(RAIZ, dir);
    if (!existsSync(abs)) continue;
    for (const f of readdirSync(abs)) {
      const d = `${dir}/${f}`;
      if (destinos.has(d)) continue;
      if (readFileSync(join(abs, f), "utf8").includes(MARCA)) salida.push(d);
    }
  }
  return salida;
}

function generar({ silencioso = false } = {}) {
  const { cfg, perfiles } = cargar();
  informarValidacion(cfg, perfiles);
  const { plan } = planDeGeneracion(cfg, perfiles);

  const quedan = [];
  for (const [d, t] of plan) for (const [l, n] of marcadoresSinResolver(t)) quedan.push(`${d}:${n}: ${l.trim().slice(0, 90)}`);
  if (quedan.length) {
    console.error(`Quedan ${quedan.length} marcador(es) sin resolver; no se escribió nada:\n  ${quedan.slice(0, 30).join("\n  ")}`);
    process.exit(1);
  }

  const escritos = [];
  const respetados = [];
  for (const [d, t, { siempre }] of plan) {
    if (!siempre && existsSync(join(RAIZ, d))) { respetados.push(d); continue; }
    escribir(d, t);
    escritos.push(d);
  }
  const fuera = sobrantes(plan);
  if (!SIMULAR) for (const d of fuera) rmSync(join(RAIZ, d));
  if (!silencioso || SIMULAR) {
    console.log(`${SIMULAR ? "Se escribirían" : "Escritos"} ${escritos.length} archivo(s):`);
    for (const d of escritos) console.log(`  ${d}`);
    if (fuera.length) console.log(`${SIMULAR ? "Se quitarían" : "Quitados"} (rol o comando desactivado): ${fuera.join(", ")}`);
    if (respetados.length) console.log(`Ya existían y se respetaron: ${respetados.length} (skills, reglas propias, CLAUDE.md)`);
  }
  const extra = instalarHooks(cfg, documentosBase(cfg, perfiles));
  const nuevos = extra.filter((p) => !p.startsWith("("));
  if (nuevos.length && (!silencioso || SIMULAR)) console.log(`Documentos y hooks que faltaban: ${nuevos.join(", ")}`);
  for (const p of extra.filter((x) => x.startsWith("("))) if (!silencioso) console.log(p);
  const faltan = packsDelProyecto(RAIZ, cfg).filter((p) => p.faltante).map((p) => p.nombre);
  if (faltan.length) console.log(`Packs por forjar (packs.md §4): ${faltan.join(", ")}`);
  if (!SIMULAR) presupuesto();
  return escritos;
}

// ── efectivo, estado ─────────────────────────────────────────────────────────

function efectivo() {
  const { cfg, perfiles } = cargar();
  const { valores, origen, perfil, fase } = efectiva(cfg, perfiles);
  console.log(`Perfil ${perfil} · fase ${fase}\n`);
  const ancho = Math.max(...Object.keys(valores).map((k) => k.length));
  for (const [k, val] of Object.entries(valores)) {
    const txt = Array.isArray(val) ? val.join(", ") : typeof val === "object" ? JSON.stringify(val) : String(val);
    console.log(`  ${k.padEnd(ancho)}  ${txt}  ← ${origen[k]}`);
  }
  console.log(`\n  fijos: configuración fuera del código y guarda de producción (bloqueo)`);
}

function estado() {
  const { cfg, perfiles } = cargar();
  const { valores: v, fase } = efectiva(cfg, perfiles);
  const dirs = existsSync(R.hu) ? readdirSync(R.hu).filter((d) => /^HU-\d{4}/.test(d)) : [];
  const cuenta = {};
  for (const d of dirs) {
    const p = join(R.hu, d, "hu.md");
    if (!existsSync(p)) continue;
    const e = (readFileSync(p, "utf8").match(/^estado:\s*(.+)$/m) ?? [])[1]?.trim() ?? "?";
    cuenta[e] = (cuenta[e] ?? 0) + 1;
  }
  const ajustes = Object.keys(cfg.ajustes ?? {});
  console.log(`${cfg.proyecto?.nombre} · perfil ${cfg.perfil}${ajustes.length ? ` (ajustes: ${ajustes.join(", ")})` : ""} · fase ${fase} · modo ${v.modo}`);
  console.log(`Agentes: ${v.agentes.map((r) => cfg.agentes?.[r]?.nombre ?? r).join(", ")}`);
  console.log(`Historias: ${dirs.length}${dirs.length ? " · " + Object.entries(cuenta).map(([k, n]) => `${k} ${n}`).join(" · ") : ""}`);
}

// ── actividad: qué está haciendo cada agente ─────────────────────────────────

function actividad() {
  const archivo = join(RAIZ, ".metodo", "actividad.log");
  const n = Number(args[args.indexOf("--n") + 1]) || 25;
  const filtro = args.includes("--agente") ? args[args.indexOf("--agente") + 1] : null;
  const linea = (l) => {
    const [ts, quien, id, herramienta, que] = l.split("\t");
    if (!ts || (filtro && quien !== filtro)) return null;
    const hora = new Date(ts).toLocaleTimeString("es", { hour12: false });
    return `${hora}  ${quien.padEnd(14)} ${(id ? id.slice(0, 6) : "").padEnd(7)}${(herramienta ?? "").padEnd(8)} ${que ?? ""}`;
  };
  if (!existsSync(archivo)) { console.log("Sin actividad registrada todavía (la escribe la guarda en cada herramienta)."); return; }
  const todas = readFileSync(archivo, "utf8").split("\n").filter(Boolean);
  // Resumen: lo último de cada agente.
  const ultimo = new Map();
  for (const l of todas) { const [ts, quien, , herramienta, que] = l.split("\t"); ultimo.set(quien, { ts, herramienta, que }); }
  console.log("Lo último de cada agente:");
  for (const [quien, u] of ultimo) console.log(`  ${quien.padEnd(14)} hace ${Math.round((Date.now() - new Date(u.ts)) / 60000)} min · ${u.herramienta} ${u.que}`);
  console.log(`\nÚltimas ${n} acciones${filtro ? ` de ${filtro}` : ""}:`);
  for (const l of todas.map(linea).filter(Boolean).slice(-n)) console.log("  " + l);
  if (args.includes("--seguir")) {
    let tam = statSync(archivo).size;
    console.log("\n(siguiendo; Ctrl+C para salir)");
    setInterval(() => {
      const ahora = statSync(archivo).size;
      if (ahora <= tam) return;
      const nuevo = readFileSync(archivo, "utf8").slice(tam);
      tam = ahora;
      for (const l of nuevo.split("\n").filter(Boolean).map(linea).filter(Boolean)) console.log("  " + l);
    }, 1000);
  }
}

// ── perfil y fase ────────────────────────────────────────────────────────────

const RELLENAR = {
  architect: "Documento de arquitectura base (docs/arquitectura/) desde el código existente, con exploradores",
  "product-owner": "Primer borrador de reglas de negocio (docs/producto/reglas/) desde las historias cerradas",
  data: "Revisión del esquema actual por el agente data (docs/arquitectura/datos.md)",
  "alcance:lista-viva": "Borrador del alcance desde las historias existentes, cada ítem con su historia; lo aprueba la persona",
  "alcance:sellado": "Borrador del alcance desde las historias existentes, aprobación y `alcance.mjs sellar`",
  "diseno:sistema": "Fundación de diseño desde lo ya construido: tokens, componentes y guías reales (/diseno-fundacion)",
  "grafo:graphify": "Construir el grafo: node .metodo/scripts/grafo.mjs build",
  "contratos:estrictos": "Congelar los contratos actuales como versión base",
  observabilidad: "Catálogo de señales de los flujos existentes (docs/operaciones/observabilidad.md)",
  separar: "Separar fullstack en backend y frontend; reasignar las historias abiertas en su bitácora",
};

function siguienteAdr() {
  const dir = join(RAIZ, "docs", "decisiones");
  const n = existsSync(dir) ? readdirSync(dir).map((f) => Number((f.match(/^ADR-(\d{4})/) ?? [])[1] ?? 0)).reduce((a, b) => Math.max(a, b), 0) : 0;
  return `ADR-${String(n + 1).padStart(4, "0")}`;
}

function escribirAdr(titulo, cuerpo) {
  const id = siguienteAdr();
  const slug = titulo.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const destino = `docs/decisiones/${id}-${slug}.md`;
  const decide = leerConfig(RAIZ)?.figuras?.metodo ?? "<quien decide el método>";
  escribir(destino, `# ${id} · ${titulo}\n\nFecha: ${new Date().toLocaleDateString("sv-SE")} · Historia: método · Decide: ${decide}\n\n${cuerpo}\n`);
  return destino;
}

function diferencia(antes, despues) {
  const filas = [];
  for (const k of new Set([...Object.keys(antes), ...Object.keys(despues)])) {
    const a = JSON.stringify(antes[k]);
    const d = JSON.stringify(despues[k]);
    if (a !== d) filas.push([k, a, d]);
  }
  return filas;
}

function perfil(nuevo) {
  if (!["S", "M", "L"].includes(nuevo)) throw new Error("Uso: metodo.mjs perfil <S|M|L> [--simular] [--quitar-ajustes]");
  const { cfg, perfiles } = cargar();
  const antes = efectiva(cfg, perfiles).valores;
  const siguiente = structuredClone(cfg);
  siguiente.perfil = nuevo;
  if (args.includes("--quitar-ajustes")) siguiente.ajustes = {};
  const despues = efectiva(siguiente, perfiles).valores;

  const filas = diferencia(antes, despues);
  console.log(`Perfil ${cfg.perfil} → ${nuevo}${Object.keys(siguiente.ajustes ?? {}).length ? ` (se conservan los ajustes: ${Object.keys(siguiente.ajustes).join(", ")})` : ""}\n`);
  if (!filas.length) console.log("  Ningún dial cambia.");
  for (const [k, a, d] of filas) console.log(`  ${k}: ${a} → ${d}`);

  const nuevosRoles = despues.agentes.filter((r) => !antes.agentes.includes(r));
  const tareas = [];
  for (const r of nuevosRoles) if (RELLENAR[r]) tareas.push(RELLENAR[r]);
  if (antes.agentes.includes("fullstack") && !despues.agentes.includes("fullstack")) tareas.push(RELLENAR.separar);
  for (const k of ["alcance", "diseno", "grafo"]) if (antes[k] !== despues[k] && RELLENAR[`${k}:${despues[k]}`]) tareas.push(RELLENAR[`${k}:${despues[k]}`]);
  if (antes.contratos === "flexibles" && despues.contratos !== "flexibles") tareas.push(RELLENAR["contratos:estrictos"]);
  if (antes.observabilidad === "off" && despues.observabilidad !== "off") tareas.push(RELLENAR.observabilidad);
  if (tareas.length) {
    console.log("\nLo que hay que rellenar hacia atrás (tareas, no cambios automáticos):");
    tareas.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
  }
  const subir = ["S", "M", "L"].indexOf(nuevo) > ["S", "M", "L"].indexOf(cfg.perfil);
  if (subir) {
    console.log("\nReevaluar antes de seguir (perfiles.md, la reevaluación al subir):");
    console.log("  · Datos: ¿basta la skill del motor o hace falta el agente data?");
    console.log("  · Packs: ¿el stack creció (colas, tiempo real, otra app)? ¿faltan packs?");
    console.log("  · Modelos: ¿algún rol sube de modelo por el nuevo riesgo?");
    console.log("  · Repos: ¿un solo repo sigue siendo lo adecuado?");
  }

  // Los roles nuevos necesitan nombre, color y modelo: se toman de la plantilla si faltan.
  const plantilla = leerJSON(join(R.plantillas, "config", "config.json"));
  siguiente.agentes = siguiente.agentes ?? {};
  for (const r of despues.agentes) if (!siguiente.agentes[r]) siguiente.agentes[r] = plantilla.agentes[r];
  const { errores, avisos } = validar(siguiente, perfiles);
  for (const a of avisos) console.warn(`  aviso · ${a}`);
  // Los diales que el arranque pregunta siempre: si la persona eligió el valor actual, debe quedar como ajuste.
  const PREGUNTADOS = ["propuesta", "enfoque", "modo", "alcance", "diseno", "qa"];
  const cambianSinAjuste = filas.map(([k]) => k).filter((k) => PREGUNTADOS.includes(k) && !(k in (siguiente.ajustes ?? {})));
  if (cambianSinAjuste.length)
    console.log(`\nSi la persona eligió con sus palabras el valor actual de ${cambianSinAjuste.join(", ")}, ponlo en ajustes antes de aplicar: si no, cambia con el perfil.`);
  if (nuevosRoles.length)
    console.log(`Roles nuevos, con nombre y color de la plantilla (cámbialos en config.agentes si la persona quiere otros): ${nuevosRoles.map((r) => `${r} → ${siguiente.agentes[r]?.nombre} (${siguiente.agentes[r]?.color})`).join(", ")}`);
  if (errores.length) {
    console.error(`\nLa combinación resultante tiene errores:\n  · ${errores.join("\n  · ")}\nCorrige los ajustes y repite.`);
    process.exit(1);
  }
  if (SIMULAR) { console.log("\n(simulación: no se cambió nada)"); return; }
  writeFileSync(R.config, JSON.stringify(siguiente, null, 2) + "\n");
  generar({ silencioso: true });
  const adr = escribirAdr(`Cambio de perfil ${cfg.perfil} → ${nuevo}`,
    `## Diales que cambian\n\n${filas.map(([k, a, d]) => `- \`${k}\`: ${a} → ${d}`).join("\n") || "- ninguno"}\n\n` +
    `## Tareas hacia atrás\n\n${tareas.map((t) => `- [ ] ${t}`).join("\n") || "- ninguna"}\n\n## Por qué\n\n<Completar: qué cambió en el proyecto.>`);
  console.log(`\nAplicado. Config actualizada, agentes regenerados, ${adr} escrito (completa el porqué).`);
}

function fase(nueva) {
  if (!["desarrollo", "produccion"].includes(nueva)) throw new Error("Uso: metodo.mjs fase <desarrollo|produccion> [--simular]");
  const { cfg, perfiles } = cargar();
  const antes = efectiva(cfg, perfiles).valores;
  const siguiente = { ...cfg, fase: nueva };
  const despues = efectiva(siguiente, perfiles).valores;
  console.log(`Fase ${cfg.fase ?? "desarrollo"} → ${nueva}\n`);
  for (const [k, a, d] of diferencia(antes, despues)) console.log(`  ${k}: ${a} → ${d}`);
  if (nueva === "produccion") {
    const ent = leerJSON(R.entornos, {});
    console.log("\nChecklist (entornos.md, el paso a producción). Nada de esto se da por hecho:");
    const items = [
      `entornos.json con hosts y marcas de producción (${(ent.produccion?.hosts ?? []).length ? "hay hosts declarados" : "FALTAN los hosts"})`,
      "La guarda bloquea un comando con el host de producción: node .metodo/scripts/entorno.mjs probar",
      "Contratos actuales congelados como versión base (si contratos no es flexibles)",
      "El atajo de login de desarrollo comprobado ausente en el build de producción",
      "Señales mínimas de observabilidad en los flujos críticos",
      "Auditoría de seguridad de la entrega (/seguridad entrega) con cada hallazgo alto resuelto o aceptado por la persona",
      "Respaldo de la base de producción y restauración probada (devops con la persona)",
      "Pendientes humanos de las historias cerradas, revisados",
    ];
    items.forEach((t) => console.log(`  [ ] ${t}`));
  }
  if (nueva === "produccion") {
    const cAntes = contexto(RAIZ, cfg, perfiles);
    const cDespues = contexto(RAIZ, siguiente, perfiles);
    if (!cAntes.SI_CONTRATOS_ESTRICTOS && cDespues.SI_CONTRATOS_ESTRICTOS) console.log("\n  Efecto: los contratos pasan a estrictos (compatibilidad hacia atrás, versionado, feature flags).");
    console.log("  Efecto: la revisión técnica no baja de «riesgo» y la observabilidad no baja de «básica».");
  }
  if (SIMULAR) { console.log("\n(simulación: no se cambió nada)"); return; }
  if (nueva === "produccion" && !(leerJSON(R.entornos, {})?.produccion?.hosts ?? []).length && !args.includes("--forzar"))
    throw new Error("No se pasa a producción sin los hosts de producción en .metodo/entornos.json: la guarda no sabría qué bloquear. Decláralos (o --forzar si de verdad no hay hosts).");
  writeFileSync(R.config, JSON.stringify(siguiente, null, 2) + "\n");
  generar({ silencioso: true });
  const adr = escribirAdr(`Paso a fase ${nueva}`, `Desde ${cfg.fase ?? "desarrollo"}.\n\n## Checklist\n\n<Pegar la checklist con lo comprobado y quién lo comprobó.>`);
  console.log(`\nAplicado. Config actualizada, agentes regenerados, ${adr} escrito.`);
}

// ── iniciar ──────────────────────────────────────────────────────────────────

const GITIGNORE = [".env", ".env.*", "!.env.example", ".metodo/pruebas/", ".metodo/actividad.log", "graphify-out/", "node_modules/"];

// Los documentos que exigen los diales activos y aún no existen. Los usan iniciar, generar y perfil:
// un M que viene de S queda igual que un M nuevo. Nunca reescribe nada que exista.
function documentosBase(cfg, perfiles, pasos = []) {
  const C = contexto(RAIZ, cfg, perfiles);
  const carpetas = ["hu", "docs/producto/reglas", "docs/arquitectura", "docs/decisiones", "docs/operaciones", ".metodo/reglas", ".metodo/pruebas"];
  if (C.SI_DISENO) carpetas.push("docs/diseno");
  if (C.SI_SELLADO) carpetas.push("docs/producto/actas");
  if (!SIMULAR) for (const c of carpetas) mkdirSync(join(RAIZ, c), { recursive: true });
  const una = (origen, destino, si = true, extra = {}) => {
    if (!si || existsSync(join(RAIZ, destino))) return;
    const texto = renderizar(readFileSync(join(R.plantillas, origen), "utf8"), { ...C, ...extra }, RAIZ);
    const quedan = marcadoresSinResolver(texto);
    if (quedan.length) throw new Error(`${destino}: quedan marcadores sin resolver (${quedan.map(([l, n]) => `${n}: ${l.trim()}`).join(" · ").slice(0, 200)})`);
    escribir(destino, texto);
    pasos.push(destino);
  };
  una("config/entornos.json", ".metodo/entornos.json");
  una("docs/reglas.md", "docs/producto/reglas/README.md");
  una("docs/invariantes.md", "docs/producto/invariantes.md");
  una("docs/stack.md", "docs/arquitectura/stack.md");
  una("docs/observabilidad.md", "docs/operaciones/observabilidad.md", C.SI_OBS);
  una("diseno/guias.md", "docs/diseno/guias.md", C.SI_DISENO_SISTEMA);
  una("docs/alcance.md", C.ALCANCE_ARCHIVO, C.SI_ALCANCE);
  una("docs/fuera-de-alcance.md", "docs/producto/fuera-de-alcance.md", C.SI_ALCANCE);
  // Un catálogo .env.example donde cada app lee su entorno: el repo, con solo lo de su capa.
  for (const r of cfg.repos ?? []) {
    const dir = r.ruta === "." ? "" : `${r.ruta}/`;
    if (r.ruta !== "." && !existsSync(join(RAIZ, r.ruta))) { pasos.push(`(${r.ruta}/ aún no existe: la historia fundacional crea su .env.example; generar lo crea cuando exista)`); continue; }
    una("config/env.example", `${dir}.env.example`, true, {
      SI_HAY_SERVIDOR: ["api", "fullstack", "worker"].includes(r.tipo) || (r.ruta === "." && C.SI_HAY_SERVIDOR),
      SI_HAY_APP: ["app", "paquete", "fullstack"].includes(r.tipo) || (r.ruta === "." && C.SI_HAY_APP),
      SI_PROYECTO_CON_API: C.SI_HAY_SERVIDOR,
    });
  }
  return pasos;
}

function instalarHooks(cfg, pasos = []) {
  const dirsGit = [RAIZ, ...(cfg.repos ?? []).filter((r) => r.ruta !== ".").map((r) => join(RAIZ, r.ruta))];
  for (const d of dirsGit) {
    if (!existsSync(join(d, ".git"))) continue;
    const hook = join(d, ".git", "hooks", "pre-commit");
    const alProyecto = relative(d, RAIZ) || ".";
    const texto = `#!/bin/sh\n# ${MARCA}: configuración fuera del código y guarda de producción, sobre lo que entra en el commit.\n` +
      `node "${alProyecto}/.metodo/scripts/config.mjs" check --staged --repo "$(pwd)" && node "${alProyecto}/.metodo/scripts/entorno.mjs" check --staged --repo "$(pwd)"\n`;
    if (existsSync(hook) && readFileSync(hook, "utf8").includes(MARCA)) continue;
    if (existsSync(hook)) { pasos.push(`AVISO: ${relative(RAIZ, hook)} ya existe; añade a mano las dos líneas (arnes.md §3)`); continue; }
    if (!SIMULAR) { mkdirSync(dirname(hook), { recursive: true }); writeFileSync(hook, texto); chmodSync(hook, 0o755); }
    pasos.push(`pre-commit en ${relative(RAIZ, d) || "la raíz"}`);
  }
  return pasos;
}

function iniciar() {
  const desdeElProyecto = AQUI.endsWith(join(".metodo", "scripts"));
  const METODOLOGIA = desdeElProyecto ? join(RAIZ, ".metodo", "metodologia") : resolve(AQUI, "..", "..");
  if (!existsSync(join(METODOLOGIA, "plantillas", "config", "perfiles.json")))
    throw new Error(`No encuentro la metodología en ${METODOLOGIA}. Lanza iniciar desde la carpeta entregada: node <metodologia>/plantillas/scripts/metodo.mjs iniciar --destino .`);
  const pasos = [];
  const cfg = leerConfig(RAIZ);
  if (!cfg) throw new Error(`Falta .metodo/config.json en ${RAIZ}. Escríbelo primero desde ${join(METODOLOGIA, "plantillas/config/config.json")} (arranque.md, paso 7).`);
  const perfiles = leerJSON(join(METODOLOGIA, "plantillas", "config", "perfiles.json"));
  informarValidacion(cfg, perfiles);

  // La metodología vive en .metodo/metodologia/. Si se entregó dentro del proyecto, se MUEVE (no queda
  // una segunda copia que los gates revisen); si estaba fuera, se copia.
  const copia = join(RAIZ, ".metodo", "metodologia");
  if (METODOLOGIA !== copia && !existsSync(copia)) {
    const dentro = METODOLOGIA.startsWith(RAIZ + sep);
    if (!SIMULAR) {
      mkdirSync(join(RAIZ, ".metodo"), { recursive: true });
      if (dentro) renameSync(METODOLOGIA, copia); else cpSync(METODOLOGIA, copia, { recursive: true });
    }
    pasos.push(dentro ? `metodología trasladada de ${relative(RAIZ, METODOLOGIA)}/ a .metodo/metodologia/` : "metodología copiada a .metodo/metodologia/");
  } else if (METODOLOGIA !== copia && METODOLOGIA.startsWith(RAIZ + sep)) {
    pasos.push(`AVISO: ya existe .metodo/metodologia/; borra ${relative(RAIZ, METODOLOGIA)}/ o los gates revisarán sus archivos`);
  }
  if (!SIMULAR) R = rutas(RAIZ);
  const origenScripts = join(SIMULAR ? METODOLOGIA : R.metodologia, "plantillas", "scripts");
  const scripts = join(RAIZ, ".metodo", "scripts");
  if (!SIMULAR) {
    mkdirSync(scripts, { recursive: true });
    for (const f of readdirSync(origenScripts).filter((f) => f.endsWith(".mjs"))) cpSync(join(origenScripts, f), join(scripts, f));
  }
  pasos.push("scripts en .metodo/scripts/");

  documentosBase(cfg, perfiles, pasos);

  // .gitignore: lo de siempre y los repos de código, que son repos git propios.
  const gi = join(RAIZ, ".gitignore");
  const actual = existsSync(gi) ? readFileSync(gi, "utf8") : "";
  const lineas = [...GITIGNORE, ...(cfg.repos ?? []).filter((r) => r.ruta !== ".").map((r) => `${r.ruta}/`)];
  const faltan = lineas.filter((l) => !actual.split("\n").includes(l));
  if (faltan.length) {
    if (!SIMULAR) writeFileSync(gi, actual + (actual && !actual.endsWith("\n") ? "\n" : "") + "# metodología v4\n" + faltan.join("\n") + "\n");
    pasos.push(`.gitignore: ${faltan.join(" ")}`);
  }

  for (const f of ["arranque-notas.md", "adopcion-inventario.md"]) {
    if (existsSync(join(RAIZ, f)) && !existsSync(join(RAIZ, "docs/producto", f))) {
      if (!SIMULAR) renameSync(join(RAIZ, f), join(RAIZ, "docs/producto", f));
      pasos.push(`${f} trasladado a docs/producto/`);
    }
  }
  instalarHooks(cfg, pasos);

  console.log(`${SIMULAR ? "Se haría" : "Hecho"}:\n  ${pasos.join("\n  ")}\n`);
  generar();
  if (SIMULAR) return;
  try { execSync(`node "${join(scripts, "hu.mjs")}" index`, { cwd: RAIZ, stdio: "ignore" }); } catch {}
  console.log("\nSiguiente (arranque.md, paso 7): revisar lo generado (lista del paso 7.4), sellar el alcance si es sellado, y comprobar:");
  console.log("  node .metodo/scripts/hu.mjs check");
  console.log("  node .metodo/scripts/config.mjs probar && node .metodo/scripts/entorno.mjs probar");
  console.log("Cuando la historia fundacional cree los repos de código (git init en cada uno): node .metodo/scripts/metodo.mjs generar (instala su pre-commit y su .env.example).");
}

// ── arranque: talla, diales, leer ────────────────────────────────────────────
// Dan al arranque lo que necesita sin leer los documentos enteros (el contexto se paga en cada turno).

function talla(senales) {
  const perfiles = leerPerfiles(RAIZ);
  const { senales: pesos, cortes } = perfiles.talla;
  const filas = [];
  const dadas = new Set();
  for (const s of senales) {
    const [k, n] = s.split("=");
    if (!(k in pesos)) throw new Error(`Señal «${k}» desconocida. Señales: ${Object.keys(pesos).join(", ")}`);
    dadas.add(k);
    const num = n === undefined ? 1 : Number(n);
    if (Number.isNaN(num)) throw new Error(`«${s}»: el valor debe ser un número`);
    // repos=<total de repos o apps>: suma uno por cada uno más allá del primero. integraciones=<cuántas>.
    const puntos = k === "repos" ? Math.max(0, num - 1) : k === "integraciones" ? num : num ? pesos[k] : 0;
    filas.push([k === "repos" ? `repos (${num} en total)` : k === "integraciones" ? `integraciones (${num})` : k, puntos]);
  }
  const total = filas.reduce((a, [, p]) => a + p, 0);
  const perfil = total >= cortes.L ? "L" : total >= cortes.M ? "M" : "S";
  console.log(`Talla: ${total} punto(s) → perfil ${perfil}   (S < ${cortes.M} ≤ M < ${cortes.L} ≤ L)\n`);
  for (const [k, p] of filas) if (p) console.log(`  ${k.padEnd(32)} ${p}`);
  const sin = Object.keys(pesos).filter((k) => !dadas.has(k));
  if (sin.length) console.log(`\nSin dato (no suman todavía): ${sin.join(", ")}.\nLa talla es provisional: si al terminar el paso 5 cruza un corte, se propone el cambio de perfil.`);
  console.log("");
  diales(perfil);
}

function diales(nombre = "M") {
  const perfiles = leerPerfiles(RAIZ);
  const p = perfiles.perfiles[nombre];
  if (!p) throw new Error("Uso: metodo.mjs diales <S|M|L>");
  const txt = (v) => (Array.isArray(v) ? v.join(", ") : String(v));
  console.log(`Perfil ${nombre}: ${p.que}\n`);
  console.log(`| Dial | Valor en ${nombre} | Opciones | Qué es |\n| --- | --- | --- | --- |`);
  for (const [k, d] of Object.entries(perfiles.diales)) {
    if (d.tipo === "objeto") {
      for (const [c, dc] of Object.entries(d.campos))
        console.log(`| ${k}.${c} | ${txt(p[k]?.[c])} | ${dc.valores ? txt(dc.valores) : dc.tipo} | ${dc.que ?? (k === "gates" ? `Gate de ${c}` : d.que)} |`);
    } else console.log(`| ${k} | ${txt(p[k])} | ${k === "agentes" ? "(lista de abajo)" : txt(d.valores)} | ${d.que} |`);
  }
  const plantilla = leerJSON(join(R.plantillas, "config", "config.json"), {});
  console.log(`\nAgentes activos en ${nombre}, con nombre, color y modelo por defecto:`);
  for (const rol of p.agentes) {
    const a = plantilla.agentes?.[rol] ?? {};
    console.log(`  ${rol.padEnd(15)} ${a.nombre ?? rol} · ${a.color ?? "-"} · ${a.modelo ?? "-"}`);
  }
  const otros = perfiles.diales.agentes.valores.filter((r) => !p.agentes.includes(r));
  if (otros.length) console.log(`  Se pueden añadir: ${otros.join(", ")}`);
  console.log("  Colores válidos: red, blue, green, yellow, purple, orange, pink, cyan.");
  const packs = {};
  const dirPacks = join(R.plantillas, "packs");
  for (const d of existsSync(dirPacks) ? readdirSync(dirPacks) : []) {
    const pj = leerJSON(join(dirPacks, d, "pack.json"));
    if (pj && !d.startsWith("_")) (packs[pj.tipo] ??= []).push(pj.nombre ?? d);
  }
  console.log(`\nPacks disponibles: ${Object.entries(packs).map(([t, l]) => `${t}: ${l.join(", ")}`).join(" · ")}.`);
  console.log("Tipos de repo: api, worker, app, paquete, fullstack, otro.");
  console.log("\nLo que la persona cambie, y todo dial que eligió con sus palabras aunque coincida con el perfil, va a `ajustes`.");
}

const normal = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9ñ]+/g, " ").trim();

function leer(doc, ...seccion) {
  if (!doc) throw new Error('Uso: metodo.mjs leer <documento> ["sección"]   (sin sección, lista las secciones)');
  const ruta = [join(R.metodologia, doc), join(R.metodologia, `${doc}.md`)].find((r) => existsSync(r) && statSync(r).isFile());
  if (!ruta) throw new Error(`No encuentro «${doc}» en ${R.metodologia}`);
  const lineas = readFileSync(ruta, "utf8").split("\n");
  const titulos = [];
  let enCodigo = false;
  lineas.forEach((l, i) => {
    if (l.startsWith("```")) enCodigo = !enCodigo;
    const m = !enCodigo && l.match(/^(#{1,6})\s+(.*)/);
    if (m) titulos.push({ i, nivel: m[1].length, texto: m[2] });
  });
  const buscado = normal(seccion.join(" ").replace(/-/g, " "));
  if (!buscado) {
    titulos.forEach((t, n) => {
      const fin = titulos.slice(n + 1).find((x) => x.nivel <= t.nivel)?.i ?? lineas.length;
      console.log(`${"  ".repeat(t.nivel - 1)}${t.texto}  (${fin - t.i} líneas)`);
    });
    return;
  }
  // Primero el título que empieza por lo buscado («4b», «3»), después el que lo contiene.
  let n = titulos.findIndex((t) => normal(t.texto).startsWith(buscado));
  if (n === -1) n = titulos.findIndex((t) => normal(t.texto).includes(buscado));
  if (n === -1) throw new Error(`No hay sección «${seccion.join(" ")}» en ${doc}. Secciones: ${titulos.map((t) => t.texto).join(" | ")}`);
  const t = titulos[n];
  const fin = titulos.slice(n + 1).find((x) => x.nivel <= t.nivel)?.i ?? lineas.length;
  console.log(lineas.slice(t.i, fin).join("\n").trimEnd());
}

// Lo que se carga solo, en cada turno o en cada despacho: avisa si crece.
function presupuesto() {
  const avisos = [];
  const tam = (r) => (existsSync(r) ? statSync(r).size : 0);
  const desc = (r) => (readFileSync(r, "utf8").match(/^description:\s*(.*)$/m)?.[1] ?? "").length;
  const kb = (b) => `${(b / 1024).toFixed(1)} KB`;
  if (tam(join(RAIZ, "AGENTS.md")) > 8192)
    avisos.push(`AGENTS.md pesa ${kb(tam(join(RAIZ, "AGENTS.md")))} y se carga en cada turno: lo largo de .metodo/reglas/orquestador.md, a docs/ con un enlace`);
  const dirA = join(RAIZ, ".claude", "agents");
  for (const f of existsSync(dirA) ? readdirSync(dirA).filter((x) => x.endsWith(".md")) : []) {
    const r = join(dirA, f);
    if (desc(r) > 400) avisos.push(`.claude/agents/${f}: la descripción tiene ${desc(r)} caracteres (va en cada turno; hasta 400)`);
    if (tam(r) > 10240) avisos.push(`.claude/agents/${f} pesa ${kb(tam(r))} y cada despacho lo carga: revisa .metodo/reglas/ de ese rol`);
  }
  let total = 0;
  for (const f of existsSync(dirA) ? readdirSync(dirA).filter((x) => x.endsWith(".md")) : []) total += desc(join(dirA, f));
  const dirS = join(RAIZ, ".claude", "skills");
  for (const d of existsSync(dirS) ? readdirSync(dirS) : []) {
    const r = join(dirS, d, "SKILL.md");
    if (!existsSync(r)) continue;
    total += desc(r);
    if (desc(r) > 400) avisos.push(`.claude/skills/${d}: la descripción tiene ${desc(r)} caracteres (va en cada turno; hasta 400)`);
    if (tam(r) > 12288) avisos.push(`.claude/skills/${d}/SKILL.md pesa ${kb(tam(r))}: el detalle, a archivos aparte dentro de la skill`);
  }
  // Con una skill por componente, lo que más pesa es la suma: cada descripción va en cada turno.
  if (total > 20000) avisos.push(`las descripciones de agentes y skills suman ${total} caracteres (≈${Math.round(total / 3.5 / 1000)}k tokens por turno): acórtalas, sobre todo las de los componentes`);
  for (const a of avisos) console.warn(`  aviso · contexto · ${a}`);
  return avisos;
}

// ── principal ────────────────────────────────────────────────────────────────

const [comando, ...resto] = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--destino");
try {
  if (comando === "validar") {
    const { cfg, perfiles } = cargar();
    const { errores, avisos } = informarValidacion(cfg, perfiles, { salirSiError: false });
    const deContexto = presupuesto();
    if (errores.length) process.exit(1);
    const n = avisos.length + deContexto.length;
    console.log(`Configuración válida${n ? ` (${n} aviso(s))` : ""}.`);
  } else if (comando === "efectivo") efectivo();
  else if (comando === "talla") talla(resto);
  else if (comando === "diales") diales(resto[0]);
  else if (comando === "leer") leer(...resto);
  else if (comando === "generar") generar();
  else if (comando === "perfil") perfil(resto[0]);
  else if (comando === "fase") fase(resto[0]);
  else if (comando === "estado") estado();
  else if (comando === "iniciar") iniciar();
  else if (comando === "actividad") actividad();
  else if (comando === "hooks") { const { cfg } = cargar(); const p = instalarHooks(cfg); console.log(p.length ? p.join("\n") : "Los pre-commit ya estaban en todos los repos con git."); }
  else throw new Error("Uso: metodo.mjs validar | efectivo | talla <señales> | diales <S|M|L> | leer <doc> [\"sección\"] | generar | perfil <S|M|L> | fase <desarrollo|produccion> | estado | actividad [--seguir] [--agente <nombre>] | hooks | iniciar --destino <dir>");
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
