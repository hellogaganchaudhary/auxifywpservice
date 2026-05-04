"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useOrganization } from "@/hooks/useOrganization";

const steps = ["Profile", "Connect", "Business", "Invite", "Done"];

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const { wabaConfig, saving, verifying, updateWabaConfig, verifyWaba } = useOrganization();
  const [connectForm, setConnectForm] = useState({
    accessToken: "",
    phoneNumberId: "",
    wabaId: "",
    businessAccountId: "",
    webhookVerifyToken: "",
  });
  const progress = ((step + 1) / steps.length) * 100;
  const isWabaVerified = Boolean(wabaConfig?.verifiedAt);
  const canAdvance = useMemo(() => {
    if (step === 1) return isWabaVerified;
    if (step === 2) return isWabaVerified;
    return true;
  }, [isWabaVerified, step]);

  const handleVerify = async () => {
    await updateWabaConfig(connectForm);
    await verifyWaba();
    setStep(2);
  };

  const updateConnectField = (key: keyof typeof connectForm, value: string) => {
    setConnectForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Onboarding</span>
          <span>
            Step {step + 1} of {steps.length}
          </span>
        </div>
        <div className="mt-2 h-1 w-full rounded-full bg-bg-overlay">
          <div
            className="h-1 rounded-full bg-accent"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {step === 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-display">Welcome to WhatsAppAI</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Tell us a bit about yourself to continue.
          </p>
          <div className="mt-6 space-y-4">
            <Input placeholder="Full name" />
            <Input placeholder="Role" />
          </div>
        </Card>
      )}

      {step === 1 && (
        <Card className="p-6">
          <h2 className="text-xl font-display">Connect WhatsApp</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Provide your Meta Business credentials to verify.
          </p>
          <div className="mt-6 space-y-4">
            <Input
              placeholder="Access Token"
              value={connectForm.accessToken}
              onChange={(event) => updateConnectField("accessToken", event.target.value)}
            />
            <Input
              placeholder="Phone Number ID"
              value={connectForm.phoneNumberId}
              onChange={(event) => updateConnectField("phoneNumberId", event.target.value)}
            />
            <Input
              placeholder="WABA ID"
              value={connectForm.wabaId}
              onChange={(event) => updateConnectField("wabaId", event.target.value)}
            />
            <Input
              placeholder="Business Account ID"
              value={connectForm.businessAccountId}
              onChange={(event) => updateConnectField("businessAccountId", event.target.value)}
            />
            <Input
              placeholder="Webhook Verify Token"
              value={connectForm.webhookVerifyToken}
              onChange={(event) => updateConnectField("webhookVerifyToken", event.target.value)}
            />
          </div>
          <Button
            className="mt-6"
            onClick={handleVerify}
            disabled={saving || verifying}
          >
            {verifying ? "Verifying..." : saving ? "Saving..." : "Verify & Connect"}
          </Button>
        </Card>
      )}

      {step === 2 && (
        <Card className="p-6">
          <h2 className="text-xl font-display">Business Profile</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Confirm the business profile fetched from Meta.
          </p>
          <div className="mt-6 space-y-3 text-sm">
            <div>Display name: {wabaConfig?.businessName || "--"}</div>
            <div>Phone: {wabaConfig?.displayNumber || "--"}</div>
            <div>Quality rating: {wabaConfig?.qualityRating || "--"}</div>
            <div>Status: {wabaConfig?.status || "--"}</div>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="p-6">
          <h2 className="text-xl font-display">Invite your team</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Optional — you can skip this step.
          </p>
          <div className="mt-6 space-y-4">
            <Input placeholder="Teammate email" />
            <Input placeholder="Role (Admin/Manager/Agent)" />
          </div>
        </Card>
      )}

      {step === 4 && (
        <Card className="p-6 text-center">
          <h2 className="text-xl font-display">You’re all set</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Your workspace is ready.
          </p>
          <Button className="mt-6">Go to Dashboard</Button>
        </Card>
      )}

      <div className="flex justify-between">
        <Button
          variant="ghost"
          onClick={() => setStep((prev) => Math.max(0, prev - 1))}
        >
          Previous
        </Button>
        <Button
          disabled={!canAdvance}
          onClick={() => setStep((prev) => Math.min(steps.length - 1, prev + 1))}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
