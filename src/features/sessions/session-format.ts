export function formatSessionTime(value: number | null, now: number = Date.now()): string {
  if (value == null) return "Sin actividad registrada";
  const timestamp = value < 10_000_000_000 ? value * 1000 : value;
  const elapsed = Math.max(0, now - timestamp);
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "Ahora mismo";
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Hace ${days} d`;
  return new Intl.DateTimeFormat("es", { day: "numeric", month: "short" }).format(timestamp);
}

export type SessionContextLevel = "normal" | "elevated" | "critical" | "unknown";

export function sessionContextLevel(value: number | null | undefined): SessionContextLevel {
  if (value == null) return "unknown";
  if (value >= 90) return "critical";
  if (value >= 70) return "elevated";
  return "normal";
}

export function formatTokenCount(value: number | null | undefined): string {
  if (value == null) return "Sin datos";
  if (value >= 1_000_000) {
    const amount = value / 1_000_000;
    return `${amount.toFixed(Number.isInteger(amount) ? 0 : 1)}M`;
  }
  if (value >= 1_000) {
    const amount = value / 1_000;
    return `${amount.toFixed(value >= 100_000 || Number.isInteger(amount) ? 0 : 1)}k`;
  }
  return `${value}`;
}

export function formatModelName(value: string | null | undefined): string {
  if (!value) return "Modelo no registrado";
  const normalized = value.toLowerCase();
  const family = normalized.includes("opus")
    ? "Opus"
    : normalized.includes("sonnet")
      ? "Sonnet"
      : normalized.includes("haiku")
        ? "Haiku"
        : null;
  const version = normalized.match(/(?:opus|sonnet|haiku)-(\d+)-(\d+)/);
  if (family && version) return `${family} ${version[1]}.${version[2]}`;
  return value;
}
