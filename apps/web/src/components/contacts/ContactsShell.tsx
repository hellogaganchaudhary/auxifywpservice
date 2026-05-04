"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RoleGuard } from "@/components/RoleGuard";
import { useContacts } from "@/hooks/useContacts";

function formatDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export function ContactsShell() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const {
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
    deleteContact,
    importCsvMapped,
    previewCsv,
    createSegment,
    createCustomField,
    bulkUpdateContacts,
  } = useContacts();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    tags: "",
  });
  const [detailForm, setDetailForm] = useState({
    name: "",
    phone: "",
    email: "",
    tags: "",
    segments: "",
  });
  const [importResult, setImportResult] = useState<string>("");
  const [importPreview, setImportPreview] = useState<string[]>([]);
  const [segmentForm, setSegmentForm] = useState({ name: "", color: "blue" });
  const [customFieldForm, setCustomFieldForm] = useState({
    key: "",
    label: "",
    type: "text",
    options: "",
  });
  const [csvMapping, setCsvMapping] = useState({
    name: "name",
    phone: "phone",
    email: "email",
    tags: "tags",
    segments: "segments",
  });

  const selectedContact = useMemo(() => activeContact, [activeContact]);

  const syncDetailForm = (contact = activeContact) => {
    setDetailForm({
      name: contact?.name || "",
      phone: contact?.phone || "",
      email: contact?.email || "",
      tags: (contact?.tags || []).join(", "),
      segments: (contact?.segments || []).join(", "),
    });
  };

  useEffect(() => {
    syncDetailForm(activeContact);
  }, [activeContact]);

  const handleSearch = async (value: string) => {
    setQuery(value);
    await loadContacts(value);
  };

  const handleCreate = async () => {
    if (!form.name || !form.phone) return;
    await createContact({
      name: form.name,
      phone: form.phone,
      email: form.email || undefined,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      segments: [],
    });
    setForm({ name: "", phone: "", email: "", tags: "" });
  };

  const handleSaveDetail = async () => {
    if (!activeContactId) return;
    await updateContact(activeContactId, {
      name: detailForm.name,
      phone: detailForm.phone,
      email: detailForm.email || null,
      tags: detailForm.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      segments: detailForm.segments
        .split(",")
        .map((segment) => segment.trim())
        .filter(Boolean),
    });
  };

  const handleImport = async (file?: File) => {
    if (!file) return;
    const preview = await previewCsv(file);
    setImportPreview(preview.sample.map((row) => Object.values(row).join(" | ")));
    const result = await importCsvMapped(file, csvMapping);
    setImportResult(`${result.created} created · ${result.skipped} skipped`);
  };

  const messageCount = conversations.reduce(
    (count, conversation) => count + conversation.messages.length,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="page-title">Contacts</div>
          <div className="page-subtitle">
            Search, import, and manage your WhatsApp audience.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => fileRef.current?.click()}>
            {importing ? "Importing..." : "Import CSV"}
          </Button>
          <RoleGuard roles={["ADMIN", "MANAGER"]}>
            <Button onClick={handleCreate} disabled={saving || !form.name || !form.phone}>
              Add contact
            </Button>
          </RoleGuard>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(event) => handleImport(event.target.files?.[0])}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs uppercase text-text-muted">Total Contacts</div>
          <div className="mt-2 text-2xl font-display">{stats.totalContacts}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-text-muted">Tagged Contacts</div>
          <div className="mt-2 text-2xl font-display">{stats.taggedContacts}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-text-muted">Unique Tags</div>
          <div className="mt-2 text-2xl font-display">{stats.totalTags}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="p-4">
          <div className="space-y-3">
            <Input
              placeholder="Search contacts by name, phone, or email"
              value={query}
              onChange={(event) => handleSearch(event.target.value)}
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input
                placeholder="Full name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
              <Input
                placeholder="Phone"
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              />
              <Input
                placeholder="Email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              />
              <Input
                placeholder="Tags (comma separated)"
                value={form.tags}
                onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
              {Object.entries(csvMapping).map(([key, value]) => (
                <Input
                  key={key}
                  placeholder={`${key} column`}
                  value={value}
                  onChange={(event) =>
                    setCsvMapping((prev) => ({ ...prev, [key]: event.target.value }))
                  }
                />
              ))}
            </div>
            {importResult ? (
              <div className="text-xs text-text-secondary">Last import: {importResult}</div>
            ) : null}
            {importPreview.length > 0 ? (
              <div className="rounded-md border border-border bg-bg-elevated p-3 text-[11px] text-text-muted">
                {csvPreview ? (
                  <div className="mb-2 text-[10px] uppercase text-text-secondary">
                    {csvPreview.totalRows} rows · {csvPreview.columns.join(", ")}
                  </div>
                ) : null}
                {importPreview.map((line, index) => (
                  <div key={`${line}-${index}`} className="truncate">{line}</div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 border-t border-border pt-4 lg:grid-cols-2">
            <div className="space-y-2">
              <div className="text-xs uppercase text-text-muted">Segments</div>
              <div className="flex flex-wrap gap-2">
                {metadata.segments.map((segment) => (
                  <Badge key={segment.id}>{segment.name}</Badge>
                ))}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  placeholder="New segment"
                  value={segmentForm.name}
                  onChange={(event) => setSegmentForm((prev) => ({ ...prev, name: event.target.value }))}
                />
                <Button
                  variant="ghost"
                  onClick={async () => {
                    if (!segmentForm.name.trim()) return;
                    await createSegment(segmentForm);
                    setSegmentForm({ name: "", color: "blue" });
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs uppercase text-text-muted">Custom fields</div>
              <div className="space-y-2">
                {metadata.customFields.map((field) => (
                  <div key={field.id} className="text-xs text-text-secondary">
                    {field.label} · {field.type}
                  </div>
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Key"
                  value={customFieldForm.key}
                  onChange={(event) => setCustomFieldForm((prev) => ({ ...prev, key: event.target.value }))}
                />
                <Input
                  placeholder="Label"
                  value={customFieldForm.label}
                  onChange={(event) => setCustomFieldForm((prev) => ({ ...prev, label: event.target.value }))}
                />
                <Input
                  placeholder="Type"
                  value={customFieldForm.type}
                  onChange={(event) => setCustomFieldForm((prev) => ({ ...prev, type: event.target.value }))}
                />
                <Input
                  placeholder="Options (comma separated)"
                  value={customFieldForm.options}
                  onChange={(event) => setCustomFieldForm((prev) => ({ ...prev, options: event.target.value }))}
                />
              </div>
              <Button
                variant="ghost"
                onClick={async () => {
                  if (!customFieldForm.key.trim() || !customFieldForm.label.trim()) return;
                  await createCustomField({
                    key: customFieldForm.key,
                    label: customFieldForm.label,
                    type: customFieldForm.type,
                    options: customFieldForm.options
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  });
                  setCustomFieldForm({ key: "", label: "", type: "text", options: "" });
                }}
              >
                Add custom field
              </Button>
            </div>
          </div>

          <div className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto xl:max-h-none">
            {loading ? (
              <div className="text-sm text-text-muted">Loading contacts...</div>
            ) : contacts.length === 0 ? (
              <div className="text-sm text-text-muted">No contacts found.</div>
            ) : (
              contacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => setActiveContactId(contact.id)}
                  className={`w-full rounded-md border px-3 py-3 text-left transition ${
                    activeContactId === contact.id
                      ? "border-border-strong bg-bg-elevated"
                      : "border-border bg-bg-surface hover:bg-bg-overlay"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedContactIds.includes(contact.id)}
                      onChange={(event) => {
                        event.stopPropagation();
                        setSelectedContactIds(
                          event.target.checked
                            ? [...selectedContactIds, contact.id]
                            : selectedContactIds.filter((id) => id !== contact.id)
                        );
                      }}
                      className="mt-1"
                    />
                    <Avatar name={contact.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-sm font-medium">{contact.name}</div>
                        <div className="text-[11px] text-text-muted">
                          {new Date(contact.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="mt-1 truncate text-xs text-text-secondary">{contact.phone}</div>
                      {contact.email ? (
                        <div className="truncate text-xs text-text-muted">{contact.email}</div>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(contact.tags || []).slice(0, 3).map((tag) => (
                          <Badge key={tag}>{tag}</Badge>
                        ))}
                        {(contact.segments || []).slice(0, 2).map((segment) => (
                          <Badge key={segment} tone="success">{segment}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
          {selectedContactIds.length > 0 ? (
            <div className="mt-4 rounded-md border border-border bg-bg-elevated p-3">
              <div className="text-xs text-text-muted">
                {selectedContactIds.length} selected for bulk update
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  onClick={() => bulkUpdateContacts({ contactIds: selectedContactIds, tags: ["campaign-ready"] })}
                >
                  Add tag
                </Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    metadata.segments[0]
                      ? bulkUpdateContacts({
                          contactIds: selectedContactIds,
                          segments: [metadata.segments[0].name],
                        })
                      : null
                  }
                >
                  Add first segment
                </Button>
              </div>
            </div>
          ) : null}
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            {!selectedContact ? (
              <div className="text-sm text-text-muted">Select a contact to view details.</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={selectedContact.name} size="lg" />
                    <div>
                      <div className="text-lg font-display">{selectedContact.name}</div>
                      <div className="text-sm text-text-secondary">{selectedContact.phone}</div>
                      {selectedContact.email ? (
                        <div className="text-sm text-text-muted">{selectedContact.email}</div>
                      ) : null}
                    </div>
                  </div>
                  <RoleGuard roles={["ADMIN", "MANAGER"]}>
                    <Button
                      variant="destructive"
                      onClick={() => activeContactId && deleteContact(activeContactId)}
                    >
                      Delete
                    </Button>
                  </RoleGuard>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Input
                    placeholder="Full name"
                    value={detailForm.name}
                    onChange={(event) =>
                      setDetailForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                  />
                  <Input
                    placeholder="Phone"
                    value={detailForm.phone}
                    onChange={(event) =>
                      setDetailForm((prev) => ({ ...prev, phone: event.target.value }))
                    }
                  />
                  <Input
                    placeholder="Email"
                    value={detailForm.email}
                    onChange={(event) =>
                      setDetailForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                  />
                  <Input
                    placeholder="Tags"
                    value={detailForm.tags}
                    onChange={(event) =>
                      setDetailForm((prev) => ({ ...prev, tags: event.target.value }))
                    }
                  />
                  <Input
                    placeholder="Segments"
                    value={detailForm.segments}
                    onChange={(event) =>
                      setDetailForm((prev) => ({ ...prev, segments: event.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2 rounded-md border border-border bg-bg-elevated p-3">
                  <div className="text-xs uppercase text-text-muted">Custom field values</div>
                  {metadata.customFields.length === 0 ? (
                    <div className="text-xs text-text-muted">No custom fields defined.</div>
                  ) : (
                    <div className="grid gap-2 md:grid-cols-2">
                      {metadata.customFields.map((field) => (
                        <Input
                          key={field.id}
                          placeholder={field.label}
                          value={String(selectedContact?.customFields?.[field.key] ?? "")}
                          onChange={(event) =>
                            updateContact(activeContactId!, {
                              customFields: {
                                ...(selectedContact?.customFields || {}),
                                [field.key]: event.target.value,
                              },
                            })
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <RoleGuard roles={["ADMIN", "MANAGER"]}>
                    <Button onClick={handleSaveDetail} disabled={saving}>
                      {saving ? "Saving..." : "Save changes"}
                    </Button>
                  </RoleGuard>
                  <div className="text-xs text-text-muted">
                    Updated {formatDate(selectedContact.updatedAt)}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-md border border-border bg-bg-elevated p-3">
                    <div className="text-xs text-text-muted">Conversations</div>
                    <div className="mt-1 text-xl font-display">{conversations.length}</div>
                  </div>
                  <div className="rounded-md border border-border bg-bg-elevated p-3">
                    <div className="text-xs text-text-muted">Messages</div>
                    <div className="mt-1 text-xl font-display">{messageCount}</div>
                  </div>
                  <div className="rounded-md border border-border bg-bg-elevated p-3">
                    <div className="text-xs text-text-muted">Created</div>
                    <div className="mt-1 text-sm text-text-secondary">
                      {formatDate(selectedContact.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-display">Conversation History</div>
                <div className="text-xs text-text-muted">
                  Full history for the selected contact.
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {conversations.length === 0 ? (
                <div className="text-sm text-text-muted">No conversations yet.</div>
              ) : (
                conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className="rounded-md border border-border bg-bg-elevated p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium">Conversation</div>
                        <Badge>{conversation.status}</Badge>
                      </div>
                      <div className="text-xs text-text-muted">
                        Updated {formatDate(conversation.updatedAt)}
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      {conversation.messages.length === 0 ? (
                        <div className="text-xs text-text-muted">No messages.</div>
                      ) : (
                        conversation.messages.slice(-5).map((message) => (
                          <div
                            key={message.id}
                            className={`rounded-sm px-3 py-2 text-sm ${
                              message.direction === "INBOUND"
                                ? "bg-bg-surface text-text-primary"
                                : "bg-accent-muted text-text-primary"
                            }`}
                          >
                            <div className="text-[11px] uppercase tracking-wide text-text-muted">
                              {message.direction}
                            </div>
                            <div className="mt-1">{message.content}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
