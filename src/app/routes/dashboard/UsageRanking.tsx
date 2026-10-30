import { Link } from "react-router";
import { Badge } from "../../../components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "../../../components/ui/item";
import { usageRanking, useDashboard } from "../../../features/dashboard";
import {
  InstanceAvatar,
  InstanceStatusBadge,
  InstanceToggleButton,
  UsageBar,
  instancePending,
  instanceToggle,
  managedIconSource,
  useInstanceActions,
} from "../../../features/instances";
import { formatCaptureTime } from "../../../lib/format";

/**
 * El uso de sesión y semanal de cada instancia, de más a menos (HU-0016, AC-02). Cada fila abre su página y lleva al
 * final «Abrir»/«Detener» (HU-0026, A-4). La fila no es un `<a>`: el enlace del nombre la cubre entera
 * (`after:absolute after:inset-0`) y el botón queda por encima, así que su clic no navega.
 */
export function UsageRanking() {
  const { dashboard: state, busy, iconPreviews } = useDashboard();
  const { launch, stop } = useInstanceActions();
  const ranking = usageRanking(state.instances);
  const staleIds = new Set(state.system.versionTopology.staleInstanceIds);
  return (
    <Card size="sm" role="region" aria-label="Uso por instancia">
      <CardHeader>
        <CardTitle className="text-(length:--fs-heading)/(--lh-heading) font-semibold">Uso por instancia</CardTitle>
        <CardDescription className="text-xs">De más a menos uso; el mayor de los dos porcentajes manda.</CardDescription>
        <CardAction>
          <Badge variant="secondary" className="font-mono text-(length:--fs-micro)/(--lh-micro) tracking-[0.06em] uppercase">
            {ranking.length} {ranking.length === 1 ? "perfil" : "perfiles"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ItemGroup aria-label="Instancias por uso" className="gap-2">
          {ranking.map((instance) => {
            const pending = instancePending(busy, instance.id);
            const toggle = instanceToggle(instance, busy);
            return (
              <Item
                key={instance.id}
                role="listitem"
                variant="outline"
                size="sm"
                className="relative flex-nowrap gap-3 rounded-sm bg-(--surface-soft) hover:bg-muted has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring"
              >
                <ItemMedia>
                  <InstanceAvatar
                    iconSrc={managedIconSource(instance, iconPreviews[instance.id] ?? null)}
                    status={instance.status}
                    pending={pending}
                    className="size-8 rounded-sm bg-secondary ring-1 ring-(--line-strong) ring-inset [&>svg]:size-5"
                  />
                </ItemMedia>
                <ItemContent className="min-w-0 basis-0 gap-1">
                  <ItemTitle className="flex w-full flex-wrap items-center gap-x-2 gap-y-1">
                    <Link
                      to={`/instancias/${encodeURIComponent(instance.id)}`}
                      className="max-w-full truncate outline-none after:absolute after:inset-0 after:rounded-[inherit]"
                    >
                      {instance.name}
                    </Link>
                    <InstanceStatusBadge status={instance.status} pending={pending} className="shrink-0" />
                    {staleIds.has(instance.id) && (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-primary/30 font-mono text-(length:--fs-micro)/(--lh-micro) tracking-[0.04em] text-primary-text uppercase"
                        title="Esta instancia usa una versión anterior. Entra en ella para actualizarla."
                      >
                        Actualizar
                      </Badge>
                    )}
                  </ItemTitle>
                  <ItemDescription className="truncate font-mono text-(length:--fs-small)/(--lh-small)">{formatCaptureTime(instance.usage?.capturedAt)}</ItemDescription>
                </ItemContent>
                <UsageBar label="Sesión" value={instance.usage?.sessionPercent ?? null} className="pointer-events-none w-[26%] shrink-0 max-[1070px]:w-[24%]" />
                <UsageBar label="Semanal" value={instance.usage?.weeklyPercent ?? null} className="pointer-events-none w-[26%] shrink-0 max-[1070px]:w-[24%]" />
                <InstanceToggleButton
                  toggle={toggle}
                  onToggle={() => (toggle?.action === "stop" ? stop(instance) : launch(instance))}
                />
              </Item>
            );
          })}
        </ItemGroup>
      </CardContent>
    </Card>
  );
}
