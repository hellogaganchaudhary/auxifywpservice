import { Worker } from "bullmq";
import Redis from "ioredis";
import { PrismaClient, BroadcastStatus } from "@prisma/client";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
const prisma = new PrismaClient();

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

new Worker(
  "broadcast-queue",
  async (job) => {
    if (job.name !== "send-broadcast") return;
    const { broadcastId } = job.data as { broadcastId: string };

    const broadcast = await prisma.broadcast.findUnique({
      where: { id: broadcastId },
      include: { template: true },
    });
    if (!broadcast) return;
    if (broadcast.status === BroadcastStatus.CANCELLED) return;

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
            status: "PENDING",
            error: null,
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
        await sendTemplateMessage({
          accessToken: wabaConfig.accessToken,
          phoneNumberId: wabaConfig.phoneNumberId,
          to: contact.phone,
          templateName: broadcast.template.name,
          language: broadcast.template.language || "en",
          templateVariables,
          broadcastId: broadcast.id,
        });
        sent += 1;
        await prisma.broadcastRecipient.update({
          where: { id: recipientId },
          data: { status: "SENT", sentAt: new Date(), error: null },
        });
      } catch {
        failed += 1;
        if (recipientId) {
          await prisma.broadcastRecipient.update({
            where: { id: recipientId },
            data: { status: "FAILED", error: "SEND_FAILED" },
          });
        }
      }
    }

    const stats = { sent, delivered: 0, read: 0, failed };

    await prisma.broadcast.update({
      where: { id: broadcast.id },
      data: {
        status: failed > 0 ? BroadcastStatus.FAILED : BroadcastStatus.COMPLETED,
        sentAt: new Date(),
        stats,
      },
    });
  },
  { connection }
);
