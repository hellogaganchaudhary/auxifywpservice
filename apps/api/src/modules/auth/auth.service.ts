import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "./types/auth.types";
import { InviteAcceptDto, InviteCreateDto, LoginDto, SignupDto } from "./dto/auth.dto";
import { EmailService } from "../email/email.service";

const SIGNUP_PLANS = new Set(["starter", "growth", "business", "enterprise"]);

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService
  ) {}

  async login(payload: LoginDto) {
    const { email, password } = payload;
    if (!email || !password) {
      throw new UnauthorizedException();
    }
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException();
    }
    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException();
    }
    const authUser = this.mapUser(user);
    return this.issueTokens(authUser);
  }

  async superAdminLogin(payload: LoginDto) {
    const { email, password } = payload;
    if (!email || !password) {
      throw new UnauthorizedException();
    }
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== UserRole.SUPER_ADMIN) {
      throw new UnauthorizedException();
    }
    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException();
    }
    const authUser = this.mapUser(user);
    return this.issueTokens(authUser);
  }

  async signup(payload: SignupDto) {
    const organizationName = payload.organizationName?.trim();
    const adminName = payload.adminName?.trim();
    const email = payload.email?.trim().toLowerCase();
    const password = payload.password?.trim();
    const plan = SIGNUP_PLANS.has(payload.plan) ? payload.plan : "starter";

    if (!organizationName || !adminName || !email || !password) {
      throw new BadRequestException("Organization name, admin name, email, and password are required");
    }
    if (password.length < 8) {
      throw new BadRequestException("Password must be at least 8 characters");
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new BadRequestException("An account with this email already exists");
    }

    const slug = await this.createUniqueOrganizationSlug(organizationName);
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          slug,
          plan,
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

      const admin = await tx.user.create({
        data: {
          email,
          name: adminName,
          passwordHash,
          role: UserRole.ADMIN,
          organizationId: organization.id,
          invitedBy: "self_signup",
          acceptedInviteAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: organization.id,
          actorId: admin.id,
          action: "org.self_signup",
          resourceType: "Organization",
          resourceId: organization.id,
          metadata: {
            plan,
            organizationName,
            adminEmail: email,
          },
        },
      });

      return admin;
    });

    return this.issueTokens(this.mapUser(user));
  }

  async refresh(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null, expiresAt: { lt: new Date() } },
      data: { revokedAt: new Date() },
    });
    const authUser = this.mapUser(user);
    const accessToken = await this.issueAccessToken(authUser);
    const refreshToken = await this.issueRefreshToken(userId);
    return { accessToken, refreshToken };
  }

  async createInvite(payload: InviteCreateDto, createdBy: string) {
    if (!payload.email?.trim()) {
      throw new BadRequestException("Email is required");
    }
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    await this.prisma.invite.deleteMany({
      where: {
        email: payload.email.trim().toLowerCase(),
        organizationId: payload.organizationId,
        acceptedAt: null,
      },
    });
    const invite = await this.prisma.invite.create({
      data: {
        email: payload.email.trim().toLowerCase(),
        role: payload.role,
        organizationId: payload.organizationId,
        token,
        expiresAt,
        createdBy,
      },
    });
    const inviteUrl = `${this.getAppUrl()}/accept-invite?token=${token}`;
    await this.emailService.sendInviteEmail(invite.email, inviteUrl);
    return invite;
  }

  async acceptInvite(payload: InviteAcceptDto) {
    const invite = await this.prisma.invite.findUnique({
      where: { token: payload.token },
    });
    if (!invite || invite.acceptedAt) {
      throw new BadRequestException("Invite invalid");
    }
    if (invite.expiresAt < new Date()) {
      throw new BadRequestException("Invite expired");
    }
    const passwordHash = await bcrypt.hash(payload.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: invite.email,
        name: payload.name,
        passwordHash,
        role: invite.role,
        organizationId: invite.organizationId,
        invitedBy: invite.createdBy,
        acceptedInviteAt: new Date(),
      },
    });
    await this.prisma.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
    return this.issueTokens(this.mapUser(user));
  }

  async forgotPassword(email: string) {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) return { ok: true };
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) return { ok: true };
    const resetUrl = await this.createPasswordResetUrl(user.id);
    await this.emailService.sendResetEmail(user.email, resetUrl);
    return { ok: true };
  }

  async resetPassword(token: string, password: string) {
    const reset = await this.prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    });
    if (!reset || reset.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid or expired token");
    }
    const hash = await bcrypt.hash(password, 10);
    await this.prisma.user.update({
      where: { id: reset.userId },
      data: { passwordHash: hash },
    });
    await this.prisma.passwordReset.deleteMany({ where: { userId: reset.userId } });
    await this.prisma.refreshToken.updateMany({
      where: { userId: reset.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async sendOnboardingEmail(userId: string, organizationName: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException("User not found");
    }
    const setupUrl = await this.createPasswordResetUrl(user.id);
    await this.emailService.sendOnboardingEmail(user.email, {
      name: user.name,
      organizationName,
      setupUrl,
    });
    return { ok: true };
  }

  async issueTokens(user: AuthUser) {
    const accessToken = await this.issueAccessToken(user);
    const refreshToken = await this.issueRefreshToken(user.id);
    return { accessToken, refreshToken, user };
  }

  async issueAccessToken(user: AuthUser) {
    return this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    });
  }

  async issueRefreshToken(userId: string) {
    const token = await this.jwtService.signAsync(
      { sub: userId, type: "refresh", jti: crypto.randomUUID() },
      {
        secret: process.env.JWT_REFRESH_SECRET || "dev_refresh",
        expiresIn: "30d",
      }
    );
    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      },
    });
    return token;
  }

  async revokeRefreshToken(token: string) {
    await this.prisma.refreshToken.updateMany({
      where: { token, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }
    return this.mapUser(user);
  }

  async updateProfile(userId: string, payload: { name?: string; phone?: string; profileInfo?: string }) {
    const data: { name?: string; phone?: string | null; profileInfo?: string | null } = {};

    if (payload.name !== undefined) {
      const name = payload.name.trim();
      if (name) {
        data.name = name;
      }
    }

    if (payload.phone !== undefined) {
      data.phone = payload.phone.trim() || null;
    }

    if (payload.profileInfo !== undefined) {
      data.profileInfo = payload.profileInfo.trim() || null;
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
    });
    return this.mapUser(user);
  }

  private mapUser(user: any): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      profileInfo: user.profileInfo,
      role: user.role,
      organizationId: user.organizationId,
    };
  }

  private async createPasswordResetUrl(userId: string) {
    await this.prisma.passwordReset.deleteMany({ where: { userId } });
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);
    await this.prisma.passwordReset.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
    return `${this.getAppUrl()}/reset-password?token=${token}`;
  }

  private async createUniqueOrganizationSlug(name: string) {
    const base = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "organization";
    let slug = base;
    let counter = 2;

    while (await this.prisma.organization.findUnique({ where: { slug } })) {
      slug = `${base}-${counter}`;
      counter += 1;
    }

    return slug;
  }

  private getAppUrl() {
    return (process.env.APP_URL || process.env.WEB_APP_URL || process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
  }
}
