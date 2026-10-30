import { ExternalLinkIcon, ImageOffIcon } from "lucide-react";
import { Children, isValidElement, type ComponentProps, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Checkbox } from "../../components/ui/checkbox";
import { CodeBlock, CodeBlockActions, CodeBlockContent, CodeBlockHeader, CodeBlockTitle } from "../../components/ui/code-block";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { cn } from "../../lib/utils";
import { CopyButton } from "./CopyButton";
import { linkTarget } from "./history-reader";
import { EYEBROW } from "./projects-styles";

/** El texto plano de un nodo de React: lo que hay dentro de un `<code>` sin resaltar son cadenas. */
function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

function CodeFence({ children }: { children?: ReactNode }) {
  const code = Children.toArray(children).find((child) => isValidElement<{ className?: string }>(child));
  const className = isValidElement<{ className?: string }>(code) ? code.props.className : undefined;
  const language = /language-([^\s]+)/.exec(className ?? "")?.[1] ?? null;
  const text = textOf(children).replace(/\n$/, "");
  return (
    <CodeBlock size="sm" className="rounded-lg">
      <CodeBlockHeader>
        <CodeBlockTitle className="font-mono text-(length:--fs-micro)/(--lh-micro) tracking-[0.08em] text-muted-foreground uppercase">
          {language ?? "Texto"}
        </CodeBlockTitle>
        <CodeBlockActions>
          <CopyButton value={text} iconOnly variant="ghost" size="icon-xs" ariaLabel="Copiar el código" />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent className="text-(length:--fs-small)/(--lh-small)">{text}</CodeBlockContent>
    </CodeBlock>
  );
}

const HEADING = "font-semibold text-balance";
const LIST = "grid gap-1 pl-6 marker:text-muted-foreground [&_ol]:mt-1 [&_ul]:mt-1";

/**
 * Lo que el lector pinta (HU-0025, D-2 y A-5). Es Markdown de terceros dentro de la webview, así que cada regla se
 * mantiene:
 * - `skipHtml`: el HTML crudo no se pinta, y no hay ningún plugin rehype que lo reactive.
 * - Nunca un `<img>`: la CSP deja cargar `https:` en `img-src`, y una imagen sería una petición a la red. En su lugar, un
 *   texto con el `alt`.
 * - Un enlace `http` o `https` se abre en el navegador del sistema con `onOpenLink`; la ventana nunca navega. Cualquier
 *   otro enlace (relativo, `#`, `mailto:`, `file:`, `javascript:`) es solo texto.
 * Sin CSS propio: utilidades de Tailwind sobre los componentes del catálogo. Ritmo: 16 entre bloques, 32 antes de un h2.
 */
