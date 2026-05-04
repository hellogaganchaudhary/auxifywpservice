import { UserRole } from "@prisma/client";

export type InviteMemberDto = {
  email: string;
  role: UserRole;
};

export type UpdateMemberRoleDto = {
  role: UserRole;
};

export type CreateTeamGroupDto = {
  name: string;
  description?: string;
  memberIds?: string[];
};

export type UpdateTeamGroupDto = {
  name?: string;
  description?: string;
  memberIds?: string[];
};

export type TeamRoutingAssignee = {
  id: string;
  name: string;
  email: string;
  role: string;
  lastActiveAt?: Date | null;
};
