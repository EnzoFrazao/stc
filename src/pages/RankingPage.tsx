import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TrendingUp, TrendingDown, Minus, Trophy, Users, Send, Clock, XCircle } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import {
  orgaos,
  mockSolicitacoes,
  mockRespostas,
  objetosTransparencia,
  type Orgao,
} from "@/data/mockData";

// ── Scoring logic ──

interface OrgaoScore {
  orgaoId: string;
  nome: string;
  initials: string;
  color: string;
  pontuacao: number;
  envios: number;
  rejeicoes: number;
  tendencia: number; // diff vs previous cycle
}

const ORGAO_COLORS: Record<string, { bg: string; text: string }> = {
  "org-1": { bg: "#DBEAFE", text: "#1E40AF" },
  "org-2": { bg: "#FCE7F3", text: "#9D174D" },
  "org-3": { bg: "#FEF3C7", text: "#92400E" },
  "org-4": { bg: "#D1FAE5", text: "#065F46" },
  "org-5": { bg: "#EDE9FE", text: "#5B21B6" },
};

function getInitials(nome: string) {
  return nome
    .replace(/Secretaria de /i, "")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function generateCycles(): { label: string; value: string; month: number; year: number }[] {
  const cycles = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = d.getMonth();
    const year = d.getFullYear();
    const monthName = d.toLocaleString("pt-BR", { month: "long" });
    cycles.push({
      label: `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`,
      value: `${year}-${String(month + 1).padStart(2, "0")}`,
      month,
      year,
    });
  }
  return cycles;
}

function calcScoresForCycle(
  cycleMonth: number,
  cycleYear: number,
  objetoFilter: string
): OrgaoScore[] {
  // Filter solicitations by creation month
  const solsInCycle = mockSolicitacoes.filter((s) => {
    const d = new Date(s.createdAt);
    return d.getMonth() === cycleMonth && d.getFullYear() === cycleYear;
  });

  // If objeto filter is set, filter further
  const filteredSols = objetoFilter === "all"
    ? solsInCycle
    : solsInCycle.filter((s) => s.objetoId === objetoFilter);

  const scores: Record<string, { pontuacao: number; envios: number; rejeicoes: number }> = {};

  orgaos.forEach((o) => {
    scores[o.id] = { pontuacao: 0, envios: 0, rejeicoes: 0 };
  });

  filteredSols.forEach((sol) => {
    const createdDate = new Date(sol.createdAt);
    const prazoDate = new Date(createdDate);
    prazoDate.setDate(prazoDate.getDate() + sol.prazoDias);

    const respostas = mockRespostas.filter((r) => r.solicitacaoId === sol.id);

    respostas.forEach((resp) => {
      if (!scores[resp.orgaoId]) {
        scores[resp.orgaoId] = { pontuacao: 0, envios: 0, rejeicoes: 0 };
      }
      const s = scores[resp.orgaoId];

      resp.itens.forEach((item) => {
        const hasValue = !!item.valor && String(item.valor).trim() !== "";
        if (hasValue) {
          s.envios++;
          const updatedDate = new Date(resp.updatedAt);
          const noPrazo = updatedDate <= prazoDate;

          if (noPrazo) {
            s.pontuacao += 10;
          } else {
            s.pontuacao += 5;
          }

          if (item.validacaoStatus === "validado") {
            s.pontuacao += 3;
          }
        }

        if (item.validacaoStatus === "recusado") {
          s.pontuacao -= 2;
          s.rejeicoes++;
        }
      });
    });
  });

  return orgaos.map((o) => ({
    orgaoId: o.id,
    nome: o.nome,
    initials: getInitials(o.nome),
    color: o.id,
    pontuacao: Math.max(0, scores[o.id]?.pontuacao ?? 0),
    envios: scores[o.id]?.envios ?? 0,
    rejeicoes: scores[o.id]?.rejeicoes ?? 0,
    tendencia: 0,
  }));
}

// ── Component ──

