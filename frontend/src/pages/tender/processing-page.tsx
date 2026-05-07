import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { StepLoader } from "@/components/tender/processing/step-loader";
import { useTenderStatusStream, useTenderStatus } from "@/hooks/use-api";

const ProcessingPage = () => {
  const navigate = useNavigate();
  const { id = "new-tender" } = useParams();
  const tenderId = parseInt(id, 10);
  const validTenderId = isNaN(tenderId) ? null : tenderId;

  const { status: streamStatus, connected } = useTenderStatusStream(validTenderId);
  const { data: pollStatus, refresh } = useTenderStatus(validTenderId);

  const [progress, setProgress] = useState(10);

  const status = streamStatus || pollStatus;

  useEffect(() => {
    if (!connected && validTenderId) {
      const interval = setInterval(refresh, 3000);
      return () => clearInterval(interval);
    }
  }, [connected, validTenderId, refresh]);

  const currentStep = useMemo(() => {
    if (!status) return 0;

    const tenderStatus = status.status || status.tender_status;
    const bidders = status.bidders || [];

    if (tenderStatus === "uploaded") {
      return 0;
    }
    if (tenderStatus === "processing") {
      return 1;
    }
    if (tenderStatus === "completed" || tenderStatus === "failed") {
      const allBiddersDone = bidders.every(
        (b: { status: string }) =>
          b.status === "completed" || b.status === "failed"
      );
      if (allBiddersDone || bidders.length === 0) {
        return 3;
      }
      return 2;
    }
    return 0;
  }, [status]);

  useEffect(() => {
    const targetProgress = Math.min((currentStep + 1) * 33, 100);
    setProgress(targetProgress);
  }, [currentStep]);

  useEffect(() => {
    if (currentStep >= 3) {
      const timeout = setTimeout(() => {
        navigate(`/tender/${id}/results`, { replace: true });
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [currentStep, navigate, id]);

  const displayProgress = useMemo(() => {
    if (currentStep >= 3) return 100;
    return progress;
  }, [currentStep, progress]);

  return (
    <DashboardLayout title="Processing" eyebrow="Tender evaluation">
      <StepLoader currentStep={Math.min(currentStep, 2)} progress={displayProgress} />
    </DashboardLayout>
  );
};

export default ProcessingPage;
