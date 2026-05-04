import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "../auth/auth.service";
import {
  CreateTeamGroupDto,
  InviteMemberDto,
  TeamRoutingAssignee,
  UpdateMemberRoleDto,
  UpdateTeamGroupDto,
} from "./team.dto";
import { AuthUser } from "../auth/types/auth.types";
import { UserRole } from "@prisma/client";

@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService
  ) {}

  async listMembers(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        lastActiveAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async inviteMember(inviter: AuthUser, payload: InviteMemberDto) {
    if (!inviter.organizationId) {
      throw new BadRequestException("Organization required");
    }
    if (payload.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException("Invalid role");
    }
    return this.authService.createInvite(
      {
        email: payload.email,
        role: payload.role,
        organizationId: inviter.organizationId,
      },
      inviter.id
    );
  }

  async updateMemberRole(
    organizationId: string,
    userId: string,
    payload: UpdateMemberRoleDto
  ) {
    if (payload.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException("Invalid role");
    }
    const existing = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
      select: { id: true, role: true },
    });
    if (!existing) {
      throw new BadRequestException("Member not found");
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { role: payload.role },
    });
  }

  async deactivateMember(organizationId: string, userId: string) {
    const existing = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
      select: { id: true },
    });
    if (!existing) {
      throw new BadRequestException("Member not found");
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { organizationId: null, lastActiveAt: new Date(0) },
    });
  }

  async listInvites(organizationId: string) {
    return this.prisma.invite.findMany({
      where: { organizationId, acceptedAt: null },
      orderBy: { createdAt: "desc" },
    });
  }

  async revokeInvite(organizationId: string, inviteId: string) {
    const invite = await this.prisma.invite.findUnique({
      where: { id: inviteId },
    });
    if (!invite || invite.organizationId !== organizationId) {
      throw new BadRequestException("Invite not found");
    }
    return this.prisma.invite.delete({ where: { id: inviteId } });
  }

  async listGroups(organizationId: string) {
    return this.prisma.teamGroup.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
      },
    });
  }

  async createGroup(organizationId: string, payload: CreateTeamGroupDto) {
    if (!payload.name?.trim()) {
      throw new BadRequestException("Group name required");
    }

    const validMembers = payload.memberIds?.length
      ? await this.prisma.user.findMany({
          where: { organizationId, id: { in: payload.memberIds } },
          select: { id: true },
        })
      : [];

    return this.prisma.teamGroup.create({
      data: {
        organizationId,
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        members: validMembers.length
          ? {
              create: validMembers.map((member) => ({ userId: member.id })),
            }
          : undefined,
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
      },
    });
  }

  async updateGroup(organizationId: string, groupId: string, payload: UpdateTeamGroupDto) {
    const existing = await this.prisma.teamGroup.findFirst({
      where: { id: groupId, organizationId },
      include: { members: true },
    });

    if (!existing) {
      throw new BadRequestException("Group not found");
    }

    const validMembers = payload.memberIds
      ? await this.prisma.user.findMany({
          where: { organizationId, id: { in: payload.memberIds } },
          select: { id: true },
        })
      : null;

    return this.prisma.teamGroup.update({
      where: { id: groupId },
      data: {
        ...(payload.name !== undefined ? { name: payload.name.trim() || existing.name } : {}),
        ...(payload.description !== undefined ? { description: payload.description.trim() || null } : {}),
        ...(validMembers
          ? {
              members: {
                deleteMany: {},
                create: validMembers.map((member) => ({ userId: member.id })),
              },
            }
          : {}),
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
      },
    });
  }

  async getRoutingAssignee(
    organizationId: string,
    groupId: string
  ): Promise<TeamRoutingAssignee | null> {
    const group = await this.prisma.teamGroup.findFirst({
      where: { id: groupId, organizationId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true, lastActiveAt: true },
            },
          },
        },
      },
    });

    if (!group || group.members.length === 0) {
      return null;
    }

    const sorted = [...group.members]
      .map((member) => member.user)
      .sort((a, b) => {
        const aTime = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
        const bTime = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
        return bTime - aTime;
      });

    return sorted[0] || null;
  }
}
