import { Logger, OnModuleInit } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { TokenService } from '@modules/auth/token.service';

/**
 * Realtime gateway. The FE connects with `?token=<accessToken>` (or sends a
 * `subscribe` event with the token). Clients are placed into a `user:<userId>`
 * room so other services can `realtime.toUser(userId, event, payload)` to push
 * notifications without polling.
 *
 * Phase 8 ships this skeleton with auth + per-user rooms. Wiring it up to the
 * Notifications create flow (so a new in-app notification pushes live) lands
 * when the bell page is fully migrated.
 */
@WebSocketGateway({
  namespace: '/realtime',
  cors: { origin: true, credentials: false },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly tokens: TokenService) {}

  onModuleInit() {
    this.logger.log('Realtime gateway initialised on /realtime');
  }

  handleConnection(@ConnectedSocket() client: Socket) {
    const token = (client.handshake.auth?.token as string | undefined) ??
      (client.handshake.query?.token as string | undefined);
    if (!token) {
      client.emit('error', { code: 'NO_TOKEN' });
      client.disconnect();
      return;
    }
    try {
      const payload = this.tokens.verifyAccessToken(token);
      client.data.userId = payload.sub;
      client.join(`user:${payload.sub}`);
      this.logger.debug(`Socket connected for user ${payload.sub}`);
    } catch {
      client.emit('error', { code: 'INVALID_TOKEN' });
      client.disconnect();
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    this.logger.debug(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('ping')
  ping(@MessageBody() data: unknown, @ConnectedSocket() client: Socket) {
    client.emit('pong', { at: Date.now(), echo: data });
  }

  /** Server-side push for use from services (NotificationsService etc.). */
  toUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  /** Broadcast to every connected member of a client. */
  toClient(clientId: string, event: string, payload: unknown) {
    this.server.to(`client:${clientId}`).emit(event, payload);
  }
}
