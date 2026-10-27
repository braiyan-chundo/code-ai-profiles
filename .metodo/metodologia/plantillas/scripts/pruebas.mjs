#!/usr/bin/env node
// Todas las ejecuciones de pruebas pasan por aquí: con tiempo máximo, avance visible, silencio en verde
// y sin repetir un SHA que ya pasó. Ver verificacion.md.
//
//   node .metodo/scripts/pruebas.mjs relacionadas <repo> <archivo>...   tipos + pruebas relacionadas (quien implementa)
//   node .metodo/scripts/pruebas.mjs suite <repo|todos> [--forzar]      tipos + build + suite (el orquestador)
//   node .metodo/scripts/pruebas.mjs estado                              qué SHA está en verde, por repo
//
// Los comandos salen de .metodo/config.json → stack.comandos.<repo>: tipos, build, relacionadas
// («{archivos}» se sustituye), suite. El tiempo máximo, de pruebas.timeoutMin. Solo Node estándar.

import { spawn } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { raizDelProyecto, rutas, leerConfig, leerPerfiles, efectiva, git, leerJSON, packsDelProyecto } from "./lib.mjs";

const RAIZ = raizDelProyecto();
const R = rutas(RAIZ);
const cfg = leerConfig(RAIZ);
if (!cfg) { console.error("Falta .metodo/config.json"); process.exit(1); }
const V = efectiva(cfg, leerPerfiles(RAIZ)).valores;
const LIMITE_MS = (V.pruebas?.timeoutMin ?? 10) * 60_000;
const AVANCE_MS = 30_000;

const repo = (nombre) => {
  const r = (cfg.repos ?? []).find((x) => x.nombre === nombre);
  if (!r) throw new Error(`Repo «${nombre}» no está en config.repos (${(cfg.repos ?? []).map((x) => x.nombre).join(", ")})`);
  // Lo que el proyecto no define sale del pack de su capa (servidor para api, apps para app).
  const tipoPack = { api: "servidor", worker: "servidor", app: "apps", paquete: "apps" }[r.tipo];
  const delPack = packsDelProyecto(RAIZ, cfg).find((p) => p.tipo === tipoPack)?.comandos ?? {};
  return { ...r, dir: resolve(RAIZ, r.ruta), comandos: { ...delPack, ...(cfg.stack?.comandos?.[nombre] ?? {}) } };
};

