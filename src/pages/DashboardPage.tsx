import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, List, Trophy } from "lucide-react";
import AppHeader from "@/components/AppHeader";

const cards = [
  {
    icon: FileText,
    title: "Nova Solicitação",
    description: "Criar uma nova solicitação de dados",
    to: "/nova-solicitacao",
  },
  {
    icon: List,
    title: "Histórico",
    description: "Visualizar solicitações enviadas",
    to: "/solicitacoes",
  },
  {
    icon: Trophy,
    title: "Ranking da Transparência",
    description: "Desempenho dos órgãos no envio de dados",
    to: "/ranking",
  },
];

const DashboardPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-accent">
      <AppHeader title="STC – Agiliza" />
      <main className="container py-16">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl font-bold text-primary mb-2">Bem-vindo ao Sistema STC-MA</h2>
          <p className="text-muted-foreground">Selecione uma opção para começar</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {cards.map((card, i) => (
            <Card
              key={card.title}
              className="cursor-pointer border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-slide-up"
              style={{ animationDelay: `${i * 100}ms` }}
              onClick={() => navigate(card.to)}
            >
              <CardContent className="flex flex-col items-center p-8 text-center">
                <div className="mb-4 rounded-xl bg-accent p-4">
                  <card.icon className="h-10 w-10 text-secondary" />
                </div>
                <h3 className="text-lg font-semibold text-card-foreground mb-1">{card.title}</h3>
                <p className="text-sm text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
