import { useEffect, useState } from "react";
import { tesauroObjects } from "./tesauroData";

type Role = "login" | "ponto-focal" | "respondente" | "stc";
type View =
  | "stc-dashboard"
  | "stc-create"
  | "stc-cycle-detail"
  | "stc-validation"
  | "focal-dashboard"
  | "focal-cycle-detail"
  | "resp-access"
  | "resp-dashboard"
  | "resp-collection";
type ObjectKind = "fixo" | "variavel";
type SubmissionStatus =
  | "pendente"
  | "rascunho"
  | "enviado"
  | "aguardando-ponto-focal"
  | "reaberto"
  | "aprovado"
  | "resposta-negativa";
type CycleStatus = "ativo" | "respondido" | "correcao" | "finalizado" | "nao-enviado-no-prazo";
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

interface SubmissionObservation {
  author: string;
  date: string;
  text: string;
}

interface Submission {
  id: string;
  collectionId: string;
  respondentId: string;
  respondentName: string;
  status: SubmissionStatus;
  protocol: string;
  fileName: string;
  attachments: string[];
  rejectionReason: string;
  submittedAt: string;
  isNegative: boolean;
  observations: SubmissionObservation[]; // encadeadas com autor + data (§3.8)
}

// TODO(P-019): assumido 1 coleta = 1 objeto, por órgão (pendência aberta na STC).
interface Collection {
  id: string;
  cycleId: string;
  objectCode: string;
  objectName: string;
  kind: ObjectKind;
  ugId: string;
  linkToken: string; // hash do link que vai no SEI (L1)
  requiredAttachments: string[];
  submissions: Submission[];
}

interface Respondent {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string; // cargo
  ugId: string;
  createdBySelf: boolean;
  emailVerified: boolean;
  collectionIds: string[]; // coletas em que foi adicionado ou às quais chegou pelo link (§3.3)
}

interface CycleItem {
  id: string;
  title: string;
  objectCode: string;
  objectName: string;
  objectKind: ObjectKind;
  createdAt: string;
  deadline: string;
  status: CycleStatus;
  seiNumber: string;
  ugIds: string[];
  metadataLabels: string[];
  collectionIds: string[];
  requiresFocalPointValidation: boolean; // toggle P2
  requiredAttachments: string[];
}

interface CycleDraft {
  title: string;
  deadline: string;
  seiNumber: string;
  observations: string;
  notificationChannel: "Email";
  kind: ObjectKind;
  requiredAttachments: string[];
  requiresFocalPointValidation: boolean;
}

interface CycleFilters {
  status: "todos" | CycleStatus;
  object: string;
  ug: string;
  date: string;
}

const transparencyObjects = tesauroObjects as readonly TransparencyObject[];

function objectByCode(code: string): TransparencyObject {
  return transparencyObjects.find((item) => item.code === code) ?? transparencyObjects[0];
}

// Piloto do MVP: MT-0016 (Estagiário) — objeto FIXO, tabular, mensal (§2 da TAREFA).
const defaultObject = objectByCode("MT-0016");

function kindFromFormat(format: string): ObjectKind {
  return format.toUpperCase().includes("FIXO") ? "fixo" : "variavel";
}

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

const focalUser = { name: "Maria Costa", ugId: "seduc" };

const seedRespondents: Respondent[] = [
  {
    id: "resp-joao",
    name: "João Lima",
    email: "joao.lima@seduc.ma.gov.br",
    phone: "(98) 98801-2214",
    role: "Setor de Contratos",
    ugId: "seduc",
    createdBySelf: false,
    emailVerified: true,
    collectionIds: ["col-100-seduc"],
  },
  {
    id: "resp-clara",
    name: "Clara Nunes",
    email: "clara.nunes@sinfra.ma.gov.br",
    phone: "(98) 98214-7702",
    role: "Setor de Obras",
    ugId: "sinfra",
    createdBySelf: true,
    emailVerified: true,
    collectionIds: ["col-101-sinfra", "col-103-sinfra"],
  },
  {
    id: "resp-otavio",
    name: "Otávio Ramos",
    email: "otavio.ramos@sinfra.ma.gov.br",
    phone: "(98) 98455-1980",
    role: "Comissão de Licitação",
    ugId: "sinfra",
    createdBySelf: false,
    emailVerified: true,
    collectionIds: ["col-101-sinfra"],
  },
  {
    id: "resp-paulo",
    name: "Paulo Sena",
    email: "paulo.sena@sefaz.ma.gov.br",
    phone: "(98) 98120-3345",
    role: "TI da Ouvidoria",
    ugId: "sefaz",
    createdBySelf: true,
    emailVerified: true,
    collectionIds: ["col-102-sefaz", "col-104-sefaz"],
  },
];

const objectMt0018 = objectByCode("MT-0018");
const objectMt0030 = objectByCode("MT-0030");
const objectMt0012 = objectByCode("MT-0012");
const objectMt0040 = objectByCode("MT-0040");
const objectMt0015 = objectByCode("MT-0015");

const seedCycles: CycleItem[] = [
  {
    id: "ciclo-100",
    title: `Coleta ${defaultObject.code} - ${titleCase(defaultObject.name)}`,
    objectCode: defaultObject.code,
    objectName: titleCase(defaultObject.name),
    objectKind: "fixo",
    createdAt: "07 jul. 2026",
    deadline: "2026-07-15",
    status: "ativo",
    seiNumber: "2026.000431/STC",
    ugIds: ["seduc", "saf"],
    metadataLabels: defaultObject.fields.map((field) => field.label),
    collectionIds: ["col-100-seduc", "col-100-saf"],
    requiresFocalPointValidation: true,
    requiredAttachments: [],
  },
  {
    id: "ciclo-101",
    title: `Coleta ${objectMt0018.code} - ${titleCase(objectMt0018.name)}`,
    objectCode: objectMt0018.code,
    objectName: titleCase(objectMt0018.name),
    objectKind: "variavel",
    createdAt: "04 jul. 2026",
    deadline: "2026-07-18",
    status: "respondido",
    seiNumber: "2026.000418/STC",
    ugIds: ["sinfra"],
    metadataLabels: objectMt0018.fields.map((field) => field.label),
    collectionIds: ["col-101-sinfra"],
    requiresFocalPointValidation: false,
    requiredAttachments: ["Edital em PDF", "Publicação do aviso"],
  },
  {
    id: "ciclo-102",
    title: `Coleta ${objectMt0030.code} - ${titleCase(objectMt0030.name)}`,
    objectCode: objectMt0030.code,
    objectName: titleCase(objectMt0030.name),
    objectKind: "variavel",
    createdAt: "28 jun. 2026",
    deadline: "2026-07-04",
    status: "correcao",
    seiNumber: "2026.000355/STC",
    ugIds: ["sefaz"],
    metadataLabels: objectMt0030.fields.map((field) => field.label),
    collectionIds: ["col-102-sefaz"],
    requiresFocalPointValidation: false,
    requiredAttachments: ["Relatório consolidado em PDF"],
  },
  {
    id: "ciclo-103",
    title: `Coleta ${objectMt0012.code} - ${titleCase(objectMt0012.name)}`,
    objectCode: objectMt0012.code,
    objectName: titleCase(objectMt0012.name),
    objectKind: "variavel",
    createdAt: "12 jun. 2026",
    deadline: "2026-06-28",
    status: "finalizado",
    seiNumber: "2026.000271/STC",
    ugIds: ["sinfra"],
    metadataLabels: objectMt0012.fields.map((field) => field.label),
    collectionIds: ["col-103-sinfra"],
    requiresFocalPointValidation: true,
    requiredAttachments: ["Relatório fotográfico"],
  },
  {
    id: "ciclo-104",
    title: `Coleta ${objectMt0040.code} - ${titleCase(objectMt0040.name)}`,
    objectCode: objectMt0040.code,
    objectName: titleCase(objectMt0040.name),
    objectKind: "variavel",
    createdAt: "26 jun. 2026",
    deadline: "2026-07-08",
    status: "respondido",
    seiNumber: "2026.000322/STC",
    ugIds: ["sefaz"],
    metadataLabels: objectMt0040.fields.map((field) => field.label),
    collectionIds: ["col-104-sefaz"],
    requiresFocalPointValidation: false,
    requiredAttachments: [],
  },
  {
    id: "ciclo-105",
    title: `Coleta ${objectMt0015.code} - ${titleCase(objectMt0015.name)}`,
    objectCode: objectMt0015.code,
    objectName: titleCase(objectMt0015.name),
    objectKind: "fixo",
    createdAt: "16 jun. 2026",
    deadline: "2026-06-30",
    status: "nao-enviado-no-prazo",
    seiNumber: "2026.000301/STC",
    ugIds: ["saf"],
    metadataLabels: objectMt0015.fields.map((field) => field.label),
    collectionIds: ["col-105-saf"],
    requiresFocalPointValidation: false,
    requiredAttachments: [],
  },
];

