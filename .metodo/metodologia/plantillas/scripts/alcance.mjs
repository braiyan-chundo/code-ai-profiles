#!/usr/bin/env node
// El alcance contratado: sellarlo, ampliarlo solo por acta, y comprobar que nadie lo tocó a mano.
//   node .metodo/scripts/alcance.mjs sellar [--forzar]        guarda el alcance aprobado como base
//   node .metodo/scripts/alcance.mjs aplicar <acta.md>        añade al alcance los ítems de un acta, citándola
//   node .metodo/scripts/alcance.mjs check                    cada ítem viene de la base sellada o de un acta
//
// Es el camino para escribir un documento protegido por una regla `deny` de Edit: la regla se
// queda y el cambio lo aplica este script, siempre desde un acta (metodologia v4, configuracion.md: el alcance sellado).
//
// Formato de un ítem (alcance y actas):
//   - **A.3.1** — Texto observable del ítem. *(entrega 1)*
//     (las líneas siguientes con sangría pertenecen al mismo ítem)
// Un acta numerada (docs/producto/actas/acta-NN-<tema>.md) trae sus ítems nuevos en cualquier sección
// y las precisiones de ítems existentes bajo «## Precisiones y ampliaciones posteriores».
// Configuración: .metodo/config.json → alcance (archivo, nombre). Solo con alcance: sellado. Base sellada: docs/producto/alcance-sellado.json.
// Solo Node estándar.

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, basename, relative } from "node:path";
import { fileURLToPath } from "node:url";

