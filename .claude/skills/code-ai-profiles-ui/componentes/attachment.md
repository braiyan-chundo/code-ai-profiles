# Adjunto (`attachment`)

## Para qué

Archivo adjunto con su estado de carga.

## Cuándo sí / cuándo no

**Sí**
- Un archivo adjunto con su estado de carga.

**No**
- No hay subida de archivos en la app.
- Hoy no lo usa ninguna pantalla de la app (sí el showcase). Si una lo adopta, se usa con el tema de `ui-theme.css`, sin CSS propio.

## Importación

```tsx
import {
  Attachment,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
  AttachmentAction,
  AttachmentTrigger,
} from "@/components/ui/attachment"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import {
  Attachment,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
} from "@/components/ui/attachment"
import { FileTextIcon } from "lucide-react"

export function Ejemplo() {
  return (
    <Attachment state="done">
      <AttachmentMedia>
        <FileTextIcon />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>documento.txt</AttachmentTitle>
        <AttachmentDescription>12 KB</AttachmentDescription>
      </AttachmentContent>
    </Attachment>
  )
}
```

## Variantes y tamaños

`size`: `default`, `sm`, `xs`. `orientation`: `horizontal`, `vertical`. `AttachmentMedia` `variant`: `icon`, `image`.

## Estados

`state`: `idle`, `uploading`, `processing`, `error`, `done`.

## Accesibilidad

Los botones de acción llevan `aria-label` en español.

## Tokens que usa

- `--card-foreground`, `--card`, `--destructive`, `--foreground`, `--muted` (`text-muted-foreground`), `--ring`, `--surface-soft` (`bg-muted`)
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No mostrar nombres de archivo reales de un perfil.
- No regenerar con `pnpm exec shadcn add attachment --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#attachment` (con `pnpm dev`).
