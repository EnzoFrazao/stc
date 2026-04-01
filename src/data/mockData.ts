// ============ TYPES ============

export type CanalNotificacao = "email" | "whatsapp" | "outro";
export type TipoCampo = "texto" | "moeda" | "numero" | "data";
export type SolicitacaoStatus = "enviada" | "aberta" | "parcial" | "nao_enviada" | "fechada";
export type RespostaStatus = "pendente" | "enviado" | "em_validacao" | "concluido";
export type ValidacaoStatus = "pendente" | "validado" | "recusado";
export type OrigemResposta = "arquivo" | "preenchimento_manual" | "imagem";
export type ReenvioStatus = "aberto" | "respondido";

export interface Orgao {
  id: string;
  nome: string;
  canaisNotificacao: CanalNotificacao[];
}

export interface CampoPlanilha {
  id: string;
  nome: string;
  label: string;
  tipo: TipoCampo;
  orgaosPermitidos: string[];
  categoria?: string;
}

export interface Solicitacao {
  id: string;
  titulo: string;
  observacoes?: string;
  prazoDias: number;
  canalNotificacao: CanalNotificacao;
  orgaosSelecionados: string[];
  camposSolicitados: string[];
  status: SolicitacaoStatus;
  visualizada: boolean;
  createdAt: string;
}

export interface RespostaItem {
  id: string;
  campoId: string;
  valor: string | number;
  tipoValor: TipoCampo;
  origem: OrigemResposta;
  validacaoStatus: ValidacaoStatus;
  motivoRecusa?: string;
}

