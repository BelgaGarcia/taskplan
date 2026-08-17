export type RecordValue = string | number | boolean | null | undefined | Record<string, unknown> | RecordValue[];

export interface TaskReference { name?: string; function?: { name?: string } | null; }
export interface Occurrence { id?: string; scheduledDate: string; scheduledTime?: string | null; status?: string | null; task?: TaskReference | null; function?: { name?: string } | null; }
export interface DashboardTotals { pending?: number; inProgress?: number; completed?: number; failed?: number; overdue?: number; }
export interface DashboardSummary { totals?: DashboardTotals; nextOccurrences?: Occurrence[]; todayOccurrences?: Occurrence[]; }
export interface StatusPresentation { label: string; tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger'; }

const statuses: Record<string, StatusPresentation> = {
  pending: { label: 'Pendente', tone: 'warning' }, pendente: { label: 'Pendente', tone: 'warning' },
  in_progress: { label: 'Em andamento', tone: 'info' }, em_andamento: { label: 'Em andamento', tone: 'info' },
  completed: { label: 'Concluída', tone: 'success' }, concluida: { label: 'Concluída', tone: 'success' },
  failed: { label: 'Falhou', tone: 'danger' }, failure: { label: 'Falhou', tone: 'danger' },
  overdue: { label: 'Atrasada', tone: 'danger' }, atrasada: { label: 'Atrasada', tone: 'danger' },
};

export function statusPresentation(status?: string | null): StatusPresentation {
  const key = (status ?? '').toLowerCase().trim().replace(/[ -]/g, '_');
  return statuses[key] ?? { label: status || 'Sem status', tone: 'neutral' };
}
export function occurrenceTime(item: Occurrence): string { return item.scheduledTime?.slice(0, 5) || 'Sem horário'; }
export function occurrenceTitle(item: Occurrence): string { return item.task?.name || 'Tarefa não identificada'; }
export function occurrenceFunction(item: Occurrence): string { return item.function?.name || item.task?.function?.name || 'Função não informada'; }
export function dateKey(value: string | Date): string { const date = value instanceof Date ? value : new Date(`${String(value).slice(0, 10)}T12:00:00`); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
export function occurrencesForDay(items: Occurrence[], day: Date): Occurrence[] { return items.filter(item => String(item.scheduledDate).slice(0, 10) === dateKey(day)).sort((a, b) => occurrenceTime(a).localeCompare(occurrenceTime(b))); }
export function displayValue(value: RecordValue): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(T|$)/.test(value)) return new Intl.DateTimeFormat('pt-BR').format(new Date(`${value.slice(0, 10)}T12:00:00`));
  if (Array.isArray(value)) return value.map(displayValue).join(', ');
  if (typeof value === 'object') return (value['name'] as string | undefined) || (value['title'] as string | undefined) || '—';
  return String(value);
}
