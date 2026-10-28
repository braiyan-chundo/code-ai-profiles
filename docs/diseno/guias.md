# Guías de diseño · Code AI Profiles

Estado: **aprobada** (heredada) · 2026-10-27

El sistema de diseño en uso es [`DESIGN.md`](../../DESIGN.md), aplicado en `src/styles/` (con `src/styles/index.css` como único punto de entrada) y en `src/components/` y `src/features/`. Se conserva tal cual: tipografía Inter y JetBrains Mono, tokens de color, espaciado, radios, densidad, temas claro, oscuro y del sistema, y controles nativos de ventana por plataforma. Lo existente no se migra a Tailwind ni a shadcn/ui. Ver `.metodo/reglas/frontend.md`.

Catálogo de componentes (HU-0014): shadcn/ui en `src/components/ui`, con el tema de `src/styles/ui-theme.css` que lee los tokens de la app, y el showcase local en `pnpm dev` → `/showcase.html`. Cada componente tiene su ficha en la skill `code-ai-profiles-ui`. Hoy solo lo usa el showcase; una pantalla lo adopta con una historia que cargue Tailwind en la app.
