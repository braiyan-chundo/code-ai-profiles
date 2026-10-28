#!/usr/bin/env node
// Inventario de un proyecto que ya existe, para adoptar la v4 (adopcion.md, paso 1).
//
//   node <metodologia>/plantillas/scripts/inventario.mjs --destino .              lo imprime
//   node <metodologia>/plantillas/scripts/inventario.mjs --destino . --escribir   además, adopcion-inventario.md en la raíz
//
// Solo lee. Detecta repos y su tipo, stack y packs sugeridos, gestor, motor, comandos de pruebas, puertos,
// catálogos .env, rasgos (dinero, tiempo real, colas, sin conexión), docs, decisiones, backlog, diseño,
// CI, observabilidad y la configuración de otras herramientas de IA. Lo que no puede saber lo deja como
// pregunta. Solo Node estándar.

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, basename } from "node:path";

const args = process.argv.slice(2);
const i = args.indexOf("--destino");
const RAIZ = resolve(i !== -1 ? args[i + 1] : ".");
const FUERA = new Set(["node_modules", ".git", "dist", "build", ".next", ".nuxt", ".output", "coverage", ".turbo", ".venv", "venv", "__pycache__", ".metodo", "vendor"]);

const leer = (p) => { try { return readFileSync(p, "utf8"); } catch { return null; } };
const json = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };
const existe = (p) => existsSync(join(RAIZ, p));
const rel = (p) => relative(RAIZ, p) || ".";

function recorrer(dir, profundidad, visita) {
  if (profundidad < 0) return;
  let entradas = [];
  try { entradas = readdirSync(dir); } catch { return; }
  for (const f of entradas) {
    if (FUERA.has(f)) continue;
    const p = join(dir, f);
    let st; try { st = statSync(p); } catch { continue; }
    visita(p, f, st);
    if (st.isDirectory()) recorrer(p, profundidad - 1, visita);
  }
}

// ── repos y paquetes ─────────────────────────────────────────────────────────

const MANIFIESTOS = ["package.json", "pyproject.toml", "requirements.txt", "go.mod", "composer.json", "pubspec.yaml", "Gemfile", "pom.xml", "build.gradle"];
const unidades = [];
recorrer(RAIZ, 4, (p, f, st) => { if (!st.isDirectory() && MANIFIESTOS.includes(f) && !unidades.some((u) => u.dir === join(p, ".."))) unidades.push({ dir: join(p, ".."), manifiesto: f }); });
if (MANIFIESTOS.some((m) => existe(m)) && !unidades.some((u) => u.dir === RAIZ)) unidades.unshift({ dir: RAIZ, manifiesto: MANIFIESTOS.find((m) => existe(m)) });
const repoGit = (d) => existsSync(join(d, ".git"));

const DEP = {
  nest: /^@nestjs\/core$/, express: /^express$/, fastify: /^fastify$/, koa: /^koa$/, hono: /^hono$/,
  react: /^react$/, vue: /^vue$/, svelte: /^svelte$/, angular: /^@angular\/core$/, next: /^next$/, nuxt: /^nuxt$/, vite: /^vite$/, expo: /^expo$/,
  mongoose: /^(mongoose|mongodb|@nestjs\/mongoose)$/, postgres: /^(pg|postgres|@prisma\/client|prisma|typeorm|drizzle-orm|knex)$/, mysql: /^(mysql2?|mariadb)$/, sqlite: /^(better-sqlite3|sqlite3)$/,
  bullmq: /^(bullmq|bull|@nestjs\/bullmq|@nestjs\/bull)$/, redis: /^(ioredis|redis)$/, socket: /^(socket\.io|socket\.io-client|ws|@nestjs\/websockets)$/,
  dinero: /^(stripe|@stripe\/.*|mercadopago|paypal.*|@paypal\/.*|culqi.*|wompi.*|braintree)$/, pwa: /^(vite-plugin-pwa|workbox-.*|@angular\/service-worker)$/,
  shadcn: /^(@radix-ui\/.*|class-variance-authority)$/, tailwind: /^(tailwindcss|@tailwindcss\/.*)$/, tanstack: /^@tanstack\/react-query$/, zustand: /^zustand$/,
  vitest: /^vitest$/, jest: /^jest$/, playwright: /^@playwright\/test$/, cypress: /^cypress$/,
  sentry: /^@sentry\/.*$/, otel: /^@opentelemetry\/.*$/, pino: /^(pino|nestjs-pino)$/, winston: /^winston$/, swagger: /^@nestjs\/swagger$/,
};

