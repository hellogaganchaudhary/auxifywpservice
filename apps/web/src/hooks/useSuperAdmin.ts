"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";

export type SuperAdminStats = {
  totalOrganizations: number;
  activeUsers: number;
  messagesToday: number;
  mrr: number;
};

export type SuperAdminOrganizationRow = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
  wabaConfig?: {
    status?: string | null;
    verifiedAt?: string | null;
  } | null;
  wallet?: {
    balance: number;
    currency: string;
  } | null;
  _count: {
    users: number;
  };
};

export type SuperAdminOrganizationDetail = {
  org: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    users: Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      lastActiveAt?: string | null;
    }>;
    invites: Array<{
      id: string;
      email: string;
      role: string;
      expiresAt: string;
      acceptedAt?: string | null;
      createdAt: string;
    }>;
    broadcasts: Array<{
      id: string;
      name: string;
      status: string;
      scheduledAt?: string | null;
      sentAt?: string | null;
      stats?: {
        sent?: number;
        delivered?: number;
        read?: number;
        replied?: number;
        failed?: number;
      } | null;
    }>;
    wabaConfig?: {
      accessToken: string;
      phoneNumberId: string;
      wabaId: string;
      businessAccountId: string;
      displayNumber?: string | null;
      businessName?: string | null;
      qualityRating?: string | null;
      status?: string | null;
      verifiedAt?: string | null;
      updatedAt: string;
    } | null;
    wallet?: {
      balance: number;
      currency: string;
      autoRechargeEnabled: boolean;
      autoRechargeThreshold: number;
      autoRechargeAmount: number;
      updatedAt: string;
    } | null;
    transactions: Array<{
      id: string;
      amount: number;
      type: string;
      status?: string;
      currency?: string;
      metadata?: Record<string, unknown> | null;
      createdAt: string;
    }>;
  };
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

export type CreateOrganizationPayload = {
  name: string;
  slug?: string;
  plan?: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
};

export function useSuperAdminOrganizations(search = "") {
  const [data, setData] = useState<{
    items: SuperAdminOrganizationRow[];
    total: number;
    page: number;
    pageSize: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/super-admin/organizations", {
        params: search ? { q: search } : undefined,
      });
      setData(data);
    } catch (issue: any) {
      setError(issue?.response?.data?.message || "Unable to load organizations.");
      setData({ items: [], total: 0, page: 1, pageSize: 20 });
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

export function useCreateSuperAdminOrganization() {
  const [saving, setSaving] = useState(false);

  const createOrganization = useCallback(
    async (payload: CreateOrganizationPayload) => {
      setSaving(true);
      try {
        const { data } = await api.post("/super-admin/organizations", payload);
        return data;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  return { createOrganization, saving };
}

export function useSuperAdminStats() {
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/super-admin/stats");
        setStats(data);
      } catch (issue: any) {
        setError(issue?.response?.data?.message || "Unable to load platform stats.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return { stats, loading, error };
}

export function useSuperAdminAuditLog(limit = 50) {
  const [data, setData] = useState<SuperAdminOrganizationDetail["auditLog"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/super-admin/audit-log", {
        params: { limit },
      });
      setData(data);
    } catch (issue: any) {
      setError(issue?.response?.data?.message || "Unable to load audit log.");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

export function useSuperAdminOrganizationDetail(id: string) {
  const [detail, setDetail] = useState<SuperAdminOrganizationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingAdmin, setSavingAdmin] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      setDetail(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await api.get(`/super-admin/organizations/${id}`);
    setDetail(data);
    setLoading(false);
  }, [id]);

  const updateOrganization = useCallback(async (payload: {
    name?: string;
    slug?: string;
    plan?: string;
    isActive?: boolean;
  }) => {
    await api.patch(`/super-admin/organizations/${id}`, payload);
    await load();
  }, [id, load]);

  const resendInvite = useCallback(async (email: string) => {
    await api.post(`/super-admin/organizations/${id}/invite-owner`, { email });
    await load();
  }, [id, load]);

  const createAdmin = useCallback(async (payload: {
    name: string;
    email: string;
    password: string;
    role?: "ADMIN" | "MANAGER";
  }) => {
    setSavingAdmin(true);
    try {
      const { data } = await api.post(`/super-admin/organizations/${id}/admins`, payload);
      await load();
      return data;
    } finally {
      setSavingAdmin(false);
    }
  }, [id, load]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    detail,
    loading,
    reload: load,
    updateOrganization,
    resendInvite,
    createAdmin,
    savingAdmin,
  };
}