export interface RespostaOrgao {
  id: string;
  solicitacaoId: string;
  orgaoId: string;
  status: RespostaStatus;
  itens: RespostaItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ReenvioItem {
  id: string;
  solicitacaoOriginalId: string;
  respostaOrgaoId: string;
  orgaoId: string;
  campoId: string;
  motivo: string;
  status: ReenvioStatus;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  time: string;
}

export interface ChatConversation {
  id: string;
  solicitacaoId: string;
  orgaoId: string;
  orgaoNome: string;
  protocolo: string;
  ultimoContato: string;
  messages: ChatMessage[];
  respostaOrgaoId: string;
  progresso: number;
}

// ============ MOCK ORGANS ============

export const orgaos: Orgao[] = [
  { id: "org-1", nome: "Secretaria de Saúde", canaisNotificacao: ["email", "whatsapp"] },
  { id: "org-2", nome: "Secretaria de Educação", canaisNotificacao: ["email"] },
  { id: "org-3", nome: "Secretaria de Segurança", canaisNotificacao: ["email", "whatsapp"] },
  { id: "org-4", nome: "Secretaria de Infraestrutura", canaisNotificacao: ["whatsapp"] },
  { id: "org-5", nome: "Secretaria de Administração", canaisNotificacao: ["email", "whatsapp", "outro"] },
];

// ============ SPREADSHEET FIELDS ============

export const camposPlanilha: CampoPlanilha[] = [
  // Saúde
  { id: "c-1", nome: "Número de leitos hospitalares", label: "Leitos Hospitalares", tipo: "numero", orgaosPermitidos: ["org-1"], categoria: "Saúde" },
  { id: "c-2", nome: "Salário de enfermeiros", label: "Salário Enfermeiros", tipo: "moeda", orgaosPermitidos: ["org-1"], categoria: "Saúde" },
  { id: "c-3", nome: "Dados de vacinação municipal", label: "Vacinação Municipal", tipo: "numero", orgaosPermitidos: ["org-1"], categoria: "Saúde" },
  { id: "c-4", nome: "Relatório de atendimento hospitalar", label: "Atendimento Hospitalar", tipo: "texto", orgaosPermitidos: ["org-1"], categoria: "Saúde" },
  { id: "c-5", nome: "Despesas com medicamentos", label: "Despesas Medicamentos", tipo: "moeda", orgaosPermitidos: ["org-1"], categoria: "Saúde" },
  // Educação
  { id: "c-6", nome: "Dados de matrícula escolar", label: "Matrícula Escolar", tipo: "numero", orgaosPermitidos: ["org-2"], categoria: "Educação" },
  { id: "c-7", nome: "Merenda escolar - gastos", label: "Gastos Merenda", tipo: "moeda", orgaosPermitidos: ["org-2"], categoria: "Educação" },
  { id: "c-8", nome: "Número de professores ativos", label: "Professores Ativos", tipo: "numero", orgaosPermitidos: ["org-2"], categoria: "Educação" },
  { id: "c-9", nome: "Relatório de frequência escolar", label: "Frequência Escolar", tipo: "texto", orgaosPermitidos: ["org-2"], categoria: "Educação" },
  { id: "c-10", nome: "Infraestrutura de escolas", label: "Infraestrutura Escolas", tipo: "texto", orgaosPermitidos: ["org-2"], categoria: "Educação" },
  // Segurança
  { id: "c-11", nome: "Índice de ocorrências", label: "Ocorrências", tipo: "numero", orgaosPermitidos: ["org-3"], categoria: "Segurança" },
  { id: "c-12", nome: "Efetivo policial por região", label: "Efetivo Policial", tipo: "numero", orgaosPermitidos: ["org-3"], categoria: "Segurança" },
  { id: "c-13", nome: "Despesas com viaturas", label: "Despesas Viaturas", tipo: "moeda", orgaosPermitidos: ["org-3"], categoria: "Segurança" },
  // Infraestrutura
  { id: "c-14", nome: "Planilha de obras públicas", label: "Obras Públicas", tipo: "texto", orgaosPermitidos: ["org-4"], categoria: "Infraestrutura" },
  { id: "c-15", nome: "Contratos de licitação", label: "Contratos Licitação", tipo: "texto", orgaosPermitidos: ["org-4"], categoria: "Infraestrutura" },
  { id: "c-16", nome: "Custo de obras em andamento", label: "Custo Obras", tipo: "moeda", orgaosPermitidos: ["org-4"], categoria: "Infraestrutura" },
  { id: "c-17", nome: "Prazo de entrega de obras", label: "Prazo Obras", tipo: "data", orgaosPermitidos: ["org-4"], categoria: "Infraestrutura" },
  // Administração
  { id: "c-18", nome: "Folha de pagamento de servidores", label: "Folha Pagamento", tipo: "moeda", orgaosPermitidos: ["org-5"], categoria: "Administração" },
  { id: "c-19", nome: "Inventário de bens públicos", label: "Inventário Bens", tipo: "texto", orgaosPermitidos: ["org-5"], categoria: "Administração" },
  { id: "c-20", nome: "Prestação de contas anual", label: "Prestação Contas", tipo: "texto", orgaosPermitidos: ["org-5"], categoria: "Administração" },
  { id: "c-21", nome: "Número de servidores ativos", label: "Servidores Ativos", tipo: "numero", orgaosPermitidos: ["org-5"], categoria: "Administração" },
  // Compartilhados
  { id: "c-22", nome: "Execução orçamentária mensal", label: "Execução Orçamentária", tipo: "moeda", orgaosPermitidos: ["org-1", "org-2", "org-3", "org-4", "org-5"], categoria: "Geral" },
  { id: "c-23", nome: "Relatório de transparência", label: "Transparência", tipo: "texto", orgaosPermitidos: ["org-1", "org-2", "org-3", "org-4", "org-5"], categoria: "Geral" },
  { id: "c-24", nome: "Convênios federais ativos", label: "Convênios Federais", tipo: "texto", orgaosPermitidos: ["org-1", "org-2", "org-4"], categoria: "Geral" },
  { id: "c-25", nome: "Despesas com pessoal", label: "Despesas Pessoal", tipo: "moeda", orgaosPermitidos: ["org-1", "org-2", "org-3", "org-5"], categoria: "Geral" },
  { id: "c-26", nome: "Indicadores de desempenho", label: "Indicadores Desempenho", tipo: "numero", orgaosPermitidos: ["org-1", "org-2", "org-3", "org-4", "org-5"], categoria: "Geral" },
];

// ============ MOCK SOLICITATIONS ============

export const mockSolicitacoes: Solicitacao[] = [
  {
    id: "sol-1",
    titulo: "Levantamento de gastos com saúde e educação Q1 2025",
    observacoes: "Prioridade alta, dados necessários para relatório ao TCE.",
    prazoDias: 7,
    canalNotificacao: "email",
    orgaosSelecionados: ["org-1", "org-2"],
    camposSolicitados: ["c-2", "c-5", "c-22", "c-7", "c-6"],
    status: "parcial",
    visualizada: true,
    createdAt: "2025-01-05",
  },
  {
    id: "sol-2",
    titulo: "Auditoria de infraestrutura e obras públicas",
    prazoDias: 15,
    canalNotificacao: "whatsapp",
    orgaosSelecionados: ["org-4"],
    camposSolicitados: ["c-14", "c-15", "c-16"],
    status: "enviada",
    visualizada: true,
    createdAt: "2025-01-10",
  },
  {
    id: "sol-3",
    titulo: "Dados de pessoal e folha de pagamento",
    observacoes: "Incluir dados de comissionados.",
    prazoDias: 7,
    canalNotificacao: "email",
    orgaosSelecionados: ["org-5", "org-1"],
    camposSolicitados: ["c-18", "c-21", "c-25"],
    status: "parcial",
    visualizada: false,
    createdAt: "2025-01-15",
  },
  {
    id: "sol-4",
    titulo: "Indicadores de segurança pública",
    prazoDias: 3,
    canalNotificacao: "email",
    orgaosSelecionados: ["org-3"],
    camposSolicitados: ["c-11", "c-12", "c-13"],
    status: "aberta",
    visualizada: false,
    createdAt: "2025-01-20",
  },
  {
    id: "sol-5",
    titulo: "Execução orçamentária geral - todos os órgãos",
    observacoes: "Dados consolidados para transparência.",
    prazoDias: 15,
    canalNotificacao: "email",
    orgaosSelecionados: ["org-1", "org-2", "org-3", "org-4", "org-5"],
    camposSolicitados: ["c-22", "c-26"],
    status: "fechada",
    visualizada: false,
    createdAt: "2025-01-25",
  },
  {
    id: "sol-6",
    titulo: "Relatório de vacinação municipal - 1º semestre",
    observacoes: "Dados para consolidação estadual.",
    prazoDias: 10,
    canalNotificacao: "email",
    orgaosSelecionados: ["org-1"],
    camposSolicitados: ["c-3", "c-4"],
    status: "aberta",
    visualizada: true,
    createdAt: "2026-03-20",
  },
  {
    id: "sol-7",
    titulo: "Infraestrutura escolar - levantamento anual",
    prazoDias: 20,
    canalNotificacao: "email",
    orgaosSelecionados: ["org-2"],
    camposSolicitados: ["c-8", "c-9", "c-10"],
    status: "aberta",
    visualizada: false,
    createdAt: "2026-03-25",
  },
  {
    id: "sol-8",
    titulo: "Despesas com viaturas e efetivo policial",
    prazoDias: 5,
    canalNotificacao: "whatsapp",
    orgaosSelecionados: ["org-3"],
    camposSolicitados: ["c-12", "c-13"],
    status: "aberta",
    visualizada: true,
    createdAt: "2026-03-28",
  },
  {
    id: "sol-9",
    titulo: "Contratos de licitação e prazo de obras",
    observacoes: "Urgente - auditoria do TCE.",
    prazoDias: 3,
    canalNotificacao: "email",
    orgaosSelecionados: ["org-4"],
    camposSolicitados: ["c-15", "c-16", "c-17"],
    status: "aberta",
    visualizada: false,
    createdAt: "2026-03-30",
  },
  {
    id: "sol-10",
    titulo: "Inventário de bens e prestação de contas",
    prazoDias: 15,
    canalNotificacao: "email",
    orgaosSelecionados: ["org-5"],
    camposSolicitados: ["c-19", "c-20"],
    status: "aberta",
    visualizada: false,
    createdAt: "2026-03-22",
  },
  {
    id: "sol-11",
    titulo: "Convênios federais ativos - atualização",
    prazoDias: 12,
    canalNotificacao: "email",
    orgaosSelecionados: ["org-1", "org-2", "org-4"],
    camposSolicitados: ["c-24", "c-23"],
    status: "aberta",
    visualizada: true,
    createdAt: "2026-03-26",
  },
  {
    id: "sol-12",
    titulo: "Despesas com pessoal - consolidação trimestral",
    prazoDias: 7,
    canalNotificacao: "email",
    orgaosSelecionados: ["org-1", "org-2", "org-3", "org-5"],
    camposSolicitados: ["c-25", "c-22"],
    status: "aberta",
    visualizada: false,
    createdAt: "2026-03-29",
  },
];

// ============ MOCK RESPOSTAS ============

export const mockRespostas: RespostaOrgao[] = [
  {
    id: "resp-1",
    solicitacaoId: "sol-1",
    orgaoId: "org-1",
    status: "em_validacao",
    createdAt: "2025-01-05",
    updatedAt: "2025-03-10",
    itens: [
      { id: "ri-1", campoId: "c-2", valor: "R$ 4.850,00", tipoValor: "moeda", origem: "preenchimento_manual", validacaoStatus: "validado" },
      { id: "ri-2", campoId: "c-5", valor: "", tipoValor: "moeda", origem: "preenchimento_manual", validacaoStatus: "pendente" },
      { id: "ri-3", campoId: "c-22", valor: "", tipoValor: "moeda", origem: "preenchimento_manual", validacaoStatus: "pendente" },
    ],
  },
  {
    id: "resp-2",
    solicitacaoId: "sol-1",
    orgaoId: "org-2",
    status: "pendente",
    createdAt: "2025-01-05",
    updatedAt: "2025-01-05",
    itens: [
      { id: "ri-4", campoId: "c-7", valor: "", tipoValor: "moeda", origem: "preenchimento_manual", validacaoStatus: "pendente" },
      { id: "ri-5", campoId: "c-6", valor: "", tipoValor: "numero", origem: "preenchimento_manual", validacaoStatus: "pendente" },
      { id: "ri-6", campoId: "c-22", valor: "", tipoValor: "moeda", origem: "preenchimento_manual", validacaoStatus: "pendente" },
    ],
  },
  {
    id: "resp-3",
    solicitacaoId: "sol-2",
    orgaoId: "org-4",
    status: "concluido",
    createdAt: "2025-01-10",
    updatedAt: "2025-03-08",
    itens: [
      { id: "ri-7", campoId: "c-14", valor: "arquivo_obras.pdf", tipoValor: "texto", origem: "arquivo", validacaoStatus: "validado" },
      { id: "ri-8", campoId: "c-15", valor: "contrato_2024.pdf", tipoValor: "texto", origem: "arquivo", validacaoStatus: "validado" },
      { id: "ri-9", campoId: "c-16", valor: "R$ 12.500.000,00", tipoValor: "moeda", origem: "preenchimento_manual", validacaoStatus: "validado" },
    ],
  },
  {
    id: "resp-4",
    solicitacaoId: "sol-3",
    orgaoId: "org-5",
    status: "em_validacao",
    createdAt: "2025-01-15",
    updatedAt: "2025-03-12",
    itens: [
      { id: "ri-10", campoId: "c-18", valor: "R$ 45.200.000,00", tipoValor: "moeda", origem: "preenchimento_manual", validacaoStatus: "validado" },
      { id: "ri-11", campoId: "c-21", valor: 1247, tipoValor: "numero", origem: "preenchimento_manual", validacaoStatus: "recusado", motivoRecusa: "Valor inconsistente com período anterior" },
      { id: "ri-12", campoId: "c-25", valor: "", tipoValor: "moeda", origem: "preenchimento_manual", validacaoStatus: "pendente" },
    ],
  },
  {
    id: "resp-5",
    solicitacaoId: "sol-3",
    orgaoId: "org-1",
    status: "pendente",
    createdAt: "2025-01-15",
    updatedAt: "2025-01-15",
    itens: [
      { id: "ri-13", campoId: "c-25", valor: "", tipoValor: "moeda", origem: "preenchimento_manual", validacaoStatus: "pendente" },
    ],
  },
  {
    id: "resp-6",
    solicitacaoId: "sol-4",
    orgaoId: "org-3",
    status: "enviado",
    createdAt: "2025-01-20",
    updatedAt: "2025-03-05",
    itens: [
      { id: "ri-14", campoId: "c-11", valor: 1423, tipoValor: "numero", origem: "preenchimento_manual", validacaoStatus: "validado" },
      { id: "ri-15", campoId: "c-12", valor: "", tipoValor: "numero", origem: "preenchimento_manual", validacaoStatus: "pendente" },
      { id: "ri-16", campoId: "c-13", valor: "", tipoValor: "moeda", origem: "preenchimento_manual", validacaoStatus: "pendente" },
    ],
  },
  // New respostas for sol-6 to sol-12
  {
    id: "resp-7",
    solicitacaoId: "sol-6",
    orgaoId: "org-1",
    status: "enviado",
    createdAt: "2026-03-20",
    updatedAt: "2026-03-28",
    itens: [
      { id: "ri-17", campoId: "c-3", valor: 85420, tipoValor: "numero", origem: "preenchimento_manual", validacaoStatus: "pendente" },
      { id: "ri-18", campoId: "c-4", valor: "", tipoValor: "texto", origem: "preenchimento_manual", validacaoStatus: "pendente" },
    ],
  },
  {
    id: "resp-8",
    solicitacaoId: "sol-7",
    orgaoId: "org-2",
    status: "pendente",
    createdAt: "2026-03-25",
    updatedAt: "2026-03-25",
    itens: [
      { id: "ri-19", campoId: "c-8", valor: "", tipoValor: "numero", origem: "preenchimento_manual", validacaoStatus: "pendente" },
      { id: "ri-20", campoId: "c-9", valor: "", tipoValor: "texto", origem: "preenchimento_manual", validacaoStatus: "pendente" },
      { id: "ri-21", campoId: "c-10", valor: "", tipoValor: "texto", origem: "preenchimento_manual", validacaoStatus: "pendente" },
    ],
  },
  {
    id: "resp-9",
    solicitacaoId: "sol-8",
    orgaoId: "org-3",
    status: "pendente",
    createdAt: "2026-03-28",
    updatedAt: "2026-03-28",
    itens: [
      { id: "ri-22", campoId: "c-12", valor: "", tipoValor: "numero", origem: "preenchimento_manual", validacaoStatus: "pendente" },
      { id: "ri-23", campoId: "c-13", valor: "", tipoValor: "moeda", origem: "preenchimento_manual", validacaoStatus: "pendente" },
    ],
  },
  {
    id: "resp-10",
    solicitacaoId: "sol-9",
    orgaoId: "org-4",
    status: "pendente",
    createdAt: "2026-03-30",
    updatedAt: "2026-03-30",
    itens: [
      { id: "ri-24", campoId: "c-15", valor: "", tipoValor: "texto", origem: "preenchimento_manual", validacaoStatus: "pendente" },
      { id: "ri-25", campoId: "c-16", valor: "", tipoValor: "moeda", origem: "preenchimento_manual", validacaoStatus: "pendente" },
      { id: "ri-26", campoId: "c-17", valor: "", tipoValor: "data", origem: "preenchimento_manual", validacaoStatus: "pendente" },
    ],
  },
  {
    id: "resp-11",
    solicitacaoId: "sol-10",
    orgaoId: "org-5",
    status: "pendente",
    createdAt: "2026-03-22",
    updatedAt: "2026-03-22",
    itens: [
      { id: "ri-27", campoId: "c-19", valor: "", tipoValor: "texto", origem: "preenchimento_manual", validacaoStatus: "pendente" },
      { id: "ri-28", campoId: "c-20", valor: "", tipoValor: "texto", origem: "preenchimento_manual", validacaoStatus: "pendente" },
    ],
  },
  {
    id: "resp-12",
    solicitacaoId: "sol-11",
    orgaoId: "org-1",
    status: "pendente",
    createdAt: "2026-03-26",
    updatedAt: "2026-03-26",
    itens: [
      { id: "ri-29", campoId: "c-24", valor: "", tipoValor: "texto", origem: "preenchimento_manual", validacaoStatus: "pendente" },
      { id: "ri-30", campoId: "c-23", valor: "", tipoValor: "texto", origem: "preenchimento_manual", validacaoStatus: "pendente" },
    ],
  },
  {
    id: "resp-13",
    solicitacaoId: "sol-11",
    orgaoId: "org-2",
    status: "pendente",
    createdAt: "2026-03-26",
    updatedAt: "2026-03-26",
    itens: [
      { id: "ri-31", campoId: "c-24", valor: "", tipoValor: "texto", origem: "preenchimento_manual", validacaoStatus: "pendente" },
      { id: "ri-32", campoId: "c-23", valor: "", tipoValor: "texto", origem: "preenchimento_manual", validacaoStatus: "pendente" },
    ],
  },
  {
    id: "resp-14",
    solicitacaoId: "sol-11",
    orgaoId: "org-4",
    status: "enviado",
    createdAt: "2026-03-26",
    updatedAt: "2026-03-30",
    itens: [
      { id: "ri-33", campoId: "c-24", valor: "Convênio FNS ativo", tipoValor: "texto", origem: "preenchimento_manual", validacaoStatus: "validado" },
      { id: "ri-34", campoId: "c-23", valor: "Relatório anexado", tipoValor: "texto", origem: "arquivo", validacaoStatus: "validado" },
    ],
  },
  {
    id: "resp-15",
    solicitacaoId: "sol-12",
    orgaoId: "org-1",
    status: "pendente",
    createdAt: "2026-03-29",
    updatedAt: "2026-03-29",
    itens: [
      { id: "ri-35", campoId: "c-25", valor: "", tipoValor: "moeda", origem: "preenchimento_manual", validacaoStatus: "pendente" },
      { id: "ri-36", campoId: "c-22", valor: "", tipoValor: "moeda", origem: "preenchimento_manual", validacaoStatus: "pendente" },
    ],
  },
  {
    id: "resp-16",
    solicitacaoId: "sol-12",
    orgaoId: "org-2",
    status: "pendente",
    createdAt: "2026-03-29",
    updatedAt: "2026-03-29",
    itens: [
      { id: "ri-37", campoId: "c-25", valor: "", tipoValor: "moeda", origem: "preenchimento_manual", validacaoStatus: "pendente" },
      { id: "ri-38", campoId: "c-22", valor: "", tipoValor: "moeda", origem: "preenchimento_manual", validacaoStatus: "pendente" },
    ],
  },
  {
    id: "resp-17",
    solicitacaoId: "sol-12",
    orgaoId: "org-3",
    status: "pendente",
    createdAt: "2026-03-29",
    updatedAt: "2026-03-29",
    itens: [
      { id: "ri-39", campoId: "c-25", valor: "", tipoValor: "moeda", origem: "preenchimento_manual", validacaoStatus: "pendente" },
      { id: "ri-40", campoId: "c-22", valor: "", tipoValor: "moeda", origem: "preenchimento_manual", validacaoStatus: "pendente" },
    ],
  },
  {
    id: "resp-18",
    solicitacaoId: "sol-12",
    orgaoId: "org-5",
    status: "pendente",
    createdAt: "2026-03-29",
    updatedAt: "2026-03-29",
    itens: [
      { id: "ri-41", campoId: "c-25", valor: "", tipoValor: "moeda", origem: "preenchimento_manual", validacaoStatus: "pendente" },
      { id: "ri-42", campoId: "c-22", valor: "", tipoValor: "moeda", origem: "preenchimento_manual", validacaoStatus: "pendente" },
    ],
  },
  // Respostas for sol-5 (all organs)
  {
    id: "resp-19",
    solicitacaoId: "sol-5",
    orgaoId: "org-1",
    status: "pendente",
    createdAt: "2025-01-25",
    updatedAt: "2025-01-25",
    itens: [
      { id: "ri-43", campoId: "c-22", valor: "", tipoValor: "moeda", origem: "preenchimento_manual", validacaoStatus: "pendente" },
      { id: "ri-44", campoId: "c-26", valor: "", tipoValor: "numero", origem: "preenchimento_manual", validacaoStatus: "pendente" },
    ],
  },
  {
    id: "resp-20",
    solicitacaoId: "sol-5",
    orgaoId: "org-2",
    status: "pendente",
    createdAt: "2025-01-25",
    updatedAt: "2025-01-25",
    itens: [
      { id: "ri-45", campoId: "c-22", valor: "", tipoValor: "moeda", origem: "preenchimento_manual", validacaoStatus: "pendente" },
      { id: "ri-46", campoId: "c-26", valor: "", tipoValor: "numero", origem: "preenchimento_manual", validacaoStatus: "pendente" },
    ],
  },
  {
    id: "resp-21",
    solicitacaoId: "sol-5",
    orgaoId: "org-3",
    status: "pendente",
    createdAt: "2025-01-25",
    updatedAt: "2025-01-25",
    itens: [
      { id: "ri-47", campoId: "c-22", valor: "", tipoValor: "moeda", origem: "preenchimento_manual", validacaoStatus: "pendente" },
      { id: "ri-48", campoId: "c-26", valor: "", tipoValor: "numero", origem: "preenchimento_manual", validacaoStatus: "pendente" },
    ],
  },
  {
    id: "resp-22",
    solicitacaoId: "sol-5",
    orgaoId: "org-4",
    status: "pendente",
    createdAt: "2025-01-25",
    updatedAt: "2025-01-25",
    itens: [
      { id: "ri-49", campoId: "c-22", valor: "", tipoValor: "moeda", origem: "preenchimento_manual", validacaoStatus: "pendente" },
      { id: "ri-50", campoId: "c-26", valor: "", tipoValor: "numero", origem: "preenchimento_manual", validacaoStatus: "pendente" },
    ],
  },
  {
    id: "resp-23",
    solicitacaoId: "sol-5",
    orgaoId: "org-5",
    status: "pendente",
    createdAt: "2025-01-25",
    updatedAt: "2025-01-25",
    itens: [
      { id: "ri-51", campoId: "c-22", valor: "", tipoValor: "moeda", origem: "preenchimento_manual", validacaoStatus: "pendente" },
      { id: "ri-52", campoId: "c-26", valor: "", tipoValor: "numero", origem: "preenchimento_manual", validacaoStatus: "pendente" },
    ],
  },
];

export const mockReenvios: ReenvioItem[] = [
  {
    id: "reenvio-1",
    solicitacaoOriginalId: "sol-3",
    respostaOrgaoId: "resp-4",
    orgaoId: "org-5",
    campoId: "c-21",
    motivo: "Valor inconsistente com período anterior",
    status: "aberto",
    createdAt: "2025-03-12",
  },
];

// ============ MOCK CHATS ============

export const mockChats: ChatConversation[] = [
  {
    id: "chat-1",
    protocolo: "SOL-2025-0001",
    orgaoNome: "Secretaria de Saúde",
    orgaoId: "org-1",
    solicitacaoId: "sol-1",
    respostaOrgaoId: "resp-1",
    ultimoContato: "10/03/2025 14:30",
    progresso: 33,
    messages: [
      { id: "m1", sender: "bot", text: "Olá! Sou o assistente de coleta da STC-MA. Solicitação SOL-2025-0001 — Secretaria de Saúde.", time: "14:00" },
      { id: "m2", sender: "bot", text: "Campos solicitados: Salário de enfermeiros, Despesas com medicamentos, Execução orçamentária mensal.", time: "14:01" },
      { id: "m3", sender: "user", text: "Já enviei o valor de salário dos enfermeiros.", time: "14:05" },
      { id: "m4", sender: "bot", text: "Recebido! O valor de R$ 4.850,00 foi registrado para 'Salário de enfermeiros'. Faltam: Despesas com medicamentos e Execução orçamentária mensal.", time: "14:10" },
    ],
  },
  {
    id: "chat-2",
    protocolo: "SOL-2025-0001",
    orgaoNome: "Secretaria de Educação",
    orgaoId: "org-2",
    solicitacaoId: "sol-1",
    respostaOrgaoId: "resp-2",
    ultimoContato: "09/03/2025 10:15",
    progresso: 0,
    messages: [
      { id: "m1", sender: "bot", text: "Bem-vindo. Solicitação SOL-2025-0001 — Secretaria de Educação.", time: "10:00" },
      { id: "m2", sender: "bot", text: "Campos pendentes: Merenda escolar - gastos, Dados de matrícula escolar, Execução orçamentária mensal.", time: "10:01" },
    ],
  },
  {
    id: "chat-3",
    protocolo: "SOL-2025-0002",
    orgaoNome: "Secretaria de Infraestrutura",
    orgaoId: "org-4",
    solicitacaoId: "sol-2",
    respostaOrgaoId: "resp-3",
    ultimoContato: "08/03/2025 16:45",
    progresso: 100,
    messages: [
      { id: "m1", sender: "bot", text: "Solicitação SOL-2025-0002 — Todos os documentos foram recebidos e validados!", time: "16:30" },
      { id: "m2", sender: "user", text: "Ótimo, obrigado pela confirmação.", time: "16:35" },
    ],
  },
];

// ============ HELPERS ============

export function getCampoById(id: string): CampoPlanilha | undefined {
  return camposPlanilha.find(c => c.id === id);
}

export function getOrgaoById(id: string): Orgao | undefined {
  return orgaos.find(o => o.id === id);
}

export function getRespostasForSolicitacao(solId: string): RespostaOrgao[] {
  return mockRespostas.filter(r => r.solicitacaoId === solId);
}

export function calcProgresso(resposta: RespostaOrgao): number {
  if (resposta.itens.length === 0) return 0;
  const done = resposta.itens.filter(i => i.validacaoStatus === "validado").length;
  return Math.round((done / resposta.itens.length) * 100);
}

export function calcularStatusSolicitacao(
  sol: Solicitacao,
  respostas: RespostaOrgao[]
): SolicitacaoStatus {
  const resps = respostas.filter(r => r.solicitacaoId === sol.id);
  const totalItens = resps.reduce((acc, r) => acc + r.itens.length, 0);
  const itensEnviados = resps.reduce(
    (acc, r) => acc + r.itens.filter(i => !!i.valor && String(i.valor).trim() !== "").length,
    0
  );

  const createdDate = new Date(sol.createdAt);
  const prazoDate = new Date(createdDate);
  prazoDate.setDate(prazoDate.getDate() + sol.prazoDias);
  const now = new Date();
  const dentroDosPrazos = now <= prazoDate;

  if (totalItens === 0) return dentroDosPrazos ? "fechada" : "nao_enviada";

  if (itensEnviados === totalItens) return "enviada";
  if (itensEnviados === 0) return dentroDosPrazos ? "fechada" : "nao_enviada";
  // partial
  return dentroDosPrazos ? "aberta" : "parcial";
}
