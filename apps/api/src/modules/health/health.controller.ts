import { Controller, Get } from "@nestjs/common";
import * as Sentry from "@sentry/nestjs";

@Controller("health")
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: "ok",
      buildSha: process.env.BUILD_SHA ?? null,
      buildImage: process.env.BUILD_IMAGE ?? null,
      signupRouteExpected: true,
    };
  }

  @Get("error")
  triggerError() {
    Sentry.captureException(new Error("Test Sentry error"));
    return { ok: false };
  }
}
