---
id: HU-0021
titulo: "Spike: relevo del retorno de inicio de sesión a la instancia correcta"
estado: en-proceso
fase: requisitos
area: instancias
entrega: 1
prioridad: media
creada: 2026-10-28
requiere: { arquitectura: true, diseno: false }
repos: [code-ai-profiles]
riesgo: [datos-personales]
reglas: []
depende: []
---

# Spike: relevo del retorno de inicio de sesión a la instancia correcta

Como mantenedor con varias instancias abiertas
quiero saber si Code AI Profiles puede recibir el retorno del inicio de sesión y entregarlo solo a la instancia
que lo pidió
para iniciar sesión en una sin detener las que están trabajando.

## Petición original

> «analizar porque si una instancia me pide iniciar sesion y tengo varias instancias abiertas el callback del navegador toma la que no es, es decir para poder iniciar sesion en una instancia debo cerrar o detener todas las demas» — Braiyan Rodriguez (mantenedor), 2026-10-28

> «me gusta lo de login asistido pero... y si otras instancias estan trabajando no se deberian poder cerrar no? no existe otra manera?» y, tras la propuesta del relevo, «para lo del login me gusta tu spike miremos esa alternativa» — Braiyan Rodriguez (mantenedor), 2026-10-28

Diagnóstico de partida en `analisis.md`: las copias comparten `CFBundleIdentifier` y el esquema `claude://`,
LaunchServices elige el receptor por identificador, no por ruta, y Claude se vuelve a registrar como receptor
cada vez que arranca.

## Pregunta del spike

¿Puede Code AI Profiles, durante un «modo inicio de sesión» para una instancia concreta:

1. registrarse temporalmente como receptor del esquema (`claude://`) en macOS, ganando al re-registro de Claude;
2. recibir la URL de retorno y entregarla **solo** a la copia que la pidió, abriéndola por su ruta
   (`open -a <ruta>` o `NSWorkspace.open(_:withApplicationAt:)`), aunque haya otras copias con el mismo
   identificador en marcha;
3. devolver el receptor a Claude al terminar, también si la app se cierra a mitad;
4. hacerlo sin guardar ni registrar la URL?

Y en Windows y Linux, si el mismo relevo funciona con el registro de usuario (HKCU) y `xdg-mime`.

## Cómo se responde

- Solo con apps de prueba y un esquema propio (no `claude://`), en carpetas temporales, sin tocar Claude, las
  instancias, el receptor real de `claude://` ni ningún perfil.
- Resultado: un informe con lo comprobado, lo inferido, los riesgos y una recomendación (historia o descartar).

## Reglas de negocio afectadas

- **Regla que choca (decide el mantenedor al ver el resultado):** la privacidad de `AGENTS.md` («nadie lee,
  registra ni expone credenciales, cookies, tokens…»). El relevo tendría en tránsito la URL con el código de
  autenticación, sin guardarla ni registrarla.
- Sin permisos invasivos ni dependencias nuevas sin autorización: el spike dirá si hace falta alguna
  (`tauri-plugin-deep-link`, Automatización).

## Criterios de aceptación

### AC-01 · Informe del spike

Existe `spike.md` en esta carpeta que responde las cuatro preguntas en macOS con evidencia de apps de prueba, y
dice qué se sabe y qué no de Windows y Linux.

### AC-02 · Nada real tocado

Durante el spike no cambia el receptor de `claude://`, no se lanza ni modifica Claude ni ninguna instancia, y no
se lee ningún perfil.

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
- [ ] Commits en cada repo tocado con `HU: HU-0021`. **Sin push, sin publicar, sin desplegar**
- [ ] Lo que solo comprueba una persona, declarado como pendiente humano

## Cierre

Fecha, quién cerró y sobre qué veredicto.

SHA por repositorio, con una línea de qué hace cada uno:

★ aceptadas tal como estaban:

Pendientes humanos (nadie los vio; no se dan por hechos):

Deuda declarada:
