import type { Solicitacao, RespostaOrgao, SolicitacaoStatus } from "@/data/mockData";

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
  return dentroDosPrazos ? "aberta" : "parcial";
}
