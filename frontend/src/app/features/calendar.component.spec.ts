import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../core/auth.service';
import type { CalendarResponse, Occurrence } from '../core/models';
import { TaskPlanApiService } from '../core/taskplan-api.service';
import { CalendarComponent } from './calendar.component';

const occurrence = (number: number): Occurrence =>
  ({
    id: `occurrence-${number}`,
    taskId: `task-${number}`,
    originalDate: '2026-08-12',
    scheduledDate: '2026-08-12',
    scheduledTime: `0${number}:00`,
    status: 'PENDING',
    overdue: false,
    canOperate: true,
    task: { id: `task-${number}`, name: `Atividade ${number}` },
  }) as Occurrence;

describe('CalendarComponent', () => {
  let fixture: ComponentFixture<CalendarComponent>;
  let component: CalendarComponent;
  let api: jasmine.SpyObj<TaskPlanApiService>;

  beforeEach(async () => {
    const response: CalendarResponse = {
      from: '2026-08-01',
      to: '2026-08-31',
      total: 5,
      days: [
        {
          date: '2026-08-12',
          total: 5,
          pending: 5,
          inProgress: 0,
          completed: 0,
          failed: 0,
          overdue: 0,
          occurrences: [1, 2, 3, 4, 5].map(occurrence),
        },
      ],
    };
    api = jasmine.createSpyObj<TaskPlanApiService>('TaskPlanApiService', [
      'calendar',
      'occurrenceOptions',
    ]);
    api.calendar.and.returnValue(of(response));
    api.occurrenceOptions.and.returnValue(
      of({ functions: [], users: [], statuses: [] }),
    );

    await TestBed.configureTestingModule({
      imports: [CalendarComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: TaskPlanApiService, useValue: api },
        { provide: AuthService, useValue: { isAdmin: false } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { scope: 'team' } } },
        },
        {
          provide: Router,
          useValue: { navigateByUrl: jasmine.createSpy('navigateByUrl') },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CalendarComponent);
    component = fixture.componentInstance;
    component.current = new Date(2026, 7, 1);
    component.miniMonth = new Date(2026, 7, 1);
    component.selectedDate = new Date(2026, 7, 12);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('opens the hidden activities in a dialog when +1 mais is selected', () => {
    const buttons = fixture.nativeElement.querySelectorAll(
      '.more-events',
    ) as NodeListOf<HTMLButtonElement>;
    const button = Array.from(buttons).find((element) =>
      element.textContent?.includes('+1 mais'),
    );

    expect(button).toBeDefined();
    button?.click();
    fixture.detectChanges();

    expect(component.modal).toBe('more');
    expect(api.calendar).toHaveBeenCalledTimes(1);
    expect(
      fixture.nativeElement.querySelector('.calendar-more-list')?.textContent,
    ).toContain('Atividade 5');
  });
});
