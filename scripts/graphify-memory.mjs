import { existsSync, renameSync } from "node:fs";
import { join } from "node:path";

// Graphify escanea siempre graphify-out/memory/, aunque esté ignorada (detect.py: "Always include").
// Esa carpeta es la caché local de consultas guardadas y no se versiona, así que, si entra, el grafo
// local diverge del de CI. Se aparta mientras Graphify corre y se devuelve al terminar.
const memoryName = "memory";
const asideName = ".memory-aside";

// Devuelve la caché si una ejecución anterior se interrumpió con ella apartada.
export function restoreMemory(graphDir) {
  const memoryDir = join(graphDir, memoryName);
  const asideDir = join(graphDir, asideName);
  if (existsSync(asideDir) && !existsSync(memoryDir)) {
    renameSync(asideDir, memoryDir);
  }
}

export function withMemoryAside(graphDir, run) {
  restoreMemory(graphDir);
  const memoryDir = join(graphDir, memoryName);
  const asideDir = join(graphDir, asideName);
  if (!existsSync(memoryDir)) {
    return run();
  }
  if (existsSync(asideDir)) {
    throw new Error(
      `Existen ${memoryDir} y ${asideDir} a la vez. Junta su contenido en ${memoryName}/ y borra ${asideName}/.`,
    );
  }
  renameSync(memoryDir, asideDir);
  try {
    return run();
  } finally {
    if (existsSync(memoryDir)) {
      console.error(`Graphify creó ${memoryDir} durante la ejecución; la caché anterior quedó en ${asideDir}.`);
    } else {
      renameSync(asideDir, memoryDir);
    }
  }
}
