"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import api from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

export type InboxConversation = {
  id: string;
  status: string;
  contact: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
  };
  lastMessage?: {
    id: string;
    content: string;
    type: string;
    direction: string;
    status?: string;
    sentAt: string;
  } | null;
  unreadCount: number;
  assignedTo?: {
    id: string;
    name: string;
    email?: string;
    role?: string;
  } | null;
  teamGroupId?: string | null;
  labels?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  notes?: Array<{
    id: string;
    body: string;
    createdAt: string;
    author?: { id: string; name: string; email?: string | null } | null;
  }>;
  createdAt?: string;
  updatedAt?: string;
};

export type InboxMessage = {
  id: string;
  conversationId?: string;
  content: string;
  type: string;
  direction: "INBOUND" | "OUTBOUND";
  status?: string;
  createdAt: string;
  attachments?: Array<{
    id: string;
    url: string;
    mimeType: string;
    fileName: string;
  }>;
};

type InboxFilters = {
  search: string;
  status: string;
  label: string;
  assignedTo: string;
};

export type SavedInboxView = {
  id: string;
  name: string;
  filters: InboxFilters;
  createdAt: string;
  updatedAt: string;
};

let inboxStore:
  | {
      conversations: InboxConversation[];
      activeConversationId: string | null;
      messages: InboxMessage[];
      filters: InboxFilters;
      savedViews: SavedInboxView[];
      loading: boolean;
      error: string | null;
      initialized: boolean;
    }
  | undefined;

const listeners = new Set<() => void>();
let socket: Socket | null = null;
const recentConversationEvents = new Map<string, number>();
const recentMessageEvents = new Map<string, number>();

function getStore() {
  if (!inboxStore) {
    inboxStore = {
      conversations: [],
      activeConversationId: null,
      messages: [],
      filters: {
        search: "",
        status: "",
        label: "",
        assignedTo: "",
      },
      savedViews: [],
      loading: true,
      error: null,
      initialized: false,
    };
  }

  return inboxStore;
}

function updateStore(partial: Partial<ReturnType<typeof getStore>>) {
  inboxStore = {
    ...getStore(),
    ...partial,
  };
  listeners.forEach((listener) => listener());
}

