import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowRight, Building2, Loader2, Lock, Mail, Shield, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

import {
  AuthInput,
  AuthShell,
  PasswordToggle,
  type FieldErrors,
} from "@/components/auth/auth-components";

import { validateEmail } from "@/utils/auth-utils";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

type Role = "company" | "admin";

const SignupPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [role, setRole] = useState<Role>("company");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: FieldErrors = {};
    if (name.trim().length < 2) {
      nextErrors.name = "Enter your full name.";
    }
    if (!validateEmail(email)) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (password.length < 8) {
      nextErrors.password = "Use at least 8 characters.";
    }
    if (role === "company" && companyName.trim().length < 2) {
      nextErrors.companyName = "Enter your company name.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await register(email, password, role, name, role === "company" ? companyName : undefined);
      navigate(role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setErrors({ email: err instanceof Error ? err.message : "Registration failed" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <Card className="rounded-2xl border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/10">
        <CardHeader className="space-y-2 px-6 pt-6 text-center">
          <CardTitle className="text-3xl font-semibold tracking-normal">
            Create your account
          </CardTitle>
          <CardDescription className="text-base">
            Join TenderMind for transparent tender evaluation
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                I am registering as
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("company")}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                    role === "company"
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  )}
                >
                  <Building2 className="size-6" />
                  <span className="text-sm font-medium">Company</span>
                  <span className="text-xs text-slate-500">Submit tenders</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("admin")}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                    role === "admin"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  )}
                >
                  <Shield className="size-6" />
                  <span className="text-sm font-medium">Admin</span>
                  <span className="text-xs text-slate-500">Review & approve</span>
                </button>
              </div>
            </div>

            <AuthInput
              id="signup-name"
              label="Full Name"
              icon={User}
              value={name}
              error={errors.name}
              onChange={setName}
              placeholder="Aarav Sharma"
            />

            {role === "company" && (
              <AuthInput
                id="signup-company"
                label="Company Name"
                icon={Building2}
                value={companyName}
                error={errors.companyName}
                onChange={setCompanyName}
                placeholder="Acme Technologies Pvt Ltd"
              />
            )}

            <AuthInput
              id="signup-email"
              label="Email"
              type="email"
              icon={Mail}
              value={email}
              error={errors.email}
              onChange={setEmail}
              placeholder={role === "company" ? "contact@company.com" : "admin@agency.gov"}
            />

            <AuthInput
              id="signup-password"
              label="Password"
              type={showPassword ? "text" : "password"}
              icon={Lock}
              value={password}
              error={errors.password}
              onChange={setPassword}
              placeholder="Create a secure password"
              rightElement={
                <PasswordToggle
                  showPassword={showPassword}
                  onToggle={() => setShowPassword((current) => !current)}
                />
              }
            />

            <Button
              className={cn(
                "h-11 w-full rounded-xl text-base text-white shadow-lg hover:opacity-90",
                role === "company"
                  ? "bg-blue-600 shadow-blue-600/20"
                  : "bg-emerald-600 shadow-emerald-600/20"
              )}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  Create {role === "company" ? "Company" : "Admin"} Account
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-blue-600 transition-colors hover:text-blue-700"
            >
              Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthShell>
  );
};

export default SignupPage;
