import { BadRequestException, Injectable } from "@nestjs/common";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { InboxGateway } from "./inbox.gateway";
import { TeamService } from "../team/team.service";
import {
  AddConversationLabelDto,
  AddConversationNoteDto,
  CreateConversationDto,
  InboxConversationQuery,
  SendMessageDto,
  UpdateConversationContactDto,
  UpdateConversationDto,
} from "./inbox.dto";

type InboxViewPayload = {
  name: string;
  filters: {
    search?: string;
    status?: string;
    label?: string;
    assignedTo?: string;
  };
};

const execFileAsync = promisify(execFile);

@Injectable()
export class InboxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inboxGateway: InboxGateway,
    private readonly teamService: TeamService
  ) {}

  async listConversations(organizationId: string, query: InboxConversationQuery = {}) {
    if (!organizationId) {
      throw new BadRequestException("Organization required");
    }

    const limit = Math.min(query.limit ?? 50, 100);
    const conversations = await this.prisma.conversation.findMany({
      where: {
        organizationId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.assignedTo ? { assignedToId: query.assignedTo } : {}),
        ...(query.search
          ? {
              OR: [
                { contact: { name: { contains: query.search, mode: "insensitive" } } },
                { contact: { phone: { contains: query.search, mode: "insensitive" } } },
                { messages: { some: { content: { contains: query.search, mode: "insensitive" } } } },
              ],
            }
          : {}),
        ...(query.label
          ? {
              labels: { some: { name: { equals: query.label, mode: "insensitive" } } },
            }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      include: {
        contact: true,
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        labels: true,
        notes: { orderBy: { createdAt: "desc" }, take: 3, include: { author: true } },
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    return conversations.map((conv) => ({
      id: conv.id,
      status: conv.status,
      contact: {
        id: conv.contact.id,
        name: conv.contact.name,
        phone: conv.contact.phone,
        email: conv.contact.email,
      },
      lastMessage: conv.messages[0]
        ? {
            id: conv.messages[0].id,
            content: conv.messages[0].content,
            type: conv.messages[0].type,
            direction: conv.messages[0].direction,
            status: conv.messages[0].status,
            sentAt: conv.messages[0].createdAt,
          }
        : null,
      unreadCount: 0,
      assignedTo: conv.assignedTo,
      teamGroupId: null,
      labels: conv.labels,
      notes: conv.notes.map((note) => ({
        id: note.id,
        body: note.body,
        createdAt: note.createdAt,
        author: note.author
          ? { id: note.author.id, name: note.author.name, email: note.author.email }
          : null,
      })),
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    }));
  }

  async getConversation(organizationId: string, id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, organizationId },
      include: {
        contact: true,
        labels: true,
        notes: {
          orderBy: { createdAt: "desc" },
          include: { author: { select: { id: true, name: true, email: true } } },
        },
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    if (!conversation) {
      throw new BadRequestException("Conversation not found");
    }
    return conversation;
  }

  async createConversation(organizationId: string, payload: CreateConversationDto) {
    if (!organizationId) {
      throw new BadRequestException("Organization required");
    }
    const phone = payload.phone?.replace(/[^0-9]/g, "");
    if (!phone) {
      throw new BadRequestException("Phone number required");
    }

    const contact = await this.prisma.contact.upsert({
      where: { organizationId_phone: { organizationId, phone } },
      update: {
        ...(payload.name?.trim() ? { name: payload.name.trim() } : {}),
        ...(payload.email?.trim() ? { email: payload.email.trim() } : {}),
      },
      create: {
        organizationId,
        phone,
        name: payload.name?.trim() || phone,
        email: payload.email?.trim() || undefined,
        tags: [],
        segments: [],
        customFields: {},
      },
    });

    const existingOpen = await this.prisma.conversation.findFirst({
      where: { organizationId, contactId: contact.id, status: { in: ["OPEN", "PENDING"] } },
      include: {
        contact: true,
        labels: true,
        notes: { orderBy: { createdAt: "desc" }, take: 3, include: { author: true } },
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    if (existingOpen) return existingOpen;

    const conversation = await this.prisma.conversation.create({
      data: {
        organizationId,
        contactId: contact.id,
        status: "OPEN",
      },
      include: {
        contact: true,
        labels: true,
        notes: { orderBy: { createdAt: "desc" }, take: 3, include: { author: true } },
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    this.inboxGateway.emitConversationUpdated(organizationId, conversation);
    return conversation;
  }

  async updateConversationContact(
    organizationId: string,
    conversationId: string,
    payload: UpdateConversationContactDto
  ) {
    const conversation = await this.getConversation(organizationId, conversationId);
    const updatedContact = await this.prisma.contact.update({
      where: { id: conversation.contactId },
      data: {
        ...(payload.name?.trim() ? { name: payload.name.trim() } : {}),
        ...(payload.email !== undefined ? { email: payload.email || null } : {}),
        ...(payload.tags ? { tags: payload.tags } : {}),
        ...(payload.segments ? { segments: payload.segments } : {}),
        ...(payload.customFields !== undefined ? { customFields: payload.customFields as Prisma.InputJsonValue } : {}),
      },
    });
    const updatedConversation = await this.getConversation(organizationId, conversationId);
    this.inboxGateway.emitConversationUpdated(organizationId, updatedConversation);
    return updatedContact;
  }

  async listMessages(organizationId: string, conversationId: string) {
    await this.getConversation(organizationId, conversationId);
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      include: { attachments: true },
    });
  }

  async sendMessage(
    organizationId: string,
    conversationId: string,
    payload: SendMessageDto
  ) {
    const conversation = await this.getConversation(organizationId, conversationId);
    if (!payload.content?.trim() && !payload.attachments?.length) {
      throw new BadRequestException("Message text or media required");
    }
    const contactPhone = conversation.contact?.phone;
    if (!contactPhone) {
      throw new BadRequestException("Contact phone number missing");
    }
    const wabaConfig = await this.prisma.wabaConfig.findUnique({
      where: { organizationId },
    });
    if (!wabaConfig?.accessToken || !wabaConfig?.phoneNumberId) {
      throw new BadRequestException("WhatsApp credentials not configured");
    }
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        content: payload.content?.trim() || payload.attachments?.[0]?.fileName || "Media message",
        type: String(payload.mediaType || (payload.attachments?.length ? "document" : "text")).toUpperCase(),
        direction: "OUTBOUND",
        status: "pending",
        attachments: payload.attachments?.length
          ? {
              create: payload.attachments.map((attachment) => ({
                url: attachment.url,
                mimeType: attachment.mimeType,
                fileName: attachment.fileName,
              })),
            }
          : undefined,
      },
      include: { attachments: true },
    });

    try {
      const response = await this.sendWhatsAppMessage({
        accessToken: wabaConfig.accessToken,
        phoneNumberId: wabaConfig.phoneNumberId,
        to: contactPhone,
        body: payload.content || "",
        mediaType: payload.mediaType,
        attachment: payload.attachments?.[0],
      });
      const externalId = response?.messages?.[0]?.id;
      await this.prisma.message.update({
        where: { id: message.id },
        data: {
          status: "sent",
          ...(externalId ? { externalId } : {}),
        },
      });
    } catch (error: any) {
      await this.prisma.message.update({
        where: { id: message.id },
        data: { status: "failed" },
      });
      throw new BadRequestException(
        error?.message || "WhatsApp send failed"
      );
    }
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
    const updatedConversation = await this.getConversation(organizationId, conversationId);
    this.inboxGateway.emitMessageCreated(organizationId, { ...message, status: "sent" });
    this.inboxGateway.emitConversationUpdated(organizationId, updatedConversation);
    return { ...message, status: "sent" };
  }

  private async sendWhatsAppMessage(params: {
    accessToken: string;
    phoneNumberId: string;
    to: string;
    body: string;
    mediaType?: "text" | "image" | "video" | "audio" | "document";
    attachment?: { url: string; mimeType: string; fileName: string };
  }) {
    const graphBase = process.env.META_GRAPH_BASE || "https://graph.facebook.com/v19.0";
    const url = `${graphBase}/${params.phoneNumberId}/messages`;
    const mediaType = params.attachment ? params.mediaType || this.resolveMediaType(params.attachment.mimeType) : "text";
    const uploadedMediaId = params.attachment
      ? await this.uploadWhatsAppMedia({
          accessToken: params.accessToken,
          phoneNumberId: params.phoneNumberId,
          attachment: params.attachment,
        })
      : null;
    const body = params.attachment
      ? {
          messaging_product: "whatsapp",
          to: params.to,
          type: mediaType,
          [mediaType]: {
            ...(uploadedMediaId ? { id: uploadedMediaId } : { link: params.attachment.url }),
            ...(mediaType === "document" ? { filename: params.attachment.fileName } : {}),
            ...(params.body?.trim() && ["image", "video", "document"].includes(mediaType) ? { caption: params.body.trim() } : {}),
          },
        }
      : {
          messaging_product: "whatsapp",
          to: params.to,
          type: "text",
          text: { body: params.body },
        };
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }
    return res.json();
  }

  private async uploadWhatsAppMedia(params: {
    accessToken: string;
    phoneNumberId: string;
    attachment: { url: string; mimeType: string; fileName: string };
  }) {
    const mediaResponse = await fetch(params.attachment.url);
    if (!mediaResponse.ok) {
      throw new Error(`Unable to read uploaded media: ${await mediaResponse.text()}`);
    }

    const originalContentType = params.attachment.mimeType || mediaResponse.headers.get("content-type") || "application/octet-stream";
    const arrayBuffer = await mediaResponse.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);
    const media = originalContentType.startsWith("audio/")
      ? await this.convertAudioToWhatsAppOgg(originalBuffer, params.attachment.fileName)
      : this.isQuickTimeVideo(originalContentType, params.attachment.fileName)
        ? await this.convertVideoToWhatsAppMp4(originalBuffer, params.attachment.fileName)
        : {
            buffer: originalBuffer,
            contentType: originalContentType,
            fileName: params.attachment.fileName || "media",
          };
    const blob = new Blob([media.buffer], { type: media.contentType });
    const formData = new FormData();
    formData.append("messaging_product", "whatsapp");
    formData.append("type", media.contentType);
    formData.append("file", blob, media.fileName);

    const graphBase = process.env.META_GRAPH_BASE || "https://graph.facebook.com/v19.0";
    const response = await fetch(`${graphBase}/${params.phoneNumberId}/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${params.accessToken}` },
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`WhatsApp media upload failed: ${text}`);
    }

    const data = await response.json();
    if (!data?.id) {
      throw new Error("WhatsApp media upload did not return media id");
    }
    return data.id as string;
  }

  private async convertAudioToWhatsAppOgg(buffer: Buffer, fileName?: string) {
    const workDir = join(tmpdir(), `whatsapp-audio-${randomUUID()}`);
    const inputPath = join(workDir, fileName || "input-audio");
    const outputPath = join(workDir, "voice.ogg");
    try {
      await mkdir(workDir, { recursive: true });
      await writeFile(inputPath, buffer);
      await execFileAsync("ffmpeg", [
        "-y",
        "-i",
        inputPath,
        "-vn",
        "-acodec",
        "libopus",
        "-b:a",
        "32k",
        "-ar",
        "48000",
        "-ac",
        "1",
        outputPath,
      ]);
      return {
        buffer: await readFile(outputPath),
        contentType: "audio/ogg",
        fileName: `${(fileName || "voice").replace(/\.[^/.]+$/, "")}.ogg`,
      };
    } catch (error: any) {
      throw new Error(
        `Audio conversion failed. Install ffmpeg and upload WhatsApp-supported audio. ${error?.message || ""}`.trim()
      );
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  }

  private isQuickTimeVideo(contentType?: string, fileName?: string) {
    const lowerName = (fileName || "").toLowerCase();
    return contentType === "video/quicktime" || lowerName.endsWith(".mov") || lowerName.endsWith(".qt");
  }

  private async convertVideoToWhatsAppMp4(buffer: Buffer, fileName?: string) {
    const workDir = join(tmpdir(), `whatsapp-video-${randomUUID()}`);
    const inputPath = join(workDir, fileName || "input-video.mov");
    const outputPath = join(workDir, "video.mp4");
    try {
      await mkdir(workDir, { recursive: true });
      await writeFile(inputPath, buffer);
      await execFileAsync("ffmpeg", [
        "-y",
        "-i",
        inputPath,
        "-map",
        "0:v:0",
        "-map",
        "0:a?",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-profile:v",
        "baseline",
        "-level",
        "3.0",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        outputPath,
      ]);
      return {
        buffer: await readFile(outputPath),
        contentType: "video/mp4",
        fileName: `${(fileName || "video").replace(/\.[^/.]+$/, "")}.mp4`,
      };
    } catch (error: any) {
      throw new Error(
        `Video conversion failed. Upload WhatsApp-supported MP4 video or install ffmpeg. ${error?.message || ""}`.trim()
      );
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  }

  private resolveMediaType(mimeType?: string): "image" | "video" | "audio" | "document" {
    if (mimeType?.startsWith("image/")) return "image";
    if (mimeType?.startsWith("video/")) return "video";
    if (mimeType?.startsWith("audio/")) return "audio";
    return "document";
  }

  async updateConversation(
    organizationId: string,
    conversationId: string,
    payload: UpdateConversationDto
  ) {
    await this.getConversation(organizationId, conversationId);

    const resolvedAssignee =
      payload.teamGroupId && !payload.assignedToId
        ? await this.teamService.getRoutingAssignee(organizationId, payload.teamGroupId)
        : null;

    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        ...(payload.status ? { status: payload.status } : {}),
        ...(payload.assignedToId !== undefined
          ? { assignedToId: payload.assignedToId }
          : resolvedAssignee
            ? { assignedToId: resolvedAssignee.id }
            : {}),
      },
      include: {
        contact: true,
        labels: true,
        notes: { include: { author: { select: { id: true, name: true, email: true } } } },
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    this.inboxGateway.emitConversationUpdated(organizationId, updated);
    return updated;
  }

  async addLabel(
    organizationId: string,
    conversationId: string,
    payload: AddConversationLabelDto
  ) {
    await this.getConversation(organizationId, conversationId);
    if (!payload.name?.trim()) {
      throw new BadRequestException("Label name required");
    }

    const label = await this.prisma.conversationLabel.create({
      data: {
        organizationId,
        conversationId,
        name: payload.name.trim(),
        color: payload.color ?? "gray",
      },
    });
    const conversation = await this.getConversation(organizationId, conversationId);
    this.inboxGateway.emitConversationUpdated(organizationId, conversation);
    return label;
  }

  async addNote(
    organizationId: string,
    userId: string,
    conversationId: string,
    payload: AddConversationNoteDto
  ) {
    await this.getConversation(organizationId, conversationId);
    if (!payload.body?.trim()) {
      throw new BadRequestException("Note body required");
    }

    const note = await this.prisma.conversationNote.create({
      data: {
        organizationId,
        conversationId,
        authorId: userId,
        body: payload.body.trim(),
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });
    const conversation = await this.getConversation(organizationId, conversationId);
    this.inboxGateway.emitConversationUpdated(organizationId, conversation);
    return note;
  }

  async listViews(organizationId: string, userId: string) {
    return this.prisma.inboxView.findMany({
      where: { organizationId, userId },
      orderBy: { updatedAt: "desc" },
    });
  }

  async createView(organizationId: string, userId: string, payload: InboxViewPayload) {
    if (!payload.name?.trim()) {
      throw new BadRequestException("View name required");
    }
    return this.prisma.inboxView.create({
      data: {
        organizationId,
        userId,
        name: payload.name.trim(),
        filters: payload.filters || {},
      },
    });
  }

  async updateView(
    organizationId: string,
    userId: string,
    viewId: string,
    payload: Partial<InboxViewPayload>
  ) {
    const existing = await this.prisma.inboxView.findFirst({
      where: { id: viewId, organizationId, userId },
    });
    if (!existing) {
      throw new BadRequestException("Saved view not found");
    }

    return this.prisma.inboxView.update({
      where: { id: viewId },
      data: {
        ...(payload.name?.trim() ? { name: payload.name.trim() } : {}),
        ...(payload.filters ? { filters: payload.filters } : {}),
      },
    });
  }

  async deleteView(organizationId: string, userId: string, viewId: string) {
    const view = await this.prisma.inboxView.findFirst({
      where: { id: viewId, organizationId, userId },
    });
    if (!view) {
      throw new BadRequestException("Saved view not found");
    }
    await this.prisma.inboxView.delete({ where: { id: viewId } });
    return { id: viewId };
  }
}
