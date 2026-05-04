"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";

export type AnalyticsOverview = {
  messages: number;
  conversations: number;
  avgResponseTime: number;
  opened: number;
  closed: number;
};

export type AgentPerformanceRecord = {
  id: string;
  name: string;
  role: string;
  lastActiveAt?: string | null;
  conversationsHandled: number;
  avgResolutionTime: number;
  firstReplyTime: number;
};

export type TemplatePerformanceRecord = {
  id: string;
  name: string;
  status: string;
  usageCount: number;
  deliveryRate: number;
  readRate: number;
  failureRate: number;
};

export type BroadcastReportRecord = {
  id: string;
  name: string;
  status: string;
  stats: {
    sent: number;
    delivered: number;
    read: number;
    replied: number;
    failed?: number;
  };
};

export type CreditUsage = {
  dailySpend: Array<{ date: string; amount: number }>;
  topTemplates: Array<{ name: string; amount: number }>;
  totalSpent: number;
};

export function useAnalytics() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformanceRecord[]>([]);
  const [templatePerformance, setTemplatePerformance] = useState<TemplatePerformanceRecord[]>([]);
  const [broadcastReports, setBroadcastReports] = useState<BroadcastReportRecord[]>([]);
  const [creditUsage, setCreditUsage] = useState<CreditUsage | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    const [overviewRes, agentRes, templateRes, broadcastRes, creditRes] = await Promise.all([
      api.get("/analytics/overview"),
      api.get("/analytics/agent-performance"),
      api.get("/analytics/template-performance"),
      api.get("/analytics/broadcast-reports"),
      api.get("/analytics/credit-usage"),
    ]);

    setOverview(overviewRes.data);
    setAgentPerformance(agentRes.data);
    setTemplatePerformance(templateRes.data);
    setBroadcastReports(broadcastRes.data);
    setCreditUsage(creditRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return {
    overview,
    agentPerformance,
    templatePerformance,
    broadcastReports,
    creditUsage,
    loading,
    reload: loadAnalytics,
  };
}

export type TemplateRecord = {
  id: string;
  name: string;
  category: string;
  language: string;
  status: string;
  body: string;
  header?: string | null;
  footer?: string | null;
  qualityScore?: string | null;
  rejectionReason?: string | null;
  metaTemplateId?: string | null;
};

export type TemplateAnalyticsRecord = {
  id: string;
  name: string;
  status: string;
  qualityScore: string;
  rejectionReason?: string | null;
  usageCount: number;
  deliveryRate: number;
  readRate: number;
  failureRate: number;
};

export function useTemplates(status?: string) {
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [analytics, setAnalytics] = useState<TemplateAnalyticsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [templatesRes, analyticsRes] = await Promise.all([
        api.get(`/templates${status ? `?status=${status}` : ""}`),
        api.get("/templates/analytics/summary"),
      ]);
      setTemplates(Array.isArray(templatesRes.data) ? templatesRes.data : []);
      setAnalytics(Array.isArray(analyticsRes.data) ? analyticsRes.data : []);
    } catch (loadError: any) {
      setTemplates([]);
      setAnalytics([]);
      setError(loadError?.response?.data?.message || "Templates could not be fetched.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const createTemplate = useCallback(
    async (payload: {
      name: string;
      category: string;
      language: string;
      body: string;
      header?: string;
      footer?: string;
      buttons?: Array<{ type: string; text: string }>;
    }) => {
      const { data } = await api.post("/templates", payload);
      await load();
      return data;
    },
    [load]
  );

  const submitTemplate = useCallback(
    async (id: string) => {
      const { data } = await api.post(`/templates/${id}/submit`);
      await load();
      return data;
    },
    [load]
  );

  const syncTemplateStatus = useCallback(
    async (id: string) => {
      const { data } = await api.post(`/templates/${id}/sync-status`);
      await load();
      return data;
    },
    [load]
  );

  const syncMetaTemplates = useCallback(async () => {
    const { data } = await api.post("/templates/sync-meta");
    await load();
    return data;
  }, [load]);

  return {
    templates,
    analytics,
    loading,
    error,
    reload: load,
    createTemplate,
    submitTemplate,
    syncTemplateStatus,
    syncMetaTemplates,
  };
}

export type BroadcastRecord = {
  id: string;
  name: string;
  templateId: string;
  status: string;
  scheduledAt?: string | null;
  sentAt?: string | null;
  audience: {
    type?: string;
    segmentId?: string;
    tag?: string;
    count?: number;
  } | Record<string, unknown>;
  templateVariables?: Record<string, string> | null;
  stats?: {
    sent?: number;
    delivered?: number;
    read?: number;
    failed?: number;
    replied?: number;
  } | null;
  createdAt: string;
};

export function useBroadcasts(status?: string) {
  const [broadcasts, setBroadcasts] = useState<BroadcastRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await api.get(`/broadcasts${status ? `?status=${status}` : ""}`);
    setBroadcasts(data);
    setLoading(false);
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const createBroadcast = useCallback(
    async (payload: {
      name: string;
      templateId: string;
      templateVariables?: Record<string, string>;
      audience: Record<string, unknown>;
      scheduledAt?: string | null;
    }) => {
      const { data } = await api.post("/broadcasts", payload);
      await load();
      return data;
    },
    [load]
  );

  const sendBroadcast = useCallback(
    async (id: string) => {
      const { data } = await api.post(`/broadcasts/${id}/send`);
      await load();
      return data;
    },
    [load]
  );

  const scheduleBroadcast = useCallback(
    async (id: string, scheduledAt: string) => {
      const { data } = await api.post(`/broadcasts/${id}/schedule`, { scheduledAt });
      await load();
      return data;
    },
    [load]
  );

  const cancelBroadcast = useCallback(
    async (id: string) => {
      const { data } = await api.delete(`/broadcasts/${id}`);
      await load();
      return data;
    },
    [load]
  );

  const getBroadcastAnalytics = useCallback(async (id: string) => {
    const { data } = await api.get(`/broadcasts/${id}/analytics`);
    return data;
  }, []);

  return {
    broadcasts,
    loading,
    reload: load,
    createBroadcast,
    sendBroadcast,
    scheduleBroadcast,
    cancelBroadcast,
    getBroadcastAnalytics,
  };
}
