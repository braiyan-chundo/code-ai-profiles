---
id: HU-0013
titulo: "Describir lo construido: reglas, arquitectura y componentes"
estado: en-espera
fase: requisitos
area: metodo
entrega: 1
prioridad: media
creada: 2026-10-27
requiere: { arquitectura: true, diseno: false }
repos: [code-ai-profiles]
riesgo: []
reglas: []
depende: [HU-0011]
---

# Describir lo construido: reglas, arquitectura y componentes

Como mantenedor
quiero que lo ya construido quede descrito en el formato de la v4
para que los agentes partan de reglas, arquitectura y componentes escritos, no de leer `lib.rs` y `App.tsx` enteros.

## Petición original

> «cerra todo con lo recomendado» — Braiyan Rodriguez, 2026-10-27, al cerrar la HU-0011 (Adopción v4).

Lo recomendado fue cerrar la adopción con el andamiaje hecho y llevar a una historia propia, en espera, la descripción de lo construido (adopcion.md §4: «Lo ya construido … se describe»).

## Problema

La adopción dejó el método funcionando, pero no hay reglas de negocio `RN-n` en `docs/producto/reglas/`,
ni `docs/arquitectura/` del stack, IPC y almacenamiento local, ni skills por componente. Hoy ese
conocimiento vive en el código, en `DESIGN.md` y en los `docs/*.document.md`.

## Alcance

- Primer borrador de reglas `RN-n`: aislamiento de perfiles, privacidad (solo metadatos) y transferencias de sesiones solo entre perfiles detenidos.
- `docs/arquitectura/`: stack, comandos IPC y contrato (`types.ts`/`bridge.ts`), almacenamiento local (`ManagedPaths`, registro, escrituras atómicas) y rutas por plataforma.
- Una skill `code-ai-profiles-ui-<id>` por componente reutilizable de `App.tsx` y `Icons.tsx`, y su índice `code-ai-profiles-componentes`, desde `DESIGN.md` y `src/styles.css`.

## Fuera de alcance

- Cambios de producto o de comportamiento.
- Partir `App.tsx` o `lib.rs` en módulos.
- Reescribir las HU heredadas.

## Decisiones por defecto (★)

- ★ **D-1 · Los `docs/*.document.md` se quedan donde están.** *Por qué:* `AGENTS.md` y el README los citan por esa ruta. *Alternativa:* moverlos a `docs/producto/` y actualizar los enlaces.

## Criterios de aceptación

Borrador; se concretan al sacarla de espera.

### AC-01 · Reglas de negocio escritas

En `docs/producto/reglas/` hay al menos tres reglas `RN-n` (aislamiento de perfiles, privacidad y transferencias solo entre perfiles detenidos), cada una con el enlace al código que la cumple.

### AC-02 · Arquitectura descrita

`docs/arquitectura/` describe el stack, los comandos IPC con su contrato, el almacenamiento local y las rutas por plataforma, y los enlaza desde el índice.

### AC-03 · Componentes con skill

Cada componente reutilizable de `App.tsx` e `Icons.tsx` tiene su skill `code-ai-profiles-ui-<id>`, y el índice `code-ai-profiles-componentes` las lista.

## Reglas de negocio afectadas

| Regla | Qué pasa | Texto |
| --- | --- | --- |
| RN-1…RN-3 | nacen | aislamiento, privacidad, transferencias entre perfiles detenidos |

## Para la persona usuaria

**Pendiente humano:** validar que las reglas escritas dicen lo que el producto promete.

## Definición de Preparado

- [x] Petición literal, problema, alcance y fuera de alcance escritos
- [ ] Criterios numerados y observables desde la interfaz
- [x] Reglas de negocio afectadas nombradas

## Definición de Terminado

- [ ] Tipos, build y suite en verde una vez sobre los SHA finales (`pruebas.mjs estado`)
- [ ] Configuración fuera del código y guarda de producción en verde (`config.mjs check`, `entorno.mjs check`)
- [ ] Pruebas nuevas proporcionales al riesgo, o la razón de no añadirlas
- [ ] Revisión técnica pasada, si la historia es riesgosa
- [ ] La persona probó y aprobó; su veredicto está en `verificacion.md`
- [ ] Delta de reglas de negocio aplicado en `docs/producto/reglas/`
- [ ] Commits en cada repo tocado con `HU: HU-0013`. **Sin push, sin publicar, sin desplegar**
- [ ] Lo que solo comprueba una persona, declarado como pendiente humano

## Cierre

Fecha, quién cerró y sobre qué veredicto.

SHA por repositorio, con una línea de qué hace cada uno:

★ aceptadas tal como estaban:

Pendientes humanos (nadie los vio; no se dan por hechos):

Deuda declarada:
