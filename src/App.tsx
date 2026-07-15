import { useEffect, useMemo, useState } from "react";
import { tesauroAttachments, tesauroFields, tesauroObjects } from "./tesauroData";

type StcRole = "stc-analista" | "stc-especialista";
type Role = "login" | "ponto-focal" | "respondente" | StcRole;
type View =
  | "stc-home"
  | "stc-dashboard"
  | "stc-create"
  | "stc-creation-review"
  | "stc-cycle-detail"
  | "stc-validation"
  | "stc-history"
  | "stc-registry"
  | "focal-dashboard"
  | "focal-cycle-detail"
  | "resp-access"
  | "resp-general-access"
  | "resp-dashboard"
  | "resp-collection";
type ObjectKind = "fixo" | "variavel";
type SpreadsheetStatus = "pending-approval" | "fixed-template-pending" | "generated";
type CreationReviewStatus = "aguardando-analise" | "ajustes-solicitados" | "aprovado";
export type SubmissionStatus =
  | "pendente"
  | "rascunho"
  | "enviado"
  | "aguardando-ponto-focal"
  | "reaberto"
  | "aprovado"
  | "resposta-negativa";
export type CycleStatus =
  | "ativo"
  | "aguardando-ponto-focal"
  | "aguardando-analise-stc" // antigo respondido (verde) — agora amarelo: há resposta nova para a STC analisar (§1.2)
  | "correcao"
  | "finalizado"
  | "nao-enviado-no-prazo";
type Tone = "info" | "success" | "warning" | "danger" | "neutral" | "orange";
type StepState = "done" | "active" | "todo";
type StepDefinition = [string, StepState];

function isStcRole(role: Role): role is StcRole {
  return role === "stc-analista" || role === "stc-especialista";
}

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
  kind?: ObjectKind;
  suggestedUgs: readonly string[];
  attachmentIds?: readonly string[];
  fieldIds?: readonly string[];
  requiredFieldIds?: readonly string[];
  fields: readonly FieldDefinition[];
}

interface AttachmentDefinition {
  id: string;
  label: string;
}

interface Ug {
  id: string;
  acronym: string;
  name: string;
  esfera: string;
  focalName: string;
  focalEmail: string; // por onde o ponto focal recebe a notificação e faz login (§4.2 — um por órgão)
  contact: string;
  profile: string;
}

interface SubmissionObservation {
  author: string;
  date: string;
  text: string;
}

export type ReceiptKind = "envio" | "rejeicao" | "fechamento";

export interface SubmissionReceipt {
  id: string;
  kind: ReceiptKind;
  protocol: string;
  date: string;
  author: string;
  summary: string;
}

export function createReceipt(
  kind: ReceiptKind,
  protocol: string,
  author: string,
  date: string,
  position: number,
  summary: string,
): SubmissionReceipt {
  return { id: `${protocol}-${kind}-${position + 1}`, kind, protocol, author, date, summary };
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
  receipts: SubmissionReceipt[];
}

