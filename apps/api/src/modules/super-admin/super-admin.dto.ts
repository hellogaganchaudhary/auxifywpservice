export type CreateOrganizationDto = {
  name: string;
  slug?: string;
  plan?: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
};

export type CreateOrganizationAdminDto = {
  name: string;
  email: string;
  password: string;
  role?: "ADMIN" | "MANAGER";
};

export type UpdateOrganizationDto = {
  name?: string;
  slug?: string;
  plan?: string;
  isActive?: boolean;
};

export type ResendInviteDto = {
  email: string;
};
