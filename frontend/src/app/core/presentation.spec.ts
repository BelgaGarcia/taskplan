import { dateKey, displayValue, occurrencesForDay, statusPresentation } from './presentation';

describe('presentation helpers', () => {
  it('maps known task statuses to readable labels and tones', () => {
    expect(statusPresentation('in_progress')).toEqual({ label: 'Em andamento', tone: 'info' });
    expect(statusPresentation('completed')).toEqual({ label: 'Concluída', tone: 'success' });
  });

  it('groups and orders occurrences for the requested day', () => {
    const items = [
      { scheduledDate: '2026-08-18', scheduledTime: '14:00', task: { name: 'Mais tarde' } },
      { scheduledDate: '2026-08-18', scheduledTime: '08:00', task: { name: 'Primeira' } },
      { scheduledDate: '2026-08-19', scheduledTime: '09:00', task: { name: 'Outro dia' } },
    ];
    expect(occurrencesForDay(items, new Date(2026, 7, 18)).map(item => item.task?.name)).toEqual(['Primeira', 'Mais tarde']);
    expect(dateKey(new Date(2026, 7, 18))).toBe('2026-08-18');
  });

  it('presents empty and nested API values safely', () => {
    expect(displayValue(null)).toBe('—');
    expect(displayValue({ name: 'Operações' })).toBe('Operações');
    expect(displayValue('2026-08-18')).toBe('18/08/2026');
  });
});
