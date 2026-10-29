import { Link } from "react-router";
import { Badge } from "../../../components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "../../../components/ui/item";
import { usageRanking, useDashboard } from "../../../features/dashboard";
import { InstanceAvatar, InstanceStatusBadge, UsageBar, managedIconSource } from "../../../features/instances";
import { formatCaptureTime } from "../../../lib/format";

/** El uso de sesión y semanal de cada instancia, de más a menos (HU-0016, AC-02). Cada fila abre su página. */
export function UsageRanking() {
  const { dashboard: state, busy, iconPreviews } = useDashboard();
  const ranking = usageRanking(state.instances);
  return (
    <Card size="sm" role="region" aria-label="Uso por instancia">
      <CardHeader>
        <CardTitle className="text-(length:--fs-heading) font-semibold">Uso por instancia</CardTitle>
        <CardDescription className="text-xs">De más a menos uso; el mayor de los dos porcentajes manda.</CardDescription>
        <CardAction>
          <Badge variant="secondary" className="font-mono text-(length:--fs-micro) tracking-[0.06em] uppercase">
            {ranking.length} {ranking.length === 1 ? "perfil" : "perfiles"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ItemGroup role="group" aria-label="Instancias por uso" className="gap-2">
          {ranking.map((instance) => {
            const stopping = busy === `stop:${instance.id}`;
            return (
              <Item key={instance.id} asChild variant="outline" size="sm" className="flex-nowrap bg-(--surface-soft)">
                <Link to={`/instancias/${encodeURIComponent(instance.id)}`}>
                  <ItemMedia>
                    <InstanceAvatar
                      iconSrc={managedIconSource(instance, iconPreviews[instance.id] ?? null)}
                      status={instance.status}
                      stopping={stopping}
                      className="size-8 rounded-lg border border-(--line-strong) bg-secondary [&>svg]:size-5"
                    />
                  </ItemMedia>
                  <ItemContent className="min-w-0 basis-0 gap-1">
                    <ItemTitle className="flex w-full items-center gap-2">
                      <span className="truncate">{instance.name}</span>
                      <InstanceStatusBadge status={instance.status} stopping={stopping} className="shrink-0" />
                    </ItemTitle>
                    <ItemDescription className="truncate font-mono text-(length:--fs-small)">{formatCaptureTime(instance.usage?.capturedAt)}</ItemDescription>
                  </ItemContent>
                  <UsageBar label="Sesión" value={instance.usage?.sessionPercent ?? null} className="w-[34%] shrink-0 max-[1070px]:w-[38%]" />
                  <UsageBar label="Semanal" value={instance.usage?.weeklyPercent ?? null} className="w-[34%] shrink-0 max-[1070px]:w-[38%]" />
                </Link>
              </Item>
            );
          })}
        </ItemGroup>
      </CardContent>
    </Card>
  );
}
