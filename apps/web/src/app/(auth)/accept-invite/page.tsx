"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import api from "@/lib/api";
import { setAccessToken } from "@/lib/auth";
import { useAuthStore } from "@/stores/auth.store";

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<InviteShell message="Loading invitation..." />}>
      <AcceptInviteForm />
    </Suspense>
  );
}

function InviteShell({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-base px-4">
      <Card className="w-full max-w-md rounded-[2rem] p-7 shadow-xl">
        <h1 className="text-2xl font-display">Accept invite</h1>
        <p className="mt-3 text-sm text-text-secondary">{message}</p>
      </Card>
    </main>
  );
}

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const [loading, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") || "").trim();
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");
    if (!token) {
      setError("Invite token is missing. Use the latest invite link from your email.");
      setSubmitting(false);
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setSubmitting(false);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setSubmitting(false);
      return;
    }
    try {
      const { data } = await api.post("/auth/invite/accept", { token, name, password });
      setAccessToken(data.accessToken);
      setUser(data.user);
      setLoading(false);
      router.push("/dashboard");
    } catch (issue: any) {
      const message = issue?.response?.data?.message;
      setError(Array.isArray(message) ? message.join(" ") : message || "Invite is invalid or expired.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-base px-4">
      <Card className="w-full max-w-md rounded-[2rem] p-7 shadow-xl">
        <h1 className="text-2xl font-display">Accept invite</h1>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          You&apos;ve been invited to join an organization.
        </p>
        {!token ? (
          <div className="mt-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Invite token is missing. Use the invite link sent to your email.
          </div>
        ) : null}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input name="name" type="text" placeholder="Full name" required />
          <Input name="password" type="password" placeholder="Password" required />
          <Input name="confirmPassword" type="password" placeholder="Confirm password" required />
          {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
          <Button disabled={loading || !token} className="w-full rounded-full" type="submit">
            {loading ? "Activating..." : "Accept invite"}
          </Button>
        </form>
        <Link href="/login" className="mt-5 block text-center text-sm text-text-secondary hover:text-text-primary">
          Already accepted? Login
        </Link>
      </Card>
    </main>
  );
}
