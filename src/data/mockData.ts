// ============ TYPES ============

export type SolicitacaoStatus = "Pendente" | "Em Andamento" | "Concluída" | "Atrasada";
export type ItemValidacao = "pendente" | "validado" | "recusado";
export type CanalNotificacao = "whatsapp" | "email" | "ambos";
export type TipoCampo = "texto" | "monetario" | "numerico" | "data" | "arquivo";

export interface Orgao {
  id: string;
  nome: string;
}

export interface CampoPlanilha {
  id: string;
  nome: string;
  tipo: TipoCampo;
  orgaosIds: string[]; // quais órgãos podem fornecer este campo
}

export interface ItemSolicitacao {
  id: string;
  campoId: string;
  campoNome: string;
  campoTipo: TipoCampo;
  orgaoId: string;
  valorRecebido?: string;
  validacao: ItemValidacao;
  reenvioSolicitado?: boolean;
}

export interface OrgaoSolicitacao {
  orgaoId: string;
  orgaoNome: string;
  status: SolicitacaoStatus;
  itens: ItemSolicitacao[];
  progresso: number;
}

export interface Solicitacao {
  id: string;
  protocolo: string;
  assunto: string;
  dataEnvio: string;
  prazo: string;
  observacoes: string;
  canalNotificacao: CanalNotificacao;
  orgaos: OrgaoSolicitacao[];
  statusGeral: SolicitacaoStatus;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  time: string;
}

export interface ChatConversation {
  id: string;
  protocolo: string;
  orgao: string;
  orgaoId: string;
  solicitacaoId: string;
  ultimoContato: string;
  messages: ChatMessage[];
  itens: ItemSolicitacao[];
  progresso: number;
}

// ============ MOCK ORGANS ============

export const orgaos: Orgao[] = [
  { id: "org-1", nome: "Secretaria de Saúde" },
  { id: "org-2", nome: "Secretaria de Educação" },
  { id: "org-3", nome: "Secretaria de Segurança" },
  { id: "org-4", nome: "Secretaria de Infraestrutura" },
  { id: "org-5", nome: "Secretaria de Administração" },
];

// ============ SPREADSHEET FIELDS (campos da planilha) ============

export const camposPlanilha: CampoPlanilha[] = [
  // Saúde
  { id: "c-1", nome: "Número de leitos hospitalares", tipo: "numerico", orgaosIds: ["org-1"] },
  { id: "c-2", nome: "Salário de enfermeiros", tipo: "monetario", orgaosIds: ["org-1"] },
  { id: "c-3", nome: "Dados de vacinação municipal", tipo: "numerico", orgaosIds: ["org-1"] },
  { id: "c-4", nome: "Relatório de atendimento hospitalar", tipo: "arquivo", orgaosIds: ["org-1"] },
  { id: "c-5", nome: "Despesas com medicamentos", tipo: "monetario", orgaosIds: ["org-1"] },
  // Educação
  { id: "c-6", nome: "Dados de matrícula escolar", tipo: "numerico", orgaosIds: ["org-2"] },
  { id: "c-7", nome: "Merenda escolar - gastos", tipo: "monetario", orgaosIds: ["org-2"] },
  { id: "c-8", nome: "Número de professores ativos", tipo: "numerico", orgaosIds: ["org-2"] },
  { id: "c-9", nome: "Relatório de frequência escolar", tipo: "arquivo", orgaosIds: ["org-2"] },
  { id: "c-10", nome: "Infraestrutura de escolas", tipo: "texto", orgaosIds: ["org-2"] },
  // Segurança
  { id: "c-11", nome: "Índice de ocorrências", tipo: "numerico", orgaosIds: ["org-3"] },
  { id: "c-12", nome: "Efetivo policial por região", tipo: "numerico", orgaosIds: ["org-3"] },
  { id: "c-13", nome: "Despesas com viaturas", tipo: "monetario", orgaosIds: ["org-3"] },
  // Infraestrutura
  { id: "c-14", nome: "Planilha de obras públicas", tipo: "arquivo", orgaosIds: ["org-4"] },
  { id: "c-15", nome: "Contratos de licitação", tipo: "arquivo", orgaosIds: ["org-4"] },
  { id: "c-16", nome: "Custo de obras em andamento", tipo: "monetario", orgaosIds: ["org-4"] },
  { id: "c-17", nome: "Prazo de entrega de obras", tipo: "data", orgaosIds: ["org-4"] },
  // Administração
  { id: "c-18", nome: "Folha de pagamento de servidores", tipo: "monetario", orgaosIds: ["org-5"] },
  { id: "c-19", nome: "Inventário de bens públicos", tipo: "arquivo", orgaosIds: ["org-5"] },
  { id: "c-20", nome: "Prestação de contas anual", tipo: "arquivo", orgaosIds: ["org-5"] },
  { id: "c-21", nome: "Número de servidores ativos", tipo: "numerico", orgaosIds: ["org-5"] },
  // Compartilhados (mais de um órgão)
  { id: "c-22", nome: "Execução orçamentária mensal", tipo: "monetario", orgaosIds: ["org-1", "org-2", "org-3", "org-4", "org-5"] },
  { id: "c-23", nome: "Relatório de transparência", tipo: "arquivo", orgaosIds: ["org-1", "org-2", "org-3", "org-4", "org-5"] },
  { id: "c-24", nome: "Convênios federais ativos", tipo: "texto", orgaosIds: ["org-1", "org-2", "org-4"] },
  { id: "c-25", nome: "Despesas com pessoal", tipo: "monetario", orgaosIds: ["org-1", "org-2", "org-3", "org-5"] },
  { id: "c-26", nome: "Indicadores de desempenho", tipo: "numerico", orgaosIds: ["org-1", "org-2", "org-3", "org-4", "org-5"] },
];

