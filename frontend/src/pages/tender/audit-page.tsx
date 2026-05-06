import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

import { AuditTimeline } from "@/components/tender/audit/audit-timeline";

const AuditPage = () => {
  return (
    <DashboardLayout title="Audit Log" eyebrow="Evaluation history">
      <AuditTimeline />
    </DashboardLayout>
  );
};

export default AuditPage;
