export type CreateBroadcastDto = {
  name: string;
  templateId: string;
  templateVariables?: Record<string, string>;
  audience: Record<string, unknown>;
  scheduledAt?: string | null;
};
