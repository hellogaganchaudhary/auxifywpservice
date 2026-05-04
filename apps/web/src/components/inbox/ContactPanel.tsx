"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useInbox } from "@/hooks/useInbox";
import { useTeam } from "@/hooks/useTeam";

export function ContactPanel() {
  const { conversations, activeConversation, activeConversationId, addLabel, addNote, updateConversation, updateContactProfile } = useInbox();
  const { members, groups } = useTeam();
  const [labelName, setLabelName] = useState("");
  const [note, setNote] = useState("");
  const [contactDraft, setContactDraft] = useState({ name: "", email: "", tags: "", segments: "" });

  const active = activeConversation;
  const previousConversations = active
    ? conversations.filter((conversation) => conversation.contact.id === active.contact.id && conversation.id !== active.id)
    : [];

  useEffect(() => {
    if (!active) return;
    setContactDraft({
      name: active.contact.name || "",
      email: active.contact.email || "",
      tags: "",
      segments: "",
    });
  }, [active?.contact.id]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="text-sm font-medium">Contact</div>
      {!active && (
        <div className="text-xs text-text-secondary">Select a conversation</div>
      )}
      {active && (
        <>
          <div className="text-xs text-text-secondary">
            Name: {active.contact.name}
          </div>
          <div className="text-xs text-text-secondary">
            Phone: {active.contact.phone}
          </div>
          {active.contact.email && (
            <div className="text-xs text-text-secondary">
              Email: {active.contact.email}
            </div>
          )}
          <div className="space-y-2 rounded-md border border-border bg-bg-elevated p-3">
            <div className="text-xs font-medium text-text-primary">Save contact profile</div>
            <input
              className="h-10 w-full rounded-sm border border-border bg-bg-surface px-3 text-sm"
              placeholder="Customer name"
              value={contactDraft.name}
              onChange={(event) => setContactDraft((prev) => ({ ...prev, name: event.target.value }))}
            />
            <input
              className="h-10 w-full rounded-sm border border-border bg-bg-surface px-3 text-sm"
              placeholder="Email optional"
              value={contactDraft.email}
              onChange={(event) => setContactDraft((prev) => ({ ...prev, email: event.target.value }))}
            />
            <input
              className="h-10 w-full rounded-sm border border-border bg-bg-surface px-3 text-sm"
              placeholder="Tags comma separated"
              value={contactDraft.tags}
              onChange={(event) => setContactDraft((prev) => ({ ...prev, tags: event.target.value }))}
            />
            <input
              className="h-10 w-full rounded-sm border border-border bg-bg-surface px-3 text-sm"
              placeholder="Segments comma separated"
              value={contactDraft.segments}
              onChange={(event) => setContactDraft((prev) => ({ ...prev, segments: event.target.value }))}
            />
            <Button
              onClick={async () => {
                if (!activeConversationId) return;
                await updateContactProfile(activeConversationId, {
                  name: contactDraft.name || active.contact.name,
                  email: contactDraft.email || active.contact.email || null,
                  tags: contactDraft.tags ? contactDraft.tags.split(",").map((item) => item.trim()).filter(Boolean) : undefined,
                  segments: contactDraft.segments ? contactDraft.segments.split(",").map((item) => item.trim()).filter(Boolean) : undefined,
                });
              }}
            >
              Save contact
            </Button>
            <div className="text-[11px] text-text-muted">Use this for users who message directly with only a phone number.</div>
          </div>
          <div className="space-y-2 pt-2">
            <div className="text-xs font-medium text-text-primary">Status</div>
            <select
              className="h-10 w-full rounded-sm border border-border bg-bg-surface px-3 text-sm"
              value={active.status}
              onChange={(event) => {
                if (activeConversationId) {
                  updateConversation(activeConversationId, { status: event.target.value });
                }
              }}
            >
              {[
                "OPEN",
                "PENDING",
                "RESOLVED",
              ].map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 pt-2">
            <div className="text-xs font-medium text-text-primary">Assignment</div>
            <select
              className="h-10 w-full rounded-sm border border-border bg-bg-surface px-3 text-sm"
              value={active.assignedTo?.id || ""}
              onChange={(event) => {
                if (activeConversationId) {
                  updateConversation(activeConversationId, {
                    assignedToId: event.target.value || null,
                    teamGroupId: null,
                  });
                }
              }}
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} · {member.role}
                </option>
              ))}
            </select>
            <select
              className="h-10 w-full rounded-sm border border-border bg-bg-surface px-3 text-sm"
              value={active.teamGroupId || ""}
              onChange={(event) => {
                if (activeConversationId) {
                  updateConversation(activeConversationId, {
                    teamGroupId: event.target.value || null,
                    assignedToId: null,
                  });
                }
              }}
            >
              <option value="">Route via team group</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} · {group.members.length} members
                </option>
              ))}
            </select>
            {active.teamGroupId ? (
              <div className="text-[11px] text-text-muted">
                Routed via {groups.find((group) => group.id === active.teamGroupId)?.name || "team group"}
              </div>
            ) : null}
          </div>
          <div className="space-y-2 pt-2">
            <div className="text-xs font-medium text-text-primary">Labels</div>
            <div className="flex flex-wrap gap-2">
              {(active.labels ?? []).map((label) => (
                <span
                  key={label.id}
                  className="rounded-full border border-border px-2 py-1 text-[10px] text-text-secondary"
                >
                  {label.name}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="h-10 flex-1 rounded-sm border border-border bg-bg-surface px-3 text-sm"
                placeholder="Add label"
                value={labelName}
                onChange={(event) => setLabelName(event.target.value)}
              />
              <Button
                onClick={async () => {
                  if (!activeConversationId || !labelName.trim()) return;
                  await addLabel(activeConversationId, { name: labelName, color: "green" });
                  setLabelName("");
                }}
              >
                Add
              </Button>
            </div>
          </div>
          <div className="space-y-2 pt-2">
            <div className="text-xs font-medium text-text-primary">Internal notes</div>
            <div className="space-y-2">
              {(active.notes ?? []).map((item) => (
                <div key={item.id} className="rounded-md border border-border bg-bg-elevated p-2 text-xs">
                  <div className="text-text-primary">{item.body}</div>
                  <div className="mt-1 text-[10px] text-text-muted">
                    {item.author?.name ?? "Unknown"} · {new Date(item.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
            <textarea
              className="min-h-24 w-full rounded-sm border border-border bg-bg-surface px-3 py-2 text-sm"
              placeholder="Add an internal note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            <Button
              onClick={async () => {
                if (!activeConversationId || !note.trim()) return;
                await addNote(activeConversationId, note);
                setNote("");
              }}
            >
              Save note
            </Button>
          </div>
          <div className="space-y-2 pt-2">
            <div className="text-xs font-medium text-text-primary">Previous conversations</div>
            {previousConversations.length === 0 ? (
              <div className="text-xs text-text-muted">No previous conversations for this contact.</div>
            ) : (
              previousConversations.slice(0, 5).map((conversation) => (
                <div key={conversation.id} className="rounded-md border border-border bg-bg-elevated p-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-text-primary">{conversation.status}</span>
                    <span className="text-text-muted">
                      {conversation.updatedAt ? new Date(conversation.updatedAt).toLocaleDateString() : ""}
                    </span>
                  </div>
                  <div className="mt-1 line-clamp-2 text-text-secondary">
                    {conversation.lastMessage?.content || "No messages yet."}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
