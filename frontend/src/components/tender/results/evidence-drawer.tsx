import { FileText } from "lucide-react";

import { StatusBadge } from "@/components/common/status-badge";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { EvidenceItem, EvaluationDecision } from "@/data/results";

type EvidenceDrawerProps = {
  evidence: EvidenceItem | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export const DecisionBadge = ({
  decision,
}: {
  decision: EvaluationDecision;
}) => {
  return <StatusBadge status={decision} />;
};

export const EvidenceDrawer = ({
  evidence,
  onOpenChange,
  open,
}: EvidenceDrawerProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full p-0 sm:max-w-md">
        <SheetHeader className="border-b border-slate-100 p-6">
          <SheetTitle className="text-lg">Evidence Details</SheetTitle>
          <SheetDescription>
            Source context used for the selected AI decision.
          </SheetDescription>
        </SheetHeader>

        {evidence ? (
          <div className="space-y-6 p-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Criteria
              </p>
              <p className="mt-2 text-base font-semibold text-slate-950">
                {evidence.criteria}
              </p>
            </div>

            <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-500">Bidder</span>
                <span className="font-medium text-slate-950">
                  {evidence.bidder}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-500">Decision</span>
                <DecisionBadge decision={evidence.decision} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-500">Confidence</span>
                <span className="font-medium text-slate-950">
                  {evidence.confidence}%
                </span>
              </div>
              <Progress value={evidence.confidence} />
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-500">Page number</span>
                <span className="font-medium text-slate-950">
                  Page {evidence.pageNumber}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <FileText className="size-4 text-blue-600" />
                Evidence snippet
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                <mark className="rounded bg-yellow-100 px-1 py-0.5 text-slate-900">
                  {evidence.evidence}
                </mark>
              </p>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
};
