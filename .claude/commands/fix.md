---
description: Vía directa en Code AI Profiles - un defecto, un ajuste visual, un texto o un refactor sin comportamiento nuevo.
argument-hint: <qué falla o qué ajustar>
---
<!-- generado por metodo.mjs desde .metodo/config.json: no editar. -->

Defecto o ajuste: $ARGUMENTS

- **Reproduce** y localiza la causa. Si resulta que el comportamiento correcto nunca se definió, **para y abre historia** (`/hu-new`).
- Corrige en la capa mínima con el rol dueño (`backend` o `frontend`), con **la prueba que lo habría detectado**.
- El implementador corre las **relacionadas** (`pruebas.mjs relacionadas`); tú, la suite una vez si el cambio toca un flujo crítico.
- `config.mjs check` y `entorno.mjs check` en verde.
- Commit con `HU: <HU>` si cierra una observación de una historia (y anótalo en su bitácora), o con `fix:` si no.
- Informa qué estaba mal, por qué, qué prueba lo cubre ahora y qué debe comprobar la persona.

Sin push.
