import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { JwtPayload } from "../auth/auth.service.js";

@WebSocketGateway({
  namespace: "/admin",
  cors: {
    origin: "*",
    credentials: true,
  },
})
export class AdminGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(AdminGateway.name);
  private readonly accessSecret: string;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    this.accessSecret =
      this.config.get<string>("JWT_ACCESS_SECRET") ||
      "default-access-secret-32-chars-long!";
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        (client.handshake.headers?.authorization?.startsWith("Bearer ")
          ? client.handshake.headers.authorization.substring(7)
          : null);

      if (!token) {
        this.logger.warn(
          `Socket connection rejected: missing token (${client.id})`,
        );
        client.disconnect();
        return;
      }

      const payload = this.jwt.verify<JwtPayload>(token, {
        secret: this.accessSecret,
      });

      client.data.user = payload;
      const room = `shop:${payload.shopId}`;
      await client.join(room);
      this.logger.log(`Client ${client.id} joined room ${room}`);
    } catch (err: any) {
      this.logger.warn(
        `Socket authentication failed (${client.id}): ${err.message}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  emitJobCreated(shopId: string, job: any) {
    this.server?.to(`shop:${shopId}`).emit("job:created", job);
  }

  emitJobUpdated(shopId: string, job: any) {
    this.server?.to(`shop:${shopId}`).emit("job:updated", job);
  }

  emitJobApproved(shopId: string, job: any) {
    this.server?.to(`shop:${shopId}`).emit("job:approved", job);
  }
}
