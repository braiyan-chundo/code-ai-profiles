# Cuestionario (`questionnaire`)

## Para qué

Preguntas paso a paso con opciones o texto.

## Cuándo sí / cuándo no

**Sí**
- Preguntas paso a paso con opciones o texto.

**No**
- Formularios normales: `Field`.
- Hoy no lo usa ninguna pantalla de la app (sí el showcase). Si una lo adopta, se usa con el tema de `ui-theme.css`, sin CSS propio.

## Importación

```tsx
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoiceDescription,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@/components/ui/questionnaire"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireItem,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@/components/ui/questionnaire"

export function Ejemplo() {
  return (
    <Questionnaire items={[{ name: "color", choices: [{ value: "a" }, { value: "b" }] }]} onSubmit={(event) => event.preventDefault()}>
      <QuestionnaireItem name="color">
        <QuestionnaireTitle>Elige una opción</QuestionnaireTitle>
        <QuestionnaireChoices>
          <QuestionnaireChoice value="a">Primera</QuestionnaireChoice>
          <QuestionnaireChoice value="b">Segunda</QuestionnaireChoice>
        </QuestionnaireChoices>
      </QuestionnaireItem>
      <QuestionnaireActions>
        <QuestionnaireSubmit>Enviar</QuestionnaireSubmit>
      </QuestionnaireActions>
    </Questionnaire>
  )
}
```

## Variantes y tamaños

`QuestionnaireItem` `multiple`, `required`. `QuestionnaireInput` para texto. Navegación: `Previous`, `Skip`, `Next`, `Submit`.

## Estados

Renderiza todos los items: solo el activo se ve. `QuestionnaireError` muestra el error.

## Accesibilidad

Los textos por defecto ("Question 1 of 3", "Next") salen en inglés: pasa `children` en español.

## Tokens que usa

- `--background`, `--destructive`, `--input`, `--muted` (`text-muted-foreground`), `--primary-bright` (`bg-primary`), `--ring`, `--surface-soft` (`bg-muted`), `--ui-on-primary`
- Además: `--radius-*`, `--font-mono`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No definir un item en `items` y no renderizarlo (avisa en consola).
- No regenerar con `pnpm exec shadcn add questionnaire --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#questionnaire` (con `pnpm dev`).
