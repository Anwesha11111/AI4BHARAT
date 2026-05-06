import { useNavigate, useParams } from "react-router";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

import { ReviewTable } from "@/components/tender/review/review-table";

const ReviewPage = () => {
  const navigate = useNavigate();
  const { id = "new-tender" } = useParams();

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
        <ReviewTable />
      </div>
    </DashboardLayout>
  );
};

export default ReviewPage;
