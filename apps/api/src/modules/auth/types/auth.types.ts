import { UserRole } from "@prisma/client";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  profileInfo: string | null;
  role: UserRole;
  organizationId: string | null;
};