function analizarPackage(u) {
  const pkg = json(join(u.dir, "package.json")) ?? {};
  const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies });
  const tiene = Object.fromEntries(Object.entries(DEP).map(([k, re]) => [k, deps.some((d) => re.test(d))]));
  const esRaizMonorepo = Boolean(pkg.workspaces) || existsSync(join(u.dir, "pnpm-workspace.yaml")) || existsSync(join(u.dir, "turbo.json")) || existsSync(join(u.dir, "nx.json"));
  const nombre = pkg.name ?? basename(u.dir);
  const servidor = tiene.nest || tiene.express || tiene.fastify || tiene.koa || tiene.hono;
  const app = tiene.react || tiene.vue || tiene.svelte || tiene.angular || tiene.next || tiene.nuxt || tiene.expo;
  // Primero lo que dice la carpeta (packages/ es librería), después las dependencias; una raíz de monorepo
  // con dependencias de servidor ES el servidor (NestJS con packages/ dentro).
  const tipo = /(^|\/)(packages|libs)\//.test(rel(u.dir)) ? "paquete"
    : /worker|jobs|queue/i.test(nombre + u.dir) && tiene.bullmq ? "worker"
    // En la raíz de un monorepo, las dependencias de pantalla suelen ser de sus paquetes: manda el servidor.
    : servidor && app ? (esRaizMonorepo || /api|server|backend/i.test(`${nombre} ${rel(u.dir)}`) ? "api" : "fullstack") : servidor ? "api" : app ? "app" : "otro";
  // Puertos: de la config de Vite, de un listen() o del .env.example.
  const puertos = new Set();
  for (const f of ["vite.config.ts", "vite.config.js", "vite.config.mts", "src/main.ts", "src/index.ts", "src/server.ts", ".env.example"]) {
    const t = leer(join(u.dir, f));
    if (!t) continue;
    for (const m of t.matchAll(/(?:port\s*[:=]\s*|listen\(\s*|PORT\s*=\s*)(\d{4,5})/gi)) puertos.add(Number(m[1]));
  }
  const s = pkg.scripts ?? {};
  return {
    dir: rel(u.dir), nombre, tipo, git: repoGit(u.dir), monorepo: esRaizMonorepo, tiene, puertos: [...puertos],
    scripts: Object.fromEntries(["dev", "build", "test", "typecheck", "lint", "preview", "start"].filter((k) => s[k]).map((k) => [k, s[k]])),
    catalogo: existsSync(join(u.dir, ".env.example")) ? fichas(join(u.dir, ".env.example")) : null,
  };
}

function fichas(ruta) {
  const t = leer(ruta) ?? "";
  const vars = [...t.matchAll(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/gm)].length;
  const conFicha = [...t.matchAll(/\[(SECRET|PUBLICO)\]/g)].length;
  return { vars, conFicha };
}

const paquetes = unidades.filter((u) => u.manifiesto === "package.json").map(analizarPackage);
const otros = unidades.filter((u) => u.manifiesto !== "package.json").map((u) => ({ dir: rel(u.dir), manifiesto: u.manifiesto, git: repoGit(u.dir) }));

// ── el resto del proyecto ────────────────────────────────────────────────────

const algun = (k) => paquetes.some((p) => p.tiene[k]);
const gestor = existe("pnpm-lock.yaml") || paquetes.some((p) => existsSync(join(RAIZ, p.dir, "pnpm-lock.yaml"))) ? "pnpm"
  : existe("yarn.lock") ? "yarn" : existe("bun.lockb") || existe("bun.lock") ? "bun" : existe("package-lock.json") ? "npm" : paquetes.length ? "npm (sin lockfile)" : null;
