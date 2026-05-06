import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { ArrowRight, Lock, Mail, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  AuthInput,
  AuthShell,
  PasswordToggle,
  type FieldErrors,
} from "@/components/auth/auth-components";

import { validateEmail } from "@/utils/auth-utils";

const SignupPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: FieldErrors = {};
    if (name.trim().length < 2) {
      nextErrors.name = "Enter your full name.";
    }
    if (!validateEmail(email)) {
      nextErrors.email = "Enter a valid work email address.";
    }
    if (password.length < 8) {
      nextErrors.password = "Use at least 8 characters.";
    }

    setErrors(nextErrors);
  };

  return (
    <AuthShell>
      <Card className="rounded-2xl border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/10">
        <CardHeader className="space-y-2 px-6 pt-6 text-center">
          <CardTitle className="text-3xl font-semibold tracking-normal">
            Create your account
          </CardTitle>
          <CardDescription className="text-base">
            Start evaluating tenders with transparency
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <AuthInput
              id="signup-name"
              label="Name"
              icon={User}
              value={name}
              error={errors.name}
              onChange={setName}
              placeholder="Aarav Sharma"
            />

            <AuthInput
              id="signup-email"
              label="Email"
              type="email"
              icon={Mail}
              value={email}
              error={errors.email}
              onChange={setEmail}
              placeholder="procurement@agency.gov"
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

            <Button className="h-11 w-full rounded-xl bg-blue-600 text-base text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">
              Create Account
              <ArrowRight className="size-4" />
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
