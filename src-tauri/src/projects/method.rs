//! Archivos del método v4: config, frontmatter de `hu.md`, `metricas.json` y bitácora (A-1.1-A-1.4).
//!
//! El frontmatter se lee con un parser propio, portado de `leerFm`/`escalar`/`lista`/`objeto` de
//! `hu.mjs` (YAML plano), sin dependencias. De la bitácora solo se extrae la fecha de cada fila.

use super::*;

pub(super) struct RepoEntry {
    pub(super) name: String,
    pub(super) path: Option<String>,
    pub(super) kind: Option<String>,
}

pub(super) struct ConfigFields {
    pub(super) name: String,
    pub(super) slug: Option<String>,
    pub(super) summary: Option<String>,
    pub(super) profile: Option<String>,
    pub(super) phase: Option<String>,
    pub(super) approver: Option<String>,
    pub(super) package_manager: Option<String>,
    pub(super) packs: Vec<String>,
    pub(super) repos: Vec<RepoEntry>,
}

fn pointer<'v>(config: &'v Value, field: &str) -> Option<&'v Value> {
    let pointer = format!("/{}", field.replace('.', "/"));
    config.pointer(&pointer).filter(|value| !value.is_null())
}

/// Un texto de la config: ausente o de otro tipo → `None` con aviso por campo.
fn config_text(
    config: &Value,
    field: &str,
    max_chars: usize,
    warnings: &mut Vec<ProjectWarning>,
) -> Option<String> {
    match pointer(config, field) {
        Some(Value::String(text)) => {
            Some(clean_text(text, max_chars)).filter(|text| !text.is_empty())
        }
        Some(_) => {
            warnings.push(ProjectWarning::new(
                ProjectWarningScope::Config,
                Some(field),
                "El campo no es texto; se muestra vacío.",
            ));
            None
        }
        None => {
            warnings.push(ProjectWarning::new(
                ProjectWarningScope::Config,
                Some(field),
                "Falta el campo en la configuración; se muestra vacío.",
            ));
            None
        }
    }
}

pub(super) fn config_fields(
    config: &Value,
    folder_name: &str,
    max_repos: usize,
    warnings: &mut Vec<ProjectWarning>,
) -> ConfigFields {
    let name = match pointer(config, "proyecto.nombre") {
        Some(Value::String(text)) if !text.trim().is_empty() => clean_text(text, TEXT_CHARS),
        _ => {
            warnings.push(ProjectWarning::new(
                ProjectWarningScope::Config,
                Some("proyecto.nombre"),
                "Falta el nombre del proyecto; se usa el de la carpeta.",
            ));
            folder_name.to_string()
        }
    };
    let slug = config_text(config, "proyecto.slug", TEXT_CHARS, warnings);
    let summary = config_text(config, "proyecto.resumen", SUMMARY_CHARS, warnings);
    let profile = config_text(config, "perfil", TEXT_CHARS, warnings);
    let phase = config_text(config, "fase", TEXT_CHARS, warnings);
    let approver = config_text(config, "figuras.aprueba", TEXT_CHARS, warnings);
    let package_manager = config_text(config, "stack.gestor", TEXT_CHARS, warnings);

    let packs = match pointer(config, "stack.packs") {
        Some(Value::Array(items)) => {
            if items.iter().any(|item| !item.is_string()) {
                warnings.push(ProjectWarning::new(
                    ProjectWarningScope::Config,
                    Some("stack.packs"),
                    "Algún pack no es texto y se omite.",
                ));
            }
            items
                .iter()
                .filter_map(Value::as_str)
                .map(|pack| clean_text(pack, TEXT_CHARS))
                .filter(|pack| !pack.is_empty())
                .collect()
        }
        Some(_) => {
            warnings.push(ProjectWarning::new(
                ProjectWarningScope::Config,
                Some("stack.packs"),
                "El campo no es una lista; no se muestran packs.",
            ));
            Vec::new()
        }
        None => Vec::new(),
    };

    let repos = match pointer(config, "repos") {
        Some(Value::Array(items)) => {
            if items.len() > max_repos {
                warnings.push(ProjectWarning::new(
                    ProjectWarningScope::Limit,
                    Some("repos"),
                    format!(
                        "El proyecto declara {} repos; solo se leen los primeros {max_repos}.",
                        items.len()
                    ),
                ));
            }
            items
                .iter()
                .take(max_repos)
                .enumerate()
                .map(|(index, item)| repo_entry(item, index, warnings))
                .collect()
        }
        Some(_) => {
            warnings.push(ProjectWarning::new(
                ProjectWarningScope::Config,
                Some("repos"),
                "El campo no es una lista; no se muestran repos.",
            ));
            Vec::new()
        }
        None => {
            warnings.push(ProjectWarning::new(
                ProjectWarningScope::Config,
                Some("repos"),
                "Falta la lista de repos en la configuración.",
            ));
            Vec::new()
        }
    };

    ConfigFields {
        name,
        slug,
        summary,
        profile,
        phase,
        approver,
        package_manager,
        packs,
        repos,
    }
}

