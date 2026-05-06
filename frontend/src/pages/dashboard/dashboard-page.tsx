import { Link } from "react-router";
import { CheckCircle2, Clock3, FileText, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { StatsCard } from "@/components/dashboard/stats-card";
import { TenderTable } from "@/components/dashboard/tender-table";

import { tenders } from "@/data/tenders";

const stats = [
  {
    title: "Total Tenders",
    value: tenders.length,
    description: "All evaluations created in TenderMind.",
    icon: FileText,
  },
  {
    title: "In Progress",
    value: tenders.filter((tender) => tender.status === "Processing").length,
    description: "Evaluations currently being processed.",
    icon: Clock3,
  },
  {
    title: "Completed",
    value: tenders.filter((tender) => tender.status === "Completed").length,
    description: "Evaluations with finalized results.",
    icon: CheckCircle2,
  },
];

const DashboardPage = () => {
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
    </DashboardLayout>
  );
};

export default DashboardPage;
