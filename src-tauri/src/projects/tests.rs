//! Pruebas de proyectos anclados (HU-0023). Los fixtures se escriben por código en
//! `env::temp_dir()/code-ai-projects-<caso>-<uuid>`; nunca se leen carpetas reales del usuario.

use super::*;
use serde_json::json;
use std::collections::BTreeMap;

const SHA_A: &str = "1111111111111111111111111111111111111111";
const SHA_B: &str = "2222222222222222222222222222222222222222";
const SHA_C: &str = "3333333333333333333333333333333333333333";
const PRIVATE_NAME: &str = "Persona Secreta";
const PRIVATE_EMAIL: &str = "secreto@ejemplo.invalid";
const PRIVATE_MESSAGE: &str = "mensaje privado del commit";

struct Fixture {
    base: PathBuf,
}

impl Fixture {
    fn new(case: &str) -> Self {
        let base = env::temp_dir().join(format!("code-ai-projects-{case}-{}", Uuid::new_v4()));
        fs::create_dir_all(&base).expect("create fixture root");
        let base = fs::canonicalize(&base).expect("canonical fixture root");
        Self { base }
    }

    fn path(&self, rel: &str) -> PathBuf {
        self.base.join(rel)
    }

    fn write(&self, rel: &str, contents: impl AsRef<[u8]>) {
        let path = self.path(rel);
        fs::create_dir_all(path.parent().expect("parent")).expect("create parent");
        fs::write(path, contents).expect("write fixture file");
    }

    fn app_data(&self) -> PathBuf {
        self.path("app-data")
    }

    fn home(&self) -> PathBuf {
        self.path("home")
    }

    fn env_with(&self, limits: Limits) -> ProjectEnv {
        ProjectEnv::new(
            Some(self.home()),
            vec![
                self.home().join(".claude"),
                self.app_data(),
                self.path("perfil-original"),
            ],
            limits,
        )
    }

    fn env(&self) -> ProjectEnv {
        self.env_with(Limits::default())
    }
}

impl Drop for Fixture {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.base);
    }
}

fn config(repos: Value) -> String {
    json!({
        "version": 4,
        "proyecto": { "nombre": "Vetcare", "slug": "vetcare", "resumen": "Citas\u{7} para clínicas." },
        "figuras": { "aprueba": "Laura Méndez" },
        "perfil": "M",
        "fase": "desarrollo",
        "repos": repos,
        "stack": { "gestor": "pnpm", "packs": ["frontend-react-vite"] }
    })
    .to_string()
}

fn tokens(values: [u64; 5]) -> Value {
    json!({
        "entrada": values[0], "salida": values[1], "cacheEscritura": values[2],
        "cacheLectura": values[3], "total": values[4]
    })
}

fn metrics(
    minutes: u64,
    agents: &[(&str, [u64; 5])],
    orchestrator: Option<([u64; 5], bool)>,
) -> String {
    let agents: Vec<Value> = agents
        .iter()
        .map(|(role, values)| json!({ "agente": role, "rol": role, "modelos": ["x"], "tokens": tokens(*values) }))
        .collect();
    let mut value = json!({ "hu": "HU-0000", "minutosTotales": minutes, "agentes": agents, "notas": ["no se lee"] });
    if let Some((values, approximate)) = orchestrator {
        value["orquestador"] = json!({ "aproximado": approximate, "porFase": [{ "fase": "cierre", "tokens": tokens(values) }] });
    }
    value.to_string()
}

fn frontmatter(id: &str, title: &str, state: &str, created: &str) -> String {
    format!(
        "---\nid: {id}\ntitulo: \"{title}\"\nestado: {state}\nfase: implementacion\narea: citas\nprioridad: alta\ncreada: {created}\nrepos: [web, api]\nrequiere: {{ arquitectura: true }}\n---\n\n# {title}\n"
    )
}

fn timeline(rows: &[&str]) -> String {
    let mut text = "# Bitácora\n\n| Fecha | Quién | Qué |\n| --- | --- | --- |\n".to_string();
    for row in rows {
        text.push_str(&format!("| {row} | hu.mjs | algo privado |\n"));
    }
    text
}

/// Proyecto v4 de referencia: en curso, terminada con métricas y descartada con métricas.
fn write_reference_project(fixture: &Fixture, root: &str) {
    fixture.write(
        &format!("{root}/.metodo/config.json"),
        config(json!([{ "nombre": "web", "ruta": ".", "tipo": "web" }])),
    );
    fixture.write(
        &format!("{root}/hu/HU-0001-agenda/hu.md"),
        frontmatter("HU-0001", "Agenda de citas", "en-proceso", "2026-10-01"),
    );
    fixture.write(
        &format!("{root}/hu/HU-0001-agenda/seguimiento.md"),
        timeline(&["2026-10-01 09:00", "2026-10-05 18:30"]),
    );
    fixture.write(
        &format!("{root}/hu/HU-0002-registro/hu.md"),
        frontmatter("HU-0002", "Registro de clínicas", "terminada", "2026-10-02"),
    );
    fixture.write(
        &format!("{root}/hu/HU-0002-registro/metricas.json"),
        metrics(
            120,
            &[
                ("backend", [10, 20, 30, 940, 1_000]),
                ("frontend", [1, 2, 3, 94, 100]),
            ],
            Some(([5, 5, 10, 480, 500], true)),
        ),
    );
    fixture.write(
        &format!("{root}/hu/HU-0002-registro/seguimiento.md"),
        timeline(&["2026-10-02 10:00", "2026-10-03 11:00"]),
    );
    fixture.write(
        &format!("{root}/hu/HU-0003-portal/hu.md"),
        frontmatter("HU-0003", "Portal de clientes", "descartada", "2026-10-03"),
    );
    fixture.write(
        &format!("{root}/hu/HU-0003-portal/metricas.json"),
        metrics(999, &[("architect", [7, 7, 7, 7, 9_999])], None),
    );
    fixture.write(&format!("{root}/hu/README.md"), "no es una historia");
    fixture.write(&format!("{root}/hu/HU-12-mal/hu.md"), "---\nid: x\n---\n");
}

fn read_v4(fixture: &Fixture, root: &str) -> (ProjectInfo, Vec<ProjectWarning>) {
    let outcome = read_project_folder(&fixture.path(root), &fixture.env());
    assert_eq!(outcome.status, ProjectStatus::V4, "{:?}", outcome.message);
    (outcome.info.expect("info"), outcome.warnings)
}

fn warnings_for<'w>(
    warnings: &'w [ProjectWarning],
    scope: ProjectWarningScope,
    target: &str,
) -> Vec<&'w ProjectWarning> {
    warnings
        .iter()
        .filter(|warning| warning.scope == scope && warning.target.as_deref() == Some(target))
        .collect()
}

// 1 · v4 válido
#[test]
fn projects_reads_valid_v4_project_with_counts_and_totals() {
    let fixture = Fixture::new("valid");
    write_reference_project(&fixture, "vetcare");
    let (info, _warnings) = read_v4(&fixture, "vetcare");

    assert_eq!(info.name, "Vetcare");
    assert_eq!(info.slug.as_deref(), Some("vetcare"));
    assert_eq!(
        info.summary.as_deref(),
        Some("Citas  para clínicas."),
        "control chars removed"
    );
    assert_eq!(info.profile.as_deref(), Some("M"));
    assert_eq!(info.phase.as_deref(), Some("desarrollo"));
    assert_eq!(info.approver.as_deref(), Some("Laura Méndez"));
    assert_eq!(info.packs, vec!["frontend-react-vite"]);
    assert_eq!(
        info.counts,
        ProjectCounts {
            total: 3,
            waiting: 0,
            in_progress: 1,
            done: 1,
            discarded: 1,
            unknown: 0
        }
    );
    let ids: Vec<&str> = info
        .histories
        .iter()
        .map(|history| history.id.as_str())
        .collect();
    assert_eq!(ids, vec!["HU-0001", "HU-0002", "HU-0003"]);

    let discarded = &info.histories[2];
    assert_eq!(discarded.state, ProjectHistoryState::Discarded);
    assert_eq!(discarded.minutes, Some(999), "discarded keeps its figures");
    assert!(!discarded.counts_in_totals);
    assert!(info.histories[1].counts_in_totals);

    assert_eq!(info.totals.histories, 1);
    assert_eq!(info.totals.minutes, 120);
    assert_eq!(
        info.totals.tokens,
        TokenBreakdown {
            input: 16,
            output: 27,
            cache_write: 43,
            cache_read: 1_514,
            total: 1_600
        }
    );
    let roles: Vec<(&str, u64, bool)> = info
        .totals
        .by_role
        .iter()
        .map(|usage| (usage.role.as_str(), usage.tokens.total, usage.approximate))
        .collect();
    assert_eq!(
        roles,
        vec![
            ("backend", 1_000, false),
            ("orquestador", 500, true),
            ("frontend", 100, false)
        ]
    );
}

