import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import stcLogo from "@/assets/stc-logo.png";

const RecuperarSenhaPage = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    toast({
      title: "Link enviado!",
      description: "Verifique sua caixa de entrada para redefinir a senha.",
    });
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-gradient-canvas p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-grid-soft opacity-60"
      />
      <div className="relative w-full max-w-md animate-slide-up">
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para o login
        </button>

        <div className="rounded-2xl border border-border bg-surface p-8 shadow-pop">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand shadow-brand">
              <img src={stcLogo} alt="STC Maranhão" className="h-10 w-10 object-contain" />
            </div>
            <h1 className="mt-4 font-display text-display-sm text-primary">Recuperar senha</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Informe o e-mail cadastrado para enviarmos as instruções.
            </p>
          </div>

          {sent ? (
            <div className="mt-8 flex flex-col items-center text-center animate-fade-in">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-status-enviada-bg text-status-enviada ring-1 ring-status-enviada/20">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <p className="mt-4 text-sm text-foreground">
                Enviamos um link de recuperação para{" "}
                <strong className="text-primary">{email}</strong>.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Não recebeu? Verifique sua caixa de spam ou tente novamente.
              </p>
              <Button
                variant="outline"
                className="mt-6 w-full"
                onClick={() => navigate("/login")}
              >
                Voltar ao login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-foreground">
                  E-mail cadastrado
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="seu@email.gov.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 bg-surface pl-9"
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="h-11 w-full bg-gradient-brand text-base font-semibold shadow-brand transition-transform duration-200 ease-out hover:-translate-y-0.5"
              >
                Enviar link de recuperação
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecuperarSenhaPage;
