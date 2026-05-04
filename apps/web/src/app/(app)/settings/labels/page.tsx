"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSettings } from "@/hooks/useSettings";

export default function LabelsSettingsPage() {
  const { settings, loading, createLabel } = useSettings();
  const [form, setForm] = useState({ name: "", color: "gray" });

  if (loading) {
    return <div className="text-sm text-text-muted">Loading settings...</div>;
  }

  return (
    <Card className="p-6">
      <h1 className="text-xl font-display">Labels</h1>
      <div className="mt-6 flex gap-3">
        <Input
          placeholder="Label name"
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
        />
        <Input
          placeholder="Color"
          value={form.color}
          onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))}
        />
        <Button
          onClick={async () => {
            if (!form.name.trim()) return;
            await createLabel(form);
            setForm({ name: "", color: "gray" });
          }}
        >
          Add label
        </Button>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {(settings?.labels || []).map((label) => (
          <Badge key={label.id}>{label.name}</Badge>
        ))}
      </div>
    </Card>
  );
}