export function friendlyError(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === "string") return reason;
  return "Ocurrió un error inesperado.";
}