fn repo_entry(item: &Value, index: usize, warnings: &mut Vec<ProjectWarning>) -> RepoEntry {
    let text = |key: &str| {
        item.get(key)
            .and_then(Value::as_str)
            .map(|text| clean_text(text, TEXT_CHARS))
            .filter(|text| !text.is_empty())
    };
    // La ruta se usa tal cual (sin recortar) para resolverla; solo se limpia al mostrarla.
    let path = item
        .get("ruta")
        .and_then(Value::as_str)
        .filter(|path| !path.trim().is_empty() && !path.chars().any(char::is_control))
        .map(|path| path.trim().to_string());
    let name = text("nombre")
        .or_else(|| path.as_deref().map(|path| clean_text(path, TEXT_CHARS)))
        .unwrap_or_else(|| format!("repo {}", index + 1));
    if text("nombre").is_none() {
        warnings.push(ProjectWarning::new(
            ProjectWarningScope::Config,
            Some(&format!("repos[{index}].nombre")),
            "El repo no tiene nombre en la configuración.",
        ));
    }
    RepoEntry {
        name,
        path,
        kind: text("tipo"),
    }
}

// ── Frontmatter (YAML plano: escalares, [listas], { objetos }) ──────────────

#[derive(Debug, Clone, PartialEq, Eq)]
pub(super) enum FmValue {
    Null,
    Text(String),
    List(Vec<FmValue>),
    Object(Vec<(String, FmValue)>),
}

impl FmValue {
    fn text(&self) -> Option<&str> {
        match self {
            FmValue::Text(text) => Some(text),
            _ => None,
        }
    }
}

/// `escalar` de `hu.mjs`: `true`/`false` y los enteros quedan como texto (solo se leen como texto).
fn scalar(raw: &str) -> FmValue {
    let value = raw.trim();
    if value.is_empty() || value == "~" || value == "null" {
        return FmValue::Null;
    }
    let digits = value.strip_prefix('-').unwrap_or(value);
    if !digits.is_empty() && digits.chars().all(|character| character.is_ascii_digit()) {
        return FmValue::Text(
            value
                .parse::<i64>()
                .map(|number| number.to_string())
                .unwrap_or_else(|_| value.to_string()),
        );
    }
    let value = value.strip_prefix(['"', '\'']).unwrap_or(value);
    let value = value.strip_suffix(['"', '\'']).unwrap_or(value);
    FmValue::Text(value.to_string())
}

fn list(raw: &str) -> FmValue {
    let inner = raw.trim();
    let inner = inner.strip_prefix('[').unwrap_or(inner);
    let inner = inner.strip_suffix(']').unwrap_or(inner).trim();
    if inner.is_empty() {
        return FmValue::List(Vec::new());
    }
    FmValue::List(
        inner
            .split(',')
            .map(scalar)
            .filter(|value| *value != FmValue::Null)
            .collect(),
    )
}

