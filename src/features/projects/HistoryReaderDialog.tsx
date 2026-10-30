import { EyeIcon, FileTextIcon, RefreshCwIcon, TriangleAlertIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { NoticeAlert } from "../../components/NoticeAlert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../../components/ui/empty";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Skeleton } from "../../components/ui/skeleton";
import { Spinner } from "../../components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { bridge } from "../../lib/bridge";
import { friendlyError } from "../../lib/errors";
import { cn } from "../../lib/utils";
import type { ProjectDocument, ProjectDocumentKind, ProjectHistory, ProjectHistoryDocuments } from "../../types";
import { GapTag } from "./GapTag";
import { HistoryMarkdown } from "./HistoryMarkdown";
import { readerBody } from "./history-reader";
import { STATE_LABEL } from "./projects-detail";
import { formatDay, formatPhase } from "./projects-format";
import { BADGE_MONO } from "./projects-styles";
import { StateDot } from "./StateBar";

type Load =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: ProjectHistoryDocuments };

const GAP_LABEL = { noTime: "Sin tiempo", noMetrics: "Sin métricas" } as const;
const BODY_SCROLL = "min-h-0 [&>[data-slot=scroll-area-viewport]>div]:block!";

/** El cuerpo de una pestaña ilegible: qué pasó (el mensaje de Rust) y «Reintentar». */
function UnreadableDocument({ document, retrying, onRetry }: { document: ProjectDocument; retrying: boolean; onRetry: () => void }) {
  return (
    <Empty aria-label={`${document.file} no se pudo leer`} className="m-6 w-auto flex-none gap-4 rounded-xl border border-dashed bg-(--surface-soft)">
      <EmptyHeader className="max-w-md gap-2">
        <EmptyMedia variant="icon" className="rounded-md text-warning ring-1 ring-(--line) ring-inset">
          <TriangleAlertIcon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle className="text-(length:--fs-heading)/(--lh-heading) font-semibold">No se pudo leer <span className="font-mono">{document.file}</span></EmptyTitle>
        <EmptyDescription className="text-(length:--fs-small)/(--lh-small)">
          {document.message ?? "El archivo no se pudo leer."} Las otras pestañas siguen disponibles.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" disabled={retrying} onClick={onRetry}>
          {retrying ? <Spinner aria-hidden="true" /> : <RefreshCwIcon aria-hidden="true" />} Reintentar
        </Button>
      </EmptyContent>
    </Empty>
  );
}