// 2 · No v4
#[test]
fn projects_rejects_non_v4_configs() {
    let fixture = Fixture::new("notv4");
    let env = fixture.env();
    fixture.write(
        "v3/.metodo/config.json",
        r#"{ "version": 3, "proyecto": { "nombre": "Viejo" } }"#,
    );
    fixture.write("texto/.metodo/config.json", r#"{ "version": "4" }"#);
    fs::create_dir_all(fixture.path("vacio")).expect("empty project");

    let v3 =
        inspect_candidate_at(&fixture.app_data(), &env, &fixture.path("v3")).expect("candidate");
    assert_eq!(v3.status, ProjectStatus::NotV4);
    assert_eq!(v3.config_version, Some(3));
    assert!(v3
        .message
        .as_deref()
        .unwrap_or_default()
        .contains("versión 3"));

    let text =
        inspect_candidate_at(&fixture.app_data(), &env, &fixture.path("texto")).expect("candidate");
    assert_eq!(text.status, ProjectStatus::NotV4);
    assert_eq!(text.config_version, None);

    let empty =
        inspect_candidate_at(&fixture.app_data(), &env, &fixture.path("vacio")).expect("candidate");
    assert_eq!(empty.status, ProjectStatus::NoConfig);

    let error =
        pin_project_at(&fixture.app_data(), &env, &fixture.path("v3")).expect_err("not pinned");
    assert!(error.contains("versión 3"));
    assert!(
        !fixture.app_data().join(PROJECTS_FILE).exists(),
        "nothing saved"
    );

    let missing = inspect_candidate_at(&fixture.app_data(), &env, &fixture.path("no-existe"))
        .expect("candidate");
    assert_eq!(missing.status, ProjectStatus::NotFound);
    fixture.write("archivo", "x");
    let file = inspect_candidate_at(&fixture.app_data(), &env, &fixture.path("archivo"))
        .expect("candidate");
    assert_eq!(file.status, ProjectStatus::NotDirectory);
}

// 3 · Config rota
#[test]
fn projects_reports_broken_config_without_its_contents() {
    let fixture = Fixture::new("broken");
    fixture.write(
        "roto/.metodo/config.json",
        "{ \"version\": 4,\n  \"secreto-interno\": ",
    );
    let outcome = read_project_folder(&fixture.path("roto"), &fixture.env());
    assert_eq!(outcome.status, ProjectStatus::ConfigBroken);
    let message = outcome.message.expect("message");
    assert!(message.contains("línea"), "{message}");
    assert!(!message.contains("secreto-interno"), "{message}");
    assert!(outcome.info.is_none());
}

// 4 · Frontmatter
#[test]
fn projects_tolerates_bad_frontmatter_per_history() {
    let fixture = Fixture::new("frontmatter");
    fixture.write("p/.metodo/config.json", config(json!([])));
    fixture.write("p/hu/HU-0001-sin/hu.md", "# Sin encabezado\n");
    fixture.write(
        "p/hu/HU-0002-abierto/hu.md",
        "---\nid: HU-0002\ntitulo: Abierto\n",
    );
    fixture.write(
        "p/hu/HU-0003-crlf/hu.md",
        "\u{feff}---\r\nid: HU-0003\r\ntitulo: 'Con CRLF'\r\nestado: terminada\r\ncreada: 2026-10-04\r\n---\r\n",
    );
    fixture.write(
        "p/hu/HU-0004-raro/hu.md",
        frontmatter("HU-0004", "Raro", "pausada", "2026-10-04"),
    );
    fixture.write(
        "p/hu/HU-0005/hu.md",
        frontmatter("HU-0005", "Bien", "en-espera", "2026-10-05"),
    );
    let (info, warnings) = read_v4(&fixture, "p");

    assert_eq!(info.histories.len(), 5);
    assert_eq!(info.histories[0].state, ProjectHistoryState::Unknown);
    assert_eq!(info.histories[0].title, "HU-0001");
    assert_eq!(
        warnings_for(&warnings, ProjectWarningScope::History, "HU-0001").len(),
        1
    );
    assert_eq!(info.histories[1].state, ProjectHistoryState::Unknown);
    assert_eq!(
        warnings_for(&warnings, ProjectWarningScope::History, "HU-0002").len(),
        1
    );
    let crlf = &info.histories[2];
    assert_eq!(crlf.title, "Con CRLF");
    assert_eq!(crlf.state, ProjectHistoryState::Done);
    assert_eq!(crlf.created.as_deref(), Some("2026-10-04"));
    assert_eq!(info.histories[3].state, ProjectHistoryState::Unknown);
    assert_eq!(
        warnings_for(&warnings, ProjectWarningScope::History, "HU-0004").len(),
        1
    );
    assert_eq!(info.histories[4].state, ProjectHistoryState::Waiting);
    assert!(warnings_for(&warnings, ProjectWarningScope::History, "HU-0005").is_empty());
    assert_eq!(info.counts.unknown, 3);
}

#[test]
fn projects_frontmatter_parser_matches_hu_mjs() {
    let fields = method::parse_frontmatter(
        "---\n# comentario\nid: HU-0007\ntitulo: \"Proyectos: resumen\"\nentrega: 0012\nrepos: [a, \"b\", ]\nrequiere: { arquitectura: true, diseno: false }\nvacio:\n---\ncuerpo\n",
    )
    .expect("frontmatter");
    let get = |key: &str| {
        fields
            .iter()
            .find(|(name, _)| name == key)
            .map(|(_, value)| value.clone())
    };
    assert_eq!(
        get("titulo"),
        Some(method::FmValue::Text("Proyectos: resumen".into()))
    );
    assert_eq!(get("entrega"), Some(method::FmValue::Text("12".into())));
    assert_eq!(
        get("repos"),
        Some(method::FmValue::List(vec![
            method::FmValue::Text("a".into()),
            method::FmValue::Text("b".into())
        ]))
    );
    assert!(matches!(get("requiere"), Some(method::FmValue::Object(pairs)) if pairs.len() == 2));
    assert_eq!(get("vacio"), Some(method::FmValue::Null));
    assert_eq!(
        method::parse_frontmatter("sin\n"),
        Err(method::FrontmatterError::Missing)
    );
    assert_eq!(
        method::parse_frontmatter("---\nid: x\n"),
        Err(method::FrontmatterError::Unclosed)
    );
}

// 5 · Métricas rotas o ausentes en una terminada
#[test]
fn projects_done_history_without_valid_metrics_does_not_count() {
    let fixture = Fixture::new("metrics");
    fixture.write("p/.metodo/config.json", config(json!([])));
    fixture.write(
        "p/hu/HU-0001-rota/hu.md",
        frontmatter("HU-0001", "Rota", "terminada", "2026-10-01"),
    );
    fixture.write(
        "p/hu/HU-0001-rota/metricas.json",
        "{ \"minutosTotales\": 10, ",
    );
    fixture.write(
        "p/hu/HU-0002-sin/hu.md",
        frontmatter("HU-0002", "Sin", "terminada", "2026-10-01"),
    );
    fixture.write(
        "p/hu/HU-0003-parcial/hu.md",
        frontmatter("HU-0003", "Parcial", "terminada", "2026-10-01"),
    );
    fixture.write(
        "p/hu/HU-0003-parcial/metricas.json",
        r#"{ "minutosTotales": 30, "agentes": [{ "rol": "backend", "tokens": { "entrada": 1, "total": 5 } }] }"#,
    );
    let (info, warnings) = read_v4(&fixture, "p");

    assert!(!info.histories[0].counts_in_totals);
    assert_eq!(info.histories[0].tokens, None);
    assert_eq!(
        warnings_for(&warnings, ProjectWarningScope::Metrics, "HU-0001").len(),
        1
    );
    assert!(
        info.histories[0].data_gaps.is_empty(),
        "broken is a warning, not a gap"
    );
    // HU-0025: terminada sin metricas.json es un dato que falta, no un aviso.
    assert!(!info.histories[1].counts_in_totals);
    assert_eq!(info.histories[1].data_gaps, vec![ProjectDataGap::NoMetrics]);
    assert!(warnings_for(&warnings, ProjectWarningScope::Metrics, "HU-0002").is_empty());
    assert!(
        info.histories[2].counts_in_totals,
        "missing numbers count as 0"
    );
    let partial = warnings_for(&warnings, ProjectWarningScope::Metrics, "HU-0003");
    assert_eq!(partial.len(), 1);
    assert_eq!(
        partial[0].message,
        "Faltan 3 cifras de tokens en metricas.json; cuentan como 0."
    );
    assert!(info.histories[2].data_gaps.is_empty());
    assert_eq!(info.totals.histories, 1);
    assert_eq!(info.totals.minutes, 30);
    assert_eq!(info.totals.timed_histories, 1);
    assert_eq!(info.totals.tokens.total, 5);
}

// 6 · Sumas
#[test]
fn projects_totals_equal_sum_of_done_metrics() {
    let fixture = Fixture::new("sums");
    fixture.write("p/.metodo/config.json", config(json!([])));
    let mut expected_minutes = 0;
    let mut expected_total = 0;
    for (index, (minutes, agent, orchestrator)) in
        [(10_u64, 100_u64, 50_u64), (25, 2_000, 700), (7, 33, 0)]
            .into_iter()
            .enumerate()
    {
        let folder = format!("p/hu/HU-000{}-t", index + 1);
        fixture.write(
            &format!("{folder}/hu.md"),
            frontmatter(
                &format!("HU-000{}", index + 1),
                "T",
                "terminada",
                "2026-10-01",
            ),
        );
        fixture.write(
            &format!("{folder}/metricas.json"),
            metrics(
                minutes,
                &[("backend", [1, 1, 1, agent - 3, agent])],
                Some(([0, 0, 0, orchestrator, orchestrator], false)),
            ),
        );
        expected_minutes += minutes;
        expected_total += agent + orchestrator;
    }
    fixture.write(
        "p/hu/HU-0009-x/hu.md",
        frontmatter("HU-0009", "X", "descartada", "2026-10-01"),
    );
    fixture.write(
        "p/hu/HU-0009-x/metricas.json",
        metrics(1_000, &[("backend", [9, 9, 9, 9, 9_000])], None),
    );
    let (info, _) = read_v4(&fixture, "p");

    assert_eq!(info.totals.histories, 3);
    assert_eq!(info.totals.minutes, expected_minutes);
    assert_eq!(info.totals.tokens.total, expected_total);
    let summed: u64 = info
        .histories
        .iter()
        .filter(|history| history.counts_in_totals)
        .filter_map(|history| history.tokens.map(|tokens| tokens.total))
        .sum();
    assert_eq!(summed, info.totals.tokens.total);
    let by_role: u64 = info
        .totals
        .by_role
        .iter()
        .map(|usage| usage.tokens.total)
        .sum();
    assert_eq!(by_role, info.totals.tokens.total);
    assert!(info.totals.by_role.iter().all(|usage| !usage.approximate));
}

// 7 · Bitácora
#[test]
fn projects_timeline_dates_and_inclusive_span() {
    let fixture = Fixture::new("timeline");
    write_reference_project(&fixture, "p");
    fixture.write(
        "p/hu/HU-0003-portal/seguimiento.md",
        "| Fecha | Quién | Qué |\n| 2026-13-40 99:99 | x | inválida |\n| ayer | x | sin fecha |\n| 2026-10-07 08:15 | x | y |\n|2026-12-31 23:59| sin espacios |\n",
    );
    let (info, _) = read_v4(&fixture, "p");
    assert_eq!(info.first_created.as_deref(), Some("2026-10-01"));
    assert_eq!(info.last_activity.as_deref(), Some("2026-10-07T08:15"));
    assert_eq!(info.span_days, Some(7));

    let empty = method::summarize(&[]);
    assert_eq!(empty.span_days, None);
    assert_eq!(empty.last_activity, None);
}

// 8 · Varios repos y tecnologías
#[test]
fn projects_reads_multiple_repos_and_technologies() {
    let fixture = Fixture::new("repos");
    let outside = fixture.path("fuera");
    fs::create_dir_all(&outside).expect("outside dir");
    fixture.write(
        "fuera/package.json",
        r#"{ "dependencies": { "express": "^4.0.0" } }"#,
    );
    fixture.write(
        "p/.metodo/config.json",
        config(json!([
            { "nombre": "web", "ruta": "apps/web", "tipo": "web" },
            { "nombre": "desktop", "ruta": "apps/desktop", "tipo": "app" },
            { "nombre": "svc", "ruta": "apps/svc" },
            { "nombre": "falta", "ruta": "apps/falta" },
            { "nombre": "relativo", "ruta": "../fuera" },
            { "nombre": "absoluto", "ruta": outside.to_string_lossy() }
        ])),
    );
    fixture.write(
        "p/apps/web/package.json",
        r#"{ "packageManager": "pnpm@12.8.0", "dependencies": { "react": "^19.0.0", "react-router": "^7.18.4" },
            "devDependencies": { "vite": "^6.0.0", "typescript": "~5.7.0", "tailwindcss": "4.3.3", "@tauri-apps/api": "workspace:*" } }"#,
    );
    fixture.write(
        "p/apps/desktop/Cargo.toml",
        "[package]\nname = \"desktop\"\n\n[dependencies]\ntauri = { version = \"2\", features = [] }\nserde = \"1\"\n\n[target.'cfg(unix)'.dependencies]\ntokio = \"1.40\"\n",
    );
    fixture.write("p/apps/svc/go.mod", "module example.invalid/svc\n\ngo 1.22\n\nrequire (\n\tgithub.com/gin-gonic/gin v1.10.0\n)\n");
    let (info, _) = read_v4(&fixture, "p");

    let statuses: Vec<(&str, ProjectRepoStatus)> = info
        .repos
        .iter()
        .map(|repo| (repo.name.as_str(), repo.status))
        .collect();
    assert_eq!(
        statuses,
        vec![
            ("web", ProjectRepoStatus::Ok),
            ("desktop", ProjectRepoStatus::Ok),
            ("svc", ProjectRepoStatus::Ok),
            ("falta", ProjectRepoStatus::Missing),
            ("relativo", ProjectRepoStatus::Outside),
            ("absoluto", ProjectRepoStatus::Outside),
        ]
    );
    assert_eq!(info.repos[0].manifests, vec!["package.json"]);
    assert!(info.repos[4].manifests.is_empty() && info.repos[4].git.is_none());

    let technologies: Vec<(&str, Option<&str>, ProjectTechnologySource, Option<&str>)> = info
        .technologies
        .iter()
        .map(|tech| {
            (
                tech.name.as_str(),
                tech.version.as_deref(),
                tech.source,
                tech.repo.as_deref(),
            )
        })
        .collect();
    use ProjectTechnologySource::{Manifest, Pack, PackageManager};
    assert_eq!(
        technologies,
        vec![
            ("pnpm", Some("12"), PackageManager, None),
            ("frontend-react-vite", None, Pack, None),
            ("React", Some("19"), Manifest, Some("web")),
            ("Vite", Some("6"), Manifest, Some("web")),
            ("Tailwind CSS", Some("4"), Manifest, Some("web")),
            ("React Router", Some("7"), Manifest, Some("web")),
            ("TypeScript", Some("5"), Manifest, Some("web")),
            ("Tauri", None, Manifest, Some("web")),
            ("Rust", None, Manifest, Some("desktop")),
            ("Tauri", Some("2"), Manifest, Some("desktop")),
            ("Tokio", Some("1"), Manifest, Some("desktop")),
            ("Go", Some("1.22"), Manifest, Some("svc")),
            ("Gin", None, Manifest, Some("svc")),
        ]
    );
    assert!(
        !info.technologies.iter().any(|tech| tech.name == "Express"),
        "outside repo not read"
    );
}

