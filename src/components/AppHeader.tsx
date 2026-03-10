import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import stcLogo from "@/assets/stc-logo.png";

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  backTo?: string;
}

const AppHeader = ({ title, showBack, backTo = "/dashboard" }: AppHeaderProps) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-primary shadow-lg">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => navigate(backTo)}
            >
              ← Voltar
            </Button>
          )}
          <img src={stcLogo} alt="STC Maranhão" className="h-10 w-10 rounded-full bg-primary-foreground/20 p-0.5" />
          {title && <h1 className="text-lg font-semibold text-primary-foreground">{title}</h1>}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary-foreground hover:bg-primary-foreground/10 gap-2"
          onClick={() => { logout(); navigate("/login"); }}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </header>
  );
};

export default AppHeader;
