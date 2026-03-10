import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFoundPage = () => {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-accent">
      <div className="text-center animate-fade-in">
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-6">Página não encontrada</p>
        <Button onClick={() => navigate("/login")}>Voltar para o início</Button>
      </div>
    </div>
  );
};

export default NotFoundPage;