#[test]
fn projects_manifest_helpers() {
    assert_eq!(tech::major_of("^19.0.0").as_deref(), Some("19"));
    assert_eq!(tech::major_of(">= 3.1 < 4").as_deref(), Some("3"));
    assert_eq!(tech::major_of("v2"), Some("2".to_string()));
    assert_eq!(tech::major_of("*"), None);
    assert_eq!(tech::major_of("workspace:^1.0.0"), None);
    assert_eq!(tech::major_of("github:user/repo"), None);
    assert_eq!(tech::major_of("latest"), None);
    let found = tech::cargo_toml(
        "[dependencies.tauri]\nversion = \"2.1\"\n[dependencies]\naxum = { git = \"x\" }\n",
    );
    assert_eq!(
        found,
        vec![("Rust", None), ("Tauri", Some("2".into())), ("Axum", None)]
    );
    let manager = tech::package_manager(Some("pnpm"), Some("npm@10.0.0")).expect("manager");
    assert_eq!((manager.name.as_str(), manager.version), ("pnpm", None));
    let manager = tech::package_manager(None, Some("yarn@4.1.0")).expect("manager");
    assert_eq!(
        (manager.name.as_str(), manager.version.as_deref()),
        ("yarn", Some("4"))
    );
    assert!(tech::package_manager(None, None).is_none());
}

// 9 · Git
fn reflog_line(old: &str, new: &str) -> String {
    format!("{old} {new} {PRIVATE_NAME} <{PRIVATE_EMAIL}> 1761700000 -0500\tcommit: {PRIVATE_MESSAGE}\n")
}

#[test]
fn projects_reads_git_without_running_git() {
    let fixture = Fixture::new("git");
    fixture.write(
        "p/.metodo/config.json",
        config(json!([
            { "nombre": "suelta", "ruta": "suelta" },
            { "nombre": "empaquetada", "ruta": "empaquetada" },
            { "nombre": "separada", "ruta": "separada" },
            { "nombre": "worktree", "ruta": "worktree" },
            { "nombre": "distinta", "ruta": "distinta" },
            { "nombre": "sin-git", "ruta": "sin-git" },
            { "nombre": "rama-mala", "ruta": "rama-mala" }
        ])),
    );
    // Rama con ref suelta y reflog que coincide.
    fixture.write("p/suelta/.git/HEAD", "ref: refs/heads/feature/x\n");
    fixture.write("p/suelta/.git/refs/heads/feature/x", format!("{SHA_B}\n"));
    fixture.write(
        "p/suelta/.git/logs/refs/heads/feature/x",
        format!(
            "{}{}",
            reflog_line(&"0".repeat(40), SHA_A),
            reflog_line(SHA_A, SHA_B)
        ),
    );
    // Solo packed-refs.
    fixture.write("p/empaquetada/.git/HEAD", "ref: refs/heads/main\n");
    fixture.write(
        "p/empaquetada/.git/packed-refs",
        format!("# pack-refs with: peeled fully-peeled sorted\n{SHA_A} refs/heads/develop\n{SHA_C} refs/heads/main\n^{SHA_B}\n"),
    );
    // HEAD suelto.
    fixture.write("p/separada/.git/HEAD", format!("{SHA_C}\n"));
    fixture.write("p/separada/.git/logs/HEAD", reflog_line(SHA_A, SHA_C));
    // .git como archivo (worktree o submódulo).
    fixture.write("p/worktree/.git", "gitdir: /otro/sitio/.git/worktrees/x\n");
    // Reflog que no coincide con el SHA actual.
    fixture.write("p/distinta/.git/HEAD", "ref: refs/heads/main\n");
    fixture.write("p/distinta/.git/refs/heads/main", format!("{SHA_C}\n"));
    fixture.write(
        "p/distinta/.git/logs/refs/heads/main",
        reflog_line(SHA_A, SHA_B),
    );
    fs::create_dir_all(fixture.path("p/sin-git")).expect("plain dir");
    // Nombre de rama que intentaría salir de refs/heads.
    fixture.write("p/rama-mala/.git/HEAD", "ref: refs/heads/../../../config\n");

    let (info, warnings) = read_v4(&fixture, "p");
    let git = |index: usize| info.repos[index].git.clone().expect("git");

    let loose = git(0);
    assert_eq!(loose.status, ProjectGitStatus::Ok);
    assert_eq!(loose.branch.as_deref(), Some("feature/x"));
    assert!(!loose.detached);
    assert_eq!(loose.short_sha.as_deref(), Some("2222222"));
    assert_eq!(loose.moved_at.as_deref(), Some("2025-10-28T20:06:40-05:00"));

    let packed = git(1);
    assert_eq!(packed.short_sha.as_deref(), Some("3333333"));
    assert_eq!(packed.moved_at, None);

    let detached = git(2);
    assert!(detached.detached);
    assert_eq!(detached.branch, None);
    assert_eq!(detached.short_sha.as_deref(), Some("3333333"));
    assert!(detached.moved_at.is_some());

    assert_eq!(git(3).status, ProjectGitStatus::Unsupported);
    let mismatch = git(4);
    assert_eq!(mismatch.short_sha.as_deref(), Some("3333333"));
    assert_eq!(mismatch.moved_at, None);
    assert_eq!(git(5).status, ProjectGitStatus::NoRepository);
    assert_eq!(git(6).status, ProjectGitStatus::Unreadable);
    assert_eq!(
        warnings_for(&warnings, ProjectWarningScope::Git, "rama-mala").len(),
        1
    );

    let serialized = serde_json::to_string(&info).expect("json");
    assert!(serialized.contains("\"status\":\"none\""));
    for private in [PRIVATE_NAME, PRIVATE_EMAIL, PRIVATE_MESSAGE] {
        assert!(!serialized.contains(private), "{private} leaked");
    }
}

