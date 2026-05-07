import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

import { FinalSummary } from "@/components/tender/final/final-summary";

const FinalPage = () => {
  return (
    <DashboardLayout title="Final Evaluation" eyebrow="Scorecard">
      <div className="space-y-5">
        <div>
          <p className="max-w-2xl text-sm text-slate-500">
            Final bidder qualification status after AI evaluation and human
            review.
          </p>
        </div>
        <FinalSummary />
      </div>
    </DashboardLayout>
  );
};

export default FinalPage;
