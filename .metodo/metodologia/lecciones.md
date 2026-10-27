# Lecciones

> Estado: versión 4 (borrador), 2026-10-24.

Lo que costó una vuelta, escrito como regla. Las lecciones atadas a una tecnología (Redis, vitest,
service workers…) viven en su pack; aquí quedan las que valen para cualquier stack.

## De la v3 a la v4

| Qué pasaba | Por qué | Qué hace la v4 |
| --- | --- | --- |
| Mucho boilerplate en proyectos pequeños | Una sola talla para todo | Perfiles y diales |
| Se pedían actas con el alcance apagado | La regla estaba en prosa, no en un interruptor | Toda regla depende de la config |
| «2ª pasada de las 153 pruebas», sin fin a la vista | La suite corría en cada rol y sin tiempo máximo | Relacionadas al implementar, suite una vez, timeout, registro por SHA |
| Gasto de tokens alto | Ejecuciones repetidas y salidas largas en el contexto | Silencio en verde, gates solo sobre lo cambiado, exploradores baratos |
| URL de la API y tokens en el código del frontend | Nadie lo impedía | Regla fija y gate en tres momentos |
| Agentes que no generaban claves ni iniciaban sesión en desarrollo | Ambigüedad: no sabían qué era de prueba | Entornos declarados, seed, guarda de producción |
| El arquitecto tardaba mucho | Exploraba solo con el modelo grande | Exploradores en paralelo; el arquitecto sintetiza |
| Supuestos del arquitecto que nadie validó | Briefs de una vez | Análisis con preguntas antes de los briefs |
| Maquetas que inventaban su propio sistema | No había fundación de diseño | Fundación y estructura fija de maqueta |
| La lógica de negocio quedaba vieja | Solo se escribía al inicio | Reglas vivas `RN-n`, el PO aplica el delta al cerrar |
| Archivos de una historia repartidos en cuatro carpetas | Estructura por tipo de archivo | Una carpeta por historia, con bitácora |
| Especialidad de NestJS en un proyecto Python | Skills atadas a un stack | Packs |
| QA que devolvía a desarrollo en bucle (v1) | QA bloqueante | QA opcional, no bloqueante, la persona decide |
| Cargar la v4 en un proyecto nuevo gastó el 10% del contexto de la sesión | El arranque leía unos 90 KB de documentos escritos para personas, y ese contexto se repite en cada turno | `arranque.md` basta por sí solo; `metodo.mjs talla`, `diales` y `leer` dan solo lo que hace falta; `validar` avisa si lo que se carga solo crece |
| Las maquetas tardaban demasiado | El agente construía versiones que funcionaban («maqueta navegable», «componentes reales»): lógica, datos simulados, el stack del proyecto | Maqueta estática: HTML y CSS por pantalla × estado × variante, el marco ya hecho, la interacción como otro estado, variantes comparables lado a lado (como en MOVI_EXPRESS) |
| Una skill de componentes con todas las fichas dentro no se usaba bien | Los agentes no llegaban a la ficha: había que abrir el índice y buscar el archivo | Showcase con todos los componentes, una skill por componente (`<slug>-ui-<id>`, descripción corta) y un índice de uso, como en MecanicLive; `hu.mjs check` avisa si no cuadran |
| Un proyecto se partió en 9 historias y hubo que dividirlas en 25 | Nadie medía el tamaño | Historias cortas: hasta 6 criterios, cortes por flujo, operación, rol o variante; el PO propone el corte, el arquitecto lo devuelve y el gate avisa |

## Del arnés y los agentes (vigentes)

| Qué pasa | Por qué | Qué hacer |
| --- | --- | --- |
| Un subagente «no puede escribir» y deja la tarea al orquestador | La `deny` o sus herramientas se lo impiden | Es blanqueo de permisos: se rechaza y se pregunta |
| El índice de historias queda viejo | Se escribía a mano | Lo regenera `hu.mjs` en cada `fase` |
| La fase del frontmatter se queda atrás | Se avanzaba a mano | `hu.mjs fase` |
| El grafo dice «nadie lo consume» y dos pantallas lo usan | El consumidor compara el literal del evento | Para eventos, `rg` además del grafo |
| La consulta al grafo devuelve cientos de nodos | Se preguntó con una frase | Preguntar por símbolo |
| Un prompt de rol habla de algo que ya cambió | Los prompts no se revisaban | Se generan desde la config; las reglas propias, en `.metodo/reglas/`, se enlazan, no se enumeran |
| Procesos lanzados por un agente siguen vivos horas después | Un navegador sin interfaz que no carga espera para siempre | tiempo máximo (`limite.mjs`) en todo lo que va en segundo plano; `ps` antes de entregar |

## De las pruebas (vigentes, cualquier stack)

| Qué pasa | Qué hacer |
| --- | --- |
| Una prueba falla solo cerca de medianoche | Reloj falso que congela solo la fecha |
| Pruebas que fallan de vez en cuando por tiempo | Repetir aislada antes de abrir un hallazgo |
| Una aserción por forma pasa con datos incorrectos | Asertar el valor exacto |
| «La pantalla no muestra el dato» y la API sí lo envía | Las pruebas de fuga miran el JSON crudo |
| Todo en verde y el tiempo real no se mueve | Dos clientes abiertos a la vez |

## De la comunicación

| Qué pasa | Qué hacer |
| --- | --- |
| La persona aprueba maquetas creyendo que falta implementar | Una línea por historia: maqueta / código / pruebas / revisión / QA / falta su prueba |
| La persona pregunta «¿por qué tarda?» | Decir qué corre y cuánto lleva, con el avance real |
| Un hallazgo se pierde al limpiar el contexto | Volcar a la bitácora antes de limpiar |
| La persona relee una decisión que ya tomó | Lo que dejó para más tarde no se repite |

## Antipatrones vigentes

- Un agente único que pide, diseña, implementa, prueba y se aprueba.
- Quien verifica arregla lo que encontró.
- El orquestador parafrasea contratos entre capas.
- Avanzar porque «el agente dijo que terminó».
- Declarar terminado lo que exige una prueba humana que nadie hizo.
- Despachar un implementador sin brief ni plan.
- Construir una pantalla que nadie aprobó.
- Usar el modelo más grande para todo «por si acaso».
- Rodear una guarda o una `deny` con la shell.
- **Nuevos en la v4:**
  - Pedir lo que un dial apagado no exige.
  - Correr la suite completa más de una vez sobre el mismo SHA.
  - Escribir una URL, un token o una clave en el código «porque es solo de lectura».
  - Negarse a usar credenciales de prueba en local, o usar credenciales reales en local.
  - Maquetar antes de la fundación de diseño.
  - Editar un archivo generado en lugar de la config.
