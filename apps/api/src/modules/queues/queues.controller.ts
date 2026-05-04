import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/roles.decorator";

@Controller("queues")
@UseGuards(JwtAuthGuard, RolesGuard)
export class QueuesController {
  @Get("health")
  @Roles("ADMIN")
  health() {
    return { ok: true };
  }
}
