export type CreateContactDto = {
  name: string;
  phone: string;
  email?: string | null;
  tags?: string[];
  segments?: string[];
  customFields?: Record<string, unknown>;
};

export type UpdateContactDto = Partial<CreateContactDto>;
