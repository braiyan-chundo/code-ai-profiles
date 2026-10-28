# Carrusel (`carousel`)

## Para qué

Desplaza varios bloques en horizontal o vertical.

## Cuándo sí / cuándo no

**Sí**
- Desplazar pocos bloques de contenido visual.

**No**
- Listas largas: `ScrollArea`.
- En una pantalla de la app: hoy no. La app no carga Tailwind (D-2); lo adopta una historia posterior.

## Importación

```tsx
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  useCarousel,
} from "@/components/ui/carousel"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel"

export function Ejemplo() {
  return (
    <Carousel className="mx-10 w-64">
      <CarouselContent>
        <CarouselItem>Bloque 1</CarouselItem>
        <CarouselItem>Bloque 2</CarouselItem>
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  )
}
```

## Variantes y tamaños

`orientation`: horizontal o vertical. `opts` de Embla; `basis-*` para varios por vista.

## Estados

Anterior y siguiente se deshabilitan en los extremos.

## Accesibilidad

Los botones traen `sr-only` en inglés ("Previous slide").

## Tokens que usa

- Ninguno propio: hereda del contenedor.
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No esconder contenido esencial en diapositivas no visibles.
- No regenerar con `pnpm exec shadcn add carousel --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#carousel` (con `pnpm dev`).
