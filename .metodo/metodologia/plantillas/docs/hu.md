---
id: {{ID}}
titulo: "{{TITULO}}"
estado: en-proceso
fase: requisitos
area: {{AREA}}
entrega: 1
prioridad: media
creada: {{FECHA}}
requiere: { arquitectura: {{SI_ARCHITECT}}, diseno: false }
repos: [{{REPOS}}]
riesgo: []
reglas: []
{{#SI_ALCANCE}}
alcance: []
{{/SI_ALCANCE}}
depende: []{{FUNDACION}}
---

# {{TITULO}}

Como <persona>
quiero <capacidad>
para <resultado>.

## Petición original

> «Las palabras de la persona, sin corregir.» — <quién>, <fecha>

Si eligió entre opciones, la elección es requisito, también citada.

## Problema

Qué duele hoy y a quién. Qué existe (con rutas) y qué falta.

## Alcance

Qué entra.

## Fuera de alcance

Qué no entra, para que nadie lo añada creyendo que ayuda.

## Decisiones por defecto (★)

- ★ **D-1 · <título>.** Lo que se hace. *Por qué:* … *Alternativa:* …

## Criterios de aceptación

Observables **abriendo la aplicación**, con sujeto y resultado concreto.

### AC-01 · <título corto>

...

{{#SI_ALCANCE}}
## Cobertura del {{ALCANCE_NOMBRE}}

| Ítem | Criterio |
| --- | --- |
| A.0.0 | AC-01 |

{{/SI_ALCANCE}}
## Reglas de negocio afectadas

| Regla | Qué pasa | Texto |
| --- | --- | --- |
| RN-0 | nace · cambia · se retira | … |

{{#SI_OBS}}
## Señales

Lo que tiene que poder saberse en producción (el PO, en lenguaje de negocio; el arquitecto lo concreta).

| Id | Señal | Tipo | Dónde | Alerta |
| --- | --- | --- | --- | --- |
| SG-01 | … | log · métrica · traza | … | … |

{{/SI_OBS}}
## Para la persona usuaria

Las ★ que más pueden querer otra cosa, numeradas. **Pendiente humano:** lo que solo se comprueba en un dispositivo real o con datos reales.

{{^SI_ARCHITECT}}
## Plan

Lo escribe el implementador antes de tocar código (≤30 líneas): archivos (rutas comprobadas), datos que se guardan, variables de entorno nuevas con `[SECRET]`/`[PUBLICO]`, pruebas que añade.

{{/SI_ARCHITECT}}
## Definición de Preparado

- [ ] Petición literal, problema, alcance y fuera de alcance escritos
- [ ] Criterios numerados y observables desde la interfaz
- [ ] Reglas de negocio afectadas nombradas
{{#SI_ALCANCE}}
- [ ] Ítems del {{ALCANCE_NOMBRE}} en `alcance:` y en la cobertura
{{/SI_ALCANCE}}
{{#SI_DISENO}}
- [ ] Maqueta aprobada si toca interfaz
{{/SI_DISENO}}

## Definición de Terminado

- [ ] Tipos, build y suite en verde una vez sobre los SHA finales (`pruebas.mjs estado`)
- [ ] Configuración fuera del código y guarda de producción en verde (`config.mjs check`, `entorno.mjs check`)
- [ ] Pruebas nuevas proporcionales al riesgo, o la razón de no añadirlas
{{#SI_DISENO}}
- [ ] Si toca interfaz, la pantalla coincide con la maqueta aprobada en sus tamaños y temas
{{/SI_DISENO}}
{{#SI_REVISION}}
- [ ] Revisión técnica pasada, si la historia es riesgosa
{{/SI_REVISION}}
{{#SI_OBS}}
- [ ] Las señales aparecen (comprobado en local)
{{/SI_OBS}}
- [ ] La persona probó y aprobó; su veredicto está en `verificacion.md`
{{#SI_QA}}
- [ ] Si hubo QA, cada `Q-n` tiene la decisión de la persona
{{/SI_QA}}
- [ ] Delta de reglas de negocio aplicado en `docs/producto/reglas/`
- [ ] Commits en cada repo tocado con `HU: {{ID}}`. **Sin push, sin publicar, sin desplegar**
- [ ] Lo que solo comprueba una persona, declarado como pendiente humano

## Cierre

Fecha, quién cerró y sobre qué veredicto.

SHA por repositorio, con una línea de qué hace cada uno:

★ aceptadas tal como estaban:

Pendientes humanos (nadie los vio; no se dan por hechos):

Deuda declarada:
