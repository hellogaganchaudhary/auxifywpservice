import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Roles } from "../auth/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { SuperAdminService } from "./super-admin.service";
import {
  CreateOrganizationDto,
  CreateOrganizationAdminDto,
  UpdateOrganizationDto,
  ResendInviteDto,
} from "./super-admin.dto";

@Controller("super-admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN")
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get("stats")
  async stats() {
    return this.superAdminService.getStats();
  }

  @Get("organizations")
  async listOrganizations(
    @Query("q") q?: string,
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20"
  ) {
    return this.superAdminService.listOrganizations({
      q,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }

  @Post("organizations")
  async createOrganization(@Body() body: CreateOrganizationDto) {
    return this.superAdminService.createOrganization(body);
  }

  @Post("organizations/:id/admins")
  async createOrganizationAdmin(
    @Param("id") id: string,
    @Body() body: CreateOrganizationAdminDto
  ) {
    return this.superAdminService.createOrganizationAdmin(id, body);
  }

  @Get("organizations/:id")
  async getOrganization(@Param("id") id: string) {
    return this.superAdminService.getOrganization(id);
  }

  @Patch("organizations/:id")
  async updateOrganization(
    @Param("id") id: string,
    @Body() body: UpdateOrganizationDto
  ) {
    return this.superAdminService.updateOrganization(id, body);
  }

  @Delete("organizations/:id")
  async deleteOrganization(@Param("id") id: string) {
    return this.superAdminService.deactivateOrganization(id);
  }

  @Post("organizations/:id/invite-owner")
  async resendInvite(
    @Param("id") id: string,
    @Body() body: ResendInviteDto
  ) {
    return this.superAdminService.resendOwnerInvite(id, body);
  }

  @Get("audit-log")
  async auditLog(
    @Query("orgId") orgId?: string,
    @Query("actorId") actorId?: string,
    @Query("limit") limit = "50"
  ) {
    return this.superAdminService.listAuditLog({
      orgId,
      actorId,
      limit: Number(limit),
    });
  }
}