const motor = algun("mongoose") ? "mongodb" : algun("postgres") ? "postgres (o el que diga Prisma/TypeORM)" : algun("mysql") ? "mysql" : algun("sqlite") ? "sqlite" : null;
const packs = [
  ...(algun("nest") ? ["backend-nestjs"] : []), ...(algun("react") && algun("vite") ? ["frontend-react-vite"] : []),
  ...(motor === "mongodb" ? ["persistencia-mongodb"] : motor?.startsWith("postgres") ? ["persistencia-postgres"] : []),
  ...(algun("bullmq") ? ["colas-bullmq", "eventos"] : []), ...(algun("socket") ? ["tiempo-real"] : []), ...(algun("dinero") ? ["dinero"] : []),
];
const porForjar = [
  ...(algun("express") || algun("fastify") || algun("koa") || algun("hono") ? ["un pack de servidor para express/fastify/koa/hono"] : []),
  ...(algun("vue") || algun("svelte") || algun("angular") || algun("next") || algun("nuxt") || algun("expo") ? ["un pack de apps para vue/svelte/angular/next/nuxt/expo"] : []),
  ...(otros.length ? [`packs para ${[...new Set(otros.map((o) => o.manifiesto))].join(", ")}`] : []),
];

// Una carpeta de metodología (v3, v4 u otra) dentro del proyecto no es documentación del proyecto.
const esMetodologia = (r) => /(^|\/)metodolog[ií]a[^/]*\//i.test(r) || /^docs\/archivo\//.test(r);
const docs = [];
recorrer(RAIZ, 3, (p, f, st) => { if (!st.isDirectory() && f.endsWith(".md") && !esMetodologia(rel(p) + (st.isDirectory() ? "/" : ""))) docs.push(rel(p)); });
// ¿Es en realidad un proyecto en v3 (o ya en v4)? Entonces no es una adopción.
const huV3 = existe("hu") && readdirSync(join(RAIZ, "hu")).some((f) => /^HU-\d{4}\.md$/.test(f));
const yaV4 = existe(".metodo/config.json");
const esV3 = !yaV4 && (huV3 || existe("marcadores.json") || (existe("AGENTS.md") && existe("hu/config.json")));
const deDecisiones = docs.filter((d) => /adr|decisi|decision/i.test(d));
const deBacklog = docs.filter((d) => /backlog|todo|roadmap|historia|stories|story|requerim|requirement|alcance|scope|issues|tareas|tasks/i.test(d));
const deDiseno = [
  ...paquetes.filter((p) => existsSync(join(RAIZ, p.dir, "components.json"))).map((p) => `${p.dir}/components.json (shadcn)`),
  ...paquetes.filter((p) => existsSync(join(RAIZ, p.dir, ".storybook"))).map((p) => `${p.dir}/.storybook`),
  ...docs.filter((d) => /dise[nñ]o|design|tokens|estilo|style ?guide|marca|brand/i.test(d)),
];
const IA = ["CLAUDE.md", "AGENTS.md", ".claude/agents", ".claude/commands", ".claude/skills", ".claude/settings.json", ".claude/launch.json",
  ".cursorrules", ".cursor/rules", ".windsurfrules", ".github/copilot-instructions.md", ".clinerules", "GEMINI.md"].filter(existe);
const ci = [".github/workflows", ".gitlab-ci.yml", "bitbucket-pipelines.yml", ".circleci"].filter(existe);
const scriptsPropios = existe("scripts") ? readdirSync(join(RAIZ, "scripts")) : [];
const envSueltos = []; recorrer(RAIZ, 3, (p, f, st) => { if (!st.isDirectory() && /^\.env(\..+)?$/.test(f) && f !== ".env.example") envSueltos.push(rel(p)); });

// ── salida ───────────────────────────────────────────────────────────────────

