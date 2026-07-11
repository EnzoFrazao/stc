import { useEffect, useMemo, useState } from "react";
import { tesauroObjects } from "./tesauroData";

type Role = "login" | "ug" | "stc";
type View =
  | "ug-dashboard"
  | "ug-cycle-detail"
  | "stc-dashboard"
  | "stc-create"
  | "stc-cycle-detail"
  | "stc-validation";
type SubmissionMode = "modelo" | "boxes";
type SubmissionStatus = "pendente" | "enviado" | "reaberto" | "aprovado";
type CycleStatus = "ativo" | "respondido" | "correcao" | "finalizado";
type Tone = "info" | "success" | "warning" | "danger" | "neutral";
type StepState = "done" | "active" | "todo";
type StepDefinition = [string, StepState];

interface FieldDefinition {
  id: string;
  label: string;
  type: string;
  hint: string;
  required?: boolean;
}

interface TransparencyObject {
  id: string;
  code: string;
  name: string;
  subject: string;
  cadence: string;
  format: string;
  source: string;
  description: string;
  scopeNote?: string;
  collectionSource?: string;
  suggestedUgs: readonly string[];
  fields: readonly FieldDefinition[];
}

interface Ug {
  id: string;
  acronym: string;
  name: string;
  contact: string;
  profile: string;
}

interface SubmissionState {
  status: SubmissionStatus;
  protocol: string;
  fileName: string;
  rejectionReason: string;
  reopenedItemId: string;
  checkedAt: string;
}

interface CycleDetails {
  title: string;
  deadline: string;
  observations: string;
  notificationChannel: "Email";
  seiNumber: string;
}

interface CycleItem {
  id: string;
  title: string;
  objectCode: string;
  objectName: string;
  createdAt: string;
  deadline: string;
  status: CycleStatus;
  seiNumber: string;
  ugIds: string[];
  metadataCount: number;
  metadataLabels: string[];
  fileName?: string;
  protocol?: string;
  submittedAt?: string;
  acceptedAt?: string;
  correctionNote?: string;
  validationNote?: string;
}

interface CycleFilters {
  status: "todos" | CycleStatus;
  object: string;
  ug: string;
  date: string;
}

const transparencyObjects = tesauroObjects as readonly TransparencyObject[];
const defaultObject =
  transparencyObjects.find((item) => item.code === "MT-0018") ?? transparencyObjects[0];

const ugs: Ug[] = [
  {
    id: "seduc",
    acronym: "SEDUC",
    name: "Secretaria de Estado da Educação",
    contact: "Ponto focal institucional",
    profile: "Responsável institucional",
  },
  {
    id: "saf",
    acronym: "SAF",
    name: "Secretaria de Administração",
    contact: "Coordenação administrativa",
    profile: "Respondente administrativo",
  },
  {
    id: "sinfra",
    acronym: "SINFRA",
    name: "Secretaria de Infraestrutura",
    contact: "Equipe técnica de obras",
    profile: "Respondente técnico",
  },
  {
    id: "sefaz",
    acronym: "SEFAZ",
    name: "Secretaria de Estado da Fazenda",
    contact: "Ouvidoria / TI interna",
    profile: "Respondente técnico",
  },
  {
    id: "stc",
    acronym: "STC",
    name: "Secretaria da Transparência e Controle",
    contact: "Equipe de coleta e validação",
    profile: "Equipe STC",
  },
];

const initialSubmission: SubmissionState = {
  status: "pendente",
  protocol: "",
  fileName: "",
  rejectionReason: "",
  reopenedItemId: "",
  checkedAt: "",
};

const initialCycleDetails: CycleDetails = {
  title: `Coleta ${defaultObject.code} - ${titleCase(defaultObject.name)}`,
  deadline: "2026-07-10",
  observations:
    "Prezados(as), segue solicitação padrão do ciclo Maranhão Transparente. O pedido formal permanece no SEI; a resposta deve ser enviada pela plataforma até o prazo indicado.",
  notificationChannel: "Email",
  seiNumber: "2026.000431/STC",
};

const today = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
}).format(new Date());

function titleCase(value: string) {
  return value.toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function Icon({
  name,
  size = 18,
}: {
  name:
    | "arrow"
    | "bell"
    | "box"
    | "check"
    | "chevron"
    | "clipboard"
    | "clock"
    | "edit"
    | "eye"
    | "file"
    | "filter"
    | "history"
    | "home"
    | "lock"
    | "mail"
    | "refresh"
    | "send"
    | "shield"
    | "upload"
    | "users"
    | "x";
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  const paths: Record<typeof name, JSX.Element> = {
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    box: (
      <>
        <path d="M21 8v8a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </>
    ),
    check: <path d="m20 6-11 11-5-5" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    clipboard: (
      <>
        <rect x="8" y="2" width="8" height="4" rx="1" />
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <path d="M8 13h8" />
        <path d="M8 17h5" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v6l4 2" />
      </>
    ),
    edit: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    file: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8" />
        <path d="M8 17h6" />
      </>
    ),
    filter: <path d="M22 3H2l8 9v7l4 2v-9z" />,
    history: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v6h6" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    refresh: (
      <>
        <path d="M21 12a9 9 0 0 1-15.6 6" />
        <path d="M3 12a9 9 0 0 1 15.6-6" />
        <path d="M21 3v6h-6" />
        <path d="M3 21v-6h6" />
      </>
    ),
    send: (
      <>
        <path d="m22 2-7 20-4-9-9-4z" />
        <path d="M22 2 11 13" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        <path d="m9 12 2 2 4-5" />
      </>
    ),
    upload: (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="M17 8 12 3 7 8" />
        <path d="M12 3v12" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    x: (
      <>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </>
    ),
  };

  return <svg {...common}>{paths[name]}</svg>;
}

function StatusPill({ children, tone }: { children: string; tone: Tone }) {
  return <span className={`status-pill ${tone}`}>{children}</span>;
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="section-header">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  value: string;
  hint: string;
  tone: Tone;
}) {
  return (
    <article className={`metric-card ${tone}`}>
      <div className="metric-icon">
        <Icon name={icon} />
      </div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{hint}</small>
      </div>
    </article>
  );
}

function TopBar({
  role,
  setRole,
  setView,
  mode,
  setMode,
  onProfileClick,
}: {
  role: Role;
  setRole: (role: Role) => void;
  setView: (view: View) => void;
  mode: SubmissionMode;
  setMode: (mode: SubmissionMode) => void;
  onProfileClick: () => void;
}) {
  return (
    <header className="topbar">
      <div className="brand-lockup">
        <span className="brand-mark">
          <Icon name="shield" />
        </span>
        <div>
          <strong>Agiliza Transparência</strong>
          <span>MVP 1.0 - coleta ponta a ponta</span>
        </div>
      </div>

      <div className="mode-toggle stc-accent" aria-label="Modelo de envio">
        <button
          type="button"
          className={mode === "modelo" ? "active" : ""}
          onClick={() => setMode("modelo")}
        >
          <Icon name="file" size={16} />
          Modelo padrão
        </button>
        <button
          type="button"
          className={mode === "boxes" ? "active" : ""}
          onClick={() => setMode("boxes")}
        >
          <Icon name="box" size={16} />
          Boxes por item
        </button>
      </div>

      <div className="topbar-actions">
        <span className="sei-chip">SEI formal obrigatório</span>
        <div className="role-switch" aria-label="Visão do protótipo">
          <button
            type="button"
            className={role === "ug" ? "active" : ""}
            onClick={() => {
              setRole("ug");
              setView("ug-dashboard");
            }}
          >
            UG
          </button>
          <button
            type="button"
            className={role === "stc" ? "active" : ""}
            onClick={() => {
              setRole("stc");
              setView("stc-dashboard");
            }}
          >
            STC
          </button>
        </div>
        {role !== "login" ? (
          <button type="button" className="profile-avatar" onClick={onProfileClick} aria-label="Abrir perfil">
            {role === "ug" ? "M" : "E"}
          </button>
        ) : null}
      </div>
      <span className="topbar-compact-note">SEI formal + resposta na plataforma</span>
    </header>
  );
}

