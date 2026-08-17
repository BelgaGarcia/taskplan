export type AccessLevel = 'ADMIN' | 'OPERATOR';
export type OccurrenceStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type OccurrenceResult = 'SUCCESS' | 'PARTIAL' | 'ERROR';

export interface NamedOption { id: string; name: string; active?: boolean; }
export interface Role extends NamedOption { description?: string | null; accessLevel: AccessLevel; }
export interface Position extends NamedOption { description?: string | null; }
export interface User extends NamedOption { email: string; role: Role; position?: Position | null; }
export interface TaskFunction extends NamedOption { description?: string | null; responsiblePosition?: Position | null; responsibleUser?: User | null; }
export interface Periodicity extends NamedOption { type: string; interval: number; daysOfWeek: number[]; dayOfMonth?: number | null; month?: number | null; nonexistentDayRule: string; }
export interface Holiday extends NamedOption { date: string; type: string; locality?: string | null; recurringAnnual: boolean; }
export interface Task extends NamedOption { description?: string | null; functionId: string; periodicityId: string; responsiblePositionId?: string | null; responsibleUserId?: string | null; startDate: string; endDate?: string | null; scheduledTime?: string | null; estimatedDurationMinutes?: number | null; mandatory: boolean; displayOrder: number; advanceOnNonBusinessDay: boolean; function?: TaskFunction; periodicity?: Periodicity; responsiblePosition?: Position | null; responsibleUser?: User | null; }
export interface Occurrence { id: string; taskId: string; responsibleUserId?: string | null; executedByUserId?: string | null; scheduledDate: string; originalDate: string; scheduledTime?: string | null; status: OccurrenceStatus; result?: OccurrenceResult | null; actualDurationMinutes?: number | null; notes?: string | null; overdue: boolean; canOperate: boolean; task: Task; responsibleUser?: User | null; executedByUser?: User | null; }
export interface CalendarDay { date: string; total: number; pending: number; inProgress: number; completed: number; failed: number; overdue: number; occurrences: Occurrence[]; }
export interface CalendarResponse { from: string; to: string; total: number; days: CalendarDay[]; }
export interface DashboardSummary { totals: { pending: number; inProgress: number; completed: number; failed: number; overdue: number }; today: { date: string; total: number; occurrences: Occurrence[] }; nextOccurrences: Occurrence[]; }
export interface Pagination { page: number; limit: number; total: number; totalPages: number; }
export interface PaginatedResponse<T> { data: T[]; pagination: Pagination; }
export interface FilterOptions { functions: NamedOption[]; users: NamedOption[]; statuses: OccurrenceStatus[]; }