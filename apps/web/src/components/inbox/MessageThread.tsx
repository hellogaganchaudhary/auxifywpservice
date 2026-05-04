"use client";

import { useEffect, useRef } from "react";
import { useInbox } from "@/hooks/useInbox";

type Attachment = NonNullable<ReturnType<typeof useInbox>["messages"][number]["attachments"]>[number];

function mediaKind(attachment: Attachment) {
  const mimeType = attachment.mimeType || "";
  const fileName = (attachment.fileName || attachment.url || "").toLowerCase();
  if (mimeType.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName)) return "image";
  if (mimeType.startsWith("video/") || /\.(mp4|3gp|3gpp|mov)$/i.test(fileName)) return "video";
  if (mimeType.startsWith("audio/") || /\.(ogg|opus|mp3|mpeg|m4a|aac|amr|webm)$/i.test(fileName)) return "audio";
  return "document";
}

function formatTime(value?: string) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function statusTone(status?: string) {
  const normalized = (status || "").toLowerCase();
  if (normalized === "failed") return "text-red-600";
  if (normalized === "delivered" || normalized === "read") return "text-emerald-700";
  return "text-slate-400";
}

function MediaPreview({ attachment, outbound }: { attachment: Attachment; outbound: boolean }) {
  const kind = mediaKind(attachment);
  const label = attachment.fileName || "Attachment";

  return (
    <div className={`overflow-hidden rounded-2xl border ${outbound ? "border-emerald-200 bg-white" : "border-slate-200 bg-white"}`}>
      {kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={attachment.url} alt={label} className="max-h-80 w-full rounded-t-2xl object-contain bg-slate-50" />
      ) : kind === "video" ? (
        <div className="bg-slate-950">
          <video src={attachment.url} controls playsInline preload="metadata" className="max-h-80 w-full rounded-t-2xl bg-black" />
        </div>
      ) : kind === "audio" ? (
        <div className="flex items-center gap-3 bg-slate-50 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">♫</div>
          <audio src={attachment.url} controls preload="metadata" className="min-w-0 flex-1" />
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-slate-50 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 text-sm font-semibold text-slate-700">DOC</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-slate-900">{label}</div>
            <div className="truncate text-xs text-slate-500">{attachment.mimeType || "document"}</div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
        <span className="min-w-0 truncate text-slate-600">{label}</span>
        <a href={attachment.url} target="_blank" rel="noreferrer" className="shrink-0 font-medium text-emerald-700 hover:underline">
          Open
        </a>
      </div>
      {kind === "video" && (attachment.mimeType === "video/quicktime" || label.toLowerCase().endsWith(".mov")) ? (
        <div className="border-t border-amber-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          MOV preview depends on browser support. WhatsApp delivery converts it to MP4 automatically.
        </div>
      ) : null}
    </div>
  );
}

export function MessageThread() {
  const { messages, activeConversationId, activeConversation } = useInbox();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [activeConversationId, messages.length]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      {activeConversation && (
        <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                {(activeConversation.contact.name || activeConversation.contact.phone || "C").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-950">{activeConversation.contact.name}</div>
                <div className="truncate text-xs text-slate-500">{activeConversation.contact.phone}</div>
              </div>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
              {activeConversation.status}
            </div>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
        {!activeConversationId ? (
          <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
            Select a conversation to preview messages, media, and customer context.
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
            No messages yet. Send a reply or media file to start the thread.
          </div>
        ) : (
          <div className="flex min-h-full flex-col justify-end gap-3">
            {messages.map((message) => {
              const outbound = message.direction === "OUTBOUND";

              return (
                <div key={message.id} className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[92%] rounded-3xl px-3 py-2 text-sm shadow-sm sm:max-w-[76%] ${
                      outbound
                        ? "rounded-br-md bg-emerald-600 text-white"
                        : "rounded-bl-md border border-slate-200 bg-white text-slate-950"
                    }`}
                  >
                    {message.attachments?.length ? (
                      <div className="mb-2 space-y-2">
                        {message.attachments.map((attachment) => (
                          <MediaPreview key={attachment.id} attachment={attachment} outbound={outbound} />
                        ))}
                      </div>
                    ) : null}
                    {message.content ? <div className="whitespace-pre-wrap break-words">{message.content}</div> : null}
                    <div className={`mt-2 flex items-center justify-end gap-2 text-[10px] uppercase tracking-wide ${outbound ? "text-emerald-50/80" : statusTone(message.status)}`}>
                      <span>{formatTime(message.createdAt)}</span>
                      <span>{message.status ?? (outbound ? "sent" : "received")}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
