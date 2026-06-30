"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { loginSchema, type LoginInput } from "@/lib/validations";

interface AssignedDepartment {
  id: string;
  name: string;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  const [step, setStep] = useState<"credentials" | "department">("credentials");
  const [departments, setDepartments] = useState<AssignedDepartment[]>([]);
  const [pendingCredentials, setPendingCredentials] = useState<LoginInput | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput & { departmentId?: string }>({
    resolver: zodResolver(loginSchema),
  });

  async function completeLogin(data: LoginInput & { departmentId?: string }) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Login failed");

    if (json.data?.requiresDepartment) {
      setDepartments(json.data.departments ?? []);
      setPendingCredentials({ email: data.email, password: data.password });
      setStep("department");
      return;
    }

    toast.success(
      json.data?.user?.department
        ? `Welcome! Signed in to ${json.data.user.department.name}`
        : "Welcome back!"
    );
    const role = json.data?.user?.role;
    const destination =
      role === "HR"
        ? "/hr"
        : role === "MANAGER" || role === "DEPARTMENT_HEAD"
          ? "/manager"
          : redirect;
    router.push(destination);
    router.refresh();
  }

  async function onSubmitCredentials(data: LoginInput) {
    try {
      await completeLogin(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed.");
    }
  }

  async function onSubmitDepartment(departmentId: string) {
    if (!pendingCredentials) return;
    try {
      await completeLogin({ ...pendingCredentials, departmentId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed.");
    }
  }

  async function handleDemoLogin() {
    try {
      const res = await fetch("/api/auth/demo-login", {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Demo login failed");
      toast.success("Welcome to Kharesiya Knowledge Hub!");
      router.push(redirect);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Demo login failed");
    }
  }

  if (step === "department") {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Select your department</CardTitle>
          <CardDescription>
            Your administrator assigned you to a department. Confirm to access your training content.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DepartmentStep
            departments={departments}
            isSubmitting={isSubmitting}
            onBack={() => {
              setStep("credentials");
              setPendingCredentials(null);
            }}
            onConfirm={onSubmitDepartment}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Sign in</CardTitle>
        <CardDescription>
          Sign in with the email and password provided by your administrator
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {demoMode && (
          <>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <p className="mb-3 text-sm font-medium text-foreground">
                No database connected yet
              </p>
              <p className="mb-4 text-xs text-muted-foreground">
                Use the demo account to explore the full Knowledge Hub without Supabase.
              </p>
              <Button type="button" className="w-full" onClick={handleDemoLogin}>
                Continue with Demo Account
              </Button>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or sign in with credentials</span>
              </div>
            </div>
          </>
        )}

        <form onSubmit={handleSubmit(onSubmitCredentials)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@kharesiya.com" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input id="password" type="password" {...register("password")} />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          HR administrator?{" "}
          <Link href="/hr/login" className="text-primary hover:underline">
            Sign in to HR Panel
          </Link>
        </p>

        <p className="text-center text-sm text-muted-foreground">
          Need access? Contact your administrator to create an account.
        </p>

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/" className="text-primary hover:underline">
            ← Back to landing page
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function DepartmentStep({
  departments,
  isSubmitting,
  onBack,
  onConfirm,
}: {
  departments: AssignedDepartment[];
  isSubmitting: boolean;
  onBack: () => void;
  onConfirm: (departmentId: string) => void;
}) {
  const [selected, setSelected] = useState(departments[0]?.id ?? "");

  return (
    <>
      <div className="space-y-2">
        <Label>Assigned department</Label>
        {departments.length === 1 ? (
          <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm font-medium">
            {departments[0].name}
          </div>
        ) : (
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <p className="text-xs text-muted-foreground">
          You will only see courses, modules, and content for this department.
        </p>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
          Back
        </Button>
        <Button
          type="button"
          className="flex-1"
          disabled={!selected || isSubmitting}
          onClick={() => onConfirm(selected)}
        >
          {isSubmitting ? "Continuing..." : "Continue"}
        </Button>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center text-muted-foreground">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
