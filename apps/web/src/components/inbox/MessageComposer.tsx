"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useInbox } from "@/hooks/useInbox";
import api from "@/lib/api";

function resolveMediaType(mimeType?: string): "text" | "image" | "video" | "audio" | "document" {
  if (mimeType?.startsWith("image/")) return "image";
  if (mimeType?.startsWith("video/")) return "video";
  if (mimeType?.startsWith("audio/")) return "audio";
  return "document";
}

function defaultMimeForType(mediaType: "text" | "image" | "video" | "audio" | "document") {
  if (mediaType === "image") return "image/jpeg";
  if (mediaType === "video") return "video/mp4";
  if (mediaType === "audio") return "audio/ogg";
  return "application/octet-stream";
}

function preferredAudioMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  return ["audio/ogg;codecs=opus", "audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find((type) =>
    MediaRecorder.isTypeSupported(type)
  ) || "";
}

function normalFileName(fileName: string, mimeType: string) {
  const base = fileName.replace(/\.[^/.]+$/, "");
  if (mimeType.includes("ogg")) return `${base}.ogg`;
  if (mimeType.includes("mp4")) return `${base}.m4a`;
  if (mimeType.includes("webm")) return `${base}.webm`;
  return fileName;
}

export function MessageComposer() {
  const { activeConversationId, sendMessage } = useInbox();
  const [value, setValue] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentMimeType, setAttachmentMimeType] = useState("");
  const [mediaType, setMediaType] = useState<"text" | "image" | "video" | "audio" | "document">("text");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post("/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAttachmentUrl(data.url);
      setAttachmentName(data.fileName || file.name);
      setAttachmentMimeType(data.mimeType || file.type || "application/octet-stream");
      setMediaType(resolveMediaType(data.mimeType || file.type));
    } catch (uploadError: any) {
      setError(uploadError?.response?.data?.message || "Media upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    setError(null);
    try {
      if (typeof MediaRecorder === "undefined") {
        setError("Voice recording is not supported in this browser. Upload an audio file instead.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = preferredAudioMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const finalType = recorder.mimeType || mimeType || "audio/ogg";
        const extension = finalType.includes("mp4") ? "m4a" : finalType.includes("webm") ? "webm" : "ogg";
        const blob = new Blob(chunksRef.current, { type: finalType });
        const file = new File([blob], normalFileName(`voice-${Date.now()}.${extension}`, finalType), { type: blob.type });
        await uploadFile(file);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError("Microphone permission is required to record voice.");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  const sendLocation = async () => {
    if (!activeConversationId) return;
    setError(null);
    if (!navigator.geolocation) {
      setError("Location sharing is not supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          await sendMessage(activeConversationId, `Location: https://maps.google.com/?q=${latitude},${longitude}`, undefined, "text");
        } catch (sendError: any) {
          setError(sendError?.response?.data?.message || "Location message failed.");
        }
      },
      () => setError("Location permission is required to share location.")
    );
  };

  const onSend = async () => {
    if (!activeConversationId) return;
    setError(null);
    try {
      await sendMessage(
        activeConversationId,
        value,
        attachmentUrl && attachmentName
          ? [
              {
                url: attachmentUrl,
                mimeType:
                  attachmentMimeType || defaultMimeForType(mediaType),
                fileName: attachmentName,
              },
            ]
          : undefined,
        mediaType
      );
      setValue("");
      setAttachmentUrl("");
      setAttachmentName("");
      setAttachmentMimeType("");
      setMediaType("text");
    } catch (sendError: any) {
      setError(sendError?.response?.data?.message || "Message failed. Check WhatsApp credentials and 24-hour session window.");
    }
  };

  return (
    <div className="shrink-0 border-t border-slate-200 bg-[#f0f2f5] p-3">
      <div className="flex flex-col gap-2">
        {attachmentUrl ? (
          <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 truncate">
              Ready: <span className="font-medium text-slate-950">{attachmentName || "media"}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setAttachmentUrl("");
                setAttachmentName("");
                setAttachmentMimeType("");
                setMediaType("text");
              }}
            >
              Remove
            </Button>
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white text-lg text-slate-600 shadow-sm hover:bg-slate-50" title="Attach media, sticker, GIF, video, audio, or document">
            {uploading ? "…" : "＋"}
            <input
              type="file"
              className="hidden"
              accept="image/*,image/gif,image/webp,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) uploadFile(file);
                event.currentTarget.value = "";
              }}
            />
          </label>
          <Button className="h-11 w-11 shrink-0 rounded-full px-0" type="button" variant="ghost" onClick={sendLocation} disabled={!activeConversationId || uploading}>
            📍
          </Button>
          <Button className="h-11 w-11 shrink-0 rounded-full px-0" type="button" variant="ghost" onClick={recording ? stopRecording : startRecording} disabled={uploading}>
            {recording ? "■" : "🎙"}
          </Button>
          <input
            className="h-11 min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-300"
            placeholder="Type a message"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void onSend();
              }
            }}
          />
          <Button className="h-11 w-11 shrink-0 rounded-full px-0" onClick={onSend} disabled={!activeConversationId || uploading || (!value.trim() && !attachmentUrl)}>
            ➤
          </Button>
        </div>
        {error ? <div className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-xs text-error">{error}</div> : null}
      </div>
    </div>
  );
}
