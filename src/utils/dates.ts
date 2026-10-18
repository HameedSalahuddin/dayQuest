export type DeadlineState = 'overdue' | 'today' | 'tomorrow' | 'upcoming' | 'none';

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function classifyDeadline(dueDate: string | null, today = localDateKey(new Date())): DeadlineState {
  if (!dueDate) return 'none';
  const tomorrowDate = new Date(`${today}T12:00:00`);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = localDateKey(tomorrowDate);
  if (dueDate < today) return 'overdue';
  if (dueDate === today) return 'today';
  if (dueDate === tomorrow) return 'tomorrow';
  return 'upcoming';
}
