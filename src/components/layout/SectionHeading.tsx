import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  level?: 2 | 3;
}

const SectionHeading = ({
  eyebrow,
  title,
  description,
  actions,
  className,
  level = 2,
}: SectionHeadingProps) => {
  const Heading: "h2" | "h3" = level === 2 ? "h2" : "h3";
  return (
    <div className={cn("mb-4 flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-500">
            {eyebrow}
          </p>
        )}
        <Heading className="font-display text-display-sm text-primary">{title}</Heading>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
};

export default SectionHeading;
