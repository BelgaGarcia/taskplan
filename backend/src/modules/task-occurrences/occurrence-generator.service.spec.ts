import { OccurrenceGeneratorService } from './occurrence-generator.service';

describe('OccurrenceGeneratorService', () => {
  const generatedDates = async (
    periodicity: Record<string, unknown>,
    startDate: string,
    to: string,
    endDate: string | null = null,
  ) => {
    let createdRows: Array<{ originalDate: Date }> = [];
    const createMany = jest.fn(
      ({ data }: { data: Array<{ originalDate: Date }> }) => {
        createdRows = data;
        return Promise.resolve({ count: data.length });
      },
    );
    const service = new OccurrenceGeneratorService({
      task: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'task-1',
            startDate: new Date(`${startDate}T00:00:00.000Z`),
            endDate: endDate ? new Date(`${endDate}T00:00:00.000Z`) : null,
            scheduledTime: null,
            responsibleUserId: null,
            advanceOnNonBusinessDay: false,
            periodicity: { active: true, interval: 1, ...periodicity },
          },
        ]),
      },
      taskOccurrence: { createMany },
      taskOccurrenceExclusion: { findMany: jest.fn().mockResolvedValue([]) },
    } as never);

    await service.generate(startDate, to);
    return createdRows.map((row) =>
      row.originalDate.toISOString().slice(0, 10),
    );
  };

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

  it.each([
    [
      1,
      [
        '2026-12-30',
        '2027-01-03',
        '2027-01-04',
        '2027-01-06',
        '2027-01-10',
        '2027-01-11',
        '2027-01-13',
        '2027-01-17',
      ],
    ],
    [2, ['2026-12-30', '2027-01-03', '2027-01-11', '2027-01-13', '2027-01-17']],
  ])(
    'respects interval=%s for SPECIFIC_WEEKDAYS across the year boundary',
    async (interval, expected) => {
      await expect(
        generatedDates(
          { type: 'SPECIFIC_WEEKDAYS', daysOfWeek: [1, 3, 7], interval },
          '2026-12-30',
          '2027-01-17',
        ),
      ).resolves.toEqual(expected);
    },
  );

  it.each([
    ['PREVIOUS_DAY', ['2026-10-31', '2027-02-28', '2027-06-30', '2027-10-31']],
    [
      'LAST_DAY_OF_MONTH',
      ['2026-10-31', '2027-02-28', '2027-06-30', '2027-10-31'],
    ],
    ['NEXT_MONTH', ['2026-10-31', '2027-03-01', '2027-07-01', '2027-10-31']],
    ['SKIP', ['2026-10-31', '2027-10-31']],
  ])(
    'applies %s to nonexistent days for EVERY_FOUR_MONTHS',
    async (nonexistentDayRule, expected) => {
      await expect(
        generatedDates(
          {
            type: 'EVERY_FOUR_MONTHS',
            interval: 1,
            dayOfMonth: 31,
            nonexistentDayRule,
          },
          '2026-10-31',
          '2027-10-31',
        ),
      ).resolves.toEqual(expected);
    },
  );

  it('uses four months times interval and respects task validity', async () => {
    await expect(
      generatedDates(
        {
          type: 'EVERY_FOUR_MONTHS',
          interval: 2,
          dayOfMonth: 15,
          nonexistentDayRule: 'PREVIOUS_DAY',
        },
        '2026-10-10',
        '2028-12-31',
        '2028-06-15',
      ),
    ).resolves.toEqual(['2026-10-15', '2027-06-15', '2028-02-15']);
  });

  it('skips inactive months for a monthly range interval greater than one', () => {
    const service = new OccurrenceGeneratorService({} as never);
    const task = {
      startDate: new Date('2027-01-30T00:00:00.000Z'),
      endDate: new Date('2027-03-02T00:00:00.000Z'),
      periodicity: { startDayOfMonth: 1, endDayOfMonth: 31, interval: 2 },
    };

    const dates = service.generateMonthlyDayRange(
      task as never,
      new Date('2027-01-01T00:00:00.000Z'),
      new Date('2027-04-30T00:00:00.000Z'),
    );

    expect(dates.map((date) => date.toISOString().slice(0, 10))).toEqual([
      '2027-01-30',
      '2027-01-31',
      '2027-03-01',
      '2027-03-02',
    ]);
  });
});
