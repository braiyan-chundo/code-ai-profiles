# Verificación · HU-0010 · Publicar el fix de actualización como versión 0.2.2

Preparada por el orquestador el 2026-10-29. Sin revisión técnica: no cambia código, solo la versión y la
documentación.

## Cambio de versión

La 0.2.2 nunca llegó a `main`. Cuando se retomó, `develop` ya acumulaba HU-0014 a HU-0020, así que el mantenedor
decidió publicarla como **0.3.0** (minor: funciones nuevas), que incluye el fix de la 0.2.2 («Limpieza y 0.3.0»,
2026-10-28).

## Qué se entregó

| Repo | Commits | Qué |
| --- | --- | --- |
| code-ai-profiles | `be132e5` | Versión 0.2.2 y su CHANGELOG (metodología previa) |
| code-ai-profiles | `e07a332`, `8f9feac`, `da117b4` (rama `release-0.3.0`, PR #14 a `develop`) | HU-0012 descartada, versión 0.3.0 con su CHANGELOG, README y versionado, grafo al día |
| code-ai-profiles | `c882b58` (PR #15, `develop` → `main`) | La 0.3.0 en `main` |

## Comprobaciones

| Comprobación | Resultado |
| --- | --- |
| AC-01 · `pnpm release:check` | 0.3.0 en `package.json`, `Cargo.toml`, `Cargo.lock` y `tauri.conf.json` |
| AC-02 · Documentación | CHANGELOG `[0.3.0] - 2026-10-28` (añadidas HU-0016 y HU-0017, que faltaban), README y `docs/versionado.document.md` |
| AC-03 · Suite y grafo | en verde sobre `da117b4`; `pnpm graph:check` pasa |
| AC-04 · Integración por PR | PR #14 a `develop` y PR #15 a `main`, por merge commit, sin push directo; CI en verde |
| AC-05 · Bundle macOS | `Code AI Profiles_0.3.0_aarch64.dmg` desde `main`, 5,8 MB, SHA-256 `289d1145ff1170b94f26c2390c23f633601e9d8d7518dc7f9b0b7a2e873b76c9`, `hdiutil verify` válido, versión 0.3.0, mínimo macOS 13.3, firma ad hoc sin notarizar |
| Instaladores (fuera del alcance original) | etiqueta `v0.3.0` subida por el mantenedor; `build-desktop.yml` en verde en macOS Apple Silicon, Windows x64, Linux x64 y Linux ARM64 (run 40821883140). Sin GitHub Release |

## Veredicto

2026-10-29 · Braiyan Rodriguez (mantenedor):

> «mira las comprobaciones demosla por cerrada»

**Aprobada.**
