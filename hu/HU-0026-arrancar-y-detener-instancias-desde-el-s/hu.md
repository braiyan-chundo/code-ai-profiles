---
id: HU-0026
titulo: "Arrancar y detener instancias desde el sidebar y el dashboard"
estado: en-proceso
fase: verificacion
area: instancias
entrega: 1
prioridad: alta
creada: 2026-10-30
requiere: { arquitectura: true, diseno: true }
repos: [code-ai-profiles]
riesgo: [estados]
reglas: []
depende: []
---

# Arrancar y detener instancias desde el sidebar y el dashboard

Como mantenedor con varias instancias de Claude
quiero abrir y detener cada instancia desde el sidebar y el dashboard
para no tener que entrar en la página de cada instancia.

## Petición original

> «4) poder arrancar y detener instancias desde sidebar y desde dashboard
> […] recuerda que debes hacer una maqueta simple de cada vista para aprobarlas
> usar los componentes y skills del showcase» — Braiyan Rodriguez (mantenedor), 2026-10-30

Elección, en la misma conversación (2026-10-30): «Solo instancias (Recomendado)». La Claude original no lleva estos
botones, porque se usa solo para clonar.

## Alcance

- **Sidebar:** al pasar el ratón (o con foco de teclado) por una instancia aparece un botón «Abrir» o «Detener»
  según su estado, sin navegar a su página. Mientras la operación corre, la fila muestra que está en curso.
- **Dashboard:** el mismo botón en cada tarjeta o fila de instancia.
- Usan los mismos comandos y comprobaciones que los botones de la página de la instancia (`launch_instance`,
  `stop_instance`): mismos errores, mismo aviso si macOS bloquea la copia, misma verificación de identidad al detener.
- Una instancia «No disponible» (sin copia) no muestra botón.

## Fuera de alcance

- La Claude original.
- Abrir o detener varias a la vez.
- Cambios en cómo se abre o se detiene una instancia.

## Decisiones por defecto (★)

- ★ **D-1 · Sin confirmación al detener.** Igual que hoy en la página de la instancia. *Alternativa:* un diálogo de
  confirmación desde el sidebar y el dashboard.
- ★ **D-2 · El botón del sidebar aparece al pasar el ratón o con foco**, y el estado (punto de color) se ve siempre.
  *Alternativa:* botón siempre visible.
- ★ **D-3 · Los errores salen en el área de avisos de siempre**, con el nombre de la instancia. *Alternativa:* un
  toast junto al botón.

## Criterios de aceptación

### AC-01 · Maqueta aprobada antes de construir

`diseno/maqueta.html` con el sidebar (reposo, hover, en curso, en marcha) y el dashboard con los botones, en oscuro y
claro, a 1440×920 y 980×680, con el sidebar desplegado y plegado, usando componentes del catálogo; la persona la
aprueba.

### AC-02 · Abrir desde el sidebar y el dashboard

Con una instancia detenida, «Abrir» en el sidebar o en el dashboard la abre sin cambiar de página; el estado pasa a
«Ejecutándose».

### AC-03 · Detener desde el sidebar y el dashboard

Con una instancia en marcha, «Detener» la cierra con la misma verificación de identidad que la página de la
instancia; el estado pasa a «Detenido».

### AC-04 · En curso y errores

Mientras la operación corre, el botón está desactivado e indica que trabaja; si falla, el aviso nombra la instancia.

### AC-05 · Accesible

El botón se alcanza con teclado, tiene un nombre accesible («Abrir Claudio Personal», «Detener Claudio Personal») y no
roba el clic de la fila, que sigue navegando a la instancia.

## Reglas de negocio afectadas

- Ninguna.

## Para la persona usuaria

**Pendiente humano:** aprobar la maqueta.

## Definición de Preparado

- [x] Petición literal, problema, alcance y fuera de alcance escritos
- [x] Criterios numerados y observables desde la interfaz
- [x] Reglas de negocio afectadas nombradas

## Definición de Terminado

- [ ] Tipos, build y suite en verde una vez sobre los SHA finales (`pruebas.mjs estado`)
- [ ] Configuración fuera del código y guarda de producción en verde (`config.mjs check`, `entorno.mjs check`)
- [ ] Pruebas nuevas proporcionales al riesgo, o la razón de no añadirlas
- [ ] Revisión técnica pasada, si la historia es riesgosa
- [ ] La persona probó y aprobó; su veredicto está en `verificacion.md`
- [ ] Delta de reglas de negocio aplicado en `docs/producto/reglas/`
- [ ] Commits en cada repo tocado con `HU: HU-0026`. **Sin push, sin publicar, sin desplegar**
- [ ] Lo que solo comprueba una persona, declarado como pendiente humano
