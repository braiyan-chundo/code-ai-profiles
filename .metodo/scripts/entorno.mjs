#!/usr/bin/env node
// Guarda fija de producción: ningún agente lee, usa ni apunta a producción. Ver entornos.md.
//
//   node .metodo/scripts/entorno.mjs comando "<cmd>"     ¿este comando toca producción?
//   node .metodo/scripts/entorno.mjs check [--staged]    ¿lo que cambió trae hosts, marcas o archivos de producción?
//   node .metodo/scripts/entorno.mjs probar              comprueba que la guarda bloquea un fallo provocado
//
// Lee .metodo/entornos.json (sin secretos). Exporta revisarComando() para la guarda (hook PreToolUse).
// Solo Node estándar.

import { readFileSync, existsSync } from "node:fs";
import { join, relative, resolve, basename, extname } from "node:path";
import { pathToFileURL } from "node:url";
import { raizDelProyecto, leerConfig, leerJSON, cambiados } from "./lib.mjs";

const MARCAS_SIEMPRE = ["sk_live_", "rk_live_", "pk_live_", "whsec_live"];
const ARCHIVOS_SIEMPRE = [".env.production", ".env.prod", ".env.production.local"];

export function produccion(raiz) {
  const e = leerJSON(join(raiz, ".metodo", "entornos.json"), {})?.produccion ?? {};
  return {
    hosts: (e.hosts ?? []).filter(Boolean),
    marcas: [...new Set([...MARCAS_SIEMPRE, ...(e.marcas ?? [])])],
    archivos: [...new Set([...ARCHIVOS_SIEMPRE, ...(e.archivos ?? [])])],
  };
}

const escapar = (s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
function reHost(patron) {
  const cuerpo = patron.split("*").map(escapar).join("[a-z0-9.-]*");
  // Un host declarado cubre sus subdominios: «tienda.com» bloquea también «api.tienda.com».
  return new RegExp(`(?<![a-z0-9-])${cuerpo}(?![a-z0-9-])`, "i");
}

export function revisarTexto(texto, p) {
  const salida = [];
  for (const h of p.hosts) if (reHost(h).test(texto)) salida.push(`host de producción «${h}»`);
  for (const m of p.marcas) if (texto.includes(m)) salida.push(`marca de producción «${m}»`);
  return salida;
}

export function revisarComando(cmd, raiz) {
  const p = produccion(raiz);
  const salida = revisarTexto(cmd, p);
  for (const a of p.archivos) if (new RegExp(`(^|[\\s/'"=<>])${escapar(a)}(?![\\w.-])`).test(cmd)) salida.push(`archivo de producción «${a}»`);
  return salida;
}

const BINARIOS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip", ".gz", ".woff", ".woff2", ".ttf", ".mp4", ".mov", ".lock"]);
const FUERA = ["node_modules", ".git", ".metodo", ".claude", "hu", "docs", "dist", "build", "graphify-out"];

function main(argv) {
  const raiz = raizDelProyecto(argv);
  const args = argv.slice(2);
  const cmd = args[0];

  if (cmd === "comando") {
    const problemas = revisarComando(args.slice(1).filter((a) => a !== "--destino").join(" "), raiz);
    if (problemas.length) { console.error(`Toca producción: ${problemas.join("; ")}`); process.exit(1); }
    console.log("No toca producción.");
    return;
  }
  if (cmd === "probar") {
    const p = produccion(raiz);
    const host = p.hosts[0]?.replace(/\*/g, "x") ?? null;
    const casos = [`cat ${p.archivos[0]}`, `curl -H "Authorization: Bearer sk_live_${"x".repeat(12)}" https://api.ejemplo.com`];
    if (host) casos.push(`psql -h ${host} -U app`);
    const fallan = casos.filter((c) => !revisarComando(c, raiz).length);
    const bien = !revisarComando("curl http://localhost:3000/salud", raiz).length;
    if (!host) console.warn("  aviso · entornos.json no declara hosts de producción todavía: solo se prueban marcas y archivos");
    if (fallan.length || !bien) { console.error(`FALLO: la guarda no bloqueó ${fallan.join(" | ") || "—"}${bien ? "" : " o bloqueó localhost"}`); process.exit(1); }
    console.log(`La guarda bloquea los ${casos.length} comandos de producción provocados y deja pasar localhost.`);
    return;
  }
  if (cmd !== "check") { console.error('Uso: entorno.mjs comando "<cmd>" | check [--staged] [--repo <dir>] | probar'); process.exit(1); }

  const cfg = leerConfig(raiz);
  const iRepo = args.indexOf("--repo");
  const dirs = iRepo !== -1 ? [resolve(args[iRepo + 1])] : [...new Set([raiz, ...(cfg?.repos ?? []).map((r) => resolve(raiz, r.ruta))])];
  const staged = args.includes("--staged");
  const p = produccion(raiz);
  const problemas = [];
  const archivos = [...new Set(dirs.flatMap((d) => cambiados(d, { staged }) ?? []))]
    .filter((abs) => !relative(raiz, abs).split(/[\\/]/).some((s) => FUERA.includes(s)) && !BINARIOS.has(extname(abs)));
  for (const abs of archivos) {
    const rel = relative(raiz, abs);
    if (p.archivos.includes(basename(abs))) { problemas.push(`${rel}: es un archivo de producción y no debería estar aquí`); continue; }
    const lineas = readFileSync(abs, "utf8").split("\n");
    lineas.forEach((l, i) => { for (const x of revisarTexto(l, p)) problemas.push(`${rel}:${i + 1} · ${x}`); });
  }
  if (problemas.length) {
    console.error(`\nProducción en el código: ${problemas.length} problema(s) (entornos.md):`);
    for (const x of problemas) console.error(`  · ${x}\n      → apunta a la variable del entorno; el valor de producción lo pone devops en ese entorno`);
    process.exit(1);
  }
  console.log(`Guarda de producción: en orden (${archivos.length} archivo(s) revisados).`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main(process.argv);
