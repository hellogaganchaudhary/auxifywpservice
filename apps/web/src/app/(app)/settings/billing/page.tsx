"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { RoleGuard } from "@/components/RoleGuard";

function BillingContent() {
  const searchParams = useSearchParams();
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [packs, setPacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPackId, setProcessingPackId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      const [walletRes, txRes, packRes] = await Promise.all([
        api.get("/billing/wallet"),
        api.get("/billing/transactions"),
        api.get("/billing/credit-packs"),
      ]);
      setWallet(walletRes.data);
      setTransactions(txRes.data);
      setPacks(packRes.data);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) return;

    const confirm = async () => {
      try {
        const { data } = await api.post("/billing/checkout-confirm", { sessionId });
        setWallet(data);
        const txRes = await api.get("/billing/transactions");
        setTransactions(txRes.data);
        setMessage("Payment completed and wallet credited.");
      } catch {
        setMessage("Payment confirmation failed.");
      }
    };

    confirm();
  }, [searchParams]);

  const updateAutoRecharge = async (enabled: boolean) => {
    if (!wallet) return;
    const payload = {
      enabled,
      threshold: wallet.autoRechargeThreshold || 500,
      amount: wallet.autoRechargeAmount || 1000,
      currency: wallet.currency || "USD",
    };
    const { data } = await api.patch("/billing/wallet/auto-recharge", payload);
    setWallet(data);
  };

  const buyPack = async (packId: string) => {
    setProcessingPackId(packId);
    setMessage("");
    try {
      const { data } = await api.post("/billing/checkout-session", { packId });
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      setMessage("Unable to start checkout.");
    } finally {
      setProcessingPackId(null);
    }
  };

  if (loading) {
    return <div className="text-sm text-text-muted">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="page-title">Billing</div>
          <div className="page-subtitle">Wallet and usage</div>
        </div>
        <RoleGuard roles={["ADMIN"]}>
          <Button>Recharge</Button>
        </RoleGuard>
      </div>

      {message ? (
        <Card className="p-4 text-sm text-text-secondary">{message}</Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs text-text-muted">Wallet Balance</div>
          <div className="mt-2 text-2xl font-display">
            {wallet?.balance ?? 0} {wallet?.currency || "USD"}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-text-muted">Auto Recharge</div>
          <div className="mt-3 flex items-center gap-3">
            <Toggle
              checked={!!wallet?.autoRechargeEnabled}
              onChange={updateAutoRecharge}
            />
            <div className="text-sm text-text-secondary">
              Threshold {wallet?.autoRechargeThreshold || 0}
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-text-muted">Recharge Amount</div>
          <div className="mt-2 text-2xl font-display">
            {wallet?.autoRechargeAmount || 0} {wallet?.currency || "USD"}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="text-sm font-display">Credit Packs</div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {packs.map((pack) => (
            <div
              key={pack.id}
              className="rounded-md border border-border bg-bg-elevated p-4"
            >
              <div className="text-sm text-text-secondary">{pack.name}</div>
              <div className="mt-2 text-xl font-display">
                {pack.credits} credits
              </div>
              <div className="mt-1 text-sm text-text-muted">
                {pack.price} {pack.currency}
              </div>
              <RoleGuard roles={["ADMIN"]}>
                <Button
                  className="mt-4 w-full"
                  disabled={processingPackId === pack.id}
                  onClick={() => buyPack(pack.id)}
                >
                  {processingPackId === pack.id ? "Starting..." : "Buy Pack"}
                </Button>
              </RoleGuard>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-display">Transactions</div>
        <table className="table mt-4">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id}>
                <td>{new Date(tx.createdAt).toLocaleString()}</td>
                <td className="capitalize">{tx.type}</td>
                <td>{tx.amount}</td>
                <td>{tx.balanceAfter}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="text-sm text-text-muted">Loading billing...</div>}>
      <BillingContent />
    </Suspense>
  );
}
