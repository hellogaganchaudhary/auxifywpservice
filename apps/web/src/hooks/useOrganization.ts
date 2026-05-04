"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";

export type OrganizationProfile = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  timezone?: string | null;
  language?: string | null;
};

export type WabaConfig = {
  accessToken?: string | null;
  phoneNumberId?: string | null;
  wabaId?: string | null;
  businessAccountId?: string | null;
  webhookVerifyToken?: string | null;
  displayNumber?: string | null;
  businessName?: string | null;
  qualityRating?: string | null;
  status?: string | null;
  verifiedAt?: string | null;
};

export type WabaWebhookProfile = {
  callbackUrl: string | null;
  verifyToken: string | null;
  isPublicUrlConfigured: boolean;
  configuredBaseUrl: string | null;
};

export type WabaWebhookLog = {
  id: string;
  eventType: string;
  status: string;
  externalId?: string | null;
  createdAt: string;
  processedAt?: string | null;
};

export function useOrganization() {
  const [organization, setOrganization] = useState<OrganizationProfile | null>(null);
  const [wabaConfig, setWabaConfig] = useState<WabaConfig | null>(null);
  const [webhookProfile, setWebhookProfile] = useState<WabaWebhookProfile | null>(null);
  const [webhookLogs, setWebhookLogs] = useState<WabaWebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [orgRes, wabaRes, webhookProfileRes, webhookLogsRes] = await Promise.all([
        api.get("/organization"),
        api.get("/organization/waba-config"),
        api.get("/organization/waba-config/webhook-profile"),
        api.get("/organization/waba-config/webhook-logs"),
      ]);
      setOrganization(orgRes.data);
      setWabaConfig(wabaRes.data);
      setWebhookProfile(webhookProfileRes.data);
      setWebhookLogs(webhookLogsRes.data);
    } catch (loadError: any) {
      setOrganization(null);
      setWabaConfig(null);
      setWebhookProfile(null);
      setWebhookLogs([]);
      setError(loadError?.response?.status === 401 ? "Please login as an organization admin to view WhatsApp settings." : "Unable to load organization settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  const updateOrganization = useCallback(async (payload: Partial<OrganizationProfile>) => {
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.patch("/organization", payload);
      setOrganization(data);
      return data;
    } catch (updateError: any) {
      setError(updateError?.response?.status === 400 ? "Organization profile is unavailable for this account." : "Unable to update organization.");
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  const updateWabaConfig = useCallback(async (payload: {
    accessToken: string;
    phoneNumberId: string;
    wabaId: string;
    businessAccountId: string;
    webhookVerifyToken?: string;
  }) => {
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.patch("/organization/waba-config", payload);
      setWabaConfig(data);
      return data;
    } catch (updateError: any) {
      setError(updateError?.response?.status === 400 ? "Organization admin access is required to save WhatsApp credentials." : "Unable to save WhatsApp credentials.");
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  const syncWabaConfig = useCallback(async (payload: {
    accessToken: string;
    phoneNumberId?: string;
    wabaId?: string;
    businessAccountId?: string;
    webhookVerifyToken?: string;
  }) => {
    setSyncing(true);
    setError(null);
    try {
      const { data } = await api.post("/organization/waba-config/sync", payload);
      setWabaConfig(data);
      return data;
    } catch (syncError: any) {
      setError(syncError?.response?.status === 400 ? "Organization admin access is required to sync WhatsApp credentials." : "Unable to fetch WhatsApp profile.");
      return null;
    } finally {
      setSyncing(false);
    }
  }, []);

  const verifyWaba = useCallback(async () => {
    setVerifying(true);
    setError(null);
    try {
      const { data } = await api.post("/organization/waba-config/verify");
      setWabaConfig((prev) => ({ ...prev, ...data }));
      return data;
    } catch (verifyError: any) {
      setError(verifyError?.response?.status === 400 ? "Save WhatsApp credentials before verifying." : "Unable to verify WhatsApp credentials.");
      return null;
    } finally {
      setVerifying(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    organization,
    wabaConfig,
    webhookProfile,
    webhookLogs,
    loading,
    saving,
    syncing,
    verifying,
    error,
    reload: load,
    updateOrganization,
    updateWabaConfig,
    syncWabaConfig,
    verifyWaba,
  };
}
