import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { InboxService } from "./inbox.service";
import {
  AddConversationLabelDto,
  AddConversationNoteDto,
  CreateConversationDto,
  InboxConversationQuery,
  SendMessageDto,
  UpdateConversationContactDto,
  UpdateConversationDto,
} from "./inbox.dto";

@Controller("inbox")
@UseGuards(JwtAuthGuard, RolesGuard)
export class InboxController {
  constructor(private readonly inboxService: InboxService) {}

  @Get("conversations")
  async list(@Req() req: any, @Query() query: InboxConversationQuery) {
    return this.inboxService.listConversations(req.user.organizationId, query);
  }

  @Post("conversations")
  @Roles("ADMIN", "MANAGER", "AGENT")
  async createConversation(@Req() req: any, @Body() body: CreateConversationDto) {
    return this.inboxService.createConversation(req.user.organizationId, body);
  }

  @Get("conversations/:id")
  async get(@Req() req: any, @Param("id") id: string) {
    return this.inboxService.getConversation(req.user.organizationId, id);
  }

  @Get("conversations/:id/messages")
  async messages(@Req() req: any, @Param("id") id: string) {
    return this.inboxService.listMessages(req.user.organizationId, id);
  }

  @Post("conversations/:id/messages")
  async send(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: SendMessageDto
  ) {
    return this.inboxService.sendMessage(req.user.organizationId, id, body);
  }

  @Patch("conversations/:id")
  async update(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: UpdateConversationDto
  ) {
    return this.inboxService.updateConversation(req.user.organizationId, id, body);
  }

  @Patch("conversations/:id/contact")
  @Roles("ADMIN", "MANAGER", "AGENT")
  async updateContact(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: UpdateConversationContactDto
  ) {
    return this.inboxService.updateConversationContact(req.user.organizationId, id, body);
  }

  @Post("conversations/:id/labels")
  async addLabel(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: AddConversationLabelDto
  ) {
    return this.inboxService.addLabel(req.user.organizationId, id, body);
  }

  @Post("conversations/:id/notes")
  async addNote(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: AddConversationNoteDto
  ) {
    return this.inboxService.addNote(req.user.organizationId, req.user.userId, id, body);
  }

  @Get("views")
  async listViews(@Req() req: any) {
    return this.inboxService.listViews(req.user.organizationId, req.user.userId);
  }

  @Post("views")
  @Roles("ADMIN", "MANAGER", "AGENT")
  async createView(
    @Req() req: any,
    @Body() body: { name: string; filters: { search?: string; status?: string; label?: string } }
  ) {
    return this.inboxService.createView(req.user.organizationId, req.user.userId, body);
  }

  @Patch("views/:id")
  @Roles("ADMIN", "MANAGER", "AGENT")
  async updateView(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: { name?: string; filters?: { search?: string; status?: string; label?: string; assignedTo?: string } }
  ) {
    return this.inboxService.updateView(req.user.organizationId, req.user.userId, id, body);
  }

  @Post("views/:id/delete")
  @Roles("ADMIN", "MANAGER", "AGENT")
  async deleteView(@Req() req: any, @Param("id") id: string) {
    return this.inboxService.deleteView(req.user.organizationId, req.user.userId, id);
  }
}