const si = (b) => (b ? "sí" : "no");
const lista = (xs, n = 8) => (xs.length ? xs.slice(0, n).map((d) => `\`${d}\``).join(", ") + (xs.length > n ? ` y ${xs.length - n} más` : "") : "");
const g = (gestor ?? "npm").split(" ")[0];
const ej = g === "pnpm" ? "pnpm exec" : g === "yarn" ? "yarn" : g === "bun" ? "bunx" : "npx";
const l = [];
l.push(`# Inventario para adoptar la metodología v4 · ${basename(RAIZ)}`, "", `> Generado por \`inventario.mjs\` el ${new Date().toLocaleDateString("sv-SE")}. Solo lee; lo dudoso queda como pregunta.`, "");
if (yaV4) l.push("> **Este proyecto ya usa la v4** (`.metodo/config.json`): no hay nada que adoptar. Para actualizar la versión, ver la nota de actualización de adopcion.md.", "");
if (!paquetes.length && !otros.length && !esV3 && !yaV4) l.push("> **No hay código con manifiesto en este proyecto**: no es una adopción, es un proyecto nuevo. Usa **arranque.md**.", "");
if (esV3) l.push("> **Este proyecto parece estar en la metodología v3** (historias `hu/HU-####.md`, `marcadores.json` o `hu/config.json`). No es una adopción: usa **migracion-v3.md** y `migrar-v3.mjs`.", "");
l.push("## Repos y paquetes", "", "| Carpeta | Nombre | Tipo propuesto | Git propio | Puertos | Scripts | `.env.example` |", "| --- | --- | --- | --- | --- | --- | --- |");
for (const p of paquetes)
  l.push(`| \`${p.dir}\` | ${p.nombre} | ${p.tipo}${p.monorepo ? " (raíz de monorepo)" : ""} | ${si(p.git)} | ${p.puertos.join(", ") || "—"} | ${Object.keys(p.scripts).join(", ") || "—"} | ${p.catalogo ? `${p.catalogo.vars} variables, ${p.catalogo.conFicha} con ficha` : "no hay"} |`);
