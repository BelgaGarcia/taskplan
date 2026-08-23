/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import { ConflictException } from '@nestjs/common';
import { ACCESS_LEVELS_KEY } from '../common/decorators/roles.decorator';
import { FunctionsController } from './functions/functions.controller';
import { FunctionsService } from './functions/functions.service';
import { PeriodicitiesController } from './periodicities/periodicities.controller';
import { PositionsController } from './positions/positions.controller';
import { RolesController } from './roles/roles.controller';
import { TasksController } from './tasks/tasks.controller';
import { TasksService } from './tasks/tasks.service';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';

describe('Hard delete', () => {
  it.each([
    TasksController,
    FunctionsController,
    PeriodicitiesController,
    PositionsController,
    RolesController,
    UsersController,
  ])('restricts %p endpoints to ADMIN', (controller) => {
    expect(Reflect.getMetadata(ACCESS_LEVELS_KEY, controller)).toEqual([
      'ADMIN',
    ]);
  });

  it('deletes a task with all occurrences and records an audit entry', async () => {
    const transaction = {
      taskOccurrence: {
        deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
      },
      task: { delete: jest.fn().mockResolvedValue({ id: 'task-1' }) },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit' }) },
    };
    const service = new TasksService({
      task: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'task-1',
          name: 'Fechamento',
        }),
      },
      $transaction: jest.fn((callback) => callback(transaction)),
    } as never);

    await expect(service.hardDelete('task-1', 'admin')).resolves.toEqual({
      id: 'task-1',
      occurrencesDeleted: 3,
    });
    expect(transaction.taskOccurrence.deleteMany).toHaveBeenCalledWith({
      where: { taskId: 'task-1' },
    });
    expect(transaction.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: 'admin',
        action: 'TASK_HARD_DELETED',
        metadata: { name: 'Fechamento', occurrencesDeleted: 3 },
      }),
    });
  });

  it('blocks deleting a function referenced by active or inactive tasks', async () => {
    const remove = jest.fn();
    const service = new FunctionsService({
      taskFunction: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'function-1',
          name: 'Financeiro',
        }),
      },
      task: { count: jest.fn().mockResolvedValue(2) },
      $transaction: remove,
    } as never);

    await expect(service.hardDelete('function-1', 'admin')).rejects.toThrow(
      'possui 2 tarefa(s) vinculada(s)',
    );
    expect(remove).not.toHaveBeenCalled();
  });

  it('blocks deleting the authenticated admin user', async () => {
    const service = new UsersService({
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'admin',
          name: 'Admin',
          email: 'admin@example.com',
        }),
      },
    } as never);

    await expect(service.hardDelete('admin', 'admin')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
