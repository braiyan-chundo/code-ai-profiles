# Paleta de comandos (`command`)

## Para qué

Búsqueda de órdenes con lista filtrable.

## Cuándo sí / cuándo no

**Sí**
- Una paleta de búsqueda de órdenes, en línea o en un diálogo.

**No**
- Elegir un valor de formulario con búsqueda: `Combobox`. **`CommandDialog` no envuelve a sus hijos en `Command`**: ponlo tú.
- Hoy no lo usa ninguna pantalla de la app (sí el showcase). Si una lo adopta, se usa con el tema de `ui-theme.css`, sin CSS propio.

## Importación

```tsx
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from "@/components/ui/command"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"

export function Ejemplo() {
  return (
    <Command className="w-80 rounded-xl border">
      <CommandInput placeholder="Escribe una orden" />
      <CommandList>
        <CommandEmpty>Sin resultados.</CommandEmpty>
        <CommandGroup heading="Sugerencias">
          <CommandItem>Perfiles</CommandItem>
          <CommandItem>Sesiones</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  )
}
```

## Variantes y tamaños

`Command` en línea o `CommandDialog` (con `title` y `description` en español).

## Estados

`CommandEmpty` sin resultados; `disabled` en un `CommandItem`.

## Accesibilidad

`CommandDialog` lleva título y descripción ocultos: pásalos en español.

## Tokens que usa

- `--border`, `--foreground`, `--input`, `--muted` (`text-muted-foreground`), `--popover-foreground`, `--surface-soft` (`bg-muted`), `--ui-popover`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No usar `CommandDialog` sin `<Command>` dentro (cmdk falla).
- No regenerar con `pnpm exec shadcn add command --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#command` (con `pnpm dev`).
