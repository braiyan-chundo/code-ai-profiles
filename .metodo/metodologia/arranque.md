# Arranque

> Estado: versión 4 (borrador), 2026-10-25.

Lo que hace Claude **la primera vez** que abre esta metodología en un proyecto. Se sigue en orden.
**Este documento basta**: no se leen los demás. Cuando un paso necesita un detalle, se saca solo esa
sección con `M leer <documento> "<sección>"`. `M` es `node <metodologia>/plantillas/scripts/metodo.mjs`,
y `<metodologia>` es la carpeta donde está esta metodología.

**Cuándo aplica.** Si en la raíz hay `AGENTS.md` y `.metodo/config.json`, el proyecto ya arrancó: manda
`AGENTS.md` y se trabaja con los comandos. Si hay `AGENTS.md` de la v3 (sin `.metodo/`), se sigue
`migracion-v3.md`. Si ya hay código (con otra metodología o ninguna), se sigue `adopcion.md`. Si está
vacío, desde el paso 1. En caso de duda, `node <metodologia>/plantillas/scripts/inventario.mjs --destino .`
lo dice.

## Reglas durante todo el arranque

- **Desde el primer mensaje**, se anota en `arranque-notas.md` (raíz) cada respuesta literal con fecha y
  quién la dio, y cada decisión con su porqué. Plantilla: `<metodologia>/plantillas/docs/arranque-notas.md`.
  Es lo único que sobrevive a un reinicio o a un `/compact`.
- **Lo ya dicho no se vuelve a preguntar**: se cita y se pide confirmación.
- **Cada pregunta, a quien le toca**: al cliente no se le preguntan decisiones de método.
- **Toda decisión de método llega con su valor recomendado**: quien decide solo confirma o cambia.
- Una delegación explícita («como recomiendes») aprueba la recomendación que se dio, y se anota literal.
  No cubre el stack ni la aprobación del alcance: esos se confirman con un «sí».
- Las propuestas de Claude se marcan como propuesta y llevan su porqué.
- Nada sale de la máquina: ni push, ni despliegue, ni envíos al cliente. Un documento o diseño
  **privado** en Claude (propuesta, maqueta) no es publicar; compartirlo o enviarlo al cliente sí, y lo
  autoriza la persona.
- **Contexto corto.** Con las notas al día, al cerrar los pasos 4 y 6 se sugiere `/compact`.

## Paso 1 · El resumen

En un solo mensaje:

> Antes de montar nada necesito entender el proyecto. Contéstame lo que sepas; lo que no, lo dejamos
> abierto. De lo que ya me dijiste, entendí: «…». ¿Es así?
>
> 1. **¿Qué es y para quién?** Qué problema resuelve, quién lo usa y dónde.
> 2. **¿Quién aprueba, quién decide el método y quién autoriza las salidas?** ¿Eres tú las tres cosas?
> 3. **¿Quién es el cliente?** ¿Hay contrato? ¿Cómo se acuerdan los cambios?
> 4. **¿Entregas y plazos?**
> 5. **¿Qué aplicaciones y dónde vivirán?** Escritorio, teléfono, instalable, sin conexión. ¿Existe algo ya?
> 6. **¿Hay dinero, datos personales (¿de menores?), tiempo real o integraciones externas** (pagos, CMS, correo…)?
> 7. **¿Quién desarrolla?** ¿Idiomas de interfaz, código y documentación? ¿Un nombre corto, sin espacios?

Con las respuestas, un **resumen de diez líneas como máximo** y «¿Lo he entendido bien?». No se sigue
sin un sí.

## Paso 2 · Talla, perfil y diales

Con las señales del resumen:

```bash
node <metodologia>/plantillas/scripts/metodo.mjs talla repos=2 integraciones=2 datosPersonales plazoDeOchoSemanasOMas
```

Devuelve los puntos, el perfil y la tabla de diales de ese perfil, con los agentes por defecto, los packs
y los tipos de repo. Para otro perfil: `M diales <S|M|L>`. Las señales que aún no se conocen no se pasan.
Un simple enlace (WhatsApp, redes) no es una integración.

En un mensaje a quien decide el método, el perfil con su porqué y la tabla:

> Por lo que me contaste, propongo el perfil **M** (5 puntos: una segunda app, datos personales, correo
> y pasarela como integraciones, ocho semanas o más). Estos son los diales con su valor; dime cuáles
> cambias: (la tabla)
>
> **Los agentes**: ¿quieres darles nombre y color? Por defecto: product-owner `po` morado, architect
> `arquitecto` naranja… (solo los roles activos)

Las tres preguntas que siempre se hacen, aunque el perfil traiga valor:

