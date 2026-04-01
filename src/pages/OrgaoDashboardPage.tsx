import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  mockSolicitacoes, mockRespostas, orgaos, camposPlanilha,
  getRespostasForSolicitacao, Solicitacao, RespostaOrgao,
} from "@/data/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Calendar, ArrowRight, AlertCircle, Clock } from "lucide-react";
import AppHeader from "@/components/AppHeader";

type StatusVisual = "enviada" | "aberta" | "parcial" | "nao_enviada" | "fechada";

const statusConfig: Record<StatusVisual, { label: string; className: string }> = {
  nao_enviada: { label: "Não Enviada", className: "bg-status-nao-enviada-bg text-status-nao-enviada border-status-nao-enviada/30" },
  aberta: { label: "Aberta", className: "bg-status-aberta-bg text-status-aberta border-status-aberta/30" },
  fechada: { label: "Fechada", className: "bg-status-fechada-bg text-status-fechada border-status-fechada/30" },
  parcial: { label: "Parcial", className: "bg-status-parcial-bg text-status-parcial border-status-parcial/30" },
  enviada: { label: "Enviada", className: "bg-status-enviada-bg text-status-enviada border-status-enviada/30" },
};

const statusBorderColor: Record<StatusVisual, string> = {
  nao_enviada: "border-l-[hsl(var(--status-nao-enviada))]",
  aberta: "border-l-[hsl(var(--status-aberta))]",
  fechada: "border-l-[hsl(var(--status-fechada))]",
  parcial: "border-l-[hsl(var(--status-parcial))]",
  enviada: "border-l-[hsl(var(--status-enviada))]",
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
    // Find the chat for this orgao + solicitation
    navigate(`/chatbot/${solId}`);
  };

  return (
    <div className="min-h-screen bg-accent">
      <AppHeader title="STC – Agiliza" />

      <main className="container py-8">
        <div className="mb-8 animate-fade-in">
          <h2 className="text-2xl font-bold text-primary mb-1">Minhas Solicitações</h2>
          <p className="text-muted-foreground">Acompanhe e responda as solicitações enviadas pela Secretaria</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar solicitação..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
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
            <SelectTrigger className="w-full sm:w-[180px]">
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
          <Card className="border-0 shadow-lg">
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Search className="h-12 w-12 mb-4 opacity-40" />
              <p className="text-lg font-medium">Nenhuma solicitação encontrada</p>
              <p className="text-sm">Ajuste os filtros ou aguarde novas solicitações</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filtered.map(({ sol, status, totalItens, itensEnviados, dias, prazo }, idx) => {
              const isOverdue = dias < 0;
              const isDone = status === "enviada";

              return (
                <Card
                  key={sol.id}
                  className={`border-0 shadow-lg border-l-4 transition-all duration-300 hover:shadow-xl animate-slide-up ${
                    statusBorderColor[status]
                  } ${isOverdue ? "ring-1 ring-destructive/20" : ""} ${isDone ? "opacity-70" : ""}`}
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-card-foreground truncate">{sol.titulo}</h3>
                          <Badge variant="outline" className={statusConfig[status].className}>
                            {statusConfig[status].label}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            Prazo: {formatDate(prazo)}
                          </span>
                          <span className={`flex items-center gap-1.5 ${isOverdue ? "text-destructive font-medium" : ""}`}>
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
                            Itens: <strong>{itensEnviados}/{totalItens}</strong>
                          </span>
                        </div>
                      </div>

                      <Button
                        className="gap-2 bg-secondary hover:bg-secondary/90 shrink-0"
                        onClick={() => handleAccessChat(sol.id)}
                      >
                        Acessar solicitação
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default OrgaoDashboardPage;
