import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private assertOrg(organizationId: string) {
    if (!organizationId) {
      throw new BadRequestException("Organization required");
    }
  }

  async getOverview(organizationId: string) {
    this.assertOrg(organizationId);
    const [conversations, messages, opened, closed, recentConversations] = await Promise.all([
      this.prisma.conversation.count({ where: { organizationId } }),
      this.prisma.message.count({
        where: { conversation: { organizationId } },
      }),
      this.prisma.conversation.count({
        where: { organizationId, status: { notIn: ["closed", "resolved", "archived"] } },
      }),
      this.prisma.conversation.count({
        where: { organizationId, status: { in: ["closed", "resolved", "archived"] } },
      }),
      this.prisma.conversation.findMany({
        where: { organizationId },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            select: { createdAt: true, direction: true },
          },
        },
        take: 100,
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    const responseTimes = recentConversations
      .map((conversation) => {
        const firstInbound = conversation.messages.find(
          (message) => message.direction === "INBOUND"
        );
        const firstOutboundAfterInbound = conversation.messages.find(
          (message) =>
            message.direction === "OUTBOUND" &&
            firstInbound &&
            new Date(message.createdAt) > new Date(firstInbound.createdAt)
        );
        return this.minutesBetween(firstInbound?.createdAt, firstOutboundAfterInbound?.createdAt);
      })
      .filter((value) => value > 0);

    const avgResponseTime = responseTimes.length
      ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length)
      : 0;

    return {
      messages,
      conversations,
      avgResponseTime,
      opened,
      closed,
    };
  }

  async getAgentPerformance(organizationId: string) {
    this.assertOrg(organizationId);
    const [users, conversations] = await Promise.all([
      this.prisma.user.findMany({
        where: { organizationId },
        select: {
          id: true,
          name: true,
          role: true,
          lastActiveAt: true,
        },
      }),
      this.prisma.conversation.findMany({
        where: { organizationId, assignedToId: { not: null } },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            select: { createdAt: true, direction: true },
          },
        },
      }),
    ]);

    return users.map((user) => {
      const assigned = conversations.filter((conversation) => conversation.assignedToId === user.id);
      const resolutionTimes = assigned
        .filter((conversation) => ["closed", "resolved", "archived"].includes(conversation.status.toLowerCase()))
        .map((conversation) => this.minutesBetween(conversation.createdAt, conversation.updatedAt))
        .filter((value) => value > 0);

      const firstReplyTimes = assigned
        .map((conversation) => {
          const firstInbound = conversation.messages.find((message) => message.direction === "INBOUND");
          const firstOutbound = conversation.messages.find(
            (message) =>
              message.direction === "OUTBOUND" &&
              firstInbound &&
              new Date(message.createdAt) > new Date(firstInbound.createdAt)
          );
          return this.minutesBetween(firstInbound?.createdAt, firstOutbound?.createdAt);
        })
        .filter((value) => value > 0);

      return {
        ...user,
        conversationsHandled: assigned.length,
        avgResolutionTime: resolutionTimes.length
          ? Math.round(resolutionTimes.reduce((sum, value) => sum + value, 0) / resolutionTimes.length)
          : 0,
        firstReplyTime: firstReplyTimes.length
          ? Math.round(firstReplyTimes.reduce((sum, value) => sum + value, 0) / firstReplyTimes.length)
          : 0,
      };
    });
  }

  async getTemplatePerformance(organizationId: string) {
    this.assertOrg(organizationId);
    const [templates, broadcasts] = await Promise.all([
      this.prisma.template.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.broadcast.findMany({
        where: { organizationId },
        select: { templateId: true, stats: true },
      }),
    ]);

    return templates.map((template) => {
      const relatedBroadcasts = broadcasts.filter((broadcast) => broadcast.templateId === template.id);
      const rolledUp = relatedBroadcasts.reduce(
        (acc, broadcast) => {
          const stats = (broadcast.stats as Record<string, number> | null) || {};
          acc.sent += Number(stats.sent ?? 0);
          acc.delivered += Number(stats.delivered ?? 0);
          acc.read += Number(stats.read ?? 0);
          acc.failed += Number(stats.failed ?? 0);
          return acc;
        },
        { sent: 0, delivered: 0, read: 0, failed: 0 }
      );

      return {
        id: template.id,
        name: template.name,
        status: template.status,
        usageCount: rolledUp.sent,
        deliveryRate: this.percent(rolledUp.delivered, rolledUp.sent),
        readRate: this.percent(rolledUp.read, rolledUp.sent),
        failureRate: this.percent(rolledUp.failed, rolledUp.sent),
      };
    });
  }

  async getBroadcastReports(organizationId: string) {
    this.assertOrg(organizationId);
    const broadcasts = await this.prisma.broadcast.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });

    return broadcasts.map((broadcast) => {
      const stats = (broadcast.stats as Record<string, number> | null) || {};
      return {
        id: broadcast.id,
        name: broadcast.name,
        status: broadcast.status,
        stats: {
          sent: Number(stats.sent ?? 0),
          delivered: Number(stats.delivered ?? 0),
          read: Number(stats.read ?? 0),
          replied: Number(stats.replied ?? 0),
          failed: Number(stats.failed ?? 0),
        },
      };
    });
  }

  async getCreditUsage(organizationId: string) {
    this.assertOrg(organizationId);
    const transactions = await this.prisma.walletTransaction.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });

    const spendTransactions = transactions.filter((transaction) => transaction.amount < 0);
    const totalSpent = Math.abs(
      spendTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)
    );

    const dailySpendMap = new Map<string, number>();
    const templateSpendMap = new Map<string, number>();

    for (const transaction of spendTransactions) {
      const date = transaction.createdAt.toISOString().slice(0, 10);
      dailySpendMap.set(date, (dailySpendMap.get(date) || 0) + Math.abs(transaction.amount));

      const metadata = (transaction.metadata as Record<string, unknown> | null) || {};
      const templateName = String(metadata.templateName || metadata.templateId || "Unknown template");
      templateSpendMap.set(
        templateName,
        (templateSpendMap.get(templateName) || 0) + Math.abs(transaction.amount)
      );
    }

    return {
      dailySpend: Array.from(dailySpendMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-14)
        .map(([date, amount]) => ({ date, amount })),
      topTemplates: Array.from(templateSpendMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, amount]) => ({ name, amount })),
      totalSpent,
    };
  }

  private minutesBetween(start?: Date | string | null, end?: Date | string | null) {
    if (!start || !end) {
      return 0;
    }

    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();

    if (Number.isNaN(startTime) || Number.isNaN(endTime) || endTime <= startTime) {
      return 0;
    }

    return Math.round((endTime - startTime) / 60000);
  }

  private percent(value: number, total: number) {
    if (!total) {
      return 0;
    }

    return Math.round((value / total) * 100);
  }
}
