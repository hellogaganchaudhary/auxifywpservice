"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTemplates } from "@/hooks/useAnalytics";

function toneForStatus(status: string) {
  if (status === "APPROVED") return "success" as const;
  if (status === "REJECTED") return "error" as const;
  if (status === "SUBMITTED" || status === "PENDING") return "warning" as const;
  return "default" as const;
}

function percent(value: number) {
  return `${value}%`;
}

export default function TemplatesPage() {
  const [status, setStatus] = useState("");
  const [syncingMeta, setSyncingMeta] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const { templates, analytics, loading, error, reload, submitTemplate, syncTemplateStatus, syncMetaTemplates } = useTemplates(status || undefined);

  const analyticsMap = useMemo(() => new Map(analytics.map((item) => [item.id, item])), [analytics]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-display">Templates</h1>
          <p className="text-sm text-text-secondary">
            Create, submit, monitor, and measure WhatsApp templates.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            className="h-10 rounded-sm border border-border bg-bg-surface px-3 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <Link href="/templates/new">
            <Button>New template</Button>
          </Link>
          <Button
            variant="ghost"
            disabled={syncingMeta}
            onClick={async () => {
              setSyncingMeta(true);
              setSyncMessage(null);
              try {
                const result = await syncMetaTemplates();
                setSyncMessage(`Synced ${result.count || 0} templates from Meta.`);
              } catch (syncError: any) {
                setSyncMessage(syncError?.response?.data?.message || "Meta template sync failed.");
              } finally {
                setSyncingMeta(false);
              }
            }}
          >
            {syncingMeta ? "Syncing…" : "Sync from Meta"}
          </Button>
        </div>
      </div>

      {syncMessage ? <Card className="border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">{syncMessage}</Card> : null}

      {error ? (
        <Card className="border-error/30 bg-error/10 p-6 text-sm text-error">
          <div>{error}</div>
          <Button className="mt-4" variant="ghost" onClick={reload}>Retry fetching templates</Button>
        </Card>
      ) : loading ? (
        <div className="text-sm text-text-muted">Loading templates...</div>
      ) : templates.length === 0 ? (
        <Card className="p-6 text-sm text-text-muted">
          No templates yet. Create your first template to start submissions.
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            {templates.map((template) => {
              const metrics = analyticsMap.get(template.id);

              return (
                <Card key={template.id} className="p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-base font-medium">{template.name}</div>
                        <Badge tone={toneForStatus(template.status)}>{template.status}</Badge>
                        {template.qualityScore ? <Badge>{template.qualityScore}</Badge> : null}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-text-muted">
                        <span>{template.category}</span>
                        <span>•</span>
                        <span>{template.language.toUpperCase()}</span>
                        {template.metaTemplateId ? (
                          <>
                            <span>•</span>
                            <span className="font-mono">{template.metaTemplateId}</span>
                          </>
                        ) : null}
                      </div>
                      {template.header ? (
                        <div className="rounded-md border border-border bg-bg-elevated p-3 text-sm text-text-secondary">
                          <div className="mb-1 text-[10px] uppercase tracking-wide text-text-muted">Header</div>
                          {template.header}
                        </div>
                      ) : null}
                      <div className="rounded-md border border-border bg-bg-elevated p-3 text-sm text-text-primary">
                        {template.body}
                      </div>
                      {template.footer ? (
                        <div className="text-xs text-text-muted">Footer: {template.footer}</div>
                      ) : null}
                      {metrics?.rejectionReason && metrics.rejectionReason !== "NONE" ? (
                        <div className="rounded-md border border-error/30 bg-error/10 p-3 text-xs text-error">
                          Rejection reason: {metrics.rejectionReason}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-row gap-2 md:flex-col">
                      {!template.metaTemplateId && template.status !== "APPROVED" ? (
                        <Button onClick={() => submitTemplate(template.id)}>Submit to Meta</Button>
                      ) : null}
                      <Button variant="ghost" onClick={() => syncTemplateStatus(template.id)}>
                        Sync status
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="p-5">
            <div className="text-sm font-display">Template analytics</div>
            <div className="mt-1 text-xs text-text-muted">
              Delivery and read health across all templates.
            </div>
            <div className="mt-4 space-y-3">
              {analytics.length === 0 ? (
                <div className="text-sm text-text-muted">No analytics available yet.</div>
              ) : (
                analytics.map((item) => (
                  <div key={item.id} className="rounded-md border border-border bg-bg-elevated p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium">{item.name}</div>
                        <div className="text-xs text-text-muted">{item.status}</div>
                      </div>
                      <Badge>{item.qualityScore}</Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                      <div>
                        <div className="text-[10px] uppercase text-text-muted">Usage</div>
                        <div className="mt-1 font-medium">{item.usageCount}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-text-muted">Delivery</div>
                        <div className="mt-1 font-medium">{percent(item.deliveryRate)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-text-muted">Read</div>
                        <div className="mt-1 font-medium">{percent(item.readRate)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-text-muted">Failure</div>
                        <div className="mt-1 font-medium">{percent(item.failureRate)}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
