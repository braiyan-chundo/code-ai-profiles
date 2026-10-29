// Lo común a los scripts de la metodología v4: dónde está cada cosa, la configuración efectiva,
// el contexto de las plantillas y el renderizador. Solo Node estándar.
//
// En un proyecto, los scripts viven en .metodo/scripts/ y la raíz es dos carpetas arriba.
// Dentro de la metodología (plantillas/scripts/), la raíz del proyecto se pasa con --destino.

import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

export const AQUI = dirname(fileURLToPath(import.meta.url));

export function raizDelProyecto(argv = process.argv) {
  const i = argv.indexOf("--destino");
  if (i !== -1 && argv[i + 1]) return resolve(argv[i + 1]);
  // .metodo/scripts/ → la raíz es ../.. (manda la ubicación del script: no actúa sobre otro proyecto)
  if (AQUI.endsWith(join(".metodo", "scripts"))) return resolve(AQUI, "..", "..");
  if (process.env.CLAUDE_PROJECT_DIR) return process.env.CLAUDE_PROJECT_DIR;
  return process.cwd();
}

export function leerJSON(ruta, porDefecto = null) {
  if (!existsSync(ruta)) return porDefecto;
  return JSON.parse(readFileSync(ruta, "utf8"));
}

// La metodología: la copia del proyecto (.metodo/metodologia) o esta misma carpeta.
export function carpetaMetodologia(raiz) {
  const copia = join(raiz, ".metodo", "metodologia");
  if (existsSync(join(copia, "plantillas"))) return copia;
  return resolve(AQUI, "..", "..");
}

export function rutas(raiz) {
  const met = carpetaMetodologia(raiz);
  return {
    raiz,
    metodologia: met,
    plantillas: join(met, "plantillas"),
    config: join(raiz, ".metodo", "config.json"),
    entornos: join(raiz, ".metodo", "entornos.json"),
    reglas: join(raiz, ".metodo", "reglas"),
    pruebas: join(raiz, ".metodo", "pruebas"),
    perfiles: join(met, "plantillas", "config", "perfiles.json"),
    hu: join(raiz, "hu"),
  };
}

export function leerConfig(raiz) {
  const r = rutas(raiz);
  const cfg = leerJSON(r.config);
  if (!cfg) return null;
  return cfg;
}

export function leerPerfiles(raiz) {
  const r = rutas(raiz);
  const p = leerJSON(r.perfiles);
  if (!p) throw new Error(`No encuentro perfiles.json en ${r.perfiles}`);
  return p;
}

// ── configuración efectiva: perfil → ajustes → mínimos de la fase ──────────────

const ORDEN = {
  revisionTecnica: ["off", "riesgo", "siempre"],
  observabilidad: ["off", "basica", "completa"],
};

export function efectiva(cfg, perfiles) {
  const nombre = cfg.perfil ?? "M";
  const base = perfiles.perfiles[nombre];
  if (!base) throw new Error(`Perfil «${nombre}» desconocido (S, M o L)`);
  const valores = {};
  const origen = {};
  for (const [k, v] of Object.entries(base)) {
    if (k === "que") continue;
    valores[k] = structuredClone(v);
    origen[k] = `perfil ${nombre}`;
  }
  for (const [k, v] of Object.entries(cfg.ajustes ?? {})) {
    if (v && typeof v === "object" && !Array.isArray(v) && typeof valores[k] === "object") {
      valores[k] = { ...valores[k], ...v };
      origen[k] = `perfil ${nombre} + ajuste`;
    } else {
      valores[k] = structuredClone(v);
      origen[k] = "ajuste";
    }
  }
  const minimos = perfiles.fase?.[cfg.fase ?? "desarrollo"]?.minimos ?? {};
  for (const [k, minimo] of Object.entries(minimos)) {
    const orden = ORDEN[k];
    if (orden && orden.indexOf(valores[k]) < orden.indexOf(minimo)) {
      valores[k] = minimo;
      origen[k] = `mínimo de la fase ${cfg.fase}`;
    }
  }
  return { valores, origen, perfil: nombre, fase: cfg.fase ?? "desarrollo" };
}

// ── validación de la combinación ─────────────────────────────────────────────

