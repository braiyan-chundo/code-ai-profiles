# Guías de diseño · Code AI Profiles

Estado: **aprobada** (heredada) · 2026-10-27

El sistema de diseño en uso es [`DESIGN.md`](../../DESIGN.md): tipografía Inter y JetBrains Mono, tokens de color, espaciado, radios, densidad, temas claro, oscuro y del sistema, y controles nativos de ventana por plataforma.

Desde HU-0016 la app se construye con el catálogo shadcn/ui de `src/components/ui` y Tailwind 4. Los tokens viven en `src/styles/tokens.css` y el tema del catálogo en `src/styles/ui-theme.css`, que los lee; `src/styles/index.css` es el único punto de entrada. El tema se aplica en `<html>`. Cada componente tiene su ficha en la skill `code-ai-profiles-ui`, y el showcase local (`pnpm dev` → `/showcase.html`) usa los mismos tokens. Ver `.metodo/reglas/frontend.md`.
