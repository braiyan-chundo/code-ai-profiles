import type { ReactNode } from "react";
import { Card, CardContent } from "../../../components/ui/card";
import { countCodeSessions, countRunning, originalAppName as selectOriginalAppName, useDashboard } from "../../../features/dashboard";
import { formatBytes } from "../../../lib/format";
import { cn } from "../../../lib/utils";

/**
 * Las cifras del dashboard (HU-0016, A-15): instancias, en marcha, sesiones de Code y versión de la aplicación original
 * (las de la toolbar de antes), más el almacenamiento administrado y libre.
 */
export function SummaryCards() {
  const { dashboard: state } = useDashboard();
  const running = countRunning(state.instances);
  const sourceFound = Boolean(state.system.sourcePath);
  return (
    <section aria-label="Resumen" className="grid grid-cols-6 gap-3 min-[1071px]:grid-cols-5">
      <Stat wide label="Instancias" value={`${state.instances.length}`} hint={state.instances.length === 1 ? "perfil administrado" : "perfiles administrados"} />
      <Stat
        wide
        label="En marcha"
        value={`${running}`}
        hint={`de ${state.instances.length} ${state.instances.length === 1 ? "instancia" : "instancias"}`}
        live={running > 0}
      />
      <Stat wide label="Sesiones Code" value={`${countCodeSessions(state)}`} hint="en instancias y original" />
      <Stat
        label="Aplicación original"
        value={state.system.sourceVersion ?? "No detectada"}
        hint={sourceFound ? selectOriginalAppName(state.system) : "Escanea el sistema"}
        warning={!sourceFound}
      />
      <Stat label="Almacenamiento" value={formatBytes(state.system.managedBytes)} hint={`${formatBytes(state.system.freeBytes)} libres`} />
    </section>
  );
}

function Stat({
  label,
  value,
  hint,
  live = false,
  warning = false,
  wide = false,
}: {
  label: string;
  value: ReactNode;
  hint: string;
  live?: boolean;
  warning?: boolean;
  /** En ventana estrecha (la cuadrícula de 6 columnas): tres de ancho 2 arriba y dos de ancho 3 abajo. */
  wide?: boolean;
}) {
  return (
    <Card size="sm" className={cn("min-w-0 gap-0 min-[1071px]:col-span-1", wide ? "col-span-2" : "col-span-3")}>
      <CardContent className="gap-2">
        <span className="flex items-center gap-2 text-(length:--fs-micro)/(--lh-micro) font-bold tracking-[0.08em] text-muted-foreground uppercase">
          {live && <span aria-hidden="true" className="size-1.5 rounded-full bg-(--primary) shadow-[0_0_6px_var(--primary)]" />}
          {label}
        </span>
        <strong className={cn("truncate font-mono text-(length:--fs-figure)/(--lh-figure) font-semibold tracking-[-0.05em] text-foreground", warning && "text-primary-text")}>
          {value}
        </strong>
        <span className="truncate text-(length:--fs-small)/(--lh-small) text-muted-foreground">{hint}</span>
      </CardContent>
    </Card>
  );
}