fn object(raw: &str) -> FmValue {
    let inner = raw.trim();
    let inner = inner.strip_prefix('{').unwrap_or(inner);
    let inner = inner.strip_suffix('}').unwrap_or(inner).trim();
    let mut pairs = Vec::new();
    if !inner.is_empty() {
        for pair in inner.split(',') {
            if let Some(index) = pair.find(':').filter(|index| *index > 0) {
                pairs.push((pair[..index].trim().to_string(), scalar(&pair[index + 1..])));
            }
        }
    }
    FmValue::Object(pairs)
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(super) enum FrontmatterError {
    Missing,
    Unclosed,
}

/// `leerFm`: `^---\n([\s\S]*?)\n---`. Recibe el texto ya sin BOM y con `\n`.
pub(super) fn parse_frontmatter(text: &str) -> Result<Vec<(String, FmValue)>, FrontmatterError> {
    let Some(rest) = text.strip_prefix("---\n") else {
        return Err(FrontmatterError::Missing);
    };
    let end = rest.find("\n---").ok_or(FrontmatterError::Unclosed)?;
    let block = &rest[..end];
    let mut fields = Vec::new();
    for line in block.split('\n') {
        if line.trim().is_empty() || line.trim_start().starts_with('#') {
            continue;
        }
        let Some(index) = line.find(':') else {
            continue;
        };
        let key = line[..index].trim().to_string();
        let raw = line[index + 1..].trim();
        let value = if raw.starts_with('[') {
            list(raw)
        } else if raw.starts_with('{') {
            object(raw)
        } else {
            scalar(raw)
        };
        fields.push((key, value));
    }
    Ok(fields)
}

fn field<'f>(fields: &'f [(String, FmValue)], key: &str) -> Option<&'f str> {
    fields
        .iter()
        .rev()
        .find(|(name, _)| name == key)
        .and_then(|(_, value)| value.text())
}

// ── Historias ───────────────────────────────────────────────────────────────

fn is_history_folder(name: &str) -> bool {
    let bytes = name.as_bytes();
    bytes.len() >= 7
        && name.starts_with("HU-")
        && bytes[3..7].iter().all(u8::is_ascii_digit)
        && (bytes.len() == 7 || bytes[7] == b'-')
}

/// Carpetas `hu/HU-####(-…)` con `hu.md`, ordenadas por nombre, como `historias()` de `hu.mjs`.
pub(super) fn history_folders(
    ctx: &ReadContext<'_>,
    max_histories: usize,
    warnings: &mut Vec<ProjectWarning>,
) -> Vec<String> {
    let mut folders = match ctx.list_dir(Path::new("hu")) {
        Ok(entries) => entries
            .into_iter()
            .filter(|name| is_history_folder(name))
            .collect::<Vec<_>>(),
        Err(Skip::Missing) => return Vec::new(),
        Err(skip) => {
            warnings.push(ProjectWarning::new(
                ProjectWarningScope::History,
                Some("hu"),
                format!("La carpeta de historias {}.", skip.reason()),
            ));
            return Vec::new();
        }
    };
    folders.sort();
    let mut present: Vec<String> = folders
        .into_iter()
        .filter(|folder| {
            !matches!(
                ctx.entry(&Path::new("hu").join(folder).join("hu.md")),
                Err(Skip::Missing)
            )
        })
        .collect();
    if present.len() > max_histories {
        warnings.push(ProjectWarning::new(
            ProjectWarningScope::Limit,
            Some("hu"),
            format!(
                "El proyecto tiene {} historias; solo se leen las primeras {max_histories}.",
                present.len()
            ),
        ));
        present.truncate(max_histories);
    }
    present
}

pub(super) struct HistoryRead {
    pub(super) history: ProjectHistory,
    pub(super) roles: Vec<(String, TokenBreakdown)>,
    pub(super) orchestrator: Option<(TokenBreakdown, bool)>,
    pub(super) last_activity: Option<NaiveDateTime>,
}

fn history_state(raw: Option<&str>) -> Option<ProjectHistoryState> {
    match raw? {
        "en-espera" => Some(ProjectHistoryState::Waiting),
        "en-proceso" => Some(ProjectHistoryState::InProgress),
        "terminada" => Some(ProjectHistoryState::Done),
        "descartada" => Some(ProjectHistoryState::Discarded),
        _ => None,
    }
}

