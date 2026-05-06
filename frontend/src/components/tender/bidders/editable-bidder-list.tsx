import { useMemo, useState, type ChangeEvent } from "react";
import { FileText, PlayCircle, Plus, RefreshCw, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Bidder } from "@/data/bidders";

type EditableBidder = Bidder & {
  documentName: string;
};

type EditableBidderListProps = {
  bidders: Bidder[];
  tenderId: string;
  onRunEvaluation?: () => void;
};

const createEditableBidder = (
  bidder: Bidder,
  index: number,
): EditableBidder => ({
  ...bidder,
  documentName: `${bidder.name.toLowerCase().replace(/\s+/g, "-")}-submission-${index + 1}.pdf`,
});

const createNewBidder = (tenderId: string): EditableBidder => ({
  documentName: "",
  id: crypto.randomUUID(),
  name: "",
  tenderId,
});

export const EditableBidderList = ({
  bidders,
  onRunEvaluation,
  tenderId,
}: EditableBidderListProps) => {
  const initialBidders = useMemo(
    () => bidders.map((bidder, index) => createEditableBidder(bidder, index)),
    [bidders],
  );
  const [editableBidders, setEditableBidders] =
    useState<EditableBidder[]>(initialBidders);

  const addBidder = () => {
    setEditableBidders((current) => [...current, createNewBidder(tenderId)]);
  };

  const removeBidder = (bidderId: string) => {
    setEditableBidders((current) =>
      current.filter((bidder) => bidder.id !== bidderId),
    );
  };

  const updateBidder = (bidderId: string, updates: Partial<EditableBidder>) => {
    setEditableBidders((current) =>
      current.map((bidder) =>
        bidder.id === bidderId ? { ...bidder, ...updates } : bidder,
      ),
    );
  };

  const replaceDocument = (
    bidderId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (file) {
      updateBidder(bidderId, { documentName: file.name });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">
            Manage submitted bidders and refresh the evaluation when documents
            change.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl border-slate-200 bg-white"
            onClick={addBidder}
          >
            <Plus className="size-4" />
            Add Bidder
          </Button>
          <Button
            type="button"
            className="h-10 rounded-xl bg-blue-600 px-5 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
            onClick={onRunEvaluation}
          >
            <RefreshCw className="size-4" />
            Re-run Evaluation
          </Button>
        </div>
      </div>

      {editableBidders.length === 0 ? (
        <EmptyState
          icon={PlayCircle}
          message="No bidders"
          description="Add bidder submissions before running the evaluation."
          actionLabel="Add Bidder"
          onAction={addBidder}
        />
      ) : (
        <div className="space-y-4">
          {editableBidders.map((bidder, index) => {
            const fileInputId = `replace-bidder-document-${bidder.id}`;

            return (
              <Card
                key={bidder.id}
                className="rounded-2xl border-slate-200 bg-white shadow-sm shadow-slate-900/5"
              >
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg text-slate-950">
                    Bidder {index + 1}
                    <Badge
                      variant="outline"
                      className="border-blue-200 bg-blue-50 text-blue-700"
                    >
                      {bidder.documentName ? "Document Uploaded" : "Pending"}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Update bidder identity or replace the submitted document.
                  </CardDescription>
                  <CardAction>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="rounded-xl text-slate-500 hover:text-red-600"
                      onClick={() => removeBidder(bidder.id)}
                      aria-label={`Remove bidder ${index + 1}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent className="grid gap-5 pt-2 lg:grid-cols-[1fr_1.2fr]">
                  <div className="space-y-2">
                    <Label htmlFor={`bidder-name-${bidder.id}`}>
                      Bidder Name
                    </Label>
                    <Input
                      id={`bidder-name-${bidder.id}`}
                      value={bidder.name}
                      onChange={(event) =>
                        updateBidder(bidder.id, { name: event.target.value })
                      }
                      placeholder="Acme Infrastructure Ltd."
                      className="h-11 rounded-xl border-slate-200 bg-white shadow-sm focus-visible:border-blue-500 focus-visible:ring-blue-500/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={fileInputId}>Bidder Document</Label>
                    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                          <FileText className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-950">
                            {bidder.documentName || "No document selected"}
                          </p>
                          <p className="text-sm text-slate-500">
                            PDF bidder submission
                          </p>
                        </div>
                      </div>
                      <div>
                        <Input
                          id={fileInputId}
                          type="file"
                          accept="application/pdf,.pdf"
                          className="sr-only"
                          onChange={(event) =>
                            replaceDocument(bidder.id, event)
                          }
                        />
                        <Button
                          asChild
                          type="button"
                          variant="outline"
                          className="h-9 rounded-xl border-slate-200 bg-white"
                        >
                          <Label htmlFor={fileInputId}>Replace Document</Label>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
