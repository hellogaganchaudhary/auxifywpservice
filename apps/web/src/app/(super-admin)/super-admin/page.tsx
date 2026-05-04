"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useSuperAdminAuditLog,
  useSuperAdminOrganizations,
  useSuperAdminStats,
} from "@/hooks/useSuperAdmin";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function SuperAdminDashboardPage() {
  const { stats, loading, error: statsError } = useSuperAdminStats();
  const { data: organizations, loading: organizationsLoading, error: organizationsError } = useSuperAdminOrganizations("");
  const { data: auditLog, loading: auditLoading, error: auditError } = useSuperAdminAuditLog(6);
  const recentOrganizations = organizations?.items?.slice(0, 5) ?? [];

  const cards = [
    { label: "Organizations", value: stats?.totalOrganizations ?? 0, hint: "Tenant workspaces" },
    { label: "Active users", value: stats?.activeUsers ?? 0, hint: "Users with activity" },
    { label: "Messages today", value: stats?.messagesToday ?? 0, hint: "Since midnight" },
    { label: "Revenue", value: formatCurrency(stats?.mrr ?? 0), hint: "Credit purchases" },
  ];

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden rounded-[28px] border-slate-200 bg-white shadow-none">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-800 px-8 py-9 text-white">
            <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">
              Platform command center
            </div>
            <h2 className="mt-5 max-w-2xl text-3xl font-semibold leading-tight">
              Clean operational view for tenant growth, admin provisioning, billing, and platform health.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200">
              Create organizations, provision admins with direct credentials, track onboarding readiness, inspect WABA status, and review audit activity.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/super-admin/organizations" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100">
                Manage organizations
              </Link>
              <Link href="/super-admin/billing" className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
                Open billing
              </Link>
            </div>
          </div>
        </Card>

        <Card className="rounded-[28px] border-slate-200 bg-white p-6 shadow-none">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Super-admin scope</div>
              <div className="mt-1 text-sm text-slate-500">Fully working platform controls</div>
            </div>
            <Badge className="bg-emerald-50 text-emerald-700">Live</Badge>
          </div>
          <div className="mt-6 space-y-4 text-sm text-slate-600">
            <div className="rounded-2xl bg-slate-50 p-4">Create tenant organizations with an initial admin email and password.</div>
            <div className="rounded-2xl bg-slate-50 p-4">Add more admins or managers inside each organization.</div>
            <div className="rounded-2xl bg-slate-50 p-4">Review users, invites, WABA, billing, wallet, transactions, and audit logs.</div>
            <div className="rounded-2xl bg-slate-50 p-4">Manage platform credit packs and commercial pricing.</div>
          </div>
        </Card>
      </section>

      {(statsError || organizationsError || auditError) ? (
        <Card className="rounded-[24px] border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 shadow-none">
          {statsError || organizationsError || auditError}
        </Card>
      ) : null}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} className="rounded-[24px] border-slate-200 bg-white p-6 shadow-none">
            <div className="text-sm font-medium text-slate-500">{card.label}</div>
            <div className="mt-4 text-3xl font-semibold text-slate-900">{loading ? "—" : card.value}</div>
            <div className="mt-3 text-sm leading-6 text-slate-500">{card.hint}</div>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-[28px] border-slate-200 bg-white p-6 shadow-none">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Recent organizations</h3>
              <p className="mt-1 text-sm text-slate-500">Latest tenant workspaces.</p>
            </div>
            <Link href="/super-admin/organizations" className="text-sm font-semibold text-slate-900 hover:text-emerald-700">View all</Link>
          </div>
          <div className="mt-6 space-y-3">
            {recentOrganizations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                {organizationsLoading ? "Loading organizations..." : "No organizations found yet. Create one from Organizations."}
              </div>
            ) : recentOrganizations.map((org) => (
              <Link key={org.id} href={`/super-admin/organizations/${org.id}`} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-4 hover:bg-slate-50">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{org.name}</div>
                  <div className="mt-1 text-sm text-slate-500">{org.slug}</div>
                </div>
                <div className="text-right text-sm text-slate-500">{org._count.users} users</div>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="rounded-[28px] border-slate-200 bg-white p-6 shadow-none">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Audit activity</h3>
              <p className="mt-1 text-sm text-slate-500">Recent super-admin events.</p>
            </div>
            <Badge className="bg-slate-100 text-slate-700">Audit</Badge>
          </div>
          <div className="mt-6 space-y-4">
            {auditLog.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                {auditLoading ? "Loading audit activity..." : "No audit entries recorded."}
              </div>
            ) : auditLog.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{entry.action}</div>
                    <div className="mt-1 text-sm text-slate-500">Actor: {entry.actorId}</div>
                  </div>
                  <div className="text-xs text-slate-400">{new Date(entry.createdAt).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
