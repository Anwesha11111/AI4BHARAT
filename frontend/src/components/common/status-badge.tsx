import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EvaluationDecision } from "@/data/results";
import type { TenderStatus } from "@/data/tenders";

type StatusValue =
  | EvaluationDecision
  | TenderStatus
  | "Disqualified"
  | "Qualified";

type StatusBadgeProps = {
  status: StatusValue;
};

const statusClassName: Record<StatusValue, string> = {
  Completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Disqualified: "bg-red-50 text-red-700 ring-1 ring-red-200",
  FAIL: "bg-red-50 text-red-700 ring-1 ring-red-200",
  PASS: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  Processing: "border-blue-200 bg-blue-50 text-blue-700",
  Qualified: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  REVIEW: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  Review: "border-amber-200 bg-amber-50 text-amber-700",
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  return (
    <Badge
      variant="outline"
      className={cn("h-6 rounded-full px-2.5", statusClassName[status])}
    >
      {status}
    </Badge>
  );
};
