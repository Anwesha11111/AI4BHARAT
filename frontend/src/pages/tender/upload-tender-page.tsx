import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

import { UploadForm } from "@/components/tender/upload/upload-form";

const UploadTenderPage = () => {
  return (
    <DashboardLayout title="Create New Tender" eyebrow="Tender setup">
      <UploadForm />
    </DashboardLayout>
  );
};

export default UploadTenderPage;
