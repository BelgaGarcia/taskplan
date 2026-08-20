import { OccurrenceGeneratorService } from './occurrence-generator.service';

describe('OccurrenceGeneratorService', () => {
  it('creates only one occurrence when weekend dates move to the preceding Friday', async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 1 });
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
      holiday: { findMany: jest.fn().mockResolvedValue([]) },
    } as never);

    const result = await service.generate('2026-08-21', '2026-08-23');

    expect(createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            taskId: 'task-1',
            scheduledDate: new Date('2026-08-21T00:00:00.000Z'),
          }),
        ],
        skipDuplicates: true,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({ occurrencesAttempted: 1 }),
    );
  });
});