const mmss = (ms) => { const s = Math.round(ms / 1000); return s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`; };

function resumen(lineas) {
  const texto = lineas.join("\n");
  const pats = [
    /Tests?:?\s+(?:(\d+) failed[, |]+)?(\d+) passed[^\n]*/i, // vitest / jest
    /=+\s*(?:(\d+) failed, )?(\d+) passed[^\n]*=+/i,          // pytest
    /(\d+) passing[^\n]*/i,                                   // mocha
  ];
  for (const p of pats) { const m = texto.match(p); if (m) return m[0].replace(/\s+/g, " ").trim(); }
  return null;
}

function correr(etiqueta, comando, dir, log, inicioGlobal) {
  return new Promise((ok) => {
    const restante = LIMITE_MS - (Date.now() - inicioGlobal);
    if (restante <= 0) return ok({ codigo: null, cortado: true, cola: [] });
    log.write(`\n$ ${comando}   (en ${relative(RAIZ, dir) || "."})\n`);
    const p = spawn(comando, { cwd: dir, shell: true, detached: true, env: { ...process.env, CI: "1", FORCE_COLOR: "0" } });
    const cola = [];
    const empuja = (b) => {
      log.write(b);
      for (const l of b.toString().split("\n")) if (l.trim()) { cola.push(l); if (cola.length > 300) cola.shift(); }
    };
    p.stdout.on("data", empuja);
    p.stderr.on("data", empuja);
    const inicio = Date.now();
    const avance = setInterval(() => {
      console.log(`  … ${etiqueta}: ${mmss(Date.now() - inicio)} · ${(cola.at(-1) ?? "").trim().slice(0, 100)}`);
    }, AVANCE_MS);
    let cortado = false;
    const reloj = setTimeout(() => {
      cortado = true;
      try { process.kill(-p.pid, "SIGTERM"); } catch {}
      setTimeout(() => { try { process.kill(-p.pid, "SIGKILL"); } catch {} }, 5000);
    }, restante);
    p.on("close", (codigo) => {
      clearInterval(avance);
      clearTimeout(reloj);
      ok({ codigo, cortado, cola, ms: Date.now() - inicio });
    });
  });
}

function fallos(cola) {
  const utiles = cola.filter((l) => /(FAIL|✗|×|Error|error|failed|AssertionError|expected|Expected|Received|assert)/.test(l));
  return (utiles.length ? utiles : cola).slice(-30).map((l) => "      " + l.slice(0, 200)).join("\n");
}

async function pasos(nombre, lista, { registro } = {}) {
  const r = repo(nombre);
  mkdirSync(R.pruebas, { recursive: true });
  const rutaLog = join(R.pruebas, `ultima-${nombre}.log`);
  const log = createWriteStream(rutaLog);
  const inicio = Date.now();
  const hechos = [];
  for (const [etiqueta, comando] of lista) {
    if (!comando) continue;
    const res = await correr(`${nombre} · ${etiqueta}`, comando, r.dir, log, inicio);
    if (res.cortado) {
      log.end();
      console.error(`✗ ${nombre} · ${etiqueta}: cortado al llegar al tiempo máximo (${V.pruebas?.timeoutMin ?? 10} min). Última línea: ${(res.cola.at(-1) ?? "").trim().slice(0, 120)}`);
      console.error(`  Log completo: ${relative(RAIZ, rutaLog)}. ¿Una prueba colgada, un servidor que no arrancó o un navegador que no cargó?`);
      return { ok: false };
    }
    if (res.codigo !== 0) {
      log.end();
      console.error(`✗ ${nombre} · ${etiqueta} falló en ${mmss(res.ms)}${resumen(res.cola) ? ` (${resumen(res.cola)})` : ""}:\n${fallos(res.cola)}`);
      console.error(`  Log completo: ${relative(RAIZ, rutaLog)}`);
      return { ok: false };
    }
    hechos.push(`${etiqueta} ${resumen(res.cola) ?? "ok"} (${mmss(res.ms)})`);
  }
  log.end();
  const linea = `✓ ${nombre}: ${hechos.join(" · ") || "nada que correr"} — ${mmss(Date.now() - inicio)}`;
  console.log(linea);
  if (registro) writeFileSync(registro.ruta, JSON.stringify({ repo: nombre, sha: registro.sha, fecha: new Date().toISOString(), ok: true, resumen: linea }, null, 2) + "\n");
  return { ok: true };
}

async function relacionadas(nombre, archivos) {
  const r = repo(nombre);
  if (!archivos.length) throw new Error("Uso: pruebas.mjs relacionadas <repo> <archivo>...");
  // Cada archivo puede venir desde la raíz, desde el repo o absoluto. Si ninguno existe, no se dice «ok».
  const rels = [];
  for (const a of archivos) {
    const candidato = [resolve(a), resolve(r.dir, a), resolve(RAIZ, a)].find((p) => existsSync(p));
    if (!candidato) { console.error(`✗ ${a}: no existe (ni desde la raíz ni desde ${relative(RAIZ, r.dir) || "."})`); process.exitCode = 1; continue; }
    rels.push(relative(r.dir, candidato));
  }
  if (!rels.length) { console.error("✗ Ningún archivo existe: no se corrió ninguna prueba."); process.exitCode = 1; return; }
  const plantilla = r.comandos.relacionadas ?? r.comandos.modulo;
  if (!plantilla) console.warn(`  aviso · ${nombre} no tiene comando «relacionadas» en stack.comandos: solo se comprueban tipos`);
  const cmd = plantilla ? plantilla.replace("{archivos}", rels.map((x) => JSON.stringify(x)).join(" ")) : null;
  const res = await pasos(nombre, [["tipos", r.comandos.tipos], ["relacionadas", cmd]]);
  process.exitCode = res.ok ? 0 : 1;
}

async function suite(nombre) {
  const nombres = nombre === "todos" ? (cfg.repos ?? []).map((x) => x.nombre) : [nombre];
  let todoOk = true;
  for (const n of nombres) {
    const r = repo(n);
    if (!existsSync(r.dir)) { console.log(`· ${n}: el repo todavía no existe`); continue; }
    const sha = git("rev-parse --short HEAD", r.dir);
    const sucio = (git("status --porcelain -- .", r.dir) ?? "x").length > 0;
    const ruta = join(R.pruebas, `${n}-${sha}-suite.json`);
    if (sha && !sucio && existsSync(ruta) && !process.argv.includes("--forzar")) {
      console.log(`✓ ${n}: ya en verde en ${sha} (${leerJSON(ruta)?.fecha?.slice(0, 16)}); no se repite. --forzar para correrla igual.`);
      continue;
    }
    if (sucio) console.log(`  · ${n}: hay cambios sin commitear; se corre sin guardar registro (el registro es por SHA)`);
    const res = await pasos(n, [["tipos", r.comandos.tipos], ["build", r.comandos.build], ["suite", r.comandos.suite]],
      { registro: sha && !sucio ? { ruta, sha } : null });
    todoOk &&= res.ok;
  }
  process.exitCode = todoOk ? 0 : 1;
}

function estado() {
  if (!existsSync(R.pruebas)) { console.log("Sin registros todavía."); return; }
  for (const r of cfg.repos ?? []) {
    const sha = existsSync(resolve(RAIZ, r.ruta)) ? git("rev-parse --short HEAD", resolve(RAIZ, r.ruta)) : null;
    const regs = readdirSync(R.pruebas).filter((f) => f.startsWith(`${r.nombre}-`) && f.endsWith("-suite.json"));
    const actual = sha && regs.includes(`${r.nombre}-${sha}-suite.json`);
    console.log(`${actual ? "✓" : "·"} ${r.nombre}: HEAD ${sha ?? "—"} ${actual ? "en verde" : "sin suite en verde"}${regs.length ? ` · ${regs.length} SHA registrados` : ""}`);
  }
}

const pos = process.argv.slice(2).filter((a, i, arr) => !a.startsWith("--") && arr[i - 1] !== "--destino");
const [cmd, ...resto] = pos;
try {
  if (cmd === "relacionadas") await relacionadas(resto[0], resto.slice(1));
  else if (cmd === "suite") await suite(resto[0] ?? "todos");
  else if (cmd === "estado") estado();
  else throw new Error("Uso: pruebas.mjs relacionadas <repo> <archivo>... | suite <repo|todos> [--forzar] | estado");
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
