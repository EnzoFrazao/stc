import { useEffect, useMemo, useRef, useState } from "react";
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
  | "focal-collection-detail"
  | "resp-access"
  | "resp-dashboard"
  | "resp-collection";
type ObjectKind = "fixo" | "variavel";
type SpreadsheetStatus = "pending-approval" | "fixed-template-pending" | "generated";
type CreationReviewStatus = "aguardando-analise" | "ajustes-solicitados" | "aprovado";
export type CollectionStatus =
  | "pendente"
  | "rascunho"
  | "aguardando-ponto-focal"
  | "aguardando-stc"
  | "em-correcao"
  | "aprovada";
export type CycleStatus =
  | "em-andamento"
  | "finalizado"
  | "sem-envio-no-prazo";
export type CollectionOwnerType = "respondente" | "ponto-focal";
export type ResponseKind = "dados" | "indisponibilidade";
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

interface CollectionObservation {
  author: string;
  date: string;
  text: string;
}

export type ReceiptKind = "envio" | "rejeicao" | "fechamento";

export interface CollectionReceipt {
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
): CollectionReceipt {
  return { id: `${protocol}-${kind}-${position + 1}`, kind, protocol, author, date, summary };
}

export interface Collection {
  id: string;
  cycleId: string;
  ugId: string;
  ownerType: CollectionOwnerType;
  ownerId: string;
  ownerName: string;
  status: CollectionStatus;
  responseKind: ResponseKind;
  protocol: string;
  fileName: string;
  attachments: string[];
  rejectionReason: string;
  submittedAt: string;
  observations: CollectionObservation[];
  receipts: CollectionReceipt[];
  attachmentJustifications: CollectionObservation[];
}

interface Respondent {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string; // cargo
  ugId: string;
  password: string;
  createdBySelf: boolean;
  emailVerified: boolean;
}

