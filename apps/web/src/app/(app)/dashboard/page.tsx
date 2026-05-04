"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useContacts } from "@/hooks/useContacts";
import { useInbox } from "@/hooks/useInbox";
import { useOrganization } from "@/hooks/useOrganization";
import { useTemplates } from "@/hooks/useAnalytics";

function shortValue(value?: string | null) {
  if (!value) return "Not configured";
  if (value.length <= 16) return value;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

function readinessTone(isReady: boolean, isPartial?: boolean) {
  if (isReady) return "success" as const;
  if (isPartial) return "warning" as const;
  return "error" as const;
}

export default function DashboardPage() {
  const [templateSyncing, setTemplateSyncing] = useState(false);
  const [templateSyncMessage, setTemplateSyncMessage] = useState<string | null>(null);
  const { user } = useAuth();
  const { organization, wabaConfig, loading: orgLoading } = useOrganization();
  const { contacts, stats, importing, loading: contactsLoading } = useContacts();
  const { conversations, loading: inboxLoading } = useInbox();
  const { templates, loading: templatesLoading, error: templatesError, reload: reloadTemplates, syncMetaTemplates } = useTemplates();

  const whatsappConnected = Boolean(wabaConfig?.wabaId && wabaConfig?.phoneNumberId && wabaConfig?.accessToken);
  const whatsappVerified = Boolean(wabaConfig?.verifiedAt || wabaConfig?.status === "VERIFIED");
  const approvedTemplates = templates.filter((template) => template.status === "APPROVED");
  const marketingTemplates = approvedTemplates.filter((template) => template.category === "MARKETING").length;
  const utilityTemplates = approvedTemplates.filter((template) => template.category === "UTILITY").length;
  const openConversations = conversations.filter((item) => item.status === "OPEN").length;
  const pendingConversations = conversations.filter((item) => item.status === "PENDING").length;
  const latestConversation = conversations[0];
  const adminName = user?.name || "Workspace admin";
  const organizationName = orgLoading ? "Loading organization…" : organization?.name || "Organization not configured";

  const kpis = [
    {
      label: "CRM leads",
      value: contactsLoading ? "…" : stats.totalContacts.toLocaleString(),
      detail: `${stats.taggedContacts.toLocaleString()} tagged leads`,
      tone: "success" as const,
    },
    {
      label: "Inbox conversations",
      value: inboxLoading ? "…" : conversations.length.toLocaleString(),
      detail: `${openConversations} open · ${pendingConversations} pending`,
      tone: "default" as const,
    },
    {
      label: "WhatsApp sending",
      value: whatsappVerified ? "Ready" : whatsappConnected ? "Review" : "Setup",
      detail: whatsappVerified ? "Available for outbound messages" : "Add credentials and verify",
      tone: readinessTone(whatsappVerified, whatsappConnected),
    },
    {
      label: "Segments & tags",
      value: stats.totalTags.toLocaleString(),
      detail: "CRM labels available",
      tone: "default" as const,
    },
  ];

  const crmChecklist = [
    ["Organization profile", Boolean(organization?.name), "/settings/organization"],
    ["Admin visible name", Boolean(user?.name), "/settings/profile"],
    ["WhatsApp WABA ID", Boolean(wabaConfig?.wabaId), "/settings/whatsapp"],
    ["Phone number ID", Boolean(wabaConfig?.phoneNumberId), "/settings/whatsapp"],
    ["Access token", Boolean(wabaConfig?.accessToken), "/settings/whatsapp"],
    ["Lead database", contacts.length > 0, "/contacts"],
  ] as const;

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-slate-950">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#ffffff,#f8fafc_45%,#ecfdf5)] p-6 shadow-sm md:p-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.42fr] lg:items-end">
          <div>
            <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
              Organization admin panel
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-display leading-tight text-slate-950 md:text-5xl">
              {organizationName}
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-slate-600">
              Complete CRM workspace for admin details, organization setup, lead uploads, WhatsApp profile, inbox conversations, templates, and sending readiness.
            </p>
          </div>
          <div className="flex flex-col gap-3 lg:items-stretch lg:justify-end">
            <Link href="/broadcasts"><Button className="w-full rounded-full px-6">Create broadcast campaign</Button></Link>
            <Link href="/contacts"><Button className="w-full rounded-full px-6">Upload leads</Button></Link>
            <Link href="/templates"><Button variant="ghost" className="w-full rounded-full px-6">Templates homepage</Button></Link>
            <Link href="/templates/new"><Button variant="ghost" className="w-full rounded-full px-6">Create template</Button></Link>
            <Link href="/settings/whatsapp"><Button variant="ghost" className="w-full rounded-full px-6">Connect WhatsApp</Button></Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="rounded-[1.5rem] border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm font-medium text-slate-500">{kpi.label}</div>
              <Badge tone={kpi.tone}>{kpi.detail}</Badge>
            </div>
            <div className="mt-5 text-4xl font-display text-slate-950">{kpi.value}</div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-3/4 rounded-full bg-emerald-500" />
            </div>
          </Card>
        ))}
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-emerald-200 bg-[linear-gradient(135deg,#022c22,#065f46_45%,#10b981)] p-6 text-white shadow-sm md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-50">
              Broadcast command center
            </div>
            <h2 className="mt-4 text-3xl font-display md:text-4xl">Create marketing and utility WhatsApp campaigns</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/90">
              Use approved Meta templates, select all contacts, tags, segments, or imported CSV contact IDs, then send now or schedule. This is the dashboard shortcut for bulk marketing and utility messages.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/broadcasts"><Button className="rounded-full bg-white px-6 text-emerald-700 hover:bg-emerald-50">Create new broadcast</Button></Link>
              <Link href="/templates"><Button variant="ghost" className="rounded-full border border-white/30 px-6 text-white hover:bg-white/10">Check approved templates</Button></Link>
              <Link href="/contacts"><Button variant="ghost" className="rounded-full border border-white/30 px-6 text-white hover:bg-white/10">Prepare audience</Button></Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <div className="text-3xl font-display">{approvedTemplates.length}</div>
              <div className="mt-1 text-xs uppercase tracking-wide text-emerald-50/80">Approved templates</div>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <div className="text-3xl font-display">{marketingTemplates}</div>
              <div className="mt-1 text-xs uppercase tracking-wide text-emerald-50/80">Marketing ready</div>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <div className="text-3xl font-display">{utilityTemplates}</div>
              <div className="mt-1 text-xs uppercase tracking-wide text-emerald-50/80">Utility ready</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-display text-slate-950">Organization and admin details</h2>
              <p className="mt-1 text-sm text-slate-500">Visible workspace identity used across CRM, team, inbox, and campaigns.</p>
            </div>
            <Link href="/settings/organization" className="text-sm font-medium text-emerald-700">Edit organization</Link>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Organization name</div>
              <div className="mt-2 text-lg font-semibold text-slate-950">{organizationName}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Workspace slug</div>
              <div className="mt-2 text-lg font-semibold text-slate-950">{organization?.slug || "Not configured"}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Admin visible name</div>
              <div className="mt-2 text-lg font-semibold text-slate-950">{adminName}</div>
              <div className="mt-1 truncate text-xs text-slate-500">{user?.email || "No email loaded"}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Role</div>
              <div className="mt-2 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">{user?.role || "ADMIN"}</div>
            </div>
          </div>
        </Card>

        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-display text-slate-950">WhatsApp profile</h2>
              <p className="mt-1 text-sm text-slate-500">WABA ID, phone number ID, access token, and sending availability.</p>
            </div>
            <Badge tone={readinessTone(whatsappVerified, whatsappConnected)}>
              {whatsappVerified ? "Verified" : whatsappConnected ? "Needs verification" : "Not connected"}
            </Badge>
          </div>
          <div className="mt-6 space-y-3">
            {[
              ["WABA ID", shortValue(wabaConfig?.wabaId)],
              ["Phone number ID", shortValue(wabaConfig?.phoneNumberId)],
              ["Business account ID", shortValue(wabaConfig?.businessAccountId)],
              ["Display number", wabaConfig?.displayNumber || "Not synced"],
              ["Business name", wabaConfig?.businessName || "Not synced"],
              ["Sending availability", whatsappVerified ? "Available for sending" : "Connect and verify to send"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <span className="text-slate-500">{label}</span>
                <span className="text-right font-medium text-slate-950">{value}</span>
              </div>
            ))}
          </div>
          <Link href="/settings/whatsapp"><Button className="mt-5 rounded-full">Manage WhatsApp credentials</Button></Link>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-display text-slate-950">CRM and lead upload</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">Add contacts manually, upload CSV leads, map CRM columns, create segments, and enrich custom fields.</p>
          <div className="mt-5 flex items-center justify-between rounded-2xl bg-slate-50 p-4 text-sm">
            <span className="text-slate-500">CSV import</span>
            <Badge tone={importing ? "warning" : "success"}>{importing ? "Importing" : "Ready"}</Badge>
          </div>
          <Link href="/contacts"><Button variant="ghost" className="mt-5 rounded-full">Open CRM leads</Button></Link>
        </Card>

        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-display text-slate-950">WhatsApp inbox</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">Handle customer conversations, assign owners, add labels, save views, write notes, and send replies.</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 p-4"><div className="text-2xl font-display text-slate-950">{openConversations}</div><div className="text-xs text-slate-500">Open</div></div>
            <div className="rounded-2xl bg-slate-50 p-4"><div className="text-2xl font-display text-slate-950">{pendingConversations}</div><div className="text-xs text-slate-500">Pending</div></div>
          </div>
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            Latest: {latestConversation?.contact?.name || "No conversations yet"}
          </div>
          <Link href="/inbox"><Button variant="ghost" className="mt-5 rounded-full">Open inbox</Button></Link>
        </Card>

        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-display text-slate-950">Templates</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">Fetch existing templates, create marketing/utility/authentication templates, and submit them to Meta.</p>
            </div>
            <Badge tone={templates.length > 0 ? "success" : "warning"}>{templatesLoading ? "Loading" : `${templates.length} found`}</Badge>
          </div>
          <div className="mt-5 space-y-2">
            {templateSyncMessage ? (
              <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">{templateSyncMessage}</div>
            ) : null}
            {templatesError ? (
              <div className="rounded-2xl border border-error/30 bg-error/10 p-4 text-sm text-error">
                <div>{templatesError}</div>
                <button type="button" className="mt-2 text-xs font-semibold underline" onClick={reloadTemplates}>Retry fetch</button>
              </div>
            ) : templatesLoading ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Fetching templates…</div>
            ) : templates.length === 0 ? (
              <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">No templates yet. Create the first template from here.</div>
            ) : (
              templates.slice(0, 3).map((template) => (
                <div key={template.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-950">{template.name}</div>
                    <div className="text-xs text-slate-500">{template.category} · {template.language.toUpperCase()}</div>
                  </div>
                  <Badge tone={template.status === "APPROVED" ? "success" : template.status === "REJECTED" ? "error" : "warning"}>{template.status}</Badge>
                </div>
              ))
            )}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/templates/new"><Button className="rounded-full">+ Create New Template</Button></Link>
            <Link href="/templates"><Button variant="ghost" className="rounded-full">View templates</Button></Link>
            <Button
              variant="ghost"
              className="rounded-full"
              disabled={templateSyncing}
              onClick={async () => {
                setTemplateSyncing(true);
                setTemplateSyncMessage(null);
                try {
                  const result = await syncMetaTemplates();
                  setTemplateSyncMessage(`Synced ${result.count || 0} templates from Meta.`);
                } catch (syncError: any) {
                  setTemplateSyncMessage(syncError?.response?.data?.message || "Meta template sync failed.");
                } finally {
                  setTemplateSyncing(false);
                }
              }}
            >
              {templateSyncing ? "Syncing…" : "Sync from Meta"}
            </Button>
          </div>
        </Card>

        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-display text-slate-950">CRM readiness</h2>
          <div className="mt-5 space-y-2">
            {crmChecklist.map(([label, done, href]) => (
              <Link key={label} href={href} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm transition hover:bg-slate-100">
                <span className="text-slate-600">{label}</span>
                <Badge tone={done ? "success" : "warning"}>{done ? "Done" : "Pending"}</Badge>
              </Link>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
