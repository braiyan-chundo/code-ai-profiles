# Paneles redimensionables (`resizable`)

## Para qué

Paneles cuyo tamaño se ajusta arrastrando.

## Cuándo sí / cuándo no

**Sí**
- Dos o más paneles cuyo tamaño ajusta la persona.

**No**
- Disposición fija: Tailwind y CSS grid.
- En una pantalla de la app: hoy no. La app no carga Tailwind (D-2); lo adopta una historia posterior.

## Importación

```tsx
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"

export function Ejemplo() {
  return (
    <ResizablePanelGroup orientation="horizontal" className="h-40 rounded-xl border">
      <ResizablePanel defaultSize={35}>Panel A</ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={65}>Panel B</ResizablePanel>
    </ResizablePanelGroup>
  )
}
```

## Variantes y tamaños

`orientation` (react-resizable-panels 4: ya no es `direction`). `withHandle` pinta un tirador.

## Estados

`minSize` y `maxSize` limitan.

## Accesibilidad

El separador se mueve con las flechas.

## Tokens que usa

- `--border`, `--ring`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No usar `direction`: es de la versión anterior.
- No regenerar con `pnpm exec shadcn add resizable --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#resizable` (con `pnpm dev`).
