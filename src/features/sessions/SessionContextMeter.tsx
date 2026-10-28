import type { CodeSession } from "../../types";
import { Progress } from "../../components/ui/progress";
import { cn } from "../../lib/utils";
import { formatTokenCount, sessionContextLevel, type SessionContextLevel } from "./session-format";

const LEVEL_TEXT: Record<SessionContextLevel, string> = {
  normal: "text-success",
  elevated: "text-warning",
  critical: "text-destructive",
  unknown: "text-(--quiet)",
};
const LEVEL_BAR: Record<SessionContextLevel, string> = {
  normal: "[&>[data-slot=progress-indicator]]:bg-success",
  elevated: "[&>[data-slot=progress-indicator]]:bg-warning",
  critical: "[&>[data-slot=progress-indicator]]:bg-destructive",
  unknown: "[&>[data-slot=progress-indicator]]:bg-transparent",
};

/** El contexto estimado de una sesión: tokens, límite y porcentaje, con una barra si el límite del modelo se conoce. */
export function SessionContextMeter({ session }: { session: CodeSession }) {
  const tokens = session.contextTokens ?? null;
  const windowTokens = session.contextWindowTokens ?? null;
  const percent = session.contextPercent ?? null;
  const hasKnownLimit = windowTokens != null && percent != null;
  const level = sessionContextLevel(hasKnownLimit ? percent : null);
  const progress = Math.min(100, Math.max(0, percent ?? 0));
  const description = level === "critical"
    ? "Considera compactar o crear otra sesión"
    : level === "elevated"
      ? "Contexto elevado"
      : level === "normal"
        ? "Contexto saludable"
        : tokens != null
          ? "Límite no identificado para este modelo"
          : "Disponible tras la próxima respuesta";
  const accessibleLabel = tokens == null
    ? "Contexto sin datos"
    : hasKnownLimit
      ? `Contexto usado: ${Math.round(percent)}%, ${tokens} de ${windowTokens} tokens`
      : `${tokens} tokens usados. Límite no identificado para este modelo`;
  const formatter = new Intl.NumberFormat("es-CO");

  return (
    <div
      data-level={level}
      className="grid gap-[5px] font-mono text-(length:--session-context-size) leading-[1.1] font-semibold"
      title={tokens == null
        ? "La aplicación aún no registra uso de contexto para esta sesión"
        : hasKnownLimit
          ? `${formatter.format(tokens)} de ${formatter.format(windowTokens)} tokens de contexto`
          : `${formatter.format(tokens)} tokens usados. Límite no identificado para este modelo`}
      aria-label={accessibleLabel}
    >
      <div className={cn("flex items-center justify-between gap-2", level === "unknown" ? "text-(--quiet)" : "text-muted-foreground")}>
        <span className="truncate">
          {tokens == null
            ? "Contexto sin datos"
            : `${formatTokenCount(tokens)}${hasKnownLimit ? ` de ${formatTokenCount(windowTokens)}` : " tokens"}`}
        </span>
        {hasKnownLimit && <strong className={cn("shrink-0 font-[inherit]", LEVEL_TEXT[level])}>{Math.round(percent)}%</strong>}
      </div>
      {hasKnownLimit && (
        <Progress
          value={progress}
          aria-label={`Contexto usado: ${Math.round(percent)}%`}
          aria-valuenow={Math.round(progress)}
          className={cn("h-(--session-track-height)", LEVEL_BAR[level])}
        />
      )}
      <small
        className={cn(
          "text-(length:--session-hint-size) font-medium",
          level === "elevated" || level === "critical" ? LEVEL_TEXT[level] : "text-(--quiet)",
        )}
      >
        {description}
      </small>
    </div>
  );
}