const COLORES = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"];
const MODELOS = ["opus", "sonnet", "haiku", "inherit"];

export function validar(cfg, perfiles) {
  const errores = [];
  const avisos = [];
  const { valores: v } = efectiva(cfg, perfiles);
  const tiene = (rol) => (v.agentes ?? []).includes(rol);
  const diales = perfiles.diales;

  for (const [k, val] of Object.entries(v)) {
    const d = diales[k];
    if (!d) { avisos.push(`dial «${k}» desconocido: se ignora`); continue; }
    if (d.tipo === "lista") {
      for (const x of val) if (!d.valores.includes(x)) errores.push(`agentes: «${x}» no es un rol (${d.valores.join(", ")})`);
    } else if (d.tipo === "objeto") {
      for (const [c, cv] of Object.entries(val ?? {})) {
        const dc = d.campos[c];
        if (!dc) avisos.push(`${k}.${c}: campo desconocido`);
        else if (dc.valores && !dc.valores.includes(cv)) errores.push(`${k}.${c}: «${cv}» no es válido (${dc.valores.join(", ")})`);
      }
    } else if (!d.valores.includes(val)) {
      errores.push(`${k}: «${val}» no es válido (${d.valores.join(" · ")})`);
    }
  }
  if (!["desarrollo", "produccion"].includes(cfg.fase ?? "desarrollo")) errores.push(`fase: «${cfg.fase}» (desarrollo o produccion)`);

  if (tiene("fullstack") && (tiene("backend") || tiene("frontend")))
    errores.push("fullstack junto con backend o frontend: dos roles con el mismo territorio");
  if (v.revisionTecnica !== "off" && !tiene("architect"))
    errores.push(`revisionTecnica «${v.revisionTecnica}» sin architect: nadie puede revisar`);
  if (v.exploradores > 0 && !tiene("explorador"))
    errores.push(`exploradores: ${v.exploradores} sin el rol explorador`);
  if (v.datos === "agente" && !tiene("data")) errores.push("datos: agente sin el rol data");
  if (v.qa === "bajo-demanda" && !tiene("qa")) errores.push("qa: bajo-demanda sin el rol qa");
  if (v.seguridad && v.seguridad !== "off" && !tiene("seguridad")) errores.push(`seguridad: ${v.seguridad} sin el rol seguridad`);
  if (v.enfoque === "producto" && v.diseno === "off") errores.push("enfoque producto con diseño off: producto primero es diseñar primero");

  const nombres = new Map();
  for (const rol of v.agentes ?? []) {
    const a = cfg.agentes?.[rol];
    if (!a) { errores.push(`agentes.${rol}: activo pero sin nombre, color y modelo en config.agentes`); continue; }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.nombre ?? "")) errores.push(`agentes.${rol}.nombre «${a.nombre}»: minúsculas, números y guiones`);
    if (nombres.has(a.nombre)) errores.push(`agentes: el nombre «${a.nombre}» se repite (${nombres.get(a.nombre)} y ${rol})`);
    nombres.set(a.nombre, rol);
    if (a.color && !COLORES.includes(a.color)) errores.push(`agentes.${rol}.color «${a.color}»: ${COLORES.join(", ")}`);
    if (a.modelo && !MODELOS.includes(a.modelo)) errores.push(`agentes.${rol}.modelo «${a.modelo}»: ${MODELOS.join(", ")}`);
  }

  const todos = new Map();
  for (const [rol, a] of Object.entries(cfg.agentes ?? {})) {
    if (!a?.nombre) continue;
    if (todos.has(a.nombre) && (tiene(rol) || tiene(todos.get(a.nombre))))
      avisos.push(`agentes: el nombre «${a.nombre}» lo tienen ${todos.get(a.nombre)} y ${rol}; la guarda usa solo el rol activo, pero conviene cambiar o quitar la entrada inactiva`);
    todos.set(a.nombre, rol);
  }
  const tipos = new Set((cfg.repos ?? []).map((r) => r.tipo));
  if (tiene("backend") && !tipos.has("api") && !tipos.has("worker") && !tipos.has("fullstack") && !cfg.territorios?.backend)
    errores.push("backend activo sin repo de tipo api, worker o fullstack ni config.territorios.backend: no tendría dónde escribir");
  const TIPOS = ["api", "worker", "app", "paquete", "fullstack", "otro"];
  for (const r of cfg.repos ?? []) if (r.tipo && !TIPOS.includes(r.tipo)) errores.push(`repos: «${r.nombre}» tiene tipo «${r.tipo}» (${TIPOS.join(", ")})`);
  if (tiene("frontend") && !tipos.has("app") && !tipos.has("paquete") && !tipos.has("fullstack") && !cfg.territorios?.frontend)
    errores.push("frontend activo sin repo de tipo app o fullstack ni config.territorios.frontend: no tendría dónde escribir");

  if (v.diseno !== "off" && !tiene("product-design")) avisos.push("diseño activo sin product-design: diseñaría el orquestador");
  if (v.diseno !== "off" && cfg.rasgos?.interfaz === false) avisos.push("diseño activo sin rasgos.interfaz: no hay pantallas");
  if ((tiene("backend") || tiene("frontend")) && !tiene("architect"))
    avisos.push("implementadores sin architect: sin briefs, el implementador escribe su plan en la historia");
  if (v.alcance === "off" && cfg.ajustes?.gates?.alcance && cfg.ajustes.gates.alcance !== "off") avisos.push("gates.alcance activo con alcance off: se ignora");
  if (v.dosTiempos && v.revisionTecnica === "off") avisos.push("dosTiempos sin revisión técnica: sin efecto");
  if ((cfg.fase ?? "desarrollo") === "produccion" && v.contratos === "flexibles") avisos.push("fase produccion con contratos flexibles: se puede romper a quien ya usa la app");
  if ((cfg.repos ?? []).length > 2 && v.grafo === "off") avisos.push("varios repos con grafo off: el impacto entre repos se hace con rg");

  if ((cfg.repos ?? []).some((r) => r.ruta === ".") && tiene("backend") && tiene("frontend") && !cfg.territorios?.backend)
    avisos.push("un solo repo en la raíz con backend y frontend: declara config.territorios (qué carpetas escribe cada uno) o los dos podrán escribir todo el repo");

  if (!cfg.proyecto?.slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(cfg.proyecto.slug)) errores.push(`proyecto.slug «${cfg.proyecto?.slug}»: minúsculas y guiones`);
  for (const r of cfg.repos ?? []) if (!r.nombre || !r.ruta || !r.tipo) errores.push(`repos: cada repo necesita nombre, ruta y tipo (${JSON.stringify(r)})`);
  return { errores, avisos };
}

