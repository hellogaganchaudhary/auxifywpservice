import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { SuperAdminModule } from "./super-admin/super-admin.module";
import { TeamModule } from "./team/team.module";
import { BroadcastsModule } from "./broadcasts/broadcasts.module";
import { TemplatesModule } from "./templates/templates.module";
import { OrganizationModule } from "./organization/organization.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { ContactsModule } from "./contacts/contacts.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { QueuesModule } from "./queues/queues.module";
import { EmailModule } from "./email/email.module";
import { BillingModule } from "./billing/billing.module";
import { InboxModule } from "./inbox/inbox.module";
import { SettingsModule } from "./settings/settings.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { MediaModule } from "./media/media.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    HealthModule,
    SuperAdminModule,
    TeamModule,
    BroadcastsModule,
    TemplatesModule,
    OrganizationModule,
    DashboardModule,
    ContactsModule,
    AnalyticsModule,
    QueuesModule,
    EmailModule,
    BillingModule,
    InboxModule,
    SettingsModule,
    WebhooksModule,
    MediaModule,
  ],
})
export class AppModule {}
