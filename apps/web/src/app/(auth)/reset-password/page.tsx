"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import api from "@/lib/api";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordShell message="Loading reset form..." />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordShell({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-base px-4">
      <Card className="w-full max-w-md rounded-[2rem] p-7 shadow-xl">
        <h1 className="text-2xl font-display">Set new password</h1>
        <p className="mt-3 text-sm text-text-secondary">{message}</p>
      </Card>
    </main>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");
    if (!token) {
      setError("Reset token is missing. Request a new password reset link.");
      setLoading(false);
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }
    try {
      await api.post("/auth/reset-password", { token, password });
      setSuccess("Password updated. Redirecting to login...");
      setTimeout(() => router.push("/login"), 1000);
    } catch (issue: any) {
      const message = issue?.response?.data?.message;
      setError(Array.isArray(message) ? message.join(" ") : message || "Invalid or expired reset link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-base px-4">
      <Card className="w-full max-w-md rounded-[2rem] p-7 shadow-xl">
        <h1 className="text-2xl font-display">Set new password</h1>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          Choose a secure password for your account.
        </p>
        {!token ? (
          <div className="mt-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Reset token is missing. Use the latest link from your email.
          </div>
        ) : null}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input name="password" type="password" placeholder="New password" required />
          <Input name="confirmPassword" type="password" placeholder="Confirm password" required />
          {success ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}
          {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
          <Button disabled={loading || !token} className="w-full rounded-full" type="submit">
            {loading ? "Saving..." : "Reset password"}
          </Button>
        </form>
        <Link href="/forgot-password" className="mt-5 block text-center text-sm text-text-secondary hover:text-text-primary">
          Request a new link
        </Link>
      </Card>
    </main>
  );
}
