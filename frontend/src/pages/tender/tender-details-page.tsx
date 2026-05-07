import { useEffect } from "react";
import { Navigate, useParams } from "react-router";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

import { TenderSummary } from "@/components/tender/details/tender-summary";

import { bidders } from "@/data/bidders";
import { tenders } from "@/data/tenders";

import { useTenderStore } from "@/hooks/use-tender-store";

const TenderDetailsPage = () => {
  const { id = "" } = useParams();
  const { setCurrentTenderById } = useTenderStore();
  const tender = tenders.find((item) => item.id === id);

  useEffect(() => {
    if (tender) {
      setCurrentTenderById(tender.id);
    }
  }, [setCurrentTenderById, tender]);

  if (!tender) {
    return <Navigate to="/dashboard" replace />;
  }

  const tenderBidders = bidders.filter(
    (bidder) => bidder.tenderId === tender.id,
  );

  return (
    <DashboardLayout title="Tender Details" eyebrow="Tender overview">
      <TenderSummary bidders={tenderBidders} tender={tender} />
    </DashboardLayout>
  );
};

export default TenderDetailsPage;
