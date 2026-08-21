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
    ]);
    api.list.and.returnValue(of(emptyPage));
    api.create.and.returnValue(of({ id: 'periodicity' }));

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
});
