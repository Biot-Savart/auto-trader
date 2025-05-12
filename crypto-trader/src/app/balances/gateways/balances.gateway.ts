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
export class BalancesGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(BalancesGateway.name);

  afterInit() {
    this.logger.log('Balances WebSocket Gateway Initialized');
  }

  emitBalance(trade: any) {
    this.server.emit('newBalance', trade);
  }
}