// ── packs y skills por rol ───────────────────────────────────────────────────

export function packsDelProyecto(raiz, cfg) {
  const { plantillas } = rutas(raiz);
  const salida = [];
  for (const nombre of cfg.stack?.packs ?? []) {
    const ficha = leerJSON(join(plantillas, "packs", nombre, "pack.json"));
    if (!ficha) { salida.push({ nombre, faltante: true, roles: [], skills: [] }); continue; }
    salida.push({ ...ficha, nombre });
  }
  return salida;
}

// Skills por rol, en dos grupos:
//   siempre  van al frontmatter (`skills:`): Claude Code inyecta su contenido completo al arrancar el agente;
//   tarea    se nombran en el cuerpo: el agente las carga con la herramienta Skill solo si la tarea las pide.
// Así cada despacho no paga skills que no usa. Un pack dice en `siempre` para qué roles es «siempre».
export function skillsPorRol(raiz, cfg, v) {
  const porRol = {};
  for (const rol of v.agentes ?? []) porRol[rol] = { siempre: [], tarea: [] };
  const pon = (rol, grupo, ...ss) => { if (porRol[rol]) porRol[rol][grupo].push(...ss); };
  const diseno = v.diseno !== "off";
  const obs = v.observabilidad !== "off";
  if (diseno) pon("product-design", "siempre", "diseno", "componentes");
  pon("qa", "siempre", "pruebas");
  pon("seguridad", "siempre", "configuracion");
  for (const rol of ["backend", "frontend", "fullstack", "devops"]) pon(rol, "siempre", "configuracion");
  pon("architect", "siempre", "configuracion");
  if (diseno) for (const rol of ["frontend", "fullstack"]) pon(rol, "tarea", "diseno", "componentes");
  if (obs) { pon("devops", "siempre", "observabilidad"); for (const rol of ["backend", "frontend", "fullstack", "architect"]) pon(rol, "tarea", "observabilidad"); }
  for (const p of packsDelProyecto(raiz, cfg)) {
    for (const rol of p.roles ?? []) pon(rol, (p.siempre ?? []).includes(rol) ? "siempre" : "tarea", ...(p.skills ?? []));
    // Seguridad lee el código de cualquier capa: los packs de stack, según la tarea.
    if (["servidor", "apps", "persistencia"].includes(p.tipo)) pon("seguridad", "tarea", ...(p.skills ?? []));
  }
  for (const g of Object.values(porRol)) {
    g.siempre = [...new Set(g.siempre)];
    g.tarea = [...new Set(g.tarea)].filter((s) => !g.siempre.includes(s));
  }
  return porRol;
}

