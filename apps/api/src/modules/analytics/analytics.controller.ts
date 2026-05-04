import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AnalyticsService } from "./analytics.service";

@Controller("analytics")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("overview")
  async overview(@Req() req: any) {
    return this.analyticsService.getOverview(req.user.organizationId);
  }

  @Get("agent-performance")
  async agentPerformance(@Req() req: any) {
    return this.analyticsService.getAgentPerformance(req.user.organizationId);
  }

  @Get("template-performance")
  async templatePerformance(@Req() req: any) {
    return this.analyticsService.getTemplatePerformance(req.user.organizationId);
  }

  @Get("broadcast-reports")
  async broadcastReports(@Req() req: any) {
    return this.analyticsService.getBroadcastReports(req.user.organizationId);
  }

  @Get("credit-usage")
  async creditUsage(@Req() req: any) {
    return this.analyticsService.getCreditUsage(req.user.organizationId);
  }
}
