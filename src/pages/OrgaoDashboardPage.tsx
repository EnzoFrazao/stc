import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  mockSolicitacoes, mockRespostas,
  Solicitacao, RespostaOrgao,
} from "@/data/mockData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Calendar, ArrowRight, AlertCircle, Clock, Inbox, CheckCircle2, AlertOctagon } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/layout/PageHeader";
import SurfaceCard from "@/components/layout/SurfaceCard";
import StatusPill from "@/components/feedback/StatusPill";
import EmptyState from "@/components/feedback/EmptyState";
import MetricTile from "@/components/feedback/MetricTile";
import { cn } from "@/lib/utils";

type StatusVisual = "enviada" | "aberta" | "parcial" | "nao_enviada" | "fechada";

const statusLabel: Record<StatusVisual, string> = {
  nao_enviada: "Não Enviada",
  aberta: "Aberta",
  fechada: "Fechada",
  parcial: "Parcial",
  enviada: "Enviada",
};

const statusPriority: Record<StatusVisual, number> = {
  nao_enviada: 0,
  aberta: 1,
  fechada: 2,
  parcial: 3,
  enviada: 4,
};

function calcOrgaoStatus(sol: Solicitacao, resposta: RespostaOrgao | undefined): StatusVisual {
  const totalItens = resposta ? resposta.itens.length : 0;
  const itensEnviados = resposta
    ? resposta.itens.filter(i => !!i.valor && String(i.valor).trim() !== "").length
    : 0;

  const createdDate = new Date(sol.createdAt);
  const prazoDate = new Date(createdDate);
  prazoDate.setDate(prazoDate.getDate() + sol.prazoDias);
  const dentroDoPrazo = new Date() <= prazoDate;

  if (totalItens === 0) return dentroDoPrazo ? "fechada" : "nao_enviada";
  if (itensEnviados === totalItens) return "enviada";
  if (itensEnviados === 0) return dentroDoPrazo ? "fechada" : "nao_enviada";
  return dentroDoPrazo ? "aberta" : "parcial";
}

function getPrazoDate(sol: Solicitacao): Date {
  const d = new Date(sol.createdAt);
  d.setDate(d.getDate() + sol.prazoDias);
  return d;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("pt-BR");
}

