import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { OrganizationService } from "./organization.service";
import { SyncWabaConfigDto, UpdateOrganizationDto, UpdateWabaConfigDto } from "./organization.dto";

@Controller("organization")
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Get()
  async getOrg(@Req() req: any) {
    return this.organizationService.getOrganization(req.user.organizationId);
  }

  @Patch()
  @Roles("ADMIN")
  async updateOrg(@Req() req: any, @Body() body: UpdateOrganizationDto) {
    return this.organizationService.updateOrganization(req.user.organizationId, body);
  }

  @Get("waba-config")
  async getWaba(@Req() req: any) {
    return this.organizationService.getWabaConfig(req.user.organizationId);
  }

  @Get("waba-config/webhook-profile")
  async getWabaWebhookProfile(@Req() req: any) {
    const forwardedProto = String(req.headers?.["x-forwarded-proto"] || req.protocol || "https").split(",")[0];
    const forwardedHost = String(req.headers?.["x-forwarded-host"] || req.headers?.host || "").split(",")[0];
    const requestBaseUrl = forwardedHost ? `${forwardedProto}://${forwardedHost}` : "";
    return this.organizationService.getWabaWebhookProfile(req.user.organizationId, requestBaseUrl);
  }

  @Get("waba-config/webhook-logs")
  async getWabaWebhookLogs(@Req() req: any) {
    return this.organizationService.getWabaWebhookLogs(req.user.organizationId);
  }

  @Patch("waba-config")
  @Roles("ADMIN")
  async updateWaba(@Req() req: any, @Body() body: UpdateWabaConfigDto) {
    return this.organizationService.upsertWabaConfig(req.user.organizationId, body);
  }

  @Post("waba-config/sync")
  @Roles("ADMIN")
  async syncWaba(@Req() req: any, @Body() body: SyncWabaConfigDto) {
    return this.organizationService.syncWabaConfig(req.user.organizationId, body);
  }

  @Post("waba-config/verify")
  @Roles("ADMIN")
  async verifyWaba(@Req() req: any) {
    return this.organizationService.verifyWabaConfig(req.user.organizationId);
  }
}
