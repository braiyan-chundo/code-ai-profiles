#!/usr/bin/env node
// Registro de historias: una carpeta por historia.
//   node .metodo/scripts/hu.mjs new "<título>"                crea hu/HU-####-<slug>/ con hu.md y seguimiento.md
//   node .metodo/scripts/hu.mjs fase <HU> <fase>              avanza la fase, anota la bitácora, regenera el índice
//   node .metodo/scripts/hu.mjs estado <HU> <estado> "<por qué>"   en-espera · en-proceso · terminada · descartada
//   node .metodo/scripts/hu.mjs log <HU> "<texto>"            añade una línea a la bitácora
//   node .metodo/scripts/hu.mjs index                         regenera hu/INDEX.md
//   node .metodo/scripts/hu.mjs check                         valida según la config
//
// <HU> puede ser HU-0012 o 12. hu/INDEX.md es derivado: no se edita. Solo Node estándar.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, appendFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { raizDelProyecto, rutas, leerConfig, leerPerfiles, efectiva, contexto, renderizar, AQUI } from "./lib.mjs";

const RAIZ = raizDelProyecto();
const R = rutas(RAIZ);
const DIR = R.hu;
const INDICE = join(DIR, "INDEX.md");

const ESTADOS = ["en-espera", "en-proceso", "terminada", "descartada"];
const FASES = ["requisitos", "arquitectura", "diseno", "implementacion", "verificacion", "cierre"];

const cfg = leerConfig(RAIZ);
if (!cfg) { console.error("Falta .metodo/config.json (arranque.md, paso 7)."); process.exit(1); }
const perfiles = leerPerfiles(RAIZ);
const V = efectiva(cfg, perfiles).valores;
const C = contexto(RAIZ, cfg, perfiles);

function fasesActivas() {
  return FASES.filter((f) => (f === "arquitectura" ? C.SI_ARCHITECT : f === "diseno" ? C.SI_DISENO : true));
}

// ── frontmatter (YAML plano: escalares, [listas], { objetos }) ───────────────

function escalar(b) {
  const v = b.trim();
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "" || v === "~" || v === "null") return null;
  if (/^-?\d+$/.test(v)) return Number(v);
  return v.replace(/^["']|["']$/g, "");
}
const lista = (b) => { const d = b.trim().replace(/^\[|\]$/g, "").trim(); return d ? d.split(",").map(escalar).filter((x) => x !== null) : []; };
function objeto(b) {
  const d = b.trim().replace(/^\{|\}$/g, "").trim();
  const o = {};
  if (d) for (const par of d.split(",")) { const i = par.indexOf(":"); if (i > 0) o[par.slice(0, i).trim()] = escalar(par.slice(i + 1)); }
  return o;
}
function leerFm(texto, donde) {
  const m = texto.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) throw new Error(`${donde}: falta el frontmatter`);
  const fm = {};
  for (const l of m[1].split("\n")) {
    if (!l.trim() || l.trimStart().startsWith("#")) continue;
    const j = l.indexOf(":");
    if (j === -1) continue;
    const k = l.slice(0, j).trim();
    const r = l.slice(j + 1).trim();
    fm[k] = r.startsWith("[") ? lista(r) : r.startsWith("{") ? objeto(r) : escalar(r);
  }
  return { fm, cuerpo: texto.slice(m[0].length), bloque: m[0] };
}
function cambiarFm(texto, k, valor) {
  return texto.replace(/^---\n([\s\S]*?)\n---\n/, (todo, dentro) => {
    const re = new RegExp(`^${k}:.*$`, "m");
    const linea = `${k}: ${valor}`;
    return `---\n${re.test(dentro) ? dentro.replace(re, linea) : dentro + "\n" + linea}\n---\n`;
  });
}

// ── lectura ──────────────────────────────────────────────────────────────────

function historias() {
  if (!existsSync(DIR)) return [];
  return readdirSync(DIR)
    .filter((d) => /^HU-\d{4}(-|$)/.test(d) && existsSync(join(DIR, d, "hu.md")))
    .sort()
    .map((carpeta) => {
      const texto = readFileSync(join(DIR, carpeta, "hu.md"), "utf8");
      return { carpeta, ...leerFm(texto, `${carpeta}/hu.md`), texto };
    });
}