export function HistoryMarkdown({ content, onOpenLink }: { content: string; onOpenLink: (href: string) => void }) {
  const components: Components = {
    h1: ({ node: _node, className: _c, ...props }) => (
      <h1 className={cn(HEADING, "text-(length:--fs-figure)/(--lh-figure) tracking-[-0.03em]")} {...props} />
    ),
    h2: ({ node: _node, className: _c, ...props }) => (
      <h2 className={cn(HEADING, "mt-4 -mb-1 border-b pb-2 text-(length:--fs-title)/(--lh-title) tracking-[-0.02em]")} {...props} />
    ),
    h3: ({ node: _node, className: _c, ...props }) => (
      <h3 className={cn(HEADING, "mt-2 -mb-1 text-(length:--fs-heading)/(--lh-heading)")} {...props} />
    ),
    h4: ({ node: _node, className: _c, ...props }) => <h4 className={cn(HEADING, "mt-2 -mb-1")} {...props} />,
    h5: ({ node: _node, className: _c, ...props }) => <h5 className={cn(HEADING, "mt-2 -mb-1")} {...props} />,
    h6: ({ node: _node, className: _c, ...props }) => <h6 className={cn(HEADING, "mt-2 -mb-1 text-muted-foreground")} {...props} />,
    strong: ({ node: _node, ...props }) => <strong className="font-semibold" {...props} />,
    ul: ({ node: _node, className, ...props }) => (
      <ul className={cn(LIST, className?.includes("contains-task-list") ? "list-none pl-0" : "list-disc")} {...props} />
    ),
    ol: ({ node: _node, ...props }) => <ol className={cn(LIST, "list-decimal")} {...props} />,
    li: ({ node: _node, className, ...props }) => (
      <li className={cn(className?.includes("task-list-item") && "flex items-start gap-2")} {...props} />
    ),
    input: ({ node: _node, type, checked }) =>
      type === "checkbox" ? (
        <Checkbox
          checked={Boolean(checked)}
          disabled
          aria-label={checked ? "Hecha" : "Pendiente"}
          className="mt-1 disabled:cursor-default disabled:opacity-100"
        />
      ) : null,
    blockquote: ({ node: _node, ...props }) => (
      <blockquote className="border-l-2 border-primary py-1 pl-4 text-muted-foreground [&>*+*]:mt-2" {...props} />
    ),
    hr: () => <hr className="my-2 border-border" />,
    code: ({ node: _node, className: _c, children }) => (
      <code className="rounded-sm border bg-(--surface-soft) px-1 font-mono text-(length:--fs-small)/(--lh-small)">{children}</code>
    ),
    pre: ({ children }) => <CodeFence>{children}</CodeFence>,
    table: ({ node: _node, ...props }) => <Table containerClassName="rounded-lg border" {...props} />,
    thead: ({ node: _node, ...props }) => <TableHeader {...props} />,
    tbody: ({ node: _node, ...props }) => <TableBody {...props} />,
    tr: ({ node: _node, ...props }) => <TableRow {...props} />,
    th: ({ node: _node, ...props }: ComponentProps<"th"> & { node?: unknown }) => (
      <TableHead className={cn(EYEBROW, "h-auto bg-(--surface-soft) px-3 py-2 whitespace-nowrap")} {...props} />
    ),
    td: ({ node: _node, ...props }: ComponentProps<"td"> & { node?: unknown }) => (
      <TableCell className="px-3 py-2 align-top text-(length:--fs-small)/(--lh-small) whitespace-normal" {...props} />
    ),
    img: ({ alt }) => (
      <span className="inline-flex items-center gap-1 rounded-sm border border-dashed px-2 text-(length:--fs-small)/(--lh-small) text-muted-foreground">
        <ImageOffIcon aria-hidden="true" className="size-4 shrink-0" />
        {alt ? `Imagen no mostrada: ${alt}` : "Imagen no mostrada"}
      </span>
    ),
    a: ({ node: _node, href, children }) => {
      if (!href || linkTarget(href) !== "external") return <span>{children}</span>;
      const open = (event: MouseEvent | KeyboardEvent) => {
        event.preventDefault();
        event.stopPropagation();
        onOpenLink(href);
      };
      // Sin `href`: el menú contextual nativo («Abrir enlace») y el arrastre del webview no tienen URL que cargar
      // en la ventana de la app. El enlace solo se abre por `openExternalLink`, con clic, clic central o Enter.
      return (
        <a
          role="link"
          tabIndex={0}
          title={href}
          draggable={false}
          onClick={open}
          onAuxClick={(event) => (event.button === 1 ? open(event) : event.preventDefault())}
          onKeyDown={(event) => event.key === "Enter" && open(event)}
          onContextMenu={(event) => event.preventDefault()}
          className="cursor-pointer text-primary-text underline decoration-primary-text/45 underline-offset-3 hover:decoration-primary-text focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {children}
          <ExternalLinkIcon aria-hidden="true" className="ml-1 inline size-4 align-text-bottom" />
          <span className="sr-only"> (se abre en el navegador)</span>
        </a>
      );
    },
  };

  return (
    <div className="grid max-w-[720px] grid-cols-[minmax(0,1fr)] gap-4 text-(length:--fs-body)/(--lh-title) break-words">
      <Markdown remarkPlugins={[remarkGfm]} skipHtml components={components}>
        {content}
      </Markdown>
    </div>
  );
}