#[test]
fn projects_git_helpers() {
    assert!(git::valid_branch("feature/x"));
    for invalid in [
        "", "../x", "a//b", "a\\b", "/a", "a/", "a/./b", "a:b", "a\u{1}",
    ] {
        assert!(!git::valid_branch(invalid), "{invalid:?}");
    }
    assert!(git::parse_head("ref: refs/remotes/origin/main\n").is_none());
    assert!(git::parse_head("basura").is_none());
    assert!(git::last_reflog_entry("").is_none());
    let (sha, moved) =
        git::last_reflog_entry(&format!("{SHA_A} {SHA_B} Sin Correo 1761700000 +0130\n"))
            .expect("entry");
    assert_eq!(sha, SHA_B);
    assert_eq!(moved, None, "no '>' means no timestamp");
}

// 10 · Symlinks que salen de la carpeta
#[cfg(unix)]
#[test]
fn projects_does_not_follow_symlinks_outside_the_folder() {
    use std::os::unix::fs::symlink;
    let fixture = Fixture::new("symlink");
    write_reference_project(&fixture, "p");
    fixture.write(
        "fuera/metricas.json",
        metrics(5_000, &[("backend", [1, 1, 1, 1, 77_777])], None),
    );
    let metrics_link = fixture.path("p/hu/HU-0002-registro/metricas.json");
    fs::remove_file(&metrics_link).expect("remove metrics");
    symlink(fixture.path("fuera/metricas.json"), &metrics_link).expect("metrics symlink");
    // Symlink interno: se sigue.
    fixture.write(
        "p/docs/seguimiento-real.md",
        timeline(&["2026-11-01 10:00"]),
    );
    let internal = fixture.path("p/hu/HU-0001-agenda/seguimiento.md");
    fs::remove_file(&internal).expect("remove timeline");
    symlink(fixture.path("p/docs/seguimiento-real.md"), &internal).expect("internal symlink");

    let (info, warnings) = read_v4(&fixture, "p");
    assert!(!info.histories[1].counts_in_totals);
    assert_eq!(info.totals.minutes, 0);
    let warning = warnings_for(&warnings, ProjectWarningScope::Metrics, "HU-0002");
    assert_eq!(warning.len(), 1);
    assert!(warning[0].message.contains("fuera"));
    assert_eq!(info.last_activity.as_deref(), Some("2026-11-01T10:00"));

    // hu/ entero hacia fuera.
    fixture.write("q/.metodo/config.json", config(json!([])));
    fixture.write(
        "otras/HU-0001-x/hu.md",
        frontmatter("HU-0001", "X", "terminada", "2026-10-01"),
    );
    symlink(fixture.path("otras"), fixture.path("q/hu")).expect("hu symlink");
    let (info, warnings) = read_v4(&fixture, "q");
    assert!(info.histories.is_empty());
    assert_eq!(
        warnings_for(&warnings, ProjectWarningScope::History, "hu").len(),
        1
    );
}

// 11 · Límites
#[test]
fn projects_applies_size_and_count_limits() {
    let fixture = Fixture::new("limits");
    write_reference_project(&fixture, "p");
    let mut big = String::from("{ \"dependencies\": { \"react\": \"^19.0.0\" }, \"x\": \"");
    big.push_str(&"a".repeat((JSON_MANIFEST_LIMIT + 1) as usize));
    big.push_str("\" }");
    fixture.write("p/package.json", big);

    let env = fixture.env_with(Limits {
        max_histories: 2,
        max_repos: 32,
    });
    let outcome = read_project_folder(&fixture.path("p"), &env);
    let info = outcome.info.expect("info");
    assert_eq!(info.histories.len(), 2);
    assert_eq!(
        warnings_for(&outcome.warnings, ProjectWarningScope::Limit, "hu").len(),
        1
    );
    assert_eq!(
        warnings_for(
            &outcome.warnings,
            ProjectWarningScope::Manifest,
            "web/package.json"
        )
        .len(),
        1
    );
    assert!(info.repos[0].manifests.is_empty());
    assert!(!info.technologies.iter().any(|tech| tech.name == "React"));
}

// 12 · Lista de exclusión
#[test]
fn projects_forbids_claude_profile_and_app_data_folders() {
    let fixture = Fixture::new("deny");
    write_reference_project(&fixture, "home/.claude/proyecto");
    write_reference_project(&fixture, "app-data/managed-instances/x");
    write_reference_project(&fixture, "perfil-original/p");
    let env = fixture.env();
    for root in [
        "home/.claude/proyecto",
        "app-data/managed-instances/x",
        "perfil-original/p",
        "home/.claude",
    ] {
        let candidate = inspect_candidate_at(&fixture.app_data(), &env, &fixture.path(root))
            .expect("candidate");
        assert_eq!(candidate.status, ProjectStatus::Forbidden, "{root}");
        assert!(candidate.name.is_none() || candidate.history_count.is_none());
        assert!(pin_project_at(&fixture.app_data(), &env, &fixture.path(root)).is_err());
    }

    fixture.write(
        "p/.metodo/config.json",
        config(json!([
            { "nombre": "claude", "ruta": fixture.path("home/.claude").to_string_lossy() },
            { "nombre": "dentro", "ruta": "../home/.claude/proyecto" }
        ])),
    );
    let (info, _) = read_v4(&fixture, "p");
    assert_eq!(info.repos[0].status, ProjectRepoStatus::Forbidden);
    assert_eq!(info.repos[1].status, ProjectRepoStatus::Forbidden);
    assert!(info
        .repos
        .iter()
        .all(|repo| repo.git.is_none() && repo.manifests.is_empty()));

    // Una carpeta que contiene la exclusión (p. ej. home) no lee nada de dentro de ella.
    fixture.write(
        "home/.metodo/config.json",
        config(json!([{ "nombre": "c", "ruta": ".claude/proyecto" }])),
    );
    let outcome = read_project_folder(&fixture.home(), &env);
    assert_eq!(outcome.status, ProjectStatus::V4);
    assert_eq!(
        outcome.info.expect("info").repos[0].status,
        ProjectRepoStatus::Forbidden
    );

    #[cfg(unix)]
    {
        std::os::unix::fs::symlink(
            fixture.path("home/.claude/proyecto"),
            fixture.path("enlace"),
        )
        .expect("symlink");
        let candidate = inspect_candidate_at(&fixture.app_data(), &env, &fixture.path("enlace"))
            .expect("candidate");
        assert_eq!(
            candidate.status,
            ProjectStatus::Forbidden,
            "symlink into .claude"
        );
    }
}

// 13 · Solo lectura (AC-06)
fn fingerprint(root: &Path) -> BTreeMap<PathBuf, (bool, u64, Option<std::time::SystemTime>)> {
    let mut entries = BTreeMap::new();
    let mut pending = vec![root.to_path_buf()];
    while let Some(dir) = pending.pop() {
        for entry in fs::read_dir(&dir).expect("read dir") {
            let entry = entry.expect("entry");
            let metadata = fs::symlink_metadata(entry.path()).expect("metadata");
            if metadata.is_dir() {
                pending.push(entry.path());
            }
            entries.insert(
                entry
                    .path()
                    .strip_prefix(root)
                    .expect("relative")
                    .to_path_buf(),
                (metadata.is_dir(), metadata.len(), metadata.modified().ok()),
            );
        }
    }
    entries
}

#[test]
fn projects_reading_never_changes_the_project_folder() {
    let fixture = Fixture::new("readonly");
    write_reference_project(&fixture, "p");
    fixture.write(
        "p/package.json",
        r#"{ "dependencies": { "react": "^19.0.0" } }"#,
    );
    fixture.write("p/.git/HEAD", "ref: refs/heads/main\n");
    fixture.write("p/.git/refs/heads/main", format!("{SHA_A}\n"));
    fixture.write(
        "p/.git/logs/refs/heads/main",
        reflog_line(&"0".repeat(40), SHA_A),
    );
    let env = fixture.env();
    let root = fixture.path("p");
    let before = fingerprint(&root);

    let candidate = inspect_candidate_at(&fixture.app_data(), &env, &root).expect("inspect");
    assert_eq!(candidate.status, ProjectStatus::V4);
    assert_eq!(candidate.history_count, Some(3));
    assert_eq!(candidate.repo_count, Some(1));
    let pinned = pin_project_at(&fixture.app_data(), &env, &root).expect("pin");
    read_project_at(&fixture.app_data(), &env, &pinned.id).expect("read");
    list_projects_at(&fixture.app_data(), &env).expect("list");

    assert_eq!(fingerprint(&root), before);
}

