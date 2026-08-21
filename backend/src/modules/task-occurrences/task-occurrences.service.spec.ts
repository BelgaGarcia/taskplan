import { ForbiddenException } from '@nestjs/common';
import { TaskOccurrenceStatus } from '../../generated/prisma/client';
import type { Prisma } from '../../generated/prisma/client';
import { TaskOccurrencesService } from './task-occurrences.service';

const occurrence = (overrides: Record<string, unknown> = {}) => ({
  id: 'occurrence',
  taskId: 'task-1',
  status: TaskOccurrenceStatus.PENDING,
  originalDate: new Date('2026-08-17T00:00:00.000Z'),
  scheduledDate: new Date('2026-08-17T00:00:00.000Z'),
  responsibleUserId: 'operator-1',
  executedByUserId: null,
  task: {
    responsibleUserId: null,
    responsiblePositionId: null,
    function: { responsibleUserId: null, responsiblePositionId: null },
  },
  ...overrides,
});

const operator = {
  sub: 'operator-1',
  email: 'operator@example.com',
  roleId: 'role',
  accessLevel: 'OPERATOR' as const,
  positionId: null,
};

describe('TaskOccurrencesService', () => {
  it('records the JWT user as executor when the responsible operator starts an occurrence', async () => {
    const findUnique = jest.fn().mockResolvedValue(occurrence());
    const updateMany = jest
      .fn<Promise<{ count: number }>, [Prisma.TaskOccurrenceUpdateManyArgs]>()
      .mockResolvedValue({ count: 1 });
    const service = new TaskOccurrencesService(
      {
        taskOccurrence: { findUnique, updateMany },
        auditLog: { create: jest.fn() },
      } as never,
      { getInheritedPositionIds: jest.fn().mockResolvedValue([]) } as never,
    );

    await service.start('occurrence', operator);

    const request = updateMany.mock.calls[0][0];
    expect(request.data).toEqual(
      expect.objectContaining({
        status: TaskOccurrenceStatus.IN_PROGRESS,
        executedByUserId: 'operator-1',
      }),
    );
  });

  it('blocks an operator who is not directly responsible', async () => {
    const updateMany = jest.fn();
    const service = new TaskOccurrencesService(
      {
        taskOccurrence: {
          findUnique: jest
            .fn()
            .mockResolvedValue(
              occurrence({ responsibleUserId: 'another-user' }),
            ),
          updateMany,
        },
        auditLog: { create: jest.fn() },
      } as never,
      { getInheritedPositionIds: jest.fn().mockResolvedValue([]) } as never,
    );

    await expect(service.start('occurrence', operator)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('only lets the recorded executor finish an in-progress occurrence', async () => {
    const service = new TaskOccurrencesService(
      {
        taskOccurrence: {
          findUnique: jest.fn().mockResolvedValue(
            occurrence({
              status: TaskOccurrenceStatus.IN_PROGRESS,
              executedByUserId: 'another-user',
            }),
          ),
          updateMany: jest.fn(),
        },
        auditLog: { create: jest.fn() },
      } as never,
      { getInheritedPositionIds: jest.fn().mockResolvedValue([]) } as never,
    );

    await expect(
      service.complete('occurrence', { result: 'SUCCESS' }, operator),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('keeps a partially completed occurrence in progress', async () => {
    const updateMany = jest
      .fn<Promise<{ count: number }>, [Prisma.TaskOccurrenceUpdateManyArgs]>()
      .mockResolvedValue({ count: 1 });
    const service = new TaskOccurrencesService(
      {
        taskOccurrence: {
          findUnique: jest.fn().mockResolvedValue(occurrence()),
          updateMany,
        },
        auditLog: { create: jest.fn() },
      } as never,
      { getInheritedPositionIds: jest.fn().mockResolvedValue([]) } as never,
    );

    await service.complete('occurrence', { result: 'PARTIAL' }, operator);

    expect(updateMany.mock.calls[0][0].data).toEqual(
      expect.objectContaining({
        status: TaskOccurrenceStatus.IN_PROGRESS,
        result: 'PARTIAL',
        completedAt: null,
      }),
    );
  });
});