// TODO(P-019): assumido 1 coleta = 1 objeto, por órgão (pendência aberta na STC).
export interface Collection {
  id: string;
  cycleId: string;
  objectCode: string;
  objectName: string;
  kind: ObjectKind;
  ugId: string;
  linkToken: string; // hash do link que vai no SEI (L1)
  requiredAttachments: string[];
  // Justificativas "não tenho todos os anexos" — registro de mão única preso à coleta, não é chat.
  attachmentJustifications: SubmissionObservation[];
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

interface CycleReviewEvent {
  id: string;
  type: "enviado" | "alterado" | "ajustes-solicitados" | "reenviado" | "aprovado";
  author: string;
  date: string;
  message: string;
  changes: string[];
}

export interface CycleItem {
  id: string;
  title: string;
  objectCode: string;
  objectName: string;
  objectKind: ObjectKind;
  createdAt: string;
  createdAtIso: string;
  deadline: string;
  status: CycleStatus;
  seiNumber: string;
  ugIds: string[];
  metadataLabels: string[];
  collectionIds: string[];
  requiresFocalPointValidation: boolean; // toggle P2
  requiredAttachments: string[];
  metadataIds: string[];
  creationStatus: CreationReviewStatus;
  creationObservations: string;
  notificationChannel: string;
  lastUpdatedAt: string;
  lastUpdatedBy: string;
  reviewHistory: CycleReviewEvent[];
  spreadsheetStatus: SpreadsheetStatus;
}

interface CycleDraft {
  title: string;
  deadline: string;
  seiNumber: string;
  observations: string;
  notificationChannel: string;
  kind: ObjectKind;
  variableObjectCode: string;
  variableObjectName: string;
  requiredAttachments: string[];
  requiresFocalPointValidation: boolean;
}

interface CycleReviewDraft {
  title: string;
  objectCode: string;
  objectName: string;
  objectKind: ObjectKind;
  deadline: string;
  seiNumber: string;
  ugIds: string[];
  metadataIds: string[];
  requiredAttachments: string[];
  requiresFocalPointValidation: boolean;
  creationObservations: string;
  notificationChannel: string;
}

interface CycleFilters {
  status: "todos" | CycleStatus;
  object: string;
  ug: string;
}

interface DashboardFilters extends CycleFilters {
  date: string;
}

interface HistoryFilters extends CycleFilters {
  dateFrom: string;
  dateTo: string;
}

const transparencyObjects = tesauroObjects as readonly TransparencyObject[];
const canonicalFields = tesauroFields as readonly FieldDefinition[];
const attachmentCatalog = tesauroAttachments as readonly AttachmentDefinition[];

function requiredAttachmentsForObject(object: TransparencyObject): string[] {
  const attachmentIds = new Set(object.attachmentIds ?? []);
  return attachmentCatalog
    .filter((attachment) => attachmentIds.has(attachment.id))
    .map((attachment) => attachment.label);
}

function requiredFieldIdsForObject(
  object: TransparencyObject,
  availableFields: readonly FieldDefinition[] = object.fields,
): string[] {
  const availableIds = new Set(availableFields.map((field) => field.id));
  const sourceFieldIds = new Set(object.fieldIds ?? object.fields.map((field) => field.id));
  const requiredIds = object.requiredFieldIds ?? object.fieldIds ?? object.fields.map((field) => field.id);
  const registryAddedIds = availableFields
    .filter((field) => !sourceFieldIds.has(field.id))
    .map((field) => field.id);

  return Array.from(
    new Set([...requiredIds.filter((fieldId) => availableIds.has(fieldId)), ...registryAddedIds]),
  );
}

function objectByCode(code: string): TransparencyObject {
  return transparencyObjects.find((item) => item.code === code) ?? transparencyObjects[0];
}

// Piloto do MVP: MT-0016 (Estagiário) — objeto FIXO, tabular, mensal (§2 da TAREFA).
const defaultObject = objectByCode("MT-0016");

// Todo objeto persistido no Tesauro ou no Registro é fixo. Objetos variáveis existem apenas
// dentro do ciclo e, por isso, nunca são inferidos pelo texto livre do formato.
function kindFromFormat(_format: string): ObjectKind {
  return "fixo";
}

const seedUgs: Ug[] = [
  {
    id: "seduc",
    acronym: "SEDUC",
    name: "Secretaria de Estado da Educação",
    esfera: "Estadual",
    focalName: "Maria Costa",
    focalEmail: "maria.costa@seduc.ma.gov.br",
    contact: "Ponto focal institucional",
    profile: "Responsável institucional",
  },
  {
    id: "saf",
    acronym: "SAF",
    name: "Secretaria de Administração",
    esfera: "Estadual",
    focalName: "Ricardo Alves",
    focalEmail: "ricardo.alves@saf.ma.gov.br",
    contact: "Coordenação administrativa",
    profile: "Respondente administrativo",
  },
  {
    id: "sinfra",
    acronym: "SINFRA",
    name: "Secretaria de Infraestrutura",
    esfera: "Estadual",
    focalName: "Helena Prado",
    focalEmail: "helena.prado@sinfra.ma.gov.br",
    contact: "Equipe técnica de obras",
    profile: "Respondente técnico",
  },
  {
    id: "sefaz",
    acronym: "SEFAZ",
    name: "Secretaria de Estado da Fazenda",
    esfera: "Estadual",
    focalName: "Bruno Sales",
    focalEmail: "bruno.sales@sefaz.ma.gov.br",
    contact: "Ouvidoria / TI interna",
    profile: "Respondente técnico",
  },
  {
    id: "stc",
    acronym: "STC",
    name: "Secretaria da Transparência e Controle",
    esfera: "Estadual",
    focalName: "Equipe STC",
    focalEmail: "coleta@stc.ma.gov.br",
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
    collectionIds: ["col-100-seduc", "col-demo-variable-seduc"],
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

const seedCycles: CycleItem[] = ([
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
    objectKind: "fixo",
    createdAt: "04 jul. 2026",
    deadline: "2026-07-18",
    status: "aguardando-analise-stc",
    seiNumber: "2026.000418/STC",
    ugIds: ["sinfra"],
    metadataLabels: objectMt0018.fields.map((field) => field.label),
    collectionIds: ["col-101-sinfra"],
    requiresFocalPointValidation: false,
    requiredAttachments: ["Edital em PDF", "Publicação do aviso"],
  },
  {
    id: "ciclo-demo-variable",
    title: "Coleta VAR-0000 - Demonstração variável",
    objectCode: "VAR-0000",
    objectName: "Demonstração variável",
    objectKind: "variavel",
    createdAt: "06 jul. 2026",
    deadline: "2026-07-20",
    status: "ativo",
    seiNumber: "2026.000400/STC",
    ugIds: ["seduc"],
    metadataLabels: [canonicalFields[0].label],
    collectionIds: ["col-demo-variable-seduc"],
    requiresFocalPointValidation: false,
    requiredAttachments: [],
  },
  {
    id: "ciclo-102",
    title: `Coleta ${objectMt0030.code} - ${titleCase(objectMt0030.name)}`,
    objectCode: objectMt0030.code,
    objectName: titleCase(objectMt0030.name),
    objectKind: "fixo",
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
    objectKind: "fixo",
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
    objectKind: "fixo",
    createdAt: "26 jun. 2026",
    deadline: "2026-07-08",
    status: "aguardando-analise-stc",
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
    ugIds: ["saf", "seduc"],
    metadataLabels: objectMt0015.fields.map((field) => field.label),
    collectionIds: ["col-105-saf", "col-105-seduc"],
    requiresFocalPointValidation: false,
    requiredAttachments: [],
  },
] as Array<
  Omit<
    CycleItem,
    | "metadataIds"
    | "creationStatus"
    | "creationObservations"
    | "notificationChannel"
    | "lastUpdatedAt"
    | "lastUpdatedBy"
    | "reviewHistory"
    | "createdAtIso"
    | "spreadsheetStatus"
  >
>).map((cycle) => ({
  ...cycle,
  metadataIds: (cycle.objectKind === "variavel" ? canonicalFields : objectByCode(cycle.objectCode).fields)
    .filter((field) => cycle.metadataLabels.includes(field.label))
    .map((field) => field.id),
  creationStatus: "aprovado",
  creationObservations: "",
  notificationChannel: "Email",
  lastUpdatedAt: cycle.createdAt,
  lastUpdatedBy: "Equipe STC",
  reviewHistory: [],
  createdAtIso: {
    "ciclo-100": "2026-07-07T12:00:00.000Z",
    "ciclo-101": "2026-07-04T12:00:00.000Z",
    "ciclo-demo-variable": "2026-07-06T12:00:00.000Z",
    "ciclo-102": "2026-06-28T12:00:00.000Z",
    "ciclo-103": "2026-06-12T12:00:00.000Z",
    "ciclo-104": "2026-06-26T12:00:00.000Z",
    "ciclo-105": "2026-06-16T12:00:00.000Z",
  }[cycle.id] ?? "2026-01-01T12:00:00.000Z",
  spreadsheetStatus: cycle.objectKind === "variavel" ? "generated" : "fixed-template-pending",
}));

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
    attachmentJustifications: [],
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
    attachmentJustifications: [],
    submissions: [],
  },
  {
    id: "col-demo-variable-seduc",
    cycleId: "ciclo-demo-variable",
    objectCode: "VAR-0000",
    objectName: "Demonstração variável",
    kind: "variavel",
    ugId: "seduc",
    linkToken: "agz-demo-variable-seduc",
    requiredAttachments: [],
    attachmentJustifications: [],
    submissions: [],
  },
  {
    id: "col-101-sinfra",
    cycleId: "ciclo-101",
    objectCode: objectMt0018.code,
    objectName: titleCase(objectMt0018.name),
    kind: "fixo",
    ugId: "sinfra",
    linkToken: "agz-101-sinfra",
    requiredAttachments: ["Edital em PDF", "Publicação do aviso"],
    attachmentJustifications: [],
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
        receipts: [
          createReceipt(
            "envio",
            "AG-2026-00032",
            "Clara Nunes",
            "08 jul. 2026",
            0,
            "Planilha e anexos enviados pela plataforma.",
          ),
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
        receipts: [
          createReceipt(
            "envio",
            "AG-2026-00033",
            "Otávio Ramos",
            "09 jul. 2026",
            0,
            "Planilha e anexos enviados pela plataforma.",
          ),
        ],
      },
    ],
  },
  {
    id: "col-102-sefaz",
    cycleId: "ciclo-102",
    objectCode: objectMt0030.code,
    objectName: titleCase(objectMt0030.name),
    kind: "fixo",
    ugId: "sefaz",
    linkToken: "agz-102-sefaz",
    requiredAttachments: ["Relatório consolidado em PDF"],
    attachmentJustifications: [],
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
        receipts: [
          createReceipt(
            "envio",
            "AG-2026-00019",
            "Paulo Sena",
            "02 jul. 2026",
            0,
            "Planilha e anexos enviados pela plataforma.",
          ),
          createReceipt(
            "rejeicao",
            "AG-2026-00019",
            "Equipe STC",
            "03 jul. 2026",
            1,
            "Período de referência divergente; correção solicitada.",
          ),
        ],
      },
    ],
  },
  {
    id: "col-103-sinfra",
    cycleId: "ciclo-103",
    objectCode: objectMt0012.code,
    objectName: titleCase(objectMt0012.name),
    kind: "fixo",
    ugId: "sinfra",
    linkToken: "agz-103-sinfra",
    requiredAttachments: ["Relatório fotográfico"],
    attachmentJustifications: [],
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
        receipts: [
          createReceipt(
            "envio",
            "AG-2026-00011",
            "Clara Nunes",
            "22 jun. 2026",
            0,
            "Planilha e anexos enviados pela plataforma.",
          ),
          createReceipt(
            "fechamento",
            "AG-2026-00011",
            "Equipe STC",
            "24 jun. 2026",
            1,
            "Resposta aprovada. Coleta fechada.",
          ),
        ],
      },
    ],
  },
  {
    id: "col-104-sefaz",
    cycleId: "ciclo-104",
    objectCode: objectMt0040.code,
    objectName: titleCase(objectMt0040.name),
    kind: "fixo",
    ugId: "sefaz",
    linkToken: "agz-104-sefaz",
    requiredAttachments: [],
    attachmentJustifications: [],
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
        receipts: [
          createReceipt(
            "envio",
            "AG-2026-00027",
            "Paulo Sena",
            "05 jul. 2026",
            0,
            "Resposta negativa registrada na plataforma.",
          ),
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
    attachmentJustifications: [],
    submissions: [],
  },
  {
    id: "col-105-seduc",
    cycleId: "ciclo-105",
    objectCode: objectMt0015.code,
    objectName: titleCase(objectMt0015.name),
    kind: "fixo",
    ugId: "seduc",
    linkToken: "agz-105-seduc",
    requiredAttachments: [],
    attachmentJustifications: [],
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

function isPastDeadline(deadline: string) {
  return deadline < todayIso;
}

// §1.3: o prazo aparece com contexto ("vence em 3 dias"), não só a data seca.
function deadlineContext(deadline: string): string {
  const diff = Math.round(
    (new Date(`${deadline}T12:00:00`).getTime() - new Date(`${todayIso}T12:00:00`).getTime()) / 86400000,
  );
  if (diff > 1) return `vence em ${diff} dias`;
  if (diff === 1) return "vence amanhã";
  if (diff === 0) return "vence hoje";
  if (diff === -1) return "venceu ontem";
  return `venceu há ${Math.abs(diff)} dias`;
}

function draftForObject(object: TransparencyObject): CycleDraft {
  return {
    title: `Ciclo ${object.code} - ${titleCase(object.name)}`,
    // TODO(P-009): prazos-padrão e datas fixas por objeto ainda em aberto; campo livre.
    deadline: "2026-07-25",
    seiNumber: "2026.000452/STC",
    observations:
      "Pedido formal registrado no SEI. O link da coleta segue anexado ao processo; a resposta deve ser enviada pela plataforma até o prazo indicado.",
    notificationChannel: "Email",
    kind: "fixo",
    variableObjectCode: "",
    variableObjectName: "",
    requiredAttachments: requiredAttachmentsForObject(object),
    requiresFocalPointValidation: false,
  };
}

function draftForVariable(code: string): CycleDraft {
  return {
    ...draftForObject(defaultObject),
    title: "",
    kind: "variavel",
    variableObjectCode: code,
    variableObjectName: "",
    requiredAttachments: [],
  };
}

function nextVariableCode(cycles: CycleItem[]): string {
  const nextNumber =
    cycles.reduce((highest, cycle) => {
      const match = /^VAR-(\d{4})$/.exec(cycle.objectCode);
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0) + 1;
  return `VAR-${String(nextNumber).padStart(4, "0")}`;
}

export function statusAfterRespondentSend(requiresFocal: boolean, isNegative: boolean): SubmissionStatus {
  if (requiresFocal) return "aguardando-ponto-focal";
  return isNegative ? "resposta-negativa" : "enviado";
}

export function statusAfterFocal(isNegative: boolean): SubmissionStatus {
  return isNegative ? "resposta-negativa" : "enviado";
}

export function deriveCycleStatus(cycle: CycleItem, collections: Collection[]): CycleStatus {
  const expectedCollectionIds = new Set(cycle.collectionIds);
  const cycleCollections = collections.filter(
    (item) => item.cycleId === cycle.id && expectedCollectionIds.has(item.id),
  );
  const sentByCollection = cycleCollections.map((item) =>
    item.submissions.filter((submission) => submission.status !== "rascunho"),
  );
  const sent = sentByCollection.flat();
  if (sent.some((item) => item.status === "reaberto")) return "correcao";
  if (sent.some((item) => item.status === "aguardando-ponto-focal")) return "aguardando-ponto-focal";
  const everyCollectionFinished =
    expectedCollectionIds.size > 0 &&
    cycleCollections.length === expectedCollectionIds.size &&
    sentByCollection.every(
      (submissions) => submissions.length > 0 && submissions.every((item) => item.status === "aprovado"),
    );
  if (everyCollectionFinished) return "finalizado";
  if (sent.length) return "aguardando-analise-stc";
  return isPastDeadline(cycle.deadline) ? "nao-enviado-no-prazo" : "ativo";
}

function collectionLink(collection: Collection) {
  return `agiliza.ma.gov.br/coleta/${collection.linkToken}`;
}

// §1.3: situação derivada POR COLETA, para o cartão do painel mostrar o andamento sem clique.
type CollectionSituation = "pendente" | "aguardando-focal" | "aguardando-analise" | "correcao" | "concluida";

function collectionSituation(collection: Collection): CollectionSituation {
  const sent = collection.submissions.filter((item) => item.status !== "rascunho");
  if (!sent.length) return "pendente";
  if (sent.some((item) => item.status === "reaberto")) return "correcao";
  if (sent.some((item) => item.status === "aguardando-ponto-focal")) return "aguardando-focal";
  if (sent.every((item) => item.status === "aprovado")) return "concluida";
  return "aguardando-analise";
}

const situationLabels: Record<CollectionSituation, string> = {
  pendente: "pendente",
  "aguardando-focal": "no ponto focal",
  "aguardando-analise": "aguardando análise",
  correcao: "em correção",
  concluida: "concluída",
};

function cycleBreakdown(cycleCollections: Collection[]): string {
  const counts = new Map<string, number>();
  cycleCollections.forEach((collection) => {
    const label = situationLabels[collectionSituation(collection)];
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });
  return [...counts.entries()].map(([label, count]) => `${count} ${label}`).join(" · ");
}

// §3: data de fechamento derivada da última observação das respostas aprovadas (protótipo sem backend).
function cycleClosedAt(cycle: CycleItem, collections: Collection[]): string {
  if (cycle.status !== "finalizado") return "—";
  const dates = collections
    .filter((item) => item.cycleId === cycle.id)
    .flatMap((item) => item.submissions)
    .filter((item) => item.status === "aprovado")
    .map((item) => item.observations[item.observations.length - 1]?.date ?? item.submittedAt);
  return dates[dates.length - 1] ?? "—";
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

function StatusFilter({
  value,
  onChange,
}: {
  value: CycleFilters["status"];
  onChange: (value: CycleFilters["status"]) => void;
}) {
  const options: Array<
    [CycleFilters["status"], string, Tone, Parameters<typeof Icon>[0]["name"]]
  > = [
    ["todos", "Todos", "neutral", "filter"],
    ["ativo", "Ativo", "info", "send"],
    ["aguardando-ponto-focal", "Aguardando ponto focal", "warning", "users"],
    ["aguardando-analise-stc", "Aguardando análise da STC", "warning", "clipboard"],
    ["correcao", "Aguardando correção", "orange", "refresh"],
    ["finalizado", "Finalizado", "success", "check"],
    ["nao-enviado-no-prazo", "Não enviado no prazo", "danger", "x"],
  ];

  return (
    <div className="status-filter-field">
      <span className="status-filter-label">Status</span>
      <div className="status-filter" role="group" aria-label="Status">
        {options.map(([id, label, tone, icon]) => {
          const selected = value === id;
          return (
            <button
              key={id}
              type="button"
              className={`status-choice ${tone}${selected ? " selected" : ""}`}
              aria-pressed={selected}
              onClick={() => onChange(id)}
            >
              <Icon name={icon} size={14} />
              <span>{label}</span>
              {selected ? (
                <span className="status-choice-selected" aria-hidden="true">
                  <Icon name="check" size={12} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
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
    "aguardando-ponto-focal": "Aguardando ponto focal",
    "aguardando-analise-stc": "Aguardando análise da STC",
    correcao: scope === "orgao" ? "Devolvida para correção" : "Aguardando correção",
    finalizado: "Finalizado",
    "nao-enviado-no-prazo": "Não enviado no prazo",
  };
  return labels[status];
}

function cycleTone(status: CycleStatus): Tone {
  // §1.2: verde = terminou · amarelo = alguém precisa agir · vermelho = furou o prazo.
  const tones: Record<CycleStatus, Tone> = {
    ativo: "info",
    "aguardando-ponto-focal": "warning",
    "aguardando-analise-stc": "warning",
    correcao: "orange",
    finalizado: "success",
    "nao-enviado-no-prazo": "danger",
  };
  return tones[status];
}

function cycleStatusHelp(cycle: CycleItem): string {
  if (cycle.status === "ativo") return "Coleta aberta: aguardando envios pela plataforma.";
  if (cycle.status === "aguardando-ponto-focal") return "Há respostas aguardando validação do ponto focal.";
  if (cycle.status === "aguardando-analise-stc") return "Há respostas novas aguardando análise da STC.";
  if (cycle.status === "correcao") return "Envio devolvido para correção da UG.";
  if (cycle.status === "nao-enviado-no-prazo")
    return "Prazo encerrado sem envio — estado distinto de resposta negativa.";
  return "Respostas aprovadas e comprovantes emitidos.";
}

function kindLabel(kind: ObjectKind): string {
  return kind === "fixo" ? "Objeto fixo" : "Objeto variável";
}

const creationStatusLabels: Record<CreationReviewStatus, string> = {
  "aguardando-analise": "Aguardando análise da criação",
  "ajustes-solicitados": "Ajustes solicitados",
  aprovado: "Aprovado",
};

function reviewDraftFromCycle(cycle: CycleItem): CycleReviewDraft {
  return {
    title: cycle.title,
    objectCode: cycle.objectCode,
    objectName: cycle.objectName,
    objectKind: cycle.objectKind,
    deadline: cycle.deadline,
    seiNumber: cycle.seiNumber,
    ugIds: [...cycle.ugIds],
    metadataIds: [...cycle.metadataIds],
    requiredAttachments: [...cycle.requiredAttachments],
    requiresFocalPointValidation: cycle.requiresFocalPointValidation,
    creationObservations: cycle.creationObservations,
    notificationChannel: cycle.notificationChannel,
  };
}

function describeReviewChanges(cycle: CycleItem, draft: CycleReviewDraft): string[] {
  const changes: string[] = [];
  if (cycle.title !== draft.title) changes.push(`Título: "${cycle.title}" → "${draft.title}"`);
  if (cycle.objectCode !== draft.objectCode)
    changes.push(`Objeto: "${cycle.objectCode}" → "${draft.objectCode}"`);
  if (cycle.deadline !== draft.deadline) changes.push(`Prazo: "${cycle.deadline}" → "${draft.deadline}"`);
  if (cycle.seiNumber !== draft.seiNumber)
    changes.push(`Número SEI: "${cycle.seiNumber || "não informado"}" → "${draft.seiNumber || "não informado"}"`);
  if (cycle.ugIds.join("|") !== draft.ugIds.join("|"))
    changes.push(`UGs: "${cycle.ugIds.join(", ")}" → "${draft.ugIds.join(", ")}"`);
  if (cycle.metadataIds.join("|") !== draft.metadataIds.join("|"))
    changes.push(
      `Campos obrigatórios: "${cycle.metadataIds.join(", ") || "nenhum"}" → "${draft.metadataIds.join(", ") || "nenhum"}"`,
    );
  if (cycle.requiredAttachments.join("|") !== draft.requiredAttachments.join("|"))
    changes.push(
      `Anexos obrigatórios: "${cycle.requiredAttachments.join(", ") || "nenhum"}" → "${draft.requiredAttachments.join(", ") || "nenhum"}"`,
    );
  if (cycle.requiresFocalPointValidation !== draft.requiresFocalPointValidation)
    changes.push(
      `Validação do ponto focal: ${cycle.requiresFocalPointValidation ? "Sim" : "Não"} → ${draft.requiresFocalPointValidation ? "Sim" : "Não"}`,
    );
  if (cycle.notificationChannel !== draft.notificationChannel)
    changes.push(`Canal: "${cycle.notificationChannel}" → "${draft.notificationChannel}"`);
  if (cycle.creationObservations !== draft.creationObservations)
    changes.push(`Observações: "${cycle.creationObservations}" → "${draft.creationObservations}"`);
  return changes;
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
  const avatar =
    role === "ponto-focal"
      ? "M"
      : role === "respondente"
        ? respondentInitial
        : role === "stc-analista"
          ? "A"
          : "E";
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
            className={role === "stc-analista" ? "active" : ""}
            onClick={() => setRole("stc-analista")}
          >
            Analista STC
          </button>
          <button
            type="button"
            className={role === "stc-especialista" ? "active" : ""}
            onClick={() => setRole("stc-especialista")}
          >
            Especialista STC
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
  ugList,
  open,
  onClose,
}: {
  role: Role;
  respondent: Respondent | null;
  ugList: Ug[];
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
        : role === "stc-analista"
          ? { avatar: "A", name: "Analista STC", detail: "Criação e acompanhamento de ciclos" }
          : { avatar: "E", name: "Especialista STC", detail: "Aprovação e acompanhamento" };

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
              <strong>Vê o acionamento inteiro do órgão</strong>
              <p>Acompanha todas as coletas e submissões, pode responder ou apenas monitorar.</p>
            </div>
            <div className="drawer-section">
              <span>Validação</span>
              <strong>Dá ciência quando a coleta exige</strong>
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
                  ? `${ugList.find((ug) => ug.id === respondent.ugId)?.acronym ?? respondent.ugId} · ${respondent.role || "Respondente técnico"}`
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
              <p>O respondente técnico não vê o conceito de acionamento — só as coletas em que foi adicionado.</p>
            </div>
            <div className="drawer-section">
              <span>Acesso</span>
              <strong>{respondent ? respondent.email : "E-mail + senha após o 1º acesso"}</strong>
              <p>{respondent?.emailVerified ? "E-mail verificado." : "Validação por e-mail pendente."}</p>
            </div>
          </>
        ) : null}

        {isStcRole(role) ? (
          <>
            <div className="drawer-section">
              <span>Unidade</span>
              <strong>STC</strong>
              <p>Secretaria da Transparência e Controle</p>
            </div>
            <div className="drawer-section">
              <span>Função</span>
              <strong>
                {role === "stc-analista"
                  ? "Cria e configura ciclos"
                  : "Analisa e aprova a criação dos ciclos"}
              </strong>
              <p>
                {role === "stc-analista"
                  ? "Define objeto, campos, anexos obrigatórios e o toggle de validação do ponto focal."
                  : "Confere UGs, campos, anexos e configurações antes do envio às unidades gestoras."}
              </p>
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
  if (!isStcRole(role)) return null;

  const items: Array<{ id: View; label: string; icon: Parameters<typeof Icon>[0]["name"] }> = [
    { id: "stc-home", label: "Painel STC", icon: "home" },
    { id: "stc-history", label: "Histórico", icon: "clock" },
    { id: "stc-registry", label: "Registro", icon: "users" },
  ];
  const operationalViews: View[] = [
    "stc-home",
    "stc-create",
    "stc-creation-review",
    "stc-dashboard",
    "stc-cycle-detail",
    "stc-validation",
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-card">
        <span>Visão atual</span>
        <strong>{role === "stc-analista" ? "Analista STC" : "Especialista STC"}</strong>
        <small>
          {role === "stc-analista" ? "Criação e acompanhamento" : "Aprovação e acompanhamento"}
        </small>
      </div>
      <nav aria-label="Navegação STC">
        {items.map((item) => {
          const active =
            view === item.id || (item.id === "stc-home" && operationalViews.includes(view));
          return (
            <button
              key={item.id}
              type="button"
              className={active ? "active" : ""}
              aria-current={active ? "page" : undefined}
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
          A STC cria o acionamento e gera o link de cada coleta anexado ao SEI. O respondente técnico envia a
          planilha preenchida e os anexos; o ponto focal valida quando exigido; a STC verifica e
          emite o comprovante.
        </p>
        <div className="login-actions">
          <button type="button" className="primary-button ripple-button" onClick={() => enter("ponto-focal")}>
            <Icon name="users" />
            Entrar como ponto focal
          </button>
          <button type="button" className="secondary-button" onClick={() => enter("respondente")}>
            <Icon name="lock" />
            Entrar como respondente
          </button>
          <button type="button" className="secondary-button" onClick={() => enter("stc-analista")}>
            <Icon name="edit" />
            Entrar como Analista STC
          </button>
          <button type="button" className="secondary-button" onClick={() => enter("stc-especialista")}>
            <Icon name="clipboard" />
            Entrar como Especialista STC
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
          <span>modelo fixo vinculado por código ou planilha variável gerada dos campos escolhidos</span>
        </div>
        <div className="preview-card compact dark">
          <strong>Estados próprios</strong>
          <span>resposta negativa ≠ não enviado no prazo</span>
        </div>
      </section>
    </div>
  );
}

function ReceiptTimeline({
  submission,
  seiNumber,
  compact = false,
}: {
  submission: Submission;
  seiNumber: string;
  compact?: boolean;
}) {
  const labels: Record<ReceiptKind, string> = {
    envio: "Comprovante de envio",
    rejeicao: "Comprovante de rejeição",
    fechamento: "Comprovante de fechamento",
  };
  const icons: Record<ReceiptKind, "send" | "x" | "check"> = {
    envio: "send",
    rejeicao: "x",
    fechamento: "check",
  };
  const sendReceipts = submission.receipts.filter((receipt) => receipt.kind === "envio");
  const primarySendId = sendReceipts[sendReceipts.length - 1]?.id;

  if (!submission.receipts.length) return null;

  return (
    <section
      className={compact ? "receipt-timeline compact-receipt" : "card receipt-timeline"}
      aria-label="Histórico de comprovantes"
    >
      <div className="receipt-timeline-heading">
        <span className="eyebrow">Histórico de comprovantes</span>
        <small>{submission.receipts.length} evento(s) registrado(s)</small>
      </div>

      <div className="receipt-timeline-list" role="list">
        {submission.receipts.map((receipt) => {
          const isPrimarySend = receipt.kind === "envio" && receipt.id === primarySendId;
          return (
            <article
              key={receipt.id}
              className={`receipt-card receipt-${receipt.kind}${isPrimarySend ? " receipt-primary" : ""}`}
              role="listitem"
            >
              <div className="receipt-event-head">
                <span className="receipt-event-icon">
                  <Icon name={icons[receipt.kind]} size={17} />
                </span>
                <div>
                  <span className="eyebrow">{labels[receipt.kind]}</span>
                  <strong>{receipt.protocol}</strong>
                  <small>
                    {receipt.date} · {receipt.author}
                  </small>
                </div>
              </div>
              <p>{receipt.summary}</p>

              {isPrimarySend ? (
                <div className="receipt-grid">
                  <div>
                    <span>Arquivo</span>
                    <strong>{submission.fileName || "Sem arquivo (negativa)"}</strong>
                  </div>
                  <div>
                    <span>Enviado em</span>
                    <strong>{receipt.date}</strong>
                  </div>
                  <div>
                    <span>Enviado por</span>
                    <strong>{receipt.author || "—"}</strong>
                  </div>
                  <div>
                    <span>Anexos</span>
                    <strong>{submission.attachments.length} arquivo(s)</strong>
                  </div>
                  <div>
                    <span>SEI</span>
                    <strong>{seiNumber || "—"}</strong>
                  </div>
                  <div>
                    <span>Status atual</span>
                    <strong>{submissionLabel(submission.status)}</strong>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
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
                Anexos: {submission.attachments.length} enviados / {requiredAttachments.length} exigidos
              </span>
            ) : (
              <span>Sem anexos obrigatórios nesta coleta</span>
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

function StcHome({ role, setView }: { role: StcRole; setView: (view: View) => void }) {
  const primaryAction =
    role === "stc-analista"
      ? {
          title: "Criar Ciclo",
          description: "Configure objeto, UGs, campos e anexos antes de enviar para análise.",
          icon: "edit" as const,
          view: "stc-create" as const,
        }
      : {
          title: "Aprovar Ciclo",
          description: "Confira, ajuste e aprove os ciclos preparados pelos analistas.",
          icon: "clipboard" as const,
          view: "stc-creation-review" as const,
        };
  const actions = [
    primaryAction,
    {
      title: "Acompanhar ciclos",
      description: "Veja todos os ciclos e acompanhe o andamento das coletas por UG.",
      icon: "eye" as const,
      view: "stc-dashboard" as const,
    },
  ];

  return (
    <div className="workflow-page wide-page stc-home-page">
      <SectionHeader
        eyebrow={role === "stc-analista" ? "Analista STC" : "Especialista STC"}
        title="Painel STC"
        description="Escolha uma área para continuar. Histórico e Registro permanecem disponíveis no menu lateral."
      />

      <div className="stc-home-actions" aria-label="Ações do perfil STC">
        {actions.map((action) => (
          <button
            key={action.title}
            type="button"
            className="card stc-home-action"
            onClick={() => setView(action.view)}
          >
            <span className="stc-home-action-icon">
              <Icon name={action.icon} size={30} />
            </span>
            <span className="stc-home-action-copy">
              <strong>{action.title}</strong>
              <span>{action.description}</span>
            </span>
            <Icon name="arrow" size={20} />
          </button>
        ))}
      </div>
    </div>
  );
}

function StcDashboard({
  role,
  cycles,
  collections,
  ugList,
  copyLink,
  openDetail,
  openValidation,
  openCreation,
  updateSei,
}: {
  role: StcRole;
  cycles: CycleItem[];
  collections: Collection[];
  ugList: Ug[];
  copyLink: (collection: Collection) => Promise<void>;
  openDetail: (cycleId: string) => void;
  openValidation: (cycleId: string) => void;
  openCreation: (cycleId: string) => void;
  updateSei: (cycleId: string, value: string) => void;
}) {
  const [filters, setFilters] = useState<DashboardFilters>({
    status: "todos",
    object: "todos",
    ug: "todos",
    date: "",
  });

  const filteredCycles = cycles.filter((cycle) => {
    const statusMatch =
      filters.status === "todos" ||
      (cycle.creationStatus === "aprovado" && cycle.status === filters.status);
    const objectMatch = filters.object === "todos" || cycle.objectCode === filters.object;
    const ugMatch = filters.ug === "todos" || cycle.ugIds.includes(filters.ug);
    const dateMatch = !filters.date || cycle.deadline === filters.date || cycle.createdAt.includes(filters.date);
    return statusMatch && objectMatch && ugMatch && dateMatch;
  });

  const objectOptions = [...new Set(cycles.map((cycle) => cycle.objectCode))];

  const operationalCycles = cycles.filter((cycle) => cycle.creationStatus === "aprovado");
  // §1.2: a mesma paleta dos status vale para os KPIs — amarelo/laranja = alguém precisa agir.
  const metrics = [
    ["Coletas ativas", operationalCycles.filter((cycle) => cycle.status === "ativo").length, "Aguardando envios das UGs", "info"] as const,
    [
      "Aguardando ponto focal",
      operationalCycles.filter((cycle) => cycle.status === "aguardando-ponto-focal").length,
      "Respostas para validação do órgão",
      "warning",
    ] as const,
    [
      "Aguardando análise da STC",
      operationalCycles.filter((cycle) => cycle.status === "aguardando-analise-stc").length,
      "Respostas novas para conferir",
      "warning",
    ] as const,
    [
      "Aguardando correção",
      operationalCycles.filter((cycle) => cycle.status === "correcao").length,
      "Devolvidas para a UG corrigir",
      "orange",
    ] as const,
    [
      "Não enviadas no prazo",
      operationalCycles.filter((cycle) => cycle.status === "nao-enviado-no-prazo").length,
      "Prazo venceu sem resposta",
      "danger",
    ] as const,
  ];

  return (
    <div className="workflow-page wide-page stc-dashboard-page">
      <SectionHeader
        eyebrow="Acompanhamento STC"
        title="Ciclos"
        description="Acompanhe ciclos em revisão e, depois da aprovação, o andamento de cada coleta por UG."
      />

      <div className="metrics-grid dashboard-metrics">
        {metrics.map(([label, value, hint, tone]) => (
          <MetricCard
            key={label}
            icon={tone === "orange" ? "refresh" : tone === "danger" ? "x" : tone === "warning" ? "clock" : "clipboard"}
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
          <h3>Encontrar ciclo por status operacional, objeto, UG ou data</h3>
        </div>
        <div className="filters-grid">
          <StatusFilter
            value={filters.status}
            onChange={(status) => setFilters({ ...filters, status })}
          />
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
              {ugList.filter((ug) => ug.id !== "stc").map((ug) => (
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
            <h3>Lista de acompanhamento</h3>
          </div>
        </div>

        <div className="cycle-list stc-cycle-list">
          {!filteredCycles.length ? (
            <div className="empty-state filtered-empty-state">
              <Icon name="filter" size={28} />
              <strong>Nenhum ciclo combina com estes filtros</strong>
              <span>Limpe um filtro para voltar à lista completa.</span>
            </div>
          ) : null}
          {filteredCycles.map((cycle) =>
            cycle.creationStatus !== "aprovado" ? (
              <article key={cycle.id} className="cycle-row-card stc-cycle-row creation-pending-card">
                <div className="cycle-row-main">
                  <div>
                    <strong>{cycle.title}</strong>
                    <span>
                      {cycle.objectCode} · {kindLabel(cycle.objectKind)} · {cycle.ugIds.length} UG(s)
                    </span>
                  </div>
                  <StatusPill tone={cycle.creationStatus === "ajustes-solicitados" ? "orange" : "warning"}>
                    {creationStatusLabels[cycle.creationStatus]}
                  </StatusPill>
                </div>
                <div className="creation-pending-summary">
                  <Icon name="lock" />
                  <div>
                    <strong>Ainda não enviado às UGs</strong>
                    <span>Coletas e links serão gerados somente após a aprovação do especialista.</span>
                  </div>
                </div>
                <div className="cycle-meta-grid creation-update-meta">
                  <span>Última atualização: {cycle.lastUpdatedAt}</span>
                  <span>Responsável: {cycle.lastUpdatedBy}</span>
                </div>
                {cycle.reviewHistory
                  .filter((event) => event.type === "ajustes-solicitados")
                  .slice(-1)
                  .map((event) => (
                    <div className="alert" key={event.id}>
                      <Icon name="bell" />
                      <div>
                        <strong>Observação do especialista</strong>
                        <span>{event.message}</span>
                      </div>
                    </div>
                  ))}
                <div className="card-actions compact">
                  <button type="button" className="primary-button" onClick={() => openCreation(cycle.id)}>
                    <Icon name={role === "stc-analista" ? "edit" : "clipboard"} />
                    {role === "stc-analista"
                      ? cycle.creationStatus === "ajustes-solicitados"
                        ? "Revisar ajustes"
                        : "Editar ciclo"
                      : "Analisar criação"}
                  </button>
                </div>
              </article>
            ) : (
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

              {(() => {
                const cols = collections.filter((item) => item.cycleId === cycle.id);
                const responded = cols.filter((col) =>
                  col.submissions.some((sub) => sub.status !== "rascunho"),
                ).length;
                const late = isPastDeadline(cycle.deadline) && cycle.status !== "finalizado";
                return (
                  <>
                    <div className="cycle-progress">
                      <div className="cycle-progress-head">
                        <strong>
                          {responded} de {cols.length} respostas recebidas
                        </strong>
                        <span className={late ? "deadline-late" : "deadline-hint"}>
                          prazo {cycle.deadline} · {deadlineContext(cycle.deadline)}
                        </span>
                      </div>
                      <div
                        className="progress-track"
                        role="img"
                        aria-label={`${responded} de ${cols.length} respostas recebidas`}
                      >
                        <div
                          className="progress-fill"
                          style={{ width: cols.length ? `${(responded / cols.length) * 100}%` : "0%" }}
                        />
                      </div>
                      <small>{cycleBreakdown(cols)}</small>
                    </div>
                    <div className="cycle-ug-chips">
                      {cols.map((col) => {
                        const ug = ugList.find((item) => item.id === col.ugId);
                        const sent = col.submissions.some((sub) => sub.status !== "rascunho");
                        return (
                          <span key={col.id} className={sent ? "ug-chip responded" : "ug-chip"}>
                            <span className="ug-chip-label">
                              {sent ? <Icon name="check" size={12} /> : null}
                              {ug?.acronym ?? col.ugId}
                            </span>
                            <code className="collection-link-text">
                              {`https://${collectionLink(col)}`}
                            </code>
                            <button
                              type="button"
                              className="chip-link"
                              onClick={() => void copyLink(col)}
                              aria-label={`Copiar link da coleta da ${ug?.acronym ?? col.ugId}`}
                            >
                              <Icon name="link" size={12} />
                              Copiar link
                            </button>
                          </span>
                        );
                      })}
                    </div>
                    <div className="cycle-meta-grid">
                      <span>criada em {cycle.createdAt}</span>
                      <label>
                        Número do SEI
                        <input
                          value={cycle.seiNumber}
                          onChange={(event) => updateSei(cycle.id, event.target.value)}
                        />
                      </label>
                    </div>
                  </>
                );
              })()}

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
            ),
          )}
        </div>
      </section>
    </div>
  );
}

function FieldCatalogPicker({
  fields,
  selectedIds,
  setSelectedIds,
  mode,
  objectFieldIds = [],
  readOnly = false,
  groupLabel,
  searchLabel,
}: {
  fields: readonly FieldDefinition[];
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  mode: ObjectKind;
  objectFieldIds?: readonly string[];
  readOnly?: boolean;
  groupLabel: string;
  searchLabel: string;
}) {
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
  const matchesSearch = (field: FieldDefinition) =>
    !normalizedSearch || field.label.toLocaleLowerCase("pt-BR").includes(normalizedSearch);
  const objectIds = new Set(objectFieldIds);
  const groups =
    mode === "fixo"
      ? [
          { label: "Campos do objeto", fields: fields.filter((field) => objectIds.has(field.id)) },
          {
            label: "Outros campos do Tesauro",
            fields: fields.filter((field) => !objectIds.has(field.id)),
          },
        ]
      : Array.from(
          fields.reduce((byInitial, field) => {
            const initial = field.label.slice(0, 1).toLocaleUpperCase("pt-BR") || "#";
            byInitial.set(initial, [...(byInitial.get(initial) ?? []), field]);
            return byInitial;
          }, new Map<string, FieldDefinition[]>()),
        )
          .sort(([left], [right]) => left.localeCompare(right, "pt-BR"))
          .map(([label, groupedFields]) => ({ label, fields: groupedFields }));

  const toggle = (fieldId: string) => {
    if (readOnly) return;
    setSelectedIds(
      selectedIds.includes(fieldId)
        ? selectedIds.filter((id) => id !== fieldId)
        : [...selectedIds, fieldId],
    );
  };

  return (
    <div className="field-catalog-picker">
      <label className="field-search">
        {searchLabel}
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Digite parte do nome do campo"
        />
      </label>
      <div className="metadata-list field-catalog-list" role="group" aria-label={groupLabel}>
        {groups.map((group) => {
          const visibleFields = group.fields.filter(matchesSearch);
          if (!visibleFields.length && normalizedSearch) return null;
          return (
            <section className="field-catalog-group" key={group.label}>
              <h4>{group.label}</h4>
              {visibleFields.map((field) => {
                const selected = selectedIds.includes(field.id);
                return (
                  <button
                    key={field.id}
                    type="button"
                    disabled={readOnly}
                    aria-pressed={selected}
                    className={selected ? "metadata-row selected" : "metadata-row"}
                    onClick={() => toggle(field.id)}
                  >
                    <span>{selected ? <Icon name="check" size={14} /> : null}</span>
                    <strong>{field.label}</strong>
                    <small>{field.type}</small>
                  </button>
                );
              })}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function AttachmentCatalogPicker({
  options,
  selectedLabels,
  setSelectedLabels,
  readOnly = false,
  groupLabel,
  customInputLabel,
}: {
  options: readonly AttachmentDefinition[];
  selectedLabels: string[];
  setSelectedLabels: (labels: string[]) => void;
  readOnly?: boolean;
  groupLabel: string;
  customInputLabel: string;
}) {
  const [customName, setCustomName] = useState("");
  const optionLabels = new Set(options.map((option) => option.label));
  const customLabels = selectedLabels.filter((label) => !optionLabels.has(label));

  const toggle = (label: string) => {
    if (readOnly) return;
    setSelectedLabels(
      selectedLabels.includes(label)
        ? selectedLabels.filter((item) => item !== label)
        : [...selectedLabels, label],
    );
  };

  const addCustom = () => {
    const normalized = customName.trim();
    if (!normalized || selectedLabels.includes(normalized) || readOnly) return;
    setSelectedLabels([...selectedLabels, normalized]);
    setCustomName("");
  };

  return (
    <div className="attachment-catalog-picker">
      <div className="attachment-options" role="group" aria-label={groupLabel}>
        {options.map((option) => {
          const selected = selectedLabels.includes(option.label);
          return (
            <button
              key={option.id}
              type="button"
              disabled={readOnly}
              aria-pressed={selected}
              className={selected ? "selection-row selected" : "selection-row"}
              onClick={() => toggle(option.label)}
            >
              <span className="check-box">{selected ? <Icon name="check" size={14} /> : null}</span>
              <strong>{option.label}</strong>
            </button>
          );
        })}
      </div>
      {!readOnly ? (
        <div className="attachment-custom-row">
          <label>
            {customInputLabel}
            <input
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
              placeholder="Ex.: Cópia do contrato em PDF"
            />
          </label>
          <button type="button" className="ghost-button" disabled={!customName.trim()} onClick={addCustom}>
            <Icon name="upload" size={14} /> Adicionar anexo personalizado
          </button>
        </div>
      ) : null}
      {customLabels.length ? (
        <div className="attachment-custom-list">
          {customLabels.map((label) => (
            <span key={label}>
              {label}
              {!readOnly ? (
                <button type="button" aria-label={`Remover anexo ${label}`} onClick={() => toggle(label)}>
                  <Icon name="x" size={12} />
                </button>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StcCreateCycle({
  kind,
  onKindChange,
  object,
  objects,
  fieldCatalog,
  attachments,
  ugList,
  onObjectChange,
  selectedUgs,
  setSelectedUgs,
  selectedMetadataIds,
  setSelectedMetadataIds,
  draft,
  setDraft,
  editingCycle,
  onSubmit,
}: {
  kind: ObjectKind | null;
  onKindChange: (kind: ObjectKind) => void;
  object: TransparencyObject | null;
  objects: readonly TransparencyObject[];
  fieldCatalog: readonly FieldDefinition[];
  attachments: readonly AttachmentDefinition[];
  ugList: Ug[];
  onObjectChange: (id: string) => void;
  selectedUgs: string[];
  setSelectedUgs: (ids: string[]) => void;
  selectedMetadataIds: string[];
  setSelectedMetadataIds: (ids: string[]) => void;
  draft: CycleDraft;
  setDraft: (draft: CycleDraft) => void;
  editingCycle: CycleItem | null;
  onSubmit: () => void;
}) {
  const availableUgs = ugList.filter((ug) => ug.id !== "stc");
  const selectedUgRows = selectedUgs
    .map((ugId) => availableUgs.find((ug) => ug.id === ugId))
    .filter((ug): ug is Ug => Boolean(ug));
  const selectedFields = fieldCatalog.filter((field) => selectedMetadataIds.includes(field.id));
  const definedAttachments = draft.requiredAttachments.filter((item) => item.trim().length > 0);
  const configurationReady = kind === "variavel" || Boolean(object);
  const objectIdentityReady =
    kind === "fixo" ? Boolean(object) : Boolean(draft.variableObjectName.trim());
  const effectiveObjectCode = object?.code ?? draft.variableObjectCode;
  const effectiveObjectName = object ? titleCase(object.name) : draft.variableObjectName.trim();
  const canActivate =
    Boolean(kind) &&
    objectIdentityReady &&
    selectedUgRows.length > 0 &&
    selectedFields.length > 0 &&
    draft.title.trim().length > 0 &&
    draft.notificationChannel.trim().length > 0;

  const toggleUg = (ugId: string) => {
    setSelectedUgs(
      selectedUgs.includes(ugId)
        ? selectedUgs.filter((id) => id !== ugId)
        : [...selectedUgs, ugId],
    );
  };

  return (
    <div className="workflow-page wide-page">
      <SectionHeader
        eyebrow={editingCycle ? "Edição do ciclo" : "Criação STC"}
        title={editingCycle ? "Editar ciclo" : "Criar Ciclo"}
        description="Escolha o tipo, o objeto, as UGs e os campos. O ciclo só gera coletas e links depois da aprovação do especialista."
      />

      <div className="create-workspace">
        <section className="card create-card span-12">
          <span className="eyebrow">Passo 1 · Tipo do objeto</span>
          <h3>Escolha o tipo antes do objeto</h3>
          <div className="kind-squares" role="group" aria-label="Tipo do objeto">
            <button
              type="button"
              className={kind === "fixo" ? "kind-square selected" : "kind-square"}
              aria-pressed={kind === "fixo"}
              onClick={() => onKindChange("fixo")}
            >
              <Icon name="file" size={22} />
              <strong>Objeto fixo</strong>
              <span>Recorrente: usa o objeto do Tesauro/Registro; o arquivo do modelo será vinculado pelo código.</span>
            </button>
            <button
              type="button"
              className={kind === "variavel" ? "kind-square selected" : "kind-square"}
              aria-pressed={kind === "variavel"}
              onClick={() => onKindChange("variavel")}
            >
              <Icon name="edit" size={22} />
              <strong>Objeto variável</strong>
              <span>Pontual: a STC escolhe os campos, o sistema gera a planilha e ela digita os anexos.</span>
            </button>
          </div>
        </section>

        {kind === "fixo" ? (
          <section className="card create-card span-5">
            <div className="card-title-line">
              <Icon name="filter" />
              <div>
                <span className="eyebrow">Passo 2 · Objeto</span>
                <h3>Objetos fixos do Tesauro e do Registro</h3>
              </div>
            </div>

            {/* §2.1: sem reordenar — o objeto escolhido fica no lugar, apenas marcado. */}
            <div className="object-scroll">
              {objects.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={
                      object && item.id === object.id
                        ? "tesauro-object-button selected"
                        : "tesauro-object-button"
                    }
                    aria-pressed={Boolean(object && item.id === object.id)}
                    onClick={() => onObjectChange(item.id)}
                  >
                    <span>{item.code}</span>
                    <strong>{titleCase(item.name)}</strong>
                    <small>
                      {item.subject} · {item.cadence}
                    </small>
                  </button>
                ))}
            </div>
          </section>
        ) : kind === "variavel" ? (
          <section className="card create-card span-5">
            <div className="card-title-line">
              <Icon name="edit" />
              <div>
                <span className="eyebrow">Passo 2 · Objeto único</span>
                <h3>Identifique o objeto deste ciclo</h3>
              </div>
            </div>
            <div className="details-form">
              <label className="full-row">
                Nome do objeto
                <input
                  value={draft.variableObjectName}
                  onChange={(event) => setDraft({ ...draft, variableObjectName: event.target.value })}
                  placeholder="Ex.: Levantamento emergencial de contratos"
                />
              </label>
              <div className="full-row inline-note">
                <span>Código automático do objeto</span>
                <strong>{draft.variableObjectCode}</strong>
              </div>
              <p className="muted-text full-row">
                Este objeto pertence somente ao ciclo e não será incluído no Registro.
              </p>
            </div>
          </section>
        ) : (
          <section className="card create-card span-12">
            <div className="empty-state">
              <Icon name="filter" size={28} />
              <strong>Comece pelo tipo</strong>
              <span>Escolha "Objeto fixo" ou "Objeto variável" acima para continuar.</span>
            </div>
          </section>
        )}

        {kind && configurationReady ? (
          <>
        <section className="card create-card span-4">
          <span className="eyebrow">Passo 3 · Destinatários</span>
          <h3>Todas as UGs cadastradas</h3>
          <p className="muted-text">
            As {availableUgs.length} UGs do cadastro aparecem aqui — o Registro cadastra as demais.
            Nenhuma UG é presumida: a STC escolhe explicitamente as destinatárias deste ciclo.
          </p>

          <div className="selection-list" role="group" aria-label="Unidades gestoras do ciclo">
            {availableUgs.map((ug) => {
              const selected = selectedUgs.includes(ug.id);
              return (
                <button
                  key={ug.id}
                  type="button"
                  aria-pressed={selected}
                  className={selected ? "selection-row selected" : "selection-row"}
                  onClick={() => toggleUg(ug.id)}
                >
                  <span className="check-box">{selected ? <Icon name="check" size={14} /> : null}</span>
                  <span>
                    <strong>{ug.acronym}</strong>
                    <small>{ug.name}</small>
                  </span>
                  <em>Editável</em>
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
              ? "Os campos obrigatórios do objeto vêm selecionados; os demais ficam disponíveis."
              : "Escolha no catálogo global os campos da planilha deste ciclo."}
          </p>
          <FieldCatalogPicker
            fields={fieldCatalog}
            selectedIds={selectedMetadataIds}
            setSelectedIds={setSelectedMetadataIds}
            mode={draft.kind}
            objectFieldIds={object?.fields.map((field) => field.id) ?? []}
            groupLabel="Campos obrigatórios do ciclo"
            searchLabel="Buscar campo"
          />
        </section>

        <section className="card create-card span-7">
          <div className="table-header">
            <div>
              <span className="eyebrow">Passo 4 · Configuração do envio</span>
              <h3>Anexos e validação</h3>
            </div>
            <StatusPill tone="info">{kindLabel(draft.kind)}</StatusPill>
          </div>

          <span className="eyebrow">Anexos obrigatórios</span>
          <p className="muted-text">
            {kind === "fixo"
              ? "Selecione apenas os anexos exigidos neste ciclo. As cinco opções vêm do Tesauro. Anexos explicitamente obrigatórios do objeto fixo começam marcados; os demais ficam disponíveis."
              : "Selecione apenas os anexos exigidos neste ciclo. As cinco opções vêm do Tesauro e, no objeto variável, nenhuma começa marcada."} Você também pode adicionar um nome personalizado.
          </p>
          <AttachmentCatalogPicker
            options={attachments}
            selectedLabels={draft.requiredAttachments}
            setSelectedLabels={(requiredAttachments) => setDraft({ ...draft, requiredAttachments })}
            groupLabel="Anexos obrigatórios do ciclo"
            customInputLabel="Nome do anexo personalizado"
          />
          {!definedAttachments.length ? (
            <p className="muted-text">Nenhum anexo obrigatório definido — o contador do upload do respondente ficará em zero.</p>
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
              <input
                value={draft.notificationChannel}
                onChange={(event) => setDraft({ ...draft, notificationChannel: event.target.value })}
              />
            </label>
            <label className="full-row">
              Mensagem final / email padrão
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
              <h3>Ciclo pronto para análise</h3>
              <p>O especialista confere esta configuração antes que cada UG receba sua coleta com link próprio.</p>
            </div>
            <StatusPill tone="info">{kindLabel(draft.kind)}</StatusPill>
          </div>

          <div className="summary-metrics">
            <div>
              <strong>{effectiveObjectCode || "A definir"}</strong>
              <span>{effectiveObjectName || "Informe o nome do objeto"}</span>
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
              <strong>{String(definedAttachments.length)}</strong>
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
            onClick={onSubmit}
          >
            <Icon name="send" />
            {editingCycle
              ? editingCycle.creationStatus === "ajustes-solicitados"
                ? "Reenviar para análise"
                : "Salvar e manter em análise"
              : "Enviar ciclo para análise"}
          </button>
        </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

function StcCreationReview({
  cycles,
  objects,
  ugList,
  fieldCatalog,
  attachments,
  initialCycleId,
  onReview,
}: {
  cycles: CycleItem[];
  objects: readonly TransparencyObject[];
  ugList: Ug[];
  fieldCatalog: readonly FieldDefinition[];
  attachments: readonly AttachmentDefinition[];
  initialCycleId: string;
  onReview: (
    cycleId: string,
    draft: CycleReviewDraft,
    action: "salvar" | "ajustes" | "aprovar",
    message: string,
  ) => void;
}) {
  const reviewCycles = cycles
    .map((cycle, index) => ({ cycle, index }))
    .filter(({ cycle }) => cycle.creationStatus !== undefined)
    .sort(
      (left, right) =>
        left.cycle.createdAtIso.localeCompare(right.cycle.createdAtIso) || left.index - right.index,
    )
    .map(({ cycle }) => cycle);
  const initialCycle = reviewCycles.find((cycle) => cycle.id === initialCycleId);
  const [filter, setFilter] = useState<"todos" | CreationReviewStatus>(
    initialCycle?.creationStatus ?? "aguardando-analise",
  );
  const visibleCycles = reviewCycles.filter((cycle) => filter === "todos" || cycle.creationStatus === filter);
  const [selectedId, setSelectedId] = useState(initialCycle?.id ?? visibleCycles[0]?.id ?? "");
  const selectedCycle = visibleCycles.find((cycle) => cycle.id === selectedId) ?? visibleCycles[0];
  const [reviewDraft, setReviewDraft] = useState<CycleReviewDraft | null>(() =>
    selectedCycle ? reviewDraftFromCycle(selectedCycle) : null,
  );
  const [adjustmentMessage, setAdjustmentMessage] = useState("");
  const [adjustmentError, setAdjustmentError] = useState("");

  useEffect(() => {
    const requestedCycle = reviewCycles.find((cycle) => cycle.id === initialCycleId);
    if (requestedCycle) {
      setFilter(requestedCycle.creationStatus);
      setSelectedId(requestedCycle.id);
    }
  }, [initialCycleId]);

  useEffect(() => {
    if (!selectedCycle) return;
    setReviewDraft(reviewDraftFromCycle(selectedCycle));
    setAdjustmentMessage("");
    setAdjustmentError("");
  }, [selectedCycle?.id, selectedCycle?.lastUpdatedAt, selectedCycle?.creationStatus]);

  const selectCycle = (cycleId: string) => {
    setSelectedId(cycleId);
    const cycle = reviewCycles.find((item) => item.id === cycleId);
    if (cycle) setReviewDraft(reviewDraftFromCycle(cycle));
  };

  const currentObject = reviewDraft
    ? objects.find((object) => object.code === reviewDraft.objectCode) ?? null
    : null;
  const readOnly = selectedCycle?.creationStatus === "aprovado";
  const canApprove = Boolean(
    reviewDraft?.title.trim() &&
      reviewDraft?.objectCode &&
      (reviewDraft.objectKind === "fixo" || reviewDraft.objectName.trim()) &&
      reviewDraft.ugIds.length &&
      reviewDraft.metadataIds.length &&
      reviewDraft.notificationChannel.trim(),
  );

  const requestAdjustments = () => {
    if (!selectedCycle || !reviewDraft) return;
    if (!adjustmentMessage.trim()) {
      setAdjustmentError("Escreva uma observação antes de solicitar ajustes.");
      return;
    }
    onReview(selectedCycle.id, reviewDraft, "ajustes", adjustmentMessage.trim());
    setAdjustmentError("");
  };

  return (
    <div className="workflow-page wide-page creation-review-page">
      <SectionHeader
        eyebrow="Especialista STC"
        title="Aprovar Ciclo"
        description="Confira todos os componentes do ciclo antes que as coletas e os links sejam enviados às UGs."
      />

      <section className="card creation-review-filter">
        <label>
          Status da análise
          <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}>
            <option value="todos">Todos</option>
            <option value="aguardando-analise">Aguardando análise</option>
            <option value="ajustes-solicitados">Ajustes solicitados</option>
            <option value="aprovado">Aprovados</option>
          </select>
        </label>
      </section>

      <div className="creation-review-layout">
        <section className="card creation-review-queue" role="region" aria-label="Fila única de aprovação">
          <span className="eyebrow">Fila de ciclos</span>
          <h3>{visibleCycles.length} ciclo(s)</h3>
          <div className="creation-review-list">
            {visibleCycles.map((cycle) => (
              <button
                key={cycle.id}
                type="button"
                className={cycle.id === selectedCycle?.id ? "selected" : ""}
                aria-pressed={cycle.id === selectedCycle?.id}
                onClick={() => selectCycle(cycle.id)}
                aria-label={`${cycle.creationStatus === "aprovado" ? "Consultar" : "Analisar"} ${cycle.title}`}
              >
                <span>
                  <strong>{cycle.title}</strong>
                  <small>
                    {cycle.objectCode} · {cycle.ugIds.length} UG(s) ·{" "}
                    {cycle.objectKind === "fixo" ? "Tesauro/Registro" : "objeto único deste ciclo"}
                  </small>
                </span>
                <StatusPill tone={cycle.creationStatus === "ajustes-solicitados" ? "orange" : cycle.creationStatus === "aprovado" ? "success" : "warning"}>
                  {creationStatusLabels[cycle.creationStatus]}
                </StatusPill>
              </button>
            ))}
            {!visibleCycles.length ? (
              <div className="empty-state">
                <Icon name="check" size={26} />
                <strong>Nenhum ciclo neste status</strong>
                <span>Altere o filtro para consultar os demais ciclos.</span>
              </div>
            ) : null}
          </div>
        </section>

        {selectedCycle && reviewDraft ? (
          <section className="card creation-review-detail">
            <div className="table-header">
              <div>
                <span className="eyebrow">Configuração completa</span>
                <h3>{selectedCycle.objectCode} · {selectedCycle.objectName}</h3>
              </div>
              <StatusPill tone={readOnly ? "success" : selectedCycle.creationStatus === "ajustes-solicitados" ? "orange" : "warning"}>
                {creationStatusLabels[selectedCycle.creationStatus]}
              </StatusPill>
            </div>
            <p className="muted-text">
              Última atualização em {selectedCycle.lastUpdatedAt}, por {selectedCycle.lastUpdatedBy}.
            </p>
            <p className="muted-text review-origin">
              {reviewDraft.objectKind === "fixo"
                ? "Origem: Tesauro/Registro"
                : "Origem: objeto único deste ciclo"}
            </p>
            {selectedCycle.spreadsheetStatus !== "pending-approval" ? (
              <div className="inline-note spreadsheet-status-note" role="status">
                <Icon name={selectedCycle.spreadsheetStatus === "generated" ? "check" : "clock"} />
                <strong>
                  {selectedCycle.spreadsheetStatus === "generated"
                    ? "Planilha gerada a partir dos campos selecionados"
                    : `Modelo fixo ${selectedCycle.objectCode} pendente de vinculação`}
                </strong>
              </div>
            ) : null}

            <div className="creation-review-form">
              <label className="full-row">
                Título do ciclo em análise
                <input
                  value={reviewDraft.title}
                  disabled={readOnly}
                  onChange={(event) => setReviewDraft({ ...reviewDraft, title: event.target.value })}
                />
              </label>
              {reviewDraft.objectKind === "fixo" ? (
                <label>
                  Objeto fixo
                  <select
                    value={reviewDraft.objectCode}
                    disabled={readOnly}
                    onChange={(event) => {
                      const object = objects.find((item) => item.code === event.target.value);
                      if (!object) return;
                      setReviewDraft({
                        ...reviewDraft,
                        objectCode: object.code,
                        objectName: titleCase(object.name),
                        objectKind: "fixo",
                        metadataIds: requiredFieldIdsForObject(object),
                        requiredAttachments: requiredAttachmentsForObject(object),
                      });
                    }}
                  >
                    {objects.map((object) => (
                      <option key={object.id} value={object.code}>
                        {object.code} · {titleCase(object.name)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <>
                  <label>
                    Nome do objeto
                    <input
                      value={reviewDraft.objectName}
                      disabled={readOnly}
                      onChange={(event) => setReviewDraft({ ...reviewDraft, objectName: event.target.value })}
                    />
                  </label>
                  <div className="inline-note">
                    <span>Código do objeto único</span>
                    <strong>{reviewDraft.objectCode}</strong>
                  </div>
                </>
              )}
              <label>
                Prazo
                <input
                  type="date"
                  value={reviewDraft.deadline}
                  disabled={readOnly}
                  onChange={(event) => setReviewDraft({ ...reviewDraft, deadline: event.target.value })}
                />
              </label>
              <label>
                Número do SEI
                <input
                  value={reviewDraft.seiNumber}
                  disabled={readOnly}
                  onChange={(event) => setReviewDraft({ ...reviewDraft, seiNumber: event.target.value })}
                />
              </label>
              <label>
                Canal de notificação
                <input
                  value={reviewDraft.notificationChannel}
                  disabled={readOnly}
                  onChange={(event) => setReviewDraft({ ...reviewDraft, notificationChannel: event.target.value })}
                />
              </label>
              <label className="full-row">
                Observações da criação
                <textarea
                  value={reviewDraft.creationObservations}
                  disabled={readOnly}
                  onChange={(event) => setReviewDraft({ ...reviewDraft, creationObservations: event.target.value })}
                />
              </label>
            </div>

            <div className="review-section">
              <span className="eyebrow">UGs selecionadas</span>
              <div className="selection-list compact-selection-list">
                {ugList.filter((ug) => ug.id !== "stc").map((ug) => {
                  const selected = reviewDraft.ugIds.includes(ug.id);
                  return (
                    <button
                      key={ug.id}
                      type="button"
                      disabled={readOnly}
                      aria-pressed={selected}
                      className={selected ? "selection-row selected" : "selection-row"}
                      onClick={() =>
                        setReviewDraft({
                          ...reviewDraft,
                          ugIds: selected
                            ? reviewDraft.ugIds.filter((id) => id !== ug.id)
                            : [...reviewDraft.ugIds, ug.id],
                        })
                      }
                    >
                      <span className="check-box">{selected ? <Icon name="check" size={14} /> : null}</span>
                      <span><strong>{ug.acronym}</strong><small>{ug.name}</small></span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="review-section">
              <span className="eyebrow">Campos obrigatórios</span>
              <FieldCatalogPicker
                fields={fieldCatalog}
                selectedIds={reviewDraft.metadataIds}
                setSelectedIds={(metadataIds) => setReviewDraft({ ...reviewDraft, metadataIds })}
                mode={reviewDraft.objectKind}
                objectFieldIds={currentObject?.fields.map((field) => field.id) ?? []}
                readOnly={readOnly}
                groupLabel="Campos obrigatórios na análise"
                searchLabel="Buscar campo na análise"
              />
            </div>

            <div className="review-section">
              <span className="eyebrow">Anexos obrigatórios</span>
              <AttachmentCatalogPicker
                options={attachments}
                selectedLabels={reviewDraft.requiredAttachments}
                setSelectedLabels={(requiredAttachments) =>
                  setReviewDraft({ ...reviewDraft, requiredAttachments })
                }
                readOnly={readOnly}
                groupLabel="Anexos obrigatórios na análise"
                customInputLabel="Nome do anexo personalizado na análise"
              />
            </div>

            <div className="switch-row">
              <div>
                <strong>Exige validação do ponto focal</strong>
                <p>Define se a resposta passa pelo ponto focal antes de chegar à STC.</p>
              </div>
              <button
                type="button"
                className={reviewDraft.requiresFocalPointValidation ? "switch on" : "switch"}
                role="switch"
                aria-label="Exigir validação do ponto focal na análise"
                aria-checked={reviewDraft.requiresFocalPointValidation}
                disabled={readOnly}
                onClick={() => setReviewDraft({ ...reviewDraft, requiresFocalPointValidation: !reviewDraft.requiresFocalPointValidation })}
              />
            </div>

            {!readOnly ? (
              <div className="creation-review-actions">
                <label>
                  Observação para o analista
                  <textarea
                    value={adjustmentMessage}
                    onChange={(event) => {
                      setAdjustmentMessage(event.target.value);
                      if (event.target.value.trim()) setAdjustmentError("");
                    }}
                    placeholder="Explique claramente o que precisa ser corrigido"
                  />
                </label>
                {adjustmentError ? <p className="form-error" role="alert">{adjustmentError}</p> : null}
                <div className="card-actions">
                  <button type="button" className="secondary-button" onClick={() => onReview(selectedCycle.id, reviewDraft, "salvar", "")}>
                    <Icon name="edit" /> Salvar alterações
                  </button>
                  <button type="button" className="secondary-button" onClick={requestAdjustments}>
                    <Icon name="refresh" /> Solicitar ajustes
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    disabled={!canApprove}
                    onClick={() => onReview(selectedCycle.id, reviewDraft, "aprovar", "")}
                  >
                    <Icon name="send" /> Aprovar e enviar às UGs
                  </button>
                </div>
              </div>
            ) : null}

            <div className="review-history">
              <span className="eyebrow">Histórico da criação</span>
              {selectedCycle.reviewHistory.map((event) => (
                <article key={event.id}>
                  <div>
                    <strong>{event.author}</strong>
                    <span>{event.date} · {event.message}</span>
                  </div>
                  {event.changes.length ? (
                    <ul>{event.changes.map((change) => <li key={change}>{change}</li>)}</ul>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : (
          <section className="card empty-state">
            <Icon name="clipboard" size={28} />
            <strong>Nenhum ciclo disponível para análise</strong>
          </section>
        )}
      </div>
    </div>
  );
}

function StcCycleDetail({
  cycle,
  collections,
  ugList,
  setView,
  openValidation,
  openCollectionLink,
}: {
  cycle: CycleItem;
  collections: Collection[];
  ugList: Ug[];
  setView: (view: View) => void;
  openValidation: (cycleId: string) => void;
  openCollectionLink: (collectionId: string) => void;
}) {
  const cycleCollections = collections.filter((item) => item.cycleId === cycle.id);
  const submissions = cycleCollections.flatMap((item) => item.submissions);

  return (
    <div className="workflow-page wide-page">
      <SectionHeader
        eyebrow="Detalhes da coleta"
        title={cycle.title}
        description="Links por UG, histórico e validação ficam ligados à coleta selecionada no painel."
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
              <span>
                {cycle.spreadsheetStatus === "generated"
                  ? "Planilha gerada a partir dos campos selecionados"
                  : cycle.spreadsheetStatus === "fixed-template-pending"
                    ? `Modelo fixo ${cycle.objectCode} pendente de vinculação`
                    : "Planilha pendente de aprovação"}
              </span>
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
              const ug = ugList.find((item) => item.id === collection.ugId);
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
            <span className="eyebrow">Histórico da coleta</span>
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
  ugList,
  validationCollectionId,
  setValidationCollectionId,
  onDecide,
  setView,
}: {
  cycle: CycleItem;
  collections: Collection[];
  respondents: Respondent[];
  ugList: Ug[];
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
  const overdue = isPastDeadline(cycle.deadline);

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
            <h3>Coletas do acionamento</h3>
            <StatusPill tone={cycleTone(cycle.status)}>{cycleLabel(cycle.status)}</StatusPill>
          </div>

          <div className="data-table">
            <div className="table-row head">
              <span>UG</span>
              <span>Submissões</span>
              <span>Situação</span>
            </div>
            {cycleCollections.map((collection) => {
              const ug = ugList.find((item) => item.id === collection.ugId);
              const sent = collection.submissions.filter((item) => item.status !== "rascunho");
              // Correção 5: "Atrasada" é condição derivada (pendente + prazo vencido), nunca status persistido.
              const late = !sent.length && overdue;
              const hint = sent.length
                ? sent.some((item) => item.status === "reaberto")
                  ? "Em correção"
                  : sent.every((item) => item.status === "aprovado")
                    ? "Aprovadas"
                    : "Aguardando decisão"
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
                  <span>
                    {late ? <StatusPill tone="danger">Atrasada</StatusPill> : hint}
                  </span>
                </button>
              );
            })}
          </div>

          <button type="button" className="ghost-button full" onClick={() => setView("stc-cycle-detail")}>
            <Icon name="eye" />
            Ver detalhes e links da coleta
          </button>
        </section>

        <section className="card">
          <span className="eyebrow">Coleta da {ugList.find((item) => item.id === current?.ugId)?.acronym ?? "UG"}</span>
          <h3>{cycle.objectName}</h3>
          {current?.requiredAttachments.length ? (
            <p className="muted-text">
              Anexos obrigatórios: {current.requiredAttachments.join(", ")}. A checagem estrutural
              confere a contagem (enviados ≥ exigidos) — nunca o nome nem o conteúdo dos arquivos.
            </p>
          ) : (
            <p className="muted-text">Sem anexos obrigatórios nesta coleta — a checagem estrutural confere só a planilha.</p>
          )}

          {current?.attachmentJustifications.length ? (
            <>
              <div className="alert">
                <Icon name="bell" />
                <div>
                  <strong>A UG sinalizou que não tem todos os anexos</strong>
                  <span>
                    Justificativa registrada presa à coleta — não é chat; a tratativa formal segue
                    pelo SEI/e-mail.
                  </span>
                </div>
              </div>
              <ObservationThread observations={current.attachmentJustifications} />
            </>
          ) : null}

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
                <>
                  <ReceiptTimeline submission={submission} seiNumber={cycle.seiNumber} compact />
                  {submission.status === "aguardando-ponto-focal" ? (
                    <p className="muted-text">
                      Aguardando validação do ponto focal — a submissão chega à STC após o
                      encaminhamento.
                    </p>
                  ) : submission.status === "reaberto" ? (
                    <p className="muted-text">Devolvida para correção — aguardando reenvio da UG.</p>
                  ) : submission.status === "aprovado" ? null : (
                    <DecisionBox
                      submission={submission}
                      onDecide={(decision, reason) =>
                        current ? onDecide(current.id, submission.id, decision, reason) : undefined
                      }
                    />
                  )}
                </>
              </SubmissionBlock>
            ))
          )}
        </section>
      </div>
    </div>
  );
}

// §4: cadastros que alimentam a criação da coleta. O Tesauro segue fonte externa (T2) —
// este registro é a base local e a saída para as UGs que ainda não existem (§0.3 / P-022).
function StcRegistry({
  objects,
  attachmentsRegistry,
  fieldsOf,
  ugList,
  onUpdateObject,
  onUpdateAttachments,
  onUpdateFields,
  onCreateObject,
  onCreateUg,
  onUpdateUg,
}: {
  objects: readonly TransparencyObject[];
  attachmentsRegistry: Record<string, string[]>;
  fieldsOf: (object: TransparencyObject) => FieldDefinition[];
  ugList: Ug[];
  onUpdateObject: (
    objectId: string,
    patch: Pick<TransparencyObject, "code" | "name" | "subject" | "cadence">,
  ) => boolean;
  onUpdateAttachments: (code: string, attachments: string[]) => void;
  onUpdateFields: (code: string, fields: FieldDefinition[]) => void;
  onCreateObject: (data: {
    code: string;
    name: string;
    subject: string;
    cadence: string;
    fieldLabels: string[];
    attachments: string[];
  }) => boolean;
  onCreateUg: (data: { acronym: string; name: string; esfera: string; focalName: string; focalEmail: string }) => boolean;
  onUpdateUg: (id: string, patch: Partial<Ug>) => boolean;
}) {
  const [tab, setTab] = useState<"objetos" | "ugs" | "campos">("objetos");

  // Aba 1 — objetos fixos (§4.1)
  const fixedObjects = objects.filter((item) => kindFromFormat(item.format) === "fixo");
  const [attachmentDrafts, setAttachmentDrafts] = useState<Record<string, string>>({});
  const [objectFormOpen, setObjectFormOpen] = useState(false);
  const [objectForm, setObjectForm] = useState({ code: "", name: "", subject: "", cadence: "Mensal" });
  const [objectFormFields, setObjectFormFields] = useState<string[]>([]);
  const [objectFormFieldDraft, setObjectFormFieldDraft] = useState("");
  const [objectFormAttachments, setObjectFormAttachments] = useState<string[]>([]);
  const [objectFormAttachmentDraft, setObjectFormAttachmentDraft] = useState("");
  const [objectFormError, setObjectFormError] = useState("");
  const [editingObjectId, setEditingObjectId] = useState("");
  const [objectEditForm, setObjectEditForm] = useState({ code: "", name: "", subject: "", cadence: "" });
  const [objectEditError, setObjectEditError] = useState("");

  const addObjectAttachment = (code: string) => {
    const label = (attachmentDrafts[code] ?? "").trim();
    if (!label) return;
    onUpdateAttachments(code, [...(attachmentsRegistry[code] ?? []), label]);
    setAttachmentDrafts({ ...attachmentDrafts, [code]: "" });
  };

  const submitObjectForm = () => {
    if (!objectForm.code.trim() || !objectForm.name.trim() || !objectFormFields.length) return;
    const saved = onCreateObject({
      code: objectForm.code.trim().toUpperCase(),
      name: objectForm.name.trim(),
      subject: objectForm.subject.trim() || "Registro STC",
      cadence: objectForm.cadence.trim() || "Mensal",
      fieldLabels: objectFormFields,
      attachments: objectFormAttachments,
    });
    if (!saved) {
      setObjectFormError("Já existe um objeto ou registro com esse código.");
      return;
    }
    setObjectForm({ code: "", name: "", subject: "", cadence: "Mensal" });
    setObjectFormFields([]);
    setObjectFormAttachments([]);
    setObjectFormError("");
    setObjectFormOpen(false);
  };

  const openObjectEdit = (object: TransparencyObject) => {
    setEditingObjectId(object.id);
    setObjectEditForm({
      code: object.code,
      name: object.name,
      subject: object.subject,
      cadence: object.cadence,
    });
    setObjectEditError("");
  };

  const submitObjectEdit = (objectId: string) => {
    const saved = onUpdateObject(objectId, objectEditForm);
    if (!saved) {
      setObjectEditError("Já existe um objeto com esse código.");
      return;
    }
    setEditingObjectId("");
    setObjectEditError("");
  };

  // Aba 2 — UGs com wizard (§4.2)
  const registryUgs = ugList.filter((item) => item.id !== "stc");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [ugForm, setUgForm] = useState({ acronym: "", name: "", esfera: "Estadual", focalName: "", focalEmail: "" });
  const [editingUgId, setEditingUgId] = useState("");
  const [editForm, setEditForm] = useState({ acronym: "", name: "", esfera: "", focalName: "", focalEmail: "" });
  const [ugCreateError, setUgCreateError] = useState("");
  const [ugEditError, setUgEditError] = useState("");

  const wizardStepState = (position: 1 | 2 | 3): StepState =>
    wizardStep === position ? "active" : wizardStep > position ? "done" : "todo";

  const submitUgWizard = () => {
    if (!onCreateUg(ugForm)) {
      setUgCreateError("Já existe uma UG com essa sigla ou identificador.");
      setWizardStep(1);
      return;
    }
    setUgForm({ acronym: "", name: "", esfera: "Estadual", focalName: "", focalEmail: "" });
    setUgCreateError("");
    setWizardStep(1);
    setWizardOpen(false);
  };

  const openUgEdit = (ug: Ug) => {
    setEditingUgId(ug.id);
    setEditForm({ acronym: ug.acronym, name: ug.name, esfera: ug.esfera, focalName: ug.focalName, focalEmail: ug.focalEmail });
    setUgEditError("");
  };

  // Aba 3 — campos por objeto (§4.3)
  const [fieldObjectId, setFieldObjectId] = useState(objects[0]?.id ?? "");
  const fieldObject = objects.find((item) => item.id === fieldObjectId) ?? null;
  const [fieldLabelDraft, setFieldLabelDraft] = useState("");
  const [fieldTypeDraft, setFieldTypeDraft] = useState("Texto");

  const addField = () => {
    if (!fieldObject || !fieldLabelDraft.trim()) return;
    const current = fieldsOf(fieldObject);
    const labelSlug = fieldLabelDraft
      .trim()
      .toLocaleLowerCase("pt-BR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "campo";
    const idBase = `f-${fieldObject.code.toLocaleLowerCase("pt-BR")}-${labelSlug}`;
    const occupiedIds = new Set(current.map((field) => field.id));
    let id = idBase;
    let suffix = 2;
    while (occupiedIds.has(id)) {
      id = `${idBase}-${suffix}`;
      suffix += 1;
    }
    onUpdateFields(fieldObject.code, [
      ...current,
      {
        id,
        label: fieldLabelDraft.trim(),
        type: fieldTypeDraft.trim() || "Texto",
        hint: "Campo adicionado no Registro.",
        required: true,
      },
    ]);
    setFieldLabelDraft("");
  };

  return (
    <div className="workflow-page wide-page">
      <SectionHeader
        eyebrow="Registro STC"
        title="Cadastros que alimentam a criação"
        description="Objetos fixos, UGs com seus pontos focais e os campos da planilha-padrão. O Tesauro segue fonte externa — este é o registro local da STC."
      />

      <div className="registry-tabs" role="tablist" aria-label="Abas do registro">
        <button type="button" className={tab === "objetos" ? "active" : ""} onClick={() => setTab("objetos")}>
          <Icon name="file" size={16} />
          Objetos fixos
        </button>
        <button type="button" className={tab === "ugs" ? "active" : ""} onClick={() => setTab("ugs")}>
          <Icon name="users" size={16} />
          UGs
        </button>
        <button type="button" className={tab === "campos" ? "active" : ""} onClick={() => setTab("campos")}>
          <Icon name="clipboard" size={16} />
          Campos / informações
        </button>
      </div>

      {tab === "objetos" ? (
        <section className="card">
          <div className="table-header">
            <div>
              <span className="eyebrow">Objetos fixos do registro</span>
              <h3>Planilha pronta + anexos que vêm pré-preenchidos na criação</h3>
            </div>
            <button type="button" className="primary-button ripple-button" onClick={() => setObjectFormOpen(!objectFormOpen)}>
              <Icon name="edit" />
              {objectFormOpen ? "Fechar cadastro" : "Cadastrar objeto fixo"}
            </button>
          </div>

          {objectFormOpen ? (
            <div className="registry-form">
              <div className="details-form">
                <label>
                  Código
                    <input
                      placeholder="ex.: MT-0100"
                      value={objectForm.code}
                      onChange={(event) => {
                        setObjectForm({ ...objectForm, code: event.target.value });
                        setObjectFormError("");
                      }}
                    />
                </label>
                <label>
                  Nome
                  <input
                    placeholder="ex.: Contratos de gestão"
                    value={objectForm.name}
                    onChange={(event) => setObjectForm({ ...objectForm, name: event.target.value })}
                  />
                </label>
                <label>
                  Tema
                  <input
                    placeholder="ex.: Contratações"
                    value={objectForm.subject}
                    onChange={(event) => setObjectForm({ ...objectForm, subject: event.target.value })}
                  />
                </label>
                <label>
                  Cadência
                  <input
                    placeholder="ex.: Mensal"
                    value={objectForm.cadence}
                    onChange={(event) => setObjectForm({ ...objectForm, cadence: event.target.value })}
                  />
                </label>
              </div>

              <span className="eyebrow">Campos da planilha-padrão</span>
              <div className="chip-editor">
                <input
                  placeholder="ex.: Número do contrato"
                  value={objectFormFieldDraft}
                  onChange={(event) => setObjectFormFieldDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      if (objectFormFieldDraft.trim()) {
                        setObjectFormFields([...objectFormFields, objectFormFieldDraft.trim()]);
                        setObjectFormFieldDraft("");
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    if (!objectFormFieldDraft.trim()) return;
                    setObjectFormFields([...objectFormFields, objectFormFieldDraft.trim()]);
                    setObjectFormFieldDraft("");
                  }}
                >
                  Adicionar campo
                </button>
              </div>
              {objectFormFields.length ? (
                <div className="chips">
                  {objectFormFields.map((label, index) => (
                    <span key={`${label}-${index}`}>
                      {label}
                      <button
                        type="button"
                        onClick={() => setObjectFormFields(objectFormFields.filter((_, position) => position !== index))}
                        aria-label={`Remover campo ${label}`}
                      >
                        <Icon name="x" size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="muted-text">Nenhum campo ainda — a planilha-padrão precisa de pelo menos um.</p>
              )}

              <span className="eyebrow">Anexos obrigatórios do registro</span>
              <div className="chip-editor">
                <input
                  placeholder="ex.: Cópia do contrato em PDF"
                  value={objectFormAttachmentDraft}
                  onChange={(event) => setObjectFormAttachmentDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      if (objectFormAttachmentDraft.trim()) {
                        setObjectFormAttachments([...objectFormAttachments, objectFormAttachmentDraft.trim()]);
                        setObjectFormAttachmentDraft("");
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    if (!objectFormAttachmentDraft.trim()) return;
                    setObjectFormAttachments([...objectFormAttachments, objectFormAttachmentDraft.trim()]);
                    setObjectFormAttachmentDraft("");
                  }}
                >
                  Adicionar anexo
                </button>
              </div>
              {objectFormAttachments.length ? (
                <div className="chips">
                  {objectFormAttachments.map((label, index) => (
                    <span key={`${label}-${index}`}>
                      {label}
                      <button
                        type="button"
                        onClick={() =>
                          setObjectFormAttachments(objectFormAttachments.filter((_, position) => position !== index))
                        }
                        aria-label={`Remover anexo ${label}`}
                      >
                        <Icon name="x" size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}

              {objectFormError ? (
                <p className="registry-edit-error" role="alert">
                  {objectFormError}
                </p>
              ) : null}

              <div className="card-actions">
                <button
                  type="button"
                  className="primary-button ripple-button"
                  disabled={!objectForm.code.trim() || !objectForm.name.trim() || !objectFormFields.length}
                  onClick={submitObjectForm}
                >
                  <Icon name="check" />
                  Salvar objeto fixo no registro
                </button>
              </div>
            </div>
          ) : null}

          <div className="registry-list">
            {!fixedObjects.length ? (
              <div className="empty-state registry-empty-state">
                <Icon name="file" size={28} />
                <strong>Nenhum objeto fixo cadastrado</strong>
                <span>Use “Cadastrar objeto fixo” para preparar a primeira planilha-padrão.</span>
              </div>
            ) : null}
            {fixedObjects.map((object) => {
              const attachments = attachmentsRegistry[object.code] ?? [];
              return (
                <article key={object.id} className="registry-row">
                  <div>
                    <strong>
                      {object.code} · {titleCase(object.name)}
                    </strong>
                    <small>
                      {object.subject} · {object.cadence} · {fieldsOf(object).length} campos na planilha
                    </small>
                  </div>
                  <div className="card-actions compact">
                    <button
                      type="button"
                      className="secondary-button"
                      aria-label={`Editar ${object.code}`}
                      onClick={() => openObjectEdit(object)}
                    >
                      <Icon name="edit" size={14} />
                      Editar
                    </button>
                  </div>
                  {editingObjectId === object.id ? (
                    <div className="registry-form full-row">
                      <div className="details-form">
                        <label>
                          Código do objeto
                          <input
                            value={objectEditForm.code}
                            onChange={(event) => {
                              setObjectEditForm({ ...objectEditForm, code: event.target.value });
                              setObjectEditError("");
                            }}
                          />
                        </label>
                        <label>
                          Nome do objeto
                          <input
                            value={objectEditForm.name}
                            onChange={(event) => setObjectEditForm({ ...objectEditForm, name: event.target.value })}
                          />
                        </label>
                        <label>
                          Tema do objeto
                          <input
                            value={objectEditForm.subject}
                            onChange={(event) => setObjectEditForm({ ...objectEditForm, subject: event.target.value })}
                          />
                        </label>
                        <label>
                          Cadência do objeto
                          <input
                            value={objectEditForm.cadence}
                            onChange={(event) => setObjectEditForm({ ...objectEditForm, cadence: event.target.value })}
                          />
                        </label>
                      </div>
                      {objectEditError ? (
                        <p className="registry-edit-error" role="alert">
                          {objectEditError}
                        </p>
                      ) : null}
                      <div className="card-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => {
                            setEditingObjectId("");
                            setObjectEditError("");
                          }}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className="primary-button ripple-button"
                          disabled={
                            !objectEditForm.code.trim() ||
                            !objectEditForm.name.trim() ||
                            !objectEditForm.subject.trim() ||
                            !objectEditForm.cadence.trim()
                          }
                          onClick={() => submitObjectEdit(object.id)}
                        >
                          <Icon name="check" />
                          Salvar objeto
                        </button>
                      </div>
                    </div>
                  ) : null}
                  <div className="registry-attachments">
                    <span className="eyebrow">Anexos do registro (pré-preenchem a criação)</span>
                    {attachments.length ? (
                      <div className="chips">
                        {attachments.map((label) => (
                          <span key={label}>
                            {label}
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateAttachments(object.code, attachments.filter((item) => item !== label))
                              }
                              aria-label={`Remover ${label}`}
                            >
                              <Icon name="x" size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="muted-text">Sem anexos obrigatórios no registro deste objeto.</p>
                    )}
                    <div className="chip-editor">
                      <input
                        placeholder="Adicionar anexo ao registro"
                        value={attachmentDrafts[object.code] ?? ""}
                        onChange={(event) =>
                          setAttachmentDrafts({ ...attachmentDrafts, [object.code]: event.target.value })
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addObjectAttachment(object.code);
                          }
                        }}
                      />
                      <button type="button" className="secondary-button" onClick={() => addObjectAttachment(object.code)}>
                        Adicionar
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {tab === "ugs" ? (
        <section className="card">
          <div className="table-header">
            <div>
              <span className="eyebrow">UGs cadastradas</span>
              <h3>Um ponto focal por órgão — troque quando a gestão mudar</h3>
            </div>
            <button
              type="button"
              className="primary-button ripple-button"
              onClick={() => {
                setWizardOpen(!wizardOpen);
                setWizardStep(1);
                setUgCreateError("");
              }}
            >
              <Icon name="users" />
              {wizardOpen ? "Fechar wizard" : "Cadastrar UG"}
            </button>
          </div>

          {wizardOpen ? (
            <div className="registry-form ug-wizard">
              <div className="step-grid">
                {(["Identificação", "Ponto focal", "Confirmação"] as const).map((label, index) => {
                  const state = wizardStepState((index + 1) as 1 | 2 | 3);
                  return (
                    <article key={label} className={`step-card ${state}`}>
                      <span>{state === "done" ? <Icon name="check" size={14} /> : index + 1}</span>
                      <strong>{label}</strong>
                    </article>
                  );
                })}
              </div>

              {wizardStep === 1 ? (
                <>
                  <div className="details-form">
                    <label>
                      Sigla
                      <input
                        placeholder="ex.: SES"
                        value={ugForm.acronym}
                        onChange={(event) => {
                          setUgForm({ ...ugForm, acronym: event.target.value });
                          setUgCreateError("");
                        }}
                      />
                    </label>
                    <label>
                      Nome
                      <input
                        placeholder="ex.: Secretaria de Estado da Saúde"
                        value={ugForm.name}
                        onChange={(event) => setUgForm({ ...ugForm, name: event.target.value })}
                      />
                    </label>
                    <label>
                      Esfera
                      <select value={ugForm.esfera} onChange={(event) => setUgForm({ ...ugForm, esfera: event.target.value })}>
                        <option value="Estadual">Estadual</option>
                        <option value="Municipal">Municipal</option>
                        <option value="Federal">Federal</option>
                      </select>
                    </label>
                  </div>
                  {ugCreateError ? (
                    <p className="registry-edit-error" role="alert">
                      {ugCreateError}
                    </p>
                  ) : null}
                  <div className="card-actions">
                    <button
                      type="button"
                      className="primary-button ripple-button"
                      disabled={!ugForm.acronym.trim() || !ugForm.name.trim()}
                      onClick={() => setWizardStep(2)}
                    >
                      <Icon name="arrow" />
                      Continuar
                    </button>
                  </div>
                </>
              ) : null}

              {wizardStep === 2 ? (
                <>
                  <div className="alert">
                    <Icon name="mail" />
                    <div>
                      <strong>Um ponto focal por órgão</strong>
                      <span>
                        É por este e-mail que o ponto focal recebe a notificação e faz o login. Quando a
                        gestão mudar, é aqui que se troca.
                      </span>
                    </div>
                  </div>
                  <div className="details-form">
                    <label>
                      Nome do ponto focal
                      <input
                        placeholder="ex.: Ana Ribeiro"
                        value={ugForm.focalName}
                        onChange={(event) => setUgForm({ ...ugForm, focalName: event.target.value })}
                      />
                    </label>
                    <label>
                      E-mail do ponto focal
                      <input
                        placeholder="ex.: ana.ribeiro@ses.ma.gov.br"
                        value={ugForm.focalEmail}
                        onChange={(event) => setUgForm({ ...ugForm, focalEmail: event.target.value })}
                      />
                    </label>
                  </div>
                  <div className="card-actions">
                    <button type="button" className="secondary-button" onClick={() => setWizardStep(1)}>
                      <Icon name="arrow" />
                      Voltar
                    </button>
                    <button
                      type="button"
                      className="primary-button ripple-button"
                      disabled={!ugForm.focalName.trim() || !ugForm.focalEmail.trim()}
                      onClick={() => setWizardStep(3)}
                    >
                      <Icon name="arrow" />
                      Continuar
                    </button>
                  </div>
                </>
              ) : null}

              {wizardStep === 3 ? (
                <>
                  <div className="cycle-summary">
                    <div>
                      <strong>{ugForm.acronym.toUpperCase()}</strong>
                      <span>{ugForm.name}</span>
                    </div>
                    <div>
                      <strong>{ugForm.esfera}</strong>
                      <span>esfera</span>
                    </div>
                    <div>
                      <strong>{ugForm.focalName}</strong>
                      <span>ponto focal</span>
                    </div>
                    <div>
                      <strong>{ugForm.focalEmail}</strong>
                      <span>e-mail do convite</span>
                    </div>
                  </div>
                  <div className="card-actions">
                    <button type="button" className="secondary-button" onClick={() => setWizardStep(2)}>
                      <Icon name="arrow" />
                      Voltar
                    </button>
                    <button type="button" className="primary-button ripple-button" onClick={submitUgWizard}>
                      <Icon name="send" />
                      Enviar convite por e-mail (simulado)
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          <div className="registry-list">
            {!registryUgs.length ? (
              <div className="empty-state registry-empty-state">
                <Icon name="users" size={28} />
                <strong>Nenhuma UG cadastrada</strong>
                <span>Use “Cadastrar UG” para vincular o órgão e seu ponto focal.</span>
              </div>
            ) : null}
            {registryUgs.map((ug) => (
              <article key={ug.id} className="registry-row">
                <div>
                  <strong>
                    {ug.acronym} · {ug.name}
                  </strong>
                  <small>
                    {ug.esfera} · ponto focal: {ug.focalName} ({ug.focalEmail})
                  </small>
                </div>
                <div className="card-actions compact">
                  <button
                    type="button"
                    className="secondary-button"
                    aria-label={`Editar ${ug.acronym}`}
                    onClick={() => openUgEdit(ug)}
                  >
                    <Icon name="edit" size={14} />
                    Editar UG · Trocar ponto focal
                  </button>
                </div>
                {editingUgId === ug.id ? (
                  <div className="registry-form full-row">
                    <div className="details-form">
                      <label>
                        Sigla da UG
                        <input
                          value={editForm.acronym}
                          onChange={(event) => {
                            setEditForm({ ...editForm, acronym: event.target.value });
                            setUgEditError("");
                          }}
                        />
                      </label>
                      <label>
                        Nome da UG
                        <input value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} />
                      </label>
                      <label>
                        Esfera
                        <select value={editForm.esfera} onChange={(event) => setEditForm({ ...editForm, esfera: event.target.value })}>
                          <option value="Estadual">Estadual</option>
                          <option value="Municipal">Municipal</option>
                          <option value="Federal">Federal</option>
                        </select>
                      </label>
                      <label>
                        Ponto focal (novo)
                        <input
                          value={editForm.focalName}
                          onChange={(event) => setEditForm({ ...editForm, focalName: event.target.value })}
                        />
                      </label>
                      <label>
                        E-mail do ponto focal
                        <input
                          value={editForm.focalEmail}
                          onChange={(event) => setEditForm({ ...editForm, focalEmail: event.target.value })}
                        />
                      </label>
                    </div>
                    {ugEditError ? (
                      <p className="registry-edit-error" role="alert">
                        {ugEditError}
                      </p>
                    ) : null}
                    <div className="card-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => {
                          setEditingUgId("");
                          setUgEditError("");
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="primary-button ripple-button"
                        disabled={
                          !editForm.acronym.trim() ||
                          !editForm.focalName.trim() ||
                          !editForm.focalEmail.trim() ||
                          !editForm.name.trim()
                        }
                        onClick={() => {
                          if (!onUpdateUg(ug.id, editForm)) {
                            setUgEditError("Já existe uma UG com essa sigla.");
                            return;
                          }
                          setEditingUgId("");
                          setUgEditError("");
                        }}
                      >
                        <Icon name="check" />
                        Salvar alterações
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "campos" ? (
        <section className="card">
          <div className="table-header">
            <div>
              <span className="eyebrow">Campos / informações por objeto</span>
              <h3>O que define as colunas da planilha-padrão</h3>
            </div>
          </div>

          <label className="field-label">
            <span>Objeto</span>
            <select value={fieldObjectId} onChange={(event) => setFieldObjectId(event.target.value)}>
              {objects.map((object) => (
                <option key={object.id} value={object.id}>
                  {object.code} — {titleCase(object.name)}
                </option>
              ))}
            </select>
          </label>

          {fieldObject ? (
            <>
              {fieldsOf(fieldObject).length ? (
                <div className="registry-list">
                  {fieldsOf(fieldObject).map((field) => (
                    <article key={field.id} className="registry-row field-row">
                      <div>
                        <strong>{field.label}</strong>
                        <small>
                          {field.type}
                          {field.required ? " · obrigatório" : ""} · {field.hint}
                        </small>
                      </div>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() =>
                          onUpdateFields(
                            fieldObject.code,
                            fieldsOf(fieldObject).filter((item) => item.id !== field.id),
                          )
                        }
                        aria-label={`Remover campo ${field.label}`}
                      >
                        <Icon name="x" size={14} />
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state registry-empty-state">
                  <Icon name="clipboard" size={28} />
                  <strong>Nenhum campo cadastrado para este objeto</strong>
                  <span>Adicione um campo abaixo para definir a próxima planilha-padrão.</span>
                </div>
              )}

              <div className="chip-editor">
                <input
                  placeholder="Nome do campo (ex.: Valor empenhado)"
                  value={fieldLabelDraft}
                  onChange={(event) => setFieldLabelDraft(event.target.value)}
                />
                <input
                  placeholder="Tipo (ex.: Moeda)"
                  value={fieldTypeDraft}
                  onChange={(event) => setFieldTypeDraft(event.target.value)}
                />
                <button type="button" className="secondary-button" onClick={addField}>
                  Adicionar campo
                </button>
              </div>
              <p className="muted-text">
                Remover um campo tira a coluna da planilha-padrão nas próximas coletas; as já criadas não mudam.
              </p>
            </>
          ) : (
            <div className="empty-state registry-empty-state">
              <Icon name="file" size={28} />
              <strong>Nenhum objeto disponível para receber campos</strong>
              <span>Cadastre primeiro um objeto fixo na aba correspondente.</span>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

// §3: visão de consulta de todas as coletas. É leitura — a ação acontece no painel.
function StcHistory({
  cycles,
  collections,
  respondents,
  ugList,
}: {
  cycles: CycleItem[];
  collections: Collection[];
  respondents: Respondent[];
  ugList: Ug[];
}) {
  const [filters, setFilters] = useState<HistoryFilters>({
    status: "todos",
    object: "todos",
    ug: "todos",
    dateFrom: "",
    dateTo: "",
  });
  const [search, setSearch] = useState("");
  const [openCycleId, setOpenCycleId] = useState("");

  const rows = cycles.filter((cycle) => {
    const statusMatch = filters.status === "todos" || cycle.status === filters.status;
    const objectMatch = filters.object === "todos" || cycle.objectCode === filters.object;
    const ugMatch = filters.ug === "todos" || cycle.ugIds.includes(filters.ug);
    const dateFromMatch = !filters.dateFrom || cycle.deadline >= filters.dateFrom;
    const dateToMatch = !filters.dateTo || cycle.deadline <= filters.dateTo;
    const searchMatch =
      !search.trim() ||
      `${cycle.title} ${cycle.objectCode} ${cycle.seiNumber}`.toLowerCase().includes(search.trim().toLowerCase());
    return statusMatch && objectMatch && ugMatch && dateFromMatch && dateToMatch && searchMatch;
  });
  const openCycle = cycles.find((item) => item.id === openCycleId) ?? null;
  const objectOptions = [...new Set(cycles.map((cycle) => cycle.objectCode))];

  return (
    <div className="workflow-page wide-page">
      <SectionHeader
        eyebrow="Histórico STC"
        title="Todas as coletas, em qualquer estado"
        description="Consulta para entender o que aconteceu. É leitura — a ação acontece no painel."
      />

      <section className="card filter-panel">
        <div>
          <span className="eyebrow">Filtros e busca</span>
          <h3>Encontrar coleta</h3>
        </div>
        <div className="filters-grid">
          <StatusFilter
            value={filters.status}
            onChange={(status) => setFilters({ ...filters, status })}
          />
          <label>
            Busca
            <input
              placeholder="objeto, título ou nº do SEI"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
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
              {ugList.filter((ug) => ug.id !== "stc").map((ug) => (
                <option key={ug.id} value={ug.id}>
                  {ug.acronym}
                </option>
              ))}
            </select>
          </label>
          <label>
            Período inicial
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value })}
            />
          </label>
          <label>
            Período final
            <input
              type="date"
              value={filters.dateTo}
              onChange={(event) => setFilters({ ...filters, dateTo: event.target.value })}
            />
          </label>
        </div>
      </section>

      <section className="card cycle-list-card">
        <div className="table-header">
          <div>
            <span className="eyebrow">Registro completo</span>
            <h3>{rows.length} coleta(s) no filtro</h3>
          </div>
        </div>
        <div className="history-table">
          {rows.length ? (
            <>
              <div className="history-row head">
                <span>Objeto</span>
                <span>UGs</span>
                <span>Tipo</span>
                <span>Status</span>
                <span>Prazo</span>
                <span>Respostas</span>
                <span>Fechamento</span>
                <span>SEI</span>
                <span />
              </div>
              {rows.map((cycle) => {
                const sent = collections
                  .filter((item) => item.cycleId === cycle.id)
                  .flatMap((item) => item.submissions)
                  .filter((item) => item.status !== "rascunho");
                return (
                  <div key={cycle.id} className="history-row">
                    <span>
                      <strong>{cycle.objectCode}</strong>
                      <small>{cycle.objectName}</small>
                    </span>
                    <span>{cycle.ugIds.map((id) => ugList.find((ug) => ug.id === id)?.acronym ?? id).join(", ")}</span>
                    <span>{kindLabel(cycle.objectKind)}</span>
                    <span>
                      <StatusPill tone={cycleTone(cycle.status)}>{cycleLabel(cycle.status)}</StatusPill>
                    </span>
                    <span>{cycle.deadline}</span>
                    <span>{String(sent.length)}</span>
                    <span>{cycleClosedAt(cycle, collections)}</span>
                    <span>{cycle.seiNumber || "—"}</span>
                    <span>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => setOpenCycleId(openCycleId === cycle.id ? "" : cycle.id)}
                      >
                        <Icon name="eye" size={14} />
                        {openCycleId === cycle.id ? "Fechar" : "Ver o que aconteceu"}
                      </button>
                    </span>
                  </div>
                );
              })}
            </>
          ) : (
            <div className="empty-state filtered-empty-state history-empty-state">
              <Icon name="filter" size={28} />
              <strong>Nenhum registro encontrado no período e filtros selecionados.</strong>
              <span>Ajuste a busca, o período ou os filtros para consultar outras coletas.</span>
            </div>
          )}
        </div>
      </section>

      {openCycle ? (
        <section className="card">
          <span className="eyebrow">Leitura da coleta</span>
          <h3>{openCycle.title}</h3>
          {collections
            .filter((item) => item.cycleId === openCycle.id)
            .map((collection) => {
              const ug = ugList.find((item) => item.id === collection.ugId);
              const sent = collection.submissions.filter((item) => item.status !== "rascunho");
              return (
                <div key={collection.id} className="collection-block">
                  <div className="table-header">
                    <strong>{ug?.acronym ?? collection.ugId}</strong>
                    <span className="link-chip">
                      <Icon name="link" size={14} />
                      {collectionLink(collection)}
                    </span>
                  </div>
                  {collection.attachmentJustifications.length ? (
                    <>
                      <p className="muted-text">Justificativas de anexo registradas pela UG:</p>
                      <ObservationThread observations={collection.attachmentJustifications} />
                    </>
                  ) : null}
                  {sent.length ? (
                    sent.map((submission) => (
                      <SubmissionBlock
                        key={submission.id}
                        submission={submission}
                        respondent={respondents.find((item) => item.id === submission.respondentId)}
                        requiredAttachments={collection.requiredAttachments}
                      >
                        {submission.protocol ? (
                          <ReceiptTimeline submission={submission} seiNumber={openCycle.seiNumber} compact />
                        ) : null}
                      </SubmissionBlock>
                    ))
                  ) : (
                    <div className="empty-state">
                      <Icon name="clock" size={28} />
                      <strong>Sem respostas nesta coleta</strong>
                      <span>
                        {isPastDeadline(openCycle.deadline)
                          ? "O prazo terminou sem envio."
                          : "Aguardando envios pela plataforma."}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
        </section>
      ) : null}
    </div>
  );
}

function FocalDashboard({
  cycles,
  collections,
  respondents,
  ugList,
  openCycle,
}: {
  cycles: CycleItem[];
  collections: Collection[];
  respondents: Respondent[];
  ugList: Ug[];
  openCycle: (cycleId: string) => void;
}) {
  const orgUg = ugList.find((item) => item.id === focalUser.ugId);
  const orgCycles = cycles.filter(
    (cycle) => cycle.creationStatus === "aprovado" && cycle.ugIds.includes(focalUser.ugId),
  );
  const orgCollections = collections.filter((item) => item.ugId === focalUser.ugId);
  const orgSubmissions = orgCollections
    .flatMap((item) => item.submissions)
    .filter((item) => item.status !== "rascunho");
  const awaiting = orgSubmissions.filter((item) => item.status === "aguardando-ponto-focal").length;

  const metrics = [
    ["Aguardando sua validação", awaiting, "Dar ciência e encaminhar", "warning"] as const,
    ["Coletas do órgão", orgCycles.length, "Visão completa do ponto focal", "info"] as const,
    [
      "Em correção",
      orgCycles.filter((cycle) => cycle.status === "correcao").length,
      "Reabertas pela STC",
      "orange",
    ] as const,
    [
      "Finalizadas",
      orgCycles.filter((cycle) => cycle.status === "finalizado").length,
      "Com comprovante",
      "success",
    ] as const,
  ];

  return (
    <div className="workflow-page ug-home wide-page">
      <SectionHeader
        eyebrow={`Painel do ponto focal · ${orgUg?.acronym ?? ""}`}
        title={`${focalUser.name} — ${orgUg?.name ?? ""}`}
        description="O ponto focal vê todas as coletas do órgão e todas as respostas. Pode responder ou apenas monitorar — e valida antes do envio à STC quando a coleta exige."
      />

      <div className="metrics-grid dashboard-metrics">
        {metrics.map(([label, value, hint, tone]) => (
          <MetricCard
            key={label}
            icon={tone === "warning" ? "bell" : tone === "orange" ? "refresh" : tone === "info" ? "clipboard" : "check"}
            label={label}
            value={String(value)}
            hint={hint}
            tone={tone}
          />
        ))}
      </div>

      {awaiting > 0 ? (
        <div className="alert focal-callout">
          <Icon name="bell" />
          <div>
            <strong>
              {awaiting} resposta{awaiting > 1 ? "s" : ""} aguardando sua validação
            </strong>
            <span>Abra a coleta para validar e encaminhar à STC — ou devolver ao respondente.</span>
          </div>
        </div>
      ) : null}

      <section className="card cycle-list-card ug-list-card">
        <div className="table-header">
          <div>
            <span className="eyebrow">Coletas do órgão</span>
            <h3>Solicitações recebidas da STC — com as respostas de cada uma</h3>
          </div>
          <StatusPill tone="info">Pedido no SEI · resposta na plataforma</StatusPill>
        </div>

        <div className="ug-cycle-list">
          {orgCycles.map((cycle) => {
            const cycleSubs = orgCollections
              .filter((item) => item.cycleId === cycle.id)
              .flatMap((item) => item.submissions)
              .filter((item) => item.status !== "rascunho");
            // Correção 5: atraso derivado — coleta do órgão pendente com prazo vencido.
            const late = !cycleSubs.length && isPastDeadline(cycle.deadline);
            return (
              <article key={cycle.id} className={`ug-cycle-row ${cycle.status}`}>
                <div className="ug-cycle-status">
                  <StatusPill tone={cycleTone(cycle.status)}>{cycleLabel(cycle.status, "orgao")}</StatusPill>
                  <span>{cycle.deadline}</span>
                  {late ? <StatusPill tone="danger">Atrasada</StatusPill> : null}
                </div>
                <div className="ug-cycle-main">
                  <strong>{cycle.title}</strong>
                  <span>
                    {cycle.objectCode} · {kindLabel(cycle.objectKind)} · SEI {cycle.seiNumber || "a informar"}
                  </span>
                  <p>
                    {cycle.requiresFocalPointValidation
                      ? "Esta coleta exige sua validação antes do envio à STC."
                      : "Envio direto à STC — você acompanha sem validação obrigatória."}
                  </p>
                  {/* §8.1: as submissões aparecem no painel — não só a contagem. */}
                  <div className="focal-sub-list">
                    {cycleSubs.length ? (
                      cycleSubs.map((sub) => (
                        <div key={sub.id} className="focal-sub-row">
                          <strong>{sub.respondentName}</strong>
                          <small>
                            {respondents.find((item) => item.id === sub.respondentId)?.role ?? "Respondente técnico"} ·{" "}
                            {sub.submittedAt}
                          </small>
                          <StatusPill tone={submissionTone(sub.status)}>{submissionLabel(sub.status)}</StatusPill>
                        </div>
                      ))
                    ) : (
                      <small className="muted-text">Nenhuma resposta ainda — o link da coleta está no SEI do órgão.</small>
                    )}
                  </div>
                </div>
                <div className="ug-cycle-meta">
                  <span>{cycleSubs.length} resposta(s) do órgão</span>
                  <span>{cycle.metadataLabels.length} campos</span>
                </div>
                <button type="button" className="primary-button ripple-button" onClick={() => openCycle(cycle.id)}>
                  <Icon name="eye" />
                  Abrir coleta
                </button>
              </article>
            );
          })}
        </div>
      </section>

    </div>
  );
}

function FocalDecision({
  negative,
  onForward,
  onReturn,
}: {
  negative: boolean;
  onForward: () => void;
  onReturn: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div>
      <label className="field-label">
        <span>Observação da devolução</span>
        <textarea
          aria-label="Observacao da devolucao"
          placeholder="Explique o que o respondente precisa ajustar — a devolução reabre a coleta."
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      <div className="decision-actions">
        <button
          type="button"
          className="danger-button ripple-button"
          disabled={!reason.trim()}
          onClick={() => onReturn(reason.trim())}
        >
          <Icon name="refresh" />
          Devolver ao respondente
        </button>
        <button type="button" className="primary-button ripple-button" onClick={onForward}>
          <Icon name="check" />
          {/* §8.3: na negativa, o focal dá ciência de que o órgão declarou não ter a informação. */}
          {negative ? "Dar ciência da negativa e encaminhar à STC" : "Validar e encaminhar à STC"}
        </button>
      </div>
    </div>
  );
}

function FocalCycleDetail({
  cycle,
  collections,
  respondents,
  onValidate,
  onReturn,
  onRegisterRespondent,
  notify,
  setView,
}: {
  cycle: CycleItem;
  collections: Collection[];
  respondents: Respondent[];
  onValidate: (collectionId: string, submissionId: string) => void;
  onReturn: (collectionId: string, submissionId: string, reason: string) => void;
  onRegisterRespondent: (name: string, email: string, collectionId: string) => void;
  notify: (message: string) => void;
  setView: (view: View) => void;
}) {
  const orgCollections = collections.filter(
    (item) => item.cycleId === cycle.id && item.ugId === focalUser.ugId,
  );
  const otherUgs = cycle.ugIds.filter((id) => id !== focalUser.ugId);
  // §8.2: 1 coleta por órgão no ciclo — um único formulário de pré-cadastro atende o bloco.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  return (
    <div className="workflow-page wide-page">
      <SectionHeader
        eyebrow="Coleta do órgão"
        title={cycle.title}
        description="Todas as respostas do seu órgão, com a identificação de quem enviou — e o cadastro de respondentes desta coleta."
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
              <span>outros órgãos na coleta</span>
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
          <span className="eyebrow">Respostas da coleta</span>
          <h3>Quem respondeu, quando e em que estado está</h3>
          {orgCollections.map((collection) => {
            const sent = collection.submissions.filter((item) => item.status !== "rascunho");
            const collectionPeople = respondents.filter((person) =>
              person.collectionIds.includes(collection.id),
            );
            const register = () => {
              if (!name.trim() || !email.trim()) return;
              onRegisterRespondent(name.trim(), email.trim(), collection.id);
              setName("");
              setEmail("");
            };
            return (
              <div key={collection.id} className="collection-block">
                <span className="link-chip">
                  <Icon name="link" size={14} />
                  {collectionLink(collection)}
                </span>

                {sent.length ? (
                  <div className="collection-log">
                    {/* §8.2: log de quem respondeu — nome, setor, data. */}
                    {sent.map((sub) => (
                      <small key={sub.id}>
                        {sub.respondentName} ·{" "}
                        {respondents.find((item) => item.id === sub.respondentId)?.role ?? "Respondente técnico"} ·{" "}
                        {sub.submittedAt}
                      </small>
                    ))}
                  </div>
                ) : null}

                {sent.length ? (
                  sent.map((submission) => (
                    <SubmissionBlock
                      key={submission.id}
                      submission={submission}
                      respondent={respondents.find((item) => item.id === submission.respondentId)}
                      requiredAttachments={collection.requiredAttachments}
                    >
                      <>
                        {submission.fileName ? (
                          <div className="card-actions compact">
                            {/* §8.3: acesso à planilha e aos anexos da submissão (simulado). */}
                            <button
                              type="button"
                              className="ghost-button"
                              onClick={() => notify(`Download simulado: ${submission.fileName}`)}
                            >
                              <Icon name="download" size={14} />
                              Abrir planilha
                            </button>
                            {submission.attachments.length ? (
                              <button
                                type="button"
                                className="ghost-button"
                                onClick={() => notify(`Download simulado: ${submission.attachments.length} anexo(s)`)}
                              >
                                <Icon name="file" size={14} />
                                Baixar anexos
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                        {submission.status === "aguardando-ponto-focal" ? (
                          <FocalDecision
                            negative={submission.isNegative}
                            onForward={() => onValidate(collection.id, submission.id)}
                            onReturn={(reason) => onReturn(collection.id, submission.id, reason)}
                          />
                        ) : null}
                      </>
                    </SubmissionBlock>
                  ))
                ) : (
                  <div className="empty-state">
                    <Icon name="clock" size={28} />
                    <strong>Nenhuma resposta ainda</strong>
                    <span>O link da coleta está no SEI — qualquer pessoa do órgão pode responder.</span>
                  </div>
                )}

                {/* §8.2: adicionar respondente AQUI, dentro da coleta — o lugar natural. */}
                <div className="collection-people">
                  <span className="eyebrow">Quem pode responder por esta coleta</span>
                  <div className="person-list">
                    {collectionPeople.map((person) => (
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
                      Adicionar respondente
                    </button>
                  </div>
                  <p className="muted-text">
                    Pré-cadastrar aqui adiciona a pessoa a esta coleta; quem chega pelo link se cadastra
                    sozinho (auto-cadastro).
                  </p>
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}

function RespGeneralAccess({
  onLogin,
}: {
  onLogin: (email: string, password: string) => boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (onLogin(email, password)) return;
    setError("Cadastro não encontrado — confira o e-mail ou entre pelo link recebido no SEI.");
  };

  return (
    <div className="workflow-page access-page">
      <SectionHeader
        eyebrow="Acesso do respondente"
        title="Entrar nas minhas coletas"
        description="Use seu cadastro para ver somente as coletas às quais você está vinculado."
      />
      <section className="card general-access-card">
        <p className="muted-text general-access-note">
          Acesso simulado localmente neste protótipo — nenhuma autenticação real é realizada.
        </p>
        <label htmlFor="respondent-general-email">
          E-mail do respondente
          <input
            id="respondent-general-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError("");
            }}
          />
        </label>
        <label htmlFor="respondent-general-password">
          Senha do respondente
          <input
            id="respondent-general-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError("");
            }}
          />
        </label>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          className="primary-button"
          disabled={!email.trim() || !password.trim()}
          onClick={submit}
        >
          Acessar minhas coletas
        </button>
      </section>
    </div>
  );
}

function RespAccess({
  collection,
  cycle,
  ugList,
  onRegister,
  onLogin,
}: {
  collection: Collection;
  cycle: CycleItem | undefined;
  ugList: Ug[];
  onRegister: (data: { name: string; email: string; phone: string; role: string; ugId: string }) => void;
  onLogin: (email: string) => boolean;
}) {
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

  const ug = ugList.find((item) => item.id === collection.ugId);
  const mismatch = form.ugId !== collection.ugId;
  const canContinue = form.name.trim() && form.email.trim() && form.role.trim();

  return (
    <div className="workflow-page wide-page">
      <SectionHeader
        eyebrow="Acesso pelo link da coleta"
        title="Identifique-se para responder"
        description="Toda resposta é enviada em nome do órgão e fica registrada com o nome de quem enviou."
      />

      {/* §5: cabeçalho fixo — a pessoa chegou de um link e precisa saber onde está. */}
      <section className="card access-context">
        <Icon name="link" />
        <div>
          <span>Você chegou pelo link desta coleta</span>
          <strong>
            {collection.objectCode} · {collection.objectName}
          </strong>
          <span>
            {ug?.name ?? collection.ugId} · prazo {cycle?.deadline ?? "—"} · SEI {cycle?.seiNumber || "a informar"}
          </span>
        </div>
      </section>

      {/* §5: duas portas em pé de igualdade, claramente separadas. */}
      <div className="access-doors">
        <section className="card access-door">
          <span className="eyebrow">Primeiro acesso</span>
          <h3>Criar cadastro</h3>
          <p className="muted-text">Nome, e-mail, telefone, cargo e órgão — com validação por e-mail e senha.</p>

        {step === 1 ? (
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
                  {ugList.filter((item) => item.id !== "stc").map((item) => (
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

        {step === 2 ? (
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

        </section>

        <section className="card access-door">
          <span className="eyebrow">Já tenho cadastro</span>
          <h3>Entrar</h3>
          <p className="muted-text">Use o e-mail e a senha criados no primeiro acesso.</p>
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
        </section>
      </div>
    </div>
  );
}

function RespDashboard({
  respondent,
  collections,
  cycles,
  ugList,
  openCollection,
}: {
  respondent: Respondent;
  collections: Collection[];
  cycles: CycleItem[];
  ugList: Ug[];
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
        eyebrow={`Respondente técnico · ${ugList.find((item) => item.id === respondent.ugId)?.acronym ?? ""}`}
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

        {!myCollections.length ? (
          <div className="empty-state">
            <Icon name="clipboard" size={28} />
            <strong>Você não tem coletas para responder</strong>
            <span>
              Quando a STC abrir uma coleta para o seu órgão, ela aparece aqui — você também pode chegar
              direto pelo link que veio no SEI.
            </span>
          </div>
        ) : null}
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
                    {ugList.find((item) => item.id === collection.ugId)?.name ?? collection.ugId} ·{" "}
                    {kindLabel(collection.kind)}
                  </span>
                  {status === "reaberto" && own ? (
                    <p>{own.rejectionReason}</p>
                  ) : (
                    <p>
                      {collection.kind === "fixo"
                        ? cycle?.spreadsheetStatus === "fixed-template-pending"
                          ? `Modelo fixo ${collection.objectCode} pendente de vinculação`
                          : "Modelo fixo disponível para download"
                        : "Planilha gerada pela STC"}
                      {collection.requiredAttachments.length
                        ? ` · ${collection.requiredAttachments.length} anexos obrigatórios.`
                        : "."}
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

// §7: as quatro etapas do wizard — todas clicáveis, dá para ir e voltar a qualquer momento.
function wizardStepDefs(downloaded: boolean, planilhaOk: boolean, anexosOk: boolean, sent: boolean): StepDefinition[] {
  return [
    ["Como responder", downloaded ? "done" : "active"],
    ["Preencher e subir", planilhaOk ? "done" : "active"],
    ["Anexos obrigatórios", anexosOk ? "done" : "active"],
    ["Comprovante", sent ? "done" : "todo"],
  ];
}

// Correção 3: o nome do arquivo é livre — os exemplos simulam uploads com títulos quaisquer.
const sampleUploadNames = [
  "oficio_resposta.pdf",
  "digitalizacao_setor.pdf",
  "documento (1).pdf",
  "comprovantes_2026.zip",
  "foto_arquivo.jpeg",
  "anexo_final_v2.pdf",
];

export function attachmentsMeetRequirement(sent: number, required: number): boolean {
  return sent >= required;
}

function RespCollection({
  collection,
  cycle,
  submission,
  fieldDefs,
  requiresFocal,
  notify,
  ugList,
  onSaveDraft,
  onSend,
  onSendNegative,
  onReportMissing,
  setView,
}: {
  collection: Collection;
  cycle: CycleItem | undefined;
  submission: Submission | undefined;
  fieldDefs: FieldDefinition[];
  requiresFocal: boolean;
  notify: (message: string) => void;
  ugList: Ug[];
  onSaveDraft: (fileName: string, attachments: string[]) => void;
  onSend: (fileName: string, attachments: string[]) => void;
  onSendNegative: (reason: string) => void;
  onReportMissing: (reason: string) => void;
  setView: (view: View) => void;
}) {
  const correcting = submission?.status === "reaberto";
  // Enviada (fora rascunho/reaberto) = não editável: o wizard abre direto no comprovante (etapa 4).
  const sent = Boolean(submission) && submission?.status !== "rascunho" && submission?.status !== "reaberto";
  const readOnly = sent;
  const hasReceipts = Boolean(submission?.receipts.length);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(sent ? 4 : correcting ? 2 : 1);
  const [fileName, setFileName] = useState(submission?.fileName ?? "");
  const [attachments, setAttachments] = useState<string[]>(submission?.attachments ?? []);
  const [sheetOutOfModel, setSheetOutOfModel] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [negativeOpen, setNegativeOpen] = useState(false);
  const [negativeReason, setNegativeReason] = useState("");
  const [contactOpen, setContactOpen] = useState(false);
  const [contactReason, setContactReason] = useState("");
  const [downloaded, setDownloaded] = useState(false);

  const ug = ugList.find((item) => item.id === collection.ugId);
  const required = collection.requiredAttachments;
  const fixedTemplatePending =
    collection.kind === "fixo" && cycle?.spreadsheetStatus === "fixed-template-pending";
  // Correção 3: checagem de anexos por CONTAGEM — enviados ≥ exigidos. Nunca pelo título,
  // nunca pelo conteúdo; pode enviar mais que o exigido, nunca menos.
  const anexosOk = attachmentsMeetRequirement(attachments.length, required.length);
  // Correção 4 (protótipo sem backend): a leitura das colunas é simulada; o controle abaixo
  // força "planilha fora do modelo" para o caminho de reprovação ser demonstrável.
  const planilhaOk = !fixedTemplatePending && Boolean(fileName) && !sheetOutOfModel;
  const structuralOk = !fixedTemplatePending && planilhaOk && anexosOk;
  const missingCount = required.length - attachments.length;
  const templateName = `${collection.objectCode}_planilha_${collection.kind === "fixo" ? "padrao" : "gerada"}.xlsx`;
  const uploadName = `${collection.objectCode.toLowerCase()}_${collection.ugId}_${correcting ? "corrigida" : "preenchida"}.xlsx`;

  const addAttachment = () => {
    setAttachments([...attachments, sampleUploadNames[attachments.length % sampleUploadNames.length]]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, position) => position !== index));
  };

  return (
    <div className="workflow-page wide-page wizard-page">
      {/* §7: sempre visível — em que coleta estou, prazo e o botão de voltar ao painel. */}
      <div className="card wizard-topbar">
        <div>
          <span className="eyebrow">
            {collection.objectCode} · {ug?.acronym ?? collection.ugId} · {kindLabel(collection.kind)}
          </span>
          <h2>{collection.objectName}</h2>
          <span className="wizard-deadline">
            prazo {cycle?.deadline ?? "—"}
            {cycle ? ` · ${deadlineContext(cycle.deadline)}` : ""} · SEI {cycle?.seiNumber || "a informar"}
          </span>
        </div>
        <div className="wizard-topbar-side">
          <StatusPill tone={submissionTone(submission?.status ?? "pendente")}>
            {submissionLabel(submission?.status ?? "pendente")}
          </StatusPill>
          <button type="button" className="secondary-button" onClick={() => setView("resp-dashboard")}>
            <Icon name="arrow" />
            Voltar ao painel
          </button>
        </div>
      </div>

      <nav className="wizard-stepper" aria-label="Etapas da resposta">
        {wizardStepDefs(downloaded, planilhaOk, anexosOk, sent).map(([label, state], index) => (
          <button
            key={label}
            type="button"
            className={`wizard-step ${state}${step === index + 1 ? " current" : ""}`}
            aria-current={step === index + 1 ? "step" : undefined}
            onClick={() => setStep((index + 1) as 1 | 2 | 3 | 4)}
          >
            <span>{state === "done" ? <Icon name="check" size={13} /> : index + 1}</span>
            <strong>{label}</strong>
          </button>
        ))}
      </nav>

      <section className="card response-flow dedicated-response">
        {readOnly && step !== 4 ? (
          <div className="alert">
            <Icon name="clipboard" />
            <div>
              <strong>Resposta enviada — consulta somente leitura</strong>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <>
            {/* §7.1: a aba que ensina — escrita para quem nunca viu o sistema. */}
            <div className="howto-grid">
              <article className="howto-card">
                <span className="eyebrow">O que a STC está pedindo</span>
                <p>
                  As informações de <strong>{collection.objectName}</strong> do órgão{" "}
                  {ug?.name ?? collection.ugId}, preenchidas na planilha-padrão e enviadas com os
                  documentos anexos até {cycle?.deadline ?? "o prazo indicado"}.
                </p>
              </article>

              <article className="howto-card">
                <span className="eyebrow">Como funciona</span>
                <div className="howto-flow">
                  <span>1 · Baixar a planilha</span>
                  <span>2 · Preencher</span>
                  <span>3 · Subir o arquivo</span>
                  <span>4 · Anexar os documentos</span>
                  <span>5 · Enviar</span>
                  <span>6 · Receber o comprovante</span>
                </div>
                <button
                  type="button"
                  className="ghost-button"
                  disabled={fixedTemplatePending}
                  onClick={() => setDownloaded(true)}
                >
                  <Icon name="download" size={16} />
                  {fixedTemplatePending
                    ? `Modelo fixo ${collection.objectCode} pendente de vinculação`
                    : downloaded
                      ? "Planilha baixada (simulado)"
                      : "Baixar planilha-padrão"}
                </button>
              </article>

              <article className="howto-card span-2">
                <span className="eyebrow">Como preencher a planilha</span>
                <p>
                  Cada coluna abaixo é uma coluna da planilha. Não mude os títulos nem a ordem — o
                  sistema confere a estrutura na hora do envio.
                </p>
                <div className="field-table-scroll">
                  <table className="field-table">
                    <thead>
                      <tr>
                        <th>Coluna</th>
                        <th>Obrigatória?</th>
                        <th>Formato</th>
                        <th>Como preencher</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fieldDefs.map((field) => (
                        <tr key={field.id}>
                          <td>{field.label}</td>
                          <td>{field.required === false ? "Opcional" : "Sim"}</td>
                          <td>{field.type}</td>
                          <td>{field.hint}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="howto-card">
                <span className="eyebrow">Anexos obrigatórios</span>
                {required.length ? (
                  <>
                    <p>
                      São {required.length} documento(s): {required.join(" · ")}.{" "}
                      <strong>O nome do arquivo não importa</strong> — a conferência é pela
                      quantidade de arquivos enviados.
                    </p>
                    <p className="muted-text">Pode enviar mais do que o exigido; nunca menos.</p>
                  </>
                ) : (
                  <p>Esta coleta não exige anexos — só a planilha preenchida.</p>
                )}
              </article>

              <article className="howto-card">
                <span className="eyebrow">O que acontece depois</span>
                <p>
                  {requiresFocal
                    ? "Sua resposta vai primeiro ao ponto focal do seu órgão, que valida e encaminha à STC."
                    : "Sua resposta vai direto para a análise da STC."}{" "}
                  Se algo precisar de ajuste, a resposta volta para você com a observação de quem
                  pediu — é a "devolução". No fim, você recebe um comprovante com protocolo.
                </p>
              </article>

              <article className="howto-card">
                <span className="eyebrow">Se algo faltar</span>
                <p>
                  Não tem a informação? Registre uma <strong>resposta negativa</strong> — vale como
                  resposta oficial do órgão. Falta um anexo? Na etapa 3 dá para{" "}
                  <strong>avisar a STC</strong> com uma justificativa registrada.
                </p>
              </article>
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            {/* §7.2: quando a coleta voltou, a observação de correção é a informação mais importante. */}
            {correcting && submission ? (
              <div className="correction-highlight">
                <div className="correction-head">
                  <Icon name="refresh" />
                  <div>
                    <strong>Devolvida para correção — leia antes de reenviar</strong>
                    <span>O pedido de correção, com autor e data:</span>
                  </div>
                </div>
                <ObservationThread observations={submission.observations} />
              </div>
            ) : null}

            {collection.kind === "fixo" ? (
              <div className="sheet-preview">
                <span className="eyebrow">
                  {fixedTemplatePending
                    ? "Estrutura esperada do modelo fixo (arquivo pendente)"
                    : "Prévia da planilha-padrão"}
                </span>
                <div className="sheet-preview-scroll">
                  <table>
                    <thead>
                      <tr>
                        {fieldDefs.map((field) => (
                          <th key={field.id}>{field.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {fieldDefs.map((field) => (
                          <td key={field.id}>{field.type}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {fixedTemplatePending && !readOnly ? (
              <div className="alert warning wide" role="status">
                <Icon name="clock" />
                <div>
                  <strong>Envio temporariamente indisponível</strong>
                  <span>
                    O modelo fixo {collection.objectCode} ainda não foi vinculado. Não é possível subir ou enviar respostas.
                  </span>
                </div>
              </div>
            ) : null}

        <div className="model-upload-grid">
          <article className="model-preview">
            <span className="eyebrow">
              {collection.kind === "fixo"
                ? "Modelo fixo do Tesauro/Registro"
                : "Planilha-padrão gerada pela STC"}
            </span>
            <h4>{fixedTemplatePending ? `${collection.objectCode} · arquivo pendente` : templateName}</h4>
            <p>
              {fixedTemplatePending
                ? "O código do modelo está registrado, mas o arquivo real ainda precisa ser vinculado pela STC."
                : collection.kind === "fixo"
                  ? "Modelo recorrente do objeto, com os campos e regras mínimas de preenchimento."
                : "Gerada a partir dos campos que a STC selecionou na criação da coleta."}
            </p>
            <div className="mini-sheet">
              {fieldDefs.slice(0, 5).map((field) => (
                <span key={field.id}>{field.label}</span>
              ))}
            </div>
            <button
              type="button"
              className="ghost-button"
              disabled={fixedTemplatePending}
              onClick={() => setDownloaded(true)}
            >
              <Icon name="download" size={16} />
              {fixedTemplatePending
                ? `Modelo fixo ${collection.objectCode} pendente de vinculação`
                : downloaded
                  ? "Modelo baixado (simulado)"
                  : "Baixar planilha-padrão"}
            </button>
          </article>

          <article className="upload-demo">
            <span className="eyebrow">Planilha preenchida</span>
            <h4>Subir o arquivo consolidado</h4>
            {readOnly ? (
              <div className="received-box">
                <Icon name="file" />
                <div>
                  <span>Planilha enviada</span>
                  <strong>{fileName || "Sem planilha — resposta negativa"}</strong>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className={`dropzone${dragging ? " dragging" : ""}`}
                disabled={fixedTemplatePending}
                onClick={() => {
                  if (!fixedTemplatePending) setFileName(uploadName);
                }}
                onDragOver={(event) => {
                  if (!fixedTemplatePending) event.preventDefault();
                }}
                onDragEnter={(event) => {
                  if (fixedTemplatePending) return;
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDragEnd={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  if (fixedTemplatePending) return;
                  setFileName(uploadName);
                }}
              >
                <Icon name="upload" size={28} />
                <strong>Arraste aqui ou clique para simular a seleção</strong>
                <span>{fileName || "XLSX seguindo a estrutura da planilha-padrão"}</span>
              </button>
            )}
            {!readOnly && !fixedTemplatePending && fileName ? (
              <label className="simulate-check">
                <input
                  type="checkbox"
                  checked={sheetOutOfModel}
                  onChange={(event) => setSheetOutOfModel(event.target.checked)}
                />
                Simular planilha fora do modelo (colunas divergentes)
              </label>
            ) : null}
          </article>
        </div>

        {fileName && !planilhaOk && !fixedTemplatePending ? (
          <div className="alert danger wide">
            <Icon name="x" />
            <div>
              <strong>Planilha fora do modelo — envio bloqueado</strong>
              <span>
                As colunas não conferem com a planilha-padrão. Baixe o modelo, mantenha a estrutura
                e suba o arquivo de novo.
              </span>
            </div>
          </div>
        ) : null}

        {/* §7.2/Correção 4: a checagem estrutural mora aqui, com as duas metades separadas. */}
        <div
          className={`quality-strip ${
            fixedTemplatePending
              ? "warning"
              : structuralOk
                ? "success"
                : fileName && !planilhaOk
                  ? "danger"
                  : "warning"
          }`}
        >
          <Icon
            name={
              fixedTemplatePending ? "clock" : structuralOk ? "check" : fileName && !planilhaOk ? "x" : "clock"
            }
          />
          <div>
            <strong>Checagem estrutural no envio — duas conferências independentes</strong>
            <span>
              Planilha:{" "}
              {fixedTemplatePending
                ? "modelo fixo aguardando vinculação"
                : !fileName
                ? "aguardando o arquivo preenchido"
                : planilhaOk
                  ? "colunas conferem ✓"
                  : "fora do modelo ✗"}
              {" · "}Anexos:{" "}
              {required.length
                ? anexosOk
                  ? `${attachments.length} de ${required.length} enviados ✓`
                  : `falta${missingCount > 1 ? "m" : ""} ${missingCount} de ${required.length} ✗`
                : "sem anexos obrigatórios ✓"}
              . O conteúdo das células e os nomes dos arquivos não são lidos — a verificação de
              conteúdo é humana, pela STC.
            </span>
          </div>
        </div>
          </>
        ) : null}

        {step === 3 ? (
          <>
        {required.length ? (
          <div className="review-list">
            <div className="review-item">
              <div>
                <strong>Anexos obrigatórios</strong>
                <span>
                  Um card único com contador: qualquer nome de arquivo vale, pode enviar mais que o
                  exigido — nunca menos.
                </span>
              </div>
              <div className="review-item-actions">
                <StatusPill tone={anexosOk ? "success" : "warning"}>
                  {`${attachments.length} de ${required.length} enviados`}
                </StatusPill>
                {!readOnly ? (
                  <button type="button" className="ghost-button" onClick={addAttachment}>
                    <Icon name="upload" size={14} />
                    Enviar arquivo
                  </button>
                ) : null}
              </div>
            </div>

            <p className="muted-text">O que se espera (referência, não caixas separadas):</p>
            <div className="tag-cloud">
              {required.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>

            {attachments.length ? (
              <div className="chips">
                {attachments.map((file, index) => (
                  <span key={`${file}-${index}`}>
                    {file}
                    {!readOnly ? (
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        aria-label={`Remover ${file}`}
                      >
                        <Icon name="x" size={12} />
                      </button>
                    ) : null}
                  </span>
                ))}
              </div>
            ) : null}

            {!readOnly && !anexosOk && !contactOpen ? (
              <button type="button" className="ghost-button" onClick={() => setContactOpen(true)}>
                <Icon name="mail" size={16} />
                Não tenho todos os anexos — falar com a STC
              </button>
            ) : null}

            {!readOnly && contactOpen ? (
              <div className="negative-panel">
                {/* TODO(P-023): a justificativa NÃO destrava o envio (decisão pendente na STC). */}
                <strong>Falar com a STC — anexos incompletos</strong>
                <p>
                  Justificativa registrada, presa à coleta — não é um chat. O envio continua
                  bloqueado até completar os anexos exigidos.
                </p>
                <textarea
                  placeholder="Explique por que não tem todos os anexos (ex.: documento sob guarda de outro setor)."
                  value={contactReason}
                  onChange={(event) => setContactReason(event.target.value)}
                />
                <div className="card-actions">
                  <button type="button" className="secondary-button" onClick={() => setContactOpen(false)}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="primary-button ripple-button"
                    disabled={!contactReason.trim()}
                    onClick={() => {
                      onReportMissing(contactReason.trim());
                      setContactReason("");
                      setContactOpen(false);
                    }}
                  >
                    <Icon name="send" />
                    Registrar justificativa
                  </button>
                </div>
              </div>
            ) : null}

            {collection.attachmentJustifications.length ? (
              <>
                <p className="muted-text">Justificativas já registradas para a STC:</p>
                <ObservationThread observations={collection.attachmentJustifications} />
              </>
            ) : null}
          </div>
        ) : null}

            {!required.length ? (
              <div className="empty-state">
                <Icon name="check" size={28} />
                <strong>Esta coleta não exige anexos</strong>
                <span>Nada a juntar aqui — volte à etapa 2 para enviar e receba o comprovante na etapa 4.</span>
              </div>
            ) : null}
          </>
        ) : null}

        {step === 4 ? (
          <>
            {/* §7.4: o comprovante — e o que acontece agora. */}
            {hasReceipts && submission ? (
              <>
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
                  <div className="quality-strip success">
                    <Icon name="check" />
                    <div>
                      <strong>Resposta aprovada pela STC</strong>
                      <span>A coleta segue para fechamento; o comprovante fica disponível abaixo.</span>
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

                <ReceiptTimeline submission={submission} seiNumber={cycle?.seiNumber ?? ""} compact />

                <div className="alert">
                  <Icon name="arrow" />
                  <div>
                    <strong>O que acontece agora</strong>
                    <span>
                      {requiresFocal
                        ? "Sua resposta vai primeiro ao ponto focal do órgão, que valida e encaminha à STC."
                        : "Sua resposta vai direto para a análise da STC."}{" "}
                      Se algo precisar de ajuste, ela volta para você com a observação registrada — e o
                      comprovante abaixo é a garantia de que a resposta chegou.
                    </span>
                  </div>
                </div>

                <ObservationThread observations={submission.observations} />

                <div className="card-actions">
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => notify("Comprovante baixado (simulado)")}
                  >
                    <Icon name="download" size={16} />
                    Baixar / imprimir (simulado)
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <Icon name="clipboard" size={28} />
                <strong>Envie a resposta para gerar o comprovante</strong>
                <span>O protocolo, a data, quem enviou e o que foi enviado aparecem aqui.</span>
              </div>
            )}
          </>
        ) : null}

        {!readOnly && negativeOpen ? (
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

        {!sent && (step === 2 || step === 3) ? (
          <>
            <div className="wizard-actions">
              {!correcting ? (
                <>
                  <button
                    type="button"
                    className="ghost-button"
                    disabled={fixedTemplatePending}
                    onClick={() => {
                      if (!fixedTemplatePending) setNegativeOpen(true);
                    }}
                  >
                    <Icon name="x" size={16} />
                    Não tenho esta informação
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={fixedTemplatePending || (!fileName && !attachments.length)}
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
            {!structuralOk ? (
              <p className="wizard-block-hint">
                {fixedTemplatePending
                  ? `Aguarde a STC vincular o modelo fixo ${collection.objectCode} antes de responder. `
                  : !fileName
                  ? "Suba a planilha preenchida na etapa 2. "
                  : !planilhaOk
                    ? "A planilha está fora do modelo — baixe o modelo e suba de novo (etapa 2). "
                    : ""}
                {required.length && !anexosOk
                  ? `Falta${missingCount > 1 ? "m" : ""} ${missingCount} anexo${missingCount > 1 ? "s" : ""} — envie os arquivos na etapa 3 ou avise a STC por lá.`
                  : ""}
              </p>
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState<Role>("login");
  const [view, setView] = useState<View>("stc-home");
  const [cycles, setCycles] = useState<CycleItem[]>(seedCycles);
  const [collections, setCollections] = useState<Collection[]>(seedCollections);
  const [respondents, setRespondents] = useState<Respondent[]>(seedRespondents);
  // §4.2: as UGs são cadastráveis na tela de Registro — por isso viram estado, não constante.
  const [ugList, setUgList] = useState<Ug[]>(seedUgs);
  const [toast, setToast] = useState("");
  const toastIsClipboardError = toast === "Não foi possível copiar — selecione o link exibido";
  // §4/TODO(P-022): o Registro é a base local (stand-in do mapeamento informação↔órgão que a STR
  // ainda vai montar). O Tesauro segue fonte externa (T2) — nada aqui edita o Tesauro.
  const [objectOverrides, setObjectOverrides] = useState<Record<string, Partial<TransparencyObject>>>({});
  const [customObjects, setCustomObjects] = useState<TransparencyObject[]>([]);
  const [objectAttachmentsRegistry, setObjectAttachmentsRegistry] = useState<Record<string, string[]>>({});
  const [objectFieldsRegistry, setObjectFieldsRegistry] = useState<Record<string, FieldDefinition[]>>({});
  const [currentRespondentId, setCurrentRespondentId] = useState("");
  // §2.1: funil invertido — o TIPO é escolhido antes do objeto; a tela nasce sem objeto selecionado.
  const [createKind, setCreateKind] = useState<ObjectKind | null>(null);
  const [objectId, setObjectId] = useState("");
  const [selectedUgs, setSelectedUgs] = useState<string[]>([]);
  const [selectedMetadataIds, setSelectedMetadataIds] = useState<string[]>([]);
  const [draft, setDraft] = useState<CycleDraft>(draftForObject(defaultObject));
  const [activeCycleId, setActiveCycleId] = useState("ciclo-100");
  const [editingCycleId, setEditingCycleId] = useState("");
  const [reviewCycleId, setReviewCycleId] = useState("");
  const [activeCollectionId, setActiveCollectionId] = useState("col-100-seduc");
  const [linkCollectionId, setLinkCollectionId] = useState("col-100-seduc");
  const [validationCollectionId, setValidationCollectionId] = useState("col-100-seduc");
  const [profileOpen, setProfileOpen] = useState(false);

  const allObjects = useMemo(
    () => [
      ...transparencyObjects.map((item) => ({ ...item, ...(objectOverrides[item.id] ?? {}) })),
      ...customObjects,
    ],
    [objectOverrides, customObjects],
  );
  const fieldsFor = (object: TransparencyObject): FieldDefinition[] =>
    objectFieldsRegistry[object.code] ?? [...object.fields];
  const fieldCatalogForCycles = useMemo(() => {
    const fieldsById = new Map<string, FieldDefinition>();
    canonicalFields.forEach((field) => fieldsById.set(field.id, { ...field }));
    allObjects.forEach((object) =>
      (objectFieldsRegistry[object.code] ?? object.fields).forEach((field) =>
        fieldsById.set(field.id, { ...field }),
      ),
    );
    return Array.from(fieldsById.values()).sort((left, right) =>
      left.label.localeCompare(right.label, "pt-BR"),
    );
  }, [allObjects, objectFieldsRegistry]);
  const selectedObject = allObjects.find((item) => item.id === objectId) ?? null;
  // §7.1/§7.2: o wizard explica coluna a coluna — resolve a definição de cada campo da coleta
  // (a coleta guarda só os rótulos escolhidos na criação; a definição vem do objeto/registro).
  const fieldDefsForCollection = (collection: Collection): FieldDefinition[] => {
    const cycle = cycles.find((item) => item.id === collection.cycleId);
    if (!cycle) return [];
    return cycle.metadataIds.map((fieldId, index) => {
      const label = cycle.metadataLabels[index] ?? fieldId;
      return (
        fieldCatalogForCycles.find((field) => field.id === fieldId) ?? {
          id: fieldId,
          label,
          type: "Texto",
          hint: "Preencha conforme o pedido da STC.",
          required: false,
        }
      );
    });
  };
  const activeCycle = cycles.find((cycle) => cycle.id === activeCycleId) ?? cycles[0];
  const editingCycle = cycles.find((cycle) => cycle.id === editingCycleId) ?? null;
  const activeCollection =
    collections.find((item) => item.id === activeCollectionId) ?? collections[0];
  const linkCollection = collections.find((item) => item.id === linkCollectionId) ?? collections[0];
  const currentRespondent = respondents.find((item) => item.id === currentRespondentId) ?? null;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [role, view, objectId, activeCycleId, activeCollectionId]);

  useEffect(() => {
    if (view !== "stc-create") setEditingCycleId("");
  }, [view]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const setRoleAndReset = (nextRole: Role) => {
    setRole(nextRole);
    setProfileOpen(false);
    if (isStcRole(nextRole)) setView("stc-home");
    if (nextRole === "ponto-focal") setView("focal-dashboard");
    if (nextRole === "respondente")
      setView(currentRespondentId ? "resp-dashboard" : "resp-general-access");
  };

  const applySubmissions = (collectionId: string, mutate: (subs: Submission[]) => Submission[]) => {
    const target = collections.find((item) => item.id === collectionId);
    if (!target) return;
    const nextCollections = collections.map((item) =>
      item.id === collectionId ? { ...item, submissions: mutate(item.submissions) } : item,
    );
    setCollections(nextCollections);
    setCycles(
      cycles.map((cycle) =>
        cycle.id === target.cycleId
          ? { ...cycle, status: deriveCycleStatus(cycle, nextCollections) }
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
    receipts: previous?.receipts ?? [],
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

  const cycleOfCollection = (collectionId: string) =>
    cycles.find((item) => item.id === collections.find((col) => col.id === collectionId)?.cycleId);

  const sendSubmission = (collectionId: string, fileName: string, attachments: string[]) => {
    const cycle = cycleOfCollection(collectionId);
    upsertOwnSubmission(collectionId, (previous) => {
      // Correção 1: o reenvio é o restart do fluxo — sai em nome do órgão e passa pelo ponto
      // focal DE NOVO quando o toggle está ligado. `resending` só muda o texto, nunca o status.
      const resending = previous?.status === "reaberto";
      const protocol = previous?.protocol || nextProtocol();
      const summary = resending
        ? "Correção reenviada pela plataforma."
        : "Planilha e anexos enviados pela plataforma.";
      return {
        ...ownSubmissionBase(collectionId, previous),
        receipts: [
          ...(previous?.receipts ?? []),
          createReceipt(
            "envio",
            protocol,
            currentRespondent?.name ?? "",
            today,
            previous?.receipts.length ?? 0,
            summary,
          ),
        ],
        status: statusAfterRespondentSend(Boolean(cycle?.requiresFocalPointValidation), false),
        protocol,
        fileName,
        attachments,
        submittedAt: today,
        observations: [
          ...(previous?.observations ?? []),
          {
            author: currentRespondent?.name ?? "",
            date: today,
            text: summary,
          },
        ],
      };
    });
  };

  const sendNegativeSubmission = (collectionId: string, reason: string) => {
    const cycle = cycleOfCollection(collectionId);
    upsertOwnSubmission(collectionId, (previous) => {
      const protocol = previous?.protocol || nextProtocol();
      return {
        ...ownSubmissionBase(collectionId, previous),
        receipts: [
          ...(previous?.receipts ?? []),
          createReceipt(
            "envio",
            protocol,
            currentRespondent?.name ?? "",
            today,
            previous?.receipts.length ?? 0,
            `Resposta negativa registrada: ${reason}`,
          ),
        ],
        // Correção 2: isNegative é a MARCA da submissão; o status diz onde ela está no fluxo —
        // a afirmação institucional "não temos esta informação" também respeita o gate do focal.
        status: statusAfterRespondentSend(Boolean(cycle?.requiresFocalPointValidation), true),
        protocol,
        fileName: "",
        attachments: [],
        submittedAt: today,
        isNegative: true,
        observations: [
          ...(previous?.observations ?? []),
          { author: currentRespondent?.name ?? "", date: today, text: reason },
        ],
      };
    });
  };

  const focalValidateSubmission = (collectionId: string, submissionId: string) => {
    applySubmissions(collectionId, (submissions) =>
      submissions.map((item) =>
        item.id === submissionId
          ? {
              ...item,
              // Correção 2: o encaminhamento respeita a marca — a negativa segue como estado próprio.
              status: statusAfterFocal(item.isNegative),
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

  const focalReturnSubmission = (collectionId: string, submissionId: string, reason: string) => {
    applySubmissions(collectionId, (submissions) =>
      submissions.map((item) =>
        item.id === submissionId
          ? {
              ...item,
              status: "reaberto",
              rejectionReason: reason,
              observations: [
                ...item.observations,
                { author: `${focalUser.name} · ponto focal`, date: today, text: reason },
              ],
            }
          : item,
      ),
    );
  };

  // TODO(P-023): a justificativa não destrava o envio — pendência a levar à STC.
  const reportMissingAttachments = (collectionId: string, reason: string) => {
    setCollections(
      collections.map((item) =>
        item.id === collectionId
          ? {
              ...item,
              attachmentJustifications: [
                ...item.attachmentJustifications,
                { author: currentRespondent?.name ?? "", date: today, text: reason },
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
            receipts: [
              ...item.receipts,
              createReceipt(
                "rejeicao",
                item.protocol,
                "Equipe STC",
                today,
                item.receipts.length,
                reason || "Correção solicitada pela STC.",
              ),
            ],
            status: "reaberto",
            rejectionReason: reason,
            observations: [...item.observations, { author: "Equipe STC", date: today, text: reason }],
          };
        }
        const closingSummary = item.isNegative
          ? "Ciência registrada: o órgão declarou não deter a informação."
          : "Resposta aprovada. Coleta fechada.";
        return {
          ...item,
          receipts: [
            ...item.receipts,
            createReceipt(
              "fechamento",
              item.protocol,
              "Equipe STC",
              today,
              item.receipts.length,
              closingSummary,
            ),
          ],
          status: "aprovado",
          rejectionReason: "",
          observations: [
            ...item.observations,
            {
              author: "Equipe STC",
              date: today,
              text: closingSummary,
            },
          ],
        };
      }),
    );
  };

  const submitCycleForReview = () => {
    const isFixed = draft.kind === "fixo";
    if (
      !createKind ||
      (isFixed && !selectedObject) ||
      (!isFixed && (!draft.variableObjectCode || !draft.variableObjectName.trim())) ||
      !selectedUgs.length ||
      !selectedMetadataIds.length ||
      !draft.title.trim() ||
      !draft.notificationChannel.trim()
    )
      return;
    const objectCode = isFixed ? selectedObject!.code : draft.variableObjectCode;
    const objectName = isFixed ? titleCase(selectedObject!.name) : draft.variableObjectName.trim();
    const selectedFields = fieldCatalogForCycles.filter((field) =>
      selectedMetadataIds.includes(field.id),
    );
    const requiredAttachments = draft.requiredAttachments.map((item) => item.trim()).filter(Boolean);

    if (editingCycle) {
      const nextDraft: CycleReviewDraft = {
        title: draft.title.trim(),
        objectCode,
        objectName,
        objectKind: draft.kind,
        deadline: draft.deadline,
        seiNumber: draft.seiNumber,
        ugIds: [...selectedUgs],
        metadataIds: [...selectedMetadataIds],
        requiredAttachments,
        requiresFocalPointValidation: draft.requiresFocalPointValidation,
        creationObservations: draft.observations,
        notificationChannel: draft.notificationChannel.trim(),
      };
      const changes = describeReviewChanges(editingCycle, nextDraft);
      const wasReturned = editingCycle.creationStatus === "ajustes-solicitados";
      setCycles(
        cycles.map((cycle) =>
          cycle.id === editingCycle.id
            ? {
                ...cycle,
                ...nextDraft,
                metadataLabels: selectedFields.map((field) => field.label),
                spreadsheetStatus: "pending-approval",
                creationStatus: "aguardando-analise",
                lastUpdatedAt: today,
                lastUpdatedBy: "Analista STC",
                reviewHistory: [
                  ...cycle.reviewHistory,
                  {
                    id: `${cycle.id}-analista-${cycle.reviewHistory.length + 1}`,
                    type: wasReturned ? "reenviado" : "alterado",
                    author: "Analista STC",
                    date: today,
                    message: wasReturned
                      ? "Ajustes concluídos e ciclo reenviado para análise."
                      : "Configuração atualizada enquanto aguardava análise.",
                    changes,
                  },
                ],
              }
            : cycle,
        ),
      );
      setToast(wasReturned ? "Ciclo reenviado para análise" : "Alterações salvas para análise");
      setView("stc-dashboard");
      return;
    }

    const cycleNumber = 100 + cycles.length;
    const cycleId = `ciclo-${cycleNumber}`;
    const cycle: CycleItem = {
      id: cycleId,
      title: draft.title.trim(),
      objectCode,
      objectName,
      objectKind: draft.kind,
      createdAt: today,
      createdAtIso: new Date().toISOString(),
      deadline: draft.deadline,
      status: "ativo",
      seiNumber: draft.seiNumber,
      ugIds: [...selectedUgs],
      metadataLabels: selectedFields.map((field) => field.label),
      metadataIds: selectedFields.map((field) => field.id),
      collectionIds: [],
      requiresFocalPointValidation: draft.requiresFocalPointValidation,
      requiredAttachments,
      creationStatus: "aguardando-analise",
      creationObservations: draft.observations,
      notificationChannel: draft.notificationChannel.trim(),
      lastUpdatedAt: today,
      lastUpdatedBy: "Analista STC",
      reviewHistory: [
        {
          id: `${cycleId}-enviado-1`,
          type: "enviado",
          author: "Analista STC",
          date: today,
          message: "Ciclo enviado para análise da criação.",
          changes: [],
        },
      ],
      spreadsheetStatus: "pending-approval",
    };
    setCycles([...cycles, cycle]);
    setActiveCycleId(cycleId);
    setCreateKind(null);
    setObjectId("");
    setToast("Ciclo enviado para análise da criação");
    setView("stc-dashboard");
  };

  const openCycleCreation = (cycleId: string) => {
    const cycle = cycles.find((item) => item.id === cycleId);
    const object = cycle ? allObjects.find((item) => item.code === cycle.objectCode) : null;
    if (
      !cycle ||
      (cycle.objectKind === "fixo" && !object) ||
      cycle.creationStatus === "aprovado"
    )
      return;
    setEditingCycleId(cycle.id);
    setCreateKind(cycle.objectKind);
    setObjectId(object?.id ?? "");
    setSelectedUgs([...cycle.ugIds]);
    setSelectedMetadataIds([...cycle.metadataIds]);
    setDraft({
      title: cycle.title,
      deadline: cycle.deadline,
      seiNumber: cycle.seiNumber,
      observations: cycle.creationObservations,
      notificationChannel: cycle.notificationChannel,
      kind: cycle.objectKind,
      variableObjectCode: cycle.objectKind === "variavel" ? cycle.objectCode : "",
      variableObjectName: cycle.objectKind === "variavel" ? cycle.objectName : "",
      requiredAttachments: [...cycle.requiredAttachments],
      requiresFocalPointValidation: cycle.requiresFocalPointValidation,
    });
    setView("stc-create");
  };

  const reviewCycleCreation = (
    cycleId: string,
    reviewDraft: CycleReviewDraft,
    action: "salvar" | "ajustes" | "aprovar",
    message: string,
  ) => {
    const cycle = cycles.find((item) => item.id === cycleId);
    const object =
      reviewDraft.objectKind === "fixo"
        ? allObjects.find((item) => item.code === reviewDraft.objectCode)
        : null;
    if (
      !cycle ||
      (reviewDraft.objectKind === "fixo" && !object) ||
      (reviewDraft.objectKind === "variavel" && !reviewDraft.objectName.trim()) ||
      cycle.creationStatus === "aprovado"
    )
      return;

    const normalizedDraft: CycleReviewDraft = {
      ...reviewDraft,
      title: reviewDraft.title.trim(),
      objectName:
        reviewDraft.objectKind === "fixo" ? titleCase(object!.name) : reviewDraft.objectName.trim(),
      objectKind: reviewDraft.objectKind,
      requiredAttachments: reviewDraft.requiredAttachments.map((item) => item.trim()).filter(Boolean),
      notificationChannel: reviewDraft.notificationChannel.trim(),
    };
    const fields = fieldCatalogForCycles.filter((field) =>
      normalizedDraft.metadataIds.includes(field.id),
    );
    const changes = describeReviewChanges(cycle, normalizedDraft);
    const event: CycleReviewEvent = {
      id: `${cycle.id}-especialista-${cycle.reviewHistory.length + 1}`,
      type: action === "ajustes" ? "ajustes-solicitados" : action === "aprovar" ? "aprovado" : "alterado",
      author: "Especialista STC",
      date: today,
      message:
        action === "ajustes"
          ? message
          : action === "aprovar"
            ? "Criação aprovada; coletas geradas e enviadas às UGs."
            : "Alterações da análise salvas.",
      changes,
    };
    const reviewedCycle: CycleItem = {
      ...cycle,
      ...normalizedDraft,
      metadataLabels: fields.map((field) => field.label),
      spreadsheetStatus:
        action === "aprovar"
          ? normalizedDraft.objectKind === "variavel"
            ? "generated"
            : "fixed-template-pending"
          : cycle.spreadsheetStatus,
      creationStatus:
        action === "ajustes" ? "ajustes-solicitados" : action === "aprovar" ? "aprovado" : cycle.creationStatus,
      lastUpdatedAt: today,
      lastUpdatedBy: "Especialista STC",
      reviewHistory: [...cycle.reviewHistory, event],
    };

    if (action === "aprovar") {
      const cycleNumber = cycle.id.replace("ciclo-", "");
      const newCollections: Collection[] = normalizedDraft.ugIds
        .map((ugId) => ({
          id: `col-${cycleNumber}-${ugId}`,
          cycleId: cycle.id,
          objectCode: normalizedDraft.objectCode,
          objectName: normalizedDraft.objectName,
          kind: normalizedDraft.objectKind,
          ugId,
          linkToken: `agz-${cycleNumber}-${ugId}`,
          requiredAttachments: [...normalizedDraft.requiredAttachments],
          attachmentJustifications: [],
          submissions: [],
        }))
        .filter((collection) => !collections.some((item) => item.id === collection.id));
      reviewedCycle.collectionIds = newCollections.map((collection) => collection.id);
      reviewedCycle.status = "ativo";
      setCollections([...collections, ...newCollections]);
      if (newCollections[0]) setLinkCollectionId(newCollections[0].id);
      setActiveCycleId(cycle.id);
      setToast("Ciclo aprovado e enviado às UGs");
    } else if (action === "ajustes") {
      setToast("Ajustes solicitados ao analista");
    } else {
      setToast("Alterações do especialista registradas");
    }

    setCycles(cycles.map((item) => (item.id === cycle.id ? reviewedCycle : item)));
    setReviewCycleId(cycle.id);
  };

  const handleKindChange = (kind: ObjectKind) => {
    if (kind === createKind) return;
    setCreateKind(kind);
    setObjectId("");
    setSelectedUgs([]);
    setSelectedMetadataIds([]);
    setDraft(
      kind === "variavel"
        ? draftForVariable(nextVariableCode(cycles))
        : { ...draftForObject(defaultObject), seiNumber: draft.seiNumber },
    );
  };

  const handleObjectChange = (id: string) => {
    const nextObject = allObjects.find((item) => item.id === id);
    if (!nextObject || !createKind) return;
    const availableFields = fieldsFor(nextObject);
    setObjectId(id);
    setSelectedUgs([]);
    setSelectedMetadataIds(requiredFieldIdsForObject(nextObject, availableFields));
    setDraft({
      ...draftForObject(nextObject),
      seiNumber: draft.seiNumber,
    });
  };

  const openValidation = (cycleId: string) => {
    const first = collections.find((item) => item.cycleId === cycleId);
    setActiveCycleId(cycleId);
    if (first) setValidationCollectionId(first.id);
    setView("stc-validation");
  };

  // §1.4: o link (hash) é o que a STC cola no SEI — copiar com confirmação visível.
  const copyCollectionLink = async (collection: Collection) => {
    try {
      await navigator.clipboard.writeText(`https://${collectionLink(collection)}`);
      setToast("Link copiado");
    } catch {
      setToast("Não foi possível copiar — selecione o link exibido");
    }
  };

  const updateRegisteredObject = (
    registeredObjectId: string,
    patch: Pick<TransparencyObject, "code" | "name" | "subject" | "cadence">,
  ): boolean => {
    const currentObject = allObjects.find((item) => item.id === registeredObjectId);
    if (!currentObject) return false;

    const normalizedPatch = {
      code: patch.code.trim().toLocaleUpperCase("pt-BR"),
      name: patch.name.trim(),
      subject: patch.subject.trim(),
      cadence: patch.cadence.trim(),
    };
    const duplicateCode = allObjects.some(
      (item) =>
        item.id !== registeredObjectId &&
        item.code.trim().toLocaleUpperCase("pt-BR") === normalizedPatch.code,
    );
    const codeChanged =
      currentObject.code.trim().toLocaleUpperCase("pt-BR") !== normalizedPatch.code;
    const registryDestinationOccupied =
      codeChanged &&
      [objectAttachmentsRegistry, objectFieldsRegistry].some((registry) =>
        Object.keys(registry).some(
          (code) => code.trim().toLocaleUpperCase("pt-BR") === normalizedPatch.code,
        ),
      );
    if (
      duplicateCode ||
      registryDestinationOccupied ||
      !normalizedPatch.code ||
      !normalizedPatch.name ||
      !normalizedPatch.subject ||
      !normalizedPatch.cadence
    ) {
      setToast(
        duplicateCode || registryDestinationOccupied
          ? "Código já ocupado por um objeto ou registro"
          : "Preencha os dados básicos do objeto",
      );
      return false;
    }

    if (objectId === registeredObjectId) {
      setObjectId("");
      setSelectedUgs([]);
      setSelectedMetadataIds([]);
    }

    if (transparencyObjects.some((item) => item.id === registeredObjectId)) {
      setObjectOverrides((current) => ({
        ...current,
        [registeredObjectId]: { ...current[registeredObjectId], ...normalizedPatch },
      }));
    } else {
      setCustomObjects((current) =>
        current.map((item) => (item.id === registeredObjectId ? { ...item, ...normalizedPatch } : item)),
      );
    }

    if (codeChanged) {
      const migrateRegistryKey = <T,>(registry: Record<string, T>): Record<string, T> => {
        if (!Object.prototype.hasOwnProperty.call(registry, currentObject.code)) return registry;
        const migrated = { ...registry, [normalizedPatch.code]: registry[currentObject.code] };
        delete migrated[currentObject.code];
        return migrated;
      };
      setObjectAttachmentsRegistry((current) => migrateRegistryKey(current));
      setObjectFieldsRegistry((current) => migrateRegistryKey(current));
    }

    setToast("Objeto do registro atualizado");
    return true;
  };

  const updateObjectAttachments = (code: string, attachments: string[]) => {
    setObjectAttachmentsRegistry((current) => ({ ...current, [code]: attachments }));
  };

  const updateObjectFields = (code: string, fields: FieldDefinition[]) => {
    setObjectFieldsRegistry((current) => ({ ...current, [code]: fields }));
  };

  const createFixedObject = (data: {
    code: string;
    name: string;
    subject: string;
    cadence: string;
    fieldLabels: string[];
    attachments: string[];
  }): boolean => {
    const code = data.code.trim().toLocaleUpperCase("pt-BR");
    const codeOccupiedByObject = allObjects.some(
      (item) => item.code.trim().toLocaleUpperCase("pt-BR") === code,
    );
    const codeOccupiedByRegistry = [objectAttachmentsRegistry, objectFieldsRegistry].some((registry) =>
      Object.keys(registry).some(
        (registeredCode) => registeredCode.trim().toLocaleUpperCase("pt-BR") === code,
      ),
    );
    if (!code || codeOccupiedByObject || codeOccupiedByRegistry) {
      setToast(
        codeOccupiedByObject || codeOccupiedByRegistry
          ? "Código já ocupado por um objeto ou registro"
          : "Informe o código do objeto",
      );
      return false;
    }
    const object: TransparencyObject = {
      id: `custom-${code.toLocaleLowerCase("pt-BR")}-${customObjects.length + 1}`,
      code,
      name: data.name,
      subject: data.subject,
      cadence: data.cadence,
      format: "FIXO — planilha-padrão do registro",
      source: "Registro STC (protótipo)",
      description: "Objeto fixo cadastrado no Registro da STC.",
      suggestedUgs: [],
      fields: data.fieldLabels.map((label, index) => ({
        id: `f-${code.toLocaleLowerCase("pt-BR")}-${index}`,
        label,
        type: "Texto",
        hint: "Campo definido no registro do objeto.",
        required: true,
      })),
    };
    setCustomObjects((current) => [...current, object]);
    setObjectAttachmentsRegistry((current) => ({ ...current, [code]: data.attachments }));
    setToast("Objeto fixo cadastrado no registro");
    return true;
  };

  const createUg = (data: { acronym: string; name: string; esfera: string; focalName: string; focalEmail: string }): boolean => {
    const acronym = data.acronym.trim().toLocaleUpperCase("pt-BR");
    const id = acronym
      .toLocaleLowerCase("pt-BR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
    const duplicate = ugList.some(
      (item) =>
        item.id === id ||
        item.acronym.trim().toLocaleUpperCase("pt-BR") === acronym,
    );
    if (!acronym || !id || duplicate) {
      setToast(
        duplicate
          ? "Sigla ou identificador já cadastrado para outra UG"
          : "Informe uma sigla válida para a UG",
      );
      return false;
    }
    setUgList((current) => [
      ...current,
      {
        id,
        acronym,
        name: data.name.trim(),
        esfera: data.esfera.trim(),
        focalName: data.focalName.trim(),
        focalEmail: data.focalEmail.trim(),
        contact: "Ponto focal institucional",
        profile: "Responsável institucional",
      },
    ]);
    setToast("Convite enviado por e-mail (simulado)");
    return true;
  };

  const updateUg = (id: string, patch: Partial<Ug>): boolean => {
    const currentUg = ugList.find((item) => item.id === id);
    if (!currentUg) return false;
    const acronym = (patch.acronym ?? currentUg.acronym).trim().toLocaleUpperCase("pt-BR");
    const duplicateAcronym = ugList.some(
      (item) =>
        item.id !== id &&
        item.acronym.trim().toLocaleLowerCase("pt-BR") === acronym.toLocaleLowerCase("pt-BR"),
    );
    if (!acronym || duplicateAcronym) {
      setToast(duplicateAcronym ? "Sigla já cadastrada para outra UG" : "Informe a sigla da UG");
      return false;
    }
    setUgList((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
              id: item.id,
              acronym,
              name: patch.name?.trim() || item.name,
              esfera: patch.esfera?.trim() || item.esfera,
              focalName: patch.focalName?.trim() || item.focalName,
              focalEmail: patch.focalEmail?.trim() || item.focalEmail,
            }
          : item,
      ),
    );
    setToast("Cadastro da UG atualizado");
    return true;
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

  const loginGeneralRespondent = (email: string, password: string): boolean => {
    if (!password.trim()) return false;
    const found = respondents.find(
      (item) => item.email.toLowerCase() === email.trim().toLowerCase(),
    );
    if (!found) return false;
    setCurrentRespondentId(found.id);
    setView("resp-dashboard");
    return true;
  };

  const loginRespondentFromCollection = (email: string): boolean => {
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

  // §8.2: o pré-cadastro acontece dentro da coleta — a pessoa entra SÓ naquela coleta.
  const registerRespondentByFocal = (name: string, email: string, collectionId: string) => {
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
        collectionIds: [collectionId],
      },
    ]);
    setToast("Respondente adicionado à coleta");
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
      if (view === "resp-general-access") {
        return <RespGeneralAccess onLogin={loginGeneralRespondent} />;
      }
      if (!currentRespondent || view === "resp-access") {
        return (
          <RespAccess
            collection={linkCollection}
            cycle={cycles.find((item) => item.id === linkCollection.cycleId)}
            ugList={ugList}
            onRegister={registerRespondentBySelf}
            onLogin={loginRespondentFromCollection}
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
            fieldDefs={fieldDefsForCollection(activeCollection)}
            requiresFocal={Boolean(cycle?.requiresFocalPointValidation)}
            notify={setToast}
            ugList={ugList}
            onSaveDraft={(fileName, attachments) =>
              saveDraftSubmission(activeCollection.id, fileName, attachments)
            }
            onSend={(fileName, attachments) =>
              sendSubmission(activeCollection.id, fileName, attachments)
            }
            onSendNegative={(reason) => sendNegativeSubmission(activeCollection.id, reason)}
            onReportMissing={(reason) => reportMissingAttachments(activeCollection.id, reason)}
            setView={setView}
          />
        );
      }
      return (
        <RespDashboard
          respondent={currentRespondent}
          collections={collections}
          cycles={cycles}
          ugList={ugList}
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
            onReturn={focalReturnSubmission}
            onRegisterRespondent={registerRespondentByFocal}
            notify={setToast}
            setView={setView}
          />
        );
      }
      return (
        <FocalDashboard
          cycles={cycles}
          collections={collections}
          respondents={respondents}
          ugList={ugList}
          openCycle={(cycleId) => {
            setActiveCycleId(cycleId);
            setView("focal-cycle-detail");
          }}
        />
      );
    }

    if (!isStcRole(role)) return null;

    if (view === "stc-home") {
      return <StcHome role={role} setView={setView} />;
    }

    if (view === "stc-create" && role !== "stc-analista") {
      return <StcHome role={role} setView={setView} />;
    }

    if (view === "stc-creation-review" && role !== "stc-especialista") {
      return <StcHome role={role} setView={setView} />;
    }

    if (view === "stc-create") {
      return (
        <StcCreateCycle
          kind={createKind}
          onKindChange={handleKindChange}
          object={selectedObject ? { ...selectedObject, fields: fieldsFor(selectedObject) } : null}
          objects={allObjects.map((object) => ({ ...object, fields: fieldsFor(object) }))}
          fieldCatalog={fieldCatalogForCycles}
          attachments={attachmentCatalog}
          ugList={ugList}
          onObjectChange={handleObjectChange}
          selectedUgs={selectedUgs}
          setSelectedUgs={setSelectedUgs}
          selectedMetadataIds={selectedMetadataIds}
          setSelectedMetadataIds={setSelectedMetadataIds}
          draft={draft}
          setDraft={setDraft}
          editingCycle={editingCycle}
          onSubmit={submitCycleForReview}
        />
      );
    }

    if (view === "stc-creation-review") {
      return (
        <StcCreationReview
          cycles={cycles}
          objects={allObjects.map((object) => ({ ...object, fields: fieldsFor(object) }))}
          ugList={ugList}
          fieldCatalog={fieldCatalogForCycles}
          attachments={attachmentCatalog}
          initialCycleId={reviewCycleId}
          onReview={reviewCycleCreation}
        />
      );
    }

    if (view === "stc-history") {
      return <StcHistory cycles={cycles} collections={collections} respondents={respondents} ugList={ugList} />;
    }

    if (view === "stc-registry") {
      return (
        <StcRegistry
          objects={allObjects}
          attachmentsRegistry={objectAttachmentsRegistry}
          fieldsOf={fieldsFor}
          ugList={ugList}
          onUpdateObject={updateRegisteredObject}
          onUpdateAttachments={updateObjectAttachments}
          onUpdateFields={updateObjectFields}
          onCreateObject={createFixedObject}
          onCreateUg={createUg}
          onUpdateUg={updateUg}
        />
      );
    }

    if (view === "stc-cycle-detail") {
      return (
        <StcCycleDetail
          cycle={activeCycle}
          collections={collections}
          ugList={ugList}
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
          ugList={ugList}
          validationCollectionId={validationCollectionId}
          setValidationCollectionId={setValidationCollectionId}
          onDecide={decideSubmission}
          setView={setView}
        />
      );
    }

    return (
      <StcDashboard
        role={role}
        cycles={cycles}
        collections={collections}
        ugList={ugList}
        copyLink={copyCollectionLink}
        openDetail={(cycleId) => {
          setActiveCycleId(cycleId);
          setView("stc-cycle-detail");
        }}
        openValidation={openValidation}
        openCreation={(cycleId) => {
          if (role === "stc-analista") {
            openCycleCreation(cycleId);
          } else {
            setReviewCycleId(cycleId);
            setView("stc-creation-review");
          }
        }}
        updateSei={(cycleId, value) =>
          setCycles(cycles.map((cycle) => (cycle.id === cycleId ? { ...cycle, seiNumber: value } : cycle)))
        }
      />
    );
  })();

  return (
    <div className={`app-shell ${isStcRole(role) ? "stc-accent" : ""}`}>
      <TopBar
        role={role}
        setRole={setRoleAndReset}
        respondentInitial={currentRespondent ? currentRespondent.name.charAt(0) : "R"}
        onProfileClick={() => setProfileOpen(true)}
      />
      <div className={role === "login" ? "login-only" : `workspace ${isStcRole(role) ? "" : "ug-workspace"}`}>
        <Sidebar role={role} view={view} setView={setView} />
        <main className="content">{page}</main>
      </div>
      {toast ? (
        toastIsClipboardError ? (
          <div className="toast error" role="status" aria-live="polite">
            <span className="toast-icon error" aria-hidden="true">
              <Icon name="x" size={16} />
            </span>
            {toast}
          </div>
        ) : (
          <div className="toast" role="status" aria-live="polite">
            <span className="toast-icon success" aria-hidden="true">
              <Icon name="check" size={16} />
            </span>
            {toast}
          </div>
        )
      ) : null}
      <ProfileDrawer
        role={role}
        respondent={currentRespondent}
        ugList={ugList}
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />
    </div>
  );
}
