import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-jwt";
import type { Request } from "express";

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, "jwt-refresh") {
  constructor() {
    super({
      jwtFromRequest: (req: Request & { cookies?: { refreshToken?: string } }) =>
        req?.cookies?.refreshToken,
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_REFRESH_SECRET || "dev_refresh",
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    const token = req?.cookies?.refreshToken;
    if (!token) {
      throw new UnauthorizedException();
    }
    return { ...payload, refreshToken: token };
  }
}
