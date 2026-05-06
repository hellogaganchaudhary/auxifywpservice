"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { setAccessToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth.store";

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: "₹2,999/mo",
    detail: "For first WhatsApp operations",
  },
  {
    id: "growth",
    name: "Growth",
    price: "₹9,999/mo",
    detail: "For growing support and marketing teams",
  },
  {
    id: "business",
    name: "Business",
    price: "Custom",
    detail: "For multi-team automation",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    detail: "For advanced scale and governance",
  },
];

export default function SignupPage() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const [selectedPlan, setSelectedPlan] = useState("starter");
  const [error, setError] = useState("");
  const [loading, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        organizationName: String(formData.get("organizationName") || ""),
        adminName: String(formData.get("adminName") || ""),
        email: String(formData.get("email") || ""),
        password,
        plan: selectedPlan,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Could not create account. Try another email.");
      }
      setAccessToken(data.accessToken);
      setUser(data.user);
      setLoading(false);
      router.push("/dashboard");
    } catch (signupError: any) {
      setError(signupError?.message || "Could not create account. Try another email.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-bg-base text-text-primary">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(37,211,102,0.22),transparent_30%),radial-gradient(circle_at_84%_10%,rgba(124,92,252,0.2),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.05),transparent)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-5 py-10 sm:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <section className="space-y-8">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/30 bg-accent-muted font-bold text-accent">W</span>
              <span className="font-display text-xl">WhatsAppAI</span>
            </Link>
            <div>
              <div className="inline-flex rounded-full border border-accent/20 bg-accent-muted px-3 py-1 text-xs uppercase tracking-[0.22em] text-accent">
                Admin self signup
              </div>
              <h1 className="mt-6 max-w-2xl text-4xl font-display leading-tight sm:text-5xl">
                Create your organization admin workspace without payment.
              </h1>
              <p className="mt-5 max-w-xl leading-7 text-text-secondary">
                Enter organization details, admin name, email address, and select a plan. The workspace opens immediately and billing can be configured later.
              </p>
            </div>
            <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
              {["No card required", "Admin access instantly", "Plan selected now", "Payment added later"].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-text-secondary">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm uppercase tracking-[0.22em] text-accent">Get started</div>
                <h2 className="mt-3 text-3xl font-display">Create admin account</h2>
              </div>
              <Link href="/login" className="text-sm text-text-secondary hover:text-text-primary">Already have account?</Link>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium sm:col-span-2">
                  Organization name
                  <input
                    name="organizationName"
                    required
                    minLength={2}
                    className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm outline-none transition placeholder:text-text-muted focus:border-accent/50 focus:ring-4 focus:ring-accent/10"
                    placeholder="Your company name"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Admin name
                  <input
                    name="adminName"
                    required
                    minLength={2}
                    className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm outline-none transition placeholder:text-text-muted focus:border-accent/50 focus:ring-4 focus:ring-accent/10"
                    placeholder="Admin full name"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Admin email address
                  <input
                    name="email"
                    type="email"
                    required
                    className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm outline-none transition placeholder:text-text-muted focus:border-accent/50 focus:ring-4 focus:ring-accent/10"
                    placeholder="admin@company.com"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Password
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm outline-none transition placeholder:text-text-muted focus:border-accent/50 focus:ring-4 focus:ring-accent/10"
                    placeholder="Minimum 8 characters"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Confirm password
                  <input
                    name="confirmPassword"
                    type="password"
                    required
                    minLength={8}
                    className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm outline-none transition placeholder:text-text-muted focus:border-accent/50 focus:ring-4 focus:ring-accent/10"
                    placeholder="Repeat password"
                  />
                </label>
              </div>

              <div>
                <div className="mb-3 text-sm font-medium">Select plan without payment</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {plans.map((plan) => {
                    const isSelected = selectedPlan === plan.id;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPlan(plan.id)}
                        className={`rounded-2xl border p-4 text-left transition ${
                          isSelected
                            ? "border-accent/60 bg-accent/10 shadow-lg shadow-accent/10"
                            : "border-white/10 bg-black/20 hover:border-white/25"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-semibold">{plan.name}</div>
                          <span className={`h-3 w-3 rounded-full border ${isSelected ? "border-accent bg-accent" : "border-white/30"}`} />
                        </div>
                        <div className="mt-2 text-sm text-accent">{plan.price}</div>
                        <div className="mt-1 text-xs text-text-secondary">{plan.detail}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {error ? <div className="rounded-2xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">{error}</div> : null}

              <Button disabled={loading} className="h-12 w-full rounded-full">
                {loading ? "Creating workspace..." : "Create admin workspace"}
              </Button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
