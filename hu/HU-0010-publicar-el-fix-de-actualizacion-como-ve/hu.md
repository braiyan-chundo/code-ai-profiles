---
id: HU-0010
titulo: "Publicar el fix de actualización como versión 0.2.2"
estado: en-proceso
fase: verificacion
area: versionado
entrega: 1
prioridad: media
creada: 2026-10-27
requiere: { arquitectura: true, diseno: false }
repos: [code-ai-profiles]
riesgo: []
reglas: []
depende: []
---

# Publicar el fix de actualización como versión 0.2.2

Como mantenedor de Code AI Profiles
quiero publicar el fix compatible de actualización original como `0.2.2` por los PR protegidos y obtener un instalador de macOS verificable
para distribuir un build identificable y trazable sin alterar perfiles ni sesiones.

## Petición original

> Historia heredada de la metodología previa. La petición, el alcance completo, los criterios y la evidencia están en
> [docs/archivo/previo/hu/HU-0010](../../docs/archivo/previo/hu/HU-0010-publicar-fix-de-actualizacion-como-0-2-2.md). — adopción v4, 2026-10-27

## Problema

HU-0009 (fix de estado oficial de actualización) estaba cerrada, pero las fuentes canónicas seguían en `0.2.1`.

## Alcance

Subir a `0.2.2` con `npm run release:version -- patch`, añadir el changelog y actualizar README y `docs/versionado.document.md`. Además, dejar listo el handoff de integración (rama → `develop` → `main`, siempre por PR) y el bundle local de macOS.

## Fuera de alcance

Cambios funcionales, dependencias, permisos o esquemas. Tampoco entran tags, GitHub Releases, firma Developer ID, notarización ni los instaladores de Windows y Linux.

## Criterios de aceptación

### AC-01 · Versión sincronizada

`npm run release:check` confirma `0.2.2` en todas las fuentes canónicas, escritas solo por el script.

### AC-02 · Documentación coherente

`CHANGELOG.md`, README y `docs/versionado.document.md` describen `0.2.2` y el flujo de actualización de macOS de HU-0009.

### AC-03 · Pruebas y grafo en verde

`pruebas.mjs suite` está en verde y `npm run graph:check` pasa con los artefactos del grafo versionados.

### AC-04 · Integración por PR

La rama entra a `develop` y después `develop` entra a `main`, ambas por PR y merge commit, sin push directo.

### AC-05 · Bundle macOS verificable

El `.app` y el DMG de Apple Silicon reportan `0.2.2` y tienen su hash registrado. Si no salen de `main`, se identifican como artefacto local.

## Estado al adoptar

- Hecho y commiteado en `be132e5`: AC-01, AC-02, la suite y el bundle local (DMG SHA-256 `e6a99355…0730`, evidencia en la HU original).
- **Pendiente**: `graph:check` sobre el commit, el PR a `develop` y después a `main`. Todo push lo autoriza la persona.
