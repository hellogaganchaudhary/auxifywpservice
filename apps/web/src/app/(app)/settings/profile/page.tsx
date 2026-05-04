"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: "", email: "" });

  useEffect(() => {
    if (!user) return;
    setForm({ name: user.name, email: user.email });
  }, [user]);

  return (
    <Card className="p-6">
      <h1 className="text-xl font-display">Profile</h1>
      <div className="mt-6 space-y-4">
        <Input
          placeholder="Full name"
          value={form.name}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, name: event.target.value }))
          }
        />
        <Input
          placeholder="Email"
          value={form.email}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, email: event.target.value }))
          }
          disabled
        />
        <Button disabled>Save changes</Button>
        <div className="text-xs text-text-muted">
          Profile updates are managed in the auth service.
        </div>
      </div>
    </Card>
  );
}
