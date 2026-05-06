import { Link } from "react-router";
import { LayoutDashboard } from "lucide-react";

import { Button } from "@/components/ui/button";

const NotFoundPage = () => {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-normal text-slate-950">
          Page not found
        </h1>
        <Button
          asChild
          className="mt-6 h-10 rounded-xl bg-blue-600 px-4 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
        >
          <Link to="/dashboard">
            <LayoutDashboard className="size-4" />
            Go to Dashboard
          </Link>
        </Button>
      </div>
    </main>
  );
};

export default NotFoundPage;
