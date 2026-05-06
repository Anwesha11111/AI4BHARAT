import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

import { StepLoader } from "@/components/tender/processing/step-loader";

const ProcessingPage = () => {
  const navigate = useNavigate();
  const { id = "new-tender" } = useParams();
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setProgress((current) => Math.min(current + 7, 100));
    }, 350);

    const redirectId = window.setTimeout(() => {
      navigate(`/tender/${id}/results`, { replace: true });
    }, 5200);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(redirectId);
    };
  }, [navigate, id]);

  const currentStep = useMemo(() => {
    if (progress < 38) {
      return 0;
    }

    if (progress < 72) {
      return 1;
    }

    return 2;
  }, [progress]);

  return (
    <DashboardLayout title="Processing" eyebrow="Tender evaluation">
      <StepLoader currentStep={currentStep} progress={progress} />
    </DashboardLayout>
  );
};

export default ProcessingPage;
