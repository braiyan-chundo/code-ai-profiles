---
description: Avanza una historia de Code AI Profiles a su siguiente fase.
argument-hint: <HU-####>
---
<!-- generado por metodo.mjs desde .metodo/config.json: no editar. -->

Historia: $ARGUMENTS

Lee `hu.md` (frontmatter: `fase`, `estado`) y `seguimiento.md`. **La fase del archivo es la verdad**, no tu memoria. **La fase dice lo que está en curso**: al empezar un paso, avanza la fase con `node .metodo/scripts/hu.mjs fase <HU> <fase>` (el script solo deja pasar a la siguiente y comprueba lo que esa fase exige: si falta algo, te lo dice), y después despacha. Para donde el modo (`construir-todo`) diga.

## Arquitectura

- **`architect`** analiza y sintetiza en `arquitectura.md`.
- Comprueba que hay un brief por rol que interviene y la recomendación de modelo.

## Implementación

- **`backend`** con su brief y el modelo recomendado. Al volver: commits, variables añadidas, pruebas relacionadas en verde.
- **`frontend`** con su brief, la maqueta aprobada y la etiqueta o sección del contrato **literal**.
- Revisa el diff de cada repo: que cada uno escribió solo en su territorio.
- **Revisión técnica** de `architect` si la historia es riesgosa (en este proyecto, siempre), antes de la prueba humana. No corre pruebas: lee `pruebas.mjs estado`.

## Verificación (la preparas tú; no corriges)

- **Una sola vez**: `node .metodo/scripts/pruebas.mjs suite todos` (tipos, build y suite, con tiempo máximo de 15 min; se salta lo ya en verde en su SHA). Si tarda, di qué corre y cuánto lleva, con el avance que imprime el script.
- Recompila las apps y sírvelas en sus puertos de prueba.
- Fidelidad visual con la maqueta, en los tamaños y temas de la historia.
- `verificacion.md` desde la plantilla: comprobaciones, ★, guía numerada con las cuentas del seed, «solo tú puedes comprobar».
- Entrégala. Según el modo: sigue con la siguiente historia.
   - Aprobado → `/hu-close`.
   - Cambios → implementación, con responsable; se prueba lo que cambió (relacionadas) y la suite una vez sobre el SHA nuevo.

Informa siempre en una línea: maqueta / código / pruebas / revisión / falta tu prueba.