// ============ MOCK SOLICITATIONS ============

function gerarItens(orgaoId: string, campos: string[], validacoes: ItemValidacao[], valores: (string | undefined)[]): ItemSolicitacao[] {
  return campos.map((cId, i) => {
    const campo = camposPlanilha.find(c => c.id === cId)!;
    return {
      id: `item-${orgaoId}-${cId}`,
      campoId: cId,
      campoNome: campo.nome,
      campoTipo: campo.tipo,
      orgaoId,
      valorRecebido: valores[i],
      validacao: validacoes[i],
    };
  });
}

export const mockSolicitacoes: Solicitacao[] = [
  {
    id: "sol-1",
    protocolo: "STC-2025-0001",
    assunto: "Levantamento de gastos com saúde e educação Q1 2025",
    dataEnvio: "05/01/2025",
    prazo: "D+7",
    observacoes: "Prioridade alta, dados necessários para relatório ao TCE.",
    canalNotificacao: "email",
    statusGeral: "Em Andamento",
    orgaos: [
      {
        orgaoId: "org-1",
        orgaoNome: "Secretaria de Saúde",
        status: "Em Andamento",
        progresso: 60,
        itens: gerarItens("org-1", ["c-2", "c-5", "c-22"],
          ["validado", "pendente", "pendente"],
          ["R$ 4.850,00", undefined, undefined]),
      },
      {
        orgaoId: "org-2",
        orgaoNome: "Secretaria de Educação",
        status: "Pendente",
        progresso: 0,
        itens: gerarItens("org-2", ["c-7", "c-6", "c-22"],
          ["pendente", "pendente", "pendente"],
          [undefined, undefined, undefined]),
      },
    ],
  },
  {
    id: "sol-2",
    protocolo: "STC-2025-0002",
    assunto: "Auditoria de infraestrutura e obras públicas",
    dataEnvio: "10/01/2025",
    prazo: "D+15",
    observacoes: "",
    canalNotificacao: "whatsapp",
    statusGeral: "Concluída",
    orgaos: [
      {
        orgaoId: "org-4",
        orgaoNome: "Secretaria de Infraestrutura",
        status: "Concluída",
        progresso: 100,
        itens: gerarItens("org-4", ["c-14", "c-15", "c-16"],
          ["validado", "validado", "validado"],
          ["arquivo_obras.pdf", "contrato_2024.pdf", "R$ 12.500.000,00"]),
      },
    ],
  },
  {
    id: "sol-3",
    protocolo: "STC-2025-0003",
    assunto: "Dados de pessoal e folha de pagamento",
    dataEnvio: "15/01/2025",
    prazo: "D+7",
    observacoes: "Incluir dados de comissionados.",
    canalNotificacao: "ambos",
    statusGeral: "Em Andamento",
    orgaos: [
      {
        orgaoId: "org-5",
        orgaoNome: "Secretaria de Administração",
        status: "Em Andamento",
        progresso: 50,
        itens: gerarItens("org-5", ["c-18", "c-21", "c-25"],
          ["validado", "recusado", "pendente"],
          ["R$ 45.200.000,00", "1.247", undefined]),
      },
      {
        orgaoId: "org-1",
        orgaoNome: "Secretaria de Saúde",
        status: "Pendente",
        progresso: 0,
        itens: gerarItens("org-1", ["c-25"],
          ["pendente"],
          [undefined]),
      },
    ],
  },
  {
    id: "sol-4",
    protocolo: "STC-2025-0004",
    assunto: "Indicadores de segurança pública",
    dataEnvio: "20/01/2025",
    prazo: "D+3",
    observacoes: "",
    canalNotificacao: "email",
    statusGeral: "Atrasada",
    orgaos: [
      {
        orgaoId: "org-3",
        orgaoNome: "Secretaria de Segurança",
        status: "Atrasada",
        progresso: 33,
        itens: gerarItens("org-3", ["c-11", "c-12", "c-13"],
          ["validado", "pendente", "pendente"],
          ["1.423", undefined, undefined]),
      },
    ],
  },
  {
    id: "sol-5",
    protocolo: "STC-2025-0005",
    assunto: "Execução orçamentária geral - todos os órgãos",
    dataEnvio: "25/01/2025",
    prazo: "D+15",
    observacoes: "Dados consolidados para transparência.",
    canalNotificacao: "email",
    statusGeral: "Pendente",
    orgaos: orgaos.map(org => ({
      orgaoId: org.id,
      orgaoNome: org.nome,
      status: "Pendente" as SolicitacaoStatus,
      progresso: 0,
      itens: gerarItens(org.id, ["c-22", "c-26"],
        ["pendente", "pendente"],
        [undefined, undefined]),
    })),
  },
];

