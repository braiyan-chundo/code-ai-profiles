<!-- generado por metodo.mjs desde .metodo/config.json: no editar. -->
# Code AI Profiles · cómo trabajamos

Aplicación de escritorio open source (Apache-2.0) hecha con Tauri 2, React 19 + Vite y Rust para administrar perfiles aislados de una aplicación de IA compatible instalada en el equipo. Cada perfil conserva sus propios datos y puede ejecutarse en paralelo con los demás. El dashboard unifica estado, versión, uso de sesión y semanal, sesiones locales y contexto estimado, y permite copiar, mover y devolver sesiones entre perfiles detenidos, sincronizar instancias con la instalación más reciente y abrir el canal oficial de actualización. Funciona en macOS (Apple Silicon), Windows x64 y Linux x64/ARM64; los instaladores se compilan en GitHub Actions. Todo es local: no hay servidor propio, telemetría ni producción con hosts. Un solo mantenedor aprueba, decide el método y autoriza las salidas. No hay cliente con contrato ni alcance cerrado.

Metodología v4 · perfil **S** · fase **desarrollo** · modo **construir-todo**. La config manda:
`.metodo/config.json`. Lo que rige ahora: `node .metodo/scripts/metodo.mjs efectivo`. El detalle del
método está en `.metodo/metodologia/`, pero sus documentos no se leen enteros: se saca solo la sección que
hace falta con `node .metodo/scripts/metodo.mjs leer <documento> "<sección>"` (sin sección, el índice).

## Quién es quién

- Aprueba el producto: **Braiyan Rodriguez (mantenedor)**. Decide el método: **Braiyan Rodriguez (mantenedor)**. Autoriza salidas: **Braiyan Rodriguez (mantenedor)**. Cliente: Proyecto open source propio, sin cliente contratante.
- Canal de aprobación: directo, en la conversación con Claude.

| Agente | Rol | Color | Modelo |
| --- | --- | --- | --- |
| `architect` | architect | orange | opus |
| `backend` | backend | blue | sonnet |
| `frontend` | frontend | green | sonnet |

## Repos

| Nombre | Ruta | Tipo | Puertos |
| --- | --- | --- | --- |
| `code-ai-profiles` | `.` | otro | — |

Packs: `frontend-react-vite`.

## Cómo se trabaja

- Cada petición se clasifica: defecto (`/fix`), historia (`/hu-new`).
- Una historia es una carpeta `hu/HU-####-<slug>/`. Su fase y su estado los avanza `hu.mjs`; la bitácora (`seguimiento.md`) dice en qué va.
- Se avanza con `/hu-work` y se cierra con `/hu-close`.
- **Este proyecto no lleva alcance ni actas.** No se piden ni se mencionan.
- Reglas de negocio vivas en `docs/producto/reglas/`: cada historia que las toca deja su delta al cerrar.

## Las dos reglas fijas

1. **Nada de configuración en el código**: ni URLs, ni tokens (aunque sean de solo lectura), ni claves, ni IDs de servicios. Todo a `.env.example` con su ficha `[SECRET]`/`[PUBLICO]` y leído solo desde el módulo de configuración. La guarda lo bloquea al escribir, al commitear y al cerrar.
2. **Ningún agente toca producción.** Se trabaja en local. En local, los secretos de desarrollo se generan y las cuentas del seed se usan sin pedir permiso; nunca credenciales reales.

## Pruebas

Quien implementa corre solo las relacionadas (`pruebas.mjs relacionadas`). La suite completa la corre el orquestador **una vez** (`pruebas.mjs suite`), con tiempo máximo de 15 min; un SHA en verde no se repite.

## Lo que sale de la máquina

Push, publicación y despliegue los autoriza Braiyan Rodriguez (mantenedor), cada vez. Commits con `HU: HU-####` como trailer.

## Reglas propias del proyecto

- **Privacidad**: nadie lee, registra ni expone credenciales, cookies, tokens, prompts, respuestas ni transcripts de los perfiles fuera de los metadatos que la historia permita de forma explícita. Es la promesa central del producto.
- **Tres plataformas**: todo cambio mantiene macOS, Windows y Linux. Lo específico de una plataforma documenta y prueba sus rutas alternativas. Los instaladores se compilan en sus runners nativos de `.github/workflows/build-desktop.yml`.
- **Sin dependencias, permisos invasivos, telemetría ni acceso de red** que una historia no justifique y la persona no autorice. La app es local por diseño.
- **Grafo**: se usa el envoltorio del proyecto, que fija la versión de Graphify en `.graphify-version`. Usa `pnpm graph:update` y `pnpm graph:check`, y no `grafo.mjs build`. Antes de analizar, `graphify query "<objetivo y área>"`. Al cerrar una historia con código, el orquestador corre `pnpm graph:update`, revisa `graphify affected "<símbolo principal>"` y corre `pnpm graph:check`. `graphify-out/graph.json`, `GRAPH_REPORT.md` y `manifest.json` se versionan y nunca se editan a mano.
- **Versionado SemVer**: solo con `pnpm release:version <patch|minor|major|x.y.z>`, que sincroniza Node y Tauri de forma atómica. Se comprueba con `pnpm release:check`. Cada versión lleva su entrada en `CHANGELOG.md` (Keep a Changelog). La política completa está en `docs/versionado.document.md`.
- **Ramas**: el trabajo va en ramas desde `develop` y entra por PR hacia `develop`. `main` solo se actualiza por PR desde `develop`. Nunca hay push directo a ramas protegidas.
- **Documentación funcional**: al cerrar una historia que cambia comportamiento, el orquestador actualiza `docs/<area>.document.md` (actualizaciones, instancias, rendimiento, sesiones, versionado, graphify) y, si cambia lo visible, `README.md` y `CONTRIBUTING.md`. Antes lo hacía el rol `document`, que en la v4 no existe.
- **Historias anteriores**: las HU-0001 a HU-0010 de la metodología previa están en `docs/archivo/previo/hu/`. No se reescriben. La numeración v4 sigue desde ellas (`primerNumero`).
- **Verificación mínima** cuando el área cambia: `pnpm build` para frontend y contratos TypeScript, y `cargo test --manifest-path src-tauri/Cargo.toml` para Rust.

## Lo que no se edita a mano

Agentes, comandos, hooks, `settings.json`, este archivo y `hu/INDEX.md` se generan. Para cambiarlos: la config y `metodo.mjs generar`. Las reglas propias de un rol, en `.metodo/reglas/<rol>.md`.
