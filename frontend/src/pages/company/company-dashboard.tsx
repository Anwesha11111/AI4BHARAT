import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Building2,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Upload,
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

type Tender = {
  id: number;
  title: string;
  status: string;
  admin_status?: string;
  created_at: string | null;
};

const CompanyDashboard = () => {
  const navigate = useNavigate();
  const { user, isCompany, logout } = useAuth();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isCompany) {
      navigate("/admin");
      return;
    }
    fetchTenders();
  }, [isCompany, navigate]);

  const fetchTenders = async () => {
    setLoading(true);
    setError(null);
    const token = getAuthToken();

    try {
      const res = await fetch(`${API_BASE_URL}/tenders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch tenders");
      setTenders(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tenders");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, adminStatus?: string) => {
    if (adminStatus === "approved") {
      return <Badge className="bg-emerald-100 text-emerald-700">Approved</Badge>;
    }
    if (adminStatus === "rejected") {
      return <Badge className="bg-red-100 text-red-700">Rejected</Badge>;
    }
    if (adminStatus === "assigned") {
      return <Badge className="bg-blue-100 text-blue-700">Assigned</Badge>;
    }
    if (status === "completed") {
      return <Badge className="bg-emerald-100 text-emerald-700">Completed</Badge>;
    }
    if (status === "processing") {
      return <Badge className="bg-amber-100 text-amber-700">Processing</Badge>;
    }
    return <Badge className="bg-slate-100 text-slate-700">Pending</Badge>;
  };

  const viewDocument = (tenderId: number) => {
    const token = getAuthToken();
    window.open(`${API_BASE_URL}/tenders/${tenderId}/document?token=${token}`, "_blank");
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
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Building2 className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Company Dashboard</h1>
              <p className="text-sm text-slate-500">{user?.company_name || "Your Company"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={fetchTenders}>
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
              <div className="text-3xl font-bold text-slate-900">{tenders.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Pending Review</CardTitle>
              <Clock className="size-5 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">
                {tenders.filter(t => !t.admin_status || t.admin_status === "pending").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Approved</CardTitle>
              <CheckCircle className="size-5 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">
                {tenders.filter(t => t.admin_status === "approved" || t.admin_status === "assigned").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Rejected</CardTitle>
              <XCircle className="size-5 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {tenders.filter(t => t.admin_status === "rejected").length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Your Tenders</CardTitle>
              <CardDescription>Manage your submitted tenders</CardDescription>
            </div>
            <Button onClick={() => navigate("/company/tender/new")} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="size-4" />
              New Tender
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tender</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Upload className="size-12 text-slate-300" />
                        <p className="text-slate-500">No tenders yet</p>
                        <Button onClick={() => navigate("/company/tender/new")} variant="outline">
                          <Plus className="size-4" />
                          Submit your first tender
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  tenders.map((tender) => (
                    <TableRow key={tender.id}>
                      <TableCell>
                        <p className="font-medium text-slate-900">{tender.title}</p>
                        <p className="text-xs text-slate-500">ID: {tender.id}</p>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(tender.status, tender.admin_status)}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {tender.created_at
                          ? new Date(tender.created_at).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewDocument(tender.id)}
                          >
                            <Eye className="size-4" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/company/tender/${tender.id}`)}
                          >
                            Details
                          </Button>
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

export default CompanyDashboard;
