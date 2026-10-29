#!/usr/bin/env node
// Gates al terminar un turno (hook Stop de Claude Code). Ver arnes.md §3.
//
// - Corre SOLO los gates cuyo dominio cambió (git status de cada repo y del gobierno).
// - Según su nivel en la config: off (no corre) · aviso (imprime y deja terminar) · bloqueo (sale con 2).
// - Los dos fijos (configuración en el código y producción) siempre bloquean.
// - Si el turno ya se bloqueó una vez (stop_hook_active), los gates de dial pasan a aviso para no
//   entrar en bucle; los fijos siguen bloqueando.
// - NO corre pruebas nunca.
// - FAIL-OPEN ante un error propio.

import { readFileSync, existsSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const RAIZ = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const scripts = join(RAIZ, ".metodo", "scripts");

function correr(cmd) {
  try {
    execSync(cmd, { cwd: RAIZ, stdio: "pipe", env: { ...process.env, CLAUDE_PROJECT_DIR: RAIZ } });
    return null;
  } catch (e) {
    return [e.stdout, e.stderr].filter(Boolean).map(String).join("").trim();
  }
}

try {
  let entrada = {};
  try { entrada = JSON.parse(readFileSync(0, "utf8") || "{}"); } catch {}
  if (!existsSync(join(scripts, "lib.mjs"))) process.exit(0);
  const lib = await import(pathToFileURL(join(scripts, "lib.mjs")).href);
  const cfg = lib.leerConfig(RAIZ);
  if (!cfg) process.exit(0);
  const v = lib.efectiva(cfg, lib.leerPerfiles(RAIZ)).valores;
  const gates = v.gates ?? {};
  const segundaVez = Boolean(entrada.stop_hook_active);

  const dirs = [...new Set([RAIZ, ...(cfg.repos ?? []).map((r) => resolve(RAIZ, r.ruta))])];
  const cambios = [...new Set(dirs.flatMap((d) => lib.cambiados(d) ?? []))].map((a) => relative(RAIZ, a).split(sep).join("/"));
  if (!cambios.length) process.exit(0);
  const toca = (re) => cambios.some((c) => re.test(c));
  const gobierno = /^(hu|docs|\.metodo|\.claude)\//;
  const hayCodigo = cambios.some((c) => !gobierno.test(c));

  const lista = [];
  if (hayCodigo) {
    lista.push({ nombre: "configuración en el código", nivel: "bloqueo", fijo: true, cmd: `node "${join(scripts, "config.mjs")}" check` });
    lista.push({ nombre: "guarda de producción", nivel: "bloqueo", fijo: true, cmd: `node "${join(scripts, "entorno.mjs")}" check` });
  }
  if (toca(/^hu\//)) lista.push({ nombre: "historias", nivel: gates.historias ?? "bloqueo", cmd: `node "${join(scripts, "hu.mjs")}" check` });
  if (v.alcance === "sellado" && toca(/^docs\/producto\//)) lista.push({ nombre: "alcance", nivel: gates.alcance ?? "bloqueo", cmd: `node "${join(scripts, "alcance.mjs")}" check` });
  if (cfg.rasgos?.paqueteDeContratos && hayCodigo && existsSync(join(scripts, "contracts.mjs")))
    lista.push({ nombre: "contratos", nivel: gates.contratos ?? "aviso", cmd: `node "${join(scripts, "contracts.mjs")}" check` });
  if (v.grafo === "graphify" && hayCodigo && existsSync(join(scripts, "grafo.mjs")))
    lista.push({ nombre: "grafo (estructura)", nivel: gates.grafo ?? "aviso", cmd: `node "${join(scripts, "grafo.mjs")}" check` });

  // Gates propios del proyecto (config.gatesPropios): { nombre, comando, cuando: codigo|gobierno|siempre, nivel: aviso|bloqueo }.
  for (const g of cfg.gatesPropios ?? []) {
    const toca = g.cuando === "siempre" || (g.cuando === "gobierno" ? cambios.some((c) => gobierno.test(c)) : hayCodigo);
    if (toca) lista.push({ nombre: g.nombre, nivel: g.nivel ?? "aviso", cmd: g.comando });
  }

  const bloquean = [];
  const avisan = [];
  for (const g of lista) {
    if (g.nivel === "off") continue;
    const salida = correr(g.cmd);
    if (salida === null) continue;
    const nivel = g.fijo ? "bloqueo" : segundaVez ? "aviso" : g.nivel;
    (nivel === "bloqueo" ? bloquean : avisan).push(`${g.nombre}:\n${salida.split("\n").map((l) => "  " + l).join("\n")}`);
  }
  const corridos = lista.filter((g) => g.nivel !== "off").map((g) => g.nombre);
  if (corridos.length) console.error(`fin de turno · gates: ${corridos.join(", ")} · ${bloquean.length ? `${bloquean.length} bloquean` : "en orden"}`);
  for (const a of avisan) console.error(`aviso · ${a}\n`);
  if (bloquean.length) {
    console.error(`\nEntrega detenida por ${bloquean.length} gate(s):\n`);
    for (const b of bloquean) console.error(`· ${b}\n`);
    process.exit(2);
  }
} catch (e) {
  console.error(`fin-de-turno: error interno, se deja pasar (${e.message})`);
  process.exit(0);
}
