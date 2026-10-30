/**
 * Lo puro del lector de historias (HU-0025, A-5): qué parte del Markdown se pinta y qué enlaces se pueden pulsar. Sin
 * React ni Tauri; su prueba es `tests/projects.test.ts`.
 */

/**
 * El cuerpo que se pinta: sin el frontmatter `---…---` del principio (su estado, fase, área y fecha ya van en la cabecera
 * del lector) y sin el primer `# título` si es igual al de la historia (ya está en la cabecera).
 */
export function readerBody(content: string, title: string): string {
  let text = content.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const frontmatter = /^---[ \t]*\n[\s\S]*?\n---[ \t]*(?:\n|$)/.exec(text);
  if (frontmatter) text = text.slice(frontmatter[0].length);
  const heading = /^\s*\n*# +(.+?)[ \t]*#*[ \t]*(?:\n|$)/.exec(text);
  if (heading && heading[1]?.trim() === title.trim()) text = text.slice(heading[0].length);
  return text.replace(/^\n+/, "");
}

/**
 * Qué hace un enlace del Markdown: `external` solo si es una dirección `http:` o `https:` con host (se abre en el
 * navegador del sistema al pulsarla); todo lo demás (`javascript:`, `file:`, `mailto:`, `#x`, `../a.md`, `//host`) se
 * pinta como texto.
 */
export function linkTarget(href: string | undefined): "external" | "text" {
  if (!href) return "text";
  if (!/^https?:/i.test(href.trimStart())) return "text";
  try {
    const url = new URL(href);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname !== "" ? "external" : "text";
  } catch {
    return "text";
  }
}
