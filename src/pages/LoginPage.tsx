import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, ShieldCheck, Sparkles, BarChart3 } from "lucide-react";
import stcLogo from "@/assets/stc-logo.png";

const features = [
  {
    icon: ShieldCheck,
    title: "Transparência institucional",
    description: "Centralize as solicitações de dados entre a STC e os órgãos do Estado.",
  },
  {
    icon: BarChart3,
    title: "Acompanhamento em tempo real",
    description: "Visualize prazos, status e métricas de cada solicitação no painel.",
  },
  {
    icon: Sparkles,
    title: "Ranking da Transparência",
    description: "Estimule o cumprimento dos prazos com pontuação mensal por órgão.",
  },
];

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // Slight delay for UX (200ms — feels intentional, not blocking)
    setTimeout(() => {
      if (login(email, password)) {
        const saved = sessionStorage.getItem("stc-user");
        const user = saved ? JSON.parse(saved) : null;
        navigate(user?.role === "orgao" ? "/orgao-dashboard" : "/dashboard");
      } else {
        toast({
          title: "Não foi possível entrar",
          description: "Verifique seu e-mail e senha e tente novamente.",
          variant: "destructive",
        });
      }
      setSubmitting(false);
    }, 220);
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* ── Brand panel ────────────────────────────── */}
      <aside className="relative hidden overflow-hidden bg-gradient-hero lg:block">
        <div aria-hidden="true" className="absolute inset-0 bg-brand-spotlight" />
        <div aria-hidden="true" className="absolute inset-0 opacity-25 bg-grid-soft mix-blend-overlay" />

        {/* Decorative floating shapes */}
        <div
          aria-hidden="true"
          className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -top-32 -right-24 h-96 w-96 rounded-full bg-brand-300/15 blur-3xl"
        />

        <div className="relative flex h-full flex-col p-12 text-primary-foreground">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
              <img src={stcLogo} alt="STC Maranhão" className="h-9 w-9 object-contain" />
            </div>
            <div>
              <p className="font-display text-sm font-semibold tracking-tight">STC – Agiliza</p>
              <p className="text-xs text-primary-foreground/70">Governo do Maranhão</p>
            </div>
          </div>

          <div className="mt-auto max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">
              Sistema de Solicitação de Dados
            </p>
            <h2 className="mt-2 font-display text-display-lg leading-tight">
              Dados confiáveis para uma gestão pública mais ágil.
            </h2>
            <p className="mt-3 text-sm text-primary-foreground/80">
              Uma plataforma institucional para coordenar pedidos, respostas e auditoria
              de informações entre a Secretaria da Transparência e os órgãos do Estado.
            </p>

            <ul className="mt-10 space-y-4">
              {features.map((f) => (
                <li key={f.title} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                    <f.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{f.title}</p>
                    <p className="text-xs leading-relaxed text-primary-foreground/75">{f.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-10 text-[11px] text-primary-foreground/55">
            © {new Date().getFullYear()} Secretaria da Transparência e Controle — Maranhão
          </p>
        </div>
      </aside>

      {/* ── Form panel ─────────────────────────────── */}
      <section className="relative flex items-center justify-center bg-gradient-canvas p-6 sm:p-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60 bg-grid-soft"
        />
        <div className="relative w-full max-w-md animate-slide-up">
          {/* Mobile brand */}
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand shadow-brand">
              <img src={stcLogo} alt="STC Maranhão" className="h-10 w-10 object-contain" />
            </div>
            <h1 className="mt-3 font-display text-xl font-bold text-primary">STC – Agiliza</h1>
            <p className="text-xs text-muted-foreground">Sistema de Solicitação de Dados</p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-8 shadow-pop">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-500">
                Acesso institucional
              </p>
              <h2 className="mt-1 font-display text-display-md text-primary">Entrar na plataforma</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Use seu e-mail funcional para acessar o painel.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-foreground">
                  E-mail funcional
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.gov.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 bg-surface"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold text-foreground">
                    Senha
                  </Label>
                  <button
                    type="button"
                    className="cursor-pointer text-xs font-medium text-brand-500 hover:underline"
                    onClick={() => navigate("/recuperar-senha")}
                  >
                    Esqueceu sua senha?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 bg-surface pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="h-11 w-full bg-gradient-brand text-base font-semibold shadow-brand transition-transform duration-200 ease-out hover:-translate-y-0.5"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando…
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>

            <div className="mt-6 rounded-lg border border-dashed border-border bg-canvas/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
              Em caso de problemas no acesso, entre em contato com o suporte da STC pelo e-mail{" "}
              <a href="mailto:suporte@stc.ma.gov.br" className="font-medium text-brand-600 hover:underline">
                suporte@stc.ma.gov.br
              </a>
              .
            </div>
          </div>

          <p className="mt-6 text-center text-[11px] text-muted-foreground lg:hidden">
            © {new Date().getFullYear()} STC — Maranhão
          </p>
        </div>
      </section>
    </div>
  );
};

export default LoginPage;
