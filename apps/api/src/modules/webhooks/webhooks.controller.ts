import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { WebhooksService } from "./webhooks.service";

@Controller("webhooks/meta")
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get()
  async verify(@Query() query: Record<string, string | undefined>, @Res() res: Response) {
    const challenge = await this.webhooksService.verify(query);
    return res.status(200).send(challenge);
  }

  @Post()
  async receive(
    @Body() body: any,
    @Headers("x-hub-signature-256") signature: string | undefined,
    @Req() req: Request
  ) {
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    if (rawBody && !this.webhooksService.verifySignature(signature, rawBody)) {
      throw new BadRequestException("Invalid webhook signature");
    }
    return this.webhooksService.receive(body);
  }
}
