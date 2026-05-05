"use client";

import { useRef, useState } from "react";
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
    error,
    filters,
    setFilters,
    createConversation,
  } = useInbox();
  const [newContact, setNewContact] = useState({ phone: "", name: "", email: "" });
  const [creating, setCreating] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);

  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: conversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140,
    overscan: 6,
  });

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-white">
      <div className="shrink-0 border-b border-slate-200 bg-white px-1 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xl font-semibold text-slate-950">Chats</div>
            <div className="text-xs text-slate-500">Search by customer name or number.</div>
          </div>
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-xl font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-accent-hover"
            aria-label="Start new chat"
            title="Start new chat"
          >
            ✎
          </button>
        </div>
        <Input
          className="mt-4 rounded-full border-slate-200 bg-slate-50 px-4"
          placeholder="Search chats by name or number"
          value={filters.search}
          onChange={(event) => setFilters({ search: event.target.value })}
        />
      </div>
      <div ref={parentRef} className="min-h-0 flex-1 overflow-y-auto py-3 pr-1">
        {error && (
          <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-700">
            {error}
          </div>
        )}
        {loading && (
          <div className="text-xs text-text-muted">Loading conversations...</div>
        )}
        {!loading && conversations.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No conversations yet. Tap the pencil button to start one.
          </div>
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
                ref={rowVirtualizer.measureElement}
                data-index={virtualRow.index}
                className="absolute left-0 top-0 w-full px-1 pb-3 pt-1"
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                <button
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`w-full rounded-3xl border px-4 py-3 text-left text-sm shadow-sm transition hover:border-blue-200 hover:bg-blue-50/60 hover:shadow-md ${
                    activeConversationId === conv.id ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e8f2ff] text-sm font-semibold text-accent">
                        {(conv.contact.name || conv.contact.phone || "C").slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-950">{conv.contact.name || conv.contact.phone}</div>
                        <div className="text-xs text-text-muted">{conv.contact.phone}</div>
                      </div>
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
                  <div className="mt-2 line-clamp-2 pl-14 text-xs text-text-secondary">
                    {conv.lastMessage?.content || "No messages"}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 pl-14">
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
      {composeOpen ? (
        <div className="absolute inset-0 z-40 flex items-end justify-center bg-slate-950/30 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-slate-950">New chat</div>
                <div className="mt-1 text-sm text-slate-500">Enter a WhatsApp number with country code.</div>
              </div>
              <button type="button" className="text-xl text-slate-400" onClick={() => setComposeOpen(false)}>×</button>
            </div>
            <div className="mt-5 space-y-3">
              <Input placeholder="Mobile number, e.g. 919876543210" value={newContact.phone} onChange={(event) => setNewContact((prev) => ({ ...prev, phone: event.target.value }))} />
              <Input placeholder="Name" value={newContact.name} onChange={(event) => setNewContact((prev) => ({ ...prev, name: event.target.value }))} />
              <Input placeholder="Email optional" value={newContact.email} onChange={(event) => setNewContact((prev) => ({ ...prev, email: event.target.value }))} />
              <Button
                className="w-full rounded-full"
                disabled={creating || !newContact.phone.trim()}
                onClick={async () => {
                  setCreating(true);
                  try {
                    await createConversation(newContact);
                    setNewContact({ phone: "", name: "", email: "" });
                    setComposeOpen(false);
                  } finally {
                    setCreating(false);
                  }
                }}
              >
                {creating ? "Starting…" : "Start chat"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
