import { Download } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/status-badge";
import { evaluationRows, finalSummaries } from "@/data/results";

export const FinalSummary = () => {
  const qualifiedCount = finalSummaries.filter(
    (summary) => summary.status === "Qualified",
  ).length;
  const disqualifiedCount = finalSummaries.length - qualifiedCount;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm shadow-slate-900/5">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">
              Qualified bidders
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <span className="text-3xl font-semibold text-slate-950">
              {qualifiedCount}
            </span>
            <Badge className="rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
              Qualified
            </Badge>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm shadow-slate-900/5">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">
              Disqualified bidders
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <span className="text-3xl font-semibold text-slate-950">
              {disqualifiedCount}
            </span>
            <Badge className="rounded-full bg-red-50 text-red-700 ring-1 ring-red-200">
              Disqualified
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm shadow-slate-900/5">
        <CardHeader className="flex-row items-center justify-between gap-4 border-b border-slate-100">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-950">
              Detailed breakdown
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Criteria-level outcome by bidder.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl border-slate-200 bg-white"
          >
            <Download className="size-4" />
            Download report
          </Button>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {finalSummaries.map((summary) => {
              const bidderEvidence = evaluationRows
                .flatMap((row) => [row.bidderA, row.bidderB])
                .filter((item) => item.bidder === summary.bidder);

              return (
                <AccordionItem key={summary.bidder} value={summary.bidder}>
                  <AccordionTrigger>
                    <span className="flex flex-wrap items-center gap-3">
                      <span>{summary.bidder}</span>
                      <StatusBadge status={summary.status} />
                      <span className="text-xs font-normal text-slate-500">
                        {summary.criteriaPassed} of {summary.criteriaTotal}{" "}
                        passed
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      <p className="leading-6">{summary.note}</p>
                      <div className="grid gap-2">
                        {bidderEvidence.map((item) => (
                          <div
                            key={`${item.criteria}-${item.bidder}`}
                            className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="font-medium text-slate-950">
                                {item.criteria}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                Page {item.pageNumber} - {item.confidence}%
                                confidence
                              </p>
                            </div>
                            <StatusBadge status={item.decision} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
};
