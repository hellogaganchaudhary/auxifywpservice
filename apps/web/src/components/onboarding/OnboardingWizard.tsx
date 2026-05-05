"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, Trash2, User, Phone, Briefcase, Users, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { useTeam } from "@/hooks/useTeam";
import { cn } from "@/lib/utils";

const steps = [
  { id: "profile", title: "Profile", icon: User },
  { id: "connect", title: "Connect", icon: Phone },
  { id: "business", title: "Business", icon: Briefcase },
  { id: "invite", title: "Invite", icon: Users },
  { id: "done", title: "Done", icon: PartyPopper },
];

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const { user, updateProfile } = useAuth();
  const { wabaConfig, saving: orgSaving, verifying, updateWabaConfig, verifyWaba } = useOrganization();
  const { inviteMember, saving: teamSaving } = useTeam();

  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    roleDescription: "",
  });

  const [connectForm, setConnectForm] = useState({
    accessToken: "",
    phoneNumberId: "",
    wabaId: "",
    businessAccountId: "",
    webhookVerifyToken: "",
  });

  const [teamInvites, setTeamInvites] = useState<{ email: string; role: string }[]>([]);
  const [newInvite, setNewInvite] = useState<{ email: string; role: string }>({ email: "", role: "AGENT" });

  const [localSaving, setLocalSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.name && !profileForm.name) {
      setProfileForm((prev) => ({ ...prev, name: user.name }));
    }
  }, [user?.name, profileForm.name]);

  const progress = ((step + 1) / steps.length) * 100;
  const isWabaVerified = Boolean(wabaConfig?.verifiedAt);

  const canAdvance = useMemo(() => {
    if (step === 0) return profileForm.name.length >= 2;
    if (step === 1) return isWabaVerified;
    return true;
  }, [step, profileForm.name, isWabaVerified]);

  const handleNext = async () => {
    setLocalError(null);
    try {
      if (step === 0) {
        setLocalSaving(true);
        await updateProfile({ name: profileForm.name });
        setStep(1);
      } else if (step === 1) {
        if (!isWabaVerified) {
          setLocalError("Please verify your WhatsApp connection first.");
          return;
        }
        setStep(2);
      } else if (step === 2) {
        setStep(3);
      } else if (step === 3) {
        setLocalSaving(true);
        for (const invite of teamInvites) {
          await inviteMember(invite);
        }
        setStep(4);
      } else if (step === 4) {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setLocalError(err?.response?.data?.message || err?.message || "An error occurred. Please try again.");
    } finally {
      setLocalSaving(false);
    }
  };

  const handleVerify = async () => {
    setLocalError(null);
    try {
      if (!connectForm.accessToken || !connectForm.phoneNumberId || !connectForm.wabaId) {
        setLocalError("Please fill in all required fields.");
        return;
      }
      await updateWabaConfig(connectForm);
      const result = await verifyWaba();
      if (result?.verifiedAt) {
        setStep(2);
      } else {
        setLocalError("Verification failed. Please check your credentials.");
      }
    } catch (err: any) {
      setLocalError(err?.response?.data?.message || err?.message || "Verification failed.");
    }
  };

  const addInvite = () => {
    if (!newInvite.email || !newInvite.email.includes("@")) return;
    setTeamInvites((prev) => [...prev, newInvite]);
    setNewInvite({ email: "", role: "AGENT" });
  };

  const removeInvite = (index: number) => {
    setTeamInvites((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 py-12">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {steps.map((s, i) => (
              <div
                key={s.id}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                  step > i
                    ? "border-accent bg-accent text-white"
                    : step === i
                    ? "border-accent text-accent"
                    : "border-bg-overlay text-text-muted"
                )}
              >
                {step > i ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
              </div>
            ))}
          </div>
          <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
            Step {step + 1} of {steps.length}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-bg-overlay overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="relative min-h-[400px]">
        {step === 0 && (
          <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500 p-8">
            <h2 className="text-2xl font-display font-semibold">Tell us about yourself</h2>
            <p className="mt-2 text-text-secondary">
              Let's start by getting your profile ready.
            </p>
            <div className="mt-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Name</label>
                <Input
                  placeholder="e.g. John Doe"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Role</label>
                <Input
                  placeholder="e.g. Operations Manager"
                  value={profileForm.roleDescription}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, roleDescription: e.target.value }))}
                />
              </div>
            </div>
          </Card>
        )}

        {step === 1 && (
          <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500 p-8">
            <h2 className="text-2xl font-display font-semibold">Connect WhatsApp</h2>
            <p className="mt-2 text-text-secondary">
              Provide your Meta Business credentials to verify your WABA connection.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium">System User Access Token</label>
                <Input
                  type="password"
                  placeholder="EAAB..."
                  value={connectForm.accessToken}
                  onChange={(e) => setConnectForm((prev) => ({ ...prev, accessToken: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number ID</label>
                <Input
                  placeholder="123456789"
                  value={connectForm.phoneNumberId}
                  onChange={(e) => setConnectForm((prev) => ({ ...prev, phoneNumberId: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">WABA ID</label>
                <Input
                  placeholder="123456789"
                  value={connectForm.wabaId}
                  onChange={(e) => setConnectForm((prev) => ({ ...prev, wabaId: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Business Account ID</label>
                <Input
                  placeholder="123456789"
                  value={connectForm.businessAccountId}
                  onChange={(e) => setConnectForm((prev) => ({ ...prev, businessAccountId: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Webhook Verify Token</label>
                <Input
                  placeholder="Optional"
                  value={connectForm.webhookVerifyToken}
                  onChange={(e) => setConnectForm((prev) => ({ ...prev, webhookVerifyToken: e.target.value }))}
                />
              </div>
            </div>
            <div className="mt-8 flex items-center gap-4">
              <Button
                onClick={handleVerify}
                disabled={orgSaving || verifying}
                className="w-full md:w-auto"
              >
                {verifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Connect"
                )}
              </Button>
              {isWabaVerified && (
                <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                  <Check className="h-4 w-4" /> Connected
                </div>
              )}
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500 p-8">
            <h2 className="text-2xl font-display font-semibold">Business Profile</h2>
            <p className="mt-2 text-text-secondary">
              Everything looks good. Here's what we fetched from Meta.
            </p>
            <div className="mt-8 space-y-4">
              <div className="rounded-lg border bg-bg-overlay/50 p-4 space-y-3">
                <div className="flex justify-between border-b border-bg-overlay pb-2">
                  <span className="text-sm text-text-muted">Display Name</span>
                  <span className="text-sm font-medium">{wabaConfig?.businessName || "--"}</span>
                </div>
                <div className="flex justify-between border-b border-bg-overlay pb-2">
                  <span className="text-sm text-text-muted">Display Number</span>
                  <span className="text-sm font-medium">{wabaConfig?.displayNumber || "--"}</span>
                </div>
                <div className="flex justify-between border-b border-bg-overlay pb-2">
                  <span className="text-sm text-text-muted">Quality Rating</span>
                  <span className={cn(
                    "text-sm font-medium",
                    wabaConfig?.qualityRating === "GREEN" ? "text-green-600" : "text-yellow-600"
                  )}>
                    {wabaConfig?.qualityRating || "--"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-text-muted">Account Status</span>
                  <span className="text-sm font-medium">{wabaConfig?.status || "--"}</span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {step === 3 && (
          <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500 p-8">
            <h2 className="text-2xl font-display font-semibold">Invite your team</h2>
            <p className="mt-2 text-text-secondary">
              Add your teammates to help you manage conversations.
            </p>
            <div className="mt-8 space-y-6">
              <div className="flex gap-2">
                <Input
                  className="flex-1"
                  placeholder="teammate@example.com"
                  value={newInvite.email}
                  onChange={(e) => setNewInvite((prev) => ({ ...prev, email: e.target.value }))}
                  onKeyPress={(e) => e.key === "Enter" && addInvite()}
                />
                <select
                  className="rounded-md border border-bg-overlay bg-bg-base px-3 text-sm"
                  value={newInvite.role}
                  onChange={(e) => setNewInvite((prev) => ({ ...prev, role: e.target.value }))}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="AGENT">Agent</option>
                </select>
                <Button variant="ghost" className="px-3" onClick={addInvite}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {teamInvites.map((invite, index) => (
                  <div key={index} className="flex items-center justify-between rounded-md border p-3 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-bg-overlay flex items-center justify-center">
                        <User className="h-4 w-4 text-text-muted" />
                      </div>
                      <div>
                        <div className="font-medium">{invite.email}</div>
                        <div className="text-xs text-text-muted">{invite.role}</div>
                      </div>
                    </div>
                    <Button variant="ghost" className="px-3" onClick={() => removeInvite(index)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                {teamInvites.length === 0 && (
                  <p className="text-center py-8 text-sm text-text-muted border-2 border-dashed rounded-lg">
                    No invites added yet.
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {step === 4 && (
          <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500 p-8 text-center py-16">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
              <PartyPopper className="h-10 w-10" />
            </div>
            <h2 className="mt-6 text-3xl font-display font-semibold">You're all set!</h2>
            <p className="mt-2 text-text-secondary max-w-sm mx-auto">
              Your workspace is ready and your WhatsApp connection is active.
            </p>
          </Card>
        )}

        {localError && (
          <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-600 animate-in fade-in slide-in-from-top-2">
            {localError}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-4">
        <Button
          variant="ghost"
          onClick={() => setStep((prev) => Math.max(0, prev - 1))}
          disabled={step === 0 || step === 4 || localSaving}
        >
          Previous
        </Button>
        <div className="flex gap-4">
          {step === 3 && teamInvites.length === 0 && (
            <Button variant="ghost" onClick={() => setStep(4)} disabled={localSaving}>
              Skip for now
            </Button>
          )}
          <Button
            className="min-w-[120px]"
            disabled={!canAdvance || localSaving}
            onClick={handleNext}
          >
            {localSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : step === 4 ? (
              "Go to Dashboard"
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

