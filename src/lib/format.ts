export function formatBytes(value: number | null): string {
  if (value == null) return "No disponible";
  if (value === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index > 2 ? 1 : 0)} ${units[index]}`;
}

export function formatCaptureTime(value: number | null | undefined): string {
  if (value == null) return "Sin captura reciente";
  const timestamp = value < 10_000_000_000 ? value * 1000 : value;
  return `Última captura ${new Intl.DateTimeFormat("es", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(timestamp)}`;
}
