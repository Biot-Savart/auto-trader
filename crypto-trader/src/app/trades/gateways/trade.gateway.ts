import { Logger } from '@nestjs/common';
import {
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // Or specify frontend origin
  },
})
export class TradeGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TradeGateway.name);

  afterInit() {
    this.logger.log('Trade WebSocket Gateway Initialized');
  }

  emitTrade(trade: any) {
    console.log('Emitting trade:', trade);
    this.server.emit('newTrade', trade);
  }
}