// ── territorio: qué rutas escribe cada rol (lo hace cumplir la guarda) ─────────

export function territorio(cfg, rol, v = {}) {
  const repos = cfg.repos ?? [];
  const rutasDe = (tipos) => repos.filter((r) => tipos.includes(r.tipo)).map((r) => (r.ruta === "." ? "**" : `${r.ruta}/**`));
  const config = [".env.example", "**/.env.example", ".env.local", "**/.env.local"];
  // El índice de componentes y una skill por componente: los escribe diseño y los ajusta quien construye la librería.
  const componentes = [`.claude/skills/${cfg.proyecto?.slug}-componentes/**`, `.claude/skills/${cfg.proyecto?.slug}-ui-*/**`];
  const base = {
    "product-owner": ["hu/*/hu.md", "hu/*/seguimiento.md", "docs/producto/reglas/**", "docs/producto/invariantes.md",
      ...(v.alcance === "lista-viva" ? [cfg.alcance?.archivo ?? "docs/producto/alcance.md", "docs/producto/fuera-de-alcance.md"] : [])],
    architect: ["hu/*/arquitectura.md", "hu/*/briefs/**", "hu/*/analisis/**", "docs/arquitectura/**", "docs/decisiones/**", "docs/operaciones/observabilidad.md"],
    explorador: ["hu/*/analisis/**"],
    data: ["hu/*/analisis/datos.md", "docs/arquitectura/datos.md"],
    "product-design": ["hu/*/diseno/**", "docs/diseno/**", `.claude/skills/${cfg.proyecto?.slug}-diseno/**`, ...componentes],
    backend: [...rutasDe(["api", "fullstack", "worker"]), ...config],
    frontend: [...rutasDe(["app", "paquete", "fullstack"]), ...config, ...componentes],
    fullstack: [...rutasDe(["api", "app", "paquete", "fullstack", "worker"]), ...config, ...componentes, "hu/*/hu.md", "hu/*/seguimiento.md"],
    qa: ["hu/*/qa/**"],
    seguridad: ["hu/*/seguridad/**", "docs/operaciones/seguridad/**"],
    devops: ["docs/operaciones/**", "docs/decisiones/**", ".metodo/entornos.json", ...config,
      "**/Dockerfile*", "**/docker-compose*", "**/compose*.y*ml", "**/.github/**", "**/deploy/**", "**/infra/**", "**/.dockerignore"],
  };
  return [...(base[rol] ?? []), ...(cfg.territorios?.[rol] ?? [])];
}

// El gobierno nunca es territorio de código, aunque el repo sea la raíz.
const GOBIERNO = /^(hu|docs|\.metodo|\.claude)\//;
const deGlob = (g) => new RegExp("^" + g.split("**/").map((p) => p.split("**").map((q) => q.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join("[^/]*")).join(".*")).join("(?:.*/)?") + "$");

export function dentroDelTerritorio(cfg, rol, rel, v = {}) {
  const r = rel.split("\\").join("/");
  const globs = territorio(cfg, rol, v);
  return globs.some((g) => {
    if (GOBIERNO.test(r) && (g === "**" || g.startsWith("**/")) && !g.includes(".env")) return false;
    return deGlob(g).test(r);
  });
}

