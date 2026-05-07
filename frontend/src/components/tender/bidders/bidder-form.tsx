import {
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import { useNavigate, useParams } from "react-router";
import { FileText, Loader2, Plus, Trash2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUploadBidder } from "@/hooks/use-api";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "image/png",
  "image/jpeg",
  "image/tiff",
];

type BidderEntry = {
  file: File | null;
  id: string;
  name: string;
};

type BidderError = {
  file?: string;
  name?: string;
};

type BidderErrors = Record<string, BidderError>;

const createBidder = (): BidderEntry => ({
  file: null,
  id: crypto.randomUUID(),
  name: "",
});

const formatFileSize = (file: File) =>
  `${(file.size / 1024 / 1024).toFixed(2)} MB`;

export const BidderForm = () => {
  const navigate = useNavigate();
  const { id = "new-tender" } = useParams();
  const { upload, uploading } = useUploadBidder();
  const [bidders, setBidders] = useState<BidderEntry[]>([createBidder()]);
  const [draggingBidderId, setDraggingBidderId] = useState<string | null>(null);
  const [errors, setErrors] = useState<BidderErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const updateBidder = (bidderId: string, updates: Partial<BidderEntry>) => {
    setBidders((current) =>
      current.map((bidder) =>
        bidder.id === bidderId ? { ...bidder, ...updates } : bidder,
      ),
    );
  };

  const updateBidderFile = (bidderId: string, file?: File) => {
    if (!file) {
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      updateBidder(bidderId, { file: null });
      setErrors((current) => ({
        ...current,
        [bidderId]: {
          ...current[bidderId],
          file: "Upload a PDF, DOCX, or image file.",
        },
      }));
      return;
    }

    updateBidder(bidderId, { file });
    setErrors((current) => ({
      ...current,
      [bidderId]: {
        ...current[bidderId],
        file: undefined,
      },
    }));
    setApiError(null);
  };

  const handleFileChange = (
    bidderId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    updateBidderFile(bidderId, event.target.files?.[0]);
  };

  const handleDrop = (bidderId: string, event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDraggingBidderId(null);
    updateBidderFile(bidderId, event.dataTransfer.files[0]);
  };

  const addBidder = () => {
    setBidders((current) => [...current, createBidder()]);
  };

  const removeBidder = (bidderId: string) => {
    setBidders((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter((bidder) => bidder.id !== bidderId);
    });
    setErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors[bidderId];
      return nextErrors;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setApiError(null);

    const nextErrors: BidderErrors = {};

    bidders.forEach((bidder) => {
      const bidderErrors: BidderError = {};

      if (!bidder.name.trim()) {
        bidderErrors.name = "Bidder name is required.";
      }

      if (!bidder.file) {
        bidderErrors.file = "Upload the bidder submission document.";
      }

      if (Object.keys(bidderErrors).length > 0) {
        nextErrors[bidder.id] = bidderErrors;
      }
    });

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0) {
      const tenderId = parseInt(id, 10);
      if (isNaN(tenderId)) {
        setApiError("Invalid tender ID");
        return;
      }

      try {
        for (const bidder of bidders) {
          if (bidder.file) {
            await upload(tenderId, bidder.name, [bidder.file]);
          }
        }
        navigate(`/tender/${id}/processing`);
      } catch {
        setApiError("Failed to upload bidder submissions. Please try again.");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-4">
        {bidders.map((bidder, index) => {
          const bidderErrors = errors[bidder.id] ?? {};
          const fileInputId = `bidder-file-${bidder.id}`;

          return (
            <Card
              key={bidder.id}
              className="rounded-2xl border-slate-200 bg-white shadow-sm shadow-slate-900/5"
            >
              <CardHeader className="flex-row items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <CardTitle className="text-lg font-semibold tracking-normal text-slate-950">
                    Bidder {index + 1}
                  </CardTitle>
                  <CardDescription>
                    Add bidder identity and proposal document.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-xl text-slate-500 hover:text-red-600"
                  onClick={() => removeBidder(bidder.id)}
                  disabled={bidders.length === 1}
                  aria-label={`Remove bidder ${index + 1}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                <div className="space-y-2">
                  <Label htmlFor={`bidder-name-${bidder.id}`}>
                    Bidder Name
                  </Label>
                  <Input
                    id={`bidder-name-${bidder.id}`}
                    value={bidder.name}
                    aria-invalid={Boolean(bidderErrors.name)}
                    aria-describedby={
                      bidderErrors.name
                        ? `bidder-name-${bidder.id}-error`
                        : undefined
                    }
                    onChange={(event) =>
                      updateBidder(bidder.id, { name: event.target.value })
                    }
                    placeholder="Acme Infrastructure Ltd."
                    className="h-11 rounded-xl border-slate-200 bg-white shadow-sm focus-visible:border-blue-500 focus-visible:ring-blue-500/20"
                  />
                  {bidderErrors.name ? (
                    <p
                      id={`bidder-name-${bidder.id}-error`}
                      className="text-sm text-red-600"
                    >
                      {bidderErrors.name}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={fileInputId}>Submission PDF</Label>
                  <label
                    htmlFor={fileInputId}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDraggingBidderId(bidder.id);
                    }}
                    onDragLeave={() => setDraggingBidderId(null)}
                    onDrop={(event) => handleDrop(bidder.id, event)}
                    className={[
                      "flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 text-center transition-colors",
                      draggingBidderId === bidder.id
                        ? "border-blue-400 bg-blue-50"
                        : "border-slate-300 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/50",
                      bidderErrors.file ? "border-red-300 bg-red-50/40" : "",
                    ].join(" ")}
                  >
                    <input
                      id={fileInputId}
                      type="file"
                      accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.tiff,.tif"
                      onChange={(event) => handleFileChange(bidder.id, event)}
                      className="sr-only"
                    />
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                      <UploadCloud className="size-5" />
                    </div>
                    <p className="mt-3 text-sm font-medium text-slate-950">
                      Drop bidder proposal PDF here
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      or click to browse
                    </p>
                  </label>
                  {bidderErrors.file ? (
                    <p className="text-sm text-red-600">{bidderErrors.file}</p>
                  ) : null}
                </div>

                {bidder.file ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <FileText className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-950">
                        {bidder.file.name}
                      </p>
                      <p className="text-sm text-slate-500">
                        {formatFileSize(bidder.file)}
                      </p>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {apiError ? (
        <p className="text-sm text-red-600">{apiError}</p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-xl border-slate-200 bg-white"
          onClick={addBidder}
          disabled={uploading}
        >
          <Plus className="size-4" />
          Add Bidder
        </Button>
        <Button
          className="h-10 rounded-xl bg-blue-600 px-5 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Uploading...
            </>
          ) : (
            "Start Evaluation"
          )}
        </Button>
      </div>
    </form>
  );
};
