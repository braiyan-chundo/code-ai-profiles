# Reglas de negocio · proyectos

### RN-02 · Un proyecto anclado se lee sin escribir ni ejecutar nada
Desde HU-0023. Solo se admiten proyectos con la metodología v4 (`.metodo/config.json` con `version: 4`). De la
carpeta se leen únicamente `.metodo/config.json`, el encabezado de cada `hu/HU-*/hu.md`, `metricas.json`, la fecha de
cada fila de `seguimiento.md`, los manifiestos de la raíz de cada repo (`package.json`, `Cargo.toml`…) y, de `.git`,
la rama, el commit y la fecha en que llegó a la rama. No se escribe nada en la carpeta ni se ejecuta nada de ella
(ni los scripts del método ni `git`), y no se usa la red. Lo que esté fuera de la carpeta, en `~/.claude`, en los
perfiles o en Code AI Profiles no se lee, aunque el proyecto apunte ahí.

### RN-03 · Los tokens de un proyecto salen solo de sus métricas, y las descartadas no suman
Desde HU-0023. El tiempo en fases y los tokens se suman de los `metricas.json` de las historias terminadas; nunca se
leen transcripciones. Las descartadas muestran sus cifras, tachadas, y no cuentan en los totales.

### RN-04 · La app guarda la ruta y el último nombre leído de cada proyecto
Desde HU-0023. Junto a su registro, Code AI Profiles guarda la ruta, el último nombre leído y cuándo se leyó, para
reconocer un proyecto cuya carpeta se movió o se rompió. Desanclar borra solo eso.
