"use client";

import { useEffect } from "react";
import { initPosthog, identifyPosthog } from "@/lib/posthog";
import { useAuth } from "@/hooks/useAuth";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    initPosthog();
  }, []);

  useEffect(() => {
    if (user) {
      identifyPosthog({ id: user.id, email: user.email, name: user.name });
    }
  }, [user]);

  return <>{children}</>;
}