// Solo los roles activos: una entrada vieja con el mismo nombre (de otro perfil) no cuenta.
export function rolDeAgente(cfg, nombre, activos = null) {
  if (!nombre) return null;
  for (const [rol, a] of Object.entries(cfg.agentes ?? {}))
    if (a?.nombre === nombre && (!activos || activos.includes(rol))) return rol;
  return null;
}

// ── contexto de las plantillas ───────────────────────────────────────────────

export const clave = (rol) => rol.toUpperCase().replace(/-/g, "_");

export function contexto(raiz, cfg, perfiles) {
  const { valores: v, fase } = efectiva(cfg, perfiles);
  const slug = cfg.proyecto?.slug ?? "proyecto";
  const C = {};
  const tiene = (rol) => (v.agentes ?? []).includes(rol);

  Object.assign(C, {
    PROYECTO: cfg.proyecto?.nombre ?? slug,
    SLUG: slug,
    RESUMEN: cfg.proyecto?.resumen ?? "",
    IDIOMA_INTERFAZ: cfg.proyecto?.idiomas?.interfaz ?? "español",
    IDIOMA_CODIGO: cfg.proyecto?.idiomas?.codigo ?? "inglés",
    IDIOMA_DOCUMENTACION: cfg.proyecto?.idiomas?.documentacion ?? "español",
    APRUEBA: cfg.figuras?.aprueba ?? "la persona usuaria",
    METODO: cfg.figuras?.metodo ?? "quien decide el método",
    SALIDAS: cfg.figuras?.salidas ?? cfg.figuras?.aprueba ?? "la persona usuaria",
    CLIENTE: cfg.figuras?.cliente ?? "el cliente",
    CANAL: cfg.figuras?.canal ?? "directo, en la conversación con Claude",
    PERFIL: cfg.perfil ?? "M",
    FASE: fase,
    MODO: v.modo,
    OBSERVABILIDAD: v.observabilidad,
    ALCANCE_MODO: v.alcance,
    EXPLORADORES: String(v.exploradores ?? 0),
    TIMEOUT_MIN: String(v.pruebas?.timeoutMin ?? 10),
    MAX_CRITERIOS: String(cfg.historias?.maxCriterios ?? 6),
    SUITE: v.pruebas?.suite ?? "cierre-hu",
    ALCANCE_ARCHIVO: cfg.alcance?.archivo ?? "docs/producto/alcance.md",
    ALCANCE_NOMBRE: cfg.alcance?.nombre ?? "alcance",
    GESTOR: cfg.stack?.gestor ?? "npm",
  });

  const banderas = {
    SI_PROPUESTA: v.propuesta === "si",
    SI_ENFOQUE_PRODUCTO: v.enfoque === "producto",
    SI_FASE_A_FASE: v.modo === "fase-a-fase",
    SI_CONSTRUIR_TODO: v.modo === "construir-todo",
    SI_BLOQUE: v.modo === "bloque",
    SI_ALCANCE: v.alcance !== "off",
    SI_LISTA_VIVA: v.alcance === "lista-viva",
    SI_SELLADO: v.alcance === "sellado",
    SI_DISENO: v.diseno !== "off",
    SI_DISENO_SISTEMA: v.diseno === "sistema",
    SI_CLAUDE_DESIGN: v.herramientaDiseno === "claude-design",
    SI_DOS_PASOS: v.arquitectura === "dos-pasos",
    SI_EXPLORADORES: (v.exploradores ?? 0) > 0 && tiene("explorador"),
    SI_DATOS_AGENTE: v.datos === "agente" && tiene("data"),
    SI_REVISION: v.revisionTecnica !== "off" && tiene("architect"),
    SI_REVISION_SIEMPRE: v.revisionTecnica === "siempre",
    SI_DOS_TIEMPOS: Boolean(v.dosTiempos) && v.revisionTecnica !== "off",
    SI_QA: v.qa === "bajo-demanda" && tiene("qa"),
    SI_SEGURIDAD_DIAL: (v.seguridad ?? "off") !== "off" && tiene("seguridad"),
    SI_SEGURIDAD_RIESGO: v.seguridad === "riesgo" && tiene("seguridad"),
    SI_GRAFO: v.grafo === "graphify",
    SI_OBS: v.observabilidad !== "off",
    SI_OBS_COMPLETA: v.observabilidad === "completa",
    SI_PRODUCCION: fase === "produccion",
    SI_CONTRATOS_ESTRICTOS: v.contratos === "estrictos" || (v.contratos === "estrictos-en-produccion" && fase === "produccion"),
    SI_SUITE_CIERRE_HU: (v.pruebas?.suite ?? "cierre-hu") === "cierre-hu",
    SI_INTERFAZ: cfg.rasgos?.interfaz !== false,
    SI_VARIAS_APPS: Boolean(cfg.rasgos?.variasApps),
    SI_DINERO: Boolean(cfg.rasgos?.dinero),
    SI_DATOS_PERSONALES: Boolean(cfg.rasgos?.datosPersonales),
    SI_TIEMPO_REAL: Boolean(cfg.rasgos?.tiempoReal),
    SI_COLAS: Boolean(cfg.rasgos?.colas),
    SI_SIN_CONEXION: Boolean(cfg.rasgos?.sinConexion),
    SI_LIENZO: Boolean(cfg.rasgos?.lienzo),
    SI_PAQUETE_CONTRATOS: Boolean(cfg.rasgos?.paqueteDeContratos),
  };
  Object.assign(C, banderas);

  const ROLES = perfiles.diales.agentes.valores;
  const skills = skillsPorRol(raiz, cfg, v);
  for (const rol of ROLES) {
    const k = clave(rol);
    const a = cfg.agentes?.[rol] ?? {};
    C[`SI_${k}`] = tiene(rol);
    C[`N_${k}`] = a.nombre ?? rol;
    C[`COLOR_${k}`] = a.color ?? "blue";
    C[`MODELO_${k}`] = a.modelo ?? "sonnet";
    const siempre = (skills[rol]?.siempre ?? []).map((s) => `${slug}-${s}`);
    const tarea = (skills[rol]?.tarea ?? []).map((s) => `${slug}-${s}`);
    const cita = (l) => l.map((s) => `\`${s}\``).join(", ");
    C[`SKILLS_${k}`] = siempre.length ? "skills:\n" + siempre.map((s) => `  - ${s}`).join("\n") : "";
    C[`SKILLS_${k}_TEXTO`] = siempre.length ? cita(siempre) : "ninguna todavía";
    C[`SKILLS_${k}_TAREA`] = tarea.length ? cita(tarea) : "ninguna";
  }
  C.SI_IMPLEMENTA_SEPARADO = tiene("backend") || tiene("frontend");

  const repos = cfg.repos ?? [];
  const cita = (rs) => rs.map((r) => (r.ruta === "." ? "todo el repo salvo hu/, docs/ y .metodo/" : `\`${r.ruta}/**\``)).join(", ") || "—";
  C.SI_HAY_SERVIDOR = repos.some((r) => ["api", "fullstack", "worker"].includes(r.tipo));
  C.SI_HAY_APP = repos.some((r) => r.tipo === "app" || r.tipo === "paquete" || r.tipo === "fullstack");
  C.SI_PROYECTO_CON_API = C.SI_HAY_SERVIDOR;
  C.REPOS_SERVIDOR = cita(repos.filter((r) => ["api", "fullstack", "worker"].includes(r.tipo)));
  C.REPOS_APPS = cita(repos.filter((r) => r.tipo === "app" || r.tipo === "paquete" || r.tipo === "fullstack"));
  C.REPOS_CODIGO = cita(repos);
  C.LISTA_REPOS = repos.map((r) => `| \`${r.nombre}\` | \`${r.ruta}\` | ${r.tipo} | ${r.puerto ?? "—"}${r.puertoCompilada ? ` · compilada ${r.puertoCompilada}` : ""} |`).join("\n");
  C.LISTA_AGENTES = (v.agentes ?? []).map((rol) => `| \`${C[`N_${clave(rol)}`]}\` | ${rol} | ${C[`COLOR_${clave(rol)}`]} | ${C[`MODELO_${clave(rol)}`]} |`).join("\n");
  C.LISTA_PACKS = packsDelProyecto(raiz, cfg).map((p) => `\`${p.nombre}\`${p.faltante ? " (por forjar)" : ""}`).join(", ") || "ninguno todavía";
  return C;
}

