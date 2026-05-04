"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/useSettings";

export default function NotificationsSettingsPage() {
  const { settings, loading, updateNotifications } = useSettings();

  if (loading) {
    return <div className="text-sm text-text-muted">Loading settings...</div>;
  }

  return (
    <Card className="p-6">
      <h1 className="text-xl font-display">Notifications</h1>
      <div className="mt-6 space-y-3">
        {Object.entries(settings?.notifications || {}).map(([key, value]) => (
          <label key={key} className="flex items-center justify-between rounded-md border border-border bg-bg-elevated p-4 text-sm">
            <span>{key}</span>
            <input
              type="checkbox"
              checked={value}
              onChange={(event) =>
                updateNotifications({
                  ...(settings?.notifications || {}),
                  [key]: event.target.checked,
                })
              }
            />
          </label>
        ))}
      </div>
      <Button className="mt-4" variant="ghost">Saved live</Button>
    </Card>
  );
}