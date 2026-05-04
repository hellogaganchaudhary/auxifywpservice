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
import { InviteAcceptDto, InviteCreateDto, LoginDto } from "./dto/auth.dto";
import { QueueService } from "../queues/queues.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly queues: QueueService
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
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    const invite = await this.prisma.invite.create({
      data: {
        email: payload.email,
        role: payload.role,
        organizationId: payload.organizationId,
        token,
        expiresAt,
        createdBy,
      },
    });
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    await this.queues.emailQueue.add("send-invite", {
      to: payload.email,
      inviteUrl: `${appUrl}/accept-invite?token=${token}`,
    });
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
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { ok: true };
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);
    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    await this.queues.emailQueue.add("send-reset", {
      to: user.email,
      resetUrl: `${appUrl}/reset-password?token=${token}`,
    });
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
    await this.prisma.passwordReset.delete({ where: { id: reset.id } });
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
      { sub: userId, type: "refresh" },
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

  private mapUser(user: any): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
    };
  }
}
