import { useNavigate, useParams } from "react-router";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { ResultsTable } from "@/components/tender/results/results-table";

import { useTenderStore } from "@/hooks/use-tender-store";

const ResultsPage = () => {
  const navigate = useNavigate();
  const { id = "new-tender" } = useParams();
  const { currentTender, results } = useTenderStore();
  const reviewNeededCount = results
    .flatMap((row) => [row.bidderA, row.bidderB])
    .filter((item) => item.decision === "REVIEW").length;

  return (
    <DashboardLayout title="Evaluation Results" eyebrow="TenderMind analysis">
      <div className="space-y-5">
        <div className="sticky top-0 z-20 -mx-1 flex flex-col gap-3 border-b border-slate-200 bg-white/95 px-1 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Tender
            </p>
            <h2 className="text-lg font-semibold text-slate-950">
              {currentTender.name}
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
        <ResultsTable />
      </div>
    </DashboardLayout>
  );
};

export default ResultsPage;
