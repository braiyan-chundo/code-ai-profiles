import { Bubble, BubbleContent, BubbleGroup, BubbleReactions } from "@/components/ui/bubble";
import { Block, Sample } from "../ShowcaseSection";

const variantes = ["default", "secondary", "muted", "tinted", "outline", "ghost", "destructive"] as const;

export default function BubbleSection() {
  return (
    <>
      <Block title="Variantes">
        {variantes.map((variant) => (
          <Sample key={variant} label={variant}>
            <Bubble variant={variant}>
              <BubbleContent>Texto de ejemplo</BubbleContent>
            </Bubble>
          </Sample>
        ))}
      </Block>
      <Block title="Estados (align)">
        <Sample label='align="start"'>
          <Bubble variant="secondary" align="start">
            <BubbleContent>Al inicio</BubbleContent>
          </Bubble>
        </Sample>
        <Sample label='align="end"'>
          <Bubble variant="secondary" align="end">
            <BubbleContent>Al final</BubbleContent>
          </Bubble>
        </Sample>
        <Sample label="como botón (asChild)">
          <Bubble variant="outline">
            <BubbleContent asChild>
              <button type="button">Se puede pulsar</button>
            </BubbleContent>
          </Bubble>
        </Sample>
      </Block>
      <Block title="Composición">
        <Sample label="con reacciones">
          <Bubble variant="secondary" className="mb-4">
            <BubbleContent>Mensaje con reacciones</BubbleContent>
            <BubbleReactions>
              <span className="rounded-full border border-border bg-background px-2 text-xs">👍 2</span>
            </BubbleReactions>
          </Bubble>
        </Sample>
        <Sample label="grupo">
          <BubbleGroup>
            <Bubble variant="muted">
              <BubbleContent>Primera burbuja</BubbleContent>
            </Bubble>
            <Bubble variant="muted">
              <BubbleContent>Segunda burbuja</BubbleContent>
            </Bubble>
          </BubbleGroup>
        </Sample>
      </Block>
    </>
  );
}
