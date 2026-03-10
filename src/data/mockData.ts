export type SolicitacaoStatus = "Pendente" | "Em Andamento" | "Concluída" | "Atrasada";

export interface Solicitacao {
  id: string;
  protocolo: string;
  orgao: string;
  assunto: string;
  dataEnvio: string;
  prazo: string;
  status: SolicitacaoStatus;
  descricao: string;
  checklist: { nome: string; concluido: boolean }[];
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
  ultimoContato: string;
  messages: ChatMessage[];
  checklist: { nome: string; concluido: boolean }[];
  progresso: number;
}

const orgaos = [
  "Secretaria de Saúde",
  "Secretaria de Educação",
  "Secretaria de Segurança",
  "Secretaria de Infraestrutura",
  "Secretaria de Administração",
];

const assuntos = [
  "Relatório de gastos Q1 2025",
  "Dados de vacinação municipal",
  "Planilha de obras públicas",
  "Contratos de licitação 2024",
  "Folha de pagamento servidores",
  "Execução orçamentária mensal",
  "Indicadores de desempenho",
  "Relatório de auditoria interna",
  "Dados de atendimento hospitalar",
  "Inventário de bens públicos",
  "Prestação de contas anual",
  "Relatório de transparência",
  "Dados de matrícula escolar",
  "Convênios federais ativos",
  "Despesas com pessoal",
];

const statuses: SolicitacaoStatus[] = ["Pendente", "Em Andamento", "Concluída", "Atrasada"];
const prazos = ["D+3", "D+7", "D+15"];

export const mockSolicitacoes: Solicitacao[] = assuntos.map((assunto, i) => ({
  id: `sol-${i + 1}`,
  protocolo: `STC-2025-${String(i + 1).padStart(4, "0")}`,
  orgao: orgaos[i % orgaos.length],
  assunto,
  dataEnvio: new Date(2025, 0 + Math.floor(i / 3), 5 + i * 2).toLocaleDateString("pt-BR"),
  prazo: prazos[i % prazos.length],
  status: statuses[i % statuses.length],
  descricao: `Solicitação referente a ${assunto.toLowerCase()} do órgão ${orgaos[i % orgaos.length]}.`,
  checklist: [
    { nome: "Relatório de execução", concluido: i % 3 === 0 },
    { nome: "Planilha de gastos", concluido: i % 2 === 0 },
    { nome: "Contrato administrativo", concluido: false },
  ],
}));

export const mockChats: ChatConversation[] = [
  {
    id: "chat-1",
    protocolo: "STC-2025-0001",
    orgao: "Secretaria de Saúde",
    ultimoContato: "10/03/2025 14:30",
    progresso: 65,
    checklist: [
      { nome: "Relatório de execução", concluido: true },
      { nome: "Planilha de gastos", concluido: true },
      { nome: "Contrato administrativo", concluido: false },
      { nome: "Nota fiscal", concluido: false },
    ],
    messages: [
      { id: "m1", sender: "bot", text: "Olá! Sou o assistente de coleta da STC-MA. Como posso ajudá-lo com o protocolo STC-2025-0001?", time: "14:00" },
      { id: "m2", sender: "user", text: "Preciso do relatório de execução orçamentária do primeiro trimestre.", time: "14:05" },
      { id: "m3", sender: "bot", text: "Entendido. O relatório de execução já foi recebido e está em análise. A planilha de gastos também foi enviada. Faltam o contrato administrativo e a nota fiscal.", time: "14:10" },
      { id: "m4", sender: "user", text: "O contrato será enviado até amanhã.", time: "14:15" },
      { id: "m5", sender: "bot", text: "Perfeito! Registrei a previsão. Lembre-se que o prazo final é D+7. Aguardo o envio.", time: "14:20" },
    ],
  },
  {
    id: "chat-2",
    protocolo: "STC-2025-0002",
    orgao: "Secretaria de Educação",
    ultimoContato: "09/03/2025 10:15",
    progresso: 33,
    checklist: [
      { nome: "Dados de matrícula", concluido: true },
      { nome: "Relatório de frequência", concluido: false },
      { nome: "Planilha orçamentária", concluido: false },
    ],
    messages: [
      { id: "m1", sender: "bot", text: "Bem-vindo ao assistente de coleta. Protocolo STC-2025-0002 selecionado.", time: "10:00" },
      { id: "m2", sender: "user", text: "Quais documentos ainda faltam?", time: "10:05" },
      { id: "m3", sender: "bot", text: "Ainda faltam: Relatório de frequência e Planilha orçamentária. Apenas os dados de matrícula foram recebidos.", time: "10:10" },
    ],
  },
  {
    id: "chat-3",
    protocolo: "STC-2025-0005",
    orgao: "Secretaria de Administração",
    ultimoContato: "08/03/2025 16:45",
    progresso: 100,
    checklist: [
      { nome: "Folha de pagamento", concluido: true },
      { nome: "Relatório de RH", concluido: true },
    ],
    messages: [
      { id: "m1", sender: "bot", text: "Protocolo STC-2025-0005: Todos os documentos foram recebidos com sucesso!", time: "16:30" },
      { id: "m2", sender: "user", text: "Ótimo, obrigado pela confirmação.", time: "16:35" },
      { id: "m3", sender: "bot", text: "Solicitação concluída. Todos os documentos estão disponíveis para análise. Obrigado pela colaboração!", time: "16:40" },
    ],
  },
];
