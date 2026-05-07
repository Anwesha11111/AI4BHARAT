import { useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowRight, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { ResultsTable } from "@/components/tender/results/results-table";

import { useScorecard } from "@/hooks/use-api";
import type { EvidenceItem } from "@/data/results";

const ResultsPage = () => {
  const navigate = useNavigate();
  const { id = "new-tender" } = useParams();
  const tenderId = parseInt(id, 10);
  const validTenderId = isNaN(tenderId) ? null : tenderId;

  const { data: scorecard, loading, error } = useScorecard(validTenderId);

  const { tenderName, evidenceItems, reviewNeededCount } = useMemo(() => {
    if (!scorecard) {
      return { tenderName: "Loading...", evidenceItems: [], reviewNeededCount: 0 };
    }

    const items: EvidenceItem[] = [];
    let reviewCount = 0;

    for (const bidder of scorecard.bidders) {
      for (const verdict of bidder.verdicts) {
        const criterion = scorecard.criteria.find(
          (c) => c.id === verdict.criterion_id
        );
        if (!criterion) continue;

        const decision =
          verdict.status === "pass"
            ? "PASS"
            : verdict.status === "fail"
              ? "FAIL"
              : "REVIEW";

        if (decision === "REVIEW") reviewCount++;

        items.push({
          bidder: bidder.vendor_name,
          confidence: Math.round((verdict.confidence || 0) * 100),
          criteria: criterion.text,
          decision,
          evidence: verdict.reasoning || "No evidence provided",
          pageNumber: verdict.evidence_citation?.page || 1,
        });
      }
    }

    return {
      tenderName: `Tender #${scorecard.tender_id}`,
      evidenceItems: items,
      reviewNeededCount: reviewCount,
    };
  }, [scorecard]);

  if (loading) {
    return (
      <DashboardLayout title="Evaluation Results" eyebrow="TenderMind analysis">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Evaluation Results" eyebrow="TenderMind analysis">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">
          {error}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Evaluation Results" eyebrow="TenderMind analysis">
      <div className="space-y-5">
        <div className="sticky top-0 z-20 -mx-1 flex flex-col gap-3 border-b border-slate-200 bg-white/95 px-1 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Tender
            </p>
            <h2 className="text-lg font-semibold text-slate-950">
              {tenderName}
            </h2>
          </div>
          <Badge className="h-8 rounded-full bg-amber-50 px-3 text-amber-700 ring-1 ring-amber-200">
            {reviewNeededCount} Review Needed
          </Badge>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-sm text-slate-500">
            Review criteria-level AI decisions and inspect supporting evidence
            before final validation.
          </p>
          <Button
            className="h-10 rounded-xl bg-blue-600 px-5 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
            onClick={() => navigate(`/tender/${id}/review`)}
          >
            Review
            <ArrowRight className="size-4" />
          </Button>
        </div>
        <ResultsTable evidenceItems={evidenceItems} />
      </div>
    </DashboardLayout>
  );
};

export default ResultsPage;
