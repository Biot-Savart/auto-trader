import { Test, TestingModule } from '@nestjs/testing';
import { DcaStrategyService } from './dca-strategy.service';

describe('DcaStrategyService', () => {
  let service: DcaStrategyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DcaStrategyService],
    }).compile();

    service = module.get<DcaStrategyService>(DcaStrategyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
