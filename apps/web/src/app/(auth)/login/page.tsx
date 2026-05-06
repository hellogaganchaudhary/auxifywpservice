"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const trustSignals = ["Secure JWT session", "Role-aware workspace", "Organization isolated", "Audit-ready access"];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    try {
      await login(String(formData.get("email")), String(formData.get("password")));
      router.push("/dashboard");
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-bg-base text-text-primary">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(37,211,102,0.2),transparent_30%),radial-gradient(circle_at_82%_8%,rgba(124,92,252,0.17),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.045),transparent)]" />
      <div className="relative grid min-h-screen lg:grid-cols-[0.95fr_1.05fr]">
        <section className="hidden border-r border-white/10 p-10 lg:flex lg:flex-col lg:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/30 bg-accent-muted font-bold text-accent">W</span>
            <span className="font-display text-xl">WhatsAppAI</span>
          </Link>
          <div>
            <div className="inline-flex rounded-full border border-accent/20 bg-accent-muted px-3 py-1 text-xs uppercase tracking-[0.22em] text-accent">
              Enterprise console
            </div>
            <h1 className="mt-6 max-w-xl text-5xl font-display leading-tight">Access the operating system for WhatsApp Business teams.</h1>
            <p className="mt-5 max-w-lg leading-7 text-text-secondary">
              Sign in to manage conversations, campaigns, templates, analytics, billing, and governance from one premium workspace.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              {trustSignals.map((signal) => (
                <div key={signal} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-text-secondary">
                  {signal}
                </div>
              ))}
            </div>
          </div>
          <div className="text-sm text-text-muted">Protected access for invited organization members.</div>
        </section>

        <section className="flex items-center justify-center px-5 py-12 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <Link href="/" className="font-display text-xl">WhatsAppAI</Link>
              <Link href="/" className="text-sm text-text-secondary">Home</Link>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
              <div>
                <div className="text-sm uppercase tracking-[0.22em] text-accent">Welcome back</div>
                <h2 className="mt-3 text-3xl font-display">Login to dashboard</h2>
                <p className="mt-3 text-sm leading-6 text-text-secondary">
                  Use your organization account credentials. New users should accept their invite before signing in.
                </p>
              </div>
              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <label className="block text-sm font-medium">
                  Email address
                  <input
                    name="email"
                    type="email"
                    required
                    className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm outline-none transition placeholder:text-text-muted focus:border-accent/50 focus:ring-4 focus:ring-accent/10"
                    placeholder="you@company.com"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Password
                  <input
                    name="password"
                    type="password"
                    required
                    className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm outline-none transition placeholder:text-text-muted focus:border-accent/50 focus:ring-4 focus:ring-accent/10"
                    placeholder="••••••••"
                  />
                </label>
                {error ? <div className="rounded-2xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">{error}</div> : null}
                <Button disabled={loading} className="h-12 w-full rounded-full">
                  {loading ? "Signing in..." : "Sign in securely"}
                </Button>
              </form>
              <div className="mt-6 flex flex-col gap-3 text-sm text-text-secondary sm:flex-row sm:items-center sm:justify-between">
                <Link href="/forgot-password" className="hover:text-text-primary">Forgot password?</Link>
                <div className="flex gap-3">
                  <Link href="/accept-invite" className="hover:text-text-primary">Accept invite</Link>
                  <Link href="/signup" className="font-semibold text-accent hover:text-accent-hover">Create admin account</Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
