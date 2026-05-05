import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { createHash } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || "dev_secret",
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    const authHeader = req?.headers?.authorization as string | undefined;
    const apiKeyHeader = req?.headers?.["x-api-key"] as string | undefined;

    if (apiKeyHeader) {
      const secretHash = createHash("sha256").update(apiKeyHeader).digest("hex");
      const apiKey = await this.prisma.apiKey.findFirst({
        where: {
          prefix: apiKeyHeader.slice(0, 10),
          secretHash,
          revokedAt: null,
        },
      });
      if (apiKey) {
        await this.prisma.apiKey.update({
          where: { id: apiKey.id },
          data: { lastUsedAt: new Date() },
        });
        return {
          sub: apiKey.userId || `api-key:${apiKey.id}`,
          userId: apiKey.userId || apiKey.id,
          email: `${apiKey.prefix}@api-key.local`,
          role: "ADMIN",
          organizationId: apiKey.organizationId,
          authType: "apiKey",
        };
      }
    } else if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      if (token.startsWith("wa_live_")) {
        const secretHash = createHash("sha256").update(token).digest("hex");
        const apiKey = await this.prisma.apiKey.findFirst({
          where: {
            prefix: token.slice(0, 10),
            secretHash,
            revokedAt: null,
          },
        });
        if (apiKey) {
          await this.prisma.apiKey.update({
            where: { id: apiKey.id },
            data: { lastUsedAt: new Date() },
          });
          return {
            sub: apiKey.userId || `api-key:${apiKey.id}`,
            userId: apiKey.userId || apiKey.id,
            email: `${apiKey.prefix}@api-key.local`,
            role: "ADMIN",
            organizationId: apiKey.organizationId,
            authType: "apiKey",
          };
        }
      }
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      return {
        ...payload,
        userId: payload.sub,
        authType: "jwt",
      };
    }

    return {
      id: user.id,
      sub: user.id,
      userId: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      profileInfo: user.profileInfo,
      role: user.role,
      organizationId: user.organizationId,
      authType: "jwt",
    };
  }
}
