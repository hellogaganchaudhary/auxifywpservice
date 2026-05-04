"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RoleGuard } from "@/components/RoleGuard";

export default function SuperAdminBillingPage() {
  const [packs, setPacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    credits: 1000,
    price: 100,
    currency: "USD",
  });

  useEffect(() => {
    const load = async () => {
      const { data } = await api.get("/billing/credit-packs");
      setPacks(data);
      setLoading(false);
    };
    load();
  }, []);

  const createPack = async () => {
    const { data } = await api.post("/billing/credit-packs", form);
    setPacks((prev) => [data, ...prev]);
    setForm({ name: "", credits: 1000, price: 100, currency: "USD" });
  };

  if (loading) {
    return <div className="text-sm text-text-muted">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="page-title">Billing (Super Admin)</div>
        <div className="page-subtitle">Manage credit packs</div>
      </div>

      <RoleGuard roles={["SUPER_ADMIN"]}>
        <Card className="p-4">
          <div className="text-sm font-display">Create Credit Pack</div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <input
              className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm"
              type="number"
              placeholder="Credits"
              value={form.credits}
              onChange={(e) =>
                setForm({ ...form, credits: Number(e.target.value) })
              }
            />
            <input
              className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm"
              type="number"
              placeholder="Price"
              value={form.price}
              onChange={(e) =>
                setForm({ ...form, price: Number(e.target.value) })
              }
            />
            <input
              className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm"
              placeholder="Currency"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            />
          </div>
          <Button className="mt-4" onClick={createPack}>
            Create Pack
          </Button>
        </Card>
      </RoleGuard>

      <Card className="p-4">
        <div className="text-sm font-display">Credit Packs</div>
        <table className="table mt-4">
          <thead>
            <tr>
              <th>Name</th>
              <th>Credits</th>
              <th>Price</th>
              <th>Currency</th>
            </tr>
          </thead>
          <tbody>
            {packs.map((pack) => (
              <tr key={pack.id}>
                <td>{pack.name}</td>
                <td>{pack.credits}</td>
                <td>{pack.price}</td>
                <td>{pack.currency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
