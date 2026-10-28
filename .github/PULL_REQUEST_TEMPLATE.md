## Resumen

<!-- Explica qué cambia y por qué. -->

## Autorización previa

- Issue autorizado por el mantenedor: <!-- #123 -->
- Historia de usuario: <!-- hu/HU-XXXX-slug/ -->
- [ ] El PR apunta a `develop`.
- [ ] Recibí autorización de `@braiyan-chundo` antes de comenzar.

## Verificación

- [ ] Ejecuté `pnpm build`.
- [ ] Ejecuté `cargo test --manifest-path src-tauri/Cargo.toml`.
- [ ] No incluí credenciales, datos de cuentas ni sesiones privadas.
- [ ] Actualicé la documentación cuando corresponde.
- [ ] Ejecuté `pnpm graph:update` y versioné los artefactos de Graphify.

> Los PR externos dirigidos a `main` se cierran automáticamente. Solo el mantenedor publica cambios desde `develop` hacia `main`.
