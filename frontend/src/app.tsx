import { BrowserRouter } from "react-router";

import { TenderProvider } from "@/lib/tender-context";

import { ErrorBoundary } from "@/components/common/error-boundary";
import { AppRoutes } from "@/routes";

export const App = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <TenderProvider>
          <AppRoutes />
        </TenderProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
};
