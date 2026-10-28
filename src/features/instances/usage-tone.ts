/** El color de la barra de uso según lo cerca que está el límite: 70 % es «alto» y 90 % «crítico». */
export function usageTone(progress: number): string {
  if (progress >= 90) return "[&>[data-slot=progress-indicator]]:bg-destructive";
  if (progress >= 70) return "[&>[data-slot=progress-indicator]]:bg-primary";
  return "[&>[data-slot=progress-indicator]]:bg-muted-foreground";
}
