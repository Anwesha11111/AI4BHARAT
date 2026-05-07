import { Link } from "react-router";
import { FileText, Play, Users } from "lucide-react";

import { StatusBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Bidder } from "@/data/bidders";
import type { Tender } from "@/data/tenders";

type TenderSummaryProps = {
  bidders: Bidder[];
  tender: Tender;
};

export const TenderSummary = ({ bidders, tender }: TenderSummaryProps) => {
  const hasResults =
    tender.status === "Completed" || tender.status === "Review";

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-normal text-slate-950">
              {tender.name}
            </h2>
            <StatusBadge status={tender.status} />
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {tender.department} · Created {tender.createdDate}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            asChild
            className="h-10 rounded-xl bg-blue-600 px-4 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
          >
            <Link to={`/tender/${tender.id}/criteria`}>
              <Play className="size-4" />
              Start Evaluation
            </Link>
          </Button>

          {hasResults && (
            <Button
              asChild
              variant="outline"
              className="h-10 rounded-xl border-slate-200 bg-white"
            >
              <Link to={`/tender/${tender.id}/results`}>View Results</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm shadow-slate-900/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="size-4 text-blue-600" />
              Uploaded Tender File
            </CardTitle>
            <CardDescription>
              Source document used for criteria extraction.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-medium text-slate-950">
                {tender.id}-tender-document.pdf
              </p>
              <p className="mt-1 text-sm text-slate-500">
                PDF · Uploaded for evaluation
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm shadow-slate-900/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="size-4 text-blue-600" />
              List of Bidders
            </CardTitle>
            <CardDescription>
              Submitted bidders linked to this tender.
            </CardDescription>
            <CardAction>
              <Badge variant="outline" className="border-slate-200 bg-slate-50">
                {bidders.length}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            {bidders.length > 0 ? (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {bidders.map((bidder) => (
                  <div
                    key={bidder.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <span className="font-medium text-slate-950">
                      {bidder.name}
                    </span>
                    <Badge
                      variant="outline"
                      className="border-blue-200 bg-blue-50 text-blue-700"
                    >
                      Uploaded
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <p className="font-medium text-slate-950">
                  No bidders uploaded
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Add bidder submissions before running an evaluation.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
