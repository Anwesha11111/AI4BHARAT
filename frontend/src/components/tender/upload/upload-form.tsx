import {
  useMemo,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import { useNavigate } from "react-router";
import { FileText, Loader2, UploadCloud, X } from "lucide-react";

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
import { useUploadTender } from "@/hooks/use-api";

type UploadFormErrors = {
  file?: string;
  tenderName?: string;
  api?: string;
};

export const UploadForm = () => {
  const navigate = useNavigate();
  const { upload, uploading, error: uploadError } = useUploadTender();
  const [tenderName, setTenderName] = useState("");
  const [department, setDepartment] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<UploadFormErrors>({});

  const fileSize = useMemo(() => {
    if (!file) {
      return "";
    }

    return `${(file.size / 1024 / 1024).toFixed(2)} MB`;
  }, [file]);

  const ALLOWED_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "image/png",
    "image/jpeg",
    "image/tiff",
  ];

  const setTenderFile = (nextFile?: File) => {
    if (!nextFile) {
      return;
    }

    if (!ALLOWED_TYPES.includes(nextFile.type)) {
      setFile(null);
      setErrors((current) => ({
        ...current,
        file: "Upload a PDF, DOCX, or image file.",
      }));
      return;
    }

    setFile(nextFile);
    setErrors((current) => ({ ...current, file: undefined, api: undefined }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTenderFile(event.target.files?.[0]);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    setTenderFile(event.dataTransfer.files[0]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: UploadFormErrors = {};
    if (!tenderName.trim()) {
      nextErrors.tenderName = "Tender name is required.";
    }
    if (!file) {
      nextErrors.file = "Upload the tender PDF before continuing.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0 && file) {
      try {
        const result = await upload(file);
        navigate(`/tender/${result.id}/bidders/upload`);
      } catch {
        setErrors((prev) => ({
          ...prev,
          api: uploadError || "Failed to upload tender. Please try again.",
        }));
      }
    }
  };

  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm shadow-slate-900/5">
      <CardHeader className="border-b border-slate-100 pb-4">
        <CardTitle className="text-xl font-semibold tracking-normal text-slate-950">
          Tender Details
        </CardTitle>
        <CardDescription>
          Upload the tender PDF and add basic context for evaluation.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tender-name" className="text-slate-700">
                Tender Name
              </Label>
              <Input
                id="tender-name"
                value={tenderName}
                aria-invalid={Boolean(errors.tenderName)}
                aria-describedby={
                  errors.tenderName ? "tender-name-error" : undefined
                }
                onChange={(event) => setTenderName(event.target.value)}
                placeholder="Municipal Road Maintenance Tender"
                className="h-11 rounded-xl border-slate-200 bg-white shadow-sm focus-visible:border-blue-500 focus-visible:ring-blue-500/20"
              />
              {errors.tenderName ? (
                <p id="tender-name-error" className="text-sm text-red-600">
                  {errors.tenderName}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="department" className="text-slate-700">
                Department
                <span className="font-normal text-slate-400">(optional)</span>
              </Label>
              <Input
                id="department"
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                placeholder="Public Works Department"
                className="h-11 rounded-xl border-slate-200 bg-white shadow-sm focus-visible:border-blue-500 focus-visible:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tender-file" className="text-slate-700">
              Tender PDF
            </Label>
            <label
              htmlFor="tender-file"
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={[
                "flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 text-center transition-colors",
                isDragging
                  ? "border-blue-400 bg-blue-50"
                  : "border-slate-300 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/50",
                errors.file ? "border-red-300 bg-red-50/40" : "",
              ].join(" ")}
            >
              <input
                id="tender-file"
                type="file"
                accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.tiff,.tif"
                onChange={handleFileChange}
                className="sr-only"
              />
              <div className="flex size-12 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                <UploadCloud className="size-6" />
              </div>
              <p className="mt-4 text-base font-medium text-slate-950">
                Drag and drop your tender PDF
              </p>
              <p className="mt-2 text-sm text-slate-500">
                or click to browse files from your device
              </p>
            </label>
            {errors.file ? (
              <p className="text-sm text-red-600">{errors.file}</p>
            ) : null}
          </div>

          {file ? (
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <FileText className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-950">
                    {file.name}
                  </p>
                  <p className="text-sm text-slate-500">{fileSize}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-xl text-slate-500 hover:text-slate-950"
                onClick={() => setFile(null)}
                aria-label="Remove uploaded file"
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : null}

          {errors.api ? (
            <p className="text-sm text-red-600">{errors.api}</p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl border-slate-200 bg-white"
              onClick={() => navigate("/dashboard")}
              disabled={uploading}
            >
              Cancel
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
                "Next"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
