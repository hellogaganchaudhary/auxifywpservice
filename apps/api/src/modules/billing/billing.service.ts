import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  AutoRechargeDto,
  ConfirmCheckoutDto,
  CreateCheckoutSessionDto,
  CreditPackDto,
} from "./billing.dto";
import Stripe from "stripe";

@Injectable()
export class BillingService {
  private readonly stripe = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY)
    : null;

  constructor(private readonly prisma: PrismaService) {}

  async getWallet(organizationId: string) {
    if (!organizationId) {
      throw new BadRequestException("Organization required");
    }
    return this.prisma.wallet.upsert({
      where: { organizationId },
      update: {},
      create: {
        organizationId,
        balance: 0,
        currency: "USD",
        autoRechargeEnabled: false,
        autoRechargeThreshold: 0,
        autoRechargeAmount: 0,
      },
    });
  }

  async updateAutoRecharge(organizationId: string, payload: AutoRechargeDto) {
    if (!organizationId) {
      throw new BadRequestException("Organization required");
    }
    return this.prisma.wallet.upsert({
      where: { organizationId },
      update: {
        autoRechargeEnabled: payload.enabled,
        autoRechargeThreshold: payload.threshold,
        autoRechargeAmount: payload.amount,
        currency: payload.currency || "USD",
      },
      create: {
        organizationId,
        balance: 0,
        currency: payload.currency || "USD",
        autoRechargeEnabled: payload.enabled,
        autoRechargeThreshold: payload.threshold,
        autoRechargeAmount: payload.amount,
      },
    });
  }

  async listTransactions(organizationId: string, limit = 50) {
    if (!organizationId) {
      throw new BadRequestException("Organization required");
    }
    return this.prisma.walletTransaction.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async listCreditPacks() {
    return this.prisma.creditPack.findMany({
      orderBy: { credits: "asc" },
    });
  }

  async upsertCreditPack(id: string | null, payload: CreditPackDto) {
    if (!payload.name || !payload.credits || !payload.price) {
      throw new BadRequestException("Invalid pack payload");
    }
    if (id) {
      return this.prisma.creditPack.update({
        where: { id },
        data: {
          name: payload.name,
          credits: payload.credits,
          price: payload.price,
          currency: payload.currency || "USD",
        },
      });
    }
    return this.prisma.creditPack.create({
      data: {
        name: payload.name,
        credits: payload.credits,
        price: payload.price,
        currency: payload.currency || "USD",
      },
    });
  }

  async createCheckoutSession(
    organizationId: string,
    payload: CreateCheckoutSessionDto
  ) {
    if (!organizationId) {
      throw new BadRequestException("Organization required");
    }

    const pack = await this.prisma.creditPack.findUnique({ where: { id: payload.packId } });
    if (!pack) {
      throw new BadRequestException("Credit pack not found");
    }

    if (!this.stripe) {
      return {
        provider: "manual",
        sessionId: `manual_${pack.id}`,
        checkoutUrl: `${process.env.APP_URL || "http://localhost:3000"}/settings/billing?session_id=manual_${pack.id}&pack_id=${pack.id}`,
      };
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${process.env.APP_URL || "http://localhost:3000"}/settings/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || "http://localhost:3000"}/settings/billing?cancelled=1`,
      metadata: {
        organizationId,
        packId: pack.id,
        credits: String(pack.credits),
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: (pack.currency || "USD").toLowerCase(),
            unit_amount: pack.price,
            product_data: {
              name: pack.name,
              description: `${pack.credits} credits`,
            },
          },
        },
      ],
    });

    return {
      provider: "stripe",
      sessionId: session.id,
      checkoutUrl: session.url,
    };
  }

  async confirmCheckout(organizationId: string, payload: ConfirmCheckoutDto) {
    if (!organizationId) {
      throw new BadRequestException("Organization required");
    }

    if (payload.sessionId.startsWith("manual_")) {
      const packId = payload.sessionId.replace("manual_", "");
      const pack = await this.prisma.creditPack.findUnique({ where: { id: packId } });
      if (!pack) {
        throw new BadRequestException("Credit pack not found");
      }
      return this.creditWallet(organizationId, pack, payload.sessionId, "manual");
    }

    if (!this.stripe) {
      throw new BadRequestException("Stripe is not configured");
    }

    const session = await this.stripe.checkout.sessions.retrieve(payload.sessionId);
    if (session.payment_status !== "paid") {
      throw new BadRequestException("Payment not completed");
    }

    const packId = session.metadata?.packId;
    if (!packId) {
      throw new BadRequestException("Missing pack metadata");
    }

    const pack = await this.prisma.creditPack.findUnique({ where: { id: packId } });
    if (!pack) {
      throw new BadRequestException("Credit pack not found");
    }

    return this.creditWallet(organizationId, pack, session.id, "stripe");
  }

  private async creditWallet(
    organizationId: string,
    pack: { id: string; credits: number; price: number; currency: string; name: string },
    reference: string,
    provider: string
  ) {
    const existing = await this.prisma.walletTransaction.findFirst({
      where: {
        organizationId,
        reference,
        type: "credit_pack_purchase",
      },
    });

    if (existing) {
      return this.getWallet(organizationId);
    }

    const wallet = await this.getWallet(organizationId);
    const updatedWallet = await this.prisma.wallet.update({
      where: { organizationId },
      data: { balance: wallet.balance + pack.credits },
    });

    await this.prisma.walletTransaction.create({
      data: {
        organizationId,
        type: "credit_pack_purchase",
        amount: pack.credits,
        balanceAfter: updatedWallet.balance,
        currency: pack.currency || "USD",
        reference,
        metadata: {
          provider,
          packId: pack.id,
          packName: pack.name,
          packPrice: pack.price,
        },
      },
    });

    return updatedWallet;
  }
}
