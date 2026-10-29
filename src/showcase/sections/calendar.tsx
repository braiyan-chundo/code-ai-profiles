import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { es } from "react-day-picker/locale";
import { Calendar } from "@/components/ui/calendar";
import { Block, Sample } from "../ShowcaseSection";

export default function CalendarSection() {
  const [day, setDay] = useState<Date | undefined>(new Date(2026, 9, 15));
  const [range, setRange] = useState<DateRange | undefined>({ from: new Date(2026, 9, 12), to: new Date(2026, 9, 17) });
  return (
    <>
      <Block title="Variantes (mode)">
        <Sample label="single">
          <Calendar locale={es} mode="single" selected={day} onSelect={setDay} defaultMonth={new Date(2026, 9)} className="rounded-xl border border-border" />
        </Sample>
        <Sample label="range">
          <Calendar locale={es} mode="range" selected={range} onSelect={setRange} defaultMonth={new Date(2026, 9)} className="rounded-xl border border-border" />
        </Sample>
      </Block>
      <Block title="Estados">
        <Sample label="días deshabilitados (fines de semana)">
          <Calendar locale={es} mode="single" defaultMonth={new Date(2026, 9)} disabled={{ dayOfWeek: [0, 6] }} className="rounded-xl border border-border" />
        </Sample>
        <Sample label="sin días fuera del mes">
          <Calendar locale={es} mode="single" showOutsideDays={false} defaultMonth={new Date(2026, 9)} className="rounded-xl border border-border" />
        </Sample>
      </Block>
    </>
  );
}
