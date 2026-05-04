import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { BroadcastsService } from "./broadcasts.service";
import { CreateBroadcastDto } from "./broadcasts.dto";

@Controller("broadcasts")
@UseGuards(JwtAuthGuard, RolesGuard)
export class BroadcastsController {
  constructor(private readonly broadcastsService: BroadcastsService) {}

  @Get()
  async list(@Req() req: any, @Query("status") status?: string) {
    return this.broadcastsService.list(req.user.organizationId, status);
  }

  @Post()
  @Roles("ADMIN", "MANAGER")
  async create(@Req() req: any, @Body() body: CreateBroadcastDto) {
    return this.broadcastsService.create(req.user, body);
  }

  @Get(":id")
  async get(@Req() req: any, @Param("id") id: string) {
    return this.broadcastsService.get(req.user.organizationId, id);
  }

  @Post(":id/send")
  @Roles("ADMIN", "MANAGER")
  async send(@Req() req: any, @Param("id") id: string) {
    return this.broadcastsService.sendNow(req.user.organizationId, id);
  }

  @Post(":id/schedule")
  @Roles("ADMIN", "MANAGER")
  async schedule(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: { scheduledAt: string }
  ) {
    return this.broadcastsService.schedule(req.user.organizationId, id, body);
  }

  @Delete(":id")
  @Roles("ADMIN", "MANAGER")
  async cancel(@Req() req: any, @Param("id") id: string) {
    return this.broadcastsService.cancel(req.user.organizationId, id);
  }

  @Get(":id/analytics")
  async analytics(@Req() req: any, @Param("id") id: string) {
    return this.broadcastsService.analytics(req.user.organizationId, id);
  }
}
