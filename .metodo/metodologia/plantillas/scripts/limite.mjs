#!/usr/bin/env node
// Corre un comando con tiempo máximo y mata todo su grupo al vencer. Portable: macOS no trae `timeout`.
//   node .metodo/scripts/limite.mjs <segundos> <comando…>
//   node .metodo/scripts/limite.mjs 120 pnpm dev --port 5199 &      (en segundo plano, con fin garantizado)
// Sale con el código del comando, o con 124 si se cortó (como `timeout`). Solo Node estándar.

import { spawn } from "node:child_process";

const [segundos, ...cmd] = process.argv.slice(2);
if (!Number(segundos) || !cmd.length) {
  console.error("Uso: node .metodo/scripts/limite.mjs <segundos> <comando…>");
  process.exit(2);
}
const p = spawn(cmd.join(" "), { shell: true, stdio: "inherit", detached: true });
const matar = (senal) => { try { process.kill(-p.pid, senal); } catch {} };
const reloj = setTimeout(() => {
  console.error(`limite: «${cmd.join(" ")}» cortado a los ${segundos} s`);
  matar("SIGTERM");
  setTimeout(() => { matar("SIGKILL"); process.exit(124); }, 3000);
}, Number(segundos) * 1000);
for (const s of ["SIGINT", "SIGTERM"]) process.on(s, () => { matar(s); process.exit(130); });
p.on("exit", (codigo) => { clearTimeout(reloj); process.exit(codigo ?? 124); });
