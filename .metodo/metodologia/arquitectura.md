# La arquitectura

> Estado: versión 4 (borrador), 2026-10-24.

Cómo trabaja `architect`: de los análisis a los briefs, el grafo, los datos y los contratos. Existe si
`architect` está en `agentes`.

## 1. Sintetiza, no explora

```text
orquestador → architect ─┬─ explorador: servidor ─┐
                         ├─ explorador: apps ─────┤
                         ├─ explorador: datos ────┼─→ hu/…/analisis/*.md ─→ architect sintetiza
                         └─ data (si agente) ─────┘
```

`architect` lanza los exploradores (en un solo mensaje, para que corran a la vez), lee la historia y los
análisis, y decide. Si un análisis no responde algo, lanza **un** explorador más con una pregunta
concreta; no se pone a recorrer carpetas con el modelo grande.

## 2. Dos pasos, con preguntas

Con `arquitectura: dos-pasos`:

**Paso 1 · Análisis** (`arquitectura.md`, primera mitad):

```markdown
## Análisis
Confianza: alta | media | baja — por qué.

### Supuestos
- S-1 · Los pedidos sin pagar no reservan stock. (Si no es así, cambia el modelo de datos.)

### Preguntas
1. ¿Un proveedor puede tener varias direcciones de despacho? Recomiendo: sí, porque … 
2. …

### Impacto
Por símbolo cambiado, desde el grafo o `rg`: quién lo consume, qué se rompe.
```

El orquestador lleva las preguntas a la persona. Las respuestas, literales, van a la bitácora.

**Paso 2 · Solución y briefs**, solo después de las respuestas.

Si la confianza es alta y no hay preguntas, los dos pasos van seguidos. Con `arquitectura: ligera`,
el análisis cabe en unas líneas y los briefs van en el mismo despacho.

Por qué: el arquitecto no es infalible. Un supuesto equivocado en el modelo de datos cuesta toda la
historia; una pregunta cuesta un mensaje.

## 3. El brief

Uno por rol que interviene (`briefs/backend.md`, `frontend.md`, `diseno.md`, `fullstack.md`), **80
líneas como máximo**. Plantilla: [plantillas/docs/brief.md](plantillas/docs/brief.md).

```markdown
# Brief · HU-#### · <rol>
Criterios: AC-01, AC-03. Modelo: sonnet | opus (y por qué).

## Archivos            (rutas comprobadas con ls o el grafo)
## Contrato            (sección de arquitectura.md, o la etiqueta)
## Pasos
## Variables de entorno nuevas
| Nombre | [SECRET]/[PUBLICO] | Apps | Para qué |
## Señales             (si observabilidad: qué log, métrica o traza deja)
## Pruebas             (cuáles añadir; se corren solo las relacionadas)
## Si dudas            (qué consultar en el grafo: «graphify explain "OrderService"»)
## No toques
## Skills              (por nombre, del pack)
```

- **Cada ruta, comprobada.** Una ruta inventada cuesta más que no darla.
- **Las variables de entorno se declaran aquí**, para que nadie las improvise con un valor fijo.
- El de `product-design` dice qué datos llegan a la pantalla, ni uno más.

## 4. El grafo