interface FocalSignal {
  id: string;
  cycleId: string;
  ugId: string;
  kind: "duvida" | "informacao-indisponivel";
  message: string;
  author: string;
  createdAt: string;
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
  linkToken: string;
  ugIds: string[];
  metadataLabels: string[];
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

function requiredAttachmentsForObject(
  object: TransparencyObject,
  registeredAttachments: readonly string[] = [],
): string[] {
  const attachmentIds = new Set(object.attachmentIds ?? []);
  const tesauroLabels = attachmentCatalog
    .filter((attachment) => attachmentIds.has(attachment.id))
    .map((attachment) => attachment.label);
  return Array.from(new Set([...tesauroLabels, ...registeredAttachments]));
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

const seedRespondents: Respondent[] = [
  {
    id: "resp-joao",
    name: "João Lima",
    email: "joao.lima@seduc.ma.gov.br",
    phone: "(98) 98801-2214",
    role: "Setor de Contratos",
    ugId: "seduc",
    password: "senha-simulada",
    createdBySelf: false,
    emailVerified: true,
  },
  {
    id: "resp-clara",
    name: "Clara Nunes",
    email: "clara.nunes@sinfra.ma.gov.br",
    phone: "(98) 98214-7702",
    role: "Setor de Obras",
    ugId: "sinfra",
    password: "senha-simulada",
    createdBySelf: true,
    emailVerified: true,
  },
  {
    id: "resp-otavio",
    name: "Otávio Ramos",
    email: "otavio.ramos@sinfra.ma.gov.br",
    phone: "(98) 98455-1980",
    role: "Comissão de Licitação",
    ugId: "sinfra",
    password: "senha-simulada",
    createdBySelf: false,
    emailVerified: true,
  },
  {
    id: "resp-paulo",
    name: "Paulo Sena",
    email: "paulo.sena@sefaz.ma.gov.br",
    phone: "(98) 98120-3345",
    role: "TI da Ouvidoria",
    ugId: "sefaz",
    password: "senha-simulada",
    createdBySelf: true,
    emailVerified: true,
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
    title: `Ciclo ${defaultObject.code} - ${titleCase(defaultObject.name)}`,
    objectCode: defaultObject.code,
    objectName: titleCase(defaultObject.name),
    objectKind: "fixo",
    createdAt: "07 jul. 2026",
    deadline: "2026-07-15",
    status: "em-andamento",
    seiNumber: "2026.000431/STC",
    linkToken: "agz-ciclo-100",
    ugIds: ["seduc", "saf"],
    metadataLabels: defaultObject.fields.map((field) => field.label),
    requiresFocalPointValidation: true,
    requiredAttachments: [],
  },
  {
    id: "ciclo-101",
    title: `Ciclo ${objectMt0018.code} - ${titleCase(objectMt0018.name)}`,
    objectCode: objectMt0018.code,
    objectName: titleCase(objectMt0018.name),
    objectKind: "fixo",
    createdAt: "04 jul. 2026",
    deadline: "2026-07-18",
    status: "em-andamento",
    seiNumber: "2026.000418/STC",
    linkToken: "agz-ciclo-101",
    ugIds: ["sinfra"],
    metadataLabels: objectMt0018.fields.map((field) => field.label),
    requiresFocalPointValidation: false,
    requiredAttachments: ["Edital em PDF", "Publicação do aviso"],
  },
  {
    id: "ciclo-demo-variable",
    title: "Ciclo VAR-0000 - Demonstração variável",
    objectCode: "VAR-0000",
    objectName: "Demonstração variável",
    objectKind: "variavel",
    createdAt: "06 jul. 2026",
    deadline: "2026-07-20",
    status: "em-andamento",
    seiNumber: "2026.000400/STC",
    linkToken: "agz-ciclo-demo-variable",
    ugIds: ["seduc"],
    metadataLabels: [canonicalFields[0].label],
    requiresFocalPointValidation: false,
    requiredAttachments: [],
  },
  {
    id: "ciclo-102",
    title: `Ciclo ${objectMt0030.code} - ${titleCase(objectMt0030.name)}`,
    objectCode: objectMt0030.code,
    objectName: titleCase(objectMt0030.name),
    objectKind: "fixo",
    createdAt: "28 jun. 2026",
    deadline: "2026-07-04",
    status: "em-andamento",
    seiNumber: "2026.000355/STC",
    linkToken: "agz-ciclo-102",
    ugIds: ["sefaz"],
    metadataLabels: objectMt0030.fields.map((field) => field.label),
    requiresFocalPointValidation: false,
    requiredAttachments: ["Relatório consolidado em PDF"],
  },
  {
    id: "ciclo-103",
    title: `Ciclo ${objectMt0012.code} - ${titleCase(objectMt0012.name)}`,
    objectCode: objectMt0012.code,
    objectName: titleCase(objectMt0012.name),
    objectKind: "fixo",
    createdAt: "12 jun. 2026",
    deadline: "2026-06-28",
    status: "finalizado",
    seiNumber: "2026.000271/STC",
    linkToken: "agz-ciclo-103",
    ugIds: ["sinfra"],
    metadataLabels: objectMt0012.fields.map((field) => field.label),
    requiresFocalPointValidation: true,
    requiredAttachments: ["Relatório fotográfico"],
  },
  {
    id: "ciclo-104",
    title: `Ciclo ${objectMt0040.code} - ${titleCase(objectMt0040.name)}`,
    objectCode: objectMt0040.code,
    objectName: titleCase(objectMt0040.name),
    objectKind: "fixo",
    createdAt: "26 jun. 2026",
    deadline: "2026-07-08",
    status: "em-andamento",
    seiNumber: "2026.000322/STC",
    linkToken: "agz-ciclo-104",
    ugIds: ["sefaz"],
    metadataLabels: objectMt0040.fields.map((field) => field.label),
    requiresFocalPointValidation: false,
    requiredAttachments: [],
  },
  {
    id: "ciclo-105",
    title: `Ciclo ${objectMt0015.code} - ${titleCase(objectMt0015.name)}`,
    objectCode: objectMt0015.code,
    objectName: titleCase(objectMt0015.name),
    objectKind: "fixo",
    createdAt: "16 jun. 2026",
    deadline: "2026-06-30",
    status: "sem-envio-no-prazo",
    seiNumber: "2026.000301/STC",
    linkToken: "agz-ciclo-105",
    ugIds: ["saf", "seduc"],
    metadataLabels: objectMt0015.fields.map((field) => field.label),
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

function createSeedCollection(
  input: Partial<Collection> &
    Pick<Collection, "cycleId" | "ugId" | "ownerId" | "ownerName" | "status">,
): Collection {
  const {
    id,
    cycleId,
    ugId,
    ownerType = "respondente",
    ownerId,
    ownerName,
    status,
    responseKind = "dados",
    protocol = "",
    fileName = "",
    attachments = [],
    rejectionReason = "",
    submittedAt = "",
    observations = [],
    receipts = [],
    attachmentJustifications = [],
  } = input;
  return {
    id: id ?? `collection-${cycleId}-${ownerType}-${ownerId}`,
    cycleId,
    ugId,
    ownerType,
    ownerId,
    ownerName,
    status,
    responseKind,
    protocol,
    fileName,
    attachments,
    rejectionReason,
    submittedAt,
    observations,
    receipts,
    attachmentJustifications,
  };
}

const seedCollections: Collection[] = [
  createSeedCollection({
    cycleId: "ciclo-101",
    ugId: "sinfra",
    ownerId: "resp-clara",
    ownerName: "Clara Nunes",
    status: "aguardando-stc",
    protocol: "AG-2026-00032",
    fileName: "mt-0018_sinfra_obras.xlsx",
    attachments: ["edital_042_2026.pdf", "publicacao_aviso_042.pdf"],
    submittedAt: "08 jul. 2026",
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
  }),
  createSeedCollection({
    cycleId: "ciclo-101",
    ugId: "sinfra",
    ownerId: "resp-otavio",
    ownerName: "Otávio Ramos",
    status: "aguardando-stc",
    protocol: "AG-2026-00033",
    fileName: "mt-0018_sinfra_compras.xlsx",
    attachments: ["edital_037_2026.pdf", "publicacao_aviso_037.pdf"],
    submittedAt: "09 jul. 2026",
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
  }),
  createSeedCollection({
    cycleId: "ciclo-102",
    ugId: "sefaz",
    ownerId: "resp-paulo",
    ownerName: "Paulo Sena",
    status: "em-correcao",
    protocol: "AG-2026-00019",
    fileName: "mt-0030_sefaz_jun.xlsx",
    attachments: ["relatorio_ouvidoria_jun.pdf"],
    rejectionReason: "Período de referência divergente do solicitado pela STC.",
    submittedAt: "02 jul. 2026",
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
  }),
  createSeedCollection({
    cycleId: "ciclo-103",
    ugId: "sinfra",
    ownerId: "resp-clara",
    ownerName: "Clara Nunes",
    status: "aprovada",
    protocol: "AG-2026-00011",
    fileName: "mt-0012_sinfra_jun.xlsx",
    attachments: ["relatorio_fotografico_jun.pdf"],
    submittedAt: "22 jun. 2026",
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
  }),
  createSeedCollection({
    cycleId: "ciclo-104",
    ugId: "sefaz",
    ownerId: "resp-paulo",
    ownerName: "Paulo Sena",
    status: "aguardando-stc",
    responseKind: "indisponibilidade",
    protocol: "AG-2026-00027",
    submittedAt: "05 jul. 2026",
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
        "Indisponibilidade da informação registrada na plataforma.",
      ),
    ],
  }),
  createSeedCollection({
    cycleId: "ciclo-100",
    ugId: "seduc",
    ownerId: "resp-joao",
    ownerName: "João Lima",
    status: "pendente",
  }),
  createSeedCollection({
    cycleId: "ciclo-demo-variable",
    ugId: "seduc",
    ownerId: "resp-joao",
    ownerName: "João Lima",
    status: "pendente",
  }),
];
const ptBrDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function titleCase(value: string) {
  return value.toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function dateIsoAtTimezoneOffset(
  date: Date,
  timezoneOffsetMinutes = date.getTimezoneOffset(),
): string {
  return new Date(date.getTime() - timezoneOffsetMinutes * 60_000).toISOString().slice(0, 10);
}

function currentDateIso(): string {
  const now = new Date();
  return dateIsoAtTimezoneOffset(now);
}

function currentDateLabel(): string {
  return ptBrDateFormatter.format(new Date());
}

function isPastDeadline(deadline: string) {
  return isValidIsoDate(deadline) && deadline < currentDateIso();
}

// §1.3: o prazo aparece com contexto ("vence em 3 dias"), não só a data seca.
function deadlineContext(deadline: string): string {
  if (!isValidIsoDate(deadline)) return "prazo não informado";
  const diff = Math.round(
    (new Date(`${deadline}T12:00:00`).getTime() - new Date(`${currentDateIso()}T12:00:00`).getTime()) / 86400000,
  );
  if (diff > 1) return `vence em ${diff} dias`;
  if (diff === 1) return "vence amanhã";
  if (diff === 0) return "vence hoje";
  if (diff === -1) return "venceu ontem";
  return `venceu há ${Math.abs(diff)} dias`;
}

function draftForObject(
  object: TransparencyObject,
  registeredAttachments: readonly string[] = [],
): CycleDraft {
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
    requiredAttachments: requiredAttachmentsForObject(object, registeredAttachments),
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

export interface IndividualCollectionOwner {
  id: string;
  type: CollectionOwnerType;
  name: string;
  ugId: string;
}

export function collectionIdentity(cycleId: string, owner: IndividualCollectionOwner): string {
  return `collection-${cycleId}-${owner.type}-${owner.id}`;
}

export function ensureIndividualCollection(
  collections: Collection[],
  cycle: Pick<CycleItem, "id">,
  owner: IndividualCollectionOwner,
): { collections: Collection[]; collection: Collection; created: boolean } {
  const existing = collections.find(
    (item) =>
      item.cycleId === cycle.id && item.ownerType === owner.type && item.ownerId === owner.id,
  );
  if (existing) {
    const collection =
      existing.ownerName === owner.name && existing.ugId === owner.ugId
        ? existing
        : { ...existing, ownerName: owner.name, ugId: owner.ugId };
    return {
      collections:
        collection === existing
          ? collections
          : collections.map((item) => (item.id === existing.id ? collection : item)),
      collection,
      created: false,
    };
  }

  const collection: Collection = {
    id: collectionIdentity(cycle.id, owner),
    cycleId: cycle.id,
    ugId: owner.ugId,
    ownerType: owner.type,
    ownerId: owner.id,
    ownerName: owner.name,
    status: "pendente",
    responseKind: "dados",
    protocol: "",
    fileName: "",
    attachments: [],
    rejectionReason: "",
    submittedAt: "",
    observations: [],
    receipts: [],
    attachmentJustifications: [],
  };
  return { collections: [...collections, collection], collection, created: true };
}

export function statusAfterRespondentSend(
  requiresFocal: boolean,
  _informationUnavailable = false,
): CollectionStatus {
  return requiresFocal ? "aguardando-ponto-focal" : "aguardando-stc";
}

export function statusAfterFocal(_informationUnavailable = false): CollectionStatus {
  return "aguardando-stc";
}

export function statusAfterCollectionSend(
  ownerType: CollectionOwnerType,
  requiresFocal: boolean,
  informationUnavailable = false,
): CollectionStatus {
  return ownerType === "ponto-focal"
    ? statusAfterFocal(informationUnavailable)
    : statusAfterRespondentSend(requiresFocal, informationUnavailable);
}

function collectionWasSubmitted(collection: Collection): boolean {
  return Boolean(collection.submittedAt) || collection.receipts.some((receipt) => receipt.kind === "envio");
}

export function deriveCycleStatus(
  cycle: Pick<CycleItem, "id" | "deadline" | "ugIds">,
  collections: Collection[],
  ugId?: string,
): CycleStatus {
  const cycleCollections = collections.filter(
    (item) => item.cycleId === cycle.id && (!ugId || item.ugId === ugId),
  );
  const expectedUgIds = ugId ? [ugId] : cycle.ugIds;
  const coversEveryExpectedUg =
    expectedUgIds.length > 0 &&
    expectedUgIds.every((expectedUgId) =>
      cycleCollections.some((collection) => collection.ugId === expectedUgId),
    );
  if (
    coversEveryExpectedUg &&
    cycleCollections.length > 0 &&
    cycleCollections.every((item) => item.status === "aprovada")
  ) {
    return "finalizado";
  }
  if (isPastDeadline(cycle.deadline) && !cycleCollections.some(collectionWasSubmitted)) {
    return "sem-envio-no-prazo";
  }
  return "em-andamento";
}

export function cycleAcceptsNewCollections(
  cycle: Pick<CycleItem, "id" | "deadline" | "ugIds" | "creationStatus">,
  collections: Collection[],
  ugId?: string,
): boolean {
  return (
    cycle.creationStatus === "aprovado" &&
    deriveCycleStatus(cycle, collections, ugId) !== "finalizado"
  );
}

export function cycleLink(
  cycle: Pick<CycleItem, "creationStatus" | "linkToken">,
): string | null {
  if (cycle.creationStatus !== "aprovado" || !cycle.linkToken) return null;
  return `agiliza.ma.gov.br/ciclo/${cycle.linkToken}`;
}

type CollectionSituation = "pendente" | "aguardando-focal" | "aguardando-analise" | "correcao" | "concluida";

function collectionSituation(collection: Collection): CollectionSituation {
  if (collection.status === "pendente" || collection.status === "rascunho") return "pendente";
  if (collection.status === "em-correcao") return "correcao";
  if (collection.status === "aguardando-ponto-focal") return "aguardando-focal";
  if (collection.status === "aprovada") return "concluida";
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
  if (deriveCycleStatus(cycle, collections) !== "finalizado") return "—";
  const dates = collections
    .filter((item) => item.cycleId === cycle.id)
    .filter((item) => item.status === "aprovada")
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
    ["em-andamento", "Em andamento", "info", "send"],
    ["finalizado", "Finalizado", "success", "check"],
    ["sem-envio-no-prazo", "Sem envio no prazo", "danger", "x"],
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

function collectionLabel(status: CollectionStatus): string {
  const labels: Record<CollectionStatus, string> = {
    pendente: "Pendente",
    rascunho: "Rascunho salvo",
    "aguardando-ponto-focal": "Aguardando ponto focal",
    "aguardando-stc": "Aguardando análise da STC",
    "em-correcao": "Em correção",
    aprovada: "Aprovada",
  };
  return labels[status];
}

function collectionTone(status: CollectionStatus): Tone {
  const tones: Record<CollectionStatus, Tone> = {
    pendente: "warning",
    rascunho: "neutral",
    "aguardando-ponto-focal": "warning",
    "aguardando-stc": "warning",
    "em-correcao": "orange",
    aprovada: "success",
  };
  return tones[status];
}

function cycleLabel(status: CycleStatus, scope: "stc" | "orgao" = "stc"): string {
  const labels: Record<CycleStatus, string> = {
    "em-andamento": scope === "orgao" ? "Em andamento" : "Ciclo em andamento",
    finalizado: "Finalizado",
    "sem-envio-no-prazo": "Sem envio no prazo",
  };
  return labels[status];
}

function cycleTone(status: CycleStatus): Tone {
  // §1.2: verde = terminou · amarelo = alguém precisa agir · vermelho = furou o prazo.
  const tones: Record<CycleStatus, Tone> = {
    "em-andamento": "info",
    finalizado: "success",
    "sem-envio-no-prazo": "danger",
  };
  return tones[status];
}

function cycleStatusHelp(status: CycleStatus): string {
  if (status === "em-andamento") return "Ciclo aberto: as coletas individuais seguem em andamento.";
  if (status === "sem-envio-no-prazo")
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
  profileInitial,
  onProfileClick,
  onLogout,
}: {
  role: Role;
  profileInitial: string;
  onProfileClick: () => void;
  onLogout: () => void;
}) {
  const avatar =
    role === "ponto-focal" || role === "respondente"
      ? profileInitial
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
        {role !== "login" ? (
          <>
            {isStcRole(role) ? (
              <button type="button" className="profile-avatar" onClick={onProfileClick} aria-label="Abrir perfil">
                {avatar}
              </button>
            ) : (
              <span className="profile-avatar" aria-hidden="true">{avatar}</span>
            )}
            <button type="button" className="topbar-logout" onClick={onLogout}>Sair</button>
          </>
        ) : null}
      </div>
      <span className="topbar-compact-note">SEI formal + resposta na plataforma</span>
    </header>
  );
}

function ProfileDrawer({
  role,
  open,
  onClose,
}: {
  role: StcRole;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  const heading =
    role === "stc-analista"
      ? { avatar: "A", name: "Analista STC", detail: "Criação e acompanhamento de ciclos" }
      : { avatar: "E", name: "Especialista STC", detail: "Aprovação e acompanhamento" };

  return (
    <div className="profile-drawer-layer" aria-live="polite">
      <button type="button" className="drawer-backdrop" onClick={onClose} aria-label="Fechar perfil" />
      <aside className="profile-drawer">
        <div className="drawer-head">
          <div className="profile-avatar large" aria-hidden="true">{heading.avatar}</div>
          <div>
            <span className="eyebrow">Perfil de acesso</span>
            <h3>{heading.name}</h3>
            <p>{heading.detail}</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar">
            <Icon name="x" />
          </button>
        </div>

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
      </aside>
    </div>
  );
}
function RoleGuidancePanel({
  role,
  respondent,
  focalUg,
  cycle,
  collection,
}: {
  role: Role;
  respondent: Respondent | null;
  focalUg: Ug | null;
  cycle: CycleItem | null;
  collection: Collection | null;
}) {
  if (role !== "ponto-focal" && role !== "respondente") return null;

  if (role === "respondente") {
    return (
      <aside className="role-guidance-panel" aria-label="Orientações do respondente">
        <div className="guidance-profile">
          <span className="profile-avatar large" aria-hidden="true">{respondent?.name.charAt(0) ?? "R"}</span>
          <div><span className="eyebrow">Seu perfil</span><strong>{respondent?.name ?? "Respondente"}</strong></div>
        </div>
        <section>
          <span className="eyebrow">Sua visão</span>
          <h3>Somente suas coletas</h3>
          <p>Você não acessa ciclos nem respostas de outras pessoas do mesmo órgão.</p>
        </section>
        <section>
          <span className="eyebrow">O que você pode fazer</span>
          <ul>
            <li>Preencher e enviar sua planilha e seus anexos.</li>
            <li>Corrigir uma coleta devolvida.</li>
            <li>Consultar protocolos e comprovantes.</li>
          </ul>
        </section>
        {cycle && collection ? (
          <section className="guidance-context">
            <span className="eyebrow">Nesta coleta</span>
            <h3>Prazo: {cycle.deadline}</h3>
            <p>
              {cycle.requiresFocalPointValidation
                ? "Depois do envio, o ponto focal confere e encaminha sua resposta à STC."
                : "Depois do envio, sua resposta segue diretamente para análise da STC."}
            </p>
            <StatusPill tone={collectionTone(collection.status)}>{collectionLabel(collection.status)}</StatusPill>
          </section>
        ) : null}
      </aside>
    );
  }

  if (!focalUg) return null;

  return (
    <aside className="role-guidance-panel focal-guidance" aria-label="Orientações do ponto focal">
      <div className="guidance-profile">
        <span className="profile-avatar large" aria-hidden="true">{focalUg.focalName.charAt(0)}</span>
        <div><span className="eyebrow">Ponto focal · {focalUg.acronym}</span><strong>{focalUg.focalName}</strong></div>
      </div>
      <section>
        <span className="eyebrow">Seu papel</span>
        <h3>Coordenar a resposta do órgão</h3>
        <p>Você acompanha os ciclos da {focalUg.acronym} e todas as coletas individuais vinculadas a eles.</p>
      </section>
      {cycle ? (
        <section className="guidance-context">
          <span className="eyebrow">Neste ciclo</span>
          <h3>{cycle.objectCode} · prazo {cycle.deadline}</h3>
          <p>
            {cycle.requiresFocalPointValidation
              ? "Sua conferência está ligada: os envios dos respondentes aguardam sua ciência; se você responder diretamente, a coleta segue à STC."
              : "Sua conferência está desligada: as respostas seguem direto à STC e você acompanha as pendências."}
          </p>
        </section>
      ) : null}
      <section>
        <span className="eyebrow">O que você pode fazer</span>
        <ul>
          <li>Cadastrar respondentes ou responder diretamente.</li>
          <li>Intermediar dúvidas e sinalizar informações indisponíveis à STC.</li>
          <li>Quando o ciclo exigir, conferir cada envio e encaminhá-lo à STC.</li>
        </ul>
      </section>
      <section>
        <span className="eyebrow">O que você não pode fazer</span>
        <ul>
          <li>Alterar a resposta ou os arquivos enviados por outra pessoa.</li>
          <li>Aprovar em nome da STC ou mudar as regras do ciclo.</li>
          <li>Acessar dados de outros órgãos participantes.</li>
        </ul>
      </section>
      <div className="guidance-note"><Icon name="shield" size={16} /><span>O toggle definido pela STC determina se sua validação é obrigatória.</span></div>
    </aside>
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
  onLogin,
}: {
  onLogin: (email: string, password: string) => boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (onLogin(email, password)) return;
    setError("E-mail não reconhecido. Confira o acesso informado ou use o link do ciclo para o primeiro cadastro.");
  };

  return (
    <div className="login-screen unified-login-screen">
      <section className="unified-login-card" aria-labelledby="login-title">
        <div className="brand-lockup large">
          <span className="brand-mark">
            <Icon name="shield" />
          </span>
          <div>
            <strong>Agiliza Transparência</strong>
            <span>Protótipo visual do MVP</span>
          </div>
        </div>
        <div className="unified-login-heading">
          <span className="login-kicker">SEI formal preservado</span>
          <h1 id="login-title">Acesse o Agiliza Transparência</h1>
          <p>Entre com seu e-mail institucional. O sistema identifica automaticamente o seu perfil de acesso.</p>
        </div>

        <form className="unified-login-form" onSubmit={submit}>
          <label htmlFor="login-email">
            E-mail
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              value={email}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "login-error" : undefined}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
              }}
            />
          </label>
          <label htmlFor="login-password">
            Senha
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "login-error" : undefined}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
            />
          </label>
          {error ? <p id="login-error" className="form-error" role="alert">{error}</p> : null}
          <button type="submit" className="primary-button ripple-button" disabled={!email.trim() || !password.trim()}>
            <Icon name="lock" />Entrar
          </button>
        </form>

        <details className="unified-login-registration">
          <summary>
            <Icon name="link" size={18} />
            <span>
              <strong>Primeiro acesso? Veja como criar seu cadastro</strong>
              <span>Primeiro acesso como respondente? Use o link do ciclo recebido no SEI.</span>
            </span>
          </summary>
          <p>
            O cadastro é iniciado pelo link formal enviado no processo SEI. Assim, a plataforma identifica
            seu órgão e cria somente a sua coleta individual.
          </p>
        </details>

        <details className="demo-access-list">
          <summary>Ver acessos de demonstração</summary>
          <small>maria.costa@seduc.ma.gov.br · joao.lima@seduc.ma.gov.br</small>
          <small>analista@stc.ma.gov.br · especialista@stc.ma.gov.br</small>
        </details>
      </section>
    </div>
  );
}

