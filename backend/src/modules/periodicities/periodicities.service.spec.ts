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

  it.each([
    ['DAILY', {}],
    ['WEEKLY', { daysOfWeek: [5] }],
    ['MONTHLY', { dayOfMonth: 12 }],
    ['SPECIFIC_WEEKDAYS', { daysOfWeek: [1, 3, 5] }],
    ['MONTHLY_DAY_RANGE', { startDayOfMonth: 12, endDayOfMonth: 20 }],
    ['ANNUAL', { month: 8, dayOfMonth: 21 }],
  ])('reactivates valid %s periodicities', async (type, configuration) => {
    const periodicity = {
      id: 'periodicity',
      name: 'Periodicidade inativa',
      type,
      interval: 1,
      daysOfWeek: [],
      dayOfMonth: null,
      startDayOfMonth: null,
      endDayOfMonth: null,
      month: null,
      nonexistentDayRule: 'PREVIOUS_DAY',
      active: false,
      ...configuration,
    };
    const prisma = {
      periodicity: {
        findUnique: jest.fn().mockResolvedValue(periodicity),
        update: jest.fn().mockResolvedValue({ ...periodicity, active: true }),
      },
      task: { findMany: jest.fn().mockResolvedValue([{ id: 'task-1' }]) },
    };
    const generator = { generateForTasks: jest.fn().mockResolvedValue({}) };
    const service = new PeriodicitiesService(
      prisma as never,
      generator as never,
    );

    await expect(service.reactivate('periodicity')).resolves.toEqual(
      expect.objectContaining({ active: true }),
    );
    expect(generator.generateForTasks).toHaveBeenCalledWith(
      ['task-1'],
      expect.any(Date),
      expect.any(Date),
    );
  });

  it('keeps an invalid periodicity inactive and explains why it cannot be reactivated', async () => {
    const prisma = {
      periodicity: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'periodicity',
          name: 'Sem dias',
          type: 'SPECIFIC_WEEKDAYS',
          interval: 1,
          daysOfWeek: [],
          active: false,
        }),
        update: jest.fn(),
      },
    };
    const service = new PeriodicitiesService(prisma as never, {} as never);

    await expect(service.reactivate('periodicity')).rejects.toThrow(
      'Não foi possível reativar a periodicidade',
    );
    expect(prisma.periodicity.update).not.toHaveBeenCalled();
  });
});