// 14 · Registro
#[test]
fn projects_registry_pin_unpin_and_damaged_file() {
    let fixture = Fixture::new("registry");
    write_reference_project(&fixture, "p");
    write_reference_project(&fixture, "q");
    let env = fixture.env();
    let app_data = fixture.app_data();

    let first = pin_project_at(&app_data, &env, &fixture.path("p")).expect("pin");
    let again = pin_project_at(&app_data, &env, &fixture.path("p/./hu/..")).expect("pin again");
    assert_eq!(first.id, again.id, "idempotent");
    assert_eq!(first.last_name.as_deref(), Some("Vetcare"));
    assert_eq!(first.status, ProjectStatus::V4);
    let second = pin_project_at(&app_data, &env, &fixture.path("q")).expect("pin q");
    assert_ne!(first.id, second.id);

    let candidate = inspect_candidate_at(&app_data, &env, &fixture.path("p")).expect("candidate");
    assert_eq!(
        candidate.already_pinned_id.as_deref(),
        Some(first.id.as_str())
    );

    let state = list_projects_at(&app_data, &env).expect("list");
    let ids: Vec<&str> = state
        .projects
        .iter()
        .map(|project| project.id.as_str())
        .collect();
    assert_eq!(
        ids,
        vec![first.id.as_str(), second.id.as_str()],
        "saved order"
    );

    unpin_project_at(&app_data, &first.id).expect("unpin");
    unpin_project_at(&app_data, &first.id).expect("unpin is idempotent");
    assert!(
        fixture.path("p/.metodo/config.json").exists(),
        "folder untouched"
    );
    assert_eq!(
        read_project_at(&app_data, &env, &first.id).expect_err("gone"),
        NOT_PINNED
    );
    assert_eq!(
        read_project_at(&app_data, &env, "no-uuid").expect_err("invalid"),
        NOT_PINNED
    );
    assert!(unpin_project_at(&app_data, "../../x").is_err());
    let stored = load_projects(&app_data).expect("load");
    assert_eq!(stored.projects.len(), 1);
    assert_eq!(stored.projects[0].id, second.id);

    let leftovers: Vec<_> = fs::read_dir(&app_data)
        .expect("app data")
        .filter_map(Result::ok)
        .filter(|entry| entry.file_name().to_string_lossy().ends_with(".tmp"))
        .collect();
    assert!(leftovers.is_empty(), "no temporary files left");

    let registry = app_data.join(PROJECTS_FILE);
    for damaged in [
        "{ dañado",
        r#"{ "version": 2, "projects": [] }"#,
        r#"{ "version": 1, "projects": [{ "id": "x", "path": "/a", "lastName": null, "pinnedAt": "", "lastReadAt": null }] }"#,
    ] {
        fs::write(&registry, damaged).expect("damage registry");
        assert!(list_projects_at(&app_data, &env)
            .expect_err("damaged")
            .contains("dañado"));
        assert!(pin_project_at(&app_data, &env, &fixture.path("p")).is_err());
        assert!(unpin_project_at(&app_data, &second.id).is_err());
        assert_eq!(
            fs::read_to_string(&registry).expect("registry"),
            damaged,
            "not overwritten"
        );
    }
}

#[test]
fn projects_registry_rejects_more_than_the_maximum() {
    let fixture = Fixture::new("maximum");
    write_reference_project(&fixture, "p");
    let file = ProjectsFile {
        version: PROJECTS_VERSION,
        projects: (0..MAX_PINNED_PROJECTS)
            .map(|index| PinnedProject {
                id: Uuid::new_v4().to_string(),
                path: fixture
                    .path(&format!("otro-{index}"))
                    .to_string_lossy()
                    .into_owned(),
                last_name: None,
                pinned_at: now_rfc3339(),
                last_read_at: None,
            })
            .collect(),
    };
    save_projects(&fixture.app_data(), &file).expect("save");
    let error =
        pin_project_at(&fixture.app_data(), &fixture.env(), &fixture.path("p")).expect_err("full");
    assert!(error.contains("100"));
}

// 15 · Carpeta borrada tras anclar
#[test]
fn projects_missing_folder_keeps_last_name_and_read_time() {
    let fixture = Fixture::new("moved");
    write_reference_project(&fixture, "p");
    let env = fixture.env();
    let pinned = pin_project_at(&fixture.app_data(), &env, &fixture.path("p")).expect("pin");
    let last_read = pinned.last_read_at.clone();
    fs::remove_dir_all(fixture.path("p")).expect("remove project");

    let summary = read_project_at(&fixture.app_data(), &env, &pinned.id).expect("read");
    assert_eq!(summary.status, ProjectStatus::NotFound);
    assert!(summary.info.is_none());
    assert!(summary.message.is_some());
    assert_eq!(summary.last_name.as_deref(), Some("Vetcare"));
    assert_eq!(summary.last_read_at, last_read);
    let stored = load_projects(&fixture.app_data()).expect("load");
    assert_eq!(stored.projects[0].last_name.as_deref(), Some("Vetcare"));
    assert_eq!(stored.projects[0].last_read_at, last_read);
    assert!(project_folder_at(&fixture.app_data(), &pinned.id).is_err());

    // Config rota tras anclar: también conserva el último nombre.
    write_reference_project(&fixture, "p");
    fixture.write("p/.metodo/config.json", "{");
    let summary = read_project_at(&fixture.app_data(), &env, &pinned.id).expect("read");
    assert_eq!(summary.status, ProjectStatus::ConfigBroken);
    assert_eq!(summary.last_name.as_deref(), Some("Vetcare"));
    assert_eq!(
        project_folder_at(&fixture.app_data(), &pinned.id).expect("folder"),
        fixture.path("p")
    );
}

// 16 · Rutas
#[test]
fn projects_paths_protected_location_and_display() {
    let home = Path::new("/Users/demo");
    let location = |path: &str| protected_location_for(Path::new(path), Some(home));
    assert_eq!(
        location("/Users/demo/Desktop/p"),
        Some(ProjectProtectedLocation::Desktop)
    );
    assert_eq!(
        location("/Users/demo/Documents"),
        Some(ProjectProtectedLocation::Documents)
    );
    assert_eq!(
        location("/Users/demo/Downloads/x/y"),
        Some(ProjectProtectedLocation::Downloads)
    );
    assert_eq!(
        location("/Users/demo/Library/Mobile Documents/com~apple~CloudDocs/p"),
        Some(ProjectProtectedLocation::Icloud)
    );
    assert_eq!(
        location("/Volumes/Disco/p"),
        Some(ProjectProtectedLocation::External)
    );
    assert_eq!(location("/Volumes"), None);
    assert_eq!(location("/Users/demo/Proyectos/p"), None);
    assert_eq!(location("/Users/demo/DesktopX/p"), None);
    assert_eq!(
        protected_location_for(Path::new("/Users/demo/Desktop"), None),
        None
    );

    assert_eq!(
        display_path("/Users/demo/Proyectos/p", Some(home)),
        format!(
            "~{}Proyectos{}p",
            std::path::MAIN_SEPARATOR,
            std::path::MAIN_SEPARATOR
        )
    );
    assert_eq!(display_path("/Users/demo", Some(home)), "~");
    assert_eq!(display_path("/Users/demox/p", Some(home)), "/Users/demox/p");
    assert_eq!(display_path("/opt/p", None), "/opt/p");

    assert_eq!(strip_verbatim(r"\\?\C:\Users\demo\p"), r"C:\Users\demo\p");
    assert_eq!(
        strip_verbatim(r"\\?\UNC\servidor\recurso\p"),
        r"\\servidor\recurso\p"
    );
    assert_eq!(strip_verbatim("/Users/demo"), "/Users/demo");

    assert_eq!(clean_text("  a\u{0}b\nc  ", 120), "a b c");
    assert_eq!(clean_text("abcdef", 4), "abc…");
}

#[test]
fn projects_serializes_contract_names() {
    assert_eq!(
        serde_json::to_value(ProjectStatus::NotV4).expect("json"),
        json!("notV4")
    );
    assert_eq!(
        serde_json::to_value(ProjectStatus::V4).expect("json"),
        json!("v4")
    );
    assert_eq!(
        serde_json::to_value(ProjectStatus::PermissionDenied).expect("json"),
        json!("permissionDenied")
    );
    assert_eq!(
        serde_json::to_value(ProjectHistoryState::InProgress).expect("json"),
        json!("inProgress")
    );
    assert_eq!(
        serde_json::to_value(ProjectProtectedLocation::Icloud).expect("json"),
        json!("icloud")
    );
    assert_eq!(
        serde_json::to_value(ProjectGitStatus::NoRepository).expect("json"),
        json!("none")
    );
    assert_eq!(
        serde_json::to_value(ProjectTechnologySource::PackageManager).expect("json"),
        json!("packageManager")
    );
    let tokens = serde_json::to_value(TokenBreakdown::default()).expect("json");
    assert_eq!(
        tokens,
        json!({ "input": 0, "output": 0, "cacheWrite": 0, "cacheRead": 0, "total": 0 })
    );
}

#[test]
fn projects_split_parts_never_leaves_the_base() {
    let parts = |rel: &str, parent: bool| split_parts(Path::new(rel), parent);
    assert_eq!(
        parts("apps/web/./package.json", false),
        Some(vec!["apps".into(), "web".into(), "package.json".into()])
    );
    assert_eq!(
        parts("apps\\web", false),
        Some(vec!["apps".into(), "web".into()])
    );
    assert_eq!(parts("../fuera", false), None);
    assert_eq!(parts("a/../../b", false), None);
    assert_eq!(parts("/etc/passwd", false), None);
    assert_eq!(
        parts("../hermano/x", true),
        Some(vec!["..".into(), "hermano".into(), "x".into()])
    );
}

/// Entorno sin `canonicalize`: las pruebas léxicas no tocan el disco.
fn lexical_env(deny: &[&str]) -> ProjectEnv {
    ProjectEnv {
        home: None,
        deny: deny.iter().map(PathBuf::from).collect(),
        limits: Limits::default(),
        cloud: |_, _| false,
    }
}

