import {
  ConnectedSocket,
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { JwtService } from "@nestjs/jwt";
import { AuthUser } from "../auth/types/auth.types";
import { Server } from "socket.io";

@WebSocketGateway({
  cors: {
    origin: "*",
    credentials: true,
  },
  namespace: "/inbox",
})
export class InboxGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwtService: JwtService) {}

  emitConversationUpdated(organizationId: string, payload: unknown) {
    this.server.to(`org:${organizationId}`).emit("conversation.updated", payload);
  }

  emitMessageCreated(organizationId: string, payload: unknown) {
    this.server.to(`org:${organizationId}`).emit("message.created", payload);
  }

  handleConnection(@ConnectedSocket() client: any) {
    const token = client.handshake.auth?.token;
    if (!token) {
      client.disconnect();
      return;
    }

    let payload: AuthUser | null = null;
    try {
      payload = this.jwtService.verify<AuthUser>(token, {
        secret: process.env.JWT_PUBLIC_KEY || "dev",
      });
    } catch {
      client.disconnect();
      return;
    }

    const organizationId = payload?.organizationId;
    if (organizationId) {
      client.join(`org:${organizationId}`);
    }
  }
}
