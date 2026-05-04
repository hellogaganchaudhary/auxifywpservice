"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useBroadcasts, useTemplates } from "@/hooks/useAnalytics";

type WizardStep = 1 | 2 | 3;

function statusTone(status: string) {
  if (status === "COMPLETED") return "success" as const;
  if (status === "FAILED" || status === "CANCELLED") return "error" as const;
  if (status === "SCHEDULED" || status === "RUNNING") return "warning" as const;
  return "default" as const;
}

export default function BroadcastsPage() {
  const [status, setStatus] = useState("");
  const [step, setStep] = useState<WizardStep>(1);
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [audienceType, setAudienceType] = useState("TAG");
  const [audienceValue, setAudienceValue] = useState("");
  const [variableOne, setVariableOne] = useState("");
  const [sendMode, setSendMode] = useState<"now" | "schedule">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, any> | null>(null);
  const [saving, setSaving] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipientStatus, setRecipientStatus] = useState("");
  const [recipientPage, setRecipientPage] = useState(1);

  const { templates } = useTemplates();
  const {
    broadcasts,
    loading,
    createBroadcast,
    sendBroadcast,
    scheduleBroadcast,
    cancelBroadcast,
    getBroadcastAnalytics,
  } = useBroadcasts(status || undefined);

  const selected = useMemo(
    () => broadcasts.find((item) => item.id === selectedId) ?? null,
    [broadcasts, selectedId]
  );

  const filteredRecipients = useMemo(() => {
    const recipients = details?.recipients ?? [];
    return recipients.filter((recipient: any) => {
      const matchesSearch = recipientSearch
        ? String(recipient.phone || "").toLowerCase().includes(recipientSearch.toLowerCase())
        : true;
      const matchesStatus = recipientStatus ? recipient.status === recipientStatus : true;
      return matchesSearch && matchesStatus;
    });
  }, [details?.recipients, recipientSearch, recipientStatus]);

  const paginatedRecipients = useMemo(() => {
    const start = (recipientPage - 1) * 10;
    return filteredRecipients.slice(start, start + 10);
  }, [filteredRecipients, recipientPage]);

  const totalRecipientPages = Math.max(1, Math.ceil(filteredRecipients.length / 10));
  const approvedTemplates = useMemo(
    () => templates.filter((template) => template.status === "APPROVED"),
    [templates]
  );
  const selectedTemplate = templates.find((template) => template.id === templateId);

  const exportRecipients = () => {
    const rows: Array<Array<string>> = [
      ["phone", "status", "error", "sentAt", "deliveredAt", "readAt"],
      ...filteredRecipients.map((recipient: any) => [
        recipient.phone || "",
        recipient.status || "",
        recipient.error || "",
        recipient.sentAt || "",
        recipient.deliveredAt || "",
        recipient.readAt || "",
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selected?.name || "broadcast"}-recipients.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-accent/30 bg-gradient-to-br from-accent-muted via-bg-surface to-bg-elevated p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge tone="success">Bulk WhatsApp Campaigns</Badge>
            <h1 className="mt-3 text-2xl font-display">Send marketing and utility template messages in bulk</h1>
            <p className="mt-2 max-w-3xl text-sm text-text-secondary">
              Use approved Meta templates to message all contacts, a tag, a segment, or imported lead lists. Normal inbox text is only for the 24-hour window; broadcasts are for approved marketing and utility template sends.
            </p>
          </div>
          <div className="grid min-w-[220px] gap-2 rounded-lg border border-border bg-bg-surface p-4 text-sm shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-text-secondary">Approved templates</span>
              <span className="font-display">{approvedTemplates.length}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-text-secondary">Campaigns</span>
              <span className="font-display">{broadcasts.length}</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-display">Broadcasts</h2>
          <p className="text-sm text-text-secondary">
            Create broadcast campaigns, send now or schedule, and monitor delivery funnel.
          </p>
        </div>
        <select
          className="h-10 rounded-sm border border-border bg-bg-surface px-3 text-sm"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="RUNNING">Running</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-display">Bulk marketing / utility broadcast wizard</div>
              <div className="text-xs text-text-muted">Step {step} of 3: choose an approved template, choose bulk audience, then send now or schedule.</div>
            </div>
            <Badge>Step {step}/3</Badge>
          </div>

          <div className="mt-5 space-y-4">
            {step === 1 ? (
              <>
                <input
                  className="h-10 w-full rounded-sm border border-border bg-bg-surface px-3 text-sm"
                  placeholder="Campaign name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <select
                  className="h-10 w-full rounded-sm border border-border bg-bg-surface px-3 text-sm"
                  value={templateId}
                  onChange={(event) => setTemplateId(event.target.value)}
                >
                  <option value="">Select approved marketing or utility template</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} · {template.category} · {template.status}
                    </option>
                  ))}
                </select>
                {selectedTemplate && selectedTemplate.status !== "APPROVED" ? (
                  <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                    This template is {selectedTemplate.status}. Meta only allows bulk sends with approved templates.
                  </div>
                ) : null}
                <input
                  className="h-10 w-full rounded-sm border border-border bg-bg-surface px-3 text-sm"
                  placeholder="Variable {{1}}"
                  value={variableOne}
                  onChange={(event) => setVariableOne(event.target.value)}
                />
              </>
            ) : null}

            {step === 2 ? (
              <>
                <select
                  className="h-10 w-full rounded-sm border border-border bg-bg-surface px-3 text-sm"
                  value={audienceType}
                  onChange={(event) => setAudienceType(event.target.value)}
                >
                  <option value="ALL">All contacts / all leads</option>
                  <option value="TAG">Contacts by tag</option>
                  <option value="SEGMENT">Contacts by segment</option>
                  <option value="CSV">Imported CSV contact IDs</option>
                </select>
                <input
                  className="h-10 w-full rounded-sm border border-border bg-bg-surface px-3 text-sm"
                  placeholder={audienceType === "ALL" ? "No value needed for all contacts" : audienceType === "TAG" ? "Tag name, for example: hot-lead" : audienceType === "SEGMENT" ? "Segment ID" : "Comma-separated contact IDs from import"}
                  value={audienceValue}
                  disabled={audienceType === "ALL"}
                  onChange={(event) => setAudienceValue(event.target.value)}
                />
                <div className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-xs text-text-secondary">
                  Bulk broadcasts send approved template messages only. Select Marketing or Utility templates from Meta-approved templates.
                </div>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant={sendMode === "now" ? "solid" : "ghost"} onClick={() => setSendMode("now")}>
                    Send now
                  </Button>
                  <Button variant={sendMode === "schedule" ? "solid" : "ghost"} onClick={() => setSendMode("schedule")}>
                    Schedule
                  </Button>
                </div>
                {sendMode === "schedule" ? (
                  <input
                    type="datetime-local"
                    className="h-10 w-full rounded-sm border border-border bg-bg-surface px-3 text-sm"
                    value={scheduledAt}
                    onChange={(event) => setScheduledAt(event.target.value)}
                  />
                ) : null}

                <div className="rounded-md border border-border bg-bg-elevated p-4 text-sm">
                  <div className="font-medium">Review</div>
                  <div className="mt-2 text-text-secondary">Name: {name || "—"}</div>
                  <div className="text-text-secondary">Template: {templates.find((t) => t.id === templateId)?.name || "—"}</div>
                  <div className="text-text-secondary">Audience: {audienceType} {audienceValue ? `· ${audienceValue}` : ""}</div>
                  <div className="text-text-secondary">Delivery: {sendMode === "now" ? "Immediate" : scheduledAt || "Not set"}</div>
                </div>
              </>
            ) : null}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="ghost" disabled={step === 1} onClick={() => setStep((value) => Math.max(1, value - 1) as WizardStep)}>
              Previous
            </Button>
            {step < 3 ? (
              <Button onClick={() => setStep((value) => Math.min(3, value + 1) as WizardStep)}>Next</Button>
            ) : (
              <Button
                disabled={saving || !name.trim() || !templateId || selectedTemplate?.status !== "APPROVED"}
                onClick={async () => {
                  setSaving(true);
                  const created = await createBroadcast({
                    name,
                    templateId,
                    templateVariables: variableOne ? { "1": variableOne } : undefined,
                    audience:
                      audienceType === "ALL"
                        ? { type: "ALL" }
                        : audienceType === "TAG"
                          ? { type: "TAG", tag: audienceValue }
                          : audienceType === "SEGMENT"
                            ? { type: "SEGMENT", segmentId: audienceValue }
                            : { type: "CSV", contactIds: audienceValue.split(",").map((value) => value.trim()).filter(Boolean) },
                    scheduledAt: sendMode === "schedule" ? scheduledAt : null,
                  });

                  if (sendMode === "schedule" && scheduledAt) {
                    await scheduleBroadcast(created.id, scheduledAt);
                  } else {
                    await sendBroadcast(created.id);
                  }

                  setSaving(false);
                  setStep(1);
                  setName("");
                  setTemplateId("");
                  setAudienceValue("");
                  setVariableOne("");
                  setScheduledAt("");
                }}
              >
                {saving ? "Saving..." : "Create campaign"}
              </Button>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-sm font-display">Campaign analytics</div>
          <div className="mt-1 text-xs text-text-muted">Pick a campaign to inspect delivery funnel metrics.</div>
          <div className="mt-4 space-y-3">
            {selected ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">{selected.name}</div>
                    <div className="text-xs text-text-muted">{selected.status}</div>
                  </div>
                  <Badge tone={statusTone(selected.status)}>{selected.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                  <div className="rounded-md bg-bg-elevated p-3">
                    <div className="text-[10px] uppercase text-text-muted">Sent</div>
                    <div className="mt-1 font-medium">{details?.sent ?? selected.stats?.sent ?? 0}</div>
                  </div>
                  <div className="rounded-md bg-bg-elevated p-3">
                    <div className="text-[10px] uppercase text-text-muted">Delivered</div>
                    <div className="mt-1 font-medium">{details?.delivered ?? selected.stats?.delivered ?? 0}</div>
                  </div>
                  <div className="rounded-md bg-bg-elevated p-3">
                    <div className="text-[10px] uppercase text-text-muted">Read</div>
                    <div className="mt-1 font-medium">{details?.read ?? selected.stats?.read ?? 0}</div>
                  </div>
                  <div className="rounded-md bg-bg-elevated p-3">
                    <div className="text-[10px] uppercase text-text-muted">Failed</div>
                    <div className="mt-1 font-medium">{details?.failed ?? selected.stats?.failed ?? 0}</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 text-xs text-text-secondary md:grid-cols-3">
                  <div className="rounded-md border border-border bg-bg-surface p-3">
                    Delivery rate: {details?.deliveryRate ?? 0}%
                  </div>
                  <div className="rounded-md border border-border bg-bg-surface p-3">
                    Read rate: {details?.readRate ?? 0}%
                  </div>
                  <div className="rounded-md border border-border bg-bg-surface p-3">
                    Failure rate: {details?.failureRate ?? 0}%
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary md:grid-cols-4">
                  <div className="rounded-md border border-border bg-bg-surface p-3">
                    Audience: {details?.audience ?? selected.audience?.count ?? 0}
                  </div>
                  <div className="rounded-md border border-border bg-bg-surface p-3">
                    Replied: {details?.replied ?? selected.stats?.replied ?? 0}
                  </div>
                  <div className="rounded-md border border-border bg-bg-surface p-3">
                    Pending: {Math.max((details?.audience ?? 0) - (details?.sent ?? 0) - (details?.failed ?? 0), 0)}
                  </div>
                  <div className="rounded-md border border-border bg-bg-surface p-3">
                    Completion: {details?.audience ? Math.round((((details?.sent ?? 0) + (details?.failed ?? 0)) / details.audience) * 100) : 0}%
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      if (!selectedId) return;
                      const analytics = await getBroadcastAnalytics(selectedId);
                      setDetails(analytics);
                    }}
                  >
                    Refresh analytics
                  </Button>
                  <Button variant="destructive" onClick={() => selectedId && cancelBroadcast(selectedId)}>
                    Cancel campaign
                  </Button>
                </div>
                <div className="rounded-md border border-border bg-bg-elevated p-3">
                  <div className="text-xs uppercase text-text-muted">Recent recipients</div>
                  <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_180px]">
                    <input
                      className="h-9 rounded-sm border border-border bg-bg-surface px-3 text-xs"
                      placeholder="Search phone"
                      value={recipientSearch}
                      onChange={(event) => setRecipientSearch(event.target.value)}
                    />
                    <select
                      className="h-9 rounded-sm border border-border bg-bg-surface px-3 text-xs"
                      value={recipientStatus}
                      onChange={(event) => setRecipientStatus(event.target.value)}
                    >
                      <option value="">All statuses</option>
                      <option value="PENDING">Pending</option>
                      <option value="SENT">Sent</option>
                      <option value="DELIVERED">Delivered</option>
                      <option value="READ">Read</option>
                      <option value="FAILED">Failed</option>
                    </select>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="text-[10px] text-text-muted">
                      Showing {paginatedRecipients.length} of {filteredRecipients.length} recipients
                    </div>
                    <Button variant="ghost" onClick={exportRecipients}>
                      Export CSV
                    </Button>
                  </div>
                  <div className="mt-2 space-y-2 text-xs">
                    {filteredRecipients.length === 0 ? (
                      <div className="text-text-muted">No recipient events yet.</div>
                    ) : (
                      paginatedRecipients.map((recipient: any) => (
                        <div key={recipient.id} className="flex items-center justify-between gap-2 rounded-sm bg-bg-surface px-3 py-2">
                          <div className="min-w-0">
                            <div className="truncate">{recipient.phone}</div>
                            <div className="text-[10px] text-text-muted">
                              {recipient.error || "No delivery errors"}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-text-secondary">{recipient.status}</div>
                            <div className="text-[10px] text-text-muted">
                              {recipient.readAt
                                ? `Read ${new Date(recipient.readAt).toLocaleString()}`
                                : recipient.deliveredAt
                                  ? `Delivered ${new Date(recipient.deliveredAt).toLocaleString()}`
                                  : recipient.sentAt
                                    ? `Sent ${new Date(recipient.sentAt).toLocaleString()}`
                                    : "Pending"}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {filteredRecipients.length > 10 ? (
                    <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                      <Button variant="ghost" disabled={recipientPage <= 1} onClick={() => setRecipientPage((page) => Math.max(1, page - 1))}>
                        Previous
                      </Button>
                      <div className="text-text-muted">
                        Page {recipientPage} of {totalRecipientPages}
                      </div>
                      <Button
                        variant="ghost"
                        disabled={recipientPage >= totalRecipientPages}
                        onClick={() => setRecipientPage((page) => Math.min(totalRecipientPages, page + 1))}
                      >
                        Next
                      </Button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="text-sm text-text-muted">Select a campaign below.</div>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-display">Campaign list</div>
            <div className="text-xs text-text-muted">Drafts, scheduled sends, and delivery progress.</div>
          </div>
          <Badge>{broadcasts.length} campaigns</Badge>
        </div>

        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="text-sm text-text-muted">Loading campaigns...</div>
          ) : broadcasts.length === 0 ? (
            <div className="text-sm text-text-muted">No broadcasts yet.</div>
          ) : (
            broadcasts.map((broadcast) => (
              <button
                key={broadcast.id}
                onClick={() => {
                  setSelectedId(broadcast.id);
                  setDetails(broadcast.stats ?? null);
                }}
                className={`w-full rounded-md border border-border p-4 text-left transition hover:bg-bg-elevated ${
                  selectedId === broadcast.id ? "bg-bg-elevated" : "bg-bg-surface"
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-sm font-medium">{broadcast.name}</div>
                    <div className="mt-1 text-xs text-text-muted">
                      Audience: {(broadcast.audience as any)?.type ?? "custom"}
                      {(broadcast.audience as any)?.tag ? ` · ${(broadcast.audience as any).tag}` : ""}
                      {(broadcast.audience as any)?.segmentId ? ` · ${(broadcast.audience as any).segmentId}` : ""}
                    </div>
                    <div className="mt-2 text-xs text-text-secondary">
                      {broadcast.scheduledAt
                        ? `Scheduled: ${new Date(broadcast.scheduledAt).toLocaleString()}`
                        : broadcast.sentAt
                          ? `Sent: ${new Date(broadcast.sentAt).toLocaleString()}`
                          : `Created: ${new Date(broadcast.createdAt).toLocaleString()}`}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={statusTone(broadcast.status)}>{broadcast.status}</Badge>
                    <Badge>{broadcast.stats?.sent ?? 0} sent</Badge>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
