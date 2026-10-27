# La verificación

> Estado: versión 4 (borrador), 2026-10-24.

Cómo se comprueba una historia sin quemar tiempo ni tokens: pruebas por alcance, la suite una vez, la
prueba humana, QA si se pide y la revisión técnica si toca.

## 1. Por qué cambió

En la v3 la misma suite corría varias veces por historia: `frontend` corría la suite entera en cada
app, el orquestador la volvía a correr sobre los SHA finales, la revisión técnica corría pruebas otra
vez, y cada cambio pedido repetía todo «desde el paso 1». Sin tiempo máximo, una ejecución colgada
dejaba a la persona preguntando «¿por qué tarda tanto?» mientras el contexto se llenaba de líneas en
verde. Eso era lentitud y gasto de tokens, no calidad.

## 2. Quién corre qué

| Quién | Qué | Cuándo |
| --- | --- | --- |
| `backend`, `frontend`, `fullstack` | Tipos + **pruebas relacionadas** con los archivos que tocó | Antes de entregar |
| El orquestador | **La suite completa, una vez**, más build y gates | Al verificar (`pruebas.suite: cierre-hu`) o al cerrar un lote (`cierre-lote`) |
| `architect` (revisión) | **Nada**: lee el registro del SHA revisado | — |
| `product-owner` (cierre) | **Nada**: coteja `verificacion.md` | — |
| `qa` | La guía de prueba en el navegador; no corre la suite | Solo si se llama con `/qa` |

## 3. `pruebas.mjs`

Todas las ejecuciones pasan por [el script](plantillas/scripts/pruebas.mjs), que lee los comandos de
cada repo en `config.json → stack.comandos`.

```bash
node .metodo/scripts/pruebas.mjs relacionadas <repo> <archivo>...   # lo que corre quien implementa
node .metodo/scripts/pruebas.mjs suite <repo>                       # lo que corre el orquestador
node .metodo/scripts/pruebas.mjs estado                              # qué SHA está en verde, por repo
```

Lo que garantiza:

| Garantía | Cómo |
| --- | --- |
| **Tiempo máximo** | `pruebas.timeoutMin` de la config. Al vencer, mata el proceso y su grupo y lo dice: «cortado a los 10 min en 128/153» |
| **Avance visible** | Escribe la salida completa en `.metodo/pruebas/ultima-<repo>.log` y cada 30 s imprime una línea de avance |
| **Silencio en verde** | Al contexto llega una línea («153/153 en 2 min 10 s»); en rojo, solo los fallos y las últimas líneas útiles |
| **Un SHA en verde no se repite** | Guarda `.metodo/pruebas/<repo>-<sha>-suite.json`. Si el árbol está limpio y ese SHA ya pasó, responde «ya en verde en <sha>» sin ejecutar |
| **Sin pasada doble por cambio** | Tras un cambio pedido, el implementador corre lo relacionado y el orquestador la suite una vez sobre el SHA nuevo |

Lo que lanza un agente en segundo plano (servidores, navegadores sin interfaz para capturas) lleva
tiempo máximo con `node .metodo/scripts/limite.mjs <segundos> <comando>` (macOS no trae `timeout`), y
se comprueba con `ps` antes de entregar.

## 4. Lo que hace el orquestador al verificar

1. **Suite, build y gates** en los repos tocados, con `pruebas.mjs suite` (se salta lo ya en verde).
   Si comparte colas con el worker de desarrollo, lo para antes y lo reinicia después.
2. **Recompila las apps** y las sirve en sus puertos de prueba.
3. **Fidelidad visual**, si toca interfaz: la pantalla al lado de la maqueta, en los tamaños y temas
   de la historia.
4. **Tiempo real**, si lo hay: dos clientes abiertos a la vez.
5. **Escribe `verificacion.md`** con la guía ([plantilla](plantillas/docs/verificacion.md)).
6. **Se la entrega a la persona** y, según el modo, espera o sigue.

**Cuentas**: las del seed de desarrollo ([entornos](entornos.md#credenciales-de-prueba-sin-fricción)),
nunca las personales.

## 5. La guía de prueba

- Un paso por criterio como mínimo, numerados, con el criterio en negrita.
- Pasos exactos: qué pulsar, qué escribir (valores literales), qué debe verse.
- Con qué cuenta del seed.
- Los rechazos (lo que no debe aceptar) y la regresión.
- Enlaces directos a la maqueta de cada estado.
- **Solo tú puedes comprobar**: dispositivo real, notificación real, datos reales. Nunca se aprueba
  por analogía.

## 6. El veredicto

| Respuesta | Qué pasa |
| --- | --- |
| «Aprobado» | A `verificacion.md` y a la bitácora, con fecha y sus palabras; sigue el cierre |
| Cambios | Vuelven a implementación con responsable; se prueba lo que cambió |
| Aprobación en bloque | Su frase, literal, en cada verificación, con «sin la prueba paso a paso»; lo no verificado pasa al Cierre como pendiente humano |

No se cierra «con observaciones»: cada una se arregla o se declara deuda.

## 7. El agente QA (bajo demanda)

Con `qa: bajo-demanda`, la persona puede pedir `/qa HU-####` antes de cerrar, cuando no tiene tiempo
de probar o quiere una segunda mirada.

1. `qa` lee `hu.md` y `verificacion.md`, abre la app local compilada y sigue la guía, con las cuentas
   del seed.
2. **Una pasada, con tiempo máximo.** Captura cada paso relevante y cada fallo en `qa/capturas/`.
3. Escribe `qa/informe.md` ([plantilla](plantillas/docs/qa-informe.md)):
   - por criterio: pasó / falló / no verificable aquí;
   - hallazgos `Q-n` con pasos para reproducir, esperado, obtenido, captura y severidad.
4. **No bloquea, no corrige, no devuelve trabajo.** El informe queda en la carpeta de la historia.
5. **La persona revisa cada `Q-n`** antes de cerrar y decide: arreglar (vía directa), deuda declarada
   o descartar. La decisión va a la bitácora y al informe.

`hu.mjs check` solo exige, si existe un informe de QA, que cada `Q-n` tenga decisión antes de
`terminada`.

## 8. La revisión técnica

En [arquitectura.md](arquitectura.md#7-la-revisión-técnica): por riesgo, antes de la prueba humana, sin
correr pruebas, hallazgos B-n y O-n con responsable.

## 9. Lo que solo verifica una persona

Se marca «no verificable aquí» con los pasos exactos: app instalada en un teléfono real, notificación
push real, gestos en la calle, biometría, archivos del almacenamiento real del cliente, migración sobre
producción, un ciclo completo con datos reales. **Siguen abiertos aunque la historia se cierre**, y se
recuerdan antes de desplegar.
