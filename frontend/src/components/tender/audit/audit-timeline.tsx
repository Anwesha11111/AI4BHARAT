import { BadgeCheck, FileSearch, ListChecks, UserCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AuditItem = {
  action: string;
  details: string;
  id: string;
  timestamp: string;
  tone: "blue" | "emerald" | "amber" | "slate";
};

const auditItems: AuditItem[] = [
  {
    id: "criteria-extracted",
    timestamp: "May 05, 2026 10:12 PM",
    action: "Criteria extracted",
    details:
      "Eligibility and technical criteria were extracted from the tender document.",
    tone: "blue",
  },
  {
    id: "evidence-matched",
    timestamp: "May 05, 2026 10:18 PM",
    action: "Evidence matched",
    details:
      "Bidder documents were matched against extracted criteria with source evidence.",
    tone: "emerald",
  },
  {
    id: "decision-made",
    timestamp: "May 05, 2026 10:22 PM",
    action: "Decision made",
    details:
      "Initial pass, fail, and review decisions were generated for each bidder.",
    tone: "slate",
  },
  {
    id: "human-override",
    timestamp: "May 05, 2026 10:31 PM",
    action: "Human override",
    details:
      "Reviewer updated low-confidence decisions before final evaluation submission.",
    tone: "amber",
  },
];

const toneClasses: Record<AuditItem["tone"], string> = {
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
};

const icons = [ListChecks, FileSearch, BadgeCheck, UserCheck];

export const AuditTimeline = () => {
  return (
    <div className="relative space-y-4">
      <div className="absolute bottom-6 left-5 top-6 hidden w-px bg-slate-200 sm:block" />
      {auditItems.map((item, index) => {
        const Icon = icons[index];

        return (
          <Card
            key={item.id}
            className="relative rounded-2xl border-slate-200 bg-white shadow-sm shadow-slate-900/5 sm:ml-14"
          >
            <div className="absolute -left-14 top-5 hidden size-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-blue-600 shadow-sm sm:flex">
              <Icon className="size-5" />
            </div>
            <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-lg text-slate-950">
                  {item.action}
                </CardTitle>
                <CardDescription>{item.timestamp}</CardDescription>
              </div>
              <Badge variant="outline" className={toneClasses[item.tone]}>
                {item.action}
              </Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-slate-600">{item.details}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
