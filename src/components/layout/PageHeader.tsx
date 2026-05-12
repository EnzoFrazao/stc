import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  badge?: ReactNode;
  className?: string;
}

const PageHeader = ({
  eyebrow,
  title,
  description,
  breadcrumbs,
  actions,
  badge,
  className,
}: PageHeaderProps) => {
  return (
    <header className={cn("mb-8 animate-fade-in", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-3">
          <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <li>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-accent hover:text-primary transition-colors"
              >
                <Home className="h-3 w-3" />
                <span className="sr-only">Início</span>
              </Link>
            </li>
            {breadcrumbs.map((c, i) => (
              <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
                <ChevronRight className="h-3 w-3 opacity-50" />
                {c.to ? (
                  <Link
                    to={c.to}
                    className="rounded-md px-1.5 py-0.5 hover:bg-accent hover:text-primary transition-colors"
                  >
                    {c.label}
                  </Link>
                ) : (
                  <span className="px-1.5 py-0.5 text-foreground font-medium">{c.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-brand-500">
              {eyebrow}
            </p>
          )}
          <div className="flex items-center gap-3">
            <h1 className="font-display text-display-md text-primary truncate">{title}</h1>
            {badge}
          </div>
          {description && (
            <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
};

export default PageHeader;
