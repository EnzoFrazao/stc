import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  variant?: "card" | "bare";
}

const EmptyState = ({ icon: Icon, title, description, action, className, variant = "card" }: EmptyStateProps) => {
  const inner = (
    <div className={cn("flex flex-col items-center text-center px-6 py-14", className)}>
      {Icon && (
        <div
          aria-hidden="true"
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-brand-500 ring-1 ring-brand-100"
        >
          <Icon className="h-6 w-6" />
        </div>
      )}
      <h3 className="font-display text-lg font-semibold text-primary">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );

  if (variant === "bare") return inner;

  return (
    <div className="rounded-xl border border-dashed border-border bg-surface/70 shadow-xs">
      {inner}
    </div>
  );
};

export default EmptyState;
