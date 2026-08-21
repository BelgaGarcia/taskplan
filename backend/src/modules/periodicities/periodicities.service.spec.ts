import { BadRequestException } from '@nestjs/common';
import { PeriodicitiesService } from './periodicities.service';

describe('PeriodicitiesService', () => {
  const createService = () => {
    const prisma = {
      periodicity: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'periodicity' }),
      },
    };
    return {
      prisma,
      service: new PeriodicitiesService(prisma as never, {} as never),
    };
  };

  it('accepts a valid MONTHLY_DAY_RANGE', async () => {
    const { prisma, service } = createService();
    await service.create({
      name: 'Dias 10 a 17',
      type: 'MONTHLY_DAY_RANGE',
      startDayOfMonth: 10,
      endDayOfMonth: 17,
      nonexistentDayRule: 'PREVIOUS_DAY',
    } as never);

    expect(prisma.periodicity.create).toHaveBeenCalledTimes(1);
  });

  const invalidRanges: Array<[number, number]> = [
    [17, 10],
    [0, 10],
    [10, 32],
  ];
  for (const [startDayOfMonth, endDayOfMonth] of invalidRanges) {
    it(`rejects invalid monthly range ${startDayOfMonth}-${endDayOfMonth}`, async () => {
      const { service } = createService();
      await expect(
        service.create({
          name: `Inválida ${startDayOfMonth}`,
          type: 'MONTHLY_DAY_RANGE',
          startDayOfMonth,
          endDayOfMonth,
          nonexistentDayRule: 'PREVIOUS_DAY',
        } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  }

  it('requires weekdays for newly created WEEKLY periodicities', async () => {
    const { service } = createService();
    await expect(
      service.create({
        name: 'Sem dias',
        type: 'WEEKLY',
        nonexistentDayRule: 'PREVIOUS_DAY',
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
