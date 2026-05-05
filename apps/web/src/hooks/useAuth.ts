"use client";

import { useCallback } from "react";
import api from "@/lib/api";
import { setAccessToken } from "@/lib/auth";
import { useAuthStore } from "@/stores/auth.store";
import type { AuthUser } from "@/stores/auth.store";

export function useAuth() {
  const { user, isLoading, setUser, setLoading } = useAuthStore();

  const bootstrap = useCallback(async () => {
    try {
      try {
        const me = await api.get("/auth/me");
        setUser(me.data.user);
        return;
      } catch {
        const refresh = await api.get("/auth/refresh");
        if (refresh.data?.accessToken) {
          setAccessToken(refresh.data.accessToken);
        }
      }

      const me = await api.get("/auth/me");
      setUser(me.data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setUser]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    setLoading(false);
  }, [setUser]);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    }
    setAccessToken(null);
    setUser(null);
    setLoading(false);
  }, [setLoading, setUser]);

  const hasRole = useCallback(
    (roles: Array<AuthUser["role"]>) => !!user && roles.includes(user.role),
    [user]
  );

  const updateProfile = useCallback(async (payload: { name: string; phone?: string; profileInfo?: string }) => {
    const { data } = await api.patch("/auth/profile", payload);
    setUser(data.user);
    return data.user;
  }, [setUser]);

  return { user, isLoading, login, logout, bootstrap, hasRole, updateProfile };
}
