import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  trend?: number | null;
  trendLabel?: string;
  tone?: "brand" | "neutral" | "success" | "warning" | "danger";
  className?: string;
}

const toneStyles = {
  brand:   { iconBg: "bg-brand-50",  iconText: "text-brand-600",        ring: "ring-brand-100" },
  neutral: { iconBg: "bg-muted",     iconText: "text-muted-foreground", ring: "ring-border" },
  success: { iconBg: "bg-status-enviada-bg",     iconText: "text-status-enviada",     ring: "ring-status-enviada/15" },
  warning: { iconBg: "bg-status-parcial-bg",     iconText: "text-status-parcial",     ring: "ring-status-parcial/15" },
  danger:  { iconBg: "bg-status-nao-enviada-bg", iconText: "text-status-nao-enviada", ring: "ring-status-nao-enviada/15" },
} as const;

function TrendIndicator({ value, label }: { value: number; label?: string }) {
  if (value > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-status-enviada-bg px-1.5 py-0.5 text-[11px] font-medium text-status-enviada">
        <TrendingUp className="h-3 w-3" /> +{value}{label ? ` ${label}` : ""}
      </span>
    );
  }
  if (value < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-status-nao-enviada-bg px-1.5 py-0.5 text-[11px] font-medium text-status-nao-enviada">
        <TrendingDown className="h-3 w-3" /> {value}{label ? ` ${label}` : ""}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
      <Minus className="h-3 w-3" /> sem variação
    </span>
  );
}

const StatCard = ({
  icon: Icon,
  label,
  value,
  hint,
  trend,
  trendLabel,
  tone = "brand",
  className,
}: StatCardProps) => {
  const t = toneStyles[tone];
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/70 bg-gradient-card-soft p-4 shadow-soft transition-shadow duration-200 ease-out hover:shadow-card",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg ring-1",
            t.iconBg, t.iconText, t.ring,
          )}
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </div>
        {trend !== undefined && trend !== null && (
          <TrendIndicator value={trend} label={trendLabel} />
        )}
      </div>
      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-2xl font-bold tabular text-primary">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
};

export default StatCard;