const seedCollections: Collection[] = [
  {
    id: "col-100-seduc",
    cycleId: "ciclo-100",
    objectCode: defaultObject.code,
    objectName: titleCase(defaultObject.name),
    kind: "fixo",
    ugId: "seduc",
    linkToken: "agz-100-seduc",
    requiredAttachments: [],
    submissions: [],
  },
  {
    id: "col-100-saf",
    cycleId: "ciclo-100",
    objectCode: defaultObject.code,
    objectName: titleCase(defaultObject.name),
    kind: "fixo",
    ugId: "saf",
    linkToken: "agz-100-saf",
    requiredAttachments: [],
    submissions: [],
  },
  {
    id: "col-101-sinfra",
    cycleId: "ciclo-101",
    objectCode: objectMt0018.code,
    objectName: titleCase(objectMt0018.name),
    kind: "variavel",
    ugId: "sinfra",
    linkToken: "agz-101-sinfra",
    requiredAttachments: ["Edital em PDF", "Publicação do aviso"],
    submissions: [
      {
        id: "sub-col-101-sinfra-resp-clara",
        collectionId: "col-101-sinfra",
        respondentId: "resp-clara",
        respondentName: "Clara Nunes",
        status: "enviado",
        protocol: "AG-2026-00032",
        fileName: "mt-0018_sinfra_obras.xlsx",
        attachments: ["edital_042_2026.pdf", "publicacao_aviso_042.pdf"],
        rejectionReason: "",
        submittedAt: "08 jul. 2026",
        isNegative: false,
        observations: [
          {
            author: "Clara Nunes",
            date: "08 jul. 2026",
            text: "Envio do setor de obras (processos 042 e 051).",
          },
        ],
      },
      {
        id: "sub-col-101-sinfra-resp-otavio",
        collectionId: "col-101-sinfra",
        respondentId: "resp-otavio",
        respondentName: "Otávio Ramos",
        status: "enviado",
        protocol: "AG-2026-00033",
        fileName: "mt-0018_sinfra_compras.xlsx",
        attachments: ["edital_037_2026.pdf", "publicacao_aviso_037.pdf"],
        rejectionReason: "",
        submittedAt: "09 jul. 2026",
        isNegative: false,
        observations: [
          {
            author: "Otávio Ramos",
            date: "09 jul. 2026",
            text: "Envio da comissão de licitação (pregões do semestre).",
          },
        ],
      },
    ],
  },
  {
    id: "col-102-sefaz",
    cycleId: "ciclo-102",
    objectCode: objectMt0030.code,
    objectName: titleCase(objectMt0030.name),
    kind: "variavel",
    ugId: "sefaz",
    linkToken: "agz-102-sefaz",
    requiredAttachments: ["Relatório consolidado em PDF"],
    submissions: [
      {
        id: "sub-col-102-sefaz-resp-paulo",
        collectionId: "col-102-sefaz",
        respondentId: "resp-paulo",
        respondentName: "Paulo Sena",
        status: "reaberto",
        protocol: "AG-2026-00019",
        fileName: "mt-0030_sefaz_jun.xlsx",
        attachments: ["relatorio_ouvidoria_jun.pdf"],
        rejectionReason: "Período de referência divergente do solicitado pela STC.",
        submittedAt: "02 jul. 2026",
        isNegative: false,
        observations: [
          {
            author: "Paulo Sena",
            date: "02 jul. 2026",
            text: "Planilha e anexos enviados pela plataforma.",
          },
          {
            author: "Equipe STC",
            date: "03 jul. 2026",
            text: "Período de referência divergente do solicitado pela STC. Reenviar com junho completo.",
          },
        ],
      },
    ],
  },
  {
    id: "col-103-sinfra",
    cycleId: "ciclo-103",
    objectCode: objectMt0012.code,
    objectName: titleCase(objectMt0012.name),
    kind: "variavel",
    ugId: "sinfra",
    linkToken: "agz-103-sinfra",
    requiredAttachments: ["Relatório fotográfico"],
    submissions: [
      {
        id: "sub-col-103-sinfra-resp-clara",
        collectionId: "col-103-sinfra",
        respondentId: "resp-clara",
        respondentName: "Clara Nunes",
        status: "aprovado",
        protocol: "AG-2026-00011",
        fileName: "mt-0012_sinfra_jun.xlsx",
        attachments: ["relatorio_fotografico_jun.pdf"],
        rejectionReason: "",
        submittedAt: "22 jun. 2026",
        isNegative: false,
        observations: [
          {
            author: "Clara Nunes",
            date: "22 jun. 2026",
            text: "Planilha e anexos enviados pela plataforma.",
          },
          {
            author: "Ponto focal SINFRA",
            date: "23 jun. 2026",
            text: "Validado como resposta do órgão e encaminhado à STC.",
          },
          {
            author: "Equipe STC",
            date: "24 jun. 2026",
            text: "Resposta aprovada. Comprovante disponível.",
          },
        ],
      },
    ],
  },
  {
    id: "col-104-sefaz",
    cycleId: "ciclo-104",
    objectCode: objectMt0040.code,
    objectName: titleCase(objectMt0040.name),
    kind: "variavel",
    ugId: "sefaz",
    linkToken: "agz-104-sefaz",
    requiredAttachments: [],
    submissions: [
      {
        id: "sub-col-104-sefaz-resp-paulo",
        collectionId: "col-104-sefaz",
        respondentId: "resp-paulo",
        respondentName: "Paulo Sena",
        status: "resposta-negativa",
        protocol: "AG-2026-00027",
        fileName: "",
        attachments: [],
        rejectionReason: "",
        submittedAt: "05 jul. 2026",
        isNegative: true,
        observations: [
          {
            author: "Paulo Sena",
            date: "05 jul. 2026",
            text: "Não temos tabela própria: os cargos da pasta seguem a tabela unificada da SEGEP.",
          },
        ],
      },
    ],
  },
  {
    id: "col-105-saf",
    cycleId: "ciclo-105",
    objectCode: objectMt0015.code,
    objectName: titleCase(objectMt0015.name),
    kind: "fixo",
    ugId: "saf",
    linkToken: "agz-105-saf",
    requiredAttachments: [],
    submissions: [],
  },
];

const todayIso = new Date().toISOString().slice(0, 10);
const today = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
}).format(new Date());

function titleCase(value: string) {
  return value.toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\W+/g, "_")
    .replace(/^_|_$/g, "");
}

function draftForObject(object: TransparencyObject): CycleDraft {
  return {
    title: `Coleta ${object.code} - ${titleCase(object.name)}`,
    // TODO(P-009): prazos-padrão e datas fixas por objeto ainda em aberto; campo livre.
    deadline: "2026-07-25",
    seiNumber: "2026.000452/STC",
    observations:
      "Pedido formal registrado no SEI. O link da coleta segue anexado ao processo; a resposta deve ser enviada pela plataforma até o prazo indicado.",
    notificationChannel: "Email",
    kind: kindFromFormat(object.format),
    requiredAttachments: [],
    requiresFocalPointValidation: false,
  };
}

function deriveCycleStatus(cycle: CycleItem, submissions: Submission[]): CycleStatus {
  const sent = submissions.filter((item) => item.status !== "rascunho");
  if (!sent.length) return cycle.deadline < todayIso ? "nao-enviado-no-prazo" : "ativo";
  if (sent.some((item) => item.status === "reaberto")) return "correcao";
  if (sent.every((item) => item.status === "aprovado")) return "finalizado";
  return "respondido";
}

function collectionLink(collection: Collection) {
  return `agiliza.ma.gov.br/coleta/${collection.linkToken}`;
}

