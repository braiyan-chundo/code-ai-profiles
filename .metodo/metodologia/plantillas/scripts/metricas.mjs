#!/usr/bin/env node
// Métricas de cada historia: cuánto tiempo pasó en cada fase y cuántos tokens gastó cada agente.
//   node .metodo/scripts/metricas.mjs hu <HU>     calcula y guarda hu/HU-####-*/metricas.json (lo llama hu.mjs al cerrar)
//   node .metodo/scripts/metricas.mjs resumen     docs/operaciones/metricas.md con todas las historias medidas
//
// De dónde sale cada número (ver metricas.md de la metodología):
//   - Tiempo por fase: las líneas «fase X → Y» de la bitácora (seguimiento.md), con su hora.
//   - Tokens de los agentes: las transcripciones de Claude Code de este proyecto
//     (~/.claude/projects/<carpeta>/<sesión>/subagents/agent-*.jsonl). Un despacho cuenta para la historia
//     si su prompt nombra la historia (HU-####). Es exacto.
//   - Tokens del orquestador: los mensajes de la sesión principal dentro de las ventanas de tiempo de
//     cada fase. Es aproximado: si se trabajan dos historias a la vez, se reparten mal.
// Solo Node estándar. Nunca bloquea: si no encuentra transcripciones, guarda lo que sí sabe.

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { raizDelProyecto, rutas, leerConfig, leerJSON } from "./lib.mjs";

const RAIZ = raizDelProyecto();
const R = rutas(RAIZ);
const cfg = leerConfig(RAIZ) ?? {};

// ── la bitácora: ventanas de cada fase ───────────────────────────────────────

function fechaDe(texto) {
  const m = String(texto).trim().match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}))?/);
  return m ? new Date(`${m[1]}T${m[2] ?? "00:00"}:00`) : null;
}

function ventanas(carpeta) {
  const ruta = join(R.hu, carpeta, "seguimiento.md");
  if (!existsSync(ruta)) return { fases: [], fin: null };
  const filas = readFileSync(ruta, "utf8").split("\n")
    .map((l) => l.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*(.+?)\s*\|$/)).filter(Boolean)
    .map(([, f, quien, que]) => ({ cuando: fechaDe(f), quien, que })).filter((x) => x.cuando);
  const cortes = [];
  for (const f of filas) {
    const creada = f.que.match(/creada:.*fase (\w+)/);
    const cambio = f.que.match(/fase (\w+) → (\w+)/);
    if (creada) cortes.push({ fase: creada[1], desde: f.cuando });
    else if (cambio) cortes.push({ fase: cambio[2], desde: f.cuando });
  }
  const terminada = filas.find((f) => /estado \S+ → (terminada|descartada)/.test(f.que));
  const fin = terminada?.cuando ?? new Date();
  const fases = cortes.map((c, i) => ({ fase: c.fase, desde: c.desde, hasta: cortes[i + 1]?.desde ?? fin }));
  return { fases, fin, aproximadaPorDia: filas.some((f) => !/\d{2}:\d{2}/.test(String(f.cuando))) };
}

// ── las transcripciones ──────────────────────────────────────────────────────

