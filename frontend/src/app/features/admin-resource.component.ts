import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { TaskPlanApiService } from '../core/taskplan-api.service';
import type { NamedOption, PaginatedResponse } from '../core/models';
import { IconComponent, type IconName } from '../shared/icon.component';

type ResourceKey = 'roles' | 'positions' | 'users' | 'functions' | 'periodicities' | 'holidays' | 'tasks';
type FieldType = 'text' | 'email' | 'password' | 'textarea' | 'number' | 'date' | 'time' | 'select' | 'checkbox' | 'weekdays';
type Row = Record<string, unknown> & { id: string; active?: boolean };
type Field = { key: string; label: string; type: FieldType; required?: boolean; nullable?: boolean; options?: string; createOnly?: boolean; when?: (value: Record<string, unknown>) => boolean; hint?: string; };
type Column = { label: string; value: (row: Row) => string; };
type Definition = { title: string; singular: string; endpoint: ResourceKey; icon: IconName; columns: Column[]; fields: Field[]; filters?: Array<{ key: string; label: string; options: string }>; };
type Controls = Record<string, FormControl<string | number | boolean | null>>;

const value = (row: Row, path: string): string => {
  const result = path.split('.').reduce<unknown>((current, key) => current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined, row);
  if (result === null || result === undefined || result === '') return '—';
  if (typeof result === 'boolean') return result ? 'Ativo' : 'Inativo';
  if (typeof result === 'string' && /^\d{4}-\d{2}-\d{2}/.test(result)) return new Intl.DateTimeFormat('pt-BR').format(new Date(`${result.slice(0, 10)}T12:00:00`));
  return String(result);
};

