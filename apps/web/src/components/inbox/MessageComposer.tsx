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
        const file = new File([blob], `voice-${Date.now()}.${extension}`, { type: blob.type });
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
    <div className="border-t border-border bg-bg-surface p-3">
      <div className="flex flex-col gap-3">
        <input
          className="h-10 rounded-sm border border-border bg-bg-surface px-3 text-sm"
          placeholder="Write a message"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <div className="grid gap-2 lg:grid-cols-[160px_150px_1fr_160px_150px_auto]">
          <label className="flex h-10 cursor-pointer items-center justify-center rounded-sm border border-border bg-bg-surface px-3 text-sm text-text-secondary hover:bg-bg-elevated">
            {uploading ? "Uploading…" : "Upload media"}
            <input
              type="file"
              className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) uploadFile(file);
                event.currentTarget.value = "";
              }}
            />
          </label>
          <Button type="button" variant="ghost" onClick={recording ? stopRecording : startRecording} disabled={uploading}>
            {recording ? "Stop recording" : "Record voice"}
          </Button>
          <input
            className="h-10 rounded-sm border border-border bg-bg-surface px-3 text-sm"
            placeholder="Public media URL (image, video, audio, document)"
            value={attachmentUrl}
            onChange={(event) => {
              setAttachmentUrl(event.target.value);
              setAttachmentMimeType("");
            }}
          />
          <input
            className="h-10 rounded-sm border border-border bg-bg-surface px-3 text-sm"
            placeholder="File name"
            value={attachmentName}
            onChange={(event) => setAttachmentName(event.target.value)}
          />
          <select
            className="h-10 rounded-sm border border-border bg-bg-surface px-3 text-sm"
            value={mediaType}
            onChange={(event) => setMediaType(event.target.value as typeof mediaType)}
          >
            <option value="text">Text</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="audio">Voice / audio</option>
            <option value="document">Document</option>
          </select>
          <Button onClick={onSend} disabled={!activeConversationId}>
            Send
          </Button>
        </div>
        {attachmentUrl ? (
          <div className="flex flex-col gap-2 rounded-md border border-border bg-bg-elevated px-3 py-2 text-xs text-text-secondary sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 truncate">
              Ready to send: <span className="font-medium text-text-primary">{attachmentName || "media"}</span> · {attachmentMimeType || defaultMimeForType(mediaType)}
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
        <div className="text-[11px] text-text-muted">
          Upload image, video, document, or record voice directly. Uploaded media must be served through public HTTPS, so keep ngrok/API public URL configured for WhatsApp delivery.
        </div>
        {error ? <div className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-xs text-error">{error}</div> : null}
      </div>
    </div>
  );
}
