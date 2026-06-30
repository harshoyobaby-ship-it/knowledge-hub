"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loginSchema, type LoginInput } from "@/lib/validations";

function HRLoginForm() {
  const router = useRouter();
  const [accessDenied, setAccessDenied] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "hr@kharesiya.com" },
  });

  async function onSubmit(data: LoginInput) {
    setAccessDenied(false);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Login failed");

      const role = json.data?.user?.role;
      if (role !== "HR" && role !== "SUPER_ADMIN" && role !== "ADMIN") {
        setAccessDenied(true);
        await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
        return;
      }

      toast.success("Welcome to the HR Panel");
      router.push("/hr");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed.");
    }
  }

  return (
    <Card className="border-emerald-200/60">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <Users className="h-6 w-6 text-emerald-700" />
        </div>
        <CardTitle className="text-2xl">HR Admin Panel</CardTitle>
        <CardDescription>
          Sign in with your HR administrator credentials to view employee training progress
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-4 text-sm">
          <p className="font-medium text-emerald-900">HR credentials (seeded)</p>
          <p className="mt-1 text-emerald-800">
            Email: <span className="font-mono">hr@kharesiya.com</span>
          </p>
          <p className="text-emerald-800">
            Password: <span className="font-mono">Hr@123456</span>
          </p>
        </div>

        {accessDenied && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            This login is for HR administrators only. Use the employee login instead.
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">HR email</Label>
            <Input id="email" type="email" placeholder="hr@kharesiya.com" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="••••••••" {...register("password")} />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
          <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in to HR Panel"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Employee or admin?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Use standard login
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function HRLoginPage() {
  return (
    <Suspense fallback={<div className="text-center text-muted-foreground">Loading...</div>}>
      <HRLoginForm />
    </Suspense>
  );
}
