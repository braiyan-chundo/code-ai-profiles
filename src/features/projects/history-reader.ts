/**
 * Lo puro del lector de historias (HU-0025, A-5): qué parte del Markdown se pinta y qué enlaces se pueden pulsar, y la
 * pestaña «Maqueta» (HU-0031, A-3/A-4): el documento aislado del marco y qué botones lleva. Sin React ni Tauri; su
 * prueba es `tests/projects.test.ts`.
 */

import type { ProjectDocument } from "../../types";

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

/**
 * La CSP del marco de la maqueta (HU-0031, A-3). Se suma a la heredada de la app (vale la intersección): estilos
 * inline e imágenes, fuentes y medios `data:`; nada de red, `'self'`, `asset:`, marcos, objetos ni scripts.
 */
export const MOCKUP_CSP =
  "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; media-src data:; form-action 'none'; base-uri 'none'";

// O-1 (revisión HU-0031): WebView2 no frena `dns-prefetch` con la CSP; el control va junto a ella.
const MOCKUP_META = `<meta http-equiv="Content-Security-Policy" content="${MOCKUP_CSP}"><meta http-equiv="x-dns-prefetch-control" content="off">`;
/** Los únicos espacios que el analizador de HTML se salta antes del doctype (no `\s`: el NBSP abriría el `<body>`). */
const HTML_SPACE = /[\t\n\f\r ]*/y;
const DOCTYPE = /<!doctype[^>]*>/iy;

/** Dónde acaba lo que el analizador de HTML se salta al principio: espacios, comentarios y el `<!doctype>`. */
function prologEnd(html: string): number {
  let index = 0;
  const skipSpace = () => {
    HTML_SPACE.lastIndex = index;
    HTML_SPACE.exec(html);
    index = HTML_SPACE.lastIndex;
  };
  skipSpace();
  // Cada comentario acaba donde lo cierra el analizador: `<!-->`, `<!--->`, o el primer `-->` o `--!>`.
  while (html.startsWith("<!--", index)) {
    const body = index + 4;
    let end: number;
    if (html.startsWith(">", body)) end = body + 1;
    else if (html.startsWith("->", body)) end = body + 2;
    else {
      // Solo hasta el cierre de este comentario: buscar cada marca hasta el final haría el recorrido cuadrático.
      let dashes = html.indexOf("--", body);
      while (dashes >= 0 && html[dashes + 2] !== ">" && !html.startsWith("!>", dashes + 2)) dashes = html.indexOf("--", dashes + 1);
      if (dashes < 0) return 0;
      end = dashes + (html[dashes + 2] === ">" ? 3 : 4);
    }
    index = end;
    skipSpace();
  }
  DOCTYPE.lastIndex = index;
  return DOCTYPE.exec(html) ? DOCTYPE.lastIndex : 0;
}

/**
 * El `srcdoc` del marco: el HTML de la maqueta sin el BOM inicial y con el `<meta>` de `MOCKUP_CSP` como su primer
 * elemento, justo tras el `<!doctype>` y los comentarios que lo preceden, o al principio si no lo hay. Así cae siempre
 * en el `<head>` antes de cualquier `<style>`, `<img>` o `<script>` (un `<meta>` CSP fuera del `<head>` no vale). No toca
 * nada más. Recorre el principio sin expresiones con retroceso: una maqueta llena de comentarios no congela la app.
 */
export function mockupDocument(html: string): { srcdoc: string } {
  const text = html.startsWith("\uFEFF") ? html.slice(1) : html;
  const at = prologEnd(text);
  return { srcdoc: text.slice(0, at) + MOCKUP_META + text.slice(at) };
}

/** Lo que dice la pestaña: «Maqueta» para `diseno/maqueta.html`; el nombre del archivo para los `.md`. */
export function tabLabel(document: Pick<ProjectDocument, "kind" | "file">): string {
  return document.kind === "design" ? "Maqueta" : document.file;
}

/**
 * Los botones de la pestaña «Maqueta» (AC-04): «Abrir en el navegador» si se pudo leer o si solo es demasiado grande
 * para pintarla aquí; «Reintentar» (y no abrir) si no se pudo leer. Un `.md` nunca lleva «Abrir en el navegador».
 */
export function mockupActions(document: Pick<ProjectDocument, "kind" | "status">): { open: boolean; retry: boolean } {
  const unreadable = document.status === "unreadable";
  return { open: document.kind === "design" && !unreadable, retry: unreadable };
}
