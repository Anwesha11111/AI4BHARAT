import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowRight, Lock, Loader2, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import {
  AuthInput,
  AuthShell,
  PasswordToggle,
  type FieldErrors,
} from "@/components/auth/auth-components";

import { validateEmail } from "@/utils/auth-utils";
import { useAuth } from "@/lib/auth-context";

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: FieldErrors = {};
    if (!validateEmail(email)) {
      nextErrors.email = "Enter a valid work email address.";
    }
    if (!password) {
      nextErrors.password = "Password is required.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setErrors({ password: err instanceof Error ? err.message : "Login failed" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <Card className="rounded-2xl border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/10">
        <CardHeader className="space-y-2 px-6 pt-6 text-center">
          <CardTitle className="text-3xl font-semibold tracking-normal">
            Welcome back
          </CardTitle>
          <CardDescription className="text-base">
            Login to your account
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <AuthInput
              id="login-email"
              label="Email"
              type="email"
              icon={Mail}
              value={email}
              error={errors.email}
              onChange={setEmail}
              placeholder="procurement@agency.gov"
            />

            <AuthInput
              id="login-password"
              label="Password"
              type={showPassword ? "text" : "password"}
              icon={Lock}
              value={password}
              error={errors.password}
              onChange={setPassword}
              placeholder="Enter your password"
              rightElement={
                <PasswordToggle
                  showPassword={showPassword}
                  onToggle={() => setShowPassword((current) => !current)}
                />
              }
            />

            <div className="flex items-center justify-between gap-4">
              <Label
                htmlFor="remember-me"
                className="flex cursor-pointer items-center gap-2 text-sm font-normal text-slate-600"
              >
                <Checkbox
                  id="remember-me"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  className="border-slate-300 data-checked:bg-blue-600 data-checked:border-blue-600"
                />
                Remember me
              </Label>
              <a
                href="#forgot-password"
                className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
              >
                Forgot password?
              </a>
            </div>

            <Button
              className="h-11 w-full rounded-xl bg-blue-600 text-base text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  Login
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-xl border-slate-200 bg-white text-base shadow-sm hover:bg-slate-50"
            >
              <span className="flex size-5 items-center justify-center rounded-full border border-slate-300 text-xs font-semibold text-slate-700">
                G
              </span>
              Continue with Google
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Don&apos;t have an account?{" "}
            <Link
              to="/signup"
              className="font-medium text-blue-600 transition-colors hover:text-blue-700"
            >
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthShell>
  );
};

export default LoginPage;
