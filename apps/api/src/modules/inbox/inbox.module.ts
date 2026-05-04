import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { TeamModule } from "../team/team.module";
import { InboxController } from "./inbox.controller";
import { InboxGateway } from "./inbox.gateway";
import { InboxService } from "./inbox.service";

@Module({
  imports: [AuthModule, TeamModule],
  controllers: [InboxController],
  providers: [InboxService, InboxGateway],
  exports: [InboxGateway],
})
export class InboxModule {}
