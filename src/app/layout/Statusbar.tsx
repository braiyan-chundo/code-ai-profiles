import { HardDriveIcon } from "lucide-react";
import { originalAppName as selectOriginalAppName, useDashboard, useRuntimePlatform } from "../../features/dashboard";
import { formatBytes } from "../../lib/format";
import { cn } from "../../lib/utils";

/** La barra inferior (HU-0016): salud de la aplicación compatible, espacio, refresco, build y plataforma. */
export function Statusbar() {
  const { dashboard: state, loading } = useDashboard();
  const runtimePlatform = useRuntimePlatform();
  const originalAppName = selectOriginalAppName(state.system);
  const buildLabel = state.system.appVersion || (loading ? "cargando…" : "no disponible");
  const healthy = Boolean(state.system.sourcePath);
  return (
    <footer className="row-start-4 flex h-13 shrink-0 items-center justify-between gap-4 border-t border-border bg-(--surface-soft)/60 px-[38px] text-(length:--fs-micro) text-muted-foreground max-[1070px]:h-12 max-[1070px]:px-[25px]">
      <div className="flex min-w-0 items-center gap-[18px]">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 font-bold tracking-[0.16em]",
            healthy ? "text-primary-text" : "text-destructive",
          )}
        >
          <Dot />
          {healthy ? `${originalAppName.toLocaleUpperCase()} DETECTADA` : "APLICACIÓN COMPATIBLE NO DETECTADA"}
        </span>
        <Divider />
        <span className="inline-flex items-center gap-1.5">
          <HardDriveIcon className="size-3.5" aria-hidden="true" /> {formatBytes(state.system.freeBytes)} libres
        </span>
        <Divider className="max-[1070px]:hidden" />
        <span className="inline-flex items-center gap-1.5 max-[1070px]:hidden">
          {formatBytes(state.system.managedBytes)} administrados
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3.5 font-mono text-(length:--fs-micro) leading-none font-medium tracking-[0.14em]">
        <span>AUTO · 60S</span>
        <Dot className="size-[5px] text-primary-text/60" />
        <span aria-label={`Versión de Code AI Profiles ${buildLabel}`}>BUILD {buildLabel}</span>
        <Dot className="size-[5px] text-primary-text/60" />
        <span>{runtimePlatform.toUpperCase()}</span>
      </div>
    </footer>
  );
}

function Dot({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full bg-current", className)} />;
}

function Divider({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("h-[18px] w-px shrink-0 bg-border", className)} />;
}
