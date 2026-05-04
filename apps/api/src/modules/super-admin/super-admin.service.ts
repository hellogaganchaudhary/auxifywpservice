import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "../auth/auth.service";
import {
  CreateOrganizationDto,
  CreateOrganizationAdminDto,
  ResendInviteDto,
  UpdateOrganizationDto,
} from "./super-admin.dto";

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService
  ) {}

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [orgs, activeUsers, messagesToday, transactions] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.user.count({
        where: { lastActiveAt: { not: null } },
      }),
      this.prisma.message.count({
        where: { createdAt: { gte: today } },
      }),
      this.prisma.walletTransaction.findMany(),
    ]);

    const mrr = transactions
      .filter((transaction) => transaction.type === "credit_purchase" && transaction.amount > 0)
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    return {
      totalOrganizations: orgs,
      activeUsers,
      messagesToday,
      mrr,
    };
  }

  async listOrganizations({
    q,
    page,
    pageSize,
  }: {
    q?: string;
    page: number;
    pageSize: number;
  }) {
    const where: Prisma.OrganizationWhereInput = q
      ? {
          OR: [
            { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
            { slug: { contains: q, mode: Prisma.QueryMode.insensitive } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        take: pageSize,
        skip: (page - 1) * pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { users: true } },
          wabaConfig: {
            select: {
              status: true,
              verifiedAt: true,
            },
          },
          wallet: {
            select: {
              balance: true,
              currency: true,
            },
          },
        },
      }),
      this.prisma.organization.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async createOrganization(payload: CreateOrganizationDto) {
    const slug = this.slugify(payload.slug || payload.name);
    const existing = await this.prisma.organization.findUnique({
      where: { slug },
    });
    if (existing) {
      throw new BadRequestException("Slug already exists");
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: payload.adminEmail },
    });
    if (existingUser) {
      throw new BadRequestException("Admin email already exists");
    }

    const org = await this.prisma.organization.create({
      data: {
        name: payload.name,
        slug,
        plan: payload.plan || "starter",
        isActive: true,
        wallet: {
          create: {
            balance: 0,
            currency: "USD",
            autoRechargeEnabled: false,
            autoRechargeThreshold: 0,
            autoRechargeAmount: 0,
          },
        },
      },
    });

    const passwordHash = await bcrypt.hash(payload.adminPassword, 10);
    const adminUser = await this.prisma.user.create({
      data: {
        name: payload.adminName,
        email: payload.adminEmail,
        passwordHash,
        role: UserRole.ADMIN,
        organizationId: org.id,
        invitedBy: "super_admin",
        acceptedInviteAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
        createdAt: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: org.id,
        actorId: "super_admin",
        action: "org.created",
        resourceType: "Organization",
        resourceId: org.id,
        metadata: {
          name: org.name,
          slug: org.slug,
          adminId: adminUser.id,
          adminEmail: adminUser.email,
        },
      },
    });

    return { org, adminUser };
  }

  async createOrganizationAdmin(id: string, payload: CreateOrganizationAdminDto) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      select: { id: true, isActive: true, name: true },
    });
    if (!org) {
      throw new BadRequestException("Organization not found");
    }
    if (!org.isActive) {
      throw new BadRequestException("Cannot add admin to an inactive organization");
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: payload.email },
    });
    if (existingUser) {
      throw new BadRequestException("User with this email already exists");
    }

    const normalizedRole = payload.role === "MANAGER" ? UserRole.MANAGER : UserRole.ADMIN;
    const passwordHash = await bcrypt.hash(payload.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        passwordHash,
        role: normalizedRole,
        organizationId: org.id,
        invitedBy: "super_admin",
        acceptedInviteAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
        createdAt: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: org.id,
        actorId: "super_admin",
        action: "org.admin.created",
        resourceType: "User",
        resourceId: user.id,
        metadata: {
          email: user.email,
          role: user.role,
          organizationName: org.name,
        },
      },
    });

    return user;
  }

  async getOrganization(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            lastActiveAt: true,
          },
        },
        invites: true,
        broadcasts: {
          select: {
            id: true,
            name: true,
            status: true,
            scheduledAt: true,
            sentAt: true,
            stats: true,
          },
        },
        wabaConfig: true,
        wallet: true,
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });
    if (!org) {
      throw new BadRequestException("Organization not found");
    }
    const auditLog = await this.prisma.auditLog.findMany({
      where: { organizationId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return { org, auditLog };
  }

  async updateOrganization(id: string, payload: UpdateOrganizationDto) {
    if (payload.slug) {
      const slug = this.slugify(payload.slug);
      const existing = await this.prisma.organization.findUnique({
        where: { slug },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException("Slug already exists");
      }
    }
    const updated = await this.prisma.organization.update({
      where: { id },
      data: {
        name: payload.name,
        slug: payload.slug ? this.slugify(payload.slug) : undefined,
        plan: payload.plan,
        isActive: payload.isActive,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        organizationId: id,
        actorId: "super_admin",
        action: "org.updated",
        resourceType: "Organization",
        resourceId: id,
        metadata: payload,
      },
    });
    return updated;
  }

  async deactivateOrganization(id: string) {
    const updated = await this.prisma.organization.update({
      where: { id },
      data: { isActive: false },
    });
    await this.prisma.auditLog.create({
      data: {
        organizationId: id,
        actorId: "super_admin",
        action: "org.deactivated",
        resourceType: "Organization",
        resourceId: id,
      },
    });
    return updated;
  }

  async resendOwnerInvite(id: string, payload: ResendInviteDto) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) {
      throw new BadRequestException("Organization not found");
    }
    return this.authService.createInvite(
      {
        email: payload.email,
        role: UserRole.ADMIN,
        organizationId: org.id,
      },
      "super_admin"
    );
  }

  async listAuditLog({
    orgId,
    actorId,
    limit,
  }: {
    orgId?: string;
    actorId?: string;
    limit: number;
  }) {
    return this.prisma.auditLog.findMany({
      where: {
        organizationId: orgId,
        actorId: actorId,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }
}
