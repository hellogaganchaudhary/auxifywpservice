"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";

export type SettingsState = {
  notifications: Record<string, boolean>;
  quickReplies: Array<{ id: string; title: string; body: string }>;
  labels: Array<{ id: string; name: string; color: string }>;
  apiKeys: Array<{
    id: string;
    name: string;
    prefix: string;
    createdAt: string;
    lastUsedAt?: string | null;
    secret?: string;
  }>;
  auditLog: Array<{
    id: string;
    actorId: string;
    action: string;
    resourceType?: string | null;
    resourceId?: string | null;
    createdAt: string;
    metadata?: Record<string, unknown> | null;
  }>;
};

export function useSettings() {
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await api.get("/settings");
    setSettings(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateNotifications = useCallback(
    async (payload: Record<string, boolean>) => {
      const { data } = await api.patch("/settings/notifications", payload);
      setSettings((prev) => (prev ? { ...prev, notifications: data } : prev));
    },
    []
  );

  const createQuickReply = useCallback(
    async (payload: { title: string; body: string }) => {
      const { data } = await api.post("/settings/quick-replies", payload);
      setSettings((prev) =>
        prev ? { ...prev, quickReplies: [data, ...prev.quickReplies] } : prev
      );
    },
    []
  );

  const createLabel = useCallback(
    async (payload: { name: string; color?: string }) => {
      const { data } = await api.post("/settings/labels", payload);
      setSettings((prev) => (prev ? { ...prev, labels: [data, ...prev.labels] } : prev));
    },
    []
  );

  const createApiKey = useCallback(
    async (payload: { name: string }) => {
      const { data } = await api.post("/settings/api-keys", payload);
      setSettings((prev) => (prev ? { ...prev, apiKeys: [data, ...prev.apiKeys] } : prev));
      return data;
    },
    []
  );

  const revokeApiKey = useCallback(
    async (id: string) => {
      await api.delete(`/settings/api-keys/${id}`);
      setSettings((prev) =>
        prev ? { ...prev, apiKeys: prev.apiKeys.filter((item) => item.id !== id) } : prev
      );
    },
    []
  );

  const regenerateApiKey = useCallback(
    async (id: string) => {
      const { data } = await api.post(`/settings/api-keys/${id}/regenerate`);
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              apiKeys: prev.apiKeys.map((item) =>
                item.id === id ? { ...item, prefix: data.prefix, lastUsedAt: data.lastUsedAt } : item
              ),
            }
          : prev
      );
      return data;
    },
    []
  );

  return {
    settings,
    loading,
    reload: load,
    updateNotifications,
    createQuickReply,
    createLabel,
    createApiKey,
    revokeApiKey,
    regenerateApiKey,
  };
}