"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTemplates } from "@/hooks/useAnalytics";

export default function NewTemplatePage() {
  const router = useRouter();
  const { createTemplate, submitTemplate } = useTemplates();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("MARKETING");
  const [language, setLanguage] = useState("en");
  const [header, setHeader] = useState("");
  const [body, setBody] = useState("");
  const [footer, setFooter] = useState("");
  const [buttons, setButtons] = useState("Learn more,Contact sales");
  const [submitAfterCreate, setSubmitAfterCreate] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-display">Create template</h1>
        <p className="text-sm text-text-secondary">
          Create approved WhatsApp templates for marketing campaigns and utility notifications.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <input
              className="h-10 rounded-sm border border-border bg-bg-surface px-3 text-sm"
              placeholder="Template name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <select
              className="h-10 rounded-sm border border-border bg-bg-surface px-3 text-sm"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="MARKETING">Marketing</option>
              <option value="UTILITY">Utility</option>
              <option value="AUTHENTICATION">Authentication</option>
            </select>
          </div>

          <div className="rounded-md border border-border bg-bg-elevated p-3 text-xs text-text-secondary">
            {category === "MARKETING"
              ? "Marketing templates are for offers, promotions, announcements, re-engagement, and campaign messages."
              : category === "UTILITY"
                ? "Utility templates are for order updates, payment reminders, appointment confirmations, and account alerts."
                : "Authentication templates are for OTP and verification flows."}
          </div>

          <input
            className="h-10 rounded-sm border border-border bg-bg-surface px-3 text-sm"
            placeholder="Language code"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
          />

          <input
            className="h-10 rounded-sm border border-border bg-bg-surface px-3 text-sm"
            placeholder="Header (optional)"
            value={header}
            onChange={(event) => setHeader(event.target.value)}
          />

          <textarea
            className="min-h-40 rounded-sm border border-border bg-bg-surface px-3 py-3 text-sm"
            placeholder={category === "MARKETING" ? "Example: Hi {{1}}, our new offer is live. Reply YES to know more." : "Example: Hi {{1}}, your order {{2}} has been confirmed."}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />

          <input
            className="h-10 rounded-sm border border-border bg-bg-surface px-3 text-sm"
            placeholder="Footer (optional)"
            value={footer}
            onChange={(event) => setFooter(event.target.value)}
          />

          <input
            className="h-10 rounded-sm border border-border bg-bg-surface px-3 text-sm"
            placeholder="Buttons, comma separated"
            value={buttons}
            onChange={(event) => setButtons(event.target.value)}
          />

          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" checked={submitAfterCreate} onChange={(event) => setSubmitAfterCreate(event.target.checked)} />
            Submit to Meta immediately after creating
          </label>

          <div className="flex gap-2">
            <Button
              disabled={saving || !name.trim() || !body.trim()}
              onClick={async () => {
                setSaving(true);
                setError(null);
                try {
                  const created = await createTemplate({
                    name,
                    category,
                    language,
                    header,
                    body,
                    footer,
                    buttons: buttons
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean)
                      .map((text) => ({ type: "QUICK_REPLY", text })),
                  });
                  if (submitAfterCreate) {
                    await submitTemplate(created.id);
                  }
                  router.push(`/templates?created=${created.id}`);
                } catch (submitError: any) {
                  setError(submitError?.response?.data?.message || "Template saved failed. Check WhatsApp credentials before submitting to Meta.");
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Saving..." : submitAfterCreate ? "Create and submit" : "Create template"}
            </Button>
            <Button variant="ghost" onClick={() => router.push("/templates")}>Back</Button>
          </div>
          {error ? <div className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-xs text-error">{error}</div> : null}
        </Card>

        <Card className="p-5">
          <div className="text-sm font-display">Live preview</div>
          <div className="mt-4 rounded-2xl border border-border bg-bg-elevated p-4">
            {header ? <div className="mb-2 text-sm font-medium">{header}</div> : null}
            <div className="whitespace-pre-wrap text-sm text-text-primary">
              {body || "Your template preview appears here."}
            </div>
            {footer ? <div className="mt-3 text-xs text-text-muted">{footer}</div> : null}
            {buttons.trim() ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {buttons
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean)
                  .map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-border px-3 py-1 text-xs text-text-secondary"
                    >
                      {item}
                    </span>
                  ))}
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}