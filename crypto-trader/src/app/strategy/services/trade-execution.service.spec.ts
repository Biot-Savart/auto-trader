import { Test, TestingModule } from '@nestjs/testing';
import { TradeExecutionService } from './trade-execution.service';

describe('TradeExecutionService', () => {
  let service: TradeExecutionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TradeExecutionService],
    }).compile();

    service = module.get<TradeExecutionService>(TradeExecutionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
