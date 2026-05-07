import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router";
import { Loader2 } from "lucide-react";

import { PublicLayout } from "@/layouts/public-layout";

// Lazy load all pages
const LandingPage = lazy(() => import("@/pages/landing-page"));
const LoginPage = lazy(() => import("@/pages/login-page"));
const SignupPage = lazy(() => import("@/pages/signup-page"));
const NotFoundPage = lazy(() => import("@/pages/not-found-page"));

// Company pages
const CompanyDashboard = lazy(() => import("@/pages/company/company-dashboard"));
const CompanyUploadTender = lazy(() => import("@/pages/company/company-upload-tender"));
const CompanyTenderDetail = lazy(() => import("@/pages/company/company-tender-detail"));

// Admin pages
const AdminDashboard = lazy(() => import("@/pages/admin/admin-dashboard"));
const AdminTenderDetail = lazy(() => import("@/pages/admin/admin-tender-detail"));

// Legacy dashboard (redirect based on role)
const DashboardPage = lazy(() => import("@/pages/dashboard/dashboard-page"));

// Tender workflow pages (shared)
const AuditPage = lazy(() => import("@/pages/tender/audit-page"));
const CriteriaPage = lazy(() => import("@/pages/tender/criteria-page"));
const EditBiddersPage = lazy(() => import("@/pages/tender/edit-bidders-page"));
const FinalPage = lazy(() => import("@/pages/tender/final-page"));
const ProcessingPage = lazy(() => import("@/pages/tender/processing-page"));
const ResultsPage = lazy(() => import("@/pages/tender/results-page"));
const ReviewPage = lazy(() => import("@/pages/tender/review-page"));
const TenderDetailsPage = lazy(() => import("@/pages/tender/tender-details-page"));
const UploadBiddersPage = lazy(() => import("@/pages/tender/upload-bidders-page"));
const UploadTenderPage = lazy(() => import("@/pages/tender/upload-tender-page"));

const LoadingSpinner = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50">
    <Loader2 className="size-8 animate-spin text-blue-600" />
  </div>
);

export const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>

        {/* Company Routes */}
        <Route path="/company" element={<CompanyDashboard />} />
        <Route path="/company/tender/new" element={<CompanyUploadTender />} />
        <Route path="/company/tender/:id" element={<CompanyTenderDetail />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/tender/:id" element={<AdminTenderDetail />} />

        {/* Legacy Dashboard Route (for backwards compatibility) */}
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Shared Tender Workflow Routes */}
        <Route path="/tender/new" element={<UploadTenderPage />} />
        <Route path="/tender/:id" element={<TenderDetailsPage />} />
        <Route path="/tender/:id/bidders/upload" element={<UploadBiddersPage />} />
        <Route path="/tender/:id/bidders/edit" element={<EditBiddersPage />} />
        <Route path="/tender/:id/criteria" element={<CriteriaPage />} />
        <Route path="/tender/:id/processing" element={<ProcessingPage />} />
        <Route path="/tender/:id/results" element={<ResultsPage />} />
        <Route path="/tender/:id/review" element={<ReviewPage />} />
        <Route path="/tender/:id/final" element={<FinalPage />} />
        <Route path="/tender/:id/audit" element={<AuditPage />} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};
