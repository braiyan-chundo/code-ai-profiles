# Bloque de código (`code-block`)

## Para qué

Código con cabecera, numeración y botón de copiar.

## Cuándo sí / cuándo no

**Sí**
- Mostrar código o texto monoespaciado con numeración y botón de copiar.

**No**
- No se usa `shiki` aquí salvo `useHighlightedCode` (en `hooks`).
- En la app (HU-0025): el lector de historias (`HistoryMarkdown`) pinta cada bloque de código del Markdown con `CodeBlock size="sm"`, su cabecera con el lenguaje y `CopyButton` (icono, en español), y el modal «Datos incompletos» muestra con él el comando de cada historia.

## Importación

```tsx
import {
  CodeBlock,
  CodeBlockHeader,
  CodeBlockTitle,
  CodeBlockActions,
  CodeBlockCopyButton,
  CodeBlockContent,
  CodeBlockLine,
  CodeBlockFooter,
} from "@/components/ui/code-block"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import {
  CodeBlock,
  CodeBlockHeader,
  CodeBlockTitle,
  CodeBlockActions,
  CodeBlockCopyButton,
  CodeBlockContent,
} from "@/components/ui/code-block"

export function Ejemplo() {
  return (
    <CodeBlock>
      <CodeBlockHeader>
        <CodeBlockTitle>ejemplo.js</CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton value="const a = 1" />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent lineNumbers>{"const a = 1"}</CodeBlockContent>
    </CodeBlock>
  )
}
```

## Variantes y tamaños

`variant`: `default`, `destructive`. `size`: `default`, `sm`. `CodeBlockLine` `variant`: `default`, `added`, `removed`, `highlighted`.

## Estados

`wrap`, `lineNumbers`; el botón de copiar cambia a "copiado" 2 s.

## Accesibilidad

El botón de copiar trae `aria-label` en inglés ("Copy"): pásalo en español.

## Tokens que usa

- `--background`, `--destructive`, `--foreground`, `--input`, `--muted` (`text-muted-foreground`), `--ring`, `--surface-soft` (`bg-muted`)
- Además: `--radius-*`, `--font-mono`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ajuste 6 (HU-0025, escala armónica): al adoptarlo la app, `test:ui` (prueba 15) lo revisa. `me-1.5`/`-me-1.5` pasan a `me-2`/`-me-2`, `pt-1.5` a `pt-2`, `leading-relaxed` a `leading-(--lh-body)`, y el anillo de foco de `ring-3 ring-ring/50` a `ring-2 ring-ring`. El botón de copiar del catálogo sigue con `aria-label` en inglés: la app usa `CopyButton` (`features/projects`), con sus textos en español.

Ajuste 5 (A-7): `highlighter.tsx` pasó de `src/lib/` a `src/hooks/`, y `use-highlighted-code.ts` lo importa de `@/hooks/highlighter` (`lib/` no puede importar React).

## Qué no hacer

- Nunca mostrar transcripts ni contenido real de un perfil.
- No regenerar con `pnpm exec shadcn add code-block --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#code-block` (con `pnpm dev`).
