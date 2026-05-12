import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TrendingUp, TrendingDown, Minus, Trophy, Medal, Users, Send, Clock, XCircle } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/layout/PageHeader";
import SectionHeading from "@/components/layout/SectionHeading";
import SurfaceCard from "@/components/layout/SurfaceCard";
import MetricTile from "@/components/feedback/MetricTile";
import EmptyState from "@/components/feedback/EmptyState";
import {
  orgaos,
  mockSolicitacoes,
  mockRespostas,
  objetosTransparencia,
} from "@/data/mockData";

// ── Scoring ──

interface OrgaoScore {
  orgaoId: string;
  nome: string;
  initials: string;
  pontuacao: number;
  envios: number;
  rejeicoes: number;
  tendencia: number;
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
  const solsInCycle = mockSolicitacoes.filter((s) => {
    const d = new Date(s.createdAt);
    return d.getMonth() === cycleMonth && d.getFullYear() === cycleYear;
  });

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
      if (!scores[resp.orgaoId]) scores[resp.orgaoId] = { pontuacao: 0, envios: 0, rejeicoes: 0 };
      const s = scores[resp.orgaoId];

      resp.itens.forEach((item) => {
        const hasValue = !!item.valor && String(item.valor).trim() !== "";
        if (hasValue) {
          s.envios++;
          const updatedDate = new Date(resp.updatedAt);
          s.pontuacao += updatedDate <= prazoDate ? 10 : 5;
          if (item.validacaoStatus === "validado") s.pontuacao += 3;
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

  const orgaosAtivos = rankedScores.filter((s) => s.envios > 0).length;
  const totalEnvios = rankedScores.reduce((a, s) => a + s.envios, 0);
  const totalRejeicoes = rankedScores.reduce((a, s) => a + s.rejeicoes, 0);
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
  const enviosNoPrazo = rankedScores.reduce((a, s) => a + s.envios, 0);
  const taxaPrazo = totalEnvios > 0 ? Math.round((enviosNoPrazo / totalEnvios) * 100) : 0;

  const podium = rankedScores.slice(0, 3);
  const hasData = rankedScores.some((s) => s.pontuacao > 0 || s.envios > 0);

  return (
    <PageShell width="xl" bare>
      <AppHeader title="STC – Agiliza" showBack />

      <main className="mx-auto w-full max-w-7xl px-5 md:px-8 py-8">
        <PageHeader
          eyebrow="Indicadores"
          title="Ranking da Transparência"
          description={`Desempenho dos órgãos no envio de dados — ${currentCycle.label}`}
          breadcrumbs={[{ label: "Ranking" }]}
          badge={
            <Badge variant="secondary" className="text-[11px] font-medium">
              Ciclo mensal
            </Badge>
          }
        />

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <Select value={selectedCycle} onValueChange={setSelectedCycle}>
            <SelectTrigger className="h-11 w-full bg-surface sm:w-[220px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {cycles.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedObjeto} onValueChange={setSelectedObjeto}>
            <SelectTrigger className="h-11 w-full bg-surface sm:w-[300px]">
              <SelectValue placeholder="Objeto de transparência" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os objetos</SelectItem>
              {objetosTransparencia.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.codigo} — {o.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!hasData ? (
          <EmptyState
            icon={Trophy}
            title="Nenhum dado disponível"
            description="Não há indicadores para o período e filtro selecionados."
          />
        ) : (
          <>
            {/* Metrics */}
            <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <MetricTile icon={Users}   label="Órgãos ativos"  value={orgaosAtivos}      sub={`de ${orgaos.length} cadastrados`} />
              <MetricTile icon={Send}    label="Taxa de envio"  value={`${taxaEnvio}%`}   sub="solicitações respondidas" />
              <MetricTile icon={Clock}   label="No prazo"       value={`${taxaPrazo}%`}   sub="dentro do prazo" />
              <MetricTile icon={XCircle} label="Rejeições"      value={`${taxaRejeicao}%`} sub="itens rejeitados" />
            </div>

            {/* Podium */}
            {podium.length >= 3 && podium[0].pontuacao > 0 && (
              <SurfaceCard tone="soft" elevation="card" className="mb-8 overflow-hidden">
                <div className="px-4 py-8 sm:px-8">
                  <SectionHeading
                    eyebrow="Destaque do mês"
                    title="Pódio do ciclo"
                    description="Os três órgãos com maior pontuação no período."
                    className="mb-6 text-center justify-center [&_div:first-child]:mx-auto"
                  />
                  <div className="mx-auto flex max-w-lg items-end justify-center gap-4">
                    <PodiumBlock rank={2} score={podium[1]} />
                    <PodiumBlock rank={1} score={podium[0]} />
                    <PodiumBlock rank={3} score={podium[2]} />
                  </div>
                </div>
              </SurfaceCard>
            )}

            {/* Full ranking */}
            <SurfaceCard elevation="card" className="p-6">
              <SectionHeading title="Classificação geral" description="Pontuação de todos os órgãos no ciclo selecionado." />
              <div className="space-y-2.5">
                {rankedScores.map((score, idx) => {
                  const colors = ORGAO_COLORS[score.orgaoId] || { bg: "#F3F4F6", text: "#374151" };
                  const isLeader = idx === 0 && score.pontuacao > 0;
                  return (
                    <div
                      key={score.orgaoId}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 bg-surface p-3 transition-colors hover:bg-accent/40 ${
                        isLeader ? "ring-1 ring-brand-200" : ""
                      }`}
                    >
                      <span className="w-7 text-center font-display text-base font-bold tabular text-muted-foreground">
                        {idx + 1}
                      </span>
                      <Avatar className="h-10 w-10 ring-1 ring-border">
                        <AvatarFallback
                          style={{ backgroundColor: colors.bg, color: colors.text }}
                          className="text-xs font-bold"
                        >
                          {score.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-card-foreground">{score.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          <span className="tabular">{score.envios}</span> envios ·{" "}
                          <span className="tabular">{score.rejeicoes}</span> rejeição{score.rejeicoes !== 1 ? "ões" : ""}
                        </p>
                        <div className="mt-1.5">
                          <Progress
                            value={maxScore > 0 ? (score.pontuacao / maxScore) * 100 : 0}
                            className="h-1.5"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 text-right">
                        <span className="font-display text-base font-bold tabular text-primary">
                          {score.pontuacao} <span className="text-xs font-normal text-muted-foreground">pts</span>
                        </span>
                        <TrendBadge value={score.tendencia} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </SurfaceCard>
          </>
        )}
      </main>
    </PageShell>
  );
};

// ── Sub-components ──

const PODIUM_STYLES: Record<number, { height: string; bg: string; text: string; Icon: typeof Trophy; iconColor: string }> = {
  1: { height: "h-32", bg: "bg-[#FAC775]", text: "text-[#633806]", Icon: Trophy, iconColor: "#B45309" },
  2: { height: "h-24", bg: "bg-[#B5D4F4]", text: "text-[#0C447C]", Icon: Medal, iconColor: "#1D4ED8" },
  3: { height: "h-16", bg: "bg-[#C0DD97]", text: "text-[#27500A]", Icon: Medal, iconColor: "#15803D" },
};

function PodiumBlock({ rank, score }: { rank: number; score: OrgaoScore }) {
  const style = PODIUM_STYLES[rank];
  return (
    <div className="flex max-w-[140px] flex-1 flex-col items-center">
      <style.Icon className="mb-1 h-7 w-7" style={{ color: style.iconColor }} aria-hidden="true" />
      <p className="mb-1 line-clamp-2 w-full text-center text-xs font-semibold text-card-foreground">
        {score.nome.replace("Secretaria de ", "")}
      </p>
      <p className={`mb-2 font-display text-sm font-bold tabular ${style.text}`}>{score.pontuacao} pts</p>
      <div className={`flex w-full items-center justify-center rounded-t-xl shadow-soft ${style.height} ${style.bg}`}>
        <span className={`font-display text-2xl font-black ${style.text}`}>{rank}º</span>
      </div>
    </div>
  );
}

function TrendBadge({ value }: { value: number }) {
  if (value > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-md bg-status-enviada-bg px-1.5 py-0.5 text-[11px] font-medium text-status-enviada">
        <TrendingUp className="h-3 w-3" /> +{value}
      </span>
    );
  }
  if (value < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-md bg-status-nao-enviada-bg px-1.5 py-0.5 text-[11px] font-medium text-status-nao-enviada">
        <TrendingDown className="h-3 w-3" /> {value}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
      <Minus className="h-3 w-3" /> —
    </span>
  );
}

export default RankingPage;
