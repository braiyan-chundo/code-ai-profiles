import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Block, Sample } from "../ShowcaseSection";

const colores = ["bg-chart-1/30", "bg-chart-2/30", "bg-chart-3/30", "bg-chart-4/30", "bg-chart-5/30"];

function Diapositivas({ basis }: { basis?: string }) {
  return (
    <CarouselContent>
      {colores.map((color, index) => (
        <CarouselItem key={color} className={basis}>
          <div className={`flex aspect-video items-center justify-center rounded-xl text-sm text-foreground ${color}`}>Bloque {index + 1}</div>
        </CarouselItem>
      ))}
    </CarouselContent>
  );
}

export default function CarouselSection() {
  return (
    <>
      <Block title="Variantes (orientation)">
        <Sample label="horizontal">
          <Carousel className="mx-10 w-64">
            <Diapositivas />
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </Sample>
        <Sample label="varios por vista (basis-1/2)">
          <Carousel className="mx-10 w-72" opts={{ align: "start" }}>
            <Diapositivas basis="basis-1/2" />
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </Sample>
        <Sample label="vertical">
          <Carousel orientation="vertical" className="my-10 w-48" opts={{ align: "start" }}>
            <CarouselContent className="h-40">
              {colores.map((color, index) => (
                <CarouselItem key={color} className="basis-full">
                  <div className={`flex h-36 items-center justify-center rounded-xl text-sm text-foreground ${color}`}>Bloque {index + 1}</div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </Sample>
      </Block>
    </>
  );
}
