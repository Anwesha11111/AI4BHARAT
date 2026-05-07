import { type ReactNode } from "react";
import { Link } from "react-router";
import {
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type FieldErrors = {
  email?: string;
  name?: string;
  password?: string;
  companyName?: string;
};

type AuthInputProps = {
  error?: string;
  icon: LucideIcon;
  id: string;
  label: string;
  placeholder: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  rightElement?: ReactNode;
};

export const AuthInput = ({
  error,
  icon: Icon,
  id,
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  rightElement,
}: AuthInputProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-slate-700">
        {label}
      </Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 rounded-xl border-slate-200 bg-white pl-10 pr-10 text-slate-950 shadow-sm transition-all placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-blue-500/20"
        />
        {rightElement}
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
};

export const PasswordToggle = ({
  showPassword,
  onToggle,
}: {
  showPassword: boolean;
  onToggle: () => void;
}) => {
  const Icon = showPassword ? EyeOff : Eye;

  return (
    <button
      type="button"
      aria-label={showPassword ? "Hide password" : "Show password"}
      onClick={onToggle}
      className="absolute right-3 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
    >
      <Icon className="size-4" />
    </button>
  );
};

export const AuthShell = ({ children }: { children: ReactNode }) => {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[0.95fr_1.05fr]">
        <section className="relative hidden overflow-hidden bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_54%,#38bdf8_100%)] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute left-16 top-24 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-14 right-10 h-72 w-72 rounded-full bg-cyan-200/20 blur-3xl" />

          <Link
            to="/"
            className="relative flex items-center gap-3 font-semibold"
          >
            <span className="flex size-10 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20 backdrop-blur">
              <ShieldCheck className="size-5" />
            </span>
            <span className="text-lg">TenderMind</span>
          </Link>

          <div className="relative max-w-xl">
            <div className="mb-6 flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-blue-50 backdrop-blur">
              <Sparkles className="size-4" />
              Transparent AI procurement review
            </div>
            <h1 className="text-5xl font-semibold tracking-normal">
              AI-powered tender evaluation with full transparency
            </h1>
            <p className="mt-5 text-lg leading-8 text-blue-50/85">
              Upload tender and bidder documents, evaluate criteria, and keep
              every decision tied to evidence your team can audit.
            </p>
          </div>

          <div className="relative grid grid-cols-3 gap-3 text-sm">
            {["Explainable", "Auditable", "Reviewer-led"].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <Link
              to="/"
              className="mb-8 flex items-center justify-center gap-3 lg:hidden"
            >
              <span className="flex size-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                <ShieldCheck className="size-5" />
              </span>
              <span className="text-lg font-semibold">TenderMind</span>
            </Link>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
};
