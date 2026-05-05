import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { PrismaService } from "../prisma/prisma.service";
import { InboxGateway } from "../inbox/inbox.gateway";
import { TeamService } from "../team/team.service";

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inboxGateway: InboxGateway,
    private readonly teamService: TeamService
  ) {}

  async verify(query: Record<string, string | undefined>) {
    const mode = query["hub.mode"];
    const token = query["hub.verify_token"];
    const challenge = query["hub.challenge"];

    if (mode !== "subscribe" || !challenge) {
      throw new BadRequestException("Invalid webhook verification request");
    }

    const matchingConfig = token
      ? await this.prisma.wabaConfig.findFirst({ where: { webhookVerifyToken: token } })
      : null;
    const expected = process.env.META_WEBHOOK_VERIFY_TOKEN;

    if (!token || (!matchingConfig && token !== expected)) {
      throw new BadRequestException("Webhook verify token mismatch");
    }

    return challenge;
  }

  verifySignature(signature: string | undefined, rawBody: Buffer) {
    const secret = process.env.META_APP_SECRET;
    const isProduction = process.env.NODE_ENV === "production";

    if (!secret) {
      if (isProduction) {
        this.logger.error("META_APP_SECRET is missing in production. Webhook validation will fail.");
        return false;
      }
      return true;
    }

    if (!signature) {
      return !isProduction;
    }

    const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    return (
      actualBuffer.length === expectedBuffer.length &&
      timingSafeEqual(actualBuffer, expectedBuffer)
    );
  }

  async receive(payload: any) {
    const entries = Array.isArray(payload?.entry) ? payload.entry : [];

    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      for (const change of changes) {
        try {
          if (change?.field !== "messages") {
            await this.logEvent(null, change?.field || "unknown", change?.value || change);
            continue;
          }
          await this.handleMessagesChange(change.value);
        } catch (error: any) {
          this.logger.error(`Error processing webhook change: ${error?.message || error}`, error?.stack);
          // We don't rethrow here to allow other changes in the batch to be processed
          // and to avoid Meta retrying the same failing payload indefinitely
        }
      }
    }

    return { received: true };
  }

  private async handleMessagesChange(value: any) {
    const metadataPhoneNumberId = value?.metadata?.phone_number_id;
    const metadataDisplayNumber = String(value?.metadata?.display_phone_number || "").replace(/[^0-9]/g, "");
    const wabaConfig = await this.resolveWabaConfig(metadataPhoneNumberId, metadataDisplayNumber);
    const organizationId = wabaConfig?.organizationId ?? null;

    await this.logEvent(organizationId, "messages.change", value, value?.statuses?.[0]?.id || value?.messages?.[0]?.id);

    const statuses = Array.isArray(value?.statuses) ? value.statuses : [];
    for (const status of statuses) {
      try {
        await this.handleStatus(organizationId, status);
      } catch (error: any) {
        this.logger.error(`Error handling status ${status?.id}: ${error?.message}`);
      }
    }

    const messages = Array.isArray(value?.messages) ? value.messages : [];
    const contacts = Array.isArray(value?.contacts) ? value.contacts : [];
    for (const message of messages) {
      try {
        await this.handleIncomingMessage(organizationId, message, contacts[0], value, wabaConfig?.accessToken);
      } catch (error: any) {
        this.logger.error(`Error handling message ${message?.id}: ${error?.message}`);
      }
    }

    const templateEvent = value?.message_template_status_update;
    if (templateEvent && organizationId) {
      try {
        await this.handleTemplateStatus(organizationId, templateEvent);
      } catch (error: any) {
        this.logger.error(`Error handling template status update: ${error?.message}`);
      }
    }
  }

  private async handleStatus(organizationId: string | null, status: any) {
    if (!organizationId || !status?.id) return;

    const message = await this.prisma.message.findFirst({
      where: {
        OR: [{ id: status.id }, { externalId: status.id }],
        conversation: { organizationId },
      },
    });

    await this.bumpBroadcastStats(organizationId, status);

    if (!message) return;

    await this.prisma.message.update({
      where: { id: message.id },
      data: {
        status: String(status.status || "sent").toLowerCase(),
        pricing: status.pricing ? (status.pricing as any) : undefined,
      },
    });

    const conversation = await this.prisma.conversation.update({
      where: { id: message.conversationId },
      data: { updatedAt: new Date() },
      include: {
        contact: true,
        labels: true,
        notes: { include: { author: true }, orderBy: { createdAt: "desc" }, take: 3 },
        assignedTo: true,
      },
    });

    this.inboxGateway.emitConversationUpdated(organizationId, conversation);
    this.logger.log(`Updated message ${message.id} to ${status.status}`);
    return conversation;
  }

  private async handleIncomingMessage(
    organizationId: string | null,
    message: any,
    contactPayload: any,
    value: any,
    accessToken?: string
  ) {
    if (!organizationId) return;

    const phone = contactPayload?.wa_id || message?.from;
    if (!phone) return;

    const contact = await this.prisma.contact.upsert({
      where: { organizationId_phone: { organizationId, phone } },
      update: {
        name: contactPayload?.profile?.name || undefined,
        deletedAt: null,
      },
      create: {
        organizationId,
        phone,
        name: contactPayload?.profile?.name || phone,
        tags: [],
        segments: [],
      },
    });

    let conversation = await this.prisma.conversation.findFirst({
      where: { organizationId, contactId: contact.id },
    });

    if (!conversation) {
      const defaultGroup = await this.prisma.teamGroup.findFirst({
        where: { organizationId },
        orderBy: { createdAt: "asc" },
      });
      const assignee = defaultGroup
        ? await this.teamService.getRoutingAssignee(organizationId, defaultGroup.id)
        : null;

      conversation = await this.prisma.conversation.create({
        data: {
          organizationId,
          contactId: contact.id,
          status: "OPEN",
          assignedToId: assignee?.id,
        },
      });
    }

    const textBody =
      message?.text?.body ||
      message?.button?.text ||
      message?.interactive?.button_reply?.title ||
      message?.interactive?.list_reply?.title ||
      message?.image?.caption ||
      message?.video?.caption ||
      message?.document?.caption ||
      message?.document?.filename ||
      (message?.sticker ? "Sticker" : undefined) ||
      "Media message";

    const attachmentCreate = await this.buildAttachmentCreate(organizationId, message, accessToken);

    await this.prisma.message.upsert({
      where: { id: message.id },
      update: {
        content: textBody,
        type: String(message?.type || "TEXT").toUpperCase(),
        direction: "INBOUND",
        status: "received",
        externalId: message.id,
        ...(attachmentCreate ? { attachments: attachmentCreate } : {}),
      },
      create: {
        id: message.id,
        externalId: message.id,
        conversationId: conversation.id,
        content: textBody,
        type: String(message?.type || "TEXT").toUpperCase(),
        direction: "INBOUND",
        status: "received",
        attachments: attachmentCreate,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    const createdMessage = await this.prisma.message.findUnique({
      where: { id: message.id },
      include: { attachments: true },
    });
    const updatedConversation = await this.prisma.conversation.findUnique({
      where: { id: conversation.id },
      include: {
        contact: true,
        labels: true,
        notes: { include: { author: true }, orderBy: { createdAt: "desc" }, take: 3 },
        assignedTo: true,
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    if (createdMessage) {
      this.inboxGateway.emitMessageCreated(organizationId, createdMessage);
    }
    if (updatedConversation) {
      this.inboxGateway.emitConversationUpdated(organizationId, updatedConversation);
    }

    await this.markLatestBroadcastReply(organizationId, phone);

    await this.logEvent(organizationId, "messages.inbound", { message, contact: contactPayload, value }, message.id);
  }

  private async buildAttachmentCreate(organizationId: string | null, message: any, accessToken?: string) {
    const attachmentSource = message?.image || message?.video || message?.audio || message?.document || message?.sticker;
    if (!attachmentSource) {
      return undefined;
    }

    const downloaded = await this.downloadMetaMedia(organizationId, attachmentSource, accessToken, message?.type);

    return {
      create: [
        {
          url: downloaded?.url || attachmentSource.link || attachmentSource.id || "pending-media-fetch",
          mimeType: downloaded?.mimeType || attachmentSource.mime_type || "application/octet-stream",
          fileName: downloaded?.fileName || attachmentSource.filename || `${message?.type || "attachment"}`,
        },
      ],
    };
  }

  private async resolveWabaConfig(phoneNumberId?: string, displayNumber?: string) {
    if (phoneNumberId) {
      const exact = await this.prisma.wabaConfig.findFirst({
        where: { phoneNumberId },
      });
      if (exact) return exact;
    }

    if (displayNumber) {
      const configs = await this.prisma.wabaConfig.findMany();
      const byDisplayNumber = configs.find((config) => {
        const configuredDisplay = String(config.displayNumber || "").replace(/[^0-9]/g, "");
        const configuredPhoneId = String(config.phoneNumberId || "").replace(/[^0-9]/g, "");
        return configuredDisplay === displayNumber || configuredPhoneId === displayNumber;
      });
      if (byDisplayNumber) return byDisplayNumber;
    }

    const fallback = await this.prisma.wabaConfig.findFirst({
      orderBy: { updatedAt: "desc" },
    });
    if (fallback) {
      this.logger.warn(
        `Unable to match webhook phone_number_id=${phoneNumberId || "unknown"}. Falling back to latest WABA config for organization ${fallback.organizationId}.`
      );
    }
    return fallback;
  }

  private async downloadMetaMedia(
    organizationId: string | null,
    attachmentSource: any,
    accessToken?: string,
    type?: string
  ) {
    const mediaId = attachmentSource?.id;
    if (!organizationId || !mediaId || !accessToken) return null;

    try {
      const graphBase = process.env.META_GRAPH_BASE || "https://graph.facebook.com/v19.0";
      const metadataResponse = await fetch(`${graphBase}/${mediaId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!metadataResponse.ok) {
        this.logger.warn(`Unable to fetch Meta media metadata ${mediaId}: ${await metadataResponse.text()}`);
        return null;
      }
      const metadata = await metadataResponse.json();
      if (!metadata?.url) return null;

      const mediaResponse = await fetch(metadata.url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!mediaResponse.ok) {
        this.logger.warn(`Unable to download Meta media ${mediaId}: ${await mediaResponse.text()}`);
        return null;
      }

      const mimeType = metadata.mime_type || attachmentSource.mime_type || mediaResponse.headers.get("content-type") || "application/octet-stream";
      const extension = this.extensionForMimeType(mimeType, type);
      const safeOriginal = String(attachmentSource.filename || `${type || "media"}-${mediaId}`).replace(/[^a-zA-Z0-9._-]/g, "-");
      const fileName = `${Date.now()}-${randomUUID()}-${safeOriginal}${safeOriginal.includes(".") ? "" : extension}`;
      const uploadRoot = process.env.MEDIA_UPLOAD_DIR || "uploads";
      await mkdir(uploadRoot, { recursive: true });
      const buffer = Buffer.from(await mediaResponse.arrayBuffer());
      await writeFile(join(uploadRoot, fileName), buffer);

      const baseUrl = (
        process.env.PUBLIC_WEBHOOK_BASE_URL ||
        process.env.NGROK_URL ||
        process.env.API_PUBLIC_URL ||
        "http://localhost:4000"
      ).replace(/\/$/, "");

      return {
        url: `${baseUrl}/uploads/${fileName}`,
        mimeType,
        fileName: attachmentSource.filename || fileName,
      };
    } catch (error: any) {
      this.logger.warn(`Unable to store Meta media ${mediaId}: ${error?.message || error}`);
      return null;
    }
  }

  private extensionForMimeType(mimeType: string, type?: string) {
    if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return ".jpg";
    if (mimeType.includes("png")) return ".png";
    if (mimeType.includes("webp")) return ".webp";
    if (mimeType.includes("gif")) return ".gif";
    if (mimeType.includes("mp4")) return type === "audio" ? ".m4a" : ".mp4";
    if (mimeType.includes("mpeg")) return ".mp3";
    if (mimeType.includes("ogg")) return ".ogg";
    if (mimeType.includes("pdf")) return ".pdf";
    return ".bin";
  }

  private async handleTemplateStatus(organizationId: string, templateEvent: any) {
    const metaTemplateId = templateEvent?.message_template_id || templateEvent?.event;
    const event = String(templateEvent?.event || templateEvent?.status || "PENDING_REVIEW").toUpperCase();

    if (!metaTemplateId) return;

    const statusMap: Record<string, string> = {
      APPROVED: "APPROVED",
      REJECTED: "REJECTED",
      PAUSED: "PAUSED",
      DISABLED: "DISABLED",
      PENDING: "SUBMITTED",
    };

    await this.prisma.template.updateMany({
      where: { organizationId, metaTemplateId },
      data: {
        status: statusMap[event] || event,
        rejectionReason: templateEvent?.reason || null,
        qualityScore: templateEvent?.quality_score || undefined,
      },
    });

    await this.logEvent(organizationId, "template.status", templateEvent, metaTemplateId);
  }

  private async bumpBroadcastStats(organizationId: string, status: any) {
    const broadcastId = status?.biz_opaque_callback_data || status?.conversation?.id;
    if (!broadcastId) return;

    const broadcast = await this.prisma.broadcast.findFirst({
      where: { id: broadcastId, organizationId },
    });
    if (!broadcast) return;

    const normalized = String(status.status || "").toLowerCase();

    const recipient = status?.recipient_id
      ? await this.prisma.broadcastRecipient.findFirst({
          where: { broadcastId: broadcast.id, phone: status.recipient_id },
        })
      : null;

    if (recipient) {
      await this.prisma.broadcastRecipient.update({
        where: { id: recipient.id },
        data: {
          status: this.nextRecipientStatus(recipient.status, normalized),
          deliveredAt: ["delivered", "read"].includes(normalized) ? new Date() : recipient.deliveredAt,
          readAt: normalized === "read" ? new Date() : recipient.readAt,
          error: normalized === "failed" ? this.formatWebhookError(status) : recipient.error,
          pricing: status.pricing ? (status.pricing as any) : undefined,
        },
      });
    }

    await this.refreshBroadcastStats(organizationId, broadcast.id);
  }

  private nextRecipientStatus(currentStatus: string, nextStatus: string) {
    if (nextStatus === "failed") return "FAILED";
    const rank: Record<string, number> = { PENDING: 0, SENT: 1, DELIVERED: 2, READ: 3 };
    const normalizedNext = nextStatus.toUpperCase();
    if (rank[normalizedNext] === undefined) return currentStatus;
    return rank[normalizedNext] >= (rank[currentStatus] ?? 0) ? normalizedNext : currentStatus;
  }

  private formatWebhookError(status: any) {
    const error = status?.errors?.[0];
    return error?.message || error?.title || error?.details || "DELIVERY_FAILED";
  }

  private async markLatestBroadcastReply(organizationId: string, phone: string) {
    const recipient = await this.prisma.broadcastRecipient.findFirst({
      where: {
        organizationId,
        phone,
        sentAt: { not: null },
        repliedAt: null,
        status: { in: ["SENT", "DELIVERED", "READ"] },
      },
      orderBy: { sentAt: "desc" },
    });
    if (!recipient) return;

    await this.prisma.broadcastRecipient.update({
      where: { id: recipient.id },
      data: { repliedAt: new Date() },
    });
    await this.refreshBroadcastStats(organizationId, recipient.broadcastId);
  }

  private async refreshBroadcastStats(organizationId: string, broadcastId: string) {
    const recipients = await this.prisma.broadcastRecipient.findMany({
      where: { organizationId, broadcastId },
      select: { status: true, sentAt: true, deliveredAt: true, readAt: true, repliedAt: true },
    });
    const stats = this.calculateBroadcastStats(recipients);

    await this.prisma.broadcast.update({
      where: { id: broadcastId },
      data: { stats },
    });
  }

  private calculateBroadcastStats(
    recipients: Array<{ status: string; sentAt: Date | null; deliveredAt: Date | null; readAt: Date | null; repliedAt: Date | null }>
  ) {
    return {
      audience: recipients.length,
      sent: recipients.filter((recipient) => recipient.sentAt || ["SENT", "DELIVERED", "READ"].includes(recipient.status)).length,
      delivered: recipients.filter((recipient) => recipient.deliveredAt || ["DELIVERED", "READ"].includes(recipient.status)).length,
      read: recipients.filter((recipient) => recipient.readAt || recipient.status === "READ").length,
      failed: recipients.filter((recipient) => recipient.status === "FAILED").length,
      replied: recipients.filter((recipient) => recipient.repliedAt).length,
    };
  }

  private async logEvent(
    organizationId: string | null,
    eventType: string,
    payload: any,
    externalId?: string
  ) {
    await this.prisma.webhookEvent.create({
      data: {
        organizationId: organizationId || undefined,
        eventType,
        payload,
        externalId,
        status: "RECEIVED",
        processedAt: new Date(),
      },
    });
  }
}
