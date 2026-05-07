import { useState } from "react";
import { Check, CheckCheck, Loader2, X } from "lucide-react";

import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { evaluationRows, type EvaluationDecision } from "@/data/results";
import { useReviewVerdict } from "@/hooks/use-api";

type ReviewItem = {
  verdictId: number;
  criteria: string;
  bidder: string;
  evidence: string;
  confidence: number;
  decision: EvaluationDecision;
};

type ReviewTableProps = {
  reviewItems?: ReviewItem[];
  onReviewComplete?: () => void;
};

const lowConfidenceThreshold = 85;

const staticLowConfidenceItems = evaluationRows
  .flatMap((row) => [row.bidderA, row.bidderB])
  .filter((item) => item.confidence < lowConfidenceThreshold)
  .map((item, index) => ({
    ...item,
    verdictId: index,
    id: `${item.criteria}-${item.bidder}`,
  }));

export const ReviewTable = ({ reviewItems, onReviewComplete }: ReviewTableProps) => {
  const { review, submitting } = useReviewVerdict();

  const items = reviewItems?.map((item) => ({
    ...item,
    id: `verdict-${item.verdictId}`,
  })) || staticLowConfidenceItems;

  const [decisions, setDecisions] = useState<
    Record<string, EvaluationDecision>
  >(() =>
    items.reduce<Record<string, EvaluationDecision>>(
      (current, item) => {
        current[item.id] = item.decision;
        return current;
      },
      {},
    ),
  );

  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());

  const updateDecision = async (
    itemId: string,
    decision: EvaluationDecision,
    verdictId?: number
  ) => {
    setDecisions((current) => ({ ...current, [itemId]: decision }));

    if (verdictId !== undefined && reviewItems) {
      try {
        const status =
          decision === "PASS"
            ? "pass"
            : decision === "FAIL"
              ? "fail"
              : "review_needed";
        await review(verdictId, status, `Human review: ${decision}`, "reviewer");
        setSubmittedIds((prev) => new Set(prev).add(itemId));
        onReviewComplete?.();
      } catch (error) {
        console.error("Failed to submit review:", error);
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <BadgeSummary count={items.length} />
        <Button
          type="button"
          className="h-9 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
          disabled={submitting}
          onClick={() =>
            setDecisions(
              items.reduce<Record<string, EvaluationDecision>>(
                (current, item) => {
                  current[item.id] = "PASS";
                  return current;
                },
                {},
              ),
            )
          }
        >
          <CheckCheck className="size-4" />
          Approve all
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="px-4 py-3 text-slate-600">
                Criteria
              </TableHead>
              <TableHead className="px-4 py-3 text-slate-600">Bidder</TableHead>
              <TableHead className="px-4 py-3 text-slate-600">
                Evidence snippet
              </TableHead>
              <TableHead className="px-4 py-3 text-slate-600">Status</TableHead>
              <TableHead className="px-4 py-3 text-right text-slate-600">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-slate-500">
                  No low-confidence cases to review
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const decision = decisions[item.id];
                const isSubmitted = submittedIds.has(item.id);

                return (
                  <TableRow
                    key={item.id}
                    className={cn(
                      "hover:bg-blue-50/50",
                      isSubmitted && "bg-emerald-50/50"
                    )}
                  >
                    <TableCell className="min-w-56 px-4 py-4 font-medium text-slate-950">
                      {item.criteria}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-slate-600">
                      {item.bidder}
                    </TableCell>
                    <TableCell className="max-w-lg px-4 py-4 text-sm leading-6 text-slate-600">
                      {item.evidence}
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={decision} />
                        <span className="text-xs text-slate-500">
                          {item.confidence}%
                        </span>
                        {isSubmitted && (
                          <span className="text-xs text-emerald-600">Saved</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant={decision === "PASS" ? "default" : "outline"}
                          className={cn(
                            "h-9 rounded-xl",
                            decision === "PASS" &&
                              "bg-emerald-600 text-white hover:bg-emerald-700",
                          )}
                          disabled={submitting}
                          onClick={() =>
                            updateDecision(item.id, "PASS", item.verdictId)
                          }
                        >
                          {submitting ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Check className="size-4" />
                          )}
                          Approve
                        </Button>
                        <Button
                          type="button"
                          variant={
                            decision === "FAIL" ? "destructive" : "outline"
                          }
                          className="h-9 rounded-xl"
                          disabled={submitting}
                          onClick={() =>
                            updateDecision(item.id, "FAIL", item.verdictId)
                          }
                        >
                          {submitting ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <X className="size-4" />
                          )}
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

const BadgeSummary = ({ count }: { count: number }) => (
  <div className="flex items-center gap-2">
    <StatusBadge status="REVIEW" />
    <span className="text-sm text-slate-500">
      {count} low-confidence cases below {lowConfidenceThreshold}%
    </span>
  </div>
);
