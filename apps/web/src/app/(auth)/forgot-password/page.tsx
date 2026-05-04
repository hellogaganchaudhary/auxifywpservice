import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-base">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-display">Reset password</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Enter your email to receive a reset link.
        </p>
        <form className="mt-6 space-y-4">
          <Input type="email" placeholder="Email" required />
          <Button className="w-full" type="submit">
            Send reset link
          </Button>
        </form>
      </Card>
    </main>
  );
}
