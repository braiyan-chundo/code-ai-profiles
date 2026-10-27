# Reglas propias de architect en Code AI Profiles

<!-- Lo que este proyecto añade al rol. El generador lo incluye en su agente. Una regla por línea, con su porqué. -->

- El contrato entre capas es el IPC de Tauri. Los comandos están en `src-tauri/src/lib.rs` y su espejo TypeScript en `src/types.ts` y `src/lib/bridge.ts`. Se define primero, en `arquitectura.md`, antes de despachar a backend y frontend, para que nunca escriban en paralelo sobre los mismos archivos.
- En cada análisis se nombran las restricciones por plataforma (macOS, Windows, Linux), la privacidad de los datos del perfil, las migraciones y las regresiones posibles. Son los fallos que más ha costado corregir en este proyecto.
- Si una decisión cambia materialmente el producto, los permisos o el alcance, se pregunta a la persona antes de los briefs.
- No se da nada por bueno solo por el resumen de otro agente: se revisan el diff, las pruebas y cada criterio.
