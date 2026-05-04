import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { json } from "express";
import express from "express";
import type { Request, Response } from "express";
import cookieParser from "cookie-parser";
import * as Sentry from "@sentry/nestjs";
import { ExpressAdapter } from "@bull-board/express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { AppModule } from "./modules/app.module";
import { QueueService } from "./modules/queues/queues.service";

async function bootstrap() {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || "development",
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
    });
  }
  const app = await NestFactory.create(AppModule);
  app.use(
    json({
      verify: (req: Request & { rawBody?: Buffer }, _res: Response, buffer: Buffer) => {
        req.rawBody = Buffer.from(buffer);
      },
    })
  );
  app.use(cookieParser());
  app.use("/uploads", express.static(process.env.MEDIA_UPLOAD_DIR || "uploads"));
  app.enableCors({ origin: true, credentials: true });

  const queueService = app.get(QueueService);
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/admin/queues");
  createBullBoard({
    queues: [
      new BullMQAdapter(queueService.emailQueue),
      new BullMQAdapter(queueService.broadcastQueue),
    ],
    serverAdapter,
  });
  app.use("/admin/queues", serverAdapter.getRouter());

  await app.listen(process.env.PORT ?? 4000);
}

void bootstrap();
