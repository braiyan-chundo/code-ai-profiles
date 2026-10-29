# {{PROYECTO}} · cómo trabajamos

{{RESUMEN}}

Metodología v4 · perfil **{{PERFIL}}** · fase **{{FASE}}** · modo **{{MODO}}**. La config manda:
`.metodo/config.json`. Lo que rige ahora: `node .metodo/scripts/metodo.mjs efectivo`. El detalle del
método está en `.metodo/metodologia/`, pero sus documentos no se leen enteros: se saca solo la sección que
hace falta con `node .metodo/scripts/metodo.mjs leer <documento> "<sección>"` (sin sección, el índice).

## Quién es quién

- Aprueba el producto: **{{APRUEBA}}**. Decide el método: **{{METODO}}**. Autoriza salidas: **{{SALIDAS}}**. Cliente: {{CLIENTE}}.
- Canal de aprobación: {{CANAL}}.

| Agente | Rol | Color | Modelo |
| --- | --- | --- | --- |
{{LISTA_AGENTES}}

## Repos

| Nombre | Ruta | Tipo | Puertos |
| --- | --- | --- | --- |
{{LISTA_REPOS}}

Packs: {{LISTA_PACKS}}.

## Cómo se trabaja

- Cada petición se clasifica: defecto (`/fix`), historia (`/hu-new`){{SI_SELLADO:, o cambio de alcance con acta}}{{SI_LISTA_VIVA:; si no está en el alcance, se añade con su historia}}.
- Una historia es una carpeta `hu/HU-####-<slug>/`. Su fase y su estado los avanza `hu.mjs`; la bitácora (`seguimiento.md`) dice en qué va.
- Se avanza con `/hu-work` y se cierra con `/hu-close`.{{SI_QA: `/qa` prueba en el navegador sin bloquear.}}{{SI_DEVOPS: `/deploy` para despliegue, solo bajo demanda.}}{{SI_SEGURIDAD_DIAL: `/seguridad` busca vulnerabilidades sin bloquear.}}
{{#SI_ALCANCE}}
- El {{ALCANCE_NOMBRE}} está en `{{ALCANCE_ARCHIVO}}`{{SI_SELLADO: y solo cambia por acta}}.
{{/SI_ALCANCE}}
{{^SI_ALCANCE}}
- **Este proyecto no lleva alcance ni actas.** No se piden ni se mencionan.
{{/SI_ALCANCE}}
{{#SI_DISENO_SISTEMA}}
- Ninguna maqueta antes de la fundación de diseño aprobada (`/diseno-fundacion`).
{{/SI_DISENO_SISTEMA}}
{{#SI_ENFOQUE_PRODUCTO}}
- **Producto primero**: fundación de diseño y prototipo de los flujos clave aprobados; la tecnología se deriva de ellos.
{{/SI_ENFOQUE_PRODUCTO}}
- Reglas de negocio vivas en `docs/producto/reglas/`: cada historia que las toca deja su delta al cerrar.

## Las dos reglas fijas

1. **Nada de configuración en el código**: ni URLs, ni tokens (aunque sean de solo lectura), ni claves, ni IDs de servicios. Todo a `.env.example` con su ficha `[SECRET]`/`[PUBLICO]` y leído solo desde el módulo de configuración. La guarda lo bloquea al escribir, al commitear y al cerrar.
2. **Ningún agente toca producción.** Se trabaja en local. En local, los secretos de desarrollo se generan y las cuentas del seed se usan sin pedir permiso; nunca credenciales reales.

## Pruebas

Quien implementa corre solo las relacionadas (`pruebas.mjs relacionadas`). La suite completa la corre el orquestador **una vez** (`pruebas.mjs suite`), con tiempo máximo de {{TIMEOUT_MIN}} min; un SHA en verde no se repite.

## Lo que sale de la máquina

Push, publicación y despliegue los autoriza {{SALIDAS}}, cada vez. Commits con `HU: HU-####` como trailer.

## Reglas propias del proyecto

{{INCLUIR:reglas/orquestador.md}}

## Lo que no se edita a mano

Agentes, comandos, hooks, `settings.json`, este archivo y `hu/INDEX.md` se generan. Para cambiarlos: la config y `metodo.mjs generar`. Las reglas propias de un rol, en `.metodo/reglas/<rol>.md`.
