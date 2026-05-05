import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SyncWabaConfigDto, UpdateOrganizationDto, UpdateWabaConfigDto } from "./organization.dto";

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrganization(organizationId: string) {
    if (!organizationId) {
      throw new BadRequestException("Organization required");
    }
    return this.prisma.organization.findUnique({ where: { id: organizationId } });
  }

  async updateOrganization(organizationId: string, payload: UpdateOrganizationDto) {
    if (!organizationId) {
      throw new BadRequestException("Organization required");
    }
    return this.prisma.organization.update({
      where: { id: organizationId },
      data: payload,
    });
  }

  async getWabaConfig(organizationId: string) {
    if (!organizationId) {
      throw new BadRequestException("Organization required");
    }
    return this.prisma.wabaConfig.findUnique({ where: { organizationId } });
  }

  async getWabaWebhookProfile(organizationId: string, requestBaseUrl = "") {
    if (!organizationId) {
      throw new BadRequestException("Organization required");
    }
    const config = await this.getWabaConfig(organizationId);
    const isProduction = process.env.NODE_ENV === "production";
    const configuredBaseUrl = process.env.PUBLIC_WEBHOOK_BASE_URL || process.env.API_PUBLIC_URL || "";
    const requestUrl = this.isLocalUrl(requestBaseUrl) ? "" : requestBaseUrl;
    const configuredLocalTunnelUrl = isProduction ? "" : process.env.NGROK_URL || "";
    const detectedNgrokUrl = configuredBaseUrl || requestUrl || isProduction ? "" : await this.detectLocalNgrokUrl();
    const localFallbackUrl = isProduction ? "" : process.env.NEXT_PUBLIC_API_URL || "";
    const baseUrl = configuredBaseUrl || requestUrl || configuredLocalTunnelUrl || detectedNgrokUrl || localFallbackUrl || "";
    const normalizedBaseUrl = this.normalizeUrl(baseUrl);

    return {
      callbackUrl: normalizedBaseUrl ? `${normalizedBaseUrl}/webhooks/meta` : null,
      verifyToken: config?.webhookVerifyToken || process.env.META_WEBHOOK_VERIFY_TOKEN || null,
      isPublicUrlConfigured: Boolean(normalizedBaseUrl && !this.isLocalUrl(normalizedBaseUrl)),
      configuredBaseUrl: normalizedBaseUrl || null,
    };
  }

  async getWabaWebhookLogs(organizationId: string) {
    if (!organizationId) {
      throw new BadRequestException("Organization required");
    }
    return this.prisma.webhookEvent.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        eventType: true,
        status: true,
        externalId: true,
        createdAt: true,
        processedAt: true,
      },
    });
  }

  async upsertWabaConfig(organizationId: string, payload: UpdateWabaConfigDto) {
    if (!organizationId) {
      throw new BadRequestException("Organization required");
    }
    return this.prisma.wabaConfig.upsert({
      where: { organizationId },
      update: {
        accessToken: payload.accessToken,
        phoneNumberId: payload.phoneNumberId,
        wabaId: payload.wabaId,
        businessAccountId: payload.businessAccountId,
        webhookVerifyToken: payload.webhookVerifyToken,
      },
      create: {
        organizationId,
        accessToken: payload.accessToken,
        phoneNumberId: payload.phoneNumberId,
        wabaId: payload.wabaId,
        businessAccountId: payload.businessAccountId,
        webhookVerifyToken: payload.webhookVerifyToken,
      },
    });
  }

  async syncWabaConfig(organizationId: string, payload: SyncWabaConfigDto) {
    if (!organizationId) {
      throw new BadRequestException("Organization required");
    }
    if (!payload.accessToken?.trim()) {
      throw new BadRequestException("Access token required");
    }

    const graphBase = process.env.META_GRAPH_BASE || "https://graph.facebook.com/v19.0";
    const accessToken = payload.accessToken.trim();
    const businesses = payload.businessAccountId
      ? [{ id: payload.businessAccountId, name: "Selected business" }]
      : await this.fetchMetaList(`${graphBase}/me/businesses?fields=id,name&access_token=${encodeURIComponent(accessToken)}`);

    const candidates: Array<{
      businessAccountId: string;
      businessName?: string | null;
      wabaId: string;
      wabaName?: string | null;
      status?: string | null;
      phone: {
        id: string;
        display_phone_number?: string | null;
        verified_name?: string | null;
        quality_rating?: string | null;
      };
    }> = [];

    for (const business of businesses) {
      const accountCollections = await Promise.all([
        this.fetchMetaList(
          `${graphBase}/${business.id}/owned_whatsapp_business_accounts?fields=id,name,account_review_status,phone_numbers{id,display_phone_number,verified_name,quality_rating}&access_token=${encodeURIComponent(accessToken)}`,
          true
        ),
        this.fetchMetaList(
          `${graphBase}/${business.id}/client_whatsapp_business_accounts?fields=id,name,account_review_status,phone_numbers{id,display_phone_number,verified_name,quality_rating}&access_token=${encodeURIComponent(accessToken)}`,
          true
        ),
      ]);

      for (const account of accountCollections.flat()) {
        const phoneNumbers = account?.phone_numbers?.data || [];
        for (const phone of phoneNumbers) {
          candidates.push({
            businessAccountId: business.id,
            businessName: business.name,
            wabaId: account.id,
            wabaName: account.name,
            status: account.account_review_status || "CONNECTED",
            phone,
          });
        }
      }
    }

    const selected = candidates.find((candidate) => {
      const wabaMatches = !payload.wabaId || candidate.wabaId === payload.wabaId;
      const phoneMatches = !payload.phoneNumberId || candidate.phone.id === payload.phoneNumberId;
      return wabaMatches && phoneMatches;
    });

    if (!selected) {
      throw new BadRequestException({
        message: "No WhatsApp Business Account phone numbers found for this token. Check token permissions and business access.",
        code: "WABA_SYNC_NOT_FOUND",
      });
    }

    return this.prisma.wabaConfig.upsert({
      where: { organizationId },
      update: {
        accessToken,
        phoneNumberId: selected.phone.id,
        wabaId: selected.wabaId,
        businessAccountId: selected.businessAccountId,
        webhookVerifyToken: payload.webhookVerifyToken,
        displayNumber: selected.phone.display_phone_number || null,
        businessName: selected.phone.verified_name || selected.wabaName || selected.businessName || null,
        qualityRating: selected.phone.quality_rating || null,
        status: selected.status || "CONNECTED",
      },
      create: {
        organizationId,
        accessToken,
        phoneNumberId: selected.phone.id,
        wabaId: selected.wabaId,
        businessAccountId: selected.businessAccountId,
        webhookVerifyToken: payload.webhookVerifyToken,
        displayNumber: selected.phone.display_phone_number || null,
        businessName: selected.phone.verified_name || selected.wabaName || selected.businessName || null,
        qualityRating: selected.phone.quality_rating || null,
        status: selected.status || "CONNECTED",
      },
    });
  }

  async verifyWabaConfig(organizationId: string) {
    const config = await this.getWabaConfig(organizationId);
    if (!config) {
      throw new BadRequestException("WABA config missing");
    }

    const graphBase = process.env.META_GRAPH_BASE || "https://graph.facebook.com/v19.0";
    const phoneRes = await fetch(
      `${graphBase}/${config.phoneNumberId}?access_token=${config.accessToken}`
    );
    if (!phoneRes.ok) {
      const text = await phoneRes.text();
      throw new BadRequestException({
        message: `WABA verification failed: ${text}`,
        code: "WABA_VERIFICATION_FAILED",
      });
    }
    const phoneJson: any = await phoneRes.json();

    const wabaRes = await fetch(
      `${graphBase}/${config.wabaId}?access_token=${config.accessToken}`
    );
    if (!wabaRes.ok) {
      const text = await wabaRes.text();
      throw new BadRequestException({
        message: `WABA verification failed: ${text}`,
        code: "WABA_VERIFICATION_FAILED",
      });
    }
    const wabaJson: any = await wabaRes.json();

    const subscribeRes = await fetch(
      `${graphBase}/${config.wabaId}/subscribed_apps?access_token=${config.accessToken}`,
      { method: "POST" }
    );
    if (!subscribeRes.ok) {
      const text = await subscribeRes.text();
      throw new BadRequestException({
        message: `WABA webhook subscription failed: ${text}`,
        code: "WABA_WEBHOOK_SUBSCRIBE_FAILED",
      });
    }

    await this.prisma.wabaConfig.update({
      where: { organizationId },
      data: {
        displayNumber: phoneJson?.display_phone_number || null,
        businessName: phoneJson?.verified_name || null,
        qualityRating: phoneJson?.quality_rating || null,
        status: wabaJson?.account_status || "CONNECTED",
        verifiedAt: new Date(),
      },
    });

    return {
      ok: true,
      displayNumber: phoneJson?.display_phone_number || null,
      businessName: phoneJson?.verified_name || null,
      qualityRating: phoneJson?.quality_rating || null,
      status: wabaJson?.account_status || "CONNECTED",
      verifiedAt: new Date().toISOString(),
    };
  }

  private async fetchMetaList(url: string, optional = false) {
    const res = await fetch(url);
    if (!res.ok) {
      if (optional) return [];
      const text = await res.text();
      throw new BadRequestException({
        message: `WhatsApp profile fetch failed: ${text}`,
        code: "WABA_SYNC_FAILED",
      });
    }
    const json: any = await res.json();
    return Array.isArray(json?.data) ? json.data : [];
  }

  private async detectLocalNgrokUrl() {
    try {
      const res = await fetch("http://127.0.0.1:4040/api/tunnels");
      if (!res.ok) return "";
      const json: any = await res.json();
      const tunnel = json?.tunnels?.find((item: any) => typeof item?.public_url === "string" && item.public_url.startsWith("https://"));
      return tunnel?.public_url || "";
    } catch {
      return "";
    }
  }

  private normalizeUrl(url: string) {
    return url.trim().replace(/\/$/, "");
  }

  private isLocalUrl(url: string) {
    return /(^$|localhost|127\.0\.0\.1|0\.0\.0\.0|\.local)(:\d+)?/i.test(url);
  }
}
