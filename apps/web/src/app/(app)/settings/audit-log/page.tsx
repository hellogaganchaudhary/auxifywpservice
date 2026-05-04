"use client";

import { Card } from "@/components/ui/card";
import { useSettings } from "@/hooks/useSettings";

export default function AuditLogSettingsPage() {
  const { settings, loading } = useSettings();

  if (loading) {
    return <div className="text-sm text-text-muted">Loading settings...</div>;
  }

  return (
    <Card className="p-6">
      <h1 className="text-xl font-display">Audit Log</h1>
      <div className="mt-6 space-y-3">
        {(settings?.auditLog || []).map((entry) => (
          <div key={entry.id} className="rounded-md border border-border bg-bg-elevated p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">{entry.action}</div>
              <div className="text-xs text-text-muted">
                {new Date(entry.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="mt-1 text-xs text-text-secondary">
              {entry.actorId} · {entry.resourceType || "—"} {entry.resourceId || ""}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}