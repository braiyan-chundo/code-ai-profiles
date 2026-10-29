import { Progress } from "@/components/ui/progress";
import { Block, Sample } from "../ShowcaseSection";

export default function ProgressSection() {
  return (
    <>
      <Block title="Variantes (valor)">
        {[0, 35, 70, 100].map((value) => (
          <Sample key={value} label={`value={${value}}`}>
            <Progress value={value} className="w-56" aria-label={`Progreso ${value} por ciento`} />
          </Sample>
        ))}
      </Block>
      <Block title="Estados">
        <Sample label="sin valor (indeterminado)">
          <Progress className="w-56" aria-label="Progreso sin valor" />
        </Sample>
      </Block>
    </>
  );
}
