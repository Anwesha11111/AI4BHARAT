import { useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import {
  FilePlus2,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "New Evaluation",
    href: "/tender/new",
    icon: FilePlus2,
  },
];

const getPageTitle = (pathname: string) => {
  if (pathname === "/dashboard") {
    return "Dashboard";
  }

  if (pathname === "/tender/new") {
    return "Create New Tender";
  }

  if (pathname.endsWith("/bidders/upload")) {
    return "Upload Bidder Submissions";
  }

  if (pathname.endsWith("/criteria")) {
    return "Review Extracted Criteria";
  }

  if (pathname.endsWith("/processing")) {
    return "Processing";
  }

  if (pathname.endsWith("/results")) {
    return "Evaluation Results";
  }

  if (pathname.endsWith("/review")) {
    return "Review Low Confidence Cases";
  }

  if (pathname.endsWith("/final")) {
    return "Final Evaluation";
  }

  if (pathname.startsWith("/tender/")) {
    return "Tender Details";
  }

  return "TenderMind";
};

export const AuthenticatedLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { pathname } = useLocation();
  const pageTitle = useMemo(() => getPageTitle(pathname), [pathname]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-20 hidden border-r border-slate-200 bg-white px-4 py-5 transition-[width] duration-200 lg:flex lg:flex-col",
          isCollapsed ? "w-20" : "w-64",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <Link
            to="/dashboard"
            className={cn(
              "flex min-w-0 items-center gap-3 px-2 font-semibold",
              isCollapsed && "justify-center px-0",
            )}
            aria-label="TenderMind dashboard"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <ShieldCheck className="size-5" />
            </span>
            {!isCollapsed && (
              <span className="truncate text-lg">TenderMind</span>
            )}
          </Link>

          {!isCollapsed && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-lg text-slate-500"
              onClick={() => setIsCollapsed(true)}
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="size-4" />
            </Button>
          )}
        </div>

        {isCollapsed && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mx-auto mt-4 rounded-lg text-slate-500"
            onClick={() => setIsCollapsed(false)}
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="size-4" />
          </Button>
        )}

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isCollapsed && "justify-center px-0",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                )
              }
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className="size-4 shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div
        className={cn(
          "transition-[padding] duration-200",
          isCollapsed ? "lg:pl-20" : "lg:pl-64",
        )}
      >
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/85 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-4 px-6">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 font-semibold lg:hidden"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white">
                <ShieldCheck className="size-4" />
              </span>
              TenderMind
            </Link>

            <h1 className="hidden min-w-0 truncate text-lg font-semibold tracking-normal text-slate-950 lg:block">
              {pageTitle}
            </h1>

            <Avatar className="ml-auto bg-slate-950 text-white">
              <AvatarFallback className="bg-slate-950 text-sm font-semibold text-white">
                TM
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8 sm:py-10">
          <Outlet />
        </div>
      </div>
    </main>
  );
};
