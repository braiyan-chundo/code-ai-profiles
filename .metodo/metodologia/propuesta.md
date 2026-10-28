# La propuesta al cliente

> Estado: versión 4 (borrador), 2026-10-24.

Con `propuesta: si`. No todos los proyectos la llevan, pero **se pregunta siempre en el arranque**.
Sirve para enseñarle al cliente, antes de construir, **qué se hará, cómo y con qué garantías**.

## 1. Los estándares que sigue

Una propuesta moderna, pero apoyada en estándares reconocidos, para que el cliente (y quien lo asesore)
la pueda evaluar:

| Para | Estándar | Qué toma la propuesta |
| --- | --- | --- |
| Requisitos | **ISO/IEC/IEEE 29148** | Requisitos claros, verificables, sin ambigüedad, con su origen |
| Priorización | **MoSCoW** | Imprescindible · importante · deseable · fuera de esta versión |
| Experiencia | **User story mapping** | El recorrido del usuario de punta a punta y qué entra en cada entrega |
| Calidad | **ISO/IEC 25010** | Las características de calidad comprometidas: adecuación, rendimiento, usabilidad, seguridad, mantenibilidad |
| Arquitectura | **Modelo C4** (niveles 1 y 2) en una estructura **arc42** ligera | Contexto y contenedores, en diagramas que entiende alguien no técnico |
| Seguridad | **OWASP ASVS** (nivel 1 o 2 según el riesgo) | Qué controles se comprometen |
| Accesibilidad | **WCAG 2.2 AA** | El nivel comprometido |
| Gestión | Entregas incrementales con criterios de aceptación | Qué ve el cliente en cada entrega y cómo la aprueba |

No se cita un estándar que no se vaya a cumplir.

## 2. La estructura

Plantilla: [plantillas/docs/propuesta.md](plantillas/docs/propuesta.md).

1. **Resumen ejecutivo**: el problema, la solución, el resultado esperado. Una página.
2. **Objetivos** medibles.
3. **Alcance** priorizado con MoSCoW, y lo que queda fuera.
4. **Mapa de historias**: el recorrido del usuario y qué entra en cada entrega.
5. **Cómo se verá**: dirección visual o primeras pantallas, si ya hay fundación de diseño.
6. **Arquitectura**: diagrama de contexto y de contenedores (C4), y el porqué de las tecnologías.
7. **Calidad comprometida**: ISO 25010, seguridad, accesibilidad, observabilidad.
8. **Cómo trabajamos**: entregas, cómo aprueba el cliente, cómo se piden cambios, cómo se asegura la
   calidad con agentes y revisión humana.
9. **Cronograma** por entregas.
10. **Riesgos y supuestos**.
11. **Inversión** (opcional: la pone el desarrollador).
12. **Siguientes pasos**.

## 3. El formato

Se prepara como **documento o presentación en Claude** (artefacto de documento o de diapositivas), que
el cliente puede ver, comentar y descargar en PDF o PowerPoint. Una copia en markdown queda en
`docs/producto/propuesta/`.

## 4. El procedimiento

1. Con el resumen del paso 1 del arranque, Claude redacta el borrador y lo marca como propuesta.
2. Quien decide el método revisa la parte técnica y la inversión.
3. Quien aprueba la revisa con el cliente. Las correcciones se iteran.
4. **Enviarla al cliente lo decide la persona**: es comunicación contractual.
5. La versión aprobada se guarda con su fecha. Si hay alcance, su listado priorizado es la entrada del
   paso 4 del arranque.
