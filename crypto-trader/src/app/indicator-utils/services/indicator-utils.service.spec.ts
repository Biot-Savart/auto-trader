import { Test, TestingModule } from '@nestjs/testing';
import { IndicatorUtilsService } from './indicator-utils.service';

describe('IndicatorUtilsService', () => {
  let service: IndicatorUtilsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IndicatorUtilsService],
    }).compile();

    service = module.get<IndicatorUtilsService>(IndicatorUtilsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
