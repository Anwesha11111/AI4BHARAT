import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Application error boundary caught an error.", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
          <Card className="w-full max-w-md rounded-2xl border-slate-200 bg-white shadow-sm shadow-slate-900/5">
            <CardHeader className="text-center">
              <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <AlertTriangle className="size-5" />
              </div>
              <CardTitle className="text-xl text-slate-950">
                Something went wrong
              </CardTitle>
              <CardDescription>
                Reload the app or return to the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button
                asChild
                className="h-10 rounded-xl bg-blue-600 px-4 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
              >
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      );
    }

    return this.props.children;
  }
}
