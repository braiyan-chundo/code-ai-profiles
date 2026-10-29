import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Block, Sample } from "../ShowcaseSection";

export default function SliderSection() {
  const [value, setValue] = useState([40]);
  return (
    <>
      <Block title="Variantes">
        <Sample label="un valor">
          <Slider defaultValue={[50]} max={100} step={1} className="w-64" aria-label="Valor" />
        </Sample>
        <Sample label="rango">
          <Slider defaultValue={[20, 70]} max={100} step={1} className="w-64" aria-label="Rango" />
        </Sample>
        <Sample label="vertical">
          <Slider defaultValue={[60]} max={100} orientation="vertical" className="h-32" aria-label="Valor vertical" />
        </Sample>
      </Block>
      <Block title="Estados">
        <Sample label="controlado">
          <Slider value={value} onValueChange={setValue} max={100} className="w-64" aria-label="Valor controlado" />
          <span className="text-xs text-muted-foreground">Valor: {value[0]}</span>
        </Sample>
        <Sample label="deshabilitado">
          <Slider defaultValue={[30]} max={100} disabled className="w-64" aria-label="Valor deshabilitado" />
        </Sample>
      </Block>
    </>
  );
}
