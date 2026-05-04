import { ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
	handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
		if (err || !user) {
			throw err || new UnauthorizedException();
		}

		if (user.authType === "apiKey") {
			const request = context.switchToHttp().getRequest();
			const path = String(request?.route?.path || request?.path || "");
			const method = String(request?.method || "GET").toUpperCase();
			const allowed =
				(path.startsWith("webhooks") && method === "POST") ||
				(path.startsWith("broadcasts") && method === "GET") ||
				path.startsWith("analytics");

			if (!allowed) {
				throw new UnauthorizedException("API key access is not allowed for this endpoint");
			}
		}

		return user;
	}
}
