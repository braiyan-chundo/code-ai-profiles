import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const graphDir = join(projectRoot, "graphify-out");
const graphPath = join(graphDir, "graph.json");
const reportPath = join(graphDir, "GRAPH_REPORT.md");
const version = readFileSync(join(projectRoot, ".graphify-version"), "utf8").trim();
const action = process.argv[2] ?? "update";

const candidates = [];
if (process.env.GRAPHIFY_BIN) {
  candidates.push({ command: process.env.GRAPHIFY_BIN, prefix: [] });
}
candidates.push({ command: "graphify", prefix: [] });
if (process.env.HOME && process.platform !== "win32") {
  candidates.push({ command: join(process.env.HOME, ".local", "bin", "graphify"), prefix: [] });
}
candidates.push({
  command: "uvx",
  prefix: ["--from", `graphifyy==${version}`, "graphify"],
});

const graphify = candidates.find(({ command, prefix }) => {
  const probe = spawnSync(command, [...prefix, "--version"], {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  return probe.status === 0 && `${probe.stdout}${probe.stderr}`.includes(version);
});

if (!graphify) {
  console.error(
    `Graphify ${version} no está disponible. Instálalo con: uv tool install graphifyy==${version}`,
  );
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    ...options,
  });
  if (result.error) {
    console.error(result.error.message);
  }
  return result.status ?? 1;
}

function runGraphify(args) {
  return run(graphify.command, [...graphify.prefix, ...args]);
}

function updateGraph() {
  if (existsSync(graphPath)) {
    return runGraphify(["update", "."]);
  }
  return runGraphify(["extract", ".", "--code-only"]);
}

function normalizeReportTitle() {
  if (!existsSync(reportPath)) {
    return;
  }
  const report = readFileSync(reportPath, "utf8");
  const normalized = report.replace(
    /^# Graph Report - .+?  \(/,
    "# Graph Report - Code AI Profiles  (",
  );
  if (normalized !== report) {
    writeFileSync(reportPath, normalized, "utf8");
  }
}

let status = 0;
if (action === "build") {
  status = runGraphify(["extract", ".", "--code-only", "--force"]);
  if (status === 0) {
    status = runGraphify(["update", "."]);
  }
} else if (action === "update" || action === "check") {
  status = updateGraph();
} else {
  console.error("Uso: node scripts/graphify.mjs <build|update|check>");
  process.exit(2);
}

if (status !== 0) {
  process.exit(status);
}

if (action === "build") {
  status = runGraphify(["cluster-only", ".", "--no-label"]);
  if (status !== 0) {
    process.exit(status);
  }
}

normalizeReportTitle();

if (action === "check") {
  const artifacts = ["graphify-out/graph.json", "graphify-out/GRAPH_REPORT.md"];
  const diff = spawnSync("git", ["status", "--porcelain", "--untracked-files=all", "--", ...artifacts], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  if (diff.status !== 0) {
    process.exit(diff.status ?? 1);
  }
  if (diff.stdout.trim()) {
    console.error("El grafo está desactualizado. Ejecuta `npm run graph:update` y versiona estos cambios:");
    console.error(diff.stdout.trim());
    process.exit(1);
  }

  const committedManifest = spawnSync("git", ["show", "HEAD:graphify-out/manifest.json"], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  if (committedManifest.status !== 0 || !existsSync(join(graphDir, "manifest.json"))) {
    console.error("No existe un manifest.json versionado. Ejecuta `npm run graph:update` y agrégalo al commit.");
    process.exit(1);
  }

  function normalizeManifest(value) {
    if (Array.isArray(value)) {
      return value.map(normalizeManifest);
    }
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value)
          .filter(([key]) => key !== "mtime")
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, child]) => [key, normalizeManifest(child)]),
      );
    }
    return value;
  }

  const committedHashes = normalizeManifest(JSON.parse(committedManifest.stdout));
  const currentHashes = normalizeManifest(
    JSON.parse(readFileSync(join(graphDir, "manifest.json"), "utf8")),
  );
  if (JSON.stringify(committedHashes) !== JSON.stringify(currentHashes)) {
    console.error("El manifiesto de Graphify contiene cambios reales de archivos o hashes sin versionar.");
    process.exit(1);
  }
  console.log("Graphify está actualizado.");
}
