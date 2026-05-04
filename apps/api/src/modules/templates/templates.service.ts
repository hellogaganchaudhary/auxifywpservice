import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "../auth/types/auth.types";

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, status?: string) {
    return this.prisma.template.findMany({
      where: {
        organizationId,
        status: status ? status : undefined,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(user: AuthUser, payload: any) {
    const organizationId = user.organizationId;
    const createdBy = (user as any).id || (user as any).userId || (user as any).sub;
    if (!organizationId || !createdBy) {
      throw new BadRequestException("Organization required");
    }
    return this.prisma.template.create({
      data: {
        organizationId,
        name: payload.name,
        category: payload.category,
        language: payload.language || "en",
        status: "PENDING",
        body: payload.body,
        header: payload.header || null,
        footer: payload.footer || null,
        buttons: payload.buttons || [],
        analytics: {
          usageCount: 0,
          deliveryRate: 0,
          readRate: 0,
          failureRate: 0,
        },
        createdBy,
      },
    });
  }

  async get(organizationId: string, id: string) {
    const template = await this.prisma.template.findFirst({
      where: { id, organizationId },
    });
    if (!template) {
      throw new BadRequestException("Template not found");
    }
    return template;
  }

  async submitToMeta(organizationId: string, id: string) {
    const template = await this.get(organizationId, id);
    const wabaConfig = await this.prisma.wabaConfig.findUnique({ where: { organizationId } });
    if (!wabaConfig?.accessToken || !wabaConfig?.wabaId) {
      throw new BadRequestException("WhatsApp credentials not configured");
    }
    const graphBase = process.env.META_GRAPH_BASE || "https://graph.facebook.com/v19.0";
    const res = await fetch(`${graphBase}/${wabaConfig.wabaId}/message_templates`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${wabaConfig.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: template.name,
        category: template.category,
        language: template.language,
        components: this.buildMetaTemplateComponents(template),
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new BadRequestException(`Template submit failed: ${text}`);
    }
    const json: any = await res.json();

    return this.prisma.template.update({
      where: { id: template.id },
      data: {
        status: "SUBMITTED",
        metaTemplateId: json?.id || template.metaTemplateId,
        qualityScore: template.qualityScore ?? "PENDING_REVIEW",
      },
    });
  }

  async syncStatus(organizationId: string, id: string) {
    const template = await this.get(organizationId, id);
    const wabaConfig = await this.prisma.wabaConfig.findUnique({ where: { organizationId } });
    if (!wabaConfig?.accessToken || !wabaConfig?.wabaId) {
      throw new BadRequestException("WhatsApp credentials not configured");
    }

    const graphBase = process.env.META_GRAPH_BASE || "https://graph.facebook.com/v19.0";
    const params = new URLSearchParams({
      fields: "id,name,status,category,language,quality_score,rejected_reason",
      name: template.name,
      access_token: wabaConfig.accessToken,
    });
    const res = await fetch(`${graphBase}/${wabaConfig.wabaId}/message_templates?${params.toString()}`);
    if (!res.ok) {
      const text = await res.text();
      throw new BadRequestException(`Template status sync failed: ${text}`);
    }
    const json: any = await res.json();
    const metaTemplate = Array.isArray(json?.data) ? json.data.find((item: any) => item.name === template.name) || json.data[0] : null;
    const nextStatus = metaTemplate?.status || template.status;

    return this.prisma.template.update({
      where: { id: template.id },
      data: {
        status: nextStatus,
        metaTemplateId: metaTemplate?.id || template.metaTemplateId,
        qualityScore: metaTemplate?.quality_score?.score || template.qualityScore,
        rejectionReason: metaTemplate?.rejected_reason && metaTemplate.rejected_reason !== "NONE" ? metaTemplate.rejected_reason : null,
      },
    });
  }

  async syncAllFromMeta(user: AuthUser) {
    const organizationId = user.organizationId;
    const syncedBy = (user as any).id || (user as any).userId || (user as any).sub;
    if (!organizationId || !syncedBy) {
      throw new BadRequestException("Organization required");
    }

    const wabaConfig = await this.prisma.wabaConfig.findUnique({ where: { organizationId } });
    if (!wabaConfig?.accessToken || !wabaConfig?.wabaId) {
      throw new BadRequestException("WhatsApp credentials not configured");
    }

    const graphBase = process.env.META_GRAPH_BASE || "https://graph.facebook.com/v19.0";
    const fields = "id,name,status,category,language,quality_score,rejected_reason,components";
    let nextUrl: string | null = `${graphBase}/${wabaConfig.wabaId}/message_templates?${new URLSearchParams({
      fields,
      limit: "100",
      access_token: wabaConfig.accessToken,
    }).toString()}`;
    const metaTemplates: any[] = [];

    while (nextUrl) {
      const res = await fetch(nextUrl);
      if (!res.ok) {
        const text = await res.text();
        throw new BadRequestException(`Meta template fetch failed: ${text}`);
      }
      const json: any = await res.json();
      if (Array.isArray(json?.data)) {
        metaTemplates.push(...json.data);
      }
      nextUrl = json?.paging?.next || null;
    }

    const existingTemplates = await this.prisma.template.findMany({ where: { organizationId } });
    const existingByMetaId = new Map(existingTemplates.filter((template) => template.metaTemplateId).map((template) => [template.metaTemplateId, template]));
    const existingByNameLanguage = new Map(existingTemplates.map((template) => [`${template.name}:${template.language}`, template]));
    const synced = [];

    for (const metaTemplate of metaTemplates) {
      const parsed = this.parseMetaTemplate(metaTemplate);
      const existing = existingByMetaId.get(metaTemplate.id) || existingByNameLanguage.get(`${metaTemplate.name}:${metaTemplate.language}`);
      const data = {
        name: metaTemplate.name,
        category: metaTemplate.category || "MARKETING",
        language: metaTemplate.language || "en",
        status: metaTemplate.status || "UNKNOWN",
        body: parsed.body || "",
        header: parsed.header,
        footer: parsed.footer,
        buttons: parsed.buttons,
        metaTemplateId: metaTemplate.id,
        qualityScore: metaTemplate?.quality_score?.score || metaTemplate?.quality_score || null,
        rejectionReason: metaTemplate?.rejected_reason && metaTemplate.rejected_reason !== "NONE" ? metaTemplate.rejected_reason : null,
        analytics: existing?.analytics || {
          usageCount: 0,
          deliveryRate: 0,
          readRate: 0,
          failureRate: 0,
        },
      };

      const template = existing
        ? await this.prisma.template.update({ where: { id: existing.id }, data })
        : await this.prisma.template.create({
            data: {
              organizationId,
              ...data,
              createdBy: syncedBy,
            },
          });
      synced.push(template);
    }

    return { count: synced.length, templates: synced };
  }

  private parseMetaTemplate(metaTemplate: any) {
    const components = Array.isArray(metaTemplate?.components) ? metaTemplate.components : [];
    const header = components.find((component: any) => component.type === "HEADER")?.text || null;
    const body = components.find((component: any) => component.type === "BODY")?.text || "";
    const footer = components.find((component: any) => component.type === "FOOTER")?.text || null;
    const buttonsComponent = components.find((component: any) => component.type === "BUTTONS");
    const buttons = Array.isArray(buttonsComponent?.buttons)
      ? buttonsComponent.buttons.map((button: any) => ({
          type: button.type || "QUICK_REPLY",
          text: button.text || button.title || "Button",
          url: button.url,
          phone_number: button.phone_number,
        }))
      : [];
    return { header, body, footer, buttons };
  }

  private buildMetaTemplateComponents(template: any) {
    const components: any[] = [];
    if (template.header) {
      components.push({ type: "HEADER", format: "TEXT", text: template.header });
    }
    components.push({ type: "BODY", text: template.body });
    if (template.footer) {
      components.push({ type: "FOOTER", text: template.footer });
    }
    if (Array.isArray(template.buttons) && template.buttons.length) {
      components.push({
        type: "BUTTONS",
        buttons: template.buttons.map((button: any) => ({
          type: button.type || "QUICK_REPLY",
          text: button.text,
        })),
      });
    }
    return components;
  }

  async analytics(organizationId: string) {
    const templates = await this.prisma.template.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });

    return templates.map((template) => ({
      id: template.id,
      name: template.name,
      status: template.status,
      qualityScore: template.qualityScore ?? "UNKNOWN",
      rejectionReason: template.rejectionReason,
      usageCount: Number((template.analytics as any)?.usageCount ?? 0),
      deliveryRate: Number((template.analytics as any)?.deliveryRate ?? 0),
      readRate: Number((template.analytics as any)?.readRate ?? 0),
      failureRate: Number((template.analytics as any)?.failureRate ?? 0),
    }));
  }
}
