import { useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { ReviewTable } from "@/components/tender/review/review-table";
import { useScorecard } from "@/hooks/use-api";

const ReviewPage = () => {
  const navigate = useNavigate();
  const { id = "new-tender" } = useParams();
  const tenderId = parseInt(id, 10);
  const validTenderId = isNaN(tenderId) ? null : tenderId;

  const { data: scorecard, loading, error, refresh } = useScorecard(validTenderId);

  const reviewItems = useMemo(() => {
    if (!scorecard) return [];

    const items: Array<{
      verdictId: number;
      criteria: string;
      bidder: string;
      evidence: string;
      confidence: number;
      decision: "PASS" | "FAIL" | "REVIEW";
    }> = [];

    for (const bidder of scorecard.bidders) {
      for (const verdict of bidder.verdicts) {
        if (verdict.confidence < 0.8 || verdict.status === "review_needed") {
          const criterion = scorecard.criteria.find(
            (c) => c.id === verdict.criterion_id
          );
          if (!criterion) continue;

          items.push({
            verdictId: verdict.id,
            criteria: criterion.text,
            bidder: bidder.vendor_name,
            evidence: verdict.reasoning || "No evidence",
            confidence: Math.round((verdict.confidence || 0) * 100),
            decision:
              verdict.status === "pass"
                ? "PASS"
                : verdict.status === "fail"
                  ? "FAIL"
                  : "REVIEW",
          });
        }
      }
    }

    return items;
  }, [scorecard]);

  if (loading) {
    return (
      <DashboardLayout
        title="Review Low Confidence Cases"
        eyebrow="Human validation"
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout
        title="Review Low Confidence Cases"
        eyebrow="Human validation"
      >
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">
          {error}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Review Low Confidence Cases"
      eyebrow="Human validation"
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-sm text-slate-500">
            Confirm low confidence or disputed AI decisions before issuing the
            final tender evaluation.
          </p>
          <Button
            className="h-10 rounded-xl bg-blue-600 px-5 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
            onClick={() => navigate(`/tender/${id}/final`)}
          >
            <Send className="size-4" />
            Submit
          </Button>
        </div>
        <ReviewTable reviewItems={reviewItems} onReviewComplete={refresh} />
      </div>
    </DashboardLayout>
  );
};

export default ReviewPage;
