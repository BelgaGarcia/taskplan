/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { TaskOccurrenceStatus } from '../../generated/prisma/client';
import type { Prisma } from '../../generated/prisma/client';
import { TaskOccurrencesService } from './task-occurrences.service';

const occurrence = (overrides: Record<string, unknown> = {}) => ({
  id: 'occurrence',
  taskId: 'task-1',
  status: TaskOccurrenceStatus.PENDING,
  originalDate: new Date('2026-08-17T00:00:00.000Z'),
  scheduledDate: new Date('2026-08-17T00:00:00.000Z'),
  scheduledTime: '09:00',
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

const admin = { ...operator, sub: 'admin-1', accessLevel: 'ADMIN' as const };

describe('TaskOccurrencesService', () => {
  it('clears and audits every occurrence in the requested month for an administrator', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 4 });
    const createAudit = jest.fn().mockResolvedValue({});
    const transaction = jest.fn((callback: (tx: never) => Promise<unknown>) =>
      callback({
        taskOccurrence: { deleteMany },
        auditLog: { create: createAudit },
      } as never),
    );
    const service = new TaskOccurrencesService(
      { $transaction: transaction } as never,
      { getInheritedPositionIds: jest.fn().mockResolvedValue([]) } as never,
    );

    await expect(service.clearMonth('2026-08', admin)).resolves.toEqual({
      month: '2026-08',
      deleted: 4,
    });
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        scheduledDate: {
          gte: new Date('2026-08-01T00:00:00.000Z'),
          lt: new Date('2026-09-01T00:00:00.000Z'),
        },
      },
    });
    expect(createAudit).toHaveBeenCalledWith({
      data: {
        actorUserId: 'admin-1',
        action: 'OCCURRENCE_MONTH_CLEARED',
        entityType: 'TaskOccurrence',
        metadata: { month: '2026-08', deleted: 4 },
      },
    });
  });

  it('does not let an operator clear a month', async () => {
    const transaction = jest.fn();
    const service = new TaskOccurrencesService(
      { $transaction: transaction } as never,
      { getInheritedPositionIds: jest.fn().mockResolvedValue([]) } as never,
    );

    await expect(
      service.clearMonth('2026-08', operator),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(transaction).not.toHaveBeenCalled();
  });

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

  it('finishes partially, links a pending occurrence for tomorrow and audits the action', async () => {
    const transaction = {
      taskOccurrence: {
        findFirst: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({ id: 'continuation' }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit' }) },
    };
    const findUnique = jest
      .fn()
      .mockResolvedValueOnce(occurrence())
      .mockResolvedValueOnce(
        occurrence({
          status: TaskOccurrenceStatus.COMPLETED,
          continuedBy: {
            id: 'continuation',
            scheduledDate: new Date('2026-08-18T00:00:00.000Z'),
            status: TaskOccurrenceStatus.PENDING,
          },
        }),
      );
    const service = new TaskOccurrencesService(
      {
        taskOccurrence: { findUnique },
        $transaction: jest.fn((callback) => callback(transaction)),
      } as never,
      { getInheritedPositionIds: jest.fn().mockResolvedValue([]) } as never,
    );

    await service.continueTomorrow(
      'occurrence',
      { actualDurationMinutes: 35, notes: 'Retomar amanhã' },
      operator,
    );

    expect(transaction.taskOccurrence.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: TaskOccurrenceStatus.COMPLETED,
          result: 'PARTIAL',
          actualDurationMinutes: 35,
        }),
      }),
    );
    expect(transaction.taskOccurrence.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        taskId: 'task-1',
        originalDate: new Date('2026-08-18T00:00:00.000Z'),
        scheduledDate: new Date('2026-08-18T00:00:00.000Z'),
        status: TaskOccurrenceStatus.PENDING,
        continuationOfId: 'occurrence',
      }),
      select: { id: true },
    });
    expect(transaction.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: 'operator-1',
        action: 'TASK_OCCURRENCE_CONTINUED',
      }),
    });
  });

  it('rejects continuation when the task already has an occurrence tomorrow', async () => {
    const transaction = {
      taskOccurrence: {
        findFirst: jest.fn().mockResolvedValue({ id: 'existing' }),
        updateMany: jest.fn(),
      },
    };
    const service = new TaskOccurrencesService(
      {
        taskOccurrence: {
          findUnique: jest.fn().mockResolvedValue(occurrence()),
        },
        $transaction: jest.fn((callback) => callback(transaction)),
      } as never,
      { getInheritedPositionIds: jest.fn().mockResolvedValue([]) } as never,
    );

    await expect(
      service.continueTomorrow('occurrence', {}, operator),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.taskOccurrence.updateMany).not.toHaveBeenCalled();
  });

  it('only lets the recorded executor continue an in-progress occurrence', async () => {
    const service = new TaskOccurrencesService(
      {
        taskOccurrence: {
          findUnique: jest.fn().mockResolvedValue(
            occurrence({
              status: TaskOccurrenceStatus.IN_PROGRESS,
              executedByUserId: 'another-user',
            }),
          ),
        },
      } as never,
      { getInheritedPositionIds: jest.fn().mockResolvedValue([]) } as never,
    );

    await expect(
      service.continueTomorrow('occurrence', {}, operator),
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