1. **¿Hace falta una propuesta formal para el cliente?**
2. **¿Cómo se maneja el alcance?** Sin alcance, lista viva o sellado con actas.
3. **¿Qué agentes trabajan, y con qué nombre y color?**

Lo que se aparte del perfil va a `ajustes`, **y también todo dial que la persona eligió con sus
palabras aunque coincida con el perfil** («sin alcance», «producto primero»): así un cambio de perfil
posterior no lo pisa. Todo se anota en las notas.

**La talla es provisional.** Algunas señales se conocen después (las colas, en el paso 5; el número de
requerimientos, en el paso 4). Si al terminar el paso 5 la talla cruza un corte, se dice y se propone el
cambio de perfil antes del andamiaje.

## Paso 3 · La propuesta (si `propuesta: si`)

Se prepara antes del alcance definitivo, porque suele ser lo que el cliente aprueba. Procedimiento y
estructura: `M leer propuesta`. Si el cliente la aprueba, su listado de requerimientos es la entrada del
paso 4.

## Paso 4 · El alcance (si `alcance` no es `off`)

> ¿Tienes un listado de requerimientos? Pásamelo tal cual. Si no, redacto un borrador con lo que me
> contaste y lo corriges.

- **Si lo tiene:** se copia tal cual, numerado `A.<área>.<n>`. Lo que no es observable o admite dos
  lecturas se señala como pregunta abierta, sin tocar el texto.
- **Si no:** borrador en el formato de `<metodologia>/plantillas/docs/alcance.md`: ítems observables,
  fuera de alcance y preguntas abiertas con su recomendación.
- Se itera hasta un «aprobado». Se escriben `docs/producto/alcance.md`,
  `docs/producto/fuera-de-alcance.md` y `docs/producto/invariantes.md`.
- Con `sellado`, se sella en el paso 7. Con `lista-viva`, queda editable.

Con `alcance: off` este paso no existe y nadie lo menciona después. Las **invariantes** (lo no
negociable) se piden igual, en una pregunta corta: existen en cualquier perfil.

Las **reglas de negocio** que la persona ya conozca («un pedido no se cancela tras despacharse») se
anotan como primeras `RN-n` en `docs/producto/reglas/<dominio>.md`, desde
`<metodologia>/plantillas/docs/reglas.md`.

## Paso 5 · Stack, repos y packs

Lo decide quien decide el método. **El stack por defecto se propone primero**, salvo que el proyecto
pida otra cosa:

| Capa | Por defecto | Pack |
| --- | --- | --- |
| Apps | React + Vite + TypeScript, shadcn/ui, Tailwind, Zustand, TanStack Query, lucide-react, Socket.IO | `frontend-react-vite` |
| Servidor | NestJS, REST con DTOs de entrada y salida, Swagger, eventos y webhooks | `backend-nestjs` |
| Base de datos | MongoDB (Mongoose) | `persistencia-mongodb` |
| Colas, si hacen falta | Redis + BullMQ | `colas-bullmq` |

> Propongo el stack de siempre: React + Vite con shadcn, NestJS con Swagger y MongoDB{, más Redis y
> BullMQ porque hay webhooks salientes}. ¿Lo usamos, o este proyecto pide otra cosa?

Para un S (una landing), basta la parte de apps. Si el cliente impone otra cosa, se respeta. La
estructura de repos: uno solo, o servidor y apps por separado.

Con el stack:

- **packs**: uno por tecnología de servidor, de apps y de base de datos, y los de dominio que piden los
  rasgos (`dinero` si hay dinero, `colas-bullmq` y `eventos` si hay colas, `tiempo-real` si hay sockets,
  `contratos` si hay paquete de contratos). La lista está en la salida de `M diales`. Si no existe el de
  una tecnología, se anota «pack por forjar»: lo hace la historia fundacional;
- **datos**: la skill del motor siempre; el agente `data` si el dato es complejo;
- **entornos**: local siempre; staging y producción con sus hosts si ya se conocen. `iniciar` crea
  `.metodo/entornos.json` y se completa ahí;
- un ADR por decisión de base, con «Historia: arranque».

En este paso **las decisiones van a las notas**. `config.json` se escribe en el paso 7; `stack.md` lo crea
`iniciar` y se completa después.

## Paso 6 · El enfoque y el diseño

- Con `diseno` distinto de `off`: **se pregunta ya** si el cliente tiene marca, referencias, ejemplos o
  una idea, o si se arma de cero. La respuesta se anota.
- Con `diseno: sistema`, la fundación de diseño (marca, tokens, showcase, componentes, guías) es la
  primera historia con pantalla, y en ella se proponen las skills de diseño. Con `diseno: por-hu`, la
  primera historia con pantalla deja una fundación mínima (tokens y dirección).
