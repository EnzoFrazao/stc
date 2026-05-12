import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Search } from "lucide-react";

const NotFoundPage = () => {
  const navigate = useNavigate();
  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-gradient-canvas p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-grid-soft opacity-60"
      />
      <div className="relative w-full max-w-md text-center animate-slide-up">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-brand shadow-brand">
          <Search className="h-7 w-7 text-primary-foreground" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-500">Erro 404</p>
        <h1 className="mt-2 font-display text-display-xl text-primary">Página não encontrada</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          O endereço que você tentou acessar não existe ou foi movido.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => navigate("/dashboard")} className="bg-gradient-brand shadow-brand">
            <Home className="mr-2 h-4 w-4" /> Voltar ao painel
          </Button>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Página anterior
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
