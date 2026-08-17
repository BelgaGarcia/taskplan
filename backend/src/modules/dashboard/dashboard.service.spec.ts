import { DashboardService } from './dashboard.service';

const occurrence = (id: string) => ({
  id,
  status: 'PENDING',
  scheduledDate: new Date('2026-08-17T00:00:00.000Z'),
  responsibleUserId: null,
  task: {
    responsibleUserId: null,
    responsiblePositionId: null,
    function: { responsibleUserId: null, responsiblePositionId: null },
  },
});

describe('DashboardService', () => {
  it('uses today.occurrences and decorates team items with canOperate', async () => {
    const count = jest
      .fn()
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(11);
    const findMany = jest
      .fn()
      .mockResolvedValueOnce([occurrence('today-occurrence')])
      .mockResolvedValueOnce([occurrence('next-occurrence')]);
    const service = new DashboardService({
      taskOccurrence: { count, findMany },
    } as never);

    const summary = await service.summary({
      sub: 'operator',
      email: 'operator@example.com',
      roleId: 'role',
      accessLevel: 'OPERATOR',
      positionId: null,
    });

    expect(summary.today.total).toBe(1);
    expect(summary.today.occurrences[0]).toEqual(
      expect.objectContaining({ id: 'today-occurrence', canOperate: false }),
    );
    expect(summary.nextOccurrences[0]).toEqual(
      expect.objectContaining({ id: 'next-occurrence', canOperate: false }),
    );
    expect(count).toHaveBeenCalledTimes(5);
    expect(findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ take: 10 }),
    );
  });
});
