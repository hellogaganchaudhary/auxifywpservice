"use client";

import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AuthUser } from "@/stores/auth.store";

export function RoleGuard({
  roles,
  children,
  fallback = null,
}: {
  roles: Array<AuthUser["role"]>;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return fallback;
  if (!roles.includes(user.role)) return fallback;
  return <>{children}</>;
}
