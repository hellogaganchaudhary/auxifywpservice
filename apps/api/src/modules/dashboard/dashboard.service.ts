import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(organizationId: string) {
    if (!organizationId) {
      throw new BadRequestException("Organization required");
    }

    const [members, templates, broadcasts] = await Promise.all([
      this.prisma.user.count({ where: { organizationId } }),
      this.prisma.template.count({ where: { organizationId } }),
      this.prisma.broadcast.count({ where: { organizationId } }),
    ]);

    return {
      messagesToday: 0,
      activeConversations: { open: 0, assigned: 0, unassigned: 0 },
      templatePerformance: { top: [], deliveryRate: 0, readRate: 0 },
      creditBalance: { balance: 0, autoRechargeEnabled: false },
      teamActivity: { online: 0, handledToday: 0 },
      recentConversations: [],
      meta: {
        members,
        templates,
        broadcasts,
      },
    };
  }
}
