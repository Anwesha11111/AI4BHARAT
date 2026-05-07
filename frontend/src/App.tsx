import { BrowserRouter } from "react-router";

import { TenderProvider } from "@/lib/tender-context";
import { AuthProvider } from "@/lib/auth-context";

import { ErrorBoundary } from "@/components/common/error-boundary";
import { AppRoutes } from "@/routes";

export const App = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <TenderProvider>
            <AppRoutes />
          </TenderProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
};