function Icon({
  name,
  size = 18,
}: {
  name:
    | "arrow"
    | "bell"
    | "check"
    | "clipboard"
    | "clock"
    | "download"
    | "edit"
    | "eye"
    | "file"
    | "filter"
    | "home"
    | "link"
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
    check: <path d="m20 6-11 11-5-5" />,
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
    download: (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="m7 10 5 5 5-5" />
        <path d="M12 15V3" />
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
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10" />
      </>
    ),
    link: (
      <>
        <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
        <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
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

function submissionLabel(status: SubmissionStatus): string {
  const labels: Record<SubmissionStatus, string> = {
    pendente: "Pendente",
    rascunho: "Rascunho salvo",
    enviado: "Enviado à STC",
    "aguardando-ponto-focal": "Aguardando ponto focal",
    reaberto: "Reaberto para correção",
    aprovado: "Aprovado",
    "resposta-negativa": "Resposta negativa",
  };
  return labels[status];
}

function submissionTone(status: SubmissionStatus): Tone {
  const tones: Record<SubmissionStatus, Tone> = {
    pendente: "warning",
    rascunho: "neutral",
    enviado: "info",
    "aguardando-ponto-focal": "warning",
    reaberto: "danger",
    aprovado: "success",
    "resposta-negativa": "neutral",
  };
  return tones[status];
}

function cycleLabel(status: CycleStatus, scope: "stc" | "orgao" = "stc"): string {
  const labels: Record<CycleStatus, string> = {
    ativo: "Ativo",
    respondido: "Respondido",
    correcao: scope === "orgao" ? "Devolvido para correção" : "Aguardando correção",
    finalizado: "Finalizado",
    "nao-enviado-no-prazo": "Não enviado no prazo",
  };
  return labels[status];
}

function cycleTone(status: CycleStatus): Tone {
  const tones: Record<CycleStatus, Tone> = {
    ativo: "info",
    respondido: "success",
    correcao: "danger",
    finalizado: "neutral",
    "nao-enviado-no-prazo": "danger",
  };
  return tones[status];
}

function cycleStatusHelp(cycle: CycleItem): string {
  if (cycle.status === "ativo") return "Coleta aberta: aguardando envios pela plataforma.";
  if (cycle.status === "respondido") return "Há submissões aguardando verificação da STC.";
  if (cycle.status === "correcao") return "Envio devolvido para correção da UG.";
  if (cycle.status === "nao-enviado-no-prazo")
    return "Prazo encerrado sem envio — estado distinto de resposta negativa.";
  return "Respostas aprovadas e comprovantes emitidos.";
}

function kindLabel(kind: ObjectKind): string {
  return kind === "fixo" ? "Objeto fixo" : "Objeto variável";
}

function TopBar({
  role,
  setRole,
  respondentInitial,
  onProfileClick,
}: {
  role: Role;
  setRole: (role: Role) => void;
  respondentInitial: string;
  onProfileClick: () => void;
}) {
  const avatar = role === "ponto-focal" ? "M" : role === "respondente" ? respondentInitial : "E";
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

      <div className="topbar-actions">
        <span className="sei-chip">SEI formal obrigatório</span>
        <div className="role-switch" aria-label="Visão do protótipo">
          <button
            type="button"
            className={role === "ponto-focal" ? "active" : ""}
            onClick={() => setRole("ponto-focal")}
          >
            Ponto focal
          </button>
          <button
            type="button"
            className={role === "respondente" ? "active" : ""}
            onClick={() => setRole("respondente")}
          >
            Respondente
          </button>
          <button
            type="button"
            className={role === "stc" ? "active" : ""}
            onClick={() => setRole("stc")}
          >
            STC
          </button>
        </div>
        {role !== "login" ? (
          <button type="button" className="profile-avatar" onClick={onProfileClick} aria-label="Abrir perfil">
            {avatar}
          </button>
        ) : null}
      </div>
      <span className="topbar-compact-note">SEI formal + resposta na plataforma</span>
    </header>
  );
}

function ProfileDrawer({
  role,
  respondent,
  open,
  onClose,
}: {
  role: Role;
  respondent: Respondent | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!open || role === "login") return null;

  const heading =
    role === "ponto-focal"
      ? { avatar: "M", name: focalUser.name, detail: "Ponto focal · um por órgão" }
      : role === "respondente"
        ? {
            avatar: respondent ? respondent.name.charAt(0) : "R",
            name: respondent?.name ?? "Acesso pelo link",
            detail: respondent ? respondent.role : "Cadastro ainda não concluído",
          }
        : { avatar: "E", name: "Equipe STC", detail: "Coleta e validação" };

  return (
    <div className="profile-drawer-layer" aria-live="polite">
      <button type="button" className="drawer-backdrop" onClick={onClose} aria-label="Fechar perfil" />
      <aside className="profile-drawer">
        <div className="drawer-head">
          <div className="profile-avatar large">{heading.avatar}</div>
          <div>
            <span className="eyebrow">Perfil de acesso</span>
            <h3>{heading.name}</h3>
            <p>{heading.detail}</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar">
            <Icon name="x" />
          </button>
        </div>

        {role === "ponto-focal" ? (
          <>
            <div className="drawer-section">
              <span>Unidade</span>
              <strong>SEDUC</strong>
              <p>Secretaria de Estado da Educação</p>
            </div>
            <div className="drawer-section">
              <span>Papel</span>
              <strong>Vê o ciclo inteiro do órgão</strong>
              <p>Acompanha todas as coletas e submissões, pode responder ou apenas monitorar.</p>
            </div>
            <div className="drawer-section">
              <span>Validação</span>
              <strong>Dá ciência quando o ciclo exige</strong>
              <p>Com o toggle ligado, valida e encaminha a resposta do órgão à STC. Também cadastra respondentes.</p>
            </div>
          </>
        ) : null}

        {role === "respondente" ? (
          <>
            <div className="drawer-section">
              <span>Vínculo</span>
              <strong>
                {respondent
                  ? `${ugs.find((ug) => ug.id === respondent.ugId)?.acronym ?? respondent.ugId} · ${respondent.role || "Respondente técnico"}`
                  : "Definido no cadastro pelo link"}
              </strong>
              <p>
                {respondent
                  ? respondent.createdBySelf
                    ? "Usuário criado pelo próprio usuário (auto-cadastro pelo link)."
                    : "Pré-cadastrado pelo ponto focal do órgão."
                  : "Quem chega pelo link do SEI se cadastra com validação por e-mail."}
              </p>
            </div>
            <div className="drawer-section">
              <span>Visibilidade</span>
              <strong>Apenas as coletas dele</strong>
              <p>O respondente técnico não vê o conceito de ciclo — só as coletas em que foi adicionado.</p>
            </div>
            <div className="drawer-section">
              <span>Acesso</span>
              <strong>{respondent ? respondent.email : "E-mail + senha após o 1º acesso"}</strong>
              <p>{respondent?.emailVerified ? "E-mail verificado." : "Validação por e-mail pendente."}</p>
            </div>
          </>
        ) : null}

        {role === "stc" ? (
          <>
            <div className="drawer-section">
              <span>Unidade</span>
              <strong>STC</strong>
              <p>Secretaria da Transparência e Controle</p>
            </div>
            <div className="drawer-section">
              <span>Função</span>
              <strong>Cria ciclos e verifica conteúdo</strong>
              <p>Define objeto, campos, anexos obrigatórios e o toggle de validação do ponto focal.</p>
            </div>
            <div className="drawer-section">
              <span>Escopo operacional</span>
              <strong>SEI formal + plataforma</strong>
              <p>O SEI formaliza o pedido; a plataforma coleta, faz a checagem estrutural e registra tudo.</p>
            </div>
          </>
        ) : null}
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
  if (role !== "stc") return null;

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
  enter,
  openPilotLink,
}: {
  enter: (role: Role) => void;
  openPilotLink: () => void;
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
        <h1>Planilha-padrão, anexos com checklist e validação em um só fluxo.</h1>
        <p>
          A STC cria o ciclo e gera o link da coleta anexado ao SEI. O respondente técnico envia a
          planilha preenchida e os anexos; o ponto focal valida quando exigido; a STC verifica e
          emite o comprovante.
        </p>
        <div className="login-actions">
          <button type="button" className="primary-button ripple-button" onClick={() => enter("ponto-focal")}>
            <Icon name="users" />
            Entrar como ponto focal
          </button>
          <button type="button" className="secondary-button" onClick={() => enter("stc")}>
            <Icon name="shield" />
            Entrar como STC
          </button>
          <button type="button" className="secondary-button" onClick={openPilotLink}>
            <Icon name="link" />
            Abrir link da coleta (SEI)
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
              <span>link da coleta</span>
            </div>
            <div>
              <Icon name="upload" />
              <strong>Respondente</strong>
              <span>planilha + anexos</span>
            </div>
            <div>
              <Icon name="users" />
              <strong>Ponto focal</strong>
              <span>valida se exigido</span>
            </div>
            <div>
              <Icon name="clipboard" />
              <strong>STC</strong>
              <span>verifica e comprova</span>
            </div>
          </div>
        </div>
        <div className="preview-card compact">
          <strong>Fixo × variável</strong>
          <span>planilha pronta do Tesauro ou gerada dos campos escolhidos</span>
        </div>
        <div className="preview-card compact dark">
          <strong>Estados próprios</strong>
          <span>resposta negativa ≠ não enviado no prazo</span>
        </div>
      </section>
    </div>
  );
}

function ReceiptStrip({
  submission,
  seiNumber,
  compact = false,
}: {
  submission: Submission;
  seiNumber: string;
  compact?: boolean;
}) {
  return (
    <section className={compact ? "receipt-card compact-receipt" : "card receipt-card"}>
      <span className="eyebrow">Comprovante de envio</span>
      <h3>{submission.protocol}</h3>
      <p>
        {submission.isNegative
          ? "Resposta negativa registrada na plataforma — estado próprio, distinto de não enviar."
          : "Envio registrado na plataforma. A UG tem a garantia de que a resposta chegou."}
      </p>
      <div className="receipt-grid">
        <div>
          <span>Arquivo</span>
          <strong>{submission.fileName || "Sem arquivo (negativa)"}</strong>
        </div>
        <div>
          <span>Enviado em</span>
          <strong>{submission.submittedAt}</strong>
        </div>
        <div>
          <span>SEI</span>
          <strong>{seiNumber}</strong>
        </div>
        <div>
          <span>Status</span>
          <strong>{submissionLabel(submission.status)}</strong>
        </div>
      </div>
    </section>
  );
}

function ObservationThread({ observations }: { observations: SubmissionObservation[] }) {
  if (!observations.length) return null;
  return (
    <div className="obs-thread">
      {observations.map((item, index) => (
        <article key={`${item.author}-${index}`}>
          <strong>{item.author}</strong>
          <small>{item.date}</small>
          <p>{item.text}</p>
        </article>
      ))}
    </div>
  );
}

function SubmissionBlock({
  submission,
  respondent,
  requiredAttachments,
  children,
}: {
  submission: Submission;
  respondent?: Respondent;
  requiredAttachments: string[];
  children?: JSX.Element | null;
}) {
  return (
    <article className="submission-card">
      <div className="submission-head">
        <div>
          <strong>{submission.respondentName}</strong>
          <small>
            {respondent?.role || "Respondente técnico"}
            {respondent?.createdBySelf ? " · usuário criado pelo próprio usuário" : ""}
          </small>
        </div>
        <StatusPill tone={submissionTone(submission.status)}>
          {submissionLabel(submission.status)}
        </StatusPill>
      </div>

      {submission.isNegative ? (
        <div className="alert">
          <Icon name="clock" />
          <div>
            <strong>Não tem a informação</strong>
            <span>O respondente declarou formalmente que o órgão não detém este dado.</span>
          </div>
        </div>
      ) : (
        <div className="received-box">
          <Icon name="file" />
          <div>
            <span>Planilha enviada em {submission.submittedAt}</span>
            <strong>{submission.fileName}</strong>
            {requiredAttachments.length ? (
              <span>
                Anexos obrigatórios: {submission.attachments.length}/{requiredAttachments.length} presentes
              </span>
            ) : (
              <span>Objeto fixo · sem anexos obrigatórios</span>
            )}
          </div>
        </div>
      )}

      {submission.attachments.length ? (
        <div className="tag-cloud">
          {submission.attachments.map((file) => (
            <span key={file}>{file}</span>
          ))}
        </div>
      ) : null}

      <ObservationThread observations={submission.observations} />
      {children ?? null}
    </article>
  );
}

function CycleTimeline({ cycle, submissions }: { cycle: CycleItem; submissions: Submission[] }) {
  const sent = submissions.filter((item) => item.status !== "rascunho");
  const decided = sent.some((item) => item.status === "aprovado" || item.status === "reaberto");
  const events = [
    {
      icon: "file" as const,
      title: "Pedido formal registrado no SEI",
      text: `Processo ${cycle.seiNumber || "a informar"} — o SEI é sempre o canal formal.`,
      done: true,
    },
    {
      icon: "link" as const,
      title: "Link da coleta gerado e anexado ao SEI",
      text: `${cycle.collectionIds.length} coleta(s) criada(s) — único elo entre SEI e plataforma.`,
      done: true,
    },
    {
      icon: "send" as const,
      title: "Submissões dos respondentes",
      text: sent.length
        ? `${sent.length} submissão(ões) identificadas recebidas.`
        : "Aguardando envios pela plataforma.",
      done: sent.length > 0,
    },
    {
      icon: cycle.status === "correcao" ? ("refresh" as const) : ("clipboard" as const),
      title: cycle.status === "correcao" ? "Devolvido para correção" : "Verificação da STC",
      text:
        cycle.status === "correcao"
          ? "Rejeição com justificativa reabriu a coleta para a UG."
          : decided
            ? "Conteúdo conferido manualmente pela equipe."
            : "Aguardando decisão da STC (conferência manual de conteúdo).",
      done: decided,
    },
    {
      icon: "check" as const,
      title: "Fechamento",
      text:
        cycle.status === "finalizado"
          ? "Comprovantes emitidos. Registro no SEI, se houver, é manual da STC."
          : "Será registrado após a aprovação das respostas.",
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

function StcDashboard({
  cycles,
  collections,
  openDetail,
  openValidation,
  openCreate,
  updateSei,
}: {
  cycles: CycleItem[];
  collections: Collection[];
  openDetail: (cycleId: string) => void;
  openValidation: (cycleId: string) => void;
  openCreate: () => void;
  updateSei: (cycleId: string, value: string) => void;
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

  const objectOptions = [...new Set(cycles.map((cycle) => cycle.objectCode))];
  const submissionsOf = (cycle: CycleItem) =>
    collections
      .filter((item) => item.cycleId === cycle.id)
      .flatMap((item) => item.submissions)
      .filter((item) => item.status !== "rascunho");

  const metrics = [
    ["Ciclos ativos", cycles.filter((cycle) => cycle.status === "ativo").length, "Coletas abertas", "info"] as const,
    ["Respondidos", cycles.filter((cycle) => cycle.status === "respondido").length, "Aguardam decisão STC", "success"] as const,
    [
      "Aguardando correção",
      cycles.filter((cycle) => cycle.status === "correcao").length,
      "Reabertos para a UG",
      "danger",
    ] as const,
    [
      "Sem envio no prazo",
      cycles.filter((cycle) => cycle.status === "nao-enviado-no-prazo").length,
      "Distinto de negativa",
      "warning",
    ] as const,
  ];

  return (
    <div className="workflow-page wide-page stc-dashboard-page">
      <SectionHeader
        eyebrow="Painel STC"
        title="Ciclos de coleta"
        description="O painel concentra filtros, detalhes, validação e histórico de cada ciclo."
      />

      <div className="metrics-grid dashboard-metrics">
        {metrics.map(([label, value, hint, tone]) => (
          <MetricCard
            key={label}
            icon={tone === "danger" ? "refresh" : tone === "success" ? "check" : tone === "warning" ? "clock" : "clipboard"}
            label={label}
            value={String(value)}
            hint={hint}
            tone={tone}
          />
        ))}
      </div>

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
              <option value="nao-enviado-no-prazo">Não enviado no prazo</option>
            </select>
          </label>
          <label>
            Objeto
            <select value={filters.object} onChange={(event) => setFilters({ ...filters, object: event.target.value })}>
              <option value="todos">Todos</option>
              {objectOptions.map((code) => (
                <option key={code} value={code}>
                  {code}
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
          <button type="button" className="primary-button ripple-button" onClick={openCreate}>
            <Icon name="filter" />
            Novo ciclo
          </button>
        </div>

        <div className="cycle-list stc-cycle-list">
          {filteredCycles.map((cycle) => (
            <article key={cycle.id} className="cycle-row-card stc-cycle-row">
              <div className="cycle-row-main">
                <div>
                  <strong>{cycle.title}</strong>
                  <span>
                    {cycle.objectCode} · {kindLabel(cycle.objectKind)} ·{" "}
                    {cycle.requiresFocalPointValidation ? "validação do ponto focal" : "envio direto à STC"}
                  </span>
                </div>
                <StatusPill tone={cycleTone(cycle.status)}>{cycleLabel(cycle.status)}</StatusPill>
              </div>

              <div className="cycle-meta-grid">
                <span>{cycle.createdAt}</span>
                <span>{cycle.ugIds.length} UGs · {cycle.collectionIds.length} coletas</span>
                <span>{submissionsOf(cycle).length} submissões</span>
                <label>
                  Número do SEI
                  <input
                    value={cycle.seiNumber}
                    onChange={(event) => updateSei(cycle.id, event.target.value)}
                  />
                </label>
              </div>

              <div className="cycle-row-note">
                <span>{cycleStatusHelp(cycle)}</span>
              </div>

              <div className="card-actions compact">
                <button type="button" className="secondary-button" onClick={() => openDetail(cycle.id)}>
                  <Icon name="eye" />
                  Exibir detalhes
                </button>
                <button type="button" className="primary-button ripple-button" onClick={() => openValidation(cycle.id)}>
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
  draft,
  setDraft,
  onActivate,
}: {
  object: TransparencyObject;
  objects: readonly TransparencyObject[];
  onObjectChange: (id: string) => void;
  selectedUgs: string[];
  setSelectedUgs: (ids: string[]) => void;
  selectedMetadataIds: string[];
  setSelectedMetadataIds: (ids: string[]) => void;
  draft: CycleDraft;
  setDraft: (draft: CycleDraft) => void;
  onActivate: () => void;
}) {
  const [attachmentDraft, setAttachmentDraft] = useState("");
  const availableUgs = ugs.filter((ug) => ug.id !== "stc");
  const orderedObjects = [object, ...objects.filter((item) => item.id !== object.id)];
  const selectedUgRows = selectedUgs
    .map((ugId) => availableUgs.find((ug) => ug.id === ugId))
    .filter((ug): ug is Ug => Boolean(ug));
  const selectedFields = object.fields.filter((field) => selectedMetadataIds.includes(field.id));
  const canActivate = selectedUgRows.length > 0 && selectedFields.length > 0 && draft.title.trim().length > 0;

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

  const setKind = (kind: ObjectKind) => {
    setDraft({ ...draft, kind, requiredAttachments: kind === "fixo" ? [] : draft.requiredAttachments });
  };

  const addAttachment = () => {
    const label = attachmentDraft.trim();
    if (!label || draft.requiredAttachments.includes(label)) return;
    // TODO(P-013): sem limite de quantidade/tamanho de upload no protótipo.
    setDraft({ ...draft, requiredAttachments: [...draft.requiredAttachments, label] });
    setAttachmentDraft("");
  };

  const removeAttachment = (label: string) => {
    setDraft({
      ...draft,
      requiredAttachments: draft.requiredAttachments.filter((item) => item !== label),
    });
  };

  return (
    <div className="workflow-page wide-page">
      <SectionHeader
        eyebrow="Criação STC"
        title="Montar ciclo de coleta"
        description="O funil invertido parte do objeto e sugere UGs/metadados. A STC define tipo, anexos obrigatórios e a validação do ponto focal antes de gerar o link."
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
                <small>
                  {item.subject} · {kindFromFormat(item.format) === "fixo" ? "Fixo" : "Variável"}
                </small>
              </button>
            ))}
          </div>
        </section>

        <section className="card create-card span-4">
          <span className="eyebrow">UGs sugeridas</span>
          <h3>Adicionar/remover órgãos</h3>
          <p className="muted-text">
            {/* TODO(P-022): suggestedUgs do Tesauro como stand-in do mapeamento informação↔órgão. */}
            A sugestão vem do mapeamento informação↔órgão (aqui, simulado pelo Tesauro). A STC ajusta
            livremente antes de acionar.
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
          <p className="muted-text">
            {draft.kind === "fixo"
              ? "Vêm prontos do Tesauro — a planilha-padrão já existe."
              : "A STC escolhe os campos e o sistema gera a planilha-padrão."}
          </p>

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
          <span className="eyebrow">Configuração do envio</span>
          <h3>Tipo do objeto, anexos e validação</h3>

          <div className="kind-toggle" aria-label="Tipo do objeto">
            <button
              type="button"
              className={draft.kind === "fixo" ? "active" : ""}
              onClick={() => setKind("fixo")}
            >
              <Icon name="file" size={16} />
              Objeto fixo
            </button>
            <button
              type="button"
              className={draft.kind === "variavel" ? "active" : ""}
              onClick={() => setKind("variavel")}
            >
              <Icon name="edit" size={16} />
              Objeto variável
            </button>
          </div>
          <p className="muted-text">
            {draft.kind === "fixo"
              ? "Recorrente: planilha-padrão pronta, exportada do Tesauro, sem anexos por linha."
              : "Pontual: o sistema gera a planilha-padrão a partir dos campos selecionados; costuma exigir anexos."}{" "}
            Sugerido pelo Tesauro: {kindFromFormat(object.format) === "fixo" ? "fixo" : "variável"}.
          </p>

          {draft.kind === "variavel" ? (
            <>
              <span className="eyebrow">Anexos obrigatórios</span>
              <div className="chip-editor">
                <input
                  placeholder="ex.: Cópia do contrato (PDF)"
                  value={attachmentDraft}
                  onChange={(event) => setAttachmentDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addAttachment();
                    }
                  }}
                />
                <button type="button" className="secondary-button" onClick={addAttachment}>
                  Adicionar
                </button>
              </div>
              {draft.requiredAttachments.length ? (
                <div className="chips">
                  {draft.requiredAttachments.map((label) => (
                    <span key={label}>
                      {label}
                      <button type="button" onClick={() => removeAttachment(label)} aria-label={`Remover ${label}`}>
                        <Icon name="x" size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="muted-text">Nenhum anexo obrigatório definido — o checklist do upload ficará vazio.</p>
              )}
            </>
          ) : null}

          {/* TODO(P-020): toggle implementado por ciclo (na criação); por órgão segue em aberto. */}
          <div className="switch-row">
            <div>
              <strong>Exige validação do ponto focal antes do envio</strong>
              <p>
                Ligado: a submissão fica "aguardando ponto focal" até ele dar ciência. Desligado: vai
                direto à STC.
              </p>
            </div>
            <button
              type="button"
              className={draft.requiresFocalPointValidation ? "switch on" : "switch"}
              role="switch"
              aria-checked={draft.requiresFocalPointValidation}
              aria-label="Exigir validação do ponto focal"
              onClick={() =>
                setDraft({ ...draft, requiresFocalPointValidation: !draft.requiresFocalPointValidation })
              }
            />
          </div>
        </section>

        <section className="card create-card span-5">
          <span className="eyebrow">Detalhes e notificação</span>
          <h3>Dados editáveis do acionamento</h3>

          <div className="details-form">
            <label className="full-row">
              Título
              <input
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              />
            </label>
            <label>
              Prazo
              <input
                type="date"
                value={draft.deadline}
                onChange={(event) => setDraft({ ...draft, deadline: event.target.value })}
              />
            </label>
            <label>
              Número do SEI
              <input
                value={draft.seiNumber}
                onChange={(event) => setDraft({ ...draft, seiNumber: event.target.value })}
              />
            </label>
            <label>
              Canal de notificação
              <input value={draft.notificationChannel} readOnly />
            </label>
            <label className="full-row">
              Observações / email padrão
              <textarea
                value={draft.observations}
                onChange={(event) => setDraft({ ...draft, observations: event.target.value })}
              />
            </label>
          </div>
        </section>

        <section className="card cycle-highlight-card span-12">
          <div className="cycle-highlight-head">
            <div>
              <span className="eyebrow">Resumo da solicitação</span>
              <h3>Ciclo pronto para acionamento</h3>
              <p>Ao acionar, cada UG recebe uma coleta com link próprio — anexado ao SEI, único elo entre os dois.</p>
            </div>
            <StatusPill tone="info">{kindLabel(draft.kind)}</StatusPill>
          </div>

          <div className="summary-metrics">
            <div>
              <strong>{object.code}</strong>
              <span>{titleCase(object.name)}</span>
            </div>
            <div>
              <strong>{selectedUgRows.length}</strong>
              <span>órgãos / coletas</span>
            </div>
            <div>
              <strong>{selectedFields.length}</strong>
              <span>campos obrigatórios</span>
            </div>
            <div>
              <strong>{draft.kind === "fixo" ? "—" : String(draft.requiredAttachments.length)}</strong>
              <span>anexos obrigatórios</span>
            </div>
            <div>
              <strong>{draft.requiresFocalPointValidation ? "Sim" : "Não"}</strong>
              <span>validação do ponto focal</span>
            </div>
            <div>
              <strong>{draft.deadline}</strong>
              <span>prazo do ciclo</span>
            </div>
          </div>

          <div className="tag-cloud">
            {selectedFields.slice(0, 8).map((field) => (
              <span key={field.id}>{field.label}</span>
            ))}
          </div>

          <button
            type="button"
            className="primary-button ripple-button"
            disabled={!canActivate}
            onClick={onActivate}
          >
            <Icon name="send" />
            Acionar ciclo e gerar links das coletas
          </button>
        </section>
      </div>
    </div>
  );
}

function StcCycleDetail({
  cycle,
  collections,
  setView,
  openValidation,
  openCollectionLink,
}: {
  cycle: CycleItem;
  collections: Collection[];
  setView: (view: View) => void;
  openValidation: (cycleId: string) => void;
  openCollectionLink: (collectionId: string) => void;
}) {
  const cycleCollections = collections.filter((item) => item.cycleId === cycle.id);
  const submissions = cycleCollections.flatMap((item) => item.submissions);

  return (
    <div className="workflow-page wide-page">
      <SectionHeader
        eyebrow="Detalhes do ciclo"
        title={cycle.title}
        description="Detalhe, links das coletas, histórico e validação ficam ligados ao ciclo selecionado no painel."
      />

      <div className="detail-layout">
        <section className="card cycle-highlight-card">
          <div className="cycle-highlight-head">
            <div>
              <span className="eyebrow">{cycle.objectCode}</span>
              <h3>{cycle.objectName}</h3>
              <p>{cycleStatusHelp(cycle)}</p>
            </div>
            <StatusPill tone={cycleTone(cycle.status)}>{cycleLabel(cycle.status)}</StatusPill>
          </div>
          <div className="cycle-summary">
            <div>
              <strong>{cycle.seiNumber || "A informar"}</strong>
              <span>processo SEI (editável)</span>
            </div>
            <div>
              <strong>{cycle.deadline}</strong>
              <span>prazo</span>
            </div>
            <div>
              <strong>{kindLabel(cycle.objectKind)}</strong>
              <span>{cycle.objectKind === "fixo" ? "planilha pronta do Tesauro" : "planilha gerada dos campos"}</span>
            </div>
            <div>
              <strong>{cycle.requiresFocalPointValidation ? "Exigida" : "Dispensada"}</strong>
              <span>validação do ponto focal</span>
            </div>
          </div>
          <div className="tag-cloud detail-tags">
            {cycle.metadataLabels.slice(0, 10).map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="card-actions">
            <button type="button" className="secondary-button" onClick={() => setView("stc-dashboard")}>
              <Icon name="arrow" />
              Voltar ao painel
            </button>
            <button type="button" className="primary-button ripple-button" onClick={() => openValidation(cycle.id)}>
              <Icon name="clipboard" />
              Validar respostas
            </button>
          </div>
        </section>

        <section className="card">
          <span className="eyebrow">Coletas e links</span>
          <h3>Um link por coleta, anexado ao SEI</h3>
          <p className="muted-text">
            Qualquer pessoa da UG acessa pelo link; toda submissão é identificada. Nada volta ao SEI
            automaticamente.
          </p>
          <div className="collection-list">
            {cycleCollections.map((collection) => {
              const ug = ugs.find((item) => item.id === collection.ugId);
              const sent = collection.submissions.filter((item) => item.status !== "rascunho");
              return (
                <div key={collection.id} className="collection-row">
                  <div>
                    <strong>{ug?.acronym ?? collection.ugId}</strong>
                    <small>
                      {sent.length
                        ? `${sent.length} submissão(ões) recebidas`
                        : "Nenhuma submissão até agora"}
                      {collection.requiredAttachments.length
                        ? ` · ${collection.requiredAttachments.length} anexos obrigatórios`
                        : ""}
                    </small>
                  </div>
                  <span className="link-chip">
                    <Icon name="link" size={14} />
                    {collectionLink(collection)}
                  </span>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => openCollectionLink(collection.id)}
                  >
                    <Icon name="send" size={16} />
                    Simular acesso pelo link
                  </button>
                </div>
              );
            })}
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
        <CycleTimeline cycle={cycle} submissions={submissions} />
      </section>
    </div>
  );
}

function DecisionBox({
  submission,
  onDecide,
}: {
  submission: Submission;
  onDecide: (decision: "aprovar" | "rejeitar", reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div>
      <label className="field-label">
        <span>Justificativa da rejeição</span>
        <textarea
          aria-label="Justificativa da rejeicao"
          placeholder="Descreva o que precisa ser corrigido — a rejeição reabre a coleta para a UG."
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      <div className="decision-actions">
        <button
          type="button"
          className="danger-button ripple-button"
          disabled={!reason.trim()}
          onClick={() => onDecide("rejeitar", reason.trim())}
        >
          <Icon name="x" />
          Rejeitar envio
        </button>
        <button
          type="button"
          className="primary-button ripple-button"
          onClick={() => onDecide("aprovar", "")}
        >
          <Icon name="check" />
          {submission.isNegative ? "Registrar ciência da negativa" : "Aprovar resposta"}
        </button>
      </div>
    </div>
  );
}

function StcValidation({
  cycle,
  collections,
  respondents,
  validationCollectionId,
  setValidationCollectionId,
  onDecide,
  setView,
}: {
  cycle: CycleItem;
  collections: Collection[];
  respondents: Respondent[];
  validationCollectionId: string;
  setValidationCollectionId: (id: string) => void;
  onDecide: (collectionId: string, submissionId: string, decision: "aprovar" | "rejeitar", reason: string) => void;
  setView: (view: View) => void;
}) {
  const cycleCollections = collections.filter((item) => item.cycleId === cycle.id);
  const current =
    cycleCollections.find((item) => item.id === validationCollectionId) ?? cycleCollections[0];
  const currentSubmissions = current
    ? current.submissions.filter((item) => item.status !== "rascunho")
    : [];
  const overdue = cycle.deadline < todayIso;

  return (
    <div className="workflow-page wide-page">
      <SectionHeader
        eyebrow="Validação STC"
        title="Receber, aprovar ou rejeitar"
        description="A checagem estrutural já rodou no envio; aqui a STC confere o conteúdo manualmente. As submissões aparecem separadas por setor — unificar num arquivo só é melhoria futura."
      />

      <div className="validation-grid">
        <section className="card">
          <div className="table-header">
            <h3>Coletas do ciclo</h3>
            <StatusPill tone={cycleTone(cycle.status)}>{cycleLabel(cycle.status)}</StatusPill>
          </div>

          <div className="data-table">
            <div className="table-row head">
              <span>UG</span>
              <span>Submissões</span>
              <span>Situação</span>
            </div>
            {cycleCollections.map((collection) => {
              const ug = ugs.find((item) => item.id === collection.ugId);
              const sent = collection.submissions.filter((item) => item.status !== "rascunho");
              const hint = sent.length
                ? sent.some((item) => item.status === "reaberto")
                  ? "Em correção"
                  : sent.every((item) => item.status === "aprovado")
                    ? "Aprovadas"
                    : "Aguardando decisão"
                : overdue
                  ? "Não enviado no prazo"
                  : "Sem envio";
              return (
                <button
                  type="button"
                  key={collection.id}
                  className={
                    collection.id === current?.id
                      ? "table-row validation-click-row selected"
                      : "table-row validation-click-row"
                  }
                  onClick={() => setValidationCollectionId(collection.id)}
                >
                  <span>
                    <strong>{ug?.acronym ?? collection.ugId}</strong>
                    <small>{ug?.contact ?? "Unidade gestora"}</small>
                  </span>
                  <span>{sent.length ? `${sent.length} recebida(s)` : "—"}</span>
                  <span>{hint}</span>
                </button>
              );
            })}
          </div>

          <button type="button" className="ghost-button full" onClick={() => setView("stc-cycle-detail")}>
            <Icon name="eye" />
            Ver detalhes e links do ciclo
          </button>
        </section>

        <section className="card">
          <span className="eyebrow">Coleta da {ugs.find((item) => item.id === current?.ugId)?.acronym ?? "UG"}</span>
          <h3>{cycle.objectName}</h3>
          {current?.requiredAttachments.length ? (
            <p className="muted-text">
              Anexos obrigatórios: {current.requiredAttachments.join(", ")}. A checagem estrutural
              confere presença, não conteúdo.
            </p>
          ) : (
            <p className="muted-text">Objeto fixo: planilha-padrão do Tesauro, sem anexos obrigatórios.</p>
          )}

          {!currentSubmissions.length ? (
            <div className="empty-state">
              <Icon name="clock" size={28} />
              <strong>{overdue ? "Não enviado no prazo" : "Aguardando envio"}</strong>
              <span>
                {overdue
                  ? "O prazo terminou sem submissões — estado distinto de resposta negativa."
                  : "Nenhum respondente desta coleta enviou pela plataforma até agora."}
              </span>
            </div>
          ) : (
            currentSubmissions.map((submission) => (
              <SubmissionBlock
                key={submission.id}
                submission={submission}
                respondent={respondents.find((item) => item.id === submission.respondentId)}
                requiredAttachments={current?.requiredAttachments ?? []}
              >
                {submission.status === "aguardando-ponto-focal" ? (
                  <p className="muted-text">
                    Aguardando validação do ponto focal — a submissão chega à STC após o
                    encaminhamento.
                  </p>
                ) : submission.status === "reaberto" ? (
                  <p className="muted-text">Devolvida para correção — aguardando reenvio da UG.</p>
                ) : submission.status === "aprovado" ? (
                  <ReceiptStrip submission={submission} seiNumber={cycle.seiNumber} compact />
                ) : (
                  <DecisionBox
                    submission={submission}
                    onDecide={(decision, reason) =>
                      current ? onDecide(current.id, submission.id, decision, reason) : undefined
                    }
                  />
                )}
              </SubmissionBlock>
            ))
          )}
        </section>
      </div>
    </div>
  );
}

function FocalDashboard({
  cycles,
  collections,
  respondents,
  openCycle,
  onRegisterRespondent,
}: {
  cycles: CycleItem[];
  collections: Collection[];
  respondents: Respondent[];
  openCycle: (cycleId: string) => void;
  onRegisterRespondent: (name: string, email: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const orgUg = ugs.find((item) => item.id === focalUser.ugId);
  const orgCycles = cycles.filter((cycle) => cycle.ugIds.includes(focalUser.ugId));
  const orgCollections = collections.filter((item) => item.ugId === focalUser.ugId);
  const orgSubmissions = orgCollections
    .flatMap((item) => item.submissions)
    .filter((item) => item.status !== "rascunho");
  const orgRespondents = respondents.filter((item) => item.ugId === focalUser.ugId);
  const awaiting = orgSubmissions.filter((item) => item.status === "aguardando-ponto-focal").length;

  const register = () => {
    if (!name.trim() || !email.trim()) return;
    onRegisterRespondent(name.trim(), email.trim());
    setName("");
    setEmail("");
  };

  const metrics = [
    ["Aguardando sua validação", awaiting, "Dar ciência e encaminhar", "warning"] as const,
    ["Ciclos do órgão", orgCycles.length, "Visão completa do ponto focal", "info"] as const,
    [
      "Em correção",
      orgCycles.filter((cycle) => cycle.status === "correcao").length,
      "Reabertos pela STC",
      "danger",
    ] as const,
    [
      "Finalizados",
      orgCycles.filter((cycle) => cycle.status === "finalizado").length,
      "Com comprovante",
      "neutral",
    ] as const,
  ];

  return (
    <div className="workflow-page ug-home wide-page">
      <SectionHeader
        eyebrow={`Painel do ponto focal · ${orgUg?.acronym ?? ""}`}
        title={`${focalUser.name} — ${orgUg?.name ?? ""}`}
        description="O ponto focal vê o ciclo inteiro do órgão e todas as submissões. Pode responder ou apenas monitorar — e valida antes do envio à STC quando o ciclo exige."
      />

      <div className="metrics-grid dashboard-metrics">
        {metrics.map(([label, value, hint, tone]) => (
          <MetricCard
            key={label}
            icon={tone === "warning" ? "bell" : tone === "danger" ? "refresh" : tone === "info" ? "clipboard" : "check"}
            label={label}
            value={String(value)}
            hint={hint}
            tone={tone}
          />
        ))}
      </div>

      <section className="card cycle-list-card ug-list-card">
        <div className="table-header">
          <div>
            <span className="eyebrow">Ciclos do órgão</span>
            <h3>Solicitações recebidas da STC</h3>
          </div>
          <StatusPill tone="info">Pedido no SEI · resposta na plataforma</StatusPill>
        </div>

        <div className="ug-cycle-list">
          {orgCycles.map((cycle) => {
            const cycleSubs = orgCollections
              .filter((item) => item.cycleId === cycle.id)
              .flatMap((item) => item.submissions)
              .filter((item) => item.status !== "rascunho");
            return (
              <article key={cycle.id} className={`ug-cycle-row ${cycle.status}`}>
                <div className="ug-cycle-status">
                  <StatusPill tone={cycleTone(cycle.status)}>{cycleLabel(cycle.status, "orgao")}</StatusPill>
                  <span>{cycle.deadline}</span>
                </div>
                <div className="ug-cycle-main">
                  <strong>{cycle.title}</strong>
                  <span>
                    {cycle.objectCode} · {kindLabel(cycle.objectKind)} · SEI {cycle.seiNumber || "a informar"}
                  </span>
                  <p>
                    {cycle.requiresFocalPointValidation
                      ? "Este ciclo exige sua validação antes do envio à STC."
                      : "Envio direto à STC — você acompanha sem validação obrigatória."}
                  </p>
                </div>
                <div className="ug-cycle-meta">
                  <span>{cycleSubs.length} submissão(ões) do órgão</span>
                  <span>{cycle.metadataLabels.length} campos</span>
                </div>
                <button type="button" className="primary-button ripple-button" onClick={() => openCycle(cycle.id)}>
                  <Icon name="eye" />
                  Abrir ciclo
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="card">
        <div className="table-header">
          <div>
            <span className="eyebrow">Respondentes técnicos</span>
            <h3>Quem responde pelo órgão</h3>
          </div>
        </div>
        <p className="muted-text">
          O cadastro é híbrido: você pré-cadastra (nome + e-mail) ou a pessoa se cadastra sozinha ao
          chegar pelo link — nesse caso ela aparece marcada como auto-cadastro.
        </p>

        <div className="person-list">
          {orgRespondents.map((person) => (
            <div key={person.id} className="person-row">
              <div>
                <strong>{person.name}</strong>
                <small>
                  {person.role || "Respondente técnico"} · {person.email}
                </small>
              </div>
              <div className="person-flags">
                <StatusPill tone={person.createdBySelf ? "warning" : "info"}>
                  {person.createdBySelf ? "Auto-cadastro" : "Pré-cadastrado"}
                </StatusPill>
                <StatusPill tone={person.emailVerified ? "success" : "neutral"}>
                  {person.emailVerified ? "E-mail verificado" : "Aguardando 1º acesso"}
                </StatusPill>
              </div>
            </div>
          ))}
        </div>

        <div className="chip-editor">
          <input
            placeholder="Nome do respondente"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <input
            placeholder="E-mail institucional"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button type="button" className="secondary-button" onClick={register}>
            <Icon name="users" size={16} />
            Pré-cadastrar
          </button>
        </div>
      </section>
    </div>
  );
}

function FocalCycleDetail({
  cycle,
  collections,
  respondents,
  onValidate,
  setView,
}: {
  cycle: CycleItem;
  collections: Collection[];
  respondents: Respondent[];
  onValidate: (collectionId: string, submissionId: string) => void;
  setView: (view: View) => void;
}) {
  const orgCollections = collections.filter(
    (item) => item.cycleId === cycle.id && item.ugId === focalUser.ugId,
  );
  const otherUgs = cycle.ugIds.filter((id) => id !== focalUser.ugId);

  return (
    <div className="workflow-page wide-page">
      <SectionHeader
        eyebrow="Ciclo do órgão"
        title={cycle.title}
        description="Todas as coletas e submissões do seu órgão, com a identificação de quem enviou."
      />

      <div className="detail-layout">
        <section className="card cycle-highlight-card">
          <div className="cycle-highlight-head">
            <div>
              <span className="eyebrow">{cycle.objectCode}</span>
              <h3>{cycle.objectName}</h3>
              <p>
                {cycle.requiresFocalPointValidation
                  ? "Validação do ponto focal exigida: dê ciência para encaminhar a resposta do órgão à STC."
                  : "Envio direto à STC — você continua vendo tudo, sem aprovação obrigatória."}
              </p>
            </div>
            <StatusPill tone={cycleTone(cycle.status)}>{cycleLabel(cycle.status, "orgao")}</StatusPill>
          </div>
          <div className="cycle-summary">
            <div>
              <strong>{cycle.seiNumber || "A informar"}</strong>
              <span>processo SEI</span>
            </div>
            <div>
              <strong>{cycle.deadline}</strong>
              <span>prazo</span>
            </div>
            <div>
              <strong>{kindLabel(cycle.objectKind)}</strong>
              <span>tipo do objeto</span>
            </div>
            <div>
              <strong>{otherUgs.length ? `+${otherUgs.length}` : "Só o seu"}</strong>
              <span>outros órgãos no ciclo</span>
            </div>
          </div>
          <div className="card-actions">
            <button type="button" className="secondary-button" onClick={() => setView("focal-dashboard")}>
              <Icon name="arrow" />
              Voltar ao painel
            </button>
          </div>
        </section>

        <section className="card">
          <span className="eyebrow">Coletas do órgão</span>
          <h3>Submissões identificadas</h3>
          {orgCollections.map((collection) => {
            const sent = collection.submissions.filter((item) => item.status !== "rascunho");
            return (
              <div key={collection.id} className="collection-block">
                <span className="link-chip">
                  <Icon name="link" size={14} />
                  {collectionLink(collection)}
                </span>
                {sent.length ? (
                  sent.map((submission) => (
                    <SubmissionBlock
                      key={submission.id}
                      submission={submission}
                      respondent={respondents.find((item) => item.id === submission.respondentId)}
                      requiredAttachments={collection.requiredAttachments}
                    >
                      {submission.status === "aguardando-ponto-focal" ? (
                        <button
                          type="button"
                          className="primary-button ripple-button"
                          onClick={() => onValidate(collection.id, submission.id)}
                        >
                          <Icon name="check" />
                          Validar e encaminhar à STC
                        </button>
                      ) : null}
                    </SubmissionBlock>
                  ))
                ) : (
                  <div className="empty-state">
                    <Icon name="clock" size={28} />
                    <strong>Nenhuma submissão ainda</strong>
                    <span>O link da coleta está no SEI — qualquer pessoa do órgão pode responder.</span>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}

function RespAccess({
  collection,
  cycle,
  onRegister,
  onLogin,
}: {
  collection: Collection;
  cycle: CycleItem | undefined;
  onRegister: (data: { name: string; email: string; phone: string; role: string; ugId: string }) => void;
  onLogin: (email: string) => boolean;
}) {
  const [tab, setTab] = useState<"novo" | "login">("novo");
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    ugId: collection.ugId,
  });
  const [password, setPassword] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState(false);

  const ug = ugs.find((item) => item.id === collection.ugId);
  const mismatch = form.ugId !== collection.ugId;
  const canContinue = form.name.trim() && form.email.trim() && form.role.trim();

  return (
    <div className="workflow-page">
      <SectionHeader
        eyebrow="Acesso pelo link da coleta"
        title="Identifique-se para responder"
        description="Este link veio anexado ao processo SEI. Toda submissão é identificada — no primeiro acesso é preciso se cadastrar."
      />

      <div className="auth-card card">
        <div className="received-box">
          <Icon name="link" />
          <div>
            <span>Coleta vinculada ao link</span>
            <strong>
              {collection.objectCode} · {collection.objectName}
            </strong>
            <span>
              {ug?.name ?? collection.ugId} · prazo {cycle?.deadline ?? "—"} · SEI {cycle?.seiNumber || "a informar"}
            </span>
          </div>
        </div>

        <div className="kind-toggle" aria-label="Forma de acesso">
          <button
            type="button"
            className={tab === "novo" ? "active" : ""}
            onClick={() => setTab("novo")}
          >
            Primeiro acesso
          </button>
          <button
            type="button"
            className={tab === "login" ? "active" : ""}
            onClick={() => setTab("login")}
          >
            Já tenho cadastro
          </button>
        </div>

        {tab === "novo" && step === 1 ? (
          <>
            <div className="details-form">
              <label>
                Nome completo
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </label>
              <label>
                E-mail
                <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              </label>
              <label>
                Telefone
                <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              </label>
              <label>
                Cargo / setor
                <input value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} />
              </label>
              <label className="full-row">
                Órgão
                <select value={form.ugId} onChange={(event) => setForm({ ...form, ugId: event.target.value })}>
                  {ugs.filter((item) => item.id !== "stc").map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.acronym} — {item.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {mismatch ? (
              <div className="alert danger">
                <Icon name="refresh" />
                <div>
                  <strong>Órgão diferente do vínculo da coleta</strong>
                  <span>
                    Este link pertence à {ug?.acronym ?? collection.ugId}. Confira seu vínculo — o
                    cruzamento fica registrado para a STC.
                  </span>
                </div>
              </div>
            ) : null}

            <div className="card-actions">
              <button
                type="button"
                className="primary-button ripple-button"
                disabled={!canContinue}
                onClick={() => setStep(2)}
              >
                <Icon name="arrow" />
                Continuar
              </button>
            </div>
          </>
        ) : null}

        {tab === "novo" && step === 2 ? (
          <>
            <div className="alert">
              <Icon name="mail" />
              <div>
                <strong>Confirme que é você</strong>
                <span>
                  Enviamos um código para {form.email} (simulado). Confirme e crie sua senha — nos
                  próximos acessos, entre com e-mail e senha.
                </span>
              </div>
            </div>
            <div className="details-form">
              <label>
                Código de confirmação
                <input value="584-203" readOnly />
              </label>
              <label>
                Criar senha
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
            </div>
            <div className="card-actions">
              <button type="button" className="secondary-button" onClick={() => setStep(1)}>
                <Icon name="arrow" />
                Voltar aos dados
              </button>
              <button
                type="button"
                className="primary-button ripple-button"
                disabled={!password.trim()}
                onClick={() => onRegister(form)}
              >
                <Icon name="check" />
                Confirmar e-mail e acessar a coleta
              </button>
            </div>
          </>
        ) : null}

        {tab === "login" ? (
          <>
            <div className="details-form">
              <label>
                E-mail
                <input
                  placeholder="ex.: joao.lima@seduc.ma.gov.br"
                  value={loginEmail}
                  onChange={(event) => {
                    setLoginEmail(event.target.value);
                    setLoginError(false);
                  }}
                />
              </label>
              <label>
                Senha
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                />
              </label>
            </div>
            {loginError ? (
              <div className="alert danger">
                <Icon name="x" />
                <div>
                  <strong>Cadastro não encontrado</strong>
                  <span>Confira o e-mail ou use o primeiro acesso para se cadastrar.</span>
                </div>
              </div>
            ) : null}
            <div className="card-actions">
              <button
                type="button"
                className="primary-button ripple-button"
                disabled={!loginEmail.trim() || !loginPassword.trim()}
                onClick={() => {
                  if (!onLogin(loginEmail)) setLoginError(true);
                }}
              >
                <Icon name="lock" />
                Entrar
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function RespDashboard({
  respondent,
  collections,
  cycles,
  openCollection,
}: {
  respondent: Respondent;
  collections: Collection[];
  cycles: CycleItem[];
  openCollection: (collectionId: string) => void;
}) {
  const myCollections = respondent.collectionIds
    .map((id) => collections.find((item) => item.id === id))
    .filter((item): item is Collection => Boolean(item));

  const actionLabel = (status: SubmissionStatus) => {
    if (status === "pendente" || status === "rascunho") return "Responder coleta";
    if (status === "reaberto") return "Corrigir envio";
    return "Ver comprovante";
  };

  return (
    <div className="workflow-page ug-home wide-page">
      <SectionHeader
        eyebrow={`Respondente técnico · ${ugs.find((item) => item.id === respondent.ugId)?.acronym ?? ""}`}
        title={`Minhas coletas — ${respondent.name}`}
        description="Você vê apenas as coletas em que foi adicionado ou às quais chegou pelo link anexado ao SEI."
      />

      <section className="card cycle-list-card ug-list-card">
        <div className="table-header">
          <div>
            <span className="eyebrow">Coletas disponíveis</span>
            <h3>Responder, corrigir ou consultar comprovante</h3>
          </div>
          <StatusPill tone="info">Toda submissão é identificada</StatusPill>
        </div>

        <div className="ug-cycle-list">
          {myCollections.map((collection) => {
            const cycle = cycles.find((item) => item.id === collection.cycleId);
            const own = collection.submissions.find((item) => item.respondentId === respondent.id);
            const status: SubmissionStatus = own?.status ?? "pendente";
            const rowClass =
              status === "reaberto" ? "correcao" : status === "aprovado" ? "finalizado" : "ativo";
            return (
              <article key={collection.id} className={`ug-cycle-row ${rowClass}`}>
                <div className="ug-cycle-status">
                  <StatusPill tone={submissionTone(status)}>{submissionLabel(status)}</StatusPill>
                  <span>prazo {cycle?.deadline ?? "—"}</span>
                </div>
                <div className="ug-cycle-main">
                  <strong>
                    {collection.objectCode} · {collection.objectName}
                  </strong>
                  <span>
                    {ugs.find((item) => item.id === collection.ugId)?.name ?? collection.ugId} ·{" "}
                    {kindLabel(collection.kind)}
                  </span>
                  {status === "reaberto" && own ? (
                    <p>{own.rejectionReason}</p>
                  ) : (
                    <p>
                      {collection.kind === "fixo"
                        ? "Planilha-padrão pronta para download."
                        : `Planilha gerada pela STC · ${collection.requiredAttachments.length} anexos obrigatórios.`}
                    </p>
                  )}
                </div>
                <div className="ug-cycle-meta">
                  <span>{own?.fileName || "Nenhum arquivo enviado"}</span>
                  <span>{own?.protocol ? `Protocolo ${own.protocol}` : "Sem comprovante ainda"}</span>
                </div>
                <button
                  type="button"
                  className={
                    status === "pendente" || status === "rascunho" || status === "reaberto"
                      ? "primary-button ripple-button"
                      : "secondary-button"
                  }
                  onClick={() => openCollection(collection.id)}
                >
                  <Icon name={status === "reaberto" ? "refresh" : status === "pendente" || status === "rascunho" ? "send" : "eye"} />
                  {actionLabel(status)}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function responseSteps(hasFile: boolean, attachmentsOk: boolean, sent: boolean): StepDefinition[] {
  if (sent) {
    return [
      ["Planilha-padrão", "done"],
      ["Preencher e subir", "done"],
      ["Anexos obrigatórios", "done"],
      ["Comprovante", "done"],
    ];
  }
  return [
    ["Planilha-padrão", "done"],
    ["Preencher e subir", hasFile ? "done" : "active"],
    ["Anexos obrigatórios", attachmentsOk ? "done" : hasFile ? "active" : "todo"],
    ["Comprovante", hasFile && attachmentsOk ? "active" : "todo"],
  ];
}

function RespCollection({
  collection,
  cycle,
  submission,
  fields,
  onSaveDraft,
  onSend,
  onSendNegative,
  setView,
}: {
  collection: Collection;
  cycle: CycleItem | undefined;
  submission: Submission | undefined;
  fields: string[];
  onSaveDraft: (fileName: string, attachments: string[]) => void;
  onSend: (fileName: string, attachments: string[]) => void;
  onSendNegative: (reason: string) => void;
  setView: (view: View) => void;
}) {
  const correcting = submission?.status === "reaberto";
  const editing = !submission || submission.status === "rascunho" || correcting;
  const [fileName, setFileName] = useState(
    submission && submission.status === "rascunho" ? submission.fileName : "",
  );
  const [attachments, setAttachments] = useState<string[]>(submission?.attachments ?? []);
  const [negativeOpen, setNegativeOpen] = useState(false);
  const [negativeReason, setNegativeReason] = useState("");
  const [downloaded, setDownloaded] = useState(false);

  const required = collection.requiredAttachments;
  const attachmentsOk = required.every((label) => attachments.includes(`${slugify(label)}.pdf`));
  const structuralOk = Boolean(fileName) && attachmentsOk;
  const templateName = `${collection.objectCode}_planilha_${collection.kind === "fixo" ? "padrao" : "gerada"}.xlsx`;
  const uploadName = `${collection.objectCode.toLowerCase()}_${collection.ugId}_${correcting ? "corrigida" : "preenchida"}.xlsx`;

  const toggleAttachment = (label: string) => {
    const file = `${slugify(label)}.pdf`;
    setAttachments(
      attachments.includes(file)
        ? attachments.filter((item) => item !== file)
        : [...attachments, file],
    );
  };

  if (!editing && submission) {
    return (
      <div className="workflow-page wide-page">
        <SectionHeader
          eyebrow={`${collection.objectCode} · ${ugs.find((item) => item.id === collection.ugId)?.acronym ?? ""}`}
          title={collection.objectName}
          description="Envio registrado. O comprovante garante que a resposta chegou."
        />
        <section className="card response-flow dedicated-response">
          <div className="table-header">
            <div>
              <span className="eyebrow">Situação do seu envio</span>
              <h3>{submissionLabel(submission.status)}</h3>
            </div>
            <StatusPill tone={submissionTone(submission.status)}>
              {submissionLabel(submission.status)}
            </StatusPill>
          </div>

          {submission.status === "aguardando-ponto-focal" ? (
            <div className="alert">
              <Icon name="clock" />
              <div>
                <strong>Aguardando o ponto focal do órgão</strong>
                <span>Ele dá ciência de que esta é a resposta do órgão antes do envio à STC.</span>
              </div>
            </div>
          ) : null}
          {submission.status === "enviado" ? (
            <div className="alert">
              <Icon name="clipboard" />
              <div>
                <strong>Em verificação pela STC</strong>
                <span>A checagem estrutural passou; o conteúdo é conferido manualmente pela equipe.</span>
              </div>
            </div>
          ) : null}
          {submission.status === "aprovado" ? (
            <div className="quality-strip">
              <Icon name="check" />
              <div>
                <strong>Resposta aprovada pela STC</strong>
                <span>O ciclo segue para fechamento; o comprovante fica disponível abaixo.</span>
              </div>
            </div>
          ) : null}
          {submission.status === "resposta-negativa" ? (
            <div className="alert">
              <Icon name="clock" />
              <div>
                <strong>Resposta negativa registrada</strong>
                <span>
                  Ficou registrado que o órgão não tem esta informação — diferente de não responder.
                </span>
              </div>
            </div>
          ) : null}

          <ReceiptStrip submission={submission} seiNumber={cycle?.seiNumber ?? ""} compact />
          <ObservationThread observations={submission.observations} />

          <div className="card-actions">
            <button type="button" className="secondary-button" onClick={() => setView("resp-dashboard")}>
              <Icon name="arrow" />
              Voltar às minhas coletas
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="workflow-page wide-page">
      <SectionHeader
        eyebrow={`${collection.objectCode} · ${ugs.find((item) => item.id === collection.ugId)?.acronym ?? ""}`}
        title={collection.objectName}
        description="Baixe a planilha-padrão, preencha, suba o arquivo e os anexos obrigatórios. O pedido formal permanece no SEI."
      />

      <section className="card response-flow dedicated-response">
        <div className="table-header">
          <div>
            <span className="eyebrow">{kindLabel(collection.kind)}</span>
            <h3>Responder coleta</h3>
            <p>Prazo {cycle?.deadline ?? "—"} · SEI {cycle?.seiNumber || "a informar"}</p>
          </div>
          <StatusPill tone={submissionTone(correcting ? "reaberto" : "pendente")}>
            {correcting ? "Reaberto para correção" : "Pendente"}
          </StatusPill>
        </div>

        {correcting && submission ? (
          <>
            <div className="alert danger wide">
              <Icon name="refresh" />
              <div>
                <strong>Devolvido para correção</strong>
                <span>{submission.rejectionReason}</span>
              </div>
            </div>
            <ObservationThread observations={submission.observations} />
          </>
        ) : null}

        <div className="step-grid">
          {responseSteps(Boolean(fileName), attachmentsOk, false).map(([label, state], index) => (
            <article key={label} className={`step-card ${state}`}>
              <span>{state === "done" ? <Icon name="check" size={14} /> : index + 1}</span>
              <strong>{label}</strong>
            </article>
          ))}
        </div>

        <div className="model-upload-grid">
          <article className="model-preview">
            <span className="eyebrow">
              {collection.kind === "fixo"
                ? "Planilha-padrão pronta (Tesauro)"
                : "Planilha-padrão gerada pela STC"}
            </span>
            <h4>{templateName}</h4>
            <p>
              {collection.kind === "fixo"
                ? "Modelo recorrente do objeto, com os campos e regras mínimas de preenchimento."
                : "Gerada a partir dos campos que a STC selecionou na criação do ciclo."}
            </p>
            <div className="mini-sheet">
              {fields.slice(0, 5).map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
            <button type="button" className="ghost-button" onClick={() => setDownloaded(true)}>
              <Icon name="download" size={16} />
              {downloaded ? "Modelo baixado (simulado)" : "Baixar planilha-padrão"}
            </button>
          </article>

          <article className="upload-demo">
            <span className="eyebrow">Planilha preenchida</span>
            <h4>Subir o arquivo consolidado</h4>
            <button type="button" className="dropzone" onClick={() => setFileName(uploadName)}>
              <Icon name="upload" size={28} />
              <strong>{fileName ? "Trocar arquivo" : "Selecionar arquivo"}</strong>
              <span>{fileName || "XLSX seguindo a estrutura da planilha-padrão"}</span>
            </button>
          </article>
        </div>

        {required.length ? (
          <div className="review-list">
            {required.map((label) => {
              const file = `${slugify(label)}.pdf`;
              const done = attachments.includes(file);
              return (
                <div key={label} className="review-item">
                  <div>
                    <strong>{label}</strong>
                    <span>{done ? file : "Obrigatório — anexar antes do envio"}</span>
                  </div>
                  <div className="review-item-actions">
                    <StatusPill tone={done ? "success" : "warning"}>
                      {done ? "Anexado" : "Pendente"}
                    </StatusPill>
                    <button type="button" className="ghost-button" onClick={() => toggleAttachment(label)}>
                      <Icon name={done ? "x" : "upload"} size={14} />
                      {done ? "Remover" : "Anexar"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="quality-strip">
          <Icon name={structuralOk ? "check" : "clock"} />
          <div>
            <strong>Checagem estrutural no envio</strong>
            <span>
              {fileName
                ? "Planilha na estrutura do modelo (colunas conferidas)"
                : "Aguardando a planilha preenchida"}
              {" · "}
              {required.length
                ? `anexos obrigatórios ${attachments.length}/${required.length}`
                : "sem anexos obrigatórios (objeto fixo)"}
              . O conteúdo das células não é lido — a verificação de conteúdo é humana, pela STC.
            </span>
          </div>
        </div>

        {negativeOpen ? (
          <div className="negative-panel">
            {/* TODO(P-021): resposta negativa registrada pela coleta inteira. */}
            <strong>Registrar que o órgão não tem esta informação</strong>
            <p>Estado próprio, diferente de simplesmente não responder — a STC saberá quem declarou.</p>
            <textarea
              placeholder="Explique brevemente (ex.: o dado é gerido por outro órgão)."
              value={negativeReason}
              onChange={(event) => setNegativeReason(event.target.value)}
            />
            <div className="card-actions">
              <button type="button" className="secondary-button" onClick={() => setNegativeOpen(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="danger-button ripple-button"
                disabled={!negativeReason.trim()}
                onClick={() => onSendNegative(negativeReason.trim())}
              >
                <Icon name="send" />
                Registrar resposta negativa
              </button>
            </div>
          </div>
        ) : null}

        <div className="card-actions">
          <button type="button" className="secondary-button" onClick={() => setView("resp-dashboard")}>
            <Icon name="arrow" />
            Voltar
          </button>
          {!correcting ? (
            <>
              <button type="button" className="ghost-button" onClick={() => setNegativeOpen(true)}>
                <Icon name="x" size={16} />
                Não tenho esta informação
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={!fileName && !attachments.length}
                onClick={() => onSaveDraft(fileName, attachments)}
              >
                <Icon name="edit" size={16} />
                Salvar rascunho
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="primary-button ripple-button"
            disabled={!structuralOk}
            onClick={() => onSend(fileName, attachments)}
          >
            <Icon name="send" />
            {correcting ? "Reenviar corrigido" : "Enviar e gerar comprovante"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState<Role>("login");
  const [view, setView] = useState<View>("stc-dashboard");
  const [cycles, setCycles] = useState<CycleItem[]>(seedCycles);
  const [collections, setCollections] = useState<Collection[]>(seedCollections);
  const [respondents, setRespondents] = useState<Respondent[]>(seedRespondents);
  const [currentRespondentId, setCurrentRespondentId] = useState("");
  const [objectId, setObjectId] = useState(defaultObject.id);
  const [selectedUgs, setSelectedUgs] = useState<string[]>([...defaultObject.suggestedUgs]);
  const [selectedMetadataIds, setSelectedMetadataIds] = useState<string[]>(
    defaultObject.fields.map((field) => field.id),
  );
  const [draft, setDraft] = useState<CycleDraft>(draftForObject(defaultObject));
  const [activeCycleId, setActiveCycleId] = useState("ciclo-100");
  const [activeCollectionId, setActiveCollectionId] = useState("col-100-seduc");
  const [linkCollectionId, setLinkCollectionId] = useState("col-100-seduc");
  const [validationCollectionId, setValidationCollectionId] = useState("col-100-seduc");
  const [profileOpen, setProfileOpen] = useState(false);

  const selectedObject = transparencyObjects.find((item) => item.id === objectId) ?? defaultObject;
  const activeCycle = cycles.find((cycle) => cycle.id === activeCycleId) ?? cycles[0];
  const activeCollection =
    collections.find((item) => item.id === activeCollectionId) ?? collections[0];
  const linkCollection = collections.find((item) => item.id === linkCollectionId) ?? collections[0];
  const currentRespondent = respondents.find((item) => item.id === currentRespondentId) ?? null;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [role, view, objectId, activeCycleId, activeCollectionId]);

  const setRoleAndReset = (nextRole: Role) => {
    setRole(nextRole);
    setProfileOpen(false);
    if (nextRole === "stc") setView("stc-dashboard");
    if (nextRole === "ponto-focal") setView("focal-dashboard");
    if (nextRole === "respondente") setView(currentRespondentId ? "resp-dashboard" : "resp-access");
  };

  const applySubmissions = (collectionId: string, mutate: (subs: Submission[]) => Submission[]) => {
    const target = collections.find((item) => item.id === collectionId);
    if (!target) return;
    const nextCollections = collections.map((item) =>
      item.id === collectionId ? { ...item, submissions: mutate(item.submissions) } : item,
    );
    setCollections(nextCollections);
    const cycleSubmissions = nextCollections
      .filter((item) => item.cycleId === target.cycleId)
      .flatMap((item) => item.submissions);
    setCycles(
      cycles.map((cycle) =>
        cycle.id === target.cycleId
          ? { ...cycle, status: deriveCycleStatus(cycle, cycleSubmissions) }
          : cycle,
      ),
    );
  };

  const nextProtocol = () => {
    const count = collections.flatMap((item) => item.submissions).filter((item) => item.protocol).length;
    return `AG-2026-${String(29 + count).padStart(5, "0")}`;
  };

  const upsertOwnSubmission = (
    collectionId: string,
    build: (previous: Submission | undefined) => Submission,
  ) => {
    applySubmissions(collectionId, (submissions) => {
      const previous = submissions.find((item) => item.respondentId === currentRespondentId);
      return previous
        ? submissions.map((item) => (item === previous ? build(previous) : item))
        : [...submissions, build(undefined)];
    });
  };

  const ownSubmissionBase = (collectionId: string, previous: Submission | undefined) => ({
    id: previous?.id ?? `sub-${collectionId}-${currentRespondentId}`,
    collectionId,
    respondentId: currentRespondentId,
    respondentName: currentRespondent?.name ?? "",
    rejectionReason: "",
    isNegative: false,
    observations: previous?.observations ?? [],
  });

  const saveDraftSubmission = (collectionId: string, fileName: string, attachments: string[]) => {
    upsertOwnSubmission(collectionId, (previous) => ({
      ...ownSubmissionBase(collectionId, previous),
      status: "rascunho",
      protocol: previous?.protocol ?? "",
      fileName,
      attachments,
      submittedAt: "",
    }));
  };

  const sendSubmission = (collectionId: string, fileName: string, attachments: string[]) => {
    const cycle = cycles.find(
      (item) => item.id === collections.find((col) => col.id === collectionId)?.cycleId,
    );
    upsertOwnSubmission(collectionId, (previous) => {
      const resending = previous?.status === "reaberto";
      return {
        ...ownSubmissionBase(collectionId, previous),
        status:
          !resending && cycle?.requiresFocalPointValidation ? "aguardando-ponto-focal" : "enviado",
        protocol: previous?.protocol || nextProtocol(),
        fileName,
        attachments,
        submittedAt: today,
        observations: [
          ...(previous?.observations ?? []),
          {
            author: currentRespondent?.name ?? "",
            date: today,
            text: resending
              ? "Correção reenviada pela plataforma."
              : "Planilha e anexos enviados pela plataforma.",
          },
        ],
      };
    });
  };

  const sendNegativeSubmission = (collectionId: string, reason: string) => {
    upsertOwnSubmission(collectionId, (previous) => ({
      ...ownSubmissionBase(collectionId, previous),
      status: "resposta-negativa",
      protocol: previous?.protocol || nextProtocol(),
      fileName: "",
      attachments: [],
      submittedAt: today,
      isNegative: true,
      observations: [
        ...(previous?.observations ?? []),
        { author: currentRespondent?.name ?? "", date: today, text: reason },
      ],
    }));
  };

  const focalValidateSubmission = (collectionId: string, submissionId: string) => {
    applySubmissions(collectionId, (submissions) =>
      submissions.map((item) =>
        item.id === submissionId
          ? {
              ...item,
              status: "enviado",
              observations: [
                ...item.observations,
                {
                  author: `${focalUser.name} · ponto focal`,
                  date: today,
                  text: "Validado como resposta do órgão e encaminhado à STC.",
                },
              ],
            }
          : item,
      ),
    );
  };

  const decideSubmission = (
    collectionId: string,
    submissionId: string,
    decision: "aprovar" | "rejeitar",
    reason: string,
  ) => {
    applySubmissions(collectionId, (submissions) =>
      submissions.map((item) => {
        if (item.id !== submissionId) return item;
        if (decision === "rejeitar") {
          return {
            ...item,
            status: "reaberto",
            rejectionReason: reason,
            observations: [...item.observations, { author: "Equipe STC", date: today, text: reason }],
          };
        }
        return {
          ...item,
          status: "aprovado",
          rejectionReason: "",
          observations: [
            ...item.observations,
            {
              author: "Equipe STC",
              date: today,
              text: item.isNegative
                ? "Ciência registrada: o órgão declarou não deter a informação."
                : "Resposta aprovada. Comprovante disponível.",
            },
          ],
        };
      }),
    );
  };

  const activateCycle = () => {
    const cycleNumber = 100 + cycles.length;
    const cycleId = `ciclo-${cycleNumber}`;
    const selectedFields = selectedObject.fields.filter((field) =>
      selectedMetadataIds.includes(field.id),
    );
    const requiredAttachments = draft.kind === "fixo" ? [] : [...draft.requiredAttachments];
    const newCollections: Collection[] = selectedUgs.map((ugId) => ({
      id: `col-${cycleNumber}-${ugId}`,
      cycleId,
      objectCode: selectedObject.code,
      objectName: titleCase(selectedObject.name),
      kind: draft.kind,
      ugId,
      linkToken: `agz-${cycleNumber}-${ugId}`,
      requiredAttachments,
      submissions: [],
    }));
    const cycle: CycleItem = {
      id: cycleId,
      title: draft.title,
      objectCode: selectedObject.code,
      objectName: titleCase(selectedObject.name),
      objectKind: draft.kind,
      createdAt: today,
      deadline: draft.deadline,
      status: "ativo",
      seiNumber: draft.seiNumber,
      ugIds: [...selectedUgs],
      metadataLabels: selectedFields.map((field) => field.label),
      collectionIds: newCollections.map((item) => item.id),
      requiresFocalPointValidation: draft.requiresFocalPointValidation,
      requiredAttachments,
    };
    setCycles([...cycles, cycle]);
    setCollections([...collections, ...newCollections]);
    setLinkCollectionId(newCollections[0].id);
    setActiveCycleId(cycleId);
    setView("stc-cycle-detail");
  };

  const handleObjectChange = (id: string) => {
    const nextObject = transparencyObjects.find((item) => item.id === id) ?? defaultObject;
    setObjectId(id);
    setSelectedUgs([...nextObject.suggestedUgs]);
    setSelectedMetadataIds(nextObject.fields.map((field) => field.id));
    setDraft({
      ...draft,
      title: `Coleta ${nextObject.code} - ${titleCase(nextObject.name)}`,
      kind: kindFromFormat(nextObject.format),
      requiredAttachments: [],
    });
  };

  const openValidation = (cycleId: string) => {
    const first = collections.find((item) => item.cycleId === cycleId);
    setActiveCycleId(cycleId);
    if (first) setValidationCollectionId(first.id);
    setView("stc-validation");
  };

  const openCollectionLink = (collectionId: string) => {
    setLinkCollectionId(collectionId);
    setRole("respondente");
    setProfileOpen(false);
    if (!currentRespondent) {
      setView("resp-access");
      return;
    }
    if (!currentRespondent.collectionIds.includes(collectionId)) {
      setRespondents(
        respondents.map((item) =>
          item.id === currentRespondent.id
            ? { ...item, collectionIds: [...item.collectionIds, collectionId] }
            : item,
        ),
      );
    }
    setActiveCollectionId(collectionId);
    setView("resp-collection");
  };

  const registerRespondentBySelf = (data: {
    name: string;
    email: string;
    phone: string;
    role: string;
    ugId: string;
  }) => {
    const id = `resp-auto-${respondents.length + 1}`;
    setRespondents([
      ...respondents,
      {
        ...data,
        id,
        createdBySelf: true,
        emailVerified: true,
        collectionIds: [linkCollectionId],
      },
    ]);
    setCurrentRespondentId(id);
    setActiveCollectionId(linkCollectionId);
    setView("resp-collection");
  };

  const loginRespondent = (email: string): boolean => {
    const found = respondents.find(
      (item) => item.email.toLowerCase() === email.trim().toLowerCase(),
    );
    if (!found) return false;
    if (!found.collectionIds.includes(linkCollectionId)) {
      setRespondents(
        respondents.map((item) =>
          item.id === found.id
            ? { ...item, collectionIds: [...item.collectionIds, linkCollectionId] }
            : item,
        ),
      );
    }
    setCurrentRespondentId(found.id);
    setActiveCollectionId(linkCollectionId);
    setView("resp-collection");
    return true;
  };

  const registerRespondentByFocal = (name: string, email: string) => {
    const openCycleIds = new Set(
      cycles
        .filter((cycle) => cycle.status !== "finalizado" && cycle.status !== "nao-enviado-no-prazo")
        .map((cycle) => cycle.id),
    );
    setRespondents([
      ...respondents,
      {
        id: `resp-pf-${respondents.length + 1}`,
        name,
        email,
        phone: "",
        role: "Respondente técnico",
        ugId: focalUser.ugId,
        createdBySelf: false,
        emailVerified: false,
        collectionIds: collections
          .filter((item) => item.ugId === focalUser.ugId && openCycleIds.has(item.cycleId))
          .map((item) => item.id),
      },
    ]);
  };

  const page = (() => {
    if (role === "login") {
      return (
        <LoginScreen
          enter={setRoleAndReset}
          openPilotLink={() => openCollectionLink("col-100-seduc")}
        />
      );
    }

    if (role === "respondente") {
      if (!currentRespondent || view === "resp-access") {
        return (
          <RespAccess
            collection={linkCollection}
            cycle={cycles.find((item) => item.id === linkCollection.cycleId)}
            onRegister={registerRespondentBySelf}
            onLogin={loginRespondent}
          />
        );
      }
      if (view === "resp-collection") {
        const cycle = cycles.find((item) => item.id === activeCollection.cycleId);
        const own = activeCollection.submissions.find(
          (item) => item.respondentId === currentRespondentId,
        );
        return (
          <RespCollection
            key={`${activeCollection.id}:${own?.status ?? "novo"}`}
            collection={activeCollection}
            cycle={cycle}
            submission={own}
            fields={cycle?.metadataLabels ?? []}
            onSaveDraft={(fileName, attachments) =>
              saveDraftSubmission(activeCollection.id, fileName, attachments)
            }
            onSend={(fileName, attachments) =>
              sendSubmission(activeCollection.id, fileName, attachments)
            }
            onSendNegative={(reason) => sendNegativeSubmission(activeCollection.id, reason)}
            setView={setView}
          />
        );
      }
      return (
        <RespDashboard
          respondent={currentRespondent}
          collections={collections}
          cycles={cycles}
          openCollection={(collectionId) => {
            setActiveCollectionId(collectionId);
            setView("resp-collection");
          }}
        />
      );
    }

    if (role === "ponto-focal") {
      if (view === "focal-cycle-detail") {
        return (
          <FocalCycleDetail
            cycle={activeCycle}
            collections={collections}
            respondents={respondents}
            onValidate={focalValidateSubmission}
            setView={setView}
          />
        );
      }
      return (
        <FocalDashboard
          cycles={cycles}
          collections={collections}
          respondents={respondents}
          openCycle={(cycleId) => {
            setActiveCycleId(cycleId);
            setView("focal-cycle-detail");
          }}
          onRegisterRespondent={registerRespondentByFocal}
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
          draft={draft}
          setDraft={setDraft}
          onActivate={activateCycle}
        />
      );
    }

    if (view === "stc-cycle-detail") {
      return (
        <StcCycleDetail
          cycle={activeCycle}
          collections={collections}
          setView={setView}
          openValidation={openValidation}
          openCollectionLink={openCollectionLink}
        />
      );
    }

    if (view === "stc-validation") {
      return (
        <StcValidation
          cycle={activeCycle}
          collections={collections}
          respondents={respondents}
          validationCollectionId={validationCollectionId}
          setValidationCollectionId={setValidationCollectionId}
          onDecide={decideSubmission}
          setView={setView}
        />
      );
    }

    return (
      <StcDashboard
        cycles={cycles}
        collections={collections}
        openDetail={(cycleId) => {
          setActiveCycleId(cycleId);
          setView("stc-cycle-detail");
        }}
        openValidation={openValidation}
        openCreate={() => setView("stc-create")}
        updateSei={(cycleId, value) =>
          setCycles(cycles.map((cycle) => (cycle.id === cycleId ? { ...cycle, seiNumber: value } : cycle)))
        }
      />
    );
  })();

  return (
    <div className={`app-shell ${role === "stc" ? "stc-accent" : ""}`}>
      <TopBar
        role={role}
        setRole={setRoleAndReset}
        respondentInitial={currentRespondent ? currentRespondent.name.charAt(0) : "R"}
        onProfileClick={() => setProfileOpen(true)}
      />
      <div className={role === "login" ? "login-only" : `workspace ${role === "stc" ? "" : "ug-workspace"}`}>
        <Sidebar role={role} view={view} setView={setView} />
        <main className="content">{page}</main>
      </div>
      <ProfileDrawer
        role={role}
        respondent={currentRespondent}
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />
    </div>
  );
}
