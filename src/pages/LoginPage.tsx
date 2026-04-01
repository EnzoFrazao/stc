import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import stcLogo from "@/assets/stc-logo.png";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(email, password)) {
      // Check stored user to determine role
      const saved = sessionStorage.getItem("stc-user");
      if (saved) {
        const user = JSON.parse(saved);
        if (user.role === "orgao") {
          navigate("/orgao-dashboard");
        } else {
          navigate("/dashboard");
        }
      } else {
        navigate("/dashboard");
      }
    } else {
      toast({ title: "Erro", description: "Credenciais inválidas.", variant: "destructive" });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-accent p-4">
      <Card className="w-full max-w-md animate-fade-in shadow-xl border-0">
        <CardHeader className="items-center pb-2">
          <img src={stcLogo} alt="STC Maranhão" className="h-20 w-20 mb-2" />
          <h1 className="text-xl font-bold text-primary">Sistema de Solicitação de Dados</h1>
          <p className="text-sm text-muted-foreground">STC – Agiliza</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="seu@email.gov.br" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full">Entrar</Button>
            <div className="text-center">
              <button type="button" className="text-sm text-secondary hover:underline" onClick={() => navigate("/recuperar-senha")}>
                Esqueceu sua senha?
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