function carpetaDeTranscripciones() {
  const base = join(process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude"), "projects");
  const dir = join(base, RAIZ.replace(/[^a-zA-Z0-9]/g, "-"));
  return existsSync(dir) ? dir : null;
}

function lineas(ruta) {
  try { return readFileSync(ruta, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); }
  catch { return []; }
}

const vacio = () => ({ entrada: 0, salida: 0, cacheEscritura: 0, cacheLectura: 0 });
const total = (t) => t.entrada + t.salida + t.cacheEscritura + t.cacheLectura;

// Suma el uso de los mensajes del asistente sin contar dos veces el mismo mensaje (llega por bloques).
function sumar(registros, filtro = () => true) {
  const t = vacio();
  const vistos = new Set();
  for (const r of registros) {
    const u = r.type === "assistant" && r.message?.usage;
    if (!u || !filtro(r)) continue;
    const id = r.message.id ?? r.requestId ?? r.uuid;
    if (vistos.has(id)) continue;
    vistos.add(id);
    t.entrada += u.input_tokens ?? 0;
    t.salida += u.output_tokens ?? 0;
    t.cacheEscritura += u.cache_creation_input_tokens ?? 0;
    t.cacheLectura += u.cache_read_input_tokens ?? 0;
  }
  return t;
}

const textoDe = (c) => (typeof c === "string" ? c : Array.isArray(c) ? c.filter((x) => x.type === "text").map((x) => x.text).join("\n") : "");

function rolDe(nombre) {
  for (const [rol, a] of Object.entries(cfg.agentes ?? {})) if (a?.nombre === nombre) return rol;
  return nombre;
}

function medir(id, carpeta) {
  const { fases, fin, aproximadaPorDia } = ventanas(carpeta);
  const faseEn = (cuando) => fases.find((f) => cuando >= f.desde && cuando < f.hasta)?.fase ?? null;
  const dir = carpetaDeTranscripciones();
  const agentes = new Map();
  const orquestador = new Map();
  let sesiones = 0;
  if (dir) {
    for (const entrada of readdirSync(dir)) {
      const ruta = join(dir, entrada);
      // La sesión principal: el orquestador, por ventanas de tiempo.
      if (entrada.endsWith(".jsonl") && fases.length) {
        const regs = lineas(ruta);
        let tocada = false;
        for (const f of fases) {
          const t = sumar(regs, (r) => !r.isSidechain && r.timestamp && new Date(r.timestamp) >= f.desde && new Date(r.timestamp) < f.hasta);
          if (!total(t)) continue;
          tocada = true;
          const a = orquestador.get(f.fase) ?? vacio();
          for (const k of Object.keys(t)) a[k] += t[k];
          orquestador.set(f.fase, a);
        }
        if (tocada) sesiones++;
      }
      // Los subagentes: exactos, por la historia que nombra su prompt.
      const subs = join(ruta, "subagents");
      if (!statSync(ruta).isDirectory() || !existsSync(subs)) continue;
      for (const f of readdirSync(subs).filter((x) => x.endsWith(".jsonl"))) {
        const regs = lineas(join(subs, f));
        if (!regs.length || !textoDe(regs[0].message?.content).includes(id)) continue;
        const meta = leerJSON(join(subs, f.replace(/\.jsonl$/, ".meta.json")), {});
        const tiempos = regs.map((r) => r.timestamp).filter(Boolean).map((x) => new Date(x));
        const inicio = new Date(Math.min(...tiempos));
        const minutos = (Math.max(...tiempos) - inicio) / 60000;
        const nombre = meta.agentType ?? "desconocido";
        const clave = `${nombre}·${faseEn(inicio) ?? "fuera de fase"}`;
        const a = agentes.get(clave) ?? { agente: nombre, rol: rolDe(nombre), fase: faseEn(inicio) ?? "fuera de fase", modelos: new Set(), despachos: 0, minutos: 0, tokens: vacio() };
        const t = sumar(regs);
        for (const k of Object.keys(t)) a.tokens[k] += t[k];
        a.despachos += 1;
        a.minutos += minutos;
        for (const r of regs) if (r.message?.model) a.modelos.add(r.message.model);
        if (meta.model) a.modelos.add(meta.model);
        agentes.set(clave, a);
      }
    }
  }
  const listaAgentes = [...agentes.values()].map((a) => ({ ...a, modelos: [...a.modelos], minutos: Math.round(a.minutos), tokens: { ...a.tokens, total: total(a.tokens) } }));
  const listaOrq = [...orquestador.entries()].map(([fase, t]) => ({ fase, tokens: { ...t, total: total(t) } }));
  const tokensAgentes = listaAgentes.reduce((s, a) => s + a.tokens.total, 0);
  const tokensOrq = listaOrq.reduce((s, o) => s + o.tokens.total, 0);
  return {
    hu: id,
    generado: new Date().toISOString(),
    perfil: cfg.perfil ?? null,
    fases: fases.map((f) => ({ fase: f.fase, desde: f.desde.toISOString(), hasta: f.hasta.toISOString(), minutos: Math.round((f.hasta - f.desde) / 60000) })),
    minutosTotales: fases.length ? Math.round((fin - fases[0].desde) / 60000) : null,
    agentes: listaAgentes,
    orquestador: { aproximado: true, porFase: listaOrq },
    totales: { tokensAgentes, tokensOrquestador: tokensOrq, tokens: tokensAgentes + tokensOrq, despachos: listaAgentes.reduce((s, a) => s + a.despachos, 0) },
    notas: [
      ...(dir ? [] : ["No se encontraron transcripciones de Claude Code para este proyecto: solo hay tiempos."]),
      ...(aproximadaPorDia ? ["Parte de la bitácora no tiene hora (historia de antes de las métricas): los tiempos son por día."] : []),
      ...(dir && !sesiones && !listaAgentes.length ? ["Ninguna transcripción cae dentro de las fechas de la historia."] : []),
    ],
  };
}

// ── salida ───────────────────────────────────────────────────────────────────

const miles = (n) => Math.round(n).toLocaleString("es");
const horas = (m) => (m == null ? "—" : m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`);

function buscar(ref) {
  const id = /^\d+$/.test(String(ref)) ? `HU-${String(ref).padStart(4, "0")}` : String(ref).toUpperCase().slice(0, 7);
  const carpeta = existsSync(R.hu) ? readdirSync(R.hu).find((d) => d.startsWith(id)) : null;
  if (!carpeta) throw new Error(`No existe ninguna historia ${id} en hu/`);
  return { id, carpeta };
}

function cmdHu(ref) {
  const { id, carpeta } = buscar(ref);
  const m = medir(id, carpeta);
  writeFileSync(join(R.hu, carpeta, "metricas.json"), JSON.stringify(m, null, 2) + "\n");
  console.log(`Métricas de ${id} (hu/${carpeta}/metricas.json):`);
  console.log(`  tiempo total ${horas(m.minutosTotales)} · ${m.fases.map((f) => `${f.fase} ${horas(f.minutos)}`).join(" · ") || "sin fases"}`);
  console.log(`  tokens ${miles(m.totales.tokens)} (agentes ${miles(m.totales.tokensAgentes)} en ${m.totales.despachos} despacho(s) · orquestador ≈ ${miles(m.totales.tokensOrquestador)})`);
  for (const a of m.agentes) console.log(`    ${a.agente.padEnd(14)} ${a.fase.padEnd(15)} ${String(a.despachos).padStart(2)} desp. · ${miles(a.tokens.total).padStart(10)} tokens · ${horas(a.minutos)}`);
  for (const n of m.notas) console.log(`  nota · ${n}`);
}

function cmdResumen() {
  const filas = [];
  for (const d of existsSync(R.hu) ? readdirSync(R.hu).sort() : []) {
    const m = leerJSON(join(R.hu, d, "metricas.json"));
    if (m) filas.push(m);
  }
  const l = ["# Métricas de las historias", "", "> Generado por `node .metodo/scripts/metricas.mjs resumen`. Tokens del orquestador, aproximados.", ""];
  l.push("| Historia | Perfil | Tiempo total | Por fase | Despachos | Tokens agentes | Tokens orquestador | Total |", "| --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const m of filas)
    l.push(`| ${m.hu} | ${m.perfil ?? "—"} | ${horas(m.minutosTotales)} | ${m.fases.map((f) => `${f.fase} ${horas(f.minutos)}`).join(" · ")} | ${m.totales.despachos} | ${miles(m.totales.tokensAgentes)} | ${miles(m.totales.tokensOrquestador)} | ${miles(m.totales.tokens)} |`);
  const porRol = new Map();
  for (const m of filas) for (const a of m.agentes) { const r = porRol.get(a.rol) ?? { despachos: 0, tokens: 0, minutos: 0 }; r.despachos += a.despachos; r.tokens += a.tokens.total; r.minutos += a.minutos; porRol.set(a.rol, r); }
  l.push("", "## Por rol", "", "| Rol | Despachos | Tokens | Tokens por despacho | Tiempo |", "| --- | --- | --- | --- | --- |");
  for (const [rol, r] of porRol) l.push(`| ${rol} | ${r.despachos} | ${miles(r.tokens)} | ${miles(r.tokens / (r.despachos || 1))} | ${horas(r.minutos)} |`);
  const porFase = new Map();
  for (const m of filas) for (const f of m.fases) { const x = porFase.get(f.fase) ?? { n: 0, minutos: 0 }; x.n += 1; x.minutos += f.minutos; porFase.set(f.fase, x); }
  l.push("", "## Tiempo medio por fase", "", "| Fase | Historias | Media |", "| --- | --- | --- |");
  for (const [fase, x] of porFase) l.push(`| ${fase} | ${x.n} | ${horas(Math.round(x.minutos / x.n))} |`);
  mkdirSync(join(RAIZ, "docs", "operaciones"), { recursive: true });
  writeFileSync(join(RAIZ, "docs", "operaciones", "metricas.md"), l.join("\n") + "\n");
  console.log(`docs/operaciones/metricas.md con ${filas.length} historia(s) medidas.`);
}

const [cmd, ref] = process.argv.slice(2).filter((a, i, arr) => !a.startsWith("--") && arr[i - 1] !== "--destino");
try {
  if (cmd === "hu") cmdHu(ref);
  else if (cmd === "resumen") cmdResumen();
  else throw new Error("Uso: metricas.mjs hu <HU> | resumen");
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
