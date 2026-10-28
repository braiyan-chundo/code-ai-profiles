import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Block, Sample } from "../ShowcaseSection";

const datos = [
  { dia: "Lun", sesion: 40, semana: 24 },
  { dia: "Mar", sesion: 62, semana: 38 },
  { dia: "Mié", sesion: 35, semana: 51 },
  { dia: "Jue", sesion: 78, semana: 60 },
  { dia: "Vie", sesion: 55, semana: 72 },
];

const config = {
  sesion: { label: "Sesión (ejemplo)", color: "var(--chart-1)" },
  semana: { label: "Semana (ejemplo)", color: "var(--chart-2)" },
} satisfies ChartConfig;

export default function ChartSection() {
  return (
    <>
      <Block title="Variantes">
        <Sample label="barras">
          <ChartContainer config={config} className="h-48 w-80">
            <BarChart data={datos} accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="dia" tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="sesion" fill="var(--color-sesion)" radius={4} />
              <Bar dataKey="semana" fill="var(--color-semana)" radius={4} />
            </BarChart>
          </ChartContainer>
        </Sample>
        <Sample label="líneas">
          <ChartContainer config={config} className="h-48 w-80">
            <LineChart data={datos} accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="dia" tickLine={false} axisLine={false} padding={{ left: 16, right: 16 }} />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Line dataKey="sesion" stroke="var(--color-sesion)" strokeWidth={2} dot={false} />
              <Line dataKey="semana" stroke="var(--color-semana)" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </Sample>
      </Block>
      <Block title="Estados">
        <Sample label="sin datos">
          <ChartContainer config={config} className="h-32 w-80">
            <BarChart data={[]}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="dia" />
            </BarChart>
          </ChartContainer>
        </Sample>
      </Block>
    </>
  );
}
