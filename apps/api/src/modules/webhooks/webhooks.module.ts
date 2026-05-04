import { Module } from "@nestjs/common";
import { InboxModule } from "../inbox/inbox.module";
import { TeamModule } from "../team/team.module";
import { WebhooksController } from "./webhooks.controller";
import { WebhooksService } from "./webhooks.service";

@Module({
  imports: [InboxModule, TeamModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
