import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Award,
  Bot,
  Loader2,
  Trophy,
  Eye,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth-context";
import { getAuthToken } from "@/lib/auth-context";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

type BidderSummary = {
  id: number;
  vendor_name: string;
  status: string;
  submission_date: string | null;
  verdict_count: number;
  pass_count: number;
  fail_count: number;
  compliance_score: number;
};

type TenderDetail = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  admin_status: string;
  admin_notes: string | null;
  submitted_by_company: string | null;
  created_at: string | null;
  criteria: Array<{ id: number; text: string; type: string; weight: number }>;
  bidders: BidderSummary[];
  ai_recommendation: {
    recommendation: {
      winner_id: number | null;
      winner_name: string;
      winner_score: number;
      confidence: number;
      reasoning: string;
    };
    rankings: Array<{
      bidder_id: number;
      bidder_name: string;
      total_score: number;
      avg_confidence: number;
      mandatory_pass: boolean;
      disqualified: boolean;
    }>;
  } | null;
};

const AdminTenderDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const [tender, setTender] = useState<TenderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/dashboard");
      return;
    }
    fetchTender();
  }, [id, isAdmin, navigate]);

  const fetchTender = async () => {
    setLoading(true);
    const token = getAuthToken();

    try {
      const res = await fetch(`${API_BASE_URL}/admin/tenders/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch tender");
      setTender(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tender");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (bidderId: number, bidderName: string) => {
    if (!confirm(`Assign tender to ${bidderName}?`)) return;

    setAssigning(true);
    const token = getAuthToken();

    try {
      const res = await fetch(`${API_BASE_URL}/admin/tenders/${id}/assign`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bidder_id: bidderId,
          notes: `Assigned to ${bidderName}`,
        }),
      });

      if (!res.ok) throw new Error("Assignment failed");
      alert(`Tender assigned to ${bidderName}`);
      fetchTender();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Assignment failed");
    } finally {
      setAssigning(false);
    }
  };

  const handleRunAI = async () => {
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_BASE_URL}/admin/tenders/${id}/run-ai-recommendation`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("AI recommendation failed");
      fetchTender();
    } catch (err) {
      alert(err instanceof Error ? err.message : "AI failed");
    }
  };

  const viewDocument = () => {
    window.open(`${API_BASE_URL}/tenders/${id}/document`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="size-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !tender) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-red-600">{error || "Tender not found"}</div>
      </div>
    );
  }

  const recommendation = tender.ai_recommendation?.recommendation;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-slate-900">{tender.title}</h1>
            <p className="text-sm text-slate-500">
              Submitted by {tender.submitted_by_company || "Unknown"}
            </p>
          </div>
          <Badge
            className={
              tender.admin_status === "approved"
                ? "bg-emerald-100 text-emerald-700"
                : tender.admin_status === "rejected"
                ? "bg-red-100 text-red-700"
                : tender.admin_status === "assigned"
                ? "bg-blue-100 text-blue-700"
                : "bg-amber-100 text-amber-700"
            }
          >
            {tender.admin_status.toUpperCase()}
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Tender Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Description</p>
                <p className="text-slate-700">{tender.description || "No description"}</p>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-sm font-medium text-slate-500">Criteria</p>
                  <p className="text-2xl font-bold text-slate-900">{tender.criteria.length}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Bidders</p>
                  <p className="text-2xl font-bold text-slate-900">{tender.bidders.length}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Status</p>
                  <p className="text-2xl font-bold text-slate-900">{tender.status}</p>
                </div>
              </div>
              <Button variant="outline" onClick={viewDocument}>
                <Eye className="size-4" />
                View Document
              </Button>
            </CardContent>
          </Card>

          {recommendation && (
            <Card className="border-purple-200 bg-purple-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-700">
                  <Bot className="size-5" />
                  AI Recommendation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Trophy className="size-5 text-amber-500" />
                  <span className="font-semibold text-slate-900">
                    {recommendation.winner_name}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Confidence</p>
                  <Progress value={recommendation.confidence * 100} className="h-2" />
                  <p className="text-xs text-slate-500 mt-1">
                    {(recommendation.confidence * 100).toFixed(1)}%
                  </p>
                </div>
                <p className="text-sm text-slate-600">{recommendation.reasoning}</p>
                {recommendation.winner_id && (
                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={() => handleAssign(recommendation.winner_id!, recommendation.winner_name)}
                    disabled={assigning || tender.admin_status === "assigned"}
                  >
                    <Award className="size-4" />
                    Accept AI Recommendation
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {!recommendation && tender.bidders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>AI Analysis</CardTitle>
                <CardDescription>Run AI to get winner recommendation</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleRunAI} className="w-full">
                  <Bot className="size-4" />
                  Run AI Analysis
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bidder Rankings</CardTitle>
            <CardDescription>Ranked by compliance score</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Bidder</TableHead>
                  <TableHead>Compliance</TableHead>
                  <TableHead>Pass/Fail</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tender.bidders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-slate-500">
                      No bidders yet
                    </TableCell>
                  </TableRow>
                ) : (
                  tender.bidders.map((bidder, index) => (
                    <TableRow key={bidder.id}>
                      <TableCell>
                        {index === 0 && bidder.compliance_score > 0 ? (
                          <Trophy className="size-5 text-amber-500" />
                        ) : (
                          <span className="text-slate-500">#{index + 1}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-slate-900">{bidder.vendor_name}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={bidder.compliance_score} className="h-2 w-20" />
                          <span className="text-sm text-slate-600">
                            {bidder.compliance_score.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-600">{bidder.pass_count} pass</span>
                          <span className="text-slate-400">/</span>
                          <span className="text-red-600">{bidder.fail_count} fail</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            bidder.status === "completed"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-700"
                          }
                        >
                          {bidder.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/tender/${tender.id}/results`)}
                          >
                            <Eye className="size-4" />
                            Details
                          </Button>
                          {tender.admin_status !== "assigned" && (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => handleAssign(bidder.id, bidder.vendor_name)}
                              disabled={assigning}
                            >
                              <Award className="size-4" />
                              Assign
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evaluation Criteria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tender.criteria.map((criterion, index) => (
                <div
                  key={criterion.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500">#{index + 1}</span>
                    <span className="text-slate-700">{criterion.text}</span>
                  </div>
                  <div className="flex items-center gap-2">
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
                    <span className="text-sm text-slate-500">
                      Weight: {criterion.weight}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminTenderDetail;
