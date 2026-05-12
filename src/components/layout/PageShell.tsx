import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Width = "sm" | "md" | "lg" | "xl" | "full";

const widthMap: Record<Width, string> = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
  full: "max-w-none",
};

interface PageShellProps {
  children: ReactNode;
  width?: Width;
  className?: string;
  bare?: boolean;
}

const PageShell = ({ children, width = "lg", className, bare = false }: PageShellProps) => {
  return (
    <div className={cn("min-h-dvh bg-gradient-canvas", className)}>
      {bare ? (
        children
      ) : (
        <main className={cn("mx-auto w-full px-5 md:px-8 py-8 md:py-10", widthMap[width])}>
          {children}
        </main>
      )}
    </div>
  );
};

export default PageShell;
