import type { ComponentProps, ReactNode } from "react";
import { ArrowRightLeftIcon, ClockIcon, TerminalSquareIcon, UnlinkIcon } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from "../../components/ui/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "../../components/ui/item";
import { cn } from "../../lib/utils";
import type { CodeSession } from "../../types";
import { SessionContextMeter } from "./SessionContextMeter";
import { formatModelName, formatSessionTime } from "./session-format";

/**
 * Las sesiones de Code de un perfil (una instancia o la aplicación original): título, modelo, turnos, actividad,
 * contexto y, por sesión, transferir y, si es una copia o un movimiento, desvincular o devolver. `disabled` bloquea
 * los botones (la página de una instancia lo activa con su operación en curso; la de la original no).
 */
export function SessionList({
  sessions,
  emptyLabel,
  disabled = false,
  onTransfer,
  onUnlink,
}: {
  sessions: CodeSession[];
  emptyLabel: string;
  disabled?: boolean;
  onTransfer: (session: CodeSession) => void;
  onUnlink: (session: CodeSession) => void;
}) {
  if (sessions.length === 0) {
    return (
      <Empty className="rounded-sm p-6 ring-1 ring-border ring-inset">
        <EmptyHeader>
          <EmptyMedia variant="icon"><ClockIcon /></EmptyMedia>
          <EmptyDescription>{emptyLabel}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ItemGroup className="gap-3">
      {sessions.map((session) => (
        <SessionItem key={session.id} session={session} role="listitem">
          {session.isArchived && <SessionBadge>Archivada</SessionBadge>}
          {session.transfer && (
            <SessionBadge tone={session.transfer.mode}>{session.transfer.mode === "move" ? "Movida" : "Copia"}</SessionBadge>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            onClick={() => onTransfer(session)}
            title="Transferir sesión a otro perfil"
            aria-label={`Transferir “${session.title}” a otro perfil`}
          >
            <ArrowRightLeftIcon />
          </Button>
          {session.transfer && (
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={disabled}
              onClick={() => onUnlink(session)}
              title={session.transfer.mode === "move" ? "Devolver a la instancia de origen" : "Desvincular esta copia"}
              aria-label={session.transfer.mode === "move" ? `Devolver “${session.title}” a su origen` : `Desvincular copia de “${session.title}”`}
            >
              <UnlinkIcon />
            </Button>
          )}
        </SessionItem>
      ))}
    </ItemGroup>
  );
}

/**
 * Una sesión: título, modelo, turnos, actividad y contexto, con la escala `--fs-*`. `children` son sus
 * acciones a la derecha. La usan `SessionList` y la vista previa de `AppearanceSettings`.
 */
export function SessionItem({
  session,
  children,
  className,
  ...props
}: Omit<ComponentProps<typeof Item>, "children"> & { session: CodeSession; children?: ReactNode }) {
  return (
    <Item variant="outline" size="sm" title={session.title} className={cn("flex-nowrap rounded-sm bg-(--surface-soft)", className)} {...props}>
      <ItemMedia variant="icon" className="size-8 rounded-sm bg-muted text-muted-foreground ring-1 ring-border ring-inset">
        <TerminalSquareIcon />
      </ItemMedia>
      <ItemContent className="min-w-0 gap-2">
        <ItemTitle className="block max-w-full truncate text-(length:--fs-body)/(--lh-body) font-semibold">
          {session.title}
        </ItemTitle>
        <ItemDescription className="line-clamp-none flex flex-wrap items-center gap-x-2 font-mono text-(length:--fs-small)/(--lh-small)">
          <span>{formatModelName(session.model)}</span>
          <Separator />
          <span>{session.completedTurns} {session.completedTurns === 1 ? "turno" : "turnos"}</span>
          <Separator />
          <span>{formatSessionTime(session.lastActivityAt)}</span>
        </ItemDescription>
        <SessionContextMeter session={session} />
      </ItemContent>
      {children && <ItemActions className="shrink-0 gap-2 self-center">{children}</ItemActions>}
    </Item>
  );
}

function Separator() {
  return <span aria-hidden="true" className="size-1 rounded-full bg-(--quiet)" />;
}

function SessionBadge({ tone, children }: { tone?: "copy" | "move"; children: string }) {
  return (
    <Badge
      variant="outline"
      data-mode={tone}
      className="h-auto font-mono text-(length:--fs-micro)/(--lh-micro) font-semibold tracking-[0.06em] text-muted-foreground uppercase data-[mode=copy]:border-primary/25 data-[mode=copy]:text-primary-text data-[mode=move]:border-success/30 data-[mode=move]:text-success"
    >
      {children}
    </Badge>
  );
}
