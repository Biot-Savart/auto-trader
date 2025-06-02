import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioGuardService } from './portfolio-guard.service';

describe('PortfolioGuardService', () => {
  let service: PortfolioGuardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PortfolioGuardService],
    }).compile();

    service = module.get<PortfolioGuardService>(PortfolioGuardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
