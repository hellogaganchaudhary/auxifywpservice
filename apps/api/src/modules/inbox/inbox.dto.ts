export type InboxConversationQuery = {
  search?: string;
  status?: string;
  assignedTo?: string;
  label?: string;
  limit?: number;
};

export type SendMessageDto = {
  content: string;
  mediaType?: "text" | "image" | "video" | "audio" | "document";
  attachments?: Array<{
    url: string;
    mimeType: string;
    fileName: string;
  }>;
};

export type CreateConversationDto = {
  phone: string;
  name?: string;
  email?: string;
};

export type UpdateConversationContactDto = {
  name?: string;
  email?: string | null;
  tags?: string[];
  segments?: string[];
  customFields?: Record<string, unknown>;
};

export type UpdateConversationDto = {
  status?: string;
  assignedToId?: string | null;
  teamGroupId?: string | null;
};

export type AddConversationLabelDto = {
  name: string;
  color?: string;
};

export type AddConversationNoteDto = {
  body: string;
};
