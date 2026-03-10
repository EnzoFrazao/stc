import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import stcLogo from "@/assets/stc-logo.png";

const RecuperarSenhaPage = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    toast({ title: "Link enviado!", description: "Verifique seu email para redefinir a senha." });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-accent p-4">
      <Card className="w-full max-w-md animate-fade-in shadow-xl border-0">
        <CardHeader className="items-center pb-2">
          <img src={stcLogo} alt="STC Maranhão" className="h-20 w-20 mb-2" />
          <h1 className="text-xl font-bold text-primary">Recuperar Senha</h1>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center space-y-4 animate-fade-in">
              <div className="mx-auto w-16 h-16 rounded-full bg-status-completed-bg flex items-center justify-center text-status-completed text-2xl">✓</div>
              <p className="text-muted-foreground">Um link de recuperação foi enviado para <strong>{email}</strong>.</p>
              <Button variant="outline" onClick={() => navigate("/login")} className="w-full">Voltar ao login</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email cadastrado</Label>
                <Input id="email" type="email" placeholder="seu@email.gov.br" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full">Enviar link de recuperação</Button>
              <div className="text-center">
                <button type="button" className="text-sm text-secondary hover:underline" onClick={() => navigate("/login")}>
                  Voltar ao login
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RecuperarSenhaPage;
