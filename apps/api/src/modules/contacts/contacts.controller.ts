import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { ContactsService } from "./contacts.service";
import { CreateContactDto, UpdateContactDto } from "./contacts.dto";

@Controller("contacts")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  async list(@Req() req: any, @Query("q") q?: string) {
    return this.contactsService.list(req.user.organizationId, q);
  }

  @Get("metadata")
  async metadata(@Req() req: any) {
    return this.contactsService.metadata(req.user.organizationId);
  }

  @Post()
  async create(@Req() req: any, @Body() body: CreateContactDto) {
    return this.contactsService.create(req.user.organizationId, body);
  }

  @Get(":id")
  async get(@Req() req: any, @Param("id") id: string) {
    return this.contactsService.get(req.user.organizationId, id);
  }

  @Patch(":id")
  async update(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: UpdateContactDto
  ) {
    return this.contactsService.update(req.user.organizationId, id, body);
  }

  @Delete(":id")
  async remove(@Req() req: any, @Param("id") id: string) {
    return this.contactsService.remove(req.user.organizationId, id);
  }

  @Post("import-csv")
  @UseInterceptors(FileInterceptor("file"))
  async importCsv(@Req() req: any, @UploadedFile() file?: Express.Multer.File) {
    return this.contactsService.importCsv(req.user.organizationId, file);
  }

  @Post("import-csv/preview")
  @UseInterceptors(FileInterceptor("file"))
  async previewCsv(@UploadedFile() file?: Express.Multer.File) {
    return this.contactsService.previewCsv(file);
  }

  @Post("import-csv/mapped")
  @UseInterceptors(FileInterceptor("file"))
  async importCsvMapped(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: { mapping?: string | Record<string, string> }
  ) {
    const mapping =
      typeof body.mapping === "string" ? JSON.parse(body.mapping) : body.mapping || {};
    return this.contactsService.importCsvWithMapping(req.user.organizationId, mapping, file);
  }

  @Post("segments")
  async createSegment(@Req() req: any, @Body() body: { name: string; color?: string }) {
    return this.contactsService.createSegment(req.user.organizationId, body);
  }

  @Post("custom-fields")
  async createCustomField(
    @Req() req: any,
    @Body() body: { key: string; label: string; type: string; options?: unknown }
  ) {
    return this.contactsService.createCustomField(req.user.organizationId, body);
  }

  @Post("bulk-update")
  async bulkUpdate(
    @Req() req: any,
    @Body() body: { contactIds: string[]; tags?: string[]; segments?: string[] }
  ) {
    return this.contactsService.bulkUpdate(req.user.organizationId, body);
  }

  @Get(":id/conversations")
  async conversations(@Req() req: any, @Param("id") id: string) {
    return this.contactsService.conversations(req.user.organizationId, id);
  }
}