const definitions: Record<ResourceKey, Definition> = {
  roles: { title: 'Perfis', singular: 'perfil', endpoint: 'roles', icon: 'shield', columns: [{ label: 'Nome', value: (r) => value(r, 'name') }, { label: 'Nível', value: (r) => value(r, 'accessLevel') }, { label: 'Descrição', value: (r) => value(r, 'description') }, { label: 'Estado', value: (r) => value(r, 'active') }], fields: [{ key: 'name', label: 'Nome', type: 'text', required: true }, { key: 'description', label: 'Descrição', type: 'textarea', nullable: true }, { key: 'accessLevel', label: 'Nível de acesso', type: 'select', required: true, options: 'accessLevels' }, { key: 'active', label: 'Ativo', type: 'checkbox' }] },
  positions: { title: 'Cargos', singular: 'cargo', endpoint: 'positions', icon: 'briefcase', columns: [{ label: 'Nome', value: (r) => value(r, 'name') }, { label: 'Descrição', value: (r) => value(r, 'description') }, { label: 'Estado', value: (r) => value(r, 'active') }], fields: [{ key: 'name', label: 'Nome', type: 'text', required: true }, { key: 'description', label: 'Descrição', type: 'textarea', nullable: true }, { key: 'active', label: 'Ativo', type: 'checkbox' }] },
  users: { title: 'Usuários', singular: 'usuário', endpoint: 'users', icon: 'users', columns: [{ label: 'Nome', value: (r) => value(r, 'name') }, { label: 'E-mail', value: (r) => value(r, 'email') }, { label: 'Perfil', value: (r) => value(r, 'role.name') }, { label: 'Cargo', value: (r) => value(r, 'position.name') }, { label: 'Estado', value: (r) => value(r, 'active') }], fields: [{ key: 'name', label: 'Nome', type: 'text', required: true }, { key: 'email', label: 'E-mail', type: 'email', required: true }, { key: 'password', label: 'Senha', type: 'password', required: true, createOnly: true, hint: 'Obrigatória apenas na criação.' }, { key: 'roleId', label: 'Perfil', type: 'select', required: true, options: 'roles' }, { key: 'positionId', label: 'Cargo', type: 'select', nullable: true, options: 'positions' }, { key: 'active', label: 'Ativo', type: 'checkbox' }] },
  functions: { title: 'Funções', singular: 'função', endpoint: 'functions', icon: 'function', columns: [{ label: 'Nome', value: (r) => value(r, 'name') }, { label: 'Cargo responsável', value: (r) => value(r, 'responsiblePosition.name') }, { label: 'Usuário responsável', value: (r) => value(r, 'responsibleUser.name') }, { label: 'Estado', value: (r) => value(r, 'active') }], fields: [{ key: 'name', label: 'Nome', type: 'text', required: true }, { key: 'description', label: 'Descrição', type: 'textarea', nullable: true }, { key: 'responsiblePositionId', label: 'Cargo responsável', type: 'select', nullable: true, options: 'positions' }, { key: 'responsibleUserId', label: 'Usuário responsável', type: 'select', nullable: true, options: 'users' }, { key: 'active', label: 'Ativo', type: 'checkbox' }] },
  periodicities: { title: 'Periodicidades', singular: 'periodicidade', endpoint: 'periodicities', icon: 'repeat', columns: [{ label: 'Nome', value: (r) => value(r, 'name') }, { label: 'Tipo', value: (r) => value(r, 'type') }, { label: 'Intervalo', value: (r) => value(r, 'interval') }, { label: 'Estado', value: (r) => value(r, 'active') }], fields: [{ key: 'name', label: 'Nome', type: 'text', required: true }, { key: 'type', label: 'Tipo', type: 'select', required: true, options: 'periodicityTypes' }, { key: 'interval', label: 'Intervalo', type: 'number', required: true }, { key: 'daysOfWeek', label: 'Dias da semana', type: 'weekdays', when: (v) => ['WEEKLY', 'SPECIFIC_WEEKDAYS'].includes(String(v['type'])) }, { key: 'dayOfMonth', label: 'Dia do mês', type: 'number', when: (v) => ['MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL', 'SPECIFIC_MONTH_DAY'].includes(String(v['type'])) }, { key: 'startDayOfMonth', label: 'Dia inicial', type: 'number', when: (v) => v['type'] === 'MONTHLY_DAY_RANGE' }, { key: 'endDayOfMonth', label: 'Dia final', type: 'number', when: (v) => v['type'] === 'MONTHLY_DAY_RANGE' }, { key: 'month', label: 'Mês (1–12)', type: 'number', when: (v) => v['type'] === 'ANNUAL' }, { key: 'nonexistentDayRule', label: 'Regra para data inexistente', type: 'select', required: true, options: 'nonexistentRules' }, { key: 'active', label: 'Ativo', type: 'checkbox' }] },
  holidays: { title: 'Feriados', singular: 'feriado', endpoint: 'holidays', icon: 'holiday', columns: [{ label: 'Nome', value: (r) => value(r, 'name') }, { label: 'Data', value: (r) => value(r, 'date') }, { label: 'Tipo', value: (r) => value(r, 'type') }, { label: 'Localidade', value: (r) => value(r, 'locality') }, { label: 'Estado', value: (r) => value(r, 'active') }], fields: [{ key: 'name', label: 'Nome', type: 'text', required: true }, { key: 'date', label: 'Data', type: 'date', required: true }, { key: 'type', label: 'Tipo', type: 'select', required: true, options: 'holidayTypes' }, { key: 'locality', label: 'Localidade', type: 'text', nullable: true }, { key: 'recurringAnnual', label: 'Recorrência anual', type: 'checkbox' }, { key: 'active', label: 'Ativo', type: 'checkbox' }] },
  tasks: { title: 'Tarefas', singular: 'tarefa', endpoint: 'tasks', icon: 'task', columns: [{ label: 'Nome', value: (r) => value(r, 'name') }, { label: 'Função', value: (r) => value(r, 'function.name') }, { label: 'Periodicidade', value: (r) => value(r, 'periodicity.name') }, { label: 'Responsável', value: (r) => value(r, 'responsibleUser.name') !== '—' ? value(r, 'responsibleUser.name') : value(r, 'responsiblePosition.name') }, { label: 'Estado', value: (r) => value(r, 'active') }], fields: [{ key: 'name', label: 'Nome', type: 'text', required: true }, { key: 'description', label: 'Descrição', type: 'textarea', nullable: true }, { key: 'functionId', label: 'Função', type: 'select', required: true, options: 'functions' }, { key: 'periodicityId', label: 'Periodicidade', type: 'select', required: true, options: 'periodicities' }, { key: 'responsiblePositionId', label: 'Cargo responsável', type: 'select', nullable: true, options: 'positions' }, { key: 'responsibleUserId', label: 'Usuário responsável', type: 'select', nullable: true, options: 'users' }, { key: 'startDate', label: 'Início da vigência', type: 'date', required: true }, { key: 'endDate', label: 'Fim da vigência', type: 'date', nullable: true }, { key: 'scheduledTime', label: 'Horário', type: 'time', nullable: true }, { key: 'estimatedDurationMinutes', label: 'Duração estimada (minutos)', type: 'number', nullable: true }, { key: 'mandatory', label: 'Obrigatória', type: 'checkbox' }, { key: 'displayOrder', label: 'Ordem de exibição', type: 'number' }, { key: 'advanceOnNonBusinessDay', label: 'Antecipar em dia não útil', type: 'checkbox' }, { key: 'active', label: 'Ativo', type: 'checkbox' }] },
};

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  template: `
    <section class="page-content admin-page">
      <div class="page-heading"><div><p class="eyebrow">Administração</p><h2><tp-icon [name]="definition.icon"></tp-icon>{{ definition.title }}</h2><p>Cadastre, consulte e mantenha {{ definition.title.toLowerCase() }} sem exclusão física.</p></div><button class="primary-button" type="button" (click)="openCreate()"><tp-icon name="plus"></tp-icon>Novo {{ definition.singular }}</button></div>
      <div class="resource-toolbar"><label class="search-field"><tp-icon name="search"></tp-icon><input [value]="search" (input)="search = inputValue($event)" (keyup.enter)="load(1)" placeholder="Pesquisar"></label><select *ngFor="let filter of definition.filters || []" (change)="setFilter(filter.key, inputValue($event))"><option value="">{{ filter.label }}</option><option *ngFor="let option of options[filter.options] || []" [value]="option.id">{{ option.name }}</option></select><button class="secondary-button" type="button" (click)="load(1)"><tp-icon name="filter"></tp-icon>Aplicar</button></div>
      <p class="form-alert error" *ngIf="error">{{ error }}</p><p class="form-alert success" *ngIf="notice">{{ notice }}</p>
      <div class="table-wrap"><div *ngIf="loading" class="loading-block">Carregando {{ definition.title.toLowerCase() }}…</div><table *ngIf="!loading && rows.length; else empty"><thead><tr><th *ngFor="let column of definition.columns">{{ column.label }}</th><th>Ações</th></tr></thead><tbody><tr *ngFor="let row of rows"><td *ngFor="let column of definition.columns">{{ column.value(row) }}</td><td class="row-actions"><button type="button" class="icon-button" (click)="openView(row)" aria-label="Visualizar"><tp-icon name="eye"></tp-icon></button><button type="button" class="icon-button" (click)="openEdit(row)" aria-label="Editar"><tp-icon name="edit"></tp-icon></button><button type="button" class="icon-button" (click)="confirm(row)" [attr.aria-label]="row.active === false ? 'Reativar' : 'Inativar'" [title]="row.active === false ? 'Reativar' : 'Inativar'"><tp-icon [name]="row.active === false ? 'rotate' : 'warning'"></tp-icon></button></td></tr></tbody></table><ng-template #empty><div *ngIf="!loading" class="empty-state large">Nenhum registro encontrado.</div></ng-template></div>
      <div class="pagination" *ngIf="pagination.totalPages > 1"><span>{{ pagination.total }} registros</span><button type="button" class="secondary-button" [disabled]="pagination.page === 1" (click)="load(pagination.page - 1)">Anterior</button><span>Página {{ pagination.page }} de {{ pagination.totalPages }}</span><button type="button" class="secondary-button" [disabled]="pagination.page === pagination.totalPages" (click)="load(pagination.page + 1)">Próxima</button></div>
    </section>
    <div class="modal-backdrop" *ngIf="mode" (click)="closeModal()"><article class="detail-modal resource-modal" role="dialog" aria-modal="true" [attr.aria-label]="modalTitle" (click)="$event.stopPropagation()"><button class="close-button" type="button" (click)="closeModal()" aria-label="Fechar"><tp-icon name="close"></tp-icon></button><p class="eyebrow">{{ mode === 'view' ? 'Consulta' : mode === 'create' ? 'Novo cadastro' : 'Edição' }}</p><h2>{{ modalTitle }}</h2><form *ngIf="mode !== 'view'" [formGroup]="form" (ngSubmit)="save()"><ng-container *ngFor="let field of fields"><label class="form-field" *ngIf="visible(field)"><span *ngIf="field.type !== 'checkbox'">{{ field.label }}<b *ngIf="field.required && (mode === 'create' || !field.createOnly)">*</b></span><input *ngIf="['text','email','password','number','date','time'].includes(field.type)" [type]="field.type" [formControlName]="field.key"><textarea *ngIf="field.type === 'textarea'" [formControlName]="field.key"></textarea><select *ngIf="field.type === 'select'" [formControlName]="field.key"><option [ngValue]="null">Selecione</option><option *ngFor="let option of options[field.options || ''] || []" [value]="option.id">{{ option.name }}</option></select><span class="checkbox-field" *ngIf="field.type === 'checkbox'"><input type="checkbox" [formControlName]="field.key">{{ field.label }}</span><small *ngIf="field.hint">{{ field.hint }}</small></label></ng-container><p class="form-alert error" *ngIf="modalError">{{ modalError }}</p><footer><button class="secondary-button" type="button" (click)="closeModal()">Cancelar</button><button class="primary-button" type="submit" [disabled]="saving">{{ saving ? 'Salvando…' : 'Salvar alterações' }}</button></footer></form><dl *ngIf="mode === 'view' && selected"><div *ngFor="let column of definition.columns"><dt>{{ column.label }}</dt><dd>{{ column.value(selected) }}</dd></div></dl></article></div>
    <div class="modal-backdrop" *ngIf="pendingAction" (click)="pendingAction = undefined"><article class="confirm-modal" role="alertdialog" aria-modal="true" (click)="$event.stopPropagation()"><tp-icon name="warning"></tp-icon><h2>{{ pendingAction.row.active === false ? 'Reativar' : 'Inativar' }} {{ definition.singular }}</h2><p>{{ pendingAction.row.active === false ? 'O cadastro voltará a ficar disponível.' : 'O cadastro não será excluído; ele apenas deixará de ficar disponível para novos vínculos.' }}</p><footer><button class="secondary-button" type="button" (click)="pendingAction = undefined">Cancelar</button><button class="primary-button" type="button" (click)="applyAction()">Confirmar</button></footer></article></div>
  `,
})
export class AdminResourceComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(TaskPlanApiService);
  readonly definition = definitions[this.route.snapshot.data['resource'] as ResourceKey];
  readonly fields = this.definition.fields;
  form = new FormGroup<Controls>({});
  rows: Row[] = [];
  options: Record<string, NamedOption[]> = {
    roles: [], positions: [], users: [], functions: [], periodicities: [],
    accessLevels: [{ id: 'ADMIN', name: 'Administrador' }, { id: 'OPERATOR', name: 'Operador' }],
    periodicityTypes: ['DAILY','WEEKLY','BIWEEKLY','MONTHLY','BIMONTHLY','QUARTERLY','SEMIANNUAL','ANNUAL','SPECIFIC_WEEKDAYS','SPECIFIC_MONTH_DAY','FIRST_BUSINESS_DAY','LAST_BUSINESS_DAY','CUSTOM_INTERVAL','MONTHLY_DAY_RANGE'].map((id) => ({ id, name: id })),
    nonexistentRules: ['PREVIOUS_DAY','LAST_DAY_OF_MONTH','NEXT_MONTH','SKIP'].map((id) => ({ id, name: id })),
    holidayTypes: ['NATIONAL','STATE','MUNICIPAL','INTERNAL'].map((id) => ({ id, name: id })),
  };
  pagination = { page: 1, limit: 12, total: 0, totalPages: 0 };
  filters: Record<string, string> = {};
  search = '';
  loading = false;
  saving = false;
  error = '';
  notice = '';
  modalError = '';
  mode?: 'create' | 'edit' | 'view';
  selected?: Row;
  pendingAction?: { row: Row };
  private lastFocused?: HTMLElement;
  readonly weekDays = [{ value: 1, label: 'Seg' }, { value: 2, label: 'Ter' }, { value: 3, label: 'Qua' }, { value: 4, label: 'Qui' }, { value: 5, label: 'Sex' }, { value: 6, label: 'Sáb' }, { value: 7, label: 'Dom' }];

  ngOnInit(): void { this.loadOptions(); this.load(); }
  @HostListener('document:keydown.escape') onEscape(): void { if (this.mode) this.closeModal(); else this.pendingAction = undefined; }
  get modalTitle(): string { return this.mode === 'create' ? `Novo ${this.definition.singular}` : this.mode === 'edit' ? `Editar ${this.definition.singular}` : `Detalhes do ${this.definition.singular}`; }
  inputValue(event: Event): string { return (event.target as HTMLInputElement | HTMLSelectElement).value; }
  setFilter(key: string, value: string): void { this.filters[key] = value; }
  visible(field: Field): boolean { return !field.createOnly || this.mode === 'create' || !!field.when || field.key !== 'password' ? (!field.when || field.when(this.form.getRawValue() as Record<string, unknown>)) : false; }
  hasWeekday(day: number): boolean { return String(this.form.controls['daysOfWeek']?.value || '').split(',').map(Number).includes(day); }
  toggleWeekday(day: number, event: Event): void { const selected = new Set(String(this.form.controls['daysOfWeek']?.value || '').split(',').map(Number).filter(Number.isInteger)); (event.target as HTMLInputElement).checked ? selected.add(day) : selected.delete(day); this.form.controls['daysOfWeek']?.setValue(Array.from(selected).sort((a, b) => a - b).join(',')); }

  load(page = this.pagination.page): void {
    this.loading = true; this.error = ''; this.notice = '';
    this.api.list<Row>(this.definition.endpoint, { page, limit: this.pagination.limit, search: this.search, ...this.filters }).subscribe({
      next: (response) => { this.rows = response.data; this.pagination = response.pagination; this.loading = false; },
      error: () => { this.error = 'Não foi possível carregar os dados. Tente novamente.'; this.loading = false; },
    });
  }

  openCreate(): void { this.open('create'); }
  openEdit(row: Row): void { this.open('edit', row); }
  openView(row: Row): void { this.open('view', row); }
  confirm(row: Row): void { this.pendingAction = { row }; }
  closeModal(): void { this.mode = undefined; this.selected = undefined; this.modalError = ''; setTimeout(() => this.lastFocused?.focus()); }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.modalError = 'Revise os campos obrigatórios.'; return; }
    this.saving = true; this.modalError = '';
    const payload = this.payload();
    const request = this.mode === 'edit' && this.selected ? this.api.update<Row>(this.definition.endpoint, this.selected.id, payload) : this.api.create<Row>(this.definition.endpoint, payload);
    request.subscribe({ next: () => { this.saving = false; this.closeModal(); this.notice = `${this.definition.singular[0].toUpperCase()}${this.definition.singular.slice(1)} salvo com sucesso.${this.definition.endpoint === 'tasks' && this.mode === 'create' ? ' A tarefa aparecerá no calendário após a geração das ocorrências.' : ''}`; this.load(this.pagination.page); }, error: (response: { error?: { message?: string | string[] } }) => { this.saving = false; const message = response.error?.message; this.modalError = Array.isArray(message) ? message.join(' ') : message || 'Não foi possível salvar o cadastro.'; } });
  }

  applyAction(): void {
    const row = this.pendingAction?.row; if (!row) return;
    const request = row.active === false ? this.api.update<Row>(this.definition.endpoint, row.id, { active: true }) : this.api.inactivate<Row>(this.definition.endpoint, row.id);
    request.subscribe({ next: () => { this.pendingAction = undefined; this.notice = row.active === false ? 'Cadastro reativado com sucesso.' : 'Cadastro inativado com sucesso.'; this.load(this.pagination.page); }, error: () => { this.pendingAction = undefined; this.error = 'A operação não pôde ser concluída.'; } });
  }

  private open(mode: 'create' | 'edit' | 'view', selected?: Row): void {
    this.lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    this.mode = mode; this.selected = selected; this.modalError = '';
    if (mode !== 'view') this.buildForm(selected);
    setTimeout(() => (document.querySelector('.resource-modal input, .resource-modal select, .resource-modal textarea') as HTMLElement | null)?.focus());
  }

  private buildForm(selected?: Row): void {
    const controls: Controls = {};
    for (const field of this.fields) {
      const current = selected ? this.formValue(selected, field.key) : this.defaultValue(field);
      controls[field.key] = new FormControl(current, field.required && !(field.createOnly && this.mode === 'edit') ? [Validators.required] : []);
    }
    this.form = new FormGroup(controls);
  }

  private payload(): Record<string, unknown> {
    const source = this.form.getRawValue() as Record<string, unknown>;
    const payload: Record<string, unknown> = {};
    for (const field of this.fields) {
      if (!this.visible(field) || (field.createOnly && this.mode === 'edit')) continue;
      const current = source[field.key];
      if (field.type === 'checkbox') { payload[field.key] = Boolean(current); continue; }
      if (field.type === 'number' && current !== '' && current !== null) { payload[field.key] = Number(current); continue; }
      if (field.key === 'daysOfWeek' && typeof current === 'string') { payload[field.key] = current.split(',').map((item) => Number(item.trim())).filter((item) => Number.isInteger(item)); continue; }
      if (current === '' || current === null) { if (field.nullable) payload[field.key] = null; continue; }
      payload[field.key] = current;
    }
    return payload;
  }

  private defaultValue(field: Field): string | number | boolean | null {
    if (field.type === 'checkbox') return field.key === 'active' || field.key === 'mandatory' || field.key === 'advanceOnNonBusinessDay';
    if (field.key === 'interval') return 1;
    if (field.key === 'displayOrder') return 0;
    if (field.key === 'nonexistentDayRule') return 'PREVIOUS_DAY';
    return null;
  }

  private formValue(row: Row, key: string): string | number | boolean | null {
    const related: Record<string, string> = { roleId: 'role.id', positionId: 'position.id', responsiblePositionId: 'responsiblePosition.id', responsibleUserId: 'responsibleUser.id', functionId: 'function.id', periodicityId: 'periodicity.id' };
    const path = related[key] || key;
    const result = path.split('.').reduce<unknown>((current, part) => current && typeof current === 'object' ? (current as Record<string, unknown>)[part] : null, row);
    if (key === 'daysOfWeek' && Array.isArray(result)) return result.join(',');
    if (typeof result === 'string' && /^\d{4}-\d{2}-\d{2}/.test(result)) return result.slice(0, 10);
    return typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean' ? result : null;
  }

  private loadOptions(): void {
    forkJoin({ roles: this.api.list<NamedOption>('roles', { page: 1, limit: 100, active: true }), positions: this.api.list<NamedOption>('positions', { page: 1, limit: 100, active: true }), users: this.api.list<NamedOption>('users', { page: 1, limit: 100, active: true }), functions: this.api.list<NamedOption>('functions', { page: 1, limit: 100, active: true }), periodicities: this.api.list<NamedOption>('periodicities', { page: 1, limit: 100, active: true }) }).subscribe({ next: (response) => { Object.entries(response).forEach(([key, result]) => this.options[key] = (result as PaginatedResponse<NamedOption>).data); } });
  }
}