// R-1 · La ruta de un repo se decide de forma léxica, sin tocar el disco.
#[test]
fn projects_repo_paths_are_decided_lexically() {
    let root = Path::new("/no-existe-code-ai/p");
    let env = lexical_env(&["/no-existe-code-ai/home/.claude"]);
    let unix = |raw: &str| lexical_repo_path(root, raw, &env, false);
    let windows = |raw: &str| lexical_repo_path(root, raw, &env, true);

    assert_eq!(
        unix("apps/./web"),
        RepoPath::Inside(PathBuf::from("apps").join("web"))
    );
    assert_eq!(unix("."), RepoPath::Inside(PathBuf::new()));
    assert_eq!(unix("apps/../web"), RepoPath::Inside(PathBuf::from("web")));
    assert_eq!(unix("../fuera"), RepoPath::Outside);
    assert_eq!(unix("apps/../../fuera"), RepoPath::Outside);
    assert_eq!(unix("/srv/repo"), RepoPath::Outside);
    assert_eq!(unix("../home/.claude/x"), RepoPath::Forbidden);
    assert_eq!(unix("/no-existe-code-ai/home/.claude"), RepoPath::Forbidden);

    assert_eq!(windows(r"\\host\share\repo"), RepoPath::Outside, "UNC");
    assert_eq!(
        windows("//host/share/repo"),
        RepoPath::Outside,
        "UNC with slashes"
    );
    assert_eq!(windows("C:x"), RepoPath::Outside, "drive-relative");
    assert_eq!(windows(r"C:\repo"), RepoPath::Outside);
    assert_eq!(windows(r"\repo"), RepoPath::Outside);
    assert_eq!(
        windows(r"apps\web"),
        RepoPath::Inside(PathBuf::from("apps").join("web"))
    );
}

#[cfg(unix)]
fn set_mode(path: &Path, mode: u32) {
    use std::os::unix::fs::PermissionsExt;
    fs::set_permissions(path, fs::Permissions::from_mode(mode)).expect("set mode");
}

// R-1 · Una ruta de fuera bajo una carpeta sin permisos da `outside` sin intentar abrirla.
#[cfg(unix)]
#[test]
fn projects_outside_repo_is_not_touched_on_disk() {
    let fixture = Fixture::new("outside-locked");
    fixture.write("cerrada/repo/package.json", "{}");
    fixture.write(
        "p/.metodo/config.json",
        config(json!([
            { "nombre": "absoluto", "ruta": fixture.path("cerrada/repo").to_string_lossy() },
            { "nombre": "relativo", "ruta": "../cerrada/repo" }
        ])),
    );
    set_mode(&fixture.path("cerrada"), 0o000);
    let outcome = read_project_folder(&fixture.path("p"), &fixture.env());
    set_mode(&fixture.path("cerrada"), 0o755);

    let info = outcome.info.expect("info");
    assert_eq!(info.repos[0].status, ProjectRepoStatus::Outside);
    assert_eq!(info.repos[1].status, ProjectRepoStatus::Outside);
    assert!(outcome
        .warnings
        .iter()
        .all(|warning| warning.scope != ProjectWarningScope::Repo));
}

// R-4 · Un symlink que sale de la carpeta no se sigue: su destino ni se consulta.
#[cfg(unix)]
#[test]
fn projects_symlink_targets_outside_are_not_followed() {
    use std::os::unix::fs::symlink;
    let fixture = Fixture::new("symlink-locked");
    write_reference_project(&fixture, "p");
    fixture.write("cerrada/metricas.json", metrics(1, &[], None));
    let metrics_link = fixture.path("p/hu/HU-0002-registro/metricas.json");
    fs::remove_file(&metrics_link).expect("remove metrics");
    symlink(fixture.path("cerrada/metricas.json"), &metrics_link).expect("absolute symlink");
    // Cadena relativa dentro de la carpeta: se sigue.
    fixture.write("p/docs/real.md", timeline(&["2026-11-02 09:30"]));
    symlink("real.md", fixture.path("p/docs/enlace.md")).expect("inner link");
    let timeline_link = fixture.path("p/hu/HU-0001-agenda/seguimiento.md");
    fs::remove_file(&timeline_link).expect("remove timeline");
    symlink("../../docs/enlace.md", &timeline_link).expect("relative chain");
    // Relativo que sube por encima de la carpeta.
    symlink(
        "../../../../cerrada/metricas.json",
        fixture.path("p/hu/HU-0003-portal/seguimiento.md"),
    )
    .expect("relative escape");
    // Bucle.
    symlink("bucle-b", fixture.path("p/hu/HU-0001-agenda/bucle-a")).expect("loop a");
    symlink("bucle-a", fixture.path("p/hu/HU-0001-agenda/bucle-b")).expect("loop b");

    set_mode(&fixture.path("cerrada"), 0o000);
    let (info, warnings) = read_v4(&fixture, "p");
    let ctx = ReadContext {
        root: fixture.path("p"),
        env: &fixture.env(),
    };
    let looped = ctx.read(Path::new("hu/HU-0001-agenda/bucle-a"), ReadMode::Whole(10));
    set_mode(&fixture.path("cerrada"), 0o755);

    let metrics_warning = warnings_for(&warnings, ProjectWarningScope::Metrics, "HU-0002");
    assert_eq!(metrics_warning.len(), 1);
    assert!(
        metrics_warning[0].message.contains("fuera"),
        "{}",
        metrics_warning[0].message
    );
    let timeline_warning = warnings_for(&warnings, ProjectWarningScope::Timeline, "HU-0003");
    assert_eq!(timeline_warning.len(), 1);
    assert!(
        timeline_warning[0].message.contains("fuera"),
        "{}",
        timeline_warning[0].message
    );
    assert_eq!(info.last_activity.as_deref(), Some("2026-11-02T09:30"));
    assert_eq!(looped, Err(Skip::Unreadable));
}

// R-2 · Una carpeta que solo está en la nube no se lista.
#[test]
fn projects_cloud_only_folders_are_not_listed() {
    let fixture = Fixture::new("cloud");
    write_reference_project(&fixture, "p");
    let mut env = fixture.env();
    env.cloud = |path, metadata| metadata.is_dir() && path.ends_with("hu");
    let outcome = read_project_folder(&fixture.path("p"), &env);
    let info = outcome.info.expect("info");
    assert!(info.histories.is_empty());
    let warning = warnings_for(&outcome.warnings, ProjectWarningScope::History, "hu");
    assert_eq!(warning.len(), 1);
    assert!(
        warning[0].message.contains("nube"),
        "{}",
        warning[0].message
    );

    let mut env = fixture.env();
    env.cloud = |path, _| path.ends_with("metricas.json");
    let outcome = read_project_folder(&fixture.path("p"), &env);
    let warning = warnings_for(&outcome.warnings, ProjectWarningScope::Metrics, "HU-0002");
    assert!(warning[0].message.contains("nube"));
    assert_eq!(outcome.info.expect("info").totals.histories, 0);
}

// R-10 · Tope de avisos.
#[test]
fn projects_warnings_are_capped() {
    let fixture = Fixture::new("warnings");
    fixture.write("p/.metodo/config.json", config(json!([])));
    for index in 0..30 {
        fixture.write(&format!("p/hu/HU-{index:04}-x/hu.md"), "sin encabezado\n");
    }
    let (info, warnings) = read_v4(&fixture, "p");
    assert_eq!(info.histories.len(), 30);
    assert_eq!(warnings.len(), MAX_WARNINGS);
    let last = warnings.last().expect("summary");
    assert_eq!(last.scope, ProjectWarningScope::Limit);
    assert_eq!(last.target, None);
    assert!(last.message.contains("11"), "{}", last.message);
}

// R-5 · Textos de TCC.
#[test]
fn projects_info_plist_explains_every_protected_location() {
    let plist = include_str!("../../Info.plist");
    for key in [
        "NSDesktopFolderUsageDescription",
        "NSDocumentsFolderUsageDescription",
        "NSDownloadsFolderUsageDescription",
        "NSRemovableVolumesUsageDescription",
        "NSNetworkVolumesUsageDescription",
    ] {
        assert!(plist.contains(&format!("<key>{key}</key>")), "{key}");
    }
    assert_eq!(
        plist
            .matches("<string>Code AI Profiles lee, sin cambiar nada,")
            .count(),
        5
    );
}

// ── HU-0025 · Datos incompletos ─────────────────────────────────────────────

// H25-1 · `minutosTotales: null` y `fases: []` en una terminada: sin tiempo, no un aviso.
#[test]
fn projects_done_history_without_minutes_is_a_time_gap() {
    let fixture = Fixture::new("no-time");
    fixture.write("p/.metodo/config.json", config(json!([])));
    fixture.write(
        "p/hu/HU-0001-con/hu.md",
        frontmatter("HU-0001", "Con", "terminada", "2026-10-01"),
    );
    fixture.write(
        "p/hu/HU-0001-con/metricas.json",
        metrics(40, &[("backend", [1, 1, 1, 7, 10])], None),
    );
    fixture.write(
        "p/hu/HU-0002-nulo/hu.md",
        frontmatter("HU-0002", "Nulo", "terminada", "2026-10-01"),
    );
    fixture.write(
        "p/hu/HU-0002-nulo/metricas.json",
        json!({
            "hu": "HU-0002", "minutosTotales": null, "fases": [],
            "agentes": [{ "rol": "frontend", "tokens": tokens([2, 2, 2, 94, 100]) }]
        })
        .to_string(),
    );
    fixture.write(
        "p/hu/HU-0003-ausente/hu.md",
        frontmatter("HU-0003", "Ausente", "terminada", "2026-10-01"),
    );
    fixture.write(
        "p/hu/HU-0003-ausente/metricas.json",
        json!({ "agentes": [{ "rol": "backend", "tokens": tokens([0, 0, 0, 0, 1_000]) }] })
            .to_string(),
    );
    // En curso con minutos nulos: no se marca (S-2).
    fixture.write(
        "p/hu/HU-0004-curso/hu.md",
        frontmatter("HU-0004", "Curso", "en-proceso", "2026-10-01"),
    );
    fixture.write(
        "p/hu/HU-0004-curso/metricas.json",
        json!({ "minutosTotales": null, "agentes": [] }).to_string(),
    );
    let (info, warnings) = read_v4(&fixture, "p");

    let gaps: Vec<&[ProjectDataGap]> = info
        .histories
        .iter()
        .map(|history| history.data_gaps.as_slice())
        .collect();
    assert_eq!(
        gaps,
        vec![
            &[][..],
            &[ProjectDataGap::NoTime][..],
            &[ProjectDataGap::NoTime][..],
            &[][..]
        ]
    );
    for history in &info.histories[1..] {
        assert_eq!(history.minutes, None, "{}", history.id);
    }
    assert!(info.histories[1].counts_in_totals, "its tokens still count");
    assert!(info.histories[2].counts_in_totals);
    for target in ["HU-0001", "HU-0002", "HU-0003", "HU-0004"] {
        assert!(
            warnings_for(&warnings, ProjectWarningScope::Metrics, target).is_empty(),
            "{target}: {warnings:?}"
        );
    }
    assert_eq!(info.totals.histories, 3);
    assert_eq!(info.totals.minutes, 40, "only the timed one adds minutes");
    assert_eq!(info.totals.timed_histories, 1);
    assert_eq!(info.totals.tokens.total, 1_110);
}

