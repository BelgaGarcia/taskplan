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
    task: {
      id: `task-${number}`,
      name: `Atividade ${number}`,
      estimatedDurationMinutes: 30,
    },
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
      'generateAgenda',
    ]);
    api.calendar.and.returnValue(of(response));
    api.occurrenceOptions.and.returnValue(
      of({ functions: [], users: [], statuses: [] }),
    );
    api.clearAgendaMonth.and.returnValue(
      of({ month: '2026-08', deleted: 5 }),
    );
    api.generateAgenda.and.returnValue(
      of({
        from: '2026-09-01',
        to: '2026-09-30',
        tasksProcessed: 1,
        occurrencesAttempted: 3,
        occurrencesCreated: 1,
        duplicatesSkipped: 1,
        occurrencesExcluded: 1,
      }),
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
    expect(modal.textContent).toContain(
      'Nenhuma exclusão persistente será criada ou removida',
    );
    expect(modal.textContent).toContain('a geração as informará');

    const confirmButton = modal.querySelector(
      '.danger-button',
    ) as HTMLButtonElement;
    confirmButton.click();

    expect(api.clearAgendaMonth).toHaveBeenCalledOnceWith('2026-08');
    expect(api.calendar).toHaveBeenCalledTimes(2);
  });

  it('warns that deleting one occurrence prevents its original date from being regenerated', () => {
    fixture.destroy();
    auth.isAdmin = true;
    fixture = TestBed.createComponent(CalendarComponent);
    component = fixture.componentInstance;
    component.selected = occurrence(1);
    component.modal = 'details';
    fixture.detectChanges();

    const deleteButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) =>
      button.textContent?.includes('Excluir da agenda'),
    ) as HTMLButtonElement;
    deleteButton.click();
    fixture.detectChanges();

    const modal = fixture.nativeElement.querySelector('.occurrence-modal');
    expect(modal.textContent).toContain('cria uma exclusão persistente');
    expect(modal.textContent).toContain('Limpar agenda do mês');
  });

  it('reports created, duplicate, and intentionally excluded occurrences after generation', () => {
    component.generationForm.setValue({ from: '2026-09-01', to: '2026-09-30' });

    component.generate();

    expect(api.generateAgenda).toHaveBeenCalledOnceWith({
      from: '2026-09-01',
      to: '2026-09-30',
    });
    expect(component.generationNotice).toBe(
      'Geração concluída: 1 ocorrência criada; 1 já existentes; 1 excluídas intencionalmente.',
    );
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

  it('places overlapping daily events in separate columns', () => {
    const first = {
      ...occurrence(1),
      scheduledTime: '08:30',
      task: { ...occurrence(1).task, estimatedDurationMinutes: 60 },
    } as Occurrence;
    const second = {
      ...occurrence(2),
      scheduledTime: '08:45',
      task: { ...occurrence(2).task, estimatedDurationMinutes: 30 },
    } as Occurrence;
    const later = {
      ...occurrence(3),
      scheduledTime: '10:00',
      task: { ...occurrence(3).task, estimatedDurationMinutes: 30 },
    } as Occurrence;

    const layouts = component.layoutDayEvents([later, second, first]);

    expect(layouts.map((event) => event.occurrence.id)).toEqual([
      first.id,
      second.id,
      later.id,
    ]);
    expect(layouts[0].top).toBe(510);
    expect(layouts[0].left).not.toBe(layouts[1].left);
    expect(layouts[0].width).toBeLessThan(99);
    expect(layouts[1].width).toBeLessThan(99);
    expect(layouts[2].left).toBe(0.5);
    expect(layouts[2].width).toBe(99);
  });

  it('keeps the task name visible on short daily cards and exposes full details', () => {
    const shortOccurrence = occurrence(1);
    shortOccurrence.scheduledTime = '08:30';
    shortOccurrence.status = 'COMPLETED';
    shortOccurrence.task = {
      ...shortOccurrence.task,
      name: 'Conferência de documentos pendentes',
      estimatedDurationMinutes: 30,
      function: { id: 'function-1', name: 'Financeiro' },
    } as Occurrence['task'];
    const layouts = component.layoutDayEvents([shortOccurrence]);

    expect(layouts[0].height).toBe(30);
    expect(component.dayEventLabel(shortOccurrence)).toContain(
      'Conferência de documentos pendentes',
    );
    expect(component.dayEventTooltip(shortOccurrence)).toBe(
      '08:30 · Conferência de documentos pendentes\nFinanceiro · Concluída',
    );

    fixture.destroy();
    fixture = TestBed.createComponent(CalendarComponent);
    component = fixture.componentInstance;
    component.current = new Date(2026, 7, 12);
    component.miniMonth = new Date(2026, 7, 1);
    component.selectedDate = new Date(2026, 7, 12);
    component.view = 'day';
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector(
      '.day-event',
    ) as HTMLButtonElement;

    expect(card.querySelector('.day-event-main')?.textContent).toContain(
      'Atividade 1',
    );
    expect(card.style.height).toBe('30px');
    expect(card.getAttribute('title')).toContain('Atividade 1');
    expect(card.getAttribute('aria-label')).toContain('Pendente');
  });

  it('keeps dense overlapping occurrences individually identifiable', () => {
    const crowded = Array.from({ length: 6 }, (_, index) => ({
      ...occurrence(index + 1),
      scheduledTime: index < 3 ? '08:30' : '08:45',
    })) as Occurrence[];

    const layouts = component.layoutDayEvents(crowded);

    expect(layouts.length).toBe(6);
    expect(new Set(layouts.map((event) => event.left)).size).toBe(6);
    expect(layouts.every((event) => event.width < 17)).toBeTrue();
    expect(
      layouts.map((event) => component.dayEventLabel(event.occurrence)),
    ).toEqual(jasmine.arrayContaining([
      jasmine.stringContaining('Atividade 1'),
      jasmine.stringContaining('Atividade 6'),
    ]));
  });
});
