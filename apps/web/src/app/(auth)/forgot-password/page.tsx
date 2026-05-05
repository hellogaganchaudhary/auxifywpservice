"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import api from "@/lib/api";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim();
    try {
      await api.post("/auth/forgot-password", { email });
      setMessage("If an account exists for this email, a reset link has been sent.");
    } catch {
      setError("Unable to send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-base px-4">
      <Card className="w-full max-w-md rounded-[2rem] p-7 shadow-xl">
        <h1 className="text-2xl font-display">Reset password</h1>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          Enter your email to receive a reset link.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input name="email" type="email" placeholder="you@company.com" required />
          {message ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
          {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
          <Button disabled={loading} className="w-full rounded-full" type="submit">
            {loading ? "Sending..." : "Send reset link"}
          </Button>
        </form>
        <Link href="/login" className="mt-5 block text-center text-sm text-text-secondary hover:text-text-primary">
          Back to login
        </Link>
      </Card>
    </main>
  );
}
