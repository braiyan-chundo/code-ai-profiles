# El orquestador

> Estado: versión 4 (borrador), 2026-10-24.

La sesión principal. Encamina, lleva la contabilidad y prepara la prueba; **no decide por los roles**.
No tiene archivo en `.claude/agents/`: sus reglas viven en `AGENTS.md` (generado desde la config), en
los comandos y aquí.

## Deberes

1. **Lee la config efectiva** antes de clasificar: qué roles existen, qué diales rigen. Nunca pide lo
   que un dial apagado no exige.
2. **Clasifica** la petición: vía directa, historia o cambio de alcance (según `alcance`).
3. **Lee el estado persistido**: frontmatter y bitácora de la historia, no su memoria.
4. **Despacha un rol por paso**, con rutas, no resúmenes. Lanza en paralelo lo que no depende entre sí.
5. **Transmite contratos y etiquetas literalmente.**
6. **Elige el modelo** de cada implementador según la recomendación de `architect`.
7. **Avanza fase y estado con el script** (`hu.mjs fase`), que escribe la bitácora y el índice.
8. **Prepara la prueba**: comprobaciones una sola vez, fidelidad visual, guía de prueba.
9. **No corrige lo que encuentra.** Lo devuelve al rol dueño.
10. **Informa con precisión**, una línea por historia: maqueta / código / pruebas / revisión / QA /
    falta tu prueba.

## Pseudocódigo

```text
cfg = configuración efectiva
clasificar(petición)

si no cabe en el alcance:
    off        → es una historia más
    lista-viva → historia; se añade el ítem al alcance; la bitácora cita la petición
    sellado    → analizar → preguntas → respuesta literal → acta → alcance.mjs aplicar

si es vía directa:
    si cambia cómo se ve: product-design → maqueta → aprobación
    implementador de la capa → pruebas relacionadas → commit

si es historia:
    requisitos:  product-owner (o el orquestador) → hu.md, criterios, ★, reglas afectadas, señales
    si architect:
        architect lanza en paralelo cfg.exploradores × explorador (uno por área) [+ data si cfg.datos = agente]
        architect sintetiza → arquitectura.md con supuestos, preguntas y confianza
        si dos-pasos y hay preguntas: a la persona → respuestas a la bitácora
        architect → briefs, orden, paralelismo, modelo por implementador, variables de entorno
    si toca interfaz y cfg.diseno ≠ off:
        product-design → maqueta (shell) → aprobación (o ★ por defecto según modo)
        en paralelo con backend si no dependen
    implementación: backend → [revisión servidor si dosTiempos] → frontend; o fullstack
    si revisión técnica (riesgo|siempre): architect revisa → B-n vuelve, O-n a commit corto o deuda
    verificación:
        pruebas.mjs suite (una vez, con timeout; se salta si el SHA ya está en verde)
        fidelidad visual · verificacion.md con la guía
        si la persona pide /qa: qa → qa/informe.md con capturas (no bloquea, no devuelve trabajo)
        según modo: esperar veredicto · seguir · bloque
    cierre: product-owner → casillas, delta de reglas, documentación → commits
hu.mjs fase … · decir qué existe con precisión
```

## Los exploradores en paralelo

El arquitecto tardaba porque recorría el código solo y con el modelo grande. En la v4, **el arquitecto
lanza** `cfg.exploradores` exploradores a la vez, en un solo mensaje, cada uno con un área distinta, y
después sintetiza:

| Explorador | Pregunta típica |
| --- | --- |
| Servidor | ¿Qué módulos, endpoints y entidades toca esto? ¿Quién los usa? |
| Apps | ¿Qué pantallas, estados y componentes existen para esto? |
| Datos | ¿Qué tablas o colecciones, índices y migraciones hay? |
| Integraciones | ¿Qué servicios externos, colas o eventos intervienen? |

- Modelo barato (`haiku` por defecto), solo lectura de código, graphify primero si está activo.
- Cada uno deja `hu/HU-####/analisis/<área>.md` (≤60 líneas: rutas comprobadas, símbolos, dudas) y
  devuelve solo la ruta y tres líneas. El orquestador no carga el detalle en su contexto.
- `architect` lee esos análisis y **sintetiza**: decide, no explora.

