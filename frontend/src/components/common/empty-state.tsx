import type { ComponentType } from "react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  actionLabel?: string;
  className?: string;
  description?: string;
  icon: ComponentType<{ className?: string }>;
  message: string;
  onAction?: () => void;
};

export const EmptyState = ({
  actionLabel,
  className,
  description,
  icon: Icon,
  message,
  onAction,
}: EmptyStateProps) => {
  const showAction = Boolean(actionLabel && onAction);

  return (
    <Empty
      className={cn(
        "min-h-56 rounded-2xl border border-dashed border-slate-300 bg-slate-50",
        className,
      )}
    >
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className="size-11 rounded-2xl bg-white text-blue-600 shadow-sm"
        >
          <Icon className="size-5" />
        </EmptyMedia>
        <EmptyTitle className="text-base text-slate-950">{message}</EmptyTitle>
        {description ? (
          <EmptyDescription className="max-w-md text-slate-500">
            {description}
          </EmptyDescription>
        ) : null}
      </EmptyHeader>
      {showAction ? (
        <EmptyContent>
          <Button
            type="button"
            onClick={onAction}
            className="h-10 rounded-xl bg-blue-600 px-4 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
          >
            {actionLabel}
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  );
};
