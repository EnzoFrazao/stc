import { cn } from "@/lib/utils";

export type StatusTone =
  | "enviada"
  | "aberta"
  | "parcial"
  | "nao_enviada"
  | "fechada"
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger";

const toneStyles: Record<StatusTone, { dot: string; bg: string; text: string; border: string }> = {
  enviada:     { dot: "bg-status-enviada",     bg: "bg-status-enviada-bg",     text: "text-status-enviada",     border: "border-status-enviada/25" },
  aberta:      { dot: "bg-status-aberta",      bg: "bg-status-aberta-bg",      text: "text-status-aberta",      border: "border-status-aberta/25" },
  parcial:     { dot: "bg-status-parcial",     bg: "bg-status-parcial-bg",     text: "text-status-parcial",     border: "border-status-parcial/25" },
  nao_enviada: { dot: "bg-status-nao-enviada", bg: "bg-status-nao-enviada-bg", text: "text-status-nao-enviada", border: "border-status-nao-enviada/25" },
  fechada:     { dot: "bg-status-fechada",     bg: "bg-status-fechada-bg",     text: "text-status-fechada",     border: "border-status-fechada/25" },
  neutral:     { dot: "bg-muted-foreground",   bg: "bg-muted",                 text: "text-muted-foreground",   border: "border-border" },
  info:        { dot: "bg-status-aberta",      bg: "bg-status-aberta-bg",      text: "text-status-aberta",      border: "border-status-aberta/25" },
  success:     { dot: "bg-status-enviada",     bg: "bg-status-enviada-bg",     text: "text-status-enviada",     border: "border-status-enviada/25" },
  warning:     { dot: "bg-status-parcial",     bg: "bg-status-parcial-bg",     text: "text-status-parcial",     border: "border-status-parcial/25" },
  danger:      { dot: "bg-status-nao-enviada", bg: "bg-status-nao-enviada-bg", text: "text-status-nao-enviada", border: "border-status-nao-enviada/25" },
};

interface StatusPillProps {
  tone: StatusTone;
  children: React.ReactNode;
  size?: "sm" | "md";
  dot?: boolean;
  className?: string;
}

const StatusPill = ({ tone, children, size = "sm", dot = true, className }: StatusPillProps) => {
  const t = toneStyles[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap",
        t.bg, t.text, t.border,
        size === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-xs",
        className,
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", t.dot)} aria-hidden="true" />}
      {children}
    </span>
  );
};

export default StatusPill;
