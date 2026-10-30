//! Rama, SHA y fecha de cada repo leídos de `.git`, sin red y sin ejecutar `git` (A-1.5, D-5).
//!
//! No se leen objetos. La fecha es la de la última línea del reflog de la rama, solo si su SHA nuevo
//! coincide con el actual. Nombre, correo y mensaje de esa línea se descartan al parsear.

use super::*;
use chrono::{DateTime, FixedOffset};

fn git_result(
    status: ProjectGitStatus,
    branch: Option<String>,
    detached: bool,
    sha: Option<&str>,
    moved_at: Option<String>,
) -> ProjectGit {
    ProjectGit {
        status,
        branch,
        detached,
        short_sha: sha.map(|sha| sha[..7].to_string()),
        moved_at,
    }
}

fn unreadable(warnings: &mut Vec<ProjectWarning>, repo_name: &str, message: String) -> ProjectGit {
    warnings.push(ProjectWarning::new(
        ProjectWarningScope::Git,
        Some(repo_name),
        message,
    ));
    git_result(ProjectGitStatus::Unreadable, None, false, None, None)
}

pub(super) fn is_sha(value: &str) -> bool {
    (value.len() == 40 || value.len() == 64) && value.chars().all(|c| c.is_ascii_hexdigit())
}

/// Un nombre de rama que se puede usar como ruta relativa bajo `refs/heads` sin salir de ella.
pub(super) fn valid_branch(name: &str) -> bool {
    !name.is_empty()
        && name.len() <= 255
        && !name.contains("..")
        && !name.contains('\\')
        && !name.starts_with('/')
        && !name.ends_with('/')
        && !name.chars().any(|c| c.is_control() || c == ':')
        && name
            .split('/')
            .all(|component| !component.is_empty() && component != ".")
}

pub(super) enum Head {
    Branch(String),
    Detached(String),
}

pub(super) fn parse_head(text: &str) -> Option<Head> {
    let line = text.lines().next()?.trim();
    if let Some(reference) = line.strip_prefix("ref:") {
        let branch = reference.trim().strip_prefix("refs/heads/")?;
        return valid_branch(branch).then(|| Head::Branch(branch.to_string()));
    }
    is_sha(line).then(|| Head::Detached(line.to_ascii_lowercase()))
}

pub(super) fn packed_ref(text: &str, branch: &str) -> Option<String> {
    let wanted = format!("refs/heads/{branch}");
    text.lines()
        .filter(|line| !line.starts_with('#') && !line.starts_with('^'))
        .find_map(|line| {
            let (sha, name) = line.trim().split_once(' ')?;
            (name.trim() == wanted && is_sha(sha)).then(|| sha.to_ascii_lowercase())
        })
}

/// Última línea del reflog: `<viejo> <nuevo> <nombre> <<correo>> <segundos> <zona>\t<mensaje>`.
/// Devuelve el SHA nuevo y la fecha; el resto se descarta aquí mismo.
pub(super) fn last_reflog_entry(text: &str) -> Option<(String, Option<String>)> {
    let line = text.lines().rev().find(|line| !line.trim().is_empty())?;
    let identity = line.split('\t').next()?;
    let mut parts = identity.splitn(3, ' ');
    let _old = parts.next()?;
    let new = parts.next()?.to_ascii_lowercase();
    if !is_sha(&new) {
        return None;
    }
    let rest = parts.next().unwrap_or("");
    let moved_at = rest.rfind('>').and_then(|index| {
        let mut stamp = rest[index + 1..].split_whitespace();
        let seconds: i64 = stamp.next()?.parse().ok()?;
        let offset = parse_offset(stamp.next()?)?;
        DateTime::from_timestamp(seconds, 0).map(|utc| {
            utc.with_timezone(&offset)
                .to_rfc3339_opts(SecondsFormat::Secs, true)
        })
    });
    Some((new, moved_at))
}

fn parse_offset(zone: &str) -> Option<FixedOffset> {
    let (sign, digits) = match zone.as_bytes().first()? {
        b'+' => (1, &zone[1..]),
        b'-' => (-1, &zone[1..]),
        _ => return None,
    };
    if digits.len() != 4 || !digits.chars().all(|c| c.is_ascii_digit()) {
        return None;
    }
    let hours: i32 = digits[..2].parse().ok()?;
    let minutes: i32 = digits[2..].parse().ok()?;
    FixedOffset::east_opt(sign * (hours * 3_600 + minutes * 60))
}

pub(super) fn read_git(
    ctx: &ReadContext<'_>,
    repo: &Path,
    repo_name: &str,
    warnings: &mut Vec<ProjectWarning>,
) -> ProjectGit {
    let git = repo.join(".git");
    match ctx.entry(&git) {
        Ok(EntryKind::Directory) => {}
        Ok(EntryKind::File) => {
            return git_result(ProjectGitStatus::Unsupported, None, false, None, None);
        }
        Ok(EntryKind::Other) => {
            return unreadable(warnings, repo_name, ".git no es una carpeta.".to_string());
        }
        Err(Skip::Missing) => {
            return git_result(ProjectGitStatus::NoRepository, None, false, None, None);
        }
        Err(skip) => return unreadable(warnings, repo_name, format!(".git {}.", skip.reason())),
    }

    let head = match ctx.read(&git.join("HEAD"), ReadMode::Whole(GIT_SMALL_LIMIT)) {
        Ok(text) => parse_head(&text),
        Err(skip) => {
            return unreadable(warnings, repo_name, format!(".git/HEAD {}.", skip.reason()))
        }
    };
    let Some(head) = head else {
        return unreadable(
            warnings,
            repo_name,
            ".git/HEAD no apunta a una rama ni a un commit reconocible.".to_string(),
        );
    };

    let (branch, detached, sha, reflog) = match head {
        Head::Detached(sha) => (None, true, Some(sha), git.join("logs").join("HEAD")),
        Head::Branch(branch) => {
            let mut loose = git.join("refs").join("heads");
            let mut reflog = git.join("logs").join("refs").join("heads");
            for component in branch.split('/') {
                loose.push(component);
                reflog.push(component);
            }
            let sha = match ctx.read(&loose, ReadMode::Whole(GIT_SMALL_LIMIT)) {
                Ok(text) => {
                    let line = text.trim().to_ascii_lowercase();
                    is_sha(&line).then_some(line)
                }
                Err(_) => None,
            }
            .or_else(|| {
                ctx.read(&git.join("packed-refs"), ReadMode::Whole(PACKED_REFS_LIMIT))
                    .ok()
                    .and_then(|text| packed_ref(&text, &branch))
            });
            (Some(clean_text(&branch, TEXT_CHARS)), false, sha, reflog)
        }
    };

    let moved_at = sha.as_deref().and_then(|current| {
        let text = ctx.read(&reflog, ReadMode::Tail(REFLOG_TAIL)).ok()?;
        let (new, moved_at) = last_reflog_entry(&text)?;
        (new == current).then_some(moved_at).flatten()
    });
    git_result(
        ProjectGitStatus::Ok,
        branch,
        detached,
        sha.as_deref(),
        moved_at,
    )
}
