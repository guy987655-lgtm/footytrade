import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RedisService } from '../common/redis.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class PricesGateway implements OnGatewayInit {
  private readonly logger = new Logger(PricesGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly redis: RedisService) {}

  afterInit() {
    this.redis.subscribe('price:update', (err) => {
      if (err) {
        this.logger.error('Failed to subscribe to price:update', err.message);
        return;
      }
      this.logger.log('Subscribed to price:update channel');
    });

    this.redis.on('message', (_channel: string, message: string) => {
      try {
        const data = JSON.parse(message);
        this.server.emit('priceUpdate', data);

        if (data.playerId) {
          this.server
            .to(`player:${data.playerId}`)
            .emit('priceUpdate', data);
        }
      } catch {
        this.logger.error('Failed to parse price:update message', message);
      }
    });

    this.logger.log('PricesGateway initialized');
  }

  @SubscribeMessage('subscribePlayers')
  handleSubscribePlayers(
    @ConnectedSocket() client: Socket,
    @MessageBody() playerIds: string[],
  ) {
    if (!Array.isArray(playerIds)) return;

    for (const id of playerIds) {
      client.join(`player:${id}`);
    }
    this.logger.debug(
      `Client ${client.id} subscribed to ${playerIds.length} players`,
    );
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }
}
