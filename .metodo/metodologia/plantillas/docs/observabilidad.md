# Observabilidad de {{PROYECTO}}

Nivel: **{{OBSERVABILIDAD}}**. Catálogo de las señales vivas; lo mantiene el arquitecto al cerrar cada
historia con señales. Stack (lo propone devops, lo decide {{METODO}}): …

## Convenciones

- Logs estructurados (JSON): `nivel`, `mensaje`, `evento`, `id_correlacion`, contexto.
- Eventos con nombre `<dominio>.<hecho_en_pasado>`: `pedido.confirmado`, `pago.fallido`.
- Nunca en una señal: contraseñas, tokens, datos personales sin enmascarar.

## Señales

| Id | Señal | Tipo | Dónde se ve | Alerta | Historia |
| --- | --- | --- | --- | --- | --- |
