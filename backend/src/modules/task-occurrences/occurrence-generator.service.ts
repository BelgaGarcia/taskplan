import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';

type TaskWithPeriodicity = Prisma.TaskGetPayload<{
  include: {
    periodicity: true;
  };
}>;

type OccurrenceRow = Prisma.TaskOccurrenceCreateManyInput;

@Injectable()
export class OccurrenceGeneratorService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(fromValue: string, toValue: string) {
    const from = this.toDate(fromValue);
    const to = this.toDate(toValue);

    if (to < from) {
      throw new BadRequestException(
        'A data final não pode ser anterior à data inicial.',
      );
    }

    const tasks = await this.getTasks(from, to);

    let attempted = 0;
    let created = 0;

    for (const task of tasks) {
      const originalDates = await this.generateOriginalDates(task, from, to);

      if (originalDates.length === 0) {
        continue;
      }

      const rows: OccurrenceRow[] = [];

      for (const originalDate of originalDates) {
        const scheduledDate = task.advanceOnNonBusinessDay
          ? await this.moveToPreviousBusinessDay(originalDate)
          : new Date(originalDate);

        rows.push({
          taskId: task.id,
          responsibleUserId: task.responsibleUserId ?? null,
          originalDate,
          scheduledDate,
          scheduledTime: task.scheduledTime ?? null,
        });
      }

      const distinctRows = Array.from(
        new Map(
          rows.map((row) => [
            `${row.taskId}:${new Date(row.scheduledDate).toISOString()}`,
            row,
          ]),
        ).values(),
      );

      attempted += distinctRows.length;

      const result = await this.prisma.taskOccurrence.createMany({
        data: distinctRows,
        skipDuplicates: true,
      });

      created += result.count;
    }

