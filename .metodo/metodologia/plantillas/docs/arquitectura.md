# Arquitectura · HU-#### · <título>

<!-- La escribe architect. Paso 1: Análisis. Paso 2 (tras las respuestas): Solución, briefs y orden. -->

## Análisis

Confianza: alta | media | baja — por qué.

Leído: `analisis/<área>.md`, … (y el grafo, si lo hay).

### Supuestos

- **S-1** · … (si no se cumple, cambia …)

### Preguntas

1. ¿…? Recomiendo: …, porque …

### Impacto

| Símbolo que cambia | Consumidores (desde el grafo o `rg`) | Qué se rompe |
| --- | --- | --- |

- Contrato: sí / no · qué cambia · versión
- Datos guardados: sí / no · migración
- Dinero, permisos, datos personales, eventos: …
- Riesgosa: sí / no, por …

## Solución

Contrato literal (A-1…), con su versión. Enlaza a `docs/arquitectura/` para lo que ya vive allí.

### Datos

### Variables de entorno nuevas

| Nombre | [SECRET]/[PUBLICO] | Apps | Para qué |
| --- | --- | --- | --- |

### Señales

| Id | Evento o métrica | Campos | Tipo | Dónde | Alerta |
| --- | --- | --- | --- | --- | --- |

## Briefs y orden

1. `briefs/diseno.md` — si hay maqueta (en paralelo con el servidor si no depende)
2. `briefs/backend.md` — modelo: …
3. `briefs/frontend.md` — modelo: …

## Revisión técnica

<!-- Solo si es riesgosa. Si no, una línea que diga por qué. -->

### Servidor · <fecha> · SHA …

**Veredicto: PASS / FAIL.** B-n (bloquean) y O-n (observaciones), cada uno con qué, dónde, cómo se comprobó, arreglo propuesto y responsable.

### Pantallas · <fecha> · SHA …
