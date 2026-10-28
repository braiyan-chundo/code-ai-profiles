import type { CodeSession } from "../../types";
import { formatTokenCount, sessionContextLevel } from "./session-format";

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

  return (
    <div
      className={`session-context context-${level}`}
      title={tokens == null
        ? "La aplicación aún no registra uso de contexto para esta sesión"
        : hasKnownLimit
          ? `${new Intl.NumberFormat("es-CO").format(tokens)} de ${new Intl.NumberFormat("es-CO").format(windowTokens)} tokens de contexto`
          : `${new Intl.NumberFormat("es-CO").format(tokens)} tokens usados. Límite no identificado para este modelo`}
      aria-label={accessibleLabel}
    >
      <div className="session-context-heading">
        <span>
          {tokens == null
            ? "Contexto sin datos"
            : `${formatTokenCount(tokens)}${hasKnownLimit ? ` de ${formatTokenCount(windowTokens)}` : " tokens"}`}
        </span>
        {hasKnownLimit && <strong>{Math.round(percent)}%</strong>}
      </div>
      {hasKnownLimit && (
        <div
          className="session-context-track"
          role="meter"
          aria-label={`Contexto usado: ${Math.round(percent)}%`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
      )}
      <small>{description}</small>
    </div>
  );
}
