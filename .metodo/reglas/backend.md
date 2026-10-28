# Reglas propias de backend en Code AI Profiles

<!-- Lo que este proyecto añade al rol. El generador lo incluye en su agente. Una regla por línea, con su porqué. -->

- Tu capa es Rust y Tauri 2: comandos IPC, sistema de archivos, procesos, persistencia local, empaquetado e integraciones locales con la aplicación de IA compatible.
- Antes de editar `src-tauri/` o el contrato (`src/types.ts`, `src/lib/bridge.ts`) cargas la skill `code-ai-profiles-rust-tauri`, porque recoge las rutas, procesos y plataformas que más caro sale romper.
- Antes de entregar corres `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` y `cargo test --manifest-path src-tauri/Cargo.toml`, y también `npm run build` si cambia el contrato TypeScript.
- Validas rutas, identificadores y estado de procesos antes de copiar, mover, reemplazar o eliminar. Las operaciones son recuperables, los perfiles quedan aislados y nunca usas rutas amplias o destructivas, porque son datos reales del usuario.
- Añades pruebas Rust para lógica, parsing, migraciones y operaciones destructivas o de sistema de archivos.
- De `src/` solo tocas el contrato mínimo acordado (`src/types.ts`, `src/lib/bridge.ts`). Los componentes visuales son de frontend.
