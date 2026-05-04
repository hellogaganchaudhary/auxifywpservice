"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/useSettings";

export default function QuickRepliesSettingsPage() {
  const { settings, loading, createQuickReply } = useSettings();
  const [form, setForm] = useState({ title: "", body: "" });

  if (loading) {
    return <div className="text-sm text-text-muted">Loading settings...</div>;
  }

  return (
    <Card className="p-6">
      <h1 className="text-xl font-display">Quick Replies</h1>
      <div className="mt-6 grid gap-3 md:grid-cols-[200px_1fr_auto]">
        <Input
          placeholder="Title"
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
        />
        <Input
          placeholder="Reply body"
          value={form.body}
          onChange={(event) => setForm((prev) => ({ ...prev, body: event.target.value }))}
        />
        <Button
          onClick={async () => {
            if (!form.title.trim() || !form.body.trim()) return;
            await createQuickReply(form);
            setForm({ title: "", body: "" });
          }}
        >
          Add
        </Button>
      </div>
      <div className="mt-6 space-y-3">
        {(settings?.quickReplies || []).map((reply) => (
          <div key={reply.id} className="rounded-md border border-border bg-bg-elevated p-4">
            <div className="text-sm font-medium">{reply.title}</div>
            <div className="mt-1 text-sm text-text-secondary">{reply.body}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}