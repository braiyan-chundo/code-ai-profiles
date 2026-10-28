import { useState } from "react";
import { Questionnaire, QuestionnaireActions, QuestionnaireChoice, QuestionnaireChoiceDescription, QuestionnaireChoices, QuestionnaireDescription, QuestionnaireInput, QuestionnaireItem, QuestionnaireNext, QuestionnairePrevious, QuestionnaireProgress, QuestionnaireSkip, QuestionnaireSubmit, QuestionnaireTitle } from "@/components/ui/questionnaire";
import { Block, Sample } from "../ShowcaseSection";

const items = [
  { name: "color", choices: [{ value: "a" }, { value: "b" }, { value: "c" }], required: true },
  { name: "varias", choices: [{ value: "x" }, { value: "y" }] },
  { name: "nota" },
] as const;

export default function QuestionnaireSection() {
  const [actual, setActual] = useState("color");
  const indice = items.findIndex((item) => item.name === actual) + 1;
  return (
    <>
      <Block title="Variantes (una pregunta por paso)" className="items-stretch">
        <Sample label="navegación, opción única, múltiple y texto" className="items-stretch">
          <Questionnaire className="max-w-md" items={items} item={actual} onItemChange={setActual} onSubmit={(event) => event.preventDefault()}>
            <QuestionnaireProgress>
              Pregunta {indice} de {items.length}
            </QuestionnaireProgress>
            <QuestionnaireItem name="color" required>
              <QuestionnaireTitle>Elige una opción de ejemplo</QuestionnaireTitle>
              <QuestionnaireDescription>Opción única, obligatoria.</QuestionnaireDescription>
              <QuestionnaireChoices>
                <QuestionnaireChoice value="a">
                  Primera opción
                  <QuestionnaireChoiceDescription>Texto de apoyo de ejemplo.</QuestionnaireChoiceDescription>
                </QuestionnaireChoice>
                <QuestionnaireChoice value="b">Segunda opción</QuestionnaireChoice>
                <QuestionnaireChoice value="c">Tercera opción</QuestionnaireChoice>
              </QuestionnaireChoices>
            </QuestionnaireItem>
            <QuestionnaireItem name="varias" multiple>
              <QuestionnaireTitle>Elige varias (ejemplo)</QuestionnaireTitle>
              <QuestionnaireChoices>
                <QuestionnaireChoice value="x">Opción X</QuestionnaireChoice>
                <QuestionnaireChoice value="y">Opción Y</QuestionnaireChoice>
              </QuestionnaireChoices>
            </QuestionnaireItem>
            <QuestionnaireItem name="nota">
              <QuestionnaireTitle>Añade una nota de ejemplo</QuestionnaireTitle>
              <QuestionnaireInput placeholder="Texto libre" aria-label="Nota de ejemplo" />
            </QuestionnaireItem>
            <QuestionnaireActions>
              <QuestionnairePrevious>Anterior</QuestionnairePrevious>
              <QuestionnaireSkip>Omitir</QuestionnaireSkip>
              <QuestionnaireNext>Siguiente</QuestionnaireNext>
              <QuestionnaireSubmit>Enviar</QuestionnaireSubmit>
            </QuestionnaireActions>
          </Questionnaire>
        </Sample>
      </Block>
    </>
  );
}
