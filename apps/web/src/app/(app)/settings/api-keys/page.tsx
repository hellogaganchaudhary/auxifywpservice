"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSettings } from "@/hooks/useSettings";

export default function ApiKeysSettingsPage() {
  const { settings, loading, createApiKey, revokeApiKey, regenerateApiKey } = useSettings();
  const [name, setName] = useState("");
  const [latestSecret, setLatestSecret] = useState("");
  const [copied, setCopied] = useState(false);

  const copySecret = async (secret: string) => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  if (loading) {
    return <div className="text-sm text-text-muted">Loading settings...</div>;
  }

  return (
    <Card className="p-6">
      <h1 className="text-xl font-display">API Keys</h1>
      <div className="mt-6 flex gap-3">
        <Input
          placeholder="Key name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Button
          onClick={async () => {
            if (!name.trim()) return;
            const created = await createApiKey({ name });
            setLatestSecret(created.secret || "");
            setName("");
          }}
        >
          Create key
        </Button>
      </div>
      {latestSecret ? (
        <div className="mt-4 rounded-md border border-border bg-bg-elevated p-4 text-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              Copy now: <span className="font-mono">{latestSecret}</span>
            </div>
            <Button variant="ghost" onClick={() => copySecret(latestSecret)}>
              {copied ? "Copied" : "Copy key"}
            </Button>
          </div>
        </div>
      ) : null}
      <div className="mt-6 space-y-3">
        {(settings?.apiKeys || []).map((key) => (
          <div key={key.id} className="rounded-md border border-border bg-bg-elevated p-4 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{key.name}</div>
                <div className="mt-1 text-text-secondary">{key.prefix}••••••</div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={async () => {
                    const regenerated = await regenerateApiKey(key.id);
                    setLatestSecret(regenerated.secret || "");
                  }}
                >
                  Regenerate
                </Button>
                <Button variant="ghost" onClick={() => revokeApiKey(key.id)}>
                  Revoke
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}