---
name: {{SLUG}}-<tipo>-<tecnologia>
description: <Qué cubre, con las palabras de la tarea> en {{PROYECTO}}. Cárgala <cuándo, con un verbo: antes de editar X, al tocar Y>.
---

# <Tecnología> · {{PROYECTO}}

<!-- Forjada desde la documentación oficial de <versión> el <fecha>. Revisada por <quién> el <fecha>.
     Por debajo de 170 líneas; si crece, índice y fichas. -->

## La regla de oro

La que más caro sale olvidar, en una o dos frases.

## La estructura

Dónde vive cada cosa: módulos, capas, dónde va la regla de negocio, dónde la validación.

## El módulo de configuración

Archivo, librería de validación, cómo se añade una variable (con su ficha en `.env.example`), cómo se
importa desde el resto del código. Nada de lecturas sueltas del entorno.

## <Tarea frecuente: añadir un endpoint, una pantalla, una migración…>

Pasos concretos, en orden.

## Errores y validación

## Pruebas

Cómo se escribe una prueba aquí, cómo se corren solo las relacionadas (el comando de `pack.json`), el
reporter silencioso.

## Lo que nunca

- Nunca <X>, porque <el caso que lo enseñó>.

## Lo que no se toma prestado

Costumbres de otros stacks que el modelo tiende a traer y aquí no aplican.

## Verificación

```bash
node .metodo/scripts/pruebas.mjs relacionadas <repo> <archivos>
```

## Skills relacionadas

Por nombre, sin copiar.
