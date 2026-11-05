# Verificación · HU-0030 · Icono de dormida en los perfiles detenidos

Preparada por el orquestador el 2026-11-05. Revisión técnica: FAIL por B-1 (el icono se iba al borde derecho del
sidebar), corregido en `ae69ef9`; lo demás PASS.

## Qué se entregó

| Commits | Qué |
| --- | --- |
| `39cd60c`, `ae69ef9` | `SleepingMark` («zᶻ», `aria-hidden`) e `isSleeping(status, pending)`; sidebar (instancias y original) y «Uso por instancia» |
| `628eaec` y gobierno | Historia, maqueta aprobada («Aprobadas con zᶻ»), revisión y esta verificación |

## Desviaciones aceptadas

1. Color `text-muted-foreground` en lugar de `--quiet`: la prueba 14 de `test:ui` prohíbe `--quiet` en texto por contraste.
2. Tamaños con `--fs-small` y `--fs-micro` + `scale`, porque la prueba 13 prohíbe tamaños sueltos.

## Guía de prueba

1. **AC-01.** Con una instancia detenida y otra abierta: en el sidebar la detenida lleva «zᶻ» pegado al nombre; la
   abierta no. Si la original está detenida, también lo lleva.
2. **AC-02.** En el dashboard, «Uso por instancia» muestra «zᶻ» tras el nombre de las detenidas.
3. **AC-03.** Pulsa «Abrir» en una detenida: el icono desaparece en cuanto empieza a abrirse. Detenla: vuelve al
   terminar.
4. Pliega el sidebar: no se ve. Prueba también el tema claro.

**Solo tú puedes comprobar:** cómo se ve la fuente mono del «zᶻ» en Windows y Linux.
