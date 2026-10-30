---
id: HU-0024
titulo: "Detectar la versión nueva en la publicación oficial e instalarla"
estado: en-proceso
fase: implementacion
area: actualizaciones
entrega: 1
prioridad: alta
creada: 2026-10-29
requiere: { arquitectura: true, diseno: false }
repos: [code-ai-profiles]
riesgo: [permisos, contrato]
reglas: []
depende: []
---

# Detectar la versión nueva en la publicación oficial e instalarla

Como mantenedor que usa la Claude original solo para clonar
quiero que Code AI Profiles detecte la versión nueva publicada por Anthropic y la instale en la original
para tener la original y mis instancias al día sin abrir Claude ni iniciar sesión en ella.

## Petición original

> «lo que quiero es lo siguiente: el sistema debe verificar si en la pagina oficial de antrophic hay una version
> nueva de claude desktop, si es asi, entonces en el dashboard debera aparecer "hay una nueva version de claude
> desktop deseas instalar?" y al darle que si, el sistema deberia avisarme descargar esa nueva version y montarla
> deberia mostrarme la pantalla para arrastrar y al arrastrar y cerrar la vista de isntalacion deberia desmontar y
> eliminar el instaldor usado, teniendo en cuenta que esto solo actualizara la version original de claude entonces
> deberia verificar si las instancias estan obsoletas y si es asi deberia aparecer un boton de sincronizar
> instancias o actualizar instancias obsoletas y con esto se deberia actualizar las instancias que se necesesiten.
> importante las instancias no deberia bloquearse por tener una version antigua pero si deberia salir un aviso de
> "actualizar"
> si una instancia tiene una version superior que el claude original lo mejor es que el sistema verifique en la
> pagina oficial de antrophic si existe una version nueva» — Braiyan Rodriguez (mantenedor), 2026-10-29

Contexto: «en el claude original no tengo una cuenta solo lo tengo para clonarlo». La ventana «Actualizar Claude»
le pedía abrir la original y elegir «Check for Updates».

Elecciones, en la misma conversación (2026-10-29):

- Instalación: «Que la instale sola (Recomendado)». Se usa el flujo de «Descargar e instalar» de la HU-0017 (zip
  oficial, `sha256`, tamaño, firma de Anthropic, Gatekeeper, cuenta de administrador, sustitución con vuelta
  atrás, temporales borrados), no el DMG con arrastre. El enlace del DMG de claude.com responde 403 a clientes que
  no son un navegador.
- Red: «Sí, autorizo» consultar `downloads.claude.ai` (publicación oficial de versiones), sin identificador de
  dispositivo ni datos de la persona.

## Problema

- El feed que consulta la app hoy (`releases.claude.com/api/desktop/…/squirrel/update` con `device_id` nulo)
  responde con la versión que se le pregunta o con la del despliegue general. Las versiones en despliegue
  escalonado no aparecen: el 2026-10-29 el feed decía 4.29.0 mientras una instancia ya se había actualizado sola a
  4.4212.0. Así «Descargar e instalar» no aparece nunca y la ventana manda a abrir la original.
- La publicación oficial `https://downloads.claude.ai/releases/darwin/universal/RELEASES.json` sí da la última
  versión (`currentRelease` 4.4212.0, publicada el 2026-10-29), pero sin `sha256` ni tamaño. El feed, preguntado con
  esa versión, devuelve el paquete con `url`, `sha256` y `size`.

## Alcance

- **Detección (macOS):** la app lee `RELEASES.json` de la publicación oficial con la misma cadencia y caché que el
  feed actual. Si su `currentRelease` es mayor que la versión de la original, hay versión nueva. La dirección va en
  `.env.example` y se lee desde `config.rs`.
- **Aviso en el dashboard:** «Hay una nueva versión de Claude Desktop (X). ¿Deseas instalarla?», con «Instalar» y
  sin obligar.
- **Instalar:** el flujo de «Descargar e instalar» de la HU-0017 sobre esa versión, con los metadatos del paquete
  verificados (`sha256`, tamaño, host permitido). La original debe estar cerrada; si no, se dice.
- **Instancias obsoletas:** tras actualizar la original, si hay instancias detrás aparece «Actualizar instancias
  obsoletas» (la sincronización que ya existe) y las actualiza.
- **Sin bloqueo:** una instancia con versión antigua se abre igual y lleva un aviso «Actualizar».
- **Instancia más nueva que la original:** también se consulta la publicación oficial; si la oficial es mayor que la
  original, se ofrece instalarla.
- Documentación en `docs/actualizaciones.document.md`, README y CHANGELOG.

## Fuera de alcance

- El DMG con arrastre a Aplicaciones (descartado por la persona).
- Windows y Linux: siguen como hoy (HU-0018 en espera).
- Actualizar instancias en marcha: se actualizan detenidas, como hoy.

## Decisiones por defecto (★)

- ★ **D-1 · Dos fuentes oficiales.** La versión sale de `RELEASES.json`; el paquete (`url`, `sha256`, `size`), del
  feed actual preguntado con esa versión, y se exige que coincidan. *Alternativa:* descargar el `url` de
  `RELEASES.json` sin `sha256` y confiar solo en la firma y Gatekeeper.
- ★ **D-2 · La mayor de las dos.** Si el feed y `RELEASES.json` discrepan, manda la mayor que tenga paquete
  verificable. *Alternativa:* solo `RELEASES.json`.
- ★ **D-3 · Aviso en el dashboard y en la página de la original.** *Alternativa:* solo en el dashboard.

## Criterios de aceptación

### AC-01 · Detección

Con la original en una versión menor que la de la publicación oficial, el dashboard muestra «Hay una nueva versión
de Claude Desktop (X). ¿Deseas instalarla?», aunque el feed con identificador nulo diga otra cosa.

### AC-02 · Instalación sin abrir la original

Al pulsar «Instalar», la app descarga, verifica e instala la versión X en la original sin abrir Claude, con una
cuenta de administrador (el flujo de la HU-0017 no pide contraseña), y borra los temporales. Si algo falla, la original queda como estaba.

### AC-03 · Instancias obsoletas

Tras instalar, las instancias detenidas por detrás aparecen con «Actualizar» y un botón «Actualizar instancias
obsoletas» las pone en X.

### AC-04 · Sin bloqueo por versión antigua

Una instancia con versión antigua se abre igual y muestra el aviso «Actualizar».

### AC-05 · Instancia por delante de la original

Si una instancia ya está en una versión mayor que la original, se sigue consultando la publicación oficial y se
ofrece instalar en la original la versión oficial más reciente.

### AC-06 · Sin red o con datos inválidos

Si la consulta falla o la respuesta no es válida, no se bloquea nada: se informa y se reintenta más tarde.

## Reglas de negocio afectadas

- Ninguna escrita. Amplía el acceso de red autorizado: `downloads.claude.ai` (solo lectura de `RELEASES.json` y
  del paquete), sin identificador de dispositivo ni datos de la persona.
- Privacidad: no se lee nada de los perfiles.

## Para la persona usuaria

**Pendiente humano:** probar con la versión nueva real (hoy 4.4212.0 frente a la original 4.29.0); es también la
prueba real pendiente de la HU-0017.

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
- [ ] Commits en cada repo tocado con `HU: HU-0024`. **Sin push, sin publicar, sin desplegar**
- [ ] Lo que solo comprueba una persona, declarado como pendiente humano
