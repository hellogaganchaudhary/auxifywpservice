import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { BillingService } from "./billing.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/roles.decorator";
import {
  AutoRechargeDto,
  ConfirmCheckoutDto,
  CreateCheckoutSessionDto,
  CreditPackDto,
} from "./billing.dto";

@Controller("billing")
@UseGuards(JwtAuthGuard, RolesGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get("wallet")
  async wallet(@Req() req: any) {
    return this.billingService.getWallet(req.user.organizationId);
  }

  @Patch("wallet/auto-recharge")
  @Roles("ADMIN")
  async autoRecharge(@Req() req: any, @Body() body: AutoRechargeDto) {
    return this.billingService.updateAutoRecharge(req.user.organizationId, body);
  }

  @Get("transactions")
  async transactions(@Req() req: any, @Query("limit") limit = "50") {
    return this.billingService.listTransactions(req.user.organizationId, Number(limit));
  }

  @Get("credit-packs")
  @Roles("ADMIN", "SUPER_ADMIN")
  async creditPacks() {
    return this.billingService.listCreditPacks();
  }

  @Post("credit-packs")
  @Roles("SUPER_ADMIN")
  async createPack(@Body() body: CreditPackDto) {
    return this.billingService.upsertCreditPack(null, body);
  }

  @Post("checkout-session")
  @Roles("ADMIN")
  async createCheckoutSession(@Req() req: any, @Body() body: CreateCheckoutSessionDto) {
    return this.billingService.createCheckoutSession(req.user.organizationId, body);
  }

  @Post("checkout-confirm")
  @Roles("ADMIN")
  async confirmCheckout(@Req() req: any, @Body() body: ConfirmCheckoutDto) {
    return this.billingService.confirmCheckout(req.user.organizationId, body);
  }

  @Patch("credit-packs/:id")
  @Roles("SUPER_ADMIN")
  async updatePack(@Param("id") id: string, @Body() body: CreditPackDto) {
    return this.billingService.upsertCreditPack(id, body);
  }
}
