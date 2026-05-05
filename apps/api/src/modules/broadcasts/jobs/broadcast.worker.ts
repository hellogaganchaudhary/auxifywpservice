import { Worker } from "bullmq";
import Redis from "ioredis";
import { PrismaClient, BroadcastStatus } from "@prisma/client";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
const prisma = new PrismaClient();

console.log(`[broadcast-worker] starting queue listener on broadcast-queue (${redisUrl.replace(/:\/\/.*@/, "://***@")})`);

async function resolveAudience(organizationId: string, audience: any) {
  if (!audience) return [];
  if (audience.type === "ALL") {
    return prisma.contact.findMany({
      where: { organizationId, deletedAt: null },
      select: { id: true, phone: true, name: true },
    });
  }
  if (audience.type === "TAG" && audience.tag) {
    return prisma.contact.findMany({
      where: { organizationId, tags: { has: audience.tag }, deletedAt: null },
      select: { id: true, phone: true, name: true },
    });
  }
  if (audience.type === "CSV" && Array.isArray(audience.contactIds)) {
    return prisma.contact.findMany({
      where: { organizationId, id: { in: audience.contactIds } },
      select: { id: true, phone: true, name: true },
    });
  }
  if (audience.type === "SEGMENT" && audience.segmentId) {
    return prisma.contact.findMany({
      where: { organizationId, segments: { has: audience.segmentId }, deletedAt: null },
      select: { id: true, phone: true, name: true },
    });
  }
  return [];
}

function buildTemplateComponents(templateVariables?: Record<string, string>) {
  if (!templateVariables || Object.keys(templateVariables).length === 0) return undefined;
  const parameters = Object.values(templateVariables).map((value) => ({
    type: "text",
    text: value,
  }));
  return [{ type: "body", parameters }];
}

async function sendTemplateMessage(params: {
  accessToken: string;
  phoneNumberId: string;
  to: string;
  templateName: string;
  language: string;
  templateVariables?: Record<string, string>;
  broadcastId: string;
}) {
  const graphBase = process.env.META_GRAPH_BASE || "https://graph.facebook.com/v19.0";
  const url = `${graphBase}/${params.phoneNumberId}/messages`;
  const components = buildTemplateComponents(params.templateVariables);
  const body = {
    messaging_product: "whatsapp",
    to: params.to,
    biz_opaque_callback_data: params.broadcastId,
    type: "template",
    template: {
      name: params.templateName,
      language: { code: params.language || "en" },
      ...(components ? { components } : {}),
    },
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

function applyTemplateVariables(body: string, templateVariables?: Record<string, string>) {
  if (!templateVariables) return body;
  return Object.entries(templateVariables).reduce(
    (content, [key, value]) => content.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), value),
    body
  );
}

function extractWhatsAppMessageId(response: any) {
  return response?.messages?.[0]?.id || null;
}

function formatError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "SEND_FAILED");
  return message.length > 900 ? `${message.slice(0, 900)}...` : message;
}

async function ensureConversation(organizationId: string, contact: { id: string; phone: string; name: string | null }) {
  let conversation = await prisma.conversation.findFirst({
    where: { organizationId, contactId: contact.id },
  });
  if (conversation) return conversation;

  return prisma.conversation.create({
    data: {
      organizationId,
      contactId: contact.id,
      status: "OPEN",
    },
  });
}

