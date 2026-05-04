import { BadRequestException, Injectable } from "@nestjs/common";
import { createHash, randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private ensureOrg(organizationId: string) {
    if (!organizationId) {
      throw new BadRequestException("Organization required");
    }
  }

  async getSettings(organizationId: string) {
    this.ensureOrg(organizationId);

    const [organization, auditLog, notificationSettings, quickReplies, apiKeys] = await Promise.all([
      this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          id: true,
          contactSegments: true,
          conversationLabels: {
            orderBy: { createdAt: "desc" },
            take: 50,
          },
        },
      }),
      this.prisma.auditLog.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      this.prisma.notificationSettings.findUnique({
        where: { organizationId },
      }),
      this.prisma.quickReply.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.apiKey.findMany({
        where: { organizationId, revokedAt: null },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      notifications: notificationSettings || {
        emailAlerts: true,
        browserAlerts: true,
        dailyDigest: false,
        escalationAlerts: true,
      },
      quickReplies,
      labels: organization?.conversationLabels ?? [],
      apiKeys: apiKeys.map((item) => ({
        id: item.id,
        name: item.name,
        prefix: item.prefix,
        lastUsedAt: item.lastUsedAt,
        createdAt: item.createdAt,
      })),
      auditLog,
    };
  }

  async updateNotifications(organizationId: string, payload: Record<string, boolean>) {
    this.ensureOrg(organizationId);
    const settings = await this.prisma.notificationSettings.upsert({
      where: { organizationId },
      update: {
        emailAlerts: Boolean(payload.emailAlerts),
        browserAlerts: Boolean(payload.browserAlerts),
        dailyDigest: Boolean(payload.dailyDigest),
        escalationAlerts: Boolean(payload.escalationAlerts),
      },
      create: {
        organizationId,
        emailAlerts: Boolean(payload.emailAlerts),
        browserAlerts: Boolean(payload.browserAlerts),
        dailyDigest: Boolean(payload.dailyDigest),
        escalationAlerts: Boolean(payload.escalationAlerts),
      },
    });
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorId: "settings_user",
        action: "settings.notifications.updated",
        resourceType: "Settings",
        metadata: payload,
      },
    });
    return settings;
  }

  async createQuickReply(organizationId: string, payload: { title: string; body: string }) {
    this.ensureOrg(organizationId);
    const quickReply = await this.prisma.quickReply.create({
      data: {
        organizationId,
        title: payload.title,
        body: payload.body,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorId: "settings_user",
        action: "settings.quick_reply.created",
        resourceType: "QuickReply",
        metadata: payload,
      },
    });
    return quickReply;
  }

  async createLabel(organizationId: string, payload: { name: string; color?: string }) {
    this.ensureOrg(organizationId);
    return this.prisma.conversationLabel.create({
      data: {
        organizationId,
        conversationId: (
          await this.prisma.conversation.findFirst({
            where: { organizationId },
            select: { id: true },
          })
        )?.id || "",
        name: payload.name,
        color: payload.color || "gray",
      },
    });
  }

  async createApiKey(organizationId: string, payload: { name: string }) {
    this.ensureOrg(organizationId);
    const secret = `wa_live_${randomBytes(18).toString("hex")}`;
    const prefix = secret.slice(0, 10);
    const apiKey = await this.prisma.apiKey.create({
      data: {
        organizationId,
        userId: null,
        name: payload.name,
        prefix,
        secretHash: createHash("sha256").update(secret).digest("hex"),
      },
    });
    const created = {
      id: apiKey.id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      createdAt: apiKey.createdAt,
      lastUsedAt: apiKey.lastUsedAt,
      secret,
    };

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorId: "settings_user",
        action: "settings.api_key.created",
        resourceType: "ApiKey",
        resourceId: created.id,
        metadata: { name: created.name, prefix: created.prefix },
      },
    });

    return created;
  }

  async revokeApiKey(organizationId: string, apiKeyId: string) {
    this.ensureOrg(organizationId);
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id: apiKeyId, organizationId, revokedAt: null },
    });
    if (!apiKey) {
      throw new BadRequestException("API key not found");
    }

    const revoked = await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { revokedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorId: "settings_user",
        action: "settings.api_key.revoked",
        resourceType: "ApiKey",
        resourceId: apiKey.id,
        metadata: { name: apiKey.name, prefix: apiKey.prefix },
      },
    });

    return { id: revoked.id, revokedAt: revoked.revokedAt };
  }

  async regenerateApiKey(organizationId: string, apiKeyId: string) {
    this.ensureOrg(organizationId);
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id: apiKeyId, organizationId, revokedAt: null },
    });
    if (!apiKey) {
      throw new BadRequestException("API key not found");
    }

    const secret = `wa_live_${randomBytes(18).toString("hex")}`;
    const prefix = secret.slice(0, 10);
    const updated = await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: {
        prefix,
        secretHash: createHash("sha256").update(secret).digest("hex"),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorId: "settings_user",
        action: "settings.api_key.regenerated",
        resourceType: "ApiKey",
        resourceId: apiKey.id,
        metadata: { name: apiKey.name, prefix },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      prefix: updated.prefix,
      createdAt: updated.createdAt,
      lastUsedAt: updated.lastUsedAt,
      secret,
    };
  }
}