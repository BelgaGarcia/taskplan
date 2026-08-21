import { BadRequestException } from '@nestjs/common';
import { PeriodicitiesService } from './periodicities.service';

describe('PeriodicitiesService', () => {
  const createService = () => {
    const created: { data?: Record<string, unknown> } = {};
    const prisma = {
      periodicity: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
          created.data = data;
          return Promise.resolve({ id: 'periodicity' });
        }),
      },
    };
    return {
      created,
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

  it('normalizes, sorts and deduplicates weekday configuration', async () => {
    const { created, service } = createService();
    await service.create({
      name: 'Dias alternados',
      type: 'SPECIFIC_WEEKDAYS',
      daysOfWeek: [5, 1, 5, 3],
    } as never);

    expect(created.data?.['daysOfWeek']).toEqual([1, 3, 5]);
  });

  const existing = {
    id: 'periodicity',
    name: 'Mensal',
    type: 'MONTHLY',
    interval: 1,
    daysOfWeek: [],
    dayOfMonth: 15,
    startDayOfMonth: null,
    endDayOfMonth: null,
    month: null,
    nonexistentDayRule: 'PREVIOUS_DAY',
    active: true,
  };

  const createUpdateService = () => {
    const captured: {
      updateData?: Record<string, unknown>;
      deletionWhere?: {
        status: string;
        originalDate: { gte: Date };
        task: { periodicityId: string };
      };
    } = {};
    const tx = {
      periodicity: {
        update: jest.fn(({ data }: { data: Record<string, unknown> }) => {
          captured.updateData = data;
          return Promise.resolve(existing);
        }),
      },
      taskOccurrence: {
        deleteMany: jest.fn(
          ({
            where,
          }: {
            where: NonNullable<typeof captured.deletionWhere>;
          }) => {
            captured.deletionWhere = where;
            return Promise.resolve({ count: 1 });
          },
        ),
      },
    };
    const prisma = {
      periodicity: {
        findUnique: jest.fn().mockResolvedValue(existing),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn(
        (callback: (transaction: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };
    const generator = { generateForTasks: jest.fn() };
    return {
      tx,
      captured,
      generator,
      service: new PeriodicitiesService(prisma as never, generator as never),
    };
  };

  it('does not clear occurrences for a name-only update', async () => {
    const { tx, service } = createUpdateService();

    await service.update('periodicity', { name: 'Mensal revisada' });

    expect(tx.taskOccurrence.deleteMany).not.toHaveBeenCalled();
  });

  it('clears only pending future occurrences after a material update without regenerating', async () => {
    const { captured, generator, service } = createUpdateService();

    await service.update('periodicity', { interval: 2 });

    expect(captured.deletionWhere?.status).toBe('PENDING');
    expect(captured.deletionWhere?.originalDate.gte).toBeInstanceOf(Date);
    expect(captured.deletionWhere?.task.periodicityId).toBe('periodicity');
    expect(generator.generateForTasks).not.toHaveBeenCalled();
  });

  it('clears incompatible fields when changing the periodicity type', async () => {
    const { captured, service } = createUpdateService();

    await service.update('periodicity', {
      type: 'SPECIFIC_WEEKDAYS',
      daysOfWeek: [5, 1, 5],
    } as never);

    expect(captured.updateData?.['daysOfWeek']).toEqual([1, 5]);
    expect(captured.updateData?.['dayOfMonth']).toBeNull();
    expect(captured.updateData?.['startDayOfMonth']).toBeNull();
    expect(captured.updateData?.['endDayOfMonth']).toBeNull();
    expect(captured.updateData?.['month']).toBeNull();
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