function ReceiptTimeline({
  collection,
  seiNumber,
  compact = false,
}: {
  collection: Collection;
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
  const sendReceipts = collection.receipts.filter((receipt) => receipt.kind === "envio");
  const primarySendId = sendReceipts[sendReceipts.length - 1]?.id;

  if (!collection.receipts.length) return null;

  return (
    <section
      className={compact ? "receipt-timeline compact-receipt" : "card receipt-timeline"}
      aria-label="Histórico de comprovantes"
    >
      <div className="receipt-timeline-heading">
        <span className="eyebrow">Histórico de comprovantes</span>
        <small>{collection.receipts.length} evento(s) registrado(s)</small>
      </div>

      <div className="receipt-timeline-list" role="list">
        {collection.receipts.map((receipt) => {
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
                    <strong>{collection.fileName || "Sem arquivo (indisponibilidade)"}</strong>
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
                    <strong>{collection.attachments.length} arquivo(s)</strong>
                  </div>
                  <div>
                    <span>SEI</span>
                    <strong>{seiNumber || "—"}</strong>
                  </div>
                  <div>
                    <span>Status atual</span>
                    <strong>{collectionLabel(collection.status)}</strong>
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

function ObservationThread({ observations }: { observations: CollectionObservation[] }) {
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

function CollectionBlock({
  collection,
  respondent,
  requiredAttachments,
  children,
}: {
  collection: Collection;
  respondent?: Respondent;
  requiredAttachments: string[];
  children?: JSX.Element | null;
}) {
  return (
    <article className="collection-response-card">
      <div className="collection-response-head">
        <div>
          <strong>{collection.ownerName}</strong>
          <small>
            {respondent?.role || "Respondente técnico"}
            {respondent?.createdBySelf ? " · usuário criado pelo próprio usuário" : ""}
          </small>
        </div>
        <StatusPill tone={collectionTone(collection.status)}>
          {collectionLabel(collection.status)}
        </StatusPill>
      </div>

      {collection.responseKind === "indisponibilidade" ? (
        <div className="alert">
          <Icon name="clock" />
          <div>
            <strong>Não tem a informação</strong>
            <span>O responsável declarou formalmente que o órgão não detém este dado.</span>
          </div>
        </div>
      ) : (
        <div className="received-box">
          <Icon name="file" />
          <div>
            <span>Planilha enviada em {collection.submittedAt}</span>
            <strong>{collection.fileName || "Envio ainda não realizado"}</strong>
            {requiredAttachments.length ? (
              <span>
                Anexos: {collection.attachments.length} enviados / {requiredAttachments.length} exigidos
              </span>
            ) : (
              <span>Sem anexos obrigatórios nesta coleta</span>
            )}
          </div>
        </div>
      )}

      {collection.attachments.length ? (
        <div className="tag-cloud">
          {collection.attachments.map((file) => (
            <span key={file}>{file}</span>
          ))}
        </div>
      ) : null}

      <ObservationThread observations={collection.observations} />
      {children ?? null}
    </article>
  );
}

function CycleTimeline({ cycle, collections }: { cycle: CycleItem; collections: Collection[] }) {
  const sent = collections.filter(collectionWasSubmitted);
  const decided = sent.some((item) => item.status === "aprovada" || item.status === "em-correcao");
  const operationalStatus = deriveCycleStatus(cycle, collections);
  const events = [
    {
      icon: "file" as const,
      title: "Pedido formal registrado no SEI",
      text: `Processo ${cycle.seiNumber || "a informar"} — o SEI é sempre o canal formal.`,
      done: true,
    },
    {
      icon: "link" as const,
      title: "Link do ciclo gerado e anexado ao SEI",
      text: cycleLink(cycle)
        ? "Um único link do ciclo direciona cada conta à sua coleta individual."
        : "O link será gerado após a aprovação do ciclo.",
      done: Boolean(cycleLink(cycle)),
    },
    {
      icon: "send" as const,
      title: "Coletas dos responsáveis",
      text: sent.length
        ? `${sent.length} coleta(s) individual(is) recebida(s).`
        : "Aguardando envios pela plataforma.",
      done: sent.length > 0,
    },
    {
      icon: sent.some((item) => item.status === "em-correcao") ? ("refresh" as const) : ("clipboard" as const),
      title: sent.some((item) => item.status === "em-correcao") ? "Devolvido para correção" : "Verificação da STC",
      text:
        sent.some((item) => item.status === "em-correcao")
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
        operationalStatus === "finalizado"
          ? "Comprovantes emitidos. Registro no SEI, se houver, é manual da STC."
          : "Será registrado após a aprovação das respostas.",
      done: operationalStatus === "finalizado",
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
  copyLink: (cycle: CycleItem) => Promise<void>;
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
    const operationalStatus = deriveCycleStatus(cycle, collections);
    const statusMatch =
      filters.status === "todos" ||
      (cycle.creationStatus === "aprovado" && operationalStatus === filters.status);
    const objectMatch = filters.object === "todos" || cycle.objectCode === filters.object;
    const ugMatch = filters.ug === "todos" || cycle.ugIds.includes(filters.ug);
    const dateMatch =
      !filters.date ||
      cycle.deadline === filters.date ||
      dateIsoAtTimezoneOffset(new Date(cycle.createdAtIso)) === filters.date;
    return statusMatch && objectMatch && ugMatch && dateMatch;
  });

  const objectOptions = [...new Set(cycles.map((cycle) => cycle.objectCode))];

  const operationalCycles = cycles.filter((cycle) => cycle.creationStatus === "aprovado");
  // §1.2: a mesma paleta dos status vale para os KPIs — amarelo/laranja = alguém precisa agir.
  const operationalCollections = collections.filter((collection) =>
    operationalCycles.some((cycle) => cycle.id === collection.cycleId),
  );
  const metrics = [
    ["Ciclos em andamento", operationalCycles.filter((cycle) => deriveCycleStatus(cycle, collections) === "em-andamento").length, "Coletas individuais em curso", "info"] as const,
    [
      "Aguardando ponto focal",
      operationalCollections.filter((collection) => collection.status === "aguardando-ponto-focal").length,
      "Coletas para validação do órgão",
      "warning",
    ] as const,
    [
      "Aguardando análise da STC",
      operationalCollections.filter((collection) => collection.status === "aguardando-stc").length,
      "Coletas novas para conferir",
      "warning",
    ] as const,
    [
      "Aguardando correção",
      operationalCollections.filter((collection) => collection.status === "em-correcao").length,
      "Devolvidas para a UG corrigir",
      "orange",
    ] as const,
    [
      "Não enviadas no prazo",
      operationalCycles.filter((cycle) => deriveCycleStatus(cycle, collections) === "sem-envio-no-prazo").length,
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
                <StatusPill tone={cycleTone(deriveCycleStatus(cycle, collections))}>
                  {cycleLabel(deriveCycleStatus(cycle, collections))}
                </StatusPill>
              </div>

              {(() => {
                const cols = collections.filter((item) => item.cycleId === cycle.id);
                const responded = cols.filter(collectionWasSubmitted).length;
                const late = isPastDeadline(cycle.deadline) && deriveCycleStatus(cycle, collections) !== "finalizado";
                const cycleUrl = cycleLink(cycle);
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
                      {cycle.ugIds.map((ugId) => {
                        const ug = ugList.find((item) => item.id === ugId);
                        const ugCollections = cols.filter((item) => item.ugId === ugId);
                        const sent = ugCollections.some(collectionWasSubmitted);
                        return (
                          <span key={ugId} className={sent ? "ug-chip responded" : "ug-chip"}>
                            <span className="ug-chip-label">
                              {sent ? <Icon name="check" size={12} /> : null}
                              {ug?.acronym ?? ugId} · {ugCollections.length} coleta(s)
                            </span>
                          </span>
                        );
                      })}
                    </div>
                    {cycleUrl ? (
                      <article className="cycle-link-card">
                        <code className="collection-link-text">{`https://${cycleUrl}`}</code>
                        <button
                          type="button"
                          className="chip-link"
                          onClick={() => void copyLink(cycle)}
                          aria-label="Copiar link do ciclo"
                        >
                          <Icon name="link" size={12} />
                          Copiar link do ciclo
                        </button>
                      </article>
                    ) : null}
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
                <span>{cycleStatusHelp(deriveCycleStatus(cycle, collections))}</span>
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
    isValidIsoDate(draft.deadline) &&
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
                Ligado: a coleta fica "aguardando ponto focal" até ele dar ciência. Desligado: vai
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
  requiredAttachmentsOf,
  initialCycleId,
  onReview,
}: {
  cycles: CycleItem[];
  objects: readonly TransparencyObject[];
  ugList: Ug[];
  fieldCatalog: readonly FieldDefinition[];
  attachments: readonly AttachmentDefinition[];
  requiredAttachmentsOf: (object: TransparencyObject) => string[];
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
      isValidIsoDate(reviewDraft.deadline) &&
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
                        requiredAttachments: requiredAttachmentsOf(object),
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
  signals,
  ugList,
  setView,
  openValidation,
  openCycleLink,
}: {
  cycle: CycleItem;
  collections: Collection[];
  signals: FocalSignal[];
  ugList: Ug[];
  setView: (view: View) => void;
  openValidation: (cycleId: string) => void;
  openCycleLink: (cycleId: string) => void;
}) {
  const cycleCollections = collections.filter((item) => item.cycleId === cycle.id);
  const cycleSignals = signals.filter((item) => item.cycleId === cycle.id);
  const sharedLink = cycleLink(cycle);
  const operationalStatus = deriveCycleStatus(cycle, collections);

  return (
    <div className="workflow-page wide-page">
      <SectionHeader
        eyebrow="Detalhes do ciclo"
        title={cycle.title}
        description="O ciclo possui um link único; dentro dele, a STC acompanha as coletas individuais por UG e responsável."
      />

      <div className="detail-layout">
        <section className="card cycle-highlight-card">
          <div className="cycle-highlight-head">
            <div>
              <span className="eyebrow">{cycle.objectCode}</span>
              <h3>{cycle.objectName}</h3>
              <p>{cycleStatusHelp(operationalStatus)}</p>
            </div>
            <StatusPill tone={cycleTone(operationalStatus)}>{cycleLabel(operationalStatus)}</StatusPill>
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
          <span className="eyebrow">Acesso pelo SEI</span>
          <h3>Um link por ciclo, anexado ao SEI</h3>
          <p className="muted-text">
            A conta autenticada define a UG e a coleta individual exibida. O mesmo link atende todas as
            unidades do ciclo e não cria duplicidades.
          </p>
          {sharedLink ? (
            <div className="collection-row cycle-shared-link">
              <span className="link-chip"><Icon name="link" size={14} />{sharedLink}</span>
              <button type="button" className="ghost-button" onClick={() => openCycleLink(cycle.id)}>
                <Icon name="send" size={16} />
                Simular acesso pelo link
              </button>
            </div>
          ) : null}
          <div className="collection-list">
            {cycle.ugIds.map((ugId) => {
              const ug = ugList.find((item) => item.id === ugId);
              const ugCollections = cycleCollections.filter((item) => item.ugId === ugId);
              const sent = ugCollections.filter(collectionWasSubmitted);
              return (
                <div key={ugId} className="collection-row">
                  <div>
                    <strong>{ug?.acronym ?? ugId}</strong>
                    <small>
                      {sent.length
                        ? `${sent.length} coleta(s) individual(is) recebida(s)`
                        : "Nenhuma coleta enviada até agora"}
                      {cycle.requiredAttachments.length
                        ? ` · ${cycle.requiredAttachments.length} anexos obrigatórios`
                        : ""}
                    </small>
                  </div>
                  <span>{ugCollections.length} responsável(is)</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {cycleSignals.length ? (
        <section className="card focal-signals-card" aria-labelledby="focal-signals-title">
          <div className="table-header">
            <div>
              <span className="eyebrow">Comunicação operacional</span>
              <h3 id="focal-signals-title">Sinalizações dos pontos focais</h3>
            </div>
            <StatusPill tone="info">Somente leitura</StatusPill>
          </div>
          <div className="focal-signal-list" role="list">
            {cycleSignals.map((signal) => {
              const ug = ugList.find((item) => item.id === signal.ugId);
              return (
                <article key={signal.id} className="focal-signal-item" role="listitem">
                  <div>
                    <strong>{ug?.acronym ?? signal.ugId}</strong>
                    <span>
                      {signal.kind === "duvida" ? "Dúvida para intermediação" : "Informação indisponível"}
                    </span>
                  </div>
                  <p>{signal.message}</p>
                  <small>{signal.author} · {signal.createdAt}</small>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="card cycle-list-card">
        <div className="table-header">
          <div>
            <span className="eyebrow">Histórico da coleta</span>
            <h3>Eventos registrados</h3>
          </div>
        </div>
        <CycleTimeline cycle={cycle} collections={cycleCollections} />
      </section>
    </div>
  );
}

function DecisionBox({
  collection,
  onDecide,
}: {
  collection: Collection;
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
          {collection.responseKind === "indisponibilidade" ? "Registrar ciência da indisponibilidade" : "Aprovar resposta"}
        </button>
      </div>
    </div>
  );
}

function StcValidation({
  cycle,
  collections,
  signals,
  respondents,
  ugList,
  validationCollectionId,
  setValidationCollectionId,
  onDecide,
  setView,
}: {
  cycle: CycleItem;
  collections: Collection[];
  signals: FocalSignal[];
  respondents: Respondent[];
  ugList: Ug[];
  validationCollectionId: string;
  setValidationCollectionId: (id: string) => void;
  onDecide: (collectionId: string, decision: "aprovar" | "rejeitar", reason: string) => void;
  setView: (view: View) => void;
}) {
  const cycleCollections = collections.filter((item) => item.cycleId === cycle.id);
  const cycleSignals = signals.filter((item) => item.cycleId === cycle.id);
  const current =
    cycleCollections.find((item) => item.id === validationCollectionId) ?? cycleCollections[0];
  const currentWasSent = current ? collectionWasSubmitted(current) : false;
  const overdue = isPastDeadline(cycle.deadline);
  const operationalStatus = deriveCycleStatus(cycle, collections);

  return (
    <div className="workflow-page wide-page">
      <SectionHeader
        eyebrow="Validação STC"
        title="Receber, aprovar ou rejeitar"
        description="A checagem estrutural já rodou no envio; aqui a STC confere cada coleta individual, agrupada por UG e responsável."
      />

      {cycleSignals.length ? (
        <section className="card focal-signals-card" aria-labelledby="validation-signals-title">
          <div className="table-header">
            <div>
              <span className="eyebrow">Antes de validar</span>
              <h3 id="validation-signals-title">Sinalizações recebidas dos pontos focais</h3>
            </div>
            <StatusPill tone="info">Somente leitura</StatusPill>
          </div>
          <div className="focal-signal-list" role="list">
            {cycleSignals.map((signal) => (
              <article key={signal.id} className="focal-signal-item" role="listitem">
                <div>
                  <strong>{ugList.find((item) => item.id === signal.ugId)?.acronym ?? signal.ugId}</strong>
                  <span>{signal.kind === "duvida" ? "Dúvida" : "Informação indisponível"}</span>
                </div>
                <p>{signal.message}</p>
                <small>{signal.author} · {signal.createdAt}</small>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <div className="validation-grid">
        <section className="card">
          <div className="table-header">
            <h3>Coletas do acionamento</h3>
            <StatusPill tone={cycleTone(operationalStatus)}>{cycleLabel(operationalStatus)}</StatusPill>
          </div>

          <div className="data-table">
            <div className="table-row head">
              <span>UG</span>
              <span>Responsável</span>
              <span>Situação</span>
            </div>
            {cycleCollections.map((collection) => {
              const ug = ugList.find((item) => item.id === collection.ugId);
              const sent = collectionWasSubmitted(collection);
              const late = !sent && overdue;
              const hint = collectionLabel(collection.status);
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
                  <span>{collection.ownerName}</span>
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
          {cycle.requiredAttachments.length ? (
            <p className="muted-text">
              Anexos obrigatórios: {cycle.requiredAttachments.join(", ")}. A checagem estrutural
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

          {!currentWasSent ? (
            <div className="empty-state">
              <Icon name="clock" size={28} />
              <strong>{overdue ? "Não enviado no prazo" : "Aguardando envio"}</strong>
              <span>
                {overdue
                  ? "O prazo terminou sem envio — estado distinto de indisponibilidade informada."
                  : "O responsável ainda não enviou esta coleta pela plataforma."}
              </span>
            </div>
          ) : current ? (
              <CollectionBlock
                collection={current}
                respondent={respondents.find((item) => item.id === current.ownerId)}
                requiredAttachments={cycle.requiredAttachments}
              >
                <>
                  <ReceiptTimeline collection={current} seiNumber={cycle.seiNumber} compact />
                  {current.status === "aguardando-ponto-focal" ? (
                    <p className="muted-text">
                      Aguardando validação do ponto focal — a coleta chega à STC após o
                      encaminhamento.
                    </p>
                  ) : current.status === "em-correcao" ? (
                    <p className="muted-text">Devolvida para correção — aguardando reenvio da UG.</p>
                  ) : current.status === "aprovada" ? null : (
                    <DecisionBox
                      key={current.id}
                      collection={current}
                      onDecide={(decision, reason) =>
                        onDecide(current.id, decision, reason)
                      }
                    />
                  )}
                </>
              </CollectionBlock>
          ) : null}
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
      setUgCreateError("Já existe uma UG com essa sigla, identificador ou e-mail de ponto focal.");
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
                            setUgEditError("Já existe uma UG com essa sigla ou e-mail de ponto focal.");
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
    const statusMatch =
      filters.status === "todos" || deriveCycleStatus(cycle, collections) === filters.status;
    const objectMatch = filters.object === "todos" || cycle.objectCode === filters.object;
    const ugMatch = filters.ug === "todos" || cycle.ugIds.includes(filters.ug);
    const dateFromMatch = !filters.dateFrom || cycle.deadline >= filters.dateFrom;
    const dateToMatch = !filters.dateTo || cycle.deadline <= filters.dateTo;
    const searchMatch =
      !search.trim() ||
      `${cycle.title} ${cycle.objectCode} ${cycle.seiNumber}`.toLowerCase().includes(search.trim().toLowerCase());
    return statusMatch && objectMatch && ugMatch && dateFromMatch && dateToMatch && searchMatch;
  });
  const openCycle = rows.find((item) => item.id === openCycleId) ?? null;
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
                  .filter(collectionWasSubmitted);
                const status = deriveCycleStatus(cycle, collections);
                return (
                  <div key={cycle.id} className="history-row">
                    <span>
                      <strong>{cycle.objectCode}</strong>
                      <small>{cycle.objectName}</small>
                    </span>
                    <span>{cycle.ugIds.map((id) => ugList.find((ug) => ug.id === id)?.acronym ?? id).join(", ")}</span>
                    <span>{kindLabel(cycle.objectKind)}</span>
                    <span>
                      <StatusPill tone={cycleTone(status)}>{cycleLabel(status)}</StatusPill>
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
              const sent = collectionWasSubmitted(collection);
              return (
                <div key={collection.id} className="collection-block">
                  <div className="table-header">
                    <strong>{ug?.acronym ?? collection.ugId} · {collection.ownerName}</strong>
                    <StatusPill tone={collectionTone(collection.status)}>{collectionLabel(collection.status)}</StatusPill>
                  </div>
                  {collection.attachmentJustifications.length ? (
                    <>
                      <p className="muted-text">Justificativas de anexo registradas pela UG:</p>
                      <ObservationThread observations={collection.attachmentJustifications} />
                    </>
                  ) : null}
                  {sent ? (
                      <CollectionBlock
                        collection={collection}
                        respondent={respondents.find((item) => item.id === collection.ownerId)}
                        requiredAttachments={openCycle.requiredAttachments}
                      >
                        {collection.protocol ? (
                          <ReceiptTimeline collection={collection} seiNumber={openCycle.seiNumber} compact />
                        ) : null}
                      </CollectionBlock>
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
  focalUg,
  expandedCycleId,
  setExpandedCycleId,
  openCollection,
  onAddRespondent,
  onRespondAsFocal,
  onSignal,
}: {
  cycles: CycleItem[];
  collections: Collection[];
  respondents: Respondent[];
  focalUg: Ug;
  expandedCycleId: string;
  setExpandedCycleId: (cycleId: string) => void;
  openCollection: (collectionId: string) => void;
  onAddRespondent: (cycleId: string, name: string, email: string) => void;
  onRespondAsFocal: (cycleId: string) => void;
  onSignal: (
    cycleId: string,
    kind: FocalSignal["kind"],
    message: string,
  ) => void;
}) {
  const [registerCycleId, setRegisterCycleId] = useState("");
  const [signalCycleId, setSignalCycleId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [signalKind, setSignalKind] = useState<FocalSignal["kind"]>("duvida");
  const [signalMessage, setSignalMessage] = useState("");
  const orgCycles = cycles.filter(
    (cycle) => cycle.creationStatus === "aprovado" && cycle.ugIds.includes(focalUg.id),
  );
  const orgCollections = collections.filter((item) => item.ugId === focalUg.id);
  const awaiting = orgCollections.filter((item) => item.status === "aguardando-ponto-focal").length;

  const metrics = [
    ["Aguardando sua validação", awaiting, "Dar ciência e encaminhar", "warning"] as const,
    ["Ciclos do órgão", orgCycles.length, `Somente os ciclos da ${focalUg.acronym}`, "info"] as const,
    [
      "Em correção",
      orgCollections.filter((collection) => collection.status === "em-correcao").length,
      "Reabertas pela STC",
      "orange",
    ] as const,
    [
      "Coletas aprovadas",
      orgCollections.filter((collection) => collection.status === "aprovada").length,
      "Com comprovante",
      "success",
    ] as const,
  ];

  return (
    <div className="workflow-page ug-home wide-page">
      <SectionHeader
        eyebrow={`Painel do ponto focal · ${focalUg.acronym}`}
        title={`${focalUg.focalName} — ${focalUg.name}`}
        description="Acompanhe os ciclos destinados ao seu órgão. Expanda um ciclo para ver e verificar cada coleta individual."
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
            <span>Abra a coleta individual para conferir planilha, anexos e encaminhar à STC.</span>
          </div>
        </div>
      ) : null}

      <section className="card cycle-list-card ug-list-card">
        <div className="table-header">
          <div>
            <span className="eyebrow">Ciclos do órgão</span>
            <h3>Expanda um ciclo para ver as coletas por responsável</h3>
          </div>
          <StatusPill tone="info">Pedido no SEI · resposta na plataforma</StatusPill>
        </div>

        <div className="ug-cycle-list">
          {orgCycles.map((cycle) => {
            const cycleCollections = orgCollections.filter((item) => item.cycleId === cycle.id);
            const cycleStatus = deriveCycleStatus(cycle, cycleCollections, focalUg.id);
            const acceptsNewCollections = cycleAcceptsNewCollections(cycle, collections, focalUg.id);
            const expanded = expandedCycleId === cycle.id;
            const panelId = `focal-cycle-${cycle.id}`;
            const toggleId = `focal-cycle-toggle-${cycle.id}`;
            const registerPanelId = `focal-register-${cycle.id}`;
            const signalPanelId = `focal-signal-${cycle.id}`;
            return (
              <article key={cycle.id} className={`focal-cycle-accordion ${cycleStatus}`}>
                <h3 className="focal-cycle-heading">
                  <button
                    id={toggleId}
                    type="button"
                    className="focal-cycle-toggle"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={() => setExpandedCycleId(expanded ? "" : cycle.id)}
                  >
                    <span className="focal-cycle-summary">
                      <span className="focal-cycle-title">
                        <strong>{cycle.title}</strong>
                        <small>{kindLabel(cycle.objectKind)} · SEI {cycle.seiNumber || "a informar"}</small>
                      </span>
                      <span className="focal-cycle-count">{cycleCollections.length} coleta(s)</span>
                      <span className="focal-cycle-deadline">prazo {cycle.deadline}</span>
                      <StatusPill tone={cycleTone(cycleStatus)}>{cycleLabel(cycleStatus, "orgao")}</StatusPill>
                      <span className={`accordion-chevron${expanded ? " open" : ""}`} aria-hidden="true">⌄</span>
                    </span>
                  </button>
                </h3>

                {expanded ? (
                  <div id={panelId} className="focal-cycle-panel" role="region" aria-labelledby={toggleId}>
                    <div className="focal-cycle-rule">
                      <Icon name={cycle.requiresFocalPointValidation ? "shield" : "send"} size={17} />
                      <span>
                        {cycle.requiresFocalPointValidation
                          ? "O ponto focal confere e encaminha cada coleta antes da STC."
                          : "As coletas seguem direto à STC; o ponto focal acompanha e intermedeia pendências."}
                      </span>
                    </div>

                    <div className="focal-collection-list">
                      {cycleCollections.length ? cycleCollections.map((collection) => {
                        const respondent = respondents.find((item) => item.id === collection.ownerId);
                        const late = !collectionWasSubmitted(collection) && isPastDeadline(cycle.deadline);
                        return (
                          <article key={collection.id} className="focal-collection-row">
                            <div className="focal-collection-person">
                              <span className="person-avatar" aria-hidden="true">{collection.ownerName.charAt(0)}</span>
                              <span>
                                <strong>{collection.ownerName}</strong>
                                <small>
                                  {collection.ownerType === "ponto-focal"
                                    ? "Ponto focal"
                                    : respondent?.role ?? "Respondente técnico"}
                                </small>
                              </span>
                            </div>
                            <span>{collection.fileName || "Nenhum arquivo enviado"}</span>
                            <StatusPill tone={late ? "danger" : collectionTone(collection.status)}>
                              {late ? "Atrasada" : collectionLabel(collection.status)}
                            </StatusPill>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => openCollection(collection.id)}
                            >
                              <Icon name="eye" size={16} />
                              {collectionWasSubmitted(collection) ? "Abrir resposta" : "Ver coleta"}
                            </button>
                          </article>
                        );
                      }) : (
                        <div className="empty-state compact-empty"><strong>Nenhum responsável cadastrado</strong></div>
                      )}
                    </div>

                    <div className="focal-cycle-actions">
                      {acceptsNewCollections ? (
                        <>
                          <button type="button" className="secondary-button" aria-expanded={registerCycleId === cycle.id} aria-controls={registerPanelId} onClick={() => setRegisterCycleId(registerCycleId === cycle.id ? "" : cycle.id)}>
                            <Icon name="users" size={16} />Adicionar respondente
                          </button>
                          <button type="button" className="secondary-button" onClick={() => onRespondAsFocal(cycle.id)}>
                            <Icon name="edit" size={16} />Responder como ponto focal
                          </button>
                        </>
                      ) : (
                        <span className="focal-cycle-closed-note">Ciclo finalizado: novas coletas não podem ser criadas.</span>
                      )}
                      <button type="button" className="secondary-button" aria-expanded={signalCycleId === cycle.id} aria-controls={signalPanelId} onClick={() => setSignalCycleId(signalCycleId === cycle.id ? "" : cycle.id)}>
                        <Icon name="bell" size={16} />Sinalizar à STC
                      </button>
                    </div>

                    {acceptsNewCollections && registerCycleId === cycle.id ? (
                      <form
                        id={registerPanelId}
                        className="focal-inline-form"
                        onSubmit={(event) => {
                          event.preventDefault();
                          if (!name.trim() || !email.trim()) return;
                          onAddRespondent(cycle.id, name.trim(), email.trim());
                          setName("");
                          setEmail("");
                          setRegisterCycleId("");
                        }}
                      >
                        <label>Nome do respondente<input value={name} onChange={(event) => setName(event.target.value)} /></label>
                        <label>E-mail institucional<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
                        <button
                          type="submit"
                          className="primary-button"
                          disabled={!name.trim() || !email.trim()}
                        >Criar coleta do respondente</button>
                      </form>
                    ) : null}

                    {signalCycleId === cycle.id ? (
                      <form
                        id={signalPanelId}
                        className="focal-inline-form signal-form"
                        onSubmit={(event) => {
                          event.preventDefault();
                          if (!signalMessage.trim()) return;
                          onSignal(cycle.id, signalKind, signalMessage.trim());
                          setSignalMessage("");
                          setSignalCycleId("");
                        }}
                      >
                        <label>Tipo de sinalização<select value={signalKind} onChange={(event) => setSignalKind(event.target.value as FocalSignal["kind"])}><option value="duvida">Dúvida sobre o pedido</option><option value="informacao-indisponivel">Informação indisponível no órgão</option></select></label>
                        <label>Mensagem para a STC<textarea value={signalMessage} onChange={(event) => setSignalMessage(event.target.value)} /></label>
                        <button
                          type="submit"
                          className="primary-button"
                          disabled={!signalMessage.trim()}
                        >Registrar sinalização</button>
                      </form>
                    ) : null}
                  </div>
                ) : null}
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

function FocalCollectionDetail({
  cycle,
  collection,
  respondent,
  onValidate,
  onReturn,
  notify,
  setView,
}: {
  cycle: CycleItem;
  collection: Collection;
  respondent?: Respondent;
  onValidate: (collectionId: string) => void;
  onReturn: (collectionId: string, reason: string) => void;
  notify: (message: string) => void;
  setView: (view: View) => void;
}) {
  const wasSubmitted = collectionWasSubmitted(collection);

  return (
    <div className="workflow-page wide-page">
      <SectionHeader
        eyebrow="Coleta individual"
        title={`${cycle.objectCode} · ${cycle.objectName}`}
        description={`Resposta de ${collection.ownerName} para o seu órgão. Aqui você confere a planilha, os anexos e o histórico desta coleta.`}
      />

      <div className="detail-layout">
        <section className="card cycle-highlight-card">
          <div className="cycle-highlight-head">
            <div>
              <span className="eyebrow">Responsável</span>
              <h3>{collection.ownerName}</h3>
              <p>{respondent?.role ?? (collection.ownerType === "ponto-focal" ? "Ponto focal" : "Respondente técnico")}</p>
            </div>
            <StatusPill tone={collectionTone(collection.status)}>
              {collectionLabel(collection.status)}
            </StatusPill>
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
              <strong>{collection.submittedAt || "Ainda não enviada"}</strong>
              <span>último envio</span>
            </div>
            <div>
              <strong>{collection.responseKind === "indisponibilidade" ? "Informação indisponível" : "Envio de dados"}</strong>
              <span>tipo de resposta</span>
            </div>
          </div>
          <div className="card-actions">
            <button type="button" className="secondary-button" onClick={() => setView("focal-dashboard")}>
              <Icon name="arrow" />
              Voltar às coletas
            </button>
          </div>
        </section>

        <section className="card">
          <span className="eyebrow">Conteúdo recebido</span>
          <h3>Planilha, anexos e histórico</h3>
          {wasSubmitted ? (
            <CollectionBlock
              collection={collection}
              respondent={respondent}
              requiredAttachments={cycle.requiredAttachments}
            >
              <>
                {collection.fileName ? (
                  <div className="card-actions compact">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => notify(`Download simulado: ${collection.fileName}`)}
                    >
                      <Icon name="download" size={14} />
                      Abrir planilha
                    </button>
                    {collection.attachments.length ? (
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => notify(`Download simulado: ${collection.attachments.length} anexo(s)`)}
                      >
                        <Icon name="file" size={14} />
                        Baixar anexos
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {collection.status === "aguardando-ponto-focal" ? (
                  <FocalDecision
                    negative={collection.responseKind === "indisponibilidade"}
                    onForward={() => onValidate(collection.id)}
                    onReturn={(reason) => onReturn(collection.id, reason)}
                  />
                ) : null}
              </>
            </CollectionBlock>
          ) : (
            <div className="empty-state compact-empty">
              <Icon name="clock" size={28} />
              <strong>Esta coleta ainda não foi enviada</strong>
              <span>O responsável verá apenas a própria coleta quando entrar na plataforma.</span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
function RespAccess({
  cycle,
  ugList,
  registrationOpenUgIds,
  onRegister,
  onLogin,
}: {
  cycle: CycleItem;
  ugList: Ug[];
  registrationOpenUgIds: string[];
  onRegister: (data: { name: string; email: string; phone: string; role: string; ugId: string; password: string }) => void;
  onLogin: (email: string, password: string) => boolean;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    ugId: registrationOpenUgIds[0] ?? cycle.ugIds[0] ?? "",
  });
  const [password, setPassword] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState(false);
  const registrationNameRef = useRef<HTMLInputElement>(null);
  const registrationPasswordRef = useRef<HTMLInputElement>(null);
  const previousStepRef = useRef<1 | 2>(step);

  useEffect(() => {
    if (previousStepRef.current === step) return;
    if (step === 2) registrationPasswordRef.current?.focus();
    else registrationNameRef.current?.focus();
    previousStepRef.current = step;
  }, [step]);

  const ug = ugList.find((item) => item.id === form.ugId);
  const mismatch = !cycle.ugIds.includes(form.ugId);
  const canContinue =
    form.name.trim() &&
    form.email.trim() &&
    form.role.trim() &&
    registrationOpenUgIds.includes(form.ugId);

  return (
    <div className="workflow-page wide-page">
      <SectionHeader
        eyebrow="Acesso pelo link do ciclo"
        title="Identifique-se para responder"
        description="Toda resposta é enviada em nome do órgão e fica registrada com o nome de quem enviou."
      />

      {/* §5: cabeçalho fixo — a pessoa chegou de um link e precisa saber onde está. */}
      <section className="card access-context">
        <Icon name="link" />
        <div>
          <span>Você chegou pelo link deste ciclo</span>
          <strong>
            {cycle.objectCode} · {cycle.objectName}
          </strong>
          <span>
            {ug?.name ?? form.ugId} · prazo {cycle.deadline} · SEI {cycle.seiNumber || "a informar"}
          </span>
        </div>
      </section>

      {/* §5: duas portas em pé de igualdade, claramente separadas. */}
      <div className="access-doors">
        {registrationOpenUgIds.length > 0 ? (
        <section className="card access-door">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (step === 1) {
                if (canContinue) setStep(2);
                return;
              }
              if (password.trim()) onRegister({ ...form, password });
            }}
          >
          <span className="eyebrow">Primeiro acesso</span>
          <h3>Criar cadastro</h3>
          <p className="muted-text">Nome, e-mail, telefone, cargo e órgão — com validação por e-mail e senha.</p>

        {step === 1 ? (
          <>
            <div className="details-form">
              <label>
                Nome completo
                <input
                  ref={registrationNameRef}
                  autoComplete="name"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </label>
              <label>
                E-mail
                <input
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                />
              </label>
              <label>
                Telefone
                <input
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                />
              </label>
              <label>
                Cargo / setor
                <input value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} />
              </label>
              <label className="full-row">
                Órgão
                <select value={form.ugId} onChange={(event) => setForm({ ...form, ugId: event.target.value })}>
                  {ugList.filter((item) => registrationOpenUgIds.includes(item.id)).map((item) => (
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
                    Este ciclo não inclui {ug?.acronym ?? form.ugId}. Confira seu vínculo — o
                    cruzamento fica registrado para a STC.
                  </span>
                </div>
              </div>
            ) : null}

            <div className="card-actions">
              <button
                type="submit"
                className="primary-button ripple-button"
                disabled={!canContinue}
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
                  ref={registrationPasswordRef}
                  type="password"
                  autoComplete="new-password"
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
                type="submit"
                className="primary-button ripple-button"
                disabled={!password.trim()}
              >
                <Icon name="check" />
                Confirmar e-mail e acessar a coleta
              </button>
            </div>
          </>
        ) : null}

          </form>
        </section>
        ) : (
          <section className="card access-door access-door-closed">
            <span className="eyebrow">Primeiro acesso</span>
            <h3>Cadastro encerrado</h3>
            <p className="muted-text">Este ciclo foi finalizado e não aceita novas coletas. Contas já vinculadas ainda podem entrar para consultar o comprovante.</p>
          </section>
        )}

        <section className="card access-door">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!loginEmail.trim() || !loginPassword.trim()) return;
              if (!onLogin(loginEmail, loginPassword)) setLoginError(true);
            }}
          >
          <span className="eyebrow">Já tenho cadastro</span>
          <h3>Entrar</h3>
          <p className="muted-text">Use o e-mail e a senha criados no primeiro acesso.</p>
          <>
            <div className="details-form">
              <label>
                E-mail
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="ex.: joao.lima@seduc.ma.gov.br"
                  aria-invalid={loginError || undefined}
                  aria-describedby={loginError ? "respondent-login-error" : undefined}
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
                  autoComplete="current-password"
                  aria-invalid={loginError || undefined}
                  aria-describedby={loginError ? "respondent-login-error" : undefined}
                  value={loginPassword}
                  onChange={(event) => {
                    setLoginPassword(event.target.value);
                    setLoginError(false);
                  }}
                />
              </label>
            </div>
            {loginError ? (
              <div id="respondent-login-error" className="alert danger" role="alert">
                <Icon name="x" />
                <div>
                  <strong>Cadastro não encontrado</strong>
                  <span>Confira o e-mail ou use o primeiro acesso para se cadastrar.</span>
                </div>
              </div>
            ) : null}
            <div className="card-actions">
              <button
                type="submit"
                className="primary-button ripple-button"
                disabled={!loginEmail.trim() || !loginPassword.trim()}
              >
                <Icon name="lock" />
                Entrar
              </button>
            </div>
          </>
          </form>
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
  const myCollections = collections.filter(
    (item) => item.ownerType === "respondente" && item.ownerId === respondent.id,
  );

  const actionLabel = (status: CollectionStatus) => {
    if (status === "pendente" || status === "rascunho") return "Responder coleta";
    if (status === "em-correcao") return "Corrigir envio";
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
          <StatusPill tone="info">Toda coleta tem responsável identificado</StatusPill>
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
            const status = collection.status;
            const rowClass =
              status === "em-correcao" ? "correcao" : status === "aprovada" ? "finalizado" : "ativo";
            return (
              <article key={collection.id} className={`ug-cycle-row ${rowClass}`}>
                <div className="ug-cycle-status">
                  <StatusPill tone={collectionTone(status)}>{collectionLabel(status)}</StatusPill>
                  <span>prazo {cycle?.deadline ?? "—"}</span>
                </div>
                <div className="ug-cycle-main">
                  <strong>
                    {cycle?.objectCode} · {cycle?.objectName}
                  </strong>
                  <span>
                    {ugList.find((item) => item.id === collection.ugId)?.name ?? collection.ugId} ·{" "}
                    {cycle ? kindLabel(cycle.objectKind) : "Objeto"}
                  </span>
                  {status === "em-correcao" ? (
                    <p>{collection.rejectionReason}</p>
                  ) : (
                    <p>
                      {cycle?.objectKind === "fixo"
                        ? cycle?.spreadsheetStatus === "fixed-template-pending"
                          ? `Modelo fixo ${cycle.objectCode} pendente de vinculação`
                          : "Modelo fixo disponível para download"
                        : "Planilha gerada pela STC"}
                      {cycle?.requiredAttachments.length
                        ? ` · ${cycle.requiredAttachments.length} anexos obrigatórios.`
                        : "."}
                    </p>
                  )}
                </div>
                <div className="ug-cycle-meta">
                  <span>{collection.fileName || "Nenhum arquivo enviado"}</span>
                  <span>{collection.protocol ? `Protocolo ${collection.protocol}` : "Sem comprovante ainda"}</span>
                </div>
                <button
                  type="button"
                  className={
                    status === "pendente" || status === "rascunho" || status === "em-correcao"
                      ? "primary-button ripple-button"
                      : "secondary-button"
                  }
                  onClick={() => openCollection(collection.id)}
                >
                  <Icon name={status === "em-correcao" ? "refresh" : status === "pendente" || status === "rascunho" ? "send" : "eye"} />
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
  const response = collection;
  const correcting = response.status === "em-correcao";
  // Enviada (fora rascunho/reaberto) = não editável: o wizard abre direto no comprovante (etapa 4).
  const sent = collectionWasSubmitted(response) && response.status !== "rascunho" && response.status !== "em-correcao";
  const readOnly = sent;
  const hasReceipts = Boolean(response.receipts.length);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(sent ? 4 : correcting ? 2 : 1);
  const [fileName, setFileName] = useState(response.fileName);
  const [attachments, setAttachments] = useState<string[]>(response.attachments);
  const [sheetOutOfModel, setSheetOutOfModel] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [negativeOpen, setNegativeOpen] = useState(false);
  const [negativeReason, setNegativeReason] = useState("");
  const [contactOpen, setContactOpen] = useState(false);
  const [contactReason, setContactReason] = useState("");
  const [downloaded, setDownloaded] = useState(false);

  const ug = ugList.find((item) => item.id === collection.ugId);
  const required = cycle?.requiredAttachments ?? [];
  const fixedTemplatePending =
    cycle?.objectKind === "fixo" && cycle.spreadsheetStatus === "fixed-template-pending";
  // Correção 3: checagem de anexos por CONTAGEM — enviados ≥ exigidos. Nunca pelo título,
  // nunca pelo conteúdo; pode enviar mais que o exigido, nunca menos.
  const anexosOk = attachmentsMeetRequirement(attachments.length, required.length);
  // Correção 4 (protótipo sem backend): a leitura das colunas é simulada; o controle abaixo
  // força "planilha fora do modelo" para o caminho de reprovação ser demonstrável.
  const planilhaOk = !fixedTemplatePending && Boolean(fileName) && !sheetOutOfModel;
  const structuralOk = !fixedTemplatePending && planilhaOk && anexosOk;
  const missingCount = required.length - attachments.length;
  const templateName = `${cycle?.objectCode ?? "coleta"}_planilha_${cycle?.objectKind === "fixo" ? "padrao" : "gerada"}.xlsx`;
  const uploadName = `${(cycle?.objectCode ?? "coleta").toLowerCase()}_${collection.ugId}_${correcting ? "corrigida" : "preenchida"}.xlsx`;

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
            {cycle?.objectCode ?? "Coleta"} · {ug?.acronym ?? collection.ugId} · {cycle ? kindLabel(cycle.objectKind) : "Objeto"}
          </span>
          <h2>{cycle?.objectName ?? "Coleta individual"}</h2>
          <span className="wizard-deadline">
            prazo {cycle?.deadline ?? "—"}
            {cycle ? ` · ${deadlineContext(cycle.deadline)}` : ""} · SEI {cycle?.seiNumber || "a informar"}
          </span>
        </div>
        <div className="wizard-topbar-side">
          <StatusPill tone={collectionTone(response.status)}>
            {collectionLabel(response.status)}
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
            aria-label={`Etapa ${index + 1}: ${label} — ${
              state === "done" ? "concluída" : step === index + 1 ? "atual" : "pendente"
            }`}
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
                  As informações de <strong>{cycle?.objectName ?? "esta coleta"}</strong> do órgão{" "}
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
                    ? `Modelo fixo ${cycle?.objectCode ?? ""} pendente de vinculação`
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
                <div
                  className="field-table-scroll"
                  role="region"
                  aria-label="Estrutura das colunas da planilha"
                  aria-describedby="field-table-scroll-hint"
                  tabIndex={0}
                >
                  <table className="field-table">
                    <caption className="sr-only">Colunas exigidas na planilha-padrão</caption>
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
                <p id="field-table-scroll-hint" className="table-scroll-hint">Use as setas ou deslize horizontalmente para ver todas as colunas.</p>
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
            {correcting ? (
              <div className="correction-highlight">
                <div className="correction-head">
                  <Icon name="refresh" />
                  <div>
                    <strong>Devolvida para correção — leia antes de reenviar</strong>
                    <span>O pedido de correção, com autor e data:</span>
                  </div>
                </div>
                <ObservationThread observations={response.observations} />
              </div>
            ) : null}

            {cycle?.objectKind === "fixo" ? (
              <div className="sheet-preview">
                <span className="eyebrow">
                  {fixedTemplatePending
                    ? "Estrutura esperada do modelo fixo (arquivo pendente)"
                    : "Prévia da planilha-padrão"}
                </span>
                <div
                  className="sheet-preview-scroll"
                  role="region"
                  aria-label="Prévia horizontal da planilha"
                  aria-describedby="sheet-preview-scroll-hint"
                  tabIndex={0}
                >
                  <table>
                    <caption className="sr-only">Prévia das colunas e formatos da planilha</caption>
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
                <p id="sheet-preview-scroll-hint" className="table-scroll-hint">Use as setas ou deslize horizontalmente para consultar a prévia completa.</p>
              </div>
            ) : null}

            {fixedTemplatePending && !readOnly ? (
              <div className="alert warning wide" role="status">
                <Icon name="clock" />
                <div>
                  <strong>Envio temporariamente indisponível</strong>
                  <span>
                    O modelo fixo {cycle?.objectCode} ainda não foi vinculado. Não é possível subir nem enviar planilha; a resposta negativa continua disponível.
                  </span>
                </div>
              </div>
            ) : null}

        <div className="model-upload-grid">
          <article className="model-preview">
            <span className="eyebrow">
              {cycle?.objectKind === "fixo"
                ? "Modelo fixo do Tesauro/Registro"
                : "Planilha-padrão gerada pela STC"}
            </span>
            <h4>{fixedTemplatePending ? `${cycle?.objectCode} · arquivo pendente` : templateName}</h4>
            <p>
              {fixedTemplatePending
                ? "O código do modelo está registrado, mas o arquivo real ainda precisa ser vinculado pela STC."
                : cycle?.objectKind === "fixo"
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
                ? `Modelo fixo ${cycle?.objectCode} pendente de vinculação`
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
            {hasReceipts ? (
              <>
                {response.status === "aguardando-ponto-focal" ? (
                  <div className="alert">
                    <Icon name="clock" />
                    <div>
                      <strong>Aguardando o ponto focal do órgão</strong>
                      <span>Ele dá ciência de que esta é a resposta do órgão antes do envio à STC.</span>
                    </div>
                  </div>
                ) : null}
                {response.status === "aguardando-stc" ? (
                  <div className="alert">
                    <Icon name="clipboard" />
                    <div>
                      <strong>Em verificação pela STC</strong>
                      <span>A checagem estrutural passou; o conteúdo é conferido manualmente pela equipe.</span>
                    </div>
                  </div>
                ) : null}
                {response.status === "aprovada" ? (
                  <div className="quality-strip success">
                    <Icon name="check" />
                    <div>
                      <strong>Resposta aprovada pela STC</strong>
                      <span>A coleta segue para fechamento; o comprovante fica disponível abaixo.</span>
                    </div>
                  </div>
                ) : null}
                {response.responseKind === "indisponibilidade" ? (
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

                <ReceiptTimeline collection={response} seiNumber={cycle?.seiNumber ?? ""} compact />

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

                <ObservationThread observations={response.observations} />

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
              <button
                type="button"
                className="ghost-button"
                onClick={() => setNegativeOpen(true)}
              >
                <Icon name="x" size={16} />
                Não tenho esta informação
              </button>
              {!correcting ? (
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={fixedTemplatePending || (!fileName && !attachments.length)}
                    onClick={() => onSaveDraft(fileName, attachments)}
                  >
                    <Icon name="edit" size={16} />
                    Salvar rascunho
                  </button>
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
                  ? `Aguarde a STC vincular o modelo fixo ${cycle?.objectCode ?? ""} antes de responder. `
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
  const [currentFocalUgId, setCurrentFocalUgId] = useState("");
  // §2.1: funil invertido — o TIPO é escolhido antes do objeto; a tela nasce sem objeto selecionado.
  const [createKind, setCreateKind] = useState<ObjectKind | null>(null);
  const [objectId, setObjectId] = useState("");
  const [selectedUgs, setSelectedUgs] = useState<string[]>([]);
  const [selectedMetadataIds, setSelectedMetadataIds] = useState<string[]>([]);
  const [draft, setDraft] = useState<CycleDraft>(draftForObject(defaultObject));
  const [activeCycleId, setActiveCycleId] = useState("ciclo-100");
  const [editingCycleId, setEditingCycleId] = useState("");
  const [reviewCycleId, setReviewCycleId] = useState("");
  const [activeCollectionId, setActiveCollectionId] = useState("collection-ciclo-100-resp-joao");
  const [linkCycleId, setLinkCycleId] = useState("ciclo-100");
  const [validationCollectionId, setValidationCollectionId] = useState("collection-ciclo-100-resp-joao");
  const [expandedFocalCycleId, setExpandedFocalCycleId] = useState("");
  const [focalSignals, setFocalSignals] = useState<FocalSignal[]>([]);
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
  const requiredAttachmentsOf = (object: TransparencyObject): string[] =>
    requiredAttachmentsForObject(object, objectAttachmentsRegistry[object.code] ?? []);
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
  const activeCollection = collections.find((item) => item.id === activeCollectionId) ?? null;
  const linkCycle = cycles.find((item) => item.id === linkCycleId) ?? null;
  const currentRespondent = respondents.find((item) => item.id === currentRespondentId) ?? null;
  const currentFocalUg = ugList.find((item) => item.id === currentFocalUgId) ?? null;

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

  const updateIndividualCollection = (
    collectionId: string,
    mutate: (collection: Collection) => Collection,
  ) => {
    const target = collections.find((item) => item.id === collectionId);
    if (!target) return;
    const nextCollections = collections.map((item) =>
      item.id === collectionId ? mutate(item) : item,
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
    const count = collections.filter((item) => item.protocol).length;
    return `AG-2026-${String(29 + count).padStart(5, "0")}`;
  };

  const saveCollectionDraft = (collectionId: string, fileName: string, attachments: string[]) => {
    updateIndividualCollection(collectionId, (collection) => ({
      ...collection,
      status: "rascunho",
      fileName,
      attachments,
      submittedAt: "",
    }));
  };

  const cycleOfCollection = (collectionId: string) =>
    cycles.find((item) => item.id === collections.find((col) => col.id === collectionId)?.cycleId);

  const sendCollection = (collectionId: string, fileName: string, attachments: string[]) => {
    const cycle = cycleOfCollection(collectionId);
    updateIndividualCollection(collectionId, (collection) => {
      const resending = collection.status === "em-correcao";
      const protocol = collection.protocol || nextProtocol();
      const summary = resending
        ? "Correção reenviada pela plataforma."
        : "Planilha e anexos enviados pela plataforma.";
      return {
        ...collection,
        responseKind: "dados",
        rejectionReason: "",
        receipts: [
          ...collection.receipts,
          createReceipt(
            "envio",
            protocol,
            collection.ownerName,
            currentDateLabel(),
            collection.receipts.length,
            summary,
          ),
        ],
        status: statusAfterCollectionSend(
          collection.ownerType,
          Boolean(cycle?.requiresFocalPointValidation),
          false,
        ),
        protocol,
        fileName,
        attachments,
        submittedAt: currentDateLabel(),
        observations: [
          ...collection.observations,
          {
            author: collection.ownerName,
            date: currentDateLabel(),
            text: summary,
          },
        ],
      };
    });
  };

  const sendUnavailableCollection = (collectionId: string, reason: string) => {
    const cycle = cycleOfCollection(collectionId);
    updateIndividualCollection(collectionId, (collection) => {
      const protocol = collection.protocol || nextProtocol();
      return {
        ...collection,
        rejectionReason: "",
        receipts: [
          ...collection.receipts,
          createReceipt(
            "envio",
            protocol,
            collection.ownerName,
            currentDateLabel(),
            collection.receipts.length,
            `Indisponibilidade de informação registrada: ${reason}`,
          ),
        ],
        status: statusAfterCollectionSend(
          collection.ownerType,
          Boolean(cycle?.requiresFocalPointValidation),
          true,
        ),
        responseKind: "indisponibilidade",
        protocol,
        fileName: "",
        attachments: [],
        submittedAt: currentDateLabel(),
        observations: [
          ...collection.observations,
          { author: collection.ownerName, date: currentDateLabel(), text: reason },
        ],
      };
    });
  };

  const focalValidateCollection = (collectionId: string) => {
    const target = collections.find((collection) => collection.id === collectionId);
    if (
      !currentFocalUg ||
      !target ||
      target.ugId !== currentFocalUg.id ||
      target.status !== "aguardando-ponto-focal"
    ) return;
    updateIndividualCollection(collectionId, (collection) => ({
      ...collection,
      status: statusAfterFocal(collection.responseKind === "indisponibilidade"),
      observations: [
        ...collection.observations,
        {
          author: `${currentFocalUg.focalName} · ponto focal`,
          date: currentDateLabel(),
          text: "Validado como resposta do órgão e encaminhado à STC.",
        },
      ],
    }));
  };

  const focalReturnCollection = (collectionId: string, reason: string) => {
    const target = collections.find((collection) => collection.id === collectionId);
    if (
      !currentFocalUg ||
      !target ||
      target.ugId !== currentFocalUg.id ||
      target.status !== "aguardando-ponto-focal" ||
      !reason.trim()
    ) return;
    updateIndividualCollection(collectionId, (collection) => ({
      ...collection,
      status: "em-correcao",
      rejectionReason: reason,
      observations: [
        ...collection.observations,
        { author: `${currentFocalUg.focalName} · ponto focal`, date: currentDateLabel(), text: reason },
      ],
    }));
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
                { author: item.ownerName, date: currentDateLabel(), text: reason },
              ],
            }
          : item,
      ),
    );
  };

  const decideCollection = (
    collectionId: string,
    decision: "aprovar" | "rejeitar",
    reason: string,
  ) => {
    updateIndividualCollection(collectionId, (item) => {
        if (decision === "rejeitar") {
          return {
            ...item,
            receipts: [
              ...item.receipts,
              createReceipt(
                "rejeicao",
                item.protocol,
                "Equipe STC",
                currentDateLabel(),
                item.receipts.length,
                reason || "Correção solicitada pela STC.",
              ),
            ],
            status: "em-correcao",
            rejectionReason: reason,
            observations: [...item.observations, { author: "Equipe STC", date: currentDateLabel(), text: reason }],
          };
        }
        const closingSummary = item.responseKind === "indisponibilidade"
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
              currentDateLabel(),
              item.receipts.length,
              closingSummary,
            ),
          ],
          status: "aprovada",
          rejectionReason: "",
          observations: [
            ...item.observations,
            {
              author: "Equipe STC",
              date: currentDateLabel(),
              text: closingSummary,
            },
          ],
        };
      });
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
      !isValidIsoDate(draft.deadline) ||
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
                lastUpdatedAt: currentDateLabel(),
                lastUpdatedBy: "Analista STC",
                reviewHistory: [
                  ...cycle.reviewHistory,
                  {
                    id: `${cycle.id}-analista-${cycle.reviewHistory.length + 1}`,
                    type: wasReturned ? "reenviado" : "alterado",
                    author: "Analista STC",
                    date: currentDateLabel(),
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
      createdAt: currentDateLabel(),
      createdAtIso: new Date().toISOString(),
      deadline: draft.deadline,
      status: "em-andamento",
      seiNumber: draft.seiNumber,
      linkToken: "",
      ugIds: [...selectedUgs],
      metadataLabels: selectedFields.map((field) => field.label),
      metadataIds: selectedFields.map((field) => field.id),
      requiresFocalPointValidation: draft.requiresFocalPointValidation,
      requiredAttachments,
      creationStatus: "aguardando-analise",
      creationObservations: draft.observations,
      notificationChannel: draft.notificationChannel.trim(),
      lastUpdatedAt: currentDateLabel(),
      lastUpdatedBy: "Analista STC",
      reviewHistory: [
        {
          id: `${cycleId}-enviado-1`,
          type: "enviado",
          author: "Analista STC",
          date: currentDateLabel(),
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
      !isValidIsoDate(reviewDraft.deadline) ||
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
      date: currentDateLabel(),
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
      lastUpdatedAt: currentDateLabel(),
      lastUpdatedBy: "Especialista STC",
      reviewHistory: [...cycle.reviewHistory, event],
    };

    if (action === "aprovar") {
      reviewedCycle.linkToken = cycle.linkToken || `agz-${cycle.id}`;
      reviewedCycle.status = "em-andamento";
      setActiveCycleId(cycle.id);
      setToast("Ciclo aprovado; link único liberado para as UGs");
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
      ...draftForObject(nextObject, objectAttachmentsRegistry[nextObject.code] ?? []),
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
  const copyCycleLink = async (cycle: CycleItem) => {
    const link = cycleLink(cycle);
    if (!link) return;
    try {
      await navigator.clipboard.writeText(`https://${link}`);
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
      setCycles((current) =>
        current.map((cycle) =>
          cycle.creationStatus !== "aprovado" && cycle.objectCode === currentObject.code
            ? {
                ...cycle,
                objectCode: normalizedPatch.code,
                objectName: titleCase(normalizedPatch.name),
              }
            : cycle,
        ),
      );
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

  const normalizeAccountEmail = (email: string) => email.trim().toLowerCase();
  const stcAccessEmails = ["analista@stc.ma.gov.br", "especialista@stc.ma.gov.br"];
  const emailReservedForRespondent = (email: string): boolean => {
    const normalizedEmail = normalizeAccountEmail(email);
    return (
      stcAccessEmails.includes(normalizedEmail) ||
      ugList.some((item) => normalizeAccountEmail(item.focalEmail) === normalizedEmail)
    );
  };
  const focalEmailUnavailable = (email: string, excludedUgId = ""): boolean => {
    const normalizedEmail = normalizeAccountEmail(email);
    if (!normalizedEmail || stcAccessEmails.includes(normalizedEmail)) return true;
    return (
      ugList.some(
        (item) =>
          item.id !== excludedUgId && normalizeAccountEmail(item.focalEmail) === normalizedEmail,
      ) ||
      respondents.some((item) => normalizeAccountEmail(item.email) === normalizedEmail)
    );
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
    if (focalEmailUnavailable(data.focalEmail)) {
      setToast("E-mail já vinculado a outra UG ou perfil de acesso");
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
    const focalEmail = patch.focalEmail?.trim() || currentUg.focalEmail;
    const focalName = patch.focalName?.trim() || currentUg.focalName;
    const duplicateAcronym = ugList.some(
      (item) =>
        item.id !== id &&
        item.acronym.trim().toLocaleLowerCase("pt-BR") === acronym.toLocaleLowerCase("pt-BR"),
    );
    if (!acronym || duplicateAcronym) {
      setToast(duplicateAcronym ? "Sigla já cadastrada para outra UG" : "Informe a sigla da UG");
      return false;
    }
    if (focalEmailUnavailable(focalEmail, id)) {
      setToast("E-mail já vinculado a outra UG ou perfil de acesso");
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
              focalName,
              focalEmail,
            }
          : item,
      ),
    );
    if (focalName !== currentUg.focalName) {
      setCollections((current) =>
        current.map((collection) =>
          collection.ugId === id && collection.ownerType === "ponto-focal"
            ? { ...collection, ownerName: focalName }
            : collection,
        ),
      );
    }
    setToast("Cadastro da UG atualizado");
    return true;
  };

  const openCycleLink = (cycleId: string) => {
    const cycle = cycles.find((item) => item.id === cycleId);
    if (!cycle || !cycleLink(cycle)) return;
    setLinkCycleId(cycleId);
    setRole("respondente");
    setCurrentFocalUgId("");
    setExpandedFocalCycleId("");
    setProfileOpen(false);
    if (!currentRespondent) {
      setView("resp-access");
      return;
    }
    if (!cycle.ugIds.includes(currentRespondent.ugId)) {
      setToast("Seu órgão não faz parte deste ciclo");
      setView("resp-dashboard");
      return;
    }
    const existingCollection = collections.find(
      (item) =>
        item.cycleId === cycle.id &&
        item.ownerType === "respondente" &&
        item.ownerId === currentRespondent.id,
    );
    if (!existingCollection && !cycleAcceptsNewCollections(cycle, collections, currentRespondent.ugId)) {
      setToast("Este ciclo foi finalizado e não aceita novas coletas");
      setView("resp-dashboard");
      return;
    }
    const ensured = ensureIndividualCollection(collections, cycle, {
      id: currentRespondent.id,
      type: "respondente",
      name: currentRespondent.name,
      ugId: currentRespondent.ugId,
    });
    commitEnsuredCollections(cycle, ensured.collections);
    setActiveCollectionId(ensured.collection.id);
    setView("resp-collection");
  };

  const commitEnsuredCollections = (cycle: CycleItem, nextCollections: Collection[]) => {
    setCollections(nextCollections);
    setCycles((current) =>
      current.map((item) =>
        item.id === cycle.id
          ? { ...item, status: deriveCycleStatus(item, nextCollections) }
          : item,
      ),
    );
  };

  const registerRespondentBySelf = (data: {
    name: string;
    email: string;
    phone: string;
    role: string;
    ugId: string;
    password: string;
  }) => {
    if (!linkCycle || !linkCycle.ugIds.includes(data.ugId)) return;
    if (!cycleAcceptsNewCollections(linkCycle, collections, data.ugId)) {
      setToast("Este ciclo foi finalizado e não aceita novas coletas");
      return;
    }
    if (emailReservedForRespondent(data.email)) {
      setToast("Este e-mail pertence a um perfil institucional e não pode ser usado por respondente");
      return;
    }
    const existing = respondents.find(
      (item) => normalizeAccountEmail(item.email) === normalizeAccountEmail(data.email),
    );
    if (existing && existing.ugId !== data.ugId) {
      setToast("Este e-mail já está vinculado a outro órgão");
      return;
    }
    if (existing?.emailVerified) {
      setToast("Este e-mail já possui cadastro — use a opção Entrar");
      return;
    }
    if (!existing) {
      const emailDomain = normalizeAccountEmail(data.email).split("@")[1] ?? "";
      const domainMatches = linkCycle.ugIds.filter((ugId) => {
        const focalEmail = ugList.find((item) => item.id === ugId)?.focalEmail ?? "";
        return (normalizeAccountEmail(focalEmail).split("@")[1] ?? "") === emailDomain;
      });
      if (domainMatches.length !== 1 || domainMatches[0] !== data.ugId) {
        setToast(
          "O domínio do e-mail não corresponde à UG selecionada; peça ao ponto focal para pré-cadastrar seu acesso",
        );
        return;
      }
    }
    const respondent: Respondent = existing
      ? { ...existing, ...data, email: data.email.trim(), emailVerified: true }
      : {
          ...data,
          email: data.email.trim(),
          id: `resp-auto-${respondents.length + 1}`,
          createdBySelf: true,
          emailVerified: true,
        };
    setRespondents(
      existing
        ? respondents.map((item) => (item.id === existing.id ? respondent : item))
        : [...respondents, respondent],
    );
    const ensured = ensureIndividualCollection(collections, linkCycle, {
      id: respondent.id,
      type: "respondente",
      name: respondent.name,
      ugId: respondent.ugId,
    });
    commitEnsuredCollections(linkCycle, ensured.collections);
    setCurrentRespondentId(respondent.id);
    setActiveCollectionId(ensured.collection.id);
    setView("resp-collection");
  };

  const loginRespondentFromCollection = (email: string, password: string): boolean => {
    if (emailReservedForRespondent(email)) return false;
    const found = respondents.find(
      (item) => normalizeAccountEmail(item.email) === normalizeAccountEmail(email),
    );
    if (
      !found ||
      found.password !== password ||
      !linkCycle ||
      !linkCycle.ugIds.includes(found.ugId)
    ) return false;
    const existingCollection = collections.find(
      (item) =>
        item.cycleId === linkCycle.id &&
        item.ownerType === "respondente" &&
        item.ownerId === found.id,
    );
    if (!existingCollection && !cycleAcceptsNewCollections(linkCycle, collections, found.ugId)) return false;
    const ensured = ensureIndividualCollection(collections, linkCycle, {
      id: found.id,
      type: "respondente",
      name: found.name,
      ugId: found.ugId,
    });
    commitEnsuredCollections(linkCycle, ensured.collections);
    setCurrentRespondentId(found.id);
    setActiveCollectionId(ensured.collection.id);
    setView("resp-collection");
    return true;
  };

  const registerRespondentByFocal = (cycleId: string, name: string, email: string) => {
    const cycle = cycles.find((item) => item.id === cycleId);
    if (
      !currentFocalUg ||
      !cycle ||
      !cycleAcceptsNewCollections(cycle, collections, currentFocalUg.id) ||
      !cycle.ugIds.includes(currentFocalUg.id)
    ) return;
    if (emailReservedForRespondent(email)) {
      setToast("Este e-mail pertence a um perfil institucional e não pode ser usado por respondente");
      return;
    }
    const existing = respondents.find(
      (item) => normalizeAccountEmail(item.email) === normalizeAccountEmail(email),
    );
    if (existing && existing.ugId !== currentFocalUg.id) {
      setToast("Este e-mail já está vinculado a outro órgão");
      return;
    }
    const respondent: Respondent = existing ?? {
      id: `resp-pf-${respondents.length + 1}`,
      name,
      email,
      phone: "",
      role: "Respondente técnico",
      ugId: currentFocalUg.id,
      password: "",
      createdBySelf: false,
      emailVerified: false,
    };
    if (!existing) setRespondents([...respondents, respondent]);
    const ensured = ensureIndividualCollection(collections, cycle, {
      id: respondent.id,
      type: "respondente",
      name: respondent.name,
      ugId: currentFocalUg.id,
    });
    commitEnsuredCollections(cycle, ensured.collections);
    setToast("Respondente adicionado à coleta");
  };

  const respondAsFocal = (cycleId: string) => {
    const cycle = cycles.find((item) => item.id === cycleId);
    if (
      !currentFocalUg ||
      !cycle ||
      !cycleAcceptsNewCollections(cycle, collections, currentFocalUg.id) ||
      !cycle.ugIds.includes(currentFocalUg.id)
    ) return;
    const ensured = ensureIndividualCollection(collections, cycle, {
      id: currentFocalUg.id,
      type: "ponto-focal",
      name: currentFocalUg.focalName,
      ugId: currentFocalUg.id,
    });
    commitEnsuredCollections(cycle, ensured.collections);
    setActiveCollectionId(ensured.collection.id);
    setExpandedFocalCycleId(cycleId);
    setView("focal-collection-detail");
  };

  const registerFocalSignal = (
    cycleId: string,
    kind: FocalSignal["kind"],
    message: string,
  ) => {
    const cycle = cycles.find((item) => item.id === cycleId);
    if (
      !currentFocalUg ||
      !cycle ||
      cycle.creationStatus !== "aprovado" ||
      !cycle.ugIds.includes(currentFocalUg.id) ||
      !message.trim()
    ) return;
    setFocalSignals([
      ...focalSignals,
      {
        id: `signal-${focalSignals.length + 1}`,
        cycleId,
        ugId: currentFocalUg.id,
        kind,
        message,
        author: currentFocalUg.focalName,
        createdAt: currentDateLabel(),
      },
    ]);
    setToast("Sinalização registrada para a STC");
  };

  const loginByEmail = (email: string, password: string): boolean => {
    const normalizedEmail = normalizeAccountEmail(email);
    if (normalizedEmail === "analista@stc.ma.gov.br") {
      if (password !== "senha-simulada") return false;
      setCurrentFocalUgId("");
      setCurrentRespondentId("");
      setRole("stc-analista");
      setView("stc-home");
      return true;
    }
    if (normalizedEmail === "especialista@stc.ma.gov.br") {
      if (password !== "senha-simulada") return false;
      setCurrentFocalUgId("");
      setCurrentRespondentId("");
      setRole("stc-especialista");
      setView("stc-home");
      return true;
    }
    const matchingInstitutionalUgs = ugList.filter(
      (item) => normalizeAccountEmail(item.focalEmail) === normalizedEmail,
    );
    if (matchingInstitutionalUgs.length > 0) {
      const focalUg =
        matchingInstitutionalUgs.length === 1 && matchingInstitutionalUgs[0].id !== "stc"
          ? matchingInstitutionalUgs[0]
          : null;
      if (!focalUg || password !== "senha-simulada") return false;
      setCurrentFocalUgId(focalUg.id);
      setCurrentRespondentId("");
      setExpandedFocalCycleId("");
      setRole("ponto-focal");
      setView("focal-dashboard");
      return true;
    }
    const respondent = respondents.find(
      (item) => normalizeAccountEmail(item.email) === normalizedEmail && item.password === password,
    );
    if (!respondent) return false;
    setCurrentFocalUgId("");
    setCurrentRespondentId(respondent.id);
    setRole("respondente");
    setView("resp-dashboard");
    return true;
  };

  const logout = () => {
    setRole("login");
    setView("stc-home");
    setCurrentRespondentId("");
    setCurrentFocalUgId("");
    setExpandedFocalCycleId("");
    setProfileOpen(false);
  };

  const page = (() => {
    if (role === "login") {
      return <LoginScreen onLogin={loginByEmail} />;
    }

    if (role === "respondente") {
      if ((!currentRespondent || view === "resp-access") && linkCycle) {
        return (
          <RespAccess
            cycle={linkCycle}
            ugList={ugList}
            registrationOpenUgIds={linkCycle.ugIds.filter((ugId) =>
              cycleAcceptsNewCollections(linkCycle, collections, ugId),
            )}
            onRegister={registerRespondentBySelf}
            onLogin={loginRespondentFromCollection}
          />
        );
      }
      if (!currentRespondent) return <LoginScreen onLogin={loginByEmail} />;
      const ownActiveCollection =
        activeCollection?.ownerType === "respondente" &&
        activeCollection.ownerId === currentRespondent.id
          ? activeCollection
          : null;
      if (view === "resp-collection" && ownActiveCollection) {
        const cycle = cycles.find((item) => item.id === ownActiveCollection.cycleId);
        return (
          <RespCollection
            key={`${ownActiveCollection.id}:${ownActiveCollection.status}`}
            collection={ownActiveCollection}
            cycle={cycle}
            fieldDefs={fieldDefsForCollection(ownActiveCollection)}
            requiresFocal={Boolean(cycle?.requiresFocalPointValidation)}
            notify={setToast}
            ugList={ugList}
            onSaveDraft={(fileName, attachments) =>
              saveCollectionDraft(ownActiveCollection.id, fileName, attachments)
            }
            onSend={(fileName, attachments) =>
              sendCollection(ownActiveCollection.id, fileName, attachments)
            }
            onSendNegative={(reason) => sendUnavailableCollection(ownActiveCollection.id, reason)}
            onReportMissing={(reason) => reportMissingAttachments(ownActiveCollection.id, reason)}
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
      if (!currentFocalUg) return <LoginScreen onLogin={loginByEmail} />;
      const focalActiveCollection = activeCollection?.ugId === currentFocalUg.id ? activeCollection : null;
      if (view === "focal-collection-detail" && focalActiveCollection) {
        const detailCycle = cycles.find((item) => item.id === focalActiveCollection.cycleId) ?? activeCycle;
        if (focalActiveCollection.ownerType === "ponto-focal") {
          return (
            <RespCollection
              key={`${focalActiveCollection.id}:${focalActiveCollection.status}`}
              collection={focalActiveCollection}
              cycle={detailCycle}
              fieldDefs={fieldDefsForCollection(focalActiveCollection)}
              requiresFocal={false}
              notify={setToast}
              ugList={ugList}
              onSaveDraft={(fileName, attachments) =>
                saveCollectionDraft(focalActiveCollection.id, fileName, attachments)
              }
              onSend={(fileName, attachments) =>
                sendCollection(focalActiveCollection.id, fileName, attachments)
              }
              onSendNegative={(reason) => sendUnavailableCollection(focalActiveCollection.id, reason)}
              onReportMissing={(reason) => reportMissingAttachments(focalActiveCollection.id, reason)}
              setView={() => setView("focal-dashboard")}
            />
          );
        }
        return (
          <FocalCollectionDetail
            cycle={detailCycle}
            collection={focalActiveCollection}
            respondent={respondents.find((item) => item.id === focalActiveCollection.ownerId)}
            onValidate={focalValidateCollection}
            onReturn={focalReturnCollection}
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
          focalUg={currentFocalUg}
          expandedCycleId={expandedFocalCycleId}
          setExpandedCycleId={setExpandedFocalCycleId}
          openCollection={(collectionId) => {
            const collection = collections.find((item) => item.id === collectionId);
            if (!collection || collection.ugId !== currentFocalUg.id) {
              setToast("Esta coleta não pertence ao seu órgão");
              return;
            }
            setActiveCycleId(collection.cycleId);
            setActiveCollectionId(collectionId);
            setView("focal-collection-detail");
          }}
          onAddRespondent={registerRespondentByFocal}
          onRespondAsFocal={respondAsFocal}
          onSignal={registerFocalSignal}
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
          requiredAttachmentsOf={requiredAttachmentsOf}
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
          signals={focalSignals}
          ugList={ugList}
          setView={setView}
          openValidation={openValidation}
          openCycleLink={openCycleLink}
        />
      );
    }

    if (view === "stc-validation") {
      return (
        <StcValidation
          cycle={activeCycle}
          collections={collections}
          signals={focalSignals}
          respondents={respondents}
          ugList={ugList}
          validationCollectionId={validationCollectionId}
          setValidationCollectionId={setValidationCollectionId}
          onDecide={decideCollection}
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
        copyLink={copyCycleLink}
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

  const guidanceCollection =
    role === "respondente" &&
    view === "resp-collection" &&
    activeCollection?.ownerType === "respondente" &&
    activeCollection.ownerId === currentRespondent?.id
      ? activeCollection
      : role === "ponto-focal" &&
          view === "focal-collection-detail" &&
          activeCollection?.ugId === currentFocalUg?.id
        ? activeCollection
        : null;
  const guidanceCycleId =
    role === "ponto-focal"
      ? expandedFocalCycleId || guidanceCollection?.cycleId
      : guidanceCollection?.cycleId;
  const guidanceCycle =
    cycles.find(
      (item) =>
        item.id === guidanceCycleId &&
        (role !== "ponto-focal" || Boolean(currentFocalUg && item.ugIds.includes(currentFocalUg.id))),
    ) ?? null;

  return (
    <div className={`app-shell ${isStcRole(role) ? "stc-accent" : ""}`}>
      {role !== "login" ? (
        <TopBar
          role={role}
          profileInitial={
            role === "ponto-focal"
              ? currentFocalUg?.focalName.charAt(0) ?? "P"
              : currentRespondent?.name.charAt(0) ?? "R"
          }
          onProfileClick={() => setProfileOpen(true)}
          onLogout={logout}
        />
      ) : null}
      <div className={role === "login" ? "login-only" : `workspace ${isStcRole(role) ? "" : "ug-workspace"}`}>
        <Sidebar role={role} view={view} setView={setView} />
        <RoleGuidancePanel
          role={role}
          respondent={currentRespondent}
          focalUg={currentFocalUg}
          cycle={guidanceCycle}
          collection={guidanceCollection}
        />
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
      {isStcRole(role) ? (
        <ProfileDrawer
          role={role}
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
        />
      ) : null}
    </div>
  );
}
