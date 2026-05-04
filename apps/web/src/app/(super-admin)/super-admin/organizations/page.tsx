"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getAccessToken } from "@/lib/auth";
import {
  useCreateSuperAdminOrganization,
  useSuperAdminOrganizations,
} from "@/hooks/useSuperAdmin";

const plans = ["starter", "growth", "business", "enterprise"];

export default function SuperAdminOrganizationsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { data, loading, reload } = useSuperAdminOrganizations(query);
  const { createOrganization, saving } = useCreateSuperAdminOrganization();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    plan: "starter",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const stats = useMemo(() => {
    const items = data?.items ?? [];
    return {
      total: data?.total ?? 0,
      active: items.filter((item) => item.isActive).length,
      connected: items.filter((item) => item.wabaConfig?.status === "VERIFIED").length,
      funded: items.filter((item) => (item.wallet?.balance ?? 0) > 0).length,
    };
  }, [data]);

  async function handleCreateOrganization() {
    setError("");
    setSuccess("");
    if (!getAccessToken()) {
      setError("Your super-admin session has expired. Redirecting to login...");
      router.push("/super-admin-login");
      return;
    }
    if (!form.name.trim() || !form.adminName.trim() || !form.adminEmail.trim() || !form.adminPassword.trim()) {
      setError("Organization name, admin name, admin email, and password are required.");
      return;
    }

    try {
      const result = await createOrganization(form);
      setSuccess(`Created ${result.org.name} with admin ${result.adminUser.email}.`);
      setForm({ name: "", slug: "", plan: "starter", adminName: "", adminEmail: "", adminPassword: "" });
      await reload();
    } catch (issue: any) {
      if (issue?.response?.status === 401 || issue?.response?.status === 403) {
        setError("Your super-admin session is invalid. Please login again.");
        router.push("/super-admin-login");
        return;
      }
      const message = issue?.response?.data?.message;
      setError(Array.isArray(message) ? message.join(" ") : message || "Failed to create organization.");
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-[28px] border-slate-200 bg-white p-7 shadow-none">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Organizations</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
                Create tenants with working admin credentials, track onboarding readiness, and operate the customer portfolio.
              </p>
            </div>
            <Badge className="bg-emerald-50 text-emerald-700">Direct admin provisioning</Badge>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Total orgs", stats.total],
              ["Active", stats.active],
              ["WABA verified", stats.connected],
              ["Wallet funded", stats.funded],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">{label}</div>
                <div className="mt-3 text-2xl font-semibold text-slate-900">{value}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-[28px] border-slate-200 bg-white p-7 shadow-none">
          <div className="text-lg font-semibold text-slate-900">Create organization</div>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            The admin can log in with the email and password you set here.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Input
          placeholder="Organization name"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          className="h-11 rounded-2xl border-slate-200 bg-slate-50 text-slate-900"
        />
        <Input
          placeholder="Slug (optional)"
          value={form.slug}
          onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
          className="h-11 rounded-2xl border-slate-200 bg-slate-50 text-slate-900"
        />
        <select
          value={form.plan}
          onChange={(event) => setForm((current) => ({ ...current, plan: event.target.value }))}
          className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none"
        >
          {plans.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
        </select>
        <div className="hidden md:block" />
        <Input
          placeholder="Admin full name"
          value={form.adminName}
          onChange={(event) => setForm((current) => ({ ...current, adminName: event.target.value }))}
          className="h-11 rounded-2xl border-slate-200 bg-slate-50 text-slate-900"
        />
        <Input
          placeholder="Admin email"
          value={form.adminEmail}
          onChange={(event) => setForm((current) => ({ ...current, adminEmail: event.target.value }))}
          className="h-11 rounded-2xl border-slate-200 bg-slate-50 text-slate-900"
        />
        <Input
          type="password"
          placeholder="Admin password"
          value={form.adminPassword}
          onChange={(event) => setForm((current) => ({ ...current, adminPassword: event.target.value }))}
          className="h-11 rounded-2xl border-slate-200 bg-slate-50 text-slate-900 md:col-span-2"
        />
          </div>
          {error ? <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
          {success ? <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}
          <Button onClick={handleCreateOrganization} disabled={saving} className="mt-6 h-11 rounded-full bg-slate-900 px-5 text-white hover:bg-slate-800">
            {saving ? "Creating organization..." : "Create organization and admin"}
          </Button>
        </Card>
      </section>

      <Card className="rounded-[28px] border-slate-200 bg-white p-7 shadow-none">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Organization directory</h3>
            <p className="mt-1 text-sm text-slate-500">Search tenants, inspect admin coverage, and drill into full org details.</p>
          </div>
          <Input
            placeholder="Search organizations"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-11 md:max-w-xs rounded-2xl border-slate-200 bg-slate-50 text-slate-900"
          />
        </div>
        <div className="mt-6 grid grid-cols-5 rounded-t-2xl bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          <span>Org</span>
          <span>Plan</span>
          <span>Users</span>
          <span>Wallet</span>
          <span>Status</span>
        </div>
        <div className="overflow-hidden rounded-b-2xl border border-t-0 border-slate-200">
          {loading && (
            <div className="px-4 py-6 text-sm text-slate-500">Loading organizations...</div>
          )}
          {!loading && (data?.items?.length ?? 0) === 0 && (
            <div className="px-4 py-6 text-sm text-slate-500">No organizations found.</div>
          )}
          {data?.items?.map((row) => (
            <Link
              key={row.id}
              href={`/super-admin/organizations/${row.id}`}
              className="grid grid-cols-5 items-center border-t border-slate-200 px-4 py-4 text-sm transition first:border-t-0 hover:bg-slate-50"
            >
              <div>
                <div className="font-semibold text-slate-900">{row.name}</div>
                <div className="text-xs text-slate-500">{row.slug}</div>
              </div>
              <span className="capitalize text-slate-700">{row.plan}</span>
              <span className="text-slate-700">{row._count?.users ?? 0}</span>
              <span className="text-slate-700">{row.wallet ? `${row.wallet.balance} ${row.wallet.currency}` : "—"}</span>
              <Badge className={row.isActive ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}>
                {row.isActive ? "Active" : "Paused"}
              </Badge>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