// Manda la ubicación del script (.metodo/scripts/ → la raíz es ../..): no actúa sobre otro proyecto.
const RAIZ = dirname(fileURLToPath(import.meta.url)).endsWith(join(".metodo", "scripts"))
  ? join(dirname(fileURLToPath(import.meta.url)), "..", "..") : (process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
const leerJSON = (r) => { try { return JSON.parse(readFileSync(r, "utf8")); } catch { return null; } };
const CFG_V4 = leerJSON(join(RAIZ, ".metodo", "config.json"))?.alcance ?? {};
const CFG = { anexo: CFG_V4.archivo ?? "docs/producto/alcance.md", item: "\\*\\*(A\\.\\d+\\.\\d+)\\*\\*",
  nombreDelAlcance: CFG_V4.nombre ?? "alcance" };
const ANEXO = join(RAIZ, CFG.anexo);
const ACTAS = join(RAIZ, "docs", "producto", "actas");
const BASE = join(RAIZ, "docs", "producto", "alcance-sellado.json");
const ID = new RegExp(`^- ${CFG.item}\\s+—\\s+`);

// ── lectura de ítems ─────────────────────────────────────────────────────────

function items(texto) {
  const salida = [];
  const lineas = texto.split("\n");
  let actual = null;
  let seccion = "";
  for (const l of lineas) {
    if (/^#{1,6}\s/.test(l)) { seccion = l.replace(/^#+\s*/, ""); actual = null; continue; }
    const m = l.match(ID);
    if (m) { actual = { id: m[1], texto: l.slice(m[0].length), seccion }; salida.push(actual); continue; }
    if (actual && /^\s{2,}\S/.test(l)) actual.texto += " " + l.trim();
    else actual = null;
  }
  return salida;
}

// Las anotaciones de precisión no forman parte del texto contractual comparado.
const normal = (t) => t.replace(/\s*\*\((?:Redacción\s+)?[Pp]recisad[ao][^)]*\)\*/g, "").replace(/\s+/g, " ").trim();

function actas() {
  if (!existsSync(ACTAS)) return [];
  return readdirSync(ACTAS).filter((f) => /^acta-\d+.*\.md$/.test(f)).sort().map((f) => {
    const texto = readFileSync(join(ACTAS, f), "utf8");
    const precisiones = texto.split(/^## Precisiones y ampliaciones posteriores[^\n]*$/m)[1] ?? "";
    return {
      archivo: f, numero: f.match(/^acta-(\d+)/)[1], texto,
      // La fecha, en tabla («| **Fecha** | … |») o en línea («Fecha: … ·»), como trae la plantilla.
      fecha: (texto.match(/\|\s*\*\*Fecha\*\*\s*\|\s*([^|]+?)\s*\|/)?.[1] ?? texto.match(/^Fecha:\s*([^·\n]+?)\s*(?:·|$)/m)?.[1] ?? "").trim(),
      tema: texto.match(/^# Acta \d+ · (.+)$/m)?.[1]?.trim() ?? f,
      items: items(texto), precisiones: items(precisiones.split(/^## /m)[0] ?? ""),
    };
  });
}

// ── comandos ─────────────────────────────────────────────────────────────────

function sellar() {
  if (!existsSync(ANEXO)) throw new Error(`No existe ${CFG.anexo}.`);
  if (existsSync(BASE) && !process.argv.includes("--forzar"))
    throw new Error(`${relative(RAIZ, BASE)} ya existe. El ${CFG.nombreDelAlcance} solo cambia por acta: node .metodo/scripts/alcance.mjs aplicar <acta>.`);
  const lista = items(readFileSync(ANEXO, "utf8"));
  if (!lista.length) throw new Error(`${CFG.anexo} no tiene ningún ítem con el formato «- **A.x.y** — texto».`);
  const base = { sellado: new Date().toISOString().slice(0, 10), items: Object.fromEntries(lista.map((i) => [i.id, normal(i.texto)])) };
  writeFileSync(BASE, JSON.stringify(base, null, 2) + "\n");
  console.log(`Sellados ${lista.length} ítems en ${relative(RAIZ, BASE)}. Desde aquí, solo cambian por acta.`);
}

function aplicar(ruta) {
  if (!ruta) throw new Error("Uso: node .metodo/scripts/alcance.mjs aplicar docs/producto/actas/acta-NN-<tema>.md");
  const archivo = basename(ruta);
  const acta = actas().find((a) => a.archivo === archivo);
  if (!acta) throw new Error(`${archivo} no está en docs/producto/actas/ o no se llama acta-NN-<tema>.md.`);
  if (!/«[^»]+»/.test(acta.texto)) throw new Error(`${archivo} no cita ninguna autorización literal entre «».`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(acta.fecha)) throw new Error(`${archivo}: falta la fecha del acta (línea «Fecha: AAAA-MM-DD · …»); el alcance sellado no admite «${acta.fecha || "<vacío>"}».`);
  let anexo = readFileSync(ANEXO, "utf8");
  const existentes = new Map(items(anexo).map((i) => [i.id, i]));
  const ids = new Set(acta.precisiones.map((p) => p.id));
  const nuevos = acta.items.filter((i) => !existentes.has(i.id) && !ids.has(i.id));
  const cambios = [];

  for (const p of acta.precisiones) {
    const viejo = existentes.get(p.id);
    if (!viejo) throw new Error(`${archivo}: la precisión de ${p.id} se refiere a un ítem que no existe.`);
    const re = new RegExp(`^- \\*\\*${p.id.replace(/\./g, "\\.")}\\*\\*\\s+—\\s+[^\\n]*(?:\\n[ \\t]{2,}\\S[^\\n]*)*`, "m");
    anexo = anexo.replace(re, `- **${p.id}** — ${normal(p.texto)} *(Precisado por el acta ${acta.numero}, ${acta.fecha}.)*`);
    cambios.push(`${p.id} precisado`);
  }

  if (nuevos.length) {
    const prefijo = nuevos[0].id.split(".").slice(0, 2).join(".");
    if (nuevos.some((i) => !i.id.startsWith(prefijo + ".")))
      throw new Error(`${archivo}: los ítems nuevos deben compartir sección (${prefijo}.n).`);
    const lineas = nuevos.map((i) => `- **${i.id}** — ${normal(i.texto)}`).join("\n");
    const cabecera = new RegExp(`^## ${prefijo.replace(".", "\\.")} · [^\\n]*$`, "m");
    if (cabecera.test(anexo)) {
      const desde = anexo.search(cabecera);
      const fin = anexo.slice(desde + 3).search(/^## /m);
      const corte = fin === -1 ? anexo.length : desde + 3 + fin;
      anexo = anexo.slice(0, corte).replace(/\n*$/, "\n") + lineas + "\n\n" + anexo.slice(corte);
    } else {
      anexo = anexo.replace(/\n*$/, "\n") + `\n## ${prefijo} · ${acta.tema} (acta ${acta.numero})\n\n` +
        `> Incorporada mediante el [acta ${acta.numero}](actas/${archivo}), del ${acta.fecha}.\n\n${lineas}\n`;
    }
    cambios.push(`${nuevos.length} ítem(s) nuevos: ${nuevos.map((i) => i.id).join(", ")}`);
  }
  // Las exclusiones que el acta levanta se tachan en fuera de alcance, citándola.
  const levanta = [...((acta.texto.split(/^## Exclusiones que se levantan[^\n]*$/m)[1] ?? "").split(/^## /m)[0].matchAll(/\b(C\.\d+\.\d+)\b/g))].map((m) => m[1]);
  const FUERA = join(RAIZ, "docs", "producto", "fuera-de-alcance.md");
  if (levanta.length && existsSync(FUERA)) {
    let fuera = readFileSync(FUERA, "utf8");
    for (const c of levanta) {
      const re = new RegExp(`^- (\\*\\*${c.replace(/\./g, "\\.")}\\*\\*[^\n]*)$`, "m");
      if (!re.test(fuera)) throw new Error(`${archivo}: levanta ${c}, que no está en fuera-de-alcance.md.`);
      fuera = fuera.replace(re, (_, t) => `- ~~${t}~~ *(Levantada por el acta ${acta.numero}, ${acta.fecha}.)*`);
      cambios.push(`${c} levantada`);
    }
    writeFileSync(FUERA, fuera);
  }
  if (!cambios.length) { console.log(`${archivo}: nada que aplicar (sus ítems ya están en el ${CFG.nombreDelAlcance}).`); return; }
  writeFileSync(ANEXO, anexo);
  console.log(`${archivo} aplicada a ${CFG.anexo}: ${cambios.join("; ")}.`);
}

function check() {
  if (!existsSync(ANEXO)) { console.log(`No existe ${CFG.anexo} todavía: nada que comprobar.`); return; }
  const base = leerJSON(BASE);
  if (!base) { console.warn(`  aviso · el ${CFG.nombreDelAlcance} no está sellado: node .metodo/scripts/alcance.mjs sellar (arranque, paso 7).`); return; }
  const lista = actas();
  const errores = [];
  const presentes = new Set();
  for (const i of items(readFileSync(ANEXO, "utf8"))) {
    presentes.add(i.id);
    const t = normal(i.texto);
    if (base.items[i.id] === t) continue;
    const deActa = lista.some((a) => [...a.items, ...a.precisiones].some((x) => x.id === i.id && normal(x.texto) === t));
    if (!deActa)
      errores.push(`${i.id}: su texto no es el sellado ni el de ningún acta. El ${CFG.nombreDelAlcance} solo cambia por acta.`);
  }
  for (const id of Object.keys(base.items))
    if (!presentes.has(id)) errores.push(`${id}: estaba sellado y ya no está en ${CFG.anexo}. Un ítem no se borra; se precisa por acta.`);
  if (errores.length) {
    console.error(`\n${errores.length} problema(s) en el ${CFG.nombreDelAlcance}:\n`);
    for (const e of errores) console.error(`  · ${e}`);
    process.exit(1);
  }
  console.log(`${CFG.nombreDelAlcance[0].toUpperCase()}${CFG.nombreDelAlcance.slice(1)} en orden: ${presentes.size} ítems, sellado el ${base.sellado}, ${lista.length} acta(s).`);
}

const [comando, ...resto] = process.argv.slice(2);
try {
  if (comando === "sellar") sellar();
  else if (comando === "aplicar") aplicar(resto.find((r) => !r.startsWith("--")));
  else if (comando === "check" || comando === undefined) check();
  else throw new Error("Uso: node .metodo/scripts/alcance.mjs sellar | aplicar <acta.md> | check");
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
