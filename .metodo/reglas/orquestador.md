# Reglas propias del orquestador en Code AI Profiles

<!-- Lo que este proyecto añade a AGENTS.md: convenciones, fuentes de verdad, reglas de producto. El generador lo incluye en AGENTS.md. -->

- **Privacidad**: nadie lee, registra ni expone credenciales, cookies, tokens, prompts, respuestas ni transcripts de los perfiles fuera de los metadatos que la historia permita de forma explícita. Es la promesa central del producto.
- **Tres plataformas**: todo cambio mantiene macOS, Windows y Linux. Lo específico de una plataforma documenta y prueba sus rutas alternativas. Los instaladores se compilan en sus runners nativos de `.github/workflows/build-desktop.yml`.
- **Sin dependencias, permisos invasivos, telemetría ni acceso de red** que una historia no justifique y la persona no autorice. La app es local por diseño.
- **Grafo**: se usa el envoltorio del proyecto, que fija la versión de Graphify en `.graphify-version`. Usa `pnpm graph:update` y `pnpm graph:check`, y no `grafo.mjs build`. Antes de analizar, `graphify query "<objetivo y área>"`. Al cerrar una historia con código, el orquestador corre `pnpm graph:update`, revisa `graphify affected "<símbolo principal>"` y corre `pnpm graph:check`. `graphify-out/graph.json`, `GRAPH_REPORT.md` y `manifest.json` se versionan y nunca se editan a mano.
- **Versionado SemVer**: solo con `pnpm release:version <patch|minor|major|x.y.z>`, que sincroniza Node y Tauri de forma atómica. Se comprueba con `pnpm release:check`. Cada versión lleva su entrada en `CHANGELOG.md` (Keep a Changelog). La política completa está en `docs/versionado.document.md`.
- **Ramas**: el trabajo va en ramas desde `develop` y entra por PR hacia `develop`. `main` solo se actualiza por PR desde `develop`. Nunca hay push directo a ramas protegidas.
- **Documentación funcional**: al cerrar una historia que cambia comportamiento, el orquestador actualiza `docs/<area>.document.md` (actualizaciones, instancias, rendimiento, sesiones, versionado, graphify) y, si cambia lo visible, `README.md` y `CONTRIBUTING.md`. Antes lo hacía el rol `document`, que en la v4 no existe.
- **Historias anteriores**: las HU-0001 a HU-0010 de la metodología previa están en `docs/archivo/previo/hu/`. No se reescriben. La numeración v4 sigue desde ellas (`primerNumero`).
- **Verificación mínima** cuando el área cambia: `pnpm build` para frontend y contratos TypeScript, y `cargo test --manifest-path src-tauri/Cargo.toml` para Rust.
