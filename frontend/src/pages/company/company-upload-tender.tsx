import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Upload, FileText, Loader2, CheckCircle } from "lucide-react";

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
import { useAuth } from "@/lib/auth-context";
import { getAuthToken } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
];

const CompanyUploadTender = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadedTenderId, setUploadedTenderId] = useState<number | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && ALLOWED_TYPES.includes(droppedFile.type)) {
      setFile(droppedFile);
      setError(null);
    } else {
      setError("Please upload a PDF, DOC, DOCX, PNG, or JPG file");
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (ALLOWED_TYPES.includes(selectedFile.type)) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError("Please upload a PDF, DOC, DOCX, PNG, or JPG file");
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file to upload");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    const token = getAuthToken();

    // Use XMLHttpRequest for progress tracking
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        setUploadProgress(percent);
      }
    });

    xhr.addEventListener("load", () => {
      setUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          setSuccess(true);
          setUploadedTenderId(data.id);
          setTimeout(() => navigate("/company"), 2000);
        } catch {
          setError("Invalid response from server");
        }
      } else {
        try {
          const data = JSON.parse(xhr.responseText);
          setError(data.detail || "Upload failed");
        } catch {
          setError("Upload failed");
        }
      }
    });

    xhr.addEventListener("error", () => {
      setUploading(false);
      setError("Network error - check your connection");
    });

    xhr.open("POST", `${API_BASE_URL}/upload/tender`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.send(formData);
  };

  if (success && uploadedTenderId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <Card className="border-emerald-400 bg-white shadow-2xl animate-in fade-in zoom-in duration-300 max-w-md mx-4">
            <CardContent className="flex flex-col items-center gap-4 py-10 px-8">
              <div className="rounded-full bg-emerald-100 p-4">
                <CheckCircle className="size-16 text-emerald-600" />
              </div>
              <h2 className="text-3xl font-bold text-emerald-700">UPLOADED!</h2>
              <p className="text-center text-slate-600">
                Your tender has been submitted successfully.
              </p>
              <p className="text-sm text-slate-400">
                Redirecting to dashboard...
              </p>
              <Loader2 className="size-5 animate-spin text-emerald-500" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-6 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/company")}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Upload Tender</h1>
            <p className="text-sm text-slate-500">{user?.company_name}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Submit New Tender</CardTitle>
            <CardDescription>
              Upload your tender document for evaluation. Supported formats: PDF, DOC, DOCX, PNG, JPG
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
                {error}
              </div>
            )}

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={cn(
                "rounded-xl border-2 border-dashed p-8 text-center transition-colors",
                dragActive
                  ? "border-blue-500 bg-blue-50"
                  : file
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-slate-300 bg-slate-50 hover:border-slate-400"
              )}
            >
              {file ? (
                <div className="flex flex-col items-center gap-3">
                  <FileText className="size-12 text-emerald-600" />
                  <p className="font-medium text-slate-900">{file.name}</p>
                  <p className="text-sm text-slate-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFile(null)}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Upload className="size-12 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-700">
                      Drag and drop your file here
                    </p>
                    <p className="text-sm text-slate-500">or click to browse</p>
                  </div>
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <Input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      onChange={handleFileChange}
                    />
                    <span className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
                      Browse Files
                    </span>
                  </Label>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {uploading && (
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {uploading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Uploading... {uploadProgress}%
                  </>
                ) : (
                  <>
                    <Upload className="size-4" />
                    Submit Tender
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CompanyUploadTender;
