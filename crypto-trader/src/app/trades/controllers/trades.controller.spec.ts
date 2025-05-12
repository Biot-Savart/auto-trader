import { Test, TestingModule } from '@nestjs/testing';
import { TradesController } from './trades.controller';

describe('TradeController', () => {
  let controller: TradesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TradesController],
    }).compile();

    controller = module.get<TradesController>(TradesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
