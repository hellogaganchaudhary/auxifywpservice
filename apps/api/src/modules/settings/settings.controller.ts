import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { SettingsService } from "./settings.service";

@Controller("settings")
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getSettings(@Req() req: any) {
    return this.settingsService.getSettings(req.user.organizationId);
  }

  @Patch("notifications")
  async updateNotifications(@Req() req: any, @Body() body: Record<string, boolean>) {
    return this.settingsService.updateNotifications(req.user.organizationId, body);
  }

  @Post("quick-replies")
  @Roles("ADMIN", "MANAGER")
  async createQuickReply(@Req() req: any, @Body() body: { title: string; body: string }) {
    return this.settingsService.createQuickReply(req.user.organizationId, body);
  }

  @Post("labels")
  @Roles("ADMIN", "MANAGER")
  async createLabel(@Req() req: any, @Body() body: { name: string; color?: string }) {
    return this.settingsService.createLabel(req.user.organizationId, body);
  }

  @Post("api-keys")
  @Roles("ADMIN")
  async createApiKey(@Req() req: any, @Body() body: { name: string }) {
    return this.settingsService.createApiKey(req.user.organizationId, body);
  }

  @Delete("api-keys/:id")
  @Roles("ADMIN")
  async revokeApiKey(@Req() req: any, @Param("id") id: string) {
    return this.settingsService.revokeApiKey(req.user.organizationId, id);
  }

  @Post("api-keys/:id/regenerate")
  @Roles("ADMIN")
  async regenerateApiKey(@Req() req: any, @Param("id") id: string) {
    return this.settingsService.regenerateApiKey(req.user.organizationId, id);
  }
}