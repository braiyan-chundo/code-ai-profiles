import { FolderOpenIcon, GitBranchIcon, GitCommitHorizontalIcon } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { cn } from "../../lib/utils";
import type { ProjectGit, ProjectInfo, ProjectRepo, ProjectRepoStatus } from "../../types";
import { formatRelative, formatRepoCount } from "./projects-format";
import { BADGE_MONO } from "./projects-styles";
import { repoTechnologies } from "./projects-detail";

const REPO_PROBLEM: Record<Exclude<ProjectRepoStatus, "ok">, string> = {
  missing: "No se encontró la carpeta del repo",
  outside: "La ruta sale de la carpeta del proyecto: no se lee",
  forbidden: "Ruta no permitida: no se lee",
  unreadable: "No se pudo leer el repo",
};

const SUB = "flex min-w-0 items-center gap-2 font-mono text-(length:--fs-small)/(--lh-small) text-muted-foreground";

/** La rama y el último commit de un repo (D-5): del reflog, sin red y sin el mensaje. */
function GitCell({ git, now }: { git: ProjectGit | null; now: Date }) {
  if (!git || git.status === "none") return <span className={SUB}>Sin git</span>;
  if (git.status === "unsupported") return <span className={SUB} title="Un worktree o submódulo: la app no lo lee">Git no compatible</span>;
  if (git.status === "unreadable") return <span className={SUB}>No se pudo leer .git</span>;
  const branch = git.branch ?? (git.detached ? "HEAD suelto" : "—");
  const commit = [git.shortSha, git.movedAt ? formatRelative(git.movedAt, now) : null].filter(Boolean).join(" · ");
  return (
    <>
      <span className={cn(SUB, "text-foreground")} title={branch}>
        <GitBranchIcon aria-hidden="true" className="size-4 shrink-0" />
        <span className="min-w-0 truncate">{branch}</span>
      </span>
      {commit && (
        <span className={SUB} title={commit}>
          <GitCommitHorizontalIcon aria-hidden="true" className="size-4 shrink-0" />
          <span className="min-w-0 truncate">{commit}</span>
        </span>
      )}
    </>
  );
}

function RepoRow({ repo, info, now }: { repo: ProjectRepo; info: ProjectInfo; now: Date }) {
  const technologies = repoTechnologies(info, repo.name);
  const problem = repo.status === "ok" ? null : REPO_PROBLEM[repo.status];
  return (
    <li className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,1.4fr)] items-center gap-4 rounded-sm border border-(--line) bg-(--surface-soft) p-3 max-[1070px]:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="grid min-w-0 gap-1">
        <span className="truncate font-mono text-(length:--fs-body)/(--lh-body) font-semibold" title={repo.name}>{repo.name}</span>
        <span className={SUB}>
          {repo.kind && <Badge variant="outline" className={cn(BADGE_MONO, "text-muted-foreground")}>{repo.kind}</Badge>}
          <span className="min-w-0 truncate" title={repo.path}>{repo.path === "." ? ". (raíz)" : repo.path}</span>
        </span>
      </div>
      <div className="grid min-w-0 gap-1">
        {problem ? (
          <span className="text-(length:--fs-small)/(--lh-small) text-warning">{problem}</span>
        ) : (
          <span className="truncate text-(length:--fs-small)/(--lh-small) text-foreground" title={technologies}>{technologies || "—"}</span>
        )}
      </div>
      {!problem && (
        <div className="grid min-w-0 gap-1 max-[1070px]:col-span-2 max-[1070px]:grid-cols-2">
          <GitCell git={repo.git} now={now} />
        </div>
      )}
    </li>
  );
}

/** Los repos del proyecto (AC-03): nombre, tipo y ruta, sus tecnologías y su rama y último commit. */
export function ProjectRepos({ info, now, className }: { info: ProjectInfo; now: Date; className?: string }) {
  return (
    <Card aria-label="Repos" className={cn("gap-4", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-(length:--fs-heading)/(--lh-heading) font-semibold">
          <FolderOpenIcon aria-hidden="true" className="size-5 text-muted-foreground" /> Repos
        </CardTitle>
        <CardDescription className="text-(length:--fs-small)/(--lh-small)">
          De <code className="font-mono">.metodo/config.json</code>; la rama y el último commit, de cada{" "}
          <code className="font-mono">.git</code>, sin red.
        </CardDescription>
        <CardAction>
          <Badge variant="secondary" className={BADGE_MONO}>{formatRepoCount(info.repos.length)}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="gap-0">
        {info.repos.length === 0 ? (
          <p className="text-(length:--fs-small)/(--lh-small) text-muted-foreground">La config no declara ningún repo.</p>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0">
            {info.repos.map((repo) => <RepoRow key={`${repo.name}:${repo.path}`} repo={repo} info={info} now={now} />)}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
