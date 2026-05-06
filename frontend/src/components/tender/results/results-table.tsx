import { useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DecisionBadge,
  EvidenceDrawer,
} from "@/components/tender/results/evidence-drawer";
import { evaluationRows, type EvidenceItem } from "@/data/results";
import { cn } from "@/lib/utils";

type ResultsFilter = "ALL" | "REVIEW" | "FAIL";

export const ResultsTable = () => {
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(
    null,
  );
  const [filter, setFilter] = useState<ResultsFilter>("ALL");

  const openEvidence = (evidence: EvidenceItem) => {
    setSelectedEvidence(evidence);
  };

  const filteredRows = evaluationRows
    .map((row) => {
      const bidders = [row.bidderA, row.bidderB].filter((item) =>
        filter === "ALL" ? true : item.decision === filter,
      );

      return { criteria: row.criteria, bidders };
    })
    .filter((row) => row.bidders.length > 0);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {(["ALL", "REVIEW", "FAIL"] as ResultsFilter[]).map((item) => (
          <Button
            key={item}
            type="button"
            variant={filter === item ? "default" : "outline"}
            className={cn(
              "h-9 rounded-full px-4",
              filter === item && "bg-slate-950 text-white hover:bg-slate-800",
            )}
            onClick={() => setFilter(item)}
          >
            {item === "ALL" ? "All results" : `Show only ${item}`}
          </Button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="px-4 py-3 text-slate-600">
                Criteria
              </TableHead>
              <TableHead className="px-4 py-3 text-slate-600">Bidder</TableHead>
              <TableHead className="px-4 py-3 text-slate-600">Result</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.map((row) =>
              row.bidders.map((evidence) => (
                <TableRow
                  key={`${row.criteria}-${evidence.bidder}`}
                  className="transition-colors hover:bg-blue-50/50"
                >
                  <TableCell className="min-w-64 px-4 py-4 font-medium text-slate-950">
                    {row.criteria}
                  </TableCell>
                  <TableCell className="px-4 py-4 text-slate-600">
                    {evidence.bidder}
                  </TableCell>
                  <TableCell className="px-4 py-4">
                    <EvidenceButton evidence={evidence} onOpen={openEvidence} />
                  </TableCell>
                </TableRow>
              )),
            )}
          </TableBody>
        </Table>
      </div>

      <EvidenceDrawer
        evidence={selectedEvidence}
        open={Boolean(selectedEvidence)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEvidence(null);
          }
        }}
      />
    </>
  );
};

const EvidenceButton = ({
  evidence,
  onOpen,
}: {
  evidence: EvidenceItem;
  onOpen: (evidence: EvidenceItem) => void;
}) => {
  const tooltipText =
    evidence.decision === "PASS"
      ? "Meets the criterion based on extracted evidence."
      : evidence.decision === "FAIL"
        ? "Does not meet the criterion based on extracted evidence."
        : "Needs human review before final decision.";

  return (
    <Button
      type="button"
      variant="ghost"
      className="h-9 justify-start gap-3 rounded-xl px-2 hover:bg-slate-100"
      onClick={() => onOpen(evidence)}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <DecisionBadge decision={evidence.decision} />
            </span>
          </TooltipTrigger>
          <TooltipContent>{tooltipText}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <span className="text-sm text-slate-500">{evidence.confidence}%</span>
      <Search className="size-4 text-slate-400" />
    </Button>
  );
};