pub(super) fn read_histories(
    ctx: &ReadContext<'_>,
    max_histories: usize,
    warnings: &mut Vec<ProjectWarning>,
) -> Vec<HistoryRead> {
    history_folders(ctx, max_histories, warnings)
        .into_iter()
        .map(|folder| read_history(ctx, &folder, warnings))
        .collect()
}

fn read_history(
    ctx: &ReadContext<'_>,
    folder: &str,
    warnings: &mut Vec<ProjectWarning>,
) -> HistoryRead {
    let base = Path::new("hu").join(folder);
    let prefix = &folder[..7];
    let mut history = ProjectHistory {
        id: prefix.to_string(),
        folder: clean_text(folder, TEXT_CHARS),
        title: prefix.to_string(),
        state: ProjectHistoryState::Unknown,
        phase: None,
        area: None,
        priority: None,
        created: None,
        minutes: None,
        tokens: None,
        counts_in_totals: false,
    };
    let target = Some(prefix);

    match ctx.read(&base.join("hu.md"), ReadMode::Head(FRONTMATTER_LIMIT)) {
        Ok(text) => match parse_frontmatter(&text) {
            Ok(fields) => {
                if let Some(id) = field(&fields, "id").filter(|id| !id.trim().is_empty()) {
                    history.id = clean_text(id, TEXT_CHARS);
                }
                if let Some(title) =
                    field(&fields, "titulo").filter(|title| !title.trim().is_empty())
                {
                    history.title = clean_text(title, TITLE_CHARS);
                } else {
                    warnings.push(ProjectWarning::new(
                        ProjectWarningScope::History,
                        target,
                        "La historia no tiene «titulo» en su encabezado.",
                    ));
                }
                match history_state(field(&fields, "estado")) {
                    Some(state) => history.state = state,
                    None => warnings.push(ProjectWarning::new(
                        ProjectWarningScope::History,
                        target,
                        "El estado de la historia no es uno de los cuatro del método; cuenta como desconocido.",
                    )),
                }
                let text_field = |key: &str| {
                    field(&fields, key)
                        .map(|value| clean_text(value, TEXT_CHARS))
                        .filter(|value| !value.is_empty())
                };
                history.phase = text_field("fase");
                history.area = text_field("area");
                history.priority = text_field("prioridad");
                match field(&fields, "creada") {
                    Some(created) if parse_day(created.trim()).is_some() => {
                        history.created = Some(created.trim().to_string());
                    }
                    Some(_) => warnings.push(ProjectWarning::new(
                        ProjectWarningScope::History,
                        target,
                        "La fecha «creada» no tiene el formato AAAA-MM-DD.",
                    )),
                    None => {}
                }
            }
            Err(FrontmatterError::Missing) => warnings.push(ProjectWarning::new(
                ProjectWarningScope::History,
                target,
                "hu.md no empieza con el encabezado del método (---).",
            )),
            Err(FrontmatterError::Unclosed) => warnings.push(ProjectWarning::new(
                ProjectWarningScope::History,
                target,
                "El encabezado de hu.md no se cierra con --- en los primeros 64 KiB.",
            )),
        },
        Err(skip) => warnings.push(ProjectWarning::new(
            ProjectWarningScope::History,
            target,
            format!("hu.md {}.", skip.reason()),
        )),
    }

    let mut roles = Vec::new();
    let mut orchestrator = None;
    match ctx.read(&base.join("metricas.json"), ReadMode::Whole(METRICS_LIMIT)) {
        Ok(text) => match parse_metrics(&text) {
            Ok(metrics) => {
                if metrics.missing_numbers > 0 {
                    warnings.push(ProjectWarning::new(
                        ProjectWarningScope::Metrics,
                        target,
                        format!(
                            "Faltan {} cifras en metricas.json; cuentan como 0.",
                            metrics.missing_numbers
                        ),
                    ));
                }
                history.minutes = Some(metrics.minutes);
                history.tokens = Some(metrics.tokens);
                history.counts_in_totals = history.state == ProjectHistoryState::Done;
                roles = metrics.roles;
                orchestrator = metrics.orchestrator;
            }
            Err(message) => warnings.push(ProjectWarning::new(
                ProjectWarningScope::Metrics,
                target,
                message,
            )),
        },
        Err(Skip::Missing) => {
            if history.state == ProjectHistoryState::Done {
                warnings.push(ProjectWarning::new(
                    ProjectWarningScope::Metrics,
                    target,
                    "La historia está terminada pero no tiene metricas.json; no suma en los totales.",
                ));
            }
        }
        Err(skip) => warnings.push(ProjectWarning::new(
            ProjectWarningScope::Metrics,
            target,
            format!("metricas.json {}.", skip.reason()),
        )),
    }

    let last_activity = match ctx.read(&base.join("seguimiento.md"), ReadMode::Tail(TIMELINE_TAIL))
    {
        Ok(text) => last_timeline_entry(&text),
        Err(Skip::Missing) => None,
        Err(skip) => {
            warnings.push(ProjectWarning::new(
                ProjectWarningScope::Timeline,
                target,
                format!("seguimiento.md {}.", skip.reason()),
            ));
            None
        }
    };

    HistoryRead {
        history,
        roles,
        orchestrator,
        last_activity,
    }
}