    return {
      from: fromValue,
      to: toValue,
      tasksProcessed: tasks.length,
      occurrencesAttempted: attempted,
      occurrencesCreated: created,
      duplicatesSkipped: attempted - created,
    };
  }

  private getTasks(from: Date, to: Date) {
    return this.prisma.task.findMany({
      where: {
        active: true,
        startDate: {
          lte: to,
        },
        OR: [
          {
            endDate: null,
          },
          {
            endDate: {
              gte: from,
            },
          },
        ],
        periodicity: {
          active: true,
        },
      },
      include: {
        periodicity: true,
      },
    });
  }

  private async generateOriginalDates(
    task: TaskWithPeriodicity,
    from: Date,
    to: Date,
  ): Promise<Date[]> {
    const start = this.maxDate(task.startDate, from);

    const end = this.minDate(task.endDate ?? to, to);

    if (end < start) {
      return [];
    }

    switch (task.periodicity.type) {
      case 'DAILY':
        return this.generateByIntervalDays(
          task,
          start,
          end,
          task.periodicity.interval,
        );

      case 'WEEKLY':
        return this.generateByIntervalDays(
          task,
          start,
          end,
          7 * task.periodicity.interval,
        );

      case 'BIWEEKLY':
        return this.generateByIntervalDays(
          task,
          start,
          end,
          14 * task.periodicity.interval,
        );

      case 'MONTHLY':
        return this.generateMonthly(
          task,
          start,
          end,
          task.periodicity.interval,
        );

      case 'BIMONTHLY':
        return this.generateMonthly(
          task,
          start,
          end,
          2 * task.periodicity.interval,
        );

      case 'QUARTERLY':
        return this.generateMonthly(
          task,
          start,
          end,
          3 * task.periodicity.interval,
        );

      case 'SEMIANNUAL':
        return this.generateMonthly(
          task,
          start,
          end,
          6 * task.periodicity.interval,
        );

      case 'ANNUAL':
        return this.generateAnnual(task, start, end);

      case 'SPECIFIC_WEEKDAYS':
        return this.generateSpecificWeekdays(task, start, end);

      case 'SPECIFIC_MONTH_DAY':
        return this.generateSpecificMonthDay(task, start, end);

      case 'FIRST_BUSINESS_DAY':
        return this.generateBusinessDayOfMonth(task, start, end, true);

      case 'LAST_BUSINESS_DAY':
        return this.generateBusinessDayOfMonth(task, start, end, false);

      case 'CUSTOM_INTERVAL':
        return this.generateByIntervalDays(
          task,
          start,
          end,
          task.periodicity.interval,
        );

      default:
        return [];
    }
  }

  private generateByIntervalDays(
    task: TaskWithPeriodicity,
    start: Date,
    end: Date,
    intervalDays: number,
  ): Date[] {
    const result: Date[] = [];

    const safeInterval = Math.max(intervalDays, 1);

    const cursor = new Date(task.startDate);

    while (cursor < start) {
      cursor.setUTCDate(cursor.getUTCDate() + safeInterval);
    }

    while (cursor <= end) {
      result.push(new Date(cursor));

      cursor.setUTCDate(cursor.getUTCDate() + safeInterval);
    }

    return result;
  }

  private generateMonthly(
    task: TaskWithPeriodicity,
    start: Date,
    end: Date,
    intervalMonths: number,
  ): Date[] {
    const result: Date[] = [];

    const originalDay =
      task.periodicity.dayOfMonth ?? task.startDate.getUTCDate();

    const safeInterval = Math.max(intervalMonths, 1);

    let year = task.startDate.getUTCFullYear();

    let month = task.startDate.getUTCMonth();

    while (Date.UTC(year, month, 1) <= end.getTime()) {
      const candidate = this.resolveMonthDay(
        year,
        month,
        originalDay,
        task.periodicity.nonexistentDayRule,
      );

      if (
        candidate &&
        candidate >= start &&
        candidate <= end &&
        candidate >= task.startDate &&
        (!task.endDate || candidate <= task.endDate)
      ) {
        result.push(candidate);
      }

      month += safeInterval;

      while (month > 11) {
        month -= 12;
        year += 1;
      }
    }

    return result;
  }

  private generateAnnual(
    task: TaskWithPeriodicity,
    start: Date,
    end: Date,
  ): Date[] {
    const result: Date[] = [];

    const month =
      (task.periodicity.month ?? task.startDate.getUTCMonth() + 1) - 1;

    const day = task.periodicity.dayOfMonth ?? task.startDate.getUTCDate();

    const intervalYears = Math.max(task.periodicity.interval, 1);

    let year = task.startDate.getUTCFullYear();

    while (year <= end.getUTCFullYear()) {
      const candidate = this.resolveMonthDay(
        year,
        month,
        day,
        task.periodicity.nonexistentDayRule,
      );

      if (
        candidate &&
        candidate >= start &&
        candidate <= end &&
        candidate >= task.startDate &&
        (!task.endDate || candidate <= task.endDate)
      ) {
        result.push(candidate);
      }

      year += intervalYears;
    }

    return result;
  }

  private generateSpecificWeekdays(
    task: TaskWithPeriodicity,
    start: Date,
    end: Date,
  ): Date[] {
    const allowed = new Set(task.periodicity.daysOfWeek);

    const result: Date[] = [];
    const cursor = new Date(start);

    while (cursor <= end) {
      const day = cursor.getUTCDay();

      const isoDay = day === 0 ? 7 : day;

      if (allowed.has(isoDay)) {
        result.push(new Date(cursor));
      }

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return result;
  }

  private generateSpecificMonthDay(
    task: TaskWithPeriodicity,
    start: Date,
    end: Date,
  ): Date[] {
    if (!task.periodicity.dayOfMonth) {
      return [];
    }

    return this.generateMonthly(task, start, end, task.periodicity.interval);
  }

  private async generateBusinessDayOfMonth(
    task: TaskWithPeriodicity,
    start: Date,
    end: Date,
    first: boolean,
  ): Promise<Date[]> {
    const result: Date[] = [];

    const interval = Math.max(task.periodicity.interval, 1);

    let year = task.startDate.getUTCFullYear();

    let month = task.startDate.getUTCMonth();

    while (Date.UTC(year, month, 1) <= end.getTime()) {
      const candidate = first
        ? await this.getFirstBusinessDay(year, month)
        : await this.getLastBusinessDay(year, month);

      if (
        candidate >= start &&
        candidate <= end &&
        candidate >= task.startDate &&
        (!task.endDate || candidate <= task.endDate)
      ) {
        result.push(candidate);
      }

      month += interval;

      while (month > 11) {
        month -= 12;
        year += 1;
      }
    }

    return result;
  }

  private resolveMonthDay(
    year: number,
    month: number,
    requestedDay: number,
    rule: TaskWithPeriodicity['periodicity']['nonexistentDayRule'],
  ): Date | null {
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

    if (requestedDay <= lastDay) {
      return new Date(Date.UTC(year, month, requestedDay));
    }

    switch (rule) {
      case 'PREVIOUS_DAY':
      case 'LAST_DAY_OF_MONTH':
        return new Date(Date.UTC(year, month, lastDay));

      case 'NEXT_MONTH':
        return new Date(Date.UTC(year, month + 1, 1));

      case 'SKIP':
      default:
        return null;
    }
  }

  private async moveToPreviousBusinessDay(date: Date): Promise<Date> {
    const result = new Date(date);

    while (!(await this.isBusinessDay(result))) {
      result.setUTCDate(result.getUTCDate() - 1);
    }

    return result;
  }

  private async isBusinessDay(date: Date): Promise<boolean> {
    const day = date.getUTCDay();

    if (day === 0 || day === 6) {
      return false;
    }

    const holidays = await this.prisma.holiday.findMany({
      where: {
        active: true,
      },
      select: {
        date: true,
        recurringAnnual: true,
      },
    });

    const holidayFound = holidays.some((holiday) => {
      if (holiday.recurringAnnual) {
        return (
          holiday.date.getUTCMonth() === date.getUTCMonth() &&
          holiday.date.getUTCDate() === date.getUTCDate()
        );
      }

      return holiday.date.getTime() === date.getTime();
    });

    return !holidayFound;
  }

  private async getFirstBusinessDay(
    year: number,
    month: number,
  ): Promise<Date> {
    const cursor = new Date(Date.UTC(year, month, 1));

    while (!(await this.isBusinessDay(cursor))) {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return cursor;
  }

  private async getLastBusinessDay(year: number, month: number): Promise<Date> {
    const cursor = new Date(Date.UTC(year, month + 1, 0));

    while (!(await this.isBusinessDay(cursor))) {
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    return cursor;
  }

  private toDate(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private maxDate(first: Date, second: Date): Date {
    return first > second ? new Date(first) : new Date(second);
  }

  private minDate(first: Date, second: Date): Date {
    return first < second ? new Date(first) : new Date(second);
  }
}
