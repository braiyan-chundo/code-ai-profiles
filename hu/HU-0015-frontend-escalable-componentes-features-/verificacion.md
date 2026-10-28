# Verificación · HU-0015 · Frontend escalable: componentes, features y router

Preparada por el orquestador el 2026-10-28. Verifica la persona; el orquestador no corrige lo que encuentra.
Lleva revisión técnica porque el dial `revisionTecnica` es `siempre`: `revision-tecnica.md` (PASS).

## Qué se entregó

| Repo | Commits | Qué |
| --- | --- | --- |
| code-ai-profiles | `02480a9`…`f5c194a` (pasos 0–10) | `src/` por features (`app/`, `features/`, `components/`, `lib/`, `styles/`), estado con Context + `useReducer`, `DashboardRuntime` con el orden fijo de efectos, React Router 7 con hash, 4 pruebas nuevas, skill de frontend |
| code-ai-profiles | `5995e50`, `c157308`, `234f9a5` y el de esta verificación | Historia, arquitectura, reglas del rol, `stack.comandos`, revisión técnica y `docs/arquitectura/frontend.md` |

## Comprobaciones

| Comprobación (2026-10-28) | Resultado |
| --- | --- |
| Suite, tipos y build (`pruebas.mjs suite todos`), una vez | en verde (tipos, build y suite, 7 s); se registra sobre el SHA de esta verificación |
| DOM de 5 estados contra la línea base de `5995e50` (orquestador, navegador integrado, modo mock) | idéntico normalizando horas: panel oscuro, panel claro, apariencia, nueva instancia, transferencia |
| CSS compilado (frontend) | mismo hash antes y después; la concatenación de `src/styles/` es byte a byte el `styles.css` original |
| Capturas (frontend, Chrome sin interfaz) | idénticas píxel a píxel en 8 estados, a 1440×900 y 980×680 |
| Ruta desconocida | `#/no-existe` vuelve a `#/` |
| Consola en carga limpia (`npm run dev`) | sin errores |
| `invoke` | solo en `src/lib/bridge.ts` |
| Tamaño de componentes | ninguno pasa de 177 líneas; `App.tsx`, 11 |
| Pruebas del frontend | 80 casos en verde (`test:scan`, `test:update`, `test:format`, `test:appearance`, `test:dashboard`, `test:messages`) |
| Configuración fuera del código y guarda de producción | `config.mjs check` y `entorno.mjs check` en orden |
| Revisión técnica | PASS; observaciones R-1..R-7 sin bloqueantes |

## Decisiones tomadas por defecto (★, revisables al probar)

1. D-1 · Estructura por features (`app/`, `features/`, `components/`, `lib/`). Alternativa: por tipo.
2. D-2 · Estado compartido con Context y `useReducer`, sin librería. Alternativa: Zustand.
3. D-3 · React Router 7 con historial por hash (`createHashRouter`). **Pesa 33 kB gzip** (el JS pasa de 85,0 a
   119,6 kB). Alternativa más ligera: `<HashRouter>` + `<Routes>` (15,5 kB), sin carga diferida ni
   `errorElement` por ruta.
4. D-4 · `styles.css` repartido en 26 archivos en el mismo orden; tema claro, responsive y animaciones quedan
   globales al final. Alternativa: un solo archivo.
5. D-5 · Pruebas solo para la lógica extraída a módulos puros, con `node --test`. Alternativa: Vitest.

## Guía de prueba

No hay cuentas de seed: la app trabaja sobre tus perfiles locales. En el modo navegador (`npm run dev`) usa los
datos del mock.

1. **AC-01 · Todo igual, en escritorio.** `npm run tauri dev`. Recorre el panel, una tarjeta (abrir, detener,
   carpeta, editar, borrar una detenida), la aplicación original (sesiones, transferir, desvincular),
   «Escanear sistema», apariencia (tema y tamaño, persisten al reabrir), «Nueva instancia» (con y sin icono)
   y los diálogos con Escape. En oscuro, claro y sistema, y con la ventana al mínimo (980×680).
2. **AC-01 · La vuelta tras «Actualizar original».** Con una actualización disponible, pulsa «Actualizar
   original», vuelve a la ventana de Code AI Profiles: solo se refrescan las versiones, **sin** que aparezca
   el panel de escaneo. Es el riesgo principal del refactor (R-1).
3. **AC-02 · Cada pieza en su sitio.** Mira `src/`: `app/`, `features/<feature>/`, `components/`, `lib/`,
   `styles/`. `src/app/App.tsx` solo compone.
4. **AC-03 · Router.** En `npm run dev`, escribe `http://127.0.0.1:1420/#/cualquier-cosa`: vuelve al panel.
5. **AC-04 · En verde.** `npm run build` y `npm run test:dashboard` pasan.
6. **AC-05 · Arquitectura escrita.** Lee `docs/arquitectura/frontend.md`: estructura, reglas de dependencias
   y cómo añadir una feature o una pantalla.

**Solo tú puedes comprobar:**

- La app de escritorio (`npm run tauri dev`) y la vuelta tras «Actualizar original» (pasos 1 y 2). Nadie lo
  ha visto: todo lo anterior se comprobó en el modo navegador con el mock.
- Windows y Linux: controles de ventana propios en Windows, sin controles en Linux, y el «Ctrl» del atajo de
  búsqueda. Se ven en sus máquinas o con los instaladores de CI.
- Lo que el mock no muestra: icono personalizado válido e inválido, error de escaneo con «Ocultar», estado de
  carga y estados vacíos.

## Veredicto

2026-10-28 · Braiyan Rodriguez (mantenedor), tras recorrer la app de escritorio con `npm run tauri dev` en macOS:

> «veo todo bien, lo unico que me gustaria cambiar es que nosotros no trabajamos con npm, trabajamos con pnpm podrias cambiarlo y con eso damos cerrada esta tarea»

**Aprobada.** El cambio pedido se hizo en `cb4c019` (pnpm en lugar de npm). Con pnpm: `pnpm build`, las pruebas
relacionadas y `pnpm tauri dev` arrancan en verde.