// ── Métricas ────────────────────────────────────────────────────────────────

pub(super) struct Metrics {
    pub(super) minutes: u64,
    pub(super) tokens: TokenBreakdown,
    pub(super) roles: Vec<(String, TokenBreakdown)>,
    pub(super) orchestrator: Option<(TokenBreakdown, bool)>,
    pub(super) missing_numbers: usize,
}

fn number(value: Option<&Value>, missing: &mut usize) -> u64 {
    match value {
        Some(value) => {
            if let Some(number) = value.as_u64() {
                return number;
            }
            match value.as_f64() {
                Some(number) if number.is_finite() && number >= 0.0 => number.round() as u64,
                _ => {
                    *missing += 1;
                    0
                }
            }
        }
        None => {
            *missing += 1;
            0
        }
    }
}

fn tokens_of(value: Option<&Value>, missing: &mut usize) -> TokenBreakdown {
    let Some(tokens) = value.filter(|value| value.is_object()) else {
        *missing += 5;
        return TokenBreakdown::default();
    };
    TokenBreakdown {
        input: number(tokens.get("entrada"), missing),
        output: number(tokens.get("salida"), missing),
        cache_write: number(tokens.get("cacheEscritura"), missing),
        cache_read: number(tokens.get("cacheLectura"), missing),
        total: number(tokens.get("total"), missing),
    }
}

/// `minutosTotales` y la suma de `agentes[].tokens` y `orquestador.porFase[].tokens`. Se ignora el
/// resto (`modelos`, `notas`…).
pub(super) fn parse_metrics(text: &str) -> Result<Metrics, String> {
    let value: Value = serde_json::from_str(text).map_err(|error| {
        format!(
            "metricas.json no es JSON válido (línea {}, columna {}); la historia queda sin cifras.",
            error.line(),
            error.column()
        )
    })?;
    if !value.is_object() {
        return Err(
            "metricas.json no tiene el formato del método; la historia queda sin cifras."
                .to_string(),
        );
    }
    let mut missing = 0;
    let minutes = number(value.get("minutosTotales"), &mut missing);
    let mut tokens = TokenBreakdown::default();
    let mut roles: Vec<(String, TokenBreakdown)> = Vec::new();
    for agent in value
        .get("agentes")
        .and_then(Value::as_array)
        .map(Vec::as_slice)
        .unwrap_or_default()
    {
        let agent_tokens = tokens_of(agent.get("tokens"), &mut missing);
        tokens.add(&agent_tokens);
        let role = agent
            .get("rol")
            .and_then(Value::as_str)
            .or_else(|| agent.get("agente").and_then(Value::as_str))
            .map(|role| clean_text(role, TEXT_CHARS))
            .filter(|role| !role.is_empty())
            .unwrap_or_else(|| "sin rol".to_string());
        match roles.iter_mut().find(|(name, _)| *name == role) {
            Some((_, known)) => known.add(&agent_tokens),
            None => roles.push((role, agent_tokens)),
        }
    }
    let orchestrator = value
        .get("orquestador")
        .filter(|value| value.is_object())
        .map(|orchestrator| {
            let mut sum = TokenBreakdown::default();
            for phase in orchestrator
                .get("porFase")
                .and_then(Value::as_array)
                .map(Vec::as_slice)
                .unwrap_or_default()
            {
                sum.add(&tokens_of(phase.get("tokens"), &mut missing));
            }
            let approximate = orchestrator
                .get("aproximado")
                .and_then(Value::as_bool)
                .unwrap_or(false);
            (sum, approximate)
        });
    if let Some((sum, _)) = &orchestrator {
        tokens.add(sum);
    }
    Ok(Metrics {
        minutes,
        tokens,
        roles,
        orchestrator,
        missing_numbers: missing,
    })
}

