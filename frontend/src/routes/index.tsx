import { lazy } from "react";
import { Route, Routes } from "react-router";

import { AuthenticatedLayout } from "@/layouts/authenticated-layout";
import { PublicLayout } from "@/layouts/public-layout";

const DashboardPage = lazy(() => import("@/pages/dashboard/dashboard-page"));
const LandingPage = lazy(() => import("@/pages/landing-page"));
const LoginPage = lazy(() => import("@/pages/login-page"));
const NotFoundPage = lazy(() => import("@/pages/not-found-page"));
const SignupPage = lazy(() => import("@/pages/signup-page"));
const AuditPage = lazy(() => import("@/pages/tender/audit-page"));
const CriteriaPage = lazy(() => import("@/pages/tender/criteria-page"));
const EditBiddersPage = lazy(() => import("@/pages/tender/edit-bidders-page"));
const FinalPage = lazy(() => import("@/pages/tender/final-page"));
const ProcessingPage = lazy(() => import("@/pages/tender/processing-page"));
const ResultsPage = lazy(() => import("@/pages/tender/results-page"));
const ReviewPage = lazy(() => import("@/pages/tender/review-page"));
const TenderDetailsPage = lazy(
  () => import("@/pages/tender/tender-details-page"),
);
const UploadBiddersPage = lazy(
  () => import("@/pages/tender/upload-bidders-page"),
);
const UploadTenderPage = lazy(
  () => import("@/pages/tender/upload-tender-page"),
);

// Admin pages
const AdminDashboard = lazy(() => import("@/pages/admin/admin-dashboard"));
const AdminTenderDetail = lazy(() => import("@/pages/admin/admin-tender-detail"));

export const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      <Route element={<AuthenticatedLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/tender/new" element={<UploadTenderPage />} />
        <Route path="/tender/:id" element={<TenderDetailsPage />} />
        <Route
          path="/tender/:id/bidders/upload"
          element={<UploadBiddersPage />}
        />
        <Route path="/tender/:id/bidders/edit" element={<EditBiddersPage />} />
        <Route path="/tender/:id/criteria" element={<CriteriaPage />} />
        <Route path="/tender/:id/processing" element={<ProcessingPage />} />
        <Route path="/tender/:id/results" element={<ResultsPage />} />
        <Route path="/tender/:id/review" element={<ReviewPage />} />
        <Route path="/tender/:id/final" element={<FinalPage />} />
        <Route path="/tender/:id/audit" element={<AuditPage />} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/tender/:id" element={<AdminTenderDetail />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
