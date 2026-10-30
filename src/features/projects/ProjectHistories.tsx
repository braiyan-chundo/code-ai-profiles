import { ListFilterIcon } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { cn } from "../../lib/utils";
import type { ProjectHistory, ProjectInfo } from "../../types";
import { GapTag } from "./GapTag";
import { StateDot } from "./StateBar";
import { formatDay, formatMinutes, formatPhase, formatTokens } from "./projects-format";
import { EYEBROW } from "./projects-styles";
import { historyFilters, historyRows, STATE_LABEL, STATE_TAB, type HistoryFilter } from "./projects-detail";

const NUMBER = "text-right font-mono text-(length:--fs-small)/(--lh-small)";
const HEAD = cn(EYEBROW, "h-auto px-3 pb-2 align-bottom");

/** Una celda de tiempo o de tokens: «—» sin dato; tachada y en gris si la historia no suma (descartada). */
function Figure({ text, struck }: { text: string | null; struck: boolean }) {
  return (
    <TableCell className={cn(NUMBER, "px-3 py-0", text === null ? "text-muted-foreground" : struck && "text-muted-foreground line-through decoration-(--quiet)")}>
      {text ?? "—"}
    </TableCell>
  );
}

/**
 * Una fila: la historia entera abre el lector. El clic va en la fila; el teclado y los lectores de pantalla entran por el
 * botón de la primera celda, cuyo clic sube hasta la fila (un solo manejador, sin `role` en un `tr`).
 */
function HistoryRow({ history, onOpen }: { history: ProjectHistory; onOpen: (folder: string) => void }) {
  const struck = !history.countsInTotals;
  const noMetrics = history.dataGaps.includes("noMetrics");
  const noTime = history.dataGaps.includes("noTime");
  const title = [history.id, history.title, history.created ? `creada el ${formatDay(history.created)}` : null].filter(Boolean).join(" · ");
  return (
    <TableRow
      className="h-(--ctl-lg) cursor-pointer focus-within:bg-muted/50"
      title={history.state === "discarded" ? "Descartada: no suma en los totales" : undefined}
      onClick={() => onOpen(history.folder)}
    >
      <TableCell className="overflow-hidden p-0 text-ellipsis" title={title}>
        <button
          type="button"
          aria-haspopup="dialog"
          className="block h-(--ctl-lg) w-full cursor-pointer truncate rounded-sm px-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          <span className="mr-2 font-mono text-(length:--fs-small)/(--lh-small) text-muted-foreground">{history.id}</span>
          <span className="text-(length:--fs-body)/(--lh-body)">{history.title}</span>
        </button>
      </TableCell>
      <TableCell className="px-3 py-0">
        <span className={cn("inline-flex items-center gap-2 text-(length:--fs-small)/(--lh-small)", history.state === "discarded" && "text-muted-foreground")}>
          <StateDot state={history.state} />
          {STATE_LABEL[history.state]}
        </span>
      </TableCell>
      <TableCell className="px-3 py-0 text-(length:--fs-body)/(--lh-body)">{history.phase ? formatPhase(history.phase) : "—"}</TableCell>
      <TableCell className="overflow-hidden px-3 py-0 text-ellipsis text-(length:--fs-small)/(--lh-small) text-muted-foreground max-[1070px]:hidden">{history.area ?? "—"}</TableCell>
      {noMetrics ? (
        <TableCell colSpan={2} className="px-3 py-0 text-right"><GapTag>Sin métricas</GapTag></TableCell>
      ) : (
        <>
          {noTime ? (
            <TableCell className="px-3 py-0 text-right"><GapTag>Sin tiempo</GapTag></TableCell>
          ) : (
            <Figure text={history.minutes === null ? null : formatMinutes(history.minutes)} struck={struck && history.minutes !== null} />
          )}
          <Figure text={history.tokens === null ? null : formatTokens(history.tokens.total)} struck={struck && history.tokens !== null} />
        </>
      )}
    </TableRow>
  );
}

/**
 * La tabla de historias con su filtro por estado (AC-03 y AC-04). Las columnas son 4/2/2/2/1/1 de la retícula de 12 (el
 * Área se oculta por debajo de 1071 px y las cifras pasan a 2/12). Las descartadas siguen en la tabla con su tiempo y sus
 * tokens tachados en gris: no suman. El título completo y la fecha de creación van en el título emergente de la fila. Una
 * terminada sin tiempo o sin métricas lleva la etiqueta de lo que falta (HU-0025); pulsar una fila abre el lector.
 */