// H25-1b · `minutosTotales` presente pero no numérico: sin tiempo y con aviso.
#[test]
fn projects_invalid_minutes_are_a_warning_and_a_time_gap() {
    let fixture = Fixture::new("bad-minutes");
    fixture.write("p/.metodo/config.json", config(json!([])));
    fixture.write(
        "p/hu/HU-0001-x/hu.md",
        frontmatter("HU-0001", "X", "terminada", "2026-10-01"),
    );
    fixture.write(
        "p/hu/HU-0001-x/metricas.json",
        json!({ "minutosTotales": "mucho", "agentes": [{ "rol": "a", "tokens": tokens([1, 1, 1, 1, 4]) }] })
            .to_string(),
    );
    fixture.write(
        "p/hu/HU-0002-y/hu.md",
        frontmatter("HU-0002", "Y", "terminada", "2026-10-01"),
    );
    fixture.write(
        "p/hu/HU-0002-y/metricas.json",
        json!({ "minutosTotales": -5, "agentes": [] }).to_string(),
    );
    let (info, warnings) = read_v4(&fixture, "p");
    for (index, target) in ["HU-0001", "HU-0002"].into_iter().enumerate() {
        let history = &info.histories[index];
        assert_eq!(history.minutes, None);
        assert_eq!(history.data_gaps, vec![ProjectDataGap::NoTime]);
        let found = warnings_for(&warnings, ProjectWarningScope::Metrics, target);
        assert_eq!(found.len(), 1, "{target}");
        assert!(found[0].message.contains("minutosTotales"));
    }
    assert_eq!(info.totals.timed_histories, 0);
    assert_eq!(info.totals.tokens.total, 4);
}

// H25-2 · Terminada sin metricas.json → `NoMetrics`; en curso sin metricas.json → nada.
#[test]
fn projects_done_history_without_metrics_file_is_a_metrics_gap() {
    let fixture = Fixture::new("no-metrics");
    write_reference_project(&fixture, "p");
    fixture.write(
        "p/hu/HU-0004-sin/hu.md",
        frontmatter("HU-0004", "Sin", "terminada", "2026-10-04"),
    );
    let (info, warnings) = read_v4(&fixture, "p");

    let in_progress = &info.histories[0];
    assert_eq!(in_progress.state, ProjectHistoryState::InProgress);
    assert!(in_progress.data_gaps.is_empty());
    let done = &info.histories[1];
    assert!(done.data_gaps.is_empty(), "complete metrics: no gap");
    assert_eq!(done.minutes, Some(120));
    let discarded = &info.histories[2];
    assert!(discarded.data_gaps.is_empty());
    let missing = &info.histories[3];
    assert_eq!(missing.data_gaps, vec![ProjectDataGap::NoMetrics]);
    assert_eq!(missing.minutes, None);
    assert_eq!(missing.tokens, None);
    assert!(!missing.counts_in_totals);
    assert!(warnings_for(&warnings, ProjectWarningScope::Metrics, "HU-0004").is_empty());
    assert_eq!(info.totals.histories, 1);
    assert_eq!(info.totals.timed_histories, 1);
    assert_eq!(info.totals.minutes, 120);
}

// ── HU-0025 · Lector de historias ───────────────────────────────────────────

/// Escribe el proyecto de referencia, lo ancla y devuelve su id.
fn pinned_reference(fixture: &Fixture, env: &ProjectEnv) -> String {
    write_reference_project(fixture, "p");
    pin_project_at(&fixture.app_data(), env, &fixture.path("p"))
        .expect("pin")
        .id
}

fn kinds(documents: &ProjectHistoryDocuments) -> Vec<(ProjectDocumentKind, &str)> {
    documents
        .documents
        .iter()
        .map(|document| (document.kind, document.file.as_str()))
        .collect()
}

// H25-4a · Los cuatro en orden, solo los que existen, sin otros nombres; nada cambia en la carpeta.
#[test]
fn projects_reader_returns_fixed_documents_in_order() {
    let fixture = Fixture::new("reader");
    let env = fixture.env();
    let id = pinned_reference(&fixture, &env);
    let folder = "HU-0002-registro";
    fixture.write(
        &format!("p/hu/{folder}/arquitectura.md"),
        "# Arquitectura\r\n\r\n| a | b |\n",
    );
    fixture.write(
        &format!("p/hu/{folder}/verificacion.md"),
        "# Verificación\n",
    );
    fixture.write(&format!("p/hu/{folder}/notas.md"), "no se lee");
    fixture.write(&format!("p/hu/{folder}/diseno/vista.md"), "no se lee");
    let registry = fs::read(fixture.app_data().join(PROJECTS_FILE)).expect("registry");
    let before = fingerprint(&fixture.path("p"));

    let read =
        reader::read_project_history_at(&fixture.app_data(), &env, &id, folder).expect("documents");
    assert_eq!(read.folder, folder);
    assert_eq!(
        kinds(&read),
        vec![
            (ProjectDocumentKind::Hu, "hu.md"),
            (ProjectDocumentKind::Architecture, "arquitectura.md"),
            (ProjectDocumentKind::Verification, "verificacion.md"),
            (ProjectDocumentKind::Timeline, "seguimiento.md"),
        ]
    );
    assert!(
        read.documents
            .iter()
            .all(|document| document.status == ProjectDocumentStatus::Ok
                && document.message.is_none())
    );
    assert_eq!(
        read.documents[0].path, "hu/HU-0002-registro/hu.md",
        "relative with /"
    );
    assert_eq!(
        read.documents[0].content.as_deref(),
        Some(frontmatter("HU-0002", "Registro de clínicas", "terminada", "2026-10-02").as_str())
    );
    assert_eq!(
        read.documents[1].content.as_deref(),
        Some("# Arquitectura\n\n| a | b |\n"),
        "CRLF normalized"
    );

    // Solo hu.md y seguimiento.md.
    let partial = reader::read_project_history_at(&fixture.app_data(), &env, &id, "HU-0001-agenda")
        .expect("partial");
    assert_eq!(
        kinds(&partial),
        vec![
            (ProjectDocumentKind::Hu, "hu.md"),
            (ProjectDocumentKind::Timeline, "seguimiento.md"),
        ]
    );

    // Solo lectura: ni la carpeta ni el registro (lastReadAt) cambian.
    assert_eq!(fingerprint(&fixture.path("p")), before);
    assert_eq!(
        fs::read(fixture.app_data().join(PROJECTS_FILE)).expect("registry"),
        registry
    );

    // La historia ya no está.
    let gone = reader::read_project_history_at(&fixture.app_data(), &env, &id, "HU-0099-nada")
        .expect_err("missing folder");
    assert_eq!(
        gone.to_string(),
        "La historia ya no está en el proyecto. Pulsa «Actualizar»."
    );
    // Un archivo con el nombre de la carpeta tampoco.
    fixture.write("p/hu/HU-0098-archivo", "x");
    assert!(
        reader::read_project_history_at(&fixture.app_data(), &env, &id, "HU-0098-archivo").is_err()
    );
    // Proyecto no anclado.
    let not_pinned = reader::read_project_history_at(
        &fixture.app_data(),
        &env,
        &Uuid::new_v4().to_string(),
        folder,
    )
    .expect_err("not pinned");
    assert_eq!(not_pinned.to_string(), NOT_PINNED);
}

// H25-4b · `\0` y más de 512 KiB → ilegible; el resto de pestañas sigue.
#[test]
fn projects_reader_marks_binary_and_large_documents_unreadable() {
    let fixture = Fixture::new("reader-limits");
    let env = fixture.env();
    let id = pinned_reference(&fixture, &env);
    let folder = "HU-0002-registro";
    fixture.write(
        &format!("p/hu/{folder}/arquitectura.md"),
        "texto\0binario".as_bytes(),
    );
    fixture.write(
        &format!("p/hu/{folder}/verificacion.md"),
        "a".repeat(reader::DOCUMENT_LIMIT as usize + 1),
    );
    fixture.write(
        &format!("p/hu/{folder}/seguimiento.md"),
        "b".repeat(reader::DOCUMENT_LIMIT as usize),
    );
    let read =
        reader::read_project_history_at(&fixture.app_data(), &env, &id, folder).expect("documents");
    let status: Vec<ProjectDocumentStatus> = read
        .documents
        .iter()
        .map(|document| document.status)
        .collect();
    assert_eq!(
        status,
        vec![
            ProjectDocumentStatus::Ok,
            ProjectDocumentStatus::Unreadable,
            ProjectDocumentStatus::Unreadable,
            ProjectDocumentStatus::Ok,
        ]
    );
    assert_eq!(read.documents[1].content, None);
    assert_eq!(
        read.documents[1].message.as_deref(),
        Some("arquitectura.md no es un archivo de texto.")
    );
    assert_eq!(read.documents[2].content, None);
    assert_eq!(
        read.documents[2].message.as_deref(),
        Some("verificacion.md supera el tamaño máximo que se lee (512 KiB).")
    );
    assert_eq!(
        read.documents[3].content.as_ref().map(String::len),
        Some(reader::DOCUMENT_LIMIT as usize),
        "exactly the limit is read"
    );
}

