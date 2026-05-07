import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PageCardProps = {
  children: ReactNode;
  className?: string;
};

export const PageCard = ({ children, className }: PageCardProps) => {
  return (
    <Card
      className={cn(
        "rounded-2xl border-slate-200 bg-white shadow-sm shadow-slate-900/5",
        className,
      )}
    >
      {children}
    </Card>
  );
};