function buscar(ref) {
  const id = /^\d+$/.test(String(ref)) ? `HU-${String(ref).padStart(4, "0")}` : String(ref).toUpperCase().slice(0, 7);
  const h = historias().find((x) => x.carpeta.startsWith(id));
  if (!h) throw new Error(`No existe ninguna historia ${id} en hu/`);
  return h;
}

const hoy = () => new Date().toLocaleDateString("sv-SE");
const slugDe = (t) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

// Fecha y hora local: las métricas miden cuánto dura cada fase desde estas líneas.
const ahora = () => { const d = new Date(); return `${d.toLocaleDateString("sv-SE")} ${d.toTimeString().slice(0, 5)}`; };

function bitacora(carpeta, quien, texto) {
  appendFileSync(join(DIR, carpeta, "seguimiento.md"), `| ${ahora()} | ${quien} | ${texto.replace(/\|/g, "\\|")} |\n`);
}

// ── alcance ──────────────────────────────────────────────────────────────────

function itemsDelAlcance() {
  const ruta = join(RAIZ, C.ALCANCE_ARCHIVO);
  const m = new Map();
  if (!V.alcance || V.alcance === "off" || !existsSync(ruta)) return m;
  let actual = null;
  for (const l of readFileSync(ruta, "utf8").split("\n")) {
    const x = l.match(/^- \*\*(A\.\d+\.\d+)\*\*/);
    if (x) { actual = x[1]; m.set(actual, null); }
    else if (!/^\s{2,}\S/.test(l)) actual = null;
    const e = actual && l.match(/\*\(entrega (\d+)[^)]*\)\*/);
    if (e) m.set(actual, Number(e[1]));
  }
  return m;
}

// ── índice ───────────────────────────────────────────────────────────────────

const ICONO = { "en-espera": "◻", "en-proceso": "◐", terminada: "◼", descartada: "✕" };

function renderIndice(hs) {
  const l = ["# Índice de historias\n", "> Generado por `node .metodo/scripts/hu.mjs index`. **No se edita a mano.**\n"];
  l.push(`${hs.length} historias · ${ESTADOS.map((e) => `${ICONO[e]} ${e}: ${hs.filter((h) => h.fm.estado === e).length}`).join(" · ")}\n`);
  const items = itemsDelAlcance();
  if (items.size) {
    const cub = new Set(hs.flatMap((h) => h.fm.alcance ?? []));
    l.push(`Cobertura del ${C.ALCANCE_NOMBRE}: **${[...items.keys()].filter((i) => cub.has(i)).length} / ${items.size}**\n`);
  }
  const entregas = [...new Set(hs.map((h) => h.fm.entrega ?? 1))].sort((a, b) => a - b);
  for (const e of entregas) {
    if (entregas.length > 1) l.push(`\n## Entrega ${e}\n`);
    l.push("| | Historia | Área | Fase | Repos | Reglas |" + (items.size ? " Alcance |" : ""));
    l.push("| --- | --- | --- | --- | --- | --- |" + (items.size ? " --- |" : ""));
    for (const h of hs.filter((x) => (x.fm.entrega ?? 1) === e))
      l.push(`| ${ICONO[h.fm.estado] ?? "?"} | [${h.fm.id}](${h.carpeta}/hu.md) ${h.fm.titulo} | ${h.fm.area ?? "—"} | ${h.fm.fase} | ` +
        `${(h.fm.repos ?? []).join(", ") || "—"} | ${(h.fm.reglas ?? []).join(" ") || "—"} |` + (items.size ? ` ${(h.fm.alcance ?? []).join(" ") || "—"} |` : ""));
  }
  if (items.size) {
    l.push(`\n---\n\n## Trazabilidad del ${C.ALCANCE_NOMBRE}\n`, "| Ítem | Entrega | Historia |", "| --- | --- | --- |");
    for (const [item, e] of items) {
      const d = hs.filter((h) => (h.fm.alcance ?? []).includes(item) && h.fm.estado !== "descartada");
      l.push(`| ${item} | ${e ?? "—"} | ${d.map((x) => x.fm.id).join(", ") || "**sin dueño**"} |`);
    }
  }
  return l.join("\n") + "\n";
}

