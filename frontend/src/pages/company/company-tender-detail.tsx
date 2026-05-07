import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Eye,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth-context";
import { getAuthToken } from "@/lib/auth-context";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

type TenderStatus = {
  tender_id: number;
  status: string;
  bidders: Array<{ id: number; status: string; vendor: string }>;
};

type Scorecard = {
  tender_id: number;
  status: string;
  criteria: Array<{ id: number; text: string; type: string; weight: number }>;
  bidders: Array<{
    bidder_id: number;
    vendor_name: string;
    status: string;
    compliance_score: number;
    disqualified: boolean;
  }>;
};

const CompanyTenderDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isCompany } = useAuth();
  const [status, setStatus] = useState<TenderStatus | null>(null);
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isCompany) {
      navigate("/admin");
      return;
    }
    fetchData();
  }, [id, isCompany, navigate]);

  const fetchData = async () => {
    setLoading(true);
    const token = getAuthToken();

    try {
      const [statusRes, scorecardRes] = await Promise.all([
        fetch(`${API_BASE_URL}/tenders/${id}/status`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/tenders/${id}/scorecard`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (statusRes.ok) {
        setStatus(await statusRes.json());
      }
      if (scorecardRes.ok) {
        setScorecard(await scorecardRes.json());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tender");
    } finally {
      setLoading(false);
    }
  };

  const viewDocument = () => {
    const token = getAuthToken();
    window.open(`${API_BASE_URL}/tenders/${id}/document?token=${token}`, "_blank");
  };

  const getStatusIcon = (s: string) => {
    switch (s) {
      case "completed":
        return <CheckCircle className="size-5 text-emerald-500" />;
      case "processing":
        return <Loader2 className="size-5 animate-spin text-amber-500" />;
      case "failed":
        return <XCircle className="size-5 text-red-500" />;
      default:
        return <Clock className="size-5 text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="size-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/company")}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-slate-900">
              Tender #{id}
            </h1>
            <div className="flex items-center gap-2">
              {status && getStatusIcon(status.status)}
              <span className="text-sm text-slate-500">{status?.status || "Loading..."}</span>
            </div>
          </div>
          <Button variant="outline" onClick={viewDocument}>
            <Eye className="size-4" />
            View Document
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {status && getStatusIcon(status.status)}
                <span className="text-xl font-semibold text-slate-900 capitalize">
                  {status?.status || "—"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Criteria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {scorecard?.criteria.length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Bidders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {status?.bidders.length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {scorecard && scorecard.criteria.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Evaluation Criteria</CardTitle>
              <CardDescription>Criteria extracted from your tender document</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {scorecard.criteria.map((criterion, index) => (
                  <div
                    key={criterion.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-500">#{index + 1}</span>
                      <span className="text-slate-700">{criterion.text}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        criterion.type === "mandatory"
                          ? "border-red-200 text-red-600"
                          : "border-slate-200 text-slate-600"
                      }
                    >
                      {criterion.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {scorecard && scorecard.bidders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Bidder Rankings</CardTitle>
              <CardDescription>Ranked by compliance score</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {scorecard.bidders.map((bidder, index) => (
                  <div
                    key={bidder.bidder_id}
                    className="flex items-center gap-4 rounded-lg border border-slate-200 p-4"
                  >
                    <div className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{bidder.vendor_name}</p>
                      <div className="flex items-center gap-2">
                        <Progress value={bidder.compliance_score * 100} className="h-2 w-32" />
                        <span className="text-sm text-slate-500">
                          {(bidder.compliance_score * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    {bidder.disqualified && (
                      <Badge className="bg-red-100 text-red-700">Disqualified</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {(!scorecard || scorecard.bidders.length === 0) && status?.status !== "processing" && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <Users className="size-12 text-slate-300" />
              <p className="text-slate-500">No bidders have submitted yet</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default CompanyTenderDetail;
