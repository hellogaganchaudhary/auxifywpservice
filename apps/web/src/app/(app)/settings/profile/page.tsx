"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function ProfileSettingsPage() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", mobile: "", info: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setForm({ name: user.name, email: user.email, mobile: user.phone || "", info: user.profileInfo || "" });
  }, [user]);

  return (
    <Card className="rounded-[2rem] border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display text-slate-950">Admin profile</h1>
          <p className="mt-2 text-sm text-slate-500">Manage the visible profile used inside the admin panel.</p>
        </div>
        <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
          {user?.role || "ADMIN"}
        </div>
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-accent text-3xl font-semibold text-white">
            {(form.name || form.email || "A").slice(0, 1).toUpperCase()}
          </div>
          <div className="mt-4 text-lg font-semibold text-slate-950">{form.name || "Admin user"}</div>
          <div className="mt-1 break-all text-sm text-slate-500">{form.email || "No email"}</div>
          <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-left text-sm text-slate-600">
            {form.info || "Add profile information for this admin."}
          </div>
        </div>
        <div className="space-y-4">
          <Input
            placeholder="Full name"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          />
          <Input
            placeholder="Email ID"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            disabled
          />
          <Input
            placeholder="Mobile number"
            value={form.mobile}
            onChange={(event) => setForm((prev) => ({ ...prev, mobile: event.target.value }))}
          />
          <textarea
            className="min-h-32 w-full rounded-sm border border-border bg-bg-surface px-3 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            placeholder="Profile information"
            value={form.info}
            onChange={(event) => setForm((prev) => ({ ...prev, info: event.target.value }))}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              className="rounded-full"
              disabled={saving || !form.name.trim()}
              onClick={async () => {
                setSaving(true);
                setMessage(null);
                try {
                  await updateProfile({ name: form.name.trim(), phone: form.mobile.trim(), profileInfo: form.info.trim() });
                  setMessage("Profile saved permanently.");
                } catch (error: any) {
                  setMessage(error?.response?.data?.message || "Profile update failed.");
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Saving…" : "Save profile"}
            </Button>
            {message ? <div className="text-sm text-slate-500">{message}</div> : null}
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
            Name, mobile number, and information are saved permanently. Email is managed by login security.
          </div>
        </div>
      </div>
    </Card>
  );
}