// ── Bitácora y resumen ──────────────────────────────────────────────────────

/// La fila con fecha más reciente (`| AAAA-MM-DD HH:MM | …`). El resto de la fila se descarta.
pub(super) fn last_timeline_entry(text: &str) -> Option<NaiveDateTime> {
    text.lines()
        .filter_map(|line| {
            let rest = line.strip_prefix("| ")?;
            let stamp = rest.get(..16)?;
            rest.get(16..)?.strip_prefix(" |")?;
            parse_minute(stamp)
        })
        .max()
}

pub(super) struct Summary {
    pub(super) counts: ProjectCounts,
    pub(super) totals: ProjectTotals,
    pub(super) first_created: Option<String>,
    pub(super) last_activity: Option<String>,
    pub(super) span_days: Option<i64>,
}

pub(super) fn summarize(histories: &[HistoryRead]) -> Summary {
    let mut counts = ProjectCounts::default();
    let mut totals = ProjectTotals::default();
    let mut roles: Vec<ProjectRoleUsage> = Vec::new();
    let mut first_created: Option<NaiveDate> = None;
    let mut last_activity: Option<NaiveDateTime> = None;

    for read in histories {
        let history = &read.history;
        counts.total += 1;
        match history.state {
            ProjectHistoryState::Waiting => counts.waiting += 1,
            ProjectHistoryState::InProgress => counts.in_progress += 1,
            ProjectHistoryState::Done => counts.done += 1,
            ProjectHistoryState::Discarded => counts.discarded += 1,
            ProjectHistoryState::Unknown => counts.unknown += 1,
        }
        if let Some(created) = history.created.as_deref().and_then(parse_day) {
            first_created = Some(first_created.map_or(created, |known| known.min(created)));
        }
        if let Some(activity) = read.last_activity {
            last_activity = Some(last_activity.map_or(activity, |known| known.max(activity)));
        }
        if !history.counts_in_totals {
            continue;
        }
        totals.histories += 1;
        totals.minutes = totals.minutes.saturating_add(history.minutes.unwrap_or(0));
        if let Some(tokens) = &history.tokens {
            totals.tokens.add(tokens);
        }
        let mut add_role = |role: &str, tokens: &TokenBreakdown, approximate: bool| match roles
            .iter_mut()
            .find(|usage| usage.role == role)
        {
            Some(usage) => {
                usage.tokens.add(tokens);
                usage.approximate |= approximate;
            }
            None => roles.push(ProjectRoleUsage {
                role: role.to_string(),
                tokens: *tokens,
                approximate,
            }),
        };
        for (role, tokens) in &read.roles {
            add_role(role, tokens, false);
        }
        if let Some((tokens, approximate)) = &read.orchestrator {
            add_role("orquestador", tokens, *approximate);
        }
    }
    roles.sort_by(|left, right| {
        right
            .tokens
            .total
            .cmp(&left.tokens.total)
            .then_with(|| left.role.cmp(&right.role))
    });
    totals.by_role = roles;

    let span_days = match (first_created, last_activity) {
        (Some(first), Some(last)) => Some((last.date() - first).num_days().max(0) + 1),
        _ => None,
    };
    Summary {
        counts,
        totals,
        first_created: first_created.map(|date| date.format("%Y-%m-%d").to_string()),
        last_activity: last_activity.map(|stamp| stamp.format("%Y-%m-%dT%H:%M").to_string()),
        span_days,
    }
}
