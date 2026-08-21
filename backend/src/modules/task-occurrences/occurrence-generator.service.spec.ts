import { OccurrenceGeneratorService } from './occurrence-generator.service';

describe('OccurrenceGeneratorService', () => {
  it('preserves every original occurrence when weekend dates move to the preceding Friday', async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 3 });
    const service = new OccurrenceGeneratorService({
      task: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'task-1',
            active: true,
            startDate: new Date('2026-08-21T00:00:00.000Z'),
            endDate: new Date('2026-08-23T00:00:00.000Z'),
            scheduledTime: '10:30',
            responsibleUserId: null,
            advanceOnNonBusinessDay: true,
            periodicity: {
              active: true,
              type: 'DAILY',
              interval: 1,
            },
          },
        ]),
      },
      taskOccurrence: { createMany },
      taskOccurrenceExclusion: { findMany: jest.fn().mockResolvedValue([]) },
      holiday: { findMany: jest.fn().mockResolvedValue([]) },
    } as never);

    const result = await service.generate('2026-08-21', '2026-08-23');

    expect(createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
    expect(result).toEqual(
      expect.objectContaining({ occurrencesAttempted: 3 }),
    );
  });

  it('generates only valid dates from a monthly day range in February', () => {
    const service = new OccurrenceGeneratorService({} as never);
    const task = {
      startDate: new Date('2028-01-01T00:00:00.000Z'),
      endDate: null,
      periodicity: { startDayOfMonth: 28, endDayOfMonth: 31, interval: 1 },
    };
    const dates = service.generateMonthlyDayRange(
      task as never,
      new Date('2028-02-01T00:00:00.000Z'),
      new Date('2028-02-29T00:00:00.000Z'),
    );

    expect(dates.map((date) => date.toISOString().slice(0, 10))).toEqual([
      '2028-02-28',
      '2028-02-29',
    ]);
  });

  it('generates every day from a monthly day range, including both boundaries', () => {
    const service = new OccurrenceGeneratorService({} as never);
    const task = {
      startDate: new Date('2026-08-01T00:00:00.000Z'),
      endDate: null,
      periodicity: { startDayOfMonth: 12, endDayOfMonth: 20, interval: 1 },
    };

    const dates = service.generateMonthlyDayRange(
      task as never,
      new Date('2026-08-01T00:00:00.000Z'),
      new Date('2026-08-31T00:00:00.000Z'),
    );

    expect(dates.map((date) => date.toISOString().slice(0, 10))).toEqual([
      '2026-08-12',
      '2026-08-13',
      '2026-08-14',
      '2026-08-15',
      '2026-08-16',
      '2026-08-17',
      '2026-08-18',
      '2026-08-19',
      '2026-08-20',
    ]);
  });

  it('anchors WEEKLY weekdays to the UTC week of the task start date', () => {
    const service = new OccurrenceGeneratorService({} as never);
    const task = {
      startDate: new Date('2026-08-03T00:00:00.000Z'),
      endDate: null,
      periodicity: { daysOfWeek: [1, 2], interval: 2 },
    };
    const dates = service.generateWeekly(
      task as never,
      new Date('2026-08-03T00:00:00.000Z'),
      new Date('2026-08-30T00:00:00.000Z'),
    );

    expect(dates.map((date) => date.toISOString().slice(0, 10))).toEqual([
      '2026-08-03',
      '2026-08-04',
      '2026-08-17',
      '2026-08-18',
    ]);
  });
});