function ProfileDrawer({ role, open, onClose }: { role: Role; open: boolean; onClose: () => void }) {
  if (!open || role === "login") return null;

  const isUg = role === "ug";
  return (
    <div className="profile-drawer-layer" aria-live="polite">
      <button type="button" className="drawer-backdrop" onClick={onClose} aria-label="Fechar perfil" />
      <aside className="profile-drawer">
        <div className="drawer-head">
          <div className="profile-avatar large">{isUg ? "M" : "E"}</div>
          <div>
            <span className="eyebrow">Perfil de acesso</span>
            <h3>{isUg ? "Maria Costa" : "Equipe STC"}</h3>
            <p>{isUg ? "Ponto focal institucional" : "Coleta e validação"}</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar">
            <Icon name="x" />
          </button>
        </div>

        <div className="drawer-section">
          <span>Unidade</span>
          <strong>{isUg ? "SEDUC" : "STC"}</strong>
          <p>{isUg ? "Secretaria de Estado da Educação" : "Secretaria da Transparência e Controle"}</p>
        </div>
        <div className="drawer-section">
          <span>{isUg ? "Responsável" : "Função"}</span>
          <strong>{isUg ? "Maria Costa · ponto focal" : "Equipe responsável pela coleta"}</strong>
          <p>{isUg ? "Recebe ciclos, acompanha pendências e pode responder." : "Cria ciclos, acompanha respostas e valida envios."}</p>
        </div>
        <div className="drawer-section">
          <span>{isUg ? "Respondente técnico" : "Escopo operacional"}</span>
          <strong>{isUg ? "João Lima · setor de contratos" : "SEI formal + plataforma"}</strong>
          <p>{isUg ? "Preenche dados de licitações quando acionado." : "O SEI formaliza o pedido; a plataforma coleta, registra e comprova."}</p>
        </div>
      </aside>
    </div>
  );
}

