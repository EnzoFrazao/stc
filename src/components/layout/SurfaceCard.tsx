import { forwardRef, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "default" | "soft" | "brand" | "muted";
type Elevation = "flat" | "soft" | "card" | "pop";

interface SurfaceCardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  elevation?: Elevation;
  interactive?: boolean;
  accentBar?: "primary" | "secondary" | "enviada" | "aberta" | "parcial" | "nao_enviada" | "fechada" | null;
  children?: ReactNode;
}

const toneMap: Record<Tone, string> = {
  default: "bg-surface",
  soft: "bg-gradient-card-soft",
  brand: "bg-gradient-brand text-primary-foreground",
  muted: "bg-surface-sunken",
};

const elevMap: Record<Elevation, string> = {
  flat: "",
  soft: "shadow-soft",
  card: "shadow-card",
  pop: "shadow-pop",
};

const accentMap: Record<NonNullable<SurfaceCardProps["accentBar"]>, string> = {
  primary: "border-l-primary",
  secondary: "border-l-secondary",
  enviada: "border-l-status-enviada",
  aberta: "border-l-status-aberta",
  parcial: "border-l-status-parcial",
  nao_enviada: "border-l-status-nao-enviada",
  fechada: "border-l-status-fechada",
};

const SurfaceCard = forwardRef<HTMLDivElement, SurfaceCardProps>(
  ({ tone = "default", elevation = "soft", interactive, accentBar, className, children, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border border-border/70",
          toneMap[tone],
          elevMap[elevation],
          accentBar && `border-l-4 ${accentMap[accentBar]}`,
          interactive && "hover-lift cursor-pointer focus:outline-none",
          "transition-colors duration-200 ease-out",
          className,
        )}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
SurfaceCard.displayName = "SurfaceCard";

export default SurfaceCard;
