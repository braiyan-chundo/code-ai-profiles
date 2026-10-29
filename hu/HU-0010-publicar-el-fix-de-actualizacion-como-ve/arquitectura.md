# Arquitectura · HU-0010 · Publicar el fix de actualización como versión 0.2.2

## Análisis

Confianza: alta. La historia viene de la metodología previa con el análisis del architect y la evidencia de Graphify completos ([HU original](../../docs/archivo/previo/hu/HU-0010-publicar-fix-de-actualizacion-como-0-2-2.md), secciones «Diseño técnico y contratos» y «Plan y resultado de pruebas»).

### Impacto

| Símbolo que cambia | Consumidores | Qué se rompe |
| --- | --- | --- |
| Versión en `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `Cargo.lock` y `tauri.conf.json` | `release:check`, bundle Tauri | Nada: `patch` compatible |

- Contrato: no.
- Datos guardados: no.