function Sidebar({
  role,
  view,
  setView,
}: {
  role: Role;
  view: View;
  setView: (view: View) => void;
}) {
  if (role === "ug") return null;
  if (role === "login") return null;

  const items: Array<{ id: View; label: string; icon: Parameters<typeof Icon>[0]["name"] }> = [
    { id: "stc-dashboard", label: "Painel STC", icon: "home" },
    { id: "stc-create", label: "Criar ciclo", icon: "filter" },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-card">
        <span>Visão atual</span>
        <strong>Equipe STC</strong>
        <small>Coleta e validação</small>
      </div>
      <nav>
        {items.map((item) => {
          const active =
            view === item.id ||
            (item.id === "stc-dashboard" && (view === "stc-cycle-detail" || view === "stc-validation"));
          return (
            <button
              key={item.id}
              type="button"
              className={active ? "active" : ""}
              onClick={() => setView(item.id)}
            >
              <Icon name={item.icon} size={16} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function LoginScreen({
  setRole,
  setView,
}: {
  setRole: (role: Role) => void;
  setView: (view: View) => void;
}) {
  return (
    <div className="login-screen login-aurora">
      <section className="login-copy">
        <div className="brand-lockup large">
          <span className="brand-mark">
            <Icon name="shield" />
          </span>
          <div>
            <strong>Agiliza Transparência</strong>
            <span>Protótipo visual do MVP</span>
          </div>
        </div>
        <span className="login-kicker">SEI formal preservado</span>
        <h1>Coleta estruturada, resposta rastreável e validação em um só fluxo.</h1>
        <p>
          Uma simulação para discutir o MVP: a STC cria ciclos, as UGs respondem pela plataforma e
          o histórico fica consultável por ciclo.
        </p>
        <div className="login-actions">
          <button
            type="button"
            className="primary-button ripple-button"
            onClick={() => {
              setRole("ug");
              setView("ug-dashboard");
            }}
          >
            <Icon name="users" />
            Entrar como UG
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setRole("stc");
              setView("stc-dashboard");
            }}
          >
            <Icon name="shield" />
            Entrar como STC
          </button>
        </div>
      </section>

      <section className="login-preview" aria-label="Prévia do fluxo">
        <div className="preview-card main">
          <span className="eyebrow">Fluxo MVP</span>
          <h3>Pedido no SEI, resposta na plataforma</h3>
          <div className="preview-flow">
            <div>
              <Icon name="file" />
              <strong>SEI</strong>
              <span>pedido formal</span>
            </div>
            <div>
              <Icon name="send" />
              <strong>UG</strong>
              <span>resposta</span>
            </div>
            <div>
              <Icon name="clipboard" />
              <strong>STC</strong>
              <span>validação</span>
            </div>
            <div>
              <Icon name="check" />
              <strong>Comprovante</strong>
              <span>registro salvo</span>
            </div>
          </div>
        </div>
        <div className="preview-card compact">
          <strong>4 ciclos</strong>
          <span>ativo, respondido, correção e finalizado</span>
        </div>
        <div className="preview-card compact dark">
          <strong>Tesauro</strong>
          <span>objeto sugere UGs e metadados</span>
        </div>
      </section>
    </div>
  );
}

function CycleDashboard({
  cycles,
  scope,
}: {
  cycles: CycleItem[];
  scope: "stc" | "ug";
}) {
  const metrics =
    scope === "stc"
      ? [
          ["Ciclos ativos", cycles.filter((cycle) => cycle.status === "ativo").length, "Coletas abertas", "info"] as const,
          ["Respondidos", cycles.filter((cycle) => cycle.status === "respondido").length, "Aguardam decisão STC", "success"] as const,
          [
            "Aguardando correção",
            cycles.filter((cycle) => cycle.status === "correcao").length,
            "Reabertos para UG",
            "danger",
          ] as const,
          ["Finalizados", cycles.filter((cycle) => cycle.status === "finalizado").length, "Ciclo encerrado", "neutral"] as const,
        ]
      : [
          ["Ativos", cycles.filter((cycle) => cycle.status === "ativo").length, "Responder solicitação", "info"] as const,
          ["Respondidos", cycles.filter((cycle) => cycle.status === "respondido").length, "Aguardam STC", "success"] as const,
          ["Devolvidos", cycles.filter((cycle) => cycle.status === "correcao").length, "Correção solicitada", "danger"] as const,
          ["Finalizados", cycles.filter((cycle) => cycle.status === "finalizado").length, "Comprovante aceito", "neutral"] as const,
        ];

  return (
    <div className="metrics-grid dashboard-metrics">
      {metrics.map(([label, value, hint, tone]) => (
        <MetricCard
          key={label}
          icon={tone === "danger" ? "refresh" : tone === "success" ? "check" : "clipboard"}
          label={label}
          value={String(value)}
          hint={hint}
          tone={tone}
        />
      ))}
    </div>
  );
}

function StcDashboard({
  cycles,
  setView,
  setActiveCycleId,
  cycleDetails,
  setCycleDetails,
}: {
  cycles: CycleItem[];
  setView: (view: View) => void;
  setActiveCycleId: (id: string) => void;
  cycleDetails: CycleDetails;
  setCycleDetails: (details: CycleDetails) => void;
}) {
  const [filters, setFilters] = useState<CycleFilters>({
    status: "todos",
    object: "todos",
    ug: "todos",
    date: "",
  });

  const filteredCycles = cycles.filter((cycle) => {
    const statusMatch = filters.status === "todos" || cycle.status === filters.status;
    const objectMatch = filters.object === "todos" || cycle.objectCode === filters.object;
    const ugMatch = filters.ug === "todos" || cycle.ugIds.includes(filters.ug);
    const dateMatch = !filters.date || cycle.deadline === filters.date || cycle.createdAt.includes(filters.date);
    return statusMatch && objectMatch && ugMatch && dateMatch;
  });

  const openCycle = (cycleId: string, target: View) => {
    setActiveCycleId(cycleId);
    setView(target);
  };

  return (
    <div className="workflow-page wide-page stc-dashboard-page">
      <SectionHeader
        eyebrow="Painel STC"
        title="Ciclos de coleta"
        description="O painel concentra filtros, detalhes, validação e histórico de cada ciclo."
      />

      <CycleDashboard cycles={cycles} scope="stc" />

      <section className="card filter-panel">
        <div>
          <span className="eyebrow">Filtros do painel</span>
          <h3>Encontrar ciclo por status, objeto, UG ou data</h3>
        </div>
        <div className="filters-grid">
          <label>
            Status
            <select
              value={filters.status}
              onChange={(event) => setFilters({ ...filters, status: event.target.value as CycleFilters["status"] })}
            >
              <option value="todos">Todos</option>
              <option value="ativo">Ativo</option>
              <option value="respondido">Respondido</option>
              <option value="correcao">Aguardando correção</option>
              <option value="finalizado">Finalizado</option>
            </select>
          </label>
          <label>
            Objeto
            <select value={filters.object} onChange={(event) => setFilters({ ...filters, object: event.target.value })}>
              <option value="todos">Todos</option>
              {cycles.map((cycle) => (
                <option key={cycle.id} value={cycle.objectCode}>
                  {cycle.objectCode}
                </option>
              ))}
            </select>
          </label>
          <label>
            UG
            <select value={filters.ug} onChange={(event) => setFilters({ ...filters, ug: event.target.value })}>
              <option value="todos">Todas</option>
              {ugs.filter((ug) => ug.id !== "stc").map((ug) => (
                <option key={ug.id} value={ug.id}>
                  {ug.acronym}
                </option>
              ))}
            </select>
          </label>
          <label>
            Data/prazo
            <input
              type="date"
              value={filters.date}
              onChange={(event) => setFilters({ ...filters, date: event.target.value })}
            />
          </label>
        </div>
      </section>

      <section className="card cycle-list-card stc-cycle-list-card">
        <div className="table-header">
          <div>
            <span className="eyebrow">Ciclos criados</span>
            <h3>Lista operacional</h3>
          </div>
          <button type="button" className="primary-button ripple-button" onClick={() => setView("stc-create")}>
            <Icon name="filter" />
            Novo ciclo
          </button>
        </div>

        <div className="cycle-list stc-cycle-list">
          {filteredCycles.map((cycle, index) => (
            <article key={cycle.id} className="cycle-row-card stc-cycle-row">
              <div className="cycle-row-main">
                <div>
                  <strong>{cycle.title}</strong>
                  <span>
                    {cycle.objectCode} · {cycle.objectName}
                  </span>
                </div>
                <StatusPill tone={cycleTone(cycle.status)}>{cycleLabel(cycle.status, "stc")}</StatusPill>
              </div>

              <div className="cycle-meta-grid">
                <span>{cycle.createdAt}</span>
                <span>{cycle.ugIds.length} UGs</span>
                <span>{cycle.metadataCount} metadados</span>
                <label>
                  Número do SEI
                  <input
                    value={cycle.id === "ciclo-atual" ? cycleDetails.seiNumber : cycle.seiNumber}
                    onChange={(event) =>
                      cycle.id === "ciclo-atual"
                        ? setCycleDetails({ ...cycleDetails, seiNumber: event.target.value })
                        : undefined
                    }
                    readOnly={cycle.id !== "ciclo-atual"}
                  />
                </label>
              </div>

              <div className="cycle-row-note">
                <span>{cycleStatusHelp(cycle)}</span>
              </div>

              <div className="card-actions compact">
                {index === 0 ? (
                  <button type="button" className="ghost-button" onClick={() => setView("stc-create")}>
                    <Icon name="edit" />
                    Editar ciclo
                  </button>
                ) : null}
                <button type="button" className="secondary-button" onClick={() => openCycle(cycle.id, "stc-cycle-detail")}>
                  <Icon name="eye" />
                  Exibir detalhes
                </button>
                <button type="button" className="primary-button ripple-button" onClick={() => openCycle(cycle.id, "stc-validation")}>
                  <Icon name="clipboard" />
                  Validar respostas
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function StcCreateCycle({
  object,
  objects,
  onObjectChange,
  selectedUgs,
  setSelectedUgs,
  selectedMetadataIds,
  setSelectedMetadataIds,
  mode,
  cycleDetails,
  setCycleDetails,
  onCycleAction,
}: {
  object: TransparencyObject;
  objects: readonly TransparencyObject[];
  onObjectChange: (id: string) => void;
  selectedUgs: string[];
  setSelectedUgs: (ids: string[]) => void;
  selectedMetadataIds: string[];
  setSelectedMetadataIds: (ids: string[]) => void;
  mode: SubmissionMode;
  cycleDetails: CycleDetails;
  setCycleDetails: (details: CycleDetails) => void;
  onCycleAction: () => void;
}) {
  const availableUgs = ugs.filter((ug) => ug.id !== "stc");
  const orderedObjects = [object, ...objects.filter((item) => item.id !== object.id)];
  const selectedUgRows = selectedUgs
    .map((ugId) => availableUgs.find((ug) => ug.id === ugId))
    .filter((ug): ug is Ug => Boolean(ug));
  const selectedFields = object.fields.filter((field) => selectedMetadataIds.includes(field.id));

  const toggleUg = (ugId: string) => {
    setSelectedUgs(
      selectedUgs.includes(ugId)
        ? selectedUgs.filter((id) => id !== ugId)
        : [...selectedUgs, ugId],
    );
  };

  const toggleMetadata = (fieldId: string) => {
    setSelectedMetadataIds(
      selectedMetadataIds.includes(fieldId)
        ? selectedMetadataIds.filter((id) => id !== fieldId)
        : [...selectedMetadataIds, fieldId],
    );
  };

  return (
    <div className="workflow-page wide-page">
      <SectionHeader
        eyebrow="Criação STC"
        title="Montar ciclo de coleta"
        description="O funil invertido parte do objeto do Tesauro e sugere UGs/metadados. A STC ajusta antes de acionar."
      />

      <div className="create-workspace">
        <section className="card create-card span-5">
          <div className="card-title-line">
            <Icon name="filter" />
            <div>
              <span className="eyebrow">Funil invertido</span>
              <h3>Objeto define UGs e campos esperados</h3>
            </div>
          </div>

          <div className="object-scroll">
            {orderedObjects.map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.id === object.id ? "tesauro-object-button selected" : "tesauro-object-button"}
                onClick={() => onObjectChange(item.id)}
              >
                <span>{item.code}</span>
                <strong>{titleCase(item.name)}</strong>
                <small>{item.subject}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="card create-card span-4">
          <span className="eyebrow">UGs sugeridas</span>
          <h3>Adicionar/remover órgãos</h3>
          <p className="muted-text">
            A sugestão vem pelo objeto. A edição não decide se a UG deveria receber; apenas monta o ciclo.
          </p>

          <div className="selection-list">
            {availableUgs.map((ug) => {
              const selected = selectedUgs.includes(ug.id);
              const suggested = object.suggestedUgs.includes(ug.id);
              return (
                <button
                  key={ug.id}
                  type="button"
                  className={selected ? "selection-row selected" : "selection-row"}
                  onClick={() => toggleUg(ug.id)}
                >
                  <span className="check-box">{selected ? <Icon name="check" size={14} /> : null}</span>
                  <span>
                    <strong>{ug.acronym}</strong>
                    <small>{ug.name}</small>
                  </span>
                  <em>{suggested ? "Sugerida" : "Editável"}</em>
                </button>
              );
            })}
          </div>
        </section>

        <section className="card create-card span-3">
          <span className="eyebrow">Adicionar/remover metadados</span>
          <h3>Campos obrigatórios</h3>
          <p className="muted-text">Todos vêm pré-selecionados a partir do Tesauro.</p>

          <div className="metadata-list">
            {object.fields.map((field) => {
              const selected = selectedMetadataIds.includes(field.id);
              return (
                <button
                  key={field.id}
                  type="button"
                  className={selected ? "metadata-row selected" : "metadata-row"}
                  onClick={() => toggleMetadata(field.id)}
                >
                  <span>{selected ? <Icon name="check" size={14} /> : null}</span>
                  <strong>{field.label}</strong>
                  <small>{field.type}</small>
                </button>
              );
            })}
          </div>
        </section>

        <section className="card create-card span-7">
          <span className="eyebrow">Detalhes e notificação</span>
          <h3>Dados editáveis do acionamento</h3>

          <div className="details-form">
            <label>
              Título
              <input
                value={cycleDetails.title}
                onChange={(event) => setCycleDetails({ ...cycleDetails, title: event.target.value })}
              />
            </label>
            <label>
              Prazo
              <input
                type="date"
                value={cycleDetails.deadline}
                onChange={(event) => setCycleDetails({ ...cycleDetails, deadline: event.target.value })}
              />
            </label>
            <label>
              Número do SEI
              <input
                value={cycleDetails.seiNumber}
                onChange={(event) => setCycleDetails({ ...cycleDetails, seiNumber: event.target.value })}
              />
            </label>
            <label>
              Canal de notificação
              <input value={cycleDetails.notificationChannel} readOnly />
            </label>
            <label className="full-row">
              Observações / email padrão
              <textarea
                value={cycleDetails.observations}
                onChange={(event) => setCycleDetails({ ...cycleDetails, observations: event.target.value })}
              />
            </label>
          </div>
        </section>

        <section className="card cycle-highlight-card span-5">
          <div className="cycle-highlight-head">
            <div>
              <span className="eyebrow">Resumo da solicitação</span>
              <h3>Ciclo pronto para acionamento</h3>
              <p>Origem, órgãos e campos ficam visíveis antes da STC disparar a coleta.</p>
            </div>
            <StatusPill tone="info">{`Origem ${object.source}`}</StatusPill>
          </div>

          <div className="summary-metrics">
            <div>
              <strong>{object.code}</strong>
              <span>{titleCase(object.name)}</span>
            </div>
            <div>
              <strong>{selectedUgRows.length}</strong>
              <span>órgãos escolhidos</span>
            </div>
            <div>
              <strong>{selectedFields.length}</strong>
              <span>campos obrigatórios</span>
            </div>
            <div>
              <strong>{cycleDetails.notificationChannel}</strong>
              <span>canal de comunicação</span>
            </div>
            <div>
              <strong>{mode === "modelo" ? "Modelo" : "Boxes"}</strong>
              <span>forma de resposta</span>
            </div>
            <div>
              <strong>{cycleDetails.deadline}</strong>
              <span>prazo do ciclo</span>
            </div>
          </div>

          <div className="tag-cloud">
            {selectedFields.slice(0, 8).map((field) => (
              <span key={field.id}>{field.label}</span>
            ))}
          </div>

          <button type="button" className="primary-button ripple-button" onClick={onCycleAction}>
            <Icon name="send" />
            Acionar ciclo e exibir detalhes
          </button>
        </section>
      </div>
    </div>
  );
}

function StcCycleDetail({
  cycle,
  setView,
}: {
  cycle: CycleItem;
  setView: (view: View) => void;
}) {
  return (
    <div className="workflow-page wide-page">
      <SectionHeader
        eyebrow="Detalhes do ciclo"
        title={cycle.title}
        description="Detalhe, histórico e validação ficam ligados ao ciclo selecionado no painel."
      />

      <div className="detail-layout">
        <section className="card cycle-highlight-card">
          <div className="cycle-highlight-head">
            <div>
              <span className="eyebrow">{cycle.objectCode}</span>
              <h3>{cycle.objectName}</h3>
              <p>{cycleStatusHelp(cycle)}</p>
            </div>
            <StatusPill tone={cycleTone(cycle.status)}>{cycleLabel(cycle.status, "stc")}</StatusPill>
          </div>
          <div className="cycle-summary">
            <div>
              <strong>{cycle.seiNumber}</strong>
              <span>processo SEI</span>
            </div>
            <div>
              <strong>{cycle.deadline}</strong>
              <span>prazo</span>
            </div>
            <div>
              <strong>{cycle.ugIds.length}</strong>
              <span>UGs acionadas</span>
            </div>
            <div>
              <strong>{cycle.metadataCount}</strong>
              <span>metadados</span>
            </div>
          </div>
          {cycle.correctionNote ? (
            <div className="alert danger">
              <Icon name="refresh" />
              <div>
                <strong>Observação da devolução</strong>
                <span>{cycle.correctionNote}</span>
              </div>
            </div>
          ) : null}
          <div className="card-actions">
            <button type="button" className="secondary-button" onClick={() => setView("stc-dashboard")}>
              <Icon name="arrow" />
              Voltar ao painel
            </button>
            <button type="button" className="primary-button ripple-button" onClick={() => setView("stc-validation")}>
              <Icon name="clipboard" />
              Validar respostas
            </button>
          </div>
        </section>

        <section className="card">
          <span className="eyebrow">UGs e metadados</span>
          <h3>Escopo do ciclo</h3>
          <div className="mini-ug-list">
            {cycle.ugIds.map((ugId) => {
              const ug = ugs.find((item) => item.id === ugId);
              return (
                <div key={ugId}>
                  <strong>{ug?.acronym ?? ugId}</strong>
                  <span>{ug?.name ?? "UG selecionada"}</span>
                </div>
              );
            })}
          </div>
          <div className="tag-cloud detail-tags">
            {cycle.metadataLabels.slice(0, 10).map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </section>
      </div>

      <section className="card cycle-list-card">
        <div className="table-header">
          <div>
            <span className="eyebrow">Histórico do ciclo</span>
            <h3>Eventos registrados</h3>
          </div>
        </div>
        <CycleTimeline cycle={cycle} />
      </section>
    </div>
  );
}

function StcValidation({
  cycle,
  object,
  mode,
  selectedUgs,
  selectedMetadataIds,
  submission,
  setSubmission,
  validationUgId,
  setValidationUgId,
  setView,
  setRole,
}: {
  cycle: CycleItem;
  object: TransparencyObject;
  mode: SubmissionMode;
  selectedUgs: string[];
  selectedMetadataIds: string[];
  submission: SubmissionState;
  setSubmission: (state: SubmissionState) => void;
  validationUgId: string;
  setValidationUgId: (id: string) => void;
  setView: (view: View) => void;
  setRole: (role: Role) => void;
}) {
  const cycleUgIds = cycle.id === "ciclo-atual" ? selectedUgs : cycle.ugIds;
  const selectedUgRows = cycleUgIds
    .map((ugId) => ugs.find((ug) => ug.id === ugId))
    .filter((ug): ug is Ug => Boolean(ug));
  const primaryUg = selectedUgRows[0];
  const currentUg = selectedUgRows.find((ug) => ug.id === validationUgId) ?? primaryUg;
  const currentIsPrimary = currentUg?.id === primaryUg?.id;
  const fields =
    cycle.id === "ciclo-atual"
      ? object.fields.filter((field) => selectedMetadataIds.includes(field.id))
      : cycle.metadataLabels.map((label) => ({
          id: label.toLowerCase().replace(/\W+/g, "-"),
          label,
          type: "Tesauro",
          hint: "Campo do ciclo selecionado.",
        }));
  const received = currentIsPrimary && cycle.status !== "ativo";
  const defaultRejectReason =
    cycle.correctionNote ||
    (mode === "boxes"
      ? "Fonte oficial ausente no box solicitado. Reenvie apenas este item."
      : "Arquivo fora do modelo esperado. Ajuste a planilha e envie novamente.");
  const [rejectReasonDraft, setRejectReasonDraft] = useState(defaultRejectReason);
  const canReject = received && rejectReasonDraft.trim().length > 0 && cycle.status !== "finalizado";

  const reject = () => {
    if (!canReject) return;
    const reopenedItemId = mode === "boxes" ? fields[fields.length - 1]?.id ?? "" : "";
    setSubmission({
      ...submission,
      status: "reaberto",
      rejectionReason: rejectReasonDraft.trim(),
      reopenedItemId,
      checkedAt: today,
    });
  };

  const approve = () => {
    if (!received) return;
    setSubmission({
      ...submission,
      status: "aprovado",
      rejectionReason: "",
      reopenedItemId: "",
      checkedAt: today,
    });
  };

  return (
    <div className="workflow-page wide-page">
      <SectionHeader
        eyebrow="Validação STC"
        title="Receber, aprovar ou rejeitar"
        description="Cada ciclo do painel demonstra um caso: sem envio, recebido, devolvido para correção ou finalizado."
      />

      <div className="validation-grid">
        <section className="card">
          <div className="table-header">
            <h3>Respostas por UG</h3>
            <StatusPill tone={cycleTone(cycle.status)}>{cycleLabel(cycle.status, "stc")}</StatusPill>
          </div>

          <div className="data-table">
            <div className="table-row head">
              <span>UG</span>
              <span>Envio</span>
              <span>Status</span>
              <span>Atualização</span>
            </div>
            {selectedUgRows.map((ug, index) => {
              const isMain = index === 0;
              const rowStatus = isMain ? cycle.status : "ativo";
              return (
                <button
                  type="button"
                  className={ug.id === currentUg?.id ? "table-row validation-click-row selected" : "table-row validation-click-row"}
                  key={ug.id}
                  onClick={() => setValidationUgId(ug.id)}
                >
                  <span>
                    <strong>{ug.acronym}</strong>
                    <small>{ug.contact}</small>
                  </span>
                  <span>{isMain && cycle.fileName ? cycle.fileName : isMain && received ? "Resposta enviada" : "Sem envio"}</span>
                  <span>
                    <StatusPill tone={cycleTone(rowStatus)}>{validationRowLabel(rowStatus)}</StatusPill>
                  </span>
                  <span>{isMain && received ? cycle.submittedAt || today : "-"}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="card">
          <span className="eyebrow">Detalhe da {currentUg?.acronym ?? "UG"}</span>
          <h3>{cycle.objectName}</h3>
          {!received ? (
            <div className="empty-state">
              <Icon name="clock" size={28} />
              <strong>Aguardando envio</strong>
              <span>A UG selecionada ainda não respondeu pela plataforma.</span>
            </div>
          ) : cycle.status === "finalizado" ? (
            <ReceiptSummary cycle={cycle} compact />
          ) : cycle.status === "correcao" ? (
            <>
              <div className="alert danger">
                <Icon name="refresh" />
                <div>
                  <strong>Devolvido para correção</strong>
                  <span>{cycle.correctionNote || submission.rejectionReason}</span>
                </div>
              </div>
              <CycleTimeline cycle={cycle} />
            </>
          ) : (
            <>
              <div className="received-box">
                <Icon name={mode === "modelo" ? "file" : "box"} />
                <div>
                  <span>Resposta recebida</span>
                  <strong>{cycle.fileName || submission.fileName || "Resposta recebida"}</strong>
                  <span>Checagem básica concluída em {cycle.submittedAt || submission.checkedAt || today}</span>
                </div>
              </div>

              <div className="review-list">
                {fields.slice(0, 6).map((field) => {
                  const reopened = submission.reopenedItemId === field.id;
                  return (
                    <div key={field.id} className={reopened ? "review-item rejected" : "review-item"}>
                      <div>
                        <strong>{field.label}</strong>
                        <span>{reopened ? "Reaberto para correção" : "Recebido com formato válido"}</span>
                      </div>
                      <StatusPill tone={reopened ? "danger" : "success"}>
                        {reopened ? "Rejeitado" : "OK"}
                      </StatusPill>
                    </div>
                  );
                })}
              </div>

              <label className="field-label">
                <span>Justificativa da rejeição</span>
                <textarea
                  aria-label="Justificativa da rejeicao"
                  required
                  value={rejectReasonDraft}
                  onChange={(event) => setRejectReasonDraft(event.target.value)}
                />
              </label>

              <div className="decision-actions">
                <button type="button" className="danger-button ripple-button" disabled={!canReject} onClick={reject}>
                  <Icon name="x" />
                  {mode === "boxes" ? "Reabrir item" : "Rejeitar envio"}
                </button>
                <button type="button" className="primary-button ripple-button" onClick={approve}>
                  <Icon name="check" />
                  Aprovar resposta
                </button>
              </div>
            </>
          )}

          <button
            type="button"
            className="ghost-button full"
            onClick={() => {
              setRole("ug");
              setView("ug-cycle-detail");
            }}
          >
            <Icon name="users" />
            Ver visão da UG
          </button>
        </section>
      </div>
    </div>
  );
}

function UgDashboard({
  cycles,
  setActiveCycleId,
  setView,
}: {
  cycles: CycleItem[];
  setActiveCycleId: (id: string) => void;
  setView: (view: View) => void;
}) {
  const openCycle = (cycleId: string) => {
    setActiveCycleId(cycleId);
    setView("ug-cycle-detail");
  };

  return (
    <div className="workflow-page ug-home wide-page">
      <SectionHeader
        eyebrow="Visão UG"
        title="Painel da unidade gestora"
        description="A UG acompanha ciclos e entra no detalhe para responder, revisar envio, corrigir ou abrir comprovante."
      />

      <CycleDashboard cycles={cycles} scope="ug" />

      <section className="card cycle-list-card ug-list-card">
        <div className="table-header">
          <div>
            <span className="eyebrow">Solicitações da UG</span>
            <h3>Ciclos disponíveis</h3>
          </div>
          <StatusPill tone="info">Pedido no SEI · resposta na plataforma</StatusPill>
        </div>

        <div className="ug-cycle-list">
          {cycles.map((cycle) => (
            <article key={cycle.id} className={`ug-cycle-row ${cycle.status}`}>
              <div className="ug-cycle-status">
                <StatusPill tone={cycleTone(cycle.status)}>{cycleLabel(cycle.status, "ug")}</StatusPill>
                <span>{cycle.deadline}</span>
              </div>
              <div className="ug-cycle-main">
                <strong>{cycle.title}</strong>
                <span>
                  {cycle.objectCode} · {cycle.objectName} · SEI {cycle.seiNumber}
                </span>
                {cycle.correctionNote ? <p>{cycle.correctionNote}</p> : <p>{cycleStatusHelp(cycle)}</p>}
              </div>
              <div className="ug-cycle-meta">
                <span>{cycle.metadataCount} campos</span>
                <span>{cycle.fileName || "Sem arquivo enviado"}</span>
              </div>
              <button
                type="button"
                className={cycle.status === "ativo" ? "primary-button ripple-button" : "secondary-button"}
                onClick={() => openCycle(cycle.id)}
              >
                <Icon name={cycleActionIcon(cycle.status)} />
                {cycleActionLabel(cycle.status)}
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function UgCycleDetail({
  cycle,
  object,
  mode,
  submission,
  setSubmission,
  setView,
}: {
  cycle: CycleItem;
  object: TransparencyObject;
  mode: SubmissionMode;
  submission: SubmissionState;
  setSubmission: (state: SubmissionState) => void;
  setView: (view: View) => void;
}) {
  return (
    <div className="workflow-page wide-page">
      <SectionHeader
        eyebrow="Detalhe do ciclo"
        title={cycle.title}
        description="Esta tela só abre a partir do ciclo selecionado no painel da UG."
      />

      {cycle.status === "ativo" ? (
        <UgResponseFlow
          cycle={cycle}
          object={object}
          mode={mode}
          submission={submission}
          setSubmission={setSubmission}
          setView={setView}
        />
      ) : cycle.status === "respondido" ? (
        <ReadOnlySubmission cycle={cycle} setView={setView} />
      ) : cycle.status === "correcao" ? (
        <>
          <div className="alert danger wide">
            <Icon name="refresh" />
            <div>
              <strong>Devolvido para correção</strong>
              <span>{cycle.correctionNote}</span>
            </div>
          </div>
          <UgResponseFlow
            cycle={cycle}
            object={object}
            mode={mode}
            submission={{ ...submission, status: "reaberto", rejectionReason: cycle.correctionNote || "" }}
            setSubmission={setSubmission}
            setView={setView}
          />
        </>
      ) : (
        <ReceiptSummary cycle={cycle} />
      )}
    </div>
  );
}

function UgResponseFlow({
  cycle,
  object,
  mode,
  submission,
  setSubmission,
  setView,
}: {
  cycle: CycleItem;
  object: TransparencyObject;
  mode: SubmissionMode;
  submission: SubmissionState;
  setSubmission: (state: SubmissionState) => void;
  setView: (view: View) => void;
}) {
  const steps = getSubmissionSteps(submission.status);
  const send = () => {
    setSubmission({
      status: "enviado",
      protocol: "AG-2026-00031",
      fileName:
        mode === "modelo"
          ? "licitacoes_seduc_2026_07.xlsx"
          : `${object.code.toLowerCase()}_boxes_seduc.json`,
      rejectionReason: "",
      reopenedItemId: "",
      checkedAt: today,
    });
    setView("ug-cycle-detail");
  };

  return (
    <section className="card response-flow dedicated-response">
      <div className="table-header">
        <div>
          <span className="eyebrow">{cycle.objectCode}</span>
          <h3>{titleCase(object.name)}</h3>
          <p>Pedido formal no SEI. Resposta e comprovante pela plataforma.</p>
        </div>
        <StatusPill tone={statusTone(submission.status)}>{statusLabel(submission.status)}</StatusPill>
      </div>

      <div className="step-grid">
        {steps.map(([label, state], index) => (
          <article key={label} className={`step-card ${state}`}>
            <span>{state === "done" ? <Icon name="check" size={14} /> : index + 1}</span>
            <strong>{label}</strong>
          </article>
        ))}
      </div>

      <div className="model-upload-grid">
        <article className="model-preview">
          <span className="eyebrow">Modelo padrão disponível</span>
          <h4>{object.code}_modelo_coleta.xlsx</h4>
          <p>
            Exemplo com campos esperados, identificação da UG, número do SEI e regras mínimas de
            preenchimento.
          </p>
          <div className="mini-sheet">
            {object.fields.slice(0, 5).map((field) => (
              <span key={field.id}>{field.label}</span>
            ))}
          </div>
        </article>

        <article className="upload-demo">
          <span className="eyebrow">Fluxo exemplo de envio</span>
          <h4>{mode === "modelo" ? "Enviar arquivo consolidado" : "Preencher boxes por item"}</h4>
          {mode === "modelo" ? (
            <div className="dropzone">
              <Icon name="upload" size={28} />
              <strong>Selecionar arquivo</strong>
              <span>XLSX, CSV ou documento aceito pela regra do ciclo</span>
            </div>
          ) : (
            <div className="box-demo-list">
              {object.fields.slice(0, 4).map((field) => (
                <label key={field.id}>
                  {field.label}
                  <input placeholder={field.type} />
                </label>
              ))}
            </div>
          )}
        </article>
      </div>

      <div className="quality-strip">
        <Icon name="check" />
        <div>
          <strong>Checagem básica antes do envio</strong>
          <span>Presença de arquivo/campos, formato mínimo e metadados obrigatórios.</span>
        </div>
      </div>

      <div className="card-actions">
        <button type="button" className="secondary-button" onClick={() => setView("ug-dashboard")}>
          <Icon name="arrow" />
          Voltar ao painel
        </button>
        <button type="button" className="primary-button ripple-button" onClick={send}>
          <Icon name="send" />
          Enviar e gerar comprovante
        </button>
      </div>
    </section>
  );
}

function ReadOnlySubmission({ cycle, setView }: { cycle: CycleItem; setView: (view: View) => void }) {
  return (
    <div className="detail-layout">
      <section className="card">
        <span className="eyebrow">Envio respondido</span>
        <h3>Resposta enviada pela UG</h3>
        <div className="received-box">
          <Icon name="file" />
          <div>
            <strong>{cycle.fileName}</strong>
            <span>Protocolo {cycle.protocol} · enviado em {cycle.submittedAt}</span>
          </div>
        </div>
        <div className="review-list">
          {cycle.metadataLabels.slice(0, 6).map((label) => (
            <div key={label} className="review-item">
              <div>
                <strong>{label}</strong>
                <span>Informação enviada para validação da STC.</span>
              </div>
              <StatusPill tone="info">Enviado</StatusPill>
            </div>
          ))}
        </div>
        <button type="button" className="secondary-button" onClick={() => setView("ug-dashboard")}>
          <Icon name="arrow" />
          Voltar ao painel
        </button>
      </section>
      <section className="card">
        <span className="eyebrow">Histórico</span>
        <h3>Rastreabilidade do envio</h3>
        <CycleTimeline cycle={cycle} />
      </section>
    </div>
  );
}

function ReceiptSummary({ cycle, compact = false }: { cycle: CycleItem; compact?: boolean }) {
  return (
    <section className={compact ? "receipt-card compact-receipt" : "card receipt-card"}>
      <span className="eyebrow">Comprovante aceito</span>
      <h3>{cycle.protocol || "AG-2026-00031"}</h3>
      <p>Envio aceito pela STC e registrado no histórico do ciclo.</p>
      <div className="receipt-grid">
        <div>
          <span>Objeto</span>
          <strong>{cycle.objectCode}</strong>
        </div>
        <div>
          <span>Arquivo</span>
          <strong>{cycle.fileName || "resposta_validada.xlsx"}</strong>
        </div>
        <div>
          <span>Aceite</span>
          <strong>{cycle.acceptedAt || today}</strong>
        </div>
        <div>
          <span>SEI</span>
          <strong>{cycle.seiNumber}</strong>
        </div>
      </div>
    </section>
  );
}

function CycleTimeline({ cycle }: { cycle: CycleItem }) {
  const events = [
    {
      icon: "file" as const,
      title: "Pedido formal registrado no SEI",
      text: `Processo ${cycle.seiNumber}.`,
      done: true,
    },
    {
      icon: "send" as const,
      title: "Resposta pela plataforma",
      text: cycle.fileName ? `${cycle.fileName} · ${cycle.submittedAt || "data registrada"}.` : "Aguardando resposta da UG.",
      done: cycle.status !== "ativo",
    },
    {
      icon: cycle.status === "correcao" ? ("refresh" as const) : ("clipboard" as const),
      title: cycle.status === "correcao" ? "Devolvido para correção" : "Validação STC",
      text:
        cycle.status === "correcao"
          ? cycle.correctionNote || "Correção solicitada pela STC."
          : cycle.status === "finalizado"
            ? "Resposta aprovada pela STC."
            : "Aguardando decisão da STC.",
      done: cycle.status === "correcao" || cycle.status === "finalizado",
    },
    {
      icon: "check" as const,
      title: "Fechamento",
      text: cycle.status === "finalizado" ? `Comprovante aceito em ${cycle.acceptedAt}.` : "Será registrado após aceite.",
      done: cycle.status === "finalizado",
    },
  ];

  return (
    <div className="timeline">
      {events.map((event) => (
        <article key={event.title} className={event.done ? "done" : ""}>
          <div className="timeline-icon">
            <Icon name={event.icon} />
          </div>
          <div>
            <strong>{event.title}</strong>
            <p>{event.text}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function getSubmissionSteps(status: SubmissionStatus): StepDefinition[] {
  if (status === "pendente") {
    return [
      ["Solicitação", "done"],
      ["Preenchimento", "active"],
      ["Checagem básica", "todo"],
      ["Confirmação", "todo"],
    ];
  }

  if (status === "reaberto") {
    return [
      ["Solicitação", "done"],
      ["Correção", "active"],
      ["Reenvio", "todo"],
      ["Confirmação", "todo"],
    ];
  }

  return [
    ["Solicitação", "done"],
    ["Preenchimento", "done"],
    ["Checagem básica", "done"],
    ["Confirmação", status === "aprovado" ? "done" : "active"],
  ];
}

function statusLabel(status: SubmissionStatus): string {
  const labels: Record<SubmissionStatus, string> = {
    pendente: "Pendente",
    enviado: "Enviado",
    reaberto: "Reaberto",
    aprovado: "Aprovado",
  };
  return labels[status];
}

function statusTone(status: SubmissionStatus): Tone {
  const tones: Record<SubmissionStatus, Tone> = {
    pendente: "warning",
    enviado: "info",
    reaberto: "danger",
    aprovado: "success",
  };
  return tones[status];
}

function cycleLabel(status: CycleStatus, scope: "stc" | "ug" = "stc"): string {
  const labels: Record<CycleStatus, string> = {
    ativo: "Ativo",
    respondido: "Respondido",
    correcao: scope === "ug" ? "Devolvido para correção" : "Aguardando correção",
    finalizado: "Finalizado",
  };
  return labels[status];
}

function cycleTone(status: CycleStatus): Tone {
  const tones: Record<CycleStatus, Tone> = {
    ativo: "info",
    respondido: "success",
    correcao: "danger",
    finalizado: "neutral",
  };
  return tones[status];
}

function validationRowLabel(status: CycleStatus): string {
  if (status === "ativo") return "Pendente";
  if (status === "respondido") return "Recebido";
  if (status === "correcao") return "Reaberto";
  return "Aprovado";
}

function submissionToCycleStatus(status: SubmissionStatus): CycleStatus {
  if (status === "enviado") return "respondido";
  if (status === "reaberto") return "correcao";
  if (status === "aprovado") return "finalizado";
  return "ativo";
}

function cycleActionLabel(status: CycleStatus): string {
  const labels: Record<CycleStatus, string> = {
    ativo: "Responder solicitação",
    respondido: "Ver o que foi enviado",
    correcao: "Corrigir envio",
    finalizado: "Visualizar comprovante",
  };
  return labels[status];
}

function cycleActionIcon(status: CycleStatus): Parameters<typeof Icon>[0]["name"] {
  if (status === "correcao") return "refresh";
  if (status === "finalizado") return "eye";
  return "send";
}

function cycleStatusHelp(cycle: CycleItem): string {
  if (cycle.status === "ativo") return "Solicitação disponível para resposta da UG.";
  if (cycle.status === "respondido") return "Resposta enviada e aguardando validação da STC.";
  if (cycle.status === "correcao") return cycle.correctionNote || "Envio devolvido para correção.";
  return "Resposta aceita e comprovante disponível.";
}

export default function App() {
  const [role, setRole] = useState<Role>("login");
  const [view, setView] = useState<View>("ug-dashboard");
  const [mode, setMode] = useState<SubmissionMode>("modelo");
  const [objectId, setObjectId] = useState(defaultObject.id);
  const [selectedUgs, setSelectedUgs] = useState<string[]>([...defaultObject.suggestedUgs]);
  const [selectedMetadataIds, setSelectedMetadataIds] = useState<string[]>(
    defaultObject.fields.map((field) => field.id),
  );
  const [cycleDetails, setCycleDetails] = useState<CycleDetails>(initialCycleDetails);
  const [submission, setSubmission] = useState<SubmissionState>(initialSubmission);
  const [validationUgId, setValidationUgId] = useState(defaultObject.suggestedUgs[0] ?? "seduc");
  const [activeCycleId, setActiveCycleId] = useState("ciclo-atual");
  const [profileOpen, setProfileOpen] = useState(false);

  const selectedObject = useMemo(
    () => transparencyObjects.find((item) => item.id === objectId) ?? defaultObject,
    [objectId],
  );

  const selectedFields = useMemo(
    () => selectedObject.fields.filter((field) => selectedMetadataIds.includes(field.id)),
    [selectedObject, selectedMetadataIds],
  );

  const cycles = useMemo<CycleItem[]>(
    () => [
      {
        id: "ciclo-atual",
        title: cycleDetails.title,
        objectCode: selectedObject.code,
        objectName: titleCase(selectedObject.name),
        createdAt: "07 jul. 2026",
        deadline: cycleDetails.deadline,
        status: submissionToCycleStatus(submission.status),
        seiNumber: cycleDetails.seiNumber,
        ugIds: selectedUgs,
        metadataCount: selectedFields.length,
        metadataLabels: selectedFields.map((field) => field.label),
        fileName: submission.fileName || undefined,
        protocol: submission.protocol || undefined,
        submittedAt: submission.status !== "pendente" ? submission.checkedAt || today : undefined,
        acceptedAt: submission.status === "aprovado" ? submission.checkedAt || today : undefined,
        correctionNote: submission.status === "reaberto" ? submission.rejectionReason : undefined,
      },
      {
        id: "ciclo-terceirizados",
        title: "Coleta MT-0015 - Terceirizados",
        objectCode: "MT-0015",
        objectName: "Trabalhador terceirizado",
        createdAt: "03 jul. 2026",
        deadline: "2026-07-12",
        status: "respondido",
        seiNumber: "2026.000399/STC",
        ugIds: ["saf", "seduc"],
        metadataCount: 12,
        metadataLabels: ["Empresa contratada", "CNPJ", "Contrato", "Quantidade", "Lotação", "Função"],
        fileName: "terceirizados_saf_2026_07.xlsx",
        protocol: "AG-2026-00028",
        submittedAt: "05 jul. 2026",
      },
      {
        id: "ciclo-ouvidoria",
        title: "Coleta MT-0030 - Ouvidoria",
        objectCode: "MT-0030",
        objectName: "Ouvidoria",
        createdAt: "28 jun. 2026",
        deadline: "2026-07-04",
        status: "correcao",
        seiNumber: "2026.000355/STC",
        ugIds: ["sefaz"],
        metadataCount: 8,
        metadataLabels: ["Canal de atendimento", "Quantidade de manifestações", "Prazo médio", "Relatório", "Fonte oficial"],
        fileName: "ouvidoria_sefaz_2026_06.xlsx",
        protocol: "AG-2026-00019",
        submittedAt: "02 jul. 2026",
        correctionNote: "Fonte oficial ausente e período de referência divergente do solicitado pela STC.",
      },
      {
        id: "ciclo-obras",
        title: "Coleta MT-0012 - Obras em execução",
        objectCode: "MT-0012",
        objectName: "Obra pública em execução",
        createdAt: "12 jun. 2026",
        deadline: "2026-06-28",
        status: "finalizado",
        seiNumber: "2026.000271/STC",
        ugIds: ["sinfra", "saf"],
        metadataCount: 18,
        metadataLabels: ["Identificação da obra", "Contrato", "Medição", "Situação", "Valor atualizado", "Fonte oficial"],
        fileName: "obras_sinfra_2026_06.xlsx",
        protocol: "AG-2026-00011",
        submittedAt: "22 jun. 2026",
        acceptedAt: "24 jun. 2026",
      },
    ],
    [cycleDetails, selectedObject, selectedUgs, selectedFields, submission],
  );

  const activeCycle = cycles.find((cycle) => cycle.id === activeCycleId) ?? cycles[0];

  const handleObjectChange = (id: string) => {
    const nextObject = transparencyObjects.find((item) => item.id === id) ?? defaultObject;
    setObjectId(id);
    setSelectedUgs([...nextObject.suggestedUgs]);
    setSelectedMetadataIds(nextObject.fields.map((field) => field.id));
    setValidationUgId(nextObject.suggestedUgs[0] ?? "seduc");
    setCycleDetails({
      ...cycleDetails,
      title: `Coleta ${nextObject.code} - ${titleCase(nextObject.name)}`,
    });
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [role, view, objectId, activeCycleId]);

  const setRoleAndReset = (nextRole: Role) => {
    setRole(nextRole);
    setProfileOpen(false);
    if (nextRole === "ug") setView("ug-dashboard");
    if (nextRole === "stc") setView("stc-dashboard");
  };

  const page = (() => {
    if (role === "login") {
      return <LoginScreen setRole={setRoleAndReset} setView={setView} />;
    }

    if (role === "ug") {
      if (view === "ug-cycle-detail") {
        return (
          <UgCycleDetail
            cycle={activeCycle}
            object={selectedObject}
            mode={mode}
            submission={submission}
            setSubmission={setSubmission}
            setView={setView}
          />
        );
      }

      return (
        <UgDashboard
          cycles={cycles}
          setActiveCycleId={setActiveCycleId}
          setView={setView}
        />
      );
    }

    if (view === "stc-dashboard") {
      return (
        <StcDashboard
          cycles={cycles}
          setView={setView}
          setActiveCycleId={setActiveCycleId}
          cycleDetails={cycleDetails}
          setCycleDetails={setCycleDetails}
        />
      );
    }

    if (view === "stc-create") {
      return (
        <StcCreateCycle
          object={selectedObject}
          objects={transparencyObjects}
          onObjectChange={handleObjectChange}
          selectedUgs={selectedUgs}
          setSelectedUgs={setSelectedUgs}
          selectedMetadataIds={selectedMetadataIds}
          setSelectedMetadataIds={setSelectedMetadataIds}
          mode={mode}
          cycleDetails={cycleDetails}
          setCycleDetails={setCycleDetails}
          onCycleAction={() => {
            setActiveCycleId("ciclo-atual");
            setView("stc-cycle-detail");
          }}
        />
      );
    }

    if (view === "stc-cycle-detail") {
      return <StcCycleDetail cycle={activeCycle} setView={setView} />;
    }

    return (
      <StcValidation
        cycle={activeCycle}
        object={selectedObject}
        mode={mode}
        selectedUgs={selectedUgs}
        selectedMetadataIds={selectedMetadataIds}
        submission={submission}
        setSubmission={setSubmission}
        validationUgId={validationUgId}
        setValidationUgId={setValidationUgId}
        setView={setView}
        setRole={setRoleAndReset}
      />
    );
  })();

  return (
    <div className={`app-shell ${role === "stc" ? "stc-accent" : ""}`}>
      <TopBar
        role={role}
        setRole={setRoleAndReset}
        setView={setView}
        mode={mode}
        setMode={setMode}
        onProfileClick={() => setProfileOpen(true)}
      />
      <div className={role === "login" ? "login-only" : `workspace ${role === "ug" ? "ug-workspace" : ""}`}>
        <Sidebar role={role} view={view} setView={setView} />
        <main className="content">{page}</main>
      </div>
      <ProfileDrawer role={role} open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