export function ProjectHistories({ info, className, onOpenHistory }: { info: ProjectInfo; className?: string; onOpenHistory: (folder: string) => void }) {
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const tabs = historyFilters(info.counts);
  // Si el estado filtrado dejó de existir al releer (p. ej. «Sin estado»), vuelve a «Todas».
  const current = tabs.some((tab) => tab.value === filter) ? filter : "all";
  const rows = historyRows(info.histories, current);
  const { totals } = info;
  const exact = totals.histories === info.counts.done;
  return (
    <Card aria-label="Historias" className={className}>
      <Tabs value={current} onValueChange={(next) => setFilter(next as HistoryFilter)} className="gap-4">
        <CardHeader className="grid-cols-[minmax(0,1fr)_auto] max-[1070px]:grid-cols-1">
          <CardTitle className="col-start-1 flex items-center gap-2 text-(length:--fs-heading)/(--lh-heading) font-semibold">
            <ListFilterIcon aria-hidden="true" className="size-5 text-muted-foreground" /> Historias
          </CardTitle>
          <CardDescription className="col-start-1 text-(length:--fs-small)/(--lh-small)">
            De <code className="font-mono">hu/</code>. Tiempo y tokens aparecen al cerrar la historia. Pulsa una historia para leerla.
          </CardDescription>
          <TabsList
            aria-label="Filtrar historias por estado"
            className="col-start-2 row-span-2 row-start-1 h-(--ctl-sm) max-w-full flex-wrap max-[1070px]:col-start-1 max-[1070px]:row-span-1 max-[1070px]:row-start-3"
          >
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="flex-none gap-2 text-(length:--fs-small)/(--lh-small)">
                {tab.value !== "all" && <StateDot state={tab.value} />}
                {tab.value === "all" ? "Todas" : STATE_TAB[tab.value]}
                <em className="font-mono text-(length:--fs-micro)/(--lh-micro) font-semibold text-muted-foreground not-italic">{tab.count}</em>
              </TabsTrigger>
            ))}
          </TabsList>
        </CardHeader>
        <CardContent className="gap-2">
          <TabsContent value={current}>
            <Table containerClassName="-mx-3 w-[calc(100%+24px)]" className="table-fixed">
              <colgroup>
                <col className="w-4/12" />
                <col className="w-2/12" />
                <col className="w-2/12" />
                <col className="w-2/12 max-[1070px]:hidden" />
                <col className="w-1/12 max-[1070px]:w-2/12" />
                <col className="w-1/12 max-[1070px]:w-2/12" />
              </colgroup>
              <TableHeader>
                <TableRow className="border-(--line-strong) hover:bg-transparent">
                  <TableHead className={HEAD}>Historia</TableHead>
                  <TableHead className={HEAD}>Estado</TableHead>
                  <TableHead className={HEAD}>Fase</TableHead>
                  <TableHead className={cn(HEAD, "max-[1070px]:hidden")}>Área</TableHead>
                  <TableHead className={cn(HEAD, "text-right")}>Tiempo</TableHead>
                  <TableHead className={cn(HEAD, "text-right")}>Tokens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="h-(--ctl-lg) px-3 py-0 text-(length:--fs-small)/(--lh-small) text-muted-foreground">
                      {info.counts.total === 0 ? "Este proyecto aún no tiene historias en hu/." : "Ninguna historia en este estado."}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((history) => <HistoryRow key={history.folder} history={history} onOpen={onOpenHistory} />)
                )}
              </TableBody>
            </Table>
          </TabsContent>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 pt-2 text-(length:--fs-small)/(--lh-small) text-muted-foreground">
            <span>
              {current === "all" ? `${rows.length} historias` : `${rows.length} de ${info.counts.total} historias`}, de la más reciente a la más antigua
            </span>
            <span>
              {totals.histories > 0
                ? `Suman las ${totals.histories} terminadas${exact ? "" : " con métricas"}: ${formatMinutes(totals.minutes)} · ${formatTokens(totals.tokens.total)}.${info.counts.discarded > 0 ? " Las descartadas, en gris, no suman." : ""}`
                : "Aún no hay historias terminadas con métricas."}
            </span>
          </div>
        </CardContent>
      </Tabs>
    </Card>
  );
}
