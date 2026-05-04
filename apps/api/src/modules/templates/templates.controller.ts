import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { TemplatesService } from "./templates.service";

@Controller("templates")
@UseGuards(JwtAuthGuard, RolesGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get("analytics/summary")
  async analytics(@Req() req: any) {
    return this.templatesService.analytics(req.user.organizationId);
  }

  @Post("sync-meta")
  @Roles("ADMIN", "MANAGER")
  async syncMeta(@Req() req: any) {
    return this.templatesService.syncAllFromMeta(req.user);
  }

  @Get()
  async list(@Req() req: any, @Query("status") status?: string) {
    return this.templatesService.list(req.user.organizationId, status);
  }

  @Post()
  @Roles("ADMIN", "MANAGER")
  async create(@Req() req: any, @Body() body: any) {
    return this.templatesService.create(req.user, body);
  }

  @Get(":id")
  async get(@Req() req: any, @Param("id") id: string) {
    return this.templatesService.get(req.user.organizationId, id);
  }

  @Post(":id/submit")
  @Roles("ADMIN", "MANAGER")
  async submit(@Req() req: any, @Param("id") id: string) {
    return this.templatesService.submitToMeta(req.user.organizationId, id);
  }

  @Post(":id/sync-status")
  @Roles("ADMIN", "MANAGER")
  async syncStatus(@Req() req: any, @Param("id") id: string) {
    return this.templatesService.syncStatus(req.user.organizationId, id);
  }
}