// H25-4c · `folder` manipulado → entrada no válida, antes de tocar el disco.
#[test]
fn projects_reader_rejects_folders_that_are_not_one_history() {
    let fixture = Fixture::new("reader-folder");
    let env = fixture.env();
    let id = pinned_reference(&fixture, &env);
    let absolute = fixture.path("p/hu/HU-0002-registro");
    let too_long = format!("HU-0002-{}", "a".repeat(120));
    for folder in [
        "",
        "..",
        "../p",
        "HU-0002-registro/..",
        "HU-0002-registro/../HU-0001-agenda",
        "HU-0002-a/b",
        "HU-0002-a\\b",
        "HU-0002-..",
        "/etc",
        absolute.to_str().expect("utf8"),
        "HU-12",
        "HU-12-mal",
        "HU-00021",
        "hu-0002-registro",
        "HU-0002-x:y",
        "HU-0002-tab\tx",
        "HU-0002-nul\0",
        "HU-0002-recortado…",
        too_long.as_str(),
    ] {
        let error = reader::read_project_history_at(&fixture.app_data(), &env, &id, folder)
            .expect_err(folder);
        assert_eq!(error.kind(), AppErrorKind::InvalidInput, "{folder:?}");
        assert_eq!(error.to_string(), "La historia no es válida.", "{folder:?}");
    }
    for folder in ["HU-0002", "HU-0002-registro"] {
        assert!(reader::validate_folder(folder).is_ok(), "{folder}");
    }
}

// H25-4d · Un `.md` que es un symlink fuera no se lee; un proyecto bajo la exclusión, tampoco.
#[cfg(unix)]
#[test]
fn projects_reader_keeps_symlink_deny_and_cloud_protections() {
    use std::os::unix::fs::symlink;
    let fixture = Fixture::new("reader-protect");
    let env = fixture.env();
    let id = pinned_reference(&fixture, &env);
    let folder = "HU-0002-registro";
    fixture.write("cerrada/arquitectura.md", "secreto de fuera");
    symlink(
        fixture.path("cerrada/arquitectura.md"),
        fixture.path(&format!("p/hu/{folder}/arquitectura.md")),
    )
    .expect("symlink");
    // Con la carpeta de destino cerrada, si se intentara leer daría «el sistema no deja leerlo».
    set_mode(&fixture.path("cerrada"), 0o000);
    let read = reader::read_project_history_at(&fixture.app_data(), &env, &id, folder);
    set_mode(&fixture.path("cerrada"), 0o755);
    let read = read.expect("documents");
    let architecture = &read.documents[1];
    assert_eq!(architecture.kind, ProjectDocumentKind::Architecture);
    assert_eq!(architecture.status, ProjectDocumentStatus::Unreadable);
    assert_eq!(architecture.content, None);
    assert!(
        architecture
            .message
            .as_deref()
            .is_some_and(|message| message.contains("fuera")),
        "{:?}",
        architecture.message
    );

    // La carpeta de la historia, un symlink hacia fuera.
    fixture.write("otra/HU-0007-x/hu.md", "fuera");
    symlink(
        fixture.path("otra/HU-0007-x"),
        fixture.path("p/hu/HU-0007-x"),
    )
    .expect("folder symlink");
    let error = reader::read_project_history_at(&fixture.app_data(), &env, &id, "HU-0007-x")
        .expect_err("outside folder");
    assert!(error.to_string().contains("fuera"), "{error}");

    // R-2 · Un symlink a otro archivo del mismo proyecto tampoco se sigue, ni la carpeta hacia otra carpeta.
    fixture.write("p/.env", "CLAVE=no");
    fixture.write("p/docs/hu.md", "no es una historia");
    let _ = fs::remove_file(fixture.path(&format!("p/hu/{folder}/seguimiento.md")));
    symlink("../../.env", fixture.path(&format!("p/hu/{folder}/seguimiento.md"))).expect("inner symlink");
    let read = reader::read_project_history_at(&fixture.app_data(), &env, &id, folder).expect("documents");
    let timeline = read
        .documents
        .iter()
        .find(|document| document.kind == ProjectDocumentKind::Timeline)
        .expect("timeline");
    assert_eq!(timeline.status, ProjectDocumentStatus::Unreadable);
    assert_eq!(timeline.content, None);
    assert!(read.documents.iter().all(|document| document.content.as_deref() != Some("CLAVE=no")));
    symlink("../docs", fixture.path("p/hu/HU-0008-docs")).expect("inner folder symlink");
    let error = reader::read_project_history_at(&fixture.app_data(), &env, &id, "HU-0008-docs")
        .expect_err("folder inside the project");
    assert!(error.to_string().contains("carpeta de la historia"), "{error}");

    // Nube: no se lee para no descargarlo.
    let mut cloud = fixture.env();
    cloud.cloud = |_, _| true;
    let read = reader::read_project_history_at(&fixture.app_data(), &cloud, &id, "HU-0001-agenda")
        .expect("documents");
    assert!(read.documents.iter().all(|document| {
        document.status == ProjectDocumentStatus::Unreadable
            && document
                .message
                .as_deref()
                .is_some_and(|message| message.contains("nube"))
    }));

    // Un anclado que hoy cae en la exclusión (p. ej. un symlink que ahora apunta a ~/.claude).
    write_reference_project(&fixture, "home/.claude/proyecto");
    let denied_id = Uuid::new_v4().to_string();
    let mut file = load_projects(&fixture.app_data()).expect("registry");
    file.projects.push(PinnedProject {
        id: denied_id.clone(),
        path: fixture
            .path("home/.claude/proyecto")
            .to_string_lossy()
            .into_owned(),
        last_name: None,
        pinned_at: now_rfc3339(),
        last_read_at: None,
    });
    save_projects(&fixture.app_data(), &file).expect("save");
    let error = reader::read_project_history_at(&fixture.app_data(), &env, &denied_id, folder)
        .expect_err("denied");
    assert_eq!(error.to_string(), FORBIDDEN_MESSAGE);
}

// H25-5 · Enlaces externos: solo http/https completos, reserializados.
#[test]
fn projects_external_link_accepts_only_full_http_urls() {
    let url = reader::external_link("https://x.test/a?b#c").expect("https");
    assert_eq!(url.as_str(), "https://x.test/a?b#c");
    assert!(reader::external_link("http://x.test").is_ok());
    let quoted = reader::external_link("https://x.test/a b\"c").expect("encoded");
    assert!(!quoted.as_str().contains([' ', '"']), "{quoted}");
    assert!(quoted.as_str().starts_with("https://"));
    let long_ok = format!("https://x.test/{}", "a".repeat(2_048 - 15));
    assert_eq!(long_ok.len(), 2_048);
    assert!(reader::external_link(&long_ok).is_ok());
    let too_long = format!("https://x.test/{}", "a".repeat(2_048));
    for raw in [
        "",
        "file:///etc/passwd",
        "javascript:alert(1)",
        "mailto:a@x.test",
        "data:text/html,hola",
        "ftp://x.test/a",
        "https://",
        "https://?q",
        "https://usuario@x.test/",
        "https://usuario:clave@x.test/",
        "https://:clave@x.test/",
        "/relativa/a",
        "relativa.md",
        "#ancla",
        "//x.test/a",
        "https://x.test/\na",
        "https://x.test/\u{7}",
        too_long.as_str(),
    ] {
        let error = reader::external_link(raw).expect_err(raw);
        assert_eq!(error.kind(), AppErrorKind::InvalidInput, "{raw:?}");
    }
}

// H25-6 · Nombres del contrato.
#[test]
fn projects_serializes_reader_and_gap_contract_names() {
    assert_eq!(
        serde_json::to_value(ProjectDataGap::NoTime).expect("json"),
        json!("noTime")
    );
    assert_eq!(
        serde_json::to_value(ProjectDataGap::NoMetrics).expect("json"),
        json!("noMetrics")
    );
    assert_eq!(
        serde_json::to_value(ProjectDocumentKind::Architecture).expect("json"),
        json!("architecture")
    );
    assert_eq!(
        serde_json::to_value(ProjectDocumentKind::Verification).expect("json"),
        json!("verification")
    );
    assert_eq!(
        serde_json::to_value(ProjectDocumentKind::Timeline).expect("json"),
        json!("timeline")
    );
    assert_eq!(
        serde_json::to_value(ProjectDocumentStatus::Unreadable).expect("json"),
        json!("unreadable")
    );
    let totals = serde_json::to_value(ProjectTotals::default()).expect("json");
    assert_eq!(totals["timedHistories"], json!(0));
    let documents = serde_json::to_value(ProjectHistoryDocuments {
        folder: "HU-0001-x".into(),
        documents: vec![ProjectDocument {
            kind: ProjectDocumentKind::Hu,
            file: "hu.md".into(),
            path: "hu/HU-0001-x/hu.md".into(),
            status: ProjectDocumentStatus::Ok,
            content: Some("# x".into()),
            message: None,
        }],
        read_at: "2026-10-30T10:00:00Z".into(),
    })
    .expect("json");
    assert_eq!(
        documents,
        json!({
            "folder": "HU-0001-x",
            "documents": [{
                "kind": "hu", "file": "hu.md", "path": "hu/HU-0001-x/hu.md",
                "status": "ok", "content": "# x", "message": null
            }],
            "readAt": "2026-10-30T10:00:00Z"
        })
    );
    let fixture = Fixture::new("gap-json");
    fixture.write("p/.metodo/config.json", config(json!([])));
    fixture.write(
        "p/hu/HU-0001-x/hu.md",
        frontmatter("HU-0001", "X", "terminada", "2026-10-01"),
    );
    let (info, _) = read_v4(&fixture, "p");
    let history = serde_json::to_value(&info.histories[0]).expect("json");
    assert_eq!(history["dataGaps"], json!(["noMetrics"]));
}
