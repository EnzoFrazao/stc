import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricTileProps {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  className?: string;
  align?: "start" | "center";
}

const MetricTile = ({ icon: Icon, label, value, sub, className, align = "start" }: MetricTileProps) => {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 bg-surface p-4 shadow-xs",
        align === "center" && "text-center",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2",
          align === "center" && "justify-center",
        )}
      >
        {Icon && <Icon className="h-4 w-4 text-brand-500" aria-hidden="true" />}
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1.5 font-display text-2xl font-bold tabular text-primary">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
};

export default MetricTile;
