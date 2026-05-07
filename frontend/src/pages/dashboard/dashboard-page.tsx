import { useMemo } from "react";
import { Link } from "react-router";
import { CheckCircle2, Clock3, FileText, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { StatsCard } from "@/components/dashboard/stats-card";
import { TenderTable } from "@/components/dashboard/tender-table";

import { useTenders } from "@/hooks/use-api";
import type { Tender } from "@/data/tenders";

const DashboardPage = () => {
  const { data: apiTenders, loading, error } = useTenders();

  const tenders: Tender[] = useMemo(() => {
    if (!apiTenders) return [];
    return apiTenders.map((t) => ({
      id: t.id.toString(),
      name: t.title,
      department: "",
      createdDate: t.created_at
        ? new Date(t.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
          })
        : "",
      status:
        t.status === "completed"
          ? "Completed"
          : t.status === "processing"
            ? "Processing"
            : "Review",
    }));
  }, [apiTenders]);

  const stats = useMemo(
    () => [
      {
        title: "Total Tenders",
        value: tenders.length,
        description: "All evaluations created in TenderMind.",
        icon: FileText,
      },
      {
        title: "In Progress",
        value: tenders.filter((tender) => tender.status === "Processing")
          .length,
        description: "Evaluations currently being processed.",
        icon: Clock3,
      },
      {
        title: "Completed",
        value: tenders.filter((tender) => tender.status === "Completed").length,
        description: "Evaluations with finalized results.",
        icon: CheckCircle2,
      },
    ],
    [tenders]
  );

  return (
    <DashboardLayout
      title="Dashboard"
      action={
        <Button
          asChild
          className="h-10 rounded-xl bg-blue-600 px-4 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
        >
          <Link to="/tender/new">
            <Plus className="size-4" />
            New Evaluation
          </Link>
        </Button>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-blue-600" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">
          {error}
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            {stats.map((stat) => (
              <StatsCard
                key={stat.title}
                title={stat.title}
                value={stat.value}
                description={stat.description}
                icon={stat.icon}
              />
            ))}
          </section>

          <TenderTable tenders={tenders} />
        </>
      )}
    </DashboardLayout>
  );
};

export default DashboardPage;
