# Verificación · HU-0014 · Design system con shadcn y showcase local

Preparada por el orquestador el 2026-10-28. Verifica la persona; el orquestador no corrige lo que encuentra.
Lleva revisión técnica porque el dial `revisionTecnica` es `siempre`: `revision-tecnica.md`, FAIL en la
primera vuelta por R-1 (la prueba de aislamiento) y PASS en la segunda, tras `283649f`.

## Qué se entregó

| Repo | Commits | Qué |
| --- | --- | --- |
| code-ai-profiles | `f78dc4e` | Tailwind 4, shadcn 4.22.1 y `tw-animate-css` (exactas, de desarrollo); Tailwind solo en `pnpm dev`; alias `@/`; `components.json`; entrada `showcase.html` |
| code-ai-profiles | `24d0ef5`, `ce5dc92` | 63 componentes del registro `radix-vega` en `src/components/ui`, hooks y `lib/utils.ts`; tema `src/styles/ui-theme.css` con los tokens de la app y los ajustes de la lista cerrada |
| code-ai-profiles | `252b843` | Showcase: índice, buscador, selector de tema y una sección por componente con variantes, estados y composición |
| code-ai-profiles | `f0ac287`, `da8012b` | Skill `code-ai-profiles-ui` (índice, `tema.md`, 63 fichas); reglas y skill de frontend actualizadas |
| code-ai-profiles | `b70217d`, `283649f` | `test:ui` (aislamiento, 5 pruebas con canario) y dos pasos en CI: la prueba y la guarda de `dist/` tras el build |
| code-ai-profiles | `aaf5602`, `2de3ff4`, `0dc0a6d` y el de esta verificación | Historia, arquitectura, brief, comandos del método, revisión técnica y `docs/arquitectura/frontend.md` |

## Comprobaciones

| Comprobación (2026-10-28) | Resultado |
| --- | --- |
| Suite, tipos y build (`pruebas.mjs suite todos`), una vez | en verde; se registra sobre el SHA de esta verificación |
| `dist/` contra la línea base de `7dca7a0` (frontend, `shasum` de los 17 archivos) | idéntico en los pasos 1, 2, 3, 4 y 8, también tras `rm -rf node_modules && pnpm install --frozen-lockfile` |
| CSS de `/` en desarrollo | mismo hash antes y después |
| Tailwind en el bundle | `rg -l "tailwindcss\|--tw-" dist` vacío; sin `showcase.html` en `dist/` |
| La app en `pnpm dev` (orquestador, navegador integrado) | `/` sin reglas de Tailwind; `#root` mide 20114, igual que la línea base de HU-0015 |
| Showcase (frontend con Chrome sin interfaz; orquestador con el navegador integrado) | 63 secciones y 63 enlaces de índice; consola sin errores; red solo a `127.0.0.1:1420`; `localStorage` vacío; superposiciones abiertas en oscuro y claro sin errores |
| Colores y tipografía (frontend, estilos calculados) | botón `rgb(255,95,53)`, diálogo `rgba(43,44,43,.98)`, velo `rgba(5,6,5,.58)` con `blur(18px)`, Inter, radios 12 y 14 px |
| `test:ui` | 5/5; una importación de `@/components/ui` en `src/features/scan` lo pone en rojo (orquestador y frontend) |
| Catálogo | 63 componentes, 63 secciones y 63 fichas, con los mismos nombres que § Catálogo |
| Scripts de instalación | ninguno pendiente (`pendingBuilds` vacío); `pnpm-workspace.yaml` sin cambios |
| Configuración fuera del código y guarda de producción | `config.mjs check` y `entorno.mjs check` en orden |
| Revisión técnica | PASS en la segunda vuelta; R-2..R-4 y R-6..R-9 sin bloqueo |

## Decisiones tomadas por defecto (★, revisables al probar)

1. D-1 · El showcase es otra página, `/showcase.html`, para aislar el reseteo de Tailwind del documento de la
   app. Alternativa: una ruta `#/showcase` solo en desarrollo, cuando Tailwind conviva con la app.
2. D-2 · Tailwind solo se carga con `pnpm dev`; `vite build` ni lo importa. Alternativa: cargarlo en la app
   sin preflight desde ya.
3. D-3 · Los iconos internos de los componentes son de lucide. Alternativa: los de `components/Icons.tsx`.
4. D-4 · El tema lee los tokens de la app. `--primary` y `--muted` no se redefinen (la app ya los usa con otro
   sentido) y lo que la app no tiene como token va como `--ui-*` en `ui-theme.css`, con su regla de origen.
5. D-5 · Versiones exactas: shadcn 4.22.1 (la 4.23.0 tenía menos de 24 h), Tailwind 4.3.3 y cada dependencia
   nueva fijada.
6. Botón principal naranja con texto blanco, como `.primary-action` de la app: contraste 3,0:1. Alternativa:
   texto oscuro (5,8:1), un cambio de una línea.
7. Todo el catálogo: 63 componentes, incluidos 8 de chat (traen `shiki` y `@shadcn/react`) y `combobox`
   (trae `@base-ui/react`). Alternativa: quitarlos.

## Guía de prueba

Dónde: `pnpm dev` y `http://127.0.0.1:1420/showcase.html` en tu navegador. No hay cuentas: el showcase no
lee datos.

1. **AC-01 · El showcase se abre.** Abre la URL. A la izquierda, el índice con los 63 componentes por grupos;
   el buscador filtra («diálogo», «menú»). Cada sección muestra variantes, estados y su ficha.
2. **AC-02 · Aspecto de la app.** Compara con la app abierta al lado (`http://127.0.0.1:1420/`): tipografía,
   naranja, bordes, radios, densidad. Abre un diálogo, un menú desplegable, un selector y un toast: deben
   parecer de Code AI Profiles, no de shadcn por defecto.
3. **AC-03 · Oscuro y claro.** Usa «Oscuro» y «Claro» arriba a la izquierda. Recorre varios grupos y abre las
   superposiciones en los dos temas: sin textos ilegibles ni fondos sin contraste.
4. **AC-04 · Fuera de la app.** `pnpm build` y `ls dist`: solo `assets` e `index.html`. `pnpm tauri dev`: la
   app se ve igual que antes.
5. **AC-05 · Skill.** Abre `.claude/skills/code-ai-profiles-ui/SKILL.md`: índice de 63 filas con enlace a cada
   ficha en `componentes/`.

Regresión: la app en `/` y en escritorio sin cambios visibles.

**Solo tú puedes comprobar:**

- Que los componentes «se sienten» como la app, en oscuro y claro (AC-02 y AC-03). Es la apreciación visual
  de la historia; el frontend revisó unas 15 secciones con capturas, no las 63.
- Hover, foco con teclado y navegación por teclado dentro de las superposiciones, y `prefers-reduced-motion`.
- `pnpm tauri dev` en macOS, y Windows y Linux (la prueba de aislamiento simula las rutas de Windows; nadie la
  ha corrido allí).
- La primera vez que se abre el showcase tras instalar, Vite puede recargar la ventana mientras optimiza las
  dependencias (R-3); un «Invalid hook call» en ese momento desaparece al recargar.

## Veredicto

Pendiente de la persona.
