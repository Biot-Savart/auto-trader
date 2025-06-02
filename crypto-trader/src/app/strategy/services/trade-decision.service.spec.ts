import { Test, TestingModule } from '@nestjs/testing';
import { TradeDecisionService } from './trade-decision.service';

describe('TradeDecisionService', () => {
  let service: TradeDecisionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TradeDecisionService],
    }).compile();

    service = module.get<TradeDecisionService>(TradeDecisionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
