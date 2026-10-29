import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Block, Sample } from "../ShowcaseSection";

export default function AspectRatioSection() {
  return (
    <>
      <Block title="Variantes (ratio)">
        {[
          { ratio: 16 / 9, label: "16 / 9" },
          { ratio: 1, label: "1 / 1" },
          { ratio: 4 / 3, label: "4 / 3" },
        ].map(({ ratio, label }) => (
          <Sample key={label} label={`ratio={${label}}`}>
            <div className="w-48">
              <AspectRatio ratio={ratio}>
                <div className="flex size-full items-center justify-center rounded-xl bg-chart-1/30 text-sm">{label}</div>
              </AspectRatio>
            </div>
          </Sample>
        ))}
      </Block>
    </>
  );
}
