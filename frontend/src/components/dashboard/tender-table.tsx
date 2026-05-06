import { Link } from "react-router";

import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Tender } from "@/data/tenders";

type TenderTableProps = {
  tenders: Tender[];
};

export const TenderTable = ({ tenders }: TenderTableProps) => {
  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm shadow-slate-900/5">
      <CardHeader className="border-b border-slate-100 pb-4">
        <CardTitle className="text-xl font-semibold tracking-normal text-slate-950">
          Tender List
        </CardTitle>
        <CardDescription>
          Track evaluations and open completed result reports.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {tenders.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
            <p className="text-base font-medium text-slate-950">
              No tenders yet
            </p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
              Create a new evaluation to upload documents and start reviewing
              bidder compliance.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4 text-slate-500">
                  Tender Name
                </TableHead>
                <TableHead className="px-4 text-slate-500">
                  Created Date
                </TableHead>
                <TableHead className="px-4 text-slate-500">Status</TableHead>
                <TableHead className="px-4 text-right text-slate-500">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenders.map((tender) => (
                <TableRow key={tender.id}>
                  <TableCell className="px-4 font-medium text-slate-950">
                    {tender.name}
                  </TableCell>
                  <TableCell className="px-4 text-slate-600">
                    {tender.createdDate}
                  </TableCell>
                  <TableCell className="px-4">
                    <StatusBadge status={tender.status} />
                  </TableCell>
                  <TableCell className="px-4 text-right">
                    <Button
                      asChild
                      variant="outline"
                      className="h-8 rounded-lg border-slate-200 bg-white"
                    >
                      <Link to={`/tender/${tender.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
