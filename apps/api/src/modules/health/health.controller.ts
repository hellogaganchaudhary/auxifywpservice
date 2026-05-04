import { Controller, Get } from "@nestjs/common";
import * as Sentry from "@sentry/nestjs";

@Controller("health")
export class HealthController {
  @Get()
  getHealth() {
    return { status: "ok" };
  }

  @Get("error")
  triggerError() {
    Sentry.captureException(new Error("Test Sentry error"));
    return { ok: false };
  }
}
