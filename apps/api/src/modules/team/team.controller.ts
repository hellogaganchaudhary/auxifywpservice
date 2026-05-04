import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { TeamService } from "./team.service";
import { CreateTeamGroupDto, InviteMemberDto, UpdateMemberRoleDto, UpdateTeamGroupDto } from "./team.dto";

@Controller("team")
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get("members")
  async listMembers(@Req() req: any) {
    return this.teamService.listMembers(req.user.organizationId);
  }

  @Post("invite")
  @Roles("ADMIN", "MANAGER")
  async invite(@Req() req: any, @Body() body: InviteMemberDto) {
    return this.teamService.inviteMember(req.user, body);
  }

  @Patch("members/:id/role")
  @Roles("ADMIN")
  async updateRole(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: UpdateMemberRoleDto
  ) {
    return this.teamService.updateMemberRole(req.user.organizationId, id, body);
  }

  @Delete("members/:id")
  @Roles("ADMIN")
  async deactivateMember(@Req() req: any, @Param("id") id: string) {
    return this.teamService.deactivateMember(req.user.organizationId, id);
  }

  @Get("invites")
  async listInvites(@Req() req: any) {
    return this.teamService.listInvites(req.user.organizationId);
  }

  @Delete("invites/:id")
  @Roles("ADMIN", "MANAGER")
  async revokeInvite(@Req() req: any, @Param("id") id: string) {
    return this.teamService.revokeInvite(req.user.organizationId, id);
  }

  @Get("groups")
  async listGroups(@Req() req: any) {
    return this.teamService.listGroups(req.user.organizationId);
  }

  @Post("groups")
  @Roles("ADMIN", "MANAGER")
  async createGroup(@Req() req: any, @Body() body: CreateTeamGroupDto) {
    return this.teamService.createGroup(req.user.organizationId, body);
  }

  @Patch("groups/:id")
  @Roles("ADMIN", "MANAGER")
  async updateGroup(@Req() req: any, @Param("id") id: string, @Body() body: UpdateTeamGroupDto) {
    return this.teamService.updateGroup(req.user.organizationId, id, body);
  }
}
