import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { TaskPlanApiService } from '../core/taskplan-api.service';
import { AdminResourceComponent } from './admin-resource.component';

const emptyPage = {
  data: [],
  pagination: { page: 1, limit: 100, total: 0, totalPages: 0 },
};

describe('AdminResourceComponent', () => {
  let fixture: ComponentFixture<AdminResourceComponent>;
  let component: AdminResourceComponent;
  let api: jasmine.SpyObj<TaskPlanApiService>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<TaskPlanApiService>('TaskPlanApiService', [
      'list',
      'create',
      'update',
    ]);
    api.list.and.returnValue(of(emptyPage));
    api.create.and.returnValue(of({ id: 'periodicity' }));
    api.update.and.returnValue(of({ id: 'periodicity' }));

    await TestBed.configureTestingModule({
      imports: [AdminResourceComponent],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { resource: 'periodicities' } } },
        },
        { provide: TaskPlanApiService, useValue: api },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminResourceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  for (const type of ['WEEKLY', 'SPECIFIC_WEEKDAYS']) {
    it(`submits only 1-based checked weekdays for ${type}`, () => {
      component.openCreate();
      component.form.patchValue({
        name: `Toda sexta (${type})`,
        type,
        interval: 1,
        nonexistentDayRule: 'PREVIOUS_DAY',
      });
      component.toggleWeekday(
        5,
        { target: { checked: true } } as unknown as Event,
      );

      component.save();

      expect(api.create).toHaveBeenCalledWith(
        'periodicities',
        jasmine.objectContaining({ daysOfWeek: [5] }),
      );
    });
  }

  it('sorts, deduplicates and removes weekdays from the payload', () => {
    component.openCreate();
    component.form.patchValue({
      name: 'Dias úteis',
      type: 'SPECIFIC_WEEKDAYS',
      interval: 2,
      daysOfWeek: '5,1,5,3',
      nonexistentDayRule: 'PREVIOUS_DAY',
    });
    component.toggleWeekday(
      3,
      { target: { checked: false } } as unknown as Event,
    );

    component.save();

    expect(api.create).toHaveBeenCalledWith(
      'periodicities',
      jasmine.objectContaining({ daysOfWeek: [1, 5], interval: 2 }),
    );
  });

  it('submits numeric fields for MONTHLY_DAY_RANGE', () => {
    component.openCreate();
    component.form.patchValue({
      name: 'Faixa mensal',
      type: 'MONTHLY_DAY_RANGE',
      interval: '2',
      startDayOfMonth: '10',
      endDayOfMonth: '17',
      nonexistentDayRule: 'PREVIOUS_DAY',
    });

    component.save();

    expect(api.create).toHaveBeenCalledWith(
      'periodicities',
      jasmine.objectContaining({
        interval: 2,
        startDayOfMonth: 10,
        endDayOfMonth: 17,
      }),
    );
  });

  it('submits EVERY_FOUR_MONTHS with its monthly fields', () => {
    component.openCreate();
    component.form.patchValue({
      name: 'A cada quatro meses',
      type: 'EVERY_FOUR_MONTHS',
      interval: '2',
      dayOfMonth: '31',
      nonexistentDayRule: 'SKIP',
    });

    component.save();

    expect(api.create).toHaveBeenCalledWith(
      'periodicities',
      jasmine.objectContaining({
        type: 'EVERY_FOUR_MONTHS',
        interval: 2,
        dayOfMonth: 31,
        nonexistentDayRule: 'SKIP',
      }),
    );
  });

  it('requires weekdays conditionally', () => {
    component.openCreate();
    component.form.patchValue({
      name: 'Sem dias',
      type: 'SPECIFIC_WEEKDAYS',
      interval: 1,
      nonexistentDayRule: 'PREVIOUS_DAY',
    });

    component.save();

    expect(api.create).not.toHaveBeenCalled();
    expect(component.modalError).toContain('ao menos um dia');
  });

  it('validates both monthly range boundaries and their order', () => {
    component.openCreate();
    component.form.patchValue({
      name: 'Faixa inválida',
      type: 'MONTHLY_DAY_RANGE',
      interval: 1,
      startDayOfMonth: '20',
      endDayOfMonth: '10',
      nonexistentDayRule: 'PREVIOUS_DAY',
    });

    component.save();

    expect(api.create).not.toHaveBeenCalled();
    expect(component.modalError).toContain('não pode ser maior');
  });

  it('asks for manual agenda generation after a material edit', () => {
    component.openEdit({
      id: 'periodicity',
      name: 'Mensal',
      type: 'MONTHLY',
      interval: 1,
      daysOfWeek: [],
      dayOfMonth: 15,
      startDayOfMonth: null,
      endDayOfMonth: null,
      month: null,
      nonexistentDayRule: 'PREVIOUS_DAY',
      active: true,
    });
    component.form.patchValue({ interval: '2' });

    component.save();

    expect(api.update).toHaveBeenCalled();
    expect(component.notice).toContain('Gerar agenda');
  });
});
