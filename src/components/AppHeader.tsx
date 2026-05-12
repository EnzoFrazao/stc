import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import stcLogo from "@/assets/stc-logo.png";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  backTo?: string;
  variant?: "solid" | "gradient" | "minimal";
  rightSlot?: React.ReactNode;
}

function getInitials(name: string): string {
  if (!name) return "U";
  return name
    .replace(/Secretaria de /i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const AppHeader = ({
  title = "STC – Agiliza",
  subtitle,
  showBack,
  backTo = "/dashboard",
  variant = "gradient",
  rightSlot,
}: AppHeaderProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = getInitials(user?.name ?? "U");
  const roleLabel = user?.role === "admin" ? "Administrador" : "Órgão respondente";

  const bg =
    variant === "gradient"
      ? "bg-gradient-brand"
      : variant === "minimal"
      ? "glass border-b border-border"
      : "bg-primary";

  const fg = variant === "minimal" ? "text-primary" : "text-primary-foreground";
  const hover = variant === "minimal" ? "hover:bg-accent" : "hover:bg-white/10";

  return (
    <header
      className={cn(
        "sticky top-0 z-40 shadow-card",
        bg,
        fg,
      )}
    >
      {/* Decorative overlay for gradient variant */}
      {variant === "gradient" && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-40 bg-grid-soft mix-blend-overlay"
        />
      )}
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-5 md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          {showBack && (
            <button
              type="button"
              onClick={() => navigate(backTo)}
              className={cn(
                "inline-flex cursor-pointer h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors duration-150",
                hover,
              )}
              aria-label="Voltar"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Voltar</span>
            </button>
          )}
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1",
              variant === "minimal"
                ? "bg-brand-50 ring-brand-200"
                : "bg-white/15 ring-white/25",
            )}
          >
            <img src={stcLogo} alt="STC Maranhão" className="h-8 w-8 object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-base font-semibold tracking-tight truncate">{title}</h1>
            {subtitle && (
              <p
                className={cn(
                  "text-[11px] leading-tight truncate",
                  variant === "minimal" ? "text-muted-foreground" : "text-primary-foreground/70",
                )}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {rightSlot}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "group inline-flex cursor-pointer items-center gap-2 rounded-full pl-1 pr-2.5 py-1 transition-colors duration-150",
                  hover,
                )}
                aria-label="Menu da conta"
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ring-1",
                    variant === "minimal"
                      ? "bg-brand-100 text-brand-700 ring-brand-200"
                      : "bg-white/15 text-white ring-white/25",
                  )}
                >
                  {initials}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-xs font-semibold leading-tight truncate max-w-[140px]">
                    {user?.name ?? "Usuário"}
                  </span>
                  <span
                    className={cn(
                      "block text-[10px] leading-tight",
                      variant === "minimal" ? "text-muted-foreground" : "text-primary-foreground/70",
                    )}
                  >
                    {roleLabel}
                  </span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">{user?.name ?? "Usuário"}</span>
                  <span className="text-xs text-muted-foreground">{user?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled className="gap-2">
                <User className="h-4 w-4" /> Meu perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => { logout(); navigate("/login"); }}
                className="gap-2 text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
