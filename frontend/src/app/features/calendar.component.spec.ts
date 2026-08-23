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
  const auth = { isAdmin: false };

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
      'clearAgendaMonth',
      'continueOccurrenceTomorrow',
    ]);
    api.calendar.and.returnValue(of(response));
    api.occurrenceOptions.and.returnValue(
      of({ functions: [], users: [], statuses: [] }),
    );
    api.clearAgendaMonth.and.returnValue(
      of({ month: '2026-08', deleted: 5 }),
    );

    await TestBed.configureTestingModule({
      imports: [CalendarComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: TaskPlanApiService, useValue: api },
        { provide: AuthService, useValue: auth },
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

  afterEach(() => {
    auth.isAdmin = false;
    fixture.destroy();
  });

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

  it('shows the button only to admins and clears the displayed month after confirmation', () => {
    expect(
      fixture.nativeElement.querySelector('.clear-month-button'),
    ).toBeNull();

    fixture.destroy();
    auth.isAdmin = true;
    api.calendar.calls.reset();
    fixture = TestBed.createComponent(CalendarComponent);
    component = fixture.componentInstance;
    component.current = new Date(2026, 7, 1);
    component.miniMonth = new Date(2026, 7, 1);
    component.selectedDate = new Date(2026, 7, 12);
    fixture.detectChanges();
    const openButton = fixture.nativeElement.querySelector(
      '.clear-month-button',
    ) as HTMLButtonElement;
    expect(openButton).not.toBeNull();

    openButton.click();
    fixture.detectChanges();
    const modal = fixture.nativeElement.querySelector('.occurrence-modal');
    expect(modal.getAttribute('role')).toBe('alertdialog');
    expect(modal.textContent).toContain('Agosto de 2026');

    const confirmButton = modal.querySelector(
      '.danger-button',
    ) as HTMLButtonElement;
    confirmButton.click();

    expect(api.clearAgendaMonth).toHaveBeenCalledOnceWith('2026-08');
    expect(api.calendar).toHaveBeenCalledTimes(2);
  });

  it('sends duration and notes when continuing an occurrence tomorrow', () => {
    fixture = TestBed.createComponent(CalendarComponent);
    fixture.detectChanges();
    fixture.componentInstance.selected = {
      id: 'occurrence-1',
      taskId: 'task-1',
      scheduledDate: '2026-08-17T00:00:00.000Z',
      originalDate: '2026-08-17T00:00:00.000Z',
      status: 'IN_PROGRESS',
      overdue: false,
      canOperate: true,
      task: { id: 'task-1', name: 'Fechamento' },
    } as unknown as Occurrence;
    fixture.componentInstance.executionForm.patchValue({
      duration: '01:15',
      notes: 'Retomar amanhã',
    });
    api.continueOccurrenceTomorrow.and.returnValue(
      of(fixture.componentInstance.selected as Occurrence),
    );

    fixture.componentInstance.continueTomorrow();

    expect(api.continueOccurrenceTomorrow).toHaveBeenCalledOnceWith(
      'occurrence-1',
      { actualDurationMinutes: 75, notes: 'Retomar amanhã' },
    );
  });
});
