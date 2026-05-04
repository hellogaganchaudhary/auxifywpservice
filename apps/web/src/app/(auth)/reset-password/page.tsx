import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-base">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-display">Set new password</h1>
        <form className="mt-6 space-y-4">
          <Input type="password" placeholder="New password" required />
          <Input type="password" placeholder="Confirm password" required />
          <Button className="w-full" type="submit">
            Reset password
          </Button>
        </form>
      </Card>
    </main>
  );
}
