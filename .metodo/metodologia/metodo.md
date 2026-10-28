# El método

> Estado: versión 4 (borrador), 2026-10-24.

Cómo se pasa de una petición a un commit. Todo lo que aquí depende de un dial lo dice.

## 1. Principios

1. **Quien implementa no firma que funciona, y quien verifica no corrige lo que encuentra.**
2. **Decide una persona; los agentes ayudan.** QA y revisión técnica informan; el veredicto es humano.
3. **El estado vive en archivos, no en la conversación.** La carpeta de la historia y su bitácora
   dicen dónde está cada cosa.
4. **Cada implementador arranca con contexto escrito**: un brief del arquitecto o, sin arquitecto, el
   plan en la historia. Un agente sin contexto lee carpetas, y eso es lo que hace lento cada paso.
5. **Lo visual se dibuja y se aprueba antes de construirse.**
6. **Los prompts orientan; los scripts impiden.** Y los scripts leen la config.
7. **Cada rol usa el modelo que su trabajo pide.**
8. **La entrega termina en el commit.** Lo que sale de la máquina lo autoriza la persona, cada vez.
9. **Se dice con precisión qué existe**: maqueta, código, pruebas, revisión, prueba humana.
10. **La ceremonia es proporcional al proyecto.** Si un dial está apagado, no se pide lo que exige.
11. **Nada de configuración en el código, nada de producción al alcance de un agente.** Las dos únicas
    reglas fijas.

## 2. Los caminos

El orquestador clasifica la petición antes de despachar. **Ante duda, historia.**

| Camino | Cuándo | Qué deja | Comando |
| --- | --- | --- | --- |
| **Vía directa** | Defecto, ajuste visual, texto, refactor sin comportamiento nuevo | Commit + la prueba que lo habría detectado | `/fix` |
| **Historia** | Cambia una pantalla, un endpoint, un dato guardado, un evento, un permiso o una regla de negocio | `hu/HU-####-<slug>/` | `/hu-new`, `/hu-work`, `/hu-close` |
| **Cambio de alcance** | Lo pedido no está en el alcance | Depende del dial `alcance` | lo lleva el orquestador |

### El cambio de alcance, según el dial

| `alcance` | Qué pasa |
| --- | --- |
| `off` | No existe este camino. Lo pedido es una historia más |
| `lista-viva` | Se añade el ítem al alcance con la historia que lo cubre; la bitácora de la historia cita la petición. Sin acta |
| `sellado` | Acta numerada con la petición y la autorización literales; `alcance.mjs aplicar <acta>` inserta los ítems ([plantillas/docs/acta-alcance.md](plantillas/docs/acta-alcance.md)) |

### Vía directa

Reproducir → localizar la causa → corregir en la capa mínima con el rol dueño → añadir la prueba que
lo habría detectado → mismas comprobaciones → commit. Una pantalla rediseñada lleva maqueta aunque vaya
por vía directa. Si resulta que el comportamiento correcto nunca se definió, se abre historia.

## 3. Las fases y los estados

```text
requisitos → arquitectura → diseno → implementacion → verificacion → cierre
```

Cada fase existe solo si su rol está activo:

| Fase | Quién | Existe si |
| --- | --- | --- |
| `requisitos` | `product-owner`; si no está, el orquestador | siempre |
| `arquitectura` | `explorador` (n en paralelo) → `data` → `architect` | `architect` activo |
| `diseno` | `product-design` → la persona aprueba | la historia toca interfaz y `diseno` no es `off` |
| `implementacion` | `backend` y luego `frontend`, o `fullstack` | siempre |
| `verificacion` | el orquestador prepara, `qa` si se llama, la persona decide | siempre |
| `cierre` | `product-owner` (o el orquestador): casillas, reglas de negocio, documentación | siempre |

Un perfil S recorre `requisitos → diseno → implementacion → verificacion → cierre`, y su historia
cabe en un archivo.

| Estado | Significado |
| --- | --- |
| `en-espera` | Falta una decisión de la persona (una historia nace `en-proceso`) |
| `en-proceso` | Recorre las fases |
| `terminada` | La Definición de Terminado tiene evidencia |
| `descartada` | Se decidió no hacerla, o no sale a producción. Queda con su porqué |

`descartada` existe porque el cliente cambia de idea: una funcionalidad construida puede no salir
nunca. Se descarta con su motivo en la bitácora y, si quedó código, detrás de un feature flag apagado o
retirada en una historia aparte ([arquitectura](arquitectura.md#los-contratos-según-la-fase)).

**Fase y estado los avanza el script**, no el texto a mano:
`node .metodo/scripts/hu.mjs fase HU-0012 implementacion`. Actualiza el frontmatter, escribe la línea
en la bitácora y regenera el índice. En la v3, el `phase` se quedaba atrás y el índice mentía.

- **La fase dice lo que está en curso**: se avanza al empezar el paso, antes de despachar.
- **Solo deja pasar a la siguiente fase** (diseño se salta si la historia no toca interfaz) y
  comprueba lo que la fase destino exige: briefs y arquitectura antes de implementar, maqueta con
  contenido y su aprobación en la bitácora (en `fase-a-fase`), la fundación de diseño aprobada antes de
  diseñar, el veredicto antes del cierre. Un salto real va con `--forzar "<por qué>"`, que queda en la
  bitácora.

## 4. La carpeta de la historia

```text
hu/
  INDEX.md                         generado por hu.mjs: estado, fase, área, entrega, enlaces
  HU-0012-checkout/
    hu.md                          la historia: frontmatter, petición, criterios, ★, señales, DoD, cierre
    seguimiento.md                 la bitácora: una línea por evento, en orden
    arquitectura.md                análisis, preguntas, impacto, contrato, datos, variables, revisión
    analisis/                      lo que dejan los exploradores y el agente data
    briefs/                        backend.md · frontend.md · diseno.md · fullstack.md
    diseno/                        maqueta.html · vista.md · capturas/
    verificacion.md                comprobaciones, guía de prueba, veredicto
    qa/                            informe.md · capturas/   (si se llamó a /qa)
```

- Solo existe lo que la historia necesita: una historia de S tiene `hu.md` y `seguimiento.md`.
- **La bitácora** (`seguimiento.md`) responde «¿en qué va?» sin leer nada más: fecha, quién, qué
  (fase, despacho, SHA, aprobación con sus palabras, veredicto). Se añade al final, nunca se reescribe.
- **Los commits llevan `HU: HU-0012`** como trailer. Con eso, `git log --grep` y el grafo enlazan
  cualquier archivo con la historia que lo tocó.
- Con `grafo: graphify`, el grafo indexa también `hu/` y `docs/`: «¿qué historia cambió este
  endpoint?» tiene respuesta.

Las secciones de `hu.md`, en orden ([plantilla](plantillas/docs/hu.md)):

| Sección | Quién |
| --- | --- |
| Historia · Petición original · Problema · Alcance · Fuera de alcance | `product-owner` |
| Decisiones por defecto (★) | `product-owner`, `architect` |
| Criterios de aceptación (`AC-n`) · Cobertura del alcance (si hay alcance) | `product-owner` |
| Señales (si `observabilidad` no es `off`) | `product-owner` propone, `architect` concreta |
| Reglas de negocio afectadas (`RN-n`) | `product-owner` |
| Para la persona usuaria | `product-owner` |
| Plan (solo sin `architect`) | el implementador, antes de tocar código |
| Definición de Preparado · Definición de Terminado | `product-owner` |
| Cierre | `product-owner` |

## 4b. El tamaño de una historia

**Una historia es corta.** Cuanto más grande, más contexto necesita cada agente, más se equivoca, más
tarda la revisión y más larga es la prueba humana. Un proyecto se partió primero en 9 historias y hubo que
dividirlas en 25: la v4 corta desde el principio.

**La medida**: una historia se implementa en uno o dos días y la persona la prueba en una sesión corta
(su guía de prueba cabe en unos 15 minutos). En números:

| Señal de que es grande | Límite |
| --- | --- |
| Criterios de aceptación | **más de 6** (`historias.maxCriterios`, el gate avisa) |
| Pantallas | más de una pantalla nueva con su flujo completo |
| Capas | servidor y dos apps a la vez |
| Reglas de negocio | más de 2 reglas nuevas o cambiadas |
| Brief | el arquitecto no la resume en un brief de 80 líneas por rol |
| Entregas | cubre ítems de más de una entrega |
| Título | lleva «y», «gestión de», «módulo de», «todo lo de» |

**Cómo se corta** (en este orden de preferencia):

1. **Por paso del flujo**: registrar → confirmar → notificar, cada uno una historia.
2. **Por operación**: crear, buscar, editar y dar de baja, por separado.
3. **Por rol**: lo que ve recepción, lo que ve el veterinario.
4. **Camino feliz primero**; los casos borde, errores y excepciones, en historias siguientes.
5. **Por variante**: un método de pago primero, el siguiente después.
6. **Lo mínimo usable primero**; filtros, exportar, ordenar, masivo, después.
7. **Lo que es solo pantalla** separado de lo que cambia una regla de negocio.

Cada parte tiene que dar algo que la persona pueda **probar abriendo la app**: no se corta por capas
(«el endpoint» y «la pantalla» no son historias, son pasos de una). La parte que depende de otra lo dice en
`depende`.

**Quién lo vigila**: el `product-owner` al proponer y al escribir (si pasa los límites, propone el corte en
lugar de escribirla), el `architect` en el análisis (si al estudiarla resulta grande, lo devuelve con la
propuesta de división antes de los briefs) y el gate, que avisa cuando hay más criterios de la cuenta.

## 5. Las reglas de negocio

La lógica de negocio no se escribe una vez al inicio: **cambia con cada historia**, y alguien tiene
que llevarla al día. Es el `product-owner` (o el orquestador en S).

- Viven en `docs/producto/reglas/<dominio>.md`, cada una con su id: `RN-12 · Un pedido no se cancela
  después de despacharse`. Plantilla: [plantillas/docs/reglas.md](plantillas/docs/reglas.md).
- La historia nombra las que toca en `## Reglas de negocio afectadas`, y al abrir dice si nace,
  cambia o se retira cada una.
- **Al cerrar**, el PO aplica el delta en el documento de reglas: nueva, modificada (con la versión
  anterior tachada y la historia que la cambió) o retirada. El gate de historias comprueba que una
  historia terminada con reglas afectadas tenga su delta aplicado.
- Así el documento de reglas es siempre la verdad de **cómo funciona hoy** la aplicación, y cada
  regla dice qué historia la cambió.

## 6. Los modos de trabajo

| `modo` | Qué cambia |
| --- | --- |
| `fase-a-fase` | Se espera la aprobación de cada maqueta y la prueba de cada historia antes de seguir |
| `construir-todo` | Se avanza sin esperar veredicto. Las ★ y las maquetas se toman con lo recomendado («aprobada por defecto» en la bitácora); la persona las revisa y prueba al final, y **cada historia se cierra con su veredicto** |
| `bloque` | La persona aprueba varias historias con una frase, que va literal en cada verificación con «sin la prueba paso a paso» |

En cualquier modo se pregunta **antes**: una dependencia nueva con alternativas reales, una
ambigüedad con dos productos distintos y, con `alcance: sellado`, un cambio de alcance. Todos dejan
escrito lo que **no** se verificó.

### Enfoque producto primero

Con `enfoque: producto` (la forma de trabajar de Steve Jobs: se parte de la experiencia del cliente y
la tecnología se construye para servirla):

1. **Fundación de diseño** ([diseno](diseno.md#la-fundación-de-diseño)).
2. **Prototipo de los flujos clave**, completo de punta a punta con datos verosímiles: pantallas
   estáticas enlazadas entre sí (`data-ir`), sin lógica ni el stack del proyecto. Lo aprueba la persona,
   y si se puede, el cliente lo recorre.
3. **El arquitecto deriva** contratos, datos y módulos **desde el prototipo**: cada pantalla dice qué
   datos necesita y qué acciones dispara. No se diseña un endpoint que ninguna pantalla pida.
4. Las historias de construcción salen del prototipo. `frontend` puede avanzar contra datos simulados
   con la forma del contrato mientras `backend` construye.

Con `enfoque: tecnico` se sigue el orden clásico: requisitos, arquitectura, diseño por historia.

## 7. El cierre y la entrega

Gates en orden, cada uno solo si su dial está activo: revisión técnica → prueba humana → `/qa` si se
llamó y sus hallazgos resueltos por la persona → reglas de negocio y documentación → el PO coteja las
casillas.

```text
verificar → reglas y documentación → validar historia → commit por repo
   ── fin de la implementación ──
→ push → publicar → desplegar → comprobar      (cada paso, autorizado por la persona)
```

- **La implementación termina en el commit.** Push, publicación y despliegue los autoriza la persona,
  cada vez; el despliegue lo acompaña `devops` si se le llama ([roles](roles.md#devops)).
- Se despliega primero la API, después las apps; si la API **quita** un campo, primero la app que lo
  leía.
- Antes de limpiar el contexto se vuelca a la bitácora lo que solo está en la conversación.
