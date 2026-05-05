"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setAccessToken } from "@/lib/auth";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const { setUser, setLoading } = useAuthStore();
  const [loading, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const formData = new FormData(event.currentTarget);

    try {
      const { data } = await api.post("/auth/super-admin/login", {
        email: String(formData.get("email") || ""),
        password: String(formData.get("password") || ""),
      });
      setAccessToken(data.accessToken);
      setUser(data.user);
      setLoading(false);
      router.push("/super-admin/organizations");
    } catch {
      setError("Super-admin credentials are invalid.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-bg-base text-text-primary">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(124,92,252,0.18),transparent_28%),radial-gradient(circle_at_84%_10%,rgba(37,211,102,0.16),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent)]" />
      <div className="relative flex min-h-screen items-center justify-center px-5 py-12">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/30 backdrop-blur-xl lg:grid-cols-[0.95fr_1.05fr]">
          <section className="hidden border-r border-white/10 p-10 lg:flex lg:flex-col lg:justify-between">
            <Link href="/" className="font-display text-xl">WhatsAppAI</Link>
            <div>
              <div className="inline-flex rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-violet-200">
                Super-admin access
              </div>
              <h1 className="mt-6 text-5xl font-display leading-tight">Global control center for tenant operations.</h1>
              <p className="mt-5 max-w-lg leading-7 text-text-secondary">
                Access organizations, platform billing, audit visibility, and top-level platform governance from the privileged admin workspace.
              </p>
            </div>
            <div className="text-sm text-text-muted">Restricted to platform operators with `SUPER_ADMIN` role.</div>
          </section>

          <section className="p-6 sm:p-8 lg:p-10">
            <div className="mx-auto max-w-md">
              <div className="mb-8 flex items-center justify-between lg:hidden">
                <Link href="/" className="font-display text-xl">WhatsAppAI</Link>
                <Link href="/login" className="text-sm text-text-secondary">User login</Link>
              </div>
              <div className="text-sm uppercase tracking-[0.22em] text-violet-200">Platform administration</div>
              <h2 className="mt-3 text-3xl font-display">Super-admin sign in</h2>
              <p className="mt-3 text-sm leading-6 text-text-secondary">
                Use platform-level credentials. Standard organization users should continue through the regular login flow.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <label className="block text-sm font-medium">
                  Email address
                  <input
                    name="email"
                    type="email"
                    required
                    className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm outline-none transition placeholder:text-text-muted focus:border-violet-300/50 focus:ring-4 focus:ring-violet-300/10"
                    placeholder="admin@platform.com"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Password
                  <input
                    name="password"
                    type="password"
                    required
                    className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm outline-none transition placeholder:text-text-muted focus:border-violet-300/50 focus:ring-4 focus:ring-violet-300/10"
                    placeholder="••••••••"
                  />
                </label>
                {error ? <div className="rounded-2xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">{error}</div> : null}
                <Button disabled={loading} className="h-12 w-full rounded-full bg-violet-200 text-black hover:bg-violet-100">
                  {loading ? "Signing in..." : "Access super-admin"}
                </Button>
              </form>

              <div className="mt-6 flex items-center justify-between text-sm text-text-secondary">
                <Link href="/login" className="hover:text-text-primary">Back to user login</Link>
                <span>Platform-only route</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
