import { Body, Controller, Get, Patch, Post, Req, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { JwtRefreshGuard } from "./guards/jwt-refresh.guard";
import { InviteAcceptDto, InviteCreateDto, LoginDto } from "./dto/auth.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(body);
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post("super-admin/login")
  async superAdminLogin(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.superAdminLogin(body);
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post("invite")
  @UseGuards(JwtAuthGuard, RolesGuard)
  async invite(@Body() body: InviteCreateDto, @Req() req: any) {
    return this.authService.createInvite(body, req.user.sub);
  }

  @Post("forgot-password")
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post("reset-password")
  async resetPassword(@Body() body: { token: string; password: string }) {
    return this.authService.resetPassword(body.token, body.password);
  }

  @Post("invite/accept")
  async acceptInvite(@Body() body: InviteAcceptDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.acceptInvite(body);
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });
    return { accessToken: result.accessToken, user: result.user };
  }

  @Get("refresh")
  @UseGuards(JwtRefreshGuard)
  async refresh(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const currentToken = req.user.refreshToken;
    if (currentToken) {
      await this.authService.revokeRefreshToken(currentToken);
    }
    const userId = req.user.sub;
    const result = await this.authService.refresh(userId);
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });
    return { accessToken: result.accessToken };
  }

  @Post("logout")
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.refreshToken;
    if (token) {
      await this.authService.revokeRefreshToken(token);
    }
    res.clearCookie("refreshToken");
    return { ok: true };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard, RolesGuard)
  async me(@Req() req: any) {
    const user = await this.authService.getCurrentUser(req.user.id || req.user.sub);
    return { user };
  }

  @Patch("profile")
  @UseGuards(JwtAuthGuard, RolesGuard)
  async updateProfile(@Req() req: any, @Body() body: { name?: string; phone?: string; profileInfo?: string }) {
    const user = await this.authService.updateProfile(req.user.id || req.user.sub, body);
    return { user };
  }
}