const RankingPage = () => {
  const cycles = useMemo(() => generateCycles(), []);
  const [selectedCycle, setSelectedCycle] = useState(cycles[0].value);
  const [selectedObjeto, setSelectedObjeto] = useState("all");

  const currentCycle = cycles.find((c) => c.value === selectedCycle)!;
  const prevCycle = cycles.find((_, i) => cycles[i - 1]?.value === selectedCycle);

  const currentScores = useMemo(
    () => calcScoresForCycle(currentCycle.month, currentCycle.year, selectedObjeto),
    [currentCycle, selectedObjeto]
  );

  const prevScores = useMemo(() => {
    if (!prevCycle) return null;
    return calcScoresForCycle(prevCycle.month, prevCycle.year, selectedObjeto);
  }, [prevCycle, selectedObjeto]);

  const rankedScores = useMemo(() => {
    const withTrend = currentScores.map((s) => {
      const prev = prevScores?.find((p) => p.orgaoId === s.orgaoId);
      return { ...s, tendencia: prev ? s.pontuacao - prev.pontuacao : 0 };
    });
    return withTrend.sort((a, b) => b.pontuacao - a.pontuacao);
  }, [currentScores, prevScores]);

  const maxScore = Math.max(...rankedScores.map((s) => s.pontuacao), 1);

  // Metrics
  const orgaosAtivos = rankedScores.filter((s) => s.envios > 0).length;
  const totalItens = rankedScores.reduce((a, s) => a + s.envios + rankedScores.reduce((acc, r) => acc, 0), 0);
  const totalEnvios = rankedScores.reduce((a, s) => a + s.envios, 0);
  const totalRejeicoes = rankedScores.reduce((a, s) => a + s.rejeicoes, 0);

  // Simple rate calculations
  const totalSolItems = mockSolicitacoes
    .filter((s) => {
      const d = new Date(s.createdAt);
      return d.getMonth() === currentCycle.month && d.getFullYear() === currentCycle.year;
    })
    .reduce((acc, sol) => {
      const resps = mockRespostas.filter((r) => r.solicitacaoId === sol.id);
      return acc + resps.reduce((a, r) => a + r.itens.length, 0);
    }, 0);

  const taxaEnvio = totalSolItems > 0 ? Math.round((totalEnvios / totalSolItems) * 100) : 0;
  const taxaRejeicao = totalSolItems > 0 ? Math.round((totalRejeicoes / totalSolItems) * 100) : 0;

  // Prazo rate (simplified: items with value and updatedAt <= prazo)
  const enviosNoPrazo = rankedScores.reduce((a, s) => a + s.envios, 0); // simplified
  const taxaPrazo = totalEnvios > 0 ? Math.round((enviosNoPrazo / totalEnvios) * 100) : 0;

  const podium = rankedScores.slice(0, 3);
  const hasData = rankedScores.some((s) => s.pontuacao > 0 || s.envios > 0);

  return (
    <div className="min-h-screen bg-accent">
      <AppHeader title="STC – Agiliza" />
      <main className="container py-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">Ranking da Transparência</h1>
            <p className="text-muted-foreground">
              Desempenho dos órgãos no envio de dados — {currentCycle.label}
            </p>
          </div>
          <Badge variant="secondary" className="text-xs px-3 py-1">
            Ciclo mensal
          </Badge>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Select value={selectedCycle} onValueChange={setSelectedCycle}>
            <SelectTrigger className="w-full sm:w-[200px] bg-card">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {cycles.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedObjeto} onValueChange={setSelectedObjeto}>
            <SelectTrigger className="w-full sm:w-[280px] bg-card">
              <SelectValue placeholder="Objeto de transparência" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os objetos</SelectItem>
              {objetosTransparencia.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.codigo} — {o.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!hasData ? (
          <Card className="border-0 shadow-md">
            <CardContent className="py-16 text-center">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
              <p className="text-muted-foreground text-lg">Nenhum dado disponível para este período.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <MetricCard
                icon={Users}
                label="Órgãos ativos"
                value={`${orgaosAtivos}`}
                sub={`de ${orgaos.length} cadastrados`}
              />
              <MetricCard
                icon={Send}
                label="Taxa de envio"
                value={`${taxaEnvio}%`}
                sub="solicitações respondidas"
              />
              <MetricCard
                icon={Clock}
                label="Envios no prazo"
                value={`${taxaPrazo}%`}
                sub="dentro do prazo"
              />
              <MetricCard
                icon={XCircle}
                label="Rejeições"
                value={`${taxaRejeicao}%`}
                sub="itens rejeitados"
              />
            </div>

            {/* Podium */}
            {podium.length >= 3 && podium[0].pontuacao > 0 && (
              <Card className="border-0 shadow-md mb-8 overflow-hidden">
                <CardContent className="py-8 px-4">
                  <h2 className="text-lg font-semibold text-primary mb-6 text-center">
                    🏆 Pódio do Mês
                  </h2>
                  <div className="flex items-end justify-center gap-4 max-w-lg mx-auto">
                    {/* 2nd place */}
                    <PodiumBlock rank={2} score={podium[1]} />
                    {/* 1st place */}
                    <PodiumBlock rank={1} score={podium[0]} />
                    {/* 3rd place */}
                    <PodiumBlock rank={3} score={podium[2]} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Full ranking */}
            <Card className="border-0 shadow-md">
              <CardContent className="py-6">
                <h2 className="text-lg font-semibold text-primary mb-4">Classificação Geral</h2>
                <div className="space-y-3">
                  {rankedScores.map((score, idx) => {
                    const colors = ORGAO_COLORS[score.orgaoId] || { bg: "#F3F4F6", text: "#374151" };
                    return (
                      <div
                        key={score.orgaoId}
                        className="flex items-center gap-3 p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors"
                      >
                        <span className="text-sm font-bold text-muted-foreground w-6 text-center">
                          {idx + 1}
                        </span>
                        <Avatar className="h-9 w-9">
                          <AvatarFallback
                            style={{ backgroundColor: colors.bg, color: colors.text }}
                            className="text-xs font-bold"
                          >
                            {score.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-card-foreground truncate">
                            {score.nome}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {score.envios} envios · {score.rejeicoes} rejeição{score.rejeicoes !== 1 ? "ões" : ""}
                          </p>
                          <div className="mt-1">
                            <Progress
                              value={maxScore > 0 ? (score.pontuacao / maxScore) * 100 : 0}
                              className="h-1.5"
                              style={
                                {
                                  "--progress-color": colors.text,
                                } as React.CSSProperties
                              }
                            />
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-0.5">
                          <span className="text-sm font-bold text-card-foreground">
                            {score.pontuacao} pts
                          </span>
                          <TrendBadge value={score.tendencia} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

// ── Sub-components ──

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card className="border-0 shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="h-4 w-4 text-secondary" />
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
        <p className="text-2xl font-bold text-card-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}

const PODIUM_STYLES: Record<number, { height: string; bg: string; text: string; medal: string }> = {
  1: { height: "h-28", bg: "bg-[#FAC775]", text: "text-[#633806]", medal: "🥇" },
  2: { height: "h-20", bg: "bg-[#B5D4F4]", text: "text-[#0C447C]", medal: "🥈" },
  3: { height: "h-14", bg: "bg-[#C0DD97]", text: "text-[#27500A]", medal: "🥉" },
};

function PodiumBlock({ rank, score }: { rank: number; score: OrgaoScore }) {
  const style = PODIUM_STYLES[rank];
  return (
    <div className="flex flex-col items-center flex-1 max-w-[140px]">
      <span className="text-2xl mb-1">{style.medal}</span>
      <p className="text-xs font-semibold text-card-foreground text-center truncate w-full mb-1">
        {score.nome.replace("Secretaria de ", "")}
      </p>
      <p className={`text-xs font-bold ${style.text} mb-1`}>{score.pontuacao} pts</p>
      <div className={`w-full ${style.height} ${style.bg} rounded-t-lg flex items-center justify-center`}>
        <span className={`text-xl font-black ${style.text}`}>{rank}º</span>
      </div>
    </div>
  );
}

function TrendBadge({ value }: { value: number }) {
  if (value > 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-[#3B6D11]">
        <TrendingUp className="h-3 w-3" /> +{value}
      </span>
    );
  }
  if (value < 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-[#A32D2D]">
        <TrendingDown className="h-3 w-3" /> {value}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
      <Minus className="h-3 w-3" /> —
    </span>
  );
}

export default RankingPage;