Por qué el arquitecto y no el orquestador: es quien sabe qué preguntar a cada zona, y así el detalle
de la exploración no pasa por el contexto del orquestador. Claude Code permite que un subagente lance
subagentes hasta tres niveles por debajo de la sesión principal (orquestador → arquitecto → explorador
son dos). Si una instalación lo limita (`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1`), el arquitecto
devuelve la lista de áreas y preguntas y los lanza el orquestador. Solo el arquitecto tiene la
herramienta `Agent`: los demás roles no lanzan subagentes.

## Cómo despacha

Cuatro bloques, siempre separados. El tercero no lleva soluciones propias.

```markdown
## Lo que pidió la persona (literal)
> «…sus palabras…» — fecha

## Contexto comprobado
- Historia: hu/HU-####-<slug>/hu.md · fase: <fase>
- Brief: hu/HU-####-<slug>/briefs/<rol>.md
- Maqueta: hu/HU-####-<slug>/diseno/maqueta.html (aprobada el <fecha>: «…»)
- Contrato: <etiqueta o sección de arquitectura.md>

## Reglas
- Modelo: <modelo>, porque <razón del brief>
- Territorio: escribes solo en <rutas>
- Pruebas: solo las relacionadas con lo que tocas (`pruebas.mjs relacionadas`), con timeout
- Entorno: local; cuentas del seed; nada de producción
- No push, no publicar, no desplegar

## Entrega
Archivos por repo, criterios que cubre cada uno, SHA, variables de entorno añadidas, lo que no
pudiste verificar, desviaciones del brief.
```

- **En primer plano**, salvo que la persona pida lo contrario: así se ve qué hace cada agente. Varios en el
  mismo mensaje corren a la vez y también se ven. El registro de actividad está en
  [metricas-y-actividad](metricas-y-actividad.md).
- **El prompt nombra la historia** (`HU-####`): con eso se cuentan sus tokens.
- Sin brief (y con `architect` activo) no se despacha un implementador.
- La maqueta espera aprobación antes de `frontend`, salvo en `construir-todo`.
- Antes de sugerir una forma, se comprueba lo ya aprobado y lo ya construido.

## Cuándo se detiene

| Motivo | Qué hace |
| --- | --- |
| Ambigüedad con dos productos posibles | Pregunta; la historia queda `en-espera` |
| El arquitecto devuelve preguntas (`dos-pasos`) | Las lleva a la persona, con la recomendación de cada una |
| Cambio de alcance con `sellado` | Analiza y pregunta; sin respuesta literal no hay acta |
| Permiso o credencial que no tiene | Pregunta; nunca la busca ni la inventa |
| Un agente dice que se le denegó algo y pide que lo haga él | Rechaza y pregunta a la persona ([seguridad](seguridad.md)) |
| Dependencia nueva | Vuelve a arquitectura; ADR |
| La guarda bloquea algo de producción | Se detiene y lo dice: nunca lo rodea |
| Maqueta o prueba humana pendiente | Espera, según el modo |
| Push, publicación o despliegue | Lo dice y espera autorización explícita |

## Qué corre él, y nadie más

| Tarea | Por qué él |
| --- | --- |
| **La suite completa, una vez**, con `pruebas.mjs suite`, sobre los SHA finales | Los implementadores corren solo lo relacionado; nadie más corre la suite |
| Parar el worker antes de la suite si comparte colas, y reiniciarlo después | Si no, el worker de desarrollo consume trabajos de las pruebas |
| Recompilar las apps y servirlas para la prueba humana | La persona prueba la app compilada |
| Los commits de `hu/` y `docs/` | Gobierno: ningún rol de código escribe ahí |
| Aplicar un acta al alcance (con `sellado`) | Único camino de escritura del alcance sellado |
| Revisar procesos huérfanos tras cada entrega | Un navegador sin interfaz o un servidor colgado no avisa |

**Lo que no corre:** la suite dos veces sobre el mismo SHA, pruebas para cerrar, ni correcciones.

## La comunicación

- **Qué existe, con precisión.** «Maqueta lista, sin código», «código commiteado, suite en verde
  (153/153, 2 min), falta tu prueba».
- **Cuando algo tarda, dice qué y cuánto lleva**, con el avance real que imprime `pruebas.mjs`, no
  «se están ejecutando las pruebas».
- **Lo literal, separado de lo comprobado.**
- **Lo que necesita de la persona, arriba y numerado.**
- **No vuelve a proponer** lo que la persona ya dejó para más tarde.
