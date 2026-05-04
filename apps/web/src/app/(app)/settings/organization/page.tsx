"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOrganization } from "@/hooks/useOrganization";
import { RoleGuard } from "@/components/RoleGuard";

export default function OrganizationSettingsPage() {
  const { organization, loading, saving, updateOrganization } = useOrganization();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    logoUrl: "",
    timezone: "",
    language: "",
  });

  useEffect(() => {
    if (!organization) return;
    setForm({
      name: organization.name || "",
      slug: organization.slug || "",
      logoUrl: organization.logoUrl || "",
      timezone: organization.timezone || "",
      language: organization.language || "",
    });
  }, [organization]);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display">Organization</h1>
          <p className="text-sm text-text-secondary">
            Update your org profile and branding.
          </p>
        </div>
        <RoleGuard roles={["ADMIN"]}>
          <Button
            onClick={() => updateOrganization(form)}
            disabled={saving || loading}
          >
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </RoleGuard>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Input
          placeholder="Organization name"
          value={form.name}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, name: event.target.value }))
          }
        />
        <Input
          placeholder="Slug"
          value={form.slug}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, slug: event.target.value }))
          }
        />
        <Input
          placeholder="Logo URL"
          value={form.logoUrl}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, logoUrl: event.target.value }))
          }
        />
        <Input
          placeholder="Timezone"
          value={form.timezone}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, timezone: event.target.value }))
          }
        />
        <Input
          placeholder="Language"
          value={form.language}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, language: event.target.value }))
          }
        />
      </div>
    </Card>
  );
}
