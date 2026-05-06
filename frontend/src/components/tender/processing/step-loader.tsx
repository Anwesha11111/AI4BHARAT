import {
  CheckCircle2,
  FileSearch,
  ListChecks,
  LoaderCircle,
  Scale,
} from "lucide-react";

import { cn } from "@/lib/utils";

type ProcessingStep = {
  description: string;
  icon: typeof FileSearch;
  title: string;
};

type StepLoaderProps = {
  currentStep: number;
  progress: number;
};

const steps: ProcessingStep[] = [
  {
    description: "Reading tender and bidder PDFs",
    icon: FileSearch,
    title: "Extracting text",
  },
  {
    description: "Finding eligibility and scoring rules",
    icon: ListChecks,
    title: "Extracting criteria",
  },
  {
    description: "Comparing each bidder against requirements",
    icon: Scale,
    title: "Evaluating bidders",
  },
];

export const StepLoader = ({ currentStep, progress }: StepLoaderProps) => {
  return (
    <div className="mx-auto flex min-h-[520px] w-full max-w-3xl flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center shadow-sm shadow-slate-900/5">
      <div className="relative flex size-20 items-center justify-center rounded-full bg-blue-50 text-blue-600">
        <LoaderCircle className="size-10 animate-spin" />
        <div className="absolute inset-0 rounded-full border border-blue-100" />
      </div>

      <h2 className="mt-6 text-2xl font-semibold tracking-normal text-slate-950">
        Processing tender
      </h2>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        TenderMind is preparing criteria-level decisions for each bidder.
      </p>

      <div className="mt-8 w-full max-w-xl">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">
            Evaluation progress
          </span>
          <span className="font-semibold text-slate-950">{progress}%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-8 grid w-full gap-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isComplete = index < currentStep;
          const isActive = index === currentStep;

          return (
            <div
              key={step.title}
              className={cn(
                "flex items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-500",
                isActive
                  ? "border-blue-200 bg-blue-50 shadow-sm"
                  : "border-slate-200 bg-slate-50",
                isComplete && "border-emerald-200 bg-emerald-50",
              )}
            >
              <div
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm",
                  isActive && "text-blue-600",
                  isComplete && "text-emerald-600",
                  !isActive && !isComplete && "text-slate-400",
                )}
              >
                {isComplete ? (
                  <CheckCircle2 className="size-5" />
                ) : (
                  <Icon className={cn("size-5", isActive && "animate-pulse")} />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-slate-950">{step.title}</p>
                <p className="text-sm text-slate-500">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
