import { BadRequestException, Injectable } from "@nestjs/common";
import { BroadcastStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queues/queues.service";
import { CreateBroadcastDto } from "./broadcasts.dto";
import { AuthUser } from "../auth/types/auth.types";

type AudienceFilter = {
  type?: string;
  tag?: string;
  segmentId?: string;
  contactIds?: string[];
};

const toJsonValue = (value: unknown): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;

const asAudienceFilter = (value: Prisma.JsonValue): AudienceFilter =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as AudienceFilter)
    : {};

@Injectable()
export class BroadcastsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: QueueService
  ) {}

  async list(organizationId: string, status?: string) {
    return this.prisma.broadcast.findMany({
      where: {
        organizationId,
        status: status ? (status as BroadcastStatus) : undefined,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(user: AuthUser, payload: CreateBroadcastDto) {
    if (!user.organizationId) {
      throw new BadRequestException("Organization required");
    }
    const createdBy = (user as any).id || (user as any).userId || (user as any).sub;
    if (!createdBy) {
      throw new BadRequestException("User required");
    }
    return this.prisma.broadcast.create({
      data: {
        organizationId: user.organizationId,
        name: payload.name,
        templateId: payload.templateId,
        status: BroadcastStatus.DRAFT,
        audience: toJsonValue(payload.audience),
        templateVariables: payload.templateVariables
          ? toJsonValue(payload.templateVariables)
          : undefined,
        scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : null,
        createdBy,
      },
    });
  }

  async get(organizationId: string, id: string) {
    const broadcast = await this.prisma.broadcast.findFirst({
      where: { id, organizationId },
    });
    if (!broadcast) {
      throw new BadRequestException("Broadcast not found");
    }
    return broadcast;
  }

  async sendNow(organizationId: string, id: string) {
    const broadcast = await this.get(organizationId, id);
    const contacts = await this.resolveAudience(
      organizationId,
      asAudienceFilter(broadcast.audience)
    );

    await this.syncRecipients(broadcast.id, organizationId, contacts);

    const updated = await this.prisma.broadcast.update({
      where: { id },
      data: {
        status: BroadcastStatus.RUNNING,
        stats: {
          sent: 0,
          delivered: 0,
          read: 0,
          failed: 0,
          replied: 0,
          audience: contacts.length,
        },
      },
    });
    await this.queues.broadcastQueue.add("send-broadcast", {
      broadcastId: id,
    });
    return updated;
  }

  async schedule(
    organizationId: string,
    id: string,
    payload: { scheduledAt: string }
  ) {
    const existing = await this.get(organizationId, id);
    const contacts = await this.resolveAudience(
      organizationId,
      asAudienceFilter(existing.audience)
    );

    await this.syncRecipients(existing.id, organizationId, contacts);

    const broadcast = await this.prisma.broadcast.update({
      where: { id },
      data: {
        status: BroadcastStatus.SCHEDULED,
        scheduledAt: new Date(payload.scheduledAt),
        stats: {
          sent: 0,
          delivered: 0,
          read: 0,
          failed: 0,
          replied: 0,
          audience: contacts.length,
        },
      },
    });
    const delay = Math.max(
      0,
      new Date(payload.scheduledAt).getTime() - Date.now()
    );
    await this.queues.broadcastQueue.add(
      "send-broadcast",
      { broadcastId: id },
      { delay }
    );
    return broadcast;
  }

  async cancel(organizationId: string, id: string) {
    return this.prisma.broadcast.update({
      where: { id, organizationId },
      data: { status: BroadcastStatus.CANCELLED },
    });
  }

  async analytics(organizationId: string, id: string) {
    const broadcast = await this.get(organizationId, id);
    const recipients = await this.prisma.broadcastRecipient.findMany({
      where: { organizationId, broadcastId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const stats = (broadcast.stats || {}) as Record<string, number>;
    const sent = stats.sent ?? 0;
    const delivered = stats.delivered ?? 0;
    const read = stats.read ?? 0;
    const failed = stats.failed ?? 0;
    const replied = stats.replied ?? 0;
    const deliveryRate = sent > 0 ? Number(((delivered / sent) * 100).toFixed(1)) : 0;
    const readRate = delivered > 0 ? Number(((read / delivered) * 100).toFixed(1)) : 0;
    const failureRate = sent > 0 ? Number(((failed / sent) * 100).toFixed(1)) : 0;
    return {
      sent,
      delivered,
      read,
      failed,
      replied,
      deliveryRate,
      readRate,
      failureRate,
      recipients,
    };
  }

  private async resolveAudience(organizationId: string, audience: AudienceFilter) {
    if (!audience) return [];
    if (audience.type === "ALL") {
      return this.prisma.contact.findMany({
        where: { organizationId, deletedAt: null },
        select: { id: true, phone: true },
      });
    }
    if (audience.type === "TAG" && audience.tag) {
      return this.prisma.contact.findMany({
        where: { organizationId, deletedAt: null, tags: { has: audience.tag } },
        select: { id: true, phone: true },
      });
    }
    if (audience.type === "SEGMENT" && audience.segmentId) {
      return this.prisma.contact.findMany({
        where: { organizationId, deletedAt: null, segments: { has: audience.segmentId } },
        select: { id: true, phone: true },
      });
    }
    if (audience.type === "CSV" && Array.isArray(audience.contactIds)) {
      return this.prisma.contact.findMany({
        where: { organizationId, id: { in: audience.contactIds } },
        select: { id: true, phone: true },
      });
    }
    return [];
  }

  private async syncRecipients(
    broadcastId: string,
    organizationId: string,
    contacts: Array<{ id: string; phone: string }>
  ) {
    for (const contact of contacts) {
      await this.prisma.broadcastRecipient.upsert({
        where: {
          broadcastId_phone: {
            broadcastId,
            phone: contact.phone,
          },
        },
        update: {
          contactId: contact.id,
          error: null,
        },
        create: {
          broadcastId,
          organizationId,
          contactId: contact.id,
          phone: contact.phone,
        },
      });
    }
  }
}