Con `grafo: graphify`, [graphify](https://github.com/Graphify-Labs/graphify) convierte el código y el
gobierno en un grafo consultable. En proyectos grandes es lo que evita que cada agente relea carpetas.

| Quién | Cuándo |
| --- | --- |
| `architect` | **Siempre**: impacto por símbolo, consumidores, acoplamiento no declarado |
| `explorador` | Primero el grafo, después `rg` para confirmar |
| `backend`, `frontend`, `fullstack` | Cuando el brief no alcanza o dudan de cómo funciona algo |
| `qa`, `product-owner` | «¿Qué historia tocó esto?» (el grafo indexa `hu/` y `docs/`) |

Reglas:

- Se pregunta **por nombre de símbolo**, no con frases: una frase devuelve cientos de nodos.
- Es un **límite superior**: que un archivo aparezca no prueba que se rompa; que no aparezca es señal
  fuerte de que no lo toca.
- Para eventos, además `rg` por el literal del tipo: un consumidor que compara el texto no aparece.
- Se mantiene **incremental**: `graphify --update` tras cada commit (o `--watch` mientras se
  trabaja), no una reconstrucción completa cada vez. Si se usa como servidor MCP (`--mcp`), todos los
  agentes lo consultan como herramienta.
- `grafo.mjs check` mide cobertura por repo; `--al-dia` se exige antes de la revisión técnica.

Sin grafo, el impacto se escribe desde `rg` por cada símbolo cambiado.

## 5. Los datos

- **La skill del motor** existe siempre ([packs](packs.md#las-skills-por-motor)). `architect` la carga
  si toca esquema, consulta o migración; `backend`, al implementarlo.
- **El agente `data`** (con `datos: agente`) deja `analisis/datos.md` antes de la síntesis: esquema,
  índices para cada consulta nueva, plan de migración con vuelta atrás, volumen esperado, riesgos de
  concurrencia. `architect` lo incorpora o lo discute; no lo reescribe.
- Con `fase: produccion`, toda migración sobre datos existentes lleva plan, respaldo y la aprobación
  de la persona, y se prueba antes sobre una copia anonimizada.

## 6. Los contratos según la fase

Un contrato es un **acuerdo entre capas**, no un texto sagrado. Hacemos software para un cliente que no
es técnico y que cambia de idea; una funcionalidad puede no llegar nunca a producción.

| `contratos` | En desarrollo | En producción |
| --- | --- | --- |
| `flexibles` | Se cambia con una nota en `arquitectura.md` | Igual (el validador avisa) |
| `estrictos-en-produccion` | Versión **0.x**: se cambia con una nota, sin acta ni major | Compatibilidad hacia atrás; quitar o cambiar es major; deprecación antes de retirar |
| `estrictos` | Compatibilidad desde el primer día | Ídem |

Reglas en cualquier valor:

- **El cambio pedido por el cliente se evalúa, no se rechaza**: qué rompe, a quién, cuánto cuesta. Se
  presenta a la persona con la recomendación.
- **Lo que quizá no salga a producción va detrás de un feature flag** (en la config, como variable
  de entorno o tabla de flags), sin tocar el contrato estable. Si se descarta, se retira el flag y el
  código en una historia aparte, y la historia original queda `descartada`.
- Lo que el servidor deja, el cliente lo recibe **literal**: el orquestador no parafrasea esquemas.
- Con `paqueteDeContratos` y `gates.contratos` activo, `contracts.mjs` comprueba versiones y
  consumidores.

## 7. La revisión técnica

Con `revisionTecnica: riesgo` (o `siempre`), `architect` revisa **después de implementar y antes de la
prueba humana**. En una pasada; en dos tiempos (servidor, pantallas) si `dosTiempos`.

| Riesgosa si toca | Por qué |
| --- | --- |
| Dinero | Ninguna pantalla lo ve hasta la liquidación |
| La máquina de estados | Un estado sin todas sus transiciones rompe flujos lejanos |
| Permisos o sesión | Falla en silencio para quien no debía ver |
| Migración sobre datos existentes | Se ejecuta una vez sobre lo real |
| Datos personales | La fuga está en el JSON crudo, no en la pantalla |
| Un contrato en producción | Cambiar o quitar rompe a quien ya lo usa |

Hallazgos **B-n** (bloquean: vuelven a implementación) y **O-n** (observación: commit corto o deuda
escrita), cada uno con responsable. **Quien implementa corrige; quien revisa no.** La revisión **no
corre pruebas**: lee el registro de `pruebas.mjs` del SHA revisado.

## 8. El modelo que recomienda

| `opus` si toca | `sonnet` si |
| --- | --- |
| dinero o máquina de estados | está bien especificada y es pequeña |
| permisos o sesión | solo añade a un contrato |
| migración sobre datos reales | no cruza repos más allá de una etiqueta |
| un contrato en producción | |
| datos personales, concurrencia | |