function upsertConversation(conversation: InboxConversation) {
  const store = getStore();
  const existing = store.conversations.find((item) => item.id === conversation.id);
  const conversations = existing
    ? store.conversations.map((item) => (item.id === conversation.id ? { ...item, ...conversation } : item))
    : [conversation, ...store.conversations];
  conversations.sort(
    (a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()
  );
  updateStore({ conversations });
}

function shouldProcessEvent(cache: Map<string, number>, key: string, windowMs = 1500) {
  const now = Date.now();
  const last = cache.get(key);
  if (last && now - last < windowMs) {
    return false;
  }
  cache.set(key, now);
  return true;
}

function upsertMessage(message: InboxMessage) {
  const store = getStore();
  const exists = store.messages.some((item) => item.id === message.id);
  if (exists) {
    updateStore({
      messages: store.messages.map((item) => (item.id === message.id ? { ...item, ...message } : item)),
    });
    return;
  }
  updateStore({ messages: [...store.messages, message] });
}

function createSocketIfNeeded() {
  if (socket || typeof window === "undefined") return socket;
  const token = getAccessToken();
  if (!token) return null;
  socket = io(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/inbox`, {
    transports: ["websocket"],
    auth: {
      token,
    },
  });
  return socket;
}

export function useInbox() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => forceUpdate((value) => value + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const store = getStore();

  const loadConversations = useCallback(async () => {
    updateStore({ loading: true, error: null });
    try {
      const currentStore = getStore();
      const params = new URLSearchParams();
      if (currentStore.filters.search) params.set("search", currentStore.filters.search);
      if (currentStore.filters.status) params.set("status", currentStore.filters.status);
      if (currentStore.filters.label) params.set("label", currentStore.filters.label);
      if (currentStore.filters.assignedTo) params.set("assignedTo", currentStore.filters.assignedTo);

      const { data } = await api.get(`/inbox/conversations${params.toString() ? `?${params.toString()}` : ""}`);
      updateStore({
        conversations: data,
        loading: false,
        error: null,
        initialized: true,
        activeConversationId:
          currentStore.activeConversationId && data.some((item: InboxConversation) => item.id === currentStore.activeConversationId)
            ? currentStore.activeConversationId
            : data?.[0]?.id ?? null,
      });
    } catch (error: any) {
      updateStore({
        loading: false,
        initialized: true,
        error: error?.response?.data?.message || error?.message || "Unable to load inbox conversations.",
      });
    }
  }, []);

  const loadViews = useCallback(async () => {
    const { data } = await api.get("/inbox/views");
    updateStore({ savedViews: data });
  }, []);

  const loadConversationDetail = useCallback(async (conversationId: string) => {
    const { data } = await api.get(`/inbox/conversations/${conversationId}`);
    const currentStore = getStore();
    updateStore({
      conversations: currentStore.conversations.map((conversation) =>
        conversation.id === conversationId ? { ...conversation, ...data } : conversation
      ),
    });
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    const { data } = await api.get(`/inbox/conversations/${conversationId}/messages`);
    updateStore({ messages: data });
  }, []);

  const setActiveConversationId = useCallback((conversationId: string | null) => {
    updateStore({ activeConversationId: conversationId });
  }, []);

  const setFilters = useCallback((nextFilters: Partial<InboxFilters>) => {
    updateStore({
      filters: {
        ...getStore().filters,
        ...nextFilters,
      },
    });
  }, []);

  const saveCurrentView = useCallback(async (name: string) => {
    const filters = getStore().filters;
    const { data } = await api.post("/inbox/views", { name, filters });
    updateStore({ savedViews: [data, ...getStore().savedViews] });
    return data as SavedInboxView;
  }, []);

  const deleteSavedView = useCallback(async (viewId: string) => {
    await api.post(`/inbox/views/${viewId}/delete`);
    updateStore({ savedViews: getStore().savedViews.filter((view) => view.id !== viewId) });
  }, []);

  const updateSavedView = useCallback(
    async (viewId: string, payload: { name?: string; filters?: Partial<InboxFilters> }) => {
      const current = getStore().savedViews.find((view) => view.id === viewId);
      if (!current) return null;
      const body = {
        ...(payload.name ? { name: payload.name } : {}),
        ...(payload.filters
          ? {
              filters: {
                ...current.filters,
                ...payload.filters,
              },
            }
          : {}),
      };
      const { data } = await api.patch(`/inbox/views/${viewId}`, body);
      updateStore({
        savedViews: getStore().savedViews.map((view) => (view.id === viewId ? data : view)),
      });
      return data as SavedInboxView;
    },
    []
  );

  const applySavedView = useCallback((view: SavedInboxView) => {
    updateStore({
      filters: {
        search: view.filters.search || "",
        status: view.filters.status || "",
        label: view.filters.label || "",
        assignedTo: view.filters.assignedTo || "",
      },
    });
  }, []);

  const sendMessage = useCallback(
    async (
      conversationId: string,
      content: string,
      attachments?: Array<{ url: string; mimeType: string; fileName: string }>,
      mediaType?: "text" | "image" | "video" | "audio" | "document"
    ) => {
      if (!content.trim() && !attachments?.length) return;
      const { data } = await api.post(`/inbox/conversations/${conversationId}/messages`, {
        content,
        attachments,
        mediaType,
      });
      updateStore({ messages: [...getStore().messages, data] });
      await loadConversations();
    },
    [loadConversations]
  );

  const createConversation = useCallback(
    async (payload: { phone: string; name?: string; email?: string }) => {
      const { data } = await api.post("/inbox/conversations", payload);
      upsertConversation(data);
      updateStore({ activeConversationId: data.id });
      await loadConversations();
      return data as InboxConversation;
    },
    [loadConversations]
  );

  const updateContactProfile = useCallback(
    async (
      conversationId: string,
      payload: { name?: string; email?: string | null; tags?: string[]; segments?: string[]; customFields?: Record<string, unknown> }
    ) => {
      const { data } = await api.patch(`/inbox/conversations/${conversationId}/contact`, payload);
      await Promise.all([loadConversations(), loadConversationDetail(conversationId)]);
      return data;
    },
    [loadConversationDetail, loadConversations]
  );

  const updateConversation = useCallback(
    async (
      conversationId: string,
      payload: { status?: string; assignedToId?: string | null; teamGroupId?: string | null }
    ) => {
      await api.patch(`/inbox/conversations/${conversationId}`, payload);
      await Promise.all([loadConversations(), loadConversationDetail(conversationId)]);
    },
    [loadConversationDetail, loadConversations]
  );

  const addLabel = useCallback(
    async (conversationId: string, payload: { name: string; color?: string }) => {
      await api.post(`/inbox/conversations/${conversationId}/labels`, payload);
      await Promise.all([loadConversations(), loadConversationDetail(conversationId)]);
    },
    [loadConversationDetail, loadConversations]
  );

  const addNote = useCallback(
    async (conversationId: string, body: string) => {
      await api.post(`/inbox/conversations/${conversationId}/notes`, { body });
      await loadConversationDetail(conversationId);
    },
    [loadConversationDetail]
  );

  useEffect(() => {
    if (!getStore().initialized) {
      loadConversations();
      loadViews();
    }
  }, [loadConversations, loadViews]);

  useEffect(() => {
    const instance = createSocketIfNeeded();
    if (!instance) return;

    const handleConversationUpdated = (payload: InboxConversation) => {
      if (!payload?.id || !shouldProcessEvent(recentConversationEvents, payload.id)) return;
      upsertConversation(payload);
    };
    const handleMessageCreated = (payload: InboxMessage) => {
      if (!payload?.id || !shouldProcessEvent(recentMessageEvents, payload.id)) return;
      if (payload.conversationId && payload.conversationId === getStore().activeConversationId) {
        upsertMessage(payload);
      }
    };

    instance.on("conversation.updated", handleConversationUpdated);
    instance.on("message.created", handleMessageCreated);

    return () => {
      instance.off("conversation.updated", handleConversationUpdated);
      instance.off("message.created", handleMessageCreated);
    };
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadConversations();
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [loadConversations, store.filters.label, store.filters.search, store.filters.status]);

  useEffect(() => {
    if (store.activeConversationId) {
      loadConversationDetail(store.activeConversationId);
      loadMessages(store.activeConversationId);
    }
  }, [store.activeConversationId, loadConversationDetail, loadMessages]);

  const activeConversation = useMemo(
    () => store.conversations.find((item) => item.id === store.activeConversationId) ?? null,
    [store.activeConversationId, store.conversations]
  );

  const availableLabels = useMemo(
    () =>
      Array.from(
        new Map(
          store.conversations
            .flatMap((conversation) => conversation.labels ?? [])
            .map((label) => [label.name.toLowerCase(), label])
        ).values()
      ),
    [store.conversations]
  );

  return {
    loading: store.loading,
    error: store.error,
    conversations: store.conversations,
    activeConversation,
    activeConversationId: store.activeConversationId,
    setActiveConversationId,
    messages: store.messages,
    filters: store.filters,
    setFilters,
    savedViews: store.savedViews,
    saveCurrentView,
    updateSavedView,
    deleteSavedView,
    applySavedView,
    loadConversations,
    createConversation,
    sendMessage,
    updateContactProfile,
    updateConversation,
    addLabel,
    addNote,
    availableLabels,
  };
}