function diasRestantes(sol: Solicitacao): number {
  const prazo = getPrazoDate(sol);
  const diff = prazo.getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const OrgaoDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const orgaoId = user?.orgaoId || "";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [prazoFilter, setPrazoFilter] = useState<string>("todos");

  const solicitacoesDoOrgao = useMemo(() => {
    return mockSolicitacoes.filter(s => s.orgaosSelecionados.includes(orgaoId));
  }, [orgaoId]);

  const items = useMemo(() => {
    return solicitacoesDoOrgao.map(sol => {
      const respostas = mockRespostas.filter(r => r.solicitacaoId === sol.id && r.orgaoId === orgaoId);
      const resposta = respostas[0];
      const status = calcOrgaoStatus(sol, resposta);
      const totalItens = resposta ? resposta.itens.length : 0;
      const itensEnviados = resposta
        ? resposta.itens.filter(i => !!i.valor && String(i.valor).trim() !== "").length
        : 0;
      const dias = diasRestantes(sol);
      const prazo = getPrazoDate(sol);

      return { sol, resposta, status, totalItens, itensEnviados, dias, prazo };
    });
  }, [solicitacoesDoOrgao, orgaoId]);

  const summary = useMemo(() => {
    const total = items.length;
    const pendentes = items.filter(i => i.status === "aberta" || i.status === "fechada" || i.status === "parcial").length;
    const respondidas = items.filter(i => i.status === "enviada").length;
    const atrasadas = items.filter(i => i.dias < 0 && i.status !== "enviada").length;
    return { total, pendentes, respondidas, atrasadas };
  }, [items]);

  const filtered = useMemo(() => {
    let result = items;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(i => i.sol.titulo.toLowerCase().includes(q));
    }

    if (statusFilter !== "todos") {
      result = result.filter(i => i.status === statusFilter);
    }

    if (prazoFilter === "atrasado") {
      result = result.filter(i => i.dias < 0);
    } else if (prazoFilter === "hoje") {
      result = result.filter(i => i.dias >= 0 && i.dias <= 1);
    } else if (prazoFilter === "semana") {
      result = result.filter(i => i.dias >= 0 && i.dias <= 7);
    }

    result.sort((a, b) => statusPriority[a.status] - statusPriority[b.status]);

    return result;
  }, [items, search, statusFilter, prazoFilter]);

  const handleAccessChat = (solId: string) => {
    navigate(`/chatbot/${solId}`);
  };

  return (
    <PageShell width="xl" bare>
      <AppHeader title="STC – Agiliza" subtitle={user?.name ?? "Órgão respondente"} />

      <main className="mx-auto w-full max-w-7xl px-5 md:px-8 py-8">
        <PageHeader
          eyebrow="Painel do órgão"
          title="Minhas solicitações"
          description="Acompanhe e responda as solicitações enviadas pela Secretaria."
        />

        {/* Summary */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <MetricTile icon={Inbox} label="Total" value={summary.total} sub="recebidas" />
          <MetricTile icon={Clock} label="Pendentes" value={summary.pendentes} sub="aguardando envio" />
          <MetricTile icon={CheckCircle2} label="Respondidas" value={summary.respondidas} sub="completas" />
          <MetricTile icon={AlertOctagon} label="Atrasadas" value={summary.atrasadas} sub="fora do prazo" />
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar solicitação..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-11 bg-surface pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-11 w-full bg-surface sm:w-[200px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="nao_enviada">Não Enviada</SelectItem>
              <SelectItem value="aberta">Aberta</SelectItem>
              <SelectItem value="fechada">Fechada</SelectItem>
              <SelectItem value="parcial">Parcial</SelectItem>
              <SelectItem value="enviada">Enviada</SelectItem>
            </SelectContent>
          </Select>
          <Select value={prazoFilter} onValueChange={setPrazoFilter}>
            <SelectTrigger className="h-11 w-full bg-surface sm:w-[200px]">
              <SelectValue placeholder="Prazo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os prazos</SelectItem>
              <SelectItem value="atrasado">Atrasadas</SelectItem>
              <SelectItem value="hoje">Vence hoje</SelectItem>
              <SelectItem value="semana">Próximos 7 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Cards */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Nenhuma solicitação encontrada"
            description="Ajuste os filtros ou aguarde novas solicitações da Secretaria."
          />
        ) : (
          <div className="space-y-3">
            {filtered.map(({ sol, status, totalItens, itensEnviados, dias, prazo }, idx) => {
              const isOverdue = dias < 0;
              const isDone = status === "enviada";

              return (
                <SurfaceCard
                  key={sol.id}
                  elevation="soft"
                  interactive
                  accentBar={status}
                  className={cn(
                    "p-5 animate-slide-up",
                    isOverdue && "ring-1 ring-destructive/15",
                    isDone && "opacity-80",
                  )}
                  style={{ animationDelay: `${idx * 40}ms` }}
                  onClick={() => handleAccessChat(sol.id)}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-base font-semibold text-primary truncate">
                          {sol.titulo}
                        </h3>
                        <StatusPill tone={status}>{statusLabel[status]}</StatusPill>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          Prazo: <span className="tabular text-foreground">{formatDate(prazo)}</span>
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5",
                            isOverdue && "font-semibold text-destructive",
                          )}
                        >
                          {isOverdue ? (
                            <>
                              <AlertCircle className="h-3.5 w-3.5" />
                              {Math.abs(dias)} dia(s) atrasado
                            </>
                          ) : (
                            <>
                              <Clock className="h-3.5 w-3.5" />
                              {dias} dia(s) restante(s)
                            </>
                          )}
                        </span>
                        <span>
                          Itens: <strong className="tabular text-foreground">{itensEnviados}/{totalItens}</strong>
                        </span>
                      </div>
                    </div>

                    <Button
                      className="shrink-0 gap-2 bg-gradient-brand shadow-soft"
                      onClick={(e) => { e.stopPropagation(); handleAccessChat(sol.id); }}
                    >
                      Acessar
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </SurfaceCard>
              );
            })}
          </div>
        )}
      </main>
    </PageShell>
  );
};

export default OrgaoDashboardPage;