// ── renderizador ─────────────────────────────────────────────────────────────
//   {{CLAVE}}                    valor
//   {{#SI_X}} … {{/SI_X}}        bloque de líneas si SI_X es true
//   {{^SI_X}} … {{/SI_X}}        bloque si SI_X es false
//   {{SI_X: texto}}              texto en línea si SI_X es true
//   {{INCLUIR:ruta}}             contenido de .metodo/<ruta>, o nada si no existe

const RE_BLOQUE = /^[ \t]*\{\{([#^])(SI_[A-Z0-9_]+)\}\}[ \t]*\n([\s\S]*?)^[ \t]*\{\{\/\2\}\}[ \t]*\n?/gm;
// El texto en línea puede llevar valores dentro ({{SI_X: con {{N_BACKEND}}}}), no otras condiciones.
const RE_LINEA = /\{\{(SI_[A-Z0-9_]+):((?:[^{}]|\{\{[A-Z0-9_]+\}\})*)\}\}/g;
const RE_INCLUIR = /\{\{INCLUIR:([^}]+)\}\}/g;
const RE_VALOR = /\{\{([A-Z0-9_]+)\}\}/g;

export function renderizar(texto, C, raiz) {
  // Lo incluido es texto del proyecto: entra al final, sin interpretar marcadores que traiga.
  const incluidos = [];
  let t = texto.replace(RE_INCLUIR, (_, ruta) => {
    const p = join(raiz, ".metodo", ruta.trim());
    const dentro = existsSync(p) ? readFileSync(p, "utf8").replace(/<!--[\s\S]*?-->/g, "").replace(/^# .*\n?/m, "").trim() : "";
    incluidos.push((dentro || "_Ninguna todavía._").replace(/\{\{/g, "{ {"));
    return `\u0000INCLUIDO${incluidos.length - 1}\u0000`;
  });
  for (let i = 0; i < 10; i++) {
    const antes = t;
    t = t.replace(RE_BLOQUE, (_, signo, k, cuerpo) => {
      if (!(k in C)) throw new Error(`Condición desconocida en plantilla: ${k}`);
      return (signo === "#") === Boolean(C[k]) ? cuerpo : "";
    });
    if (t === antes) break;
  }
  t = t.replace(RE_LINEA, (_, k, txt) => {
    if (!(k in C)) throw new Error(`Condición desconocida en plantilla: ${k}`);
    return C[k] ? txt : "";
  });
  t = t.replace(RE_VALOR, (todo, k) => (k in C ? String(C[k]) : todo));
  t = t.replace(/\u0000INCLUIDO(\d+)\u0000/g, (_, n) => incluidos[Number(n)]);
  return t.replace(/\n{3,}/g, "\n\n");
}

export function marcadoresSinResolver(texto) {
  return texto.split("\n").map((l, i) => [l, i + 1]).filter(([l]) => /\{\{[#^/]?[A-Z]/.test(l));
}

// ── git ──────────────────────────────────────────────────────────────────────

export function git(cmd, cwd) {
  try {
    return execSync(`git ${cmd}`, { cwd, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return null;
  }
}

// Archivos cambiados (modificados, nuevos sin seguir, o en stage) del repo que contiene cwd, como
// rutas absolutas. git da las rutas relativas a la raíz del repo, no a cwd. null si no hay git.
export function cambiados(cwd, { staged = false } = {}) {
  if (!existsSync(cwd)) return null;
  const top = git("rev-parse --show-toplevel", cwd);
  if (!top) return null;
  let rel;
  if (staged) rel = (git("diff --cached --name-only --diff-filter=ACM", cwd) ?? "").split("\n").filter(Boolean);
  else {
    const s = git("status --porcelain --untracked-files=all", cwd) ?? "";
    rel = s.split("\n").filter(Boolean).map((l) => l.slice(3).replace(/^"|"$/g, "").split(" -> ").pop());
  }
  return rel.map((p) => join(top, p)).filter((p) => existsSync(p));
}

export function seguidos(cwd) {
  const top = git("rev-parse --show-toplevel", cwd);
  if (!top) return [];
  return (git("ls-files", top) ?? "").split("\n").filter(Boolean).map((p) => join(top, p));
}