// ── validación ───────────────────────────────────────────────────────────────

function seccion(texto, titulo) {
  const m = texto.match(new RegExp(`(?:^|\\n)##\\s+${titulo}[^\\n]*\\n([\\s\\S]*?)(?=\\n## |(?![\\s\\S]))`));
  return m ? m[1] : null;
}
const pendientes = (cuerpo, t) => { const s = seccion(cuerpo, t); return s === null ? null : [...s.matchAll(/^- \[ \] (.+)$/gm)].map((x) => x[1]); };
const sinComentarios = (s) => (s ?? "").replace(/<!--[\s\S]*?-->/g, "").trim();

function validarTodas(hs) {
  const errores = [];
  const avisos = [];
  const ids = new Set(hs.map((h) => h.fm.id));
  const activas = fasesActivas();
  for (const h of hs) {
    const { fm, cuerpo, carpeta } = h;
    const e = (m) => errores.push(`${carpeta}: ${m}`);
    const dir = join(DIR, carpeta);
    if (!carpeta.startsWith(fm.id ?? "∅")) e(`id «${fm.id}» no coincide con la carpeta`);
    if (!fm.titulo || /<[^>]+>/.test(String(fm.titulo))) e("titulo sin rellenar");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fm.creada ?? ""))) e(`creada sin fecha ISO («${fm.creada}»)`);
    if (!ESTADOS.includes(fm.estado)) e(`estado «${fm.estado}» imposible (${ESTADOS.join(", ")})`);
    if (!FASES.includes(fm.fase)) e(`fase «${fm.fase}» desconocida`);
    else if (!activas.includes(fm.fase)) avisos.push(`${carpeta}: fase «${fm.fase}» no está activa con esta config (${activas.join(" → ")})`);
    for (const d of fm.depende ?? []) if (!ids.has(d)) e(`depende de «${d}», que no existe`);
    for (const r of fm.repos ?? []) if (!(cfg.repos ?? []).some((x) => x.nombre === r)) e(`repo «${r}» no está en config.repos`);
    if (!existsSync(join(dir, "seguimiento.md"))) e("falta seguimiento.md");
    if (!/^## Criterios de aceptación/m.test(cuerpo)) e("falta la sección de criterios");
    else if (!/^### AC-01\b/m.test(cuerpo)) e("no hay ningún criterio AC-01");
    else if (fm.fase !== "requisitos" && /^### AC-01 · <título corto>/m.test(cuerpo)) e("los criterios siguen siendo la plantilla sin rellenar");
    // El tamaño: una historia corta tiene menos probabilidad de error (metodo.md §4b).
    const criterios = (cuerpo.match(/^### AC-\d+/gm) ?? []).length;
    const maximo = Number(cfg.historias?.maxCriterios ?? 6);
    if (criterios > maximo && !["terminada", "descartada"].includes(fm.estado))
      avisos.push(`${carpeta}: ${criterios} criterios (máximo ${maximo}): es grande, ¿se divide? (metodo.md §4b)`);
    const RIESGOS = ["dinero", "estados", "permisos", "migracion", "datos-personales", "contrato"];
    for (const r of fm.riesgo ?? []) if (!RIESGOS.includes(r)) avisos.push(`${carpeta}: riesgo «${r}» desconocido (${RIESGOS.join(", ")})`);
    if ((fm.riesgo ?? []).includes("dinero") && C.SI_ARCHITECT && fm.requiere?.arquitectura === false) e("toca dinero: requiere.arquitectura debe ser true");

    const idx = FASES.indexOf(fm.fase);
    // Una historia descartada no debe sus artefactos: queda como estaba, con su motivo. Una terminada
    // que vino de la v3 se validó allí con su estructura: no se le piden los archivos de la v4.
    const heredada = fm.migrada === "v3" && fm.estado === "terminada";
    const tras = (f) => fm.estado !== "descartada" && !heredada && (idx >= FASES.indexOf(f) || fm.estado === "terminada");
    const arquitecturaEscrita = existsSync(join(dir, "arquitectura.md")) || /^## Arquitectura/m.test(cuerpo);
    if (C.SI_ARCHITECT && fm.requiere?.arquitectura !== false && tras("implementacion") && !arquitecturaEscrita)
      e(`fase ${fm.fase} sin arquitectura.md`);
    const conTexto = (p) => existsSync(p) && statSync(p).size > 0;
    if (fm.requiere?.diseno === true && C.SI_DISENO && tras("implementacion") && !conTexto(join(dir, "diseno", "vista.md")) && !conTexto(join(dir, "diseno", "maqueta.html")))
      e(`fase ${fm.fase} con requiere.diseno, pero falta diseno/maqueta.html o vista.md (o están vacías)`);
    if (tras("verificacion") && fm.fase !== "verificacion" && !existsSync(join(dir, "verificacion.md")) && fm.estado !== "descartada")
      e(`fase ${fm.fase} sin verificacion.md`);

    if (fm.estado === "terminada") {
      if (fm.fase !== "cierre") e("terminada pero la fase no es cierre");
      for (const t of ["Definición de Preparado", "Definición de Terminado"]) {
        const p = pendientes(cuerpo, t);
        if (p === null) e(`terminada sin la sección «${t}»`);
        else if (p.length) e(`terminada con ${p.length} casilla(s) abiertas en «${t}»: ${p[0].slice(0, 60)}`);
      }
      const ver = join(dir, "verificacion.md");
      const veredicto = existsSync(ver) ? sinComentarios(seccion(readFileSync(ver, "utf8"), "Veredicto")) : "";
      if (!veredicto || /^pendiente\.?$/i.test(veredicto)) e("terminada sin veredicto de la persona en verificacion.md");
      // QA y seguridad no bloquean, pero cada hallazgo necesita la decisión de la persona antes de cerrar.
      for (const [sub, letra, quien] of [["qa", "Q", "QA"], ["seguridad", "S", "seguridad"]]) {
        const inf = join(dir, sub, "informe.md");
        if (!existsSync(inf)) continue;
        const t = readFileSync(inf, "utf8");
        const sinDecidir = [...t.matchAll(new RegExp(`^### (${letra}-\\d+)[^\\n]*\\n([\\s\\S]*?)(?=^### |(?![\\s\\S]))`, "gm"))]
          .filter(([, , b]) => !/\*\*Decisión( de la persona)?:\*\*\s*(arreglar|deuda|descartar|aceptar)/i.test(b)).map(([, q]) => q);
        if (sinDecidir.length) e(`terminada con hallazgos de ${quien} sin decisión de la persona: ${sinDecidir.join(", ")}`);
      }
      if (C.SI_PRODUCT_OWNER || (fm.reglas ?? []).length) {
        const dirReglas = join(RAIZ, "docs", "producto", "reglas");
        const textoReglas = existsSync(dirReglas) ? readdirSync(dirReglas).filter((f) => f !== "README.md").map((f) => readFileSync(join(dirReglas, f), "utf8")).join("\n") : "";
        for (const rn of fm.reglas ?? [])
          if (!new RegExp(`${rn}\\b[\\s\\S]{0,600}${fm.id}`).test(textoReglas)) e(`terminada sin el delta de ${rn} en docs/producto/reglas/ (la regla debe citar ${fm.id})`);
      }
    }
    if (fm.estado === "descartada" && existsSync(join(dir, "seguimiento.md")) && !/descartad/i.test(readFileSync(join(dir, "seguimiento.md"), "utf8")))
      e("descartada sin el motivo en la bitácora");
  }

  const items = itemsDelAlcance();
  if (items.size) {
    const dueno = new Map();
    for (const h of hs) {
      if (h.fm.estado === "descartada") continue;
      for (const it of h.fm.alcance ?? []) {
        if (!items.has(it)) errores.push(`${h.carpeta}: «${it}» no existe en el ${C.ALCANCE_NOMBRE}`);
        // Un ítem grande puede repartirse en varias historias cortas: no es un error.
        if (!dueno.has(it)) dueno.set(it, h.fm.id);
      }
    }
    const huerfanos = [...items.keys()].filter((i) => !dueno.has(i));
    if (huerfanos.length) {
      const msg = `${C.ALCANCE_NOMBRE}: ${huerfanos.length} ítem(s) sin historia — ${huerfanos.slice(0, 8).join(", ")}${huerfanos.length > 8 ? ", …" : ""}`;
      // El nivel lo da gates.alcance; «bloqueo» solo exige cobertura completa cuando ya se abrieron todas las historias.
      const nivel = V.gates?.alcance ?? "aviso";
      if (nivel !== "off") (nivel === "bloqueo" && cfg.alcance?.coberturaCompleta ? errores : avisos).push(msg);
    }
  }
  return { errores, avisos };
}

// ── comandos ─────────────────────────────────────────────────────────────────

function cmdNew(titulo) {
  if (!titulo) throw new Error('Uso: hu.mjs new "<título>"');
  const hs = historias();
  const n = hs.reduce((a, h) => Math.max(a, Number(h.carpeta.slice(3, 7))), (cfg.primerNumero ?? 1) - 1) + 1;
  const id = `HU-${String(n).padStart(4, "0")}`;
  const carpeta = `${id}-${slugDe(titulo)}`;
  const dir = join(DIR, carpeta);
  mkdirSync(dir, { recursive: true });
  const leer = (p) => readFileSync(join(R.plantillas, "docs", p), "utf8");
  const areas = cfg.alcance?.areas ?? [];
  const C2 = { ...C, ID: id, TITULO: titulo.replace(/"/g, "'"), FECHA: hoy(), AREA: areas.length === 1 ? areas[0] : "por-definir",
    REPOS: (cfg.repos ?? []).map((r) => r.nombre).join(", "), FUNDACION: process.argv.includes("--fundacion-diseno") ? "\nfundacion: diseno" : "" };
  writeFileSync(join(dir, "hu.md"), renderizar(leer("hu.md"), C2, RAIZ));
  writeFileSync(join(dir, "seguimiento.md"), renderizar(leer("seguimiento.md"), C2, RAIZ));
  bitacora(carpeta, "hu.mjs", `creada: «${titulo}» · fase requisitos`);
  cmdIndex(true);
  console.log(`Creada hu/${carpeta}/ — ${titulo}`);
  console.log("Completa en hu.md: historia, petición literal, criterios, ★, area, repos, riesgo, reglas" + (C.SI_ALCANCE ? ", alcance" : "") + ".");
}

// Lo que exige entrar en una fase. La fase dice lo que está EN CURSO: se avanza antes de despachar.
function requisitosDe(h, fase) {
  const dir = join(DIR, h.carpeta);
  const falta = [];
  const conTexto = (p) => existsSync(p) && statSync(p).size > 0;
  const bitacoraTexto = existsSync(join(dir, "seguimiento.md")) ? readFileSync(join(dir, "seguimiento.md"), "utf8") : "";
  const diseno = h.fm.requiere?.diseno === true && C.SI_DISENO;
  if (fase === "diseno" && diseno && C.SI_DISENO_SISTEMA && h.fm.fundacion !== "diseno") {
    const guias = join(RAIZ, "docs", "diseno", "guias.md");
    if (!existsSync(guias) || /pendiente de la fundación/i.test(readFileSync(guias, "utf8")))
      falta.push("la fundación de diseño no está aprobada (docs/diseno/guias.md sigue «pendiente de la fundación»): primero /diseno-fundacion");
  }
  if (fase === "implementacion") {
    if (C.SI_ARCHITECT && h.fm.requiere?.arquitectura !== false) {
      if (!conTexto(join(dir, "arquitectura.md")) && !/^## Arquitectura/m.test(h.cuerpo)) falta.push("arquitectura.md");
      const briefs = join(dir, "briefs");
      if (!existsSync(briefs) || !readdirSync(briefs).some((f) => f.endsWith(".md"))) falta.push("al menos un brief en briefs/ (sin brief no se despacha un implementador)");
    }
    if (diseno) {
      if (!conTexto(join(dir, "diseno", "maqueta.html")) && !conTexto(join(dir, "diseno", "vista.md"))) falta.push("la maqueta (diseno/maqueta.html o vista.md, con contenido)");
      if (C.SI_FASE_A_FASE && !/aprob/i.test(bitacoraTexto)) falta.push("la aprobación de la maqueta en la bitácora (hu.mjs log <HU> \"maqueta aprobada: «…»\")");
    }
  }
  if (fase === "cierre") {
    const ver = join(dir, "verificacion.md");
    const veredicto = existsSync(ver) ? sinComentarios(seccion(readFileSync(ver, "utf8"), "Veredicto")) : "";
    if (!veredicto || /^pendiente\.?$/i.test(veredicto)) falta.push("el veredicto de la persona en verificacion.md");
  }
  return falta;
}

function cmdFase(ref, fase) {
  if (!FASES.includes(fase)) throw new Error(`Fase «${fase}» desconocida: ${FASES.join(", ")}`);
  const activas = fasesActivas();
  if (!activas.includes(fase)) throw new Error(`La fase «${fase}» no existe con esta config (${activas.join(" → ")})`);
  const h = buscar(ref);
  const i = process.argv.indexOf("--forzar");
  const forzado = i !== -1 ? (process.argv[i + 1] ?? "").trim() : null;
  if (i !== -1 && !forzado) throw new Error('--forzar necesita el motivo: hu.mjs fase <HU> <fase> --forzar "<por qué>"');
  const desde = activas.indexOf(h.fm.fase);
  const hasta = activas.indexOf(fase);
  if (!forzado) {
    // Una historia puede saltarse diseño si no toca interfaz.
    const siguiente = activas.slice(desde + 1).find((f) => !(f === "diseno" && h.fm.requiere?.diseno !== true));
    if (desde !== -1 && hasta > desde && fase !== siguiente)
      throw new Error(`De ${h.fm.fase} se pasa a ${siguiente}, no a ${fase}. Si de verdad hay que saltar: --forzar "<por qué>"`);
    const falta = hasta > desde ? requisitosDe(h, fase) : [];
    if (falta.length) throw new Error(`${h.fm.id} no puede entrar en ${fase}; falta:\n  · ${falta.join("\n  · ")}`);
  }
  let t = cambiarFm(h.texto, "fase", fase);
  if (h.fm.estado === "en-espera" || !h.fm.estado) t = cambiarFm(t, "estado", "en-proceso");
  writeFileSync(join(DIR, h.carpeta, "hu.md"), t);
  bitacora(h.carpeta, "hu.mjs", `fase ${h.fm.fase} → ${fase}${forzado ? ` (forzado: ${forzado})` : ""}`);
  cmdIndex(true);
  console.log(`${h.fm.id}: fase ${h.fm.fase} → ${fase}`);
}

function cmdEstado(ref, estado, motivo) {
  if (!ESTADOS.includes(estado)) throw new Error(`Estado «${estado}» imposible: ${ESTADOS.join(", ")}`);
  if ((estado === "descartada" || estado === "en-espera") && !motivo) throw new Error(`«${estado}» necesita el motivo: hu.mjs estado <HU> ${estado} "<por qué>"`);
  const h = buscar(ref);
  let t = cambiarFm(h.texto, "estado", estado);
  if (estado === "terminada") t = cambiarFm(t, "fase", "cierre");
  writeFileSync(join(DIR, h.carpeta, "hu.md"), t);
  bitacora(h.carpeta, "hu.mjs", `estado ${h.fm.estado} → ${estado}${motivo ? ` · ${motivo}` : ""}${estado === "descartada" ? " (descartada)" : ""}`);
  // Al cerrar, las métricas de la historia (tokens y tiempos) quedan guardadas para comparar después.
  if (estado === "terminada" || estado === "descartada") {
    try { execFileSync(process.execPath, [join(AQUI, "metricas.mjs"), "hu", h.fm.id], { cwd: RAIZ, stdio: "inherit" }); }
    catch { console.warn("  aviso · no se pudieron calcular las métricas: node .metodo/scripts/metricas.mjs hu " + h.fm.id); }
  }
  cmdIndex(true);
  console.log(`${h.fm.id}: estado ${h.fm.estado} → ${estado}`);
}

function cmdLog(ref, texto) {
  if (!texto) throw new Error('Uso: hu.mjs log <HU> "<texto>"');
  const h = buscar(ref);
  bitacora(h.carpeta, process.env.METODO_QUIEN ?? "orquestador", texto);
  cmdIndex(true);
  console.log(`${h.fm.id}: anotado en la bitácora.`);
}

function cmdIndex(silencioso = false) {
  mkdirSync(DIR, { recursive: true });
  const hs = historias();
  writeFileSync(INDICE, renderIndice(hs));
  if (!silencioso) console.log(`hu/INDEX.md regenerado con ${hs.length} historias.`);
}

// Los componentes: una skill `<slug>-ui-<id>` por componente y el índice `<slug>-componentes` que las lista.
// Solo avisa: el índice y las skills cuadran, cada skill tiene sus secciones y una descripción corta.
const SECCIONES_COMPONENTE = ["Para qué", "Cuándo sí / cuándo no", "Variantes", "Estados", "Accesibilidad", "Ejemplo"];
function revisarComponentes() {
  const avisos = [];
  const slug = cfg.proyecto?.slug;
  const dir = join(RAIZ, ".claude", "skills");
  const indice = join(dir, `${slug}-componentes`, "SKILL.md");
  if (V.diseno === "off" || !slug || !existsSync(indice)) return avisos;
  const prefijo = `${slug}-ui-`;
  const skills = readdirSync(dir).filter((d) => d.startsWith(prefijo) && existsSync(join(dir, d, "SKILL.md")));
  const texto = readFileSync(indice, "utf8").replace(/<!--[\s\S]*?-->/g, "");
  const listadas = new Set(texto.match(new RegExp(`${prefijo}[a-z0-9-]+`, "g")) ?? []);
  for (const s of skills) if (!listadas.has(s)) avisos.push(`componentes: ${s} no está en el índice ${slug}-componentes`);
  for (const s of listadas) if (!skills.includes(s)) avisos.push(`componentes: el índice nombra ${s}, que no tiene skill`);
  const n = texto.match(/\*\*(\d+) componentes?\b/);
  if (n && Number(n[1]) !== skills.length) avisos.push(`componentes: el índice dice ${n[1]} y hay ${skills.length} skills ${prefijo}*`);
  for (const s of skills) {
    const t = readFileSync(join(dir, s, "SKILL.md"), "utf8");
    const faltan = SECCIONES_COMPONENTE.filter((x) => !t.includes(`## ${x}`));
    if (faltan.length) avisos.push(`componentes: ${s} sin ${faltan.join(", ")} (plantilla en ${slug}-componentes/plantilla.md)`);
    const desc = t.match(/^description:\s*(.*)$/m)?.[1] ?? "";
    if (desc.length > 200) avisos.push(`componentes: la descripción de ${s} tiene ${desc.length} caracteres (hasta 200: va en cada turno)`);
  }
  return avisos;
}

function cmdCheck() {
  const hs = historias();
  const { errores, avisos } = validarTodas(hs);
  avisos.push(...revisarComponentes());
  if (!existsSync(INDICE) || readFileSync(INDICE, "utf8") !== renderIndice(hs)) { cmdIndex(true); avisos.push("hu/INDEX.md estaba desactualizado: regenerado"); }
  for (const a of avisos) console.warn(`  aviso · ${a}`);
  if (errores.length) {
    console.error(`\n${errores.length} problema(s) en las historias:`);
    for (const e of errores) console.error(`  · ${e}`);
    process.exit(1);
  }
  console.log(`${hs.length} historia(s) válidas.`);
}

const pos = process.argv.slice(2).filter((a, i, arr) => !a.startsWith("--") && arr[i - 1] !== "--destino" && arr[i - 1] !== "--forzar");
const [cmd, ...resto] = pos;
try {
  if (cmd === "new") cmdNew(resto.join(" ").trim());
  else if (cmd === "fase") cmdFase(resto[0], resto[1]);
  else if (cmd === "estado") cmdEstado(resto[0], resto[1], resto.slice(2).join(" "));
  else if (cmd === "log") cmdLog(resto[0], resto.slice(1).join(" "));
  else if (cmd === "index") cmdIndex();
  else if (cmd === "check") cmdCheck();
  else throw new Error('Uso: hu.mjs new "<título>" | fase <HU> <fase> | estado <HU> <estado> "<por qué>" | log <HU> "<texto>" | index | check');
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
