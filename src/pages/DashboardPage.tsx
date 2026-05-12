import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/AppHeader";
import PageShell from "@/components/layout/PageShell";
import SectionHeading from "@/components/layout/SectionHeading";
import StatCard from "@/components/feedback/StatCard";
import {
  FileText, List, Trophy, ArrowRight, MessageSquareText,
  Inbox, Clock, CheckCircle2, AlertOctagon,
} from "lucide-react";
import { mockSolicitacoes, mockRespostas } from "@/data/mockData";
import { calcularStatusSolicitacao } from "@/lib/solicitacao-utils";
import { cn } from "@/lib/utils";

interface ActionCard {
  icon: typeof FileText;
  title: string;
  description: string;
  to: string;
  cta: string;
  accent: "primary" | "secondary" | "info";
}

const actions: ActionCard[] = [
  {
    icon: FileText,
    title: "Nova Solicitação",
    description: "Crie um novo pedido de dados para um ou mais órgãos do Estado.",
    to: "/nova-solicitacao",
    cta: "Criar solicitação",
    accent: "primary",
  },
  {
    icon: List,
    title: "Minhas Solicitações",
    description: "Acompanhe e valide as solicitações já enviadas.",
    to: "/solicitacoes",
    cta: "Ver histórico",
    accent: "secondary",
  },
  {
    icon: Trophy,
    title: "Ranking da Transparência",
    description: "Veja a pontuação mensal de cada órgão respondente.",
    to: "/ranking",
    cta: "Abrir ranking",
    accent: "info",
  },
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function formatDateLong(d: Date): string {
  return d
    .toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
    .replace(/^./, (c) => c.toUpperCase());
}

const accentBg: Record<ActionCard["accent"], string> = {
  primary: "from-brand-500 to-brand-700",
  secondary: "from-status-aberta to-brand-500",
  info: "from-status-fechada to-brand-600",
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const stats = useMemo(() => {
    const totalSol = mockSolicitacoes.length;
    let abertas = 0;
    let parciais = 0;
    let concluidas = 0;
    let atrasadas = 0;

    const today = new Date();

    for (const sol of mockSolicitacoes) {
      const status = calcularStatusSolicitacao(sol, mockRespostas);
      if (status === "enviada") concluidas++;
      else if (status === "parcial") parciais++;
      else if (status === "nao_enviada") atrasadas++;
      else if (status === "aberta" || status === "fechada") abertas++;

      const created = new Date(sol.createdAt);
      const prazo = new Date(created);
      prazo.setDate(prazo.getDate() + sol.prazoDias);
      if (today > prazo && status !== "enviada") {
        // already counted above; this just helps highlight overdue separately if needed
      }
    }

    return { totalSol, abertas, parciais, concluidas, atrasadas };
  }, []);

  return (
    <PageShell width="xl" bare>
      <AppHeader title="STC – Agiliza" subtitle="Painel da Secretaria da Transparência" />

      <main className="mx-auto w-full max-w-7xl px-5 md:px-8">
        {/* ── Hero ───────────────────────────── */}
        <section className="relative mt-8 overflow-hidden rounded-2xl bg-gradient-hero p-8 text-primary-foreground shadow-pop md:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-30 bg-grid-soft mix-blend-overlay"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full bg-brand-300/25 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl"
          />

          <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/70">
                {formatDateLong(new Date())}
              </p>
              <h1 className="mt-2 font-display text-display-lg leading-tight">
                {greeting()}, <span className="text-white/95">{user?.name?.split(" ")[0] ?? "bem-vindo(a)"}</span>.
              </h1>
              <p className="mt-2 text-sm text-primary-foreground/80">
                Acompanhe o andamento das solicitações enviadas aos órgãos e mantenha
                a transparência em dia.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => navigate("/nova-solicitacao")}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-primary shadow-soft transition-transform duration-200 ease-out hover:-translate-y-0.5"
              >
                <FileText className="h-4 w-4" /> Nova solicitação
              </button>
              <button
                onClick={() => navigate("/chatbot")}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-primary-foreground ring-1 ring-white/25 backdrop-blur transition-colors duration-200 hover:bg-white/15"
              >
                <MessageSquareText className="h-4 w-4" /> Assistente
              </button>
            </div>
          </div>
        </section>

        {/* ── Quick stats ────────────────────── */}
        <section className="mt-8">
          <SectionHeading
            eyebrow="Visão geral"
            title="Painel de solicitações"
            description="Resumo das solicitações cadastradas no sistema."
          />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard
              icon={Inbox}
              label="Total de solicitações"
              value={stats.totalSol}
              hint="cadastradas no sistema"
              tone="brand"
            />
            <StatCard
              icon={Clock}
              label="Em andamento"
              value={stats.abertas}
              hint="aguardando resposta"
              tone="neutral"
            />
            <StatCard
              icon={CheckCircle2}
              label="Concluídas"
              value={stats.concluidas}
              hint="totalmente respondidas"
              tone="success"
            />
            <StatCard
              icon={AlertOctagon}
              label="Atenção"
              value={stats.atrasadas + stats.parciais}
              hint={`${stats.atrasadas} atrasada(s) · ${stats.parciais} parcial(is)`}
              tone="warning"
            />
          </div>
        </section>

        {/* ── Action cards ───────────────────── */}
        <section className="mt-10 pb-12">
          <SectionHeading
            eyebrow="O que você quer fazer agora?"
            title="Ações rápidas"
          />
          <div className="grid gap-4 md:grid-cols-3">
            {actions.map((a, i) => (
              <button
                key={a.title}
                onClick={() => navigate(a.to)}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/70 bg-surface p-6 text-left shadow-soft transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-pop animate-slide-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div
                  aria-hidden="true"
                  className={cn(
                    "absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br opacity-15 transition-transform duration-300 group-hover:scale-125",
                    accentBg[a.accent],
                  )}
                />
                <div className="relative">
                  <div className={cn(
                    "mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-brand/40",
                    accentBg[a.accent],
                  )}>
                    <a.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-primary">{a.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600">
                    {a.cta}
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>
    </PageShell>
  );
};

export default DashboardPage;
