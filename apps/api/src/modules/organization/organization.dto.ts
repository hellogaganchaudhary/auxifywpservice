export type UpdateOrganizationDto = {
  name?: string;
  slug?: string;
  logoUrl?: string | null;
  timezone?: string | null;
  language?: string | null;
};

export type UpdateWabaConfigDto = {
  accessToken: string;
  phoneNumberId: string;
  wabaId: string;
  businessAccountId: string;
  webhookVerifyToken?: string;
};

export type SyncWabaConfigDto = {
  accessToken: string;
  businessAccountId?: string;
  wabaId?: string;
  phoneNumberId?: string;
  webhookVerifyToken?: string;
};
