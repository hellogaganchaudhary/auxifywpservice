import { Controller, Post, Req, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { randomUUID } from "crypto";
import type { Request } from "express";
import type { Express } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";

const uploadRoot = process.env.MEDIA_UPLOAD_DIR || "uploads";

@Controller("media")
@UseGuards(JwtAuthGuard, RolesGuard)
export class MediaController {
  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: uploadRoot,
        filename: (_req, file, callback) => {
          const extension = extname(file.originalname || "") || ".bin";
          callback(null, `${Date.now()}-${randomUUID()}${extension}`);
        },
      }),
      limits: { fileSize: 16 * 1024 * 1024 },
    })
  )
  async upload(@Req() req: Request, @UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      return { error: "File required" };
    }
    const configuredBaseUrl =
      process.env.PUBLIC_WEBHOOK_BASE_URL ||
      process.env.NGROK_URL ||
      process.env.API_PUBLIC_URL ||
      `${req.protocol}://${req.get("host")}`;
    const baseUrl = configuredBaseUrl.replace(/\/$/, "");
    return {
      url: `${baseUrl}/uploads/${file.filename}`,
      fileName: file.originalname,
      mimeType: file.mimetype || "application/octet-stream",
      size: file.size,
    };
  }
}
