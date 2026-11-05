---
id: HU-0029
titulo: "Carpeta de datos de la original elegida por la persona"
estado: en-proceso
fase: arquitectura
area: sesiones
entrega: 1
prioridad: alta
creada: 2026-11-05
requiere: { arquitectura: true, diseno: true }
repos: [code-ai-profiles]
riesgo: [contrato, estados, datos-personales]
reglas: [RN-07]
depende: []
---

# Carpeta de datos de la original elegida por la persona

Como persona que usa Claude con sus datos fuera de la carpeta habitual
quiero que la app me pida la carpeta de datos de Claude cuando no encuentra sus sesiones
para ver y transferir mis sesiones de Code sin que la app tenga que adivinar dónde están.

## Petición original

> «que al detectar el claude original pregunte en que carpeta estan las sesiones, asi, si el usuario no las guarda en
> las de pordefecto entonces el sistema puede usar la ruta que le entrega el usuario creo que es mejor para no estar
> adivinando» — Braiyan Rodriguez (mantenedor), 2026-11-03

> «yo creo que lo mejor es que sigamos por la linea de que si no detecta las sesionse del claude donde deberian ir en
> windows (Segun doc) que le pregunte al usuario donde esta su instalacion de claude o su carpeta de perfil no? y
> ya,porfa haz eso» — Braiyan Rodriguez (mantenedor), 2026-11-05

Elecciones del mantenedor: «Solo si no la encuentra» (preguntar solo cuando la app no encuentra las sesiones) y
«Todas» (las tres plataformas). Va en la rama `fix-ventanas-consola-windows`, en el mismo PR que el arreglo de las
ventanas de consola de Windows («todo en la misma rama porfa»).

## Problema

La app busca la carpeta de datos de la original en rutas fijas (`detect_original_profile()` en
`src-tauri/src/platform/{macos,windows,linux}.rs`) y lee sus sesiones de `<carpeta>/claude-code-sessions/`
(`read_code_sessions`, `src-tauri/src/sessions/mod.rs`). En un Windows real (Claude MSIX 4.16336) la carpeta
virtualizada del paquete existe pero está vacía y no hay `claude-code-sessions` en ninguna ruta conocida: la página de
la original muestra 0 sesiones aunque la persona tiene sesiones de Code. Hoy no hay forma de decirle a la app dónde
están los datos.

La carpeta de la original se usa en cuatro sitios: leer sus sesiones (`scan.rs`), su estado (`processes.rs`: sin
carpeta es «No detectada»), la lista de exclusión de Proyectos (`projects.rs`) y las transferencias
(`sessions/transfer.rs`).

## Alcance

- La página de la original avisa cuando no encuentra las sesiones y deja elegir la carpeta de datos de Claude con el
  selector nativo de carpetas.
- La carpeta elegida se recuerda y se usa en los cuatro sitios en lugar de la detectada.
- Se puede cambiar o volver a la detectada en cualquier momento.
- macOS, Windows y Linux.

## Fuera de alcance

- Elegir a mano el ejecutable o la instalación de Claude: la instalación ya se detecta en las tres plataformas (★ D-8).
- Buscar la carpeta por todo el disco o adivinar rutas nuevas.
- Cambiar la carpeta de datos de las instancias: cada una conserva la suya.
- Leer el contenido de las sesiones más allá de los metadatos que ya se leen hoy.

## Decisiones por defecto (★)

- ★ **D-1 · Se pregunta solo si no la encuentra.** El aviso aparece cuando no hay carpeta detectada o la detectada no
  tiene `claude-code-sessions`. Con sesiones en la carpeta habitual la página se ve como hoy. *Por qué:* elección del
  mantenedor. *Alternativa:* mostrar siempre el selector.
- ★ **D-2 · Se acepta solo una carpeta con sesiones de Code.** La carpeta elegida debe contener `claude-code-sessions`.
  Si la persona elige la propia `claude-code-sessions`, se usa la carpeta que la contiene. Cualquier otra se rechaza con
  un mensaje que dice qué falta, y no se guarda nada. Solo se comprueba que la carpeta existe: no se abre ningún
  archivo. *Por qué:* no adivinar; una carpeta sin sesiones no arregla nada. *Alternativa:* aceptar cualquier carpeta.
