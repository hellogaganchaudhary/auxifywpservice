import { Worker } from "bullmq";
import Redis from "ioredis";
import { EmailService } from "../email.service";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
const emailService = new EmailService();

new Worker(
  "email-queue",
  async (job) => {
    if (job.name === "send-invite") {
      const { to, inviteUrl } = job.data;
      await emailService.sendInviteEmail(to, inviteUrl);
    }
    if (job.name === "send-reset") {
      const { to, resetUrl } = job.data;
      await emailService.sendResetEmail(to, resetUrl);
    }
  },
  { connection }
);
