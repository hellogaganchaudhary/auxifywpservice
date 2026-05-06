import { UserRole } from "@prisma/client";

export type LoginDto = {
  email: string;
  password: string;
};

export type SignupDto = {
  organizationName: string;
  adminName: string;
  email: string;
  password: string;
  plan: string;
};

export type InviteAcceptDto = {
  token: string;
  name: string;
  password: string;
};

export type InviteCreateDto = {
  email: string;
  role: UserRole;
  organizationId: string;
};
