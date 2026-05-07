import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

import { BidderForm } from "@/components/tender/bidders/bidder-form";

const UploadBiddersPage = () => {
  return (
    <DashboardLayout title="Upload Bidder Submissions" eyebrow="Bidder setup">
      <BidderForm />
    </DashboardLayout>
  );
};

export default UploadBiddersPage;
