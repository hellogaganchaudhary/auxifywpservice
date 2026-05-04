"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Input } from "@/components/ui/input";
import { useInbox } from "@/hooks/useInbox";

export function ConversationList() {
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    loading,
    filters,
    setFilters,
    availableLabels,
    savedViews,
    saveCurrentView,
    updateSavedView,
    deleteSavedView,
    applySavedView,
    createConversation,
  } = useInbox();
  const saveNameRef = useRef<HTMLInputElement | null>(null);
  const [newContact, setNewContact] = useState({ phone: "", name: "", email: "" });
  const [creating, setCreating] = useState(false);

  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: conversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 88,
    overscan: 6,
  });

  const statuses = useMemo(() => ["", "OPEN", "PENDING", "RESOLVED"], []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-3 border-b border-slate-200 bg-white pb-4">
        <div>
          <div className="text-xl font-semibold text-slate-950">Inbox conversations</div>
          <div className="text-xs text-slate-500">Full-screen search, filters, saved views, and conversation list.</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Create conversation</div>
          <div className="mt-2 grid gap-2">
            <Input placeholder="WhatsApp number with country code" value={newContact.phone} onChange={(event) => setNewContact((prev) => ({ ...prev, phone: event.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Name" value={newContact.name} onChange={(event) => setNewContact((prev) => ({ ...prev, name: event.target.value }))} />
              <Input placeholder="Email optional" value={newContact.email} onChange={(event) => setNewContact((prev) => ({ ...prev, email: event.target.value }))} />
            </div>
            <Button
              disabled={creating || !newContact.phone.trim()}
              onClick={async () => {
                setCreating(true);
                try {
                  await createConversation(newContact);
                  setNewContact({ phone: "", name: "", email: "" });
                } finally {
                  setCreating(false);
                }
              }}
            >
              {creating ? "Creating…" : "Start conversation"}
            </Button>
          </div>
        </div>
        <Input
          placeholder="Search name, phone, or message"
          value={filters.search}
          onChange={(event) => setFilters({ search: event.target.value })}
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            className="h-10 rounded-sm border border-border bg-bg-surface px-3 text-sm"
            value={filters.status}
            onChange={(event) => setFilters({ status: event.target.value })}
          >
            {statuses.map((status) => (
              <option key={status || "ALL"} value={status}>
                {status || "All statuses"}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-sm border border-border bg-bg-surface px-3 text-sm"
            value={filters.label}
            onChange={(event) => setFilters({ label: event.target.value })}
          >
            <option value="">All labels</option>
            {availableLabels.map((label) => (
              <option key={label.id} value={label.name}>
                {label.name}
              </option>
            ))}
          </select>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs uppercase text-text-muted">Saved views</div>
            <button
              className="text-xs text-accent"
              onClick={async () => {
                const name = saveNameRef.current?.value?.trim();
                if (!name) return;
                const existing = savedViews.find((view) => view.name.toLowerCase() === name.toLowerCase());
                if (existing) {
                  await updateSavedView(existing.id, { filters });
                } else {
                  await saveCurrentView(name);
                }
                if (saveNameRef.current) saveNameRef.current.value = "";
              }}
            >
              Save current
            </button>
          </div>
          <input
            ref={saveNameRef}
            className="mt-2 h-9 w-full rounded-sm border border-border bg-bg-surface px-3 text-xs"
            placeholder="View name"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {savedViews.length === 0 ? (
              <span className="text-xs text-text-muted">No saved views yet.</span>
            ) : (
              savedViews.map((view) => (
                <div key={view.id} className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] ${
                  view.filters.search === filters.search &&
                  view.filters.status === filters.status &&
                  view.filters.label === filters.label &&
                  view.filters.assignedTo === filters.assignedTo
                    ? "border-border-strong bg-bg-overlay"
                    : "border-border"
                }`}>
                  <button onClick={() => applySavedView(view)}>{view.name}</button>
                  <button
                    className="text-text-muted"
                    onClick={async () => {
                      const next = window.prompt("Rename saved view", view.name)?.trim();
                      if (!next || next === view.name) return;
                      await updateSavedView(view.id, { name: next });
                    }}
                  >
                    edit
                  </button>
                  <button
                    className="text-text-muted"
                    onClick={async () => {
                      await updateSavedView(view.id, { filters });
                    }}
                  >
                    sync
                  </button>
                  <button className="text-text-muted" onClick={() => deleteSavedView(view.id)}>
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <div ref={parentRef} className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
        {loading && (
          <div className="text-xs text-text-muted">Loading conversations...</div>
        )}
        {!loading && conversations.length === 0 && (
          <div className="text-xs text-text-muted">No conversations yet.</div>
        )}
        <div
          className="relative"
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const conv = conversations[virtualRow.index];

            return (
              <div
                key={conv.id}
                className="absolute left-0 top-0 w-full px-0"
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                <button
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`mb-2 w-full rounded-2xl border px-3 py-3 text-left text-sm transition hover:border-emerald-200 hover:bg-emerald-50/60 ${
                    activeConversationId === conv.id ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{conv.contact.name}</div>
                      <div className="text-xs text-text-muted">{conv.contact.phone}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-text-muted">
                        {conv.lastMessage?.sentAt
                          ? new Date(conv.lastMessage.sentAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-wide text-text-secondary">
                        {conv.status}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 line-clamp-2 text-xs text-text-secondary">
                    {conv.lastMessage?.content || "No messages"}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {conv.assignedTo?.name ? (
                      <span className="rounded-full border border-border px-2 py-1 text-[10px] text-text-secondary">
                        {conv.assignedTo.name}
                      </span>
                    ) : null}
                    {(conv.labels ?? []).slice(0, 2).map((label) => (
                      <span
                        key={label.id}
                        className="rounded-full px-2 py-1 text-[10px]"
                        style={{
                          backgroundColor:
                            label.color === "green"
                              ? "rgba(37,211,102,0.12)"
                              : label.color === "red"
                                ? "rgba(255,71,87,0.12)"
                                : "rgba(255,255,255,0.06)",
                        }}
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
