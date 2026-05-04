import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function AcceptInvitePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-base">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-display">Accept invite</h1>
        <p className="mt-2 text-sm text-text-secondary">
          You&apos;ve been invited to join an organization.
        </p>
        <form className="mt-6 space-y-4">
          <Input type="text" placeholder="Full name" required />
          <Input type="password" placeholder="Password" required />
          <Input type="password" placeholder="Confirm password" required />
          <Button className="w-full" type="submit">
            Accept invite
          </Button>
        </form>
      </Card>
    </main>
  );
}
