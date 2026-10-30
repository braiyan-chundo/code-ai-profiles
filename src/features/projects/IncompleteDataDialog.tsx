import { ClockIcon, EyeIcon, FileXIcon, TriangleAlertIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { CodeBlock, CodeBlockContent } from "../../components/ui/code-block";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { ScrollArea } from "../../components/ui/scroll-area";
import type { ProjectHistory } from "../../types";
import { CopyButton } from "./CopyButton";
import { incompleteGroups, metricsCommand, metricsCommands, type IncompleteGroup } from "./projects-detail";
import { formatTokens } from "./projects-format";
import { projectName, type ReadableProject } from "./projects-selectors";

const SECTION_TITLE = "flex items-center gap-2 text-(length:--fs-heading)/(--lh-heading) font-semibold";
const SECTION_TEXT = "text-(length:--fs-small)/(--lh-small) text-muted-foreground [&_b]:font-medium [&_b]:text-foreground";
const HISTORY_ID = "font-mono text-(length:--fs-small)/(--lh-small) text-muted-foreground";

function Section({ id, icon, title, count, action, children }: {
  id: string;
  icon: ReactNode;
  title: string;
  count: number;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="grid gap-3 not-first:border-t not-first:pt-6">
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h3 id={id} className={SECTION_TITLE}>
          {icon}
          {title}
          <Badge variant="secondary" className="font-mono">{count}</Badge>
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function WarningsSection({ group }: { group: Extract<IncompleteGroup, { kind: "warnings" }> }) {
  const total = group.warnings.length + group.hidden;
  return (
    <Section
      id="incomplete-warnings"
      icon={<TriangleAlertIcon aria-hidden="true" className="size-5 text-warning" />}
      title="Avisos"
      count={total}
    >
      <p className={SECTION_TEXT}>Lo que la app no pudo leer bien al recorrer el proyecto. Las cifras siguen siendo las que sí se leyeron.</p>
      <ul className="m-0 grid list-none gap-2 rounded-lg border border-warning/40 p-3 text-(length:--fs-small)/(--lh-small) text-warning">
        {group.warnings.map((warning, index) => (
          <li key={`${warning.scope}:${warning.target ?? ""}:${index}`} className="break-words">
            {warning.target && <span className="mr-2 font-mono">{warning.target}</span>}
            {warning.message}
          </li>
        ))}
        {group.hidden > 0 && <li className="font-medium">y {group.hidden} más</li>}
      </ul>
    </Section>
  );
}

function NoMetricsSection({ histories }: { histories: ProjectHistory[] }) {
  return (
    <Section
      id="incomplete-no-metrics"
      icon={<FileXIcon aria-hidden="true" className="size-5 text-muted-foreground" />}
      title="Sin métricas"
      count={histories.length}
      action={
        <CopyButton
          value={metricsCommands(histories)}
          label="Copiar todos"
          doneLabel="Copiados"
          ariaLabel={`Copiar los ${histories.length} comandos, uno por línea`}
          variant="ghost"
          size="sm"
          className="min-w-32"
        />
      }
    >
      <p className={SECTION_TEXT}>
        Están <b>terminadas</b> pero no tienen <code className="font-mono">metricas.json</code>, así que no suman tiempo ni tokens. Se pueden generar{" "}
        <b>en el proyecto</b>, con el comando de cada historia. Code AI Profiles no lo ejecuta: solo lee.
      </p>
      <ul className="m-0 grid list-none gap-2 p-0">
        {histories.map((history) => {
          const command = metricsCommand(history.folder);
          return (
            <li key={history.folder} className="flex items-center gap-3 rounded-lg border bg-(--surface-soft) p-3">
              <div className="grid min-w-0 flex-1 gap-2">
                <span className="truncate" title={history.title}>
                  <span className={`${HISTORY_ID} mr-2`}>{history.id}</span>
                  <span className="text-(length:--fs-body)/(--lh-body)">{history.title}</span>
                </span>
                <CodeBlock size="sm" className="rounded-sm">
                  <CodeBlockContent className="py-1 text-(length:--fs-small)/(--lh-small)">{command}</CodeBlockContent>
                </CodeBlock>
              </div>
              <CopyButton value={command} ariaLabel={`Copiar el comando de ${history.id}`} />
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function NoTimeSection({ histories }: { histories: ProjectHistory[] }) {
  return (
    <Section
      id="incomplete-no-time"
      icon={<ClockIcon aria-hidden="true" className="size-5 text-muted-foreground" />}
      title="Sin tiempo"
      count={histories.length}
    >
      <p className={SECTION_TEXT}>
        Se cerraron <b>sin pasar por las fases</b> del método, y el tiempo se calcula entre cambios de fase. <b>El dato no se puede recuperar.</b>{" "}
        Sus tokens sí suman en el proyecto (a la derecha).
      </p>
      <ul className="m-0 grid list-none gap-2 p-0">
        {histories.map((history) => (
          <li key={history.folder} className="flex h-(--ctl-lg) items-center gap-3 rounded-lg border px-3">
            <span className="min-w-0 flex-1 truncate" title={history.title}>
              <span className={`${HISTORY_ID} mr-2`}>{history.id}</span>
              <span className="text-(length:--fs-body)/(--lh-body)">{history.title}</span>
            </span>
            {history.tokens && (
              <span className="font-mono text-(length:--fs-small)/(--lh-small) text-muted-foreground">{formatTokens(history.tokens.total)}</span>
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}

/**
 * El modal «Datos incompletos» (HU-0025, A-5), de 640 px: cabecera y pie fijos y, en medio, el cuerpo con su scroll. Los
 * grupos van de lo más accionable a lo menos: Avisos (solo si hay), Sin métricas (con el comando de cada historia y
 * «Copiar todos») y Sin tiempo (sin acción: el dato no se recupera). Solo lee: nada se ejecuta ni se escribe en el proyecto.
 * Nada lo ocupa mientras está abierto, así que Escape, la X y el clic fuera cierran siempre.
 */
export function IncompleteDataDialog({ project, onClose }: { project: ReadableProject; onClose: () => void }) {
  const groups = incompleteGroups(project.info, project.warnings);
  const incomplete = project.info.histories.filter((history) => history.dataGaps.length > 0).length;
  const name = projectName(project);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[calc(100%-3rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-[640px]">
        <DialogHeader className="border-b px-6 pt-6 pb-4 pr-12">
          <DialogTitle>Datos incompletos</DialogTitle>
          <DialogDescription className="text-(length:--fs-small)/(--lh-small)">
            {incomplete > 0
              ? `${incomplete} ${incomplete === 1 ? "historia" : "historias"} de ${name} ${incomplete === 1 ? "tiene" : "tienen"} datos que la app no puede mostrar. Las cifras del proyecto suman solo las que sí los tienen.`
              : `La app encontró avisos al leer ${name}.`}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea type="always" className="min-h-0 [&>[data-slot=scroll-area-viewport]>div]:block!">
          <div className="grid gap-6 px-6 py-6">
            {groups.map((group) =>
              group.kind === "warnings" ? <WarningsSection key={group.kind} group={group} />
              : group.kind === "noMetrics" ? <NoMetricsSection key={group.kind} histories={group.histories} />
              : <NoTimeSection key={group.kind} histories={group.histories} />,
            )}
          </div>
        </ScrollArea>
        <div className="flex items-center justify-between gap-4 border-t px-6 py-4">
          <p className="flex min-w-0 items-center gap-2 text-(length:--fs-small)/(--lh-small) text-muted-foreground">
            <EyeIcon aria-hidden="true" className="size-4 shrink-0" />
            Solo lectura: la app no ejecuta ni escribe nada en el proyecto.
          </p>
          <Button variant="outline" size="lg" onClick={onClose}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
