import { useParams } from "react-router";
import { Loader2 } from "lucide-react";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { AuditTimeline } from "@/components/tender/audit/audit-timeline";
import { useAuditLog } from "@/hooks/use-api";

const AuditPage = () => {
  const { id = "new-tender" } = useParams();
  const tenderId = parseInt(id, 10);
  const validTenderId = isNaN(tenderId) ? null : tenderId;

  const { data: auditLogs, loading, error } = useAuditLog(validTenderId);

  return (
    <DashboardLayout title="Audit Log" eyebrow="Evaluation history">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-blue-600" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">
          {error}
        </div>
      ) : (
        <AuditTimeline auditLogs={auditLogs || []} />
      )}
    </DashboardLayout>
  );
};

export default AuditPage;
