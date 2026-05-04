import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";

@Injectable()
export class QueueService {
  private readonly connection: Redis;
  readonly emailQueue: Queue;
  readonly broadcastQueue: Queue;

  constructor() {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    this.connection = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
    });
    this.emailQueue = new Queue("email-queue", {
      connection: this.connection,
    });
    this.broadcastQueue = new Queue("broadcast-queue", {
      connection: this.connection,
    });
  }
}
