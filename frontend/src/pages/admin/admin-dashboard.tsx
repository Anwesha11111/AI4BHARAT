import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Building2,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  RefreshCw,
  Users,
  XCircle,
  Eye,
  Bot,
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
import { useAuth } from "@/lib/auth-context";
import { getAuthToken } from "@/lib/auth-context";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

type AdminStats = {
  total_tenders: number;
  pending_review: number;
  approved: number;
  rejected: number;
  assigned: number;
  total_companies: number;
  total_bidders: number;
};

type TenderSummary = {
  id: number;
  title: string;
  status: string;
  admin_status: string;
  submitted_by_company: string | null;
  submitted_by_email: string | null;
  created_at: string | null;
  bidder_count: number;
  criteria_count: number;
  has_recommendation: boolean;
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [tenders, setTenders] = useState<TenderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/dashboard");
      return;
    }
    fetchData();
  }, [isAdmin, navigate]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const token = getAuthToken();

    try {
      const [statsRes, tendersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/admin/tenders`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!statsRes.ok || !tendersRes.ok) {
        throw new Error("Failed to fetch admin data");
      }

      setStats(await statsRes.json());
      setTenders(await tendersRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (tenderId: number, action: "approve" | "reject") => {
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_BASE_URL}/admin/tenders/${tenderId}/review`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, notes: `${action}d by ${user?.email}` }),
      });

      if (!res.ok) throw new Error("Review failed");
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Action failed");
    }
  };

  const handleRunAI = async (tenderId: number) => {
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_BASE_URL}/admin/tenders/${tenderId}/run-ai-recommendation`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("AI recommendation failed");
      const data = await res.json();
      alert(`AI Recommendation: ${data.recommendation?.recommendation?.winner_name || "See details"}`);
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "AI failed");
    }
  };

  const getStatusBadge = (adminStatus: string) => {
    switch (adminStatus) {
      case "approved":
        return <Badge className="bg-emerald-100 text-emerald-700">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-700">Rejected</Badge>;
      case "assigned":
        return <Badge className="bg-blue-100 text-blue-700">Assigned</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-700">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="size-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Building2 className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Admin Dashboard</h1>
              <p className="text-sm text-slate-500">Manage tenders and approvals</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="size-4" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Tenders</CardTitle>
              <FileText className="size-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats?.total_tenders || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Pending Review</CardTitle>
              <Clock className="size-5 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">{stats?.pending_review || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Approved</CardTitle>
              <CheckCircle className="size-5 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">{stats?.approved || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Companies</CardTitle>
              <Users className="size-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats?.total_companies || 0}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Submitted Tenders</CardTitle>
            <CardDescription>Review and approve tenders from companies</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tender</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Bidders</TableHead>
                  <TableHead>AI</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-slate-500">
                      No tenders submitted yet
                    </TableCell>
                  </TableRow>
                ) : (
                  tenders.map((tender) => (
                    <TableRow key={tender.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">{tender.title}</p>
                          <p className="text-xs text-slate-500">
                            {tender.criteria_count} criteria
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-slate-700">{tender.submitted_by_company || "—"}</p>
                          <p className="text-xs text-slate-500">{tender.submitted_by_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(tender.admin_status)}</TableCell>
                      <TableCell>
                        <span className="text-slate-700">{tender.bidder_count}</span>
                      </TableCell>
                      <TableCell>
                        {tender.has_recommendation ? (
                          <Badge className="bg-purple-100 text-purple-700">
                            <Bot className="mr-1 size-3" />
                            Ready
                          </Badge>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/admin/tender/${tender.id}`)}
                          >
                            <Eye className="size-4" />
                            View
                          </Button>
                          {tender.admin_status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => handleReview(tender.id, "approve")}
                              >
                                <CheckCircle className="size-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReview(tender.id, "reject")}
                              >
                                <XCircle className="size-4" />
                              </Button>
                            </>
                          )}
                          {tender.admin_status === "approved" && tender.bidder_count > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-purple-600"
                              onClick={() => handleRunAI(tender.id)}
                            >
                              <Bot className="size-4" />
                              AI
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
      </main>
    </div>
  );
};

export default AdminDashboard;
