---
id: HU-0022
titulo: "Configuración unificada con apariencia y permisos"
estado: en-proceso
fase: requisitos
area: interfaz
entrega: 1
prioridad: alta
creada: 2026-10-29
requiere: { arquitectura: true, diseno: true }
repos: [code-ai-profiles]
riesgo: [permisos]
reglas: []
depende: []
---

# Configuración unificada con apariencia y permisos

Como mantenedor de Code AI Profiles
quiero una sola vista de configuración con la apariencia y los permisos que la app puede usar
para ajustar la app en un sitio y entender qué permiso activar, para qué sirve y cómo llegar a él.

## Petición original

> «se requiere hacer una vista de configuracion unificada, en la cual va: lo que hay actualmente en apariencia;
> agregar una seccion de permisos con accesos directos a los permisos que la app requiere y con un info o tooltip
> de informacion de porque se requiere el permiso, claro estos serian opcionales ya que los permisos que se piden
> si bien es para un mejor funcionamiento no son bloqueantes para el uso de la app, recuerda generar maqueta»
> — Braiyan Rodriguez (mantenedor), 2026-10-29

Contexto en la misma conversación: «pienso pedir un feature de permisos que ya deja esa tarea deprecada» (la
comprobación manual del Llavero de la HU-0020).

**Maqueta primero:** el dial de diseño está apagado, pero el mantenedor la pide. `diseno/maqueta.html` se aprueba
antes de implementar.

## Problema

- La apariencia vive en un diálogo («Apariencia», en el pie del sidebar) y no hay un sitio para el resto de ajustes.
- Los permisos solo aparecen cuando algo falla: el de «Gestión de apps» de macOS se explica dentro del editor de
  una instancia, después de que macOS rechazó el icono. No hay forma de saber de antemano qué permisos usa la app,
  para qué, ni de ir a activarlos.

## Alcance

- Una página **Configuración** (`#/configuracion`) que sustituye al diálogo de Apariencia, con dos secciones:
  - **Apariencia:** lo mismo que hoy (tema y tamaño del texto con su vista previa), con el mismo efecto inmediato.
  - **Permisos:** una tarjeta por permiso que la app puede usar en la plataforma actual, con su nombre, para qué
    sirve (info o tooltip), qué pasa si no se concede, su estado cuando se puede saber, y un acceso directo que
    abre el panel exacto de los ajustes del sistema.
- Todos los permisos son **opcionales**: la app funciona sin ellos y ninguno se pide al abrirla.
- El inventario de permisos lo cierra el architect. Punto de partida:
  - macOS · **Gestión de apps**: para que el icono personalizado se vea en el Dock en las copias que Claude
    actualizó por su cuenta (HU-0020).
  - macOS · **Archivos y carpetas**: si la HU-0023 (Proyectos) lee carpetas de Escritorio, Documentos o Descargas.
  - macOS · **Cuenta de administrador**: «Descargar e instalar» escribe en `/Applications` (HU-0017). No es un
    interruptor, pero se informa.
  - Windows y Linux: hoy no piden permisos; la sección lo dice.
- Actualizar `docs/instancias.document.md` o el documento funcional que corresponda, README y CHANGELOG.

## Fuera de alcance

- Pedir o conceder permisos por la persona, o cambiar ajustes del sistema: solo se abre el panel.
- Ajustes nuevos fuera de apariencia y permisos (rutas, refresco, idioma…).
- Los permisos de la HU-0018 (pkexec en Linux) y de la HU-0021 (receptor de `claude://`) hasta que existan.

## Decisiones por defecto (★)

- ★ **D-1 · Página propia en el sidebar.** «Configuración» sustituye a «Apariencia» en el pie del sidebar y abre
  `#/configuracion`. *Alternativa:* un diálogo grande con pestañas.
- ★ **D-2 · Solo los permisos de la plataforma actual.** *Alternativa:* listar todos con su plataforma.
- ★ **D-3 · Estado cuando se puede saber.** «Gestión de apps» se marca «Lo necesita» si alguna instancia tiene
  `systemIssue: appManagement`, y «Sin uso todavía» si no; donde el sistema no deja consultarlo, «No se puede
  comprobar» y el acceso directo. Nunca se fuerza un aviso del sistema para averiguarlo. *Alternativa:* no
  mostrar estado, solo la explicación y el acceso directo.
- ★ **D-4 · El aviso de «Gestión de apps» del editor de la instancia** se queda y enlaza a Configuración ›
  Permisos. *Alternativa:* quitarlo del editor.

## Criterios de aceptación

### AC-01 · Maqueta aprobada antes de construir

Existe `diseno/maqueta.html` con la página en sus dos secciones, en oscuro y claro, a 1440×920 y 980×680, con el
sidebar desplegado y plegado, en macOS y en Windows/Linux, y la persona la aprueba antes de implementar.

### AC-02 · Una sola configuración

Desde el sidebar se abre Configuración; el tema y el tamaño del texto cambian como hoy y se conservan al reabrir.
El diálogo de Apariencia ya no existe.

### AC-03 · Permisos explicados

Cada permiso muestra su nombre, para qué lo usa la app y qué deja de funcionar sin él, en un info o tooltip
accesible con teclado.

### AC-04 · Acceso directo

El acceso directo de cada permiso abre el panel exacto de los ajustes del sistema; si no hay panel (cuenta de
administrador), no se muestra botón.

### AC-05 · Opcionales y sin sorpresas

La app abre y funciona sin ningún permiso concedido; entrar en Configuración no dispara ningún aviso del sistema.

## Reglas de negocio afectadas

- Ninguna regla escrita cambia. Respeta «sin permisos invasivos»: la vista no pide permisos, solo explica y
  enlaza.
- Privacidad: el estado de los permisos sale de metadatos que la app ya tiene (registro de instancias); no se lee
  nada de los perfiles.

## Para la persona usuaria

1. **D-1**: página en el sidebar o diálogo con pestañas.
2. **D-3**: mostrar estado o solo explicación y acceso directo.

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
- [ ] Commits en cada repo tocado con `HU: HU-0022`. **Sin push, sin publicar, sin desplegar**
- [ ] Lo que solo comprueba una persona, declarado como pendiente humano