for (const o of otros) l.push(`| \`${o.dir}\` | — | (${o.manifiesto}) | ${si(o.git)} | — | — | — |`);
if (!paquetes.length && !otros.length) l.push("| — | No se encontró código con manifiesto | | | | | |");
l.push("", `Repo git en la raíz: ${si(repoGit(RAIZ))}.`, "");
l.push("## Stack", "", `- Gestor de paquetes: ${gestor ?? "—"}`, `- Base de datos: ${motor ?? "no detectada"}`,
  `- Pruebas: ${[algun("vitest") && "vitest", algun("jest") && "jest", algun("playwright") && "playwright", algun("cypress") && "cypress"].filter(Boolean).join(", ") || "no detectadas"}`,
  `- Packs que existen y encajan: ${packs.map((p) => `\`${p}\``).join(", ") || "ninguno"}`, `- Por forjar: ${porForjar.join("; ") || "nada"}`, "");
l.push("## Rasgos (indicios; se confirman con la persona)", "",
  `- Dinero (pasarela): ${si(algun("dinero"))} · Tiempo real: ${si(algun("socket"))} · Colas: ${si(algun("bullmq"))} · Sin conexión (PWA): ${si(algun("pwa"))}`,
  `- Datos personales: no se puede saber desde el código → pregunta`, `- Varias apps: ${si(paquetes.filter((p) => p.tipo === "app").length > 1)}`, "");
l.push("## Lo que ya existe y cómo pasa a la v4 (adopcion.md §4)", "",
  `- Documentos .md del proyecto: ${docs.length}${docs.length ? ` (${lista(docs, 6)})` : ""}`,
  `- Decisiones: ${lista(deDecisiones) || "ninguna escrita"} → ADR heredados`,
  `- Backlog o alcance en el repo: ${lista(deBacklog) || "ninguno"} → historias o alcance. **¿Hay backlog fuera del repo (Jira, Trello, Notion, GitHub Issues)?** → pregunta`,
  `- Diseño: ${lista(deDiseno) || "nada detectado"} → guías aprobadas (heredadas) si es un sistema en uso`,
  `- Configuración de IA: ${IA.map((d) => `\`${d}\``).join(", ") || "ninguna"} → reglas propias en \`.metodo/reglas/\`; \`launch.json\` se mezcla`,
  `- Scripts propios: ${scriptsPropios.map((d) => `\`scripts/${d}\``).join(", ") || "ninguno"} → se quedan; los que son gates, a \`gatesPropios\``,
  `- CI: ${ci.map((d) => `\`${d}\``).join(", ") || "no hay"} → se queda como está`,
  `- Observabilidad: ${[algun("sentry") && "Sentry", algun("otel") && "OpenTelemetry", algun("pino") && "pino", algun("winston") && "winston"].filter(Boolean).join(", ") || "nada"}`,
  `- Swagger: ${si(algun("swagger"))} · Tailwind: ${si(algun("tailwind"))} · shadcn/Radix: ${si(algun("shadcn"))} · TanStack Query: ${si(algun("tanstack"))} · Zustand: ${si(algun("zustand"))}`, "");
l.push("## Riesgos para el primer commit", "",
  `- \`.env\` que no son el ejemplo: ${envSueltos.map((e) => `\`${e}\``).join(", ") || "ninguno"} (comprobar que git no los sigue)`,
  `- Catálogos sin fichas [SECRET]/[PUBLICO]: ${paquetes.filter((p) => p.catalogo && p.catalogo.conFicha < p.catalogo.vars).map((p) => `\`${p.dir}/.env.example\``).join(", ") || "ninguno"} → hay que ponerlas antes del primer commit (el pre-commit los revisa)`, "");
l.push("## Propuesta para `.metodo/config.json` (revisar)", "", "```json", JSON.stringify({
  repos: paquetes.filter((p) => !(p.dir === "." && p.monorepo)).map((p) => ({ nombre: p.nombre.replace(/^@[^/]+\//, ""), ruta: p.dir, tipo: p.tipo, ...(p.puertos[0] ? { puerto: p.puertos[0] } : {}) })),
  stack: { gestor: g, motor: (motor ?? "").split(" ")[0] || null, packs,
    comandos: Object.fromEntries(paquetes.filter((p) => p.scripts.test || p.scripts.typecheck).map((p) => [p.nombre.replace(/^@[^/]+\//, ""), {
      ...(p.scripts.typecheck ? { tipos: `${g} run typecheck` } : {}), ...(p.scripts.build ? { build: `${g} run build` } : {}),
      ...(p.tiene.vitest ? { relacionadas: `${ej} vitest related --run {archivos}`, suite: `${ej} vitest run --reporter=dot` } : p.tiene.jest ? { relacionadas: `${ej} jest --findRelatedTests {archivos} --silent`, suite: `${ej} jest --silent` } : {}),
    }])) },
  rasgos: { interfaz: paquetes.some((p) => ["app", "fullstack"].includes(p.tipo)), variasApps: paquetes.filter((p) => p.tipo === "app").length > 1, dinero: algun("dinero"), tiempoReal: algun("socket"), colas: algun("bullmq"), sinConexion: algun("pwa"), datosPersonales: "PREGUNTAR" },
}, null, 2), "```", "");
l.push("## Preguntas que el inventario no responde", "",
  "1. ¿Qué es el producto, para quién, quién aprueba y quién decide el método? (arranque, paso 1)",
  "2. ¿Dónde vive el backlog pendiente y qué parte está comprometida con el cliente?",
  "3. ¿Hay trabajo a medias ahora mismo? ¿En qué estado?",
  "4. ¿Hay contrato y alcance cerrado, o se trabaja sin alcance?",
  "5. ¿Maneja datos personales? ¿De menores?",
  "6. ¿Hay producción? ¿Con qué hosts?",
  "7. ¿El diseño actual está aprobado y se mantiene, o se rehace?");

const salida = l.join("\n") + "\n";
console.log(salida);
if (args.includes("--escribir")) { writeFileSync(join(RAIZ, "adopcion-inventario.md"), salida); console.error(`Escrito ${join(rel(RAIZ), "adopcion-inventario.md")}`); }