// ============ MOCK CHATS ============

export const mockChats: ChatConversation[] = [
  {
    id: "chat-1",
    protocolo: "STC-2025-0001",
    orgao: "Secretaria de Saúde",
    orgaoId: "org-1",
    solicitacaoId: "sol-1",
    ultimoContato: "10/03/2025 14:30",
    progresso: 60,
    itens: mockSolicitacoes[0].orgaos[0].itens,
    messages: [
      { id: "m1", sender: "bot", text: "Olá! Sou o assistente de coleta da STC-MA. Protocolo STC-2025-0001 — Secretaria de Saúde.", time: "14:00" },
      { id: "m2", sender: "bot", text: "Campos solicitados: Salário de enfermeiros, Despesas com medicamentos, Execução orçamentária mensal.", time: "14:01" },
      { id: "m3", sender: "user", text: "Já enviei o valor de salário dos enfermeiros.", time: "14:05" },
      { id: "m4", sender: "bot", text: "Recebido! O valor de R$ 4.850,00 foi registrado para 'Salário de enfermeiros'. Faltam: Despesas com medicamentos e Execução orçamentária mensal.", time: "14:10" },
    ],
  },
  {
    id: "chat-2",
    protocolo: "STC-2025-0001",
    orgao: "Secretaria de Educação",
    orgaoId: "org-2",
    solicitacaoId: "sol-1",
    ultimoContato: "09/03/2025 10:15",
    progresso: 0,
    itens: mockSolicitacoes[0].orgaos[1].itens,
    messages: [
      { id: "m1", sender: "bot", text: "Bem-vindo. Protocolo STC-2025-0001 — Secretaria de Educação.", time: "10:00" },
      { id: "m2", sender: "bot", text: "Campos pendentes: Merenda escolar - gastos, Dados de matrícula escolar, Execução orçamentária mensal.", time: "10:01" },
    ],
  },
  {
    id: "chat-3",
    protocolo: "STC-2025-0002",
    orgao: "Secretaria de Infraestrutura",
    orgaoId: "org-4",
    solicitacaoId: "sol-2",
    ultimoContato: "08/03/2025 16:45",
    progresso: 100,
    itens: mockSolicitacoes[1].orgaos[0].itens,
    messages: [
      { id: "m1", sender: "bot", text: "Protocolo STC-2025-0002 — Todos os documentos foram recebidos e validados!", time: "16:30" },
      { id: "m2", sender: "user", text: "Ótimo, obrigado pela confirmação.", time: "16:35" },
    ],
  },
];
