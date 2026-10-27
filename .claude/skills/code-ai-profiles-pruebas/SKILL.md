---
name: code-ai-profiles-pruebas
description: Estrategia de pruebas de Code AI Profiles - quién corre qué, el script pruebas.mjs con tiempo máximo y registro por SHA, las pruebas que no pueden faltar y lo que solo verifica una persona. Cárgala al verificar una historia, al hacer QA o al decidir qué prueba añadir.
---

# Pruebas

## Quién corre qué

| Quién | Qué |
| --- | --- |
| Quien implementa | Tipos + pruebas **relacionadas** con lo que tocó: `pruebas.mjs relacionadas <repo> <archivos>` |
| El orquestador | Tipos, build y suite **una vez** sobre los SHA finales: `pruebas.mjs suite todos` |
| Revisión técnica y cierre | Nada: leen `pruebas.mjs estado` y la verificación |
| QA | La guía en el navegador; no la suite |

Tiempo máximo: 15 min por ejecución. Un SHA en verde no se repite.

## Las capas

Tabla del proyecto: herramienta → dónde → qué prueba (dominio, API de verdad, punta a punta). La
rellena la historia fundacional desde los packs.

## Las pruebas que no pueden faltar

- Concurrencia: dos tomas simultáneas, un ganador.
- Fuga de datos: el JSON **crudo** que recibe cada rol restringido.
- Idempotencia: la misma petición dos veces, un efecto.
- Permisos: cada cuenta del seed, sin permiso, sin sesión.

## Trampas

- El reloj: congelar solo la fecha.
- Timeouts cortos fallan con la máquina cargada: repetir aislada antes de abrir un hallazgo.
- Una aserción por forma (`/\d+\.\d{2}/`) pasa con datos incorrectos: asertar el valor.

## Cuentas

Las del seed de desarrollo, por rol. Nunca las personales. Se usan sin pedir permiso: son de prueba.

## Lo que no se prueba con una prueba

«No verificable aquí» con los pasos exactos: dispositivo real, notificación real, gestos, datos reales.
Nunca se aprueba por analogía.