- ★ **D-3 · La elegida se usa para todo lo de la original:** sesiones, transferencias, estado y exclusión de Proyectos.
  Se guarda solo la ruta, en los datos de la app (`original-profile.json`). *Alternativa:* usarla solo para leer.
- ★ **D-4 · Carpetas prohibidas:** la carpeta de datos de la app (donde viven las instancias) y cualquier carpeta dentro
  de ella, y los enlaces simbólicos. *Por qué:* mezclaría una instancia con la original. *Alternativa:* permitirlas.
- ★ **D-5 · Si la elegida desaparece,** la app vuelve a la detectada y el aviso lo dice («La carpeta elegida ya no
  existe»). La ruta guardada se conserva hasta que la persona elija otra o vuelva a la detectada. *Alternativa:* borrarla.
- ★ **D-6 · Cambiar y volver.** Con una carpeta elegida, la página la muestra con «Cambiar carpeta» y «Usar la
  detectada». *Alternativa:* cambiarla solo desde el aviso.
- ★ **D-7 · El selector es el nativo que ya usa Proyectos** (`tauri-plugin-dialog`): sin dependencias ni permisos
  nuevos.
- ★ **D-8 · Solo la carpeta de datos, no la instalación.** La petición dice «instalacion de claude o su carpeta de
  perfil»; la instalación ya se detecta y lo que falla son las sesiones. *Alternativa:* añadir también elegir el
  ejecutable, en otra historia.

## Criterios de aceptación

### AC-01 · Aviso solo cuando no encuentra las sesiones

Sin carpeta detectada, o con una detectada sin `claude-code-sessions`, la página de la original muestra un aviso que
dice que no encontró las sesiones de Claude en la carpeta habitual y un botón «Elegir carpeta». «Perfil local» dice
«Sin sesiones» o «Sin detectar». Con las sesiones en la carpeta habitual (por ejemplo, macOS con
`~/Library/Application Support/Claude`) la página se ve como hoy, sin aviso.

### AC-02 · Elegir una carpeta válida

Al elegir una carpeta con `claude-code-sessions`, o la propia `claude-code-sessions` (se usa la que la contiene), sus
sesiones de Code aparecen en la página, «Perfil local» dice «Elegido», la ruta se ve en la página y el aviso
desaparece. Al cerrar y abrir la app sigue igual.

### AC-03 · Carpeta rechazada

Una carpeta sin `claude-code-sessions`, la de los datos de la app o una dentro de ella se rechaza con un mensaje que
dice por qué. La página queda como estaba.

### AC-04 · Cambiar y volver a la detectada

«Cambiar carpeta» abre el selector otra vez. «Usar la detectada» olvida la elegida y la página vuelve a la carpeta
detectada (con el aviso, si en esa no hay sesiones).

### AC-05 · Transferir y Proyectos

Transferir una sesión a la original o desde ella usa la carpeta elegida. Proyectos no lista ni lee la carpeta elegida.

### AC-06 · La elegida desaparece

Si la carpeta elegida se borra o se renombra, la página vuelve a la detectada y el aviso dice que la carpeta elegida ya
no existe.

## Reglas de negocio afectadas

| Regla | Qué pasa | Texto |
| --- | --- | --- |
| RN-07 | nace | La carpeta de datos de la original es la detectada, salvo que la persona elija otra con `claude-code-sessions`. La elegida se usa para sesiones, transferencias, estado y exclusión de Proyectos; solo se guarda su ruta. |

## Para la persona usuaria

1. ★ D-2: solo se aceptan carpetas que ya tienen `claude-code-sessions`.
2. ★ D-8: no se elige el ejecutable, solo la carpeta de datos.
3. ★ D-1: el aviso solo sale cuando no hay sesiones.

**Pendiente humano:** en el Windows real, comprobar si existe alguna carpeta con `claude-code-sessions`. Si esa versión
de Claude no la crea, el selector la rechazará, y habrá que averiguar en otra historia dónde guarda esa versión sus
sesiones.

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
- [ ] Commits en cada repo tocado con `HU: HU-0029`. **Sin push, sin publicar, sin desplegar**
- [ ] Lo que solo comprueba una persona, declarado como pendiente humano

## Cierre

Fecha, quién cerró y sobre qué veredicto.

SHA por repositorio, con una línea de qué hace cada uno:

★ aceptadas tal como estaban:

Pendientes humanos (nadie los vio; no se dan por hechos):

Deuda declarada:
