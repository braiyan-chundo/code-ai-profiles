# La configuración

> Estado: versión 4 (borrador), 2026-10-24.

Todo lo que cambia de un proyecto a otro vive en **`.metodo/config.json`**. Los agentes, los comandos,
los hooks y los scripts lo leen. Ninguna regla de la metodología se escribe fija: cada una dice «si el
dial X vale Y». Así un «no» se cumple de verdad.

Por qué: en la v3 el principio «lo que no está en el anexo no existe» y la oferta de acta en `/hu-new`
estaban en prosa. Aunque la persona dijera «sin alcance», el texto que leían los agentes decía lo
contrario, y seguían pidiendo actas.

Plantilla: [plantillas/config/config.json](plantillas/config/config.json). Diales y perfiles:
[plantillas/config/perfiles.json](plantillas/config/perfiles.json).

## Las partes del archivo

| Clave | Qué guarda | Quién la decide |
| --- | --- | --- |
| `proyecto` | Nombre, slug, resumen, idiomas | Quien aprueba confirma el resumen |
| `figuras` | Quién aprueba, quién decide el método, quién autoriza salidas, el cliente, el canal | La persona |
| `perfil` | `S`, `M` o `L` | Quien decide el método |
| `fase` | `desarrollo` o `produccion` ([entornos](entornos.md)) | Quien decide el método |
| `ajustes` | Los diales que se apartan del perfil | Quien decide el método |
| `agentes` | Por rol: `nombre`, `color`, `modelo` | Quien decide el método |
| `rasgos` | Lo que el producto tiene: interfaz, varias apps, dinero, datos personales, tiempo real, colas, sin conexión, lienzo, paquete de contratos | Sale del resumen |
| `repos` | Nombre, ruta (`.` en un solo repo; una carpeta dentro de otro repo en un monorepo), tipo (`api`, `worker`, `app`, `paquete`, `fullstack`, `otro`), puertos | Claude propone, quien decide confirma |
| `stack` | Gestor de paquetes, motor de base, packs, comandos por repo | Quien decide el método |
| `alcance` | Archivo, nombre, contrato, cláusula, entregas, áreas | Solo si el dial `alcance` no es `off` |
| `historias` | `maxCriterios`: cuántos criterios caben en una historia corta (por defecto 6; el gate avisa si pasa) | Quien decide el método |
| `codigo` | Política de enlaces, módulos de configuración (`modulos`) y excepciones del gate | Quien decide el método |
| `gatesPropios` | Gates del proyecto que corre el fin de turno: `[{ "nombre", "comando", "cuando": "codigo\|gobierno\|siempre", "nivel": "aviso\|bloqueo" }]` | Quien decide el método |
| `territorios` | Rutas que suma cada rol a su territorio por defecto (`{ "backend": ["server/**"] }`); imprescindible en un solo repo con varias capas | Quien decide el método |

## La configuración efectiva

Lo que rige en cada momento se calcula siempre igual:

```text
perfil (perfiles.json)  →  ajustes (config.json)  →  mínimos de la fase  →  configuración efectiva
```

- Un **ajuste** reemplaza el valor del perfil. En objetos (`pruebas`, `gates`) reemplaza solo el campo
  que nombra.
- La **fase** solo sube mínimos: en `produccion`, `revisionTecnica` no baja de `riesgo` ni
  `observabilidad` de `basica`. Nunca baja nada.
- `node .metodo/scripts/metodo.mjs efectivo` imprime el resultado y marca de dónde sale cada valor
  (perfil, ajuste o fase).

```json
{ "perfil": "L", "fase": "desarrollo", "ajustes": { "alcance": "off", "gates": { "alcance": "off" } } }
```

Es un L completo sin alcance. Lo que se aparta del perfil queda a la vista en `ajustes`.

## Los diales

| Dial | Valores | Qué cambia |
| --- | --- | --- |
| `propuesta` | `no` · `si` | Si se prepara una [propuesta al cliente](propuesta.md) antes de construir |
| `enfoque` | `tecnico` · `producto` | `producto`: experiencia aprobada primero, tecnología derivada de ella ([metodo](metodo.md#enfoque-producto-primero)) |
| `modo` | `fase-a-fase` · `construir-todo` · `bloque` | Cuándo se espera la aprobación ([metodo](metodo.md#los-modos-de-trabajo)) |
| `alcance` | `off` · `lista-viva` · `sellado` | Ver abajo |
| `agentes` | lista de roles | Quién existe en `.claude/agents/` ([roles](roles.md)) |
| `diseno` | `off` · `por-hu` · `sistema` | `sistema`: fundación de diseño antes de la primera maqueta ([diseno](diseno.md)) |
| `herramientaDiseno` | `claude-design` · `html-local` | Dónde se construyen sistema y maquetas |
| `arquitectura` | `ligera` · `dos-pasos` | `dos-pasos`: análisis con preguntas; briefs después de las respuestas |
| `exploradores` | `0`–`4` | Exploradores de solo lectura en paralelo antes del arquitecto |
| `datos` | `skill` · `agente` | La skill del motor siempre; `agente` suma el rol `data` |
| `revisionTecnica` | `off` · `riesgo` · `siempre` | Revisión del arquitecto tras implementar |
| `dosTiempos` | `false` · `true` | Revisión separada de servidor y pantallas |
| `qa` | `off` · `bajo-demanda` | `/qa` disponible, no bloqueante |
| `seguridad` | `off` · `bajo-demanda` · `riesgo` | `/seguridad` disponible; con `riesgo`, se ofrece en cada historia riesgosa y antes de producción ([roles](roles.md#seguridad)) |
| `contratos` | `flexibles` · `estrictos-en-produccion` · `estrictos` | Cuándo un contrato exige compatibilidad ([arquitectura](arquitectura.md#los-contratos-según-la-fase)) |
| `grafo` | `off` · `graphify` | Grafo del código y del gobierno ([arquitectura](arquitectura.md#el-grafo)) |
| `observabilidad` | `off` · `basica` · `completa` | Señales ODD en cada historia ([observabilidad](observabilidad.md)) |
| `pruebas.implementador` | `relacionadas` · `modulo` | Lo que corre quien implementa |
| `pruebas.suite` | `cierre-hu` · `cierre-lote` | Cuándo corre la suite completa, una sola vez |
| `pruebas.timeoutMin` | número | Minutos máximos de cualquier ejecución de pruebas |
| `gates.<gate>` | `off` · `aviso` · `bloqueo` | `historias`, `alcance`, `contratos`, `grafo` |
| `gates.territorio` | `off` · `bloqueo` | La guarda impide que un agente escriba fuera de su territorio |

### El alcance, con y sin actas

| Valor | Qué existe | Cómo cambia | Qué comprueba el gate |
| --- | --- | --- | --- |
| `off` | Nada. Las historias nacen de lo que pide la persona | — | Nada. Nadie menciona alcance ni actas |
| `lista-viva` | `docs/producto/alcance.md`, editable | Se edita; la historia que lo cambia lo anota en su bitácora | Que cada ítem tenga una historia (aviso) |
| `sellado` | El alcance sellado y sus actas | Solo por acta, con `alcance.mjs aplicar` | Que nada venga de fuera del sellado o de un acta |

### Lo que no es dial

Dos reglas aplican en **todos** los perfiles y no se apagan:

| Regla | Documento |
| --- | --- |
| Ninguna clave, token, URL ni enlace escrito en el código | [configuracion-del-codigo](configuracion-del-codigo.md) |
| Ningún agente lee, usa ni apunta a producción | [entornos](entornos.md) |

## El validador

`node .metodo/scripts/metodo.mjs validar` revisa la combinación. **Avisa** de lo raro y **bloquea**
solo lo imposible.

| Combinación | Nivel | Por qué |
| --- | --- | --- |
| `fullstack` junto con `backend` o `frontend` | error | Dos roles con el mismo territorio |
| `revisionTecnica` distinto de `off` sin `architect` | error | Nadie puede revisar |
| `exploradores` > 0 sin `explorador` | error | No hay a quién lanzar |
| `datos: agente` sin `data` | error | El dial pide un rol que no existe |
| `qa: bajo-demanda` sin `qa` | error | Ídem |
| `enfoque: producto` con `diseno: off` | error | Producto primero es diseñar primero |
| Nombre de agente repetido entre roles activos, con mayúsculas o espacios | error | Claude Code exige minúsculas y guiones |
| Un nombre que repite el de una entrada inactiva | aviso | La guarda solo mira los roles activos, pero confunde |
| `backend` o `frontend` activo sin un repo de su capa ni `territorios` | error | No tendría dónde escribir |
| `diseno` distinto de `off` sin `product-design` | aviso | Diseñaría el orquestador |
| `diseno` distinto de `off` sin `rasgos.interfaz` | aviso | No hay pantallas |
| `backend` o `frontend` sin `architect` | aviso | Sin briefs: el implementador planifica en la historia (en S, con `fullstack`, es lo normal y no avisa) |
| `gates.alcance` distinto de `off` con `alcance: off` | aviso | Se ignora |
| `dosTiempos: true` con `revisionTecnica: off` | aviso | Sin efecto |
| `fase: produccion` con `contratos: flexibles` | aviso | Se puede romper a quien ya usa la app |
| Más de dos repos con `grafo: off` | aviso | El impacto entre repos se hace con `rg` |
| Un repo en la raíz con `backend` y `frontend` sin `territorios` | aviso | Los dos podrían escribir todo el repo |

## Después de cambiar la config

```bash
node .metodo/scripts/metodo.mjs validar     # la combinación tiene sentido
node .metodo/scripts/metodo.mjs generar     # regenera agentes, comandos, hooks, settings y AGENTS.md
```

`generar` **nunca reescribe** `hu/`, `docs/`, `.metodo/reglas/` ni `.env*`: solo **crea lo que falta**
para los diales activos (los documentos base, el `.env.example` de un repo nuevo, su pre-commit). Lo que
regenera (agentes, comandos, hooks, settings, `AGENTS.md`, `.metodo/gates.config.json`) lleva en la
cabecera «generado: no editar»; las reglas propias de cada rol van en `.metodo/reglas/<rol>.md`, y el
generador las incluye en su agente.

Otras claves: `alcance.coberturaCompleta` (true cuando ya hay historias para todo el alcance: con
`gates.alcance: bloqueo` el gate pasa a exigir cobertura completa) y `primerNumero` (el primer número de
historia, por defecto 1).

Cambiar de perfil o de fase no se hace editando a mano: tiene su comando ([perfiles](perfiles.md)).
