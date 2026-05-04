import { Global, Module } from "@nestjs/common";
import { QueueService } from "./queues.service";
import { QueuesController } from "./queues.controller";

@Global()
@Module({
  controllers: [QueuesController],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueuesModule {}
