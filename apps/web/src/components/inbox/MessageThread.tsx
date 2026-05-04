"use client";

import { useInbox } from "@/hooks/useInbox";

export function MessageThread() {
  const { messages, activeConversationId, activeConversation } = useInbox();
  return (
    <div className="flex h-full min-h-[24rem] flex-col justify-end gap-3 overflow-y-auto p-3 sm:p-4">
      {!activeConversationId && (
        <div className="text-xs text-text-muted">Select a conversation.</div>
      )}
      {activeConversation && (
        <div className="sticky top-0 z-10 -mx-4 border-b border-border bg-bg-surface/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">{activeConversation.contact.name}</div>
              <div className="text-xs text-text-secondary">{activeConversation.contact.phone}</div>
            </div>
            <div className="rounded-full border border-border px-2 py-1 text-[10px] uppercase tracking-wide text-text-secondary">
              {activeConversation.status}
            </div>
          </div>
        </div>
      )}
      {messages.map((message) => (
        <div
          key={message.id}
          className={`max-w-[88%] rounded-md px-3 py-2 text-sm sm:max-w-[70%] ${
            message.direction === "INBOUND"
              ? "self-start bg-bg-elevated text-text-primary"
              : "self-end bg-accent-muted text-text-primary"
          }`}
        >
          <div>{message.content}</div>
          {message.attachments?.length ? (
            <div className="mt-2 space-y-2">
              {message.attachments.map((attachment) => (
                <div key={attachment.id} className="rounded border border-border bg-bg-surface p-2">
                  {attachment.mimeType.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={attachment.url} alt={attachment.fileName} className="max-h-60 rounded object-contain" />
                  ) : attachment.mimeType.startsWith("video/") ? (
                    <video src={attachment.url} controls className="max-h-60 w-full rounded" />
                  ) : attachment.mimeType.startsWith("audio/") ? (
                    <audio src={attachment.url} controls className="w-full" />
                  ) : null}
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block text-xs text-text-secondary underline-offset-2 hover:underline"
                  >
                    {attachment.fileName || "Open attachment"}
                  </a>
                </div>
              ))}
            </div>
          ) : null}
          <div className="mt-2 text-[10px] uppercase tracking-wide text-text-muted">
            {message.status ?? (message.direction === "OUTBOUND" ? "sent" : "received")}
          </div>
        </div>
      ))}
    </div>
  );
}
