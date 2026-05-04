"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSuperAdminOrganizationDetail } from "@/hooks/useSuperAdmin";

const tabs = ["Overview", "Users", "WABA", "Billing", "Audit Log"] as const;

export default function SuperAdminOrgDetailPage() {
  const params = useParams<{ id: string }>();
  const orgId = params?.id;
  const { detail, loading, updateOrganization, resendInvite, createAdmin, savingAdmin } =
    useSuperAdminOrganizationDetail(orgId || "");
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Overview");
  const [editForm, setEditForm] = useState({
    name: "",
    slug: "",
    plan: "",
  });
  const [inviteEmail, setInviteEmail] = useState("");
  const [adminForm, setAdminForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "ADMIN" as "ADMIN" | "MANAGER",
  });
  const [feedback, setFeedback] = useState<{ error?: string; success?: string }>({});

  const org = detail?.org;

  useEffect(() => {
    if (!org) return;
    setEditForm({
      name: org.name,
      slug: org.slug,
      plan: org.plan,
    });
  }, [org]);

  if (!orgId) {
    return <div className="text-sm text-slate-500">Missing org id.</div>;
  }

  if (loading) {
    return <div className="text-sm text-slate-500">Loading organization...</div>;
  }

  if (!org) {
    return <div className="text-sm text-slate-500">Organization not found.</div>;
  }

  const renderOverview = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Input
          placeholder="Org name"
          value={editForm.name}
          onChange={(event) =>
            setEditForm((prev) => ({ ...prev, name: event.target.value }))
          }
          className="h-11 rounded-2xl border-slate-200 bg-slate-50 text-slate-900"
        />
        <Input
          placeholder="Slug"
          value={editForm.slug}
          onChange={(event) =>
            setEditForm((prev) => ({ ...prev, slug: event.target.value }))
          }
          className="h-11 rounded-2xl border-slate-200 bg-slate-50 text-slate-900"
        />
        <Input
          placeholder="Plan"
          value={editForm.plan}
          onChange={(event) =>
            setEditForm((prev) => ({ ...prev, plan: event.target.value }))
          }
          className="h-11 rounded-2xl border-slate-200 bg-slate-50 text-slate-900"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() =>
            updateOrganization({
              name: editForm.name,
              slug: editForm.slug,
              plan: editForm.plan,
            })
          }
        >
          Save changes
        </Button>
        <Button
          variant="ghost"
          onClick={() => updateOrganization({ isActive: !org.isActive })}
        >
          {org.isActive ? "Deactivate" : "Activate"}
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-xs text-slate-500">Users</div>
          <div className="mt-1 text-xl font-semibold text-slate-900">{org.users.length}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-xs text-slate-500">Broadcasts</div>
          <div className="mt-1 text-xl font-semibold text-slate-900">{org.broadcasts.length}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-xs text-slate-500">Created</div>
          <div className="mt-1 text-sm text-slate-700">
            {new Date(org.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div>
      <div className="text-sm font-semibold text-slate-900">Active Users</div>
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Last Active</th>
          </tr>
        </thead>
        <tbody>
          {org.users.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>{user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleString() : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
        </div>

        <div className="rounded-[24px] bg-slate-50 p-5">
          <div className="text-sm font-semibold text-slate-900">Create organization admin</div>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Add an admin or manager with a direct email and password login.
          </p>
          <div className="mt-5 space-y-3">
            <Input
              placeholder="Full name"
              value={adminForm.name}
              onChange={(event) => setAdminForm((current) => ({ ...current, name: event.target.value }))}
              className="h-11 rounded-2xl border-slate-200 bg-white text-slate-900"
            />
            <Input
              placeholder="Email"
              value={adminForm.email}
              onChange={(event) => setAdminForm((current) => ({ ...current, email: event.target.value }))}
              className="h-11 rounded-2xl border-slate-200 bg-white text-slate-900"
            />
            <Input
              type="password"
              placeholder="Password"
              value={adminForm.password}
              onChange={(event) => setAdminForm((current) => ({ ...current, password: event.target.value }))}
              className="h-11 rounded-2xl border-slate-200 bg-white text-slate-900"
            />
            <select
              value={adminForm.role}
              onChange={(event) => setAdminForm((current) => ({ ...current, role: event.target.value as "ADMIN" | "MANAGER" }))}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
            >
              <option value="ADMIN">ADMIN</option>
              <option value="MANAGER">MANAGER</option>
            </select>
            <Button
              onClick={async () => {
                setFeedback({});
                try {
                  await createAdmin(adminForm);
                  setFeedback({ success: `Created ${adminForm.email} successfully.` });
                  setAdminForm({ name: "", email: "", password: "", role: "ADMIN" });
                } catch (issue: any) {
                  setFeedback({ error: issue?.response?.data?.message || "Failed to create admin user." });
                }
              }}
              disabled={savingAdmin}
              className="h-11 w-full rounded-full bg-slate-900 text-white hover:bg-slate-800"
            >
              {savingAdmin ? "Creating admin..." : "Create admin account"}
            </Button>
            {feedback.error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{feedback.error}</div> : null}
            {feedback.success ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{feedback.success}</div> : null}
          </div>
        </div>
      </div>

      <div className="text-sm font-semibold text-slate-900">Pending Invites</div>
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <Input
          placeholder="Owner email"
          value={inviteEmail}
          onChange={(event) => setInviteEmail(event.target.value)}
          className="h-11 rounded-2xl border-slate-200 bg-slate-50 text-slate-900"
        />
        <Button
          variant="ghost"
          onClick={() => inviteEmail && resendInvite(inviteEmail)}
        >
          Resend Invite
        </Button>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Expires</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {org.invites.map((invite) => (
            <tr key={invite.id}>
              <td>{invite.email}</td>
              <td>{invite.role}</td>
              <td>{new Date(invite.expiresAt).toLocaleDateString()}</td>
              <td>{invite.acceptedAt ? "Accepted" : "Pending"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderWaba = () => (
    <div className="space-y-4">
      {!org.wabaConfig ? (
        <div className="text-sm text-text-secondary">No WABA connected for this organization.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-md border border-border bg-bg-elevated p-4">
            <div className="text-xs text-text-muted">Business Name</div>
            <div className="mt-1 text-sm font-medium">{org.wabaConfig.businessName || "—"}</div>
          </div>
          <div className="rounded-md border border-border bg-bg-elevated p-4">
            <div className="text-xs text-text-muted">Display Number</div>
            <div className="mt-1 text-sm font-medium">{org.wabaConfig.displayNumber || "—"}</div>
          </div>
          <div className="rounded-md border border-border bg-bg-elevated p-4">
            <div className="text-xs text-text-muted">WABA ID</div>
            <div className="mt-1 text-sm font-medium break-all">{org.wabaConfig.wabaId}</div>
          </div>
          <div className="rounded-md border border-border bg-bg-elevated p-4">
            <div className="text-xs text-text-muted">Business Account ID</div>
            <div className="mt-1 text-sm font-medium break-all">{org.wabaConfig.businessAccountId}</div>
          </div>
          <div className="rounded-md border border-border bg-bg-elevated p-4">
            <div className="text-xs text-text-muted">Status</div>
            <div className="mt-1 text-sm font-medium">{org.wabaConfig.status || "Unknown"}</div>
          </div>
          <div className="rounded-md border border-border bg-bg-elevated p-4">
            <div className="text-xs text-text-muted">Verified</div>
            <div className="mt-1 text-sm font-medium">
              {org.wabaConfig.verifiedAt ? new Date(org.wabaConfig.verifiedAt).toLocaleString() : "Not verified"}
            </div>
          </div>
          <div className="rounded-md border border-border bg-bg-elevated p-4 md:col-span-2">
            <div className="text-xs text-text-muted">Quality Rating</div>
            <div className="mt-1 text-sm font-medium">{org.wabaConfig.qualityRating || "—"}</div>
          </div>
        </div>
      )}
    </div>
  );

  const renderBilling = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-md border border-border bg-bg-elevated p-4">
          <div className="text-xs text-text-muted">Wallet Balance</div>
          <div className="mt-1 text-xl font-display">
            {org.wallet ? `${org.wallet.balance} ${org.wallet.currency}` : "—"}
          </div>
        </div>
        <div className="rounded-md border border-border bg-bg-elevated p-4">
          <div className="text-xs text-text-muted">Auto Recharge</div>
          <div className="mt-1 text-sm font-medium">
            {org.wallet?.autoRechargeEnabled ? "Enabled" : "Disabled"}
          </div>
        </div>
        <div className="rounded-md border border-border bg-bg-elevated p-4">
          <div className="text-xs text-text-muted">Broadcast Spend Signals</div>
          <div className="mt-1 text-sm font-medium">{org.transactions.length} recent transactions</div>
        </div>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {org.transactions.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-sm text-text-muted">
                No transactions yet.
              </td>
            </tr>
          ) : (
            org.transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td>{transaction.type}</td>
                <td>{transaction.amount}</td>
                <td>{transaction.status}</td>
                <td>{new Date(transaction.createdAt).toLocaleString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const renderAudit = () => (
    <div className="space-y-3">
      {detail.auditLog.length === 0 ? (
        <div className="text-sm text-text-muted">No audit entries found.</div>
      ) : (
        detail.auditLog.map((entry) => (
          <div key={entry.id} className="rounded-md border border-border bg-bg-elevated p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium">{entry.action}</div>
              <div className="text-xs text-text-muted">
                {new Date(entry.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="mt-1 text-xs text-text-secondary">
              Actor: {entry.actorId} · Resource: {entry.resourceType || "—"} {entry.resourceId || ""}
            </div>
            {entry.metadata ? (
              <pre className="mt-3 overflow-auto rounded-sm bg-bg-surface p-3 text-xs text-text-secondary">
                {JSON.stringify(entry.metadata, null, 2)}
              </pre>
            ) : null}
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">{org.name}</h1>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <Badge className="bg-slate-100 text-slate-700">{org.plan}</Badge>
            <span>{org.slug}</span>
          </div>
        </div>
        <Badge className={org.isActive ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}>
          {org.isActive ? "Active" : "Paused"}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-sm border px-3 py-1 text-xs transition ${
              activeTab === tab
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <Card className="rounded-[28px] border-slate-200 bg-white p-7 shadow-none">
        {activeTab === "Overview" && renderOverview()}
        {activeTab === "Users" && renderUsers()}
        {activeTab === "WABA" && renderWaba()}
        {activeTab === "Billing" && renderBilling()}
        {activeTab === "Audit Log" && renderAudit()}
      </Card>
    </div>
  );
}
