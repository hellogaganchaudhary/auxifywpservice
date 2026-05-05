"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";

export type ContactRecord = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  tags: string[];
  segments?: string[];
  customFields?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type ContactMetadata = {
  tags: string[];
  segments: Array<{ id: string; name: string; color: string }>;
  customFields: Array<{
    id: string;
    key: string;
    label: string;
    type: string;
    options?: unknown;
  }>;
};

export type ContactConversation = {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    content: string;
    type: string;
    direction: string;
    createdAt: string;
  }>;
};

export type CsvPreview = {
  columns: string[];
  sample: Array<Record<string, string>>;
  totalRows: number;
};

export function useContacts() {
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [activeContact, setActiveContact] = useState<ContactRecord | null>(null);
  const [conversations, setConversations] = useState<ContactConversation[]>([]);
  const [query, setQuery] = useState("");
  const [metadata, setMetadata] = useState<ContactMetadata>({
    tags: [],
    segments: [],
    customFields: [],
  });
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);

  const loadContacts = useCallback(async (search?: string) => {
    setLoading(true);
    const [contactsRes, metadataRes] = await Promise.all([
      api.get("/contacts", {
        params: search ? { q: search } : undefined,
      }),
      api.get("/contacts/metadata"),
    ]);
    setContacts(contactsRes.data);
    setMetadata(metadataRes.data);
    setLoading(false);
    setActiveContactId((current) => current ?? contactsRes.data?.[0]?.id ?? null);
  }, []);

  const loadContactDetail = useCallback(async (contactId: string) => {
    const [contactRes, convRes] = await Promise.all([
      api.get(`/contacts/${contactId}`),
      api.get(`/contacts/${contactId}/conversations`),
    ]);
    setActiveContact(contactRes.data);
    setConversations(convRes.data);
  }, []);

  const createContact = useCallback(async (payload: {
    name: string;
    phone: string;
    email?: string;
    tags?: string[];
    segments?: string[];
    customFields?: Record<string, unknown>;
  }) => {
    setSaving(true);
    const { data } = await api.post("/contacts", payload);
    await loadContacts(query);
    setActiveContactId(data.id);
    setSaving(false);
    return data;
  }, [loadContacts, query]);

  const updateContact = useCallback(async (
    contactId: string,
    payload: Partial<{
      name: string;
      phone: string;
      email?: string | null;
      tags: string[];
      segments: string[];
      customFields: Record<string, unknown>;
    }>
  ) => {
    setSaving(true);
    const { data } = await api.patch(`/contacts/${contactId}`, payload);
    await loadContacts(query);
    await loadContactDetail(contactId);
    setSaving(false);
    return data;
  }, [loadContactDetail, loadContacts, query]);

  const importCsv = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    setImporting(true);
    const { data } = await api.post("/contacts/import-csv", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    await loadContacts(query);
    setImporting(false);
    return data as { created: number; skipped: number };
  }, [loadContacts, query]);

  const importCsvMapped = useCallback(
    async (file: File, mapping: Record<string, string>) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mapping", JSON.stringify(mapping));
      setImporting(true);
      const { data } = await api.post("/contacts/import-csv/mapped", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await loadContacts(query);
      setImporting(false);
      return data as { created: number; skipped: number };
    },
    [loadContacts, query]
  );

  const previewCsv = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post("/contacts/import-csv/preview", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    setCsvPreview(data);
    return data as CsvPreview;
  }, []);

  const createSegment = useCallback(
    async (payload: { name: string; color?: string }) => {
      const { data } = await api.post("/contacts/segments", payload);
      await loadContacts(query);
      return data;
    },
    [loadContacts, query]
  );

  const createCustomField = useCallback(
    async (payload: { key: string; label: string; type: string; options?: unknown }) => {
      const { data } = await api.post("/contacts/custom-fields", payload);
      await loadContacts(query);
      return data;
    },
    [loadContacts, query]
  );

  const bulkUpdateContacts = useCallback(
    async (payload: { contactIds: string[]; tags?: string[]; segments?: string[] }) => {
      const { data } = await api.post("/contacts/bulk-update", payload);
      await loadContacts(query);
      return data;
    },
    [loadContacts, query]
  );

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    if (activeContactId) {
      loadContactDetail(activeContactId);
    }
  }, [activeContactId, loadContactDetail]);

  const stats = useMemo(() => {
    const tags = new Set(contacts.flatMap((contact) => contact.tags || []));
    return {
      totalContacts: contacts.length,
      taggedContacts: contacts.filter((contact) => (contact.tags || []).length > 0).length,
      totalTags: tags.size,
    };
  }, [contacts]);

  return {
    contacts,
    activeContactId,
    setActiveContactId,
    activeContact,
    conversations,
    query,
    setQuery,
    metadata,
    selectedContactIds,
    setSelectedContactIds,
    loading,
    saving,
    importing,
    csvPreview,
    stats,
    loadContacts,
    createContact,
    updateContact,
    importCsv,
    importCsvMapped,
    previewCsv,
    createSegment,
    createCustomField,
    bulkUpdateContacts,
  };
}
