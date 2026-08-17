import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  it('builds a summary from occurrence counts and ordered occurrence lists', async () => {
    const todayOccurrences = [{ id: 'today-occurrence' }];
    const nextOccurrences = [{ id: 'next-occurrence' }];
    const count = jest.fn()
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(11);
    const findMany = jest.fn()
      .mockResolvedValueOnce(todayOccurrences)
      .mockResolvedValueOnce(nextOccurrences);
    const service = new DashboardService({ taskOccurrence: { count, findMany } } as never);

    const summary = await service.summary();

    expect(summary.totals).toEqual({ pending: 2, inProgress: 3, completed: 5, failed: 7, overdue: 11 });
    expect(summary.today.total).toBe(1);
    expect(summary.today.occurrences).toBe(todayOccurrences);
    expect(summary.today.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(summary.nextOccurrences).toBe(nextOccurrences);
    expect(count).toHaveBeenCalledTimes(5);
    expect(findMany).toHaveBeenCalledTimes(2);
    expect(findMany.mock.calls[1][0]).toMatchObject({ take: 10 });
  });
});