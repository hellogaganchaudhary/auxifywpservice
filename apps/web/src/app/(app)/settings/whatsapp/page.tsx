"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useOrganization } from "@/hooks/useOrganization";

function maskValue(value?: string | null) {
  if (!value) return "Not configured";
  if (value.length <= 14) return value;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

export default function WhatsAppSettingsPage() {
  const {
    wabaConfig,
    webhookProfile,
    webhookLogs,
    loading,
    saving,
    syncing,
    verifying,
    error,
    reload,
    updateWabaConfig,
    syncWabaConfig,
    verifyWaba,
  } = useOrganization();
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    accessToken: "",
    phoneNumberId: "",
    wabaId: "",
    businessAccountId: "",
    webhookVerifyToken: "",
  });

  const connected = Boolean(form.accessToken && form.phoneNumberId && form.wabaId);
  const verified = Boolean(wabaConfig?.verifiedAt || wabaConfig?.status === "VERIFIED");
  const callbackUrl = webhookProfile?.callbackUrl || (error ? "Login as an organization admin to load the callback URL." : "Start ngrok and refresh this page to generate the public callback URL.");

  useEffect(() => {
    if (!wabaConfig) return;
    setForm({
      accessToken: wabaConfig.accessToken || "",
      phoneNumberId: wabaConfig.phoneNumberId || "",
      wabaId: wabaConfig.wabaId || "",
      businessAccountId: wabaConfig.businessAccountId || "",
      webhookVerifyToken: wabaConfig.webhookVerifyToken || "",
    });
  }, [wabaConfig]);

  async function handleSyncProfile() {
    setMessage(null);
    try {
      await syncWabaConfig({
        accessToken: form.accessToken,
        businessAccountId: form.businessAccountId || undefined,
        wabaId: form.wabaId || undefined,
        phoneNumberId: form.phoneNumberId || undefined,
        webhookVerifyToken: form.webhookVerifyToken || undefined,
      });
      await reload();
      setMessage("WhatsApp profile fetched and saved successfully.");
    } catch (error: any) {
      setMessage(error?.response?.data?.message?.message || error?.response?.data?.message || "Unable to fetch WhatsApp profile. Check token permissions.");
    }
  }

  async function handleSaveManual() {
    setMessage(null);
    try {
      await updateWabaConfig(form);
      await reload();
      setMessage("Manual WhatsApp credentials saved.");
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "Unable to save WhatsApp credentials.");
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-slate-950">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#ffffff,#f8fafc_45%,#ecfdf5)] p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
              WhatsApp Business profile
            </div>
            <h1 className="mt-5 text-4xl font-display leading-tight text-slate-950 md:text-5xl">Fetch WABA ID and phone ID from WhatsApp.</h1>
            <p className="mt-4 max-w-2xl leading-7 text-slate-600">
              Paste the Meta access token, submit once, and the system will fetch the WhatsApp Business Account, phone number ID, display number, and profile details automatically.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={verified ? "success" : connected ? "warning" : "error"} className="px-3 py-1">
              {verified ? "Verified" : connected ? "Credentials saved" : "Not connected"}
            </Badge>
            <Badge tone={verified ? "success" : "warning"} className="px-3 py-1">
              {verified ? "Sending available" : "Sending unavailable"}
            </Badge>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-display text-slate-950">Fetch and save profile</h2>
              <p className="mt-1 text-sm text-slate-500">Enter the access token, then click the primary submit button. Optional IDs select a specific WABA/phone when the token has multiple accounts.</p>
            </div>
            <Button onClick={() => verifyWaba()} disabled={verifying || loading || !connected} className="rounded-full">
              {verifying ? "Verifying credentials…" : "Verify saved credentials"}
            </Button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
              Access token <span className="text-rose-500">*</span>
              <Input
                placeholder="Paste Meta permanent/system-user access token"
                value={form.accessToken}
                type="password"
                className="rounded-2xl border-slate-200 bg-slate-50 text-slate-950 placeholder:text-slate-400"
                onChange={(event) => setForm((prev) => ({ ...prev, accessToken: event.target.value }))}
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              WABA ID <span className="font-normal text-slate-400">optional</span>
              <Input
                placeholder="Leave blank to auto-select first WABA"
                value={form.wabaId}
                className="rounded-2xl border-slate-200 bg-slate-50 text-slate-950 placeholder:text-slate-400"
                onChange={(event) => setForm((prev) => ({ ...prev, wabaId: event.target.value }))}
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Phone number ID <span className="font-normal text-slate-400">optional</span>
              <Input
                placeholder="Leave blank to auto-select first phone"
                value={form.phoneNumberId}
                className="rounded-2xl border-slate-200 bg-slate-50 text-slate-950 placeholder:text-slate-400"
                onChange={(event) => setForm((prev) => ({ ...prev, phoneNumberId: event.target.value }))}
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Business account ID <span className="font-normal text-slate-400">optional</span>
              <Input
                placeholder="Leave blank to fetch businesses from token"
                value={form.businessAccountId}
                className="rounded-2xl border-slate-200 bg-slate-50 text-slate-950 placeholder:text-slate-400"
                onChange={(event) => setForm((prev) => ({ ...prev, businessAccountId: event.target.value }))}
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Webhook verify token
              <Input
                placeholder="Webhook verify token"
                value={form.webhookVerifyToken}
                className="rounded-2xl border-slate-200 bg-slate-50 text-slate-950 placeholder:text-slate-400"
                onChange={(event) => setForm((prev) => ({ ...prev, webhookVerifyToken: event.target.value }))}
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button onClick={handleSyncProfile} disabled={syncing || loading || !form.accessToken} className="rounded-full px-6">
              {syncing ? "Fetching from WhatsApp…" : "Submit credentials and fetch IDs"}
            </Button>
            <Button onClick={handleSaveManual} disabled={saving || loading || !form.accessToken || !form.wabaId || !form.phoneNumberId} variant="ghost" className="rounded-full px-6">
              {saving ? "Saving manual IDs…" : "Save entered IDs manually"}
            </Button>
            <Button onClick={() => verifyWaba()} disabled={verifying || loading || !connected} variant="ghost" className="rounded-full px-6">
              {verifying ? "Verifying…" : "Verify credentials"}
            </Button>
            <div className="basis-full text-sm text-slate-500">
              {!form.accessToken
                ? "Access token is required before submit."
                : connected
                  ? "IDs are present. Click Verify credentials before sending messages."
                  : "Click Submit credentials and fetch IDs to auto-fill WABA ID and phone number ID from Meta."}
            </div>
          </div>
          {message ? <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{message}</div> : null}
          {error ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div> : null}
        </Card>

        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-display text-slate-950">Profile and sending status</h2>
          <p className="mt-1 text-sm text-slate-500">Visible WhatsApp account details returned by verification/sync.</p>

          <div className="mt-6 space-y-3">
            {[
              ["WABA ID", maskValue(wabaConfig?.wabaId)],
              ["Phone number ID", maskValue(wabaConfig?.phoneNumberId)],
              ["Business account ID", maskValue(wabaConfig?.businessAccountId)],
              ["Display number", wabaConfig?.displayNumber || "Not synced"],
              ["Business name", wabaConfig?.businessName || "Not synced"],
              ["Quality rating", wabaConfig?.qualityRating || "Pending"],
              ["Meta status", wabaConfig?.status || "Pending verification"],
              ["Sending availability", verified ? "Available" : "Unavailable until verified"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <span className="text-slate-500">{label}</span>
                <span className="text-right font-medium text-slate-950">{value}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-display text-slate-950">Meta webhook profile</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Paste these values in Meta App Dashboard → WhatsApp → Configuration.</p>
            </div>
            <Badge tone={webhookProfile?.isPublicUrlConfigured ? "success" : "error"}>
              {webhookProfile?.isPublicUrlConfigured ? "Public URL ready" : "Use ngrok URL"}
            </Badge>
          </div>
          <div className="mt-5 space-y-3">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Callback URL</div>
              <div className="mt-2 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-950 px-4 py-3 font-mono text-sm text-emerald-200">
                {callbackUrl}
              </div>
              {!error && !webhookProfile?.isPublicUrlConfigured ? (
                <p className="mt-2 text-xs text-rose-600">Localhost cannot be used in Meta. Keep ngrok running, restart the API with PUBLIC_WEBHOOK_BASE_URL, or refresh after ngrok starts.</p>
              ) : null}
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Verify token</div>
              <div className="mt-2 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-950">
                {webhookProfile?.verifyToken || form.webhookVerifyToken || "Set webhook verify token and save profile"}
              </div>
            </div>
          </div>
        </Card>

        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-display text-slate-950">Webhook logs</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Recent incoming WhatsApp webhook activity for this admin organization.</p>
            </div>
            <Button variant="ghost" onClick={() => reload()} className="rounded-full">Refresh logs</Button>
          </div>
          <div className="mt-5 space-y-3">
            {webhookLogs.length ? webhookLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <div>
                  <div className="font-medium text-slate-950">{log.eventType}</div>
                  <div className="mt-1 text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</div>
                </div>
                <Badge tone={log.status === "RECEIVED" ? "success" : "warning"}>{log.status}</Badge>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                No webhook logs yet. Send a test WhatsApp message after adding the callback URL in Meta.
              </div>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
