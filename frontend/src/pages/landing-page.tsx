import {
  ArrowRight,
  BadgeCheck,
  Bot,
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  FileText,
  Layers3,
  ListChecks,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
  UploadCloud,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

type Step = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const features: Feature[] = [
  {
    icon: BrainCircuit,
    title: "Automated Analysis",
    description:
      "TenderMind reads tender notices, bid submissions, annexures, and compliance forms in minutes.",
  },
  {
    icon: ListChecks,
    title: "Criteria Extraction",
    description:
      "Eligibility, technical, financial, and documentation criteria are extracted into a structured review plan.",
  },
  {
    icon: MessageSquareText,
    title: "Explainable Decisions",
    description:
      "Every recommendation includes cited evidence, confidence signals, and plain-language reasoning.",
  },
  {
    icon: BadgeCheck,
    title: "Human-in-the-loop Review",
    description:
      "Procurement teams approve, override, and annotate AI findings before final evaluation is locked.",
  },
];

const steps: Step[] = [
  {
    icon: UploadCloud,
    title: "Upload Documents",
    description:
      "Add tender files, bidder proposals, compliance forms, and supporting certificates securely.",
  },
  {
    icon: Bot,
    title: "AI Evaluates Criteria",
    description:
      "The co-pilot maps requirements to bidder evidence and flags gaps, risks, and exceptions.",
  },
  {
    icon: ClipboardCheck,
    title: "Review & Finalize",
    description:
      "Procurement officers validate decisions, record notes, and export an audit-ready evaluation pack.",
  },
];

const navLinks = ["Features", "How it Works", "About"];

const LandingPage = () => {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="relative isolate overflow-hidden border-b border-slate-200/70 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_72%)]">
        <div className="absolute left-1/2 top-0 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute right-[-6rem] top-36 -z-10 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="absolute bottom-0 left-[-8rem] -z-10 h-80 w-80 rounded-full bg-slate-300/30 blur-3xl" />

        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="flex size-9 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
              <ShieldCheck className="size-4" />
            </span>
            <span>TenderMind</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            {navLinks.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase().replaceAll(" ", "-")}`}
                className="transition-colors hover:text-slate-950"
              >
                {link}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link to="/login">Login</Link>
            </Button>
            <Button
              asChild
              className="bg-blue-600 text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700"
            >
              <Link to="/signup">Get Started</Link>
            </Button>
          </div>
        </header>

        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pb-24 lg:pt-20">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Badge
              variant="outline"
              className="mb-6 border-blue-200 bg-white/70 text-blue-700 shadow-sm backdrop-blur"
            >
              TenderMind - AI Co-Pilot for Government Procurement
            </Badge>
            <h1 className="max-w-4xl text-5xl font-semibold tracking-normal text-slate-950 sm:text-6xl lg:text-7xl">
              AI-Powered Tender Evaluation, Built for Transparency
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Upload tender and bidder documents. Get instant, explainable, and
              auditable evaluation results.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                className="h-12 rounded-xl bg-blue-600 px-6 text-base text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
              >
                <Link to="/signup">
                  Start Evaluation
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-12 rounded-xl border-slate-200 bg-white/80 px-6 text-base shadow-sm backdrop-blur hover:bg-white"
              >
                View Demo
              </Button>
            </div>
          </div>

          <Card className="animate-in fade-in slide-in-from-bottom-6 rounded-2xl border-slate-200/80 bg-white/85 p-3 shadow-2xl shadow-slate-900/10 backdrop-blur duration-700">
            <CardContent className="space-y-4 p-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white shadow-inner">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-300">Live evaluation</p>
                    <p className="mt-1 text-xl font-semibold">
                      Municipal Road Tender
                    </p>
                  </div>
                  <Badge className="bg-emerald-400 text-emerald-950">
                    82% complete
                  </Badge>
                </div>
                <div className="mt-6 grid grid-cols-3 gap-2">
                  {["Eligibility", "Technical", "Financial"].map((item) => (
                    <div
                      key={item}
                      className="rounded-xl border border-white/10 bg-white/5 p-3"
                    >
                      <CheckCircle2 className="mb-2 size-4 text-emerald-300" />
                      <p className="text-xs text-slate-300">{item}</p>
                      <p className="text-sm font-medium">Verified</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <FileText className="mb-4 size-5 text-blue-600" />
                  <p className="text-sm font-medium text-slate-950">
                    128 pages parsed
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Tender, bid forms, and certificates indexed with page
                    references.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <LockKeyhole className="mb-4 size-5 text-blue-600" />
                  <p className="text-sm font-medium text-slate-950">
                    Audit trail ready
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Reviewer actions, AI reasons, and overrides stay traceable.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="features" className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <Badge variant="secondary" className="mb-4 text-slate-700">
              Features
            </Badge>
            <h2 className="text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
              Procurement evaluation with speed, control, and evidence.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              TenderMind turns complex document reviews into structured,
              reviewable decisions that procurement teams can defend.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="rounded-2xl border-slate-200 bg-white p-2 shadow-sm shadow-slate-900/5 transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-950/10"
              >
                <CardHeader>
                  <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <feature.icon className="size-5" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription className="leading-6">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="border-y border-slate-200 bg-slate-50 px-6 py-20"
      >
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4 text-slate-700">
              How it Works
            </Badge>
            <h2 className="text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
              From upload to final recommendation in one controlled workflow.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className="relative">
                {index < steps.length - 1 && (
                  <div className="absolute left-[calc(50%+2.5rem)] top-10 hidden h-px w-[calc(100%-5rem)] bg-gradient-to-r from-blue-200 to-slate-200 md:block" />
                )}
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="flex size-20 items-center justify-center rounded-2xl border border-blue-100 bg-white text-blue-600 shadow-lg shadow-slate-900/5">
                    <step.icon className="size-7" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-950">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-slate-600">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="px-6 py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <Badge
              variant="outline"
              className="mb-4 border-blue-200 bg-blue-50 text-blue-700"
            >
              Traceability
            </Badge>
            <h2 className="text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
              Every Decision is Traceable
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              TenderMind links each pass, fail, and exception to the exact
              requirement, bidder evidence, and source page. Reviewers can see
              why the AI reached a conclusion before accepting it.
            </p>
          </div>

          <Card className="rounded-2xl border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/10">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-xl">
                    Bidder Compliance Evidence
                  </CardTitle>
                  <CardDescription>
                    Extracted from bidder submission package
                  </CardDescription>
                </div>
                <Badge className="w-fit bg-emerald-100 text-emerald-700">
                  PASS
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
                  <Layers3 className="size-4 text-blue-600" />
                  Criteria
                </div>
                <p className="text-base font-medium text-slate-950">
                  Bidder must demonstrate completion of at least three public
                  infrastructure projects in the last five financial years.
                </p>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-700">
                  <FileSearch className="size-4" />
                  Evidence snippet
                </div>
                <p className="text-sm leading-6 text-slate-700">
                  Completed four municipal drainage and road resurfacing
                  projects between FY2021 and FY2025, with certificates issued
                  by the public works departments.
                </p>
              </div>

              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-950">
                    Source reference
                  </p>
                  <p className="text-sm text-slate-500">
                    Bidder technical proposal, work completion certificates
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="w-fit border-slate-200 bg-white text-slate-700"
                >
                  Page 42
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-slate-950 px-6 py-14 text-center shadow-2xl shadow-slate-900/15 sm:px-10">
          <h2 className="text-3xl font-semibold tracking-normal text-white sm:text-4xl">
            Ready to transform procurement?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-300">
            Give your evaluation committee an AI co-pilot that accelerates
            document review while keeping accountability at the center.
          </p>
          <Button
            asChild
            className="mt-8 h-12 rounded-xl bg-blue-500 px-6 text-base text-white shadow-lg shadow-blue-500/20 hover:bg-blue-400"
          >
            <Link to="/signup">
              Get Started
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-slate-200 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-slate-950">TenderMind</p>
            <p className="mt-1">AI Co-Pilot for Government Procurement</p>
          </div>
          <div className="flex flex-wrap gap-5">
            <a
              href="#features"
              className="transition-colors hover:text-slate-950"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="transition-colors hover:text-slate-950"
            >
              How it Works
            </a>
            <a href="#about" className="transition-colors hover:text-slate-950">
              About
            </a>
          </div>
          <p>Copyright 2026 TenderMind. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
};

export default LandingPage;