function LoadingBody() {
  return (
    <div aria-busy="true" aria-label="Cargando la historia" role="status" className="grid max-w-[720px] gap-4 px-6 py-6">
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-4/5" />
      <Skeleton className="mt-4 h-6 w-1/3" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-11/12" />
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

/**
 * El lector de una historia (HU-0025, A-5): `hu.md`, `arquitectura.md`, `verificacion.md` y `seguimiento.md` en pestañas,
 * de solo lectura. Pide los archivos a Rust al abrir y en «Reintentar»; una respuesta que llega después de cerrar, de
 * cambiar de historia o de reintentar se descarta. El contenido vive solo en el estado de este diálogo: no pasa por un
 * store, `localStorage` ni la URL, y se suelta al cerrar. Se carga con `lazy` porque trae `react-markdown`.
 * Nada lo deja ocupado, así que Escape, la X y el clic fuera cierran siempre.
 */
export default function HistoryReaderDialog({
  projectId,
  history,
  onClose,
}: {
  projectId: string;
  history: ProjectHistory;
  onClose: () => void;
}) {
  const { folder } = history;
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<ProjectDocumentKind | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let current = true;
    // El primer pedido enseña el esqueleto; un «Reintentar» conserva lo que se ve hasta que llegue la respuesta.
    if (attempt === 0) setLoad({ status: "loading" });
    bridge
      .readProjectHistory(projectId, folder)
      .then((data) => {
        if (!current) return;
        setLoad({ status: "ready", data });
        setRetrying(false);
      })
      .catch((reason: unknown) => {
        if (!current) return;
        setLoad({ status: "error", message: friendlyError(reason) });
        setRetrying(false);
      });
    return () => {
      current = false;
    };
  }, [projectId, folder, attempt]);

  const retry = useCallback(() => {
    setRetrying(true);
    setAttempt((value) => value + 1);
  }, []);
  const openLink = useCallback((href: string) => {
    setLinkError(null);
    bridge.openExternalLink(href).catch((reason: unknown) => setLinkError(friendlyError(reason)));
  }, []);

  const documents = load.status === "ready" ? load.data.documents : [];
  const active = documents.find((document) => document.kind === selected) ?? documents[0];

  const meta = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-(length:--fs-small)/(--lh-small) text-muted-foreground">
      <span className="inline-flex items-center gap-2 text-foreground">
        <StateDot state={history.state} />
        {STATE_LABEL[history.state]}
      </span>
      {history.phase && <Badge variant="outline" className={BADGE_MONO}>{formatPhase(history.phase)}</Badge>}
      {history.area && <Badge variant="outline" className={BADGE_MONO}>{history.area}</Badge>}
      {history.created && <span>Creada el {formatDay(history.created)}</span>}
      {history.dataGaps.map((gap) => <GapTag key={gap}>{GAP_LABEL[gap]}</GapTag>)}
    </div>
  );

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        aria-busy={load.status === "loading"}
        className="h-[calc(100%-3rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-[960px]"
      >
        <Tabs
          value={active?.kind ?? ""}
          onValueChange={(next) => setSelected(next as ProjectDocumentKind)}
          // `contents`: la cabecera con las pestañas y el cuerpo son dos filas de la cuadrícula del diálogo.
          className="contents"
        >
          <DialogHeader className="gap-3 border-b px-6 pt-6 pr-12 pb-4">
            <div className="grid gap-1">
              <span className="font-mono text-(length:--fs-small)/(--lh-small) text-muted-foreground">{history.id}</span>
              <DialogTitle className="text-(length:--fs-title)/(--lh-title) tracking-[-0.02em]">{history.title}</DialogTitle>
              <DialogDescription className="sr-only">
                Lectura de los archivos de la historia {history.id}. Solo lectura: no se puede editar nada desde aquí.
              </DialogDescription>
            </div>
            {meta}
            {load.status === "loading" ? (
              <div aria-hidden="true" className="flex gap-2">
                <Skeleton className="h-(--ctl-sm) w-24" />
                <Skeleton className="h-(--ctl-sm) w-36" />
                <Skeleton className="h-(--ctl-sm) w-36" />
              </div>
            ) : documents.length > 0 ? (
              <TabsList aria-label="Archivos de la historia" className="h-(--ctl-sm) max-w-full flex-wrap">
                {documents.map((document) => (
                  <TabsTrigger
                    key={document.kind}
                    value={document.kind}
                    title={document.status === "unreadable" ? `${document.file}: no se pudo leer` : document.file}
                    className="flex-none font-mono text-(length:--fs-small)/(--lh-small)"
                  >
                    {document.status === "unreadable" && <TriangleAlertIcon aria-label="No se pudo leer" className="text-warning" />}
                    {document.file}
                  </TabsTrigger>
                ))}
              </TabsList>
            ) : null}
          </DialogHeader>

          <ScrollArea key={active?.kind ?? load.status} type="always" className={BODY_SCROLL}>
            {load.status === "loading" ? (
              <LoadingBody />
            ) : load.status === "error" ? (
              <Empty aria-label="No se pudo leer la historia" className="m-6 w-auto flex-none gap-4 rounded-xl border border-dashed bg-(--surface-soft)">
                <EmptyHeader className="max-w-md gap-2">
                  <EmptyMedia variant="icon" className="rounded-md text-destructive ring-1 ring-(--line) ring-inset">
                    <TriangleAlertIcon aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle className="text-(length:--fs-heading)/(--lh-heading) font-semibold">No se pudo leer la historia</EmptyTitle>
                  <EmptyDescription className="text-(length:--fs-small)/(--lh-small)">{load.message}</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button variant="outline" disabled={retrying} onClick={retry}>
                    {retrying ? <Spinner aria-hidden="true" /> : <RefreshCwIcon aria-hidden="true" />} Reintentar
                  </Button>
                </EmptyContent>
              </Empty>
            ) : active ? (
              <TabsContent value={active.kind} className="outline-none">
                {active.status === "ok" && active.content !== null ? (
                  <div className="px-6 py-6">
                    <HistoryMarkdown content={readerBody(active.content, history.title)} onOpenLink={openLink} />
                  </div>
                ) : (
                  <UnreadableDocument document={active} retrying={retrying} onRetry={retry} />
                )}
              </TabsContent>
            ) : (
              <Empty aria-label="Sin archivos" className="m-6 w-auto flex-none gap-4 rounded-xl border border-dashed bg-(--surface-soft)">
                <EmptyHeader className="max-w-md gap-2">
                  <EmptyMedia variant="icon" className="rounded-md ring-1 ring-(--line) ring-inset"><FileTextIcon aria-hidden="true" /></EmptyMedia>
                  <EmptyTitle className="text-(length:--fs-heading)/(--lh-heading) font-semibold">Esta historia no tiene archivos que leer</EmptyTitle>
                  <EmptyDescription className="text-(length:--fs-small)/(--lh-small)">
                    No hay <span className="font-mono">hu.md</span> ni los demás archivos en su carpeta.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </ScrollArea>
        </Tabs>

        <div className="grid gap-3 border-t px-6 py-4">
          {linkError && (
            <NoticeAlert
              variant="destructive"
              icon={<TriangleAlertIcon aria-hidden="true" />}
              title="No se pudo abrir el enlace"
              action={
                <Button variant="ghost" size="icon-sm" onClick={() => setLinkError(null)} aria-label="Cerrar aviso">
                  <XIcon />
                </Button>
              }
            >
              {linkError}
            </NoticeAlert>
          )}
          <div className="flex items-center justify-between gap-4">
            <p className={cn("flex min-w-0 items-center gap-2 text-(length:--fs-small)/(--lh-small) text-muted-foreground")}>
              <EyeIcon aria-hidden="true" className="size-4 shrink-0" />
              <span className="shrink-0">Solo lectura</span>
              {active && <span className="min-w-0 truncate font-mono" title={active.path}>· {active.path}</span>}
            </p>
            <Button variant="outline" size="lg" onClick={onClose}>Cerrar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