new Worker(
  "broadcast-queue",
  async (job) => {
    if (job.name !== "send-broadcast") return;
    const { broadcastId } = job.data as { broadcastId: string };
    console.log(`[broadcast-worker] job ${job.id} received for broadcast ${broadcastId}`);

    const broadcast = await prisma.broadcast.findUnique({
      where: { id: broadcastId },
      include: { template: true },
    });
    if (!broadcast) {
      console.warn(`[broadcast-worker] broadcast ${broadcastId} not found`);
      return;
    }
    if (broadcast.status === BroadcastStatus.CANCELLED) {
      console.log(`[broadcast-worker] broadcast ${broadcastId} is cancelled; skipping`);
      return;
    }

    const wabaConfig = await prisma.wabaConfig.findUnique({
      where: { organizationId: broadcast.organizationId },
    });
    if (!wabaConfig) {
      await prisma.broadcast.update({
        where: { id: broadcast.id },
        data: { status: BroadcastStatus.FAILED },
      });
      return;
    }

    await prisma.broadcast.update({
      where: { id: broadcast.id },
      data: { status: BroadcastStatus.RUNNING },
    });

    const audience = await resolveAudience(
      broadcast.organizationId,
      broadcast.audience
    );
    console.log(`[broadcast-worker] broadcast ${broadcast.id} audience resolved: ${audience.length}`);

    const templateVariables = (broadcast as any).templateVariables ||
      (broadcast.audience as any)?.templateVariables ||
      undefined;

    let sent = 0;
    let failed = 0;

    for (const contact of audience) {
      let recipientId: string | null = null;
      try {
        const recipient = await prisma.broadcastRecipient.upsert({
          where: {
            broadcastId_phone: {
              broadcastId: broadcast.id,
              phone: contact.phone,
            },
          },
          update: {
            contactId: contact.id,
          },
          create: {
            organizationId: broadcast.organizationId,
            broadcastId: broadcast.id,
            contactId: contact.id,
            phone: contact.phone,
            status: "PENDING",
          },
        });

        recipientId = recipient.id;

        // Idempotency check: skip if already sent or successfully processed
        if (recipient.status !== "PENDING" && recipient.status !== "FAILED") {
          continue;
        }

        // Basic rate-limiting delay (e.g., 50ms = 20 messages per second per worker)
        await new Promise((resolve) => setTimeout(resolve, 50));

        const response = await sendTemplateMessage({
          accessToken: wabaConfig.accessToken,
          phoneNumberId: wabaConfig.phoneNumberId,
          to: contact.phone,
          templateName: broadcast.template.name,
          language: broadcast.template.language || "en",
          templateVariables,
          broadcastId: broadcast.id,
        });
        console.log(`[broadcast-worker] sent broadcast ${broadcast.id} to ${contact.phone}`);
        const now = new Date();
        const whatsappMessageId = extractWhatsAppMessageId(response);
        const conversation = await ensureConversation(broadcast.organizationId, contact);
        const content = applyTemplateVariables(broadcast.template.body || broadcast.template.name, templateVariables);
        sent += 1;
        await prisma.broadcastRecipient.update({
          where: { id: recipientId },
          data: { status: "SENT", sentAt: now, error: null },
        });

        if (whatsappMessageId) {
          await prisma.message.upsert({
            where: { id: whatsappMessageId },
            update: {
              conversationId: conversation.id,
              content,
              type: "TEMPLATE",
              direction: "OUTBOUND",
              status: "sent",
              externalId: whatsappMessageId,
            },
            create: {
              id: whatsappMessageId,
              conversationId: conversation.id,
              content,
              type: "TEMPLATE",
              direction: "OUTBOUND",
              status: "sent",
              externalId: whatsappMessageId,
              createdAt: now,
            },
          });
        }

        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { updatedAt: now },
        });
      } catch (error) {
        failed += 1;
        console.error(`[broadcast-worker] failed broadcast ${broadcast.id} to ${contact.phone}: ${formatError(error)}`);
        if (recipientId) {
          await prisma.broadcastRecipient.update({
            where: { id: recipientId },
            data: { status: "FAILED", error: formatError(error) },
          });
        }
      }
    }

    const recipientStats = await prisma.broadcastRecipient.findMany({
      where: { organizationId: broadcast.organizationId, broadcastId: broadcast.id },
      select: { status: true, sentAt: true, deliveredAt: true, readAt: true, repliedAt: true },
    });
    const stats = {
      audience: recipientStats.length,
      sent: recipientStats.filter((recipient) => recipient.sentAt || ["SENT", "DELIVERED", "READ"].includes(recipient.status)).length,
      delivered: recipientStats.filter((recipient) => recipient.deliveredAt || ["DELIVERED", "READ"].includes(recipient.status)).length,
      read: recipientStats.filter((recipient) => recipient.readAt || recipient.status === "READ").length,
      failed,
      replied: recipientStats.filter((recipient) => recipient.repliedAt).length,
    };

    await prisma.broadcast.update({
      where: { id: broadcast.id },
      data: {
        status: failed > 0 ? BroadcastStatus.FAILED : BroadcastStatus.COMPLETED,
        sentAt: new Date(),
        stats,
      },
    });
    console.log(`[broadcast-worker] completed broadcast ${broadcast.id}: sent=${stats.sent} failed=${stats.failed} audience=${stats.audience}`);
  },
  { connection }
);

connection.on("error", (error) => {
  console.error(`[broadcast-worker] redis error: ${error.message}`);
});

process.on("SIGTERM", async () => {
  console.log("[broadcast-worker] SIGTERM received; disconnecting");
  await prisma.$disconnect();
  connection.disconnect();
  process.exit(0);
});
