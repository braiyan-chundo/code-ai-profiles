#!/usr/bin/env node
// Guarda fija (hook PreToolUse de Claude Code). Antes de cada herramienta:
//   Bash                     ¿el comando toca producción?                      → entorno.mjs
//   Edit · Write · MultiEdit ¿el texto nuevo trae secretos, URLs fijas o lecturas sueltas del entorno? → config.mjs
// Sale con 2 si bloquea: la herramienta no corre y el agente lee el porqué en stderr.
// FAIL-OPEN ante un error propio: avisa y deja pasar. Ver arnes.md §3.

import { readFileSync, appendFileSync, existsSync } from "node:fs";
import { join, relative, isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";

const RAIZ = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const scripts = join(RAIZ, ".metodo", "scripts");

function bloquear(texto) {
  console.error(texto);
  process.exit(2);
}

try {
  let entrada;
  try { entrada = JSON.parse(readFileSync(0, "utf8") || "{}"); }
  catch { console.error("guarda: la entrada del hook no es JSON válido; se deja pasar (fail-open)"); process.exit(0); }
  const herramienta = entrada.tool_name ?? "";
  const datos = entrada.tool_input ?? {};

  // Actividad: una línea por herramienta y agente, para ver qué hace cada uno (metodo.mjs actividad).
  // Nunca el comando entero: su descripción, o sus primeras palabras con lo largo recortado.
  try {
    if (existsSync(join(RAIZ, ".metodo"))) {
      const quien = entrada.agent_type || "orquestador";
      const corto = (t) => String(t ?? "").replace(/\s+/g, " ").replace(/[A-Za-z0-9_\-+/=]{24,}/g, "…").slice(0, 90);
      const ruta = datos.file_path ? relative(RAIZ, String(datos.file_path)) : "";
      const que = herramienta === "Bash" ? corto(datos.description || datos.command)
        : herramienta === "Agent" ? `${datos.subagent_type ?? ""} · ${corto(datos.description)}`
        : herramienta === "Skill" ? corto(datos.skill)
        : ruta || corto(datos.pattern || datos.url || datos.query || datos.path);
      appendFileSync(join(RAIZ, ".metodo", "actividad.log"), `${new Date().toISOString()}\t${quien}\t${entrada.agent_id ?? ""}\t${herramienta}\t${que}\n`);
    }
  } catch { /* la actividad nunca bloquea */ }

  if (herramienta === "Bash") {
    const { revisarComando } = await import(pathToFileURL(join(scripts, "entorno.mjs")).href);
    const problemas = revisarComando(String(datos.command ?? ""), RAIZ);
    if (problemas.length)
      bloquear(`Guarda de producción: este comando toca producción (${problemas.join("; ")}).\n` +
        "Los agentes trabajan en local. Si hace falta actuar sobre producción, lo hace devops con autorización explícita de la persona. No lo rodees (entornos.md §5).");
  }

  if (["Edit", "Write", "MultiEdit"].includes(herramienta)) {
    const ruta = String(datos.file_path ?? "");
    const rel = isAbsolute(ruta) ? relative(RAIZ, ruta) : ruta;

    // Territorio: dentro de un subagente, el hook recibe agent_type (el `name` del agente).
    // La sesión principal (el orquestador) no lleva agent_type y no se limita aquí.
    const lib = await import(pathToFileURL(join(scripts, "lib.mjs")).href);
    const cfg = lib.leerConfig(RAIZ);
    const v = cfg ? lib.efectiva(cfg, lib.leerPerfiles(RAIZ)).valores : {};
    const rol = cfg && lib.rolDeAgente(cfg, entrada.agent_type, v.agentes ?? []);
    if (rol) {
      const nivel = v.gates?.territorio ?? "off";
      if (nivel === "bloqueo" && !rel.startsWith("..") && !lib.dentroDelTerritorio(cfg, rol, rel, v))
        bloquear(`Territorio: ${entrada.agent_type} (${rol}) no escribe en ${rel}.\n` +
          `Escribe en: ${lib.territorio(cfg, rol, v).join(", ") || "—"}.\n` +
          "Devuelve lo que necesitas al orquestador para que lo despache al rol dueño. No pidas que lo haga él en tu lugar (seguridad.md, el blanqueo de permisos).");
    }
    const textos = herramienta === "Write" ? [datos.content]
      : herramienta === "Edit" ? [datos.new_string]
      : (datos.edits ?? []).map((e) => e.new_string);
    const texto = textos.filter(Boolean).join("\n");
    const { leerConfig } = await import(pathToFileURL(join(scripts, "lib.mjs")).href);
    const { revisarTexto, QUE_HACER } = await import(pathToFileURL(join(scripts, "config.mjs")).href);
    const { revisarTexto: revisarProduccion, produccion } = await import(pathToFileURL(join(scripts, "entorno.mjs")).href);
    const hallazgos = revisarTexto(texto, rel, leerConfig(RAIZ));
    const prod = /(^|[\\/])(\.metodo|docs|hu)[\\/]/.test(rel) ? [] : revisarProduccion(texto, produccion(RAIZ));
    if (hallazgos.length || prod.length) {
      const lineas = hallazgos.map((h) => `  · línea ${h.linea} del texto nuevo: ${h.tipo === "secreto" ? `posible ${h.detalle}` : h.tipo === "url" ? `URL fija ${h.detalle}` : `lectura suelta del entorno: ${h.detalle}`} → ${QUE_HACER[h.tipo]}`);
      for (const p of prod) lineas.push(`  · ${p} → apunta a una variable del entorno`);
      bloquear(`Configuración en el código, en ${rel} (configuracion-del-codigo.md):\n${lineas.join("\n")}\n` +
        "Si es un falso positivo real, añade la excepción a config.codigo.excepcionesUrl o «metodo:permitir <motivo>» en la línea de encima.");
    }
  }
} catch (e) {
  if (e?.code === "ERR_MODULE_NOT_FOUND") process.exit(0); // aún sin .metodo/scripts: nada que guardar
  console.error(`guarda: error interno, se deja pasar (${e.message})`);
  process.exit(0);
}