- Con `enfoque: producto`: el orden de las historias del paso 8 empieza por la fundación (o, en
  `por-hu`, por el **prototipo** del recorrido completo: pantallas estáticas enlazadas, sin lógica).

## Paso 7 · El andamiaje

1. **`git init`** si no existe. **La raíz es el repositorio de gobierno** (`hu/`, `docs/`, `.metodo/`).
   Si hay repos de código aparte, cada uno es su propio repo git, lo crea la historia fundacional, e
   `iniciar` los pone en el `.gitignore` de la raíz. Con un solo repo (`ruta: "."`), todo vive junto.
2. Claude escribe **`.metodo/config.json`** con todo lo decidido, partiendo de
   `<metodologia>/plantillas/config/config.json`: solo los agentes activos en `agentes`, los repos, el
   stack, los comandos de cada repo. Si una clave no queda clara: `M leer configuracion "partes del archivo"`.
3. **El script**, en simulación y después de verdad:

   ```bash
   node <metodologia>/plantillas/scripts/metodo.mjs iniciar --destino . --simular
   ```

   ```bash
   node <metodologia>/plantillas/scripts/metodo.mjs iniciar --destino .
   ```

   Mueve la metodología a `.metodo/metodologia/`, copia los scripts a `.metodo/scripts/`, crea carpetas,
   `.gitignore`, `entornos.json`, los `.env.example` y los documentos base que pidan los diales, valida,
   genera agentes, comandos y hooks, y traslada las notas. **No sobrescribe ningún documento que exista.**
   Si `validar` da un error, se corrige la config y se repite.
4. **Revisar a mano** lo generado:
   - cada agente: nombre y color, territorio («Escribes / Nunca escribes»), skills «ya cargadas» y
     «según la tarea», las dos reglas fijas;
   - `AGENTS.md`: figuras, repos, packs, lo que dice del alcance;
   - `.env.example` y `entornos.json`: solo lo que este proyecto tiene.
   Las reglas propias de un rol van en `.metodo/reglas/<rol>.md` (se crean vacías), nunca en el agente
   generado.
5. Con `alcance: sellado`: `node .metodo/scripts/alcance.mjs sellar`.
6. **Comprobar**: `node .metodo/scripts/metodo.mjs validar` y `node .metodo/scripts/hu.mjs check`; con
   `alcance: sellado`, también `node .metodo/scripts/alcance.mjs check`; con `grafo: graphify`, que
   `graphify` está instalado (`uv tool install graphifyy`; si no, se dice ahora, no al primer build). Y
   que las dos guardas fijas bloquean un fallo provocado:

   ```bash
   node .metodo/scripts/config.mjs probar && node .metodo/scripts/entorno.mjs probar
   ```

7. **Commit**: «Arranque: método v4, perfil <X>». Sin push.

## Paso 8 · Las primeras historias

Claude propone historias en orden:

> 1. **Fundacional:** repos (cada uno con su `git init` y su `.env.example`), esqueleto, módulo de
>    configuración, seed de cuentas de prueba (si hay cuentas), packs por forjar; al terminar,
>    `metodo.mjs generar` para instalar el pre-commit en los repos nuevos.
> 2. **Fundación de diseño** (si `diseno: sistema`): marca, tokens, showcase, componentes, guías.
> 3. **<Historia>** — entrega 1 · cubre A.2.1 · depende de la 1.
> …
> ¿Las abro así?

- **Historias cortas desde el principio**: hasta 6 criterios, uno o dos días, una guía de prueba de unos
  15 minutos. Un ítem del alcance grande se reparte en varias historias (cada una lo cubre en parte y lo
  dice); es mejor proponer 25 historias pequeñas que 9 grandes. Se corta por paso del flujo, por
  operación, por rol, camino feliz primero, por variante; **nunca por capa** (el endpoint y la pantalla no
  son dos historias). Detalle: `node .metodo/scripts/metodo.mjs leer metodo "tamaño de una historia"`.
  Junto a la propuesta, una línea con el tamaño: «25 historias, ninguna pasa de 6 criterios».
- Con alcance, cada ítem cubierto por al menos una historia. Sin alcance, las historias salen del resumen.
- Con `enfoque: producto`, después de la fundación de diseño va el **prototipo de los flujos clave** (pantallas estáticas enlazadas),
  y las historias técnicas se derivan de él.
- La propuesta y el «sí», literales, a las notas. Commit.

Y Claude se despide:

> Ya está montado. Cierra esta sesión y abre una nueva en la carpeta del proyecto, para que se carguen
> los agentes, los comandos y los permisos. En la sesión nueva, pega esto:
>
> «Abre una por una, con /hu-new y en ese orden, las historias acordadas en
> docs/producto/arranque-notas.md § Historias propuestas.»
