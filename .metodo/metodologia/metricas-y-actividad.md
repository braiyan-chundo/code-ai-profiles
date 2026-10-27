# Métricas y actividad

> Estado: versión 4 (borrador), 2026-10-25.

Dos cosas distintas: **ver qué hace cada agente ahora** y **guardar cuánto costó cada historia** para
comparar después (y diseñar la v5 con datos, no con impresiones).

## 1. Ver qué hace cada agente

### Por qué a veces no se ve

La app muestra el progreso de un subagente mientras trabaja en primer plano. Dos cosas lo esconden:

- **Despachos en segundo plano**: un agente lanzado en segundo plano trabaja sin enseñar sus pasos; solo
  avisa al terminar. Por eso la v4 pide **despachar en primer plano** salvo que la persona pida lo
  contrario. Varios agentes en el mismo mensaje siguen corriendo a la vez, y se ven.
- **Subagentes dentro de subagentes**: los exploradores que lanza el arquitecto se ven dentro del
  arquitecto, no al lado.

### El registro de actividad

La guarda (`PreToolUse`) corre antes de cada herramienta de cada agente. Además de proteger, deja una
línea en `.metodo/actividad.log` (fuera de git): hora, agente, herramienta y qué toca (el archivo, o la
descripción del comando; nunca el comando entero, que podría llevar un dato sensible).

```bash
node .metodo/scripts/metodo.mjs actividad                     # lo último de cada agente y las últimas 25 acciones
node .metodo/scripts/metodo.mjs actividad --seguir            # en vivo, en una pestaña de terminal
node .metodo/scripts/metodo.mjs actividad --agente backend    # solo un agente
```

```text
Lo último de cada agente:
  orquestador    hace 0 min · Agent backend · Implementar HU-0012
  backend        hace 0 min · Edit vet-api/src/clientes/clientes.service.ts
  explorador     hace 3 min · Grep ClienteService
```

O, desde Claude, `/metodo actividad`.

## 2. Las métricas de cada historia

Al cerrar una historia (`hu.mjs estado <HU> terminada`, y también al descartarla), `metricas.mjs`
guarda `hu/HU-####-*/metricas.json`:

| Qué | De dónde sale | Precisión |
| --- | --- | --- |
| **Tiempo por fase** | Las líneas «fase X → Y» de la bitácora, que llevan fecha y hora | Exacto. Es tiempo de reloj: incluye la espera de la aprobación o de la prueba humana |
| **Tokens de cada agente**, por fase, con sus despachos, su modelo y su duración | Las transcripciones de Claude Code del proyecto (`~/.claude/projects/<carpeta>/<sesión>/subagents/`). Un despacho cuenta si su prompt nombra la historia | Exacto |
| **Tokens del orquestador**, por fase | Los mensajes de la sesión principal dentro de las ventanas de cada fase | Aproximado: si se trabajan dos historias a la vez, se reparten mal |

Los tokens se guardan por tipo: entrada, salida, escritura de caché y lectura de caché (el costo de cada
uno es distinto).

```bash
node .metodo/scripts/metricas.mjs hu HU-0012     # recalcular una historia
node .metodo/scripts/metricas.mjs resumen        # docs/operaciones/metricas.md: todas, por rol y por fase
```

El resumen responde preguntas para la v5: ¿qué rol gasta más por despacho? ¿qué fase tarda más? ¿cuánto
cuesta una historia de M frente a una de L? ¿cuánto pesa la espera humana?

Lo que no mide: el tiempo de la persona fuera de Claude (lo que tarda en probar se ve como tiempo de la
fase de verificación) ni las sesiones abiertas en otra carpeta que no sea la raíz del proyecto.
