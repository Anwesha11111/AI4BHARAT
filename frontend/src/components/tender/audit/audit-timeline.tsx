import { useMemo } from "react";
import {
  BadgeCheck,
  FileSearch,
  ListChecks,
  Upload,
  UserCheck,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ApiAuditLog } from "@/lib/api";

type AuditItem = {
  action: string;
  details: string;
  id: string;
  timestamp: string;
  tone: "blue" | "emerald" | "amber" | "slate";
  icon: LucideIcon;
};

type AuditTimelineProps = {
  auditLogs?: ApiAuditLog[];
};

const toneClasses: Record<AuditItem["tone"], string> = {
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
};

const getActionDisplay = (
  action: string
): { label: string; tone: AuditItem["tone"]; icon: LucideIcon } => {
  switch (action) {
    case "tender_uploaded":
      return { label: "Tender Uploaded", tone: "blue", icon: Upload };
    case "bidder_uploaded":
      return { label: "Bidder Uploaded", tone: "blue", icon: Upload };
    case "processing_started":
      return { label: "Processing Started", tone: "slate", icon: FileSearch };
    case "ai_completed":
      return { label: "AI Processing Complete", tone: "emerald", icon: BadgeCheck };
    case "processing_failed":
      return { label: "Processing Failed", tone: "amber", icon: ListChecks };
    case "human_review":
      return { label: "Human Review", tone: "amber", icon: UserCheck };
    default:
      return { label: action.replace(/_/g, " "), tone: "slate", icon: ListChecks };
  }
};

const formatTimestamp = (timestamp: string | null): string => {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const AuditTimeline = ({ auditLogs = [] }: AuditTimelineProps) => {
  const auditItems = useMemo<AuditItem[]>(() => {
    if (auditLogs.length === 0) {
      return [
        {
          id: "no-logs",
          timestamp: "",
          action: "No audit events",
          details: "No audit events have been recorded for this tender yet.",
          tone: "slate",
          icon: ListChecks,
        },
      ];
    }

    return auditLogs.map((log) => {
      const { label, tone, icon } = getActionDisplay(log.action);
      let details = log.reason || "";

      if (log.new_value && typeof log.new_value === "object") {
        const newVal = log.new_value as Record<string, unknown>;
        if (newVal.criteria_count !== undefined) {
          details = `Extracted ${newVal.criteria_count} criteria from ${newVal.chunks || 0} chunks`;
        } else if (newVal.verdicts !== undefined) {
          details = `Generated ${newVal.verdicts} verdicts`;
        } else if (newVal.file_count !== undefined) {
          details = `Uploaded ${newVal.file_count} file(s)`;
        } else if (newVal.status !== undefined) {
          details = `Status changed to ${newVal.status}`;
        }
      }

      return {
        id: log.id.toString(),
        timestamp: formatTimestamp(log.timestamp),
        action: label,
        details: details || `${log.entity_type} ${log.action}`,
        tone,
        icon,
      };
    });
  }, [auditLogs]);
  return (
    <div className="relative space-y-4">
      <div className="absolute bottom-6 left-5 top-6 hidden w-px bg-slate-200 sm:block" />
      {auditItems.map((item) => {
        const Icon = item.icon;

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
